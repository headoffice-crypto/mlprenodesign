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
  // HARD RULE: a customers row is only created at signing time, not before.
  // Pull the quote's stored client_* fields and upsert (or reuse an existing
  // customer matched by email).
  const { data: quote, error: qErr } = await sb
    .from('quotes')
    .select('id, customer_id, client_name, client_email, client_phone, client_address')
    .eq('share_token', token)
    .single();
  if (qErr) throw qErr;

  let customerId = quote.customer_id;
  if (!customerId && quote.client_name && quote.client_name.trim()) {
    try {
      customerId = await upsertCustomer({
        name: quote.client_name,
        email: quote.client_email,
        phone: quote.client_phone,
        address: quote.client_address
      });
    } catch (err) {
      console.warn('[saveCustomerSignature -> upsertCustomer] failed', err);
    }
  }

  const patch = {
    customer_signature: signature,
    customer_signer_name: signerName,
    customer_signed_at: new Date().toISOString(),
    status: 'signed'
  };
  if (acceptedOptionKey) patch.accepted_option_key = acceptedOptionKey;
  if (customerId && !quote.customer_id) patch.customer_id = customerId;

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

/* ---------- Deletion ---------- */
async function deleteQuote(id) {
  // Best-effort cleanup of dependents
  await sb.from('quote_events').delete().eq('quote_id', id);
  await sb.from('invoices').delete().eq('quote_id', id);
  const { error } = await sb.from('quotes').delete().eq('id', id);
  if (error) throw error;
}

async function deleteCustomer(id) {
  // Find every project linked to the customer, then drop dependents
  const { data: projects } = await sb.from('projects').select('id').eq('customer_id', id);
  const projectIds = (projects || []).map(p => p.id);
  if (projectIds.length) {
    await sb.from('project_photos').delete().in('project_id', projectIds);
    await sb.from('invoices').delete().in('project_id', projectIds);
    await sb.from('projects').delete().in('id', projectIds);
  }

  const { data: quotes } = await sb.from('quotes').select('id').eq('customer_id', id);
  const quoteIds = (quotes || []).map(q => q.id);
  if (quoteIds.length) {
    await sb.from('quote_events').delete().in('quote_id', quoteIds);
    await sb.from('invoices').delete().in('quote_id', quoteIds);
    await sb.from('quotes').delete().in('id', quoteIds);
  }

  const { error } = await sb.from('customers').delete().eq('id', id);
  if (error) throw error;
}

/* ---------- Events ---------- */
async function logQuoteEvent(quoteId, eventType, payload) {
  await sb.from('quote_events').insert({
    quote_id: quoteId,
    event_type: eventType,
    payload: payload || null
  });
}

/* ============================================
   Phase 2 — CRM helpers: customers / projects / invoices / photos
   ============================================ */

async function getCustomerById(id) {
  const { data, error } = await sb.from('customers').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function updateCustomer(id, patch) {
  const { data, error } = await sb.from('customers').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

async function getCustomerQuotes(customerId) {
  const { data, error } = await sb
    .from('quotes')
    .select('id, quote_number, status, client_name, project_title, options, accepted_option_key, created_at, share_token')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function listCustomersWithStats() {
  const { data: customers, error } = await sb.from('customers').select('*').order('updated_at', { ascending: false });
  if (error) throw error;

  const { data: quotes } = await sb.from('quotes').select('customer_id, status, options, accepted_option_key');
  const { data: projects } = await sb.from('projects').select('id, customer_id, status');

  const stats = new Map();
  (quotes || []).forEach(q => {
    if (!q.customer_id) return;
    const s = stats.get(q.customer_id) || { quotes: 0, signed: 0, revenue: 0, project_id: null, active_project: false };
    s.quotes += 1;
    if (q.status === 'signed') {
      s.signed += 1;
      const accepted = (q.options || []).find(o => o.key === q.accepted_option_key);
      if (accepted) s.revenue += Number(accepted.total || 0);
    }
    stats.set(q.customer_id, s);
  });

  (projects || []).forEach(p => {
    if (!p.customer_id) return;
    const s = stats.get(p.customer_id) || { quotes: 0, signed: 0, revenue: 0, project_id: null, active_project: false };
    // Prefer the most recently active project
    if (!s.project_id || ['active', 'planning'].includes(p.status)) {
      s.project_id = p.id;
      s.active_project = ['active', 'planning'].includes(p.status);
    }
    stats.set(p.customer_id, s);
  });

  return (customers || []).map(c => ({
    ...c,
    stats: stats.get(c.id) || { quotes: 0, signed: 0, revenue: 0, project_id: null, active_project: false }
  }));
}

/* ---------- Projects ---------- */

async function getProject(id) {
  const { data, error } = await sb.from('projects').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function getProjectByQuoteId(quoteId) {
  const { data, error } = await sb.from('projects').select('*').eq('quote_id', quoteId).maybeSingle();
  if (error) throw error;
  return data;
}

async function listProjects() {
  const { data, error } = await sb
    .from('projects')
    .select('*, quote:quotes(id, quote_number, client_name, project_title, options, accepted_option_key, share_token)')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function updateProject(id, patch) {
  const { data, error } = await sb.from('projects').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

/* ---------- Invoices ---------- */

function generateInvoiceNumber(seq) {
  const y = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-${y}-${String(seq).padStart(2, '0')}-${rand}`;
}

// Schedule breakdown per payment option
const PAYMENT_SCHEDULES = {
  A: [
    { label_fr: 'Dépôt',           label_en: 'Deposit',              pct: 10 },
    { label_fr: 'Avant début',     label_en: 'Before start',         pct: 40 },
    { label_fr: 'Mi-parcours',     label_en: 'Mid-project',          pct: 40 },
    { label_fr: 'Fin des travaux', label_en: 'Upon completion',      pct: 10 }
  ],
  B: [
    { label_fr: 'Dépôt',           label_en: 'Deposit',              pct: 20 },
    { label_fr: 'Avant début',     label_en: 'Before start',         pct: 30 },
    { label_fr: 'Mi-parcours',     label_en: 'Mid-project',          pct: 40 },
    { label_fr: 'Fin des travaux', label_en: 'Upon completion',      pct: 10 }
  ],
  C: [
    { label_fr: 'Dépôt',           label_en: 'Deposit',              pct: 20 },
    { label_fr: 'Avant début',     label_en: 'Before start',         pct: 40 },
    { label_fr: 'Mi-parcours',     label_en: 'Mid-project',          pct: 30 },
    { label_fr: 'Fin des travaux', label_en: 'Upon completion',      pct: 10 }
  ]
};

async function getOrGenerateInvoicesForProject(project, quote) {
  // Fetch existing invoices
  const { data: existing, error: e1 } = await sb
    .from('invoices')
    .select('*')
    .eq('project_id', project.id)
    .order('sequence', { ascending: true });
  if (e1) throw e1;
  if (existing && existing.length) return existing;

  // None yet — generate from the quote's payment option + accepted option total
  const opts = Array.isArray(quote.options) ? quote.options : [];
  const accepted = opts.find(o => o.key === quote.accepted_option_key) || opts[0];
  if (!accepted) return [];

  const schedule = PAYMENT_SCHEDULES[quote.payment_option || 'A'] || PAYMENT_SCHEDULES.A;
  const base = Number(accepted.subtotal || 0);
  const lang = quote.language === 'en' ? 'en' : 'fr';
  const rand4 = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  const y = new Date().getFullYear();

  const rows = schedule.map((s, idx) => {
    const amtBefore = Math.round(base * s.pct) / 100;
    const gst = Math.round(amtBefore * 0.05 * 100) / 100;
    const qst = Math.round(amtBefore * 0.09975 * 100) / 100;
    const total = Math.round((amtBefore + gst + qst) * 100) / 100;
    return {
      project_id: project.id,
      quote_id: quote.id,
      customer_id: quote.customer_id,
      invoice_number: `INV-${y}-${project.id.slice(0, 4).toUpperCase()}-${String(idx + 1).padStart(2, '0')}`,
      sequence: idx + 1,
      label: lang === 'fr' ? s.label_fr : s.label_en,
      pct_of_total: s.pct,
      amount_before_tax: amtBefore,
      gst,
      qst,
      amount_total: total,
      status: 'pending',
      share_token: rand4() + rand4() + rand4()
    };
  });

  const { data, error } = await sb.from('invoices').insert(rows).select('*').order('sequence', { ascending: true });
  if (error) throw error;
  return data;
}

async function updateInvoice(id, patch) {
  const { data, error } = await sb.from('invoices').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

async function markInvoicePaid(id, paidAmount, method) {
  return updateInvoice(id, {
    status: 'paid',
    paid_at: new Date().toISOString(),
    paid_amount: paidAmount,
    payment_method: method || 'other'
  });
}

/* ---------- Photos ---------- */

async function listProjectPhotos(projectId) {
  const { data, error } = await sb
    .from('project_photos')
    .select('*')
    .eq('project_id', projectId)
    .order('uploaded_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(p => ({
    ...p,
    public_url: `${SUPABASE_URL}/storage/v1/object/public/project-photos/${p.storage_path}`
  }));
}

async function uploadProjectPhoto(projectId, file, category, caption) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${projectId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: upErr } = await sb.storage.from('project-photos').upload(path, file, {
    contentType: file.type,
    upsert: false
  });
  if (upErr) throw upErr;

  const { data, error } = await sb.from('project_photos').insert({
    project_id: projectId,
    storage_path: path,
    category: category || 'during',
    caption: caption || null
  }).select('*').single();
  if (error) throw error;

  return {
    ...data,
    public_url: `${SUPABASE_URL}/storage/v1/object/public/project-photos/${path}`
  };
}

async function deleteProjectPhoto(photoId, storagePath) {
  await sb.storage.from('project-photos').remove([storagePath]).catch(() => {});
  const { error } = await sb.from('project_photos').delete().eq('id', photoId);
  if (error) throw error;
}
