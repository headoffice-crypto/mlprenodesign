// Supabase Edge Function — send-quote / send-invoice
// Accepts { quote_id | invoice_id, channel: 'sms' | 'email', to?, message? }
// Sends quotes or invoices by SMS (Twilio) or email (Resend).

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
};

function jsonResp(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(n) {
  return Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

async function sbGet(url, key) {
  const r = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!r.ok) throw new Error(`Supabase fetch ${r.status}`);
  return r.json();
}

async function sbPatch(url, key, body) {
  return fetch(url, {
    method: "PATCH",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
}

async function sbInsert(url, key, body) {
  return fetch(url, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
}

/* ===== Quote email body (existing) ===== */
function buildQuoteEmailHtml(quote, link, lang, opts = {}) {
  const fr = lang === "fr";
  const isDraft = !!opts.draft;
  const options = Array.isArray(quote.options) ? quote.options : [];
  const multi = options.length > 1;

  let optionsBlock = "";
  if (options.length) {
    optionsBlock = '<div style="margin:20px 0;">';
    options.forEach((o) => {
      optionsBlock += `
        <div style="border:1px solid #e8eaed;border-radius:10px;padding:14px;margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;">
            <strong style="color:#c8a45a;text-transform:uppercase;letter-spacing:0.4px;">${escHtml(o.title || o.key)}</strong>
            <strong style="color:#202124;font-size:16px;">$${money(o.total)}</strong>
          </div>
          ${o.scope_summary ? `<div style="color:#5f6368;font-size:13px;margin-top:6px;line-height:1.5;">${escHtml(o.scope_summary)}</div>` : ""}
        </div>`;
    });
    optionsBlock += "</div>";
  }

  const title = isDraft
    ? (fr ? "Brouillon de soumission" : "Draft quote")
    : (fr ? "Votre soumission" : "Your quote");
  const greeting = fr ? `Bonjour ${escHtml(quote.client_name || "")},` : `Hi ${escHtml(quote.client_name || "")},`;
  const intro = isDraft
    ? (fr
        ? `Voici un <strong>brouillon</strong> de la soumission <strong>${escHtml(quote.quote_number)}</strong> ${multi ? "avec les options proposées" : ""} pour révision. Ce document n'est pas contractuel et ne peut pas être signé.`
        : `Here is a <strong>draft</strong> of quote <strong>${escHtml(quote.quote_number)}</strong> ${multi ? "with the proposed options" : ""} for review. This document is not contractual and cannot be signed.`)
    : (fr
        ? `Voici votre soumission <strong>${escHtml(quote.quote_number)}</strong> ${multi ? "avec les options proposées" : ""}.`
        : `Here is your quote <strong>${escHtml(quote.quote_number)}</strong> ${multi ? "with the proposed options" : ""}.`);
  const cta = fr ? "Consulter et signer la soumission" : "View and sign the quote";

  const draftBanner = isDraft
    ? `<div style="background:#fff3cd;border:1px solid #f0c36d;color:#8a6d1a;padding:10px 14px;border-radius:8px;margin-bottom:16px;font-weight:700;text-align:center;letter-spacing:0.5px;">${fr ? "BROUILLON — Non contractuel" : "DRAFT — Not for signature"}</div>`
    : "";

  const ctaBlock = isDraft
    ? ""
    : `<div style="text-align:center;margin:28px 0;">
      <a href="${link}" style="display:inline-block;background:#c8a45a;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:8px;font-size:15px;">${cta} →</a>
    </div>`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#202124;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;padding:32px 28px;">
    <div style="border-bottom:3px solid #c8a45a;padding-bottom:12px;margin-bottom:20px;">
      <div style="font-size:22px;font-weight:800;color:#c8a45a;">MLP Reno &amp; Design</div>
      <div style="font-size:13px;color:#5f6368;">Construction &amp; Rénovation — ${fr ? "Licence RBQ" : "RBQ Licence"}: 5847-0378-01</div>
    </div>
    ${draftBanner}
    <p style="font-size:16px;margin:0 0 12px;">${greeting}</p>
    <p style="font-size:14px;color:#3c4043;line-height:1.6;margin:0 0 16px;">${intro}</p>
    ${optionsBlock}
    ${ctaBlock}
    <p style="font-size:14px;color:#3c4043;margin:18px 0 0;">${fr ? "Merci," : "Thanks,"}<br><strong>MLP Reno &amp; Design</strong></p>
    <div style="border-top:1px solid #e8eaed;margin-top:28px;padding-top:16px;font-size:11px;color:#9aa0a6;line-height:1.6;">
      MLP Reno &amp; Design — (450) 500-8936 — headoffice@mlpexperience.com
    </div>
  </div></body></html>`;
}

/* ===== Invoice email body =====
   Clean, generous layout. Full detail (schedule, breakdown, payment methods)
   lives on bill.html — email is a short summary with a CTA to the full bill. */
function buildInvoiceEmailHtml(invoice, quote, allInvoices, lang, billUrl) {
  const fr = lang === "fr";
  const isPaid = invoice.status === "paid";
  const list = Array.isArray(allInvoices) ? allInvoices : [];

  const contractTotal = list.reduce((s, i) => s + Number(i.amount_total || 0), 0);
  const paidToDate    = list.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.amount_total || 0), 0);
  const remaining     = Math.max(0, contractTotal - paidToDate);

  const greeting   = fr ? `Bonjour ${escHtml(quote.client_name || "")},` : `Hi ${escHtml(quote.client_name || "")},`;
  const projectRef = escHtml(quote.project_title || quote.quote_number || "");
  const docLabel   = isPaid ? (fr ? "Reçu de paiement" : "Payment receipt") : (fr ? "Facture" : "Invoice");
  const intro = isPaid
    ? (fr
        ? `Nous confirmons la réception de votre paiement pour le versement « <strong>${escHtml(invoice.label)}</strong> » du projet ${projectRef}. Merci !`
        : `We confirm receipt of your payment for the "${escHtml(invoice.label)}" installment of project ${projectRef}. Thank you!`)
    : (fr
        ? `Voici votre facture pour le versement « <strong>${escHtml(invoice.label)}</strong> » du projet ${projectRef}.`
        : `Here is your invoice for the "${escHtml(invoice.label)}" installment of project ${projectRef}.`);
  const cta = isPaid
    ? (fr ? "Voir le reçu détaillé →" : "View detailed receipt →")
    : (fr ? "Voir la facture détaillée →" : "View detailed bill →");
  const heroLabel = isPaid ? (fr ? "Montant payé" : "Amount paid") : (fr ? "Montant dû" : "Amount due");
  const heroBg    = isPaid ? "background:#e6f4ea;border:1px solid #a8d5b3;" : "background:#fffaf0;border:1px solid #ecd9a9;";
  const heroLabelColor = isPaid ? "#1e8e3e" : "#a68a3e";
  const buttonBg  = isPaid ? "#1e8e3e" : "#c8a45a";

  return `<!DOCTYPE html><html lang="${fr ? "fr" : "en"}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${docLabel} ${escHtml(invoice.invoice_number)}</title></head>
<body style="margin:0;padding:0;background:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#202124;line-height:1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f8;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:14px;box-shadow:0 1px 3px rgba(0,0,0,0.06),0 4px 24px rgba(0,0,0,0.04);overflow:hidden;">

        <!-- Brand bar -->
        <tr><td style="padding:32px 40px 24px;border-bottom:2px solid #c8a45a;">
          <div style="font-size:22px;font-weight:800;color:#c8a45a;letter-spacing:-0.3px;">MLP Reno &amp; Design</div>
          <div style="font-size:12px;color:#5f6368;margin-top:2px;">${fr ? "Construction & Rénovation" : "Construction & Renovation"} — ${fr ? "RBQ" : "RBQ Licence"} 5847-0378-01</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px 40px 8px;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:#9aa0a6;">${docLabel}</div>
          <div style="font-size:14px;color:#5f6368;font-variant-numeric:tabular-nums;margin-top:2px;">${escHtml(invoice.invoice_number)}</div>

          <p style="font-size:15px;margin:24px 0 8px;color:#202124;">${greeting}</p>
          <p style="font-size:14px;color:#3c4043;margin:0 0 24px;">${intro}</p>

          <!-- Hero amount -->
          <div style="${heroBg}border-radius:12px;padding:24px 28px;margin-bottom:28px;">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:${heroLabelColor};">${heroLabel}</div>
            <div style="font-size:32px;font-weight:800;color:#202124;letter-spacing:-0.6px;margin-top:6px;font-variant-numeric:tabular-nums;line-height:1;">$${money(invoice.amount_total)}</div>
            <div style="font-size:13px;color:#5f6368;margin-top:8px;">${escHtml(invoice.label || "")} · ${invoice.pct_of_total}% ${fr ? "du contrat" : "of contract"}</div>
          </div>

          <!-- CTA to bill.html -->
          ${billUrl ? `
          <div style="text-align:center;margin:0 0 32px;">
            <a href="${escHtml(billUrl)}" style="display:inline-block;background:${buttonBg};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:14px 28px;border-radius:10px;letter-spacing:0.2px;">${cta}</a>
            <div style="font-size:12px;color:#9aa0a6;margin-top:10px;">${fr ? "Imprimer ou télécharger en PDF depuis votre navigateur." : "Print or save as PDF from your browser."}</div>
          </div>` : ""}

          <!-- Compact summary -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#3c4043;border-top:1px solid #e8eaed;margin-bottom:8px;">
            <tr><td style="padding:10px 0;color:#5f6368;">${fr ? "Total du contrat" : "Contract total"}</td><td style="padding:10px 0;text-align:right;font-variant-numeric:tabular-nums;">$${money(contractTotal)}</td></tr>
            <tr><td style="padding:10px 0;border-top:1px solid #f1f3f4;color:#5f6368;">${fr ? "Payé à ce jour" : "Paid to date"}</td><td style="padding:10px 0;border-top:1px solid #f1f3f4;text-align:right;color:#1e8e3e;font-weight:700;font-variant-numeric:tabular-nums;">$${money(paidToDate)}</td></tr>
            <tr><td style="padding:10px 0;border-top:1px solid #f1f3f4;color:#202124;font-weight:600;">${fr ? "Solde restant" : "Remaining balance"}</td><td style="padding:10px 0;border-top:1px solid #f1f3f4;text-align:right;color:#a68a3e;font-weight:800;font-variant-numeric:tabular-nums;">$${money(remaining)}</td></tr>
          </table>

          <p style="font-size:13px;color:#5f6368;margin:24px 0 0;">${fr ? "Détail complet, échéancier et méthodes de paiement disponibles via le lien ci-dessus." : "Full breakdown, schedule and payment methods are available via the link above."}</p>

          <p style="font-size:14px;color:#3c4043;margin:24px 0 0;">${fr ? "Merci," : "Thanks,"}<br><strong>MLP Reno &amp; Design</strong></p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 40px 32px;border-top:1px solid #f1f3f4;text-align:center;font-size:11px;color:#9aa0a6;line-height:1.7;">
          MLP Reno &amp; Design — ${fr ? "RBQ" : "RBQ Licence"} 5847-0378-01<br>
          (450) 500-8936 — headoffice@mlpexperience.com
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}

function buildProgressEmailHtml(project, quote, lang) {
  const fr = lang === "fr";
  const items = Array.isArray(project.action_items) ? project.action_items : [];
  const overall = items.length
    ? Math.round(items.reduce((s, it) => s + (Number(it.pct) || 0), 0) / items.length)
    : 0;

  let tasksBlock = "";
  items.forEach((it) => {
    const pct = Number(it.pct) || 0;
    const done = pct === 100;
    const barColor = done ? "#1e8e3e" : "#c8a45a";
    tasksBlock += `
      <div style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;font-size:14px;margin-bottom:4px;">
          <span>${escHtml(it.text || "")}</span>
          <strong style="color:${done ? "#1e8e3e" : "#c8a45a"};">${pct}%${done ? " ✓" : ""}</strong>
        </div>
        <div style="height:8px;background:#f1f3f4;border-radius:4px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${barColor};border-radius:4px;"></div>
        </div>
      </div>`;
  });

  const greeting = fr ? `Bonjour ${escHtml(quote.client_name || "")},` : `Hi ${escHtml(quote.client_name || "")},`;
  const intro = fr
    ? `Voici une mise à jour de l'avancement de votre projet <strong>${escHtml(quote.project_title || quote.quote_number)}</strong>.`
    : `Here is a progress update on your project <strong>${escHtml(quote.project_title || quote.quote_number)}</strong>.`;
  const overallLabel = fr ? "Avancement global" : "Overall progress";
  const tasksLabel = fr ? "Détail par tâche" : "Task breakdown";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#202124;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;padding:32px 28px;">
    <div style="border-bottom:3px solid #c8a45a;padding-bottom:12px;margin-bottom:20px;">
      <div style="font-size:22px;font-weight:800;color:#c8a45a;">MLP Reno &amp; Design</div>
      <div style="font-size:13px;color:#5f6368;">${fr ? "Mise à jour du projet" : "Project update"}</div>
    </div>

    <p style="font-size:16px;margin:0 0 12px;">${greeting}</p>
    <p style="font-size:14px;color:#3c4043;line-height:1.6;margin:0 0 20px;">${intro}</p>

    <div style="background:linear-gradient(135deg,#f5edda,#fffaf0);border:1px solid #ecd9a9;border-radius:10px;padding:18px;margin:16px 0;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;">
        <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#a68a3e;">${overallLabel}</span>
        <span style="font-size:26px;font-weight:800;color:#a68a3e;">${overall}%</span>
      </div>
      <div style="height:10px;background:rgba(0,0,0,0.08);border-radius:5px;overflow:hidden;">
        <div style="height:100%;width:${overall}%;background:linear-gradient(90deg,#c8a45a,#a68a3e);border-radius:5px;"></div>
      </div>
    </div>

    <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:#202124;margin:24px 0 14px;padding-bottom:6px;border-bottom:2px solid #c8a45a;">${tasksLabel}</h3>
    ${tasksBlock || `<div style="color:#9aa0a6;font-style:italic;">${fr ? "Aucune tâche à afficher." : "No tasks yet."}</div>`}

    ${project.notes ? `<div style="background:#f8f9fa;border-left:4px solid #c8a45a;padding:14px;border-radius:10px;font-size:13px;color:#3c4043;line-height:1.6;white-space:pre-line;margin-top:20px;">${escHtml(project.notes)}</div>` : ""}

    <p style="font-size:13px;color:#5f6368;line-height:1.6;margin-top:20px;">${fr ? "N'hésitez pas à nous contacter si vous avez des questions." : "Please reach out if you have any questions."}</p>
    <p style="font-size:14px;color:#3c4043;margin:18px 0 0;">${fr ? "Merci," : "Thanks,"}<br><strong>MLP Reno &amp; Design</strong></p>
    <div style="border-top:1px solid #e8eaed;margin-top:28px;padding-top:16px;font-size:11px;color:#9aa0a6;line-height:1.6;">
      MLP Reno &amp; Design — (450) 500-8936 — headoffice@mlpexperience.com
    </div>
  </div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const body = await req.json().catch(() => ({}));
    const { quote_id, invoice_id, project_id, channel = "sms", type, to, message, draft } = body;
    const isDraft = !!draft;

    if (!quote_id && !invoice_id && !project_id) return jsonResp({ error: "quote_id, invoice_id, or project_id required" }, 400);
    if (!["sms", "email"].includes(channel)) return jsonResp({ error: "channel must be 'sms' or 'email'" }, 400);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const APP_BASE_URL = Deno.env.get("APP_BASE_URL") ?? "http://localhost:8000/staging/tools";
    if (!SUPABASE_URL || !SUPABASE_KEY) return jsonResp({ error: "Supabase env missing" }, 500);

    // ---------- PROJECT PROGRESS PATH ----------
    if (project_id) {
      const pArr = await sbGet(`${SUPABASE_URL}/rest/v1/projects?id=eq.${encodeURIComponent(project_id)}&select=*`, SUPABASE_KEY);
      const proj = pArr?.[0];
      if (!proj) return jsonResp({ error: "project not found" }, 404);

      const qArr = await sbGet(`${SUPABASE_URL}/rest/v1/quotes?id=eq.${encodeURIComponent(proj.quote_id)}&select=*`, SUPABASE_KEY);
      const quote = qArr?.[0];
      if (!quote) return jsonResp({ error: "related quote not found" }, 404);

      const lang = quote.language === "en" ? "en" : "fr";
      const items = Array.isArray(proj.action_items) ? proj.action_items : [];
      const overall = items.length
        ? Math.round(items.reduce((s, it) => s + (Number(it.pct) || 0), 0) / items.length)
        : 0;

      if (channel === "sms") {
        const TWILIO_SID = Deno.env.get("TWILIO_SID") ?? "";
        const TWILIO_TOKEN = Deno.env.get("TWILIO_TOKEN") ?? "";
        const TWILIO_FROM = Deno.env.get("TWILIO_FROM") ?? "";
        if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) return jsonResp({ error: "Twilio env missing" }, 500);

        const raw = String(to || quote.client_phone || "");
        const digits = raw.replace(/\D/g, "");
        if (!digits) return jsonResp({ error: "no phone number" }, 400);
        const to_e164 = raw.startsWith("+") ? raw : (digits.length === 10 ? `+1${digits}` : `+${digits}`);

        const body = message || (lang === "fr"
          ? `MLP Reno & Design — Mise à jour du projet ${quote.project_title || quote.quote_number} : ${overall}% terminé.`
          : `MLP Reno & Design — Project update for ${quote.project_title || quote.quote_number}: ${overall}% complete.`);

        const auth = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);
        const form = new URLSearchParams({ From: TWILIO_FROM, To: to_e164, Body: body });
        const twRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
          method: "POST",
          headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
          body: form.toString(),
        });
        const twData = await twRes.json();
        if (!twRes.ok) return jsonResp({ error: twData.message || "Twilio error", code: twData.code }, 500);

        return jsonResp({ ok: true, channel: "sms", sid: twData.sid, to: to_e164 });
      }

      // Project progress — email
      const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
      const FROM = Deno.env.get("EMAIL_FROM") ?? "MLP Reno & Design <onboarding@resend.dev>";
      const REPLY_TO = Deno.env.get("EMAIL_REPLY_TO") ?? "";
      if (!RESEND_KEY) return jsonResp({ error: "Resend env missing" }, 500);

      const emailTo = (to || quote.client_email || "").trim();
      if (!emailTo) return jsonResp({ error: "no email address" }, 400);

      const subject = lang === "fr"
        ? `Mise à jour de projet — ${quote.project_title || quote.quote_number} (${overall}%)`
        : `Project update — ${quote.project_title || quote.quote_number} (${overall}%)`;

      const payload = {
        from: FROM,
        to: [emailTo],
        subject,
        html: buildProgressEmailHtml(proj, quote, lang),
      };
      if (REPLY_TO) payload.reply_to = REPLY_TO;

      const rRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const rData = await rRes.json();
      if (!rRes.ok) return jsonResp({ error: rData.message || rData.name || "Resend error" }, 500);

      return jsonResp({ ok: true, channel: "email", id: rData.id, to: emailTo, overall });
    }

    // ---------- INVOICE PATH ----------
    if (invoice_id) {
      const invArr = await sbGet(`${SUPABASE_URL}/rest/v1/invoices?id=eq.${encodeURIComponent(invoice_id)}&select=*`, SUPABASE_KEY);
      const inv = invArr?.[0];
      if (!inv) return jsonResp({ error: "invoice not found" }, 404);

      const qArr = await sbGet(`${SUPABASE_URL}/rest/v1/quotes?id=eq.${encodeURIComponent(inv.quote_id)}&select=*`, SUPABASE_KEY);
      const quote = qArr?.[0];
      if (!quote) return jsonResp({ error: "related quote not found" }, 404);

      // All sibling invoices on the same project — for full payment-schedule context
      const allInv = await sbGet(`${SUPABASE_URL}/rest/v1/invoices?project_id=eq.${encodeURIComponent(inv.project_id)}&order=sequence.asc&select=*`, SUPABASE_KEY);

      const lang = quote.language === "en" ? "en" : "fr";
      const isPaid = inv.status === "paid";
      const contractTotal = (allInv || []).reduce((s, i) => s + Number(i.amount_total || 0), 0);
      const paidToDate    = (allInv || []).filter(i => i.status === "paid").reduce((s, i) => s + Number(i.amount_total || 0), 0);
      const remaining     = Math.max(0, contractTotal - paidToDate);
      const billUrl       = inv.share_token ? `${APP_BASE_URL}/bill?token=${encodeURIComponent(inv.share_token)}` : "";

      if (channel === "sms") {
        const TWILIO_SID = Deno.env.get("TWILIO_SID") ?? "";
        const TWILIO_TOKEN = Deno.env.get("TWILIO_TOKEN") ?? "";
        const TWILIO_FROM = Deno.env.get("TWILIO_FROM") ?? "";
        if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) return jsonResp({ error: "Twilio env missing" }, 500);

        const raw = String(to || quote.client_phone || "");
        const digits = raw.replace(/\D/g, "");
        if (!digits) return jsonResp({ error: "no phone number" }, 400);
        const to_e164 = raw.startsWith("+") ? raw : (digits.length === 10 ? `+1${digits}` : `+${digits}`);

        const smsBody = message || (isPaid
          ? (lang === "fr"
              ? `MLP Reno & Design — Reçu de paiement ${inv.invoice_number}: $${money(inv.amount_total)} (${inv.label}). Solde restant: $${money(remaining)}. Détail: ${billUrl}`
              : `MLP Reno & Design — Receipt ${inv.invoice_number}: $${money(inv.amount_total)} paid (${inv.label}). Remaining: $${money(remaining)}. Details: ${billUrl}`)
          : (lang === "fr"
              ? `MLP Reno & Design — Facture ${inv.invoice_number}: ${inv.label} (${inv.pct_of_total}%) — $${money(inv.amount_total)} à payer. Détail et méthodes: ${billUrl}`
              : `MLP Reno & Design — Invoice ${inv.invoice_number}: ${inv.label} (${inv.pct_of_total}%) — $${money(inv.amount_total)} due. Bill & payment methods: ${billUrl}`));

        const auth = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);
        const form = new URLSearchParams({ From: TWILIO_FROM, To: to_e164, Body: smsBody });
        const twRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
          method: "POST",
          headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
          body: form.toString(),
        });
        const twData = await twRes.json();
        if (!twRes.ok) return jsonResp({ error: twData.message || "Twilio error", code: twData.code }, 500);

        if (!isPaid) {
          await sbPatch(`${SUPABASE_URL}/rest/v1/invoices?id=eq.${encodeURIComponent(inv.id)}`, SUPABASE_KEY, {
            status: "sent", sent_at: new Date().toISOString()
          });
        } else {
          await sbPatch(`${SUPABASE_URL}/rest/v1/invoices?id=eq.${encodeURIComponent(inv.id)}`, SUPABASE_KEY, {
            sent_at: new Date().toISOString()
          });
        }
        return jsonResp({ ok: true, channel: "sms", sid: twData.sid, to: to_e164, paid: isPaid });
      }

      // Invoice — email
      const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
      const FROM = Deno.env.get("EMAIL_FROM") ?? "MLP Reno & Design <onboarding@resend.dev>";
      const REPLY_TO = Deno.env.get("EMAIL_REPLY_TO") ?? "";
      if (!RESEND_KEY) return jsonResp({ error: "Resend env missing" }, 500);

      const emailTo = (to || quote.client_email || "").trim();
      if (!emailTo) return jsonResp({ error: "no email address" }, 400);

      const subject = isPaid
        ? (lang === "fr"
            ? `Reçu ${inv.invoice_number} — ${inv.label} (MLP Reno & Design)`
            : `Receipt ${inv.invoice_number} — ${inv.label} (MLP Reno & Design)`)
        : (lang === "fr"
            ? `Facture ${inv.invoice_number} — ${inv.label} (MLP Reno & Design)`
            : `Invoice ${inv.invoice_number} — ${inv.label} (MLP Reno & Design)`);

      const payload = {
        from: FROM,
        to: [emailTo],
        subject,
        html: buildInvoiceEmailHtml(inv, quote, allInv, lang, billUrl),
      };
      if (REPLY_TO) payload.reply_to = REPLY_TO;

      const rRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const rData = await rRes.json();
      if (!rRes.ok) return jsonResp({ error: rData.message || rData.name || "Resend error" }, 500);

      if (!isPaid) {
        await sbPatch(`${SUPABASE_URL}/rest/v1/invoices?id=eq.${encodeURIComponent(inv.id)}`, SUPABASE_KEY, {
          status: "sent", sent_at: new Date().toISOString()
        });
      } else {
        await sbPatch(`${SUPABASE_URL}/rest/v1/invoices?id=eq.${encodeURIComponent(inv.id)}`, SUPABASE_KEY, {
          sent_at: new Date().toISOString()
        });
      }
      return jsonResp({ ok: true, channel: "email", id: rData.id, to: emailTo, paid: isPaid });
    }

    // ---------- QUOTE PATH (existing) ----------
    const qArr = await sbGet(`${SUPABASE_URL}/rest/v1/quotes?id=eq.${encodeURIComponent(quote_id)}&select=*`, SUPABASE_KEY);
    const quote = qArr?.[0];
    if (!quote) return jsonResp({ error: "quote not found" }, 404);

    const lang = quote.language === "en" ? "en" : "fr";
    const link = `${APP_BASE_URL}/sign.html?token=${encodeURIComponent(quote.share_token)}`;

    if (channel === "sms") {
      const TWILIO_SID = Deno.env.get("TWILIO_SID") ?? "";
      const TWILIO_TOKEN = Deno.env.get("TWILIO_TOKEN") ?? "";
      const TWILIO_FROM = Deno.env.get("TWILIO_FROM") ?? "";
      if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) return jsonResp({ error: "Twilio env missing" }, 500);

      const raw = String(to || quote.client_phone || "");
      const digits = raw.replace(/\D/g, "");
      if (!digits) return jsonResp({ error: "no phone number on quote" }, 400);
      const to_e164 = raw.startsWith("+") ? raw : (digits.length === 10 ? `+1${digits}` : `+${digits}`);

      const defaultMsg = lang === "fr"
        ? `MLP Reno & Design — Votre soumission ${quote.quote_number}. Consultez et signez : ${link}`
        : `MLP Reno & Design — Your quote ${quote.quote_number}. View and sign: ${link}`;
      const smsBody = message || defaultMsg;

      const auth = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);
      const form = new URLSearchParams({ From: TWILIO_FROM, To: to_e164, Body: smsBody });

      const twRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
      const twData = await twRes.json();
      if (!twRes.ok) return jsonResp({ error: twData.message || "Twilio error", code: twData.code }, 500);

      await sbInsert(`${SUPABASE_URL}/rest/v1/quote_events`, SUPABASE_KEY, {
        quote_id: quote.id, event_type: "sms_sent",
        payload: { to: to_e164, twilio_sid: twData.sid, status: twData.status },
      });
      if (!quote.sent_at) {
        await sbPatch(`${SUPABASE_URL}/rest/v1/quotes?id=eq.${encodeURIComponent(quote.id)}`, SUPABASE_KEY, {
          sent_at: new Date().toISOString(),
          status: quote.status === "draft" ? "sent" : quote.status,
        });
      }
      return jsonResp({ ok: true, channel: "sms", sid: twData.sid, to: to_e164, status: twData.status });
    }

    // Quote — email
    const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
    const FROM = Deno.env.get("EMAIL_FROM") ?? "MLP Reno & Design <onboarding@resend.dev>";
    const REPLY_TO = Deno.env.get("EMAIL_REPLY_TO") ?? "";
    if (!RESEND_KEY) return jsonResp({ error: "Resend env missing" }, 500);

    const emailTo = (to || quote.client_email || "").trim();
    if (!emailTo) return jsonResp({ error: "no email address on quote" }, 400);

    const subject = isDraft
      ? (lang === "fr"
          ? `[BROUILLON] Soumission MLP Reno & Design — ${quote.quote_number}`
          : `[DRAFT] MLP Reno & Design quote — ${quote.quote_number}`)
      : (lang === "fr"
          ? `Votre soumission MLP Reno & Design — ${quote.quote_number}`
          : `Your MLP Reno & Design quote — ${quote.quote_number}`);

    const payload = {
      from: FROM,
      to: [emailTo],
      subject,
      html: buildQuoteEmailHtml(quote, link, lang, { draft: isDraft }),
    };
    if (REPLY_TO) payload.reply_to = REPLY_TO;

    const rRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const rData = await rRes.json();
    if (!rRes.ok) return jsonResp({ error: rData.message || rData.name || "Resend error" }, 500);

    await sbInsert(`${SUPABASE_URL}/rest/v1/quote_events`, SUPABASE_KEY, {
      quote_id: quote.id, event_type: isDraft ? "draft_email_sent" : "email_sent",
      payload: { to: emailTo, resend_id: rData.id, draft: isDraft },
    });
    if (!isDraft && !quote.sent_at) {
      await sbPatch(`${SUPABASE_URL}/rest/v1/quotes?id=eq.${encodeURIComponent(quote.id)}`, SUPABASE_KEY, {
        sent_at: new Date().toISOString(),
        status: quote.status === "draft" ? "sent" : quote.status,
      });
    }
    return jsonResp({ ok: true, channel: "email", id: rData.id, to: emailTo, draft: isDraft });
  } catch (err) {
    return jsonResp({ error: err?.message ?? String(err) }, 500);
  }
});
