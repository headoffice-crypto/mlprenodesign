/* ============================================
   Quote-builder analyzer client.

   analyzeProjectInput({ text, images, context })
     -> { project_title, client_name, client_email, client_phone, client_address,
          scope_summary, base_price, duration_weeks, materials_included }

   Calls the Supabase Edge Function `analyze-project`, which proxies to
   Anthropic Claude (vision). The Anthropic key lives server-side, NOT in
   js/config.js — only the Supabase anon key is shipped to the browser.

   File is still named openai.js for backward compatibility with sw.js cache
   manifest and index.html script tag — the implementation no longer talks
   to OpenAI.
   MLP Reno & Design
   ============================================ */

async function analyzeProjectInput({ text, images = [], context }) {
  const trimmed = (text || '').trim();
  if (!trimmed && images.length === 0) {
    throw new Error('No text or images to analyze.');
  }

  if (typeof SUPABASE_URL !== 'string' || typeof SUPABASE_ANON_KEY !== 'string') {
    throw new Error('Supabase config missing. Check js/config.js.');
  }

  const payload = {
    text: trimmed,
    images,
    context: { today: context?.today || new Date().toISOString().split('T')[0] },
  };

  const bodyStr = JSON.stringify(payload);
  console.log('[analyze] payload bytes:', bodyStr.length, '| images:', images.length);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 95000);
  try {
    const res = await fetch(SUPABASE_URL + '/functions/v1/analyze-project', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      },
      body: bodyStr,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[analyze] HTTP error', res.status, data);
      throw new Error(data.error || ('Analyzer HTTP ' + res.status));
    }
    return data; // server already runs normalizeAnalysis() on the parsed JSON
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') throw new Error('Analyzer timed out. Try fewer pages or shorter text.');
    throw err;
  }
}
