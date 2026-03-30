/* ============================================
   MLP Reno & Design — Internal Tools Engine
   Staging Version
   ============================================ */

// ---- State ----
let optionCounter = 0;

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  setTodayDates();
  addExtra();
  addPayment();
  loadPresets();
  renderSampleData();
  renderDrafts();
});

function setTodayDates() {
  const today = new Date().toISOString().split('T')[0];
  const qd = document.getElementById('q-date');
  const id = document.getElementById('i-date');
  if (qd && !qd.value) qd.value = today;
  if (id && !id.value) id.value = today;
}

// ---- Navigation ----
function switchSection(name) {
  document.querySelectorAll('.section-page').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.topbar-nav button').forEach(b => b.classList.remove('active'));
  document.getElementById('section-' + name).classList.add('active');
  document.querySelector(`.topbar-nav button[data-section="${name}"]`).classList.add('active');
}

// ---- Quote Line Items ----
function addQuoteLineItem(desc = '', qty = '', unit = '', total = '') {
  const tbody = document.getElementById('q-line-items');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="col-desc"><input type="text" placeholder="Description" value="${esc(desc)}" onchange="calcLineTotal(this)"></td>
    <td class="col-qty"><input type="number" placeholder="1" value="${esc(qty)}" min="0" step="1" onchange="calcLineTotal(this)"></td>
    <td class="col-unit"><input type="number" placeholder="0.00" value="${esc(unit)}" min="0" step="0.01" onchange="calcLineTotal(this)"></td>
    <td class="col-total"><input type="number" placeholder="0.00" value="${esc(total)}" min="0" step="0.01"></td>
    <td class="col-action"><button class="btn-remove-row" onclick="this.closest('tr').remove()">&times;</button></td>
  `;
  tbody.appendChild(tr);
}

function addInvoiceLineItem(desc = '', qty = '', unit = '', total = '') {
  const tbody = document.getElementById('i-line-items');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="col-desc"><input type="text" placeholder="Description" value="${esc(desc)}" onchange="calcLineTotal(this)"></td>
    <td class="col-qty"><input type="number" placeholder="1" value="${esc(qty)}" min="0" step="1" onchange="calcLineTotal(this)"></td>
    <td class="col-unit"><input type="number" placeholder="0.00" value="${esc(unit)}" min="0" step="0.01" onchange="calcLineTotal(this)"></td>
    <td class="col-total"><input type="number" placeholder="0.00" value="${esc(total)}" min="0" step="0.01"></td>
    <td class="col-action"><button class="btn-remove-row" onclick="this.closest('tr').remove()">&times;</button></td>
  `;
  tbody.appendChild(tr);
}

function calcLineTotal(input) {
  const tr = input.closest('tr');
  const inputs = tr.querySelectorAll('input');
  const qty = parseFloat(inputs[1].value) || 0;
  const unit = parseFloat(inputs[2].value) || 0;
  if (qty && unit) {
    inputs[3].value = (qty * unit).toFixed(2);
  }
}

// ---- Extras / Payments ----
function addExtra(desc = '', amount = '') {
  const container = document.getElementById('i-extras');
  const div = document.createElement('div');
  div.className = 'extras-row';
  div.innerHTML = `
    <input type="text" placeholder="Description" value="${esc(desc)}">
    <input type="number" placeholder="0.00" value="${esc(amount)}" min="0" step="0.01">
    <button class="btn-remove-row" onclick="this.parentElement.remove()">&times;</button>
  `;
  container.appendChild(div);
}

function addPayment(desc = '', amount = '') {
  const container = document.getElementById('i-payments');
  const div = document.createElement('div');
  div.className = 'payment-row';
  div.innerHTML = `
    <input type="text" placeholder="Description (e.g. Deposit)" value="${esc(desc)}">
    <input type="number" placeholder="0.00" value="${esc(amount)}" min="0" step="0.01">
    <button class="btn-remove-row" onclick="this.parentElement.remove()">&times;</button>
  `;
  container.appendChild(div);
}

// ---- Options Mode ----
function toggleOptionsMode() {
  const on = document.getElementById('q-options-mode').checked;
  document.getElementById('q-options-container').style.display = on ? 'block' : 'none';
  if (on && document.getElementById('q-options-blocks').children.length === 0) {
    addOptionBlock('Option A');
    addOptionBlock('Option B');
  }
}

function addOptionBlock(label) {
  optionCounter++;
  const id = 'opt-' + optionCounter;
  if (!label) label = 'Option ' + String.fromCharCode(64 + optionCounter);
  const container = document.getElementById('q-options-blocks');
  const div = document.createElement('div');
  div.className = 'option-block';
  div.id = id;
  div.innerHTML = `
    <div class="option-block-header">
      <h4>${esc(label)}</h4>
      <button class="btn btn-danger btn-sm" onclick="document.getElementById('${id}').remove()">Remove</button>
    </div>
    <div class="form-row full">
      <div class="form-group">
        <label>Option Title</label>
        <input type="text" class="opt-title" placeholder="e.g. Standard Renovation">
      </div>
    </div>
    <div class="form-row full">
      <div class="form-group">
        <label>Scope Notes</label>
        <textarea class="opt-scope" rows="3" placeholder="Rough scope for this option..."></textarea>
      </div>
    </div>
    <table class="line-items-table">
      <thead>
        <tr>
          <th class="col-desc">Description</th>
          <th class="col-qty">Qty</th>
          <th class="col-unit">Unit Price</th>
          <th class="col-total">Total</th>
          <th class="col-action"></th>
        </tr>
      </thead>
      <tbody class="opt-items"></tbody>
    </table>
    <div class="btn-row">
      <button class="btn btn-secondary btn-sm" onclick="addOptLineItem('${id}')">+ Add Item</button>
    </div>
  `;
  container.appendChild(div);
  addOptLineItem(id);
}

function addOptLineItem(blockId, desc = '', qty = '', unit = '', total = '') {
  const tbody = document.getElementById(blockId).querySelector('.opt-items');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="col-desc"><input type="text" placeholder="Description" value="${esc(desc)}" onchange="calcLineTotal(this)"></td>
    <td class="col-qty"><input type="number" placeholder="1" value="${esc(qty)}" min="0" step="1" onchange="calcLineTotal(this)"></td>
    <td class="col-unit"><input type="number" placeholder="0.00" value="${esc(unit)}" min="0" step="0.01" onchange="calcLineTotal(this)"></td>
    <td class="col-total"><input type="number" placeholder="0.00" value="${esc(total)}" min="0" step="0.01"></td>
    <td class="col-action"><button class="btn-remove-row" onclick="this.closest('tr').remove()">&times;</button></td>
  `;
  tbody.appendChild(tr);
}

// ---- Presets ----
function appendPreset(fieldId, text) {
  const el = document.getElementById(fieldId);
  el.value = el.value ? el.value + '\n' + text : text;
}
function setPreset(fieldId, text) {
  document.getElementById(fieldId).value = text;
}
function savePresets() {
  const presets = {
    payment: document.getElementById('preset-payment').value,
    timeline: document.getElementById('preset-timeline').value,
    notes: document.getElementById('preset-notes').value,
  };
  localStorage.setItem('mlp-presets', JSON.stringify(presets));
  showToast('Presets saved!', 'success');
}
function loadPresets() {
  const saved = localStorage.getItem('mlp-presets');
  if (saved) {
    const p = JSON.parse(saved);
    if (p.payment) document.getElementById('preset-payment').value = p.payment;
    if (p.timeline) document.getElementById('preset-timeline').value = p.timeline;
    if (p.notes) document.getElementById('preset-notes').value = p.notes;
  }
}

// ---- Helpers ----
function esc(s) {
  if (!s) return '';
  return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function money(n) {
  return parseFloat(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function nl2br(s) {
  return (s || '').replace(/\n/g, '<br>');
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show toast-' + type;
  setTimeout(() => t.className = 'toast', 3000);
}

function getLineItems(tbodyId) {
  const rows = document.getElementById(tbodyId).querySelectorAll('tr');
  const items = [];
  rows.forEach(tr => {
    const inputs = tr.querySelectorAll('input');
    const desc = inputs[0].value.trim();
    const qty = inputs[1].value.trim();
    const unit = inputs[2].value.trim();
    const total = inputs[3].value.trim();
    if (desc || total) {
      items.push({ description: desc, quantity: qty, unit_price: unit, total_price: total || '0' });
    }
  });
  return items;
}

function getExtras() {
  const rows = document.querySelectorAll('#i-extras .extras-row');
  const items = [];
  rows.forEach(r => {
    const inputs = r.querySelectorAll('input');
    const desc = inputs[0].value.trim();
    const amt = inputs[1].value.trim();
    if (desc || amt) items.push({ description: desc, amount: amt || '0' });
  });
  return items;
}

function getPayments() {
  const rows = document.querySelectorAll('#i-payments .payment-row');
  const items = [];
  rows.forEach(r => {
    const inputs = r.querySelectorAll('input');
    const desc = inputs[0].value.trim();
    const amt = inputs[1].value.trim();
    if (desc || amt) items.push({ description: desc, amount: amt || '0' });
  });
  return items;
}

// ---- Tax Calculations ----
function calcTaxes(subtotal, includeTaxes) {
  if (!includeTaxes) return { subtotal, gst: 0, qst: 0, total: subtotal };
  const gst = Math.round(subtotal * 0.05 * 100) / 100;
  const qst = Math.round(subtotal * 0.09975 * 100) / 100;
  const total = Math.round((subtotal + gst + qst) * 100) / 100;
  return { subtotal, gst, qst, total };
}

// ---- Label helpers for bilingual ----
function L(lang, fr, en) { return lang === 'fr' ? fr : en; }

// ============================================
// QUOTE GENERATION
// ============================================
function generateQuote() {
  const data = collectQuoteData();
  const html = renderQuotePreview(data);
  document.getElementById('q-preview-content').innerHTML = html;
  showToast('Quote generated!', 'success');
}

async function generateQuoteAI() {
  showToast('AI polishing in progress...', 'info');
  try {
    const data = collectQuoteData();
    // AI polishing via GPT — rewrites rough scope into professional wording
    const [polishedScope, polishedItems] = await Promise.all([
      aiPolishScopeGPT(data.scope, data.lang),
      aiPolishLineItemsGPT(data.line_items, data.lang)
    ]);
    data.scope = polishedScope;
    data.line_items = polishedItems;

    if (data.options && data.options.length) {
      const optResults = await Promise.all(
        data.options.map(async opt => ({
          ...opt,
          scope: await aiPolishScopeGPT(opt.scope, data.lang),
          items: await aiPolishLineItemsGPT(opt.items, data.lang)
        }))
      );
      data.options = optResults;
    }

    const html = renderQuotePreview(data);
    document.getElementById('q-preview-content').innerHTML = html;
    showToast('AI-polished quote generated!', 'success');
  } catch (err) {
    console.error('AI Quote Error:', err);
    showToast('AI error: ' + err.message + ' — falling back to local polish.', 'error');
    generateQuote();
  }
}

function collectQuoteData() {
  const lang = document.getElementById('q-lang').value;
  const optionsMode = document.getElementById('q-options-mode').checked;
  const data = {
    lang,
    number: document.getElementById('q-number').value || '[TO COMPLETE]',
    date: document.getElementById('q-date').value || '[TO COMPLETE]',
    project_title: document.getElementById('q-project-title').value || '',
    client_name: document.getElementById('q-client-name').value || '[TO COMPLETE]',
    client_email: document.getElementById('q-client-email').value || '',
    client_phone: document.getElementById('q-client-phone').value || '',
    address: document.getElementById('q-address').value || '[TO COMPLETE]',
    scope: document.getElementById('q-scope').value || '',
    line_items: getLineItems('q-line-items'),
    include_taxes: document.getElementById('q-taxes').checked,
    options_mode: optionsMode,
    options: [],
    include_payment: document.getElementById('q-payment-terms').checked,
    payment_text: document.getElementById('q-payment-text').value || '',
    include_timeline: document.getElementById('q-timeline').checked,
    timeline_text: document.getElementById('q-timeline-text').value || '',
    include_notes: document.getElementById('q-notes').checked,
    notes_text: document.getElementById('q-notes-text').value || '',
  };

  if (optionsMode) {
    const blocks = document.querySelectorAll('#q-options-blocks .option-block');
    blocks.forEach((block, idx) => {
      const title = block.querySelector('.opt-title').value || 'Option ' + String.fromCharCode(65 + idx);
      const scope = block.querySelector('.opt-scope').value || '';
      const items = [];
      block.querySelectorAll('.opt-items tr').forEach(tr => {
        const inputs = tr.querySelectorAll('input');
        const desc = inputs[0].value.trim();
        const qty = inputs[1].value.trim();
        const unit = inputs[2].value.trim();
        const total = inputs[3].value.trim();
        if (desc || total) items.push({ description: desc, quantity: qty, unit_price: unit, total_price: total || '0' });
      });
      data.options.push({ label: 'Option ' + String.fromCharCode(65 + idx), title, scope, items });
    });
  }

  return data;
}

function renderQuotePreview(data) {
  const lang = data.lang;
  let html = '<div class="preview-doc">';

  // Header
  html += '<div class="doc-header">';
  html += `<div class="doc-header-left"><h1>MLP Reno &amp; Design</h1><p style="font-size:13px;color:#64748b;">Construction &amp; R&eacute;novation</p></div>`;
  html += `<div class="doc-header-right">
    <strong>${L(lang, 'SOUMISSION', 'QUOTE')}</strong><br>
    ${data.number}<br>
    ${formatDate(data.date, lang)}
  </div>`;
  html += '</div>';

  // Client info
  html += '<div class="doc-meta">';
  html += `<div class="doc-meta-block"><label>${L(lang, 'Client', 'Client')}</label><p>${escHtml(data.client_name)}</p>`;
  if (data.client_email) html += `<p>${escHtml(data.client_email)}</p>`;
  if (data.client_phone) html += `<p>${escHtml(data.client_phone)}</p>`;
  html += '</div>';
  html += `<div class="doc-meta-block"><label>${L(lang, 'Adresse du projet', 'Project Address')}</label><p>${escHtml(data.address)}</p>`;
  if (data.project_title) html += `<p style="margin-top:8px;"><strong>${escHtml(data.project_title)}</strong></p>`;
  html += '</div></div>';

  // Non-options mode
  if (!data.options_mode || !data.options.length) {
    // Scope
    if (data.scope) {
      html += `<h2>${L(lang, 'Port\u00e9e des travaux', 'Scope of Work')}</h2>`;
      html += '<div>' + nl2br(escHtml(data.scope)) + '</div>';
    }

    // Line items
    if (data.line_items.length) {
      html += `<h2>${L(lang, 'D\u00e9tail des co\u00fbts', 'Pricing Breakdown')}</h2>`;
      html += renderItemsTable(data.line_items, lang);

      const subtotal = data.line_items.reduce((s, i) => s + parseFloat(i.total_price || 0), 0);
      const taxes = calcTaxes(subtotal, data.include_taxes);
      html += renderTotals(taxes, lang);
    }
  } else {
    // Options mode
    if (data.scope) {
      html += `<h2>${L(lang, 'Port\u00e9e g\u00e9n\u00e9rale', 'General Scope')}</h2>`;
      html += '<div>' + nl2br(escHtml(data.scope)) + '</div>';
    }

    // Common line items if any
    if (data.line_items.length) {
      html += `<h2>${L(lang, 'Travaux communs', 'Common Work')}</h2>`;
      html += renderItemsTable(data.line_items, lang);
    }

    data.options.forEach(opt => {
      html += '<div class="option-section">';
      html += `<span class="option-label">${escHtml(opt.label)}</span>`;
      html += `<h3>${escHtml(opt.title)}</h3>`;
      if (opt.scope) html += '<div style="margin-bottom:8px;">' + nl2br(escHtml(opt.scope)) + '</div>';
      if (opt.items.length) {
        html += renderItemsTable(opt.items, lang);
        const subtotal = opt.items.reduce((s, i) => s + parseFloat(i.total_price || 0), 0);
        const taxes = calcTaxes(subtotal, data.include_taxes);
        html += renderTotals(taxes, lang);
      }
      html += '</div>';
    });
  }

  // Notes
  if (data.include_notes && data.notes_text) {
    html += `<h2>${L(lang, 'Notes et exclusions', 'Notes & Exclusions')}</h2>`;
    html += '<div class="notes-section">' + nl2br(escHtml(data.notes_text)) + '</div>';
  }

  // Payment terms
  if (data.include_payment && data.payment_text) {
    html += `<h2>${L(lang, 'Modalit\u00e9s de paiement', 'Payment Terms')}</h2>`;
    html += '<div class="notes-section">' + nl2br(escHtml(data.payment_text)) + '</div>';
  }

  // Timeline
  if (data.include_timeline && data.timeline_text) {
    html += `<h2>${L(lang, '\u00c9ch\u00e9ancier', 'Timeline')}</h2>`;
    html += '<div class="notes-section">' + nl2br(escHtml(data.timeline_text)) + '</div>';
  }

  // Closing
  html += `<div class="closing-msg">${L(lang,
    'Merci de votre confiance. N\'h\u00e9sitez pas \u00e0 nous contacter pour toute question.',
    'Thank you for your trust. Do not hesitate to contact us with any questions.'
  )}</div>`;

  html += '</div>';
  return html;
}

// ============================================
// INVOICE GENERATION
// ============================================
function generateInvoice() {
  const data = collectInvoiceData();
  const html = renderInvoicePreview(data);
  document.getElementById('i-preview-content').innerHTML = html;
  showToast('Invoice generated!', 'success');
}

async function generateInvoiceAI() {
  showToast('AI polishing in progress...', 'info');
  try {
    const data = collectInvoiceData();
    const [polishedItems, polishedExtras] = await Promise.all([
      aiPolishLineItemsGPT(data.line_items, data.lang),
      aiPolishLineItemsGPT(data.extras.map(e => ({ description: e.description })), data.lang)
    ]);
    data.line_items = polishedItems;
    data.extras = data.extras.map((e, i) => ({
      ...e,
      description: polishedExtras[i]?.description || e.description
    }));
    const html = renderInvoicePreview(data);
    document.getElementById('i-preview-content').innerHTML = html;
    showToast('AI-polished invoice generated!', 'success');
  } catch (err) {
    console.error('AI Invoice Error:', err);
    showToast('AI error: ' + err.message + ' — falling back to local polish.', 'error');
    generateInvoice();
  }
}

function collectInvoiceData() {
  return {
    lang: document.getElementById('i-lang').value,
    number: document.getElementById('i-number').value || '[TO COMPLETE]',
    date: document.getElementById('i-date').value || '[TO COMPLETE]',
    quote_ref: document.getElementById('i-quote-ref').value || '',
    client_name: document.getElementById('i-client-name').value || '[TO COMPLETE]',
    client_email: document.getElementById('i-client-email').value || '',
    client_phone: document.getElementById('i-client-phone').value || '',
    address: document.getElementById('i-address').value || '[TO COMPLETE]',
    line_items: getLineItems('i-line-items'),
    extras: getExtras(),
    payments: getPayments(),
    include_taxes: document.getElementById('i-taxes').checked,
    notes: document.getElementById('i-notes').value || '',
  };
}

function renderInvoicePreview(data) {
  const lang = data.lang;
  let html = '<div class="preview-doc">';

  // Header
  html += '<div class="doc-header">';
  html += '<div class="doc-header-left"><h1>MLP Reno &amp; Design</h1><p style="font-size:13px;color:#64748b;">Construction &amp; R&eacute;novation</p></div>';
  html += `<div class="doc-header-right">
    <strong>${L(lang, 'FACTURE', 'INVOICE')}</strong><br>
    ${escHtml(data.number)}<br>
    ${formatDate(data.date, lang)}`;
  if (data.quote_ref) html += `<br><span style="font-size:12px;">${L(lang, 'R\u00e9f. soumission', 'Ref. Quote')}: ${escHtml(data.quote_ref)}</span>`;
  html += '</div></div>';

  // Client
  html += '<div class="doc-meta">';
  html += `<div class="doc-meta-block"><label>${L(lang, 'Client', 'Client')}</label><p>${escHtml(data.client_name)}</p>`;
  if (data.client_email) html += `<p>${escHtml(data.client_email)}</p>`;
  if (data.client_phone) html += `<p>${escHtml(data.client_phone)}</p>`;
  html += '</div>';
  html += `<div class="doc-meta-block"><label>${L(lang, 'Adresse du projet', 'Project Address')}</label><p>${escHtml(data.address)}</p></div>`;
  html += '</div>';

  // Line items
  let itemsSubtotal = 0;
  if (data.line_items.length) {
    html += `<h2>${L(lang, 'Travaux factur\u00e9s', 'Billed Work')}</h2>`;
    html += renderItemsTable(data.line_items, lang);
    itemsSubtotal = data.line_items.reduce((s, i) => s + parseFloat(i.total_price || 0), 0);
  }

  // Extras
  let extrasTotal = 0;
  if (data.extras.length && data.extras.some(e => e.description)) {
    html += `<h2>${L(lang, 'Travaux suppl\u00e9mentaires', 'Additional Work')}</h2>`;
    html += '<table><thead><tr><th>Description</th><th class="text-right">' + L(lang, 'Montant', 'Amount') + '</th></tr></thead><tbody>';
    data.extras.forEach(e => {
      if (e.description) {
        const amt = parseFloat(e.amount || 0);
        extrasTotal += amt;
        html += `<tr><td>${escHtml(e.description)}</td><td class="text-right">${money(amt)} $</td></tr>`;
      }
    });
    html += '</tbody></table>';
  }

  // Totals
  const grandSubtotal = itemsSubtotal + extrasTotal;
  const taxes = calcTaxes(grandSubtotal, data.include_taxes);
  html += renderTotals(taxes, lang);

  // Payments
  let paymentsTotal = 0;
  if (data.payments.length && data.payments.some(p => p.description)) {
    html += `<h2>${L(lang, 'Paiements re\u00e7us', 'Payments Received')}</h2>`;
    html += '<table><thead><tr><th>Description</th><th class="text-right">' + L(lang, 'Montant', 'Amount') + '</th></tr></thead><tbody>';
    data.payments.forEach(p => {
      if (p.description) {
        const amt = parseFloat(p.amount || 0);
        paymentsTotal += amt;
        html += `<tr><td>${escHtml(p.description)}</td><td class="text-right">- ${money(amt)} $</td></tr>`;
      }
    });
    html += '</tbody></table>';
  }

  // Balance due
  const balance = taxes.total - paymentsTotal;
  html += '<div class="totals-section">';
  if (paymentsTotal > 0) {
    html += `<div class="total-row"><span>${L(lang, 'Total facture', 'Invoice Total')}</span><span>${money(taxes.total)} $</span></div>`;
    html += `<div class="total-row"><span>${L(lang, 'Paiements re\u00e7us', 'Payments Received')}</span><span>- ${money(paymentsTotal)} $</span></div>`;
  }
  html += `<div class="total-row balance-due"><span>${L(lang, 'SOLDE D\u00db', 'BALANCE DUE')}</span><span>${money(balance)} $</span></div>`;
  html += '</div>';

  // Notes
  if (data.notes) {
    html += `<h2>${L(lang, 'Notes', 'Notes')}</h2>`;
    html += '<div class="notes-section">' + nl2br(escHtml(data.notes)) + '</div>';
  }

  html += `<div class="closing-msg">${L(lang,
    'Merci pour votre confiance. Pour toute question, contactez-nous \u00e0 info@mlprenodesign.ca',
    'Thank you for your business. For any questions, contact us at info@mlprenodesign.ca'
  )}</div>`;

  html += '</div>';
  return html;
}

// ============================================
// EMAIL GENERATION
// ============================================
function generateEmail() {
  const data = collectEmailData();
  const result = buildEmail(data);
  document.getElementById('e-preview-content').innerHTML = renderEmailPreview(data, result);
  showToast('Email generated!', 'success');
}

async function generateEmailAI() {
  showToast('AI polishing email...', 'info');
  try {
    const data = collectEmailData();
    const baseResult = buildEmail(data);
    const polished = await aiPolishEmailGPT(baseResult.subject, baseResult.body, data.lang, data.purpose, data.context);
    document.getElementById('e-preview-content').innerHTML = renderEmailPreview(data, polished);
    showToast('AI email generated!', 'success');
  } catch (err) {
    console.error('AI Email Error:', err);
    showToast('AI error: ' + err.message + ' — falling back to template.', 'error');
    generateEmail();
  }
}

function collectEmailData() {
  return {
    purpose: document.getElementById('e-purpose').value,
    lang: document.getElementById('e-lang').value,
    client_name: document.getElementById('e-client-name').value || '[Client]',
    client_email: document.getElementById('e-client-email').value || '',
    ref: document.getElementById('e-ref').value || '',
    attach: document.getElementById('e-attach').value,
    context: document.getElementById('e-context').value || '',
  };
}

function buildEmail(data, aiPolish = false) {
  const lang = data.lang;
  const firstName = data.client_name.split(' ')[0];
  const templates = {
    'send-quote': {
      fr: {
        subject: `Soumission ${data.ref} — MLP Reno & Design`,
        body: `Bonjour ${firstName},\n\nSuite \u00e0 notre discussion, veuillez trouver ci-joint notre soumission ${data.ref} pour les travaux \u00e0 r\u00e9aliser.\n\n${data.context ? data.context + '\n\n' : ''}N'h\u00e9sitez pas \u00e0 nous contacter si vous avez des questions ou souhaitez discuter des d\u00e9tails.\n\nAu plaisir de collaborer avec vous.\n\nCordialement,\nMLP Reno & Design\n(450) 500-8936\ninfo@mlprenodesign.ca`
      },
      en: {
        subject: `Quote ${data.ref} — MLP Reno & Design`,
        body: `Hi ${firstName},\n\nFollowing our discussion, please find attached our quote ${data.ref} for the proposed work.\n\n${data.context ? data.context + '\n\n' : ''}Please don't hesitate to reach out if you have any questions or would like to discuss the details.\n\nLooking forward to working with you.\n\nBest regards,\nMLP Reno & Design\n(450) 500-8936\ninfo@mlprenodesign.ca`
      }
    },
    'send-invoice': {
      fr: {
        subject: `Facture ${data.ref} — MLP Reno & Design`,
        body: `Bonjour ${firstName},\n\nVeuillez trouver ci-joint la facture ${data.ref} pour les travaux r\u00e9alis\u00e9s.\n\n${data.context ? data.context + '\n\n' : ''}Le paiement peut \u00eatre effectu\u00e9 par ch\u00e8que ou virement Interac \u00e0 info@mlprenodesign.ca.\n\nN'h\u00e9sitez pas \u00e0 nous contacter pour toute question.\n\nCordialement,\nMLP Reno & Design\n(450) 500-8936\ninfo@mlprenodesign.ca`
      },
      en: {
        subject: `Invoice ${data.ref} — MLP Reno & Design`,
        body: `Hi ${firstName},\n\nPlease find attached invoice ${data.ref} for the completed work.\n\n${data.context ? data.context + '\n\n' : ''}Payment can be made by cheque or e-Transfer to info@mlprenodesign.ca.\n\nPlease don't hesitate to contact us with any questions.\n\nBest regards,\nMLP Reno & Design\n(450) 500-8936\ninfo@mlprenodesign.ca`
      }
    },
    'follow-up': {
      fr: {
        subject: `Suivi — Soumission ${data.ref} — MLP Reno & Design`,
        body: `Bonjour ${firstName},\n\nJe fais suite \u00e0 la soumission ${data.ref} que nous vous avons transmise r\u00e9cemment.\n\n${data.context ? data.context + '\n\n' : ''}Avez-vous eu l'occasion de la consulter? N'h\u00e9sitez pas \u00e0 nous faire part de vos questions ou commentaires.\n\nNous sommes disponibles pour en discuter \u00e0 votre convenance.\n\nCordialement,\nMLP Reno & Design\n(450) 500-8936\ninfo@mlprenodesign.ca`
      },
      en: {
        subject: `Follow-up — Quote ${data.ref} — MLP Reno & Design`,
        body: `Hi ${firstName},\n\nI'm following up on quote ${data.ref} that we recently sent over.\n\n${data.context ? data.context + '\n\n' : ''}Have you had a chance to review it? Feel free to share any questions or feedback.\n\nWe're available to discuss at your convenience.\n\nBest regards,\nMLP Reno & Design\n(450) 500-8936\ninfo@mlprenodesign.ca`
      }
    },
    'approval': {
      fr: {
        subject: `Confirmation requise — ${data.ref} — MLP Reno & Design`,
        body: `Bonjour ${firstName},\n\nNous aimerions obtenir votre approbation pour la soumission ${data.ref} afin de planifier le d\u00e9but des travaux.\n\n${data.context ? data.context + '\n\n' : ''}Pourriez-vous nous confirmer votre accord? Un d\u00e9p\u00f4t de 10% sera requis pour r\u00e9server la date.\n\nN'h\u00e9sitez pas \u00e0 nous contacter pour toute question.\n\nCordialement,\nMLP Reno & Design\n(450) 500-8936\ninfo@mlprenodesign.ca`
      },
      en: {
        subject: `Approval Needed — ${data.ref} — MLP Reno & Design`,
        body: `Hi ${firstName},\n\nWe'd like to get your approval on quote ${data.ref} so we can schedule the start of work.\n\n${data.context ? data.context + '\n\n' : ''}Could you please confirm your agreement? A 10% deposit will be required to reserve the date.\n\nPlease don't hesitate to reach out with any questions.\n\nBest regards,\nMLP Reno & Design\n(450) 500-8936\ninfo@mlprenodesign.ca`
      }
    },
    'payment-reminder': {
      fr: {
        subject: `Rappel de paiement — Facture ${data.ref} — MLP Reno & Design`,
        body: `Bonjour ${firstName},\n\nNous souhaitons faire un suivi amical concernant la facture ${data.ref}.\n\n${data.context ? data.context + '\n\n' : ''}Pourriez-vous nous confirmer la r\u00e9ception et pr\u00e9voir le paiement \u00e0 votre convenance?\n\nLe paiement peut \u00eatre effectu\u00e9 par ch\u00e8que ou virement Interac \u00e0 info@mlprenodesign.ca.\n\nMerci et bonne journ\u00e9e!\n\nCordialement,\nMLP Reno & Design\n(450) 500-8936\ninfo@mlprenodesign.ca`
      },
      en: {
        subject: `Payment Reminder — Invoice ${data.ref} — MLP Reno & Design`,
        body: `Hi ${firstName},\n\nThis is a friendly reminder regarding invoice ${data.ref}.\n\n${data.context ? data.context + '\n\n' : ''}Could you please confirm receipt and arrange payment at your earliest convenience?\n\nPayment can be made by cheque or e-Transfer to info@mlprenodesign.ca.\n\nThank you and have a great day!\n\nBest regards,\nMLP Reno & Design\n(450) 500-8936\ninfo@mlprenodesign.ca`
      }
    }
  };

  const tmpl = templates[data.purpose]?.[lang] || templates['send-quote'][lang];
  return { subject: tmpl.subject, body: tmpl.body };
}

function renderEmailPreview(data, result) {
  const attachLabel = {
    'none': '',
    'quote': data.lang === 'fr' ? 'Soumission jointe' : 'Quote attached',
    'invoice': data.lang === 'fr' ? 'Facture jointe' : 'Invoice attached',
    'both': data.lang === 'fr' ? 'Soumission et facture jointes' : 'Quote and invoice attached',
  };
  let html = '<div class="preview-email">';
  html += '<div class="preview-email-header">';
  html += `<div class="email-field"><label>To:</label><span>${escHtml(data.client_name)} &lt;${escHtml(data.client_email)}&gt;</span></div>`;
  html += `<div class="email-field"><label>From:</label><span>MLP Reno &amp; Design &lt;info@mlprenodesign.ca&gt;</span></div>`;
  html += `<div class="email-field"><label>Subject:</label><span><strong>${escHtml(result.subject)}</strong></span></div>`;
  if (attachLabel[data.attach]) {
    html += `<div class="email-field"><label>Attach:</label><span>&#128206; ${escHtml(attachLabel[data.attach])}</span></div>`;
  }
  html += '</div>';
  html += `<div class="preview-email-body">${escHtml(result.body)}</div>`;
  html += '</div>';
  return html;
}

// ============================================
// SHARED RENDERERS
// ============================================
function renderItemsTable(items, lang) {
  let html = '<table><thead><tr>';
  html += `<th>Description</th><th class="text-right">${L(lang, 'Qté', 'Qty')}</th><th class="text-right">${L(lang, 'Prix unit.', 'Unit Price')}</th><th class="text-right">Total</th>`;
  html += '</tr></thead><tbody>';
  items.forEach(item => {
    const desc = item.description || '[TO COMPLETE]';
    const total = parseFloat(item.total_price || 0);
    html += `<tr>
      <td>${escHtml(desc)}</td>
      <td class="text-right">${item.quantity || '-'}</td>
      <td class="text-right">${item.unit_price ? money(item.unit_price) + ' $' : '-'}</td>
      <td class="text-right">${total ? money(total) + ' $' : '[PRICE TO COMPLETE]'}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  return html;
}

function renderTotals(taxes, lang) {
  let html = '<div class="totals-section">';
  html += `<div class="total-row"><span>${L(lang, 'Sous-total', 'Subtotal')}</span><span>${money(taxes.subtotal)} $</span></div>`;
  if (taxes.gst > 0) {
    html += `<div class="total-row"><span>TPS / GST (5%)</span><span>${money(taxes.gst)} $</span></div>`;
    html += `<div class="total-row"><span>TVQ / QST (9.975%)</span><span>${money(taxes.qst)} $</span></div>`;
  }
  html += `<div class="total-row grand-total"><span>TOTAL</span><span>${money(taxes.total)} $</span></div>`;
  html += '</div>';
  return html;
}

function formatDate(dateStr, lang) {
  if (!dateStr || dateStr === '[TO COMPLETE]') return '[TO COMPLETE]';
  const d = new Date(dateStr + 'T00:00:00');
  if (lang === 'fr') {
    const months = ['janvier','f\u00e9vrier','mars','avril','mai','juin','juillet','ao\u00fbt','septembre','octobre','novembre','d\u00e9cembre'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ============================================
// AI GENERATE LINE ITEMS FROM PROMPT
// ============================================
async function aiGenerateLineItems(section) {
  const isQuote = section === 'quote';
  const promptEl = isQuote ? document.getElementById('q-scope') : document.getElementById('i-scope-prompt');
  const prompt = promptEl.value.trim();
  if (!prompt) {
    showToast('Enter a project description first.', 'error');
    return;
  }
  const lang = document.getElementById(isQuote ? 'q-lang' : 'i-lang').value;
  showToast('AI is generating line items...', 'info');

  try {
    const result = await aiGenerateLineItemsGPT(prompt, lang);

    // Populate scope (quote only)
    if (isQuote && result.scope) {
      document.getElementById('q-scope').value = result.scope;
    }

    // Clear existing line items and populate with AI-generated ones
    const tbodyId = isQuote ? 'q-line-items' : 'i-line-items';
    document.getElementById(tbodyId).innerHTML = '';
    const addFn = isQuote ? addQuoteLineItem : addInvoiceLineItem;

    if (result.line_items && result.line_items.length) {
      result.line_items.forEach(item => {
        addFn(
          item.description || '',
          String(item.quantity || 1),
          String(item.unit_price || ''),
          String(item.total_price || '')
        );
      });
      showToast(`AI generated ${result.line_items.length} line items!`, 'success');
    } else {
      addFn();
      showToast('AI could not determine line items from your description.', 'error');
    }
  } catch (err) {
    console.error('AI Generate Line Items Error:', err);
    showToast('AI error: ' + err.message, 'error');
  }
}

// ============================================
// AI POLISH (LOCAL STAGING — pattern-based)
// ============================================
// In staging, this uses local rewriting rules.
// In production, wire these to the ChatGPT API.

function aiPolishScope(text, lang) {
  if (!text) return '';
  // Split into lines, clean up each, capitalize
  const lines = text.split('\n').filter(l => l.trim());
  const polished = lines.map(line => {
    let l = line.trim();
    // Remove leading dashes/bullets
    l = l.replace(/^[-•*]\s*/, '');
    // Capitalize first letter
    l = l.charAt(0).toUpperCase() + l.slice(1);
    // Add period if missing
    if (!/[.!?]$/.test(l)) l += '.';
    return l;
  });

  if (lang === 'fr') {
    return polished.map(l => '\u2022 ' + l).join('\n');
  }
  return polished.map(l => '\u2022 ' + l).join('\n');
}

function aiPolishLineItem(desc, lang) {
  if (!desc) return '';
  let d = desc.trim();
  // Capitalize
  d = d.charAt(0).toUpperCase() + d.slice(1);
  // Common rewrites
  const rewrites = {
    'demo': lang === 'fr' ? 'D\u00e9molition et retrait' : 'Demolition and removal',
    'install': lang === 'fr' ? 'Installation' : 'Installation',
    'paint': lang === 'fr' ? 'Peinture' : 'Painting',
    'tile': lang === 'fr' ? 'Pose de c\u00e9ramique' : 'Tile installation',
    'plumbing': lang === 'fr' ? 'Travaux de plomberie' : 'Plumbing work',
    'electrical': lang === 'fr' ? 'Travaux d\'\u00e9lectricit\u00e9' : 'Electrical work',
    'drywall': lang === 'fr' ? 'Pose de gypse et tirage de joints' : 'Drywall installation and finishing',
    'flooring': lang === 'fr' ? 'Pose de rev\u00eatement de sol' : 'Flooring installation',
    'framing': lang === 'fr' ? 'Charpente et structure' : 'Framing and structural work',
    'cleanup': lang === 'fr' ? 'Nettoyage et remise en \u00e9tat du chantier' : 'Site cleanup and restoration',
  };

  // Try partial matches
  const lower = d.toLowerCase();
  for (const [key, val] of Object.entries(rewrites)) {
    if (lower.startsWith(key) && lower.length < key.length + 15) {
      return val;
    }
  }

  return d;
}

// ============================================
// CONVERT QUOTE TO INVOICE
// ============================================
function convertQuoteToInvoice() {
  const data = collectQuoteData();
  switchSection('invoices');
  document.getElementById('i-quote-ref').value = data.number;
  document.getElementById('i-client-name').value = data.client_name;
  document.getElementById('i-client-email').value = data.client_email;
  document.getElementById('i-client-phone').value = data.client_phone;
  document.getElementById('i-address').value = data.address;
  document.getElementById('i-lang').value = data.lang;
  document.getElementById('i-taxes').checked = data.include_taxes;

  // Clear and populate items
  document.getElementById('i-line-items').innerHTML = '';
  const items = data.options_mode && data.options.length
    ? data.options.flatMap(o => o.items)
    : data.line_items;

  items.forEach(item => {
    addInvoiceLineItem(item.description, item.quantity, item.unit_price, item.total_price);
  });
  if (!items.length) addInvoiceLineItem();

  showToast('Quote converted to invoice!', 'success');
}

function generateEmailFromInvoice() {
  const data = collectInvoiceData();
  switchSection('emails');
  document.getElementById('e-purpose').value = 'send-invoice';
  document.getElementById('e-lang').value = data.lang;
  document.getElementById('e-client-name').value = data.client_name;
  document.getElementById('e-client-email').value = data.client_email;
  document.getElementById('e-ref').value = data.number;
  document.getElementById('e-attach').value = 'invoice';
  showToast('Invoice info loaded into email form', 'success');
}

// ============================================
// SAVE / LOAD DRAFTS
// ============================================
function saveQuoteDraft() {
  const data = collectQuoteData();
  const drafts = JSON.parse(localStorage.getItem('mlp-drafts') || '[]');
  drafts.push({
    type: 'quote',
    id: 'draft-' + Date.now(),
    label: data.number + ' — ' + data.client_name,
    date: new Date().toISOString(),
    data
  });
  localStorage.setItem('mlp-drafts', JSON.stringify(drafts));
  renderDrafts();
  showToast('Quote draft saved!', 'success');
}

function saveInvoiceDraft() {
  const data = collectInvoiceData();
  const drafts = JSON.parse(localStorage.getItem('mlp-drafts') || '[]');
  drafts.push({
    type: 'invoice',
    id: 'draft-' + Date.now(),
    label: data.number + ' — ' + data.client_name,
    date: new Date().toISOString(),
    data
  });
  localStorage.setItem('mlp-drafts', JSON.stringify(drafts));
  renderDrafts();
  showToast('Invoice draft saved!', 'success');
}

function renderDrafts() {
  const drafts = JSON.parse(localStorage.getItem('mlp-drafts') || '[]');
  const container = document.getElementById('drafts-list');
  if (!drafts.length) {
    container.innerHTML = '<p style="font-size:13px; color:var(--mlp-text-muted);">No saved drafts yet.</p>';
    return;
  }
  let html = '<div class="sample-data-grid">';
  drafts.forEach((d, idx) => {
    const tag = d.type === 'quote' ? 'tag-quote' : 'tag-invoice';
    html += `<div class="sample-card" onclick="loadDraft(${idx})">
      <h4>${escHtml(d.label)}</h4>
      <p>${new Date(d.date).toLocaleDateString()}</p>
      <span class="sample-tag ${tag}">${d.type}</span>
      <button class="btn btn-danger btn-sm" style="float:right;margin-top:-20px;" onclick="event.stopPropagation();deleteDraft(${idx})">Delete</button>
    </div>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

function loadDraft(idx) {
  const drafts = JSON.parse(localStorage.getItem('mlp-drafts') || '[]');
  const draft = drafts[idx];
  if (!draft) return;
  if (draft.type === 'quote') {
    loadQuoteData(draft.data);
    switchSection('quotes');
  } else {
    loadInvoiceData(draft.data);
    switchSection('invoices');
  }
  showToast('Draft loaded!', 'success');
}

function deleteDraft(idx) {
  const drafts = JSON.parse(localStorage.getItem('mlp-drafts') || '[]');
  drafts.splice(idx, 1);
  localStorage.setItem('mlp-drafts', JSON.stringify(drafts));
  renderDrafts();
  showToast('Draft deleted', 'success');
}

function loadQuoteData(data) {
  document.getElementById('q-number').value = data.number || '';
  document.getElementById('q-date').value = data.date || '';
  document.getElementById('q-lang').value = data.lang || 'fr';
  document.getElementById('q-project-title').value = data.project_title || '';
  document.getElementById('q-client-name').value = data.client_name || '';
  document.getElementById('q-client-email').value = data.client_email || '';
  document.getElementById('q-client-phone').value = data.client_phone || '';
  document.getElementById('q-address').value = data.address || '';
  document.getElementById('q-scope').value = data.scope || '';
  document.getElementById('q-taxes').checked = data.include_taxes !== false;
  document.getElementById('q-payment-terms').checked = data.include_payment !== false;
  document.getElementById('q-timeline').checked = data.include_timeline !== false;
  document.getElementById('q-notes').checked = data.include_notes !== false;
  document.getElementById('q-payment-text').value = data.payment_text || '';
  document.getElementById('q-timeline-text').value = data.timeline_text || '';
  document.getElementById('q-notes-text').value = data.notes_text || '';

  // Line items
  document.getElementById('q-line-items').innerHTML = '';
  (data.line_items || []).forEach(item => {
    addQuoteLineItem(item.description, item.quantity, item.unit_price, item.total_price);
  });
  if (!(data.line_items || []).length) addQuoteLineItem();

  // Options
  document.getElementById('q-options-mode').checked = data.options_mode || false;
  toggleOptionsMode();
  if (data.options_mode && data.options) {
    document.getElementById('q-options-blocks').innerHTML = '';
    optionCounter = 0;
    data.options.forEach(opt => {
      addOptionBlock(opt.label);
      const block = document.getElementById('opt-' + optionCounter);
      block.querySelector('.opt-title').value = opt.title || '';
      block.querySelector('.opt-scope').value = opt.scope || '';
      block.querySelector('.opt-items').innerHTML = '';
      (opt.items || []).forEach(item => {
        addOptLineItem('opt-' + optionCounter, item.description, item.quantity, item.unit_price, item.total_price);
      });
    });
  }
}

function loadInvoiceData(data) {
  document.getElementById('i-number').value = data.number || '';
  document.getElementById('i-date').value = data.date || '';
  document.getElementById('i-lang').value = data.lang || 'fr';
  document.getElementById('i-quote-ref').value = data.quote_ref || '';
  document.getElementById('i-client-name').value = data.client_name || '';
  document.getElementById('i-client-email').value = data.client_email || '';
  document.getElementById('i-client-phone').value = data.client_phone || '';
  document.getElementById('i-address').value = data.address || '';
  document.getElementById('i-taxes').checked = data.include_taxes !== false;
  document.getElementById('i-notes').value = data.notes || '';

  document.getElementById('i-line-items').innerHTML = '';
  (data.line_items || []).forEach(item => {
    addInvoiceLineItem(item.description, item.quantity, item.unit_price, item.total_price);
  });
  if (!(data.line_items || []).length) addInvoiceLineItem();

  document.getElementById('i-extras').innerHTML = '';
  (data.extras || []).forEach(e => addExtra(e.description, e.amount));
  if (!(data.extras || []).length) addExtra();

  document.getElementById('i-payments').innerHTML = '';
  (data.payments || []).forEach(p => addPayment(p.description, p.amount));
  if (!(data.payments || []).length) addPayment();
}

// ============================================
// COPY PREVIEW
// ============================================
function copyPreview(containerId) {
  const el = document.getElementById(containerId);
  const text = el.innerText || el.textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!', 'success');
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Copied to clipboard!', 'success');
  });
}

// ============================================
// SAMPLE DATA
// ============================================
const SAMPLES = [
  {
    id: 'sample-q1',
    type: 'quote',
    tag: 'tag-quote',
    title: 'Bathroom Renovation — Laval',
    desc: 'Simple quote, French, with taxes',
    data: {
      lang: 'fr',
      number: 'Q-2026-001',
      date: '2026-03-29',
      project_title: 'R\u00e9novation de salle de bain compl\u00e8te',
      client_name: 'Jean Tremblay',
      client_email: 'jean.tremblay@test.com',
      client_phone: '(450) 555-1234',
      address: '456 Boul. des Laurentides, Laval QC H7G 2T1',
      scope: 'D\u00e9molition compl\u00e8te de la salle de bain existante\nInstallation nouvelle douche en c\u00e9ramique\nNouveau vanit\u00e9 60 pouces\nPose de c\u00e9ramique plancher et murs\nPlomberie et raccordements\nPeinture et finitions\nNettoyage final',
      line_items: [
        { description: 'D\u00e9molition et retrait des mat\u00e9riaux', quantity: '1', unit_price: '1500', total_price: '1500' },
        { description: 'Plomberie — raccordement douche et vanit\u00e9', quantity: '1', unit_price: '2800', total_price: '2800' },
        { description: 'Pose de c\u00e9ramique (plancher et murs douche)', quantity: '1', unit_price: '3500', total_price: '3500' },
        { description: 'Installation vanit\u00e9 et miroir', quantity: '1', unit_price: '1200', total_price: '1200' },
        { description: 'Peinture et finitions', quantity: '1', unit_price: '800', total_price: '800' },
        { description: 'Nettoyage de chantier', quantity: '1', unit_price: '300', total_price: '300' },
      ],
      include_taxes: true,
      options_mode: false, options: [],
      include_payment: true,
      payment_text: '10% d\u00e9p\u00f4t pour r\u00e9server la date\n40% avant le d\u00e9but des travaux\n40% \u00e0 mi-projet\n10% le jour final',
      include_timeline: true,
      timeline_text: 'Les travaux prendront environ 2 \u00e0 3 semaines selon la disponibilit\u00e9 des mat\u00e9riaux. Un pr\u00e9avis de 2 semaines est requis pour mobiliser l\'\u00e9quipe.',
      include_notes: true,
      notes_text: 'Le client devrait pr\u00e9voir environ 5% \u00e0 15% pour les impr\u00e9vus.\nLes frais de permis, si applicables, ne sont pas inclus dans cette soumission.',
    }
  },
  {
    id: 'sample-q2',
    type: 'quote',
    tag: 'tag-quote',
    title: 'Kitchen Renovation — Longueuil',
    desc: 'English quote with taxes',
    data: {
      lang: 'en',
      number: 'Q-2026-002',
      date: '2026-03-29',
      project_title: 'Complete Kitchen Renovation',
      client_name: 'Sarah Mitchell',
      client_email: 'sarah.mitchell@test.com',
      client_phone: '(514) 555-6789',
      address: '789 Chemin de Chambly, Longueuil QC J4H 3M2',
      scope: 'Full demolition of existing kitchen\nNew custom cabinetry installation\nGranite countertop installation\nNew backsplash tiling\nPlumbing for new sink and dishwasher\nElectrical for new fixtures and outlets\nFlooring installation\nPainting and finishing',
      line_items: [
        { description: 'Demolition and disposal', quantity: '1', unit_price: '2000', total_price: '2000' },
        { description: 'Custom cabinetry supply and install', quantity: '1', unit_price: '8500', total_price: '8500' },
        { description: 'Granite countertop supply and install', quantity: '1', unit_price: '4200', total_price: '4200' },
        { description: 'Backsplash tile installation', quantity: '1', unit_price: '1800', total_price: '1800' },
        { description: 'Plumbing work', quantity: '1', unit_price: '2500', total_price: '2500' },
        { description: 'Electrical work', quantity: '1', unit_price: '1800', total_price: '1800' },
        { description: 'Flooring installation', quantity: '1', unit_price: '2200', total_price: '2200' },
        { description: 'Painting and finishing', quantity: '1', unit_price: '1200', total_price: '1200' },
      ],
      include_taxes: true,
      options_mode: false, options: [],
      include_payment: true,
      payment_text: '10% deposit to reserve date\n40% before start of work\n40% mid-project\n10% on final day',
      include_timeline: true,
      timeline_text: 'Work may take approximately 3 to 4 weeks depending on scope and material availability. A 2-week heads-up may be required to mobilize the team.',
      include_notes: true,
      notes_text: 'Client should plan approximately 5% to 15% for unforeseen circumstances.\nPermit fees, if applicable, are not included in this quote.\nAppliances are not included — client to supply.',
    }
  },
  {
    id: 'sample-q3',
    type: 'quote',
    tag: 'tag-options',
    title: 'Basement — Options A/B/C',
    desc: 'French quote with 3 options',
    data: {
      lang: 'fr',
      number: 'Q-2026-003',
      date: '2026-03-29',
      project_title: 'Am\u00e9nagement du sous-sol',
      client_name: 'Marc-Antoine Bergeron',
      client_email: 'marc.bergeron@test.com',
      client_phone: '(450) 555-9876',
      address: '321 Rue du Parc, Terrebonne QC J6W 1P2',
      scope: 'Am\u00e9nagement complet du sous-sol. Trois options propos\u00e9es selon le niveau de finition souhait\u00e9.',
      line_items: [],
      include_taxes: true,
      options_mode: true,
      options: [
        {
          label: 'Option A',
          title: 'Finition de base',
          scope: 'Isolation, gypse, plancher flottant, peinture, \u00e9clairage de base.',
          items: [
            { description: 'Isolation et pare-vapeur', quantity: '1', unit_price: '3000', total_price: '3000' },
            { description: 'Gypse et tirage de joints', quantity: '1', unit_price: '4500', total_price: '4500' },
            { description: 'Plancher flottant', quantity: '1', unit_price: '2500', total_price: '2500' },
            { description: 'Peinture', quantity: '1', unit_price: '1500', total_price: '1500' },
            { description: '\u00c9clairage de base', quantity: '1', unit_price: '800', total_price: '800' },
          ]
        },
        {
          label: 'Option B',
          title: 'Finition standard avec salle de bain',
          scope: 'Tout de l\'Option A + salle de bain compl\u00e8te + plafond suspendu.',
          items: [
            { description: 'Travaux Option A (base)', quantity: '1', unit_price: '12300', total_price: '12300' },
            { description: 'Salle de bain compl\u00e8te (douche, toilette, vanit\u00e9)', quantity: '1', unit_price: '8500', total_price: '8500' },
            { description: 'Plafond suspendu', quantity: '1', unit_price: '2800', total_price: '2800' },
          ]
        },
        {
          label: 'Option C',
          title: 'Finition haut de gamme avec cin\u00e9ma maison',
          scope: 'Tout de l\'Option B + salle cin\u00e9ma maison + bar.',
          items: [
            { description: 'Travaux Option B (standard)', quantity: '1', unit_price: '23600', total_price: '23600' },
            { description: 'Salle cin\u00e9ma maison (insonorisation, \u00e9clairage, c\u00e2blage)', quantity: '1', unit_price: '7500', total_price: '7500' },
            { description: 'Bar avec comptoir et rangement', quantity: '1', unit_price: '5200', total_price: '5200' },
          ]
        },
      ],
      include_payment: true,
      payment_text: '10% d\u00e9p\u00f4t pour r\u00e9server la date\n40% avant le d\u00e9but des travaux\n40% \u00e0 mi-projet\n10% le jour final',
      include_timeline: true,
      timeline_text: 'Option A: environ 2 semaines\nOption B: environ 3-4 semaines\nOption C: environ 5-6 semaines',
      include_notes: true,
      notes_text: 'Le client devrait pr\u00e9voir environ 5% \u00e0 15% pour les impr\u00e9vus.\nLes frais de permis ne sont pas inclus.\nLe mobilier et l\'\u00e9lectrom\u00e9nager ne sont pas inclus.',
    }
  },
  {
    id: 'sample-i1',
    type: 'invoice',
    tag: 'tag-invoice',
    title: 'Invoice — Bathroom (Tremblay)',
    desc: 'Invoice from quote Q-2026-001 with deposit',
    data: {
      lang: 'fr',
      number: 'INV-2026-001',
      date: '2026-03-29',
      quote_ref: 'Q-2026-001',
      client_name: 'Jean Tremblay',
      client_email: 'jean.tremblay@test.com',
      client_phone: '(450) 555-1234',
      address: '456 Boul. des Laurentides, Laval QC H7G 2T1',
      line_items: [
        { description: 'D\u00e9molition et retrait des mat\u00e9riaux', quantity: '1', unit_price: '1500', total_price: '1500' },
        { description: 'Plomberie — raccordement douche et vanit\u00e9', quantity: '1', unit_price: '2800', total_price: '2800' },
        { description: 'Pose de c\u00e9ramique (plancher et murs douche)', quantity: '1', unit_price: '3500', total_price: '3500' },
        { description: 'Installation vanit\u00e9 et miroir', quantity: '1', unit_price: '1200', total_price: '1200' },
        { description: 'Peinture et finitions', quantity: '1', unit_price: '800', total_price: '800' },
        { description: 'Nettoyage de chantier', quantity: '1', unit_price: '300', total_price: '300' },
      ],
      extras: [
        { description: 'Remplacement du ventilateur de salle de bain (ajout)', amount: '450' },
      ],
      payments: [
        { description: 'D\u00e9p\u00f4t initial (10%)', amount: '1010' },
        { description: 'Paiement avant d\u00e9but (40%)', amount: '4040' },
      ],
      include_taxes: true,
      notes: 'Paiement par ch\u00e8que ou virement Interac \u00e0 info@mlprenodesign.ca',
    }
  },
  {
    id: 'sample-i2',
    type: 'invoice',
    tag: 'tag-invoice',
    title: 'Invoice — Kitchen (Mitchell)',
    desc: 'English invoice, no extras, partial payment',
    data: {
      lang: 'en',
      number: 'INV-2026-002',
      date: '2026-03-29',
      quote_ref: 'Q-2026-002',
      client_name: 'Sarah Mitchell',
      client_email: 'sarah.mitchell@test.com',
      client_phone: '(514) 555-6789',
      address: '789 Chemin de Chambly, Longueuil QC J4H 3M2',
      line_items: [
        { description: 'Demolition and disposal', quantity: '1', unit_price: '2000', total_price: '2000' },
        { description: 'Custom cabinetry supply and install', quantity: '1', unit_price: '8500', total_price: '8500' },
        { description: 'Granite countertop supply and install', quantity: '1', unit_price: '4200', total_price: '4200' },
        { description: 'Backsplash tile installation', quantity: '1', unit_price: '1800', total_price: '1800' },
        { description: 'Plumbing work', quantity: '1', unit_price: '2500', total_price: '2500' },
        { description: 'Electrical work', quantity: '1', unit_price: '1800', total_price: '1800' },
        { description: 'Flooring installation', quantity: '1', unit_price: '2200', total_price: '2200' },
        { description: 'Painting and finishing', quantity: '1', unit_price: '1200', total_price: '1200' },
      ],
      extras: [],
      payments: [
        { description: 'Deposit (10%)', amount: '2420' },
      ],
      include_taxes: true,
      notes: 'Payment by cheque or e-Transfer to info@mlprenodesign.ca',
    }
  },
  {
    id: 'sample-e1',
    type: 'email',
    tag: 'tag-email',
    title: 'Email — Send Quote (FR)',
    desc: 'French email to send quote',
    data: {
      purpose: 'send-quote',
      lang: 'fr',
      client_name: 'Jean Tremblay',
      client_email: 'jean.tremblay@test.com',
      ref: 'Q-2026-001',
      attach: 'quote',
      context: 'Suite \u00e0 notre visite du 25 mars pour la r\u00e9novation de la salle de bain.',
    }
  },
  {
    id: 'sample-e2',
    type: 'email',
    tag: 'tag-email',
    title: 'Email — Payment Reminder (EN)',
    desc: 'English payment reminder',
    data: {
      purpose: 'payment-reminder',
      lang: 'en',
      client_name: 'Sarah Mitchell',
      client_email: 'sarah.mitchell@test.com',
      ref: 'INV-2026-002',
      attach: 'invoice',
      context: 'The mid-project payment of $9,680 is now due.',
    }
  },
];

function renderSampleData() {
  const grid = document.getElementById('sample-grid');
  let html = '';
  SAMPLES.forEach(s => {
    html += `<div class="sample-card" onclick="loadSample('${s.id}')">
      <h4>${escHtml(s.title)}</h4>
      <p>${escHtml(s.desc)}</p>
      <span class="sample-tag ${s.tag}">${s.type}</span>
    </div>`;
  });
  grid.innerHTML = html;
}

function loadSample(id) {
  const sample = SAMPLES.find(s => s.id === id);
  if (!sample) return;

  if (sample.type === 'quote') {
    loadQuoteData(sample.data);
    switchSection('quotes');
    showToast('Sample quote loaded!', 'success');
  } else if (sample.type === 'invoice') {
    loadInvoiceData(sample.data);
    switchSection('invoices');
    showToast('Sample invoice loaded!', 'success');
  } else if (sample.type === 'email') {
    document.getElementById('e-purpose').value = sample.data.purpose;
    document.getElementById('e-lang').value = sample.data.lang;
    document.getElementById('e-client-name').value = sample.data.client_name;
    document.getElementById('e-client-email').value = sample.data.client_email;
    document.getElementById('e-ref').value = sample.data.ref;
    document.getElementById('e-attach').value = sample.data.attach;
    document.getElementById('e-context').value = sample.data.context;
    switchSection('emails');
    showToast('Sample email loaded!', 'success');
  }
}
