/* ============================================
   OpenAI integration — split into:
     1) plain ChatGPT-style conversation (callGPTChat)
     2) one-shot extractor that turns the conversation into a structured quote (extractQuoteFromConversation)
   MLP Reno & Design
   ============================================ */

const CHAT_SYSTEM = `You are ChatGPT, a helpful general-purpose assistant. Reply in the same language the user uses (French or English). Use markdown freely (bold, italics, lists, paragraphs) — behave exactly like a regular ChatGPT conversation, with no special framing or constraints. The user happens to own a renovation company in Quebec, but engage with whatever they bring up.`;

const EXTRACT_SYSTEM = `You convert a finished conversation between a Quebec contractor and an assistant into a structured quote draft.

Reply in the SAME language used in the conversation (French or English).

YOU MUST RETURN VALID JSON. No markdown, no code fences, no prose outside the JSON.

The JSON shape:
{
  "project_title": "short title",
  "options": [
    {
      "key": "A",
      "title": "Option A",
      "scope_summary": "2-5 sentences on what this option includes",
      "duration_weeks": 2,
      "materials_included": true,
      "price_mode": "single",
      "base_price": 19000,
      "line_items": [
        { "description": "short scope item", "quantity": 1 }
      ]
    }
  ],
  "assumptions": [],
  "questions": []
}

CORE RULE — THE CONVERSATION IS AUTHORITATIVE
Use only what was actually agreed in the conversation. If the contractor stated a specific price, quantity, duration, material decision, title, or budget, reproduce that exact value. Never substitute your own estimate over a value they gave.
You may estimate a value only when the conversation never specified one. When you estimate, add a short note to "assumptions".

OPTIONS / PRICING TIERS — HARD LIMITS
- MAXIMUM 3 OPTIONS. Never return more than 3 items in "options". If the conversation discusses more, keep the 3 most relevant and note the limit in "assumptions".
- If the conversation discussed multiple tiers, return them as separate options with materially different scopes.
- Otherwise return exactly ONE option.
- Each option's total is the sum of its OWN line_items — never merged across options.
- Option keys must be "A", "B", "C" in that order.
- TITLES: always set "title" to exactly "Option A", "Option B", or "Option C" matching the key. NEVER use marketing labels like "Basique", "Standard", "Premium", "Économique", "Deluxe", etc.

PRICING MODEL — READ CAREFULLY
Each option has ONE authoritative price: "base_price" (pre-tax, in CAD dollars). The customer's pre-tax total equals base_price. Taxes are added on top automatically by the app.

"line_items" are SCOPE items — a bulleted list of what the work includes (e.g. "Démolition", "Douche italienne", "Céramique plancher et murs"). They do NOT carry prices in single mode.

"price_mode": "single" (DEFAULT — one total, line_items are scope bullets) or "detailed" (per-line unit prices where base_price = sum of quantity × unit_price). Use "single" unless the conversation explicitly used per-item pricing. Default to "single".

RULES FOR base_price
1. If a project total was stated ("cuisine 19 000$", "salle de bain 15k total", "budget 25000"), set base_price to that EXACT number. Do not round, do not redistribute.
2. If no total was given, estimate a realistic Quebec residential price and add it to "assumptions".
3. base_price is ALWAYS pre-tax.
4. Leave "materials_budget" at 0 unless a separate materials cap was discussed.

RULES FOR line_items IN SINGLE MODE (the default)
- Each line is { "description": "scope item", "quantity": 1 }. unit_price is omitted/ignored in single mode.
- Produce 4–10 meaningful scope items describing what is included.

RULES FOR line_items IN DETAILED MODE (only when contractor used per-item pricing)
- Each line has { "description", "quantity", "unit_price" } and base_price = SUM(quantity × unit_price).
- The sum MUST exactly equal the stated total.

If the conversation is too vague to extract a usable quote, still return at least one option with realistic Quebec placeholder pricing and document your assumptions clearly in "assumptions".`;

/* ---------- Core fetch wrapper ---------- */
async function openaiChat({ messages, temperature = 0.2, maxTokens = 3500, jsonMode = false, model = 'gpt-4o-mini' }) {
  const body = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const bodyStr = JSON.stringify(body);
  console.log('[openai] payload bytes:', bodyStr.length, '| messages:', messages.length, '| jsonMode:', jsonMode);

  let lastErr;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);
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
      if (err.name === 'AbortError') throw new Error('OpenAI timed out after 45s. Try a shorter message.');
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

/* ---------- Helper: normalize one option ---------- */
function normalizeOption(o, idx) {
  const items = Array.isArray(o.line_items) ? o.line_items : [];
  const priceMode = o.price_mode === 'detailed' ? 'detailed' : 'single';
  const materialsIncluded = o.materials_included !== false;
  const normalizedItems = items.map(item => ({
    description: String(item.description || ''),
    quantity: Math.max(1, parseInt(item.quantity) || 1),
    unit_price: priceMode === 'detailed' ? Math.max(0, parseFloat(item.unit_price) || 0) : 0,
    materialsIncluded
  }));
  const basePriceRaw = parseFloat(o.base_price);
  let basePrice = Number.isFinite(basePriceRaw) ? Math.max(0, basePriceRaw) : 0;
  if (priceMode === 'detailed') {
    basePrice = normalizedItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  }
  const key = String(o.key || String.fromCharCode(65 + idx));
  return {
    key,
    title: `Option ${key}`,
    scope_summary: String(o.scope_summary || ''),
    duration_weeks: Math.max(1, parseInt(o.duration_weeks) || 2),
    materials_included: materialsIncluded,
    materials_budget: Math.max(0, parseFloat(o.materials_budget) || 0),
    price_mode: priceMode,
    base_price: basePrice,
    line_items: normalizedItems
  };
}

const MAX_OPTIONS = 3;

function normalizeDraft(raw) {
  const options = Array.isArray(raw.options) && raw.options.length
    ? raw.options.slice(0, MAX_OPTIONS).map(normalizeOption)
    : [];
  return {
    project_title: String(raw.project_title || ''),
    options,
    assumptions: Array.isArray(raw.assumptions) ? raw.assumptions.map(String) : [],
    questions: Array.isArray(raw.questions) ? raw.questions.map(String) : []
  };
}

/* ---------- Conversation filter (shared) ---------- */
function visibleTurns(conversation) {
  return conversation.filter(m => {
    if (m.role === 'user') return !!m.content?.trim();
    if (m.role === 'assistant') return m.content !== 'error' && m.content !== 'system-warning';
    return false;
  });
}

function turnText(m) {
  return m.role === 'assistant' ? (m.displayText || m.content || '') : (m.content || '');
}

/* ---------- 1) Plain ChatGPT-style chat ---------- */
async function callGPTChat(conversation /*, context (intentionally ignored to keep the chat unbiased) */) {
  const chatMsgs = visibleTurns(conversation).map(m => ({
    role: m.role,
    content: turnText(m)
  }));

  const messages = [
    { role: 'system', content: CHAT_SYSTEM },
    ...chatMsgs
  ];

  const reply = await openaiChat({ messages, temperature: 0.7, maxTokens: 2000, jsonMode: false, model: 'gpt-4o' });
  return reply;
}

/* ---------- 2) One-shot extractor: conversation -> structured draft ---------- */
async function extractQuoteFromConversation(conversation, context) {
  const turns = visibleTurns(conversation);
  if (!turns.length) {
    return { draft: { project_title: '', options: [], assumptions: [], questions: [] } };
  }

  const transcript = turns
    .map(m => `[${m.role === 'user' ? 'CONTRACTOR' : 'ASSISTANT'}] ${turnText(m)}`)
    .join('\n\n');

  const contextBlock = `CONTEXT
- Client: ${context.clientName || '(not provided)'}
- Address: ${context.clientAddress || '(not provided)'}
- Email: ${context.clientEmail || '(not provided)'}
- Phone: ${context.clientPhone || '(not provided)'}
- Quote date: ${context.quoteDate || new Date().toISOString().split('T')[0]}`;

  const userBlock = `CONVERSATION TRANSCRIPT TO CONVERT INTO A QUOTE DRAFT:

${transcript}

Now produce the JSON quote draft as specified.`;

  const messages = [
    { role: 'system', content: EXTRACT_SYSTEM },
    { role: 'system', content: contextBlock },
    { role: 'user', content: userBlock }
  ];

  const raw = await openaiChat({ messages, temperature: 0.1, maxTokens: 3500, jsonMode: true });
  const cleaned = stripFences(raw);

  console.log('[GPT extract raw]', cleaned);

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error('[GPT extract JSON parse failed]', e, cleaned);
    throw new Error('AI returned invalid JSON. Raw: ' + cleaned.slice(0, 200));
  }

  const draft = normalizeDraft(parsed);
  console.log('[GPT extract parsed]', { options: draft.options.length, project: draft.project_title });
  return { draft };
}
