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

OPTIONS / PRICING TIERS — HARD LIMITS
- MAXIMUM 3 OPTIONS. NEVER return more than 3 items in the "options" array. If the contractor asks for "4 options" or more, return 3 and note the limit in "assumptions".
- If the contractor asks for multiple tiers ("basique/standard/premium", "good/better/best", "2 ou 3 options"), return 2 or 3 options with materially different scopes.
- Otherwise return exactly ONE option.
- Each option's total is the sum of its OWN line_items — never merged across options.
- Option keys must be "A", "B", "C" in that order — never D, E, F.

PRICING RULES — CRITICAL, READ CAREFULLY
The customer-facing total for an option is computed as:  total = SUM of (line_item.quantity × line_item.unit_price). Nothing else. materials_budget is NEVER added to this total.

"materials_budget" is an INTERNAL informational cap only (e.g. "keep materials under $8000"). It is displayed as a reference note to the contractor. It is NOT the price the customer pays. You may leave it at 0 almost always. Only populate it when the contractor explicitly mentions a separate materials cap that is different from the project price.

WHEN THE CONTRACTOR STATES A PROJECT TOTAL (e.g. "cuisine 19 000$", "salle de bain 15k total", "budget 25000"):
1. That number is the customer's total price.
2. You MUST distribute it across realistic line_items so that SUM(qty × unit_price) equals that stated total.
3. Produce 4–10 meaningful line items covering the actual scope of work (e.g. Démolition, Plomberie, Électricité, Céramique, Armoires, Main-d'œuvre, Finitions, Peinture). Do NOT collapse everything into a single catch-all line.
4. NEVER put the project total into materials_budget. NEVER leave line_items with unit_price=0 when a total is known.
5. Use realistic Quebec residential ratios as a starting point for the breakdown (roughly: labor 40-55%, materials 30-45%, demolition/disposal 5-10%, permits/misc 2-5%). Round to clean numbers. Sum MUST match the stated total exactly.

EXAMPLES OF CORRECT OUTPUT
Contractor says: "salle de bain 19 000$ tout inclus"
WRONG (do not do this):
  line_items: [{description:"Démolition",qty:1,unit_price:0}, {description:"Douche",qty:1,unit_price:0}, ...], materials_budget: 19000
  → subtotal = $0 ❌
CORRECT:
  line_items: [
    {description:"Démolition et disposition", qty:1, unit_price:1500},
    {description:"Plomberie (drain + alimentation)", qty:1, unit_price:2500},
    {description:"Douche italienne complète", qty:1, unit_price:4000},
    {description:"Céramique plancher et murs", qty:1, unit_price:3500},
    {description:"Vanité + nouvelle toilette", qty:1, unit_price:2000},
    {description:"Électricité (ventilateur, luminaires)", qty:1, unit_price:1000},
    {description:"Peinture et finitions", qty:1, unit_price:1500},
    {description:"Main-d'œuvre coordination", qty:1, unit_price:3000}
  ], materials_budget: 0
  → subtotal = $19,000 ✓ (matches stated total)

WHEN THE CONTRACTOR GIVES A PER-ITEM PRICE (e.g. "démolition 3000$"):
Use the exact unit_price they provided for that line. Estimate other lines to complete the scope. No materials_budget involvement.

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

  const bodyStr = JSON.stringify(body);
  console.log('[openai] payload bytes:', bodyStr.length, '| messages:', messages.length);

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
      // Only retry on network-level failures (TypeError "Failed to fetch"), not HTTP errors
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

/* ---------- Main: single-call chat WITH live draft ---------- */
async function callGPTChatWithDraft(conversation, context, currentDraft) {
  const contextBlock = `CURRENT QUOTE CONTEXT
- Client: ${context.clientName || '(not provided)'}
- Address: ${context.clientAddress || '(not provided)'}
- Email: ${context.clientEmail || '(not provided)'}
- Phone: ${context.clientPhone || '(not provided)'}
- Quote date: ${context.quoteDate || new Date().toISOString().split('T')[0]}`;

  // Conversation shape sent to GPT:
  //   - user messages: as typed
  //   - assistant messages: their NATURAL-LANGUAGE reply only (displayText), not the full JSON draft
  //   - filter out error / system-warning pseudo-messages so they never pollute GPT's context
  const chatMsgs = conversation
    .filter(m => {
      if (m.role === 'user') return !!m.content?.trim();
      if (m.role === 'assistant') return m.content !== 'error' && m.content !== 'system-warning';
      return false;
    })
    .map(m => ({
      role: m.role,
      content: m.role === 'assistant'
        ? (m.displayText || '(draft updated)')
        : m.content
    }));

  // Summarize the current draft so GPT can build on it without seeing its own JSON echoed back
  let draftBlock = '';
  if (currentDraft && currentDraft.options && currentDraft.options.length) {
    draftBlock = 'CURRENT DRAFT STATE — PRESERVE UNLESS THE CONTRACTOR CHANGES IT:\n';
    draftBlock += `Project: ${currentDraft.project_title || '(none)'}\n`;
    currentDraft.options.forEach(opt => {
      const total = opt.line_items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
      draftBlock += `\nOption ${opt.key} — ${opt.title} ($${total})`;
      draftBlock += `\n  Duration: ${opt.duration_weeks}w | Materials ${opt.materials_included ? 'included' : 'excluded'}`;
      draftBlock += `\n  Scope: ${opt.scope_summary}`;
      opt.line_items.forEach(i => {
        draftBlock += `\n  - ${i.description} x${i.quantity} @ $${i.unit_price}`;
      });
    });
  }

  const messages = [
    { role: 'system', content: CHAT_WITH_DRAFT_SYSTEM },
    { role: 'system', content: contextBlock },
    ...(draftBlock ? [{ role: 'system', content: draftBlock }] : []),
    ...chatMsgs
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
