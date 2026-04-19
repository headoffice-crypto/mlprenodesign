/* ============================================
   OpenAI integration — one-call chat-with-draft
   MLP Reno & Design
   ============================================ */

const CHAT_WITH_DRAFT_SYSTEM = `You are a senior residential renovation consultant for MLP Reno & Design, a licensed contractor in Quebec, Canada (RBQ Licence: 5847-0378-01).

YOUR ROLE
- Help MLP's owner scope and price a specific project through natural conversation.
- Behave like ChatGPT: conversational, expert, specific, practical.
- Use realistic Quebec residential pricing, in CAD, BEFORE TAXES.
- Ask clarifying questions when details materially affect pricing (dimensions, access, finishes, existing conditions, condo vs. house, permits, timeline, budget).
- Reference the client's context (address, name) when relevant.

LANGUAGE
- Reply in the SAME language the user writes in (French or English). If they switch languages, you switch too.

RESPONSE FORMAT — MANDATORY, EVERY REPLY
Return valid JSON with exactly these two fields:

{
  "message": "your natural conversational reply, in the user's language",
  "draft": {
    "project_title": "short descriptive title",
    "options": [
      {
        "key": "A",
        "title": "option label (e.g. 'Option A — Base' or 'Basique' or just the project name if single-option)",
        "scope_summary": "2-5 sentences describing what this option includes",
        "duration_weeks": integer,
        "materials_included": true | false,
        "materials_budget": number (0 if excluded),
        "line_items": [
          { "description": "short professional line", "quantity": number, "unit_price": number }
        ]
      }
    ],
    "assumptions": ["strings describing assumptions you made"],
    "questions": ["strings for questions you'd like answered to improve accuracy"]
  }
}

OPTIONS BEHAVIOR
- If the contractor clearly asks for multiple pricing tiers ("trois options", "good/better/best", "offrir deux prix", "basique et premium"), return 2–3 options with DIFFERENT scopes and prices — not just a markup.
- Otherwise return a SINGLE option (options array length 1) representing the agreed scope.
- Each option is self-contained: its own line items, its own total (computed from quantity × unit_price summed). NEVER merge totals across options.
- 4–12 line items per option, logically grouped, realistic Quebec residential pricing.
- Tiers should differ by: materials quality, scope boundaries, inclusions (appliances, plumbing, electrical), finish level — not just price.

RULES
- Never invent major work that wasn't discussed.
- If the contractor says "ignore that" or "remove X", actually remove it from the draft.
- The draft in EACH reply must reflect EVERYTHING agreed so far — the contractor sees it live and expects it current.
- JSON ONLY. No markdown fences, no prose outside the JSON.`;

/* ---------- Core fetch wrapper ---------- */
async function openaiChat({ messages, temperature = 0.4, maxTokens = 3500, jsonMode = false }) {
  const body = {
    model: 'gpt-4o-mini',
    messages,
    temperature,
    max_tokens: maxTokens
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error: ${res.status}`);
  }
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

function stripFences(s) {
  return s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

/* ---------- Helper: normalize one option ---------- */
function normalizeOption(o, idx) {
  const items = Array.isArray(o.line_items) ? o.line_items : [];
  return {
    key: String(o.key || String.fromCharCode(65 + idx)),
    title: String(o.title || `Option ${String.fromCharCode(65 + idx)}`),
    scope_summary: String(o.scope_summary || ''),
    duration_weeks: Math.max(1, parseInt(o.duration_weeks) || 2),
    materials_included: o.materials_included !== false,
    materials_budget: Math.max(0, parseFloat(o.materials_budget) || 0),
    line_items: items.map(item => ({
      description: String(item.description || ''),
      quantity: Math.max(1, parseInt(item.quantity) || 1),
      unit_price: Math.max(0, parseFloat(item.unit_price) || 0),
      materialsIncluded: o.materials_included !== false
    }))
  };
}

function normalizeDraft(raw) {
  const options = Array.isArray(raw.options) && raw.options.length
    ? raw.options.map(normalizeOption)
    : [];
  return {
    project_title: String(raw.project_title || ''),
    options,
    assumptions: Array.isArray(raw.assumptions) ? raw.assumptions.map(String) : [],
    questions: Array.isArray(raw.questions) ? raw.questions.map(String) : []
  };
}

/* ---------- Main: single-call chat WITH live draft ---------- */
async function callGPTChatWithDraft(conversation, context) {
  const contextBlock = `CURRENT QUOTE CONTEXT
- Client: ${context.clientName || '(not provided)'}
- Address: ${context.clientAddress || '(not provided)'}
- Email: ${context.clientEmail || '(not provided)'}
- Phone: ${context.clientPhone || '(not provided)'}
- Quote date: ${context.quoteDate || new Date().toISOString().split('T')[0]}`;

  const messages = [
    { role: 'system', content: CHAT_WITH_DRAFT_SYSTEM },
    { role: 'system', content: contextBlock },
    ...conversation.map(m => ({ role: m.role, content: m.content }))
  ];

  const raw = await openaiChat({ messages, temperature: 0.5, maxTokens: 3500, jsonMode: true });
  const cleaned = stripFences(raw);

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('The AI returned an invalid format. Please try again.');
  }

  const message = String(parsed.message || '').trim();
  const draft = parsed.draft ? normalizeDraft(parsed.draft) : { project_title: '', options: [], assumptions: [], questions: [] };

  return { message, draft };
}
