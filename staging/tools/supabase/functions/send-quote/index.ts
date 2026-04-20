// Supabase Edge Function — send-quote
// Sends a quote link by SMS via Twilio.
// Secrets required: TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM, APP_BASE_URL
// Auto-injected: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const body = await req.json().catch(() => ({}));
    const { quote_id, channel = "sms", to, message } = body;

    if (!quote_id) return jsonResp({ error: "quote_id required" }, 400);
    if (channel !== "sms") return jsonResp({ error: "channel must be 'sms'" }, 400);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const TWILIO_SID = Deno.env.get("TWILIO_SID") ?? "";
    const TWILIO_TOKEN = Deno.env.get("TWILIO_TOKEN") ?? "";
    const TWILIO_FROM = Deno.env.get("TWILIO_FROM") ?? "";
    const APP_BASE_URL = Deno.env.get("APP_BASE_URL") ?? "http://localhost:8000/staging/tools";

    if (!SUPABASE_URL || !SUPABASE_KEY) return jsonResp({ error: "Supabase env missing" }, 500);
    if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) return jsonResp({ error: "Twilio env missing" }, 500);

    // Fetch the quote
    const qUrl = `${SUPABASE_URL}/rest/v1/quotes?id=eq.${encodeURIComponent(quote_id)}&select=*`;
    const qRes = await fetch(qUrl, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!qRes.ok) return jsonResp({ error: "quote fetch failed", status: qRes.status }, 500);
    const quotes = await qRes.json();
    const quote = Array.isArray(quotes) ? quotes[0] : null;
    if (!quote) return jsonResp({ error: "quote not found" }, 404);

    const raw = String(to || quote.client_phone || "");
    const digits = raw.replace(/\D/g, "");
    if (!digits) return jsonResp({ error: "no phone number" }, 400);

    const to_e164 = raw.startsWith("+")
      ? raw
      : digits.length === 10
        ? `+1${digits}`
        : `+${digits}`;

    const lang = quote.language === "en" ? "en" : "fr";
    const link = `${APP_BASE_URL}/sign.html?token=${encodeURIComponent(quote.share_token)}`;
    const defaultMsg = lang === "fr"
      ? `MLP Reno & Design — Votre soumission ${quote.quote_number}. Consultez et signez : ${link}`
      : `MLP Reno & Design — Your quote ${quote.quote_number}. View and sign: ${link}`;
    const smsBody = message || defaultMsg;

    const auth = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);
    const form = new URLSearchParams({ From: TWILIO_FROM, To: to_e164, Body: smsBody });

    const twRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      },
    );

    const twData = await twRes.json();
    if (!twRes.ok) {
      return jsonResp(
        { error: twData.message || "Twilio error", code: twData.code, more_info: twData.more_info },
        500,
      );
    }

    // Fire and forget event log + status update
    fetch(`${SUPABASE_URL}/rest/v1/quote_events`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        quote_id,
        event_type: "sms_sent",
        payload: { to: to_e164, twilio_sid: twData.sid, status: twData.status },
      }),
    }).catch(() => {});

    if (!quote.sent_at) {
      fetch(`${SUPABASE_URL}/rest/v1/quotes?id=eq.${encodeURIComponent(quote_id)}`, {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          sent_at: new Date().toISOString(),
          status: quote.status === "draft" ? "sent" : quote.status,
        }),
      }).catch(() => {});
    }

    return jsonResp({ ok: true, sid: twData.sid, to: to_e164, status: twData.status });
  } catch (err) {
    return jsonResp({ error: err?.message ?? String(err) }, 500);
  }
});
