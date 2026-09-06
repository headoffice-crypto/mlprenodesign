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

  // Prefer the schedule embedded in the quote (lets the contractor define
  // custom payment schedules per quote). Fall back to the canonical A/B/C set.
  const embedded = quote.ai_conversation && quote.ai_conversation.payment_schedule;
  const schedule = (embedded && Array.isArray(embedded.rows) && embedded.rows.length)
    ? embedded.rows.map(r => ({ label_fr: r.label_fr || '', label_en: r.label_en || '', pct: Number(r.pct) || 0 }))
    : (PAYMENT_SCHEDULES[quote.payment_option || 'A'] || PAYMENT_SCHEDULES.A);
  const base = Number(accepted.subtotal || 0);
  const lang = quote.language === 'en' ? 'en' : 'fr';
  const rand4 = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  const y = new Date().getFullYear();

  const apply = accepted.apply_taxes !== false;
  const rows = schedule.map((s, idx) => {
    const amtBefore = Math.round(base * s.pct) / 100;
    const gst = apply ? Math.round(amtBefore * 0.05 * 100) / 100 : 0;
    const qst = apply ? Math.round(amtBefore * 0.09975 * 100) / 100 : 0;
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

// Compute invoice tax breakdown from a pre-tax amount and the accepted option's tax flag.
function computeInvoiceAmounts(preTax, applyTaxes) {
  const amtBefore = Math.round(Number(preTax || 0) * 100) / 100;
  const gst = applyTaxes ? Math.round(amtBefore * 0.05 * 100) / 100 : 0;
  const qst = applyTaxes ? Math.round(amtBefore * 0.09975 * 100) / 100 : 0;
  const total = Math.round((amtBefore + gst + qst) * 100) / 100;
  return { amount_before_tax: amtBefore, gst, qst, amount_total: total };
}

// Adjust one invoice's percentage/amount and shift the delta to the next unpaid,
// non-cancelled installment. Returns the refreshed invoice list for the project.
async function adjustInvoice(invoiceId, { pct = null, preTax = null }, quote, allInvoices) {
  const inv = allInvoices.find(i => i.id === invoiceId);
  if (!inv) throw new Error('Invoice not found');
  if (inv.status === 'paid') throw new Error('Cannot adjust a paid invoice');

  const opts = Array.isArray(quote.options) ? quote.options : [];
  const accepted = opts.find(o => o.key === quote.accepted_option_key) || opts[0];
  if (!accepted) throw new Error('No accepted option on quote');
  const base = Number(accepted.subtotal || 0);
  const applyTaxes = accepted.apply_taxes !== false;
  if (base <= 0) throw new Error('Quote subtotal is zero');

  // Resolve target values — pct wins if provided, otherwise derive pct from preTax.
  let newPct;
  if (pct !== null && pct !== undefined) {
    newPct = Math.max(0, Math.min(100, Number(pct)));
  } else if (preTax !== null && preTax !== undefined) {
    newPct = Math.max(0, Math.min(100, (Number(preTax) / base) * 100));
  } else {
    throw new Error('Provide pct or preTax');
  }

  const oldPct = Number(inv.pct_of_total || 0);
  const deltaPct = Math.round((newPct - oldPct) * 100) / 100;
  if (Math.abs(deltaPct) < 0.005) return allInvoices;

  const newPreTax = Math.round(base * newPct) / 100;
  const patch = { pct_of_total: Math.round(newPct * 100) / 100, ...computeInvoiceAmounts(newPreTax, applyTaxes) };
  await updateInvoice(invoiceId, patch);

  // Shift the delta to the next unpaid, non-cancelled invoice by sequence.
  const next = allInvoices
    .filter(i => i.id !== invoiceId && i.status !== 'paid' && i.status !== 'cancelled' && i.sequence > inv.sequence)
    .sort((a, b) => a.sequence - b.sequence)[0];

  if (next) {
    const nextNewPct = Math.max(0, Math.round((Number(next.pct_of_total || 0) - deltaPct) * 100) / 100);
    const nextPreTax = Math.round(base * nextNewPct) / 100;
    await updateInvoice(next.id, { pct_of_total: nextNewPct, ...computeInvoiceAmounts(nextPreTax, applyTaxes) });
  }

  // Reload the full list for this project.
  const { data, error } = await sb.from('invoices').select('*').eq('project_id', inv.project_id).order('sequence', { ascending: true });
  if (error) throw error;
  return data || [];
}

// Amend a signed quote: unlock it for editing and cancel any pending invoices.
// The customer will need to re-sign the updated version. Preserves the revision
// counter so the re-send is stamped as the next version (v2, v3, …).
async function amendSignedQuote(id) {
  const { data: q, error: qe } = await sb.from('quotes').select('id, ai_conversation').eq('id', id).maybeSingle();
  if (qe) throw qe;
  if (!q) throw new Error('Quote not found');

  const conv = (q.ai_conversation && typeof q.ai_conversation === 'object') ? q.ai_conversation : {};
  const currentRevision = Number(conv.revision) || 1;
  const newConv = { ...conv, revision: currentRevision + 1, amended_from_signed_at: new Date().toISOString() };

  const { error: ue } = await sb.from('quotes').update({
    status: 'draft',
    customer_signature: null,
    customer_signer_name: null,
    customer_signed_at: null,
    customer_signer_ip: null,
    accepted_option_key: null,
    viewed_at: null,
    ai_conversation: newConv
  }).eq('id', id);
  if (ue) throw ue;

  // Cancel any pending/sent (unpaid) invoices tied to this quote's project.
  const { data: proj } = await sb.from('projects').select('id').eq('quote_id', id).maybeSingle();
  if (proj) {
    await sb.from('invoices').update({ status: 'cancelled' })
      .eq('project_id', proj.id)
      .neq('status', 'paid');
  }

  logQuoteEvent(id, 'amended', { previous_revision: currentRevision }).catch(() => {});
  return { id, revision: currentRevision + 1 };
}

/* ---------- Payments (ledger of money actually received) ---------- */

function generateReceiptNumber() {
  const y = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const ts = Date.now().toString(36).slice(-3).toUpperCase();
  return `R-${y}-${ts}${rand}`;
}

async function listProjectPayments(projectId) {
  const { data, error } = await sb
    .from('payments')
    .select('*')
    .eq('project_id', projectId)
    .order('paid_at', { ascending: false })
    .order('created_at', { ascending: false });
  // If the payments table doesn't exist yet (migration not run), degrade gracefully
  // so the rest of the project page still renders.
  if (error) {
    if (isMissingRelation(error)) { console.warn('[payments] table missing — feature disabled until migration runs'); return []; }
    throw error;
  }
  return data || [];
}

function isMissingRelation(err) {
  const msg = String(err?.message || err?.code || '');
  return /relation .*payments.* does not exist/i.test(msg)
      || err?.code === '42P01'
      || /not.+find.+table/i.test(msg);
}

async function insertPayment({ project_id, invoice_id, customer_id, amount, method, paid_at, note }) {
  const row = {
    project_id,
    invoice_id: invoice_id || null,
    customer_id: customer_id || null,
    amount: Number(amount),
    method: method || 'other',
    paid_at: paid_at || new Date().toISOString().slice(0, 10),
    note: (note || '').trim() || null,
    receipt_number: generateReceiptNumber(),
    share_token: generateShareToken()
  };

  const { data, error } = await sb.from('payments').insert(row).select('*').single();
  if (error) {
    if (isMissingRelation(error)) {
      throw new Error("Table 'payments' introuvable — exécutez sql/04_payments.sql dans Supabase.");
    }
    throw error;
  }

  // If this payment is linked to an invoice, check whether that invoice is
  // now fully covered by cumulative payments and update its status.
  if (data.invoice_id) {
    await syncInvoiceStatusFromPayments(data.invoice_id).catch(() => {});
  }
  return data;
}

async function deletePayment(id) {
  const { data: pay } = await sb.from('payments').select('invoice_id').eq('id', id).maybeSingle();
  const { error } = await sb.from('payments').delete().eq('id', id);
  if (error) throw error;
  if (pay?.invoice_id) {
    await syncInvoiceStatusFromPayments(pay.invoice_id).catch(() => {});
  }
}

// Recompute an invoice's paid_amount/paid_at/status from the payments ledger.
async function syncInvoiceStatusFromPayments(invoiceId) {
  const { data: inv } = await sb.from('invoices').select('*').eq('id', invoiceId).maybeSingle();
  if (!inv) return;

  const { data: pays } = await sb
    .from('payments')
    .select('amount, method, paid_at, created_at')
    .eq('invoice_id', invoiceId);

  const list = pays || [];
  const total = list.reduce((s, p) => s + Number(p.amount || 0), 0);
  const covered = total + 0.005 >= Number(inv.amount_total || 0);
  const latest = list.sort((a, b) => (a.paid_at < b.paid_at ? 1 : -1))[0];

  const patch = {
    paid_amount: total || null,
    paid_at: covered && latest ? new Date(latest.paid_at).toISOString() : null,
    payment_method: covered && latest ? latest.method : null,
    status: covered ? 'paid' : (inv.status === 'paid' ? (inv.sent_at ? 'sent' : 'pending') : inv.status)
  };
  await sb.from('invoices').update(patch).eq('id', invoiceId);
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
