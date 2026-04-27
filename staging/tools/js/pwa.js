/* PWA bootstrap: register service worker + offer "install" prompt on supported browsers. */
(function () {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(err => {
        console.warn('[pwa] SW registration failed:', err);
      });
    });
  }

  // iOS Safari does not fire beforeinstallprompt — users add via Share → Add to Home Screen.
  // For Android/desktop Chrome / Edge we capture the event and expose a small "Installer" button
  // that other pages can show by adding an element with id="install-app".
  let deferred = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferred = e;
    const btn = document.getElementById('install-app');
    if (btn) {
      btn.style.display = '';
      btn.addEventListener('click', async () => {
        if (!deferred) return;
        deferred.prompt();
        const { outcome } = await deferred.userChoice;
        console.log('[pwa] install outcome:', outcome);
        deferred = null;
        btn.style.display = 'none';
      }, { once: true });
    }
  });

  window.addEventListener('appinstalled', () => {
    console.log('[pwa] installed');
    const btn = document.getElementById('install-app');
    if (btn) btn.style.display = 'none';
  });
})();
