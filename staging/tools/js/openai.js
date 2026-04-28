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
      "scope_summary": "<verbatim proposal text from the assistant>",
      "duration_weeks": 2,
      "materials_included": true,
      "base_price": 19000,
      "line_items": []
    }
  ],
  "assumptions": [],
  "questions": []
}

CORE RULE — DO NOT REWRITE THE SCOPE
"scope_summary" MUST contain the assistant's most recent proposal/scope text VERBATIM. Copy it as the assistant wrote it. Preserve paragraph breaks (use \\n), bullets, numbering, and any markdown formatting that was in the conversation. Do NOT summarize, paraphrase, condense, restructure, re-bullet, or shorten it. Strip ONLY pure greetings/sign-offs ("Bonjour ...", "Voici ma proposition :", "N'hésitez pas...") if they carry no scope information.

LINE ITEMS — ALWAYS EMPTY
"line_items" MUST be []. Do NOT generate scope items, bullet lists, or per-item rows. The contractor will add line items manually in the next step if they want a per-item breakdown. Returning a non-empty line_items array is a hard error.

OPTIONS / TIERS — HARD LIMITS
- MAXIMUM 3 OPTIONS in "options".
- If the conversation discussed multiple tiers (e.g. Basic / Standard / Premium), return them as separate options. Each option's "scope_summary" is the verbatim text describing THAT tier (split it out of the assistant's reply).
- Otherwise return exactly ONE option whose scope_summary is the assistant's full proposal text.
- Option keys must be "A", "B", "C" in that order. Title is exactly "Option A", "Option B", "Option C". NEVER use marketing labels like "Basique", "Premium", "Économique", "Deluxe".

PRICING — base_price IS AUTHORITATIVE
1. If the contractor stated a total price ("cuisine 19 000$", "15k total", "budget 25000"), set base_price to that EXACT number (pre-tax, CAD).
2. If no total was stated, estimate a realistic Quebec residential price and add a short note in "assumptions".
3. base_price is ALWAYS pre-tax. Taxes are added automatically by the app.

OTHER FIELDS
- "duration_weeks": integer, from the conversation if stated, otherwise estimated.
- "materials_included": boolean, from the conversation; default true.
- "assumptions": short notes about anything you estimated.
- "questions": short open questions for the contractor (max 3, optional).`;

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

/* ---------- Helper: normalize one option ----------
   Force line_items to []: the conversation text lives verbatim in scope_summary.
   The contractor adds line items manually in the editor if they want a breakdown. */
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
