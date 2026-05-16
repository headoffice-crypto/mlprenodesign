# Deploy guide — make the QR + form + CRM work live

Three things to make live so the QR code on the promo video actually captures leads into your CRM.

## 1. Deploy the event pages to mlprenodesign.ca

The QR in the video points to **https://mlprenodesign.ca/diagnostic**. That route lives at `site/diagnostic/index.html` in this repo. Same for `/event`, `/admin`, `/promo`, etc. Whatever process you use to push the static site to your host needs to include the entire `site/` tree.

Quick sanity check from a public network (phone on cellular, NOT your local Wi-Fi):

```
https://mlprenodesign.ca/diagnostic
https://mlprenodesign.ca/event
https://mlprenodesign.ca/admin
https://mlprenodesign.ca/promo/        ← optional, the HTML preview
```

If any of these 404, the QR won't work. Push `site/` to your host.

## 2. Deploy the updated Supabase edge function

The `send-event-lead` edge function was just updated to **insert each lead into your existing `customers` table**. You need to redeploy it:

```bash
cd staging/tools/supabase
supabase functions deploy send-event-lead
```

This requires `supabase` CLI logged in. The function reads two env vars (already set on your project for `send-quote`, so they're already there): `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

After deploy, every form submission at `/event` triggers:
- SMS to the operator (if enabled in `/admin` settings)
- Email to the operator (if enabled)
- SMS thank-you to the lead (if enabled)
- Email thank-you to the lead (if enabled)
- **NEW: `INSERT INTO public.customers`** with name, email, phone, and a notes field containing segment, prize, score, source

You should see the lead in your CRM at `tools.mlprenodesign.ca/customers.html` within seconds.

## 3. Verify end-to-end after deploy

Open `https://mlprenodesign.ca/admin` on your phone, scroll to the "Réglages opérateur" panel:

1. Set your operator phone + email
2. Toggle the four notification switches ON (SMS to ops, email to ops, SMS to lead, email to lead)
3. **Uncheck** "Mode test"
4. Click "Envoyer un test" — you should receive an SMS + email within 10 seconds AND see a "Test — Jean Tremblay" lead in your CRM

If the test arrives but the CRM row is missing, the edge function isn't deployed yet (still running the old version). Re-run `supabase functions deploy send-event-lead`.

If the test fails entirely, check `supabase functions logs send-event-lead` for the error.

## 4. The notes field tells you everything

For each lead inserted into `customers`, the notes column contains a multi-line block like:

```
Lead événement · Segment: Investisseur
Tirage: Évaluation ROI · 3 propriétés (2500$)
Score: 85/100
Source: qr
Ville: Montréal
Notes lead: Je veux convertir mon sous-sol en bachelor.
Lead ID: L8KJ9X3MFQ7
```

So when you open the customer in your CRM, you can immediately tell which prize they're entered into, how hot the lead is (score 0-100), and what they said when they signed up.

---

## How the video, form and CRM connect

```
[Promo video MP4]
   QR points to →
[mlprenodesign.ca/diagnostic]
   3 buttons (Propriétaire / Acheteur / Investisseur)
   route to →
[mlprenodesign.ca/event?seg=X]
   form submit calls →
[MLP_EVENT.addLead(data)]
   1. Saves to localStorage (operator's device CRM)
   2. POSTs to https://lhewggoajbccegpowkas.supabase.co/functions/v1/send-event-lead
        ↓
        ├── Twilio SMS to operator + lead
        ├── Resend email to operator + lead
        └── INSERT INTO public.customers  (NEW)
              ↓
              [tools.mlprenodesign.ca/customers.html]
```
