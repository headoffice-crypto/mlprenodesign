/* ============================================
   OpenAI GPT — Line Items Only
   MLP Reno & Design Quote Builder
   ============================================ */

const GPT_PROMPT_FR = `Tu es un assistant pour MLP Reno & Design, un entrepreneur en rénovation résidentielle au Québec (Licence RBQ: 5847-0378-01).

Transforme cette description de projet en postes de soumission clairs, professionnels et concis.

RÈGLES STRICTES:
- N'invente PAS de travaux majeurs qui ne sont pas décrits
- Regroupe logiquement les postes
- Utilise des prix réalistes pour la rénovation résidentielle au Québec
- Tous les prix sont AVANT TAXES
- Si un budget est mentionné, ajuste les prix pour respecter ce budget total
- Retourne UNIQUEMENT un tableau JSON, rien d'autre (pas de texte, pas de markdown)
- Chaque poste: description, quantity (nombre), unit_price (nombre)
- Descriptions courtes et professionnelles (ex: "Démolition et évacuation des débris")
- Typiquement 4 à 12 postes

EXEMPLE DE RÉPONSE:
[{"description":"Démolition et évacuation","quantity":1,"unit_price":2500},{"description":"Installation plancher flottant","quantity":1,"unit_price":3800}]`;

const GPT_PROMPT_EN = `You are an assistant for MLP Reno & Design, a residential renovation contractor in Quebec (RBQ Licence: 5847-0378-01).

Convert this project description into clean, professional, concise quote line items.

STRICT RULES:
- Do NOT invent major work not described
- Group items logically
- Use realistic Quebec residential renovation pricing
- All prices are BEFORE TAXES
- If a budget is mentioned, adjust prices to match that total budget
- Return ONLY a JSON array, nothing else (no text, no markdown)
- Each item: description, quantity (number), unit_price (number)
- Keep descriptions short and professional (e.g. "Demolition and debris removal")
- Typically 4 to 12 items

EXAMPLE RESPONSE:
[{"description":"Demolition and debris removal","quantity":1,"unit_price":2500},{"description":"Floating floor installation","quantity":1,"unit_price":3800}]`;

async function callGPTLineItems(projectDescription, lang) {
  const systemPrompt = lang === 'fr' ? GPT_PROMPT_FR : GPT_PROMPT_EN;

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
        { role: 'user', content: projectDescription }
      ],
      temperature: 0.3,
      max_tokens: 3000
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error: ${res.status}`);
  }

  const data = await res.json();
  const raw = data.choices[0].message.content.trim();
  const cleaned = raw.replace(/^```json?\s*/, '').replace(/\s*```$/, '');

  let items;
  try {
    items = JSON.parse(cleaned);
  } catch {
    throw new Error(lang === 'fr' ? 'Format invalide. Réessayez.' : 'Invalid format. Try again.');
  }

  if (!Array.isArray(items)) {
    throw new Error(lang === 'fr' ? 'Réponse inattendue.' : 'Unexpected response.');
  }

  return items.map(item => ({
    description: String(item.description || ''),
    quantity: Math.max(1, parseInt(item.quantity) || 1),
    unit_price: Math.max(0, parseFloat(item.unit_price) || 0)
  }));
}
