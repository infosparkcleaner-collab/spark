/* ============================================================
   SPARK — site behaviour
   Plain ES5-compatible DOM work, no dependencies.
   Every block is independent: if one element is missing the
   rest of the page still works.
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- current year ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- mobile menu ---------- */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');

  if (burger && menu) {
    var setMenu = function (open) {
      menu.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };

    burger.addEventListener('click', function () {
      setMenu(burger.getAttribute('aria-expanded') !== 'true');
    });

    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        burger.focus();
      }
    });

    // A resize past the breakpoint should not leave the panel stuck open.
    window.matchMedia('(min-width: 1000px)').addEventListener('change', function (e) {
      if (e.matches) setMenu(false);
    });
  }

  /* ---------- workshop film ----------
     Muted, looping, autoplaying — but the 8.6 MB file is only
     fetched once the section is actually near the viewport, and
     playback pauses whenever it scrolls away or the tab is hidden.
  ------------------------------------------------------------- */
  var video = document.getElementById('filmVideo');
  var playBtn = document.getElementById('filmPlay');
  var soundBtn = document.getElementById('filmSound');

  if (video) {
    var wantsToPlay = !reduceMotion;   // what the visitor has asked for
    var inView = false;
    var loaded = false;

    var setPlayState = function (playing) {
      if (!playBtn) return;
      playBtn.setAttribute('data-state', playing ? 'playing' : 'paused');
      playBtn.setAttribute('aria-label', playing ? 'Pause video' : 'Play video');
    };

    var load = function () {
      if (loaded) return;
      loaded = true;
      video.src = video.getAttribute('data-src');
    };

    var sync = function () {
      if (inView && wantsToPlay && !document.hidden) {
        load();
        var p = video.play();
        // Autoplay can still be refused; reflect reality in the button.
        if (p && typeof p.catch === 'function') {
          p.catch(function () { setPlayState(false); });
        }
      } else if (!video.paused) {
        video.pause();
      }
    };

    setPlayState(wantsToPlay);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        sync();
      }, { threshold: 0.25 }).observe(video);
    } else {
      inView = true;
      sync();
    }

    document.addEventListener('visibilitychange', sync);
    video.addEventListener('play', function () { setPlayState(true); });
    video.addEventListener('pause', function () { setPlayState(false); });

    if (playBtn) {
      playBtn.addEventListener('click', function () {
        wantsToPlay = video.paused;
        if (wantsToPlay) { inView = true; }
        sync();
      });
    }

    if (soundBtn) {
      soundBtn.addEventListener('click', function () {
        video.muted = !video.muted;
        soundBtn.setAttribute('aria-pressed', String(!video.muted));
        soundBtn.setAttribute('aria-label', video.muted ? 'Turn sound on' : 'Turn sound off');
        // Unmuting is only meaningful while it is running.
        if (!video.muted && video.paused) {
          wantsToPlay = true;
          sync();
        }
      });
    }
  }

  /* ---------- pack lightbox ---------- */
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightboxImg');
  var lightboxCap = document.getElementById('lightboxCap');
  var lightboxClose = document.getElementById('lightboxClose');

  if (lightbox && lightboxImg && lightboxCap && lightboxClose) {
    var opener = null;

    var closeBox = function () {
      lightbox.hidden = true;
      lightboxImg.removeAttribute('src');
      document.body.style.removeProperty('overflow');
      if (opener) { opener.focus(); opener = null; }
    };

    document.querySelectorAll('.pack__btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var img = btn.querySelector('img');
        opener = btn;
        lightboxImg.src = btn.getAttribute('data-full');
        lightboxImg.alt = img ? img.alt : '';
        lightboxCap.textContent = btn.getAttribute('data-caption') || '';
        lightbox.hidden = false;
        document.body.style.overflow = 'hidden';
        lightboxClose.focus();
      });
    });

    lightboxClose.addEventListener('click', closeBox);
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeBox();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !lightbox.hidden) closeBox();
      // Keep focus inside the dialog: it only holds one control.
      if (e.key === 'Tab' && !lightbox.hidden) {
        e.preventDefault();
        lightboxClose.focus();
      }
    });
  }

  /* ---------- enquiry form ----------
     Validated and confirmed in the browser. Nothing is transmitted
     yet — wire sendEnquiry() to the endpoint when it exists.
  ------------------------------------------------------------- */
  var form = document.getElementById('enquiryForm');

  if (form) {
    var done = document.getElementById('formDone');

    var checks = [
      { id: 'f-name',    error: 'e-name',    ok: function (v) { return v.trim().length > 0; } },
      { id: 'f-email',   error: 'e-email',   ok: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); } },
      { id: 'f-message', error: 'e-message', ok: function (v) { return v.trim().length > 0; } }
    ];

    var showError = function (check, bad) {
      var input = document.getElementById(check.id);
      var error = document.getElementById(check.error);
      if (!input || !error) return;
      error.hidden = !bad;
      input.setAttribute('aria-invalid', String(bad));
      if (input.parentElement) input.parentElement.classList.toggle('is-bad', bad);
    };

    checks.forEach(function (check) {
      var input = document.getElementById(check.id);
      if (!input) return;
      // Only re-check after a first failed submit, so typing is never nagged at.
      input.addEventListener('input', function () {
        if (input.getAttribute('aria-invalid') === 'true') showError(check, !check.ok(input.value));
      });
    });

    /**
     * Send the enquiry. Currently a no-op that resolves, so the
     * confirmation path is real and testable.
     *
     * To start saving enquiries, replace the body with e.g.:
     *   return fetch('/api/enquiries', {
     *     method: 'POST',
     *     headers: { 'Content-Type': 'application/json' },
     *     body: JSON.stringify(data)
     *   }).then(function (r) { if (!r.ok) throw new Error(r.status); });
     */
    var sendEnquiry = function (data) {
      if (window.console && console.info) console.info('[spark] enquiry captured (not yet sent)', data);
      return Promise.resolve();
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var firstBad = null;
      checks.forEach(function (check) {
        var input = document.getElementById(check.id);
        if (!input) return;
        var bad = !check.ok(input.value);
        showError(check, bad);
        if (bad && !firstBad) firstBad = input;
      });

      if (firstBad) {
        if (done) done.hidden = true;
        firstBad.focus();
        return;
      }

      var data = {};
      new FormData(form).forEach(function (value, key) { data[key] = value; });

      var submit = form.querySelector('button[type="submit"]');
      if (submit) submit.disabled = true;

      sendEnquiry(data)
        .then(function () {
          form.reset();
          if (done) {
            done.textContent = 'Thanks — your enquiry is with us. We usually reply within two working days.';
            done.hidden = false;
          }
        })
        .catch(function () {
          if (done) {
            done.textContent = 'That did not send. Try again, or email us directly.';
            done.hidden = false;
          }
        })
        .then(function () {
          if (submit) submit.disabled = false;
        });
    });
  }
})();
