/* Spark hero: the scroll position is the film's playhead.
   Intro, then the three directions printed on the can. */
(function () {
  'use strict';

  var root  = document.documentElement;
  var hero  = document.querySelector('.hero');
  var video = hero.querySelector('video');
  var panels = [].slice.call(hero.querySelectorAll('.panel'));
  var goButtons = [].slice.call(hero.querySelectorAll('[data-go]'));
  var fills = [].slice.call(hero.querySelectorAll('.track__fill'));
  var stretch = hero.querySelector('.stretch');

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !window.gsap || !window.ScrollTrigger) { root.classList.add('is-static'); return; }

  // Scroll progress where each panel owns the stage. The last number is the
  // film time (seconds) reached at the end of that stretch of scroll.
  var STOPS = [
    { from: 0,    to: 0.12, time: 0 },    // intro: establishing frame
    { from: 0.12, to: 0.42, time: 2.6 },  // 1 shake well: grip, cap comes off
    { from: 0.42, to: 0.74, time: 4.9 },  // 2 spray liberally
    { from: 0.74, to: 1,    time: null }  // 3 drip dry: release, to the last frame
  ];
  var FADE = 0.035;

  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var smooth = function (a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  /* ---------- film: fetch once, then seek to the latest request only ---------- */
  var filmReady = false, wantTime = 0;
  function seek () {
    if (!filmReady || video.seeking) return;
    if (Math.abs(video.currentTime - wantTime) > 0.03) video.currentTime = wantTime;
  }
  function markReady () { if (!filmReady && video.readyState >= 2) { filmReady = true; seek(); } }
  video.addEventListener('loadeddata', markReady);
  video.addEventListener('seeked', seek);
  (function load () {
    var src = video.getAttribute('data-src');
    // A same-origin Blob keeps currentTime exact while scrubbing.
    fetch(src).then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then(function (b) { video.src = URL.createObjectURL(b); })
      ['catch'](function () { video.src = src; })
      .then(function () { video.load(); markReady(); });
  })();

  function filmTime (p) {
    var end = (video.duration || 6.04) - 0.04, start = 0;
    for (var i = 0; i < STOPS.length; i++) {
      var s = STOPS[i], stopTime = s.time === null ? end : s.time;
      if (p <= s.to) return start + (stopTime - start) * clamp((p - s.from) / (s.to - s.from), 0, 1);
      start = stopTime;
    }
    return end;
  }

  /* ---------- smooth scroll ---------- */
  var gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  var lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.09 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  function scrollToY (y) { if (lenis) lenis.scrollTo(y, { duration: 1.4 }); else window.scrollTo({ top: y, behavior: 'smooth' }); }
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var t = document.querySelector(a.getAttribute('href'));
      if (!t) return;
      e.preventDefault();
      scrollToY(t === document.getElementById('top') ? 0 : t.getBoundingClientRect().top + window.pageYOffset);
    });
  });

  /* ---------- the stage ---------- */
  var active = -1;
  function render (p) {
    panels.forEach(function (el, i) {
      var s = STOPS[i];
      var inAt = i === 0 ? -1 : s.from, outAt = i === STOPS.length - 1 ? 2 : s.to;
      var o = smooth(inAt - FADE, inAt + FADE, p) * (1 - smooth(outAt - FADE, outAt + FADE, p));
      el.style.opacity = o.toFixed(3);
      el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
      // leaving panels rise, arriving panels settle up from below
      var y = p < inAt ? 1 : p > outAt ? -1 : 0;
      el.style.transform = 'translate3d(0,' + (y * (1 - o) * 28).toFixed(1) + 'px,0)';
    });

    var now = p < STOPS[1].from ? 0 : p < STOPS[2].from ? 1 : p < STOPS[3].from ? 2 : 3;
    if (now !== active) {
      active = now;
      goButtons.forEach(function (b, i) {
        if (i + 1 === now) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      });
    }
    fills.forEach(function (f, i) {
      var s = STOPS[i + 1];
      f.style.transform = 'scaleX(' + clamp((p - s.from) / (s.to - s.from), 0, 1).toFixed(3) + ')';
    });

    // The one signature move: "Spray" widens as the film sprays.
    if (stretch) stretch.style.fontStretch = (62 + 50 * smooth(0.5, 0.68, p)).toFixed(1) + '%';

    wantTime = filmTime(p);
    seek();
  }

  ScrollTrigger.create({
    trigger: hero, start: 'top top', end: 'bottom bottom',
    onUpdate: function (self) { render(self.progress); },
    onRefresh: function (self) { render(self.progress); }
  });
  render(0);

  var bar = document.querySelector('.bar');
  ScrollTrigger.create({
    trigger: hero, start: 'bottom top+=' + bar.offsetHeight,
    onToggle: function (self) { bar.classList.toggle('is-solid', self.isActive); },
    end: 'max'
  });

  goButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      var s = STOPS[+b.getAttribute('data-go')];
      var span = hero.offsetHeight - window.innerHeight;
      scrollToY(hero.offsetTop + span * (s.from + (s.to - s.from) * 0.55));
    });
  });

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
