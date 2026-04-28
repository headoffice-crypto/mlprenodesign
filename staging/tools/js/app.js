/* ============================================
   MLP Reno & Design — Single-page quote builder
   Source = pasted text or PDF (extracted client-side via pdf.js).
   No GPT, no wizard. Fill the form, sign, click Generate.
   ============================================ */

let lang = 'fr';

/* Quote state — kept compatible with the existing customer-facing
   sign.html / quotes.html which expect an `options` array on the row. */
let quoteState = {
  project_title: '',
  scope_summary: '',
  duration_value: 2,             // raw number the contractor entered
  duration_unit: 'weeks',        // 'weeks' | 'days'
  duration_weeks: 2,             // canonical value in weeks (kept for backwards compat with sign.html / invoices)
  materials_included: true,
  base_price: 0
};

let selectedPaymentOption = 'A';
let contractorPad = null;
let contractorSignatureData = null;
let savedQuote = null;
let draftSaveInFlight = false;
let lastSavedAt = null;

/* PDF analysis state — images of rendered PDF pages held in memory
   so the Analyze action can send them to GPT-4o vision for layout
   understanding. Cleared when a new PDF replaces the old one. */
let pdfPageImages = [];
let pdfSourceName = '';
let analyzeBusy = false;

/* ---------- i18n ---------- */
const I18N = {
  src_title: { fr: 'Texte du projet', en: 'Project text' },
  src_sub:   { fr: 'Collez le scope ou téléversez un PDF. Le texte est utilisé tel quel dans la soumission.', en: 'Paste the scope or upload a PDF. The text is used verbatim in the quote.' },
  scope_label: { fr: 'Portée des travaux', en: 'Scope of work' },
  scope_placeholder: { fr: 'Collez ici le texte du scope, le courriel client, le contenu du PDF, etc. Tout le texte sera utilisé tel quel.', en: 'Paste the scope text, client email, PDF contents, etc. All text is used verbatim.' },
  upload_pdf: { fr: 'Téléverser un PDF', en: 'Upload a PDF' },
  pdf_extracting: { fr: 'Extraction du PDF…', en: 'Extracting PDF…' },
  pdf_extracted: { fr: 'PDF importé', en: 'PDF imported' },
  pdf_extract_failed: { fr: 'Impossible de lire le PDF', en: 'Could not read PDF' },
  pdf_no_text: { fr: 'Le PDF ne contient pas de texte extractible (probablement un scan).', en: 'PDF has no extractable text (likely a scan).' },
  pdf_rendering: { fr: 'Lecture des pages du PDF…', en: 'Reading PDF pages…' },
  analyze_btn: { fr: 'Analyser et remplir le formulaire', en: 'Analyze and fill the form' },
  analyzing: { fr: 'Analyse en cours…', en: 'Analyzing…' },
  analyze_done: { fr: 'Formulaire rempli. Vérifiez et ajustez si besoin avant de générer.', en: 'Form filled. Review and adjust before generating.' },
  analyze_empty: { fr: 'Coller du texte ou téléverser un PDF d\'abord.', en: 'Paste text or upload a PDF first.' },
  analyze_failed: { fr: 'Échec de l\'analyse', en: 'Analysis failed' },

  client_title: { fr: 'Client', en: 'Client' },
  client_sub:   { fr: 'Coordonnées qui apparaissent sur la soumission.', en: 'Contact details shown on the quote.' },
  client_name: { fr: 'Nom du client', en: 'Client name' },
  client_address: { fr: 'Adresse du projet', en: 'Project address' },
  client_email: { fr: 'Courriel', en: 'Email' },
  client_phone: { fr: 'Téléphone', en: 'Phone' },
  quote_date: { fr: 'Date de la soumission', en: 'Quote date' },
  project_title_label: { fr: 'Titre du projet', en: 'Project title' },
  project_title_ph: { fr: 'Ex. Rénovation cuisine', en: 'e.g. Kitchen renovation' },

  quote_title: { fr: 'Prix et durée', en: 'Price & duration' },
  quote_sub:   { fr: 'Le prix avant taxes et la durée estimée. Les taxes sont calculées automatiquement.', en: 'Pre-tax price and estimated duration. Taxes are computed automatically.' },
  base_price_label: { fr: 'Prix avant taxes ($)', en: 'Pre-tax price ($)' },
  duration_label: { fr: 'Durée', en: 'Duration' },
  unit_weeks: { fr: 'Semaines', en: 'Weeks' },
  unit_days:  { fr: 'Jours ouvrables', en: 'Business days' },
  add_schedule: { fr: 'Ajouter un échéancier', en: 'Add a payment schedule' },
  schedule_hint: { fr: 'Les pourcentages doivent totaliser 100 %. Vos échéanciers personnalisés sont enregistrés sur cet appareil pour les prochaines soumissions.', en: 'Percentages must total 100%. Your custom schedules are saved on this device for future quotes.' },
  schedule_title_label: { fr: 'Titre', en: 'Title' },
  schedule_row_label: { fr: 'Étape', en: 'Stage' },
  schedule_row_pct: { fr: '%', en: '%' },
  schedule_total_ok: { fr: 'Total : 100 %', en: 'Total: 100%' },
  schedule_total_bad: { fr: 'Total : {n} % (doit être 100 %)', en: 'Total: {n}% (must be 100%)' },
  schedule_remove: { fr: 'Supprimer cet échéancier', en: 'Remove this schedule' },
  schedule_add_row: { fr: 'Ajouter une étape', en: 'Add a stage' },
  schedule_default_title: { fr: 'Nouvel échéancier', en: 'New schedule' },
  schedule_default_row_fr: { fr: 'Étape', en: 'Stage' },
  schedule_default_row_en: { fr: 'Stage', en: 'Stage' },
  schedule_invalid_save: { fr: 'L\'échéancier sélectionné doit totaliser 100 % avant la génération.', en: 'The selected schedule must total 100% before generating.' },
  materials_label: { fr: 'Matériaux inclus ?', en: 'Materials included?' },
  yes: { fr: 'Oui', en: 'Yes' },
  no:  { fr: 'Non', en: 'No' },
  subtotal: { fr: 'Sous-total', en: 'Subtotal' },
  total_with_tax: { fr: 'Total avec taxes', en: 'Total with taxes' },

  terms_title: { fr: 'Modalités de paiement', en: 'Payment terms' },
  terms_sub:   { fr: 'Échéancier des paiements.', en: 'Payment schedule.' },
  methods_title: { fr: 'Méthodes de paiement et notes', en: 'Payment methods & notes' },
  methods_sub:   { fr: 'Pré-remplis avec les valeurs par défaut. Modifiez si besoin.', en: 'Pre-filled with defaults. Edit as needed.' },
  payment_methods: { fr: 'Méthodes de paiement', en: 'Payment methods' },
  notes_label: { fr: 'Notes importantes', en: 'Important notes' },

  sig_title: { fr: 'Votre signature', en: 'Your signature' },
  sig_sub:   { fr: 'Signez la soumission avant l\'envoi au client.', en: 'Sign the quote before sending it to the client.' },
  contractor_sig: { fr: 'Signature — MLP Reno & Design', en: 'Signature — MLP Reno & Design' },
  sign_here: { fr: 'Signez ici', en: 'Sign here' },
  clear: { fr: 'Effacer', en: 'Clear' },
  save_default_sig: { fr: 'Utiliser par défaut sur toutes les soumissions', en: 'Use as default on every quote' },
  sig_saved: { fr: 'Enregistrée', en: 'Saved' },

  save_and_send: { fr: 'Générer la soumission et le lien client', en: 'Generate quote & client link' },
  saving: { fr: 'Enregistrement…', en: 'Saving…' },
  saved: { fr: 'Enregistré !', en: 'Saved!' },
  copy: { fr: 'Copier', en: 'Copy' },
  print_pdf: { fr: 'Imprimer / PDF', en: 'Print / PDF' },
  share_title: { fr: 'Lien à envoyer au client', en: 'Link to send to the client' },
  share_hint: { fr: 'Copiez ce lien ou utilisez les boutons ci-dessus. Le client pourra signer en ligne.', en: 'Copy this link or use the buttons above. The client can sign online.' },
  send_email_now: { fr: 'Envoyer courriel au client', en: 'Email the client' },
  send_sms_now:   { fr: 'Envoyer SMS au client', en: 'SMS the client' },
  link_copied: { fr: 'Lien copié !', en: 'Link copied!' },
  quote_ref: { fr: 'Numéro', en: 'Quote #' },
  signature_required: { fr: 'Veuillez signer avant d\'envoyer.', en: 'Please sign before sending.' },
  client_name_required: { fr: 'Le nom du client est requis.', en: 'Client name is required.' },
  scope_required: { fr: 'Collez le scope ou téléversez un PDF d\'abord.', en: 'Paste the scope or upload a PDF first.' },
  price_required: { fr: 'Entrez le prix avant taxes.', en: 'Enter the pre-tax price.' },

  draft_actions_title: { fr: "Avant d'envoyer pour signature", en: 'Before sending for signature' },
  draft_actions_hint: { fr: 'Téléchargez ou envoyez une copie brouillon (filigrane BROUILLON, sans lien de signature) pour révision interne ou pour prévisualiser avec le client.', en: 'Download or email a draft copy (DRAFT watermark, no signing link) for internal review or to preview with the client.' },
  download_draft: { fr: 'Télécharger brouillon', en: 'Download draft' },
  send_draft: { fr: 'Envoyer brouillon par courriel', en: 'Email draft copy' },
  draft_prompt_email: { fr: 'Adresse courriel pour le brouillon ?', en: 'Email address for the draft?' },
  draft_email_sent: { fr: 'Brouillon envoyé à', en: 'Draft sent to' },
  draft_watermark: { fr: 'BROUILLON — Non contractuel', en: 'DRAFT — Not for signature' },
  preview_as_client: { fr: 'Aperçu côté client', en: 'Preview as client' },
  preview_saving: { fr: 'Enregistrement…', en: 'Saving…' }
};

/* ---------- Payment schedules ----------
   Each schedule has a title and a list of rows: { label_fr, label_en, pct }.
   The display description is derived from the rows (e.g. "10% Dépôt\n…").
   Schedules are stored in localStorage so the contractor's custom set
   carries across sessions and quotes. The seed below is what new installs see. */
const SCHEDULE_SEED = [
  { key: 'A', title: 'Option A', rows: [
    { label_fr: 'Dépôt',           label_en: 'Deposit',         pct: 10 },
    { label_fr: 'Avant début',     label_en: 'Before start',    pct: 40 },
    { label_fr: 'Mi-parcours',     label_en: 'Mid-project',     pct: 40 },
    { label_fr: 'Fin des travaux', label_en: 'Upon completion', pct: 10 }
  ]},
  { key: 'B', title: 'Option B', rows: [
    { label_fr: 'Dépôt',           label_en: 'Deposit',         pct: 20 },
    { label_fr: 'Avant début',     label_en: 'Before start',    pct: 30 },
    { label_fr: 'Mi-parcours',     label_en: 'Mid-project',     pct: 40 },
    { label_fr: 'Fin des travaux', label_en: 'Upon completion', pct: 10 }
  ]},
  { key: 'C', title: 'Option C', rows: [
    { label_fr: 'Dépôt',           label_en: 'Deposit',         pct: 20 },
    { label_fr: 'Avant début',     label_en: 'Before start',    pct: 40 },
    { label_fr: 'Mi-parcours',     label_en: 'Mid-project',     pct: 30 },
    { label_fr: 'Fin des travaux', label_en: 'Upon completion', pct: 10 }
  ]}
];

let paymentSchedules = loadSchedulesFromStorage();

function loadSchedulesFromStorage() {
  try {
    const raw = localStorage.getItem('mlp_payment_schedules');
    if (!raw) return JSON.parse(JSON.stringify(SCHEDULE_SEED));
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch (_) {}
  return JSON.parse(JSON.stringify(SCHEDULE_SEED));
}

function persistSchedules() {
  try { localStorage.setItem('mlp_payment_schedules', JSON.stringify(paymentSchedules)); } catch (_) {}
}

function scheduleDescription(schedule, l) {
  if (!schedule || !Array.isArray(schedule.rows)) return '';
  return schedule.rows
    .filter(r => Number(r.pct) > 0)
    .map(r => `${r.pct}% ${l === 'fr' ? r.label_fr : r.label_en}`)
    .join('\n');
}

function scheduleTotalPct(schedule) {
  if (!schedule || !Array.isArray(schedule.rows)) return 0;
  return schedule.rows.reduce((s, r) => s + (Number(r.pct) || 0), 0);
}

function findSchedule(key) {
  return paymentSchedules.find(s => s.key === key) || paymentSchedules[0];
}

function nextScheduleKey() {
  const used = new Set(paymentSchedules.map(s => s.key));
  for (let i = 0; i < 26; i++) {
    const k = String.fromCharCode(65 + i);
    if (!used.has(k)) return k;
  }
  return 'X' + Date.now().toString(36).slice(-4);
}

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
  initContractorSignaturePad();

  const params = new URLSearchParams(location.search);
  const draftId = params.get('draft');
  if (draftId) {
    await loadDraftById(draftId);
  } else {
    const prefill = ['client_name', 'client_email', 'client_phone', 'client_address'];
    prefill.forEach(key => {
      const v = params.get(key);
      if (v) {
        const el = document.getElementById('f-' + key.replace('_', '-'));
        if (el) el.value = v;
      }
    });
  }

  // Restore default signature if any
  const savedSig = localStorage.getItem('mlp_default_signature');
  if (savedSig) {
    contractorSignatureData = savedSig;
    if (contractorPad) {
      setTimeout(() => contractorPad.fromDataURL(savedSig), 50);
      document.getElementById('contractor-sig-placeholder').style.display = 'none';
      document.getElementById('contractor-sig-status').style.display = '';
    }
  }

  document.getElementById('sig-default-check')?.addEventListener('change', (e) => {
    if (e.target.checked && contractorSignatureData) {
      localStorage.setItem('mlp_default_signature', contractorSignatureData);
      showToast(lang === 'fr' ? 'Signature enregistrée par défaut.' : 'Signature saved as default.');
    }
  });

  // Live tax preview as the user types the price
  document.getElementById('f-base-price').addEventListener('input', renderTaxPreview);
  renderTaxPreview();

  // Auto-save draft on key field changes
  ['f-client-name', 'f-client-address', 'f-client-email', 'f-client-phone',
   'f-project-title', 'f-scope', 'f-base-price', 'f-duration', 'f-payment-methods', 'f-notes']
    .forEach(id => document.getElementById(id)?.addEventListener('change', saveDraft));
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
  renderTaxPreview();
  if (savedQuote) renderFinalQuote();
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
}

function t(key) { return I18N[key] ? (I18N[key][lang] || key) : key; }

/* ============================================
   PDF UPLOAD → SCOPE TEXTAREA
   ============================================ */
function setPdfError(msg) {
  const b = document.getElementById('pdf-error-banner');
  if (!b) return;
  if (!msg) { b.style.display = 'none'; b.textContent = ''; return; }
  b.textContent = '⚠️ ' + msg;
  b.style.display = '';
}

function setPdfStatus(msg, color) {
  const el = document.getElementById('pdf-status');
  if (!el) return;
  if (!msg) { el.style.display = 'none'; el.textContent = ''; return; }
  el.style.display = '';
  el.style.color = color || 'var(--text-secondary)';
  el.innerHTML = msg;
}

async function onPdfPicked(ev) {
  const file = ev.target.files?.[0];
  ev.target.value = '';
  if (!file) return;
  setPdfError('');
  setPdfStatus(`<span class="spinner-ring" style="margin-right:6px;"></span>${esc(t('pdf_rendering'))} ${esc(file.name)}`);

  try {
    const { text, images } = await loadPdf(file);
    pdfPageImages = images;
    pdfSourceName = file.name;

    // Put extracted text in the scope textarea so the user sees what was read.
    // The Analyze step (next click) is what understands layout — this is just a preview.
    const ta = document.getElementById('f-scope');
    const existing = ta.value.trim();
    ta.value = existing ? existing + '\n\n' + text : text;

    const fr = lang === 'fr';
    setPdfStatus(
      `✓ ${esc(file.name)} — ${pdf.numPages || images.length} ${fr ? 'page(s) lues' : 'page(s) read'} · ` +
      `<button type="button" class="btn-link" onclick="runAnalysis()" style="padding:2px 6px;font-size:13px;">` +
      `<span class="material-icons-round" style="font-size:16px;vertical-align:middle;">auto_awesome</span>` +
      `<span>${esc(t('analyze_btn'))}</span></button>`,
      'var(--green)'
    );
    renderAnalyzeButton();
    saveDraft();
  } catch (err) {
    console.error('[pdf]', err);
    setPdfStatus('', '');
    setPdfError(t('pdf_extract_failed') + ' : ' + (err.message || err));
  }
}

/* Load a PDF: extract text AND render each page to a JPEG data URL so
   GPT-4o vision can see the actual layout (tables, headings, line items).
   Cap at MAX_PAGES to keep the API call cheap and fast. */
const PDF_MAX_PAGES = 6;
const PDF_RENDER_SCALE = 1.5;
let pdf; // hoisted so the status line above can read pdf.numPages

async function loadPdf(file) {
  if (!window.pdfjsLib) throw new Error('pdf.js not loaded');
  const arrayBuf = await file.arrayBuffer();
  pdf = await window.pdfjsLib.getDocument({ data: arrayBuf }).promise;
  const pages = Math.min(pdf.numPages, PDF_MAX_PAGES);

  const textChunks = [];
  const images = [];

  for (let i = 1; i <= pages; i++) {
    const page = await pdf.getPage(i);

    // Text (best-effort fallback when vision is unavailable / for the textarea preview)
    const content = await page.getTextContent();
    textChunks.push(content.items.map(it => it.str).join(' ').trim());

    // Image (what GPT-4o vision actually reads to understand layout)
    const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    images.push(canvas.toDataURL('image/jpeg', 0.85));
  }

  const text = textChunks.join('\n\n').trim();
  return { text, images };
}

/* ============================================
   ANALYZE: send text + PDF page images to GPT-4o, fill the form
   ============================================ */
function renderAnalyzeButton() {
  const btn = document.getElementById('btn-analyze');
  if (!btn) return;
  const hasInput = (document.getElementById('f-scope').value.trim().length > 0) || pdfPageImages.length > 0;
  btn.style.display = hasInput ? '' : 'none';
  if (analyzeBusy) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-ring"></span><span>${esc(t('analyzing'))}</span>`;
  } else {
    btn.disabled = false;
    btn.innerHTML = `<span class="material-icons-round">auto_awesome</span><span>${esc(t('analyze_btn'))}</span>`;
  }
}

async function runAnalysis() {
  if (analyzeBusy) return;
  setPdfError('');

  const pasted = document.getElementById('f-scope').value.trim();
  if (!pasted && pdfPageImages.length === 0) {
    setPdfError(t('analyze_empty'));
    return;
  }
  if (typeof OPENAI_API_KEY !== 'string' || !OPENAI_API_KEY.startsWith('sk-')) {
    setPdfError('OpenAI API key is missing or invalid. Check js/config.js.');
    return;
  }
  if (typeof analyzeProjectInput !== 'function') {
    setPdfError('Analyzer not loaded. Hard-refresh (Ctrl+Shift+R).');
    return;
  }

  analyzeBusy = true;
  renderAnalyzeButton();

  const context = { today: new Date().toISOString().split('T')[0] };

  try {
    const result = await analyzeProjectInput({
      text: pasted,
      images: pdfPageImages,
      context
    });

    // Auto-fill the form with whatever the analyzer found.
    // Empty/zero values mean "not in the document" — leave existing values alone.
    if (result.client_name)    setFieldIfEmpty('f-client-name',    result.client_name);
    if (result.client_email)   setFieldIfEmpty('f-client-email',   result.client_email);
    if (result.client_phone)   setFieldIfEmpty('f-client-phone',   result.client_phone);
    if (result.client_address) setFieldIfEmpty('f-client-address', result.client_address);
    if (result.project_title)  setFieldIfEmpty('f-project-title',  result.project_title);

    // Scope is special: ALWAYS replace with the verbatim AI output, because
    // the textarea may currently hold raw pdf.js text dump (no layout) and
    // the AI version preserves the document's real structure verbatim.
    if (result.scope_summary) {
      document.getElementById('f-scope').value = result.scope_summary;
    }

    if (result.base_price > 0) document.getElementById('f-base-price').value = result.base_price;
    if (result.duration_weeks > 0) document.getElementById('f-duration').value = result.duration_weeks;
    setMaterials(result.materials_included);

    renderTaxPreview();
    setPdfStatus('✓ ' + esc(t('analyze_done')), 'var(--green)');
    showToast(t('analyze_done'));
    saveDraft();
  } catch (err) {
    console.error('[runAnalysis]', err);
    setPdfError(t('analyze_failed') + ' : ' + (err.message || err));
  } finally {
    analyzeBusy = false;
    renderAnalyzeButton();
  }
}

function setFieldIfEmpty(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!el.value.trim()) el.value = value;
}

/* ============================================
   QUOTE STATE FROM FORM
   ============================================ */
function setMaterials(included) {
  quoteState.materials_included = !!included;
  document.getElementById('chip-mat-yes').className = 'chip' + (included ? ' active' : '');
  document.getElementById('chip-mat-no').className  = 'chip' + (included ? '' : ' active');
  saveDraft();
}

function readFormIntoState() {
  quoteState.project_title  = val('f-project-title');
  quoteState.scope_summary  = document.getElementById('f-scope').value; // verbatim — no .trim()
  quoteState.duration_value = Math.max(1, parseInt(val('f-duration')) || 1);
  quoteState.duration_unit  = (document.getElementById('f-duration-unit')?.value === 'days') ? 'days' : 'weeks';
  // Keep duration_weeks in sync for older consumers (5 business days = 1 week, rounded up).
  quoteState.duration_weeks = quoteState.duration_unit === 'days'
    ? Math.max(1, Math.ceil(quoteState.duration_value / 5))
    : quoteState.duration_value;
  quoteState.base_price     = Math.max(0, parseFloat(val('f-base-price')) || 0);
}

function durationLabel(value, unit, fr) {
  const n = Math.max(1, parseInt(value) || 1);
  if (unit === 'days') return `${n} ${fr ? 'jours ouvrables' : 'business days'}`;
  return `${n} ${fr ? (n === 1 ? 'semaine' : 'semaines') : (n === 1 ? 'week' : 'weeks')}`;
}

function renderTaxPreview() {
  readFormIntoState();
  const sub = quoteState.base_price;
  const gst = round2(sub * 0.05);
  const qst = round2(sub * 0.09975);
  const total = round2(sub + gst + qst);
  document.getElementById('tax-preview').innerHTML = `
    <div class="tax-row"><span>${esc(t('subtotal'))}</span><span>$${money(sub)}</span></div>
    <div class="tax-row"><span>TPS 5%</span><span>$${money(gst)}</span></div>
    <div class="tax-row"><span>TVQ 9.975%</span><span>$${money(qst)}</span></div>
    <div class="tax-row total"><span>${esc(t('total_with_tax'))}</span><span>$${money(total)}</span></div>
  `;
}

/* Build a single-option array for storage (compatible with sign.html / quotes.html) */
function buildOptionsArray() {
  const sub = quoteState.base_price;
  const gst = round2(sub * 0.05);
  const qst = round2(sub * 0.09975);
  return [{
    key: 'A',
    title: 'Option A',
    scope_summary: quoteState.scope_summary,
    duration_weeks: quoteState.duration_weeks,
    duration_value: quoteState.duration_value,
    duration_unit:  quoteState.duration_unit,
    materials_included: quoteState.materials_included,
    materials_budget: 0,
    price_mode: 'single',
    base_price: sub,
    line_items: [],
    subtotal: sub,
    gst,
    qst,
    total: round2(sub + gst + qst)
  }];
}

/* The chosen schedule, deep-cloned so saved records snapshot the exact
   terms the contractor showed the customer (even if the schedule is
   later edited or deleted). */
function buildSelectedScheduleSnapshot() {
  const s = findSchedule(selectedPaymentOption);
  if (!s) return null;
  return {
    key: s.key,
    title: s.title,
    rows: s.rows.map(r => ({
      label_fr: r.label_fr || '',
      label_en: r.label_en || '',
      pct: Number(r.pct) || 0
    }))
  };
}

/* ============================================
   PAYMENT SCHEDULES — editable + addable
   ============================================ */
function buildPaymentOptionsUI() {
  const container = document.getElementById('payment-options-container');
  if (!container) return;
  if (!paymentSchedules.find(s => s.key === selectedPaymentOption)) {
    selectedPaymentOption = paymentSchedules[0]?.key || 'A';
  }
  container.innerHTML = paymentSchedules.map(s => renderScheduleCard(s)).join('');
}

function renderScheduleCard(schedule) {
  const total = scheduleTotalPct(schedule);
  const totalOk = total === 100;
  const totalLabel = totalOk
    ? t('schedule_total_ok')
    : t('schedule_total_bad').replace('{n}', String(total));
  const isSelected = schedule.key === selectedPaymentOption;
  const labelKey = lang === 'fr' ? 'label_fr' : 'label_en';

  let h = `<div class="schedule-card${isSelected ? ' selected' : ''}" onclick="selectSchedule('${esc(schedule.key)}')">`;
  h += `<div class="schedule-head">`;
  h += `  <div class="option-radio"></div>`;
  h += `  <input class="schedule-title" type="text" value="${esc(schedule.title)}" onclick="event.stopPropagation()" oninput="onScheduleTitleInput('${esc(schedule.key)}', this.value)">`;
  h += `  <button type="button" class="schedule-remove" onclick="event.stopPropagation(); removeSchedule('${esc(schedule.key)}')" title="${esc(t('schedule_remove'))}">`;
  h += `    <span class="material-icons-round" style="font-size:18px;">close</span>`;
  h += `  </button>`;
  h += `</div>`;
  h += `<div class="schedule-rows" onclick="event.stopPropagation()">`;
  schedule.rows.forEach((row, idx) => {
    h += `<div class="schedule-row">`;
    h += `  <input class="form-input schedule-row-label" type="text" value="${esc(row[labelKey] || '')}" placeholder="${esc(t('schedule_row_label'))}" oninput="onScheduleRowLabel('${esc(schedule.key)}', ${idx}, this.value)">`;
    h += `  <input class="form-input schedule-row-pct" type="number" min="0" max="100" step="1" value="${row.pct}" oninput="onScheduleRowPct('${esc(schedule.key)}', ${idx}, this.value)">`;
    h += `  <span class="schedule-row-pct-suffix">%</span>`;
    h += `  <button type="button" class="schedule-row-remove" onclick="removeScheduleRow('${esc(schedule.key)}', ${idx})" title="–">`;
    h += `    <span class="material-icons-round" style="font-size:18px;">remove_circle_outline</span>`;
    h += `  </button>`;
    h += `</div>`;
  });
  h += `</div>`;
  h += `<button type="button" class="btn-link schedule-add-row" onclick="event.stopPropagation(); addScheduleRow('${esc(schedule.key)}')">+ ${esc(t('schedule_add_row'))}</button>`;
  h += `<div class="schedule-total ${totalOk ? 'ok' : 'bad'}">${esc(totalLabel)}</div>`;
  h += `</div>`;
  return h;
}

function selectSchedule(key) {
  selectedPaymentOption = key;
  buildPaymentOptionsUI();
  saveDraft();
}

function onScheduleTitleInput(key, value) {
  const s = findSchedule(key);
  if (!s) return;
  s.title = value;
  persistSchedules();
}

function onScheduleRowLabel(key, idx, value) {
  const s = findSchedule(key);
  if (!s || !s.rows[idx]) return;
  if (lang === 'fr') s.rows[idx].label_fr = value;
  else s.rows[idx].label_en = value;
  // Mirror to the other language if it was empty so the schedule isn't bilingual-broken
  const other = lang === 'fr' ? 'label_en' : 'label_fr';
  if (!s.rows[idx][other]) s.rows[idx][other] = value;
  persistSchedules();
}

function onScheduleRowPct(key, idx, value) {
  const s = findSchedule(key);
  if (!s || !s.rows[idx]) return;
  s.rows[idx].pct = Math.max(0, Math.min(100, parseFloat(value) || 0));
  persistSchedules();
  buildPaymentOptionsUI();
}

function addScheduleRow(key) {
  const s = findSchedule(key);
  if (!s) return;
  s.rows.push({
    label_fr: t('schedule_default_row_fr'),
    label_en: t('schedule_default_row_en'),
    pct: 0
  });
  persistSchedules();
  buildPaymentOptionsUI();
}

function removeScheduleRow(key, idx) {
  const s = findSchedule(key);
  if (!s || !s.rows[idx]) return;
  if (s.rows.length <= 1) return;
  s.rows.splice(idx, 1);
  persistSchedules();
  buildPaymentOptionsUI();
}

function addPaymentSchedule() {
  const key = nextScheduleKey();
  paymentSchedules.push({
    key,
    title: t('schedule_default_title'),
    rows: [
      { label_fr: 'Dépôt',           label_en: 'Deposit',         pct: 25 },
      { label_fr: 'Mi-parcours',     label_en: 'Mid-project',     pct: 50 },
      { label_fr: 'Fin des travaux', label_en: 'Upon completion', pct: 25 }
    ]
  });
  selectedPaymentOption = key;
  persistSchedules();
  buildPaymentOptionsUI();
  saveDraft();
}

function removeSchedule(key) {
  if (paymentSchedules.length <= 1) return;
  paymentSchedules = paymentSchedules.filter(s => s.key !== key);
  if (selectedPaymentOption === key) {
    selectedPaymentOption = paymentSchedules[0].key;
  }
  persistSchedules();
  buildPaymentOptionsUI();
  saveDraft();
}

/* ============================================
   SIGNATURE PAD
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
}

function clearContractorSignature() {
  if (contractorPad) contractorPad.clear();
  contractorSignatureData = null;
  document.getElementById('contractor-sig-placeholder').style.display = '';
  document.getElementById('contractor-sig-status').style.display = 'none';
}

/* ============================================
   DRAFT AUTO-SAVE
   ============================================ */
function buildQuoteRecord(status) {
  readFormIntoState();
  const options = buildOptionsArray();
  const schedule = buildSelectedScheduleSnapshot();
  return {
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
    duration_weeks: quoteState.duration_weeks,
    ai_conversation: {
      source_text: quoteState.scope_summary || '',
      duration_value: quoteState.duration_value,
      duration_unit: quoteState.duration_unit,
      payment_schedule: schedule
    },
    options,
    payment_option: selectedPaymentOption,
    payment_methods: val('f-payment-methods') || null,
    notes: val('f-notes') || null,
    contractor_signature: contractorSignatureData || null,
    contractor_signer_name: contractorSignatureData ? CONTRACTOR.name : null,
    contractor_signed_at: contractorSignatureData
      ? (savedQuote?.contractor_signed_at || new Date().toISOString())
      : null
  };
}

async function saveDraft() {
  if (draftSaveInFlight) return;
  const clientName = val('f-client-name');
  if (!clientName) return;

  draftSaveInFlight = true;
  updateDraftStatus('saving');
  try {
    const customerId = savedQuote?.customer_id || null;
    const record = buildQuoteRecord(savedQuote?.status && savedQuote.status !== 'draft' ? savedQuote.status : 'draft');
    record.customer_id = customerId;
    const saved = await saveQuote(record);
    savedQuote = saved;
    lastSavedAt = new Date();
    updateDraftStatus('saved');
  } catch (err) {
    console.warn('[saveDraft]', err);
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
    if (!data) { showToast(lang === 'fr' ? 'Brouillon introuvable.' : 'Draft not found.'); return; }

    savedQuote = data;
    if (data.language === 'en' || data.language === 'fr') lang = data.language;
    document.getElementById('lang-fr').className = lang === 'fr' ? 'active' : '';
    document.getElementById('lang-en').className = lang === 'en' ? 'active' : '';

    document.getElementById('f-client-name').value    = data.client_name    || '';
    document.getElementById('f-client-email').value   = data.client_email   || '';
    document.getElementById('f-client-phone').value   = data.client_phone   || '';
    document.getElementById('f-client-address').value = data.client_address || '';
    document.getElementById('f-date').value           = data.quote_date     || new Date().toISOString().split('T')[0];
    document.getElementById('f-project-title').value  = data.project_title  || '';

    const opt = Array.isArray(data.options) && data.options[0] ? data.options[0] : null;
    document.getElementById('f-scope').value      = opt?.scope_summary    || (data.ai_conversation?.source_text || '');
    document.getElementById('f-base-price').value = opt?.base_price       || '';

    // Duration: prefer the saved value+unit pair, fall back to weeks-only
    const savedUnit  = opt?.duration_unit  || data.ai_conversation?.duration_unit  || 'weeks';
    const savedValue = opt?.duration_value || data.ai_conversation?.duration_value || opt?.duration_weeks || 2;
    document.getElementById('f-duration').value      = savedValue;
    document.getElementById('f-duration-unit').value = savedUnit;
    setMaterials(opt ? !!opt.materials_included : true);

    // Restore the embedded payment schedule if present (so a quote loaded on
    // a different device still shows the exact schedule the customer saw).
    const embedded = data.ai_conversation?.payment_schedule;
    if (embedded && Array.isArray(embedded.rows)) {
      const idx = paymentSchedules.findIndex(s => s.key === embedded.key);
      if (idx >= 0) paymentSchedules[idx] = embedded;
      else paymentSchedules.push(embedded);
    }
    selectedPaymentOption = data.payment_option || 'A';
    buildPaymentOptionsUI();
    if (data.payment_methods) document.getElementById('f-payment-methods').value = data.payment_methods;
    if (data.notes)           document.getElementById('f-notes').value           = data.notes;
    if (data.contractor_signature) {
      contractorSignatureData = data.contractor_signature;
      if (contractorPad) {
        setTimeout(() => contractorPad.fromDataURL(contractorSignatureData), 50);
        document.getElementById('contractor-sig-placeholder').style.display = 'none';
        document.getElementById('contractor-sig-status').style.display = '';
      }
    }

    applyI18N();
    renderTaxPreview();
    showToast(lang === 'fr' ? 'Brouillon chargé.' : 'Draft loaded.');
  } catch (err) {
    console.error('[loadDraftById]', err);
    showToast('Error: ' + err.message);
  }
}

/* ============================================
   GENERATE / SAVE & SEND
   ============================================ */
async function saveAndSendForSignature() {
  readFormIntoState();
  const clientName = val('f-client-name');
  if (!clientName) { showToast(t('client_name_required')); return; }
  if (!quoteState.scope_summary.trim()) { showToast(t('scope_required')); return; }
  if (quoteState.base_price <= 0) { showToast(t('price_required')); return; }
  if (!contractorSignatureData) { showToast(t('signature_required')); return; }
  const selSched = findSchedule(selectedPaymentOption);
  if (scheduleTotalPct(selSched) !== 100) { showToast(t('schedule_invalid_save')); return; }

  const btn = document.getElementById('btn-save-send');
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner-ring"></span><span>${esc(t('saving'))}</span>`;

  try {
    const customerId = savedQuote?.customer_id || null;
    const options = buildOptionsArray();
    const record = {
      id: savedQuote?.id,
      customer_id: customerId,
      quote_number: savedQuote?.quote_number || generateQuoteNumber(),
      status: 'sent',
      language: lang,
      client_name: clientName,
      client_email: val('f-client-email') || null,
      client_phone: val('f-client-phone') || null,
      client_address: val('f-client-address') || null,
      quote_date: val('f-date') || null,
      project_title: quoteState.project_title || null,
      duration_weeks: quoteState.duration_weeks,
      ai_conversation: {
        source_text: quoteState.scope_summary,
        duration_value: quoteState.duration_value,
        duration_unit: quoteState.duration_unit,
        payment_schedule: buildSelectedScheduleSnapshot()
      },
      options,
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

    document.getElementById('quote-status-card').style.display = '';
    document.getElementById('quote-number-display').textContent = savedQuote.quote_number;
    const pill = document.getElementById('quote-status-pill');
    pill.textContent = (lang === 'fr' ? 'Envoyée' : 'Sent');
    pill.className = 'status-pill sent';

    renderFinalQuote();
    showToast(t('saved'));
    document.getElementById('share-box').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    console.error(err);
    showToast('Erreur: ' + (err.message || err));
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

function copyShareLink() {
  const input = document.getElementById('share-link-input');
  input.select();
  navigator.clipboard.writeText(input.value).then(() => showToast(t('link_copied')));
}

async function sendVia(channel) {
  const btn = document.getElementById(channel === 'sms' ? 'btn-send-sms' : 'btn-send-email');
  const status = document.getElementById('send-status');

  if (!savedQuote?.id) { showToast(lang === 'fr' ? 'Enregistrez d\'abord la soumission.' : 'Save the quote first.'); return; }
  if (channel === 'sms' && !val('f-client-phone')) { showToast(lang === 'fr' ? 'Téléphone client manquant.' : 'Client phone is missing.'); return; }
  if (channel === 'email' && !val('f-client-email')) { showToast(lang === 'fr' ? 'Courriel client manquant.' : 'Client email is missing.'); return; }

  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner-ring"></span><span>${lang === 'fr' ? 'Envoi…' : 'Sending…'}</span>`;
  status.textContent = '';
  status.style.color = 'var(--text-secondary)';

  try {
    const res = await fetch(SUPABASE_URL + '/functions/v1/send-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY },
      body: JSON.stringify({ quote_id: savedQuote.id, channel })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));

    status.style.color = 'var(--green)';
    status.innerHTML = '✓ ' + (channel === 'sms'
      ? (lang === 'fr' ? `SMS envoyé au ${data.to} (SID ${data.sid}).` : `SMS sent to ${data.to} (SID ${data.sid}).`)
      : (lang === 'fr' ? `Courriel envoyé à ${data.to}.` : `Email sent to ${data.to}.`));
    showToast(channel === 'sms'
      ? (lang === 'fr' ? 'SMS envoyé !' : 'SMS sent!')
      : (lang === 'fr' ? 'Courriel envoyé !' : 'Email sent!'));
  } catch (err) {
    console.error('[sendVia ' + channel + ']', err);
    status.style.color = 'var(--red)';
    status.textContent = '⚠️ ' + (err.message || err);
    showToast((lang === 'fr' ? 'Erreur : ' : 'Error: ') + (err.message || err));
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

function sendSmsNow()   { return sendVia('sms'); }
function sendEmailNow() { return sendVia('email'); }

/* ============================================
   FINAL QUOTE PREVIEW
   ============================================ */
function renderFinalQuote() {
  readFormIntoState();
  const name    = val('f-client-name')    || '[—]';
  const address = val('f-client-address') || '[—]';
  const email   = val('f-client-email');
  const phone   = val('f-client-phone');
  const date    = val('f-date');
  const methods = val('f-payment-methods');
  const notes   = val('f-notes');

  const num   = savedQuote?.quote_number || generateQuoteNumber();
  const fr    = lang === 'fr';
  const schedule = findSchedule(selectedPaymentOption);
  const sub   = quoteState.base_price;
  const gst   = round2(sub * 0.05);
  const qst   = round2(sub * 0.09975);
  const total = round2(sub + gst + qst);

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

  h += `<h2>${fr ? 'Détail de la soumission' : 'Quote details'}</h2>`;
  h += '<div class="qp-option-block">';
  h += '<div class="qp-option-head">';
  h += `<div class="qp-option-title"></div>`;
  h += `<div class="qp-option-total">$${money(total)}</div>`;
  h += '</div>';
  if (quoteState.scope_summary) {
    h += `<div style="font-size:13px;color:#3c4043;white-space:pre-wrap;margin-bottom:10px;">${esc(quoteState.scope_summary)}</div>`;
  }
  h += `<div style="font-size:12px;color:#5f6368;margin-bottom:8px;">`;
  h += `<strong>${fr ? 'Durée' : 'Duration'}:</strong> ${esc(durationLabel(quoteState.duration_value, quoteState.duration_unit, fr))} · `;
  h += quoteState.materials_included
    ? `<span class="qp-badge included">${fr ? 'Matériaux inclus' : 'Materials included'}</span>`
    : `<span class="qp-badge excluded">${fr ? 'Matériaux exclus' : 'Materials excluded'}</span>`;
  h += '</div>';

  h += '<div class="qp-totals">';
  h += `<div class="qp-total-row"><span>${fr ? 'Sous-total' : 'Subtotal'}</span><span>$${money(sub)}</span></div>`;
  h += `<div class="qp-total-row"><span>TPS 5%</span><span>$${money(gst)}</span></div>`;
  h += `<div class="qp-total-row"><span>TVQ 9.975%</span><span>$${money(qst)}</span></div>`;
  h += `<div class="qp-total-row qp-grand-total"><span>${fr ? 'Total avec taxes' : 'Total with taxes'}</span><span>$${money(total)}</span></div>`;
  h += '</div>';
  h += '</div>';

  h += `<h2>${fr ? 'Modalités de paiement' : 'Payment Terms'}</h2>`;
  h += `<div class="qp-section">${esc(scheduleDescription(schedule, lang))}</div>`;
  if (methods) { h += `<h2>${fr ? 'Méthodes de paiement' : 'Payment Methods'}</h2><div class="qp-section">${esc(methods)}</div>`; }
  if (notes)   { h += `<h2>${fr ? 'Notes importantes' : 'Important Notes'}</h2><div class="qp-section">${esc(notes)}</div>`; }

  h += '<div class="qp-signature"><div class="qp-sig-col">';
  h += `<div class="qp-sig-img">${contractorSignatureData ? `<img src="${contractorSignatureData}">` : ''}</div>`;
  h += `<div class="qp-sig-line">${fr ? 'Signature — MLP Reno & Design' : 'Signature — MLP Reno & Design'}</div>`;
  h += `<div class="qp-sig-meta">${esc(CONTRACTOR.name)}</div>`;
  h += '</div><div class="qp-sig-col">';
  h += `<div class="qp-sig-img">${savedQuote?.customer_signature ? `<img src="${savedQuote.customer_signature}">` : ''}</div>`;
  h += `<div class="qp-sig-line">${fr ? 'Signature — Client' : 'Signature — Client'}</div>`;
  if (savedQuote?.customer_signer_name) h += `<div class="qp-sig-meta">${esc(savedQuote.customer_signer_name)}</div>`;
  h += '</div></div>';

  h += `<div class="qp-closing">${fr ? 'Merci de votre confiance.' : 'Thank you for your trust.'}</div>`;
  h += '</div>';

  document.getElementById('quote-output').innerHTML = h;
}

/* ============================================
   COPY / PRINT / DRAFT
   ============================================ */
function copyQuote() {
  const el = document.getElementById('quote-output');
  if (!el.innerHTML) renderFinalQuote();
  const text = el.innerText || el.textContent;
  navigator.clipboard.writeText(text).then(() => showToast(lang === 'fr' ? 'Copié !' : 'Copied!'));
}

function printQuote() {
  if (!document.getElementById('quote-output').innerHTML) renderFinalQuote();
  const content = document.getElementById('quote-output').innerHTML;
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Soumission MLP</title>
    <link rel="stylesheet" href="css/tools.css">
    <style>body{background:#fff;padding:24px;}</style></head>
    <body>${content}</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

async function previewAsClient() {
  if (!savedQuote?.share_token) {
    showToast(t('preview_saving'));
    try { await saveDraft(); } catch (_) {}
  }
  if (!savedQuote?.share_token) {
    showToast(lang === 'fr' ? 'Impossible de générer l\'aperçu. Vérifiez les informations du client.' : 'Could not generate preview. Check client info.');
    return;
  }
  window.open(buildShareLink(savedQuote.share_token), '_blank');
}

function downloadDraftPdf() {
  if (!document.getElementById('quote-output').innerHTML) renderFinalQuote();
  const content = document.getElementById('quote-output').innerHTML;
  const watermark = t('draft_watermark');
  const num = savedQuote?.quote_number || '';
  const title = (lang === 'fr' ? 'Brouillon — Soumission MLP' : 'Draft — MLP Quote') + (num ? ' ' + num : '');
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${esc(title)}</title>
    <link rel="stylesheet" href="css/tools.css">
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
  if (!savedQuote?.id) { showToast(lang === 'fr' ? 'Enregistrez d\'abord la soumission.' : 'Save the quote first.'); return; }

  const defaultTo = val('f-client-email') || '';
  const to = (window.prompt(t('draft_prompt_email'), defaultTo) || '').trim();
  if (!to) return;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) { showToast(lang === 'fr' ? 'Courriel invalide.' : 'Invalid email.'); return; }

  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner-ring"></span><span>${lang === 'fr' ? 'Envoi…' : 'Sending…'}</span>`;
  status.textContent = '';
  status.style.color = 'var(--text-secondary)';

  try {
    const res = await fetch(SUPABASE_URL + '/functions/v1/send-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY },
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
