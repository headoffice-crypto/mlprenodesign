// Supabase Edge Function — delete-event-lead
//
// Removes a customers row that was created by send-event-lead. We only
// delete rows whose notes are tagged [MLP-EVENT] so this function can't be
// abused to drop unrelated customers.
//
// POST /functions/v1/delete-event-lead
// Body: { customerId: string }

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
};
function jsonResp(d: unknown, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { "Content-Type": "application/json", ...CORS } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST")    return jsonResp({ error: "POST only" }, 405);

  const body = await req.json().catch(() => ({}));
  const customerId = body.customerId;
  if (!customerId) return jsonResp({ error: "customerId required" }, 400);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!SUPABASE_URL || !SUPABASE_KEY) return jsonResp({ error: "Supabase env missing" }, 500);

  try {
    // Restrict the DELETE to event-tagged rows so we never wipe a non-event
    // customer if the operator pastes the wrong id.
    const url = `${SUPABASE_URL}/rest/v1/customers?id=eq.${encodeURIComponent(customerId)}&notes=like.*%5BMLP-EVENT%5D*`;
    const r = await fetch(url, {
      method: "DELETE",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: "return=representation",
      },
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return jsonResp({ error: (data as any)?.message || `Supabase ${r.status}` }, 500);
    const deleted = Array.isArray(data) ? data.length : 0;
    if (deleted === 0) return jsonResp({ error: "no matching event lead" }, 404);
    return jsonResp({ ok: true, deleted });
  } catch (err) {
    return jsonResp({ error: (err as Error)?.message ?? String(err) }, 500);
  }
});
