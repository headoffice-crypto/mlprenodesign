/* ============================================
   MLP Portfolio — shared subpage behavior
   ============================================ */
(function () {
    'use strict';

    var yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    var LABELS = { before: 'Avant', after: 'Après' };

    function initBA(el) {
        var imgs    = el.querySelectorAll('[data-role]');
        var buttons = el.querySelectorAll('.ba-toggle button');
        var corner  = el.querySelector('[data-corner]');
        var isFlip  = el.classList.contains('hover-flip');

        function setState(target) {
            el.dataset.state = target;
            imgs.forEach(function (media) {
                var active = media.dataset.role === target;
                media.classList.toggle('is-active', active);
                if (media.tagName === 'VIDEO') {
                    if (active) {
                        var p = media.play();
                        if (p && typeof p.catch === 'function') p.catch(function () {});
                    } else {
                        media.pause();
                        try { media.currentTime = 0; } catch (e) {}
                    }
                }
            });
            buttons.forEach(function (btn) {
                var active = btn.dataset.target === target;
                btn.classList.toggle('is-active', active);
                btn.setAttribute('aria-selected', active ? 'true' : 'false');
            });
            if (corner) corner.textContent = LABELS[target] || target;
        }

        buttons.forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                setState(btn.dataset.target);
            });
        });

        if (isFlip) {
            el.addEventListener('mouseenter', function () {
                el.classList.add('is-touched');
                setState('after');
            });
            el.addEventListener('mouseleave', function () {
                setState('before');
            });
            el.addEventListener('touchstart', function () {
                el.classList.add('is-touched');
                setState(el.dataset.state === 'before' ? 'after' : 'before');
            }, { passive: true });
            el.addEventListener('focus', function () {
                el.classList.add('is-touched');
                setState('after');
            });
            el.addEventListener('blur', function () { setState('before'); });

            setTimeout(function () {
                if (el.classList.contains('is-touched')) return;
                setState('after');
                setTimeout(function () {
                    if (!el.classList.contains('is-touched')) setState('before');
                }, 1400);
            }, 1800);
        }
    }

    document.querySelectorAll('[data-ba]').forEach(initBA);

    /* Reveal on scroll */
    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        document.querySelectorAll('[data-project], .reveal').forEach(function (el) { io.observe(el); });
    } else {
        document.querySelectorAll('[data-project], .reveal').forEach(function (el) { el.classList.add('in-view'); });
    }

    /* ============================================
       Lightbox for thumbnail galleries
       ============================================ */
    var thumbs = Array.prototype.slice.call(document.querySelectorAll('[data-lightbox]'));
    if (thumbs.length === 0) return;

    var lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.innerHTML = '' +
        '<button type="button" class="lightbox-close" aria-label="Fermer">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
        '</button>' +
        '<button type="button" class="lightbox-nav prev" aria-label="Image précédente">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>' +
        '</button>' +
        '<button type="button" class="lightbox-nav next" aria-label="Image suivante">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>' +
        '</button>' +
        '<img class="lightbox-img" alt="">' +
        '<div class="lightbox-counter"></div>';
    document.body.appendChild(lb);

    var lbImg     = lb.querySelector('.lightbox-img');
    var lbCounter = lb.querySelector('.lightbox-counter');
    var lbClose   = lb.querySelector('.lightbox-close');
    var lbPrev    = lb.querySelector('.lightbox-nav.prev');
    var lbNext    = lb.querySelector('.lightbox-nav.next');
    var current   = 0;

    function show(idx) {
        current = (idx + thumbs.length) % thumbs.length;
        var t = thumbs[current];
        var img = t.querySelector('img');
        lbImg.src = t.dataset.full || (img ? img.src : '');
        lbImg.alt = img ? img.alt : '';
        lbCounter.textContent = (current + 1) + ' / ' + thumbs.length;
    }
    function open(idx) {
        show(idx);
        lb.classList.add('is-open');
        document.body.style.overflow = 'hidden';
    }
    function close() {
        lb.classList.remove('is-open');
        document.body.style.overflow = '';
    }

    thumbs.forEach(function (t, i) {
        t.addEventListener('click', function () { open(i); });
        t.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); }
        });
        t.setAttribute('tabindex', '0');
        t.setAttribute('role', 'button');
    });

    lbClose.addEventListener('click', close);
    lbPrev.addEventListener('click', function () { show(current - 1); });
    lbNext.addEventListener('click', function () { show(current + 1); });
    lb.addEventListener('click', function (e) {
        if (e.target === lb) close();
    });
    document.addEventListener('keydown', function (e) {
        if (!lb.classList.contains('is-open')) return;
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowLeft') show(current - 1);
        else if (e.key === 'ArrowRight') show(current + 1);
    });
})();
