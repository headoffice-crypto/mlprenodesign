// Supabase Edge Function — fix-grammar
// Light-touch grammar and spelling correction for French (or English) text
// written by the contractor. Preserves the scope-markdown markers used in
// the rest of the app (## heading, ### sub-heading, - bullet, **bold**) and
// preserves meaning — no rewriting, no shortening, no embellishment.
//
// Input:  { text: string, lang?: 'fr' | 'en' }
// Output: { text: string }  // corrected text, no fences, no prose

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

const SYSTEM_FR = `Tu corriges l'orthographe, la grammaire, la ponctuation et les accents d'un texte écrit par un entrepreneur en rénovation au Québec.

RÈGLES ABSOLUES :
- Préserve EXACTEMENT le sens. Ne reformule pas, n'embellis pas, ne raccourcis pas, n'allonge pas.
- Préserve la structure ligne par ligne. Ne fusionne pas les lignes, ne sépare pas un paragraphe.
- Préserve les marqueurs Markdown tels quels en début de ligne : "## ", "### ", "- ", "* ".
- Préserve les emphases **gras** au même endroit.
- Préserve les chiffres, montants, dimensions, numéros et noms propres exactement.
- Français du Québec (terminologie courante en construction au Québec).

RÉPONSE :
Retourne UNIQUEMENT le texte corrigé. Aucune balise de code, aucune explication, aucun préambule, aucun commentaire. Si le texte est déjà correct, retourne-le tel quel.`;

const SYSTEM_EN = `You correct spelling, grammar, and punctuation in text written by a Quebec renovation contractor.

ABSOLUTE RULES:
- Preserve meaning EXACTLY. Do not paraphrase, embellish, shorten, or expand.
- Preserve line-by-line structure. Do not merge or split lines.
- Preserve Markdown markers at the start of lines as-is: "## ", "### ", "- ", "* ".
- Preserve **bold** emphasis in place.
- Preserve numbers, amounts, dimensions, identifiers, and proper nouns exactly.

RESPONSE:
Return ONLY the corrected text. No code fences, no explanation, no preamble, no commentary. If the text is already correct, return it unchanged.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST")    return jsonResp({ error: "POST only" }, 405);

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
    if (!ANTHROPIC_API_KEY) return jsonResp({ error: "ANTHROPIC_API_KEY not set on the function" }, 500);

    const body = await req.json().catch(() => ({}));
    const text = String(body.text || "");
    const lang = body.lang === "en" ? "en" : "fr";

    if (!text.trim()) return jsonResp({ error: "No text to correct." }, 400);
    if (text.length > 20000) return jsonResp({ error: "Text too long (max 20000 chars)." }, 400);

    const system = lang === "en" ? SYSTEM_EN : SYSTEM_FR;

    const claudeBody = {
      model: CLAUDE_MODEL,
      system,
      messages: [
        { role: "user", content: [{ type: "text", text }] },
      ],
      max_tokens: 8000,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

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
      if (err?.name === "AbortError") return jsonResp({ error: "Claude timed out after 60s." }, 504);
      throw err;
    }
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.text();
      let msg = `Claude HTTP ${res.status}`;
      try { msg = JSON.parse(errBody)?.error?.message || msg; } catch {}
      console.error("[fix-grammar] claude error", res.status, errBody.slice(0, 500));
      return jsonResp({ error: msg }, 502);
    }

    const data = await res.json();
    const textBlock = (data.content || []).find((b) => b.type === "text");
    let corrected = (textBlock?.text || "").trim();

    // Strip code fences if Claude wraps the output despite the instruction.
    corrected = corrected.replace(/^```(?:[a-z]+)?\s*\n?/i, "").replace(/\n?\s*```\s*$/, "");

    return jsonResp({ text: corrected });
  } catch (err) {
    console.error("[fix-grammar] unexpected", err);
    return jsonResp({ error: err?.message ?? String(err) }, 500);
  }
});
