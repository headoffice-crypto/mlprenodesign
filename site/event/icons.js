/**
 * MLP_ICONS — tight, monoline SVG icon set.
 *
 * All icons use:
 *   - 24×24 viewBox
 *   - currentColor (so they inherit text color)
 *   - 1.6 stroke width, round caps & joins
 *
 * Usage:
 *   window.MLP_ICONS.svg('home')                 -> raw <svg> string
 *   window.MLP_ICONS.svg('home', { size: 32 })   -> sized
 *   window.MLP_ICONS.svg('home', { class: 'icon-xl' })
 */
(function (global) {
  const I = {};

  // Segment / persona
  I.home = `<path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>`;
  I.key  = `<circle cx="9" cy="13" r="4"/><path d="M13 13h8"/><path d="M19 13v3"/><path d="M16 13v2"/>`;
  I.trendingUp = `<path d="M3 17 9 11l4 4 8-8"/><path d="M14 4h7v7"/>`;

  // Tools / actions
  I.monitor    = `<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>`;
  I.compass    = `<circle cx="12" cy="12" r="9"/><path d="m15 9-2.5 5.5L7 17l2.5-5.5L15 9z"/>`;
  I.mic        = `<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/><path d="M8 21h8"/>`;
  I.image      = `<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m3 17 5-5 4 4 3-3 6 6"/>`;
  I.calendar   = `<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M8 3v4M16 3v4"/>`;
  I.chart      = `<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 17v-5M12 17V8M16 17v-3"/>`;
  I.qr         = `<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3z"/><path d="M20 14v3M14 20h7M20 20v1"/>`;
  I.edit       = `<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>`;
  I.trash      = `<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M5 6v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6"/><path d="M10 11v6M14 11v6"/>`;
  I.gift       = `<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9"/><path d="M12 8v13"/><path d="M12 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/><path d="M12 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>`;
  I.trophy     = `<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 6H5a2 2 0 0 0 2 5"/><path d="M16 6h3a2 2 0 0 1-2 5"/><path d="M10 14h4l-1 4h-2l-1-4z"/><path d="M8 21h8"/>`;

  // Navigation
  I.arrowRight = `<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>`;
  I.arrowLeft  = `<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>`;
  I.check      = `<path d="m5 12 5 5 9-11"/>`;
  I.x          = `<path d="M6 6l12 12M18 6 6 18"/>`;
  I.play       = `<path d="M6 4v16l14-8z"/>`;
  I.pause      = `<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>`;
  I.fullscreen = `<path d="M4 9V4h5"/><path d="M20 9V4h-5"/><path d="M4 15v5h5"/><path d="M20 15v5h-5"/>`;
  I.chevronLeft  = `<path d="m15 6-6 6 6 6"/>`;
  I.chevronRight = `<path d="m9 6 6 6-6 6"/>`;

  // Communication
  I.phone      = `<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.81.33 1.6.6 2.36a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.72-1.17a2 2 0 0 1 2.11-.45c.76.27 1.55.48 2.36.6A2 2 0 0 1 22 16.92z"/>`;
  I.mail       = `<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>`;
  I.send       = `<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/>`;
  I.mapPin     = `<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>`;

  // Meta
  I.sparkle    = `<path d="m12 3 1.8 4.5L18 9l-4.2 1.5L12 15l-1.8-4.5L6 9l4.2-1.5L12 3z"/><path d="M19 14v3M17.5 15.5h3"/>`;
  I.shieldCheck = `<path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z"/><path d="m9 12 2 2 4-4"/>`;
  I.clock      = `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`;
  I.bolt       = `<path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/>`;
  I.refresh    = `<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>`;
  I.user       = `<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>`;
  I.users      = `<circle cx="9" cy="8" r="4"/><path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1"/><path d="M17 11a4 4 0 0 0 0-8"/><path d="M22 21v-1a6 6 0 0 0-4-5.7"/>`;
  I.search     = `<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>`;
  I.download   = `<path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/>`;
  I.printer    = `<rect x="6" y="3" width="12" height="6"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>`;
  I.list       = `<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4" cy="6" r="1.2"/><circle cx="4" cy="12" r="1.2"/><circle cx="4" cy="18" r="1.2"/>`;
  I.filter     = `<path d="M3 4h18l-7 9v6l-4 2v-8L3 4z"/>`;
  I.cog        = `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>`;

  // Layered / decorative
  I.dollar     = `<path d="M12 2v20"/><path d="M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>`;
  I.target     = `<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>`;
  I.layers     = `<path d="m12 2 10 6-10 6L2 8l10-6z"/><path d="m2 16 10 6 10-6"/><path d="m2 12 10 6 10-6"/>`;
  I.briefcase  = `<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M2 13h20"/>`;
  I.bath       = `<path d="M3 13h18v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-4z"/><path d="M5 13V7a3 3 0 1 1 6 0"/><path d="M5 20v2M19 20v2"/>`;
  I.chefHat    = `<path d="M6 13v7h12v-7"/><path d="M6 13a4 4 0 0 1 4-7 4 4 0 0 1 4 0 4 4 0 0 1 4 7"/>`;

  function svg(name, opts) {
    const body = I[name];
    if (!body) return '';
    opts = opts || {};
    const size  = opts.size  ? `width="${opts.size}" height="${opts.size}"` : 'width="20" height="20"';
    const cls   = opts.class ? `class="icon ${opts.class}"`                  : 'class="icon"';
    return `<svg ${size} ${cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  }

  global.MLP_ICONS = { svg, set: I };
})(window);
