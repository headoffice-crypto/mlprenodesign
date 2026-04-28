/* ============================================
   GPT-4o vision analyzer for the quote builder.

   analyzeProjectInput({ text, images, context })
     -> { project_title, client_name, client_email, client_phone, client_address,
          scope_summary, base_price, duration_weeks, materials_included }

   Images are rendered PDF pages (or photos). GPT sees the actual layout
   — headings, tables, line-item lists — not just stripped text.
   The scope_summary is required to be verbatim. Other fields are extracted
   only when explicitly stated; missing fields come back blank/null so the
   contractor can fill them in.
   MLP Reno & Design
   ============================================ */

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

async function openaiChat({ messages, temperature = 0.1, maxTokens = 4000, jsonMode = false, model = 'gpt-4o' }) {
  const body = { model, messages, temperature, max_tokens: maxTokens };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const bodyStr = JSON.stringify(body);
  console.log('[openai] payload bytes:', bodyStr.length, '| messages:', messages.length, '| jsonMode:', jsonMode, '| model:', model);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: bodyStr,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.text();
      console.error('[openai] HTTP error', res.status, errBody);
      let msg = `OpenAI HTTP ${res.status}`;
      try { msg = JSON.parse(errBody)?.error?.message || msg; } catch {}
      throw new Error(msg);
    }
    const data = await res.json();
    return data.choices[0].message.content.trim();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') throw new Error('OpenAI timed out after 90s. Try fewer pages or shorter text.');
    throw err;
  }
}

function stripFences(s) {
  return s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

function normalizeAnalysis(raw) {
  const num = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };
  return {
    project_title:      String(raw.project_title || ''),
    client_name:        String(raw.client_name || ''),
    client_email:       String(raw.client_email || ''),
    client_phone:       String(raw.client_phone || ''),
    client_address:     String(raw.client_address || ''),
    scope_summary:      String(raw.scope_summary || ''),
    base_price:         Math.max(0, num(raw.base_price)),
    duration_weeks:     Math.max(0, parseInt(raw.duration_weeks) || 0),
    materials_included: raw.materials_included !== false
  };
}

async function analyzeProjectInput({ text, images = [], context }) {
  const trimmed = (text || '').trim();
  if (!trimmed && images.length === 0) {
    throw new Error('No text or images to analyze.');
  }

  const contextBlock = `CONTEXT (background — do NOT extract these as client info):
- Contractor email: headoffice@mlpexperience.com
- Contractor phone: (450) 500-8936
- Contractor RBQ: 5847-0378-01
- Today: ${context.today || new Date().toISOString().split('T')[0]}`;

  const userParts = [];
  if (images.length > 0) {
    userParts.push({
      type: 'text',
      text: `The contractor uploaded ${images.length} PDF page image(s)${trimmed ? ' and pasted text' : ''}. Read the page layout carefully — headings, tables, line items, signatures. Then produce the JSON object as specified.`
    });
  } else {
    userParts.push({ type: 'text', text: 'The contractor pasted the following project text. Produce the JSON object as specified.' });
  }

  if (trimmed) {
    userParts.push({ type: 'text', text: '\n\n=== PASTED TEXT ===\n' + trimmed + '\n=== END ===' });
  }
  for (const dataUrl of images) {
    userParts.push({ type: 'image_url', image_url: { url: dataUrl, detail: 'high' } });
  }
  userParts.push({ type: 'text', text: '\n\nReturn the JSON now. Remember: scope_summary is verbatim, other missing fields stay blank.' });

  const messages = [
    { role: 'system', content: ANALYZE_SYSTEM },
    { role: 'system', content: contextBlock },
    { role: 'user',   content: userParts }
  ];

  const raw = await openaiChat({ messages, temperature: 0.1, maxTokens: 4000, jsonMode: true, model: 'gpt-4o' });
  const cleaned = stripFences(raw);
  console.log('[GPT analyze raw]', cleaned.slice(0, 600));

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error('[GPT analyze JSON parse failed]', e, cleaned);
    throw new Error('AI returned invalid JSON. Raw: ' + cleaned.slice(0, 200));
  }
  return normalizeAnalysis(parsed);
}
