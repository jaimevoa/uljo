/* ============================================================
   ULJO — interactions
   • coverflow carousels (drag / swipe / wheel / keys / click)
   • image dashes on the project cards and case plates
   • the floating bar, the universe menu, the poster lightbox
   • scroll-scrubbed video, the fireflies, scroll-in reveals
   ============================================================ */
(function () {
  'use strict';

  /* pass 78: the sound switch of the home page is remembered on every page (the small sounds here follow it) */
  try { if (window.__uljoSoundOff === undefined) window.__uljoSoundOff = localStorage.getItem('uljo-sound') === 'off'; } catch (e) {}

  /* ---------- carousels ----------------------------------- */

  function buildCarousel(root) {
    var track   = root.querySelector('.carousel__track');
    var stage   = root.querySelector('.carousel__stage');
    var caption = root.querySelector('.carousel__caption');
    var kind    = root.dataset.carousel === 'poster' ? 'Poster' : 'Logo';
    var yearEl  = root.querySelector('[data-carousel-year]');

    // Plates authored in the HTML win. Otherwise fall back to `data-count`
    // empty placeholders, so a carousel can be stubbed before the art exists.
    var slides = Array.prototype.slice.call(track.querySelectorAll('.slide'));

    if (!slides.length) {
      var count = Math.max(3, parseInt(root.dataset.count, 10) || 6);
      for (var i = 0; i < count; i++) {
        var el = document.createElement('button');
        el.type = 'button';
        el.className = 'slide slide--ph';
        el.dataset.label = kind + ' ' + (i + 1);
        el.setAttribute('aria-label', kind + ' ' + (i + 1));
        track.appendChild(el);
        slides.push(el);
      }
    }

    // The coverflow shows five plates at once (centre, ±1, ±2). With fewer
    // than five real ones the outer slots would sit empty, so repeat the set
    // around the ring — captions still report the original artwork number.
    var real = slides.length;
    while (slides.length < 5) {
      for (var c = 0; c < real; c++) {
        var clone = slides[c].cloneNode(true);
        clone.dataset.clone = '1';        // duplicate art: never announced twice
        track.appendChild(clone);
        slides.push(clone);
      }
    }
    var count = slides.length;

    function labelFor(i) {
      var el = slides[i % real];
      return el.dataset.caption || (kind + ' ' + ((i % real) + 1));
    }

    var index = 0;

    /* shortest signed distance from `index` to `i` on a ring */
    function offset(i) {
      var d = i - index;
      var half = count / 2;
      if (d >  half) d -= count;
      if (d < -half) d += count;
      return d;
    }

    /* Each poster keeps its own proportions at the shared plate height, so
       the slots either side have to be placed from the real centre width. */
    function layout() {
      var styles = getComputedStyle(root);
      var rem    = parseFloat(getComputedStyle(document.documentElement).fontSize);
      var toPx   = function (v) {
        v = String(v).trim();
        return v.slice(-3) === 'rem' ? parseFloat(v) * rem : parseFloat(v);
      };
      // --panel-h can be a min()/clamp(), which no amount of parsing will
      // resolve — so measure it with a throwaway probe instead.
      if (!root._probe) {
        var pr = document.createElement('i');
        pr.style.cssText = 'position:absolute;width:0;visibility:hidden;pointer-events:none;height:var(--panel-h)';
        root.appendChild(pr);
        root._probe = pr;
      }
      var panelH = root._probe.offsetHeight || toPx(styles.getPropertyValue('--panel-h'));
      var sideW  = toPx(styles.getPropertyValue('--side-w'));
      var gap    = 0;                              // plates meet edge to edge

      // A side plate holds the WHOLE poster, tilted so it lands inside the
      // --side-w slot. Given the plate's true width W and the slot width S:
      //   cos(angle) = S / W                      (how far it has to turn)
      //   a = (W/2)·sin(angle),  distance = a/.039 (keeps the design's
      //                                             1.047 / .968 edge ratio)
      var tiltH = panelH * 1.006;
      slides.forEach(function (el) {
        var img = el.querySelector('img');
        if (img && !img.naturalWidth) return;          // not decoded yet
        // a stubbed plate (no art) is square — the logo set's proportions
        var ratio = img ? img.naturalWidth / img.naturalHeight : 1;

        el.style.setProperty('--own-w', (panelH * ratio) + 'px');

        var W = tiltH * ratio;                       // full poster at plate height
        var cos = Math.min(0.999, sideW / W);        // never more than flat
        var ang = Math.acos(cos);
        el.style.setProperty('--tilt-w', W + 'px');
        el.style.setProperty('--tilt-ang', (ang * 180 / Math.PI) + 'deg');
        el.style.setProperty('--tilt-d', ((W / 2) * Math.sin(ang) / 0.039) + 'px');
      });

      var centre = slides[index];
      var ownW = centre ? parseFloat(getComputedStyle(centre).getPropertyValue('--own-w')) : NaN;
      if (!ownW) ownW = toPx(styles.getPropertyValue('--panel-w'));

      // Cover-Flow stacking: each neighbour tucks partly BEHIND the plate in
      // front of it, so only `show` of its projected width stays visible.
      var show = 0.62;
      var off1 = ownW / 2 + (show - 0.5) * sideW;
      root.style.setProperty('--off-1', off1 + 'px');
      root.style.setProperty('--off-2', (off1 + show * sideW) + 'px');
    }

    function render() {
      layout();
      slides.forEach(function (el, i) {
        var d = offset(i);
        if (Math.abs(d) <= 2) {
          el.dataset.pos = String(d);
          el.classList.remove('is-left', 'is-right');
          el.setAttribute('aria-hidden', el.dataset.clone ? 'true' : 'false');
          el.tabIndex = (d === 0 && !el.dataset.clone) ? 0 : -1;
        } else {
          el.dataset.pos = 'hidden';
          el.classList.toggle('is-left', d < 0);
          el.classList.toggle('is-right', d > 0);
          el.setAttribute('aria-hidden', 'true');
          el.tabIndex = -1;
        }
      });
      if (caption) caption.textContent = labelFor(index);
      var tEl = root.querySelector('[data-carousel-title]'); if (tEl) tEl.textContent = labelFor(index);      // pass 82: the title of the poster in the middle
      if (yearEl) yearEl.textContent = (slides[index % real].dataset.year || '');
    }

    function go(delta) {
      index = ((index + delta) % count + count) % count;
      render();
    }
    /* pass 83: an arrow on each side, to go from poster to poster */
    root.querySelectorAll('[data-carousel-prev]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); go(-1); }); });
    root.querySelectorAll('[data-carousel-next]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); go(1); }); });

    /* clicking a side plate brings it to the centre */
    slides.forEach(function (el, i) {
      el.addEventListener('click', function () {
        if (dragged) return;              // ignore the click that ends a drag
        var d = offset(i);
        if (d !== 0) go(d);
      });
    });

    /* --- pointer drag / touch swipe: one plate per gesture --- */
    var startX = 0, startY = 0, down = false, dragged = false, axis = null, stepped = false;

    stage.addEventListener('pointerdown', function (e) {
      down = true; dragged = false; axis = null; stepped = false;
      startX = e.clientX; startY = e.clientY;
      stage.classList.add('is-dragging');
    });

    stage.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;

      if (axis === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }
      if (axis !== 'x') return;           // let the page scroll vertically

      e.preventDefault();
      if (stepped) return;                // a swipe moves exactly one plate
      var threshold = stage.clientWidth * 0.08;
      if (Math.abs(dx) > threshold) {
        go(dx < 0 ? 1 : -1);
        dragged = true;
        stepped = true;                   // lift to swipe again
      }
    });

    function endDrag() {
      if (!down) return;
      down = false;
      stage.classList.remove('is-dragging');
      // clear the "was a drag" flag after the click event has fired
      setTimeout(function () { dragged = false; }, 0);
    }
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
    stage.addEventListener('pointerleave', endDrag);

    /* --- trackpad horizontal scroll: one plate per swipe --- */
    // A trackpad swipe is a burst of wheel events that keeps going for as
    // long as the momentum lasts. The first one steps; the rest are swallowed
    // until the burst has been quiet for a moment, so a swipe is one plate.
    // A trackpad swipe is a burst of wheel events. Distance accumulates;
    // every 140 px of it is one plate, no sooner than the slide takes to
    // settle — so a long swipe keeps stepping, one at a time, instead of
    // stalling until the burst has died down.
    var wheelAcc = 0, wheelLast = 0, wheelQuiet = null;
    stage.addEventListener('wheel', function (e) {
      // Only a deliberate horizontal gesture steers the carousel. Trackpads
      // emit small sideways jitter during a vertical scroll, so require both
      // a real magnitude and a clear horizontal bias.
      if (Math.abs(e.deltaX) < 12) return;
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY) * 1.5) return;
      e.preventDefault();
      wheelAcc += e.deltaX;
      clearTimeout(wheelQuiet);
      wheelQuiet = setTimeout(function () { wheelAcc = 0; }, 200);
      var now = performance.now();
      if (Math.abs(wheelAcc) < 140 || now - wheelLast < 380) return;
      go(wheelAcc > 0 ? 1 : -1);
      wheelAcc = 0; wheelLast = now;
    }, { passive: false });

    /* --- keyboard --- */
    stage.tabIndex = 0;
    stage.setAttribute('role', 'group');
    stage.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); go(-1); }
    });

    render();

    // natural sizes may not be known on first paint
    slides.forEach(function (el) {
      var img = el.querySelector('img');
      if (img && !img.complete) img.addEventListener('load', render, { once: true });
    });
    window.addEventListener('resize', render);
  }

  document.querySelectorAll('[data-carousel]').forEach(buildCarousel);

  /* ---------- sticky bar + left drawer --------------------- */

  (function chrome() {
    var header  = document.querySelector('[data-header]');
    var drawer  = document.querySelector('[data-drawer]');
    var scrim   = document.querySelector('[data-drawer-scrim]');
    var openers = Array.prototype.slice.call(document.querySelectorAll('[data-drawer-open]'));
    var burger  = openers[0];
    var clip    = drawer && drawer.querySelector('[data-universe-video]');
    if (!header) return;

    // The home page shows the four links at rest and swaps them for the
    // balado pill and the menu once it moves; a project page has no links,
    // so it wears the pill and the menu from the start.
    var casePage = document.body.classList.contains('page-case');
    var stuck = false;
    function onScroll() {
      var past = casePage || window.scrollY > 40;
      if (past === stuck) return;
      stuck = past;
      header.classList.toggle('is-stuck', past);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (!drawer || !scrim || !burger) return;

    var lastFocus = null;

    function open(on) {
      if (on) {
        lastFocus = document.activeElement;
        drawer.hidden = false;
        scrim.hidden = false;
        requestAnimationFrame(function () {
          drawer.classList.add('is-open');
          scrim.classList.add('is-open');
        });
        document.body.classList.add('is-locked');
        if (clip) clip.play().catch(function () {});
        drawer.querySelector('a, button').focus();
      } else {
        drawer.classList.remove('is-open');
        scrim.classList.remove('is-open');
        document.body.classList.remove('is-locked');
        if (clip) clip.pause();
        setTimeout(function () { drawer.hidden = true; scrim.hidden = true; }, 500);
        if (lastFocus) lastFocus.focus();
      }
      openers.forEach(function (b) { b.setAttribute('aria-expanded', on ? 'true' : 'false'); });
    }

    openers.forEach(function (b) { b.addEventListener('click', function () { open(true); }); });
    scrim.addEventListener('click', function () { open(false); });
    drawer.querySelectorAll('[data-drawer-close], [data-drawer-link]')
      .forEach(function (el) { el.addEventListener('click', function () { open(false); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !drawer.hidden) open(false);
    });
    // a project page's "my universe" comes here as index.html#universe
    if (location.hash === '#universe') {
      history.replaceState(null, '', location.pathname);
      open(true);
    }
  })();

  /* ---------- the contents list (project pages) ------------ */
  /* Fixed on the right. It waits until the pinned opening has scrolled
     by, then lights whichever section is in view. */
  (function toc() {
    var nav = document.querySelector('[data-toc-nav]');
    if (!nav) return;
    var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
    var targets = links.map(function (a) {
      return document.getElementById(a.getAttribute('href').slice(1));
    });
    var opening = document.querySelector('[data-open]');
    function top(el) { return el.getBoundingClientRect().top + window.scrollY; }
    var ticking = false;
    function spy() {
      ticking = false;
      var y = window.scrollY + window.innerHeight * 0.4;
      var cur = -1;
      targets.forEach(function (t, i) { if (t && top(t) <= y) cur = i; });
      links.forEach(function (a, i) { a.classList.toggle('is-current', i === cur); });
      var show = !opening ||
        window.scrollY > top(opening) + opening.offsetHeight - window.innerHeight;
      document.body.classList.toggle('has-toc', show);
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    links.forEach(function (a) {
      a.addEventListener('click', function (e) {
        var t = document.getElementById(a.getAttribute('href').slice(1));
        if (!t) return;
        e.preventDefault();
        window.scrollTo({ top: top(t) - 20, behavior: 'smooth' });
      });
    });
    spy();
  })();

  /* ---------- the walkthrough: a balado (project pages) ------------ */
  /* "Project walkthrough" plays Jaime talking through the project
     (data-walk-src). Playing, the pill turns white, its five bars move with
     his voice (an analyser on the audio; a gentle loop where that isn't
     allowed) and the time runs where the label was. Press again to pause;
     it picks up where it stopped. Until the recording is there it says so. */
  (function walk() {
    var btns = Array.prototype.slice.call(document.querySelectorAll('[data-walk]'));
    if (!btns.length) return;
    var src = btns[0].dataset.walkSrc;
    var audio = new Audio();
    audio.preload = 'none';
    var missing = false, soonT = null, ctx = null, an = null, data = null, raf = 0;

    function clock(t) {
      if (!isFinite(t) || t < 0) t = 0;
      var m = Math.floor(t / 60), r = Math.floor(t % 60);
      return m + ':' + (r < 10 ? '0' : '') + r;
    }
    function label(text) {
      btns.forEach(function (b) { var l = b.querySelector('[data-walk-label]'); if (l) l.textContent = text; });
    }
    function paint(on) {
      btns.forEach(function (b) {
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.classList.toggle('is-playing', on);
        b.setAttribute('aria-label', on ? 'Pause the project walkthrough' : 'Play the project walkthrough: Jaime explains the project');
      });
      document.documentElement.classList.toggle('is-walking', on);
      if (!on) { label(audio.currentTime > 0 && !audio.ended ? 'Resume walkthrough' : 'Project walkthrough'); bars(null); }
    }
    /* the bars follow the voice */
    function bars(levels) {
      btns.forEach(function (b) {
        b.querySelectorAll('.walk__waves i').forEach(function (i, k) {
          i.style.transform = levels ? 'scaleY(' + levels[k].toFixed(3) + ')' : '';
        });
      });
    }
    function listen() {
      if (ctx || !(window.AudioContext || window.webkitAudioContext)) return;
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        var node = ctx.createMediaElementSource(audio);
        an = ctx.createAnalyser(); an.fftSize = 64; an.smoothingTimeConstant = .75;
        node.connect(an); an.connect(ctx.destination);
        data = new Uint8Array(an.frequencyBinCount);
        btns.forEach(function (b) { b.classList.add('is-live'); });
      } catch (e) { ctx = null; an = null; }
    }
    var BANDS = [[1, 3], [3, 5], [5, 8], [8, 12], [12, 18]];
    function loop() {
      raf = 0;
      if (audio.paused) return;
      if (an) {
        an.getByteFrequencyData(data);
        bars(BANDS.map(function (bd) {
          var s = 0; for (var j = bd[0]; j < bd[1]; j++) s += data[j];
          return Math.max(.18, Math.min(1, s / (bd[1] - bd[0]) / 190));
        }));
      }
      label(clock(audio.currentTime) + ' / ' + clock(audio.duration));
      raf = requestAnimationFrame(loop);
    }
    function soon() {
      clearTimeout(soonT);
      btns.forEach(function (b) { b.classList.add('is-soon'); });
      label('Balado coming soon');
      soonT = setTimeout(function () {
        btns.forEach(function (b) { b.classList.remove('is-soon'); });
        label('Project walkthrough');
      }, 2400);
    }
    function play() {
      if (missing || !src) { soon(); return; }
      if (!audio.src) audio.src = src;
      listen();
      if (ctx && ctx.state === 'suspended') ctx.resume();
      audio.play().catch(function () {});
    }
    audio.addEventListener('play', function () { paint(true); if (!raf) raf = requestAnimationFrame(loop); });
    audio.addEventListener('pause', function () { paint(false); });
    audio.addEventListener('ended', function () { audio.currentTime = 0; paint(false); label('Project walkthrough'); });
    audio.addEventListener('error', function () { if (!audio.src) return; missing = true; paint(false); soon(); });
    btns.forEach(function (b) {
      b.addEventListener('click', function () { if (audio.paused) play(); else audio.pause(); });
    });
  })();

  /* ---------- the top bar steps aside while you scroll ------------ */
  /* Scrolling down tucks the header's buttons away; scrolling up — or
     simply stopping — brings them straight back. */
  (function autoHide() {
    var header = document.querySelector('[data-header]');
    if (!header) return;
    var lastY = window.scrollY, idle = null;
    function show() { header.classList.remove('is-tucked'); }
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      var open = document.documentElement.classList.contains('menu-open');
      if (!open && y > lastY + 2 && y > 120) header.classList.add('is-tucked');
      else if (y < lastY - 2) show();
      lastY = y;
      clearTimeout(idle);
      idle = setTimeout(show, 260);
    }, { passive: true });
  })();

  /* ---------- the top bar (pass 52) -------------------------------- */
  /* One bar on every page, in liquid glass. Scrolling down it steps up
     out of sight; the first move back up brings it straight back. It
     stays while its Work menu or the phone sheet is open, while a
     walkthrough runs, and while the keyboard is inside it. It also marks
     the page you're on, and hands the page's real width to CSS (--vw)
     so full-bleed sections never leave a band on wide screens. */
  (function topbar() {
    var root = document.documentElement;
    function vw() { root.style.setProperty('--vw', root.clientWidth + 'px'); }
    vw();
    window.addEventListener('resize', vw);

    var bar = document.querySelector('[data-topbar]');
    if (!bar) return;

    /* you are here */
    var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    bar.querySelectorAll('a[href]').forEach(function (a) {
      var h = a.getAttribute('href').split('#')[0].toLowerCase();
      if (h && h === file && file !== 'index.html') a.setAttribute('aria-current', 'page');
    });
    var work = bar.querySelector('[data-work]');
    if (work && work.querySelector('[aria-current="page"]')) {
      work.querySelector('button').setAttribute('aria-current', 'page');
    }

    /* Work: opens on hover (with a fine pointer), on click, from the keyboard */
    var wbtn = work && work.querySelector('button');
    var closing = null;
    function setWork(on) {
      if (!work) return;
      clearTimeout(closing);
      work.classList.toggle('is-open', on);
      wbtn.setAttribute('aria-expanded', on ? 'true' : 'false');
    }
    if (work) {
      var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      if (fine) {
        work.addEventListener('pointerenter', function () { setWork(true); });
        work.addEventListener('pointerleave', function () { closing = setTimeout(function () { setWork(false); }, 240); });
      }
      wbtn.addEventListener('click', function (e) { e.stopPropagation(); setWork(!work.classList.contains('is-open')); });
      work.addEventListener('focusout', function (e) { if (!work.contains(e.relatedTarget)) setWork(false); });
      document.addEventListener('click', function (e) { if (!work.contains(e.target)) setWork(false); });
    }

    /* the phone sheet */
    var tog = bar.querySelector('[data-sheet-toggle]');
    function setSheet(on) {
      bar.classList.toggle('is-sheet', on);
      if (tog) {
        tog.setAttribute('aria-expanded', on ? 'true' : 'false');
        tog.setAttribute('aria-label', on ? 'Close menu' : 'Open menu');
      }
    }
    if (tog) {
      tog.addEventListener('click', function (e) { e.stopPropagation(); setSheet(!bar.classList.contains('is-sheet')); });
      bar.querySelector('[data-sheet]').addEventListener('click', function (e) { if (e.target.closest('a')) setSheet(false); });
      document.addEventListener('click', function (e) { if (!bar.contains(e.target)) setSheet(false); });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { setWork(false); setSheet(false); }
    });

    /* when it shows:
       "page"    — always (About, Contact…)
       "project" — there on arrival; gone on the way down, back on the way up
       "home"    — not over the title screen; from the Underground Lab on, always */
    var mode = bar.dataset.topbar || 'page';
    var lab = document.querySelector('[data-navi-from]');
    var lastY = window.scrollY, hidden = null;
    function busy() {
      return bar.classList.contains('is-sheet') || (work && work.classList.contains('is-open')) ||
             root.classList.contains('is-walking') || bar.contains(document.activeElement);
    }
    function set(h) { if (h !== hidden) { hidden = h; bar.classList.toggle('is-hidden', h); } }
    function inLab() { return !lab || lab.getBoundingClientRect().top < window.innerHeight * .6; }
    function update() {
      var y = window.scrollY, dy = y - lastY;
      if (busy()) set(false);
      else if (mode === 'page') set(false);
      else if (mode === 'home') set(!inLab());
      else if (y < 12 || dy < -4 || hidden === null) set(false);
      else if (dy > 4 && y > 90) set(true);
      if (Math.abs(dy) > 4) lastY = y;
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
    bar.addEventListener('focusin', function () { set(false); });
  })();

  /* ---------- "Introducing …": arrives once it's well in view -------- */
  document.querySelectorAll('.case-intro').forEach(function (el) {
    if (!('IntersectionObserver' in window)) { el.classList.add('is-in'); return; }
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { el.classList.add('is-in'); io.disconnect(); }
    }, { rootMargin: '0px 0px -20% 0px' });
    io.observe(el);
  });

  /* ---------- "Click to start" over a prototype ------------------ */
  document.querySelectorAll('[data-proto-cover]').forEach(function (cover) {
    cover.addEventListener('click', function () {
      cover.classList.add('is-gone');
      var frame = cover.parentNode.querySelector('iframe');
      setTimeout(function () { cover.hidden = true; if (frame) frame.focus(); }, 450);
    });
  });

  /* ---------- the note beside the screen prototype ----------------- */
  /* It watches the prototype (same origin) and, whichever screen or panel
     is showing, says what it's for and the thinking behind it. */
  (function protoNote() {
    var frame = document.querySelector('[data-proto-screen]');
    var note = document.querySelector('[data-proto-note]');
    if (!frame || !note) return;
    var stepEl = note.querySelector('[data-note-step]'),
        titleEl = note.querySelector('[data-note-title]'),
        textEl = note.querySelector('[data-note-text]');
    var NOTES = {
      'p-welcome': [1, 'Welcome', 'One big Start button. Help, language and accessibility stay along the bottom, and the kiosk greets you out loud.'],
      'p-scan':    [2, 'Place your items', 'Put everything in the blue area. RFID counts it all at once: no barcodes, no scanning.'],
      'p-cart':    [3, 'Your basket', 'Photo, name and price for each item. Removing one always asks first.'],
      'p-pay':     [4, 'Choose how to pay', 'Card is already chosen. One press and you pay.'],
      'p-term':    [5, 'Pay at the terminal', 'A big arrow points to the terminal, and the total is repeated.'],
      'p-proc':    [6, 'Processing', 'A short wait. Nothing to press.'],
      'p-succ':    [7, 'Payment success', 'A clear check mark, said out loud.'],
      'p-rcpt':    [8, 'Your receipt', 'Yes or no, with big buttons. Then it resets for the next person.'],
      'done':      [8, 'Now, go play.', 'The checkout is over.'],
      'pop-access':  [0, 'Accessibility settings', 'Audio, contrast and text size in one panel, from any screen.'],
      'pop-lang':    [0, 'Language', 'Fifteen languages, on screen and in the voice.'],
      'pop-help':    [0, 'Ask for help', 'Calls a staff member from any screen, and confirms they are coming.'],
      'pop-confirm': [0, 'Remove an item?', 'Nothing leaves the basket without a yes.']
    };
    var cur = null;
    function show(key) {
      if (key === cur || !NOTES[key]) return;
      cur = key;
      var n = NOTES[key];
      note.classList.remove('is-in');
      void note.offsetWidth;
      stepEl.textContent = n[0] ? 'Screen ' + n[0] + ' of 8' : 'On any screen';
      titleEl.textContent = n[1];
      textEl.textContent = n[2];
      note.classList.add('is-in');
    }
    function state(d) {
      var pop = d.querySelector('.pop.on');
      if (pop) return pop.id;
      var r = d.getElementById('p-rcpt');
      if (r && r.classList.contains('done')) return 'done';
      var pg = d.querySelector('.page.on');
      return pg ? pg.id : 'p-welcome';
    }
    function hook() {
      var d;
      try { d = frame.contentDocument; } catch (e) { return; }
      if (!d || !d.body || d.__noted) return;
      d.__noted = true;
      new MutationObserver(function () { show(state(d)); })
        .observe(d.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
      show(state(d));
    }
    frame.addEventListener('load', hook);
    try { if (frame.contentDocument && frame.contentDocument.readyState === 'complete') hook(); } catch (e) {}
    show('p-welcome');
  })();

  /* ---------- the note beside the Easy Pad prototype --------------- */
  /* It listens to the prototype's keys and its state, and explains the key
     you just pressed — the Easy Pad taught through use. */
  (function padNote() {
    var frame = document.querySelector('[data-proto-pad]');
    var note = document.querySelector('[data-pad-note]');
    if (!frame || !note) return;
    var stepEl = note.querySelector('[data-note-step]'),
        titleEl = note.querySelector('[data-note-title]'),
        textEl = note.querySelector('[data-note-text]');
    var NOTES = {
      guide: ['The Easy Pad', 'Five keys, no touchscreen', 'The screen shows, the keys do everything. Press the green OK key to begin.'],
      play:  ['Getting around', 'Follow the blue outline', 'BACK and NEXT move the blue outline, OK confirms. Each option is read aloud.'],
      kPrev: ['Back', 'One option back', 'Big raised keys you find by touch.'],
      kNext: ['Next', 'One option forward', 'In reading order.'],
      kOk:   ['OK', 'Confirm', 'Presses whatever is outlined. Always means yes.'],
      kUndo: ['Undo', 'A safe way back', 'One step back. Any mistake, undone.'],
      kHelp: ['Help', 'Call for assistance', 'Calls staff from anywhere.'],
      kTerm: ['Paying', 'Tap your card', 'The card reader lights up. Tap, and you are done.']
    };
    var cur = null;
    function show(key) {
      if (key === cur || !NOTES[key]) return;
      cur = key;
      var n = NOTES[key];
      note.classList.remove('is-in');
      void note.offsetWidth;
      stepEl.textContent = n[0]; titleEl.textContent = n[1]; textEl.textContent = n[2];
      note.classList.add('is-in');
    }
    function hook() {
      var d;
      try { d = frame.contentDocument; } catch (e) { return; }
      if (!d || !d.body || d.__noted) return;
      d.__noted = true;
      d.addEventListener('click', function (e) {
        var k = e.target && e.target.closest ? e.target.closest('.key') : null;
        if (k && NOTES[k.id]) setTimeout(function () { show(k.id); }, 30);
      }, true);
      new MutationObserver(function () {
        if (d.body.classList.contains('guide')) show('guide');
        else if (d.body.classList.contains('play') && cur === 'guide') show('play');
      }).observe(d.body, { attributes: true, attributeFilter: ['class'] });
      show(d.body.classList.contains('play') ? 'play' : 'guide');
    }
    frame.addEventListener('load', hook);
    try { if (frame.contentDocument && frame.contentDocument.readyState === 'complete') hook(); } catch (e) {}
    show('guide');
  })();

  /* ---------- the swipe gallery (Easy Pad pictures) ---------------- */
  /* A row of big pictures that scrolls sideways, the next one peeking in —
     swipe with a trackpad or finger, drag with the mouse, or use the arrows. */
  document.querySelectorAll('[data-swipe]').forEach(function (track) {
    var root = track.closest('.swipe');
    var prev = root.querySelector('[data-swipe-prev]'), next = root.querySelector('[data-swipe-next]');
    var items = Array.prototype.slice.call(track.children);
    function step() { return items[1] ? items[1].offsetLeft - items[0].offsetLeft : track.clientWidth; }
    var arrows = root.querySelector('[data-swipe-arrows]');
    if (arrows) {                                       // on the picture, at its right
      var hold = document.createElement('div');
      hold.className = 'swipe__stage';
      track.parentNode.insertBefore(hold, track);
      hold.appendChild(track); hold.appendChild(arrows);
    }
    var dots = Array.prototype.slice.call(root.querySelectorAll('[data-swipe-dots] button'));
    dots.forEach(function (d, i) {
      d.addEventListener('click', function () { track.scrollTo({ left: i * step(), behavior: 'smooth' }); });
    });
    function sync() {
      var max = track.scrollWidth - track.clientWidth - 2;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max;
      var at = Math.round(track.scrollLeft / step());
      dots.forEach(function (d, i) { d.setAttribute('aria-current', i === at ? 'true' : 'false'); });
    }
    prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
    next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { next.click(); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { prev.click(); e.preventDefault(); }
    });
    /* mouse drag */
    var down = false, x0 = 0, s0 = 0, moved = false;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; x0 = e.clientX; s0 = track.scrollLeft;
      track.classList.add('is-dragging');
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - x0;
      if (Math.abs(dx) > 4) moved = true;
      track.scrollLeft = s0 - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!down) return;
      down = false;
      track.classList.remove('is-dragging');
      /* settle on the nearest picture */
      var i = Math.round(track.scrollLeft / step());
      track.scrollTo({ left: i * step(), behavior: 'smooth' });
    });
    track.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
    sync();
  });

  /* ---------- the menu: the circle becomes a square ------------ */
  /* The menu button's circle grows into a large square holding the list;
     the button turns into a close cross. Esc, a click outside, or picking
     an entry folds it back. */
  (function menuPanel() {
    var btn = document.querySelector('[data-menu-open]');
    var panel = document.querySelector('[data-menu-panel]');
    if (!btn || !panel) return;
    var open = false, closing = null;
    function set(on) {
      if (on === open) return;
      open = on;
      clearTimeout(closing);
      btn.setAttribute('aria-expanded', on ? 'true' : 'false');
      btn.setAttribute('aria-label', on ? 'Close menu' : 'Open menu');
      document.documentElement.classList.toggle('menu-open', on);
      if (on) {
        panel.hidden = false;
        void panel.offsetWidth;                 // commit the closed size, then open at once
        panel.classList.add('is-open');
      } else {
        panel.classList.remove('is-open');
        closing = setTimeout(function () { panel.hidden = true; }, 280);
      }
    }
    btn.addEventListener('click', function (e) { e.stopPropagation(); set(!open); });
    panel.addEventListener('click', function (e) {
      if (e.target.closest('a')) set(false);
      e.stopPropagation();
    });
    document.addEventListener('click', function () { set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
  })();

  /* ---------- the title-screen menu (home hero) ---------------- */
  /* Work / About / My Universe; the last one drops four more. Every entry
     plays a soft retro blip on hover — a short triangle wave that glides
     up, quiet enough to sit under the room. Audio can only start after
     the first click or key, so the first hovers are silent. */
  (function heroMenu() {
    var menu = document.querySelector('[data-hero-menu]');
    if (!menu) return;

    var toggle = menu.querySelector('[data-menu-toggle]');
    var sub = toggle && document.getElementById(toggle.getAttribute('aria-controls'));
    var group = menu.querySelector('[data-menu-group]');
    if (toggle && sub) {
      var closing = null;
      function setOpen(on) {
        toggle.setAttribute('aria-expanded', on ? 'true' : 'false');
        sub.hidden = !on;
      }
      /* it opens on hover and stays while the pointer is over the group */
      group.addEventListener('pointerenter', function () { clearTimeout(closing); setOpen(true); });
      group.addEventListener('pointerleave', function () { closing = setTimeout(function () { setOpen(false); }, 260); });
      toggle.addEventListener('click', function () { setOpen(toggle.getAttribute('aria-expanded') !== 'true'); });
      group.addEventListener('focusout', function (e) { if (!group.contains(e.relatedTarget)) setOpen(false); });
    }

    var ctx = null, quiet = /[?&]mute\b/.test(location.search);
    function wake() {
      if (quiet) return;
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { ctx = new AC(); } catch (e) { ctx = null; }
    }
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
      window.addEventListener(ev, wake, { passive: true });
    });
    /* each entry answers with a low, soft note out of a minor scale — never the same twice running — that sinks
       into itself and comes back as an echo: a place with something hidden in it */
    var NOTES = [196, 220, 261.63, 293.66, 329.63, 392], last = -1;
    function blip() {
      if (window.__uljoSoundOff) return;                 // (pass 78: the visitor has turned the sound off)
      if (!ctx || ctx.state !== 'running') { if (ctx && ctx.state === 'suspended') ctx.resume(); return; }
      var t = ctx.currentTime, n;
      do { n = Math.floor(Math.random() * NOTES.length); } while (n === last);
      last = n;
      var f = NOTES[n], out = ctx.createGain(), lp = ctx.createBiquadFilter(), dl = ctx.createDelay(1), fb = ctx.createGain(), wet = ctx.createGain();
      lp.type = 'lowpass'; lp.Q.value = 3; lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(420, t + 1.2);
      dl.delayTime.value = .23; fb.gain.value = .46; wet.gain.value = .6;
      out.connect(lp); lp.connect(ctx.destination); lp.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(ctx.destination);
      [[1, .034, 'sine'], [1.498, .013, 'sine'], [2.006, .007, 'triangle'], [.5, .02, 'sine']].forEach(function (q) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = q[2];
        o.frequency.setValueAtTime(f * q[0] * 1.018, t);
        o.frequency.exponentialRampToValueAtTime(f * q[0], t + .55);      /* it settles down into the note */
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(q[1], t + .07);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.25);
        o.connect(g); g.connect(out);
        o.start(t); o.stop(t + 1.3);
      });
      setTimeout(function () { try { fb.gain.value = 0; wet.disconnect(); lp.disconnect(); } catch (e) {} }, 3600);
    }
    /* (pass 81: no sound on hover) */
  })();

  /* ---------- the room: a campfire by a river (pass 80) ---------------- */
  /* Sound can only start after the first click or key. From then on a real campfire by a night river plays very low
     under the title screen: assets/audio/campfire.m4a, 48 seconds cut from the video he chose ("Real Campfire by the
     Night River", The Escaper), its end already crossfaded into its start, so it loops without a seam. Lower on a
     walk (the song is there too); scroll past the first screen and it falls silent. It follows the sound switch. */
  (function room() {
    var hero = document.querySelector('[data-hero]');
    var bubble = document.querySelector('[data-firefly]');
    if (!hero) return;

    if (/[?&]mute\b/.test(location.search)) return;         /* index.html?mute: no sound at all */
    var ctx = null, master = null, started = false;
    function wake() {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { ctx = new AC(); } catch (e) { return; }
      master = ctx.createGain();
      master.gain.value = level();
      master.connect(ctx.destination);
      startFire();
    }
    wake();                                                  /* on the title screen already, wherever the browser allows it… */
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
      window.addEventListener(ev, wake, { passive: true });  /* …and from the first click or key everywhere else */
    });

    function level() {
      if (window.__uljoSoundOff) return 0;
      if (document.body.classList.contains('is-walking')) return .45;
      return window.scrollY < window.innerHeight * 0.9 ? 1 : 0;
    }
    function sync() {
      if (!master) return;
      var t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setTargetAtTime(level(), t, .35);
      follow();
    }
    /* pass 88: walking, the fire is heard as a fire is: full beside it, fainter and fainter the further he goes (over the
       planet's round, about a quarter at the far side of the lawn, nearly nothing on the other side); in a room of his
       own, far from it, it is not heard. Where he is: his figure, or the camera while he is out of sight (the car). */
    var near = null, nearTimer = 0;
    function nearness() {
      var W = window.__world;
      if (!W || !W.FIRE || !document.body.classList.contains('is-walking')) return 1;
      var x, y, z;
      try {
        if (W.me && W.me.visible) { var e = W.me.matrixWorld.elements; x = e[12]; y = e[13]; z = e[14]; }
        else { var c = W.camera.position; x = c.x; y = c.y; z = c.z; }
      } catch (err) { return 1; }
      var d = Math.sqrt((x - W.FIRE.x) * (x - W.FIRE.x) + (y - W.FIRE.y) * (y - W.FIRE.y) + (z - W.FIRE.z) * (z - W.FIRE.z));
      return d <= 2.5 ? 1 : 1 / (1 + Math.pow((d - 2.5) / 3, 1.6));
    }
    function follow() {
      if (!near) return;
      near.gain.setTargetAtTime(nearness(), ctx.currentTime, .3);
      var walking = document.body.classList.contains('is-walking');
      if (walking && !nearTimer) nearTimer = setInterval(follow, 150);
      else if (!walking && nearTimer) { clearInterval(nearTimer); nearTimer = 0; }
    }
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('uljo-sound', sync);
    new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });

    /* — the fire — */
    function startFire() {
      if (started) return; started = true;
      fetch('assets/audio/campfire.m4a?v=3').then(function (r) { return r.arrayBuffer(); }).then(function (ab) {
        return new Promise(function (ok, no) { var p = ctx.decodeAudioData(ab, ok, no); if (p && p.then) p.then(ok, no); });
      }).then(function (buf) {
        var src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
        var g = ctx.createGain(); g.gain.value = 0;
        near = ctx.createGain(); near.gain.value = nearness();
        src.connect(g); g.connect(near); near.connect(master); src.start();
        g.gain.setTargetAtTime(.02925, ctx.currentTime, 1.2);      /* pass 88: half of pass 87 (.0585) */      /* it comes up softly (pass 81: the file itself is louder now: it could not be heard) */
        window.__fire = { ctx: ctx, master: master, src: src, gain: g, near: near, nearness: nearness };      /* for checking */
      }).catch(function () {});
    }
    function noiseBuffer(sec) {
      var n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
      var last = 0;
      for (var i = 0; i < n; i++) { var w = Math.random() * 2 - 1; last = (last + .02 * w) / 1.02; d[i] = last * 3.5; }
      return b;
    }

    /* — the firefly — */
    if (!bubble) return;
    var textEl = bubble.querySelector('[data-firefly-text]');
    var LINE = "Hey there, I'm Evi. Click me!";
    function tick() {
      if (!ctx || !master) return;
      var t = ctx.currentTime;
      var s = ctx.createBufferSource(); s.buffer = noiseBuffer(.02);
      var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2600;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(.014, t + .003);                /* a whisper */
      g.gain.exponentialRampToValueAtTime(0.0001, t + .022);
      s.connect(hp); hp.connect(g); g.connect(master); s.start(t); s.stop(t + .03);
    }
    /* she types it, keeps it up two seconds, lets it go, and says it again */
    function type() {
      bubble.classList.remove('is-done');
      textEl.textContent = '';
      bubble.classList.add('is-on');
      var i = 0;
      (function step() {
        if (i >= LINE.length) {
          bubble.classList.add('is-done');
          setTimeout(function () {
            bubble.classList.remove('is-on');           /* fades out */
            setTimeout(type, 1100);                     /* …and comes back */
          }, 2000);
          return;
        }
        var ch = LINE.charAt(i++);
        textEl.textContent = LINE.slice(0, i);
        setTimeout(step, (ch === ',' || ch === '.') ? 260 : 55 + Math.random() * 60);
      })();
    }
    setTimeout(type, 2600);                          /* once the intro has settled */
  })();

  /* ---------- walkthrough control -------------------------- */
  /* Idle: a play glyph and the label. Running: the waveform plus a clock.
     There can be more than one button for it (the hero's and the bar's);
     they all drive one track and paint together. With no track yet it runs
     a stand-in timer so the states can be tried; give <audio
     data-audio-track> a data-src and it drives the real thing. */

  (function walkthrough() {
    var btns  = Array.prototype.slice.call(document.querySelectorAll('[data-audio-toggle]'));
    var audio = document.querySelector('[data-audio-track]');
    if (!btns.length) return;

    // The balado asks before it starts: the first press opens a small card
    // under the button — "Every project has a story." — and its Start
    // hearing button is what actually plays. Pressing while it plays stops it.
    var pop   = document.querySelector('[data-balado-pop]');
    var start = document.querySelector('[data-balado-start]');
    var popOpen = false;
    function showPop(on, near) {
      if (!pop) return;
      popOpen = on;
      // the card lives beside whichever button asked for it
      if (on && near) {
        var wrap = near.closest('.balado-wrap');
        if (wrap && pop.parentElement !== wrap) wrap.appendChild(pop);
      }
      btns.forEach(function (b) { if (b.classList.contains('balado')) b.setAttribute('aria-expanded', on ? 'true' : 'false'); });
      if (on) {
        pop.hidden = false;
        requestAnimationFrame(function () { pop.classList.add('is-open'); });
      } else {
        pop.classList.remove('is-open');
        setTimeout(function () { pop.hidden = true; }, 320);
      }
    }
    document.addEventListener('click', function (e) {
      if (popOpen && !e.target.closest('.balado-wrap')) showPop(false);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && popOpen) showPop(false); });

    var times = Array.prototype.slice.call(document.querySelectorAll('[data-audio-time]'));
    var src   = audio && (audio.dataset.src || audio.getAttribute('src') ||
                (audio.querySelector('source') && audio.querySelector('source').src));

    function clock(sec) {
      if (!isFinite(sec) || sec < 0) return '0:00';
      var m = Math.floor(sec / 60), r = Math.floor(sec % 60);
      return m + ':' + (r < 10 ? '0' : '') + r;
    }
    function paint(on) {
      btns.forEach(function (b) {
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.setAttribute('aria-label', on ? 'Pause walkthrough' : 'Play walkthrough');
      });
    }
    function tell(text) { times.forEach(function (t) { t.textContent = text; }); }
    // `fn(playing)` toggles; the buttons ask first when idle, the card's
    // Start button plays outright
    function onAll(fn, isPlaying) {
      btns.forEach(function (b) {
        b.addEventListener('click', function () {
          if (isPlaying()) { fn(); return; }
          if (pop) { showPop(!popOpen, b); return; }
          fn();
        });
      });
      if (start) start.addEventListener('click', function () { showPop(false); if (!isPlaying()) fn(); });
    }

    /* --- real track --- */
    if (src) {
      if (!audio.src) audio.src = src;
      onAll(function () {
        if (audio.paused) { audio.play().catch(function () {}); } else { audio.pause(); }
      }, function () { return !audio.paused; });
      audio.addEventListener('play',  function () { paint(true); });
      audio.addEventListener('pause', function () { paint(false); });
      audio.addEventListener('ended', function () { paint(false); tell(''); });
      audio.addEventListener('timeupdate', function () {
        tell(clock(audio.currentTime) + ' / ' + clock(audio.duration));
      });
      return;
    }

    /* --- stand-in, so the buttons are testable before the memo lands --- */
    var DEMO = 214;                       // 3:34
    var at = 0, tick = null;

    function stop() {
      clearInterval(tick); tick = null;
      paint(false);
      tell('');
      at = 0;
    }
    onAll(function () {
      if (tick) { stop(); return; }
      paint(true);
      tell(clock(at) + ' / ' + clock(DEMO));
      tick = setInterval(function () {
        at += 1;
        if (at >= DEMO) { stop(); return; }
        tell(clock(at) + ' / ' + clock(DEMO));
      }, 1000);
    }, function () { return !!tick; });
  })();

  /* ---------- atmosphere: fireflies -------------------------- */
  /* A canvas of slow blue fireflies behind the page, lit from the
     Underground Lab down. Everything moves per second, not per frame.
     Reduced motion gets none of it. */

  (function atmosphere() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (document.querySelector('[data-space]')) return;      // About me has stars instead

    var flyC = document.createElement('canvas');
    flyC.className = 'fx-fireflies';
    document.body.appendChild(flyC);
    var X = flyC.getContext('2d');
    var dpr = Math.min(1.5, window.devicePixelRatio || 1), W = 0, H = 0;
    function size() {
      W = window.innerWidth; H = window.innerHeight;
      flyC.width = Math.round(W * dpr); flyC.height = Math.round(H * dpr);
      X.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    window.addEventListener('resize', size);

    /* one soft light, painted once per tint; every firefly is that picture, scaled */
    function sprite(rgb, core) {
      var c = document.createElement('canvas'), S = 128; c.width = c.height = S;
      var x = c.getContext('2d'), g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      g.addColorStop(0, 'rgba(' + core + ',1)'); g.addColorStop(.06, 'rgba(' + core + ',.92)');
      g.addColorStop(.16, 'rgba(' + rgb + ',.46)'); g.addColorStop(.42, 'rgba(' + rgb + ',.11)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
      x.fillStyle = g; x.fillRect(0, 0, S, S); return c;
    }
    /* pass 84: like Evi, very slightly: small blue-white lights (no warm ones) that hover where they are, bob a little, flutter
       faintly as her wings do, and now and then dart to another spot nearby and settle. Few of them, and dim. */
    var TINTS = [sprite('120,190,255', '236,247,255'), sprite('150,210,255', '242,251,255')];
    var COUNT = Math.round(Math.min(16, Math.max(8, W / 110)));
    var flies = [];
    for (var i = 0; i < COUNT; i++) {
      var z = .35 + Math.random() * .65;
      flies.push({ x: Math.random() * W, y: Math.random() * H, z: z, vx: 0, vy: 0, tx: 0, ty: 0, wait: Math.random() * 4,
        b: Math.random() * 6.283, bs: .25 + Math.random() * .45, fl: Math.random() * 6.283, fs: 9 + Math.random() * 5, bob: Math.random() * 6.283,
        tint: Math.random() < .5 ? 0 : 1 });
      flies[i].tx = flies[i].x; flies[i].ty = flies[i].y;
    }
    flies.sort(function (p, q) { return p.z - q.z; });

    /* --- scroll gate --- */
    /* on the home page they come out with the lab's doors — and they drift
       over the dark, under the content (z 1) */
    var head = document.querySelector('[data-navi-from]');
    var labGate = head || document.querySelector('.lab') || document.querySelector('main');
    if (head) flyC.style.zIndex = '1';
    var lit = false, offAt = 0, looping = false;
    function gate() {
      var labEl = document.querySelector('[data-lab]');
      /* pass 81: on the home page they are already there when the Underground Lab's name comes (they waited for the doors) */
      var on = labEl ? (document.body.classList.contains('is-lab-open') || labEl.getBoundingClientRect().top < window.innerHeight * .3)
             : labGate ? labGate.getBoundingClientRect().top < window.innerHeight * (head ? 0.55 : 0.75) : true;
      if (on !== lit) { lit = on; flyC.style.opacity = on ? '1' : '0'; if (!on) offAt = performance.now(); else start(); }
    }
    window.addEventListener('scroll', gate, { passive: true });
    document.addEventListener('uljo:lab', gate);

    var mx = -999, my = -999;
    window.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });

    var last = 0, t = 0;
    function start() { if (!looping && !document.hidden) { looping = true; last = 0; requestAnimationFrame(frame); } }
    document.addEventListener('visibilitychange', function () { if (!document.hidden && lit) start(); });

    function frame(now) {
      if (document.hidden || (!lit && now - offAt > 1400)) { looping = false; X.clearRect(0, 0, W, H); return; }   // nothing to draw: the loop sleeps
      if (!last) last = now;
      var dt = Math.min(.05, (now - last) / 1000); last = now; t += dt;
      X.clearRect(0, 0, W, H);
      X.globalCompositeOperation = 'lighter';
      for (var i = 0; i < flies.length; i++) {
        var f = flies[i];
        /* where it wants to be: it waits, then picks a spot a little way off and darts there, slowing as it arrives */
        f.wait -= dt;
        if (f.wait <= 0) {
          var ang = Math.random() * 6.283, dist = 60 + Math.random() * 170 * f.z;
          f.tx = Math.min(W - 30, Math.max(30, f.x + Math.cos(ang) * dist)); f.ty = Math.min(H - 30, Math.max(30, f.y + Math.sin(ang) * dist * .6));
          f.wait = 2.5 + Math.random() * 5;
        }
        var dx = f.x - mx, dy = f.y - my, dd = dx * dx + dy * dy;
        if (dd < 16900) { var k0 = (1 - dd / 16900) * 60; f.tx += dx / Math.sqrt(dd + 1) * k0 * dt * 6; f.ty += dy / Math.sqrt(dd + 1) * k0 * dt * 6; }      // the pointer: it moves aside
        /* a soft spring toward it (a dart, then a glide to rest) */
        var ax = (f.tx - f.x) * 2.2 - f.vx * 2.6, ay = (f.ty - f.y) * 2.2 - f.vy * 2.6;
        f.vx += ax * dt; f.vy += ay * dt; f.x += f.vx * dt; f.y += f.vy * dt;
        f.bob += dt * (1.1 + f.z * .4);
        var bx = Math.sin(f.bob * .7) * 2.2 * f.z, by = Math.sin(f.bob) * 3.2 * f.z;      // hovering: a small figure in the air
        f.b += f.bs * dt; f.fl += f.fs * dt;
        var glowk = .55 + .45 * Math.pow(.5 + .5 * Math.sin(f.b), 1.6), flutter = .9 + .1 * Math.sin(f.fl);
        var r = (6 + 12 * f.z) * (.9 + .15 * glowk);
        X.globalAlpha = (.12 + .38 * f.z) * glowk * flutter;
        X.drawImage(TINTS[f.tint], f.x + bx - r, f.y + by - r, r * 2, r * 2);
      }
      X.globalAlpha = 1; X.globalCompositeOperation = 'source-over';
      requestAnimationFrame(frame);
    }
    gate();
  })();

  /* ---------- scroll-in motion ---------------------------- */

  (function reveal() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;

    // What arrives, and how much each item is delayed behind its neighbours.
    var groups = [
      ['.hero__title, .hero__actions .btn', 1],
      ['.about', 0],
      ['.projects .card', 1],
      ['.carousel__caption', 1],
      ['.quote p', 0],
      ['.feature__text > *', 1],
      ['.feature__media', 0],
      ['.footer__title, .footer__mail, .footer .btn--giant', 1],
      // case-study page
      ['.case-say > *', 1],
      ['.case-cue, .case-title', 0],
      ['.case-process > *', 1],
      ['.case-block > *', 1],
      ['.case-plate, .case-gallery .dots', 0],
      ['.case-thanks', 0]
    ];

    groups.forEach(function (pair) {
      var pop = /\.card$|\.pblock$/.test(pair[0]);
      document.querySelectorAll(pair[0]).forEach(function (el, i) {
        el.classList.add('reveal');
        if (pop) el.classList.add('reveal--pop');
        if (pair[1]) el.style.setProperty('--stagger', i % 4);
      });
    });

    // the words come in from the sides: titles from the left, the text
    // beside them from the right
    document.querySelectorAll('.case-block > .case-h, .case-cue, .case-title, .case-say > *').forEach(function (el) {
      if (el.classList.contains('reveal')) el.classList.add('reveal--slide', 'reveal--words');
    });
    document.querySelectorAll('.case-block > .case-body').forEach(function (el) {
      if (el.classList.contains('reveal')) el.classList.add('reveal--slide', 'reveal--words', 'from-right');
    });

    // case plates slide in from the side: full-width ones alternate, the
    // two of a pair come from their own sides
    var side = 0;
    document.querySelectorAll('.case-plate').forEach(function (el) {
      if (el.classList.contains('case-plate--hero')) { el.classList.remove('reveal'); return; }   // it is already there
      el.classList.add('reveal--slide');
      var pair = el.closest('.case-pair');
      var right = pair ? el === pair.children[1] : (side++ % 2 === 1);
      if (right) el.classList.add('from-right');
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  })();

  /* ---------- the kiosk block: the prototype plays on its screen -- */
  /* The screen's four corners were measured off the photo (2000 x 1125).
     A 1224 x 792 layer — the prototype's own frame — is bent onto them
     with a homography, then the captured screens cross-fade on their own,
     as if someone were checking out. Paused while off screen. */
  (function kiosk() {
    var boxes = Array.prototype.slice.call(document.querySelectorAll('[data-kiosk]'));
    var SW = 1224, SH = 792, IW = 2000;
    var QUAD = [[456, 130], [1279, 152], [1578, 813], [747, 937]];   // TL TR BR BL, 1 px inside the glass
    var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function solve(A, b) {                       // Gaussian elimination, 8 x 8
      var n = b.length, i, j, k;
      for (i = 0; i < n; i++) {
        var m = i;
        for (k = i + 1; k < n; k++) if (Math.abs(A[k][i]) > Math.abs(A[m][i])) m = k;
        var t = A[i]; A[i] = A[m]; A[m] = t; t = b[i]; b[i] = b[m]; b[m] = t;
        for (k = i + 1; k < n; k++) {
          var f = A[k][i] / A[i][i];
          for (j = i; j < n; j++) A[k][j] -= f * A[i][j];
          b[k] -= f * b[i];
        }
      }
      var x = new Array(n);
      for (i = n - 1; i >= 0; i--) {
        var sum = b[i];
        for (j = i + 1; j < n; j++) sum -= A[i][j] * x[j];
        x[i] = sum / A[i][i];
      }
      return x;
    }
    /* bend the 1224 x 792 screen layer onto the photo's glass, at whatever
       size the kiosk box is drawn — also used by the block's grow-to-page */
    function fit(box) {
      var screen = box.querySelector('[data-kiosk-screen]');
      var k = box.clientWidth / IW;
      if (!k || !screen) return;
      var src = [[0, 0], [SW, 0], [SW, SH], [0, SH]], A = [], b = [];
      for (var i = 0; i < 4; i++) {
        var X = src[i][0], Y = src[i][1], u = QUAD[i][0] * k, v = QUAD[i][1] * k;
        A.push([X, Y, 1, 0, 0, 0, -u * X, -u * Y]); b.push(u);
        A.push([0, 0, 0, X, Y, 1, -v * X, -v * Y]); b.push(v);
      }
      var h = solve(A, b);
      screen.style.transform = 'matrix3d(' + [h[0], h[3], 0, h[6], h[1], h[4], 0, h[7], 0, 0, 1, 0, h[2], h[5], 0, 1].join(',') + ')';
    }
    window.__kioskFit = fit;

    var HOLD = [1900, 1450, 1450, 1450, 1450, 1150, 1450, 2200];     // brisk; the welcome and the thanks linger a little
    boxes.forEach(function (box) {
      fit(box);
      if ('ResizeObserver' in window) new ResizeObserver(function () { fit(box); }).observe(box);
      else window.addEventListener('resize', function () { fit(box); });

      var slides = Array.prototype.slice.call(box.querySelectorAll('[data-kiosk-screen] img'));
      var at = 0, timer = null;
      /* arriving from the home page's block: carry on from the same screen */
      if (box.hasAttribute('data-kiosk-hero')) {
        try {
          var from = parseInt(sessionStorage.getItem('uljo-kiosk-at'), 10);
          sessionStorage.removeItem('uljo-kiosk-at');
          if (from > 0 && from < slides.length) {
            slides[0].classList.remove('is-on'); slides[from].classList.add('is-on'); at = from;
            slides[from].loading = 'eager';
          }
        } catch (e) {}
      }
      box.__slide = function () { return at; };
      if (slides.length < 2) return;                  // the live prototype: nothing to cycle
      function next() {
        var from = slides[at];
        at = (at + 1) % slides.length;
        var to = slides[at];
        from.classList.remove('is-on'); from.classList.add('is-off');
        to.classList.remove('is-off'); to.classList.add('is-on');
        setTimeout(function () { from.classList.remove('is-off'); }, 700);
        timer = setTimeout(next, HOLD[at] || 2600);
      }
      function run(on) {
        clearTimeout(timer); timer = null;
        if (on) timer = setTimeout(next, HOLD[at] || 2600);
      }
      if (calm) return;
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (e) { run(e[0].isIntersecting); }, { threshold: .15 }).observe(box);
      } else run(true);
    });
  })();

  /* ---------- leaving for another page: the page lifts away ----- */
  /* The page fades, softens and rises a little, then the next page opens
     (and, where the browser has view transitions, arrives the same way). */
  var calmMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function leave(href) {
    if (calmMotion) { window.location.href = href; return; }
    document.body.classList.add('is-leaving');
    setTimeout(function () { window.location.href = href; }, 520);
  }
  window.addEventListener('pageshow', function () { document.body.classList.remove('is-leaving'); });

  /* ---------- the project cards: another view, or Explore ------- */
  /* Clicking a card opens another picture of the project from where you
     clicked, then the next; after the last, the card's own art comes back.
     Explore opens the project. */
  (function cards() {
    document.querySelectorAll('.pblock').forEach(function (b) {
      var cta = b.querySelector('.pblock__cta');
      var views = [];
      try { views = JSON.parse(b.getAttribute('data-views') || '[]'); } catch (e) {}
      if (cta) cta.addEventListener('click', function (e) {
        var href = cta.getAttribute('href');
        if (!href || href === '#') { e.preventDefault(); return; }
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;   // a new tab, as asked
        e.preventDefault(); e.stopPropagation();
        var kiosk = b.querySelector('[data-kiosk]');
        if (kiosk && kiosk.__slide) { try { sessionStorage.setItem('uljo-kiosk-at', String(kiosk.__slide())); } catch (er) {} }
        leave(cta.href);
      });
      if (!views.length) return;

      var at = 0, layers = [];
      var pips = document.createElement('span');
      pips.className = 'pblock__pips'; pips.setAttribute('aria-hidden', 'true');
      for (var i = 0; i <= views.length; i++) pips.appendChild(document.createElement('i'));
      b.appendChild(pips);
      function paintPips() { Array.prototype.forEach.call(pips.children, function (p, i) { p.classList.toggle('is-on', i === at); }); }
      paintPips();
      b.tabIndex = 0;
      b.setAttribute('aria-label', (b.querySelector('.pblock__title') || b).textContent.trim() + ', click for another view');

      function layer(k) {
        if (layers[k]) return layers[k];
        var img = document.createElement('img');
        img.className = 'pblock__view'; img.alt = ''; img.decoding = 'async';
        img.src = views[k - 1];
        b.insertBefore(img, b.querySelector('.pblock__text'));
        return (layers[k] = img);
      }
      // the next picture loads before it's asked for
      function warm(k) { if (k >= 1 && k <= views.length) layer(k); }

      function step(x, y) {
        var next = (at + 1) % (views.length + 1);
        if (next > 0) {
          var img = layer(next);
          img.style.setProperty('--x', x); img.style.setProperty('--y', y);
          layers.forEach(function (l) { if (l) l.style.zIndex = '2'; });   // the new one opens over the last
          img.style.zIndex = '3';
          img.classList.remove('is-shown'); void img.offsetWidth;
          img.classList.add('is-shown');
          b.classList.add('is-viewing');
          warm(next + 1);
        } else {
          // back to the card's own art: only the top picture closes, into the click
          var top = layers[at];
          layers.forEach(function (l) { if (l && l !== top) l.classList.remove('is-shown'); });
          top.style.setProperty('--x', x); top.style.setProperty('--y', y);
          top.classList.remove('is-shown');
          b.classList.remove('is-viewing');
        }
        at = next; paintPips();
      }
      b.addEventListener('pointerenter', function () { warm(1); }, { once: true });
      b.addEventListener('click', function (e) {
        if (e.target.closest('.pblock__cta')) return;
        if (window.getSelection && String(window.getSelection())) return;
        var r = b.getBoundingClientRect();
        step(((e.clientX - r.left) / r.width * 100).toFixed(1) + '%', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
      });
      b.addEventListener('keydown', function (e) {
        if (e.target !== b || (e.key !== 'Enter' && e.key !== ' ')) return;
        e.preventDefault(); step('50%', '50%');
      });
    });
  })();

  /* ---------- the posters arrive, folded (pass 78) ---------------- */
  /* His words: "an amazing reveal of poster when scrolling. Like it was small or unfolded then when scrolling it unfolds
     into this showcase." The first poster comes as a sheet folded in four, small, its blank back outside. The page holds
     still (a tall stretch, the carousel pinned in it) while the scroll opens it: the side fold first, then the top one,
     and the open sheet grows to exactly where the middle poster of the carousel stands; then the others come out
     from behind it. Scrolled back up, it folds again. */
  /* (pass 83: the posters no longer arrive folded: he keeps the carousel alone, with its arrows) */

  /* a phone app drawn edge to edge gets the phone's own top and bottom: the clock and the signs round the island,
     the home bar under it — so the app sits in the phone as it would in a real one (data-top / data-bottom on the device) */
  /* pass 90: a scroll that must wait. Until until() is true a hand cannot take the page below `top` (wheel, finger, keys);
     the listeners that can stop a scroll are there only while it waits. (The lab's name has its own, in lab().) */
  window.__uljoHold = (function () {
    var on = null, handAt = 0, ty = 0, poll = 0;
    function active() { if (on && on.until()) off(); return !!on; }
    function past() { return on && window.scrollY >= on.top - 2; }
    function onWheel(e) { handAt = performance.now(); if (active() && e.deltaY > 0 && !e.ctrlKey && past()) e.preventDefault(); }
    function onTS(e) { ty = e.touches[0].clientY; handAt = performance.now(); }
    function onTM(e) { handAt = performance.now(); var y = e.touches[0].clientY, up = ty - y; ty = y; if (active() && up > 0 && past() && e.cancelable) e.preventDefault(); }
    function onKey(e) {
      if (!active() || (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]' + (e.key === ' ' ? ',button,a,[role=button]' : '')))) return;
      if (/^(ArrowDown|PageDown|End| )$/.test(e.key) && !e.shiftKey) { handAt = performance.now(); if (past()) e.preventDefault(); }
    }
    function onScroll() { if (active() && performance.now() - handAt < 700 && window.scrollY > on.top) window.scrollTo({ top: on.top, behavior: 'instant' }); }
    function off() {
      if (!on) return; on = null; clearInterval(poll);
      window.removeEventListener('wheel', onWheel, { passive: false }); window.removeEventListener('touchstart', onTS, { passive: true });
      window.removeEventListener('touchmove', onTM, { passive: false }); window.removeEventListener('keydown', onKey); window.removeEventListener('scroll', onScroll, { passive: true });
    }
    return function (top, until) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (on) { on.top = top; on.until = until; return; }
      on = { top: top, until: until };
      window.addEventListener('wheel', onWheel, { passive: false }); window.addEventListener('touchstart', onTS, { passive: true });
      window.addEventListener('touchmove', onTM, { passive: false }); window.addEventListener('keydown', onKey); window.addEventListener('scroll', onScroll, { passive: true });
      poll = setInterval(active, 120);
    };
  })();
  /* pass 90: recorded sounds (no sound is made in code): a page turned, the journal opened, the television zapped.
     window.__uljoSfx('page', { rate, vol }) — silent when the site's sound is off or the page is ?mute */
  window.__uljoSfx = (function () {
    var FILES = { page: 'assets/audio/page-turn.m4a', zap: 'assets/audio/tv-zap.m4a' }, bufs = {}, ctx = null, MUTED = /[?&]mute\b/.test(location.search);
    function get(name) {
      if (bufs[name]) return bufs[name];
      return (bufs[name] = fetch(FILES[name]).then(function (r) { return r.arrayBuffer(); }).then(function (ab) {
        return new Promise(function (ok, no) { var pr = ctx.decodeAudioData(ab, ok, no); if (pr && pr.then) pr.then(ok, no); });
      }));
    }
    return function (name, o) {
      o = o || {};
      if (MUTED || window.__uljoSoundOff || !FILES[name]) return;
      try { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); } catch (e) { return; }
      get(name).then(function (buf) {
        var src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = buf; src.playbackRate.value = o.rate || 1;
        g.gain.value = o.vol == null ? .5 : o.vol; src.connect(g); g.connect(ctx.destination); src.start(ctx.currentTime + (o.delay || 0));
      }).catch(function () {});
    };
  })();
  /* pass 89: Recyco opens on its main menu, not on its welcome (wherever it is shown on this site) */
  function protoHome(frame) {
    if ((frame.getAttribute('src') || '').indexOf('recyco') < 0) return;
    try { frame.contentWindow.eval("if(typeof goTo==='function'&&cur==='s-welcome'){goTo('s-home','tab');document.querySelectorAll('.scr').forEach(function(el){clearTimeout(el._t);el.classList.remove('leave','in-tab','out-tab')})}"); } catch (e) {}
  }
  /* pass 89: a case study shown inside the home page (an iframe, ?embed): no bar of its own, its links open in the page
     itself, and its words wait to be called in (html.case-in) */
  var EMBED = window.self !== window.top && /[?&]embed\b/.test(location.search);
  if (EMBED) {
    document.documentElement.classList.add('is-embed');
    document.addEventListener('click', function (e) {    // a link to another page opens in the page itself, not in the sheet
      var a = e.target.closest && e.target.closest('a[href]'); if (!a || a.target) return;
      var u; try { u = new URL(a.getAttribute('href'), location.href); } catch (err) { return; }
      if (u.pathname === location.pathname && u.hash) return;
      a.target = '_top';
    }, true);
    try { if (window.top.__uljoCaseReady) window.top.__uljoCaseReady(window); } catch (e) {}
  }
  function phoneBars(dev) {
    var top = +dev.getAttribute('data-top') || 0, bot = +dev.getAttribute('data-bottom') || 0;
    if (!top && !bot) return 0;
    var glass = dev.querySelector('.dev__glass'); if (!glass) return 0;
    glass.style.setProperty('--app-top', top + 'px'); glass.style.setProperty('--app-bottom', bot + 'px');
    glass.style.background = dev.getAttribute('data-bar') || '#000';
    glass.classList.add('has-bars'); if (dev.getAttribute('data-ink') === 'light') glass.classList.add('has-bars--light');
    var bar = document.createElement('div'); bar.className = 'dev__status'; bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = '<b>9:41</b><span><svg viewBox="0 0 18 12"><path d="M1 9h2v3H1zM5.500 6.500h2V12h-2zM10 4h2v8h-2zM14.500 1h2v11h-2z" fill="currentColor"/></svg><svg viewBox="0 0 16 12"><path d="M8 2.200c2.300 0 4.400.900 6 2.400l1-1.100C13.100 1.600 10.700.600 8 .600S2.900 1.600 1 3.500l1 1.100c1.600-1.500 3.700-2.400 6-2.400zm0 3.400c1.400 0 2.700.500 3.700 1.400l1-1.100C11.400 4.700 9.800 4 8 4s-3.400.700-4.700 1.900l1 1.100c1-.900 2.300-1.400 3.700-1.400zm0 3.300c-.800 0-1.500.300-2 .800L8 12l2-2.300c-.500-.500-1.200-.800-2-.800z" fill="currentColor"/></svg><svg viewBox="0 0 27 12"><rect x=".5" y=".5" width="22" height="11" rx="3.300" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="19" height="8" rx="2" fill="currentColor"/><path d="M24 4v4c.800-.300 1.500-1 1.500-2s-.700-1.700-1.500-2z" fill="currentColor" opacity=".45"/></svg></span>';
    var home = document.createElement('i'); home.className = 'dev__home'; home.setAttribute('aria-hidden', 'true');
    glass.appendChild(bar); glass.appendChild(home);
    return top + bot;
  }

  /* ---------- entering the Underground Lab ----------------------- */
  /* One pinned scene, its length in screens of scroll set here:
       the heading arrives (title) → the ride down the shaft, lights sliding
       up past you (descent) → the doors come up and part as you pass
       through the words (doors) → then the projects, one device at a time:
       it comes out of the dark from the right, turning a turn and a quarter
       on itself (enter), lands flat and becomes the live prototype with its
       words on the left (hold), then turns away into the dark (exit) and
       the next one comes.
     The fireflies only come out once the doors part (body.is-lab-open). */
  (function lab() {
    var sec = document.querySelector('[data-lab]');
    if (!sec) return;
    var pin = sec.querySelector('.lab__pin');
    var shaft = sec.querySelector('[data-lab-shaft]');
    var doors = sec.querySelector('[data-lab-doors]');
    var doorL = sec.querySelector('.lab__door--l'), doorR = sec.querySelector('.lab__door--r');
    var lock = sec.querySelector('.lab__lock');
    var inside = sec.querySelector('[data-lab-inside]');
    var rails = sec.querySelector('.lab__rails');
    var title = sec.querySelector('.lab__title');
    var why = sec.querySelector('[data-lab-why]');
    var show = sec.querySelector('[data-show]');
    var items = Array.prototype.slice.call(show.querySelectorAll('[data-show-item]'));
    var n = items.length;

    /* — the devices: a front (the glass), a back, and a body between them made
         of thin slices, so the edge is really there when it turns — */
    var devs = items.map(function (item) {
      var dev = item.querySelector('[data-dev]');
      var cs = getComputedStyle(dev);
      var bz = parseFloat(cs.getPropertyValue('--bz')) || 12, t = parseFloat(cs.getPropertyValue('--t')) || 40;
      var w = (+dev.getAttribute('data-w')) + bz * 2, h = (+dev.getAttribute('data-h')) + phoneBars(dev) + bz * 2;
      dev.style.width = w + 'px'; dev.style.height = h + 'px';
      dev.style.margin = (-h / 2) + 'px 0 0 ' + (-w / 2) + 'px';
      var r = parseFloat(cs.getPropertyValue('--r')) || 0;
      var count = Math.max(10, Math.round(t / 1.6)), first = dev.firstChild;
      for (var i = 0; i < count; i++) {                  // the slices round the corners
        var sl = document.createElement('i');
        sl.className = 'dev__slice';
        sl.style.setProperty('--z', (-t / 2 + (t * (i + .5)) / count).toFixed(2) + 'px');
        dev.insertBefore(sl, first);
      }
      [['l', t, h - 2 * r, -t / 2, r], ['r', t, h - 2 * r, w - t / 2, r],        // four solid walls for the straight runs
       ['t', w - 2 * r, t, r, -t / 2], ['b', w - 2 * r, t, r, h - t / 2]].forEach(function (q) {
        var wl = document.createElement('i');
        wl.className = 'dev__wall dev__wall--' + q[0];
        wl.style.cssText = 'width:' + q[1] + 'px;height:' + q[2] + 'px;left:' + q[3] + 'px;top:' + q[4] + 'px';
        dev.insertBefore(wl, first);
      });
      var frame = item.querySelector('iframe');
      /* pass 76: no play button on the glass. The whole glass is the button (the pointer turns into "Try it" over it),
         and a point of light is the hand that shows the app at work. (Pass 77: nothing glows behind the device, and it does not breathe.) */
      var glass = dev.querySelector('.dev__glass'), stEl = item.querySelector('.show__stage'), nm = item.querySelector('.show__name');
      var hit = document.createElement('button'); hit.type = 'button'; hit.className = 'dev__hit'; hit.setAttribute('data-try', '');
      hit.setAttribute('aria-label', 'Try the prototype' + (nm ? ': ' + nm.textContent : ''));
      var finger = document.createElement('i'); finger.className = 'dev__finger'; finger.setAttribute('aria-hidden', 'true');
      if (glass) { glass.appendChild(finger); glass.appendChild(hit); }
      var d = { item: item, dev: dev, stage: item.querySelector('.show__stage'), frame: frame,
                key: (item.className.match(/show__item--(\w+)/) || [])[1] || '', hit: hit, finger: finger, demo: null, dirty: false, demoT: 0,
                w: w, h: h, k: 1, loaded: false, state: '',
                mir: items.indexOf(item) % 2 ? -1 : 1,            // pass 75: back and forth — every other one stands on the left
                car: !!item.querySelector('[data-car-show]') };     // the Manic GT comes as a car first (car-show.js)
      frame.addEventListener('load', function () {
        if (!frame.getAttribute('src')) return;
        protoHome(frame);
        d.loaded = true; item.classList.add('is-live');
        if (d.demo && DEMO[d.key] && DEMO[d.key].mute) { try { DEMO[d.key].mute(frame.contentWindow); } catch (e) {} }      // shown at work, it makes no sound
      });
      return d;
    });
    function wake(d) {                                   // the prototype starts loading on the way in
      if (d.frame.getAttribute('src')) return;
      d.frame.setAttribute('src', d.frame.getAttribute('data-src'));
    }
    function rest(d) {                                   // far behind or ahead: it stops running
      if (!d.frame.getAttribute('src')) return;
      d.frame.removeAttribute('src'); d.loaded = false;
      d.item.classList.remove('is-live');
    }
    function fitDevs() {
      devs.forEach(function (d) {
        var r = d.stage.getBoundingClientRect();
        if (!r.width || !r.height) return;
        d.k = Math.min(r.width * .96 / d.w, r.height * .9 / d.h, 1);
        if (d.dev.classList.contains('dev--phone')) d.k = Math.min(d.k, r.height * .8 / d.h);      // a phone keeps some air round it
      });
    }
    /* pass 89: Case study opens in place. Nothing jumps: the device glides to where it stands on its case study (the
       middle, at the top), its words leave, and the case study comes up round it: its own page, in a sheet under the
       bar (an iframe, ?embed), its words appearing one after the other. Back (or the browser's back, or Escape) runs it
       the other way: the sheet goes, the device glides home, its words return. The scroll of the home page never moves. */
    var cased = null, popSkip = false;
    function caseTarget(fr, done) {                       // where the device stands on the case study, once laid out
      var t0 = performance.now();
      (function look() {
        if (!cased || cased.frame !== fr) return;
        var doc = null; try { doc = fr.contentDocument; } catch (e) {}
        if (doc && doc.readyState !== 'loading') {
          var dv = doc.querySelector('[data-dev-still]'), pl = dv && dv.parentNode;
          var m = dv && /scale\(([\d.]+)\)/.exec(dv.style.transform || '');
          var vh0 = fr.clientHeight || window.innerHeight;
          if (m) {
            var r = pl.getBoundingClientRect();
            if (r.width && r.top < vh0 * .8) return done({ cx: r.left + r.width / 2, cy: r.top + r.height / 2, k: +m[1] });
          } else if (!dv) {
            /* no device at the top (Easy-Checkout opens on its kiosk's screen, played by the scroll): the glass lands on that screen */
            var cv = doc.querySelector('[data-scrub-canvas]'), cr = cv && cv.getBoundingClientRect();
            if (cr && cr.width && cr.top < vh0 * .8) return done({ cx: cr.left + cr.width / 2, cy: cr.top + cr.height / 2, k: cr.width / (+cased.d.dev.getAttribute('data-w') || cr.width) });
            if (performance.now() - t0 > 900) return done(null);
          }
        }
        if (performance.now() - t0 < 2500) setTimeout(look, 40); else done(null);
      })();
    }
    function openCase(d, href) {
      if (cased) return;
      if (staged && staged !== d) unstage();
      demoStop(d); tipOff();
      var sheet = document.createElement('div'); sheet.className = 'case-sheet';
      sheet.innerHTML = '<iframe class="case-sheet__frame" title="Case study"></iframe>' +
        '<button class="case-sheet__back" type="button" aria-label="Back to the projects"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
      var fr = sheet.querySelector('iframe');
      fr.src = href + (href.indexOf('?') < 0 ? '?' : '&') + 'embed';
      document.body.appendChild(sheet);
      var r = d.stage.getBoundingClientRect(), wasStaged = staged === d;
      cased = { d: d, sheet: sheet, frame: fr, from: d.dev.style.transform, staged: wasStaged, lx: r.left + r.width / 2, ly: r.top + r.height / 2, done: false };
      document.documentElement.classList.add('is-cased');
      d.item.classList.add('is-casing');
      sheet.querySelector('.case-sheet__back').addEventListener('click', function () { closeCase(); });
      try { history.pushState({ uljoCase: d.key }, '', '#' + (d.key ? 'case-' + d.key : 'case')); } catch (e) {}
      requestAnimationFrame(function () { sheet.classList.add('is-on'); });
      caseTarget(fr, function (t) {
        if (!cased || cased.frame !== fr) return;
        var c = cased;
        if (!t) t = { cx: window.innerWidth / 2, cy: window.innerHeight / 2, k: d.k * 1.25 };
        var dx = t.cx - c.lx, dy = t.cy - c.ly;
        d.dev.style.transition = 'transform 1s cubic-bezier(.65,0,.3,1)';
        d.dev.style.transform = 'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0) scale(' + t.k.toFixed(4) + ')';
        c.timer = setTimeout(function () {
          if (cased !== c) return;
          c.done = true; sheet.classList.add('is-shown');
          try { fr.contentDocument.documentElement.classList.add('case-in'); } catch (e) {}
          try { fr.contentWindow.focus(); } catch (e) {}
        }, calmMotion ? 0 : 1000);
      });
    }
    function closeCase(fromPop) {
      if (!cased) return;
      var c = cased, d = c.d; cased = null; clearTimeout(c.timer);
      c.sheet.classList.remove('is-shown');
      c.sheet.classList.add('is-leaving');
      setTimeout(function () {
        d.dev.style.transition = 'transform 1s cubic-bezier(.65,0,.3,1)';
        d.dev.style.transform = c.staged && staged === d ? c.from : 'scale(' + d.k.toFixed(4) + ')';
        d.item.classList.remove('is-casing');
      }, calmMotion ? 0 : 260);
      setTimeout(function () {
        c.sheet.remove(); document.documentElement.classList.remove('is-cased');
        d.dev.style.transition = '';
        if (!(c.staged && staged === d)) { d.dirty = true; demoSoon(d, 900); }
      }, calmMotion ? 0 : 1300);
      if (!fromPop) { popSkip = true; try { history.back(); } catch (e) {} }
    }
    window.addEventListener('popstate', function () { if (popSkip) { popSkip = false; return; } if (cased) closeCase(true); });
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && cased) closeCase(); });
    window.__uljoCaseReady = function (w) {               // the case study's page tells us it is there: Escape inside it comes back too
      try { w.addEventListener('keydown', function (e) { if (e.key === 'Escape' && cased) closeCase(); }); } catch (e) {}
    };
    document.querySelectorAll('.show__cta, .show__more').forEach(function (cta) {
      cta.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        var d = devs.filter(function (q) { return q.item.contains(cta); })[0];
        if (d && !calmMotion && (d.state === 'down' || staged === d)) openCase(d, cta.getAttribute('href'));
        else if (d && !calmMotion && (d.state === 'in' || d.state === 'out')) toRest(d, function () { openCase(d, cta.getAttribute('href')); });      // (pass 92: still turning: it rests first)
        else leave(cta.href);
      });
    });

    /* — front stage: Start prototype brings the device to the middle of the
         screen, as large as it fits, and only then is it running — */
    var staged = null, stageY = 0;
    function carShow(d) { return d.car && window.__carShow && window.__carShow.ready ? window.__carShow : null; }
    /* pass 92: the page glides (by itself, in at most 0.7 s) to where a device rests, then `done` */
    var glideRaf = 0;
    function toRest(d, done, from) {
      var i = devs.indexOf(d), at = (from || d.state) === 'out' ? landOf(i) + SEG.hold - .04 : landOf(i) + .04;
      var y = sec.getBoundingClientRect().top + window.scrollY + at * vh, y0 = window.scrollY, t0 = performance.now();
      var dur = Math.min(700, 260 + Math.abs(y - y0) / vh * 420);
      cancelAnimationFrame(glideRaf);
      (function step(now) {
        var k = Math.min(1, (now - t0) / dur), e = k * k * (3 - 2 * k);
        window.scrollTo({ top: y0 + (y - y0) * e, behavior: 'instant' });
        if (k < 1) { glideRaf = requestAnimationFrame(step); return; }
        glideRaf = 0;
        if (from) { done(); return; }
        paint();
        if (d.state === 'down') done();
      })(t0);
    }
    function stage(d) {
      if (staged === d) return;
      var turning = !calmMotion && (d.state === 'in' || d.state === 'out');
      if (!calmMotion && d.state !== 'down' && !turning) return;
      if (staged) unstage();
      if (turning) {
        /* pass 93: pressed while it still turns, it opens at once, from the pose it is in: it is counted as resting, and
           the transition carries it from its turn straight to the middle of the screen, flat. Meanwhile the page glides
           underneath to where it rests (the lab does not move it while it glides: d.toRest) */
        var from = d.state;
        d.toRest = true; d.state = 'down';
        d.item.classList.add('is-on', 'is-landed');
        d.stage.style.opacity = ''; d.stage.style.filter = ''; d.dev.style.setProperty('--sheen-o', '0');
        d.tin = 1; d.item.style.setProperty('--tin', '1'); d.item.classList.add('has-text');
        void d.dev.offsetWidth;
        toRest(d, function () { d.toRest = false; stageY = window.scrollY; paint(); }, from);
      }
      demoStop(d); tipOff();
      if (d.dirty) {                                       // it was showing itself: the visitor gets it from its first screen
        d.dirty = false;
        if (DEMO[d.key] && DEMO[d.key].after) { try { DEMO[d.key].after(); } catch (e) {} }
        d.loaded = false; d.item.classList.remove('is-live');
        try { d.frame.contentWindow.location.reload(); } catch (e) { d.frame.setAttribute('src', d.frame.getAttribute('data-src')); }
      }
      staged = d; stageY = window.scrollY; wake(d);
      var W = document.documentElement.clientWidth, H = window.innerHeight;
      var bar = document.querySelector('.topbar'), top = (bar ? bar.offsetHeight : 0) + 14, foot = 92;
      var r = d.stage.getBoundingClientRect();
      var k2 = Math.min((W - 40) / d.w, (H - top - foot) / d.h, 1.15);
      var dx = W / 2 - (r.left + r.width / 2), dy = top + (H - top - foot) / 2 - (r.top + r.height / 2);
      d.item.classList.add('is-stage'); sec.classList.add('has-stage');
      d.dev.style.transform = 'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0) scale(' + k2.toFixed(4) + ')';
    }
    function unstage() {
      if (!staged) return;
      var d = staged; staged = null;
      d.item.classList.remove('is-stage'); sec.classList.remove('has-stage');
      if (d.state === 'down') { d.dev.style.transform = 'scale(' + d.k.toFixed(4) + ')'; d.dirty = true; demoSoon(d, 900); }
    }

    /* — over a prototype the pointer becomes a button: "Try it", in the project's own colour — */
    var tip = document.createElement('div'); tip.className = 'try-tip'; tip.setAttribute('aria-hidden', 'true'); tip.innerHTML = '<b>Try it</b>';
    document.body.appendChild(tip);
    function tipAt(e) { tip.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)'; }
    function tipOff() { tip.classList.remove('is-on', 'is-down'); }
    devs.forEach(function (d) {
      d.hit.addEventListener('pointerenter', function (e) {
        if (e.pointerType === 'touch') return;
        var cs = getComputedStyle(d.item);
        tip.style.setProperty('--tip', cs.getPropertyValue('--brand').trim() || '#fff');
        tip.style.setProperty('--tip-ink', cs.getPropertyValue('--brand-ink').trim() || '#0b0b0d');
        tipAt(e); tip.classList.add('is-on');
      });
      d.hit.addEventListener('pointermove', function (e) { if (e.pointerType !== 'touch') tipAt(e); });
      d.hit.addEventListener('pointerleave', tipOff);
      d.hit.addEventListener('pointerdown', function () { tip.classList.add('is-down'); });
      d.hit.addEventListener('pointerup', function () { tip.classList.remove('is-down'); });
    });
    window.addEventListener('scroll', function () { if (tip.classList.contains('is-on')) tipOff(); }, { passive: true });

    /* — each prototype shown at work (pass 76): once a device has landed its real app runs, and a hand of light
         uses it — the way one would show it to a friend. A click takes it over, from its first screen. — */
    var SEED_TO = "(function(){if(typeof songs==='undefined'||songs.some(function(s){return s.seed}))return;" +
      "var mk=function(id,title,date,chords,bpm,style,dur,key,lyrics,list){var bar=240/bpm,g=[],t=0,i=0;while(t<dur-.01){g.push({chord:chords[i%chords.length],start:+t.toFixed(2),end:+Math.min(dur,t+bar).toFixed(2)});t+=bar;i++}" +
      "return{id:id,title:title,list:list||null,date:date,lyrics:lyrics,notes:[],stems:[],dur:dur,demo:{chords:chords,bpm:bpm,style:style,seed:id,name:'Take'},recChords:{seq:g.map(function(x){return x.chord}),key:key,segments:g},seed:true}};" +
      "lists.push({id:'ld',name:'Demos'},{id:'lv',name:'Voice memos'},{id:'ll',name:'Lyrics only'});" +
      "songs.unshift(mk(901,'Golden Hour','Today',['C','G','Am','F'],88,'hum',26,'C major','Golden hour on the dashboard\\nYou hum and I follow\\nHold that note, don\u2019t let it go','ld'),mk(902,'Night Bus Home','Yesterday',['Em','C','G','D'],80,'band',24,'G major','Streetlights counting us in\\nOne, two, the city sings','ld'),mk(903,'Kitchen Waltz','Nov 9',['Dm','Bb','F','C'],74,'hum',22,'F major','','lv'));" +
      "inspItems.push({id:1,board:'song-901',type:'note',text:'Tape hiss. Late summer. A window down.',color:'#EDE4CF'},{id:2,board:'song-901',type:'note',text:'Slow, like a Sunday.',color:'#F3C9B5'},{id:3,board:'song-901',type:'link',text:'https://open.spotify.com/track/golden-hour-reference'},{id:4,board:null,type:'note',text:'Write the bridge from the bus driver\u2019s point of view.',color:'#CFE0ED'},{id:5,board:null,type:'idea',song:902,text:'Night Bus Home'});" +
      "renderChips();renderIdeas();renderBoards();renderInsp();})()";
    var VMIC_TO = "(function(){if(window.__vm)return;var vm=window.__vm={dest:null,src:null};" +
      "var gum=function(){var c=Engine.context();vm.dest=vm.dest||c.createMediaStreamDestination();return Promise.resolve(vm.dest.stream)};" +
      "try{navigator.mediaDevices.getUserMedia=gum}catch(e){}" +
      "if(!navigator.mediaDevices||navigator.mediaDevices.getUserMedia!==gum){try{Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:gum},configurable:true})}catch(e){}}" +
      "vm.ok=function(){try{return Engine.context().state==='running'}catch(e){return false}};" +
      "vm.play=function(spec){var c=Engine.context();if(!vm.dest)return;Engine.renderDemo(spec).then(function(b){try{if(vm.src)vm.src.stop()}catch(e){}var s=c.createBufferSource();s.buffer=b;s.connect(vm.dest);s.start();vm.src=s})};" +
      "vm.type=function(id,text){var el=document.getElementById(id);if(!el)return;var i=0;(function t(){if(i>text.length)return;el.value=text.slice(0,i++);el.dispatchEvent(new Event('input',{bubbles:true}));setTimeout(t,34)})()};})()";
    var canRec = function (w) { return !!(w.__vm && w.__vm.ok()); };
    var PACE = .52;                                        // pass 77: everything a demo does takes about half the time it did (fix: a step that must keep its length)
    function pace(ms, st) { return st && st.fix ? ms : Math.max(280, Math.round(ms * PACE)); }
    var DEMO = {
      ec: {
        mute: function (w) { try { w.speechSynthesis.cancel(); } catch (e) {} try { w.speechSynthesis.speak = function () {}; } catch (e) {} },
        steps: [
          { tap: '#p-welcome [data-go="scan"]', wait: 1700 },
          { tap: '#p-scan [data-go="cart"]', wait: 2600 },
          { tap: '#toPay', wait: 1900 },
          { tap: '#payBtn', wait: 1900 },
          { tap: '#termblock', wait: 700 },
          { until: function (w, doc) { return doc.querySelector('#p-rcpt.on'); }, max: 9000, wait: 1700 },
          { tap: '#p-rcpt [data-finish]', wait: 4200 },
          { run: function (w) { w.location.reload(); }, wait: 2600 }
        ]
      },
      to: {
        before: function () { try { localStorage.setItem('trackon.onboarded.v2', 'true'); } catch (e) {} },
        after: function () { try { localStorage.removeItem('trackon.onboarded.v2'); } catch (e) {} },
        mute: function (w) { try { w.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); }; } catch (e) {} try { w.eval(VMIC_TO); } catch (e) {} },
        prep: function (w) { w.eval(SEED_TO); w.eval(VMIC_TO); },
        steps: [
          { tap: '#tbRecord', wait: 1500 },
          /* where sound may run (the visitor has clicked somewhere on the page): a real take, saved, and its chords found */
          { 'if': canRec, tap: '#dRec', wait: 2000, fix: true, then: function (w) { w.__vm.play({ chords: ['C', 'Am', 'F'], bpm: 360, style: 'band', seed: 7, dur: 2.0 }); } },      // pass 78: a take of two seconds (it was five): three chords, two thirds of a second each (at half a second the app missed one)
          { 'if': canRec, tap: '#dRec', wait: 1500 },
          { 'if': canRec, tap: '#dSave', wait: 1700 },
          { 'if': canRec, run: function (w) { w.__vm.type('songTitle', 'Porch Song'); }, wait: 1200 },
          { 'if': canRec, tap: '#recog', wait: 500 },
          { 'if': canRec, until: function (w, doc) { return doc.querySelector('#chordBox .chords') || !doc.querySelector('#chordBox .progress-line'); }, max: 9000, wait: 2200 },
          { 'if': canRec, tap: '#chordBox [data-inst="piano"]', wait: 2100 },
          { 'if': canRec, run: function (w) { w.__vm.type('lyrics', 'Sitting on the porch at nine\nThe whole street humming along'); }, wait: 3200 },
          { tap: '#screen-song [data-back]', wait: 1500 },
          { tap: '#ideasList .memo[data-id="901"] .memo-row', wait: 1900 },
          { tap: '#ideasList .memo.open [data-a="open"]', wait: 2600 },
          { tap: '#chordBox [data-inst="guitar"]', wait: 1900 },
          { tap: '#songTabs [data-tab="mood"]', wait: 2500 },
          { tap: '#songTabs [data-tab="song"]', wait: 1200 },
          { tap: '#screen-song [data-back]', wait: 1400 },
          { tap: '#homeChips [data-l="lv"]', wait: 1700 },
          { tap: '#homeChips [data-l="all"]', wait: 1200 },
          { tap: '#tabbar [data-tb="friends"]', wait: 2100 },
          { tap: '#chatsPanel .thread', wait: 2500 },
          { tap: '#screen-chat [data-back]', wait: 1300 },
          { tap: '#tabbar [data-tb="insp"]', wait: 2600 },
          { tap: '#tabbar [data-tb="home"]', wait: 1500 },
          { run: function (w) { w.location.reload(); }, wait: 2400 }
        ]
      },
      gt: {
        mute: function (w) { try { w.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); }; } catch (e) {} },
        lead: 2600,
        steps: [
          { tap: '.rail-btn[data-go="nav"]', wait: 1500 },
          { tap: '#searchQ', wait: 1600 },
          { tap: '#results [data-cat="cafe"]', wait: 1900 },
          { tap: '#results [data-pick="2"]', wait: 2300 },
          { tap: '#placeCard [data-pc="route"]', wait: 2300 },
          { tap: '#routeCard [data-rc="start"]', wait: 1500 },
          { run: function (w) { try { w.GT.world.setBoost(true); } catch (e) {} }, wait: 400 },
          { until: function (w) { var D = w.GT.S.drive; return !D || D.ph === 'cruise' || D.ph === 'stopped' || D.ph === 'arrived'; }, max: 26000, wait: 600 },
          /* pass 85 (his new Manic GT): no Park button any more; each free spot carries a chip with its time, and a tap on it parks there */
          { until: function (w, doc) { var D = w.GT.S.drive; return !D || D.ph === 'arrived' || D.ph === 'stopped' || !!doc.querySelector('#tags .bay'); }, max: 16000, wait: 1500, fix: true },
          { tap: '#tags .bay', wait: 600 },
          { until: function (w) { var D = w.GT.S.drive; return !D || D.ph === 'parked' || D.ph === 'arrived'; }, max: 16000, wait: 3000 },
          { tap: '#parkAct [data-s="done"]', wait: 3000 },
          { tap: '.rail-btn[data-go="phone"]', wait: 2600 },
          { tap: '.rail-btn[data-go="profile"]', wait: 2600 },
          { run: function (w) { w.location.reload(); }, wait: 3200 }
        ]
      },
      re: {
        mute: function (w) { try { w.eval('soundOn=false'); } catch (e) {} try { w.document.getElementById('in-cam').click = function () {}; w.document.getElementById('in-gal').click = function () {}; } catch (e) {} },
        prep: function (w) { try { w.eval('soundOn=false'); } catch (e) {} },
        steps: [
          { tap: '#fab', wait: 1900 },
          { tap: '#s-opts [data-go="s-form"]', wait: 1900 },
          { tap: '#form-bat .cat-plus', wait: 1200 },
          { tap: '#pk-cam', wait: 500, then: function (w) { w.eval("closeSheets();photos.form.bat=PH.bat.src;paintCat('form','bat');updateCont('form')"); } },
          { tap: '#form-amp .cat-plus', wait: 1200 },
          { tap: '#pk-cam', wait: 900, then: function (w) { w.eval("closeSheets();photos.form.amp=PH.amp.src;paintCat('form','amp');updateCont('form')"); } },
          { tap: '#form-next', wait: 600 },
          { until: function (w, doc) { return doc.querySelector('#s-approved.on'); }, max: 7000, wait: 1800 },
          { tap: '#pub-appr', wait: 3600 },
          { tap: '#rec-btn', wait: 3200 },
          { tap: '#nb-map', wait: 3000 },
          { tap: '#nb-home', wait: 1800 }
        ]
      }
    };
    function fire(w, el, r, st) {
      var o = { bubbles: true, cancelable: true, composed: true, view: w, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0, buttons: 1 };
      try { el.dispatchEvent(new w.PointerEvent('pointerdown', o)); } catch (e) {}
      o.buttons = 0;
      try { el.dispatchEvent(new w.PointerEvent('pointerup', o)); } catch (e) {}
      if (!st.noClick) el.click();
    }
    function demoStop(d) {
      clearTimeout(d.demoT);
      if (!d.demo) return;
      d.demo.stop = true; clearTimeout(d.demo.timer); d.demo = null;
      d.finger.classList.remove('is-on', 'is-tap');
    }
    /* pass 84: a prototype is loaded only once the scroll has paused (loading it is work for the page's own thread: done
       in the middle of a scroll, it made the scroll stutter) */
    var scrolledAt = 0;
    window.addEventListener('scroll', function () { scrolledAt = performance.now(); }, { passive: true });
    function demoSoon(d, ms) {
      clearTimeout(d.demoT);
      d.demoT = setTimeout(function again() {
        if (d.state !== 'down' || staged === d) return;
        if (performance.now() - scrolledAt < 320) { d.demoT = setTimeout(again, 160); return; }
        demoStart(d);
      }, ms || 250);
    }
    function demoStart(d) {
      var D = DEMO[d.key];
      if (!D || d.demo || calmMotion) return;
      var run = d.demo = { stop: false, timer: 0, i: 0, u: 0 };
      if (D.before) { try { D.before(); } catch (e) {} }
      if (d.frame.getAttribute('src') && d.dirty) {          // it has been used: from the start again
        d.loaded = false;
        try { d.frame.contentWindow.location.reload(); } catch (e) { d.frame.setAttribute('src', d.frame.getAttribute('data-src')); }
      } else wake(d);
      function ready() {
        if (run.stop) return;
        var w = null;
        try { w = d.frame.contentWindow; if (!d.loaded || !w || !w.document || w.document.readyState !== 'complete') w = null; } catch (e) { w = null; }
        if (!w) { run.timer = setTimeout(ready, 250); return; }
        d.dirty = true;
        try { if (D.mute) D.mute(w); if (D.prep) D.prep(w, w.document); } catch (e) {}
        run.timer = setTimeout(step, pace(D.lead || 1500));
      }
      function step() {
        if (run.stop) return;
        var w, doc;
        try { w = d.frame.contentWindow; doc = w.document; if (!doc || !doc.body) throw 0; } catch (e) { run.timer = setTimeout(step, 400); return; }
        if (!d.loaded || doc.readyState !== 'complete') { run.timer = setTimeout(step, 300); return; }      // (it reloads itself at the end of its round)
        if (D.mute && !w.__demoMute) { w.__demoMute = 1; try { D.mute(w); if (D.prep) D.prep(w, doc); } catch (e) {} }
        var st = D.steps[run.i % D.steps.length];
        if (st['if']) { var go = false; try { go = !!st['if'](w, doc); } catch (e) {} if (!go) { run.i++; run.timer = setTimeout(step, 40); return; } }
        if (st.until) {                                      // wait for the app to get somewhere — or go on without it
          var ok = false; try { ok = !!st.until(w, doc); } catch (e) {}
          run.u += 200;
          if (!ok && run.u < (st.max || 8000)) { run.timer = setTimeout(step, 200); return; }
          run.u = 0; run.i++; run.timer = setTimeout(step, pace(st.wait == null ? 400 : st.wait, st)); return;
        }
        run.i++;
        if (st.run) { try { st.run(w, doc); } catch (e) {} run.timer = setTimeout(step, pace(st.wait == null ? 900 : st.wait, st)); return; }
        var el = null; try { el = typeof st.tap === 'function' ? st.tap(w, doc) : doc.querySelector(st.tap); } catch (e) {}
        var r = el && el.getBoundingClientRect();
        if (!r || !r.width || !r.height || el.disabled) { run.timer = setTimeout(step, 260); return; }      // not there: on to the next
        var x = d.frame.offsetLeft + r.left + r.width / 2, y = d.frame.offsetTop + r.top + r.height / 2;
        d.finger.classList.add('is-on'); d.finger.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
        run.timer = setTimeout(function () {
          if (run.stop) return;
          d.finger.classList.add('is-tap'); setTimeout(function () { d.finger.classList.remove('is-tap'); }, 320);
          try { fire(w, el, el.getBoundingClientRect(), st); } catch (e) {}
          if (st.then) { try { st.then(w, doc); } catch (e) {} }
          run.timer = setTimeout(step, pace(st.wait == null ? 1300 : st.wait, st));
        }, 520);
      }
      ready();
    }

    devs.forEach(function (d) {
      d.item.querySelectorAll('[data-try]').forEach(function (b) {
        b.addEventListener('click', function () { stage(d); });
        b.addEventListener('pointerenter', function () { wake(d); });       // a head start while the hand is on the button
      });
      var x = d.item.querySelector('[data-stage-close]');
      if (x) x.addEventListener('click', unstage);
    });
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && staged) unstage(); });
    window.addEventListener('scroll', function () { if (staged && !staged.toRest && Math.abs(window.scrollY - stageY) > 70) unstage(); }, { passive: true });
    window.addEventListener('resize', unstage);

    if (calmMotion) {
      sec.classList.add('lab--still'); document.body.classList.add('is-lab-open');
      requestAnimationFrame(function () {
        fitDevs();
        devs.forEach(function (d) {
          d.item.classList.add('is-on', 'is-landed');
          d.dev.style.transform = 'scale(' + d.k.toFixed(4) + ')';
          if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (es) { if (es[0].isIntersecting) wake(d); }, { rootMargin: '300px' }).observe(d.item);
          } else wake(d);
        });
      });
      window.addEventListener('resize', function () {
        fitDevs(); devs.forEach(function (d) { d.dev.style.transform = 'scale(' + d.k.toFixed(4) + ')'; });
      });
      return;
    }

    var SEG = { title: .2, descent: .42, doors: .45, why: .72, enter: .6, hold: .3, exit: .22, tail: .35, carIn: .34, stand: .06, dive: .85 };   // the gate comes quick; behind it, a word before the work (pass 75) · pass 96: once the lab is open, about a quarter shorter (two screens less); the wheel's weight unchanged
    var T1 = SEG.title, T2 = T1 + SEG.descent, T3 = T2 + SEG.doors, T4 = T3 + (why ? SEG.why : 0);
    var P0 = T4 - .22;
    /* pass 76: the Manic GT takes longer than the others — the car stands a moment, then the scroll itself takes the eye
       in through its windscreen, down to the screen (it was a click on Start prototype) */
    /* pass 77: the outside of the car matters less — it comes quickly (carIn), barely stands, and the eye goes in */
    var extra = devs.map(function (d) { return d.car ? SEG.stand + SEG.dive : 0; }), ent = devs.map(function (d) { return d.car ? SEG.carIn : SEG.enter; }), starts = [];
    (function () { var a = P0; for (var i = 0; i < n; i++) { starts.push(a); a += ent[i] + extra[i] + SEG.hold + SEG.exit; } })();
    function startOf(i) { return starts[i]; }
    function landOf(i) { return starts[i] + ent[i] + extra[i]; }
    var TOTAL = landOf(n - 1) + SEG.hold + SEG.tail;
    var SHAFT = 1.5;                                   // screens of shaft ridden down
    var vh = 0, vw = 0;

    /* the O that opens the gates is the bowl of the g in "Underground" (pass 68).
       The letter is taken out of the word; its bowl is found by drawing the letter and flooding
       the outside (what stays empty inside is the bowl); then the lock, the seam between the
       doors and the way through the words are all put on that one spot. */
    var nameEl = title.querySelector('.lab__name'), word = nameEl && nameEl.firstElementChild, kick = title.querySelector('.lab__kicker');
    var pop = { on: false, k: 0, t0: 0, raf: 0 }, reduceMo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var gEl = null, gBase = null, bowl = null, gate = null;
    if (word && word.children.length === 0 && word.textContent.indexOf('g') > 0) {
      var wtx = word.textContent, gi = wtx.indexOf('g');
      word.textContent = '';
      word.appendChild(document.createTextNode(wtx.slice(0, gi)));
      gEl = document.createElement('i'); gEl.className = 'lab__g'; gEl.textContent = 'g';
      gBase = document.createElement('b'); gBase.className = 'lab__gb'; gEl.appendChild(gBase);      // it sits on the baseline
      word.appendChild(gEl); word.appendChild(document.createTextNode(wtx.slice(gi + 1)));
    }
    /* pass 75: the name is thick — fifteen copies of it stand behind the letters, a hair apart, so that when it
       turns its sides are really there */
    var EXT = 0;                                           // pass 77: it no longer turns, so it needs no sides
    if (nameEl && !reduceMo && EXT) {
      var face = nameEl.innerHTML;
      for (var li = 1; li <= EXT; li++) {
        var lay = document.createElement('i'); lay.className = 'lab__ext'; lay.setAttribute('aria-hidden', 'true');
        lay.style.setProperty('--i', li);
        var dk = li / EXT;                                 // pass 76: Evi's blue, deeper the further back
        lay.style.color = 'rgb(' + Math.round(112 - 92 * dk) + ',' + Math.round(186 - 136 * dk) + ',' + Math.round(250 - 126 * dk) + ')';
        lay.innerHTML = face; nameEl.appendChild(lay);
      }
      nameEl.classList.add('is-thick');
    }
    function findBowl() {
      if (!gEl) return;
      var cs = getComputedStyle(gEl), S = 240, W = S * 2, c = document.createElement('canvas'); c.width = c.height = W;
      var x = c.getContext('2d');
      x.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + S + 'px ' + cs.fontFamily; x.textBaseline = 'alphabetic'; x.fillStyle = '#000';
      x.fillText('g', S * .5, S * 1.1);
      var d = x.getImageData(0, 0, W, W).data, seen = new Uint8Array(W * W), st = [0]; seen[0] = 1;
      while (st.length) {
        var pp = st.pop(), px = pp % W, py = (pp / W) | 0;
        for (var o = 0; o < 4; o++) {
          var qx = px + (o === 0 ? 1 : o === 1 ? -1 : 0), qy = py + (o === 2 ? 1 : o === 3 ? -1 : 0);
          if (qx < 0 || qy < 0 || qx >= W || qy >= W) continue;
          var q = qy * W + qx; if (seen[q] || d[q * 4 + 3] > 100) continue;
          seen[q] = 1; st.push(q);
        }
      }
      var x0 = W, x1 = 0, y0 = W, y1 = 0, cnt = 0;
      for (var k = 0; k < W * W; k++) if (!seen[k] && d[k * 4 + 3] <= 100) { var kx = k % W, ky = (k / W) | 0; if (kx < x0) x0 = kx; if (kx > x1) x1 = kx; if (ky < y0) y0 = ky; if (ky > y1) y1 = ky; cnt++; }
      if (cnt > 200) bowl = { x: ((x0 + x1) / 2 - S * .5) / S, y: ((y0 + y1) / 2 - S * 1.1) / S, r: Math.min(x1 - x0, y1 - y0) / 2 / S };      // in ems, from the letter's left edge and its baseline
    }
    function placeGate() {
      if (!bowl || !gEl) return;
      var keepT = title.style.transform, keepN = nameEl.style.transform; title.style.transform = 'none'; nameEl.style.transform = 'none';
      var fs = parseFloat(getComputedStyle(gEl).fontSize), g = gEl.getBoundingClientRect(), b = gBase.getBoundingClientRect(), pr = pin.getBoundingClientRect(), tr = title.getBoundingClientRect();
      var gx = g.left + bowl.x * fs - pr.left, gy = b.bottom + bowl.y * fs - pr.top, r = bowl.r * fs;
      title.style.transform = keepT; nameEl.style.transform = keepN;
      gate = { x: gx, y: gy, r: r };
      doors.style.setProperty('--gx', gx.toFixed(1) + 'px'); doors.style.setProperty('--gy', gy.toFixed(1) + 'px'); doors.style.setProperty('--gr', (r * 2 * .96).toFixed(1) + 'px');
      title.style.transformOrigin = (gx + pr.left - tr.left).toFixed(1) + 'px ' + (gy + pr.top - tr.top).toFixed(1) + 'px';
    }

    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function ramp(v, a, b) { return clamp((v - a) / (b - a), 0, 1); }
    function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function out(t) { return 1 - Math.pow(1 - t, 3); }
    function inn(t) { return t * t * t; }

    function stopsAt() {                               // the scroll comes to rest on a landed device
      var pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      sec.querySelectorAll('.lab__stop').forEach(function (m) { m.remove(); });
      for (var i = 0; i < n; i++) {
        var m = document.createElement('i'); m.className = 'lab__stop'; m.setAttribute('aria-hidden', 'true');
        m.style.top = ((landOf(i) + .1) * vh + pad) + 'px';     // snapping puts the stop `pad` below the top: the scene then rests just past the landing
        if (i === 0) m.id = 'projects';
        sec.appendChild(m);
      }
      if (why) { var mw = document.createElement('i'); mw.className = 'lab__stop'; mw.setAttribute('aria-hidden', 'true'); mw.style.top = ((T3 + SEG.why * .42) * vh + pad) + 'px'; sec.appendChild(mw); }      // and on his words
    }

    var lastW = 0, lastH = 0;
    function size() {
      vw = document.documentElement.clientWidth; vh = window.innerHeight;
      var redo = vw !== lastW || Math.abs(vh - lastH) > 140;     // not for a phone's toolbar sliding
      if (!redo) return;
      lastW = vw; lastH = vh;
      sec.style.height = ((TOTAL + 1) * vh) + 'px';
      pin.style.height = vh + 'px';
      stopsAt(); fitDevs(); placeGate();
    }

    function fly(d, i, s) {
      if (d.toRest) return;                                // (pass 93: opened while it turned; the page is still gliding to its rest)
      var P = startOf(i), L = landOf(i), X = L + SEG.hold, last = i === n - 1;
      var cs = d.car && window.__carShow && window.__carShow.ready ? window.__carShow : null;
      var e = cs ? ramp(s, P, P + ent[i]) : ramp(s, P, L), x = last ? 0 : ramp(s, X, X + SEG.exit);
      var dv = cs ? ramp(s, P + ent[i] + SEG.stand, L) : 0;
      var on = s > P - .01 && (last || s < X + SEG.exit);
      if (s < P - 1.2 || s > X + SEG.exit + 1.4) rest(d);            // far away it stops
      var state = !on ? 'off' : s < L ? 'in' : x > 0 ? 'out' : 'down';
      if (state !== d.state) {
        if (staged === d && state !== 'down') unstage();
        var was = d.state; d.state = state;
        d.item.classList.toggle('is-on', on);
        d.item.classList.toggle('is-landed', state === 'down');
        if (state === 'off') { d.dev.style.transform = ''; d.stage.style.opacity = ''; d.stage.style.filter = ''; }
        if (state === 'down') {                          // flat: nothing left of the third dimension
          d.dev.style.transform = 'scale(' + d.k.toFixed(4) + ')';
          d.stage.style.opacity = ''; d.stage.style.filter = '';
          d.dev.style.setProperty('--sheen-o', '0');
          demoSoon(d);                                   // …and it shows itself at work
        } else { demoStop(d); tipOff(); }
      }
      if (d.car && window.__carShow) {                    // the car has its own way in
        if (s > P - 1.3 && s < X + SEG.exit + 1.2) window.__carShow.warm();
        window.__carShow.fly(state, e, x, dv, d.k);
        /* (pass 78: its name, its line and its buttons come together, when the screen is flat: no name while the car stands) */
      }
      /* pass 81: its name, its line and its buttons come while it arrives (the car: as the eye reaches the screen) */
      var tin = state === 'off' ? 0 : state === 'in' ? (cs ? ramp(dv, .55, .95) : ramp(e, .35, .9)) : state === 'out' ? 1 - ramp(x, 0, .45) : 1;
      if (Math.abs((d.tin || 0) - tin) > .002 || (tin === 1) !== (d.tin === 1)) { d.tin = tin; d.item.style.setProperty('--tin', tin.toFixed(3)); d.item.classList.toggle('has-text', tin > .6); }
      if (state === 'in' && cs) {                        // the car is what is seen; the flat screen waits where the dive will end
        d.dev.style.transform = 'scale(' + d.k.toFixed(4) + ')'; d.stage.style.opacity = ''; d.stage.style.filter = '';
      } else
      if (state === 'in') {
        var o = out(e), back = 1 - o;
        var ang = -back * 440;                           // edge-on first, its face, its back, its face again
        d.dev.style.transform =
          'translate3d(' + (d.mir * back * vw * .26).toFixed(1) + 'px,' + (back * vh * .05).toFixed(1) + 'px,' + (-back * 1500).toFixed(1) + 'px)' +
          ' rotateY(' + (d.mir * ang).toFixed(2) + 'deg) rotateX(' + (back * 16).toFixed(2) + 'deg) rotateZ(' + (-back * 6).toFixed(2) + 'deg)' +
          ' scale(' + d.k.toFixed(4) + ')';
        d.stage.style.opacity = ramp(e, 0, .3).toFixed(3);
        var lum = .1 + .9 * ramp(e, .03, .6);
        d.stage.style.filter = lum < .995 ? 'brightness(' + lum.toFixed(3) + ')' : '';
        var face = ((ang % 360) + 360) % 360;            // 0 = facing us
        d.dev.style.setProperty('--sheen', (face / 360 * 1.6 - .3).toFixed(3));
        d.dev.style.setProperty('--sheen-o', (.9 * (1 - ramp(e, .82, 1))).toFixed(3));
      } else if (state === 'out') {
        var q = inn(x);
        d.dev.style.transform =
          'translate3d(' + (-d.mir * q * vw * .18).toFixed(1) + 'px,' + (q * vh * .03).toFixed(1) + 'px,' + (-q * 1100).toFixed(1) + 'px)' +
          ' rotateY(' + (d.mir * q * 115).toFixed(2) + 'deg) rotateX(' + (-q * 8).toFixed(2) + 'deg)' +
          ' scale(' + d.k.toFixed(4) + ')';
        d.stage.style.opacity = (1 - ramp(x, .35, 1)).toFixed(3);
        d.stage.style.filter = 'brightness(' + (1 - .85 * ramp(x, .1, .9)).toFixed(3) + ')';
      }
    }

    /* two small sounds, both very low: the gate rolling open, and a shimmer when words appear (pass 77: no more
       breath of air when a project arrives). Only once the visitor has clicked or pressed a key (browsers), never with ?mute. */
    var actx = null, quietLab = /[?&]mute\b/.test(location.search), sfxAt = {};
    function awake() {
      if (quietLab) return;
      if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      try { actx = new AC(); } catch (e) { actx = null; }
    }
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, awake, { passive: true }); });
    function noise(t, dur, peak, f0, f1, q, type) {
      var nb = actx.createBuffer(1, Math.ceil(actx.sampleRate * dur), actx.sampleRate), ch = nb.getChannelData(0);
      for (var i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
      var src = actx.createBufferSource(), bp = actx.createBiquadFilter(), g = actx.createGain();
      src.buffer = nb; bp.type = type || 'bandpass'; bp.Q.value = q || 1; bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + dur * .32); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      src.connect(bp); bp.connect(g); g.connect(actx.destination); src.start(t); src.stop(t + dur + .05);
    }
    function sfx() {}                                   // pass 81: no sounds made in code
    function sfxOld(kind) {
      if (window.__uljoSoundOff) return;                 // (pass 78: the visitor has turned the sound off)
      if (!actx || actx.state !== 'running') return;
      var now = performance.now(); if (sfxAt[kind] && now - sfxAt[kind] < 700) return; sfxAt[kind] = now;
      var t = actx.currentTime + .01;
      if (kind === 'gate') {                          // heavy doors on their rails: a low rumble, a hiss of air, and a soft clunk as they stop
        noise(t, 1.7, .05, 70, 130, .7, 'lowpass'); noise(t + .05, 1.2, .012, 2400, 900, 2);
        var o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(86, t + 1.45); o.frequency.exponentialRampToValueAtTime(42, t + 1.75);
        g.gain.setValueAtTime(.0001, t + 1.45); g.gain.exponentialRampToValueAtTime(.05, t + 1.48); g.gain.exponentialRampToValueAtTime(.0001, t + 1.9);
        o.connect(g); g.connect(actx.destination); o.start(t + 1.45); o.stop(t + 1.95);
      } else if (kind === 'text') {                        // letters arriving: a quick run of very small high notes
        for (var k = 0; k < 9; k++) {
          var o2 = actx.createOscillator(), g2 = actx.createGain(), tt = t + k * .042, f = [1568, 2093, 1760, 2349, 1976, 2637, 2093, 3136, 2349][k];
          o2.type = 'sine'; o2.frequency.setValueAtTime(f, tt);
          g2.gain.setValueAtTime(.0001, tt); g2.gain.exponentialRampToValueAtTime(.0075, tt + .008); g2.gain.exponentialRampToValueAtTime(.0001, tt + .09);
          o2.connect(g2); g2.connect(actx.destination); o2.start(tt); o2.stop(tt + .1);
        }
      }
    }
    var pending = false, open0 = null, gate0 = false, why0 = false;
    function paint() {
      pending = false;
      var s = -sec.getBoundingClientRect().top / vh;        // screens into the scene

      // 1 · the heading arrives, as the scene comes up under the hill
      var tin = ease(ramp(s, -.75, .15));
      // 2 · down the shaft; the doors come up at the bottom of it
      var dsc = ease(ramp(s, T1, T2));
      var shift = -dsc * SHAFT * vh;
      // they ride with the shaft's lights: a screen below at first, home at the bottom
      doors.style.transform = 'translate3d(0,' + ((1 - dsc) * SHAFT * vh).toFixed(1) + 'px,0)';
      shaft.style.setProperty('--rail', shift.toFixed(1) + 'px');
      rails.style.setProperty('--rail', shift.toFixed(1) + 'px');
      // 3 · the doors part; you go through the words
      var open = ease(ramp(s, T2 + .1, T3 - .05));
      shaft.style.visibility = open > 0 ? 'hidden' : '';         // the doors cover it from here on
      shaft.style.opacity = s < 0 ? ramp(s, -.06, -.015).toFixed(3) : '';      // pass 75: on the way down from the title screen the planet is still behind it, the eye sinking into its ground (world.js)
      doorL.style.transform = 'translate3d(' + (-open * 101).toFixed(2) + '%,0,0)';
      doorR.style.transform = 'translate3d(' + (open * 101).toFixed(2) + '%,0,0)';
      lock.style.transform = 'rotate(' + (ramp(s, T2 - .25, T2 + .1) * 120).toFixed(1) + 'deg)';
      lock.style.opacity = String(1 - ramp(open, 0, .15));
      doors.style.setProperty('--seam', ((.35 + .65 * ramp(s, T2 - .2, T2 + .1)) * (1 - ramp(open, .15, .6))).toFixed(3));
      var thru = ramp(s, T2 + .2, T3);
      var zoom = 1 + Math.pow(thru, gate ? 2.4 : 2.2) * (gate ? 27 : 7);      // through the bowl of the g: far enough for it to take the whole window
      title.style.opacity = String(tin * (1 - (gate ? ramp(thru, .6, .96) : ramp(thru, .3, .75))));
      title.style.transform = 'translate3d(0,' + ((1 - tin) * 9).toFixed(2) + 'vh,0) scale(' + (zoom * (.94 + .06 * tin)).toFixed(3) + ')';
      title.style.filter = thru > 0 ? 'blur(' + (gate ? Math.min(3, thru * 6) : thru * 10).toFixed(1) + 'px)' : '';
      if ((thru > .02) !== title.classList.contains('is-thru')) title.classList.toggle('is-thru', thru > .02);      // going through it, its thickness is put away
      // behind the gate: why he does it — it comes up out of the dark as the g lets you through, and gives way to the work
      if (why) {
        /* pass 83: it comes as before; it leaves as the page does: it scrolls up and away, one for one with the scroll, no fading */
        var wi = ease(ramp(s, T3 - .22, T3 + .12)), up = Math.max(0, s - (T4 - .62)), wo = up > 1.15 ? 1 : 0, wa = wi * (1 - wo);
        why.style.opacity = wi.toFixed(3);
        why.style.transform = 'translate3d(0,' + ((1 - wi) * 5 - up * 100).toFixed(2) + 'vh,0) scale(' + (.94 + .06 * wi).toFixed(4) + ')';
        why.style.visibility = wa > .002 ? 'visible' : 'hidden';
        if ((wa > .5) !== why.classList.contains('is-on')) why.classList.toggle('is-on', wa > .5);
        why0 = wa > .25;
      }
      // the words come out of the dark, into focus (a run of their own, not the scroll's)
      if (!pop.on && s >= T2) { pop.on = true; pop.k = 1; popPaint(); }               // arrived below it: it is simply there
      else if (!pop.on && !pop.set) { pop.set = true; popPaint(); }                    // waiting in the dark
      if (!pop.on && s > -.32 && s < T2) { pop.on = true; pop.t0 = performance.now(); popRun(); }
      if (pop.on && s < -.7 && !pop.raf) { pop.on = false; pop.k = 0; popPaint(); }
      rails.style.opacity = String((1 - ramp(open, 0, .5)) * ramp(s, T1 - .2, T1 + .15));
      inside.style.transform = 'scale(' + (1.35 - .35 * ease(ramp(s, T2, T3 + .5))).toFixed(4) + ')';
      var gateOn = open > .02 && open < .98;
      if (gateOn && !gate0 && s < T3 - .2) sfx('gate');
      gate0 = open > .02;
      var isOpen = open > .12;
      if (isOpen !== open0) {
        open0 = isOpen; document.body.classList.toggle('is-lab-open', isOpen);
        document.dispatchEvent(new Event('uljo:lab'));             // the fireflies wait for this
      }
      // 4 · the devices, one at a time
      for (var i = 0; i < n; i++) fly(devs[i], i, s);
    }
    function update() { if (!pending) { pending = true; requestAnimationFrame(paint); } }
    size(); paint();
    var gateUp = function () { alignLab(); findBowl(); placeGate(); update(); };
    function popPaint() {
      if (!nameEl) return;
      /* pass 81: as vanschneider.com writes its quote: the name comes as a thin outline, drawn across, and then it fills with
         its blue; "Welcome to my" comes with it, white */
      var k = pop.k, ease = function (t) { return t * t * (3 - 2 * t); };
      var draw = ease(Math.min(1, k / .55)), fill = ease(Math.max(0, Math.min(1, (k - .45) / .55)));
      nameEl.style.visibility = k <= 0 ? 'hidden' : '';
      nameEl.style.opacity = k <= 0 ? '0' : '';
      nameEl.style.transform = ''; nameEl.style.filter = '';
      nameEl.style.setProperty('--draw', (draw * 120 - 10).toFixed(2) + '%');      // (pass 84: -10 to 110, so that at the end the wipe's soft edge is past the last letter: the d was left dimmed)
      nameEl.style.setProperty('--fill', fill.toFixed(3));
      if (kick) kick.style.opacity = String(draw);
    }
    function popRun() {
      if (pop.raf) return;
      holdOn();
      (function go(now) {
        pop.k = reduceMo ? 1 : Math.min(1, (now - pop.t0) / 1700);      // (pass 82: a third quicker)
        popPaint();
        pop.raf = pop.k < 1 && pop.on ? requestAnimationFrame(go) : 0;
        if (!pop.raf) holdOff();
      })(performance.now());
    }
    /* pass 84: the name finishes coming (its outline, then its blue) before the page goes on down. While it is still
       coming, a scroll by hand stops at the screen where it stands (T1, before the shaft); the moment it is whole, the
       scroll is free again. The listeners that can stop a scroll are only there for those 1.7 seconds. */
    var held = false, handAt = 0, touchY = 0;
    function sNow() { return -sec.getBoundingClientRect().top / vh; }
    function holding() { return held && pop.on && pop.k < 1; }
    function holdTop() { return sec.getBoundingClientRect().top + window.scrollY + T1 * vh; }
    function onWheel(e) {
      handAt = performance.now();
      if (holding() && e.deltaY > 0 && !e.ctrlKey && sNow() >= T1 - .01) e.preventDefault();      // (ctrl: a pinch, the page zooming)
    }
    function onTouchStart(e) { touchY = e.touches[0].clientY; handAt = performance.now(); }
    function onTouchMove(e) {
      handAt = performance.now();
      var y = e.touches[0].clientY, up = touchY - y; touchY = y;
      if (holding() && up > 0 && sNow() >= T1 - .01 && e.cancelable) e.preventDefault();
    }
    function onKey(e) {
      if (!holding() || e.target.closest && e.target.closest('input,textarea,select,[contenteditable]' + (e.key === ' ' ? ',button,a,[role=button]' : ''))) return;
      if (/^(ArrowDown|PageDown|End| )$/.test(e.key) && !e.shiftKey) { handAt = performance.now(); if (sNow() >= T1 - .01) e.preventDefault(); }      // (short of it, the key scrolls; past it, the scroll is brought back)
    }
    function onHeldScroll() {
      if (holding() && performance.now() - handAt < 700 && sNow() > T1) window.scrollTo({ top: holdTop(), behavior: 'instant' });
    }
    function holdOn() {
      if (held || reduceMo) return; held = true;
      window.addEventListener('wheel', onWheel, { passive: false });
      window.addEventListener('touchstart', onTouchStart, { passive: true });
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('keydown', onKey);
      window.addEventListener('scroll', onHeldScroll, { passive: true });
    }
    function holdOff() {
      if (!held) return; held = false;
      window.removeEventListener('wheel', onWheel, { passive: false });
      window.removeEventListener('touchstart', onTouchStart, { passive: true });
      window.removeEventListener('touchmove', onTouchMove, { passive: false });
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onHeldScroll, { passive: true });
    }
    /* pass 90: inside the lab the wheel is slowed (about half) and capped (at most about one and a half screens a second), so
       a big throw of the wheel cannot carry the page past a project; the page follows the wheel smoothly. Keys and fingers
       are left as they are. The listener that can stop the wheel is there only while the lab is on screen. */
    var wq = { target: null, raf: 0, set: -1, on: false };
    function wheelLimit(e) {
      if (e.ctrlKey || cased || staged) return;
      var s0 = sNow();
      if (s0 < -.75 || s0 > TOTAL - .1) { wq.target = null; return; }
      e.preventDefault();
      var dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? vh : 1);
      if (holding() && dy > 0 && s0 >= T1 - .01) return;
      dy = Math.max(-vh * .1, Math.min(vh * .1, dy * .55));
      var y = window.scrollY, base = wq.target == null ? y : wq.target;
      var tg = Math.max(0, Math.min(base + dy, y + vh * .45, document.documentElement.scrollHeight - vh));
      tg = Math.max(tg, y - vh * .45);
      if (holding()) tg = Math.min(tg, holdTop());
      wq.target = tg;
      if (!wq.raf) { wq.set = -1; wq.last = 0; wq.raf = requestAnimationFrame(wheelStep); }
    }
    function wheelStep(now) {
      wq.raf = 0; if (wq.target == null) return;
      var dt = wq.last ? Math.min(.05, (now - wq.last) / 1000) : 1 / 60; wq.last = now;
      var y = window.scrollY;
      if (wq.set >= 0 && Math.abs(y - wq.set) > 3) { wq.target = null; return; }      // something else moved the page (a key, the bar): it lets go
      var d = wq.target - y;
      if (Math.abs(d) < .6) { wq.target = null; return; }
      var step = (d > 0 ? 1 : -1) * Math.min(Math.abs(d) * (1 - Math.pow(.0000135, dt)), vh * 1.55 * dt);      // (by time, not by frame: the same on a 120 Hz screen)
      wq.set = Math.round(y + step); window.scrollTo({ top: y + step, behavior: 'instant' });      // (instant: the page's own smooth scrolling would make each step a slow glide of its own)
      wq.raf = requestAnimationFrame(wheelStep);
    }
    if ('IntersectionObserver' in window && !reduceMo) new IntersectionObserver(function (es) {
      var on = es[0].isIntersecting;
      if (on && !wq.on) window.addEventListener('wheel', wheelLimit, { passive: false });
      else if (!on && wq.on) { window.removeEventListener('wheel', wheelLimit, { passive: false }); wq.target = null; }
      wq.on = on;
    }, { rootMargin: '60% 0px' }).observe(sec);
    /* pass 84: "Lab" sits under "Underground" so that the g's tail falls in the gap between the L and the b, touching
       neither (the a is then under the g). The letters are drawn once on a canvas to find where their ink is: the
       g's tail (below its baseline), and the empty space between the L's stem and the b's, above the a. */
    function alignLab() {
      if (!nameEl || !gEl) return;
      var lab = nameEl.children[1], tn = lab && lab.firstChild;
      if (!tn || tn.nodeType !== 3 || tn.data !== 'Lab') return;
      var cs = getComputedStyle(nameEl), fs = parseFloat(cs.fontSize), ls = parseFloat(cs.letterSpacing) || 0;
      var S = 200, W = S * 3, H = S * 2, x0 = S * .5, base = S * 1.25, c = document.createElement('canvas'); c.width = W; c.height = H;
      var x = c.getContext('2d', { willReadFrequently: true });
      x.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + S + 'px ' + cs.fontFamily; x.textBaseline = 'alphabetic'; x.fillStyle = '#000';
      var capA = x.measureText('L').actualBoundingBoxAscent, xA = x.measureText('x').actualBoundingBoxAscent;
      function cols(y0, y1) {                    // which columns have ink between two rows
        var d = x.getImageData(0, 0, W, H).data, on = new Uint8Array(W);
        for (var yy = Math.max(0, Math.round(y0)); yy < Math.min(H, Math.round(y1)); yy++)
          for (var xx = 0; xx < W; xx++) if (d[(yy * W + xx) * 4 + 3] > 110) on[xx] = 1;
        return on;
      }
      x.fillText('g', x0, base);
      var gc = cols(base + S * .05, H), g0 = -1, g1 = -1;
      for (var i = 0; i < W; i++) if (gc[i]) { if (g0 < 0) g0 = i; g1 = i; }
      x.clearRect(0, 0, W, H);
      if ('letterSpacing' in x) x.letterSpacing = (ls * S / fs).toFixed(2) + 'px';
      x.fillText('Lab', x0, base);
      var lc = cols(base - capA * .96, base - xA * 1.1), first = -1, last = -1, run = 0, best = 0, bestEnd = -1;
      for (i = 0; i < W; i++) if (lc[i]) { if (first < 0) first = i; last = i; }
      for (i = first; i <= last; i++) { if (!lc[i]) { run++; if (run > best) { best = run; bestEnd = i; } } else run = 0; }
      if (g0 < 0 || best < 4) return;
      var tailC = ((g0 + g1) / 2 - x0) / S, gapC = (bestEnd - best / 2 + .5 - x0) / S;      // in ems from each one's own left edge
      var rg = document.createRange(); rg.setStart(tn, 0); rg.setEnd(tn, 1);
      var lr = rg.getBoundingClientRect(), gr = gEl.getBoundingClientRect(), nr = nameEl.getBoundingClientRect();
      var k = nameEl.offsetWidth ? nr.width / nameEl.offsetWidth : 1;
      if (!lr.width || !gr.width || !k) return;
      var cur = parseFloat(nameEl.style.getPropertyValue('--lab-dx')) || 0, em = fs * k;
      var dx = cur + ((gr.left + tailC * em) - (lr.left + gapC * em)) / k;
      nameEl.style.setProperty('--lab-dx', dx.toFixed(2) + 'px');
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(gateUp); else setTimeout(gateUp, 600);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', function () {
      size(); fitDevs(); alignLab(); placeGate();
      devs.forEach(function (d) { if (d.state === 'down') d.dev.style.transform = 'scale(' + d.k.toFixed(4) + ')'; });
      update();
    });
    /* window.__go(3.2) — jump to a point of the scene, in screens (for checking it) */
    window.__go = function (at) { window.scrollTo({ top: sec.getBoundingClientRect().top + window.scrollY + at * vh, behavior: 'instant' }); };
    window.__lab = { startOf: startOf, landOf: landOf, total: TOTAL, devs: devs, stage: stage, unstage: unstage, T3: T3, T4: T4, SEG: SEG, DEMO: DEMO, demoStart: demoStart, demoStop: demoStop, sfx: sfx };
  })();

  /* ---------- a device at rest on a project page ---------------- */
  /* The same device as on the home page, already flat: sized to its plate,
     its prototype loaded straight away. */
  (function devStill() {
    var list = Array.prototype.slice.call(document.querySelectorAll('[data-dev-still]'));
    if (!list.length) return;
    var all = list.map(function (dev) {
      var cs = getComputedStyle(dev), bz = parseFloat(cs.getPropertyValue('--bz')) || 12;
      var w = (+dev.getAttribute('data-w')) + bz * 2, h = (+dev.getAttribute('data-h')) + phoneBars(dev) + bz * 2;
      dev.style.width = w + 'px'; dev.style.height = h + 'px';
      dev.style.margin = (-h / 2) + 'px 0 0 ' + (-w / 2) + 'px';
      var plate = dev.parentNode, frame = dev.querySelector('iframe');
      frame.addEventListener('load', function () { if (frame.getAttribute('src')) { protoHome(frame); plate.classList.add('is-live'); } });
      frame.setAttribute('src', frame.getAttribute('data-src'));
      return { dev: dev, plate: plate, w: w, h: h };
    });
    function fit() {
      all.forEach(function (d) {
        var r = d.plate.getBoundingClientRect();
        if (!r.width) return;
        d.dev.style.transform = 'scale(' + Math.min(r.width * .88 / d.w, r.height * .9 / d.h, 1).toFixed(4) + ')';
      });
    }
    fit();
    window.addEventListener('resize', fit);
    if ('ResizeObserver' in window) all.forEach(function (d) { new ResizeObserver(fit).observe(d.plate); });
  })();

  /* ---------- the campfire clip never stops -------------------- */
  /* Browsers pause muted autoplay video on their own — coming back from
     another page (the back/forward cache), a tab left in the background,
     power saving, a stall at the loop point. Whenever it should be running
     and isn't, it is nudged back into motion. */
  (function keepAlive() {
    var clips = Array.prototype.slice.call(document.querySelectorAll('video[autoplay]'));
    if (!clips.length) return;
    function kick(v) {
      if (document.hidden) return;
      if (v.ended) v.currentTime = 0;
      if (v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    }
    clips.forEach(function (v) {
      v.muted = true; v.loop = true;
      /* shown only once frames are really moving — never a still */
      function live() { v.classList.add('is-live'); }
      v.addEventListener('playing', live);
      v.addEventListener('timeupdate', function () { if (v.currentTime > 0 && !v.paused) live(); });
      if (!v.paused && v.readyState >= 3) live();
      v.addEventListener('pause', function () { setTimeout(function () { kick(v); }, 150); });
      v.addEventListener('ended', function () { v.currentTime = 0; kick(v); });
      v.addEventListener('stalled', function () { kick(v); });
      var last = -1, stuck = 0;
      setInterval(function () {                                // a watchdog for silent freezes
        if (document.hidden) return;
        var r = v.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        if (v.paused) { kick(v); return; }
        if (v.readyState >= 2 && v.currentTime === last) {
          if (++stuck >= 2) {                                 // frozen though "playing"
            stuck = 0;
            var t = v.currentTime;
            try { v.currentTime = t + .05 < (v.duration || 0) ? t + .05 : 0; } catch (e) {}
            kick(v);
          }
        } else stuck = 0;
        last = v.currentTime;
      }, 1000);
    });
    function all() { clips.forEach(kick); }
    document.addEventListener('visibilitychange', all);
    window.addEventListener('pageshow', all);
    window.addEventListener('focus', all);
    ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(function (ev) {
      window.addEventListener(ev, all, { passive: true });
    });
  })();

  /* ---------- the arrow at the foot of the title screen ------- */
  (function heroScroll() {
    var a = document.querySelector('[data-hero-scroll]');
    if (!a) return;
    function sync() { a.classList.toggle('is-gone', window.scrollY > 60); }
    window.addEventListener('scroll', sync, { passive: true });
    sync();
  })();

  /* ---------- the songs: the listening room ------------------ */
  /* "play song" fades everything but the art, draws in on the guitarist,
     and brings up a back button and the record player. Tracks come from
     data-songs (title, artist, art, src); with no src yet each runs a
     2:30 stand-in so the whole room can be tried. */

  (function player() {
    var opens = Array.prototype.slice.call(document.querySelectorAll('[data-player-open]'));
    var root  = document.querySelector('[data-player]');
    var back  = document.querySelector('[data-listen-back]');
    if (!opens.length || !root || !back) return;

    var vinyl  = root.querySelector('[data-player-vinyl]');
    var art    = root.querySelector('[data-player-art]');
    var title  = root.querySelector('[data-player-title]');
    var artist = root.querySelector('[data-player-artist]');
    var bar    = root.querySelector('[data-player-bar] i');
    var toggle = root.querySelector('[data-player-toggle]');
    var prev   = root.querySelector('[data-player-prev]');
    var next   = root.querySelector('[data-player-next]');
    var mute   = root.querySelector('[data-player-mute]');
    var audio  = root.querySelector('[data-player-audio]');

    var songs = [];
    try { songs = JSON.parse(root.dataset.songs || '[]'); } catch (e) { songs = []; }
    if (!songs.length) return;

    var at = 0, playing = false, tick = null, sec = 0;
    var DEMO = 150;                                   // the stand-in's 2:30

    function paintTrack() {
      var t = songs[at];
      if (art) { art.src = t.art || ''; art.alt = t.title || ''; }
      title.textContent = t.title || '';
      artist.textContent = t.missing ? 'Audio coming soon' : (t.artist || '');
    }
    /* a song whose file isn't there yet plays as the silent stand-in, and says so */
    audio.addEventListener('error', function () {
      var t = songs[at];
      if (!t || !t.src || t.missing) return;
      t.missing = true;
      paintTrack();
      if (playing) { setPlaying(false); play(); }
    });
    function progress(f) { bar.style.width = (Math.min(1, Math.max(0, f)) * 100) + '%'; }
    function setPlaying(on) {
      playing = on;
      root.classList.toggle('is-playing', on);
      toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
      toggle.setAttribute('aria-label', on ? 'Pause' : 'Play');
    }

    function live() { return !!songs[at].src && !songs[at].missing; }
    function play() {
      if (live()) {
        if (audio.getAttribute('src') !== songs[at].src) audio.src = songs[at].src;
        audio.play().catch(function () {});
      } else {
        clearInterval(tick);
        tick = setInterval(function () {
          sec += 1; progress(sec / DEMO);
          if (sec >= DEMO) step(1);
        }, 1000);
      }
      setPlaying(true);
    }
    function pause() {
      if (live()) audio.pause(); else clearInterval(tick);
      setPlaying(false);
    }
    function load(i) {
      at = ((i % songs.length) + songs.length) % songs.length;
      sec = 0; progress(0);
      paintTrack();
    }
    function step(d) {
      // the record slides out, the next drops in
      vinyl.classList.remove('is-swapping');
      void vinyl.offsetWidth;
      vinyl.classList.add('is-swapping');
      var wasPlaying = playing;
      pause();
      setTimeout(function () { load(at + d); if (wasPlaying) play(); }, 280);
    }

    function scrolled() {
      document.body.classList.toggle('is-scrolled', window.scrollY > 40);
    }
    function enter() {
      document.body.classList.add('is-listening');
      scrolled();
      window.addEventListener('scroll', scrolled, { passive: true });
      root.hidden = false; back.hidden = false;
      requestAnimationFrame(function () { root.classList.add('is-on'); back.classList.add('is-on'); });
      load(at);
      play();
    }
    function leave() {
      pause();
      window.removeEventListener('scroll', scrolled);
      document.body.classList.remove('is-listening', 'is-scrolled');
      root.classList.remove('is-on'); back.classList.remove('is-on');
      setTimeout(function () { root.hidden = true; back.hidden = true; }, 900);
    }

    opens.forEach(function (b) { b.addEventListener('click', enter); });
    back.addEventListener('click', leave);
    // closing the universe while listening leaves the room too
    document.querySelectorAll('[data-drawer-close]').forEach(function (b) {
      b.addEventListener('click', function () { if (document.body.classList.contains('is-listening')) leave(); });
    });
    toggle.addEventListener('click', function () { if (playing) pause(); else play(); });
    prev.addEventListener('click', function () { step(-1); });
    next.addEventListener('click', function () { step(1); });
    mute.addEventListener('click', function () {
      var on = mute.getAttribute('aria-pressed') !== 'true';
      mute.setAttribute('aria-pressed', on ? 'true' : 'false');
      mute.setAttribute('aria-label', on ? 'Unmute' : 'Mute');
      audio.muted = on;
    });
    audio.addEventListener('timeupdate', function () { if (audio.duration) progress(audio.currentTime / audio.duration); });
    audio.addEventListener('ended', function () { step(1); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('is-listening')) leave();
    });
  })();

  /* ---------- the opening: words → hero (→ prototype) ---------- */
  /* A pinned screen; the section's scroll progress runs the hand-over.
     With a prototype (Easy Checkout, 520vh):
       0 … .22   the words fade, the hero comes up to fill the screen
       .22 … .3  the hero alone
       .3 … .92  slowly: the hero fades and draws back while the prototype
                 rises from below the screen into place
     Without one (Cycles Oliver, 220vh):
       0 … .45   the words fade, the hero comes up; then it holds until the
                 section lets go and the page scrolls on. */

  document.querySelectorAll('[data-open]').forEach(function (section) {
    var text  = section.querySelector('[data-open-text]');     // absent: the block hero stands alone
    var hero  = section.querySelector('[data-open-hero]');
    var proto = section.querySelector('[data-open-proto]');
    if (!hero) return;

    function clamp(v) { return Math.min(1, Math.max(0, v)); }
    function ease(t)  { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }   // in-out
    function ramp(p, a, b) { return ease(clamp((p - a) / (b - a))); }

    var pending = false;
    function paint() {
      pending = false;
      var box = section.getBoundingClientRect();
      var run = box.height - window.innerHeight;
      var p = run > 0 ? clamp(-box.top / run) : 0;

      var out1 = text ? ramp(p, 0, proto ? .22 : .45) : 1;   // words away, hero in
      var out2 = proto ? ramp(p, text ? .3 : .12, .92) : 0;  // hero away, prototype in

      if (text) {
        text.style.opacity = String(1 - out1);
        text.style.transform = 'scale(' + (1 - .04 * out1) + ')';
        text.style.pointerEvents = out1 > .5 ? 'none' : '';
      }

      hero.style.opacity = String(out1 * (1 - out2));
      hero.style.transform = text ? 'scale(' + (1.06 - .06 * out1 - .08 * out2) + ')' : 'scale(' + (1 - .08 * out2) + ')';
      hero.style.pointerEvents = (out1 > .5 && out2 < .5) ? '' : 'none';

      if (proto) {
        proto.style.opacity = String(ramp(p, text ? .3 : .12, text ? .6 : .45));
        proto.style.transform = 'translateY(' + (100 - 100 * out2) + 'vh)';
        proto.style.pointerEvents = out2 > .9 ? '' : 'none';
      }
    }
    function update() { if (!pending) { pending = true; requestAnimationFrame(paint); } }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    paint();
  });

  /* ---------- the intro: a shooting star writes the mark ------- */
  /* The CSS plays it (style.css "THE INTRO"); this only lets the page go
     once the star has flared — the blur lifts, the page arrives. The
     inline script after the markup already skipped it when coming back
     from another page of the site. */
  (function intro() {
    var el = document.querySelector('[data-intro]');
    if (!el) return;
    setTimeout(function () {
      el.classList.add('is-done');
      document.body.classList.add('has-arrived');
      document.body.classList.remove('is-arriving');
      setTimeout(function () { el.remove(); document.body.classList.remove('has-arrived'); }, 1250);
    }, 1550);
  })();

  /* ---------- every plate opens big, full screen ------------- */

  (function viewer() {
    var plates = document.querySelectorAll('.case-plate > img, .case-open__hero > img');
    if (!plates.length) return;

    var box = document.createElement('div');
    box.className = 'viewer';
    box.hidden = true;
    box.innerHTML = '<img alt=""><button class="viewer__close" type="button" aria-label="Close"><span></span><span></span></button>';
    document.body.appendChild(box);
    var img = box.querySelector('img');
    var lastFocus = null;

    function open(src, alt) {
      lastFocus = document.activeElement;
      img.src = src; img.alt = alt || '';
      box.hidden = false;
      requestAnimationFrame(function () { box.classList.add('is-open'); });
      document.body.classList.add('is-locked');
      var ask = box.requestFullscreen || box.webkitRequestFullscreen;
      if (ask) { try { var p = ask.call(box); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
    }
    function close() {
      box.classList.remove('is-open');
      document.body.classList.remove('is-locked');
      setTimeout(function () { box.hidden = true; }, 350);
      if (document.fullscreenElement === box && document.exitFullscreen) document.exitFullscreen().catch(function () {});
      if (lastFocus) lastFocus.focus();
    }

    plates.forEach(function (im) {
      // a gallery plate swaps on click; the rest open
      if (im.closest('[data-gallery]')) return;
      im.addEventListener('click', function () {
        // a cycling plate stacks its images: open the one that's showing
        var cyc = im.closest('[data-cycle]');
        var pick = (cyc && cyc.querySelector('img.is-on')) || im;
        open(pick.currentSrc || pick.src, pick.alt);
      });
    });
    box.addEventListener('click', function (e) {
      if (e.target === img) return;      // the image itself is inert
      close();
    });
    document.addEventListener('keydown', function (e) {
      if (!box.hidden && e.key === 'Escape') close();
    });
    document.addEventListener('fullscreenchange', function () {
      if (!document.fullscreenElement && !box.hidden) close();
    });
  })();

  /* ---------- scroll-driven frames ------------------------- */
  /* Scroll position through the section maps onto a frame sequence drawn
     on a canvas, so the motion belongs to the reader rather than to a
     timer — and every frame is a keyframe, so a seek is just a draw. */

  document.querySelectorAll('[data-scrub]').forEach(function (section) {
    var canvas = section.querySelector('[data-scrub-canvas]');
    // a dense, wide screen gets the 1920 set; phones and 1x screens the 1240
    var dense   = window.devicePixelRatio > 1.25 && window.innerWidth > 900;
    var pattern = (dense && section.dataset.framesHd) || section.dataset.frames;
    var count   = parseInt(section.dataset.frameCount, 10) || 0;
    if (!canvas || !pattern || !count) return;

    var ctx    = canvas.getContext('2d');
    var frames = new Array(count);
    var drawn  = -1;
    var target = 0;
    var pending = false;

    function src(i) { return pattern.replace('{i}', String(i).padStart(3, '0')); }

    function draw(i) {
      var im = frames[i];
      if (!im || !im.complete || !im.naturalWidth) return false;
      if (canvas.width !== im.naturalWidth || canvas.height !== im.naturalHeight) {
        canvas.width = im.naturalWidth; canvas.height = im.naturalHeight;
      }
      ctx.drawImage(im, 0, 0);
      drawn = i;
      return true;
    }

    function progress() {
      var box = section.getBoundingClientRect();
      var run = box.height - window.innerHeight;      // scrollable travel
      if (run <= 0) return 0;
      return Math.min(1, Math.max(0, -box.top / run));
    }

    function apply() {
      pending = false;
      var want = Math.round(target * (count - 1));
      if (want === drawn) return;
      // not in yet: hold the nearest frame that is, so nothing flashes
      if (!draw(want)) {
        for (var d = 1; d < count; d++) {
          if (draw(want - d) || draw(want + d)) break;
        }
      }
      section.classList.toggle('is-playing', target > 0.02);
    }

    function update() {
      target = progress();
      if (!pending) { pending = true; requestAnimationFrame(apply); }
    }

    // The first frame comes in on its own so the plate is never blank; the
    // rest follow in order, a few at a time, and redraw if they're the one
    // the reader is waiting on.
    function load(i, done) {
      if (i >= count) return;
      var im = new Image();
      im.decoding = 'async';
      im.onload = function () {
        if (Math.round(target * (count - 1)) === i || drawn < 0) update();
        if (done) done();
      };
      im.onerror = function () { if (done) done(); };
      im.src = src(i);
      frames[i] = im;
    }
    load(0, function () {
      var next = 1;
      function chain() { if (next < count) load(next++, chain); }
      chain(); chain(); chain();                       // three lanes
    });

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  /* ---------- a plate that cycles its images ---------------- */
  /* Several images in one plate, the next one every data-cycle ms —
     only while it's on screen. */

  document.querySelectorAll('[data-cycle]').forEach(function (plate) {
    var imgs = Array.prototype.slice.call(plate.querySelectorAll('img'));
    if (imgs.length < 2) return;
    var every = parseInt(plate.dataset.cycle, 10) || 1000;
    var at = Math.max(0, imgs.findIndex(function (i) { return i.classList.contains('is-on'); }));
    var tick = null;

    function step() {
      imgs[at].classList.remove('is-on');
      at = (at + 1) % imgs.length;
      imgs[at].classList.add('is-on');
    }
    function run(on) {
      if (on && !tick) tick = setInterval(step, every);
      if (!on && tick) { clearInterval(tick); tick = null; }
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        run(entries[0].isIntersecting);
      }, { threshold: 0.1 }).observe(plate);
    } else {
      run(true);
    }
  });

  /* ---------- the hero fades to black as it scrolls away ------ */

  (function heroFade() {
    var hero = document.querySelector('[data-hero]');
    if (!hero) return;
    var pending = false;
    function paint() {
      pending = false;
      var r = hero.getBoundingClientRect();
      // the still reveals clean; it fades to black over the hero's last screen
      var H = window.innerHeight;
      // the scene stays until half the hero has gone by, then sinks to black
      var f = Math.min(1, Math.max(0, (-r.top - r.height * .5) / (r.height * .4)));
      hero.style.setProperty('--fade', f.toFixed(3));
    }
    function update() { if (!pending) { pending = true; requestAnimationFrame(paint); } }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    paint();
  })();

  /* ---------- the pile: a covered block fades to black ------- */
  /* Each block pins; the next slides over it. The covered block dims in
     step with how much of it is under the one above. */

  (function pile() {
    var piles = Array.prototype.slice.call(document.querySelectorAll('.projects'));
    if (!piles.length) return;
    var pending = false;
    function paint() {
      pending = false;
      piles.forEach(function (sec) {
        var cards = sec.querySelectorAll('.card');
        for (var i = 0; i < cards.length; i++) {
          var dim = 0;
          if (i < cards.length - 1) {
            var r = cards[i].getBoundingClientRect(), n = cards[i + 1].getBoundingClientRect();
            dim = Math.min(1, Math.max(0, (r.bottom - n.top) / r.height));
          }
          cards[i].style.setProperty('--dim', dim.toFixed(3));
        }
      });
    }
    function update() { if (!pending) { pending = true; requestAnimationFrame(paint); } }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    paint();
  })();

  /* ---------- image dashes: project cards, case-page plates --- */

  document.querySelectorAll('.card, .case-gallery').forEach(function (card) {
    var media = card.querySelector('.card__media, [data-gallery]');
    var dots  = Array.prototype.slice.call(card.querySelectorAll('.dot'));
    if (!media) return;

    var img = media.querySelector('img');
    var set = [];
    try { set = JSON.parse(media.dataset.gallery || '[]'); } catch (e) { set = []; }

    var count = set.length || dots.length;
    var at = 0;

    function show(i) {
      at = ((i % count) + count) % count;
      if (set.length && img) {
        img.src = set[at][0];
        img.alt = set[at][1] || '';
      }
      dots.forEach(function (d, j) {
        d.classList.toggle('is-active', j === at);
        d.setAttribute('aria-selected', j === at ? 'true' : 'false');
      });
    }

    // clicking the artwork walks forward through the set
    media.style.cursor = 'pointer';
    media.addEventListener('click', function () { show(at + 1); });

    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function (e) { e.stopPropagation(); show(i); });
    });

    // preload the rest so the swap is instant
    set.slice(1).forEach(function (pair) { var p = new Image(); p.src = pair[0]; });
  });

  /* ---------- project colour ------------------------------- */
  /* Hand each card's tint to CSS so the button can borrow it on hover. */

  document.querySelectorAll('.card[data-tint]').forEach(function (card) {
    card.style.setProperty('--tint', card.dataset.tint);
  });

  /* ---------- poster lightbox ------------------------------ */

  (function lightbox() {
    var box = document.querySelector('[data-lightbox]');
    var posters = document.querySelector('#posters');
    if (!box || !posters) return;

    var art   = box.querySelector('[data-lightbox-img]');
    var title = box.querySelector('[data-lightbox-title]');
    var note  = box.querySelector('[data-lightbox-note]');

    // the originals, not the cloned fillers
    var plates = Array.prototype.slice.call(posters.querySelectorAll('.slide'))
                   .filter(function (el) { return !el.dataset.clone; });
    if (!plates.length) return;

    var at = 0, lastFocus = null;

    function paint() {
      var el = plates[at], im = el.querySelector('img');
      if (im) { art.src = im.currentSrc || im.src; art.alt = im.alt || ''; }
      title.textContent = el.dataset.caption || '';
      note.textContent  = el.dataset.note || '';
    }

    function open(on) {
      if (on) {
        lastFocus = document.activeElement;
        box.hidden = false;
        requestAnimationFrame(function () { box.classList.add('is-open'); });
        document.body.classList.add('is-locked');
        box.querySelector('[data-lightbox-next]').focus();
      } else {
        box.classList.remove('is-open');
        document.body.classList.remove('is-locked');
        setTimeout(function () { box.hidden = true; }, 450);
        if (lastFocus) lastFocus.focus();
      }
    }

    function step(d) { at = ((at + d) % plates.length + plates.length) % plates.length; paint(); }
    /* pass 82: "Learn more" under the posters opens the one in the middle */
    var more = posters.querySelector('[data-poster-more]');
    if (more) more.addEventListener('click', function () {
      var c = posters.querySelector('.slide[data-pos="0"]'); if (!c) return;
      var k = plates.indexOf(c); if (k < 0) k = plates.findIndex(function (p) { return p.dataset.caption === c.dataset.caption; });
      at = Math.max(0, k); paint(); open(true);
    });

    // The carousel re-centres a side plate on click, which rewrites its
    // data-pos before a listener on the plate itself would see it. Read the
    // position in the capture phase, on the way down, and track the pointer
    // so a drag that happens to end on the centre plate doesn't open anything.
    var pressX = 0, pressY = 0, moved = false, posAtPress = null;

    posters.addEventListener('pointerdown', function (e) {
      pressX = e.clientX; pressY = e.clientY; moved = false;
      var plate = e.target.closest('.slide');
      posAtPress = plate ? plate.dataset.pos : null;
    }, true);

    posters.addEventListener('pointermove', function (e) {
      if (Math.abs(e.clientX - pressX) > 6 || Math.abs(e.clientY - pressY) > 6) moved = true;
    }, true);

    posters.addEventListener('click', function (e) {
      var plate = e.target.closest('.slide');
      if (!plate || moved || posAtPress !== '0') return;
      var key = plate.dataset.caption;
      var found = plates.findIndex(function (p) { return p.dataset.caption === key; });
      at = found < 0 ? 0 : found;
      paint();
      open(true);
    });

    box.querySelectorAll('[data-lightbox-close]').forEach(function (b) {
      b.addEventListener('click', function () { open(false); });
    });
    box.querySelector('[data-lightbox-prev]').addEventListener('click', function () { step(-1); });
    box.querySelector('[data-lightbox-next]').addEventListener('click', function () { step(1); });

    document.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape')     open(false);
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft')  step(-1);
    });
  })();

  /* ---------- Contact: the note goes straight to Jaime --------------- */
  /* Sent through FormSubmit (formsubmit.co), which mails every note to
     data-to. The very first note makes FormSubmit ask Jaime, once, by email,
     to confirm the address; after that they arrive directly. The visitor
     stays on the page: the button says it's sending, then the form gives way
     to a thank-you. If it fails, the address is offered instead. */
  /* pass 90: on the home page, Keep in touch does not leave: he moves to the right and a note comes up on the left */
  (function mePop() {
    var me = document.querySelector('.me'), pop = me && me.querySelector('[data-me-pop]'), open = me && me.querySelector('[data-me-open]');
    if (!me || !pop || !open) return;
    var t = 0;
    function show(e) {
      if (e) { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); }
      clearTimeout(t); pop.hidden = false; void pop.offsetWidth; me.classList.add('is-talking');
      t = setTimeout(function () { var i = pop.querySelector('input[type=email]'); if (i) i.focus({ preventScroll: true }); }, 750);
    }
    function hide() {
      if (!me.classList.contains('is-talking')) return;
      me.classList.remove('is-talking'); clearTimeout(t);
      t = setTimeout(function () { pop.hidden = true; }, 650);
      try { open.focus({ preventScroll: true }); } catch (e) {}
    }
    open.addEventListener('click', show);
    /* pass 96: no cross any more: Escape, or a click anywhere off the note and off him, puts it away */
    document.addEventListener('pointerdown', function (e) {
      if (!me.classList.contains('is-talking') || pop.contains(e.target) || open.contains(e.target)) return;
      var st = me.querySelector('.me__stage'); if (st && st.contains(e.target)) return;
      hide();
    });
    /* pass 95: he and the note side by side, the same size: as large as the window allows, at most his own size */
    function fit() { var rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16; me.style.setProperty('--ms', Math.max(.6, Math.min(.96, (window.innerWidth / rem - 6.5) / 72)).toFixed(4)); }      // (two 36rem cards, a 2.5rem gap, 2rem to each edge)
    fit(); window.addEventListener('resize', fit);
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
  })();

  (function chat() {
    var form = document.querySelector('[data-chat]');
    if (!form) return;
    var to = form.dataset.to;
    var btn = form.querySelector('[type="submit"]');
    var status = form.querySelector('[data-chat-status]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      if (form.elements._honey && form.elements._honey.value) return;       // a robot
      var name = form.elements.name ? form.elements.name.value.trim() : '';
      var from = form.elements.email.value.trim();
      var topic = form.elements.topic ? form.elements.topic.value : '';
      var subj = form.elements.subject ? form.elements.subject.value.trim() : '';      // pass 96: the visitor's own subject line
      var msg = form.elements.message.value.trim();
      btn.disabled = true; btn.textContent = 'Sending…';
      if (status) status.textContent = '';
      var mailto = 'mailto:' + to + '?subject=' + encodeURIComponent(subj || 'Hello') + '&body=' + encodeURIComponent(msg);
      fetch('https://formsubmit.co/ajax/' + to, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          name: name, email: from, subject: subj, topic: topic, message: msg,
          _replyto: from,
          _subject: (subj ? subj + ' · ' : (topic ? topic + ', ' : 'A note ')) + 'from ' + (name || from) + ' (uljo)',
          _template: 'table', _captcha: 'false'
        })
      }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }, function () { return { ok: r.ok, j: {} }; }); })
        .then(function (res) {
          /* FormSubmit sends nothing until the address has been confirmed once (a link it mails to Jaime on the first note) */
          if (/activat/i.test(String(res.j.message || ''))) { var er = new Error('activation'); er.activation = true; throw er; }
          if (!res.ok || String(res.j.success) === 'false') throw new Error(res.j.message || 'failed');
          var done = document.createElement('div');
          done.className = 'reach__done';
          done.setAttribute('role', 'status');
          done.innerHTML = '<h3>Thank you' + (name ? ', ' + name.replace(/[<>&"]/g, '') : '') + '.</h3>' +
            '<p>Your note is on its way to Jaime. He&rsquo;ll answer at ' + from.replace(/[<>&"]/g, '') + '.</p>';
          Array.prototype.forEach.call(form.children, function (c) { c.hidden = true; });
          form.appendChild(done);
        })
        .catch(function (err) {
          btn.disabled = false; btn.textContent = 'Send';
          if (status) status.innerHTML = (err && err.activation ? 'This form is being switched on. In the meantime, ' : 'It didn&rsquo;t go through. Try again, or ') +
            '<a href="' + mailto.replace(/"/g, '&quot;') + '">send it from your own mail</a> to ' + to + '.';
        });
    });
  })();

  /* pass 96: "Let's chat." is written in outline first, as the lab's name is, then filled: on the contact page by the
     scroll (fully filled once the page has come down ~260 px, or by itself if the page cannot scroll); on the home page
     each time the note opens */
  (function drawTitles() {
    var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelectorAll('[data-draw-title]').forEach(function (h) {
      if (calm) return;
      h.classList.add('is-armed');
      if (!h.hasAttribute('data-draw-scroll')) return;                 // (the home page's: main.js mePop starts it)
      requestAnimationFrame(function () { h.classList.add('is-drawn'); });
      var doc = document.documentElement;
      function fill() {
        var room = doc.scrollHeight - window.innerHeight;
        if (room < 80) { h.classList.add('is-self'); return; }        // nothing to scroll: it fills on its own
        h.classList.remove('is-self');
        var k = Math.max(0, Math.min(1, window.scrollY / Math.min(260, room)));
        h.style.setProperty('--cf', k.toFixed(3));
      }
      fill(); window.addEventListener('scroll', fill, { passive: true }); window.addEventListener('resize', fill);
    });
    var me = document.querySelector('.me'), mh = me && me.querySelector('.me__chat-h');
    if (me && mh && !calm && 'MutationObserver' in window) {
      new MutationObserver(function () {
        if (me.classList.contains('is-talking')) { mh.classList.remove('is-drawn'); void mh.offsetWidth; mh.classList.add('is-drawn', 'is-self'); }      // (here the page does not scroll: it fills on its own once drawn)
        else mh.classList.remove('is-drawn');
      }).observe(me, { attributes: true, attributeFilter: ['class'] });
    }
  })();

  /* pass 96: on the home page the ULJO logo takes you back to the title screen where you are: no reload (so no intro
     and no game starting); out of the walk first if he is in it */
  (function logoHome() {
    if (!document.querySelector('[data-hero-menu]')) return;
    document.querySelectorAll('.topbar__logo').forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
        e.preventDefault();
        var w = window.__world;
        if (w && w.mode !== 'rest' && w.toMenu) w.toMenu();
        var me = document.querySelector('.me.is-talking'); if (me) me.classList.remove('is-talking');
        window.scrollTo({ top: 0, behavior: 'instant' });
        try { history.replaceState(null, '', location.pathname + location.search); } catch (er) {}
      });
    });
  })();

  /* Contact: copy the address; the time in Montréal */
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var text = b.dataset.copy, label = b.textContent;
      function done(ok) { b.textContent = ok ? 'Copied' : text; setTimeout(function () { b.textContent = label; }, 1600); }
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
      else done(false);
    });
  });
  (function localTime() {
    var el = document.querySelector('[data-local-time]');
    if (!el) return;
    function tick() {
      try {
        el.textContent = new Date().toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Montreal' });
      } catch (e) { el.textContent = 'Eastern Time'; }
    }
    tick(); setInterval(tick, 15000);
  })();
})();
