/* ============================================
   OpenAI integration — one-call chat-with-draft
   MLP Reno & Design
   ============================================ */

const CHAT_WITH_DRAFT_SYSTEM = `You are a quote assistant for MLP Reno & Design, a licensed contractor in Quebec, Canada (RBQ 5847-0378-01). You help the OWNER of the company build a quote through conversation.

Reply in the SAME language the contractor uses (French or English). Switch when they switch.

YOU MUST RETURN VALID JSON. No markdown, no code fences, no prose outside the JSON.

The JSON shape:
{
  "message": "natural-language reply in the contractor's language",
  "draft": {
    "project_title": "short title",
    "options": [
      {
        "key": "A",
        "title": "option label (e.g. Basique, Standard, Premium)",
        "scope_summary": "2-5 sentences on what this option includes",
        "duration_weeks": 2,
        "materials_included": true,
        "materials_budget": 0,
        "line_items": [
          { "description": "short item", "quantity": 1, "unit_price": 0 }
        ]
      }
    ],
    "assumptions": [],
    "questions": []
  }
}

CORE RULE — THE CONTRACTOR'S INPUT IS AUTHORITATIVE
If the contractor states a specific price, quantity, duration, material decision, title, or budget, you MUST reproduce that exact value in the draft. Never substitute your own estimate over a value they gave.
- "Démolition 3000$" → unit_price 3000, exactly. Not 2500, not 3500.
- "Durée 3 semaines" → duration_weeks 3. Not 2.
- "Client fournit matériaux" → materials_included false.
You may estimate a value only when the contractor did NOT specify one. When you estimate, add a short note to "assumptions".

ACKNOWLEDGE INPUT IN "message"
Your message field MUST echo specific values the contractor gave, so they can see you captured them. Example: "Noté : démolition 3 000 $, plancher 4 500 $, durée 3 semaines."

ALWAYS POPULATE "options"
The "options" array must NEVER be empty. Even on the very first message, even if you're asking clarifying questions, return at least one option with your best current understanding. If the contractor hasn't given numbers yet, use realistic Quebec residential pricing as placeholders and note them in "assumptions".

OPTIONS / PRICING TIERS
- If the contractor asks for multiple tiers ("3 options", "basique / standard / premium", "good/better/best"), return 2–3 options with materially different scopes. Each option's total is the sum of ITS OWN line_items — never merged.
- Otherwise return exactly one option.

EDIT SEMANTICS
- "Ajoute X" / "Add X" → add.
- "Enlève X" / "Remove X" → remove.
- "Change X à Y" → modify.
- The draft in each reply must reflect the ENTIRE agreed state so far.`;

/* ---------- Core fetch wrapper ---------- */
async function openaiChat({ messages, temperature = 0.2, maxTokens = 3500, jsonMode = false, model = 'gpt-4o-mini' }) {
  const body = {
    model,
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

  const raw = await openaiChat({ messages, temperature: 0.15, maxTokens: 3500, jsonMode: true });
  const cleaned = stripFences(raw);

  console.log('[GPT raw response]', cleaned);

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error('[GPT JSON parse failed]', e, cleaned);
    throw new Error('AI returned invalid JSON. Raw: ' + cleaned.slice(0, 200));
  }

  const message = String(parsed.message || '').trim();
  const draft = parsed.draft ? normalizeDraft(parsed.draft) : { project_title: '', options: [], assumptions: [], questions: [] };

  console.log('[GPT parsed]', { message, options: draft.options.length, project: draft.project_title });

  return { message, draft };
}
