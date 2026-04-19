/* ============================================
   MLP Reno & Design — Quote Builder
   Phase 1 rebuild: multi-option + live draft + signature + Supabase
   ============================================ */

const TOTAL_STEPS = 7;
let currentStep = 1;
let lang = 'fr';

/* Quote state */
let quoteState = {
  project_title: '',
  options: [],             // array of option objects
  activeOptionKey: null,   // which option is shown in step 3 editor
  assumptions: [],
  questions: []
};

let selectedPaymentOption = 'A';

/* AI chat state */
let chatHistory = [];
let chatBusy = false;

/* Signature / persistence */
let contractorPad = null;
let contractorSignatureData = null;
let savedQuote = null;

/* ---------- i18n ---------- */
const I18N = {
  step1_title: { fr: 'Informations du client', en: 'Client Information' },
  step1_sub:   { fr: 'Coordonnées du client pour la soumission', en: 'Client contact details for the quote' },
  step2_title: { fr: 'Détails du projet', en: 'Project Details' },
  step2_sub:   { fr: 'Discutez avec l\'IA comme avec ChatGPT. Le brouillon de soumission se met à jour en direct.', en: 'Chat with the AI just like ChatGPT. The quote draft updates live.' },
  step3_title: { fr: 'Options et postes', en: 'Options & line items' },
  step3_sub:   { fr: 'Ajustez les matériaux, les postes et les prix de chaque option.', en: 'Adjust materials, line items, and pricing for each option.' },
  step4_title: { fr: 'Modalités de paiement', en: 'Payment Terms' },
  step4_sub:   { fr: 'Échéancier des paiements', en: 'Payment schedule' },
  step5_title: { fr: 'Méthodes de paiement et notes', en: 'Payment methods & notes' },
  step5_sub:   { fr: 'Informations de paiement et conditions', en: 'Payment info and conditions' },
  step6_title: { fr: 'Votre signature', en: 'Your signature' },
  step6_sub:   { fr: 'Signez la soumission. Elle sera appliquée automatiquement sur toutes les options.', en: 'Sign the quote. It applies automatically to every option.' },
  step7_title: { fr: 'Envoyer au client', en: 'Send to client' },
  step7_sub:   { fr: 'Vérifiez, enregistrez et envoyez le lien au client.', en: 'Review, save, and send the link to the client.' },

  client_name: { fr: 'Nom du client', en: 'Client Name' },
  client_address: { fr: 'Adresse du projet', en: 'Project Address' },
  client_email: { fr: 'Courriel', en: 'Email' },
  client_phone: { fr: 'Téléphone', en: 'Phone' },
  quote_date: { fr: 'Date de la soumission', en: 'Quote Date' },
  previous: { fr: 'Précédent', en: 'Previous' },
  next: { fr: 'Suivant', en: 'Next' },
  copy: { fr: 'Copier', en: 'Copy' },
  print_pdf: { fr: 'Imprimer / PDF', en: 'Print / PDF' },
  qty: { fr: 'Qté', en: 'Qty' },
  unit_price: { fr: 'Prix unit.', en: 'Unit $' },
  total_label: { fr: 'Total', en: 'Total' },
  mat_included: { fr: 'Matériaux inclus', en: 'Materials included' },
  add_item: { fr: 'Ajouter un poste', en: 'Add line item' },
  add_option: { fr: 'Ajouter une option', en: 'Add an option' },
  payment_methods: { fr: 'Méthodes de paiement', en: 'Payment methods' },
  notes_label: { fr: 'Notes importantes', en: 'Important notes' },
  chat_empty: { fr: 'Décrivez votre projet. Exemple : « rénover la cuisine, donne-moi 3 options : basique, standard, premium »', en: 'Describe the project. E.g. "renovate the kitchen — give me 3 options: basic, standard, premium"' },
  chat_placeholder: { fr: 'Écrivez à l\'IA…', en: 'Write to the AI…' },
  thinking: { fr: 'L\'IA réfléchit…', en: 'AI is thinking…' },
  draft_title: { fr: 'Brouillon en direct', en: 'Live draft' },
  draft_questions: { fr: 'L\'IA vous demande', en: 'The AI is asking' },
  draft_accept: { fr: 'Accepter et continuer', en: 'Accept & continue' },
  draft_weeks: { fr: 'semaines', en: 'weeks' },
  draft_mat_included: { fr: 'Matériaux inclus', en: 'Materials included' },
  draft_mat_excluded: { fr: 'Matériaux exclus', en: 'Materials excluded' },
  contractor_sig: { fr: 'Signature — MLP Reno & Design', en: 'Signature — MLP Reno & Design' },
  sign_here: { fr: 'Signez ici', en: 'Sign here' },
  clear: { fr: 'Effacer', en: 'Clear' },
  save_default_sig: { fr: 'Utiliser par défaut sur toutes les soumissions', en: 'Use as default on every quote' },
  sig_saved: { fr: 'Enregistrée', en: 'Saved' },
  save_and_send: { fr: 'Enregistrer et générer le lien client', en: 'Save & generate client link' },
  share_title: { fr: 'Lien à envoyer au client', en: 'Link to send to the client' },
  share_hint: { fr: 'Copiez ce lien ou utilisez les boutons ci-dessus. Le client pourra choisir une option et signer. Vous serez notifié dans le tableau des soumissions une fois signée.', en: 'Copy this link or use the buttons above. The client can choose an option and sign. You\'ll see it in the quotes dashboard once signed.' },
  send_email: { fr: 'Envoyer par courriel', en: 'Send by email' },
  send_sms:   { fr: 'Envoyer par SMS', en: 'Send by SMS' },
  quote_ref: { fr: 'Numéro', en: 'Quote #' },
  ctx_empty: { fr: 'Remplissez les informations du client à l\'étape 1 pour personnaliser les suggestions de l\'IA.', en: 'Fill in the client information in step 1 so the AI can personalize suggestions.' },
  ctx_prefix: { fr: 'Soumission pour', en: 'Quote for' },
  signature_required: { fr: 'Veuillez signer avant d\'envoyer.', en: 'Please sign before sending.' },
  client_name_required: { fr: 'Le nom du client est requis.', en: 'Client name is required.' },
  link_copied: { fr: 'Lien copié !', en: 'Link copied!' },
  saving: { fr: 'Enregistrement…', en: 'Saving…' },
  saved: { fr: 'Enregistré !', en: 'Saved!' },
  no_options_yet: { fr: 'Discutez avec l\'IA à l\'étape précédente pour générer les options.', en: 'Chat with the AI in the previous step to generate options.' },
  option_title_label: { fr: 'Titre de l\'option', en: 'Option title' },
  duration_weeks: { fr: 'Durée (semaines)', en: 'Duration (weeks)' },
  materials_default: { fr: 'Matériaux inclus ?', en: 'Materials included?' },
  yes: { fr: 'Oui', en: 'Yes' },
  no: { fr: 'Non', en: 'No' },
  materials_budget: { fr: 'Budget matériaux ($)', en: 'Materials budget ($)' },
  scope_label: { fr: 'Portée des travaux', en: 'Scope of work' },
  subtotal: { fr: 'Sous-total', en: 'Subtotal' },
  total_with_tax: { fr: 'Total avec taxes', en: 'Total with taxes' },
  signed_badge: { fr: 'Signée', en: 'Signed' }
};

const PAYMENT_OPTIONS_DATA = [
  { key: 'A',
    fr: { title: 'Option A', desc: '10% dépôt\n40% avant le début des travaux\n40% mi-parcours\n10% à la fin des travaux' },
    en: { title: 'Option A', desc: '10% deposit\n40% before work begins\n40% mid-project\n10% upon completion' } },
  { key: 'B',
    fr: { title: 'Option B', desc: '20% dépôt\n30% avant le début des travaux\n40% mi-parcours\n10% à la fin des travaux' },
    en: { title: 'Option B', desc: '20% deposit\n30% before work begins\n40% mid-project\n10% upon completion' } },
  { key: 'C',
    fr: { title: 'Option C', desc: '20% dépôt\n40% avant le début des travaux\n30% mi-parcours\n10% à la fin des travaux' },
    en: { title: 'Option C', desc: '20% deposit\n40% before work begins\n30% mid-project\n10% upon completion' } }
];

const PAYMENT_METHODS = {
  fr: `Virement Interac :\npayment@mlpexperience.com\n\nChèque :\nMLP Gestion et Consultation Inc.\n\nNote : Les paiements par chèque peuvent prendre 5 à 7 jours ouvrables avant réception. Les dates de début et la planification sont confirmées seulement après réception du paiement.`,
  en: `Interac e-Transfer:\npayment@mlpexperience.com\n\nCheque:\nMLP Gestion et Consultation Inc.\n\nNote: Cheque payments may take 5–7 business days to clear. Project scheduling starts only after payment is received.`
};

const DEFAULT_NOTES = {
  fr: `• Le budget peut varier de 5% à 15% selon les imprévus\n• Les délais de livraison des matériaux peuvent varier\n• Tout travail non inclus dans cette soumission sera considéré comme un extra\n• Les délais sont estimés en jours ouvrables\n• Les taxes sont en sus`,
  en: `• Budget may vary 5%–15% due to unforeseen circumstances\n• Material delivery delays are possible\n• Work not included in this quote will be considered an extra\n• Timeline is estimated in business days\n• Taxes are extra`
};

/* ============================================
   INIT
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('f-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('f-payment-methods').value = PAYMENT_METHODS[lang];
  document.getElementById('f-notes').value = DEFAULT_NOTES[lang];
  buildPaymentOptionsUI();
  goToStep(1);

  // Chat: Enter to send, Shift+Enter for newline
  const chatInput = document.getElementById('chat-input');
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });

  // Restore default signature if any
  const savedSig = localStorage.getItem('mlp_default_signature');
  if (savedSig) contractorSignatureData = savedSig;

  // Save-as-default toggle
  const defaultCheck = document.getElementById('sig-default-check');
  defaultCheck?.addEventListener('change', () => {
    if (defaultCheck.checked && contractorSignatureData) {
      localStorage.setItem('mlp_default_signature', contractorSignatureData);
      showToast(lang === 'fr' ? 'Signature enregistrée par défaut.' : 'Signature saved as default.');
    }
  });

  // Update client context banner whenever a client field changes
  ['f-client-name', 'f-client-address', 'f-client-email', 'f-client-phone'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderClientContext);
  });
});

/* ============================================
   LANGUAGE
   ============================================ */
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
  buildPaymentOptionsUI();
  renderDraftPreview();
  if (currentStep === 3) renderOptionsEditor();
  if (currentStep === 7) renderFinalQuote();
}

function applyI18N() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (I18N[key] && I18N[key][lang]) el.textContent = I18N[key][lang];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (I18N[key] && I18N[key][lang]) el.setAttribute('placeholder', I18N[key][lang]);
  });
  updateProgress();
}

function t(key) { return I18N[key] ? (I18N[key][lang] || key) : key; }

/* ============================================
   PROGRESS + NAV
   ============================================ */
function updateProgress() {
  const pct = Math.round((currentStep / TOTAL_STEPS) * 100);
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-pct').textContent = pct + '%';
  document.getElementById('progress-label').textContent =
    (lang === 'fr' ? 'Étape' : 'Step') + ' ' + currentStep + ' / ' + TOTAL_STEPS;
}

function goToStep(n) {
  if (n < 1 || n > TOTAL_STEPS) return;
  currentStep = n;

  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById('step-' + n).classList.add('active');

  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  btnPrev.style.display = n === 1 ? 'none' : '';
  btnNext.style.display = n === TOTAL_STEPS ? 'none' : '';

  updateProgress();
  applyI18N();

  if (n === 2) { renderClientContext(); renderChat(); }
  if (n === 3) renderOptionsEditor();
  if (n === 6) initContractorSignaturePad();
  if (n === 7) renderFinalQuote();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function nextStep() { if (currentStep < TOTAL_STEPS) goToStep(currentStep + 1); }
function prevStep() { if (currentStep > 1) goToStep(currentStep - 1); }

/* ============================================
   CLIENT CONTEXT BANNER
   ============================================ */
function renderClientContext() {
  const box = document.getElementById('client-ctx');
  if (!box) return;
  const name = val('f-client-name');
  const addr = val('f-client-address');
  if (!name && !addr) {
    box.className = 'client-ctx empty';
    box.innerHTML = `<span class="material-icons-round">info</span><div class="client-ctx-body">${t('ctx_empty')}</div>`;
    return;
  }
  box.className = 'client-ctx';
  let line = `<strong>${t('ctx_prefix')} :</strong> ${esc(name || '—')}`;
  if (addr) line += ` · ${esc(addr)}`;
  box.innerHTML = `<span class="material-icons-round">person</span><div class="client-ctx-body">${line}</div>`;
}

/* ============================================
   AI CHAT
   ============================================ */
function renderChat() {
  const box = document.getElementById('chat-messages');
  const empty = document.getElementById('chat-empty');
  [...box.querySelectorAll('.chat-bubble, .chat-typing')].forEach(n => n.remove());

  if (chatHistory.length === 0) { empty.style.display = ''; }
  else empty.style.display = 'none';

  chatHistory.forEach(m => {
    if (m.role === 'system') return;
    const div = document.createElement('div');
    div.className = 'chat-bubble ' + (m.role === 'user' ? 'user' : 'assistant');
    div.textContent = m.displayText !== undefined ? m.displayText : m.content;
    box.appendChild(div);
  });

  if (chatBusy) {
    const typing = document.createElement('div');
    typing.className = 'chat-bubble assistant chat-typing';
    typing.innerHTML = `<span class="spinner-ring" style="margin-right:8px;"></span>${t('thinking')}`;
    box.appendChild(typing);
  }

  box.scrollTop = box.scrollHeight;
}

async function sendChatMessage() {
  if (chatBusy) return;
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  chatHistory.push({ role: 'user', content: text });
  input.value = '';
  chatBusy = true;
  renderChat();

  const context = {
    clientName: val('f-client-name'),
    clientAddress: val('f-client-address'),
    clientEmail: val('f-client-email'),
    clientPhone: val('f-client-phone'),
    quoteDate: val('f-date')
  };

  try {
    const { message, draft } = await callGPTChatWithDraft(chatHistory, context);
    chatHistory.push({
      role: 'assistant',
      content: JSON.stringify({ message, draft }),
      displayText: message
    });

    console.log('[draft from GPT]', draft);
    if (draft.options.length) {
      quoteState.project_title = draft.project_title || quoteState.project_title;
      quoteState.options = draft.options;
      quoteState.activeOptionKey = quoteState.activeOptionKey || draft.options[0]?.key;
      quoteState.assumptions = draft.assumptions;
      quoteState.questions = draft.questions;
    } else {
      // Surface this visibly instead of silently ignoring — tells us GPT is misbehaving
      chatHistory.push({
        role: 'assistant',
        content: 'system-warning',
        displayText: (lang === 'fr'
          ? '⚠️ L\'IA n\'a pas retourné d\'options. Reformulez votre demande ou ajoutez plus de détails.'
          : '⚠️ The AI did not return any options. Rephrase your request or add more details.')
      });
    }
  } catch (err) {
    console.error('[sendChatMessage error]', err);
    chatHistory.push({
      role: 'assistant',
      content: 'error',
      displayText: (lang === 'fr' ? 'Erreur : ' : 'Error: ') + err.message
    });
  } finally {
    chatBusy = false;
    renderChat();
    renderDraftPreview();
  }
}

function renderDraftPreview() {
  const wrap = document.getElementById('draft-preview');
  if (!wrap) return;
  if (!quoteState.options.length) { wrap.style.display = 'none'; return; }

  const fr = lang === 'fr';
  let h = '<div class="draft-box">';
  h += `<div class="draft-title">${t('draft_title')}</div>`;
  if (quoteState.project_title) {
    h += `<div class="draft-project-title">${esc(quoteState.project_title)}</div>`;
  }

  quoteState.options.forEach(opt => {
    const total = optionSubtotal(opt);
    h += '<div class="option-card-preview">';
    h += '<div class="option-card-preview-header">';
    h += `<div class="option-card-preview-title">${esc(opt.title || opt.key)}</div>`;
    h += `<div class="option-card-preview-total">$${money(total)}</div>`;
    h += '</div>';
    if (opt.scope_summary) h += `<div class="option-card-preview-scope">${esc(opt.scope_summary)}</div>`;
    h += '<div class="option-card-preview-meta">';
    h += `<span><strong>${t('duration_weeks')}:</strong> ${opt.duration_weeks} ${t('draft_weeks')}</span>`;
    h += `<span>${opt.materials_included ? t('draft_mat_included') : t('draft_mat_excluded')}</span>`;
    h += `<span><strong>${fr ? 'Postes' : 'Items'}:</strong> ${opt.line_items.length}</span>`;
    h += '</div>';
    h += '</div>';
  });

  if (quoteState.questions.length) {
    h += `<div class="draft-questions"><div class="draft-questions-title">${t('draft_questions')}</div><ul>`;
    quoteState.questions.forEach(q => { h += `<li>${esc(q)}</li>`; });
    h += '</ul></div>';
  }

  h += `<button class="btn btn-primary draft-accept" onclick="acceptDraftAndContinue()"><span class="material-icons-round">check</span><span>${t('draft_accept')}</span></button>`;
  h += '</div>';

  wrap.innerHTML = h;
  wrap.style.display = '';
}

function acceptDraftAndContinue() {
  if (!quoteState.options.length) return;
  if (!quoteState.activeOptionKey) quoteState.activeOptionKey = quoteState.options[0].key;
  nextStep();
}

/* ============================================
   STEP 3 — OPTIONS EDITOR
   ============================================ */
function renderOptionsEditor() {
  const tabs = document.getElementById('options-tabs');
  const editor = document.getElementById('option-editor');
  tabs.innerHTML = '';
  editor.innerHTML = '';

  if (!quoteState.options.length) {
    editor.innerHTML = `<div class="info-banner"><span class="material-icons-round">info</span><p>${t('no_options_yet')}</p></div>`;
    return;
  }

  if (!quoteState.activeOptionKey || !quoteState.options.find(o => o.key === quoteState.activeOptionKey)) {
    quoteState.activeOptionKey = quoteState.options[0].key;
  }

  quoteState.options.forEach(opt => {
    const tab = document.createElement('button');
    tab.className = 'options-tab' + (opt.key === quoteState.activeOptionKey ? ' active' : '');
    const total = optionSubtotal(opt);
    tab.innerHTML = `${esc(opt.title || opt.key)} · $${money(total)}${quoteState.options.length > 1 ? `<span class="close material-icons-round" onclick="event.stopPropagation(); removeOption('${opt.key}')">close</span>` : ''}`;
    tab.onclick = () => { quoteState.activeOptionKey = opt.key; renderOptionsEditor(); };
    tabs.appendChild(tab);
  });

  const opt = quoteState.options.find(o => o.key === quoteState.activeOptionKey);
  editor.innerHTML = buildOptionEditor(opt);
}

function buildOptionEditor(opt) {
  const fr = lang === 'fr';
  let h = '<div class="option-editor-box">';

  // Head: title + duration
  h += '<div class="option-editor-head">';
  h += `<div class="form-group" style="margin:0;"><label class="form-label">${t('option_title_label')}</label><input class="form-input" type="text" value="${esc(opt.title)}" oninput="updateOptionField('${opt.key}','title',this.value)"></div>`;
  h += `<div class="form-group" style="margin:0;"><label class="form-label">${t('duration_weeks')}</label><input class="form-input" type="number" min="1" value="${opt.duration_weeks}" onchange="updateOptionField('${opt.key}','duration_weeks',this.value)"></div>`;
  h += '</div>';

  // Scope
  h += `<div class="form-group"><label class="form-label">${t('scope_label')}</label><textarea class="form-textarea" rows="3" oninput="updateOptionField('${opt.key}','scope_summary',this.value)">${esc(opt.scope_summary)}</textarea></div>`;

  // Materials toggle + budget
  h += `<div class="form-group"><label class="form-label">${t('materials_default')}</label>`;
  h += `<div class="chip-group"><button class="chip ${opt.materials_included ? 'active' : ''}" onclick="setOptionMaterials('${opt.key}', true)">${t('yes')}</button><button class="chip ${!opt.materials_included ? 'active' : ''}" onclick="setOptionMaterials('${opt.key}', false)">${t('no')}</button></div>`;
  if (opt.materials_included) {
    h += `<div style="margin-top:10px;"><label class="form-label">${t('materials_budget')}</label><input class="form-input" type="number" min="0" step="100" value="${opt.materials_budget || ''}" oninput="updateOptionField('${opt.key}','materials_budget',this.value)"></div>`;
  }
  h += '</div>';

  // Line items
  opt.line_items.forEach((item, i) => {
    const lineTotal = item.quantity * item.unit_price;
    h += `<div class="line-item">
      <div class="line-item-header">
        <textarea class="line-item-desc" rows="2" oninput="updateItemField('${opt.key}',${i},'description',this.value)">${esc(item.description)}</textarea>
        <button class="li-remove" onclick="removeItem('${opt.key}',${i})"><span class="material-icons-round">close</span></button>
      </div>
      <div class="line-item-fields">
        <div class="li-field"><label>${t('qty')}</label><input type="number" min="1" value="${item.quantity}" onchange="updateItemField('${opt.key}',${i},'quantity',this.value)"></div>
        <div class="li-field"><label>${t('unit_price')}</label><input type="number" min="0" step="50" value="${item.unit_price}" onchange="updateItemField('${opt.key}',${i},'unit_price',this.value)"></div>
        <div class="li-field"><label>${t('total_label')}</label><input type="text" value="$${money(lineTotal)}" readonly style="background:transparent;border-color:transparent;font-weight:600;color:var(--accent-dark);"></div>
      </div>
      <div class="line-item-footer">
        <label class="li-material-toggle"><input type="checkbox" ${item.materialsIncluded ? 'checked' : ''} onchange="updateItemField('${opt.key}',${i},'materialsIncluded',this.checked)"><span>${t('mat_included')}</span></label>
        <div class="li-total">$${money(lineTotal)}</div>
      </div>
    </div>`;
  });

  h += `<button class="btn-add" onclick="addItem('${opt.key}')">+ <span>${t('add_item')}</span></button>`;

  // Tax box for this option
  const subtotal = optionSubtotal(opt);
  const gst = round2(subtotal * 0.05);
  const qst = round2(subtotal * 0.09975);
  const total = round2(subtotal + gst + qst);
  h += '<div class="tax-box">';
  h += `<div class="tax-row"><span>${t('subtotal')}</span><span>$${money(subtotal)}</span></div>`;
  h += `<div class="tax-row"><span>TPS 5%</span><span>$${money(gst)}</span></div>`;
  h += `<div class="tax-row"><span>TVQ 9.975%</span><span>$${money(qst)}</span></div>`;
  h += `<div class="tax-row total"><span>${t('total_with_tax')}</span><span>$${money(total)}</span></div>`;
  h += '</div>';

  h += '</div>';
  return h;
}

function updateOptionField(key, field, value) {
  const opt = quoteState.options.find(o => o.key === key);
  if (!opt) return;
  if (field === 'duration_weeks') opt[field] = Math.max(1, parseInt(value) || 1);
  else if (field === 'materials_budget') opt[field] = Math.max(0, parseFloat(value) || 0);
  else opt[field] = value;
  renderOptionsEditor();
}

function setOptionMaterials(key, included) {
  const opt = quoteState.options.find(o => o.key === key);
  if (!opt) return;
  opt.materials_included = included;
  opt.line_items.forEach(i => { i.materialsIncluded = included; });
  renderOptionsEditor();
}

function updateItemField(key, idx, field, value) {
  const opt = quoteState.options.find(o => o.key === key);
  if (!opt || !opt.line_items[idx]) return;
  if (field === 'quantity') opt.line_items[idx][field] = Math.max(1, parseInt(value) || 1);
  else if (field === 'unit_price') opt.line_items[idx][field] = Math.max(0, parseFloat(value) || 0);
  else if (field === 'materialsIncluded') opt.line_items[idx][field] = !!value;
  else opt.line_items[idx][field] = value;
  renderOptionsEditor();
}

function addItem(key) {
  const opt = quoteState.options.find(o => o.key === key);
  if (!opt) return;
  opt.line_items.push({
    description: lang === 'fr' ? 'Nouveau poste' : 'New item',
    quantity: 1,
    unit_price: 0,
    materialsIncluded: opt.materials_included
  });
  renderOptionsEditor();
}

function removeItem(key, idx) {
  const opt = quoteState.options.find(o => o.key === key);
  if (!opt) return;
  opt.line_items.splice(idx, 1);
  renderOptionsEditor();
}

function addOption() {
  const usedKeys = new Set(quoteState.options.map(o => o.key));
  let key;
  for (let code = 65; code <= 90; code++) {
    const k = String.fromCharCode(code);
    if (!usedKeys.has(k)) { key = k; break; }
  }
  if (!key) return;
  quoteState.options.push({
    key,
    title: (lang === 'fr' ? 'Option ' : 'Option ') + key,
    scope_summary: '',
    duration_weeks: 2,
    materials_included: true,
    materials_budget: 0,
    line_items: []
  });
  quoteState.activeOptionKey = key;
  renderOptionsEditor();
}

function removeOption(key) {
  if (quoteState.options.length <= 1) return;
  quoteState.options = quoteState.options.filter(o => o.key !== key);
  if (quoteState.activeOptionKey === key) quoteState.activeOptionKey = quoteState.options[0].key;
  renderOptionsEditor();
}

function optionSubtotal(opt) {
  return opt.line_items.reduce((s, i) => s + (i.quantity * i.unit_price), 0);
}

function optionTotals(opt) {
  const subtotal = optionSubtotal(opt);
  const gst = round2(subtotal * 0.05);
  const qst = round2(subtotal * 0.09975);
  return { subtotal, gst, qst, total: round2(subtotal + gst + qst) };
}

/* ============================================
   PAYMENT OPTIONS UI
   ============================================ */
function buildPaymentOptionsUI() {
  const container = document.getElementById('payment-options-container');
  container.innerHTML = '';
  PAYMENT_OPTIONS_DATA.forEach(opt => {
    const div = document.createElement('div');
    div.className = 'option-card' + (selectedPaymentOption === opt.key ? ' selected' : '');
    div.onclick = () => { selectedPaymentOption = opt.key; buildPaymentOptionsUI(); };
    div.innerHTML = `
      <div class="option-radio"></div>
      <div class="option-body">
        <div class="option-title">${opt[lang].title}</div>
        <div class="option-desc">${opt[lang].desc.replace(/\n/g, '<br>')}</div>
      </div>`;
    container.appendChild(div);
  });
}

/* ============================================
   STEP 6 — CONTRACTOR SIGNATURE
   ============================================ */
function initContractorSignaturePad() {
  const canvas = document.getElementById('contractor-sig-canvas');
  if (contractorPad) contractorPad.destroy();
  contractorPad = new SignaturePad(canvas, {
    onStart: () => {
      document.getElementById('contractor-sig-placeholder').style.display = 'none';
    },
    onEnd: (dataUrl) => {
      contractorSignatureData = dataUrl;
      document.getElementById('contractor-sig-status').style.display = '';
      if (document.getElementById('sig-default-check').checked) {
        localStorage.setItem('mlp_default_signature', dataUrl);
      }
    }
  });
  if (contractorSignatureData) {
    setTimeout(() => contractorPad.fromDataURL(contractorSignatureData), 50);
    document.getElementById('contractor-sig-placeholder').style.display = 'none';
    document.getElementById('contractor-sig-status').style.display = '';
  }
}

function clearContractorSignature() {
  if (contractorPad) contractorPad.clear();
  contractorSignatureData = null;
  document.getElementById('contractor-sig-placeholder').style.display = '';
  document.getElementById('contractor-sig-status').style.display = 'none';
}

/* ============================================
   STEP 7 — FINAL QUOTE + SAVE/SEND
   ============================================ */
function renderFinalQuote() {
  const name = val('f-client-name') || '[—]';
  const address = val('f-client-address') || '[—]';
  const email = val('f-client-email');
  const phone = val('f-client-phone');
  const date = val('f-date');
  const methods = val('f-payment-methods');
  const notes = val('f-notes');

  const num = savedQuote?.quote_number || generateQuoteNumber();
  const fr = lang === 'fr';
  const payOpt = PAYMENT_OPTIONS_DATA.find(o => o.key === selectedPaymentOption);

  let h = '<div class="quote-preview">';
  h += '<div class="qp-header"><div>';
  h += '<h1>MLP Reno &amp; Design</h1>';
  h += '<div class="qp-subtitle">Construction &amp; Rénovation</div>';
  h += `<div class="qp-subtitle">${fr ? 'Licence RBQ' : 'RBQ Licence'}: 5847-0378-01</div>`;
  h += `<div class="qp-subtitle">${fr ? 'Assurance responsabilité civile : 5 000 000 $' : 'Liability Insurance: $5,000,000'}</div>`;
  h += '</div><div class="qp-header-right">';
  h += `<strong>${fr ? 'SOUMISSION' : 'QUOTE'}</strong><br>${esc(num)}<br>${formatDate(date)}`;
  h += '</div></div>';

  h += '<div class="qp-meta"><div>';
  h += `<div class="qp-meta-label">Client</div>`;
  h += `<div class="qp-meta-value">${esc(name)}</div>`;
  if (email) h += `<div class="qp-meta-value">${esc(email)}</div>`;
  if (phone) h += `<div class="qp-meta-value">${esc(phone)}</div>`;
  h += '</div><div>';
  h += `<div class="qp-meta-label">${fr ? 'Adresse du projet' : 'Project Address'}</div>`;
  h += `<div class="qp-meta-value">${esc(address)}</div>`;
  h += '</div></div>';

  if (quoteState.project_title) {
    h += `<h2>${fr ? 'Projet' : 'Project'}</h2>`;
    h += `<div style="margin-bottom:8px;"><strong>${esc(quoteState.project_title)}</strong></div>`;
  }

  if (quoteState.options.length) {
    const multi = quoteState.options.length > 1;
    h += `<h2>${multi ? (fr ? 'Options proposées' : 'Proposed options') : (fr ? 'Détail de la soumission' : 'Quote details')}</h2>`;
    if (multi) {
      h += `<div style="font-size:12px;color:#5f6368;margin-bottom:12px;">${fr ? 'Le client sélectionnera une option lors de la signature.' : 'The customer will select one option at signature.'}</div>`;
    }

    quoteState.options.forEach(opt => {
      const tot = optionTotals(opt);
      const accepted = savedQuote?.accepted_option_key === opt.key;
      h += `<div class="qp-option-block${accepted ? ' accepted' : ''}">`;
      h += '<div class="qp-option-head">';
      h += `<div class="qp-option-title">${esc(opt.title || opt.key)}${accepted ? ' ✓ ' + t('signed_badge') : ''}</div>`;
      h += `<div class="qp-option-total">$${money(tot.total)}</div>`;
      h += '</div>';
      if (opt.scope_summary) {
        h += `<div style="font-size:13px;color:#3c4043;white-space:pre-line;margin-bottom:10px;">${esc(opt.scope_summary)}</div>`;
      }
      h += `<div style="font-size:12px;color:#5f6368;margin-bottom:8px;">`;
      h += `<strong>${fr ? 'Durée' : 'Duration'}:</strong> ${opt.duration_weeks} ${fr ? 'semaines' : 'weeks'} · `;
      h += `${opt.materials_included ? `<span class="qp-badge included">${fr ? 'Matériaux inclus' : 'Materials included'}</span>` : `<span class="qp-badge excluded">${fr ? 'Matériaux exclus' : 'Materials excluded'}</span>`}`;
      if (opt.materials_included && opt.materials_budget > 0) {
        h += ` · Budget: $${money(opt.materials_budget)}`;
      }
      h += '</div>';

      if (opt.line_items.length) {
        h += '<table><thead><tr>';
        h += `<th>Description</th><th class="r">${fr ? 'Qté' : 'Qty'}</th><th class="r">${fr ? 'Prix' : 'Price'}</th><th class="r">Total</th>`;
        h += '</tr></thead><tbody>';
        opt.line_items.forEach(it => {
          const lt = it.quantity * it.unit_price;
          h += `<tr><td>${esc(it.description)}</td><td class="r">${it.quantity}</td><td class="r">$${money(it.unit_price)}</td><td class="r">$${money(lt)}</td></tr>`;
        });
        h += '</tbody></table>';
      }

      h += '<div class="qp-totals">';
      h += `<div class="qp-total-row"><span>${fr ? 'Sous-total' : 'Subtotal'}</span><span>$${money(tot.subtotal)}</span></div>`;
      h += `<div class="qp-total-row"><span>TPS 5%</span><span>$${money(tot.gst)}</span></div>`;
      h += `<div class="qp-total-row"><span>TVQ 9.975%</span><span>$${money(tot.qst)}</span></div>`;
      h += `<div class="qp-total-row qp-grand-total"><span>${fr ? 'Total avec taxes' : 'Total with taxes'}</span><span>$${money(tot.total)}</span></div>`;
      h += '</div>';

      h += '</div>';
    });
  }

  h += `<h2>${fr ? 'Modalités de paiement' : 'Payment Terms'}</h2>`;
  h += `<div class="qp-section">${payOpt[lang].desc}</div>`;

  if (methods) {
    h += `<h2>${fr ? 'Méthodes de paiement' : 'Payment Methods'}</h2>`;
    h += `<div class="qp-section">${esc(methods)}</div>`;
  }

  if (notes) {
    h += `<h2>${fr ? 'Notes importantes' : 'Important Notes'}</h2>`;
    h += `<div class="qp-section">${esc(notes)}</div>`;
  }

  h += '<div class="qp-signature">';
  h += '<div>';
  if (contractorSignatureData) h += `<img src="${contractorSignatureData}" style="max-height:60px;margin-bottom:4px;">`;
  h += `<div class="qp-sig-line">${fr ? 'Signature — MLP Reno & Design' : 'Signature — MLP Reno & Design'}</div>`;
  h += '</div><div>';
  if (savedQuote?.customer_signature) {
    h += `<img src="${savedQuote.customer_signature}" style="max-height:60px;margin-bottom:4px;">`;
    h += `<div style="font-size:12px;color:#3c4043;">${esc(savedQuote.customer_signer_name || '')}</div>`;
  }
  h += `<div class="qp-sig-line">${fr ? 'Signature — Client' : 'Signature — Client'}</div>`;
  h += '</div></div>';

  h += `<div class="qp-closing">${fr ? 'Merci de votre confiance. N\'hésitez pas à nous contacter pour toute question.' : 'Thank you for your trust. Do not hesitate to contact us with any questions.'}</div>`;
  h += '</div>';

  document.getElementById('quote-output').innerHTML = h;
}

async function saveAndSendForSignature() {
  const clientName = val('f-client-name');
  if (!clientName) { showToast(t('client_name_required'), 'error'); goToStep(1); return; }
  if (!contractorSignatureData) { showToast(t('signature_required'), 'error'); goToStep(6); return; }
  if (!quoteState.options.length) {
    showToast(lang === 'fr' ? 'Aucune option. Retournez à l\'étape 2.' : 'No options yet. Go back to step 2.', 'error');
    goToStep(2);
    return;
  }

  const btn = document.getElementById('btn-save-send');
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner-ring"></span><span>${t('saving')}</span>`;

  try {
    let customerId = null;
    try {
      customerId = await upsertCustomer({
        name: clientName,
        email: val('f-client-email'),
        phone: val('f-client-phone'),
        address: val('f-client-address')
      });
    } catch (err) { console.warn('upsertCustomer failed', err); }

    // Enrich options with totals
    const optionsWithTotals = quoteState.options.map(opt => {
      const tot = optionTotals(opt);
      return { ...opt, ...tot };
    });

    const quoteNumber = savedQuote?.quote_number || generateQuoteNumber();
    const record = {
      id: savedQuote?.id,
      customer_id: customerId,
      quote_number: quoteNumber,
      status: 'sent',
      language: lang,
      client_name: clientName,
      client_email: val('f-client-email') || null,
      client_phone: val('f-client-phone') || null,
      client_address: val('f-client-address') || null,
      quote_date: val('f-date') || null,
      project_title: quoteState.project_title || null,
      duration_weeks: optionsWithTotals[0]?.duration_weeks || null,
      ai_conversation: chatHistory,
      options: optionsWithTotals,
      payment_option: selectedPaymentOption,
      payment_methods: val('f-payment-methods') || null,
      notes: val('f-notes') || null,
      contractor_signature: contractorSignatureData,
      contractor_signer_name: CONTRACTOR.name,
      contractor_signed_at: new Date().toISOString(),
      sent_at: new Date().toISOString()
    };

    savedQuote = await saveQuote(record);

    const link = buildShareLink(savedQuote.share_token);
    document.getElementById('share-link-input').value = link;
    document.getElementById('share-box').style.display = '';

    // Prefill mailto/sms links
    const clientEmail = val('f-client-email');
    const clientPhone = val('f-client-phone');
    const subject = encodeURIComponent((lang === 'fr' ? 'Votre soumission MLP Reno & Design — ' : 'Your MLP Reno & Design quote — ') + savedQuote.quote_number);
    const body = encodeURIComponent(
      (lang === 'fr'
        ? `Bonjour ${clientName},\n\nVoici votre soumission. Vous pouvez la consulter et la signer en ligne :\n${link}\n\nMerci,\nMLP Reno & Design`
        : `Hi ${clientName},\n\nHere is your quote. You can view and sign it online:\n${link}\n\nThank you,\nMLP Reno & Design`
      )
    );
    const smsBody = encodeURIComponent(
      (lang === 'fr'
        ? `MLP Reno & Design — Votre soumission : ${link}`
        : `MLP Reno & Design — Your quote: ${link}`
      )
    );
    document.getElementById('share-email').href = `mailto:${clientEmail || ''}?subject=${subject}&body=${body}`;
    document.getElementById('share-sms').href   = `sms:${clientPhone || ''}?body=${smsBody}`;

    document.getElementById('quote-status-card').style.display = '';
    document.getElementById('quote-number-display').textContent = savedQuote.quote_number;
    const pill = document.getElementById('quote-status-pill');
    pill.textContent = (lang === 'fr' ? 'Envoyée' : 'Sent');
    pill.className = 'status-pill sent';

    renderFinalQuote();
    showToast(t('saved'));
  } catch (err) {
    console.error(err);
    showToast('Erreur: ' + (err.message || err), 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

function buildShareLink(token) {
  const base = window.location.origin + window.location.pathname.replace(/index\.html$/, '');
  return `${base}sign.html?token=${encodeURIComponent(token)}`;
}

function copyShareLink() {
  const input = document.getElementById('share-link-input');
  input.select();
  navigator.clipboard.writeText(input.value).then(() => showToast(t('link_copied')));
}

/* ============================================
   COPY / PRINT
   ============================================ */
function copyQuote() {
  const el = document.getElementById('quote-output');
  const text = el.innerText || el.textContent;
  navigator.clipboard.writeText(text).then(() => showToast(lang === 'fr' ? 'Copié !' : 'Copied!'));
}

function printQuote() {
  const content = document.getElementById('quote-output').innerHTML;
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Soumission MLP</title>
    <link rel="stylesheet" href="css/tools.css">
    <style>body{background:#fff;padding:24px;}</style></head>
    <body>${content}</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

/* ============================================
   UTILITIES
   ============================================ */
function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
function esc(s) { if (s === null || s === undefined) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function money(n) { return parseFloat(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function round2(n) { return Math.round(n * 100) / 100; }
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
function showToast(msg) {
  const tEl = document.getElementById('toast');
  tEl.textContent = msg;
  tEl.className = 'toast show';
  setTimeout(() => tEl.className = 'toast', 3000);
}
