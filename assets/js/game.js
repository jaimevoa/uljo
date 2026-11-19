/* To ULJO — a small retro shooter.
   The world is 800 x 450 and scaled up in whole pixels. Sprites are
   Jaime's SVGs, rasterised once at their play size. Words are DOM.
   Flow: story → how to play → mission → 30 s of play → ULJO → home. */
(function () {
  'use strict';

  var W = 800, H = 450;
  var cv = document.getElementById('c'), ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  var frame = document.getElementById('frame');
  var ui = {
    story: document.getElementById('story'), go: document.getElementById('go'),
    clock: document.getElementById('clock'), hud: document.getElementById('hud'),
    kills: document.getElementById('kills'), evi: document.getElementById('evi'),
    lost: document.getElementById('lost'), fade: document.getElementById('fade')
  };

  /* ---------- sprites ---------- */
  function sprite(src, w, h) {
    var s = { w: w, h: h, ok: false, cv: document.createElement('canvas') };
    s.cv.width = w; s.cv.height = h;
    var im = new Image();
    im.onload = function () { s.cv.getContext('2d').drawImage(im, 0, 0, w, h); s.ok = true; };
    im.src = src;
    return s;
  }
  var SPR = {
    ship: sprite('assets/img/game/ship.svg', 168, 22),
    ghost: sprite('assets/img/game/ghost.svg', 64, 50),
    ghostMad: sprite('assets/img/game/ghost-attack.svg', 64, 50),
    rock: sprite('assets/img/game/asteroid.svg', 72, 72)
  };

  /* pixel planets, drawn once each on a 2 px grid */
  function planet(r, base, band, dark, light) {
    var c = document.createElement('canvas'); c.width = c.height = r * 2;
    var g = c.getContext('2d'); var seed = Math.random() * 100;
    for (var y = 0; y < r * 2; y += 2) for (var x = 0; x < r * 2; x += 2) {
      var dx = x - r + 1, dy = y - r + 1, d = Math.sqrt(dx * dx + dy * dy);
      if (d > r) continue;
      var col = base;
      var wave = Math.sin((y + Math.sin(x * .05 + seed) * 6) * .09 + seed);
      if (wave > .45) col = band;
      if (wave < -.7) col = light;
      if (dx > r * .35 - dy * .15) col = shade(col, .72);        /* the night side */
      if (d > r - 3) col = shade(col, .55);                       /* the rim */
      g.fillStyle = col; g.fillRect(x, y, 2, 2);
    }
    return c;
    function shade(hex, k) {
      var n = parseInt(hex.slice(1), 16), R = n >> 16, G = (n >> 8) & 255, B = n & 255;
      return 'rgb(' + (R * k | 0) + ',' + (G * k | 0) + ',' + (B * k | 0) + ')';
    }
  }
  var PLANETS = [
    planet(46, '#2aa39a', '#1f7f79', '#145', '#5fd1c5'),
    planet(30, '#b5622e', '#8e4a22', '#000', '#e0895a'),
    planet(60, '#5e4b9e', '#4a3a82', '#000', '#9a86d8'),
    planet(24, '#c94a6b', '#a13856', '#000', '#f08aa5'),
    planet(38, '#3f7fd6', '#2f62ad', '#000', '#8db8f2')
  ];
  var ULJO = planet(150, '#3fb35e', '#2f8f49', '#000', '#8fe39f');

  /* ---------- state ---------- */
  var S = {};
  var keys = {};
  var mode = 'story';            /* story | howto | mission | play | lost | arrive | leave */
  var last = 0, dt = 0, elapsed = 0;

  function reset() {
    S = {
      ship: { x: 150, y: H / 2, vx: 0, vy: 0, hearts: 3, blink: 0, cool: 0, bob: 0 },
      shots: [], reds: [], ghosts: [], rocks: [], bits: [],
      stars: [], worlds: [],
      t: 30, kills: 0, spawnG: 1.2, spawnR: 1.6, shake: 0
    };
    for (var i = 0; i < 150; i++) S.stars.push({
      x: Math.random() * W, y: Math.random() * H,
      z: [.25, .5, 1][i % 3], b: Math.random()
    });
    for (var j = 0; j < 3; j++) addWorld(Math.random() * W);
  }
  function addWorld(x) {
    var img = PLANETS[Math.random() * PLANETS.length | 0];
    var y = Math.random() * (H - img.height);
    /* keep a clear gap from the others, so they never pile up */
    var clear = S.worlds.every(function (w) { return Math.abs(w.x - x) > 260 || Math.abs(w.y - y) > 200; });
    if (!clear) return;
    S.worlds.push({ img: img, x: x, y: y, z: .12 + Math.random() * .18 });
  }

  /* ---------- sound: soft, retro, only after a key ---------- */
  var actx = null;
  function wake() { if (actx) return; try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  function tone(f0, f1, dur, gain, type) {
    if (!actx) return;
    var t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + .008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + .02);
  }
  function noise(dur, gain, hz) {
    if (!actx) return;
    var n = actx.sampleRate * dur | 0, b = actx.createBuffer(1, n, actx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    var s = actx.createBufferSource(); s.buffer = b;
    var f = actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = hz; f.Q.value = .8;
    var g = actx.createGain(); var t = actx.currentTime;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(actx.destination); s.start(t); s.stop(t + dur);
  }
  var snd = {
    pew: function () { tone(920, 380, .09, .035); },
    pop: function () { noise(.18, .08, 900); tone(300, 90, .18, .04, 'triangle'); },
    hit: function () { noise(.25, .12, 300); tone(160, 60, .3, .06, 'sawtooth'); },
    tick: function () { noise(.02, .015, 3200); },
    step: function () { tone(660, 880, .07, .03, 'triangle'); },
    arrive: function () { [523, 659, 784, 1047].forEach(function (f, i) { setTimeout(function () { tone(f, f, .18, .05, 'triangle'); }, i * 120); }); }
  };

  /* ---------- typing into the DOM ---------- */
  var typing = null;
  function typeInto(el, html, done, speed) {
    /* html may hold <p>, <b>, <br>: we type the text nodes and keep the tags */
    if (typing) { clearTimeout(typing); typing = null; }
    el.innerHTML = html; el.hidden = false;
    var nodes = [];
    (function walk(n) { for (var i = 0; i < n.childNodes.length; i++) { var c = n.childNodes[i]; if (c.nodeType === 3) nodes.push({ n: c, s: c.nodeValue }); else walk(c); } })(el);
    nodes.forEach(function (o) { o.n.nodeValue = ''; });
    var caret = document.createElement('i'); caret.className = 'caret';
    var ni = 0, ci = 0;
    (function step() {
      if (ni >= nodes.length) { caret.remove(); typing = null; if (done) done(); return; }
      var o = nodes[ni]; ci++;
      o.n.nodeValue = o.s.slice(0, ci);
      if (caret.parentNode !== o.n.parentNode) { caret.remove(); o.n.parentNode.appendChild(caret); }
      var ch = o.s.charAt(ci - 1);
      if (ch.trim()) snd.tick();
      if (ci >= o.s.length) { ni++; ci = 0; }
      typing = setTimeout(step, /[.:!]/.test(ch) ? 220 : (ch === ',' ? 120 : (speed || 24) + Math.random() * 18));
    })();
    return function skip() { if (!typing) return; clearTimeout(typing); typing = null; nodes.forEach(function (o) { o.n.nodeValue = o.s; }); caret.remove(); if (done) done(); };
  }

  /* ---------- the screens before play ---------- */
  var skip = null, ready = false;
  var STORY = '<p>It’s the year 2060. Earth has developed a medicine that lets humans live forever. With the newest Personal Spaceships, people are free to travel wherever they please. Jaime and Evi decided to take an uncharted route to ULJO, a distant planet few have ever visited. Rumor has it that the people there spend all of eternity doing just one thing:</p><p class="fire">sit around the Fire.</p>';
  var HOWTO = '<h2>How to play</h2><div class="keys"><p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move up, left, down and right.</p><p><kbd>space</kbd> shoot a blue laser.</p><p>Dodge the asteroids. You have three hearts: a red laser or a rock takes one.</p></div>';
  var MISSION = '<h2>Mission</h2><p>Eliminate all the Space-Ghosts in your way to reach ULJO!</p>';

  function screen(html, next) {
    ready = false; ui.go.hidden = true;
    skip = typeInto(ui.story, html, function () { ready = true; ui.go.hidden = false; skip = null; }, 22);
    S.next = next;
  }
  function advance() {
    if (skip) { skip(); return; }              /* a press mid-typing shows it all */
    if (!ready) return;
    snd.step();
    if (mode === 'story') { mode = 'howto'; screen(HOWTO); }
    else if (mode === 'howto') { mode = 'mission'; screen(MISSION); ui.go.textContent = 'Press space to launch'; }
    else if (mode === 'mission') { startPlay(); }
  }
  function startPlay() {
    ui.story.hidden = true; ui.go.hidden = true;
    ui.clock.hidden = false; ui.hud.hidden = false;
    mode = 'play';
  }

  /* ---------- play ---------- */
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function spawnGhost() {
    S.ghosts.push({ x: W + 40, y: rnd(40, H - 40), vx: -rnd(80, 130), t: rnd(0, 6), aim: rnd(1.2, 2.6), mad: 0, hp: 1, r: 22 });
  }
  function spawnRock() {
    var s = rnd(34, 70);
    S.rocks.push({ x: W + s, y: rnd(30, H - 30), vx: -rnd(110, 190), vy: rnd(-18, 18), s: s, a: rnd(0, 6.28), va: rnd(-1.2, 1.2) });
  }
  function burst(x, y, cols, n) {
    for (var i = 0; i < n; i++) S.bits.push({ x: x, y: y, vx: rnd(-90, 90), vy: rnd(-90, 90), t: rnd(.25, .6), c: cols[i % cols.length] });
  }
  function hurt() {
    var p = S.ship; if (p.blink > 0) return;
    p.hearts--; p.blink = 1.8; S.shake = .25; snd.hit();
    burst(p.x, p.y, ['#ff4b5c', '#ffd1d1', '#4A9BD3'], 14);
    if (p.hearts <= 0) { mode = 'lost'; ui.lost.hidden = false; ui.clock.hidden = true; }
  }

  function update() {
    var p = S.ship;
    /* the sky always drifts */
    S.stars.forEach(function (s) { s.x -= (20 + 60 * s.z) * dt; if (s.x < 0) { s.x += W; s.y = Math.random() * H; } });
    S.worlds.forEach(function (w) { w.x -= 60 * w.z * dt; });
    S.worlds = S.worlds.filter(function (w) { return w.x + w.img.width > 0; });
    if (S.worlds.length < 3 && Math.random() < .01) addWorld(W + 60);
    p.bob += dt;

    if (mode === 'play') {
      S.t -= dt;
      if (S.t <= 0) { S.t = 0; mode = 'arrive'; S.uljoX = W + 160; S.evi = 0; ui.clock.hidden = true; ui.hud.hidden = true; snd.arrive(); }
      ui.clock.textContent = Math.ceil(S.t);

      /* the ship */
      var sp = 240;
      p.vx = ((keys.d || keys.ArrowRight) ? sp : 0) - ((keys.a || keys.ArrowLeft) ? sp : 0);
      p.vy = ((keys.s || keys.ArrowDown) ? sp : 0) - ((keys.w || keys.ArrowUp) ? sp : 0);
      p.x = Math.max(90, Math.min(W - 120, p.x + p.vx * dt));
      p.y = Math.max(18, Math.min(H - 18, p.y + p.vy * dt));
      p.cool -= dt;
      if (keys[' '] && p.cool <= 0) { p.cool = .17; S.shots.push({ x: p.x + 84, y: p.y - 1 }); snd.pew(); }
      if (p.blink > 0) p.blink -= dt;

      /* things arriving from the right */
      S.spawnG -= dt; if (S.spawnG <= 0) { spawnGhost(); S.spawnG = rnd(.8, 1.4); }
      S.spawnR -= dt; if (S.spawnR <= 0) { spawnRock(); S.spawnR = rnd(1.1, 1.9); }
    }
    if (S.shake > 0) S.shake -= dt;

    /* shots */
    S.shots.forEach(function (b) { b.x += 560 * dt; });
    S.shots = S.shots.filter(function (b) { return b.x < W + 20; });
    S.reds.forEach(function (b) { b.x -= 330 * dt; });
    S.reds = S.reds.filter(function (b) { return b.x > -20; });

    /* ghosts drift, bob, and now and then fire */
    S.ghosts.forEach(function (g) {
      g.t += dt; g.x += g.vx * dt; g.y += Math.sin(g.t * 2.2) * 22 * dt;
      if (g.mad > 0) g.mad -= dt;
      if (mode === 'play') {
        g.aim -= dt;
        if (g.aim <= 0 && g.x > p.x + 60 && g.x < W - 10) {
          g.aim = rnd(1.6, 3.2); g.mad = .45;
          S.reds.push({ x: g.x - 30, y: g.y + 4 });
        }
      }
    });
    S.ghosts = S.ghosts.filter(function (g) { return g.x > -80 && g.hp > 0; });
    S.rocks.forEach(function (r) { r.x += r.vx * dt; r.y += r.vy * dt; r.a += r.va * dt; });
    S.rocks = S.rocks.filter(function (r) { return r.x > -100; });
    S.bits.forEach(function (b) { b.x += b.vx * dt; b.y += b.vy * dt; b.t -= dt; });
    S.bits = S.bits.filter(function (b) { return b.t > 0; });

    /* hits */
    S.shots.forEach(function (b) {
      S.ghosts.forEach(function (g) {
        if (g.hp > 0 && Math.abs(b.x - g.x) < g.r + 6 && Math.abs(b.y - g.y) < g.r) {
          g.hp = 0; b.x = W + 99; S.kills++; ui.kills.textContent = S.kills; snd.pop();
          burst(g.x, g.y, ['#c8cfe0', '#a1262f', '#e8a58a'], 16);
        }
      });
      S.rocks.forEach(function (r) { if (Math.hypot(b.x - r.x, b.y - r.y) < r.s * .45) b.x = W + 99; });
    });
    if (mode === 'play') {
      S.reds.forEach(function (b) { if (Math.abs(b.x - p.x) < 70 && Math.abs(b.y - p.y) < 9) { b.x = -99; hurt(); } });
      S.rocks.forEach(function (r) { if (Math.abs(r.x - p.x) < 70 + r.s * .4 && Math.abs(r.y - p.y) < 8 + r.s * .38) hurt(); });
      S.ghosts.forEach(function (g) { if (Math.abs(g.x - p.x) < 70 + g.r && Math.abs(g.y - p.y) < 9 + g.r * .8) hurt(); });
    }

    /* the arrival: ULJO comes in, the ship settles before it, Evi speaks */
    if (mode === 'arrive') {
      var stopX = W - 150;
      S.uljoX = Math.max(stopX, S.uljoX - 70 * dt);
      var tx = stopX - 150 - 120, ty = H / 2;
      p.x += (tx - p.x) * Math.min(1, dt * 1.4); p.y += (ty - p.y) * Math.min(1, dt * 1.4);
      if (p.blink > 0) p.blink -= dt;
      if (S.uljoX <= stopX + .5 && Math.abs(p.x - tx) < 2 && !S.evi) {
        S.evi = 1;
        typeInto(ui.evi, 'Yay! We’ve arrived to ULJO!', function () {
          setTimeout(function () { mode = 'leave'; ui.fade.classList.add('on'); setTimeout(function () { location.href = 'index.html'; }, 1300); }, 2400);
        }, 40);
      }
    }
  }

  /* ---------- drawing ---------- */
  function heart(x, y, on) {
    ctx.fillStyle = on ? '#ff4b5c' : '#2a2f45';
    [[1, 0, 2, 1], [4, 0, 2, 1], [0, 1, 7, 2], [1, 3, 5, 1], [2, 4, 3, 1], [3, 5, 1, 1]].forEach(function (r) { ctx.fillRect(x + r[0] * 2, y + r[1] * 2, r[2] * 2, r[3] * 2); });
  }
  function firefly(x, y, t) {
    var g = ctx.createRadialGradient(x, y, 1, x, y, 14);
    g.addColorStop(0, 'rgba(120,200,255,.55)'); g.addColorStop(1, 'rgba(120,200,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 14, y - 14, 28, 28);
    ctx.fillStyle = '#bfe8ff'; ctx.fillRect(x - 2, y - 2, 4, 4);
    ctx.fillStyle = '#4A9BD3'; ctx.fillRect(x - 3, y - 1, 1, 2); ctx.fillRect(x + 2, y - 1, 1, 2);
    var w = Math.sin(t * 22) > 0 ? 2 : 0;
    ctx.fillStyle = 'rgba(200,235,255,.8)'; ctx.fillRect(x - 6, y - 4 - w, 4, 2); ctx.fillRect(x + 2, y - 4 - w, 4, 2);
  }

  function draw() {
    ctx.save();
    if (S.shake > 0) ctx.translate(rnd(-3, 3), rnd(-3, 3));
    ctx.fillStyle = '#050817'; ctx.fillRect(-4, -4, W + 8, H + 8);

    /* worlds far back, then the stars */
    S.worlds.forEach(function (w) { ctx.globalAlpha = .55 + w.z; ctx.drawImage(w.img, w.x | 0, w.y | 0); });
    ctx.globalAlpha = 1;
    S.stars.forEach(function (s) {
      var a = .35 + .65 * (0.5 + 0.5 * Math.sin(elapsed * 2 + s.b * 9));
      ctx.fillStyle = s.z > .6 ? 'rgba(255,255,255,' + a + ')' : (s.z > .3 ? 'rgba(160,200,255,' + a * .8 + ')' : 'rgba(110,140,220,' + a * .6 + ')');
      var sz = s.z > .6 ? 2 : 1; ctx.fillRect(s.x | 0, s.y | 0, sz, sz);
    });

    /* ULJO */
    if (mode === 'arrive' || mode === 'leave') {
      ctx.drawImage(ULJO, (S.uljoX - 150) | 0, (H / 2 - 150) | 0);
    }

    /* bits */
    S.bits.forEach(function (b) { ctx.fillStyle = b.c; ctx.fillRect(b.x | 0, b.y | 0, 3, 3); });

    /* rocks */
    S.rocks.forEach(function (r) {
      if (!SPR.rock.ok) return;
      ctx.save(); ctx.translate(r.x | 0, r.y | 0); ctx.rotate(Math.round(r.a / (Math.PI / 8)) * (Math.PI / 8));
      ctx.drawImage(SPR.rock.cv, -r.s / 2, -r.s / 2, r.s, r.s); ctx.restore();
    });

    /* ghosts */
    S.ghosts.forEach(function (g) {
      var s = g.mad > 0 ? SPR.ghostMad : SPR.ghost; if (!s.ok) return;
      ctx.drawImage(s.cv, (g.x - 32) | 0, (g.y - 25) | 0);
    });

    /* lasers */
    S.reds.forEach(function (b) { ctx.fillStyle = '#ff4b5c'; ctx.fillRect(b.x | 0, b.y | 0, 14, 2); ctx.fillStyle = 'rgba(255,75,92,.35)'; ctx.fillRect((b.x - 2) | 0, (b.y - 1) | 0, 18, 4); });
    S.shots.forEach(function (b) { ctx.fillStyle = '#7fd6ff'; ctx.fillRect(b.x | 0, b.y | 0, 14, 2); ctx.fillStyle = 'rgba(127,214,255,.35)'; ctx.fillRect((b.x - 2) | 0, (b.y - 1) | 0, 18, 4); });

    /* the ship — it blinks while it's hurt */
    var p = S.ship;
    var show = p.blink <= 0 || Math.floor(p.blink * 12) % 2 === 0;
    if (show && SPR.ship.ok && mode !== 'lost') {
      var by = mode === 'play' ? 0 : Math.sin(p.bob * 1.6) * 3;
      ctx.drawImage(SPR.ship.cv, (p.x - 84) | 0, (p.y - 11 + by) | 0);
      /* the engines' glow */
      var fl = 3 + Math.round(Math.random() * 3);
      ctx.fillStyle = '#ffb27a'; ctx.fillRect((p.x - 84 - fl) | 0, (p.y - 8 + by) | 0, fl, 2); ctx.fillRect((p.x - 84 - fl) | 0, (p.y + 6 + by) | 0, fl, 2);
    }
    if (mode === 'arrive' || mode === 'leave') {
      var ex = p.x + 10 + Math.sin(elapsed * 3) * 4, ey = p.y - 34 + Math.sin(elapsed * 5) * 3;
      firefly(ex, ey, elapsed);
      ui.evi.style.left = (ex / W * 100) + '%'; ui.evi.style.top = ((ey - 16) / H * 100) + '%';
    }

    /* hearts, top left */
    if (mode === 'play' || mode === 'lost') for (var i = 0; i < 3; i++) heart(30 + i * 20, 24, i < p.hearts);
    ctx.restore();
  }

  /* ---------- loop ---------- */
  function loop(now) {
    dt = Math.min(.05, (now - last) / 1000 || 0); last = now; elapsed += dt;
    update(); draw();
    requestAnimationFrame(loop);
  }

  /* ---------- input ---------- */
  window.addEventListener('keydown', function (e) {
    if (e.repeat) { if (e.key === ' ') e.preventDefault(); return; }
    wake();
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    keys[k] = true;
    if (e.key === ' ') {
      e.preventDefault();
      if (mode === 'story' || mode === 'howto' || mode === 'mission') advance();
      else if (mode === 'lost') { ui.lost.hidden = true; reset(); mode = 'play'; ui.clock.hidden = false; }
    }
  });
  window.addEventListener('keyup', function (e) { var k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys[k] = false; });
  frame.addEventListener('pointerdown', function () { wake(); if (mode === 'story' || mode === 'howto' || mode === 'mission') advance(); });
  window.addEventListener('blur', function () { keys = {}; });

  /* ---------- go ---------- */
  reset();
  screen(STORY);
  requestAnimationFrame(function (t) { last = t; loop(t); });
  window.__uljo = { get S() { return S; }, get mode() { return mode; }, set mode(m) { mode = m; }, advance: advance, startPlay: startPlay };
})();
