/**
 * Shared runtime for the MLP event ecosystem (v2 — simplified).
 *
 * Storage:  localStorage (per-device). Optional real-time mirror via
 *           Supabase Edge Function -> Twilio SMS + Resend email.
 *
 * Three segments. Three primary giveaways. Three bonus giveaways.
 * Linear flow: diagnostic -> presentation -> form -> CRM.
 */
(function (global) {
  const STORAGE_LEADS    = 'mlp_event_leads_v2';
  const STORAGE_WINNERS  = 'mlp_event_winners_v2';
  const STORAGE_SEGMENT  = 'mlp_event_segment_v2';
  const STORAGE_FUNNEL   = 'mlp_event_funnel_v2';
  const STORAGE_OPS      = 'mlp_event_ops_v2';

  /* ---------- Supabase config (same project as the quote tool) ---------- */

  const SUPABASE_URL      = 'https://lhewggoajbccegpowkas.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_pKoh315uCCLBMxY0EFSf9g_MyS1nQ_F';
  const NOTIFY_ENDPOINT   = SUPABASE_URL + '/functions/v1/send-event-lead';
  const LIST_ENDPOINT     = SUPABASE_URL + '/functions/v1/list-event-leads';
  const UPDATE_ENDPOINT   = SUPABASE_URL + '/functions/v1/update-event-lead';
  const DELETE_ENDPOINT   = SUPABASE_URL + '/functions/v1/delete-event-lead';

  function _sbHeaders(json) {
    const h = {
      apikey:        SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
    };
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }

  /* Fetch all event leads stored in Supabase. Used by /admin so the operator
     sees leads from every device that submitted the QR form, not just leads
     stored in this browser's localStorage. */
  async function fetchEventLeads() {
    const r = await fetch(LIST_ENDPOINT, { headers: _sbHeaders(false) });
    if (!r.ok) throw new Error('list-event-leads ' + r.status);
    const data = await r.json();
    return Array.isArray(data.leads) ? data.leads : [];
  }

  /* Patch a remote lead. `lead` should contain the full desired state — the
     edge function rebuilds the metadata block from scratch. */
  async function updateEventLead(customerId, lead) {
    const r = await fetch(UPDATE_ENDPOINT, {
      method: 'POST',
      headers: _sbHeaders(true),
      body: JSON.stringify({ customerId, lead }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'update-event-lead ' + r.status);
    return data;
  }

  async function deleteEventLead(customerId) {
    const r = await fetch(DELETE_ENDPOINT, {
      method: 'POST',
      headers: _sbHeaders(true),
      body: JSON.stringify({ customerId }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'delete-event-lead ' + r.status);
    return data;
  }

  /* ---------- Segments (3 — used to be 10) ---------- */

  const SEGMENTS = {
    proprietaire: {
      label:        'Propriétaire',
      tagline:      'J\'ai déjà une maison ou un immeuble et je veux en tirer plus.',
      icon:         'home',          // → MLP_ICONS.svg('home')
      presentation: '/presentation/proprietaire',
      primaryPrize: 'design',
    },
    acheteur: {
      label:        'Acheteur',
      tagline:      'Je veux acheter — première propriété ou propriété supplémentaire.',
      icon:         'key',
      presentation: '/presentation/acheteur',
      primaryPrize: 'evaluation',
    },
    investisseur: {
      label:        'Investisseur',
      tagline:      'Je veux acquérir, optimiser ou agrandir un portefeuille.',
      icon:         'trendingUp',
      presentation: '/presentation/investisseur',
      primaryPrize: 'investissement',
    },
  };

  /* ---------- Giveaways ---------- */

  const GIVEAWAYS = {
    // Primary — tied to a segment, only that segment competes
    evaluation:     { title: "Évaluation gratuite d'une propriété", value: 500,  short: 'Évaluation propriété',  tier: 'primary', segment: 'acheteur' },
    design:         { title: "Consultation de design rénovation",   value: 1000, short: 'Consultation design',   tier: 'primary', segment: 'proprietaire' },
    investissement: { title: "Consultation investissement immo",    value: 1500, short: 'Consultation invest.',  tier: 'primary', segment: 'investisseur' },
    // Bonus — open to all leads
    faisabilite:    { title: "Étude de faisabilité municipale",     value: 750,  short: 'Étude faisabilité',     tier: 'bonus' },
    vanite:         { title: "Vanité de salle de bain offerte",     value: 1000, short: 'Vanité salle de bain',  tier: 'bonus' },
    cuisine:        { title: "Îlot de cuisine offert",              value: 2000, short: 'Îlot de cuisine',       tier: 'bonus' },
  };

  /* ---------- Regions (Greater Montréal) ---------- */
  const REGIONS = {
    montreal:  { label: 'Montréal' },
    rivesud:   { label: 'Rive-Sud' },
    rivenord:  { label: 'Rive-Nord' },
  };
  const LEAD_GOAL = 100;

  /* ---------- Lead CRUD ---------- */

  function uid()    { return 'L' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,6).toUpperCase(); }
  function nowISO() { return new Date().toISOString(); }
  function readJSON(k, f)  { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch { return f; } }
  function writeJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

  function getLeads()    { return readJSON(STORAGE_LEADS, []); }
  function saveLeads(l)  { writeJSON(STORAGE_LEADS, l); }

  function computeScore(l) {
    let s = 0;
    if (l.email) s += 20;
    if (l.phone) s += 25;
    if (l.name)  s += 10;
    if (l.notes && l.notes.length > 20) s += 15;
    if (l.segment === 'investisseur')   s += 25;
    if (l.segment === 'proprietaire')   s += 15;
    if (l.source === 'consultation')    s += 25;
    return Math.min(s, 100);
  }

  function addLead(input) {
    const segment = input.segment || readJSON(STORAGE_SEGMENT, null) || 'proprietaire';
    const seg = SEGMENTS[segment] || SEGMENTS.proprietaire;
    const region = REGIONS[input.region] ? input.region : '';

    const lead = {
      id:          uid(),
      createdAt:   nowISO(),
      name:        (input.name  || '').trim(),
      email:       (input.email || '').trim(),
      phone:       (input.phone || '').trim(),
      city:        (input.city  || '').trim(),
      notes:       (input.notes || '').trim(),
      segment,
      region,
      giveawayKey: seg.primaryPrize,
      source:      input.source || 'event-booth',
      consent:     input.consent !== false,
      status:      'nouveau',
      winner:      false,
      notified:    null,
    };
    lead.score = computeScore(lead);

    const list = getLeads();
    list.push(lead);
    saveLeads(list);

    notifyLead(lead).catch(() => {}); // fire-and-forget; UI does not block
    return lead;
  }

  function updateLead(id, patch) {
    const list = getLeads();
    const i = list.findIndex(l => l.id === id);
    if (i === -1) return null;
    list[i] = Object.assign({}, list[i], patch);
    saveLeads(list);
    return list[i];
  }
  function deleteLead(id) { saveLeads(getLeads().filter(l => l.id !== id)); }

  /* ---------- Ops settings (operator phone/email + toggles) ---------- */

  const DEFAULT_OPS = {
    opsName:  'David',
    opsPhone: '4505008936',
    opsEmail: 'headoffice@mlpexperience.com',
    notifyOpsSms:    true,    // text the operator every new lead
    notifyOpsEmail:  true,    // email the operator every new lead
    notifyLeadSms:   false,   // text the lead a thank-you (off by default during testing)
    notifyLeadEmail: false,   // email the lead a thank-you
    dryRun:          false,   // when true, edge function logs but does not send
  };
  function getOps()    { return Object.assign({}, DEFAULT_OPS, readJSON(STORAGE_OPS, {})); }
  function saveOps(p)  { writeJSON(STORAGE_OPS, Object.assign({}, getOps(), p)); }

  async function notifyLead(lead) {
    const ops = getOps();
    if (!ops.notifyOpsSms && !ops.notifyOpsEmail && !ops.notifyLeadSms && !ops.notifyLeadEmail) return;

    const giveaway = GIVEAWAYS[lead.giveawayKey] || {};
    const segment  = SEGMENTS[lead.segment] || {};
    const region   = REGIONS[lead.region]   || {};

    const payload = {
      lead: {
        id:          lead.id,
        name:        lead.name,
        phone:       lead.phone,
        email:       lead.email,
        city:        lead.city,
        notes:       lead.notes,
        score:       lead.score,
        source:      lead.source,
        segment:     lead.segment,
        segmentLabel: segment.label,
        region:       lead.region,
        regionLabel:  region.label,
        giveawayKey:   lead.giveawayKey,
        giveawayTitle: giveaway.title,
        giveawayValue: giveaway.value,
      },
      ops: {
        name:  ops.opsName,
        phone: ops.opsPhone,
        email: ops.opsEmail,
      },
      flags: {
        notifyOpsSms:    !!ops.notifyOpsSms,
        notifyOpsEmail:  !!ops.notifyOpsEmail,
        notifyLeadSms:   !!ops.notifyLeadSms,
        notifyLeadEmail: !!ops.notifyLeadEmail,
        dryRun:          !!ops.dryRun,
      },
    };

    const res = await fetch(NOTIFY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey':        SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    updateLead(lead.id, { notified: { at: nowISO(), ok: res.ok, result: data } });
    return data;
  }

  async function sendTestNotification() {
    const fakeLead = {
      id: 'TEST-' + Date.now(),
      createdAt: nowISO(),
      name:    'Test — Jean Tremblay',
      phone:   getOps().opsPhone,
      email:   getOps().opsEmail,
      city:    'Montréal',
      notes:   'Lead de test envoyé depuis /admin pour vérifier Twilio + Resend.',
      segment: 'proprietaire',
      giveawayKey: 'design',
      source:  'test',
      score:   85,
    };
    return notifyLead(fakeLead);
  }

  /* ---------- Segment / funnel ---------- */

  function setSegment(s) { writeJSON(STORAGE_SEGMENT, s); }
  function getSegment()  { return readJSON(STORAGE_SEGMENT, null); }
  function clearSegment(){ try { localStorage.removeItem(STORAGE_SEGMENT); } catch {} }

  function trackStep(s) {
    const f = readJSON(STORAGE_FUNNEL, {});
    f[s] = (f[s] || 0) + 1;
    writeJSON(STORAGE_FUNNEL, f);
  }
  function getFunnel() { return readJSON(STORAGE_FUNNEL, {}); }

  /* ---------- Winners (primary by segment, bonus from all) ---------- */

  function getWinners() { return readJSON(STORAGE_WINNERS, {}); }
  function drawWinners() {
    const leads = getLeads();
    const results = {};
    Object.entries(GIVEAWAYS).forEach(([key, g]) => {
      const pool = g.tier === 'primary'
        ? leads.filter(l => l.segment === g.segment && !l.winner)
        : leads.filter(l => !l.winner);
      if (pool.length === 0) { results[key] = null; return; }
      const w = pool[Math.floor(Math.random() * pool.length)];
      results[key] = { leadId: w.id, name: w.name, city: w.city, phone: w.phone, drawnAt: nowISO() };
      updateLead(w.id, { winner: true });
    });
    writeJSON(STORAGE_WINNERS, results);
    return results;
  }
  function clearWinners() {
    writeJSON(STORAGE_WINNERS, {});
    saveLeads(getLeads().map(l => Object.assign({}, l, { winner: false })));
  }

  /* ---------- Export ---------- */

  function exportCSV() {
    const leads = getLeads();
    const head = ['id','createdAt','name','email','phone','city','region','segment','giveaway','source','score','status','winner','notes'];
    const rows = leads.map(l => head.map(h => {
      let v = h === 'giveaway' ? (l.giveawayKey || '') : l[h];
      if (v === undefined || v === null) v = '';
      v = String(v).replace(/"/g, '""');
      if (/[",\n]/.test(v)) v = '"' + v + '"';
      return v;
    }).join(','));
    const csv = [head.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0,16).replace(/[:T]/g,'-');
    a.href = url; a.download = `mlp-leads-${stamp}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function wipeAll() {
    [STORAGE_LEADS, STORAGE_WINNERS, STORAGE_SEGMENT, STORAGE_FUNNEL].forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });
  }

  /* ---------- Shared chrome ---------- */

  function renderHeader(opts) {
    opts = opts || {};
    // For operator pages, opts.operator===true links the brand back to /event-dashboard.
    // For lead-facing pages (default), the brand links to the public homepage so leads
    // can't navigate into the operator workspace from the QR-landed flow.
    const href = opts.operator ? '/event-dashboard' : '/';
    return `
      <header class="ev-header">
        <a class="ev-brand" href="${href}" style="text-decoration:none;color:inherit;">
          <div class="ev-logo">M</div>
          <div>
            <div class="ev-brand-name">MLP</div>
            <div class="ev-brand-sub">Gestion · Accompagnement · Rénovation</div>
          </div>
        </a>
        ${opts.tag ? `<div class="ev-tag">${opts.tag}</div>` : ''}
      </header>`;
  }
  function renderFooter() {
    return `<footer class="ev-footer">MLP Reno &amp; Design · (450) 500-8936 · mlprenodesign.ca</footer>`;
  }

  /* ---------- Before/After toggle auto-init ----------
     Any element with `.ba-toggle` (containing two images) gets a click-to-flip
     behavior PLUS an automatic flip every ~4 seconds so the operator never
     has to touch it. Only one image is ever visible.
  */
  function initBaToggles(root) {
    (root || document).querySelectorAll('.ba-toggle').forEach(el => {
      if (el.dataset.baInit) return;
      el.dataset.baInit = '1';

      const tabs = el.querySelectorAll('.ba-tab');
      const imgs = el.querySelectorAll('.ba-stage img');
      const setState = (state) => {
        tabs.forEach(t => t.classList.toggle('is-active', t.dataset.state === state));
        imgs.forEach(i => i.classList.toggle('is-active', i.dataset.state === state));
      };

      tabs.forEach(t => t.addEventListener('click', (e) => {
        clearInterval(el._autoFlip);
        setState(t.dataset.state);
        // Resume auto-flip after a pause so user has time to look
        setTimeout(() => startAutoFlip(), 6000);
      }));

      function startAutoFlip() {
        clearInterval(el._autoFlip);
        el._autoFlip = setInterval(() => {
          const cur = el.querySelector('.ba-tab.is-active')?.dataset.state || 'before';
          setState(cur === 'before' ? 'after' : 'before');
        }, 4000);
      }

      // Default: show "Avant" first.
      setState('before');
      startAutoFlip();
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initBaToggles());
  } else {
    initBaToggles();
  }

  /* ---------- Phase detector (drives the autopilot dashboard) ---------- */

  function currentPhase(now) {
    now = now || new Date();
    const m = now.getHours() * 60 + now.getMinutes();
    if (m < 18 * 60)        return { id: 'preparation', label: 'Avant l\'événement' };
    if (m < 18 * 60 + 45)   return { id: 'preparation', label: 'Installation du booth' };
    if (m < 21 * 60)        return { id: 'booth',       label: 'Booth en service' };
    if (m < 21 * 60 + 30)   return { id: 'stage',       label: 'Présentation sur scène' };
    if (m < 23 * 60 + 30)   return { id: 'after',       label: 'Après la présentation' };
    return { id: 'wrap', label: 'Lendemain — CRM' };
  }

  global.MLP_EVENT = {
    SUPABASE_URL, SUPABASE_ANON_KEY,
    SEGMENTS, GIVEAWAYS, REGIONS, LEAD_GOAL,
    addLead, updateLead, deleteLead, getLeads, computeScore,
    fetchEventLeads, updateEventLead, deleteEventLead,
    setSegment, getSegment, clearSegment,
    drawWinners, getWinners, clearWinners,
    exportCSV, trackStep, getFunnel, wipeAll,
    renderHeader, renderFooter,
    getOps, saveOps, sendTestNotification, notifyLead,
    currentPhase, initBaToggles,
  };
})(window);
