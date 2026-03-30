/* ============================================
   OpenAI GPT Integration — MLP Reno & Design
   ============================================ */

async function callGPT(systemPrompt, userPrompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.4,
      max_tokens: 2000
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI API error: ${res.status}`);
  }

  const data = await res.json();
  return data.choices[0].message.content.trim();
}

// ---- Quote AI Polish ----
async function aiPolishScopeGPT(text, lang) {
  if (!text || !text.trim()) return text;
  const langLabel = lang === 'fr' ? 'French' : 'English';
  const system = `You are a professional document writer for MLP Reno & Design, a residential renovation contractor in Quebec.
Rewrite the scope of work into clean, professional bullet points.
Output ONLY the bullet points, one per line, prefixed with "• ".
Write in ${langLabel}. Keep it concise and professional. Do not add items that were not in the original.`;
  return await callGPT(system, text);
}

async function aiPolishLineItemsGPT(items, lang) {
  if (!items.length) return items;
  const langLabel = lang === 'fr' ? 'French' : 'English';
  const descriptions = items.map((item, i) => `${i + 1}. ${item.description || '(empty)'}`).join('\n');
  const system = `You are a professional document writer for MLP Reno & Design, a residential renovation contractor in Quebec.
Rewrite each line item description to be clear, professional, and concise.
Output ONLY a numbered list matching the input numbering. One description per line, format: "1. Description"
Write in ${langLabel}. Do not add new items. If a description is empty, return it as-is.`;

  const result = await callGPT(system, descriptions);
  const lines = result.split('\n').filter(l => l.trim());
  return items.map((item, i) => {
    const match = lines.find(l => l.match(new RegExp(`^${i + 1}\\.\\s*`)));
    if (match) {
      return { ...item, description: match.replace(/^\d+\.\s*/, '').trim() };
    }
    return item;
  });
}

// ---- AI Generate Line Items from Prompt ----
async function aiGenerateLineItemsGPT(prompt, lang) {
  const langLabel = lang === 'fr' ? 'French' : 'English';
  const system = `You are a professional estimator for MLP Reno & Design, a residential renovation contractor in Quebec.
The user will describe a project or list rough tasks. Your job is to:
1. Decide which parts are line items (billable work) vs general scope description.
2. Return ONLY the line items as a JSON array.

Each line item object must have:
- "description": professional ${langLabel} description of the work
- "quantity": number (default 1 if unclear)
- "unit_price": estimated price in CAD as a number (use realistic Quebec renovation pricing). If the user mentions a budget, distribute costs accordingly.
- "total_price": quantity × unit_price

Also return a "scope" field: a clean, professional ${langLabel} summary of the overall project scope (bullet points with "• " prefix, one per line).

Output ONLY valid JSON in this exact format, no markdown fences:
{
  "scope": "• bullet one\\n• bullet two",
  "line_items": [
    {"description": "...", "quantity": 1, "unit_price": 1500, "total_price": 1500}
  ]
}

Rules:
- General descriptions like "bathroom reno" or "budget 12k" are NOT line items — they inform the scope and pricing.
- Specific tasks like "demo", "tile install", "plumbing", "paint" ARE line items.
- Use realistic residential renovation pricing for Quebec.
- If the user mentions a total budget, make the line items add up close to that amount.
- Keep it concise: typically 4-10 line items for a standard renovation.`;

  const result = await callGPT(system, prompt);
  // Strip markdown fences if GPT wraps in ```json
  const cleaned = result.replace(/^```json?\s*/, '').replace(/\s*```$/, '');
  return JSON.parse(cleaned);
}

// ---- Email AI Polish ----
async function aiPolishEmailGPT(subject, body, lang, purpose, context) {
  const langLabel = lang === 'fr' ? 'French' : 'English';
  const purposeMap = {
    'send-quote': 'sending a quote',
    'send-invoice': 'sending an invoice',
    'follow-up': 'following up on a quote',
    'approval': 'requesting project approval',
    'payment-reminder': 'sending a payment reminder'
  };
  const purposeLabel = purposeMap[purpose] || purpose;

  const system = `You are a professional email writer for MLP Reno & Design, a residential renovation contractor in Quebec.
Rewrite this business email to be warm, professional, and polished. The email is for: ${purposeLabel}.
Write in ${langLabel}. Keep the same structure and information but improve the tone and wording.
${context ? `Additional context from the user: ${context}` : ''}
Output the result in this exact format:
SUBJECT: <the subject line>
---
<the email body>`;

  const result = await callGPT(system, `Subject: ${subject}\n\n${body}`);
  const parts = result.split('---');
  let newSubject = subject;
  let newBody = body;

  if (parts.length >= 2) {
    const subjectLine = parts[0].trim();
    const subjectMatch = subjectLine.match(/^SUBJECT:\s*(.+)/i);
    if (subjectMatch) newSubject = subjectMatch[1].trim();
    newBody = parts.slice(1).join('---').trim();
  }

  return { subject: newSubject, body: newBody };
}
