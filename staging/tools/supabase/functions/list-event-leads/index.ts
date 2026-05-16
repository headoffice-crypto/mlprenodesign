// Supabase Edge Function — list-event-leads
//
// Reads the customers table and returns only rows tagged as event leads
// (notes blob starts with "[MLP-EVENT]"). Used by /admin to show all leads
// captured at the event across devices — without exposing the rest of the
// CRM or requiring the service-role key in the browser.
//
// GET /functions/v1/list-event-leads → { leads: [...] }

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
};
function jsonResp(d: unknown, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { "Content-Type": "application/json", ...CORS } });
}

function parseEventNotes(notes: string) {
  const out: Record<string, string> = {};
  if (!notes || !notes.startsWith("[MLP-EVENT]")) return null;
  for (const line of notes.split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim();
    if (k && v !== undefined) out[k] = v;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "GET")     return jsonResp({ error: "GET only" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!SUPABASE_URL || !SUPABASE_KEY) return jsonResp({ error: "Supabase env missing" }, 500);

  // Pull recent customer rows whose notes contain the event marker.
  // Supabase PostgREST `like` with URL-encoded wildcards.
  const url = `${SUPABASE_URL}/rest/v1/customers?notes=like.*%5BMLP-EVENT%5D*&order=created_at.desc&limit=500`;

  try {
    const r = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });
    const rows = await r.json().catch(() => []);
    if (!r.ok) return jsonResp({ error: rows?.message || `Supabase ${r.status}`, raw: rows }, 500);

    const leads = (Array.isArray(rows) ? rows : []).map((row: any) => {
      const meta = parseEventNotes(row.notes || "") || {};
      return {
        id:           meta.LeadId || String(row.id || ""),
        customerId:   row.id,
        createdAt:    row.created_at || new Date().toISOString(),
        name:         row.name  || "",
        email:        row.email || "",
        phone:        row.phone || "",
        city:         meta.City || "",
        segment:      meta.Segment      || "",
        segmentLabel: meta.SegmentLabel || "",
        region:       meta.Region       || "",
        regionLabel:  meta.RegionLabel  || "",
        group:        meta.Group        || "",
        groupLabel:   meta.GroupLabel   || "",
        groupTotal:   Number(meta.GroupTotal || 0),
        giveawayKey:   meta.Tirage      || "",
        giveawayTitle: meta.TirageTitle || "",
        giveawayValue: Number(meta.TirageValue || 0),
        score:        Number(meta.Score || 0),
        source:       meta.Source || "",
        notes:        meta.Notes  || "",
      };
    });

    return jsonResp({ leads, count: leads.length });
  } catch (err) {
    return jsonResp({ error: (err as Error)?.message ?? String(err) }, 500);
  }
});
