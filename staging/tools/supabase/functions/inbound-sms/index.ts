// Supabase Edge Function — inbound-sms
// Twilio webhook for SMS-driven quote drafting. The contractor texts the
// Twilio number, this function walks a small conversation:
//
//   user → "New quote for Maria Garcia ericgirard526@gmail.com 514-555-0123
//           kitchen reno at 123 Main, demo + new shaker cabinets + quartz
//           + paint, $15000, 3 weeks, materials included"
//   bot  → "✓ Q-... draft for Maria Garcia — $15000 / 3 weeks. Payment
//           schedule? 1=10/40/40/10  2=20/30/40/10  3=20/40/30/10"
//   user → "2"
//   bot  → "Promotion to mention? Reply text or NONE."
//   user → "NONE"
//   bot  → "✓ Ready. Open https://tools.../index.html?draft=<id> to sign & send."
//
// Returns TwiML so Twilio sends the reply on our behalf. Only the configured
// CONTRACTOR_PHONE is allowed to trigger this; anything else is silently
// dropped to prevent random texts from spinning up draft quotes.

const CONTRACTOR_PHONE = "+15145736443";

// Quotes default to French. Only switch to English when the contractor
// explicitly asks (case-insensitive). Matches:
//   - the word "english" anywhere
//   - "(EN)" with parens
//   - a prefix like "EN:" / "en:" at the start of the SMS
// Loose markers like a bare "en " are intentionally NOT matched — "en" is a
// common French preposition ("démolition en cuisine") and would false-trigger.
const ENGLISH_REQUEST = /\benglish\b|\(en\)|^\s*en\s*:/i;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-twilio-signature",
};

const CLAUDE_MODEL = "claude-opus-4-7";

const APP_BASE_URL =
  Deno.env.get("APP_BASE_URL") ?? "https://tools.mlprenodesign.ca";

/* ---------- Twilio reply (TwiML) ---------- */
function twiml(message: string) {
  // CDATA-escape the message so Twilio's XML parser doesn't choke on quotes.
  const safe = String(message ?? "").replace(/]]>/g, "]]]]><![CDATA[>");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message><![CDATA[${safe}]]></Message></Response>`;
  return new Response(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8", ...CORS },
  });
}
function silent() {
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8", ...CORS },
  });
}

/* ---------- Supabase REST helpers (service role) ---------- */
const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

async function sbGet(path: string) {
  const r = await fetch(`${SB_URL}${path}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (!r.ok) throw new Error(`Supabase GET ${path}: HTTP ${r.status}`);
  return r.json();
}
async function sbPost(path: string, body: unknown, prefer = "return=representation") {
  const r = await fetch(`${SB_URL}${path}`, {
    method: "POST",
    headers: {
      apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json", Prefer: prefer,
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Supabase POST ${path}: HTTP ${r.status} ${await r.text()}`);
  return r.json().catch(() => ({}));
}
async function sbPatch(path: string, body: unknown) {
  const r = await fetch(`${SB_URL}${path}`, {
    method: "PATCH",
    headers: {
      apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json", Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Supabase PATCH ${path}: HTTP ${r.status} ${await r.text()}`);
  return r.json().catch(() => ([]));
}

/* ---------- Phone normalization ---------- */
function normPhone(raw: string) {
  if (!raw) return "";
  const t = raw.trim();
  if (t.startsWith("+")) return t;
  const digits = t.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

/* ---------- Session lookup / create ---------- */
type Session = {
  id: string;
  phone: string;
  state: string;
  quote_id: string | null;
  language: string;
  extracted: Record<string, unknown>;
  payment_option: string | null;
  promotions: Array<{ text: string }>;
  message_count: number;
};

async function findActiveSession(phone: string): Promise<Session | null> {
  // PostgREST: order by updated_at desc, limit 1, with the index condition manually.
  const url = `/rest/v1/sms_sessions?phone=eq.${encodeURIComponent(phone)}&state=in.(collecting,asking_schedule,asking_promo)&order=updated_at.desc&limit=1`;
  const rows = await sbGet(url);
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}
async function createSession(phone: string, initial: Partial<Session>): Promise<Session> {
  const inserted = await sbPost("/rest/v1/sms_sessions", [{
    phone, state: "collecting", language: "fr",
    extracted: {}, promotions: [], message_count: 0,
    ...initial,
  }]);
  return Array.isArray(inserted) ? inserted[0] : inserted;
}
async function updateSession(id: string, patch: Record<string, unknown>) {
  return sbPatch(`/rest/v1/sms_sessions?id=eq.${id}`, patch);
}

/* ---------- Quote number ---------- */
function generateQuoteNumber() {
  const y = new Date().getFullYear();
  const r = () => Math.random().toString(36).slice(2, 5).toUpperCase();
  return `Q-${y}-${r()}${r()}`;
}

/* ---------- Claude extraction ---------- */
async function extractWithClaude(input: {
  freshText: string;
  priorExtracted: Record<string, unknown>;
}) {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY missing");

  const system = `You are a quote-extraction assistant for a Quebec residential contractor (MLP Reno & Design).

The contractor texts you in short, casual SMS style — sometimes one message, sometimes multiple — describing a new project: who the customer is, the work, the price, the duration. Your job: extract structured fields.

YOU MUST RETURN VALID JSON. No prose, no markdown, no code fences.

Schema:
{
  "client_name": "string",
  "client_email": "string",
  "client_phone": "string",     // any format the contractor wrote
  "client_address": "string",
  "project_title": "string",     // short — e.g. "Rénovation cuisine"
  "scope_summary": "string",     // the actual work, kept close to verbatim, light tidy ok
  "base_price": number,          // CAD pre-tax, plain number, 0 if not given
  "duration_value": number,      // integer, 0 if not given
  "duration_unit": "weeks" | "days",
  "materials_included": boolean, // default true; false only if explicitly excluded
  "language": "fr" | "en",
  "missing_fields": ["client_name" | "client_email" | "client_phone" | "client_address" | "scope_summary" | "base_price" | "duration_value"]
}

Rules:
- Be lenient. Casual SMS with abbreviations, accents, typos: do your best.
- If the contractor sends a follow-up message that adds info, merge it into priorExtracted (which the system passes in).
- "missing_fields" lists the fields you still need to draft a usable quote. ALWAYS include any field that is empty/zero. Required minimum to proceed: client_name, scope_summary, base_price.
- Language is set by the system, not by you — always return "language": "fr". The system overrides it to "en" only when the contractor explicitly asks for English.
- scope_summary should preserve the actual work description. The contractor may want light formatting — leave the raw text close to what was sent.
- project_title: a 2-5 word label. If unclear, guess from scope (e.g. "Cuisine", "Salle de bain", "Rénovation").

PRICE — READ THE EXACT NUMBER, DO NOT DROP DIGITS
- A scope often contains dimensions (e.g. "16x20", "10' x 12'", "2 floors"). Those are NOT prices. The price is the number written with a currency marker: $, "CAD", "$", "k$", "dollars", "prix", "total", "budget".
- Read the price digits exactly as written. "$7800" is 7800, not 800. "$15,000" is 15000. "$9.5k" is 9500. "$1,250.50" is 1250.50.
- If multiple numbers appear, the price is the one nearest a $ sign or the word "prix"/"budget"/"price"/"total".
- If the contractor says "$15000 total avec taxes" or "tx incluses", back out 5% + 9.975% to a pre-tax amount. Otherwise treat as pre-tax.
- If no clear price is given, return 0.

DURATION
- Prefer "weeks". If they say "10 days" use days. If unspecified → 0.`;

  const userText = `priorExtracted:\n${JSON.stringify(input.priorExtracted, null, 2)}\n\n=== NEW SMS FROM CONTRACTOR ===\n${input.freshText}\n=== END ===\n\nReturn ONLY the JSON object. Start with { end with }.`;

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      system,
      max_tokens: 1500,
      messages: [{ role: "user", content: userText }],
    }),
  });

  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Claude HTTP ${r.status}: ${err.slice(0, 200)}`);
  }
  const data = await r.json();
  const txt = (data.content || []).find((b: { type: string }) => b.type === "text")?.text ?? "";
  const first = txt.indexOf("{"), last = txt.lastIndexOf("}");
  if (first === -1 || last === -1) throw new Error(`Claude returned non-JSON: ${txt.slice(0, 200)}`);
  return JSON.parse(txt.slice(first, last + 1));
}

/* ---------- Quote builders ---------- */
function buildOptionsArray(ext: Record<string, any>) {
  const sub = Math.max(0, Number(ext.base_price) || 0);
  const apply = ext.apply_taxes !== false;          // default true (taxes apply)
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const gst = apply ? r2(sub * 0.05) : 0;
  const qst = apply ? r2(sub * 0.09975) : 0;
  const duration_value = Math.max(1, parseInt(ext.duration_value) || 1);
  const duration_unit = ext.duration_unit === "days" ? "days" : "weeks";
  const duration_weeks = duration_unit === "days"
    ? Math.max(1, Math.ceil(duration_value / 5))
    : duration_value;
  return [{
    key: "A", title: "Option A",
    scope_summary: String(ext.scope_summary || ""),
    duration_weeks, duration_value, duration_unit,
    materials_included: ext.materials_included !== false,
    materials_budget: 0,
    price_mode: "single",
    base_price: sub,
    apply_taxes: apply,
    promotions: Array.isArray(ext.promotions) ? ext.promotions : [],
    line_items: [],
    subtotal: sub, gst, qst,
    total: r2(sub + gst + qst),
  }];
}

const SCHEDULE_PRESETS: Record<string, Array<{ label_fr: string; label_en: string; pct: number }>> = {
  A: [
    { label_fr: "Dépôt", label_en: "Deposit", pct: 10 },
    { label_fr: "Avant début", label_en: "Before start", pct: 40 },
    { label_fr: "Mi-parcours", label_en: "Mid-project", pct: 40 },
    { label_fr: "Fin des travaux", label_en: "Upon completion", pct: 10 },
  ],
  B: [
    { label_fr: "Dépôt", label_en: "Deposit", pct: 20 },
    { label_fr: "Avant début", label_en: "Before start", pct: 30 },
    { label_fr: "Mi-parcours", label_en: "Mid-project", pct: 40 },
    { label_fr: "Fin des travaux", label_en: "Upon completion", pct: 10 },
  ],
  C: [
    { label_fr: "Dépôt", label_en: "Deposit", pct: 20 },
    { label_fr: "Avant début", label_en: "Before start", pct: 40 },
    { label_fr: "Mi-parcours", label_en: "Mid-project", pct: 30 },
    { label_fr: "Fin des travaux", label_en: "Upon completion", pct: 10 },
  ],
};
function paymentScheduleSnapshot(key: string) {
  const rows = SCHEDULE_PRESETS[key] || SCHEDULE_PRESETS.A;
  return { key, title: `Option ${key}`, rows };
}

const DEFAULT_PAYMENT_METHODS_FR = `Virement Interac :\npayment@mlpexperience.com\n\nChèque :\nMLP Gestion et Consultation Inc.\n\nNote : Les paiements par chèque peuvent prendre 5 à 7 jours ouvrables avant réception. Les dates de début et la planification sont confirmées seulement après réception du paiement.`;
const DEFAULT_NOTES_FR = `• Le budget peut varier de 5% à 15% selon les imprévus\n• Les délais de livraison des matériaux peuvent varier\n• Tout travail non inclus dans cette soumission sera considéré comme un extra\n• Les délais sont estimés en jours ouvrables\n• Les taxes sont en sus`;
const DEFAULT_PAYMENT_METHODS_EN = `Interac e-Transfer:\npayment@mlpexperience.com\n\nCheque:\nMLP Gestion et Consultation Inc.\n\nNote: Cheque payments may take 5–7 business days to clear. Project scheduling starts only after payment is received.`;
const DEFAULT_NOTES_EN = `• Budget may vary 5%–15% due to unforeseen circumstances\n• Material delivery delays are possible\n• Work not included in this quote will be considered an extra\n• Timeline is estimated in business days\n• Taxes are extra`;

function randomToken() {
  const r = () => Math.random().toString(36).slice(2, 8);
  return r() + r() + r();
}

async function createDraftQuote(s: Session) {
  const ext = s.extracted as Record<string, any>;
  const lang = (ext.language === "en" ? "en" : "fr") as "en" | "fr";
  const options = buildOptionsArray(ext);
  const today = new Date().toISOString().split("T")[0];
  const record = {
    quote_number: generateQuoteNumber(),
    status: "draft",
    language: lang,
    client_name: ext.client_name || null,
    client_email: ext.client_email || null,
    client_phone: ext.client_phone || null,
    client_address: ext.client_address || null,
    quote_date: today,
    project_title: ext.project_title || null,
    duration_weeks: options[0].duration_weeks,
    ai_conversation: {
      source_text: ext.scope_summary || "",
      duration_value: options[0].duration_value,
      duration_unit: options[0].duration_unit,
      payment_schedule: null,
      revision: 1,
      origin: "sms",
      sms_session_id: s.id,
    },
    options,
    payment_option: "A",
    payment_methods: lang === "fr" ? DEFAULT_PAYMENT_METHODS_FR : DEFAULT_PAYMENT_METHODS_EN,
    notes: lang === "fr" ? DEFAULT_NOTES_FR : DEFAULT_NOTES_EN,
    share_token: randomToken(),
  };
  const inserted = await sbPost("/rest/v1/quotes", [record]);
  const q = Array.isArray(inserted) ? inserted[0] : inserted;
  return q;
}

async function patchQuoteForSchedule(quoteId: string, key: string) {
  const snap = paymentScheduleSnapshot(key);
  // Pull current ai_conversation to merge into it (PATCH on jsonb replaces wholesale).
  const cur = await sbGet(`/rest/v1/quotes?id=eq.${quoteId}&select=ai_conversation`);
  const ai = (Array.isArray(cur) && cur[0]?.ai_conversation) || {};
  ai.payment_schedule = snap;
  await sbPatch(`/rest/v1/quotes?id=eq.${quoteId}`, { payment_option: key, ai_conversation: ai });
}

async function patchQuoteForPromos(quoteId: string, promos: Array<{ text: string }>) {
  const cur = await sbGet(`/rest/v1/quotes?id=eq.${quoteId}&select=options`);
  const opts = Array.isArray(cur) && cur[0]?.options ? cur[0].options : [];
  if (opts[0]) opts[0].promotions = promos;
  await sbPatch(`/rest/v1/quotes?id=eq.${quoteId}`, { options: opts });
}

/* ---------- Reply phrasing ---------- */
function fmtMoney(n: number) {
  const f = Number(n || 0).toFixed(2);
  return f.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function fieldLabel(key: string, lang: "fr" | "en") {
  const fr = lang === "fr";
  return ({
    client_name:    fr ? "nom du client"     : "client name",
    client_email:   fr ? "courriel"          : "email",
    client_phone:   fr ? "téléphone"         : "phone",
    client_address: fr ? "adresse du projet" : "project address",
    scope_summary:  fr ? "description des travaux" : "scope of work",
    base_price:     fr ? "prix avant taxes"  : "pre-tax price",
    duration_value: fr ? "durée"             : "duration",
  } as Record<string, string>)[key] || key;
}
function summarizeQuote(ext: Record<string, any>, lang: "fr" | "en") {
  const fr = lang === "fr";
  const name = ext.client_name || "—";
  const price = ext.base_price ? `$${fmtMoney(ext.base_price)}` : "—";
  const dur = ext.duration_value
    ? `${ext.duration_value} ${ext.duration_unit === "days" ? (fr ? "j" : "d") : (fr ? "sem" : "wk")}`
    : "—";
  return `${name} — ${price} / ${dur}`;
}
function askMissingFields(missing: string[], lang: "fr" | "en") {
  const fr = lang === "fr";
  const list = missing.map(m => fieldLabel(m, lang)).join(", ");
  return fr
    ? `Il me manque : ${list}. Réponds avec l'info pour continuer.`
    : `Still need: ${list}. Reply with the info to continue.`;
}
function askPaymentSchedule(lang: "fr" | "en") {
  const fr = lang === "fr";
  return fr
    ? "Échéancier ? Réponds avec un chiffre :\n1 = 10/40/40/10\n2 = 20/30/40/10\n3 = 20/40/30/10"
    : "Payment schedule? Reply with a number:\n1 = 10/40/40/10\n2 = 20/30/40/10\n3 = 20/40/30/10";
}
function askPromo(lang: "fr" | "en") {
  return lang === "fr"
    ? "Promotion à mentionner ? Réponds avec le texte ou AUCUNE."
    : "Promotion to mention? Reply with the text or NONE.";
}
function readyMessage(quote: any, lang: "fr" | "en") {
  const link = `${APP_BASE_URL}/index.html?draft=${encodeURIComponent(quote.id)}`;
  const fr = lang === "fr";
  return fr
    ? `✓ Brouillon ${quote.quote_number} prêt. Ouvre :\n${link}\npour signer et envoyer.`
    : `✓ Draft ${quote.quote_number} ready. Open:\n${link}\nto sign & send.`;
}

/* ---------- Conversation steps ---------- */
const RESET_KEYWORDS = ["reset", "recommencer", "restart", "annuler", "cancel", "stop"];
const NONE_KEYWORDS  = ["none", "aucune", "aucun", "non", "no", "skip", "passer"];

async function handleCollecting(s: Session, body: string): Promise<Response> {
  let parsed: Record<string, any>;
  try {
    parsed = await extractWithClaude({ freshText: body, priorExtracted: s.extracted });
  } catch (err) {
    await updateSession(s.id, { state: "failed", error: String(err) });
    return twiml("⚠️ Erreur d'analyse. Renvoie le scope, le client, le prix et la durée en un message.");
  }

  // Merge: only overwrite when the new value is non-empty.
  const merged: Record<string, any> = { ...s.extracted };
  for (const k of [
    "client_name","client_email","client_phone","client_address",
    "project_title","scope_summary","base_price","duration_value",
    "duration_unit","materials_included","language",
  ]) {
    const v = parsed[k];
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && !v.trim()) continue;
    if (typeof v === "number" && k === "base_price" && v <= 0 && (merged[k] ?? 0) > 0) continue;
    if (typeof v === "number" && k === "duration_value" && v <= 0 && (merged[k] ?? 0) > 0) continue;
    merged[k] = v;
  }

  // Required minimum to move forward.
  const required = ["client_name", "scope_summary", "base_price"] as const;
  const missing: string[] = [];
  for (const k of required) {
    const v = merged[k];
    if (k === "base_price") { if (!Number(v) || Number(v) <= 0) missing.push(k); }
    else if (!v || (typeof v === "string" && !v.trim())) missing.push(k);
  }
  if (!merged.duration_value || Number(merged.duration_value) <= 0) missing.push("duration_value");

  // Quotes default to French. Switch to English only on explicit request — and
  // once switched, stay switched for the rest of this session (sticky).
  const askedEnglishNow = ENGLISH_REQUEST.test(body);
  const lang: "en" | "fr" = (s.language === "en" || askedEnglishNow) ? "en" : "fr";
  merged.language = lang;

  if (missing.length) {
    await updateSession(s.id, { extracted: merged, language: lang });
    return twiml(askMissingFields(missing, lang));
  }

  // All required present → create the draft and advance.
  const sessionWithMerged = { ...s, extracted: merged, language: lang } as Session;
  const quote = await createDraftQuote(sessionWithMerged);
  await updateSession(s.id, {
    extracted: merged, language: lang,
    quote_id: quote.id, state: "asking_schedule",
  });
  const reply = `✓ ${quote.quote_number} — ${summarizeQuote(merged, lang)}\n\n${askPaymentSchedule(lang)}`;
  return twiml(reply);
}

async function handleAskingSchedule(s: Session, body: string): Promise<Response> {
  const lang = (s.language === "en" ? "en" : "fr") as "en" | "fr";
  const raw = body.trim().toUpperCase();
  let key: string | null = null;
  if (/^[1A]$/.test(raw)) key = "A";
  else if (/^[2B]$/.test(raw)) key = "B";
  else if (/^[3C]$/.test(raw)) key = "C";
  if (!key) {
    return twiml(lang === "fr"
      ? "Réponds avec 1, 2 ou 3 pour choisir l'échéancier."
      : "Reply with 1, 2 or 3 to pick a schedule.");
  }
  if (s.quote_id) await patchQuoteForSchedule(s.quote_id, key);
  await updateSession(s.id, { payment_option: key, state: "asking_promo" });
  return twiml(askPromo(lang));
}

async function handleAskingPromo(s: Session, body: string): Promise<Response> {
  const lang = (s.language === "en" ? "en" : "fr") as "en" | "fr";
  const text = body.trim();
  const lower = text.toLowerCase();
  const promos: Array<{ text: string }> = NONE_KEYWORDS.includes(lower)
    ? []
    : [{ text }];
  if (s.quote_id) await patchQuoteForPromos(s.quote_id, promos);
  await updateSession(s.id, { promotions: promos, state: "ready" });

  // Look up the saved quote for the final confirmation message (we need quote_number).
  const rows = await sbGet(`/rest/v1/quotes?id=eq.${s.quote_id}&select=id,quote_number`);
  const quote = Array.isArray(rows) ? rows[0] : null;
  if (!quote) return twiml("✓ Done.");
  return twiml(readyMessage(quote, lang));
}

/* ---------- Main handler ---------- */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST")    return silent();

  let from = "", body = "";
  try {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/x-www-form-urlencoded")) {
      const raw = await req.text();
      const params = new URLSearchParams(raw);
      from = normPhone(params.get("From") || "");
      body = String(params.get("Body") || "").trim();
    } else if (ct.includes("application/json")) {
      const j = await req.json();
      from = normPhone(j.From || j.from || "");
      body = String(j.Body || j.body || "").trim();
    } else {
      // Some Twilio test consoles send urlencoded without an explicit header.
      const raw = await req.text();
      const params = new URLSearchParams(raw);
      from = normPhone(params.get("From") || "");
      body = String(params.get("Body") || "").trim();
    }
  } catch (_) {
    return silent();
  }

  // Whitelist — silently drop anything else (so random texts never spin up a session).
  if (from !== CONTRACTOR_PHONE) {
    console.log("[inbound-sms] dropped sender:", from);
    return silent();
  }
  if (!body) return silent();

  try {
    // Reset keywords always start a fresh session, regardless of current state.
    const lower = body.toLowerCase();
    if (RESET_KEYWORDS.includes(lower)) {
      const existing = await findActiveSession(from);
      if (existing) await updateSession(existing.id, { state: "cancelled" });
      const fresh = await createSession(from, { state: "collecting" });
      await updateSession(fresh.id, { message_count: 1, last_message_in: body });
      return twiml("Nouveau brouillon. Envoie le scope, le client, le prix et la durée.");
    }

    let s = await findActiveSession(from);
    if (!s) s = await createSession(from, { state: "collecting" });

    // Bump audit fields up front (so even a thrown handler leaves a trace).
    await updateSession(s.id, {
      message_count: (s.message_count || 0) + 1,
      last_message_in: body,
    });

    let res: Response;
    switch (s.state) {
      case "collecting":      res = await handleCollecting(s, body); break;
      case "asking_schedule": res = await handleAskingSchedule(s, body); break;
      case "asking_promo":    res = await handleAskingPromo(s, body); break;
      default:                res = await handleCollecting(s, body); break;
    }

    // Stash last outbound text for debugging (cheap clone via reading the body).
    try {
      const clone = res.clone();
      const xml = await clone.text();
      const m = xml.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
      if (m) await updateSession(s.id, { last_message_out: m[1] });
    } catch (_) { /* non-fatal */ }

    return res;
  } catch (err) {
    console.error("[inbound-sms] handler error:", err);
    return twiml("⚠️ Erreur interne. Réponds RESET pour recommencer.");
  }
});
