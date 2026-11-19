/* ============================================================
   ULJO — feel: how the site moves under the hand
   • the cursor is a point of light, after Navi: it glows wider
     the more the hand moves
   • buttons: an outline at rest; on hover filled, the words roll, an arrow comes in
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var me = document.currentScript;

  /* ---------- the light ------------------------------------- */
  /* A small bright point at the pointer and a wide, soft light around it
     that trails a little and swells the more the hand moves — no wings,
     no flutter, only light. On the home page it waits for "Welcome, to my
     Underground Lab." to come into view ([data-navi-from]); above that,
     over the title screen, the ordinary cursor. */
  (function navi() {
    if (!fine) return;
    var cv = document.createElement('canvas');
    var cx = cv.getContext('2d');
    if (!cx) return;
    cv.className = 'navi';
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483646;pointer-events:none';
    var css = document.createElement('style');
    css.textContent = 'html.has-navi,html.has-navi *{cursor:none!important}';
    document.head.appendChild(css);

    var from = document.querySelector('[data-navi-from]');
    function wanted() { return !from || from.getBoundingClientRect().top < window.innerHeight * .55; }

    var W = 0, H = 0, dpr = 1;
    function size() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    }

    var mx = -999, my = -999, px = -999, py = -999;
    var seen = false, inside = false, on = false, vis = 0;
    var energy = 0, over = 0, overT = 0, press = 0, pressT = 0;
    var trail = [.12, .085, .06, .045, .033].map(function (f) { return { x: -999, y: -999, f: f }; });
    var gx = -999, gy = -999;
    var last = performance.now();
    var CLICKABLE = 'a,button,[role="button"],input,select,textarea,label,summary,.slide,.pblock,[data-player-open],[data-lightbox-close]';

    /* over anything clickable, or any light card or plate, it steps aside
       for the ordinary cursor — the light is for the dark ground only */
    var SURFACE = CLICKABLE + ',.pblock,.me__stage,.carousel__stage,.lightbox__panel,.topbar,.case-open__hero--block,.case-plate,.proto__frame,.chat__card,.stagevid,.single__cover,.music__photo,.player,.air-hero,.air-card';
    var onSurface = false;
    function gate() {
      var want = wanted() && inside && !onSurface;
      if (want !== on) { on = want; document.documentElement.classList.toggle('has-navi', on); }
    }
    function begin() {
      if (seen) return;
      seen = true;
      document.body.appendChild(cv);
      size();
      requestAnimationFrame(frame);
    }
    window.addEventListener('resize', function () { if (seen) size(); });
    /* scrolling moves the page under a still pointer: look again */
    window.addEventListener('scroll', function () {
      if (inside && mx > -900) {
        var t = document.elementFromPoint(mx, my);
        onSurface = !!(t && t.closest && t.closest(SURFACE));
        over = t && t.closest && t.closest(CLICKABLE) ? 1 : 0;
      }
      gate();
    }, { passive: true });
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      if (!seen || px < -900) {
        px = gx = mx; py = gy = my;
        trail.forEach(function (t) { t.x = mx; t.y = my; });
      }
      inside = true;
      var t = e.target;
      over = t && t.closest && t.closest(CLICKABLE) ? 1 : 0;
      onSurface = !!(t && t.closest && t.closest(SURFACE));
      begin(); gate();
    }, { passive: true });
    /* leaving the window — or slipping into an iframe — hands back the cursor */
    document.addEventListener('mouseout', function (e) { if (!e.relatedTarget) { inside = false; gate(); } });
    document.addEventListener('pointerdown', function () { press = 1; });
    document.addEventListener('pointerup', function () { press = 0; });

    function glow(x, y, r, stops) {
      var g = cx.createRadialGradient(x, y, 0, x, y, r);
      stops.forEach(function (s) { g.addColorStop(s[0], s[1]); });
      cx.fillStyle = g;
      cx.beginPath(); cx.arc(x, y, r, 0, 6.2832); cx.fill();
    }

    /* pass 69: a firefly. It carries a charge — every bit of movement feeds it, faster feeds it more,
       and it glows the more it is charged; still, it settles back to a small soft light. */
    var fx = -999, fy = -999, fvx = 0, fvy = 0, charge = 0, flick = Math.random() * 10;
    function frame(now) {
      var dt = Math.min(50, now - last); last = now;
      var k = dt / 16.667, s = dt / 1000;

      /* pass 70: no weight — the light is exactly on the pointer; only its glow remembers the movement */
      if (fx < -900) { fx = mx; fy = my; }
      fvx = (mx - fx) / Math.max(s, .001); fvy = (my - fy) / Math.max(s, .001);
      fx = mx; fy = my;
      var speed = Math.sqrt(fvx * fvx + fvy * fvy);                  // px per second
      /* the charge: fed by speed (faster feeds more than its share), drained slowly */
      charge += (Math.pow(Math.min(speed, 2600) / 1400, 1.35) * .9) * s;
      charge -= charge * (1 - Math.pow(.42, s)) + .04 * s;
      charge = Math.max(0, Math.min(1.25, charge));
      var vx = (mx - px) / k, vy = (my - py) / k;
      px = mx; py = my;
      var want = Math.min(1, charge);
      energy += (want - energy) * (1 - Math.pow(1 - (want > energy ? .12 : .03), k));
      overT += (over - overT) * (1 - Math.pow(.82, k));
      pressT += (press - pressT) * (1 - Math.pow(.7, k));
      vis += ((on ? 1 : 0) - vis) * (1 - Math.pow(on ? .86 : .6, k));   // gone quickly, back gently
      flick += s * (2.1 + energy * 2);
      var pulse = reduce ? 1 : .86 + .14 * Math.sin(flick) * Math.sin(flick * .37 + 1.3);   // a firefly's slow breathing

      var fg = 1 - Math.pow(1 - .06, k);                     // the wide light drifts after the body
      gx += (fx - gx) * fg; gy += (fy - gy) * fg;
      var lead = { x: fx, y: fy };
      trail.forEach(function (t) {
        var f = 1 - Math.pow(1 - t.f * 1.6, k);
        t.x += (lead.x - t.x) * f; t.y += (lead.y - t.y) * f;
        lead = t;
      });

      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx.clearRect(0, 0, W, H);
      if (vis > .01) {
        var e = energy, a = vis * pulse;
        cx.globalCompositeOperation = 'lighter';

        /* the wide light: small when still, swelling with the charge */
        var R = 46 + 230 * e + 20 * overT;
        glow(gx, gy, R, [
          [0,   'rgba(150,210,255,' + (.06 + .2 * e) * a + ')'],
          [.4,  'rgba(95,170,255,' + (.025 + .09 * e) * a + ')'],
          [1,   'rgba(60,130,255,0)']
        ]);
        /* the wake: soft lights strung behind, brighter the more it is charged */
        if (!reduce) trail.forEach(function (t, i) {
          var fall = 1 - i / trail.length;
          glow(t.x, t.y, 16 + 54 * e, [
            [0, 'rgba(185,228,255,' + (.2 * e * fall) * a + ')'],
            [1, 'rgba(90,160,255,0)']
          ]);
        });
        /* the close glow */
        glow(fx, fy, 15 + 26 * e + 8 * overT, [
          [0,  'rgba(225,244,255,' + (.42 + .38 * e) * a + ')'],
          [.4, 'rgba(120,195,255,' + (.13 + .2 * e) * a + ')'],
          [1,  'rgba(80,160,255,0)']
        ]);

        /* the firefly itself */
        cx.globalCompositeOperation = 'source-over';
        cx.globalAlpha = vis;
        var r = (3.6 + overT * 1.4 + e * 1.3) * (1 - .25 * pressT);
        var core = cx.createRadialGradient(fx - r * .3, fy - r * .3, 0, fx, fy, r);
        core.addColorStop(0, '#ffffff');
        core.addColorStop(.6, '#e2f4ff');
        core.addColorStop(1, '#79c6ff');
        cx.fillStyle = core;
        cx.beginPath(); cx.arc(fx, fy, r, 0, 6.2832); cx.fill();
        cx.lineWidth = 1;
        cx.strokeStyle = 'rgba(40,120,210,.5)';          // keeps it visible on white
        cx.stroke();
        cx.globalAlpha = 1;
      }
      requestAnimationFrame(frame);
    }
  })();

  /* ---------- buttons: the words roll, an arrow comes in -------- */
  /* The label sits in a one-line window with a copy right under it; on
     hover it rolls up and the copy takes its place. An arrow slides in on
     the right. At rest the button is only its outline. */
  (function reels() {
    var ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    document.querySelectorAll('.btn').forEach(function (btn) {
      if (btn.querySelector('.reel')) return;
      var host = null;
      Array.prototype.forEach.call(btn.childNodes, function (n) {
        if (host) return;
        if (n.nodeType === 3 && n.textContent.trim()) host = n;
        else if (n.nodeType === 1 && n.tagName === 'SPAN' && !n.className && n.textContent.trim()) host = n;
      });
      if (!host) return;
      var text = host.textContent.trim();
      var reel = document.createElement('span');
      reel.className = 'reel';
      var col = document.createElement('span');
      col.className = 'reel__col';
      for (var i = 0; i < 2; i++) {
        var c = document.createElement('span');
        c.textContent = text;
        if (i) c.setAttribute('aria-hidden', 'true');
        col.appendChild(c);
      }
      reel.appendChild(col);
      btn.replaceChild(reel, host);
      if (!btn.querySelector('.btn__icon')) {
        var arrow = document.createElement('span');
        arrow.className = 'btn__arrow';
        arrow.innerHTML = ARROW;
        btn.appendChild(arrow);
        btn.classList.add('btn--roll');
      }
    });
  })();
})();
