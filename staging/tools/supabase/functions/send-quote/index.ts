// Supabase Edge Function — send-quote / send-invoice
// Accepts { quote_id | invoice_id, channel: 'sms' | 'email', to?, message? }
// Sends quotes or invoices by SMS (Twilio) or email (Resend).

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

async function sbGet(url, key) {
  const r = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!r.ok) throw new Error(`Supabase fetch ${r.status}`);
  return r.json();
}

async function sbPatch(url, key, body) {
  return fetch(url, {
    method: "PATCH",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
}

async function sbInsert(url, key, body) {
  return fetch(url, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
}

/* ===== Quote email body (existing) ===== */
function buildQuoteEmailHtml(quote, link, lang) {
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
    ? `Voici votre soumission <strong>${escHtml(quote.quote_number)}</strong> ${multi ? "avec les options proposées" : ""}.`
    : `Here is your quote <strong>${escHtml(quote.quote_number)}</strong> ${multi ? "with the proposed options" : ""}.`;
  const cta = fr ? "Consulter et signer la soumission" : "View and sign the quote";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#202124;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;padding:32px 28px;">
    <div style="border-bottom:3px solid #c8a45a;padding-bottom:12px;margin-bottom:20px;">
      <div style="font-size:22px;font-weight:800;color:#c8a45a;">MLP Reno &amp; Design</div>
      <div style="font-size:13px;color:#5f6368;">Construction &amp; Rénovation — ${fr ? "Licence RBQ" : "RBQ Licence"}: 5847-0378-01</div>
    </div>
    <p style="font-size:16px;margin:0 0 12px;">${greeting}</p>
    <p style="font-size:14px;color:#3c4043;line-height:1.6;margin:0 0 16px;">${intro}</p>
    ${optionsBlock}
    <div style="text-align:center;margin:28px 0;">
      <a href="${link}" style="display:inline-block;background:#c8a45a;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:8px;font-size:15px;">${cta} →</a>
    </div>
    <p style="font-size:14px;color:#3c4043;margin:18px 0 0;">${fr ? "Merci," : "Thanks,"}<br><strong>MLP Reno &amp; Design</strong></p>
    <div style="border-top:1px solid #e8eaed;margin-top:28px;padding-top:16px;font-size:11px;color:#9aa0a6;line-height:1.6;">
      MLP Reno &amp; Design — (450) 500-8936 — headoffice@mlpexperience.com
    </div>
  </div></body></html>`;
}

/* ===== Invoice email body ===== */
function buildInvoiceEmailHtml(invoice, quote, lang) {
  const fr = lang === "fr";
  const greeting = fr ? `Bonjour ${escHtml(quote.client_name || "")},` : `Hi ${escHtml(quote.client_name || "")},`;
  const title = fr ? "Facture" : "Invoice";
  const intro = fr
    ? `Voici la facture <strong>${escHtml(invoice.invoice_number)}</strong> correspondant au paiement « <strong>${escHtml(invoice.label)}</strong> » (${invoice.pct_of_total}%) pour votre projet ${escHtml(quote.project_title || quote.quote_number)}.`
    : `Here is invoice <strong>${escHtml(invoice.invoice_number)}</strong> for the "${escHtml(invoice.label)}" payment (${invoice.pct_of_total}%) of your project ${escHtml(quote.project_title || quote.quote_number)}.`;
  const payMethodsLabel = fr ? "Méthodes de paiement" : "Payment methods";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#202124;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;padding:32px 28px;">
    <div style="border-bottom:3px solid #c8a45a;padding-bottom:12px;margin-bottom:20px;">
      <div style="font-size:22px;font-weight:800;color:#c8a45a;">MLP Reno &amp; Design</div>
      <div style="font-size:13px;color:#5f6368;">${title} ${escHtml(invoice.invoice_number)}</div>
    </div>
    <p style="font-size:16px;margin:0 0 12px;">${greeting}</p>
    <p style="font-size:14px;color:#3c4043;line-height:1.6;margin:0 0 16px;">${intro}</p>

    <div style="border:1px solid #e8eaed;border-radius:10px;padding:16px;margin:16px 0;">
      <div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;"><span>${fr ? "Sous-total" : "Subtotal"}</span><span>$${money(invoice.amount_before_tax)}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;"><span>TPS (5%)</span><span>$${money(invoice.gst)}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;"><span>TVQ (9.975%)</span><span>$${money(invoice.qst)}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:800;color:#c8a45a;padding-top:10px;margin-top:8px;border-top:2px solid #c8a45a;">
        <span>${fr ? "Montant total" : "Total amount"}</span><span>$${money(invoice.amount_total)}</span>
      </div>
    </div>

    <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:#202124;margin:20px 0 8px;">${payMethodsLabel}</h3>
    <div style="background:#f8f9fa;border-left:4px solid #c8a45a;padding:14px;border-radius:10px;font-size:13px;color:#3c4043;line-height:1.7;white-space:pre-line;">
${escHtml(quote.payment_methods || "")}</div>

    <p style="font-size:13px;color:#5f6368;line-height:1.6;margin-top:16px;">${fr ? "Merci de référencer le numéro de facture lors du paiement." : "Please reference the invoice number with your payment."}</p>
    <p style="font-size:14px;color:#3c4043;margin:18px 0 0;">${fr ? "Merci," : "Thanks,"}<br><strong>MLP Reno &amp; Design</strong></p>
  </div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const body = await req.json().catch(() => ({}));
    const { quote_id, invoice_id, channel = "sms", to, message } = body;

    if (!quote_id && !invoice_id) return jsonResp({ error: "quote_id or invoice_id required" }, 400);
    if (!["sms", "email"].includes(channel)) return jsonResp({ error: "channel must be 'sms' or 'email'" }, 400);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const APP_BASE_URL = Deno.env.get("APP_BASE_URL") ?? "http://localhost:8000/staging/tools";
    if (!SUPABASE_URL || !SUPABASE_KEY) return jsonResp({ error: "Supabase env missing" }, 500);

    // ---------- INVOICE PATH ----------
    if (invoice_id) {
      const invArr = await sbGet(`${SUPABASE_URL}/rest/v1/invoices?id=eq.${encodeURIComponent(invoice_id)}&select=*`, SUPABASE_KEY);
      const inv = invArr?.[0];
      if (!inv) return jsonResp({ error: "invoice not found" }, 404);

      const qArr = await sbGet(`${SUPABASE_URL}/rest/v1/quotes?id=eq.${encodeURIComponent(inv.quote_id)}&select=*`, SUPABASE_KEY);
      const quote = qArr?.[0];
      if (!quote) return jsonResp({ error: "related quote not found" }, 404);

      const lang = quote.language === "en" ? "en" : "fr";

      if (channel === "sms") {
        const TWILIO_SID = Deno.env.get("TWILIO_SID") ?? "";
        const TWILIO_TOKEN = Deno.env.get("TWILIO_TOKEN") ?? "";
        const TWILIO_FROM = Deno.env.get("TWILIO_FROM") ?? "";
        if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) return jsonResp({ error: "Twilio env missing" }, 500);

        const raw = String(to || quote.client_phone || "");
        const digits = raw.replace(/\D/g, "");
        if (!digits) return jsonResp({ error: "no phone number" }, 400);
        const to_e164 = raw.startsWith("+") ? raw : (digits.length === 10 ? `+1${digits}` : `+${digits}`);

        const smsBody = message || (lang === "fr"
          ? `MLP Reno & Design — Facture ${inv.invoice_number} : ${inv.label} ${inv.pct_of_total}% — $${money(inv.amount_total)}. Méthodes : ${(quote.payment_methods || '').split('\n')[0] || 'nous contacter'}.`
          : `MLP Reno & Design — Invoice ${inv.invoice_number}: ${inv.label} ${inv.pct_of_total}% — $${money(inv.amount_total)}.`);

        const auth = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);
        const form = new URLSearchParams({ From: TWILIO_FROM, To: to_e164, Body: smsBody });
        const twRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
          method: "POST",
          headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
          body: form.toString(),
        });
        const twData = await twRes.json();
        if (!twRes.ok) return jsonResp({ error: twData.message || "Twilio error", code: twData.code }, 500);

        await sbPatch(`${SUPABASE_URL}/rest/v1/invoices?id=eq.${encodeURIComponent(inv.id)}`, SUPABASE_KEY, {
          status: "sent", sent_at: new Date().toISOString()
        });
        return jsonResp({ ok: true, channel: "sms", sid: twData.sid, to: to_e164 });
      }

      // Invoice — email
      const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
      const FROM = Deno.env.get("EMAIL_FROM") ?? "MLP Reno & Design <onboarding@resend.dev>";
      const REPLY_TO = Deno.env.get("EMAIL_REPLY_TO") ?? "";
      if (!RESEND_KEY) return jsonResp({ error: "Resend env missing" }, 500);

      const emailTo = (to || quote.client_email || "").trim();
      if (!emailTo) return jsonResp({ error: "no email address" }, 400);

      const subject = lang === "fr"
        ? `Facture ${inv.invoice_number} — ${inv.label} (MLP Reno & Design)`
        : `Invoice ${inv.invoice_number} — ${inv.label} (MLP Reno & Design)`;

      const payload = {
        from: FROM,
        to: [emailTo],
        subject,
        html: buildInvoiceEmailHtml(inv, quote, lang),
      };
      if (REPLY_TO) payload.reply_to = REPLY_TO;

      const rRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const rData = await rRes.json();
      if (!rRes.ok) return jsonResp({ error: rData.message || rData.name || "Resend error" }, 500);

      await sbPatch(`${SUPABASE_URL}/rest/v1/invoices?id=eq.${encodeURIComponent(inv.id)}`, SUPABASE_KEY, {
        status: "sent", sent_at: new Date().toISOString()
      });
      return jsonResp({ ok: true, channel: "email", id: rData.id, to: emailTo });
    }

    // ---------- QUOTE PATH (existing) ----------
    const qArr = await sbGet(`${SUPABASE_URL}/rest/v1/quotes?id=eq.${encodeURIComponent(quote_id)}&select=*`, SUPABASE_KEY);
    const quote = qArr?.[0];
    if (!quote) return jsonResp({ error: "quote not found" }, 404);

    const lang = quote.language === "en" ? "en" : "fr";
    const link = `${APP_BASE_URL}/sign.html?token=${encodeURIComponent(quote.share_token)}`;

    if (channel === "sms") {
      const TWILIO_SID = Deno.env.get("TWILIO_SID") ?? "";
      const TWILIO_TOKEN = Deno.env.get("TWILIO_TOKEN") ?? "";
      const TWILIO_FROM = Deno.env.get("TWILIO_FROM") ?? "";
      if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) return jsonResp({ error: "Twilio env missing" }, 500);

      const raw = String(to || quote.client_phone || "");
      const digits = raw.replace(/\D/g, "");
      if (!digits) return jsonResp({ error: "no phone number on quote" }, 400);
      const to_e164 = raw.startsWith("+") ? raw : (digits.length === 10 ? `+1${digits}` : `+${digits}`);

      const defaultMsg = lang === "fr"
        ? `MLP Reno & Design — Votre soumission ${quote.quote_number}. Consultez et signez : ${link}`
        : `MLP Reno & Design — Your quote ${quote.quote_number}. View and sign: ${link}`;
      const smsBody = message || defaultMsg;

      const auth = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);
      const form = new URLSearchParams({ From: TWILIO_FROM, To: to_e164, Body: smsBody });

      const twRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
      const twData = await twRes.json();
      if (!twRes.ok) return jsonResp({ error: twData.message || "Twilio error", code: twData.code }, 500);

      await sbInsert(`${SUPABASE_URL}/rest/v1/quote_events`, SUPABASE_KEY, {
        quote_id: quote.id, event_type: "sms_sent",
        payload: { to: to_e164, twilio_sid: twData.sid, status: twData.status },
      });
      if (!quote.sent_at) {
        await sbPatch(`${SUPABASE_URL}/rest/v1/quotes?id=eq.${encodeURIComponent(quote.id)}`, SUPABASE_KEY, {
          sent_at: new Date().toISOString(),
          status: quote.status === "draft" ? "sent" : quote.status,
        });
      }
      return jsonResp({ ok: true, channel: "sms", sid: twData.sid, to: to_e164, status: twData.status });
    }

    // Quote — email
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
      html: buildQuoteEmailHtml(quote, link, lang),
    };
    if (REPLY_TO) payload.reply_to = REPLY_TO;

    const rRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const rData = await rRes.json();
    if (!rRes.ok) return jsonResp({ error: rData.message || rData.name || "Resend error" }, 500);

    await sbInsert(`${SUPABASE_URL}/rest/v1/quote_events`, SUPABASE_KEY, {
      quote_id: quote.id, event_type: "email_sent",
      payload: { to: emailTo, resend_id: rData.id },
    });
    if (!quote.sent_at) {
      await sbPatch(`${SUPABASE_URL}/rest/v1/quotes?id=eq.${encodeURIComponent(quote.id)}`, SUPABASE_KEY, {
        sent_at: new Date().toISOString(),
        status: quote.status === "draft" ? "sent" : quote.status,
      });
    }
    return jsonResp({ ok: true, channel: "email", id: rData.id, to: emailTo });
  } catch (err) {
    return jsonResp({ error: err?.message ?? String(err) }, 500);
  }
});
