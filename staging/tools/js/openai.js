/* ============================================
   No-op shim. The quote builder no longer uses GPT.
   This file is kept so that cached HTML still resolves the script tag
   without a 404 during the rollout. Safe to delete after a release or two.
   MLP Reno & Design
   ============================================ */
window.__openaiShimVersion = 'noop';
