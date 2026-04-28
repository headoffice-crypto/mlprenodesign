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
let convertBusy = false;

/* Signature / persistence */
let contractorPad = null;
let contractorSignatureData = null;
let savedQuote = null;
let draftSaveInFlight = false;
let lastSavedAt = null;

/* ---------- i18n ---------- */
const I18N = {
  step1_title: { fr: 'Informations du client', en: 'Client Information' },
  step1_sub:   { fr: 'Coordonnées du client pour la soumission', en: 'Client contact details for the quote' },
  step2_title: { fr: 'Détails du projet', en: 'Project Details' },
  step2_sub:   { fr: 'Discutez librement avec l\'IA, comme sur ChatGPT. Quand le scope vous convient, cliquez sur « Convertir en soumission ».', en: 'Chat freely with the AI, just like ChatGPT. When the scope looks right, click "Convert to quote".' },
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
  draft_actions_title: { fr: "Avant d'envoyer pour signature", en: 'Before sending for signature' },
  draft_actions_hint: { fr: 'Téléchargez ou envoyez une copie brouillon (filigrane BROUILLON, sans lien de signature) pour révision interne ou pour prévisualiser avec le client.', en: 'Download or email a draft copy (DRAFT watermark, no signing link) for internal review or to preview with the client.' },
  download_draft: { fr: 'Télécharger brouillon', en: 'Download draft' },
  send_draft: { fr: 'Envoyer brouillon par courriel', en: 'Email draft copy' },
  draft_prompt_email: { fr: 'Adresse courriel pour le brouillon ?', en: 'Email address for the draft?' },
  draft_email_sent: { fr: 'Brouillon envoyé à', en: 'Draft sent to' },
  draft_watermark: { fr: 'BROUILLON — Non contractuel', en: 'DRAFT — Not for signature' },
  preview_as_client: { fr: 'Aperçu côté client', en: 'Preview as client' },
  preview_saving: { fr: 'Enregistrement…', en: 'Saving…' },
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
  convert_to_quote: { fr: 'Convertir en soumission', en: 'Convert to quote' },
  converting: { fr: 'Conversion en cours…', en: 'Converting…' },
  convert_hint: { fr: 'Quand vous êtes satisfait de la conversation, transformez-la en options structurées.', en: 'When you\'re happy with the conversation, turn it into structured options.' },
  reconvert_hint: { fr: 'Vous avez déjà une soumission ci-dessous. Une nouvelle conversion remplacera les options actuelles.', en: 'A draft already exists below. Re-converting will replace the current options.' },
  no_options_extracted: { fr: 'L\'IA n\'a pas réussi à extraire une soumission. Donnez plus de détails (montant, durée, scope) et réessayez.', en: 'The AI could not extract a quote. Provide more detail (amount, duration, scope) and try again.' },
  draft_title: { fr: 'Brouillon de soumission', en: 'Quote draft' },
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
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('f-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('f-payment-methods').value = PAYMENT_METHODS[lang];
  document.getElementById('f-notes').value = DEFAULT_NOTES[lang];
  buildPaymentOptionsUI();

  const params = new URLSearchParams(location.search);
  const draftId = params.get('draft');
  if (draftId) {
    await loadDraftById(draftId);
  } else {
    // Prefill from customer.html "new quote for this customer" link
    const prefill = ['client_name', 'client_email', 'client_phone', 'client_address'];
    prefill.forEach(key => {
      const v = params.get(key);
      if (v) {
        const el = document.getElementById('f-' + key.replace('_', '-'));
        if (el) el.value = v;
      }
    });
    goToStep(1);
    renderClientContext();
  }

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
  if (n === 7) {
    renderFinalQuote();
    (async () => {
      if (!savedQuote?.share_token) await saveDraft();
      ensureShareBoxVisible();
    })();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function nextStep() {
  if (currentStep < TOTAL_STEPS) {
    const leaving = currentStep;
    goToStep(leaving + 1);
    saveDraft();
  }
}
function prevStep() {
  if (currentStep > 1) {
    goToStep(currentStep - 1);
    saveDraft();
  }
}

/* ============================================
   DRAFT AUTO-SAVE + RESUME
   ============================================ */
function buildQuoteRecord(status) {
  const optionsWithTotals = quoteState.options.map(opt => {
    const tot = optionTotals(opt);
    return { ...opt, ...tot };
  });
  const record = {
    id: savedQuote?.id,
    quote_number: savedQuote?.quote_number || generateQuoteNumber(),
    share_token: savedQuote?.share_token,
    status,
    language: lang,
    client_name: val('f-client-name') || null,
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
    contractor_signature: contractorSignatureData || null,
    contractor_signer_name: contractorSignatureData ? CONTRACTOR.name : null,
    contractor_signed_at: contractorSignatureData ? (savedQuote?.contractor_signed_at || new Date().toISOString()) : null
  };
  // drop nulls that Supabase can auto-handle
  return record;
}

async function saveDraft() {
  if (draftSaveInFlight) return;
  const clientName = val('f-client-name');
  if (!clientName) return; // nothing meaningful to save yet

  draftSaveInFlight = true;
  updateDraftStatus('saving');
  try {
    // HARD RULE: a customers row is only created once the customer signs.
    // During the contractor's flow we keep customer_id NULL (or whatever was previously linked).
    const customerId = savedQuote?.customer_id || null;

    const record = buildQuoteRecord(savedQuote?.status && savedQuote.status !== 'draft' ? savedQuote.status : 'draft');
    record.customer_id = customerId;

    const saved = await saveQuote(record);
    savedQuote = saved;
    lastSavedAt = new Date();
    updateDraftStatus('saved');
  } catch (err) {
    console.warn('[saveDraft failed]', err);
    updateDraftStatus('error', err.message);
  } finally {
    draftSaveInFlight = false;
  }
}

function updateDraftStatus(state, msg) {
  const el = document.getElementById('draft-status');
  if (!el) return;
  if (state === 'saving') {
    el.style.display = '';
    el.innerHTML = '<span class="spinner-ring" style="width:12px;height:12px;border-width:2px;margin-right:4px;"></span>' + (lang === 'fr' ? 'Enregistrement…' : 'Saving…');
    el.style.color = 'var(--text-secondary)';
  } else if (state === 'saved') {
    el.style.display = '';
    const time = lastSavedAt ? lastSavedAt.toLocaleTimeString() : '';
    el.innerHTML = '✓ ' + (lang === 'fr' ? `Brouillon enregistré ${time}` : `Draft saved ${time}`);
    el.style.color = 'var(--green)';
  } else if (state === 'error') {
    el.style.display = '';
    el.textContent = '⚠ ' + (msg || 'Save failed');
    el.style.color = 'var(--red)';
  } else {
    el.style.display = 'none';
  }
}

async function loadDraftById(id) {
  try {
    const { data, error } = await sb.from('quotes').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) { showToast(lang === 'fr' ? 'Brouillon introuvable.' : 'Draft not found.', 'error'); goToStep(1); return; }

    savedQuote = data;
    if (data.language && (data.language === 'en' || data.language === 'fr')) lang = data.language;
    document.getElementById('lang-fr').className = lang === 'fr' ? 'active' : '';
    document.getElementById('lang-en').className = lang === 'en' ? 'active' : '';

    document.getElementById('f-client-name').value = data.client_name || '';
    document.getElementById('f-client-email').value = data.client_email || '';
    document.getElementById('f-client-phone').value = data.client_phone || '';
    document.getElementById('f-client-address').value = data.client_address || '';
    document.getElementById('f-date').value = data.quote_date || new Date().toISOString().split('T')[0];

    quoteState.project_title = data.project_title || '';
    quoteState.options = Array.isArray(data.options) ? data.options : [];
    quoteState.activeOptionKey = quoteState.options[0]?.key || null;

    chatHistory = Array.isArray(data.ai_conversation) ? data.ai_conversation : [];
    selectedPaymentOption = data.payment_option || 'A';
    buildPaymentOptionsUI();

    if (data.payment_methods) document.getElementById('f-payment-methods').value = data.payment_methods;
    if (data.notes) document.getElementById('f-notes').value = data.notes;
    if (data.contractor_signature) contractorSignatureData = data.contractor_signature;

    applyI18N();
    showToast(lang === 'fr' ? 'Brouillon chargé.' : 'Draft loaded.');

    // Resume at the most useful step
    const resumeStep = quoteState.options.length ? 3 : 2;
    goToStep(resumeStep);
  } catch (err) {
    console.error('[loadDraftById]', err);
    showToast('Error loading draft: ' + err.message, 'error');
    goToStep(1);
  }
}

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
    const raw = m.displayText !== undefined ? m.displayText : m.content;
    if (m.role === 'assistant' && m.content !== 'error' && m.content !== 'system-warning') {
      div.innerHTML = renderMarkdown(raw);
    } else {
      div.textContent = raw;
    }
    box.appendChild(div);
  });

  if (chatBusy) {
    const typing = document.createElement('div');
    typing.className = 'chat-bubble assistant chat-typing';
    typing.innerHTML = `<span class="spinner-ring" style="margin-right:8px;"></span>${t('thinking')}`;
    box.appendChild(typing);
  }

  box.scrollTop = box.scrollHeight;
  renderConvertButton();
}

// Minimal markdown -> HTML for chat bubbles. Escapes first, then handles
// code spans, bold/italic, simple lists, and paragraph breaks. Intentionally tiny.
function renderMarkdown(src) {
  if (!src) return '';
  let s = String(src);
  s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  s = s.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code}</code></pre>`);
  s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  // bullet lists: turn runs of "- " or "* " lines into <ul><li>...</li></ul>
  s = s.replace(/(?:^|\n)((?:[-*] .+(?:\n|$))+)/g, (_, block) => {
    const items = block.trim().split(/\n/).map(l => l.replace(/^[-*]\s+/, '')).map(li => `<li>${li}</li>`).join('');
    return `\n<ul>${items}</ul>`;
  });
  // numbered lists
  s = s.replace(/(?:^|\n)((?:\d+\. .+(?:\n|$))+)/g, (_, block) => {
    const items = block.trim().split(/\n/).map(l => l.replace(/^\d+\.\s+/, '')).map(li => `<li>${li}</li>`).join('');
    return `\n<ol>${items}</ol>`;
  });
  // paragraphs from blank-line separation; single newlines become <br>
  const parts = s.split(/\n{2,}/).map(p => {
    if (/^\s*<(ul|ol|pre)/.test(p)) return p;
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  });
  return parts.join('');
}

function renderConvertButton() {
  const wrap = document.getElementById('convert-to-quote-wrap');
  if (!wrap) return;

  const userMsgs = chatHistory.filter(m => m.role === 'user').length;
  if (userMsgs === 0) { wrap.style.display = 'none'; wrap.innerHTML = ''; return; }

  const disabled = chatBusy || convertBusy;
  const hasDraft = quoteState.options.length > 0;
  const label = convertBusy ? t('converting') : t('convert_to_quote');
  const hint = hasDraft ? t('reconvert_hint') : t('convert_hint');

  wrap.style.display = '';
  wrap.innerHTML = `
    <button type="button" class="btn btn-primary"
            style="width:100%;justify-content:center;padding:14px;font-size:15px;"
            onclick="convertToQuote()" ${disabled ? 'disabled' : ''}>
      ${convertBusy
        ? '<span class="spinner-ring" style="margin-right:8px;"></span>'
        : '<span class="material-icons-round" style="margin-right:6px;">bolt</span>'}
      <span>${esc(label)}</span>
    </button>
    <div style="font-size:12px;color:var(--text-secondary);margin-top:8px;text-align:center;">${esc(hint)}</div>
  `;
}

function setChatError(msg) {
  const b = document.getElementById('chat-error-banner');
  if (!b) return;
  if (!msg) { b.style.display = 'none'; b.textContent = ''; return; }
  b.textContent = '⚠️ ' + msg;
  b.style.display = '';
}

async function sendChatMessage() {
  if (chatBusy) return;
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  setChatError('');

  if (typeof OPENAI_API_KEY !== 'string' || !OPENAI_API_KEY.startsWith('sk-')) {
    setChatError('OpenAI API key is missing or invalid. Check js/config.js.');
    return;
  }
  if (typeof callGPTChat !== 'function') {
    setChatError('callGPTChat is not loaded. Hard-refresh with Ctrl+Shift+R.');
    return;
  }

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
    const reply = await callGPTChat(chatHistory, context);
    chatHistory.push({
      role: 'assistant',
      content: reply,
      displayText: reply
    });
  } catch (err) {
    console.error('[sendChatMessage error]', err);
    setChatError('GPT call failed: ' + (err.message || err));
    chatHistory.push({
      role: 'assistant',
      content: 'error',
      displayText: (lang === 'fr' ? 'Erreur : ' : 'Error: ') + err.message
    });
  } finally {
    chatBusy = false;
    renderChat();
  }
}

async function convertToQuote() {
  if (convertBusy || chatBusy) return;
  if (!chatHistory.length) return;

  setChatError('');

  if (typeof OPENAI_API_KEY !== 'string' || !OPENAI_API_KEY.startsWith('sk-')) {
    setChatError('OpenAI API key is missing or invalid. Check js/config.js.');
    return;
  }
  if (typeof extractQuoteFromConversation !== 'function') {
    setChatError('extractQuoteFromConversation is not loaded. Hard-refresh with Ctrl+Shift+R.');
    return;
  }

  convertBusy = true;
  renderConvertButton();

  const context = {
    clientName: val('f-client-name'),
    clientAddress: val('f-client-address'),
    clientEmail: val('f-client-email'),
    clientPhone: val('f-client-phone'),
    quoteDate: val('f-date')
  };

  try {
    const { draft } = await extractQuoteFromConversation(chatHistory, context);
    if (!draft.options.length) {
      setChatError(t('no_options_extracted'));
      return;
    }
    quoteState.project_title = draft.project_title || quoteState.project_title;
    quoteState.options = draft.options;
    quoteState.activeOptionKey = draft.options[0]?.key || null;
    quoteState.assumptions = draft.assumptions;
    quoteState.questions = draft.questions;
    saveDraft();
    renderDraftPreview();
    setTimeout(() => {
      document.getElementById('draft-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  } catch (err) {
    console.error('[convertToQuote error]', err);
    setChatError('Conversion failed: ' + (err.message || err));
  } finally {
    convertBusy = false;
    renderConvertButton();
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

  const multi = quoteState.options.length > 1;
  quoteState.options.forEach(opt => {
    const total = optionSubtotal(opt);
    h += '<div class="option-card-preview">';
    h += '<div class="option-card-preview-header">';
    if (multi) h += `<div class="option-card-preview-title">Option ${esc(opt.key)}</div>`;
    h += `<div class="option-card-preview-total" style="${multi ? '' : 'margin-left:auto;'}">$${money(total)}</div>`;
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
  saveDraft();
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

  const multi = quoteState.options.length > 1;
  quoteState.options.forEach(opt => {
    const tab = document.createElement('button');
    tab.className = 'options-tab' + (opt.key === quoteState.activeOptionKey ? ' active' : '');
    const total = optionSubtotal(opt);
    const label = multi ? `Option ${esc(opt.key)} · $${money(total)}` : `$${money(total)}`;
    tab.innerHTML = `${label}${multi ? `<span class="close material-icons-round" onclick="event.stopPropagation(); removeOption('${opt.key}')">close</span>` : ''}`;
    tab.onclick = () => { quoteState.activeOptionKey = opt.key; renderOptionsEditor(); };
    tabs.appendChild(tab);
  });
  if (!multi) tabs.style.display = 'none'; else tabs.style.display = '';

  const opt = quoteState.options.find(o => o.key === quoteState.activeOptionKey);
  editor.innerHTML = buildOptionEditor(opt);
}

function buildOptionEditor(opt) {
  const fr = lang === 'fr';
  let h = '<div class="option-editor-box">';

  // Head: duration only — title is fixed at "Option A/B/C"
  h += '<div class="option-editor-head">';
  h += `<div class="form-group" style="margin:0;"><label class="form-label">${t('duration_weeks')}</label><input class="form-input" type="number" min="1" value="${opt.duration_weeks}" onchange="updateOptionField('${opt.key}','duration_weeks',this.value)"></div>`;
  h += '</div>';

  // Scope
  h += `<div class="form-group"><label class="form-label">${t('scope_label')}</label><textarea class="form-textarea" rows="10" style="min-height:180px;font-family:inherit;line-height:1.55;" oninput="updateOptionField('${opt.key}','scope_summary',this.value)">${esc(opt.scope_summary)}</textarea></div>`;

  const mode = getPriceMode(opt);
  const sub = optionSubtotal(opt);

  // Primary price control — base_price in single mode, computed in detailed mode.
  h += `<div class="form-group" style="background:#fffaf0;border:1px solid var(--accent);border-radius:8px;padding:14px;">`;
  h += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">`;
  h += `<label class="form-label" style="margin:0;">${lang === 'fr' ? "Prix de l'option (avant taxes)" : 'Option price (before taxes)'}</label>`;
  h += `<button class="btn btn-secondary btn-sm" onclick="togglePriceMode('${opt.key}')" style="padding:4px 10px;font-size:12px;">`;
  h += `<span class="material-icons-round" style="font-size:16px;">${mode === 'detailed' ? 'toggle_on' : 'toggle_off'}</span>`;
  h += `<span>${lang === 'fr' ? 'Détailler les prix par poste' : 'Itemize prices'}</span>`;
  h += `</button></div>`;
  if (mode === 'single') {
    h += `<input class="form-input" type="number" min="0" step="100" value="${opt.base_price || ''}" placeholder="${lang === 'fr' ? 'Ex. 19000' : 'e.g. 19000'}" oninput="updateOptionField('${opt.key}','base_price',this.value)" style="font-size:18px;font-weight:700;">`;
    h += `<div style="font-size:11px;color:var(--text-hint);margin-top:4px;">${lang === 'fr' ? 'Le client voit ce prix. Les postes ci-dessous sont informatifs (scope du projet).' : 'The client sees this price. The items below are informational (project scope).'}</div>`;
  } else {
    h += `<div style="font-size:20px;font-weight:800;color:var(--accent-dark);">$${money(sub)}</div>`;
    h += `<div style="font-size:11px;color:var(--text-hint);margin-top:4px;">${lang === 'fr' ? 'Calculé à partir des prix unitaires des postes ci-dessous.' : 'Computed from per-item unit prices below.'}</div>`;
  }
  h += `</div>`;

  if (mode === 'single' && sub === 0 && opt.line_items.length > 0) {
    h += `<div class="info-banner" style="background:#fff3cd;border-color:#f0c36d;color:#8a6d1a;margin-bottom:12px;">
      <span class="material-icons-round">warning</span>
      <p>${lang === 'fr'
        ? "Entrez un prix pour l'option ci-dessus, sinon la soumission sera à 0 $."
        : 'Enter an option price above, otherwise the quote will be $0.'}</p>
    </div>`;
  }

  // Materials toggle (budget field hidden — it's rarely needed and was a source of confusion)
  h += `<div class="form-group"><label class="form-label">${t('materials_default')}</label>`;
  h += `<div class="chip-group"><button class="chip ${opt.materials_included ? 'active' : ''}" onclick="setOptionMaterials('${opt.key}', true)">${t('yes')}</button><button class="chip ${!opt.materials_included ? 'active' : ''}" onclick="setOptionMaterials('${opt.key}', false)">${t('no')}</button></div>`;
  h += '</div>';

  // Line items — format depends on price_mode
  h += `<div class="form-label" style="margin-top:8px;">${lang === 'fr' ? 'Postes du projet' : 'Project items'}</div>`;
  opt.line_items.forEach((item, i) => {
    if (mode === 'detailed') {
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
      </div>`;
    } else {
      h += `<div class="line-item">
        <div class="line-item-header">
          <textarea class="line-item-desc" rows="2" oninput="updateItemField('${opt.key}',${i},'description',this.value)">${esc(item.description)}</textarea>
          <button class="li-remove" onclick="removeItem('${opt.key}',${i})"><span class="material-icons-round">close</span></button>
        </div>
        <div class="line-item-fields">
          <div class="li-field" style="max-width:120px;"><label>${t('qty')}</label><input type="number" min="1" value="${item.quantity}" onchange="updateItemField('${opt.key}',${i},'quantity',this.value)"></div>
        </div>
      </div>`;
    }
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
  else if (field === 'base_price') opt[field] = Math.max(0, parseFloat(value) || 0);
  else opt[field] = value;
  renderOptionsEditor();
}

function togglePriceMode(key) {
  const opt = quoteState.options.find(o => o.key === key);
  if (!opt) return;
  const currentMode = getPriceMode(opt);
  if (currentMode === 'single') {
    // Switch to detailed. Seed unit prices by distributing base_price evenly
    // across line items so the total doesn't change when the contractor flips.
    const base = Math.max(0, parseFloat(opt.base_price) || 0);
    const items = opt.line_items || [];
    if (base > 0 && items.length > 0) {
      const per = Math.round((base / items.length) * 100) / 100;
      items.forEach(i => { i.quantity = Math.max(1, parseInt(i.quantity) || 1); i.unit_price = per; });
      // Adjust last line to absorb rounding residue so the sum matches base exactly.
      const sum = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
      const last = items[items.length - 1];
      last.unit_price = Math.max(0, round2(last.unit_price + (base - sum)));
    }
    opt.price_mode = 'detailed';
  } else {
    // Switch to single. Lock in the current sum as base_price, then clear
    // per-line prices so the UI becomes description-only.
    const currentSum = (opt.line_items || []).reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0);
    opt.base_price = round2(currentSum);
    (opt.line_items || []).forEach(i => { i.unit_price = 0; });
    opt.price_mode = 'single';
  }
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
  if (quoteState.options.length >= 3) {
    showToast(lang === 'fr' ? 'Maximum 3 options.' : 'Maximum 3 options.');
    return;
  }
  const usedKeys = new Set(quoteState.options.map(o => o.key));
  let key;
  for (let code = 65; code <= 67; code++) {
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
    price_mode: 'single',
    base_price: 0,
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
  const mode = getPriceMode(opt);
  if (mode === 'detailed') {
    return opt.line_items.reduce((s, i) => s + ((parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0)), 0);
  }
  return Math.max(0, parseFloat(opt.base_price) || 0);
}

// Backwards compat: if price_mode is undefined on a legacy option, pick the
// mode that matches the stored data so we don't retroactively zero it out.
function getPriceMode(opt) {
  if (opt.price_mode === 'single' || opt.price_mode === 'detailed') return opt.price_mode;
  const hasUnitPrices = (opt.line_items || []).some(i => (parseFloat(i.unit_price) || 0) > 0);
  return hasUnitPrices ? 'detailed' : 'single';
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
      const optTitle = multi ? `Option ${esc(opt.key)}` : '';
      const accBadge = accepted ? ' ✓ ' + t('signed_badge') : '';
      h += `<div class="qp-option-title">${optTitle}${accBadge}</div>`;
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
        h += `<th>Description</th><th class="r" style="width:80px;">${fr ? 'Qté' : 'Qty'}</th>`;
        h += '</tr></thead><tbody>';
        opt.line_items.forEach(it => {
          h += `<tr><td>${esc(it.description)}</td><td class="r">${it.quantity}</td></tr>`;
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
  h += '<div class="qp-sig-col">';
  h += `<div class="qp-sig-img">${contractorSignatureData ? `<img src="${contractorSignatureData}">` : ''}</div>`;
  h += `<div class="qp-sig-line">${fr ? 'Signature — MLP Reno & Design' : 'Signature — MLP Reno & Design'}</div>`;
  h += `<div class="qp-sig-meta">${esc(CONTRACTOR.name)}</div>`;
  h += '</div>';
  h += '<div class="qp-sig-col">';
  h += `<div class="qp-sig-img">${savedQuote?.customer_signature ? `<img src="${savedQuote.customer_signature}">` : ''}</div>`;
  h += `<div class="qp-sig-line">${fr ? 'Signature — Client' : 'Signature — Client'}</div>`;
  if (savedQuote?.customer_signer_name) {
    h += `<div class="qp-sig-meta">${esc(savedQuote.customer_signer_name)}</div>`;
  }
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
    // HARD RULE: do NOT create a customers row here. The profile is created
    // only when the customer signs (saveCustomerSignature). Keep whatever
    // customer_id is already linked (e.g. when starting a quote from an
    // existing customer's profile), otherwise leave NULL.
    const customerId = savedQuote?.customer_id || null;

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
  if (typeof PUBLIC_APP_URL === 'string' && PUBLIC_APP_URL) {
    return `${PUBLIC_APP_URL}/sign.html?token=${encodeURIComponent(token)}`;
  }
  const base = window.location.origin + window.location.pathname.replace(/index\.html$/, '');
  return `${base}sign.html?token=${encodeURIComponent(token)}`;
}

function ensureShareBoxVisible() {
  if (!savedQuote?.share_token) return;

  const link = buildShareLink(savedQuote.share_token);
  document.getElementById('share-link-input').value = link;
  document.getElementById('share-box').style.display = '';

  const clientName = val('f-client-name');
  const clientEmail = val('f-client-email');
  const subject = encodeURIComponent((lang === 'fr' ? 'Votre soumission MLP Reno & Design — ' : 'Your MLP Reno & Design quote — ') + savedQuote.quote_number);
  const body = encodeURIComponent(
    lang === 'fr'
      ? `Bonjour ${clientName},\n\nVoici votre soumission. Vous pouvez la consulter et la signer en ligne :\n${link}\n\nMerci,\nMLP Reno & Design`
      : `Hi ${clientName},\n\nHere is your quote. You can view and sign it online:\n${link}\n\nThank you,\nMLP Reno & Design`
  );
  const emailEl = document.getElementById('share-email');
  if (emailEl) emailEl.href = `mailto:${clientEmail || ''}?subject=${subject}&body=${body}`;

  document.getElementById('quote-status-card').style.display = '';
  document.getElementById('quote-number-display').textContent = savedQuote.quote_number;
  const pill = document.getElementById('quote-status-pill');
  const statusText = {
    draft: lang === 'fr' ? 'Brouillon' : 'Draft',
    sent: lang === 'fr' ? 'Envoyée' : 'Sent',
    viewed: lang === 'fr' ? 'Consultée' : 'Viewed',
    signed: lang === 'fr' ? 'Signée' : 'Signed'
  }[savedQuote.status] || savedQuote.status;
  pill.textContent = statusText;
  pill.className = 'status-pill ' + savedQuote.status;
}

function copyShareLink() {
  const input = document.getElementById('share-link-input');
  input.select();
  navigator.clipboard.writeText(input.value).then(() => showToast(t('link_copied')));
}

async function sendVia(channel) {
  const btn = document.getElementById(channel === 'sms' ? 'btn-send-sms' : 'btn-send-email');
  const status = document.getElementById('send-status');

  if (!savedQuote?.id) {
    showToast(lang === 'fr' ? 'Enregistrez d\'abord la soumission.' : 'Save the quote first.', 'error');
    return;
  }
  if (channel === 'sms' && !val('f-client-phone')) {
    showToast(lang === 'fr' ? 'Téléphone client manquant.' : 'Client phone is missing.', 'error');
    goToStep(1);
    return;
  }
  if (channel === 'email' && !val('f-client-email')) {
    showToast(lang === 'fr' ? 'Courriel client manquant.' : 'Client email is missing.', 'error');
    goToStep(1);
    return;
  }

  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner-ring"></span><span>${lang === 'fr' ? 'Envoi…' : 'Sending…'}</span>`;
  status.textContent = '';
  status.style.color = 'var(--text-secondary)';

  try {
    const res = await fetch(SUPABASE_URL + '/functions/v1/send-quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ quote_id: savedQuote.id, channel })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));

    status.style.color = 'var(--green)';
    if (channel === 'sms') {
      status.innerHTML = '✓ ' + (lang === 'fr'
        ? `SMS envoyé au ${data.to} (SID ${data.sid}).`
        : `SMS sent to ${data.to} (SID ${data.sid}).`);
      showToast(lang === 'fr' ? 'SMS envoyé !' : 'SMS sent!');
    } else {
      status.innerHTML = '✓ ' + (lang === 'fr'
        ? `Courriel envoyé à ${data.to}.`
        : `Email sent to ${data.to}.`);
      showToast(lang === 'fr' ? 'Courriel envoyé !' : 'Email sent!');
    }
  } catch (err) {
    console.error('[sendVia ' + channel + ']', err);
    status.style.color = 'var(--red)';
    status.textContent = '⚠️ ' + (err.message || err);
    showToast((lang === 'fr' ? 'Erreur : ' : 'Error: ') + (err.message || err), 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

function sendSmsNow()   { return sendVia('sms'); }
function sendEmailNow() { return sendVia('email'); }

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
   DRAFT DOWNLOAD / DRAFT EMAIL / PREVIEW
   ============================================ */
async function previewAsClient() {
  if (!savedQuote?.share_token) {
    showToast(t('preview_saving'));
    try { await saveDraft(); } catch (_) {}
  }
  if (!savedQuote?.share_token) {
    showToast(lang === 'fr' ? 'Impossible de générer l\'aperçu. Vérifiez les informations du client.' : 'Could not generate preview. Check client info.', 'error');
    return;
  }
  const url = buildShareLink(savedQuote.share_token);
  window.open(url, '_blank');
}

function downloadDraftPdf() {
  const content = document.getElementById('quote-output').innerHTML;
  const watermark = t('draft_watermark');
  const num = savedQuote?.quote_number || '';
  const title = (lang === 'fr' ? 'Brouillon — Soumission MLP' : 'Draft — MLP Quote') + (num ? ' ' + num : '');
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${esc(title)}</title>
    <link rel="stylesheet" href="css/tools.css?v=23">
    <style>
      body{background:#fff;padding:24px;position:relative;}
      .draft-banner{background:#fff3cd;border:1px solid #f0c36d;color:#8a6d1a;padding:10px 14px;border-radius:8px;margin-bottom:16px;font-weight:700;text-align:center;letter-spacing:0.5px;}
      .draft-wm{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-28deg);font-size:120px;font-weight:900;color:rgba(200,164,90,0.12);pointer-events:none;z-index:0;white-space:nowrap;}
      .quote-preview{position:relative;z-index:1;}
      @media print { .draft-banner{background:#fff3cd !important;-webkit-print-color-adjust:exact;print-color-adjust:exact;} .draft-wm{color:rgba(200,164,90,0.18) !important;-webkit-print-color-adjust:exact;print-color-adjust:exact;} }
    </style></head>
    <body>
      <div class="draft-wm">${esc(watermark)}</div>
      <div class="draft-banner">${esc(watermark)}</div>
      ${content}
    </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

async function sendDraftEmail() {
  const btn = document.getElementById('btn-send-draft');
  const status = document.getElementById('draft-send-status');

  if (!savedQuote?.id) {
    showToast(lang === 'fr' ? 'Enregistrez d\'abord la soumission.' : 'Save the quote first.', 'error');
    return;
  }

  const defaultTo = val('f-client-email') || '';
  const to = (window.prompt(t('draft_prompt_email'), defaultTo) || '').trim();
  if (!to) return;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    showToast(lang === 'fr' ? 'Courriel invalide.' : 'Invalid email.', 'error');
    return;
  }

  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner-ring"></span><span>${lang === 'fr' ? 'Envoi…' : 'Sending…'}</span>`;
  status.textContent = '';
  status.style.color = 'var(--text-secondary)';

  try {
    const res = await fetch(SUPABASE_URL + '/functions/v1/send-quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ quote_id: savedQuote.id, channel: 'email', draft: true, to })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));

    status.style.color = 'var(--green)';
    status.innerHTML = '✓ ' + t('draft_email_sent') + ' ' + esc(to) + '.';
    showToast(lang === 'fr' ? 'Brouillon envoyé !' : 'Draft sent!');
  } catch (err) {
    console.error('[sendDraftEmail]', err);
    status.style.color = 'var(--red)';
    status.textContent = '⚠️ ' + (err.message || err);
    showToast((lang === 'fr' ? 'Erreur : ' : 'Error: ') + (err.message || err), 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
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
