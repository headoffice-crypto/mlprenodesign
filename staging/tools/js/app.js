/* ============================================
   MLP Reno & Design — Quote Builder
   Mobile-first, Google Material-inspired
   ============================================ */

const TOTAL_STEPS = 9;
let currentStep = 1;
let lang = 'fr';
let materialsIncluded = true;
let lineItems = [];
let selectedPaymentOption = 'A';

// ---- i18n ----
const I18N = {
  step1_title: { fr: 'Informations du client', en: 'Client Information' },
  step1_sub: { fr: 'Coordonnées du client pour la soumission', en: 'Client contact details for the quote' },
  step2_title: { fr: 'Détails du projet', en: 'Project Details' },
  step2_sub: { fr: 'Décrivez le projet et votre budget', en: 'Describe the project and your budget' },
  step3_title: { fr: 'Matériaux', en: 'Materials' },
  step3_sub: { fr: 'Ce paramètre s\'applique par défaut. Vous pourrez ajuster par poste à l\'étape suivante.', en: 'This is the default setting. You can adjust per item in the next step.' },
  step4_title: { fr: 'Postes de soumission', en: 'Quote Line Items' },
  step4_sub: { fr: 'Générez avec l\'IA ou ajoutez manuellement. Cochez les matériaux par poste.', en: 'Generate with AI or add manually. Toggle materials per item.' },
  step5_title: { fr: 'Prix et taxes', en: 'Pricing & Taxes' },
  step5_sub: { fr: 'Taxes du Québec calculées automatiquement (TPS + TVQ)', en: 'Quebec taxes calculated automatically (GST + QST)' },
  step6_title: { fr: 'Modalités de paiement', en: 'Payment Terms' },
  step6_sub: { fr: 'Choisissez l\'échéancier de paiement', en: 'Choose the payment schedule' },
  step7_title: { fr: 'Méthodes de paiement', en: 'Payment Methods' },
  step7_sub: { fr: 'Informations pour recevoir les paiements', en: 'Payment collection details' },
  step8_title: { fr: 'Notes importantes', en: 'Important Notes' },
  step8_sub: { fr: 'Conditions et avertissements inclus dans la soumission', en: 'Terms and conditions included in the quote' },
  step9_title: { fr: 'Soumission finale', en: 'Final Quote' },
  step9_sub: { fr: 'Vérifiez et partagez votre soumission', en: 'Review and share your quote' },
  client_name: { fr: 'Nom du client', en: 'Client Name' },
  client_address: { fr: 'Adresse du client', en: 'Client Address' },
  client_email: { fr: 'Courriel', en: 'Email' },
  client_phone: { fr: 'Téléphone', en: 'Phone' },
  quote_date: { fr: 'Date de la soumission', en: 'Quote Date' },
  project_title: { fr: 'Titre du projet', en: 'Project Title' },
  project_desc: { fr: 'Description du projet', en: 'Project Description' },
  project_desc_helper: { fr: 'Décrivez les travaux en détail. L\'IA utilisera cette description pour générer les postes.', en: 'Describe the work in detail. AI will use this to generate line items.' },
  project_budget: { fr: 'Budget du projet ($)', en: 'Project Budget ($)' },
  budget_helper: { fr: 'Avant taxes. L\'IA s\'ajustera à ce budget.', en: 'Before taxes. AI will adjust to this budget.' },
  project_duration: { fr: 'Durée (semaines)', en: 'Duration (weeks)' },
  duration_note: {
    fr: 'Les délais sont estimés en jours ouvrables / semaines. Selon l\'entente, certains travaux peuvent être effectués la fin de semaine.',
    en: 'Project timelines are estimated in business days/weeks. Depending on the agreement, some work may be done on weekends.'
  },
  materials_default: { fr: 'Matériaux inclus par défaut ?', en: 'Materials included by default?' },
  yes: { fr: 'Oui', en: 'Yes' },
  no: { fr: 'Non', en: 'No' },
  materials_budget: { fr: 'Budget matériaux ($)', en: 'Materials Budget ($)' },
  materials_excluded_note: {
    fr: 'Les matériaux sont exclus de cette soumission. Le client fournit les matériaux. Vous pourrez inclure les matériaux individuellement par poste.',
    en: 'Materials are excluded from this quote. The client provides materials. You can include materials individually per item.'
  },
  ai_generate: { fr: 'Générer les postes avec l\'IA', en: 'Generate Items with AI' },
  ai_working: { fr: 'L\'IA génère les postes...', en: 'AI is generating items...' },
  add_item: { fr: 'Ajouter un poste', en: 'Add Item' },
  subtotal: { fr: 'Sous-total', en: 'Subtotal' },
  total_with_tax: { fr: 'Total avec taxes', en: 'Total with taxes' },
  previous: { fr: 'Précédent', en: 'Previous' },
  next: { fr: 'Suivant', en: 'Next' },
  generate_quote: { fr: 'Voir la soumission', en: 'View Quote' },
  copy: { fr: 'Copier', en: 'Copy' },
  print_pdf: { fr: 'Imprimer / PDF', en: 'Print / PDF' },
  qty: { fr: 'Qté', en: 'Qty' },
  unit_price: { fr: 'Prix unit.', en: 'Unit $' },
  total_label: { fr: 'Total', en: 'Total' },
  mat_included: { fr: 'Matériaux inclus', en: 'Materials included' },
  step_label: { fr: 'Étape', en: 'Step' },
};

const PAYMENT_OPTIONS_DATA = [
  {
    key: 'A',
    fr: { title: 'Option A', desc: '10% dépôt\n40% avant le début des travaux\n40% mi-parcours\n10% à la fin des travaux' },
    en: { title: 'Option A', desc: '10% deposit\n40% before work begins\n40% mid-project\n10% upon completion' },
    summary: { fr: '10% dépôt · 40% avant début · 40% mi-parcours · 10% fin', en: '10% deposit · 40% before start · 40% mid-project · 10% completion' }
  },
  {
    key: 'B',
    fr: { title: 'Option B', desc: '20% dépôt\n30% avant le début des travaux\n40% mi-parcours\n10% à la fin des travaux' },
    en: { title: 'Option B', desc: '20% deposit\n30% before work begins\n40% mid-project\n10% upon completion' },
    summary: { fr: '20% dépôt · 30% avant début · 40% mi-parcours · 10% fin', en: '20% deposit · 30% before start · 40% mid-project · 10% completion' }
  },
  {
    key: 'C',
    fr: { title: 'Option C', desc: '20% dépôt\n40% avant le début des travaux\n30% mi-parcours\n10% à la fin des travaux' },
    en: { title: 'Option C', desc: '20% deposit\n40% before work begins\n30% mid-project\n10% upon completion' },
    summary: { fr: '20% dépôt · 40% avant début · 30% mi-parcours · 10% fin', en: '20% deposit · 40% before start · 30% mid-project · 10% completion' }
  },
];

const PAYMENT_METHODS = {
  fr: `Virement Interac :\npayment@mlpexperience.com\n\nChèque :\nMLP Gestion et Consultation Inc.\n\nNote : Les paiements par chèque peuvent prendre 5 à 7 jours ouvrables avant réception. Les dates de début et la planification sont confirmées seulement après réception du paiement.`,
  en: `Interac e-Transfer:\npayment@mlpexperience.com\n\nCheque:\nMLP Gestion et Consultation Inc.\n\nNote: Cheque payments may take 5–7 business days to clear. Project scheduling starts only after payment is received.`
};

const DEFAULT_NOTES = {
  fr: `• Le budget peut varier de 5% à 15% selon les imprévus\n• Les délais de livraison des matériaux peuvent varier\n• Tout travail non inclus dans cette soumission sera considéré comme un extra\n• Les délais sont estimés en jours ouvrables\n• Les taxes sont en sus`,
  en: `• Budget may vary 5%–15% due to unforeseen circumstances\n• Material delivery delays are possible\n• Work not included in this quote will be considered an extra\n• Timeline is estimated in business days\n• Taxes are extra`
};

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('f-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('f-payment-methods').value = PAYMENT_METHODS[lang];
  document.getElementById('f-notes').value = DEFAULT_NOTES[lang];
  buildPaymentOptions();
  goToStep(1);
});

// ============================================
// LANGUAGE
// ============================================

function setLang(l) {
  lang = l;
  document.getElementById('lang-fr').className = l === 'fr' ? 'active' : '';
  document.getElementById('lang-en').className = l === 'en' ? 'active' : '';

  const pmField = document.getElementById('f-payment-methods');
  const notesField = document.getElementById('f-notes');
  const otherLang = l === 'fr' ? 'en' : 'fr';
  if (pmField.value.trim() === PAYMENT_METHODS[otherLang].trim() || pmField.value.trim() === '') {
    pmField.value = PAYMENT_METHODS[l];
  }
  if (notesField.value.trim() === DEFAULT_NOTES[otherLang].trim() || notesField.value.trim() === '') {
    notesField.value = DEFAULT_NOTES[l];
  }

  applyI18N();
  buildPaymentOptions();
  renderLineItems();
  if (currentStep === 5) updatePricing();
  if (currentStep === 9) renderQuote();
}

function applyI18N() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (I18N[key] && I18N[key][lang]) {
      el.textContent = I18N[key][lang];
    }
  });
  updateProgress();
}

function t(key) {
  return I18N[key] ? (I18N[key][lang] || key) : key;
}

// ============================================
// PROGRESS
// ============================================

function updateProgress() {
  const pct = Math.round((currentStep / TOTAL_STEPS) * 100);
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-pct').textContent = pct + '%';
  document.getElementById('progress-label').textContent =
    (lang === 'fr' ? 'Étape' : 'Step') + ' ' + currentStep + ' / ' + TOTAL_STEPS;
}

// ============================================
// NAVIGATION
// ============================================

function goToStep(n) {
  if (n < 1 || n > TOTAL_STEPS) return;
  currentStep = n;

  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById('step-' + n).classList.add('active');

  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');

  btnPrev.style.display = n === 1 ? 'none' : '';

  if (n === TOTAL_STEPS) {
    btnNext.style.display = 'none';
  } else {
    btnNext.style.display = '';
    const spans = btnNext.querySelectorAll('span');
    const textSpan = spans[0];
    const iconSpan = spans[1];
    if (n === TOTAL_STEPS - 1) {
      textSpan.textContent = t('generate_quote');
      iconSpan.textContent = 'check';
    } else {
      textSpan.textContent = t('next');
      iconSpan.textContent = 'arrow_forward';
    }
  }

  updateProgress();
  applyI18N();

  if (n === 5) updatePricing();
  if (n === 9) renderQuote();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function nextStep() {
  if (currentStep < TOTAL_STEPS) goToStep(currentStep + 1);
}

function prevStep() {
  if (currentStep > 1) goToStep(currentStep - 1);
}

// ============================================
// MATERIALS TOGGLE
// ============================================

function setMaterials(included) {
  materialsIncluded = included;
  document.getElementById('mat-yes').className = 'chip' + (included ? ' active' : '');
  document.getElementById('mat-no').className = 'chip' + (!included ? ' active' : '');
  document.getElementById('mat-budget-group').style.display = included ? '' : 'none';
  document.getElementById('mat-excluded-msg').style.display = included ? 'none' : '';

  // Update all existing line items to match default
  lineItems.forEach(item => {
    item.materialsIncluded = included;
  });
  renderLineItems();
}

// ============================================
// AI LINE ITEMS
// ============================================

async function generateLineItems() {
  const desc = document.getElementById('f-project-desc').value.trim();
  if (!desc) {
    showToast(lang === 'fr' ? 'Ajoutez une description du projet d\'abord (étape 2).' : 'Add a project description first (step 2).', 'error');
    return;
  }

  const budget = document.getElementById('f-budget').value;
  let prompt = desc;
  if (budget && parseFloat(budget) > 0) {
    prompt += lang === 'fr'
      ? `\n\nBudget total du client : ${budget}$ avant taxes. Ajuste les prix pour respecter ce budget.`
      : `\n\nClient total budget: $${budget} before taxes. Adjust prices to match this budget.`;
  }

  const btn = document.getElementById('btn-ai-generate');
  const status = document.getElementById('ai-status');
  btn.disabled = true;
  btn.style.display = 'none';
  status.style.display = '';

  try {
    const items = await callGPTLineItems(prompt, lang);
    lineItems = items.map(item => ({
      ...item,
      materialsIncluded: materialsIncluded
    }));
    renderLineItems();
    showToast(lang === 'fr' ? 'Postes générés!' : 'Items generated!', 'success');
  } catch (err) {
    showToast('Erreur: ' + err.message, 'error');
  }

  btn.disabled = false;
  btn.style.display = '';
  status.style.display = 'none';
}

function renderLineItems() {
  const container = document.getElementById('line-items-container');
  container.innerHTML = '';

  lineItems.forEach((item, i) => {
    const lineTotal = item.quantity * item.unit_price;
    const div = document.createElement('div');
    div.className = 'line-item';
    div.innerHTML = `
      <div class="line-item-header">
        <textarea class="line-item-desc" rows="2" oninput="updateItem(${i},'desc',this.value)">${esc(item.description)}</textarea>
        <button class="li-remove" onclick="removeLineItem(${i})" title="Supprimer">
          <span class="material-icons-round">close</span>
        </button>
      </div>
      <div class="line-item-fields">
        <div class="li-field">
          <label>${t('qty')}</label>
          <input type="number" min="1" value="${item.quantity}" onchange="updateItem(${i},'qty',this.value)">
        </div>
        <div class="li-field">
          <label>${t('unit_price')}</label>
          <input type="number" min="0" step="50" value="${item.unit_price}" onchange="updateItem(${i},'price',this.value)">
        </div>
        <div class="li-field">
          <label>${t('total_label')}</label>
          <input type="text" value="$${money(lineTotal)}" readonly style="background:transparent;border-color:transparent;font-weight:600;color:var(--accent-dark);">
        </div>
      </div>
      <div class="line-item-footer">
        <label class="li-material-toggle">
          <input type="checkbox" ${item.materialsIncluded ? 'checked' : ''} onchange="updateItem(${i},'mat',this.checked)">
          <span>${t('mat_included')}</span>
        </label>
        <div class="li-total">$${money(lineTotal)}</div>
      </div>
    `;
    container.appendChild(div);
  });
}

function updateItem(i, field, val) {
  if (field === 'desc') lineItems[i].description = val;
  if (field === 'qty') lineItems[i].quantity = Math.max(1, parseInt(val) || 1);
  if (field === 'price') lineItems[i].unit_price = Math.max(0, parseFloat(val) || 0);
  if (field === 'mat') lineItems[i].materialsIncluded = val;
  renderLineItems();
}

function removeLineItem(i) {
  lineItems.splice(i, 1);
  renderLineItems();
}

function addLineItem() {
  lineItems.push({
    description: lang === 'fr' ? 'Nouveau poste' : 'New item',
    quantity: 1,
    unit_price: 0,
    materialsIncluded: materialsIncluded
  });
  renderLineItems();
  // Scroll to bottom
  const container = document.getElementById('line-items-container');
  const lastItem = container.lastElementChild;
  if (lastItem) lastItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ============================================
// PRICING & TAXES
// ============================================

function updatePricing() {
  const container = document.getElementById('pricing-items');
  container.innerHTML = '';

  lineItems.forEach(item => {
    const total = item.quantity * item.unit_price;
    const div = document.createElement('div');
    div.className = 'card';
    div.style.padding = '14px 20px';

    const matBadge = item.materialsIncluded
      ? `<span style="font-size:11px;background:var(--green-light);color:var(--green);padding:2px 8px;border-radius:12px;font-weight:600;">${lang === 'fr' ? 'Mat. inclus' : 'Mat. included'}</span>`
      : `<span style="font-size:11px;background:var(--orange-light);color:var(--orange);padding:2px 8px;border-radius:12px;font-weight:600;">${lang === 'fr' ? 'Mat. exclus' : 'Mat. excluded'}</span>`;

    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;margin-bottom:4px;">${esc(item.description)}</div>
          ${matBadge}
        </div>
        <span style="font-weight:700;font-size:15px;white-space:nowrap;color:var(--text-primary);">$${money(total)}</span>
      </div>
    `;
    container.appendChild(div);
  });

  const subtotal = calcSubtotal();
  const gst = round2(subtotal * 0.05);
  const qst = round2(subtotal * 0.09975);
  const total = round2(subtotal + gst + qst);

  document.getElementById('tx-subtotal').textContent = '$' + money(subtotal);
  document.getElementById('tx-gst').textContent = '$' + money(gst);
  document.getElementById('tx-qst').textContent = '$' + money(qst);
  document.getElementById('tx-total').textContent = '$' + money(total);
}

function calcSubtotal() {
  return lineItems.reduce((s, i) => s + (i.quantity * i.unit_price), 0);
}

// ============================================
// PAYMENT OPTIONS
// ============================================

function buildPaymentOptions() {
  const container = document.getElementById('payment-options-container');
  container.innerHTML = '';

  PAYMENT_OPTIONS_DATA.forEach(opt => {
    const div = document.createElement('div');
    div.className = 'option-card' + (selectedPaymentOption === opt.key ? ' selected' : '');
    div.onclick = () => { selectedPaymentOption = opt.key; buildPaymentOptions(); };
    div.innerHTML = `
      <div class="option-radio"></div>
      <div class="option-body">
        <div class="option-title">${opt[lang].title}</div>
        <div class="option-desc">${opt[lang].desc.replace(/\n/g, '<br>')}</div>
      </div>
    `;
    container.appendChild(div);
  });
}

// ============================================
// FINAL QUOTE
// ============================================

function renderQuote() {
  const name = val('f-client-name') || '[—]';
  const address = val('f-client-address') || '[—]';
  const email = val('f-client-email');
  const phone = val('f-client-phone');
  const date = val('f-date');
  const title = val('f-project-title');
  const desc = val('f-project-desc');
  const duration = val('f-duration') || '2';
  const matBudget = val('f-mat-budget') || '0';
  const methods = val('f-payment-methods');
  const notes = val('f-notes');

  const num = 'Q-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');

  const subtotal = calcSubtotal();
  const gst = round2(subtotal * 0.05);
  const qst = round2(subtotal * 0.09975);
  const total = round2(subtotal + gst + qst);

  const fr = lang === 'fr';
  const payOpt = PAYMENT_OPTIONS_DATA.find(o => o.key === selectedPaymentOption);

  let h = '<div class="quote-preview">';

  // Header
  h += '<div class="qp-header"><div>';
  h += '<h1>MLP Reno &amp; Design</h1>';
  h += '<div class="qp-subtitle">Construction &amp; Rénovation</div>';
  h += `<div class="qp-subtitle">${fr ? 'Licence RBQ' : 'RBQ Licence'}: 5847-0378-01</div>`;
  h += `<div class="qp-subtitle">${fr ? 'Assurance responsabilité civile : 5 000 000 $' : 'Liability Insurance: $5,000,000'}</div>`;
  h += '</div><div class="qp-header-right">';
  h += `<strong>${fr ? 'SOUMISSION' : 'QUOTE'}</strong><br>${esc(num)}<br>${formatDate(date)}`;
  h += '</div></div>';

  // Client
  h += '<div class="qp-meta"><div>';
  h += `<div class="qp-meta-label">Client</div>`;
  h += `<div class="qp-meta-value">${esc(name)}</div>`;
  if (email) h += `<div class="qp-meta-value">${esc(email)}</div>`;
  if (phone) h += `<div class="qp-meta-value">${esc(phone)}</div>`;
  h += '</div><div>';
  h += `<div class="qp-meta-label">${fr ? 'Adresse du projet' : 'Project Address'}</div>`;
  h += `<div class="qp-meta-value">${esc(address)}</div>`;
  h += '</div></div>';

  // Project
  if (title) {
    h += `<h2>${fr ? 'Projet' : 'Project'}</h2>`;
    h += `<div style="margin-bottom:8px;"><strong>${esc(title)}</strong></div>`;
  }
  if (desc) {
    h += `<div style="font-size:13px;color:#3c4043;white-space:pre-line;margin-bottom:8px;">${esc(desc)}</div>`;
  }

  // Duration
  h += `<div style="font-size:13px;color:#3c4043;margin-bottom:4px;">`;
  h += `<strong>${fr ? 'Durée estimée' : 'Estimated Duration'}:</strong> ${esc(duration)} ${fr ? 'semaines' : 'weeks'}`;
  h += '</div>';
  h += `<div style="font-size:12px;color:#9aa0a6;margin-bottom:12px;">`;
  h += fr
    ? 'Les délais sont estimés en jours ouvrables / semaines. Selon l\'entente, certains travaux peuvent être effectués la fin de semaine.'
    : 'Project timelines are estimated in business days/weeks. Depending on the agreement, some work may be done on weekends.';
  h += '</div>';

  // Materials
  h += `<h2>${fr ? 'Matériaux' : 'Materials'}</h2>`;
  // Check if any item has materials, any doesn't
  const hasMatItems = lineItems.some(i => i.materialsIncluded);
  const hasNoMatItems = lineItems.some(i => !i.materialsIncluded);

  if (materialsIncluded && !hasNoMatItems) {
    h += `<span class="qp-badge included">${fr ? 'Inclus' : 'Included'}</span>`;
    if (parseFloat(matBudget) > 0) {
      h += ` <span style="font-size:13px;color:#3c4043;">— Budget: $${money(matBudget)}</span>`;
    }
  } else if (!materialsIncluded && !hasMatItems) {
    h += `<span class="qp-badge excluded">${fr ? 'Exclus' : 'Excluded'}</span>`;
    h += `<div style="font-size:13px;color:#3c4043;margin-top:6px;">`;
    h += fr
      ? 'Les matériaux sont exclus. Le client est responsable de fournir les matériaux nécessaires.'
      : 'Materials are excluded. The client is responsible for providing necessary materials.';
    h += '</div>';
  } else {
    h += `<div style="font-size:13px;color:#3c4043;">`;
    h += fr ? 'Matériaux inclus selon le poste (voir tableau ci-dessous).' : 'Materials included per item (see table below).';
    h += '</div>';
    if (materialsIncluded && parseFloat(matBudget) > 0) {
      h += `<div style="font-size:13px;color:#3c4043;margin-top:4px;">Budget: $${money(matBudget)}</div>`;
    }
  }

  // Line Items
  if (lineItems.length) {
    h += `<h2>${fr ? 'Détail des coûts' : 'Pricing Breakdown'}</h2>`;
    h += '<table><thead><tr>';
    h += `<th>Description</th>`;
    h += `<th class="r">${fr ? 'Qté' : 'Qty'}</th>`;
    h += `<th class="r">${fr ? 'Prix unit.' : 'Unit $'}</th>`;
    h += `<th class="r">Total</th>`;
    if (hasMatItems || hasNoMatItems) {
      h += `<th class="r">${fr ? 'Mat.' : 'Mat.'}</th>`;
    }
    h += '</tr></thead><tbody>';

    lineItems.forEach(item => {
      const lt = item.quantity * item.unit_price;
      h += '<tr>';
      h += `<td>${esc(item.description)}</td>`;
      h += `<td class="r">${item.quantity}</td>`;
      h += `<td class="r">$${money(item.unit_price)}</td>`;
      h += `<td class="r">$${money(lt)}</td>`;
      if (hasMatItems || hasNoMatItems) {
        h += `<td class="r">${item.materialsIncluded ? (fr ? 'Oui' : 'Yes') : (fr ? 'Non' : 'No')}</td>`;
      }
      h += '</tr>';
    });
    h += '</tbody></table>';

    // Totals
    h += '<div class="qp-totals">';
    h += `<div class="qp-total-row"><span>${fr ? 'Sous-total' : 'Subtotal'}</span><span>$${money(subtotal)}</span></div>`;
    h += `<div class="qp-total-row"><span>TPS / GST (5%)</span><span>$${money(gst)}</span></div>`;
    h += `<div class="qp-total-row"><span>TVQ / QST (9.975%)</span><span>$${money(qst)}</span></div>`;
    h += `<div class="qp-total-row qp-grand-total"><span>${fr ? 'Total avec taxes' : 'Total with taxes'}</span><span>$${money(total)}</span></div>`;
    h += '</div>';
  }

  // Payment terms
  h += `<h2>${fr ? 'Modalités de paiement' : 'Payment Terms'}</h2>`;
  h += `<div class="qp-section">${payOpt[lang].desc}</div>`;

  // Payment methods
  h += `<h2>${fr ? 'Méthodes de paiement' : 'Payment Methods'}</h2>`;
  h += `<div class="qp-section">${esc(methods)}</div>`;

  // Notes
  if (notes) {
    h += `<h2>${fr ? 'Notes importantes' : 'Important Notes'}</h2>`;
    h += `<div class="qp-section">${esc(notes)}</div>`;
  }

  // Signature
  h += '<div class="qp-signature">';
  h += `<div><div class="qp-sig-line">${fr ? 'Signature — MLP Reno & Design' : 'Signature — MLP Reno & Design'}</div></div>`;
  h += `<div><div class="qp-sig-line">${fr ? 'Signature — Client' : 'Signature — Client'}</div></div>`;
  h += '</div>';

  // Closing
  h += `<div class="qp-closing">${fr
    ? 'Merci de votre confiance. N\'hésitez pas à nous contacter pour toute question.'
    : 'Thank you for your trust. Do not hesitate to contact us with any questions.'
  }</div>`;

  h += '</div>';
  document.getElementById('quote-output').innerHTML = h;
}

// ============================================
// ACTIONS
// ============================================

function copyQuote() {
  const el = document.getElementById('quote-output');
  const text = el.innerText || el.textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast(lang === 'fr' ? 'Copié!' : 'Copied!', 'success');
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast(lang === 'fr' ? 'Copié!' : 'Copied!', 'success');
  });
}

function printQuote() {
  const content = document.getElementById('quote-output').innerHTML;
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Soumission MLP</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
      * { margin:0;padding:0;box-sizing:border-box; }
      body { font-family:'Inter',sans-serif;padding:24px;color:#202124;font-size:14px;line-height:1.65; }
      h1 { font-size:22px;font-weight:800;color:#c8a45a;margin-bottom:2px; }
      h2 { font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#202124;margin-top:24px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #c8a45a; }
      table { width:100%;border-collapse:collapse;margin:8px 0; }
      th { background:#f8f9fa;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#5f6368;text-align:left;padding:10px 12px;border-bottom:2px solid #e8eaed; }
      th.r{text-align:right;} td{padding:10px 12px;border-bottom:1px solid #f1f3f4;font-size:13px;} td.r{text-align:right;}
      .qp-subtitle{font-size:13px;color:#5f6368;}
      .qp-header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:3px solid #c8a45a;margin-bottom:20px;}
      .qp-header-right{text-align:right;font-size:13px;color:#5f6368;} .qp-header-right strong{color:#202124;font-size:15px;}
      .qp-meta{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;}
      .qp-meta-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9aa0a6;}
      .qp-meta-value{font-size:13px;color:#3c4043;}
      .qp-totals{margin-top:16px;border-top:2px solid #e8eaed;padding-top:10px;}
      .qp-total-row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;}
      .qp-grand-total{font-size:18px;font-weight:800;color:#c8a45a;border-top:3px solid #c8a45a;padding-top:10px;margin-top:6px;}
      .qp-section{padding:16px;background:#f8f9fa;border-radius:10px;border-left:4px solid #c8a45a;font-size:13px;color:#3c4043;line-height:1.7;white-space:pre-line;margin-top:8px;}
      .qp-signature{margin-top:44px;display:grid;grid-template-columns:1fr 1fr;gap:32px;}
      .qp-sig-line{border-top:1px solid #dadce0;padding-top:8px;font-size:12px;color:#9aa0a6;}
      .qp-closing{margin-top:28px;text-align:center;font-style:italic;color:#5f6368;font-size:13px;}
      .qp-badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;}
      .qp-badge.included{background:#e6f4ea;color:#1e8e3e;} .qp-badge.excluded{background:#fef7e0;color:#e37400;}
      @media print{body{padding:12px;}}
    </style></head><body>${content}</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 400);
}

// ============================================
// UTILITIES
// ============================================

function val(id) { return document.getElementById(id).value.trim(); }

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function money(n) {
  return parseFloat(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d)) return dateStr;
  if (lang === 'fr') {
    const m = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
    return d.getDate() + ' ' + m[d.getMonth()] + ' ' + d.getFullYear();
  }
  return d.toLocaleDateString('en-CA', { year:'numeric', month:'long', day:'numeric' });
}

function showToast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show';
  setTimeout(() => t.className = 'toast', 3000);
}
