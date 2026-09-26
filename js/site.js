/* ============================================================
   SPARK — site behaviour
   Plain ES5-compatible DOM work, no dependencies.
   Every block is independent: if one element is missing the
   rest of the page still works.
   ============================================================ */
(function () {
  'use strict';

  /* Paste the Apps Script /exec URL here once the web app is deployed.
     Empty means the form still validates and confirms, but sends nothing. */
  var ENQUIRY_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyYk5BDGG5EBzqN-RSi8YUBF7i0is33zCtR4iDOE0QOWfv19uC9iTzaZdLzQ9_I-4Nq/exec';
  var ENQUIRY_TOKEN = '';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Releases the hero's one load sequence. Next frame, so the first paint
     has the start state and the transition actually runs. */
  requestAnimationFrame(function () {
    document.documentElement.classList.add('is-ready');
  });

  /* ---------- current year ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- product views ----------
     The four views under the can. Handled here, in the small script that
     runs first, rather than in the WebGL module: the tabs have to work from
     the first paint, and when WebGL is unavailable they still switch the
     copy beside the photograph. On the pinned desktop run stage.js takes
     over and drives the views from scroll position instead. */
  var stage = document.querySelector('.stage');
  var views = [].slice.call(document.querySelectorAll('.beat'));
  var tabs = [].slice.call(document.querySelectorAll('.stage__steps button'));

  if (stage && views.length && tabs.length) {
    var selectView = function (i) {
      views.forEach(function (v, n) { v.classList.toggle('is-on', n === i); });
      tabs.forEach(function (t, n) {
        t.classList.toggle('is-on', n === i);
        if (n === i) t.setAttribute('aria-current', 'true');
        else t.removeAttribute('aria-current');
      });
      document.dispatchEvent(new CustomEvent('spark:beat', { detail: i }));
    };

    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        if (stage.classList.contains('is-tour')) return;
        selectView(Number(t.getAttribute('data-goto')) || 0);
      });
    });
  }

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
     Validated in the browser, then posted to the Apps Script web app
     set in ENQUIRY_ENDPOINT above.
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

    /* Posts the enquiry to the Apps Script web app, which writes the row to
       the sheet and sends both mails through Mailgun. The Mailgun key lives
       in that script's properties, never here.

       text/plain keeps this a simple request: Apps Script cannot answer the
       CORS preflight that an application/json body would trigger. The script
       reads the body with JSON.parse regardless. */
    var sendEnquiry = function (data) {
      if (!ENQUIRY_ENDPOINT) {
        if (window.console && console.info) {
          console.info('[spark] no endpoint set, enquiry not sent', data);
        }
        return Promise.resolve();
      }

      data.token = ENQUIRY_TOKEN;
      data.source = window.location.href;

      return fetch(ENQUIRY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data)
      }).then(function (res) {
        return res.json().catch(function () { return { ok: res.ok }; });
      }).then(function (out) {
        if (!out || !out.ok) throw new Error((out && out.error) || 'rejected');
        // The row is saved even if Mailgun stumbled, so only log that.
        if (out.mail && out.mail.error && window.console) {
          console.warn('[spark] saved, but mail failed:', out.mail.error);
        }
        return out;
      });
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
            done.textContent = 'Thanks, your enquiry is with us. We usually reply within two working days.';
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
