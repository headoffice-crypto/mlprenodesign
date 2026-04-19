/* ============================================
   Supabase client + DB helpers
   MLP Reno & Design — Quote & CRM (Phase 1)
   ============================================ */

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

/* ---------- Utilities ---------- */
function generateQuoteNumber() {
  const y = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const ts = Date.now().toString(36).slice(-3).toUpperCase();
  return `Q-${y}-${ts}${rand}`;
}

function generateShareToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

/* ---------- Customers ---------- */
async function upsertCustomer({ name, email, phone, address }) {
  if (!name || !name.trim()) return null;

  if (email && email.trim()) {
    const { data: existing } = await sb
      .from('customers')
      .select('id')
      .ilike('email', email.trim())
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      const { data, error } = await sb
        .from('customers')
        .update({ name, phone, address })
        .eq('id', existing.id)
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    }
  }

  const { data, error } = await sb
    .from('customers')
    .insert({ name, email, phone, address })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function listCustomers() {
  const { data, error } = await sb
    .from('customers')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/* ---------- Quotes ---------- */
async function saveQuote(quote) {
  const record = {
    ...quote,
    share_token: quote.share_token || generateShareToken(),
    quote_number: quote.quote_number || generateQuoteNumber()
  };

  if (quote.id) {
    const { data, error } = await sb
      .from('quotes')
      .update(record)
      .eq('id', quote.id)
      .select('*')
      .single();
    if (error) throw error;
    logQuoteEvent(data.id, 'updated', null).catch(() => {});
    return data;
  }

  const { data, error } = await sb
    .from('quotes')
    .insert(record)
    .select('*')
    .single();
  if (error) throw error;
  logQuoteEvent(data.id, 'created', null).catch(() => {});
  return data;
}

async function getQuoteByToken(token) {
  const { data, error } = await sb
    .from('quotes')
    .select('*')
    .eq('share_token', token)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function listQuotes() {
  const { data, error } = await sb
    .from('quotes')
    .select('id, quote_number, status, client_name, project_title, options, accepted_option_key, created_at, share_token')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data || [];
}

async function markQuoteViewed(token) {
  const { data, error } = await sb
    .from('quotes')
    .update({ status: 'viewed', viewed_at: new Date().toISOString() })
    .eq('share_token', token)
    .eq('status', 'sent')
    .select('id')
    .maybeSingle();
  if (!error && data?.id) logQuoteEvent(data.id, 'viewed', null).catch(() => {});
}

async function saveCustomerSignature(token, { signature, signerName, acceptedOptionKey }) {
  const patch = {
    customer_signature: signature,
    customer_signer_name: signerName,
    customer_signed_at: new Date().toISOString(),
    status: 'signed'
  };
  if (acceptedOptionKey) patch.accepted_option_key = acceptedOptionKey;

  const { data, error } = await sb
    .from('quotes')
    .update(patch)
    .eq('share_token', token)
    .select('id')
    .single();
  if (error) throw error;
  logQuoteEvent(data.id, 'signed_customer', { signerName, acceptedOptionKey }).catch(() => {});
  return data.id;
}

/* ---------- Events ---------- */
async function logQuoteEvent(quoteId, eventType, payload) {
  await sb.from('quote_events').insert({
    quote_id: quoteId,
    event_type: eventType,
    payload: payload || null
  });
}
