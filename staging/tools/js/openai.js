/* ============================================
   OpenAI integration — single-pass analyzer.

   analyzeProjectInput({ text, images, context })
     -> { draft, questions }

   The analyzer reads the contractor's pasted text and/or uploaded
   images (photos of handwritten notes, screenshots, scope docs, etc.)
   and returns:
     - a structured quote draft (project_title + 1-3 options)
     - a list of "questions" for any required field the input did NOT
       provide. Each question carries a target field path so the UI
       can apply the contractor's answer directly to quoteState.
   MLP Reno & Design
   ============================================ */

const ANALYZE_SYSTEM = `You read raw notes from a Quebec residential contractor and produce a structured quote draft.

The notes can be:
- pasted text (an email, scope description, list of work, rough estimate, customer message, etc.)
- text extracted from photos / scanned documents / screenshots provided as images

Reply in the SAME language used in the notes (French or English).

YOU MUST RETURN VALID JSON. No markdown, no code fences, no prose outside the JSON.

★★★ ABSOLUTE RULE — NEVER REWRITE THE NOTES ★★★
You are a READER, not a writer. You must NOT paraphrase, summarize, condense, restructure, re-bullet, translate, "clean up", or fix typos. You must NOT add any wording that was not in the notes. You must NOT remove any wording either — including greetings, sign-offs, asides, and informal language. Copy the notes EXACTLY as written. Preserve paragraph breaks (use \\n), bullets, numbering, capitalization, punctuation, accents, spacing, and any markdown that was already there. Treat the notes as if they were a legal document being quoted in court.

If you find yourself "improving" the text in any way, STOP. The contractor must recognize their own words byte-for-byte in the output. The ONLY thing you do with the notes is split them into option blocks (when multiple tiers are described) and copy them into the JSON unchanged.

The JSON shape:
{
  "project_title": "<verbatim title pulled from the notes, or empty string if not stated>",
  "options": [
    {
      "key": "A",
      "scope_summary": "<the EXACT verbatim text from the notes for this option>",
      "duration_weeks": 0,
      "materials_included": true,
      "base_price": 19000
    }
  ],
  "questions": [
    {
      "id": "q1",
      "label": "Question to the contractor (in the same language as the notes)",
      "field": "options.A.base_price",
      "type": "currency",
      "suggestions": ["15000", "20000", "25000"]
    }
  ]
}

CORE RULES

1. SCOPE SUMMARY — VERBATIM, NO EXCEPTIONS
   "scope_summary" must contain the scope text from the notes copied EXACTLY as written. No paraphrasing, no summarizing, no typo fixing, no greeting/sign-off stripping, nothing. If there are 5 paragraphs of small talk inside the scope, copy all 5. The contractor will edit their own text in the next step if they want to.

2. OPTIONS / TIERS — MAX 3
   - If the notes clearly describe multiple tiers (e.g. Basic / Standard / Premium, économique / standard / haut de gamme, 2-3 price points), return them as separate options. Each option's scope_summary is the EXACT verbatim slice of the notes that describes THAT tier — do not rewrite it to make tiers parallel or symmetric.
   - Otherwise return EXACTLY ONE option whose scope_summary is the COMPLETE notes text, byte-for-byte.
   - Option keys must be "A", "B", "C" in that order. Never use marketing labels.

3. PROJECT TITLE — VERBATIM OR ASK
   - If the notes contain an obvious title (a heading, "Soumission pour…", "Project: …", subject line, etc.), copy it VERBATIM into project_title.
   - If no title is obvious in the notes, set project_title to "" AND emit a question of type "text" targeting "project_title". Do NOT invent a title.

4. PRICING — NEVER INVENT
   - If the notes state a total price for the option ("19 000$", "15k", "budget 25000"), set base_price to that EXACT number (pre-tax, CAD).
   - If no price is stated for the option, set base_price to 0 AND emit a question of type "currency" targeting "options.<KEY>.base_price". Do NOT estimate or guess a price.
   - base_price is ALWAYS pre-tax. Taxes are added by the app.

5. DURATION — NEVER INVENT
   - Integer weeks. If the notes state it for the option, use it.
   - If not stated, set duration_weeks to 0 AND emit a question of type "number" targeting "options.<KEY>.duration_weeks". Do NOT estimate.

6. MATERIALS — NEVER INVENT
   - Boolean. If the notes are explicit ("matériaux inclus", "sans matériaux", "main d'œuvre seulement"), use that.
   - If not stated, leave the field as true (placeholder) AND emit a question of type "choice" with suggestions ["Inclus", "Exclus"] (or ["Included", "Excluded"]) targeting "options.<KEY>.materials_included". Do NOT decide on the contractor's behalf.

7. QUESTIONS — REQUIRED FIELDS ONLY
   For every required field NOT explicitly provided by the notes, emit ONE question. Required fields:
     - project_title
     - per option: duration_weeks, base_price, materials_included
   You do NOT ask about scope_summary — the scope IS the notes, verbatim.
   Do NOT ask about anything outside this list. Maximum 6 questions total.

QUESTION SHAPE
   - "id": unique short id like "q1", "q2"...
   - "label": the question shown to the contractor, in the same language as the notes
   - "field": dot path to the value the answer fills:
       "project_title"
       "options.A.duration_weeks" | "options.A.base_price" | "options.A.materials_included"
       (use the correct option key — A, B, or C)
   - "type": one of "text" | "number" | "currency" | "choice"
   - "suggestions": 2-4 short suggested answers the contractor can click. For "choice", these are the only valid values. For "currency"/"number", these are realistic Quebec-residential ranges (numeric strings, no $ sign) — these are CHOICES the contractor picks, not your estimate going into the quote. For "text", short example phrasings.

DO NOT include an "assumptions" field. You don't make assumptions — you ask questions instead.`;

/* ---------- Core fetch wrapper ---------- */
async function openaiChat({ messages, temperature = 0.2, maxTokens = 3500, jsonMode = false, model = 'gpt-4o' }) {
  const body = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const bodyStr = JSON.stringify(body);
  console.log('[openai] payload bytes:', bodyStr.length, '| messages:', messages.length, '| jsonMode:', jsonMode, '| model:', model);

  let lastErr;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
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
      lastErr = err;
      console.warn(`[openai] attempt ${attempt} failed:`, err.name, err.message);
      if (err.name === 'AbortError') throw new Error('OpenAI timed out after 60s. Try a shorter input or smaller image.');
      if (attempt === 1 && err instanceof TypeError) {
        await new Promise(r => setTimeout(r, 500));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

function stripFences(s) {
  return s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

/* ---------- Normalizers ---------- */
function normalizeOption(o, idx) {
  const materialsIncluded = o.materials_included !== false;
  const basePriceRaw = parseFloat(o.base_price);
  const basePrice = Number.isFinite(basePriceRaw) ? Math.max(0, basePriceRaw) : 0;
  const key = String(o.key || String.fromCharCode(65 + idx));
  return {
    key,
    title: `Option ${key}`,
    scope_summary: String(o.scope_summary || ''),
    duration_weeks: Math.max(1, parseInt(o.duration_weeks) || 2),
    materials_included: materialsIncluded,
    materials_budget: 0,
    price_mode: 'single',
    base_price: basePrice,
    line_items: []
  };
}

const VALID_TYPES = new Set(['text', 'number', 'currency', 'choice']);
const VALID_FIELDS_TOP = new Set(['project_title']);
const VALID_FIELDS_OPT = new Set(['duration_weeks', 'base_price', 'materials_included']);

function isValidField(path, optionKeys) {
  if (VALID_FIELDS_TOP.has(path)) return true;
  const m = /^options\.([A-Z])\.(\w+)$/.exec(path);
  if (!m) return false;
  return optionKeys.has(m[1]) && VALID_FIELDS_OPT.has(m[2]);
}

function normalizeQuestion(q, optionKeys, idx) {
  if (!q || !q.field || !q.label) return null;
  if (!isValidField(String(q.field), optionKeys)) return null;
  const type = VALID_TYPES.has(q.type) ? q.type : 'text';
  let suggestions = Array.isArray(q.suggestions) ? q.suggestions.map(String).slice(0, 6) : [];
  if (type === 'choice' && suggestions.length === 0) {
    suggestions = ['Oui', 'Non'];
  }
  const safeId = String(q.id || `q${idx + 1}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || `q${idx + 1}`;
  return {
    id: safeId,
    label: String(q.label),
    field: String(q.field),
    type,
    suggestions
  };
}

const MAX_OPTIONS = 3;
const MAX_QUESTIONS = 6;

function normalizeAnalysis(raw) {
  const options = (Array.isArray(raw.options) && raw.options.length
    ? raw.options.slice(0, MAX_OPTIONS).map(normalizeOption)
    : []);
  const optionKeys = new Set(options.map(o => o.key));
  const questions = (Array.isArray(raw.questions) ? raw.questions : [])
    .map((q, i) => normalizeQuestion(q, optionKeys, i))
    .filter(Boolean)
    .slice(0, MAX_QUESTIONS);
  return {
    draft: {
      project_title: String(raw.project_title || ''),
      options
    },
    questions
  };
}

/* ---------- Public: single-pass analyzer ---------- */
async function analyzeProjectInput({ text, images = [], context }) {
  const trimmed = (text || '').trim();
  if (!trimmed && images.length === 0) {
    return {
      draft: { project_title: '', options: [] },
      questions: []
    };
  }

  const contextBlock = `CONTEXT
- Client: ${context.clientName || '(not provided)'}
- Address: ${context.clientAddress || '(not provided)'}
- Email: ${context.clientEmail || '(not provided)'}
- Phone: ${context.clientPhone || '(not provided)'}
- Quote date: ${context.quoteDate || new Date().toISOString().split('T')[0]}`;

  const userParts = [];
  const intro = images.length > 0
    ? `The contractor uploaded ${images.length} image(s)${trimmed ? ' and pasted text' : ''}. Read every image carefully (handwritten notes, screenshots, etc.) and combine with the pasted text. Then produce the JSON quote draft as specified.`
    : `The contractor's notes:`;
  userParts.push({ type: 'text', text: intro });
  if (trimmed) {
    userParts.push({ type: 'text', text: '\n\n=== PASTED TEXT ===\n' + trimmed + '\n=== END ===' });
  }
  for (const dataUrl of images) {
    userParts.push({ type: 'image_url', image_url: { url: dataUrl } });
  }
  userParts.push({ type: 'text', text: '\n\nNow produce the JSON quote draft as specified.' });

  const messages = [
    { role: 'system', content: ANALYZE_SYSTEM },
    { role: 'system', content: contextBlock },
    { role: 'user', content: userParts }
  ];

  const raw = await openaiChat({
    messages,
    temperature: 0.1,
    maxTokens: 3500,
    jsonMode: true,
    model: 'gpt-4o'
  });
  const cleaned = stripFences(raw);
  console.log('[GPT analyze raw]', cleaned);

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error('[GPT analyze JSON parse failed]', e, cleaned);
    throw new Error('AI returned invalid JSON. Raw: ' + cleaned.slice(0, 200));
  }

  const result = normalizeAnalysis(parsed);
  console.log('[GPT analyze parsed]', {
    options: result.draft.options.length,
    questions: result.questions.length,
    project: result.draft.project_title
  });
  return result;
}
