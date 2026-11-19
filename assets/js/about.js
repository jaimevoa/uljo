/* ============================================================
   ULJO — About me (pass 52)
   • space: a sky of stars behind the whole page, in three depths
   • the eclipse: the planet's night side, its air lit from behind —
     orange at the limb, then pink, then blue, as the hill glows on
     the home page — the air drifting slowly
   • "Music" rises from behind the photograph as it comes up
   • the stream, six minutes of it: 1:50:20 → 1:56:30
   • Desiderium: cover, time, play
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---------- space --------------------------------------------- */
  /* Three layers of stars. The far one is drawn once and only slides;
     the nearer two twinkle, a few at a time. Scrolling moves each at its
     own pace, so the sky has depth. */
  (function space() {
    var cv = document.querySelector('[data-space]');
    if (!cv) return;
    var cx = cv.getContext('2d');
    if (!cx) return;
    var W = 0, H = 0, dpr = 1, WORLD = 0, far = null, layers = [];

    function rnd(a, b) { return a + Math.random() * (b - a); }
    function tint() {
      var r = Math.random();
      return r < .72 ? [255, 255, 255] : r < .87 ? [205, 222, 255] : [255, 238, 218];
    }
    /* pass 90: more depth. Four layers instead of three, each further apart in how fast it slides (the far dust hardly
       moves, a few near, soft, larger points move a lot); two faint clouds of colour at their own depths; the whole sky
       leans a little with the pointer, the near layers most; and now and then a shooting star. Every point is one small
       picture drawn once (no gradient made per frame). */
    var clouds = null, halo = null, dot = null, mx = 0, my = 0, ex = 0, ey = 0, shoot = null, nextShoot = 0;
    function sprite(r, soft) {
      var c = document.createElement('canvas'), S = Math.ceil(r * 2 * dpr) + 2; c.width = c.height = S;
      var x = c.getContext('2d'), g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      if (soft) { g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(.35, 'rgba(255,255,255,.16)'); g.addColorStop(1, 'rgba(255,255,255,0)'); }
      else { g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.55, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,0)'); }
      x.fillStyle = g; x.fillRect(0, 0, S, S); return c;
    }
    function build() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = window.innerWidth; H = window.innerHeight;
      WORLD = Math.round(H * 1.6);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      halo = sprite(7, true); dot = sprite(1.6, false);

      /* the far layer: dust and the faintest haze, painted once */
      far = document.createElement('canvas');
      far.width = Math.round(W * dpr); far.height = Math.round(WORLD * dpr);
      var f = far.getContext('2d');
      f.setTransform(dpr, 0, 0, dpr, 0, 0);
      var haze = [
        [W * .78, WORLD * .22, Math.max(W, H) * .55, 'rgba(38,62,140,.06)'],
        [W * .16, WORLD * .64, Math.max(W, H) * .5, 'rgba(110,44,120,.04)'],
        [W * .5, WORLD * .95, Math.max(W, H) * .6, 'rgba(20,70,110,.045)']
      ];
      haze.forEach(function (h) {
        var g = f.createRadialGradient(h[0], h[1], 0, h[0], h[1], h[2]);
        g.addColorStop(0, h[3]); g.addColorStop(1, 'rgba(0,0,0,0)');
        f.fillStyle = g; f.fillRect(0, 0, W, WORLD);
      });
      var n = Math.round(W * WORLD / 480);
      for (var i = 0; i < n; i++) {
        var c = tint(), a = rnd(.08, .38), sz = rnd(.3, .7);
        f.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')';
        f.fillRect(rnd(0, W), rnd(0, WORLD), sz, sz);
      }
      /* two clouds of colour, nearer than the dust: each a cluster of soft blots, uneven, very faint */
      clouds = document.createElement('canvas');
      clouds.width = Math.round(W * dpr); clouds.height = Math.round(WORLD * dpr);
      var q = clouds.getContext('2d'); q.setTransform(dpr, 0, 0, dpr, 0, 0); q.globalCompositeOperation = 'lighter';
      [[W * .2, WORLD * .3, '70,90,190'], [W * .82, WORLD * .72, '120,60,150']].forEach(function (cl) {
        for (var k = 0; k < 14; k++) {
          var r = rnd(.08, .22) * Math.max(W, H), x0 = cl[0] + rnd(-.18, .18) * W, y0 = cl[1] + rnd(-.12, .12) * WORLD;
          var g = q.createRadialGradient(x0, y0, 0, x0, y0, r);
          g.addColorStop(0, 'rgba(' + cl[2] + ',' + rnd(.012, .03).toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + cl[2] + ',0)');
          q.fillStyle = g; q.fillRect(x0 - r, y0 - r, r * 2, r * 2);
        }
      });
      /* the nearer layers: fewer, brighter, alive; the nearest few are large and soft, as if out of focus */
      layers = [
        { k: .05, lean: 5, stars: [] },
        { k: .16, lean: 12, stars: [] },
        { k: .36, lean: 26, stars: [] }
      ];
      var counts = [Math.round(W * WORLD / 3600), Math.round(W * WORLD / 15000), Math.round(W * WORLD / 90000)];
      layers.forEach(function (L, li) {
        for (var j = 0; j < counts[li]; j++) {
          L.stars.push({
            x: rnd(0, W), y: rnd(0, WORLD),
            r: li === 2 ? rnd(2.2, 3.6) : li ? rnd(.8, 1.5) : rnd(.45, .95),
            a: li === 2 ? rnd(.08, .2) : li ? rnd(.55, .95) : rnd(.28, .7),
            c: tint(),
            tw: Math.random() < .45 ? rnd(.4, 1.3) : 0,
            p: rnd(0, 6.283)
          });
        }
      });
      nextShoot = performance.now() + rnd(2500, 5000);
    }
    window.addEventListener('pointermove', function (e) { mx = e.clientX / (W || 1) - .5; my = e.clientY / (H || 1) - .5; }, { passive: true });

    function slide(img, k, lx, ly) {                      // an image the height of the sky, sliding and wrapping
      var off = ((window.scrollY * k) % WORLD) * dpr, x = lx * dpr, y = ly * dpr;
      cx.drawImage(img, x, y - off);
      cx.drawImage(img, x, y - off + img.height);
    }
    function draw(t) {
      cx.setTransform(1, 0, 0, 1, 0, 0);
      cx.clearRect(0, 0, cv.width, cv.height);
      var sy = window.scrollY;
      ex += (mx - ex) * .05; ey += (my - ey) * .05;          // the lean follows the pointer slowly
      slide(far, .015, -ex * 2, -ey * 2);
      slide(clouds, .035, -ex * 4, -ey * 4);
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layers.forEach(function (L, li) {
        var o = sy * L.k, lx = -ex * L.lean, ly = -ey * L.lean;
        L.stars.forEach(function (s) {
          var y = (s.y - o) % WORLD; if (y < 0) y += WORLD;
          y += ly; var x = s.x + lx;
          if (y > H + 12 || y < -12) return;
          var a = s.a;
          if (s.tw && !reduce) a *= .62 + .38 * Math.sin(t * .001 * s.tw + s.p);
          if (li === 2) { cx.globalAlpha = a; cx.drawImage(halo, x - s.r * 3, y - s.r * 3, s.r * 6, s.r * 6); return; }
          if (li && s.r > 1.1) { cx.globalAlpha = a * .5; cx.drawImage(halo, x - s.r * 4.5, y - s.r * 4.5, s.r * 9, s.r * 9); }
          cx.globalAlpha = a; cx.drawImage(dot, x - s.r * .75, y - s.r * .75, s.r * 1.5, s.r * 1.5);
        });
      });
      cx.globalAlpha = 1;
      /* a shooting star, now and then: a thin streak with a bright head, across a part of the sky, gone in a second */
      if (!reduce) {
        if (!shoot && t > nextShoot) {
          var dir = Math.random() < .5 ? -1 : 1, ang = rnd(.32, .62), len = rnd(130, 240);
          shoot = { x: rnd(W * .15, W * .85), y: rnd(H * .05, H * .45), dx: Math.cos(ang) * dir, dy: Math.sin(ang), len: len, d: rnd(650, 1050), t0: t, run: rnd(260, 420) };
        }
        if (shoot) {
          var k2 = (t - shoot.t0) / shoot.d;
          if (k2 >= 1) { shoot = null; nextShoot = t + rnd(5000, 11000); }
          else {
            var e = 1 - Math.pow(1 - k2, 2), hx = shoot.x + shoot.dx * shoot.run * e, hy = shoot.y + shoot.dy * shoot.run * e;
            var tl = shoot.len * Math.min(1, k2 * 3), al = Math.min(1, k2 * 6) * (1 - Math.pow(k2, 3));
            var g = cx.createLinearGradient(hx, hy, hx - shoot.dx * tl, hy - shoot.dy * tl);
            g.addColorStop(0, 'rgba(235,245,255,' + (.85 * al).toFixed(3) + ')'); g.addColorStop(1, 'rgba(235,245,255,0)');
            cx.strokeStyle = g; cx.lineWidth = 1.3; cx.lineCap = 'round';
            cx.beginPath(); cx.moveTo(hx, hy); cx.lineTo(hx - shoot.dx * tl, hy - shoot.dy * tl); cx.stroke();
            cx.globalAlpha = al; cx.drawImage(halo, hx - 6, hy - 6, 12, 12); cx.globalAlpha = 1;
          }
        }
      }
    }

    var running = true;
    function frame(t) {
      if (!running) return;
      draw(t);
      if (!reduce) requestAnimationFrame(frame);
    }
    build();
    requestAnimationFrame(frame);
    var rt = null;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { build(); draw(performance.now()); }, 120);
    });
    if (reduce) window.addEventListener('scroll', function () { draw(0); }, { passive: true });
    document.addEventListener('visibilitychange', function () {
      running = !document.hidden;
      if (running && !reduce) requestAnimationFrame(frame);
    });
  })();

  /* ---------- the eclipse ---------------------------------------- */
  /* A fragment shader over the hero. The planet is a disc whose centre
     sits above the screen; its lower limb crosses it. Outside the limb
     the air glows — a white-hot line, then orange, pink, mauve, teal,
     deep blue, navy — strongest at the bottom where the light is right
     behind, thinning toward the sides. Domain-warped noise lets the air
     drift like smoke. Where the air is thin the canvas is transparent,
     so the stars show through; the disc itself is opaque black. */
  (function eclipse() {
    var sec = document.querySelector('[data-eclipse]');
    var cv = sec && sec.querySelector('[data-eclipse-canvas]');
    if (!cv) return;
    var gl = null;
    try {
      gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false }) ||
           cv.getContext('experimental-webgl', { premultipliedAlpha: true, alpha: true });
    } catch (e) { gl = null; }
    if (!gl) { sec.classList.add('is-flat'); return; }

    var VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
    var FS = [
      'precision highp float;',
      'uniform vec2 uRes;uniform vec3 uP;uniform float uT;uniform float uS;uniform float uL;',
      'float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}',
      'float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);',
      ' return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}',
      'float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*noise(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}',
      /* the hill's own colours, sampled off the home still */
      'const vec3 HOT=vec3(1.,.93,.80);',
      'const vec3 ORA=vec3(.965,.392,.0);',        /* #f66400 */
      'const vec3 RED=vec3(.992,.325,.196);',      /* #fd5332 */
      'const vec3 PNK=vec3(.996,.341,.439);',      /* #fe5770 */
      'const vec3 MAU=vec3(.773,.376,.471);',      /* #c56078 */
      'const vec3 TEA=vec3(.0,.345,.420);',        /* #00586b */
      'const vec3 DEE=vec3(.0,.224,.322);',        /* #003952 */
      'const vec3 NAV=vec3(.024,.082,.220);',      /* #061538 */
      'vec3 ramp(float t){',
      ' vec3 c=mix(ORA,RED,smoothstep(.01,.05,t));',
      ' c=mix(c,PNK,smoothstep(.04,.11,t));',
      ' c=mix(c,MAU,smoothstep(.08,.18,t));',
      ' c=mix(c,TEA,smoothstep(.15,.36,t));',
      ' c=mix(c,DEE,smoothstep(.34,.8,t));',
      ' c=mix(c,NAV,smoothstep(.8,1.6,t));',
      ' return c;}',
      'void main(){',
      ' vec2 p=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y)/uS;',   /* css px, y down */
      ' vec2 d=p-uP.xy;float r=length(d);float h=r-uP.z;',          /* h: height above the limb */
      ' float th=atan(d.y,d.x);',                                      /* 90deg = straight down */
      ' float face=pow(clamp(sin(th),0.,1.),1.15);',                    /* the light is behind, below */
      ' float L=uL*(.55+.6*face)*(1.+.07*sin(uT*.55));',               /* the air is deepest under the light, and breathes */
      ' float t=max(h,0.)/L;',
      /* the air drifts: noise along the limb and outward, warped by itself */
      ' vec2 q=vec2(th*uP.z/uL*.7+uT*.03,t*1.3-uT*.16);',              /* it streams outward, off the planet */
      ' q+=.7*vec2(fbm(q+vec2(uT*.05,0.)),fbm(q+vec2(5.2,1.3)-uT*.04));',
      ' float n=fbm(q);',
      ' float wisp=smoothstep(.28,.85,n);',
      ' float tw=t*(.8+.45*n);',
      ' float core=1.1*exp(-tw/.075);',                                     /* orange, hugging the limb */
      ' float mid=.95*exp(-tw/.2)*(.7+.6*n);',                        /* the pink layer */
      ' float halo=.62*exp(-tw/.85)*(.3+1.35*wisp);',                  /* the blue, in wisps */
      ' vec3 col=ramp(tw)*(core+mid+halo)*face;',
      ' col+=HOT*exp(-max(h,0.)/1.4)*1.3*face;',                      /* the limb, white-hot */
      /* the aura: long plumes all round the limb, rising off it and
         turning slowly, a pulse running out through them */
      ' float ta=max(h,0.)/(uL*3.);',
      ' vec2 qa=vec2(th*7.+uT*.06,ta*2.2-uT*.32);',
      ' qa+=.9*vec2(fbm(qa*.8+vec2(0.,uT*.05)),fbm(qa*.8+vec2(3.1,7.7)));',
      ' float plume=smoothstep(.34,.9,fbm(qa));',
      ' float pulse=.75+.25*sin(ta*9.-uT*1.4);',
      ' float aura=exp(-ta*1.05)*plume*pulse*(.4+.6*face)*smoothstep(0.,.02,ta);',
      ' col+=mix(mix(PNK,MAU,smoothstep(.0,.25,ta)),TEA,smoothstep(.2,.9,ta))*aura*1.7;',
      ' col+=HOT*pow(face,16.)*exp(-max(h,0.)/(uL*.08))*.5;',         /* the light, peeking */
      /* the night side: a hair of air in front of the dark, then nothing */
      ' float inside=smoothstep(.75,-.75,h);',
      ' vec3 night=RED*exp(min(h,0.)/(uL*.015))*.28*face+vec3(.01,.014,.028)*exp(min(h,0.)/(uL*.9));',
      ' col=mix(col,night,inside);',
      ' col=1.-exp(-col*1.35);',                                        /* soft shoulder, no clipping */
      ' col+=(hash(gl_FragCoord.xy+uT)-.5)/255.;',                     /* no banding */
      ' float a=max(inside,clamp(max(col.r,max(col.g,col.b))*1.15,0.,1.));',
      ' col=min(col,vec3(a));',
      ' gl_FragColor=vec4(col,a);',
      '}'
    ].join('\n');

    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
      return s;
    }
    var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) { sec.classList.add('is-flat'); return; }
    var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { sec.classList.add('is-flat'); return; }
    gl.useProgram(pr);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uRes = gl.getUniformLocation(pr, 'uRes'), uP = gl.getUniformLocation(pr, 'uP'),
        uT = gl.getUniformLocation(pr, 'uT'), uS = gl.getUniformLocation(pr, 'uS'),
        uL = gl.getUniformLocation(pr, 'uL');

    var W = 0, H = 0, scale = 1;
    function size() {
      var host = cv.parentNode || sec; W = host.clientWidth; H = host.clientHeight;      // the pin, when the section is a long scroll
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      /* keep it under ~2.4 million pixels: the light is soft, the limb stays crisp enough */
      scale = Math.min(dpr, Math.sqrt(2.4e6 / Math.max(1, W * H)));
      cv.width = Math.round(W * scale); cv.height = Math.round(H * scale);
      gl.viewport(0, 0, cv.width, cv.height);
      var phone = W < 768;
      var R = phone ? Math.max(W * .95, H * .5) : Math.max(W * .68, H * .95);
      var bottom = H * (phone ? .66 : .78);
      gl.uniform2f(uRes, cv.width, cv.height);
      gl.uniform3f(uP, W / 2, bottom - R, R);
      gl.uniform1f(uS, scale);
      gl.uniform1f(uL, H * (phone ? .2 : .17));
    }

    var t0 = performance.now(), visible = true, raf = 0;
    function draw(now) {
      gl.uniform1f(uT, (now - t0) / 1000);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    function frame(now) {
      raf = 0;
      if (!visible || document.hidden || sec.classList.contains('has-world')) return;      // the real planet has taken over
      draw(now);
      if (!reduce) raf = requestAnimationFrame(frame);
    }
    function wake() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); }

    size();
    draw(performance.now() + 40000);                                 // a settled first frame
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; wake(); }).observe(sec);
    }
    document.addEventListener('visibilitychange', wake);
    var rt = null;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { size(); draw(performance.now()); wake(); }, 100);
    });
    wake();

    /* the words fade as the planet goes up; the arrow leaves */
    var words = sec.querySelector('.eclipse__words');
    var cue = sec.querySelector('[data-eclipse-scroll]');
    function onScroll() {
      if (sec.hasAttribute('data-eclipse-3d')) return;                // about-world.js moves the words
      var k = clamp(window.scrollY / (H * .55), 0, 1);
      if (words) { words.style.opacity = String(1 - k); words.style.transform = 'translateY(' + (-k * 3) + 'rem)'; }
      if (cue) cue.classList.toggle('is-gone', window.scrollY > 40);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  })();

  /* ---------- "Music", from behind the photograph ------------------ */
  (function music() {
    var stage = document.querySelector('[data-music]');
    var title = stage && stage.querySelector('[data-music-title]');
    if (!title) return;
    /* each letter its own span: out of a blur, up, one after another */
    var word = title.textContent;
    title.setAttribute('aria-label', word);
    title.innerHTML = word.split('').map(function (ch, i) {
      return '<span class="music__l" aria-hidden="true" style="--i:' + i + '">' + ch + '</span>';
    }).join('');
    if (reduce) { title.style.setProperty('--rise', '0'); title.classList.add('is-in'); return; }
    var ticking = false;
    function update() {
      ticking = false;
      var r = stage.getBoundingClientRect(), vh = window.innerHeight;
      /* 0 as the photograph's top enters the screen, 1 when it's a third of the way up */
      var p = clamp((vh - r.top) / (vh * .68), 0, 1);
      var e = 1 - Math.pow(1 - p, 3);
      title.style.setProperty('--rise', ((1 - e) * 128).toFixed(2));
      if (p > .1) title.classList.add('is-in');
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  })();

  /* ---------- one sound at a time ----------------------------------- */
  var hush = [];
  function quiet(except) { hush.forEach(function (f) { if (f !== except) f(); }); }

  /* ---------- the television: its channels (pass 78) ----------------- */
  /* Each channel is one film of him (about.html: [data-ch]). A cover until it is asked for; zapped to, it plays.
       · a YouTube channel (data-yt, data-start, data-end) is held to its own stretch: channel 1 is his six minutes
         of the Cégeps en spectacle stream, 1:50:20 → 1:56:30, and nothing else of those two hours: no timeline to
         wander on (controls off), it starts at its start, stops at its end and comes back to its cover; a pause
         brings the cover back too.
       · a film channel (data-film) is a file of the site, played in a <video>.
     Zapping: the two round buttons under the set, the set's own knobs (den.js lays a button over them), the left
     and right arrows while one of those has the focus. Between two channels: a moment of snow, the number in a corner. */
  (function television() {
    /* pass 80: the television is already playing when it comes into view: muted (a browser lets a film start by itself only
       without sound), round and round. A tap on its screen gives it its sound, another takes it away. Channels are zapped
       by the two arrows, the set's knobs, or the left and right keys; between two, a moment of snow and the number.
         · a YouTube channel (data-yt, data-start, data-end) is held to its own stretch: channel 1 is his six minutes of the
           Cégeps en spectacle stream, 1:50:20 → 1:56:30, and nothing else (no timeline to wander on); at its end it starts again.
         · a film channel (data-film) is a file of the site, looped. */
    var box = document.querySelector('[data-tv]');
    if (!box) return;
    var els = [].slice.call(box.querySelectorAll('[data-ch]')), n = els.length;
    if (!n) return;
    var osd = box.querySelector('[data-tv-osd]'), titleEl = document.querySelector('[data-tv-title]');
    var cur = 0, api = null, snowT = 0, osdT = 0, seen = false, sound = false;
    var chans = els.map(function (el) {
      var cv = el.querySelector('[data-ch-play]'); if (cv) cv.hidden = true;       // no cover to press: it plays
      return { el: el, yt: el.dataset.yt || '', A: +el.dataset.start || 0, B: +el.dataset.end || 0, film: el.dataset.film || '', player: null, video: null, guard: 0, loading: false };
    });
    /* the tap that gives it sound: over the whole glass, with a small loudspeaker in its corner */
    var tap = document.createElement('button'); tap.type = 'button'; tap.className = 'tvch__tap';
    tap.setAttribute('aria-label', 'Turn the sound on');
    tap.innerHTML = '<i aria-hidden="true"><svg class="on" viewBox="0 0 24 24"><path d="M4 9.6h3.1L12 5.6v12.8l-4.9-4H4z" fill="currentColor"/><path d="M15.4 9.1a4.1 4.1 0 0 1 0 5.8M17.9 6.6a7.6 7.6 0 0 1 0 10.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
      '<svg class="off" viewBox="0 0 24 24"><path d="M4 9.6h3.1L12 5.6v12.8l-4.9-4H4z" fill="currentColor"/><path d="M16 9.6l4.8 4.8M20.8 9.6L16 14.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></i>';
    box.appendChild(tap);
    function paintSound() { box.classList.toggle('is-sound', sound); tap.setAttribute('aria-label', sound ? 'Turn the sound off' : 'Turn the sound on'); }
    function applySound(c) {
      var on = sound && !window.__uljoSoundOff;
      if (c.video) c.video.muted = !on;
      if (c.player && c.player.mute) { if (on) { c.player.unMute(); c.player.setVolume(100); } else c.player.mute(); }
    }
    tap.addEventListener('click', function () { sound = !sound; paintSound(); applySound(chans[cur]); if (sound) quiet(hushMe); });
    function loadApi() {
      if (api) return api;
      api = new Promise(function (ok, no) {
        if (window.YT && window.YT.Player) { ok(); return; }
        var prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = function () { if (prev) prev(); ok(); };
        var sc = document.createElement('script');
        sc.src = 'https://www.youtube.com/iframe_api';
        sc.onerror = no;
        document.head.appendChild(sc);
        setTimeout(no, 8000);
      });
      return api;
    }
    function keepInside(c) {
      clearInterval(c.guard);
      c.guard = setInterval(function () {
        if (!c.player || !c.player.getCurrentTime) return;
        var t = c.player.getCurrentTime();
        if (t < c.A - 1.5 || t > c.B + .3) c.player.seekTo(c.A, true);          // round and round, in its own six minutes
      }, 400);
    }
    function plain(c) {                                    // no API: the embed alone, the same stretch, muted, looped
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + c.yt + '?start=' + c.A + '&end=' + c.B + '&autoplay=1&mute=1&rel=0&modestbranding=1&playsinline=1&controls=0&loop=1&playlist=' + c.yt;
      f.title = c.el.dataset.title || 'Video'; f.allow = 'autoplay; encrypted-media; picture-in-picture';
      c.el.appendChild(f); c.frame = f;
    }
    function play(c) {
      if (c.film) {
        if (!c.video) {
          var v = c.video = document.createElement('video');
          v.src = c.film; v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('muted', ''); v.preload = 'auto';
          c.el.appendChild(v);
        }
        applySound(c);
        var pr = c.video.play(); if (pr && pr.catch) pr.catch(function () {});
        return;
      }
      if (c.player && c.player.playVideo) { applySound(c); c.player.playVideo(); keepInside(c); return; }
      if (c.frame || c.loading) return;
      c.loading = true;
      var host = document.createElement('div');
      c.el.insertBefore(host, c.el.firstChild);
      loadApi().then(function () {
        c.player = new YT.Player(host, {
          host: 'https://www.youtube-nocookie.com',
          videoId: c.yt,
          playerVars: { start: c.A, end: c.B, autoplay: 1, mute: 1, rel: 0, modestbranding: 1, playsinline: 1, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, color: 'white' },
          events: {
            onReady: function (e) { applySound(c); if (chans[cur] !== c || !seen) { e.target.pauseVideo(); return; } e.target.playVideo(); keepInside(c); },
            onStateChange: function (e) {
              if (e.data === 0) { c.player.seekTo(c.A, true); c.player.playVideo(); }            // its end: again
              else if (e.data === 2 && chans[cur] === c && seen && !c.held) c.player.playVideo();   // (nothing pauses it but leaving)
            }
          }
        });
      }).catch(function () { host.remove(); plain(c); });
    }
    function pause(c) {
      clearInterval(c.guard);
      if (c.video) c.video.pause();
      if (c.player && c.player.pauseVideo) { c.held = true; c.player.pauseVideo(); setTimeout(function () { c.held = false; }, 300); }
      if (c.frame) { c.frame.remove(); c.frame = null; c.loading = false; }
    }
    function pauseOthers() { chans.forEach(function (c, i) { if (i !== cur) pause(c); }); }
    function pauseAll() { chans.forEach(pause); }
    function hushMe() { if (sound) { sound = false; paintSound(); applySound(chans[cur]); } }
    hush.push(hushMe);       // another sound on the page: this one goes quiet
    function show() {
      var c = chans[cur];
      chans.forEach(function (q, i) { q.el.hidden = i !== cur; });
      if (titleEl) titleEl.textContent = c.el.dataset.title || '';
      var hd = document.querySelector('.tvfly__h');      /* pass 89: the headline is the channel's own */
      if (hd && c.el.dataset.head && hd.textContent !== c.el.dataset.head) { hd.classList.remove('is-new'); void hd.offsetWidth; hd.textContent = c.el.dataset.head; hd.classList.add('is-new'); }
    }
    function zap(d) {
      if (n < 2) return;
      pauseAll();
      if (window.__uljoSfx) window.__uljoSfx('zap', { vol: .2, rate: .96 + Math.random() * .08 });      // pass 90: a slight crackle of static (a recording)
      cur = ((cur + d) % n + n) % n; show();
      box.classList.remove('is-zapping'); void box.offsetWidth; box.classList.add('is-zapping');
      clearTimeout(snowT); snowT = setTimeout(function () { box.classList.remove('is-zapping'); }, 400);
      if (osd) { osd.textContent = 'CH ' + (cur + 1); osd.classList.add('is-on'); clearTimeout(osdT); osdT = setTimeout(function () { osd.classList.remove('is-on'); }, 1900); }
      if (seen) play(chans[cur]);
    }
    [].forEach.call(document.querySelectorAll('[data-tv-next]'), function (b) { b.addEventListener('click', function () { zap(1); }); });
    [].forEach.call(document.querySelectorAll('[data-tv-prev]'), function (b) { b.addEventListener('click', function () { zap(-1); }); });
    var fig = box.closest('figure');
    if (fig) fig.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); zap(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); zap(-1); } });
    /* it plays while it is on screen, and rests when it is not */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        seen = es[0].isIntersecting;
        if (seen) play(chans[cur]); else pauseAll();
      }, { rootMargin: '120px' }).observe(fig || box);
    } else { seen = true; play(chans[cur]); }
    window.addEventListener('uljo-sound', function () { applySound(chans[cur]); });
    show(); paintSound();
    /* pass 84: YouTube's player script is fetched and run while the page is idle, not when the set scrolls into view */
    if (chans.some(function (c) { return c.yt; })) (window.requestIdleCallback || function (f) { return setTimeout(f, 1500); })(function () { loadApi().catch(function () {}); }, { timeout: 5000 });
    window.__tv = { zap: zap, chans: chans, get cur() { return cur; }, get sound() { return sound; } };      // for checking
  })();

  /* ---------- Desiderium ------------------------------------------- */
  (function single() {
    var root = document.querySelector('[data-single]');
    if (!root) return;
    var audio = root.querySelector('audio');
    var btn = root.querySelector('[data-single-toggle]');
    var seek = root.querySelector('[data-single-seek]');
    var now = root.querySelector('[data-single-now]');
    var total = root.querySelector('[data-single-total]');
    var dragging = false;

    function clock(s) {
      if (!isFinite(s) || s < 0) s = 0;
      var m = Math.floor(s / 60), r = Math.floor(s % 60);
      return m + ':' + (r < 10 ? '0' : '') + r;
    }
    function fill(el, f) { el.style.setProperty('--p', (clamp(f, 0, 1) * 100).toFixed(2) + '%'); }
    function paint() {
      var d = audio.duration || +seek.max || 0;
      if (!dragging) {
        seek.value = audio.currentTime;
        fill(seek, d ? audio.currentTime / d : 0);
      }
      now.textContent = clock(dragging ? +seek.value : audio.currentTime);
      seek.setAttribute('aria-valuetext', clock(audio.currentTime) + ' of ' + clock(d));
    }
    function meta() {
      if (!isFinite(audio.duration)) return;
      seek.max = audio.duration;
      total.textContent = clock(audio.duration);
      paint();
    }
    function state() {
      var on = !audio.paused;
      root.classList.toggle('is-playing', on);
      btn.setAttribute('aria-label', on ? 'Pause Desiderium' : 'Play Desiderium');
    }

    audio.addEventListener('loadedmetadata', meta);
    audio.addEventListener('durationchange', meta);
    audio.addEventListener('timeupdate', paint);
    audio.addEventListener('play', function () { quiet(pause); state(); });
    audio.addEventListener('pause', state);
    audio.addEventListener('ended', function () { audio.currentTime = 0; state(); paint(); });
    if (audio.readyState >= 1) meta();

    function pause() { audio.pause(); }
    hush.push(pause);
    btn.addEventListener('click', function () {
      if (audio.paused) audio.play().catch(function () {}); else audio.pause();
    });

    seek.addEventListener('input', function () {
      dragging = true;
      var d = audio.duration || +seek.max || 1;
      fill(seek, seek.value / d);
      now.textContent = clock(+seek.value);
    });
    seek.addEventListener('change', function () {
      audio.currentTime = +seek.value;
      dragging = false; paint();
    });

    /* the lock screen and the keyboard's media keys know the song */
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'Desiderium', artist: 'Jaime Olivares',
          artwork: [{ src: 'assets/img/about/desiderium-640.webp', sizes: '640x640', type: 'image/webp' }]
        });
      } catch (e) {}
    }
  })();
})();
