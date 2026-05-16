// Supabase Edge Function — update-event-lead
//
// PATCHes a customers row that was created by send-event-lead. The client
// (admin CRM) sends the full lead state; we rebuild the [MLP-EVENT] notes
// blob from it so all metadata stays parseable by list-event-leads.
//
// POST /functions/v1/update-event-lead
// Body: { customerId: string, lead: { name, email, phone, segment, segmentLabel,
//         region, regionLabel, giveawayKey, giveawayTitle, giveawayValue,
//         score, source, city, notes, id } }

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
  const lead = body.lead || {};
  if (!customerId)  return jsonResp({ error: "customerId required" }, 400);
  if (!lead.name)   return jsonResp({ error: "lead.name required" }, 400);

  const notesText = [
    `[MLP-EVENT]`,
    `Segment: ${lead.segment || ''}`,
    `SegmentLabel: ${lead.segmentLabel || ''}`,
    `Region: ${lead.region || ''}`,
    `RegionLabel: ${lead.regionLabel || ''}`,
    `Tirage: ${lead.giveawayKey || ''}`,
    `TirageTitle: ${lead.giveawayTitle || ''}`,
    `TirageValue: ${lead.giveawayValue || 0}`,
    `Score: ${lead.score ?? 0}`,
    `Source: ${lead.source || ''}`,
    `City: ${lead.city || ''}`,
    `LeadId: ${lead.id || customerId}`,
    lead.notes ? `Notes: ${lead.notes}` : '',
  ].filter(Boolean).join("\n");

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!SUPABASE_URL || !SUPABASE_KEY) return jsonResp({ error: "Supabase env missing" }, 500);

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${encodeURIComponent(customerId)}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        name:  lead.name,
        email: lead.email || null,
        phone: lead.phone || null,
        notes: notesText,
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return jsonResp({ error: data?.message || `Supabase ${r.status}`, raw: data }, 500);
    return jsonResp({ ok: true, customer: Array.isArray(data) ? data[0] : data });
  } catch (err) {
    return jsonResp({ error: (err as Error)?.message ?? String(err) }, 500);
  }
});
