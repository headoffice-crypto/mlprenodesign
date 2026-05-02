// Supabase Edge Function — analyze-project
// Proxies the contractor's project text + PDF page images to Anthropic Claude
// for structured extraction. Keeps ANTHROPIC_API_KEY server-side instead of
// shipping it to the browser via js/config.js.
//
// Input:  { text?: string, images?: string[] (data URLs), context?: { today?: string } }
// Output: { project_title, client_name, client_email, client_phone, client_address,
//           scope_summary, base_price, duration_weeks, materials_included }
// Error:  { error: string, raw?: string } with non-2xx status

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

const CLAUDE_MODEL = "claude-sonnet-4-6";

const ANALYZE_SYSTEM = `You read a Quebec residential contractor's project document (PDF pages as images and/or pasted text) and extract structured data for a quote.

YOU MUST RETURN VALID JSON. No markdown, no code fences, no prose outside the JSON.

Schema:
{
  "project_title": "string",
  "client_name": "string",
  "client_email": "string",
  "client_phone": "string",
  "client_address": "string",
  "scope_summary": "string — VERBATIM scope text",
  "base_price": number,
  "duration_weeks": integer,
  "materials_included": boolean
}

★★★ ABSOLUTE RULE — scope_summary IS VERBATIM ★★★
"scope_summary" must contain the scope/work-description text from the document copied EXACTLY as written. Do NOT paraphrase, summarize, condense, restructure, re-bullet, translate, "clean up", or fix typos. Preserve paragraph breaks (use \\n), bullets, numbering, capitalization, punctuation, accents, spacing.

When the document is a PDF rendered as images: read the layout. Tables become aligned columns in the text output. Bulleted lists keep their bullet markers. Headings stay on their own lines. The contractor must recognize their own words byte-for-byte. The ONLY thing you do with the scope text is copy it.

Do NOT include header/footer boilerplate (company name, RBQ number, page numbers, "SOUMISSION" header) in scope_summary — that's quote chrome, not scope. Include only the actual description of the work the contractor will perform.

OTHER FIELDS — EXTRACT EXPLICITLY OR LEAVE BLANK
For client_name, client_email, client_phone, client_address, project_title, base_price, duration_weeks, materials_included:
- Extract each value ONLY if it is explicitly present in the document.
- If a field is NOT present, return:
    - "" (empty string) for text fields
    - 0 for base_price
    - 0 for duration_weeks (means "unknown")
    - true for materials_included (default; only set false if document explicitly says materials are excluded / "main d'œuvre seulement")
- DO NOT guess, infer, or invent values. The contractor will fill missing fields manually.

PRICE
- base_price is in CAD, PRE-TAX. If the document shows a total WITH tax, back out TPS 5% + TVQ 9.975% to get the pre-tax amount and use that. If only "total" is given without saying whether taxes are included, assume pre-tax and use it as-is.
- If multiple prices appear (line items + total), use the TOTAL pre-tax.
- Strip currency symbols and thousand separators. Output a plain number.

DURATION
- Integer weeks. Convert days→weeks (round up: 10 days → 2 weeks). If the document only mentions a calendar window like "from June 1 to June 28", compute weeks. If not stated at all, return 0.

PROJECT TITLE
- A short label (3-8 words) that already exists in the document — a heading, "Projet :", subject line, "Soumission pour ...", etc. Copy it verbatim. If no obvious title exists, return "".

CLIENT INFO
- client_name: the addressee / "Soumission pour" / "Client :". Personal name preferred over company name unless only company is given.
- client_email: any email matching the addressee (not the contractor's own headoffice@mlpexperience.com).
- client_phone: the addressee's phone (not the contractor's RBQ contact).
- client_address: project address or client mailing address as written.

LANGUAGE
Reply with field VALUES in the same language as the source document (French or English). Field NAMES stay in English (per the schema).`;

function dataUrlToImageBlock(dataUrl) {
  const m = /^data:([^;]+);base64,(.*)$/.exec(String(dataUrl || ""));
  if (!m) throw new Error("Image must be a base64 data URL.");
  return { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } };
}

function stripFences(s) {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

// Tolerate a stray preamble or fence: keep what's between the first `{` and
// last `}`. The system prompt forbids extras, but Claude occasionally adds
// "Here is the JSON:" before the object — don't fail on that.
function extractJsonObject(s) {
  const stripped = stripFences(s);
  const first = stripped.indexOf("{");
  const last = stripped.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return stripped;
  return stripped.slice(first, last + 1);
}

function normalizeAnalysis(raw) {
  const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
  return {
    project_title:      String(raw.project_title || ""),
    client_name:        String(raw.client_name || ""),
    client_email:       String(raw.client_email || ""),
    client_phone:       String(raw.client_phone || ""),
    client_address:     String(raw.client_address || ""),
    scope_summary:      String(raw.scope_summary || ""),
    base_price:         Math.max(0, num(raw.base_price)),
    duration_weeks:     Math.max(0, parseInt(raw.duration_weeks) || 0),
    materials_included: raw.materials_included !== false,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST")    return jsonResp({ error: "POST only" }, 405);

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
    if (!ANTHROPIC_API_KEY) return jsonResp({ error: "ANTHROPIC_API_KEY not set on the function" }, 500);

    const body = await req.json().catch(() => ({}));
    const text = String(body.text || "").trim();
    const images = Array.isArray(body.images) ? body.images : [];
    const context = body.context || {};

    if (!text && images.length === 0) return jsonResp({ error: "No text or images to analyze." }, 400);
    if (images.length > 20)            return jsonResp({ error: "Too many images (max 20)." }, 400);

    const contextBlock = `CONTEXT (background — do NOT extract these as client info):
- Contractor email: headoffice@mlpexperience.com
- Contractor phone: (450) 500-8936
- Contractor RBQ: 5847-0378-01
- Today: ${context.today || new Date().toISOString().split("T")[0]}`;

    const userParts = [];
    if (images.length > 0) {
      userParts.push({
        type: "text",
        text: `The contractor uploaded ${images.length} PDF page image(s)${text ? " and pasted text" : ""}. Read the page layout carefully — headings, tables, line items, signatures. Then produce the JSON object as specified.`,
      });
    } else {
      userParts.push({ type: "text", text: "The contractor pasted the following project text. Produce the JSON object as specified." });
    }

    if (text) {
      userParts.push({ type: "text", text: "\n\n=== PASTED TEXT ===\n" + text + "\n=== END ===" });
    }
    for (const dataUrl of images) {
      try {
        userParts.push(dataUrlToImageBlock(dataUrl));
      } catch (_e) {
        return jsonResp({ error: "Invalid image data URL." }, 400);
      }
    }
    userParts.push({ type: "text", text: "\n\nReturn ONLY the JSON object now — start with `{` and end with `}`, no prose, no markdown fences. Remember: scope_summary is verbatim, other missing fields stay blank." });

    const claudeBody = {
      model: CLAUDE_MODEL,
      system: ANALYZE_SYSTEM + "\n\n" + contextBlock,
      messages: [
        { role: "user", content: userParts },
      ],
      max_tokens: 4000,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    let res;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(claudeBody),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if (err?.name === "AbortError") {
        return jsonResp({ error: "Claude timed out after 90s. Try fewer pages or shorter text." }, 504);
      }
      throw err;
    }
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.text();
      let msg = `Claude HTTP ${res.status}`;
      try { msg = JSON.parse(errBody)?.error?.message || msg; } catch {}
      console.error("[analyze-project] claude error", res.status, errBody.slice(0, 500));
      return jsonResp({ error: msg }, 502);
    }

    const data = await res.json();
    const textBlock = (data.content || []).find((b) => b.type === "text");
    const responseText = (textBlock?.text || "").trim();
    const cleaned = extractJsonObject(responseText);

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (_e) {
      console.error("[analyze-project] JSON parse failed", responseText.slice(0, 500));
      return jsonResp({ error: "AI returned invalid JSON.", raw: cleaned.slice(0, 200) }, 502);
    }

    return jsonResp(normalizeAnalysis(parsed));
  } catch (err) {
    console.error("[analyze-project] unexpected", err);
    return jsonResp({ error: err?.message ?? String(err) }, 500);
  }
});
