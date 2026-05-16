// Supabase Edge Function — send-event-lead
//
// Real-time notification for each lead captured at the event booth.
//
// Reuses the existing TWILIO_* and RESEND_API_KEY / EMAIL_FROM env vars
// from the send-quote function (no extra secrets needed).
//
// Request body:
//   {
//     lead: {
//       id, name, phone, email, city, notes, score, source,
//       segment, segmentLabel, giveawayTitle, giveawayValue,
//     },
//     ops: { name, phone, email },
//     flags: {
//       notifyOpsSms, notifyOpsEmail,
//       notifyLeadSms, notifyLeadEmail,
//       dryRun,
//     },
//   }
//
// Response: { ok, opsSms, opsEmail, leadSms, leadEmail, dryRun? }
//           Each channel returns { ok, sid?|id?, error? }.

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
};
function jsonResp(d: unknown, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { "Content-Type": "application/json", ...CORS } });
}

function escHtml(s: unknown) {
  return String(s ?? "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

function toE164(raw: string) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (String(raw).trim().startsWith("+")) return String(raw).trim();
  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
}

async function twilioSend(to: string, body: string) {
  const SID   = Deno.env.get("TWILIO_SID")   ?? "";
  const TOKEN = Deno.env.get("TWILIO_TOKEN") ?? "";
  const FROM  = Deno.env.get("TWILIO_FROM")  ?? "";
  if (!SID || !TOKEN || !FROM)   return { ok: false, error: "Twilio env missing" };
  if (!to)                        return { ok: false, error: "no phone number" };

  const auth = btoa(`${SID}:${TOKEN}`);
  const form = new URLSearchParams({ From: FROM, To: to, Body: body });
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const d = await r.json().catch(() => ({}));
  return r.ok ? { ok: true, sid: d.sid, to } : { ok: false, error: d.message || `Twilio ${r.status}`, code: d.code };
}

async function resendSend(to: string, subject: string, html: string) {
  const KEY = Deno.env.get("RESEND_API_KEY") ?? "";
  const FROM = Deno.env.get("EMAIL_FROM") ?? "MLP Reno & Design <onboarding@resend.dev>";
  const REPLY_TO = Deno.env.get("EMAIL_REPLY_TO") ?? "";
  if (!KEY) return { ok: false, error: "Resend env missing" };
  if (!to)  return { ok: false, error: "no email address" };

  const payload: Record<string, unknown> = { from: FROM, to: [to], subject, html };
  if (REPLY_TO) payload.reply_to = REPLY_TO;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const d = await r.json().catch(() => ({}));
  return r.ok ? { ok: true, id: d.id, to } : { ok: false, error: d.message || d.name || `Resend ${r.status}` };
}

/* ===== Message bodies ===== */

function opsSmsBody(lead: any) {
  const lines = [
    `🎯 Nouveau lead MLP (${lead.score ?? '?'}/100)`,
    `${lead.name || 'Sans nom'} — ${lead.segmentLabel || lead.segment || '?'}`,
    `📞 ${lead.phone || 'pas de tel'}${lead.email ? ' · ' + lead.email : ''}`,
    `🎁 ${lead.giveawayTitle || 'Tirage à venir'}`,
  ];
  if (lead.notes) lines.push(`📝 ${String(lead.notes).slice(0, 90)}`);
  return lines.join('\n');
}

function leadSmsBody(lead: any) {
  return `Bonjour ${lead.name || ''} 👋\n\nMerci de votre passage au kiosque MLP ce soir. Vous êtes inscrit(e) au tirage : ${lead.giveawayTitle} (valeur ${lead.giveawayValue}$). Les gagnants sont annoncés en direct vers 21 h.\n\n— MLP Reno & Design\n(450) 500-8936`;
}

function opsEmailHtml(lead: any) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#202124;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f8;padding:32px 16px;">
<tr><td align="center"><table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

<tr><td style="padding:28px 32px 20px;border-bottom:2px solid #c8a45a;">
<div style="font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#c8a45a;">Lead capturé · Booth MLP</div>
<div style="font-size:22px;font-weight:800;margin-top:6px;">${escHtml(lead.name) || '—'}</div>
<div style="font-size:13px;color:#5f6368;margin-top:4px;">${escHtml(lead.segmentLabel || lead.segment || '')}${lead.city ? ' · ' + escHtml(lead.city) : ''}</div>
</td></tr>

<tr><td style="padding:24px 32px 8px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
<tr><td style="padding:8px 0;color:#5f6368;width:120px;">Téléphone</td><td style="padding:8px 0;"><a href="tel:${escHtml(lead.phone)}" style="color:#1967d2;text-decoration:none;">${escHtml(lead.phone) || '—'}</a></td></tr>
<tr><td style="padding:8px 0;color:#5f6368;border-top:1px solid #f1f3f4;">Courriel</td><td style="padding:8px 0;border-top:1px solid #f1f3f4;"><a href="mailto:${escHtml(lead.email)}" style="color:#1967d2;text-decoration:none;">${escHtml(lead.email) || '—'}</a></td></tr>
<tr><td style="padding:8px 0;color:#5f6368;border-top:1px solid #f1f3f4;">Score</td><td style="padding:8px 0;border-top:1px solid #f1f3f4;"><strong>${escHtml(lead.score)}/100</strong></td></tr>
<tr><td style="padding:8px 0;color:#5f6368;border-top:1px solid #f1f3f4;">Source</td><td style="padding:8px 0;border-top:1px solid #f1f3f4;">${escHtml(lead.source)}</td></tr>
<tr><td style="padding:8px 0;color:#5f6368;border-top:1px solid #f1f3f4;">Tirage</td><td style="padding:8px 0;border-top:1px solid #f1f3f4;"><strong style="color:#c8a45a;">${escHtml(lead.giveawayTitle)}</strong> · ${escHtml(lead.giveawayValue)}$</td></tr>
</table>
${lead.notes ? `<div style="margin-top:18px;padding:14px 16px;background:#fffaf0;border-left:3px solid #c8a45a;border-radius:6px;font-size:13px;color:#3c4043;line-height:1.6;white-space:pre-line;">${escHtml(lead.notes)}</div>` : ''}
</td></tr>

<tr><td style="padding:20px 32px 28px;border-top:1px solid #f1f3f4;text-align:center;font-size:11px;color:#9aa0a6;">Lead #${escHtml(lead.id)} — MLP Reno &amp; Design</td></tr>

</table></td></tr></table></body></html>`;
}

function leadEmailHtml(lead: any) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#202124;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f8;padding:32px 16px;">
<tr><td align="center"><table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

<tr><td style="padding:32px 32px 12px;border-bottom:2px solid #c8a45a;">
<div style="font-size:22px;font-weight:800;color:#c8a45a;">MLP Reno &amp; Design</div>
<div style="font-size:13px;color:#5f6368;margin-top:2px;">Gestion · Accompagnement · Rénovation</div>
</td></tr>

<tr><td style="padding:28px 32px;">
<p style="font-size:16px;margin:0 0 10px;">Bonjour ${escHtml((lead.name || '').split(' ')[0] || '')},</p>
<p style="font-size:14px;line-height:1.65;color:#3c4043;margin:0 0 18px;">Merci d'être passé(e) au kiosque MLP ce soir. Vous êtes officiellement inscrit(e) au tirage&nbsp;:</p>

<div style="background:linear-gradient(135deg,#fffaf0,#f5edda);border:1px solid #ecd9a9;border-radius:10px;padding:20px 22px;margin:0 0 22px;">
  <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#a68a3e;">Votre prix</div>
  <div style="font-size:20px;font-weight:700;margin-top:6px;">${escHtml(lead.giveawayTitle)}</div>
  <div style="font-size:14px;color:#5f6368;margin-top:4px;">Valeur ${escHtml(lead.giveawayValue)}$ — annoncé en direct vers 21 h.</div>
</div>

<p style="font-size:14px;line-height:1.65;color:#3c4043;margin:0 0 14px;">Restez près de la scène pour le tirage. Et que vous gagniez ou non, on a toujours du temps pour parler de votre projet — appelez-nous au <strong>(450) 500-8936</strong>.</p>

<p style="font-size:14px;color:#3c4043;margin:24px 0 0;">À ce soir,<br><strong>L'équipe MLP</strong></p>
</td></tr>

<tr><td style="padding:18px 32px 28px;border-top:1px solid #f1f3f4;text-align:center;font-size:11px;color:#9aa0a6;line-height:1.7;">
MLP Reno &amp; Design — (450) 500-8936 — headoffice@mlpexperience.com
</td></tr>

</table></td></tr></table></body></html>`;
}

/* ===== Handler ===== */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST")    return jsonResp({ error: "POST only" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const lead  = body.lead  || {};
    const ops   = body.ops   || {};
    const flags = body.flags || {};

    if (!lead.id) return jsonResp({ error: "lead.id required" }, 400);

    const result: Record<string, unknown> = { ok: true, dryRun: !!flags.dryRun };

    /* ---- CRM persistence — INSERT into existing public.customers table ---- */
    if (!flags.dryRun && lead.name) {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
      const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      if (SUPABASE_URL && SUPABASE_KEY) {
        const notesText = [
          `Lead événement · Segment: ${lead.segmentLabel || lead.segment || '?'}`,
          `Tirage: ${lead.giveawayTitle || '?'} (${lead.giveawayValue || 0}$)`,
          `Score: ${lead.score ?? '?'}/100`,
          `Source: ${lead.source || '?'}`,
          lead.city  ? `Ville: ${lead.city}` : null,
          lead.notes ? `Notes lead: ${lead.notes}` : null,
          `Lead ID: ${lead.id}`,
        ].filter(Boolean).join("\n");

        try {
          const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
            method: "POST",
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
          const dbData = await dbRes.json().catch(() => ({}));
          result.crm = dbRes.ok
            ? { ok: true, customer_id: Array.isArray(dbData) ? dbData[0]?.id : dbData?.id }
            : { ok: false, status: dbRes.status, error: dbData?.message || dbData };
        } catch (e) {
          result.crm = { ok: false, error: (e as Error)?.message ?? String(e) };
        }
      } else {
        result.crm = { ok: false, error: "Supabase env missing" };
      }
    }

    // Operator SMS
    if (flags.notifyOpsSms) {
      const to = toE164(ops.phone || "");
      result.opsSms = flags.dryRun
        ? { ok: true, dryRun: true, to, preview: opsSmsBody(lead) }
        : await twilioSend(to, opsSmsBody(lead));
    }

    // Operator email
    if (flags.notifyOpsEmail) {
      const subject = `Lead — ${lead.name || lead.id} · ${lead.segmentLabel || lead.segment || ''}`;
      result.opsEmail = flags.dryRun
        ? { ok: true, dryRun: true, to: ops.email, subject }
        : await resendSend(String(ops.email || ""), subject, opsEmailHtml(lead));
    }

    // Lead SMS (thank-you)
    if (flags.notifyLeadSms) {
      const to = toE164(lead.phone || "");
      result.leadSms = flags.dryRun
        ? { ok: true, dryRun: true, to, preview: leadSmsBody(lead) }
        : await twilioSend(to, leadSmsBody(lead));
    }

    // Lead email (thank-you)
    if (flags.notifyLeadEmail) {
      const subject = "Vous êtes inscrit(e) au tirage MLP";
      result.leadEmail = flags.dryRun
        ? { ok: true, dryRun: true, to: lead.email, subject }
        : await resendSend(String(lead.email || ""), subject, leadEmailHtml(lead));
    }

    return jsonResp(result);
  } catch (err) {
    return jsonResp({ error: (err as Error)?.message ?? String(err) }, 500);
  }
});
