/* ============================================================
   SPARK — privacy choices
   Google Analytics and Google Tag Manager load only after a visitor
   accepts. Nothing from Google is requested before that, and declining
   (or ignoring the banner) leaves them off. The choice lives in this
   browser's local storage, not in a cookie, and is asked again after
   12 months. Vercel Web Analytics is cookie-free and aggregated, so it
   is not gated (see /privacy).

   To change a tag id, change it here only; the pages no longer carry
   their own copies of the Google snippets.
   ============================================================ */
(function () {
  'use strict';

  var GA_ID = 'G-R41JT9PP5W';
  var GTM_ID = 'GTM-KS6Z4S7H';
  var KEY = 'spark-consent';
  var MAX_AGE = 365 * 24 * 60 * 60 * 1000;

  var loaded = false;
  var banner = null;
  var opener = null;

  /* Google's consent signals start denied on every page, before any tag. */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  });

  /* ---------- stored choice ---------- */
  function readChoice() {
    try {
      var v = JSON.parse(window.localStorage.getItem(KEY));
      if (v && typeof v.analytics === 'boolean' && Date.now() - v.t < MAX_AGE) return v.analytics;
    } catch (e) { /* storage blocked or unreadable: treat as no choice */ }
    return null;
  }
  function saveChoice(analytics) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ v: 1, analytics: analytics, t: Date.now() }));
    } catch (e) { /* the choice simply will not persist */ }
  }

  /* ---------- Google tags ---------- */
  function addScript(src) {
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }
  function loadGoogle() {
    window['ga-disable-' + GA_ID] = false;
    gtag('consent', 'update', { analytics_storage: 'granted' });
    if (loaded) return;
    loaded = true;
    gtag('js', new Date());
    gtag('config', GA_ID);
    addScript('https://www.googletagmanager.com/gtag/js?id=' + GA_ID);
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    addScript('https://www.googletagmanager.com/gtm.js?id=' + GTM_ID);
  }
  function clearGoogleCookies() {
    var parts = location.hostname.split('.');
    var hosts = [location.hostname, '.' + location.hostname];
    if (parts.length > 2) hosts.push('.' + parts.slice(-2).join('.'));
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (!/^(_ga|_gid|_gat|_gcl_)/.test(name)) return;
      hosts.concat(['']).forEach(function (h) {
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (h ? '; domain=' + h : '');
      });
    });
  }
  function stopGoogle() {
    window['ga-disable-' + GA_ID] = true;
    gtag('consent', 'update', { analytics_storage: 'denied' });
    clearGoogleCookies();
  }

  /* ---------- banner ---------- */
  function buildBanner() {
    var el = document.createElement('section');
    el.className = 'consent';
    el.id = 'consent';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-labelledby', 'consent-title');
    el.hidden = true;
    el.innerHTML =
      '<h2 class="consent__title" id="consent-title" tabindex="-1">Your privacy choices</h2>' +
      '<p class="consent__text">We use Google Analytics and Google Tag Manager to see which pages are used, so we can improve this site. They set cookies only if you accept. Declining changes nothing else. <a href="/privacy">Read our privacy policy</a>.</p>' +
      '<p class="consent__status" id="consent-status" role="status"></p>' +
      '<div class="consent__actions">' +
        '<button type="button" class="consent__btn consent__btn--accept" data-choice="accept">Accept analytics</button>' +
        '<button type="button" class="consent__btn" data-choice="decline">Decline</button>' +
      '</div>';
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-choice]');
      if (!b) return;
      if (b.getAttribute('data-choice') === 'accept') {
        saveChoice(true);
        loadGoogle();
      } else {
        saveChoice(false);
        if (loaded) stopGoogle();
      }
      hide();
    });
    document.body.appendChild(el);
    return el;
  }
  function show(fromUser) {
    if (!banner) banner = buildBanner();
    var status = banner.querySelector('#consent-status');
    var current = readChoice();
    status.textContent = fromUser && current !== null
      ? 'Your current choice: analytics ' + (current ? 'accepted' : 'declined') + '.'
      : '';
    banner.hidden = false;
    if (fromUser) banner.querySelector('#consent-title').focus();
  }
  function hide() {
    if (banner) banner.hidden = true;
    if (opener && document.contains(opener)) opener.focus();
    opener = null;
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-privacy-settings]');
    if (!t) return;
    e.preventDefault();
    opener = t;
    show(true);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && banner && !banner.hidden && readChoice() !== null) hide();
  });

  window.sparkConsent = { open: function () { show(true); }, choice: readChoice };

  /* ---------- start ---------- */
  var choice = readChoice();
  if (choice === true) loadGoogle();
  else if (choice === null) show(false);
})();
