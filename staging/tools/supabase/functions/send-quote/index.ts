// Supabase Edge Function — send-quote
// Sends a quote link by SMS (Twilio) or email (Resend).
// Secrets: TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM, APP_BASE_URL,
//          RESEND_API_KEY, EMAIL_FROM, EMAIL_REPLY_TO
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

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(n) {
  return Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function buildEmailHtml(quote, link, lang) {
  const fr = lang === "fr";
  const options = Array.isArray(quote.options) ? quote.options : [];
  const multi = options.length > 1;

  let optionsBlock = "";
  if (options.length) {
    optionsBlock = '<div style="margin:20px 0;">';
    options.forEach((o) => {
      optionsBlock += `
        <div style="border:1px solid #e8eaed;border-radius:10px;padding:14px;margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;">
            <strong style="color:#c8a45a;text-transform:uppercase;letter-spacing:0.4px;">${escHtml(o.title || o.key)}</strong>
            <strong style="color:#202124;font-size:16px;">$${money(o.total)}</strong>
          </div>
          ${o.scope_summary ? `<div style="color:#5f6368;font-size:13px;margin-top:6px;line-height:1.5;">${escHtml(o.scope_summary)}</div>` : ""}
        </div>`;
    });
    optionsBlock += "</div>";
  }

  const title = fr ? "Votre soumission" : "Your quote";
  const greeting = fr ? `Bonjour ${escHtml(quote.client_name || "")},` : `Hi ${escHtml(quote.client_name || "")},`;
  const intro = fr
    ? `Voici votre soumission <strong>${escHtml(quote.quote_number)}</strong> ${multi ? "avec les options proposées" : ""}. Vous pouvez la consulter et la signer en ligne en cliquant sur le bouton ci-dessous.`
    : `Here is your quote <strong>${escHtml(quote.quote_number)}</strong> ${multi ? "with the proposed options" : ""}. You can review and sign it online using the button below.`;
  const cta = fr ? "Consulter et signer la soumission" : "View and sign the quote";
  const footer = fr
    ? "Si vous avez des questions, n'hésitez pas à répondre à ce courriel ou à nous appeler."
    : "If you have any questions, feel free to reply to this email or give us a call.";
  const signoff = fr ? "Merci de votre confiance," : "Thank you for your trust,";
  const rbq = fr ? "Licence RBQ" : "RBQ Licence";

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#202124;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;padding:32px 28px;">
    <div style="border-bottom:3px solid #c8a45a;padding-bottom:12px;margin-bottom:20px;">
      <div style="font-size:22px;font-weight:800;color:#c8a45a;">MLP Reno &amp; Design</div>
      <div style="font-size:13px;color:#5f6368;">Construction &amp; Rénovation — ${rbq}: 5847-0378-01</div>
    </div>

    <p style="font-size:16px;margin:0 0 12px;">${greeting}</p>
    <p style="font-size:14px;color:#3c4043;line-height:1.6;margin:0 0 16px;">${intro}</p>

    ${optionsBlock}

    <div style="text-align:center;margin:28px 0;">
      <a href="${link}" style="display:inline-block;background:#c8a45a;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:8px;font-size:15px;">${cta} →</a>
    </div>

    <p style="font-size:13px;color:#5f6368;line-height:1.6;margin:16px 0 0;">${footer}</p>
    <p style="font-size:14px;color:#3c4043;margin:18px 0 0;">${signoff}<br><strong>MLP Reno &amp; Design</strong></p>

    <div style="border-top:1px solid #e8eaed;margin-top:28px;padding-top:16px;font-size:11px;color:#9aa0a6;line-height:1.6;">
      MLP Reno &amp; Design — (450) 500-8936 — headoffice@mlpexperience.com<br>
      ${rbq}: 5847-0378-01 — ${fr ? "Assurance responsabilité civile" : "Liability insurance"}: 5 000 000 $
    </div>
  </div>
</body></html>`;
}

function buildEmailText(quote, link, lang) {
  const fr = lang === "fr";
  const greeting = fr ? `Bonjour ${quote.client_name || ""},` : `Hi ${quote.client_name || ""},`;
  const intro = fr
    ? `Voici votre soumission ${quote.quote_number}. Consultez et signez en ligne :`
    : `Here is your quote ${quote.quote_number}. View and sign online:`;
  const signoff = fr ? "Merci,\nMLP Reno & Design" : "Thanks,\nMLP Reno & Design";
  return `${greeting}\n\n${intro}\n${link}\n\n${signoff}\n\n---\nMLP Reno & Design\n(450) 500-8936 | headoffice@mlpexperience.com\nRBQ: 5847-0378-01`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const body = await req.json().catch(() => ({}));
    const { quote_id, channel = "sms", to, message } = body;

    if (!quote_id) return jsonResp({ error: "quote_id required" }, 400);
    if (!["sms", "email"].includes(channel)) {
      return jsonResp({ error: "channel must be 'sms' or 'email'" }, 400);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const APP_BASE_URL = Deno.env.get("APP_BASE_URL") ?? "http://localhost:8000/staging/tools";
    if (!SUPABASE_URL || !SUPABASE_KEY) return jsonResp({ error: "Supabase env missing" }, 500);

    const qUrl = `${SUPABASE_URL}/rest/v1/quotes?id=eq.${encodeURIComponent(quote_id)}&select=*`;
    const qRes = await fetch(qUrl, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!qRes.ok) return jsonResp({ error: "quote fetch failed", status: qRes.status }, 500);
    const quotes = await qRes.json();
    const quote = Array.isArray(quotes) ? quotes[0] : null;
    if (!quote) return jsonResp({ error: "quote not found" }, 404);

    const lang = quote.language === "en" ? "en" : "fr";
    const link = `${APP_BASE_URL}/sign.html?token=${encodeURIComponent(quote.share_token)}`;

    // ---------- SMS ----------
    if (channel === "sms") {
      const TWILIO_SID = Deno.env.get("TWILIO_SID") ?? "";
      const TWILIO_TOKEN = Deno.env.get("TWILIO_TOKEN") ?? "";
      const TWILIO_FROM = Deno.env.get("TWILIO_FROM") ?? "";
      if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
        return jsonResp({ error: "Twilio env missing" }, 500);
      }

      const raw = String(to || quote.client_phone || "");
      const digits = raw.replace(/\D/g, "");
      if (!digits) return jsonResp({ error: "no phone number on quote" }, 400);

      const to_e164 = raw.startsWith("+")
        ? raw
        : digits.length === 10
          ? `+1${digits}`
          : `+${digits}`;

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

      logEventAndMarkSent(SUPABASE_URL, SUPABASE_KEY, quote, "sms_sent", {
        to: to_e164,
        twilio_sid: twData.sid,
        status: twData.status,
      });

      return jsonResp({ ok: true, channel: "sms", sid: twData.sid, to: to_e164, status: twData.status });
    }

    // ---------- EMAIL ----------
    if (channel === "email") {
      const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
      const FROM = Deno.env.get("EMAIL_FROM") ?? "MLP Reno & Design <onboarding@resend.dev>";
      const REPLY_TO = Deno.env.get("EMAIL_REPLY_TO") ?? "";
      if (!RESEND_KEY) return jsonResp({ error: "Resend env missing" }, 500);

      const emailTo = (to || quote.client_email || "").trim();
      if (!emailTo) return jsonResp({ error: "no email address on quote" }, 400);

      const subject = lang === "fr"
        ? `Votre soumission MLP Reno & Design — ${quote.quote_number}`
        : `Your MLP Reno & Design quote — ${quote.quote_number}`;

      const payload = {
        from: FROM,
        to: [emailTo],
        subject,
        html: buildEmailHtml(quote, link, lang),
        text: buildEmailText(quote, link, lang),
      };
      if (REPLY_TO) payload.reply_to = REPLY_TO;

      const rRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const rData = await rRes.json();
      if (!rRes.ok) {
        return jsonResp(
          { error: rData.message || rData.name || "Resend error", details: rData },
          500,
        );
      }

      logEventAndMarkSent(SUPABASE_URL, SUPABASE_KEY, quote, "email_sent", {
        to: emailTo,
        resend_id: rData.id,
      });

      return jsonResp({ ok: true, channel: "email", id: rData.id, to: emailTo });
    }

    return jsonResp({ error: "unhandled channel" }, 400);
  } catch (err) {
    return jsonResp({ error: err?.message ?? String(err) }, 500);
  }
});

function logEventAndMarkSent(sbUrl, sbKey, quote, eventType, payload) {
  fetch(`${sbUrl}/rest/v1/quote_events`, {
    method: "POST",
    headers: {
      apikey: sbKey,
      Authorization: `Bearer ${sbKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ quote_id: quote.id, event_type: eventType, payload }),
  }).catch(() => {});

  if (!quote.sent_at) {
    fetch(`${sbUrl}/rest/v1/quotes?id=eq.${encodeURIComponent(quote.id)}`, {
      method: "PATCH",
      headers: {
        apikey: sbKey,
        Authorization: `Bearer ${sbKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        sent_at: new Date().toISOString(),
        status: quote.status === "draft" ? "sent" : quote.status,
      }),
    }).catch(() => {});
  }
}
