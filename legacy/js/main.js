/* ============================================================
   SPARK — Brake & Parts Cleaner
   Page motion: GSAP ScrollTrigger + Lenis. The opening product
   experience lives in js/experience.js.
   Degrades to a clean static page if the vendored libraries fail
   or the visitor prefers reduced motion.
   ============================================================ */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  var hasGSAP   = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var reduced   = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var LIVE      = hasGSAP && !reduced;

  if (!LIVE) document.body.classList.add('no-motion');

  /* ==================================================================
     0. Small always-on bits
     ================================================================== */
  var yr = $('#yr');
  if (yr) yr.textContent = new Date().getFullYear();

  // a scroll-driven scene must always start at act one
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('beforeunload', function () { window.scrollTo(0, 0); });

  /* ==================================================================
     1. Preloader
     ================================================================== */
  (function preloader () {
    var loader = $('#loader');
    var fill   = $('#loaderFill');
    var pct    = $('#loaderPct');
    if (!loader) return;

    var p = 0, done = false;
    var tick = setInterval(function () {
      p += Math.random() * 9 + 3;
      if (p > 92) p = 92;
      paint(p);
    }, 110);

    function paint (v) {
      if (fill) fill.style.width = v.toFixed(0) + '%';
      if (pct)  pct.textContent = v.toFixed(0);
    }

    function finish () {
      if (done) return;
      done = true;
      clearInterval(tick);
      paint(100);
      setTimeout(function () {
        loader.classList.add('is-done');
        document.body.classList.remove('is-loading');
        if (LIVE) window.ScrollTrigger.refresh();
      }, 420);
    }

    var ready = [];
    if (document.fonts && document.fonts.ready) ready.push(document.fonts.ready);
    ready.push(new Promise(function (res) {
      if (document.readyState === 'complete') res();
      else window.addEventListener('load', res, { once: true });
    }));

    Promise.all(ready.map(function (q) { return Promise.resolve(q)['catch'](function () {}); })).then(finish);
    setTimeout(finish, 6000); // never trap the visitor behind a slow font
  })();

  /* ==================================================================
     2. Nav + scroll progress
     ================================================================== */
  (function chrome () {
    var nav = $('#nav');
    var bar = $('#progressBar');
    var burger = $('#navBurger');
    var last = 0;

    if (burger && nav) {
      var toggle = function (open) {
        nav.classList.toggle('is-open', open);
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
        burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      };
      burger.addEventListener('click', function () { toggle(!nav.classList.contains('is-open')); });
      $$('.nav__links a').forEach(function (a) {
        a.addEventListener('click', function () { toggle(false); });
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && nav.classList.contains('is-open')) toggle(false);
      });
    }

    function onScroll () {
      var y = window.pageYOffset || document.documentElement.scrollTop;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.width = (max > 0 ? (y / max) * 100 : 0).toFixed(2) + '%';
      if (nav) {
        nav.classList.toggle('is-solid', y > 40);
        nav.classList.toggle('is-hidden', y > 400 && y > last && !nav.classList.contains('is-open'));
      }
      last = y;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  })();

  /* ==================================================================
     3. Before / after comparison (works with or without GSAP)
     ================================================================== */
  (function compare () {
    var ba     = $('#ba');
    var handle = $('#baHandle');
    if (!ba || !handle) return;

    var touched = false;

    function set (pctVal, byUser) {
      var v = clamp(pctVal, 2, 98);
      ba.style.setProperty('--split', v + '%');
      handle.setAttribute('aria-valuenow', Math.round(v));
      if (byUser) touched = true;
    }
    set(50);
    ba.__set = set;
    ba.__touched = function () { return touched; };

    function fromEvent (e) {
      var r = ba.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      set((x / r.width) * 100, true);
    }

    var dragging = false;
    function down (e) { dragging = true; fromEvent(e); e.preventDefault(); }
    function move (e) { if (dragging) fromEvent(e); }
    function up ()    { dragging = false; }

    ba.addEventListener('mousedown', down);
    ba.addEventListener('touchstart', down, { passive: false });
    window.addEventListener('mousemove', move, { passive: true });
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('mouseup', up);
    window.addEventListener('touchend', up);

    handle.addEventListener('keydown', function (e) {
      var cur = parseFloat(handle.getAttribute('aria-valuenow')) || 50;
      if (e.key === 'Home') { set(2, true); e.preventDefault(); }
      if (e.key === 'End') { set(98, true); e.preventDefault(); }
      if (e.key === 'ArrowLeft')  { set(cur - 4, true); e.preventDefault(); }
      if (e.key === 'ArrowRight') { set(cur + 4, true); e.preventDefault(); }
    });
  })();

  /* ==================================================================
     4. Static fallback stops here
     ================================================================== */
  if (!LIVE) {
    $$('[data-count]').forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
    return;
  }

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  /* ==================================================================
     5. Smooth scroll
     ================================================================== */
  (function smooth () {
    if (typeof window.Lenis === 'undefined') return;
    var lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 1, smoothWheel: true, smoothTouch: false });
    window.lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);

    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (!id || id === '#') return;
        var t = document.querySelector(id);
        if (!t) return;
        e.preventDefault();
        lenis.scrollTo(t, { offset: -40, duration: 1.2 });
      });
    });
  })();

  /* ==================================================================
     6. Before / after scroll scrub
     ================================================================== */
  (function proofScrub () {
    var ba = $('#ba');
    if (!ba || !ba.__set) return;
    var o = { v: 14 };
    gsap.to(o, {
      v: 82,
      ease: 'none',
      scrollTrigger: { trigger: '.proof', start: 'top 70%', end: 'bottom bottom', scrub: 1 },
      onUpdate: function () { if (!ba.__touched()) ba.__set(o.v); }
    });
  })();

  /* ==================================================================
     7. Pillars — horizontal pinned scroll
     ================================================================== */
  (function pillars () {
    var track = $('#pillarsTrack');
    var sec   = $('#pillars');
    if (!track || !sec) return;

    gsap.to(track, {
      x: function () { return -(track.scrollWidth - window.innerWidth + 40); },
      ease: 'none',
      scrollTrigger: {
        trigger: sec,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.8,
        invalidateOnRefresh: true
      }
    });

    $$('.pillar', track).forEach(function (p) {
      gsap.from(p, {
        opacity: 0, y: 60, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: sec, start: 'top 80%', once: true },
        delay: 0.08 * $$('.pillar', track).indexOf(p)
      });
    });
  })();

  /* ==================================================================
     8. Counters
     ================================================================== */
  (function counters () {
    $$('[data-count]').forEach(function (el) {
      var target = parseFloat(el.getAttribute('data-count')) || 0;
      var o = { v: 0 };
      ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once: true,
        onEnter: function () {
          gsap.to(o, {
            v: target, duration: 1.8, ease: 'power2.out',
            onUpdate: function () { el.textContent = Math.round(o.v); }
          });
        }
      });
    });
  })();

  /* ==================================================================
     9. Generic reveals
     ================================================================== */
  (function reveals () {
    var applicationImage = $('.application-story img');
    if (applicationImage) gsap.fromTo(applicationImage, {scale: 1.06}, {
      scale: 1, ease: 'none',
      scrollTrigger: {trigger: '.application-story', start: 'top bottom', end: 'bottom top', scrub: 1}
    });
    var sel = ['.sec-head__num', '.sec-head__title', '.sec-head__lede',
               '.app-card', '.spec-list > div', '.hz', '.hz-title',
               '.cta__eyebrow', '.cta__title', '.cta__lede', '.cta__actions',
               '.stat', '.foot__row'].join(',');

    $$(sel).forEach(function (el, i) {
      gsap.from(el, {
        opacity: 0, y: 40, duration: 0.9, ease: 'power3.out',
        delay: (i % 4) * 0.07,
        scrollTrigger: { trigger: el, start: 'top 90%', once: true }
      });
    });
  })();

  /* ==================================================================
     10. Pack Gallery Lightbox Modal
     ================================================================== */
  (function packModal() {
    var modal = $('#packModal');
    var modalImg = $('#packModalImg');
    var modalCaption = $('#packModalCaption');
    var closeBtn = $('#packModalClose');
    if (!modal || !modalImg) return;

    function open(src, caption) {
      modalImg.src = src;
      if (modalCaption) modalCaption.textContent = caption || '';
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      setTimeout(function() { modalImg.src = ''; }, 300);
    }

    $$('.pack-gallery figure a').forEach(function(a) {
      a.addEventListener('click', function(e) {
        e.preventDefault();
        var cap = a.closest('figure').querySelector('figcaption span');
        open(a.getAttribute('href'), cap ? cap.textContent : 'SPARK Packaging');
      });
    });

    if (closeBtn) closeBtn.addEventListener('click', close);
    modal.addEventListener('click', function(e) {
      if (e.target === modal) close();
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) close();
    });
  })();

  /* refresh once everything has settled */
  window.addEventListener('load', function () { setTimeout(function () { ScrollTrigger.refresh(); }, 300); });
})();
