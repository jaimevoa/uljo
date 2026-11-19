/* ============================================================
   ULJO — the missions (pass 77)
   Three things to do on the planet, each one a project of Jaime's, each done with the REAL prototype in hand:

     1 · Track On   — under the hatch (a press opens it, he walks down its steps), the Underground Studio: a room
                      made in Meshy. He takes out his phone, sets it on the keyboard, and the visitor records four
                      chords with the real app — it hears them through a microphone of its own and writes the
                      chords out — then lays a second layer over the first and sends the idea to a friend.
                      Afterwards the studio is a place to walk in: the keys still play, the records can be looked
                      through, the stairs lead back up.
     2 · Recyco     — a battery on some of the floating stones, the last one on the highest. Up there he takes out
                      his phone — he is SEEN doing it: he stands on the left of the picture, the batteries in his
                      left hand, the phone in his right, and the app stands on the right of the screen — and goes
                      through the real app: +, From home, a photograph of the batteries (taken by his phone's own
                      eye), Continue, Publish, Claim. Only then do the gems come.
     3 · Manic GT   — a small station on the big lawn past the lake, the orange car in it. In the car: its
                      cockpit, and in the cockpit its real centre screen. The visitor picks a place and presses
                      Start; a tunnel of years takes the car to a parallel Montréal, around 1971; it drives there quickly
                      and ManiScan finds a legal place to park. He gets out — and the telephone rings.
                      From then on the car is his: it drives on the planet, and with Space held it flies.

   After each one Evi says what it was good for. world.js makes this once (makeQuests) and calls into it from
   its frame; everything it needs from the world comes in W. Progress is kept for the visit (sessionStorage).
   ============================================================ */
import { carPaint } from './car-paint.js?v=5';

export function makeQuests(W) {
  const { THREE, scene, V, R, UP, at, land, glow, sst, clamp, mix, player, me, bones, inside, FIELD, TOWER, gems, station } = W;
  const $ = (q, r = document) => r.querySelector(q);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };
  const url = (p) => new URL(p, import.meta.url).href;
  const hero = W.hero, v1 = V(0, 0, 0), v2 = V(0, 0, 0), v3 = V(0, 0, 0), v4 = V(0, 0, 0), eye = new THREE.PerspectiveCamera();
  const mA = new THREE.Matrix4(), qA = new THREE.Quaternion(), qB = new THREE.Quaternion(), q1 = new THREE.Quaternion(), prevN = V(0, 1, 0);
  const M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .85 }, o));
  /* pass 77: a click inside one of the apps gives that app's page the keyboard — and the game then heard nothing (the chord
     keys, Space for the photograph, E, Escape). Its keys are handed on to the game, except while something is being typed. */
  const typing = (t) => !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  function passKeys(frame, only) {
    try {
      const w = frame.contentWindow;
      ['keydown', 'keyup'].forEach((type) => w.addEventListener(type, (e) => {
        if (typing(e.target) || (only && !only.includes(e.code))) return;
        window.dispatchEvent(new KeyboardEvent(type, { code: e.code, key: e.key, repeat: e.repeat, bubbles: true }));
        if (e.code === 'Space') e.preventDefault();
      }));
    } catch (er) {}
  }

  /* ---------- which are done, which is next ---------- */
  const ORDER = ['trackon', 'recyco', 'manic'];
  const LABEL = { trackon: 'Record a song idea in the studio', recyco: 'Recycle the batteries', manic: 'Find a parking spot with the Manic GT' };
  /* pass 90: no missions any more. Everything is as it is once they are done: the gems are out, the studio is a room to
     walk in, the Manic GT is his to drive (and to fly); nothing is asked, no lantern path, no briefing */
  const done = new Set(ORDER);
  const keep = () => { try { sessionStorage.setItem('uljo-quests', JSON.stringify([...done])); } catch (e) {} };
  const current = () => ORDER.find((q) => !done.has(q)) || null;
  const card = $('[data-world-card]');
  const BAT = { list: [], got: 0, pile: null };
  function hud() {
    if (!card) return;
    card.querySelectorAll('[data-quest]').forEach((e) => {
      const q = e.dataset.quest; e.classList.toggle('is-done', done.has(q)); e.classList.toggle('is-now', q === current());
      let t = LABEL[q]; if (q === 'recyco' && !done.has(q) && BAT.got > 0) t += ' · ' + BAT.got + '/' + BAT.list.length;
      if (e.textContent !== t) e.textContent = t;
    });
    card.classList.toggle('is-clear', !current());
    const b = card.querySelector('b'); if (b) b.textContent = current() ? 'Missions:' : 'All missions done!';
  }
  /* what Evi says: why it has to be done, a nudge if it waits, and — every time — what it was good for */
  const BRIEF = {
    trackon: 'First mission! A melody just came to Jaime, and it’s already slipping away. Open the hatch by the camp: his Underground Studio is down there.',
    recyco: 'Next mission! Someone left old batteries on the floating stones. On ULJO nothing goes to waste. Follow the lantern path, and climb!',
    manic: 'Last mission! Follow the lantern path past the lake: on the big lawn there is a little station, and an orange car in it. That’s a Manic GT, built in Québec in 1969. Jaime designed its screen. Hop in!'
  };
  const HINT = {
    trackon: () => 'The hatch by the camp leads down to the Underground Studio. Jaime’s melody won’t wait!',
    recyco: () => BAT.got < BAT.list.length ? 'The batteries are on the floating stones, at the end of the lantern path. ' + (BAT.got ? BAT.got + ' of ' + BAT.list.length + ' so far!' : 'The last one is on the highest stone.') : 'You have every battery! Stand on the highest stone and take out your phone.',
    manic: () => 'The Manic GT is waiting in its little station, on the big lawn past the lake. Follow the lanterns!'
  };
  const AFTER = {
    trackon: 'That melody would have been gone by morning. Now it’s saved, with its chords and its layers, and a friend already has it. That’s why Jaime made Track On.',
    recyco: 'Those batteries will never leak into the ground: their metals go back into new things, and the points pay for groceries. That’s Recyco! Now grab the gems on your way down.',
    manic: 'No circling the block, no ticket: the car read the parking signs for you. That’s the screen Jaime designed for the Manic GT. And the car is yours now: hop back in, drive it around, and hold Space to fly!'
  };
  let calling = false, busy = false, hideMe = false, briefT = 0, briefLater = false, shotReq = false, pollAt = 0, loadAt = 0;
  function brief() {
    const q = current();
    if (q) W.say(BRIEF[q], false);
    else if (!calling) finale();
  }
  function complete(q) {
    if (done.has(q)) return;
    done.add(q); keep(); hud(); W.gemChime(true);
    clearTimeout(briefT);
    briefT = setTimeout(() => {
      if (W.mode !== 'walk') return;
      W.say(AFTER[q], false, () => { briefT = setTimeout(() => { if (W.mode !== 'walk' || busy) return; if (ST.on) { briefLater = true; W.say('The studio is yours now: walk around, play the keys, look through the records. The stairs lead back outside.', false); } else brief(); }, 4600); });
    }, 900);
  }
  function finale() {}                                     // pass 96: the call no longer comes from here (with every mission counted as done, it rang at once): world.js rings the phone half a minute into the walk
  /* the gems: none until the recycling is done — then all of them, from the top stone down and along the path home */
  let revealed = false;
  function reveal(now) {
    if (revealed) return; revealed = true;
    const tower = gems.filter((g) => g.kind === 'tower'), trail = gems.filter((g) => g.kind === 'trail'), n = TOWER.plats.length - 1;
    let k = 0; [...tower.slice(0, n).reverse(), ...tower.slice(n), ...trail.slice().reverse()].forEach((g) => { if (!g.shown) g.showAt = W.time + (now ? .05 : .5 + (k++) * .09); });
  }

  /* ============================================================
     2 · RECYCO — batteries on the stones, the last one on the highest; up there, the real app in his hand.
     (Pass 77: batteries only, no bulb. And he is seen doing it: he stands on the left of the picture, the
     batteries in his left hand, his phone in his right; the app itself stands on the right of the screen.)
     ============================================================ */
  const BULB = { done: done.has('recyco'), on: false, t: 0, phase: '', k: 0, step: -1, cam: null, score0: null, burst: null, bt: 0, loaded: false, shoot: 0, phone: new THREE.Group(), rt: null, buf: null, img: null, lut: null, eye: new THREE.PerspectiveCamera(46, 1, .03, 400), tick: 0, fresh: false };
  const BULB_P = { quest: 'recyco', id: 'bulb', name: 'Your batteries', verb: 'Use Recyco', key: 'E' };
  /* a battery: a fat little cell, green-banded, gold at both ends */
  function battery(scale) {
    const g = new THREE.Group(), body = M(0x23262d, { roughness: .4, metalness: .3 }), band = M(0x3fae5a, { roughness: .45, emissive: 0x0f3a1a }), gold = M(0xd9b45a, { roughness: .42, metalness: .9, envMapIntensity: scale < 1 ? .35 : 1 });      // (in his hand, close to the eye, their caps would glare)
    const add = (geo, mat, y) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; m.castShadow = true; g.add(m); };
    add(new THREE.CylinderGeometry(.07, .07, .2, 20), body, 0); add(new THREE.CylinderGeometry(.0715, .0715, .075, 20), band, .035);
    add(new THREE.CylinderGeometry(.068, .068, .02, 20), gold, .11); add(new THREE.CylinderGeometry(.068, .068, .02, 20), gold, -.11); add(new THREE.CylinderGeometry(.024, .024, .03, 12), gold, .135);
    g.scale.setScalar(scale); return g;
  }
  {
    const N = TOWER.plats.length - 1, spots = [];            // one stone in three has one; the last waits on the highest
    for (let i = 2; i < N; i += 3) spots.push(i);
    spots.push(N);
    spots.forEach((i) => {
      const pl = TOWER.plats[i], g = new THREE.Group(), cell = battery(1.7), gl = glow(new THREE.Color(.45, 1., .5).multiplyScalar(.8), 1.1, 2.6);
      const side = FIELD.dirAt(i * .9 + 1.2, 3).sub(FIELD.c);       // a little off the middle of its stone
      side.addScaledVector(pl.dir, -side.dot(pl.dir)).normalize();
      const dir = pl.dir.clone().addScaledVector(side, .3 / pl.r).normalize();
      g.position.copy(dir).multiplyScalar(pl.r + .5); g.quaternion.setFromUnitVectors(UP, dir); cell.rotation.z = .5; g.add(cell); g.add(gl); scene.add(g);
      BAT.list.push({ g, cell, gl, dir, r: pl.r, i, got: BULB.done ? 1 : 0, t: i });
      if (BULB.done) g.visible = false;
    });
    if (BULB.done) BAT.got = BAT.list.length;
    /* the ones he has gathered: a handful, in his left hand when the phone comes out */
    BAT.pile = new THREE.Group(); BAT.pile.visible = false; scene.add(BAT.pile);
    BAT.list.forEach((b, k) => { const c = battery(.58), a = k * 1.5708; c.position.set(k ? Math.cos(a) * .05 : 0, .07, k ? Math.sin(a) * .05 : 0); c.rotation.set(k ? .18 * Math.sin(a) : 0, 0, k ? -.18 * Math.cos(a) : 0); BAT.pile.add(c); });
    /* his phone, as it is seen from outside: a dark slab, Recyco's green on its glass */
    const sc = document.createElement('canvas'); sc.width = 96; sc.height = 200; const x = sc.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 200);
    gr.addColorStop(0, '#1d3a2a'); gr.addColorStop(1, '#0c1a13'); x.fillStyle = gr; x.fillRect(0, 0, 96, 200);
    x.fillStyle = 'rgba(163,209,138,.4)'; x.fillRect(14, 30, 68, 46); x.fillRect(14, 86, 68, 30); x.fillStyle = '#a3d18a'; x.beginPath(); x.arc(48, 156, 15, 0, 7); x.fill();
    const tx = new THREE.CanvasTexture(sc); tx.colorSpace = THREE.SRGBColorSpace;
    BULB.phone.add(new THREE.Mesh(new THREE.BoxGeometry(.082, .168, .012), M(0x0c0c10, { roughness: .35, metalness: .5 })));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(.072, .156), new THREE.MeshBasicMaterial({ map: tx, toneMapped: false })); face.position.z = .0065; BULB.phone.add(face);
    BULB.phone.visible = false; scene.add(BULB.phone);
  }
  /* the app itself, on the right of the screen: what his phone shows — and, when a photograph is asked for, what its camera sees */
  const recUI = el('div', 'rp', `
    <div class="rp__hold">
      <div class="rp__phone"><div class="rp__glass">
        <iframe title="Recyco, the app" width="440" height="956"></iframe>
        <div class="rp__cam" hidden>
          <canvas class="rp__live" width="384" height="384"></canvas>
          <div class="rp__view"><i></i><i></i><i></i><i></i><span class="rp__hint"></span></div>
          <div class="rp__shot"><button type="button" class="rp__btn" aria-label="Take the photo"></button><kbd>Space</kbd></div>
        </div>
      </div></div>
    </div>
    <div class="rp__flash" aria-hidden="true"></div>`);
  recUI.hidden = true; hero.appendChild(recUI);
  const recFrame = $('iframe', recUI), recCamEl = $('.rp__cam', recUI), recHint = $('.rp__hint', recUI), recLive = $('.rp__live', recUI);
  const recFit = () => { const side = window.innerHeight < 520 && window.innerWidth > window.innerHeight, k = Math.min(1, (window.innerHeight - (side ? 16 : 110)) / 990, (window.innerWidth * .9) / 470); recUI.style.setProperty('--k', k.toFixed(4)); };      // (a phone held sideways: all the height is the app's)
  const rw = () => { try { const w = recFrame.contentWindow; return w && w.document && w.document.getElementById('fab') ? w : null; } catch (e) { return null; } };
  const snap = (a) => {                                    // a shutter: a click of noise and a small high note
    return;                                                // pass 81: no sound effects made in code
    if (!a || a.state !== 'running') return;
    const t = a.currentTime, n = Math.floor(a.sampleRate * .05), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const s = a.createBufferSource(), g = a.createGain(); s.buffer = b; g.gain.value = .12; s.connect(g); g.connect(a.destination); s.start(t);
    const o = a.createOscillator(), g2 = a.createGain(); o.frequency.value = 1760; g2.gain.setValueAtTime(.03, t + .03); g2.gain.exponentialRampToValueAtTime(.0005, t + .2); o.connect(g2); g2.connect(a.destination); o.start(t + .03); o.stop(t + .22);
  };
  recFrame.addEventListener('load', () => {
    if (!recFrame.getAttribute('src')) return;
    try {
      const w = recFrame.contentWindow, d = w.document;
      passKeys(recFrame);
      if (W.MUTE) w.eval('soundOn=false');
      const hook = () => { let pk = null; try { pk = w.eval('pick'); } catch (e) {} recCam(pk ? { mode: pk.mode, k: pk.k } : { mode: 'form', k: 'bat' }); };
      d.getElementById('in-cam').click = hook; d.getElementById('in-gal').click = hook;      // "Take a photo" is his phone's own camera, not a file from the visitor's computer
      setTimeout(() => { try { if (w.eval('cur') === 's-welcome') w.eval("goTo('s-home')"); } catch (e) {} BULB.loaded = true; }, 700);
    } catch (e) { BULB.loaded = true; }
  });
  const REC_LINES = [
    'This is Recyco, Jaime’s app for everything that must never go in the bin. Tap the + button.',
    'Two ways to give: drop it at a grocery store, or From home, where Recyco comes to pick it up. Tap From home.',
    'That one needs a real store nearby! Go back, and tap From home.',
    'Now show what you have. Tap Batteries, then Take a photo.',
    'It’s in! Tap Continue.',
    'Recyco is checking the photo…',
    'Approved! Tap Publish, and a pickup is booked.',
    'Here come the points! Tap Claim my points.'
  ];
  function recStart() {
    if (BULB.on || BULB.done) return;
    if (BAT.got < BAT.list.length) { const n = BAT.list.length - BAT.got; W.say('Not yet! ' + (n === 1 ? 'One battery is' : n + ' batteries are') + ' still down there on the stones.', false); return; }
    BULB.on = true; BULB.t = 0; BULB.phase = 'out'; BULB.step = -1; BULB.score0 = null; BULB.loaded = false; BULB.shoot = 0; BULB.fresh = false; busy = true; W.stopTravel();
    BAT.pile.visible = true; BULB.phone.visible = true;
    recUI.hidden = false; recUI.classList.remove('is-cam', 'is-gone', 'is-shot'); recCamEl.hidden = true; recFit();
    requestAnimationFrame(() => recUI.classList.add('is-on'));
    recFrame.src = url('../proto/recyco.html');
    W.say('Jaime takes out his phone, the batteries in his other hand…', true);
  }
  function recPoll() {
    const w = rw(); if (!w || !BULB.loaded) return;
    let cur = '', n = 0, score = 0;
    try { cur = w.eval('cur'); n = w.eval('Object.values(photos.form).filter(Boolean).length'); score = w.eval('score'); } catch (e) { return; }
    if (BULB.score0 == null) BULB.score0 = score;
    if (cur === 's-home' && score > BULB.score0) { recDone(); return; }
    const s = cur === 's-home' || cur === 's-welcome' ? 0 : cur === 's-opts' ? 1 : cur === 's-scan' || cur === 's-dropoff-photos' || cur === 's-deposer' ? 2 : cur === 's-form' ? (n === 0 ? 3 : 4) : cur === 's-pending' ? 5 : cur === 's-approved' ? 6 : cur === 's-reclamer' ? 7 : BULB.step;
    if (s !== BULB.step) { BULB.step = s; W.say(REC_LINES[s], true); }
  }
  function recCam(pk) {                                    // the app asked for a photograph: his phone goes up over the batteries, and its screen shows what its camera sees
    if (!BULB.on || BULB.phase === 'bye') return;
    BULB.phase = 'cam'; BULB.t = 0; BULB.cam = pk; BULB.fresh = false;
    recHint.textContent = 'The batteries';
    recCamEl.hidden = false; recUI.classList.add('is-cam');
    W.say('He holds his phone over the batteries. Press Space, or the white button.', true);
  }
  function recShoot() { if (BULB.phase === 'cam' && BULB.t > .9) shotReq = true; }
  function recLiveDraw() {                                 // his phone's own eye: the batteries in his other hand, as its camera sees them
    const N = 384, r = W.renderer;
    if (!BULB.rt) { BULB.rt = new THREE.WebGLRenderTarget(N, N); BULB.buf = new Uint8Array(N * N * 4); BULB.img = new ImageData(N, N); BULB.lut = new Uint8ClampedArray(256); for (let i = 0; i < 256; i++) BULB.lut[i] = 255 * Math.pow(Math.min(1, i / 255 * 1.12), 1 / 2.2); }
    BAT.pile.getWorldPosition(v1); BULB.phone.getWorldPosition(v2);
    const e = BULB.eye; v1.addScaledVector(player.n, .07);
    v4.crossVectors(player.n, player.fwd).normalize();      // (what its lens frames is the handful itself: his own hands and arm, which would fill the picture from this near, are left out of it)
    e.position.copy(v1).addScaledVector(player.n, .27).addScaledVector(player.fwd, .37).addScaledVector(v4, -.06); e.up.copy(player.n); e.lookAt(v1); e.updateMatrixWorld(true);
    const keep = r.getRenderTarget(), mv = me.visible; BULB.phone.visible = false; me.visible = false;
    r.setRenderTarget(BULB.rt); r.clear(); r.render(scene, e); r.readRenderTargetPixels(BULB.rt, 0, 0, N, N, BULB.buf); r.setRenderTarget(keep); BULB.phone.visible = true; me.visible = mv;
    const src = BULB.buf, dst = BULB.img.data, L = BULB.lut;
    for (let y = 0; y < N; y++) { let a = (N - 1 - y) * N * 4, b = y * N * 4; for (let x = 0; x < N; x++, a += 4, b += 4) { dst[b] = L[src[a]]; dst[b + 1] = L[src[a + 1]]; dst[b + 2] = L[src[a + 2]]; dst[b + 3] = 255; } }
    recLive.getContext('2d').putImageData(BULB.img, 0, 0); BULB.fresh = true;
  }
  function recShot() {
    let data = null;
    try { if (!BULB.fresh) recLiveDraw(); const out = document.createElement('canvas'); out.width = out.height = 520; out.getContext('2d').drawImage(recLive, 0, 0, 520, 520); data = out.toDataURL('image/jpeg', .86); } catch (e) {}
    snap(W.actx); recUI.classList.add('is-shot'); setTimeout(() => recUI.classList.remove('is-shot'), 380);
    const w = rw(), pk = BULB.cam || { mode: 'form', k: 'bat' };
    BULB.phase = 'dev'; BULB.t = 0;
    setTimeout(() => {
      try { if (w && data) { w.__ph = data; w.__pk = pk; w.eval("(function(){var p=window.__pk;photos[p.mode][p.k]=window.__ph;paintCat(p.mode,p.k);updateCont(p.mode)})()"); } } catch (e) {}
      recCamEl.hidden = true; recUI.classList.remove('is-cam'); if (BULB.on && BULB.phase === 'dev') { BULB.phase = 'app'; BULB.t = 0; BULB.step = -1; }
    }, 420);
  }
  function recDone() {
    if (BULB.phase === 'bye') return;
    BULB.phase = 'bye'; BULB.t = 0; BULB.done = true; W.gemChime(true);
    recUI.classList.add('is-gone'); recUI.classList.remove('is-on', 'is-cam');
    BAT.pile.getWorldPosition(v1);                         // what was recycled goes to gems, out of his hand
    BULB.burst = []; for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(W.gemGeo, W.gemMat); m.scale.setScalar(.4); m.position.copy(v1); m.userData.v = v2.copy(player.fwd).applyAxisAngle(player.n, i * .55).multiplyScalar(1.3).addScaledVector(player.n, 2.4 + (i % 3) * .6).clone(); scene.add(m); BULB.burst.push(m); }
    BAT.pile.visible = false;
    reveal(false);
    W.say('YES! You did it! Look at that: gems, everywhere!', false);
  }
  function recClose() {
    BULB.on = false; busy = false; hideMe = false; recUI.classList.remove('is-on', 'is-cam'); recCamEl.hidden = true;
    BAT.pile.visible = false; BULB.phone.visible = false;
    setTimeout(() => { if (!BULB.on) { recUI.hidden = true; recFrame.removeAttribute('src'); } }, 450);
  }
  recUI.addEventListener('click', (e) => { if (e.target.closest('.rp__btn')) recShoot(); });

  /* ============================================================
     3 · MANIC GT — its station on the big lawn, the car, its cockpit and its real screen, a tunnel of years —
         and, once the mission is done, the car itself: to drive on the planet and, Space held, to fly
     ============================================================ */
  const SU = station.userData, SQ = SU.q;
  const CAR = { obj: new THREE.Group(), rig: new THREE.Group(), loaded: false, loading: false, on: false, t: 0, phase: '', step: -1, dir: SU.dir.clone(), lamp: null, padTop: .0585, ob: null, beacon: null };      // padTop: the height of the station model's own platform, in its file (tools/ref/probe.html)
  const CAR_P = { quest: 'manic', id: 'car', name: 'Manic GT', verb: 'Get in', key: 'E' };
  {
    /* the platform is there at once; the station itself — a canopy, a pump, a round sign: a model made in Meshy — and
       the car come when the walk begins */
    const sh = new THREE.Shape(), hx = SQ.hx, hz = SQ.hz, rr = .34;
    sh.moveTo(-hx + rr, -hz); sh.lineTo(hx - rr, -hz); sh.absarc(hx - rr, -hz + rr, rr, -Math.PI / 2, 0); sh.lineTo(hx, hz - rr); sh.absarc(hx - rr, hz - rr, rr, 0, Math.PI / 2);
    sh.lineTo(-hx + rr, hz); sh.absarc(-hx + rr, hz - rr, rr, Math.PI / 2, Math.PI); sh.lineTo(-hx, -hz + rr); sh.absarc(-hx + rr, -hz + rr, rr, Math.PI, Math.PI * 1.5);
    const slab = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: .9, bevelEnabled: false, curveSegments: 10 }).rotateX(Math.PI / 2), M(0xb9b2a4, { roughness: .92 }));
    slab.receiveShadow = true; slab.castShadow = true; station.add(slab); CAR.slab = slab;
    const line = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: .05, bevelEnabled: false, curveSegments: 10 }).rotateX(Math.PI / 2).scale(1.004, 1, 1.004), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, .42, .1) }));
    line.position.y = -.07; station.add(line); CAR.line = line;
    CAR.obj.position.set(.12, 0, .2); station.add(CAR.obj);      // in front of the pump
    CAR.rig.matrixAutoUpdate = false; scene.add(CAR.rig);        // (once it is driven it leaves the station: the rig carries it)
    CAR.lamp = new THREE.PointLight(0xffd9a8, 0, 7, 1.6); CAR.lamp.position.set(0, 2.0, .2); station.add(CAR.lamp);
    CAR.beacon = glow(new THREE.Color(1.5, .55, .16), 1.5, 2.3); CAR.beacon.position.set(0, 2.75, -.4); station.add(CAR.beacon);      // a light over it, to find it from afar
    /* nobody walks through the station; and the car, wherever it has been left, is solid too */
    [-.95, 0, .95].forEach((k) => { const d = SU.top.clone().addScaledVector(SU.ex, k).normalize(); W.obstacles.push({ dir: d, rad: 1.12, car: true }); });
    CAR.ob = { dir: SU.dir.clone(), rad: 0, car: true }; W.obstacles.push(CAR.ob);
  }
  function carLoad() {
    if (CAR.loaded || CAR.loading) return; CAR.loading = true;
    W.loadGLB('../models/manic-gt.glb?v=3').then((g) => {
      const m = g.scene;
      m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; const mt = o.material; mt.metalness = 0; mt.roughness = .42; mt.envMapIntensity = 1.4; mt.emissiveMap = mt.map; mt.emissive = new THREE.Color(.09, .09, .09); if (mt.map) mt.map.anisotropy = 4; carPaint(mt); } });
      m.scale.setScalar(2.45);                             // the model is one unit long: on this small planet the car is a small car
      CAR.obj.add(m); CAR.loaded = true; CAR.lamp.intensity = 5;
    }).catch((e) => { console.warn('[quests] no car', e); CAR.loading = false; });
    W.loadGLB('../models/station.glb?v=1').then((g) => {
      const m = g.scene, box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3());
      m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; const mt = o.material; mt.metalness = 0; mt.roughness = .8; mt.emissiveMap = mt.map; mt.emissive = new THREE.Color(.16, .15, .14); if (mt.map) mt.map.anisotropy = 4; } });
      const k = (SQ.hx * 2 + .06) / size.x; m.scale.setScalar(k);      // as long as the platform; it stands along its back, its own floor level with it, and the car in front of the pump
      m.position.set(-(box.min.x + box.max.x) / 2 * k, -CAR.padTop * k + .004, -SQ.hz + .05 - box.min.z * k);
      station.add(m); CAR.model = m;
    }).catch(() => {                                       // no model: the plain platform, two posts and a roof
      const post = M(0xf1ead8), roof = M(0xf1ead8, { emissive: 0x2a2620 });
      [-1, 1].forEach((sg) => { const q = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, 1.9, 12), post); q.position.set(sg * (SQ.hx - .35), .95, -SQ.hz + .22); q.castShadow = true; station.add(q); });
      const r = new THREE.Mesh(new THREE.BoxGeometry(SQ.hx * 2 - .1, .12, 1.5), roof); r.position.set(0, 1.96, -SQ.hz + .75); r.castShadow = true; station.add(r);
      const st = new THREE.Mesh(new THREE.BoxGeometry(SQ.hx * 2 - .08, .05, 1.52), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, .42, .1) })); st.position.copy(r.position); station.add(st);
    });
  }
  /* inside the car: its cockpit (the lab's: gt-cockpit.glb), and in the dashboard the real prototype. Over it, when the
     journey starts, a tunnel of years. (Pass 77: nothing lies over the screen any more — the tunnel's rings and the year
     were there, unseen, and took every click.) */
  const rideUI = el('div', 'gt', `
    <canvas class="gt__cockpit" aria-hidden="true"></canvas>
    <div class="gt__screen"><iframe title="Manic GT, the centre screen" width="1280" height="832" allow="autoplay"></iframe></div>
    <div class="gt__veil" aria-hidden="true"></div>
    <div class="gt__warp" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="gt__year" aria-hidden="true"><b>2060</b><span>Montréal, in a parallel universe</span></div>
    <button type="button" class="world-go gt__back" hidden><span>Get out of the car</span></button>`);
  rideUI.hidden = true; hero.appendChild(rideUI);
  $('iframe', rideUI).addEventListener('load', (e) => { if (e.target.getAttribute('src')) passKeys(e.target, ['Escape']); });      // (Space is the screen's own: it speeds the drive up)
  const rideFrame = $('iframe', rideUI), rideBack = $('.gt__back', rideUI), yearEl = $('.gt__year b', rideUI), rideScreen = $('.gt__screen', rideUI);
  let rideTimer = 0;
  const COCK = { r: null, scene: null, cam: null, ready: false, loading: false, u: 0, to: 0, raf: 0, last: 0, tab: null,
    SCR: V(-.0036, .3746, -.1298), N: V(.004, .226, .974).normalize(), W: .168, EYE: V(-.23, .47, .3), AT: V(.02, .31, -.3) };      // its screen and the driver's eyes, in the cockpit's own measures (car-show.js)
  function cockpitLoad() {
    if (COCK.loading) return; COCK.loading = true;
    try { COCK.r = new THREE.WebGLRenderer({ canvas: $('.gt__cockpit', rideUI), antialias: true, alpha: true }); } catch (e) { return; }
    COCK.r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); COCK.r.outputColorSpace = THREE.SRGBColorSpace; COCK.r.toneMapping = THREE.ACESFilmicToneMapping; COCK.r.toneMappingExposure = 1.05; COCK.r.setClearColor(0x000000, 0);
    COCK.scene = new THREE.Scene(); COCK.cam = new THREE.PerspectiveCamera(36, 1.6, .02, 50);
    COCK.scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x241c18, 1.15));
    const key = new THREE.DirectionalLight(0xfff0dc, 1.7); key.position.set(-2, 3, 2); COCK.scene.add(key);
    const lamp = new THREE.PointLight(0xffd9b0, 1.3, 3, 1.5); lamp.position.set(0, .75, .3); COCK.scene.add(lamp);
    /* outside its windows: the night of the planet, a few stars */
    const sky = new THREE.Mesh(new THREE.SphereGeometry(20, 24, 16), new THREE.MeshBasicMaterial({ color: 0x0a0d24, side: THREE.BackSide })); COCK.scene.add(sky);
    Promise.all([W.loadGLB('../models/gt-cockpit.glb?v=2'), new THREE.TextureLoader().loadAsync(url('../img/blocks/manic-gt-poster.webp')).catch(() => null)]).then(([g, poster]) => {
      g.scene.traverse((m) => { if (m.isMesh) { const mt = m.material; mt.metalness = 0; mt.roughness = .5; mt.color = new THREE.Color(.05, .05, .055); mt.emissiveMap = mt.map; mt.emissive = new THREE.Color(.012, .012, .014); if (mt.map) mt.map.anisotropy = 8; } });      // pass 79: a black interior, as on the home page
      COCK.scene.add(g.scene);
      /* its own screen in the dashboard: the prototype's first page, until the real one is laid over it */
      if (poster) { poster.colorSpace = THREE.SRGBColorSpace; poster.anisotropy = 8; }
      const tab = COCK.tab = new THREE.Group(); tab.position.copy(COCK.SCR).addScaledVector(COCK.N, .011); tab.lookAt(v1.copy(COCK.SCR).addScaledVector(COCK.N, 1)); COCK.scene.add(tab);
      tab.add(new THREE.Mesh(new THREE.PlaneGeometry(COCK.W + .014, COCK.W * 832 / 1280 + .014), new THREE.MeshBasicMaterial({ color: 0x050506 })));
      const face = new THREE.Mesh(new THREE.PlaneGeometry(COCK.W, COCK.W * 832 / 1280), new THREE.MeshBasicMaterial(poster ? { map: poster, toneMapped: false } : { color: 0x16161c })); face.position.z = .0008; tab.add(face);
      COCK.ready = true; cockpitDraw();
    }).catch((e) => console.warn('[quests] no cockpit', e));
  }
  /* u: 0, the driver's seat — the wheel, the dashboard, the windscreen · 1, before its screen, at the distance that makes
     that screen exactly as large as the real one laid over it */
  function cockpitDraw() {
    if (!COCK.ready || rideUI.hidden) return;
    const Wd = window.innerWidth, Hd = window.innerHeight, sr = rideScreen.getBoundingClientRect(), cam = COCK.cam;
    if (!sr.width) return;
    COCK.r.setSize(Wd, Hd, false);
    const w = COCK.u * COCK.u * (3 - 2 * COCK.u), fovE = 36, d = COCK.W * Hd / (2 * Math.tan(THREE.MathUtils.degToRad(fovE / 2)) * sr.width);
    cam.position.copy(COCK.SCR).addScaledVector(COCK.N, d); cam.up.set(0, 1, 0); cam.lookAt(COCK.SCR); qB.copy(cam.quaternion); v2.copy(cam.position);
    cam.position.copy(COCK.EYE); cam.lookAt(COCK.AT); qA.copy(cam.quaternion);
    cam.position.lerp(v2, w); cam.quaternion.copy(qA).slerp(qB, w); cam.fov = 60 + (fovE - 60) * w;
    cam.aspect = Wd / Hd; cam.setViewOffset(Wd, Hd, -(sr.left + sr.width / 2 - Wd / 2) * w, -(sr.top + sr.height / 2 - Hd / 2) * w, Wd, Hd); cam.updateProjectionMatrix();
    COCK.r.domElement.style.filter = w > .6 ? 'brightness(' + (1 - .22 * (w - .6) / .4).toFixed(3) + ')' : '';
    COCK.r.render(COCK.scene, cam);
  }
  function cockpitTo(u, secs, then) {                      // the eye goes there, in its own time
    COCK.to = u; COCK.then = then || null; COCK.rate = 1 / Math.max(.05, secs); COCK.last = performance.now();
    cancelAnimationFrame(COCK.raf);
    const tick = (now) => {
      const dt = Math.min(.05, (now - COCK.last) / 1000); COCK.last = now;
      COCK.u = COCK.to > COCK.u ? Math.min(COCK.to, COCK.u + dt * COCK.rate) : Math.max(COCK.to, COCK.u - dt * COCK.rate);
      cockpitDraw();
      if (COCK.u !== COCK.to && !rideUI.hidden) COCK.raf = requestAnimationFrame(tick); else { const f = COCK.then; COCK.then = null; if (f) f(); }
    };
    COCK.raf = requestAnimationFrame(tick);
  }
  function rideFit() { const k = Math.min((window.innerWidth * .74) / 1280, (window.innerHeight - 250) / 832, 1); rideScreen.style.setProperty('--k', k.toFixed(4)); cockpitDraw(); }
  const gtWin = () => { try { const w = rideFrame.contentWindow; return w && w.GT ? w : null; } catch (e) { return null; } };
  const GT_LINES = [
    'Here we are: the Manic GT’s centre screen, the one Jaime designed. Where shall we go? Tap the search bar at the top.',
    'Pick a kind of place, coffee, a park, anything, then choose one from the list.',
    'Good choice! Now tap Directions.',
    'There’s our way. Tap Start… and hold on tight!'
  ];
  function rideStart() {
    if (CAR.on) return;
    CAR.on = true; CAR.t = 0; CAR.phase = 'boot'; CAR.step = -1; CAR.nudged = false; busy = true; W.stopTravel(); W.sayDone();
    W.dark(true); W.musicTo(W.BG * .35, .8); cockpitLoad();
    setTimeout(() => {
      if (!CAR.on) return;
      hideMe = true; rideUI.hidden = false; COCK.u = 0; rideFit(); rideBack.hidden = true; rideUI.classList.remove('is-warp', 'is-screen');
      requestAnimationFrame(() => { rideUI.classList.add('is-in'); cockpitDraw(); });
      rideFrame.src = url('../proto/manic-gt/index.html');
      W.dark(false);
      /* first the whole of its inside, from the driver's seat; then the eye goes to the screen in the middle of the dashboard, and the real one is there */
      setTimeout(() => { if (CAR.on && CAR.phase !== 'out') cockpitTo(1, 1.5, () => { if (CAR.on && CAR.phase !== 'out') rideUI.classList.add('is-screen'); }); }, COCK.ready ? 1500 : 2400);
      setTimeout(() => { if (CAR.on && CAR.phase !== 'out' && !rideUI.classList.contains('is-screen')) { COCK.u = 1; cockpitDraw(); rideUI.classList.add('is-screen'); } }, 6000);      // (whatever happens, the screen comes)
    }, 480);
  }
  function rideWarp() {                                    // Start was pressed: the years run back while the city is being built
    CAR.phase = 'warp'; CAR.t = 0; rideUI.classList.add('is-warp');
    let y = 2060; yearEl.textContent = y; clearInterval(rideTimer);
    rideTimer = setInterval(() => { y -= Math.max(1, Math.round((y - 1971) / 6)); if (y <= 1971) { y = 1971; clearInterval(rideTimer); } yearEl.textContent = y; }, 95);
    W.say('We’re slipping into a parallel Montréal…', true);
    const w = gtWin(); try { if (w.GT.world && !w.GT.world.paused) w.GT.world.pause(true); } catch (e) {}      // the drive waits for the tunnel to end
  }
  function rideStep(dt) {
    CAR.t += dt;
    const w = gtWin();
    if (!w) { if (CAR.phase === 'boot' && CAR.t > 18 && rideBack.hidden) { rideBack.hidden = false; W.say('The screen is taking its time… You can wait, or get out of the car.', true); } return; }
    let mode = '', ph = '', drive = false, ready = false;
    try { const S0 = w.GT.S; mode = S0.nav.mode; drive = !!S0.drive; ph = (S0.drive && S0.drive.ph) || ''; ready = !!w.eval('typeof GEO !== "undefined" && GEO.ready'); } catch (e) { return; }
    if (CAR.phase === 'boot') {
      if (!ready || CAR.t < 1.4 || !rideUI.classList.contains('is-screen')) return;
      try { if (w.GT.S.view !== 'nav') w.GT.go('nav'); } catch (e) {}
      CAR.phase = 'pick'; CAR.t = 0;
    }
    if (CAR.phase === 'pick') {
      if (drive) { rideWarp(); return; }
      const st = mode === 'route' ? 3 : mode === 'place' ? 2 : mode === 'search' ? 1 : 0;
      if (st !== CAR.step) { CAR.step = st; W.say(GT_LINES[st], true); }
      if (CAR.t > 45 && rideBack.hidden) rideBack.hidden = false;
    } else if (CAR.phase === 'warp') {
      if (CAR.t > 3.6) { rideUI.classList.remove('is-warp'); CAR.phase = 'drive'; CAR.t = 0; try { if (w.GT.world.paused) w.GT.world.pause(false); } catch (e) {} W.say('1971, more or less! Jaime drew this whole city for the screen. I’ll speed us up a little.', true); }
    } else if (CAR.phase === 'drive' || CAR.phase === 'scan') {
      if (CAR.phase === 'drive') { try { if (ph === 'drive' && w.GT.world) w.GT.world.setBoost(true); } catch (e) {} }
      if (CAR.phase === 'drive' && CAR.t > 6 && (ph === 'cruise' || ph === 'stopped' || ph === 'park')) {      // (pass 77: her word on the city is given the time to be read: a short way reached the signs before she had finished)
        CAR.phase = 'scan'; CAR.t = 0;
        W.say('Mmh, parking is so hard these days… What if we had something that could help us find a spot? Oh, well, there you go! ManiScan reads the signs for you. Tap a green spot, or the Park button.', true);
      }
      if (CAR.phase === 'scan' && (ph === 'cruise' || ph === 'stopped') && CAR.t > (CAR.nudged ? 9 : 15)) {      // nobody chose: Evi takes the first free, legal place herself
        let ok = false;
        try { const d = w.document, pk = d.querySelector('#parkAct [data-s="park"]'), ag = d.querySelector('#parkAct [data-s="again"]'); if (pk) { pk.click(); ok = true; } else if (ag) ag.click(); } catch (e) {}      // (the screen's own Park button: it is there as soon as ManiScan has found a legal place)
        CAR.t = 0; CAR.nudged = true;
        if (ok) W.say('That green one is free, and legal at this hour. I’ll take it for us!', true);
      }
      if (ph === 'parked') { CAR.phase = 'parked'; CAR.t = 0; rideBack.hidden = false; W.say('Parked, and legally! It even tells you until when. Ready? Get out of the car.', true); }
      else if (ph === 'arrived' || (!drive && CAR.t > 3)) { CAR.phase = 'parked'; CAR.t = 0; rideBack.hidden = false; W.say('We made it! Ready? Get out of the car.', true); }
      if (CAR.t > 40 && rideBack.hidden) rideBack.hidden = false;
    }
  }
  function rideEnd() {
    if (!CAR.on || CAR.phase === 'out') return;
    const finished = CAR.phase === 'parked' || CAR.phase === 'scan';
    CAR.phase = 'out'; W.sayDone(); clearInterval(rideTimer);
    rideUI.classList.remove('is-screen', 'is-warp'); rideBack.hidden = true;
    if (COCK.ready) cockpitTo(0, .8);                      // a last look at its inside, from the seat
    setTimeout(() => W.dark(true), 620);
    setTimeout(() => {
      rideUI.classList.remove('is-in', 'is-screen', 'is-warp'); rideUI.hidden = true; rideFrame.removeAttribute('src'); cancelAnimationFrame(COCK.raf);
      CAR.on = false; busy = false; hideMe = false;
      /* he steps out beside the station, on its open side */
      const out = (sg) => SU.top.clone().addScaledVector(SU.ez, sg * (SQ.hz + .8)).addScaledVector(SU.ex, -.3).normalize();
      const a = out(1), b = out(-1), q = land.free(a) > .15 ? a : b;
      player.n.copy(q); player.h = 0; player.vy = 0; player.speed = 0;
      player.fwd.copy(SU.dir).sub(q); player.fwd.addScaledVector(player.n, -player.fwd.dot(player.n)).normalize().negate(); W.cam.f.copy(player.fwd);
      if (W.mode === 'walk') W.musicTo(W.BG, 2);
      setTimeout(() => { W.dark(false); if (finished) complete('manic'); }, 260);
    }, 1080);
  }
  rideBack.addEventListener('click', rideEnd);

  /* ---------- the car on the planet (pass 77): once the mission is done it is his to drive — and, Space held, to fly ----------
     It rolls over the round of the planet as he walks over it (trunks, rocks, walls and water turn it aside); with
     Space it lifts, and what stands on the ground passes under it; let go, and it comes down by itself. It cannot
     rise higher than the top of the sky tower, so the planet is never out of reach. */
  const DRV = { on: false, n: V(0, 1, 0), f: V(0, 0, 1), fs: V(0, 0, 1), h: 0, vh: 0, v: 0, yaw: 0, pitch: 0, roll: 0, t: 0, air: 0, cp: V(0, 0, 0), camSet: false, said: false, glow: null, shade: null, CEIL: 15 };
  const drvUI = el('button', 'world-go dv__out', '<kbd>E</kbd><span>Get out</span>'); drvUI.type = 'button'; drvUI.hidden = true; hero.appendChild(drvUI);
  {
    DRV.glow = glow(new THREE.Color(.4, .75, 1.6), 3.0, 2.2); DRV.glow.visible = false; scene.add(DRV.glow);      // a cool light under it while it is off the ground
    DRV.shade = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, uniforms: { k: { value: .5 } },
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying vec2 vUv;uniform float k;void main(){float d=length(vUv-.5)*2.;gl_FragColor=vec4(0.,0.,0.,pow(max(0.,1.-d),1.6)*k);}' }));
    DRV.shade.renderOrder = 1; DRV.shade.visible = false; scene.add(DRV.shade);
  }
  function carPose() {                                    // the rig takes the car where it is (its nose is the model's −x)
    const G = land.ground(DRV.n) + DRV.h;
    v1.copy(DRV.f).negate(); v3.crossVectors(DRV.n, DRV.f).normalize();
    CAR.rig.matrix.makeBasis(v1, DRV.n, v3).setPosition(v2.copy(DRV.n).multiplyScalar(G + .02)); CAR.rig.matrixWorldNeedsUpdate = true;
    CAR.obj.rotation.set(DRV.roll, 0, -DRV.pitch);
  }
  function driveStart() {
    if (DRV.on || !CAR.loaded) return;
    CAR.obj.updateWorldMatrix(true, false);
    CAR.obj.getWorldPosition(v1); const r = v1.length(); DRV.n.copy(v1).divideScalar(r);
    v2.set(-1, 0, 0).transformDirection(CAR.obj.matrixWorld); DRV.f.copy(v2).addScaledVector(DRV.n, -v2.dot(DRV.n)).normalize(); DRV.fs.copy(DRV.f);
    DRV.h = Math.max(0, r - .02 - land.ground(DRV.n)); DRV.vh = 0; DRV.v = 0; DRV.yaw = 0; DRV.pitch = DRV.roll = 0; DRV.t = 0; DRV.air = 0; DRV.camSet = false;
    if (CAR.obj.parent !== CAR.rig) { CAR.rig.add(CAR.obj); CAR.obj.position.set(0, 0, 0); }
    CAR.ob.rad = 0;
    DRV.on = true; busy = true; hideMe = true; W.stopTravel(); W.sayDone(); for (const k in held) held[k] = false;
    carPose(); DRV.shade.visible = true;
    if (!DRV.said) { DRV.said = true; W.say('It’s all yours! W A S D to drive, hold Space to fly, E to get out.', false); }
  }
  function driveStep(dt) {
    DRV.t += dt;
    let thr = (held.KeyW || held.ArrowUp ? 1 : 0) - (held.KeyS || held.ArrowDown ? 1 : 0), st = (held.KeyA || held.ArrowLeft ? 1 : 0) - (held.KeyD || held.ArrowRight ? 1 : 0);
    if (Math.abs(W.stick.y) > .15) thr += W.stick.y;
    if (Math.abs(W.stick.x) > .15) st -= W.stick.x;
    thr = clamp(thr, -1, 1); st = clamp(st, -1, 1);
    const lift = !!(held.Space || W.keys.Space), onGround = DRV.h <= .001 && DRV.vh <= 0;
    /* speed */
    DRV.v += thr * (thr * DRV.v < 0 ? 16 : 7.5) * dt;
    if (!thr) DRV.v *= Math.pow(onGround ? .22 : .5, dt);
    DRV.v = clamp(DRV.v, -4, onGround ? 8.5 : 13);
    /* the wheel: on the ground it turns only as it rolls; in the air it banks */
    const grip = onGround ? clamp(Math.abs(DRV.v) / 2.5, 0, 1) * (DRV.v < 0 ? -1 : 1) : 1;
    DRV.yaw += (st * (onGround ? 1.9 : 1.5) * grip - DRV.yaw) * (1 - Math.pow(.002, dt));
    DRV.f.applyAxisAngle(DRV.n, DRV.yaw * dt);
    /* forward, over the round of the planet */
    const G0 = land.ground(DRV.n);
    prevN.copy(DRV.n);
    q1.setFromAxisAngle(v1.crossVectors(DRV.n, DRV.f).normalize(), DRV.v * dt / (G0 + DRV.h));
    DRV.n.applyQuaternion(q1).normalize(); DRV.f.applyQuaternion(q1); DRV.f.addScaledVector(DRV.n, -DRV.f.dot(DRV.n)).normalize();
    /* up and down: Space lifts it; let go and it comes down by itself; it stops rising under the top of the sky tower */
    if (lift) DRV.vh = Math.min(5.5, DRV.vh + 15 * dt); else DRV.vh = Math.max(-6.5, DRV.vh - 9 * dt);
    DRV.vh = Math.min(DRV.vh, (DRV.CEIL - DRV.h) * 2.2);
    DRV.h += DRV.vh * dt;
    if (DRV.h < .4) {                                      // rolling: what stands there turns it aside, and so does the water
      const BODYC = .82; let fr = land.free(DRV.n);
      for (let it = 0; it < 4 && fr < BODYC; it++) {
        const e1 = v1.copy(DRV.f), e2 = v3.crossVectors(DRV.n, e1), eps = .12 / R;
        const g1 = land.free(v2.copy(DRV.n).addScaledVector(e1, eps).normalize()) - land.free(v2.copy(DRV.n).addScaledVector(e1, -eps).normalize());
        const g2 = land.free(v2.copy(DRV.n).addScaledVector(e2, eps).normalize()) - land.free(v2.copy(DRV.n).addScaledVector(e2, -eps).normalize());
        const gl = Math.hypot(g1, g2); if (gl < 1e-4) break;
        const mv = (BODYC - fr + .012) / R / gl;
        DRV.n.addScaledVector(e1, g1 * mv).addScaledVector(e2, g2 * mv).normalize(); fr = land.free(DRV.n);
      }
      if ((land.kind(DRV.n) & 2) || (fr < BODYC - .2 && land.free(prevN) > fr)) { DRV.n.copy(prevN); DRV.v *= -.2; }
      for (let i = 0; i < W.obstacles.length; i++) {
        const o = W.obstacles[i]; if (o === CAR.ob || !o.rad) continue;
        const d = DRV.n.dot(o.dir); if (d < .2) continue;
        const need = (o.rad + .8) / R, ang = Math.acos(Math.min(1, d));
        if (ang < need) { v1.copy(DRV.n).addScaledVector(o.dir, -d); if (v1.lengthSq() < 1e-8) v1.copy(DRV.f); v1.normalize(); DRV.n.copy(o.dir).multiplyScalar(Math.cos(need)).addScaledVector(v1, Math.sin(need)).normalize(); DRV.v *= .9; }
      }
      DRV.f.addScaledVector(DRV.n, -DRV.f.dot(DRV.n)).normalize();
    } else {                                               // flying: crowns and roofs pass under it
      const hull = land.hull(DRV.n) - land.ground(DRV.n), need = hull + .45;
      if (hull > .5 && DRV.h < need) { DRV.h += (need - DRV.h) * (1 - Math.pow(.0004, dt)); if (DRV.vh < 0) DRV.vh = 0; }
    }
    if (DRV.h <= 0) { DRV.h = 0; if (DRV.vh < 0) DRV.vh = 0; }
    /* how it leans: nose up as it climbs, banking into its turns */
    DRV.air += ((DRV.h > .05 ? 1 : 0) - DRV.air) * (1 - Math.pow(.01, dt));
    DRV.pitch += (clamp(DRV.vh * .055, -.28, .3) * DRV.air - DRV.pitch) * (1 - Math.pow(.01, dt));
    DRV.roll += (DRV.yaw * (.06 + .24 * DRV.air) * clamp(Math.abs(DRV.v) / 6, .3, 1) - DRV.roll) * (1 - Math.pow(.01, dt));
    carPose();
    /* he is where the car is: the light, the map and the grass follow */
    player.n.copy(DRV.n); player.fwd.copy(DRV.f); player.h = DRV.h; player.vy = 0; player.speed = 0; W.cam.f.copy(DRV.f);
    const Gn = land.ground(DRV.n);
    DRV.glow.visible = DRV.air > .02;
    if (DRV.glow.visible) { DRV.glow.position.copy(DRV.n).multiplyScalar(Gn + DRV.h + .12); DRV.glow.material.uniforms.k.value = DRV.air * (.75 + .2 * Math.sin(DRV.t * 9)); }
    DRV.shade.position.copy(DRV.n).multiplyScalar(Gn + .05); mA.makeBasis(v1.copy(DRV.f).negate(), DRV.n, v3.crossVectors(DRV.n, DRV.f).normalize()); DRV.shade.quaternion.setFromRotationMatrix(mA);
    DRV.shade.scale.set(3.1 + DRV.h * .12, 1, 1.9 + DRV.h * .12); DRV.shade.material.uniforms.k.value = .6 / (1 + DRV.h * .45);
    const can = DRV.h <= .001 && Math.abs(DRV.v) < 1.6; if (drvUI.hidden === can) drvUI.hidden = !can;
  }
  function driveEnd(force) {
    if (!DRV.on) return;
    if (!force && !(DRV.h <= .001 && Math.abs(DRV.v) < 1.6)) { W.say(DRV.h > .001 ? 'Land first! Let go of Space and it comes down by itself.' : 'Slow down first!', false); return; }
    if (force) { DRV.h = 0; DRV.v = 0; DRV.pitch = DRV.roll = 0; carPose(); }
    DRV.on = false; busy = false; hideMe = false; drvUI.hidden = true; DRV.glow.visible = false; DRV.v = 0; DRV.shade.material.uniforms.k.value = .55;
    const left = v1.crossVectors(DRV.n, DRV.f).normalize(), side = (sg) => v2.copy(DRV.n).addScaledVector(left, sg * 1.3 / R).normalize().clone();
    const a = side(1), b = side(-1), q = land.free(a) > .22 ? a : b;
    player.n.copy(q); player.h = 0; player.vy = 0; player.speed = 0; player.fwd.copy(DRV.f).addScaledVector(player.n, -DRV.f.dot(player.n)).normalize(); W.cam.f.copy(player.fwd);
    CAR.dir.copy(DRV.n); CAR.ob.dir.copy(DRV.n); CAR.ob.rad = .95;
  }
  drvUI.addEventListener('click', () => driveEnd());

  /* ============================================================
     1 · TRACK ON — the Underground Studio
     ============================================================ */
  const STUDIO = V(0, -300, 0), S = 7.6, FLOOR0 = .0316;    // far under the planet, in a dark of its own (the room is open on two sides: nothing else may be near). Its file is one unit long: 7.6 makes it a room of six metres; its floor stands at .0316
  const KB = V(-1.05, 0, .35);                              // the keyboard, in metres from the middle of the room
  const SPOT = V(KB.x, 0, KB.z + .62);                      // where he stands to play it
  const ST = { on: false, phase: '', t: 0, loaded: false, loading: null, map: null, step: -1, opened: false, count: 0, recAt: 0, saved: false, wasBusy: false, tAt: 0, camK: 0, phK: 0, hand: [0, 0], key: [-1, -1], recording: false, greeted: false, nearKb: false, nearSt: false, nearRec: false, path: null, layers: 1, sent: '', vinyl: 0, vinK: 0 };
  const RECORDS = V(-1.0, 0, -.36);                         // where he stands to look through the records: before the desk, by its chair
  /* pass 77: no posters. Each one is covered by a piece of the bare wall it hangs on — brick cut from the clean stretch of
     the same wall, concrete from the same stair — set a finger's width in front of it (tools/blender/wall_views.py made
     the pictures; the numbers are metres in the room). */
  const WALLS = [['wall-a.webp', -2.5407, 1.7521, 2.8011, .8903, 1.0206], ['wall-b.webp', -2.5711, 1.6761, 1.8837, .8903, .9989], ['wall-c.webp', -2.5772, 1.6761, 1.1074, .6623, .9771], ['wall-d.webp', 2.6091, 1.8661, -1.5553, .8523, 1.292]];
  const held = {};
  const room = new THREE.Group(); room.position.copy(STUDIO); room.visible = false; scene.add(room);
  const KEYX = (i) => KB.x - .385 + i * .11, KEYY = .9, KEYZ = KB.z + .11;
  const CHORDS = [['C', [48, 60, 64, 67]], ['Dm', [50, 62, 65, 69]], ['Em', [52, 64, 67, 71]], ['F', [53, 60, 65, 69]], ['G', [55, 62, 67, 71]], ['Am', [57, 60, 64, 69]], ['D', [50, 62, 66, 69]], ['E', [52, 64, 68, 71]]];
  const KEYCODES = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK'];
  const keyMesh = [], phone = new THREE.Group();
  {
    const add = (geo, mat, x, y, z, p) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); (p || room).add(m); return m; };
    const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
    /* the dark the room floats in (it has no ceiling and two open sides: without this the planet would be seen from inside) */
    add(new THREE.SphereGeometry(40, 24, 16), new THREE.MeshBasicMaterial({ color: 0x07070d, side: THREE.BackSide, fog: false }), 0, 0, 0);
    add(new THREE.CircleGeometry(16, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x0b0a12, fog: false }), 0, -.6, 0);
    /* the keyboard on its stand — the one thing here not from the model: it is what gets played */
    const dark = M(0x1c1d26, { roughness: .5, metalness: .3 }), steel = M(0x8a90a0, { roughness: .4, metalness: .7 });
    add(B(1.1, .09, .36), dark, KB.x, .84, KB.z);
    add(B(1.04, .012, .05), new THREE.MeshBasicMaterial({ color: new THREE.Color(.5, 1.1, 2.2) }), KB.x, .891, KB.z - .15);          // its strip of light
    [-1, 1].forEach((sg) => { const leg = add(B(.04, .95, .04), steel, KB.x + sg * .32, .42, KB.z); leg.rotation.z = sg * .5; });
    const white = M(0xf4f1ea, { roughness: .35 }), whiteOn = M(0x9fd8ff, { roughness: .35, emissive: 0x3a8fd0 }), black = M(0x16161c, { roughness: .4 });
    for (let i = 0; i < 8; i++) { const k = add(B(.1, .03, .2), white, KEYX(i), KEYY - .012, KEYZ - .02); k.userData = { off: white, on: whiteOn, y: KEYY - .012 }; keyMesh.push(k); }
    [0, 1, 3, 4, 5].forEach((i) => add(B(.055, .035, .12), black, KEYX(i) + .055, KEYY + .012, KEYZ - .06));
    /* his phone: in his hand, then on the keyboard */
    const sc = document.createElement('canvas'); sc.width = 96; sc.height = 200; const x = sc.getContext('2d');
    x.fillStyle = '#D9D9D4'; x.fillRect(0, 0, 96, 200); x.fillStyle = '#161616'; x.fillRect(12, 26, 40, 8); x.fillStyle = '#bdbdb6'; for (let i = 0; i < 4; i++) x.fillRect(12, 52 + i * 22, 72, 12);
    x.fillStyle = '#E3261F'; x.beginPath(); x.arc(48, 168, 16, 0, 7); x.fill();
    const tx = new THREE.CanvasTexture(sc); tx.colorSpace = THREE.SRGBColorSpace;
    phone.add(new THREE.Mesh(B(.082, .168, .012), M(0x0c0c10, { roughness: .35, metalness: .5 })));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(.072, .156), new THREE.MeshBasicMaterial({ map: tx, toneMapped: false })); face.position.z = .0065; phone.add(face);
    phone.visible = false; room.add(phone);
    /* the light: warm lamps, the red of the booth, the blue of the keys */
    [[0xffd0a0, 16, 12, -1.2, 2.7, 1.2], [0xffc890, 12, 11, 1.7, 2.6, 2.2], [0xff5a3a, 7, 6, .25, 1.7, -1.2], [0x7aa8ff, 5, 5, KB.x, 1.5, KB.z - .5], [0xffd9b0, 9, 9, 1.4, 3.2, -2.4]].forEach((q) => { const l = new THREE.PointLight(q[0], q[1], q[2], 1.5); l.position.set(q[3], q[4], q[5]); room.add(l); });
  }
  function roomLoad() {
    if (ST.loading) return ST.loading;
    ST.loading = Promise.all([W.loadGLB('../models/studio.glb?v=1'), fetch(url('../models/studio-map.json?v=1')).then((r) => r.json())]).then(([g, map]) => {
      const m = g.scene; m.scale.setScalar(S); m.position.y = -FLOOR0 * S;
      m.traverse((o) => { if (o.isMesh) { o.receiveShadow = false; o.castShadow = false; const mt = o.material; mt.metalness = 0; mt.roughness = .9; mt.emissiveMap = mt.map; mt.emissive = new THREE.Color(.5, .47, .44); mt.envMapIntensity = .2; if (mt.map) mt.map.anisotropy = 8; } });
      room.add(m); ST.map = map; ST.loaded = true;
      const tl = new THREE.TextureLoader();
      WALLS.forEach((q) => tl.load(url('../img/quests/' + q[0]), (tx) => {
        tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
        const d = new THREE.Mesh(new THREE.PlaneGeometry(q[4], q[5]), new THREE.MeshStandardMaterial({ map: tx, emissiveMap: tx, emissive: new THREE.Color(.5, .47, .44), roughness: .9, metalness: 0, transparent: true, envMapIntensity: .2 }));
        d.position.set(q[1], q[2], q[3]); d.rotation.y = Math.PI / 2; d.renderOrder = 2; room.add(d);
      }));
    }).catch((e) => { console.warn('[quests] no studio', e); ST.loading = null; });
    return ST.loading;
  }
  /* walking in it: the floor plan is a picture of heights (tools/blender/height_map.py). A step is taken where the
     height is about the same as underfoot — so the floor and the stairs can be walked, the desk and the walls cannot */
  const ZONES = [[-2.28, 2.05, -.65, 3.23]];              // the floor is his to walk; the stairs he takes by himself (they are narrow, and turn)
  const STAIRS = [[1.62, -.5], [1.62, -2.05], [1.2, -2.25], [.95, -2.38], [.95, -3.3]];      // from their foot to the door at the top
  function hAt(x, z) { const P = ST.map; if (!P) return 0; const i = Math.round((x / S - P.x0) / P.cell), j = Math.round((z / S - P.z0) / P.cell); if (i < 0 || j < 0 || i >= P.nx || j >= P.nz) return null; const h = P.h[j * P.nx + i]; return h < 0 ? null : (h - FLOOR0) * S; }
  function standAt(x, z, y) {
    if (!ZONES.some((q) => x >= q[0] && x <= q[1] && z >= q[2] && z <= q[3])) return null;
    if (Math.abs(x - KB.x) < .8 && z > KB.z - .34 && z < KB.z + .36) return null;      // the keyboard
    const h = hAt(x, z); if (h == null) return null;
    return (h - y < .28 && y - h < .55) ? h : null;
  }
  function roam(dt) {
    let ix = W.stick.x, iz = W.stick.y; for (const k in W.MOVE) if (held[k]) { ix += W.MOVE[k][0]; iz += W.MOVE[k][1]; }
    const len = Math.hypot(ix, iz), p = inside.pos;
    if (len > .12) {
      const k = 1 / Math.max(1, len), sp = (held.ShiftLeft || held.ShiftRight ? 3.3 : 2.15) * Math.min(1, len);
      const dx = (.75 * ix - .66 * iz) * k, dz = (-.66 * ix - .75 * iz) * k;      // "up" is away from the corner the eye stands in
      const nx = p.x + dx * sp * dt, nz = p.z + dz * sp * dt;
      let h = standAt(nx, nz, p.y);
      if (h != null) { p.x = nx; p.z = nz; } else if ((h = standAt(nx, p.z, p.y)) != null) p.x = nx; else if ((h = standAt(p.x, nz, p.y)) != null) p.z = nz;
      v1.set(dx, 0, dz).normalize(); inside.fwd.lerp(v1, 1 - Math.pow(.001, dt)).normalize();
      player.speed = h != null ? sp : 0; player.phase += player.speed * dt * 3.1;
    } else player.speed = 0;
    const g = hAt(p.x, p.z); if (g != null) p.y += (g - p.y) * (1 - Math.pow(.0002, dt));
  }
  function goTo(x, z, dt, sp, steps) {                      // a walk he takes by himself (steps: up and down the stairs too)
    const p = inside.pos, dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz), st = sp * dt;
    const g = hAt(p.x, p.z); if (g != null && (steps || g < .4)) p.y += (g - p.y) * (1 - Math.pow(.0002, dt));
    if (d <= st) { p.x = x; p.z = z; player.speed = 0; return true; }
    p.x += dx / d * st; p.z += dz / d * st; v1.set(dx / d, 0, dz / d); inside.fwd.lerp(v1, 1 - Math.pow(.002, dt)).normalize();
    player.speed = sp; player.phase += sp * dt * 3.1;
    return false;
  }
  function follow(dt, sp) {                                 // …along a list of points; true when the last is reached
    const q = ST.path; if (!q) return true;
    if (goTo(q.pts[q.i][0], q.pts[q.i][1], dt, sp, true)) q.i++;
    if (q.i < q.pts.length) return false;
    ST.path = null; return true;
  }
  /* what is laid over the picture: eight keys (each a chord), a word of what E does, then the phone with the real app */
  const SLEEVES = ['#c8553d', '#2d4a6e', '#e0b84c', '#3f7d5a', '#7a4fa3', '#d9d4c7', '#1f1f24', '#c2703c'];      // eight records, their covers still to come (he will give the pictures): plain squares for now
  const stUI = el('div', 'tq', `
    <div class="tq__keys" role="group" aria-label="Keyboard: each key is a chord">${KEYCODES.map((k, i) => `<button type="button" data-k="${i}"><b>${CHORDS[i][0]}</b><kbd>${k.slice(3)}</kbd></button>`).join('')}</div>
    <button type="button" class="world-go tq__hint" hidden><kbd>E</kbd><span></span></button>
    <div class="tq__phone" hidden>
      <div class="tq__glass"><div class="dev__status" aria-hidden="true"><b>9:41</b><span></span></div><iframe title="Track On, the prototype" width="402" height="874"></iframe><i class="dev__home" aria-hidden="true"></i></div>
    </div>
    <div class="tq__vinyl" hidden>
      <div class="tq__crate" aria-live="polite">${SLEEVES.map((c, i) => `<figure class="tq__sleeve" data-v="${i}" style="--c:${c}"><i></i></figure>`).join('')}</div>
      <div class="tq__vbar"><button type="button" class="world-go" data-vin="-1"><kbd>A</kbd><span>Previous</span></button><button type="button" class="world-go" data-vin="1"><kbd>D</kbd><span>Next</span></button><button type="button" class="world-go" data-vin="0"><kbd>E</kbd><span>Put it back</span></button></div>
    </div>`);
  stUI.hidden = true; hero.appendChild(stUI);
  const stKeys = $('.tq__keys', stUI), stPhone = $('.tq__phone', stUI), stFrame = $('iframe', stUI), stHint = $('.tq__hint', stUI), stVinyl = $('.tq__vinyl', stUI);
  const vinylShow = () => { stVinyl.querySelectorAll('.tq__sleeve').forEach((f, i) => { const d = i - ST.vinyl; f.style.setProperty('--d', d); f.classList.toggle('is-front', d === 0); f.classList.toggle('is-gone', d < 0); }); };
  const vinylFlip = (dir) => { const n = SLEEVES.length; ST.vinyl = (ST.vinyl + dir + n) % n; vinylShow(); W.gemChime(false); };
  stVinyl.addEventListener('click', (e) => { const b = e.target.closest('[data-vin]'); if (!b) return; if (+b.dataset.vin) vinylFlip(+b.dataset.vin); else studioE(); });
  function phoneFit() { const k = Math.min(1, (window.innerHeight - 48) / 972, (window.innerWidth * .44) / 426); stPhone.style.setProperty('--k', k.toFixed(4)); }
  window.addEventListener('resize', () => { if (!recUI.hidden) recFit(); if (!stUI.hidden) phoneFit(); if (!rideUI.hidden) rideFit(); });
  const hint = (text) => { if (!text) { stHint.hidden = true; return; } const s = stHint.querySelector('span'); if (s.textContent !== text) s.textContent = text; stHint.hidden = false; };
  const tw = () => { try { const w = stFrame.contentWindow; return w && w.TrackOn ? w : null; } catch (e) { return null; } };
  /* a microphone of its own for Track On: the chords he plays are played into it, so that the take, the moving wave and
     "Find chords" are all real — and nobody is asked for their microphone */
  const VMIC = "(function(){if(window.__vm)return;var vm=window.__vm={dest:null};var gum=function(){var c=Engine.context();vm.dest=vm.dest||c.createMediaStreamDestination();return Promise.resolve(vm.dest.stream)};" +
    "try{navigator.mediaDevices.getUserMedia=gum}catch(e){}if(!navigator.mediaDevices||navigator.mediaDevices.getUserMedia!==gum){try{Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:gum},configurable:true})}catch(e){}}})()";
  stFrame.addEventListener('load', () => { if (!stFrame.getAttribute('src')) return; passKeys(stFrame); try { stFrame.contentWindow.eval(VMIC); } catch (e) {} });
  function chordInto(a, dest, i, vol) {                     // an electric piano, more or less: three partials a note, a soft attack, a long tail
    if (!a || a.state !== 'running' || !dest) return;
    const t = a.currentTime + .005, out = a.createGain(), lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; out.connect(lp); lp.connect(dest);
    CHORDS[i][1].forEach((m, n) => {
      const f = 440 * Math.pow(2, (m - 69) / 12);
      [[1, n ? .085 : .12], [2, .026], [3.01, .008]].forEach((q) => { const o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.value = f * q[0]; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(q[1] * vol, t + .012); g.gain.exponentialRampToValueAtTime(.0004, t + 1.9); o.connect(g); g.connect(out); o.start(t); o.stop(t + 1.95); });
    });
  }
  function press(i) {
    if (i < 0 || i > 7) return;
    chordInto(W.actx, W.actx && W.actx.destination, i, 1);
    const w = tw(); if (w && ST.recording) { try { chordInto(w.eval('Engine.context()'), w.__vm && w.__vm.dest, i, 1.7); } catch (e) {} ST.count++; }
    ST.hand[0] = ST.hand[1] = 1; ST.key[0] = Math.max(0, i - 1); ST.key[1] = Math.min(7, i + 1);
    const km = keyMesh[i]; km.material = km.userData.on; km.position.y = km.userData.y - .012; clearTimeout(km.userData.t); km.userData.t = setTimeout(() => { km.material = km.userData.off; km.position.y = km.userData.y; }, 190);
    const b = stKeys.children[i]; if (b) { b.classList.add('is-down'); setTimeout(() => b.classList.remove('is-down'), 190); }
  }
  stKeys.addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-k]'); if (b) { e.preventDefault(); W.soundOn(); press(+b.dataset.k); } });
  const playing = () => ST.phase === 'app' || ST.phase === 'jam';
  function enterStudio() {
    const go = () => {
      W.indoors(STUDIO, 'studio'); W.visit('studio'); W.hideMap(true);
      room.visible = true; ST.on = true; ST.t = 0; ST.step = -1; ST.opened = false; ST.saved = false; ST.count = 0; ST.recording = false; W.HATCH.k = 0;
      for (const k in held) held[k] = false;
      const top = STAIRS[STAIRS.length - 1];                // he comes in by the door at the top of the stairs, and down them
      inside.pos.set(top[0], hAt(top[0], top[1]) || 2, top[1]); inside.fwd.set(0, 0, 1); phone.visible = false;
      ST.path = { pts: STAIRS.slice(0, -1).reverse().concat(done.has('trackon') ? [[1.3, .35]] : [[SPOT.x, SPOT.z]]), i: 0 };
      W.musicTo(0, .6);
      stUI.hidden = false; stUI.classList.remove('is-on', 'has-phone', 'is-ask'); stPhone.hidden = true; stVinyl.hidden = true; hint(''); ST.layers = 1; ST.sent = '';
      ST.phase = 'enter'; busy = true;
    };
    if (ST.loaded) go(); else { W.dark(true); roomLoad().then(() => { if (W.mode === 'walk') go(); else W.dark(false); }); }
  }
  const TO_LINES = [
    'It opens on a new recording. Tap the big red button on the phone to record. (Or press R.)',
    'It’s listening! Play four chords: the keys A, S, D and F. Take your time with each one.',
    'Beautiful. Tap pause, then Save.',
    'Saved, with today’s date! Now the clever part: tap Find chords.',
    '',
    'Layer 2 is ready: tap the red button and play over your first take, any keys you like. Then pause, and Save.',
    'Two layers now, one under the other, each with its own track. Tap a speaker to silence one. Last thing: tap Send to a friend, and pick someone.',
    ''
  ];
  const line = (i, text) => { ST.step = i; ST.tAt = W.time; W.say(text || TO_LINES[i], true); stUI.classList.toggle('is-ask', i === 1); if (ST.saved) W.sayAct('Done', finishStudio); };      // (once the idea is saved, Done stands in her box: the mission can be ended there at any time)
  function phoneUp() {
    ST.phase = 'app'; ST.t = 0; ST.step = -1; ST.opened = false;
    stPhone.hidden = false; phoneFit(); stUI.classList.add('is-on', 'has-phone'); document.body.classList.add('is-studio-phone');
    try { localStorage.setItem('trackon.onboarded.v2', 'true'); } catch (e) {}      // the three cards of welcome are for a first visit to the app itself, not for here
    stFrame.src = url('../proto/track-on/index.html');
  }
  function studioPoll() {
    const w = tw(); if (!w) return;
    if (!ST.opened) { try { w.eval(VMIC); w.TrackOn.newRecording(); ST.opened = true; line(0); } catch (e) {} return; }
    let s; try { s = w.eval("({rec:Rec.state,mode:Rec.mode||'',saved:!!(current&&!current.draft&&current.stems&&current.stems.length),layers:current&&current.stems?current.stems.length:0,sent:(current&&current.sentTo)||'',chords:current&&current.recChords?current.recChords.seq.slice(0,6).join(', '):'',busy:recognising})"); } catch (e) { return; }
    ST.recording = s.rec === 'recording';
    if (ST.step === 0 && ST.recording) { ST.count = 0; ST.recAt = W.time; line(1); }
    else if (ST.step === 1 && ST.recording && ST.count >= 4 && W.time - ST.recAt > 5) line(2);
    else if (ST.step === 1 && s.rec === 'paused') { if (ST.count >= 1) line(2, 'Got it. Tap Save to keep it.'); else if (W.time - ST.tAt > 4) line(1, 'Nothing played yet! Tap Resume, then play the keys A, S, D and F.'); }
    if (ST.step < 3 && s.saved) { ST.saved = true; line(3); }
    if (ST.step === 3) {
      if (s.chords) line(4, 'It heard ' + s.chords + '! Track On listened to the take and wrote the chords out. Now give the idea a second layer: tap Add a layer, under the wave.');
      else if (ST.wasBusy && !s.busy) line(4, 'Hmm, it couldn’t hear clear chords this time. That happens! Go on: tap Add a layer, under the wave.');
    }
    ST.wasBusy = s.busy;
    if (ST.step === 4 && s.mode === 'layer') { ST.count = 0; line(5); }
    if ((ST.step === 4 || ST.step === 5) && s.layers >= 2 && !s.mode) line(6);
    if (ST.step >= 3 && ST.step < 7 && s.sent) { ST.sent = s.sent; line(7, 'Sent! ' + s.sent.split(' ')[0] + ' can listen, and add a layer too. That’s the whole idea of Track On. Look around the app, then press Done.'); }
    ST.layers = s.layers;
  }
  function finishStudio() {                                // Done: the phone goes back into his pocket; the room is his to walk in
    if (ST.phase !== 'app') return;
    ST.phase = 'free'; ST.recording = false; busy = false; W.sayDone();
    stUI.classList.remove('is-on', 'has-phone', 'is-ask'); document.body.classList.remove('is-studio-phone'); phone.visible = false;
    setTimeout(() => { if (ST.phase !== 'app') { stPhone.hidden = true; stFrame.removeAttribute('src'); } }, 500);
    try { localStorage.removeItem('trackon.onboarded.v2'); } catch (e) {}
    if (ST.saved || ST.step >= 2) complete('trackon'); else W.say('The studio is yours: walk around, play the keys, look through the records. The stairs lead back outside.', false);
  }
  function leaveStudio() {
    if (!ST.on || ST.phase === 'out') return;
    const was = ST.phase; ST.phase = 'out'; W.sayDone(); W.dark(true);
    setTimeout(() => {
      stUI.hidden = true; stUI.classList.remove('is-on', 'has-phone', 'is-vinyl'); stVinyl.hidden = true; stFrame.removeAttribute('src'); document.body.classList.remove('is-studio-phone');
      try { localStorage.removeItem('trackon.onboarded.v2'); } catch (e) {}
      if (was === 'app' && (ST.saved || ST.step >= 2)) complete('trackon');
      W.outside(); W.hideMap(false); busy = false;
      setTimeout(() => { W.dark(false); if (briefLater) { briefLater = false; clearTimeout(briefT); briefT = setTimeout(() => { if (W.mode === 'walk' && !busy) brief(); }, 1400); } }, 140);
    }, 420);
  }
  function climb() { if (ST.phase !== 'free') return; ST.phase = 'climb'; busy = true; hint(''); ST.path = { pts: STAIRS.slice(), i: 0 }; }
  function studioE() {                                     // what E does in the studio depends on where one is in it
    if (ST.phase === 'brief') { ST.phase = 'pull'; ST.t = 0; hint(''); W.say('That’s Track On, the app Jaime designed for exactly this moment. He sets it on the keyboard…', true); }
    else if (ST.phase === 'free' && ST.nearKb) { ST.phase = 'sit'; busy = true; hint(''); }
    else if (ST.phase === 'free' && ST.nearRec) { ST.phase = 'dig'; busy = true; hint(''); ST.path = null; }
    else if (ST.phase === 'free' && ST.nearSt) climb();
    else if (ST.phase === 'jam') { ST.phase = 'free'; busy = false; stUI.classList.remove('is-on'); }
    else if (ST.phase === 'vinyl') { ST.phase = 'free'; busy = false; stUI.classList.remove('is-vinyl'); setTimeout(() => { if (ST.phase !== 'vinyl') stVinyl.hidden = true; }, 420); }
  }
  stHint.addEventListener('click', studioE);
  window.addEventListener('blur', () => { for (const k in held) held[k] = false; });

  /* ============================================================
     what world.js asks, every frame and on every key
     ============================================================ */
  return {
    get busy() { return busy; }, get hideMe() { return hideMe; }, get calling() { return calling; }, get driving() { return DRV.on; }, done, current, STUDIO, room, BULB, BAT, CAR, ST, DRV, COCK, driveStart, driveEnd,
    dots() { return current() === 'manic' || done.has('manic') ? [{ dir: CAR.dir, col: '#ff8a3c' }] : []; },      // on the little map: where the car is
    brief, complete, enterStudio, roomLoad, reveal,
    hint() { const q = current(); return q ? HINT[q]() : calling ? 'The phone is still ringing! It’s on the armchair, by the house.' : null; },
    show() { hud(); loadAt = W.time + 2.5; },      // (pass 90: no missions, and no gems either: they were the Recyco mission's reward)
    cancel() {                                             // leaving the walk: everything is put away
      clearTimeout(briefT); calling = false; briefLater = false; shotReq = false;
      if (BULB.on) { recClose(); recUI.hidden = true; recFrame.removeAttribute('src'); if (BULB.phase !== 'bye') BULB.done = done.has('recyco'); }
      if (BULB.burst) { BULB.burst.forEach((m) => scene.remove(m)); BULB.burst = null; }
      if (CAR.on) { rideUI.hidden = true; rideUI.classList.remove('is-in', 'is-screen', 'is-warp'); rideFrame.removeAttribute('src'); clearInterval(rideTimer); CAR.on = false; W.dark(false); }
      if (DRV.on) driveEnd(true);
      if (ST.on) { stUI.hidden = true; stFrame.removeAttribute('src'); document.body.classList.remove('is-studio-phone'); try { localStorage.removeItem('trackon.onboarded.v2'); } catch (e) {} }
      busy = false; hideMe = false;
    },
    tap() { /* a held line was clicked: it stays — the quest moves it on */ },
    left(kind) { if (kind === 'studio') { ST.on = false; room.visible = false; stUI.hidden = true; stUI.classList.remove('is-vinyl'); stVinyl.hidden = true; phone.visible = false; document.body.classList.remove('is-studio-phone'); } },
    use(p) { if (p.id === 'bulb') recStart(); else if (p.id === 'car') { if (done.has('manic')) driveStart(); else rideStart(); } },
    act() { if (ST.on) studioE(); },
    back() {
      if (ST.on) { if (ST.phase === 'jam' || ST.phase === 'vinyl') studioE(); else leaveStudio(); return true; }
      if (BULB.on) { if (BULB.phase === 'cam') { recCamEl.hidden = true; recUI.classList.remove('is-cam'); BULB.phase = 'app'; BULB.step = -1; } else if (BULB.phase !== 'bye') { recClose(); W.sayDone(); } return true; }
      if (CAR.on) { rideEnd(); return true; }
      if (DRV.on) { driveEnd(); return true; }
      return false;
    },
    key(e) {
      if (ST.on) {
        if (e.code === 'Escape') { if (ST.phase === 'jam' || ST.phase === 'vinyl') studioE(); else leaveStudio(); return true; }
        if (ST.phase === 'vinyl' && !e.repeat) { if (e.code === 'KeyD' || e.code === 'ArrowRight') vinylFlip(1); else if (e.code === 'KeyA' || e.code === 'ArrowLeft') vinylFlip(-1); else if (e.code === 'KeyE' || e.code === 'Enter') studioE(); return true; }
        if ((W.MOVE[e.code] || e.code.startsWith('Shift')) && ST.phase === 'free') held[e.code] = true;
        const i = KEYCODES.indexOf(e.code);
        if (i >= 0 && !e.repeat && playing()) press(i);
        if ((e.code === 'KeyE' || e.code === 'Enter') && !e.repeat) studioE();
        if (e.code === 'KeyR' && !e.repeat && ST.phase === 'app') { const w = tw(); try { const d = w.document, b = d.querySelector('#dRec') || d.querySelector('#dRes'); if (b) b.click(); } catch (er) {} }
        return true;
      }
      if (BULB.on) {
        if (e.code === 'Escape') { this.back(); return true; }
        if ((e.code === 'Space' || e.code === 'Enter') && BULB.phase === 'cam') recShoot();
        return true;
      }
      if (CAR.on) { if (e.code === 'Escape') rideEnd(); return true; }
      if (DRV.on) {                                          // at the wheel
        if (e.code === 'Escape' || ((e.code === 'KeyE' || e.code === 'Enter') && !e.repeat)) { driveEnd(); return true; }
        if (W.MOVE[e.code] || e.code === 'Space') held[e.code] = true;
        return true;
      }
      return false;
    },
    keyUp(e) { held[e.code] = false; },
    near() {
      if (!BULB.done && !BULB.on && TOWER.on === TOWER.plats.length - 1 && BAT.got >= BAT.list.length) return BULB_P;
      if (CAR.loaded && !CAR.on && !DRV.on && player.h < .4 && player.n.angleTo(CAR.dir) * R < 2.9) { CAR_P.verb = done.has('manic') ? 'Drive' : 'Get in'; return CAR_P; }
      return null;
    },
    indoorStep(dt) {
      if (!ST.on) return;
      ST.t += dt;
      const p = inside.pos;
      if (ST.phase === 'enter') {                           // down the stairs, across the rug — to the keys, the first time
        if (follow(dt, 1.9)) {
          if (done.has('trackon')) { ST.phase = 'free'; busy = false; if (!ST.greeted) { ST.greeted = true; W.say('Jaime’s studio! Walk around: the keys still play. The stairs lead back outside.', false); } }
          else { ST.phase = 'brief'; ST.t = 0; hint('Take out the phone'); W.say('Jaime’s studio! The melody is still in his head… quick, before it’s gone. Press E to take out his phone.', true); }
        }
      } else if (ST.phase === 'climb') { if (follow(dt, 1.9)) leaveStudio();
      } else if (ST.phase === 'brief') { player.speed = 0; inside.fwd.lerp(v1.set(0, 0, -1), 1 - Math.pow(.01, dt)).normalize(); }
      else if (ST.phase === 'pull') { player.speed = 0; inside.fwd.lerp(v1.set(0, 0, -1), 1 - Math.pow(.01, dt)).normalize(); if (ST.t > 3.5) phoneUp(); }
      else if (ST.phase === 'app') { player.speed = 0; if (W.time > pollAt) { pollAt = W.time + .25; studioPoll(); } }
      else if (ST.phase === 'sit') { if (goTo(SPOT.x, SPOT.z, dt, 1.75)) { ST.phase = 'jam'; stUI.classList.add('is-on'); hint('Stop playing'); } }
      else if (ST.phase === 'jam') { player.speed = 0; inside.fwd.lerp(v1.set(0, 0, -1), 1 - Math.pow(.01, dt)).normalize(); }
      else if (ST.phase === 'dig') { if (goTo(RECORDS.x, RECORDS.z, dt, 1.75)) { ST.phase = 'vinyl'; ST.vinyl = 0; vinylShow(); stVinyl.hidden = false; requestAnimationFrame(() => stUI.classList.add('is-vinyl')); if (!ST.dug) { ST.dug = true; W.say('Jaime’s records! These are what he listens to. The covers are on their way: for now, flip through the sleeves.', false); } } }
      else if (ST.phase === 'vinyl') { player.speed = 0; inside.fwd.lerp(v1.set(-.25, 0, -1).normalize(), 1 - Math.pow(.01, dt)).normalize(); }
      else if (ST.phase === 'free') {
        roam(dt);
        ST.nearRec = Math.hypot(p.x - RECORDS.x, p.z - RECORDS.z) < .8; ST.nearKb = !ST.nearRec && Math.hypot(p.x - SPOT.x, p.z - SPOT.z) < 1.0; ST.nearSt = Math.hypot(p.x - STAIRS[0][0], p.z - STAIRS[0][1] - .35) < 1;
        hint(ST.nearRec ? 'Look through the records' : ST.nearKb ? 'Play the keys' : ST.nearSt ? 'Go back up' : '');
        if (p.x > 1.2 && p.z < -.47) climb();              // a foot on the first step: up he goes, and outside again
      }
    },
    pose(dt) {
      if (ST.on && bones.LeftArm) {
        me.updateMatrixWorld(true);
        if (ST.phase === 'pull') {                           // the phone: out of his pocket, up before his eyes, then set down on the keyboard
          const a = sst(0, .7, ST.t), b = sst(2.3, 3.2, ST.t);
          v3.copy(STUDIO).add(inside.pos);
          v1.copy(v3).add(v2.set(.16, 1.12, -.34));          // before his chest
          v1.lerp(v2.copy(STUDIO).add(v4.set(KB.x + .46, .93, KB.z - .04)), b);      // …then down to the keyboard's corner
          v1.lerp(v2.copy(v3).add(v4.set(.24, .78, -.05)), 1 - a);                   // (it starts at his pocket)
          W.reachArm('Right', v1, v2.set(.7, -.6, .35));
          phone.visible = ST.t > .25;
          phone.position.copy(v1).sub(STUDIO); phone.position.y += .05 * (1 - b);
          phone.rotation.set(-.35 * (1 - b) - Math.PI / 2 * b, 0, .12 * b);
        } else if (playing()) {                              // his hands on the keys: each goes to the key it plays, and down on it
          [0, 1].forEach((side) => {
            ST.hand[side] = Math.max(0, ST.hand[side] - dt * 5);
            const i = ST.key[side] >= 0 ? ST.key[side] : (side ? 5 : 2), dip = Math.sin(Math.min(1, ST.hand[side]) * Math.PI) * .035;
            v1.copy(STUDIO).add(v2.set(KEYX(i), KEYY + .075 - dip, KEYZ + .1));
            W.reachArm(side ? 'Right' : 'Left', v1, v2.set(side ? .6 : -.6, -.7, .4));
          });
          if (ST.phase === 'app') { phone.visible = true; phone.position.set(KB.x + .46, .93, KB.z - .04); phone.rotation.set(-Math.PI / 2, 0, .12); }
        }
      }
      if (BULB.on && bones.LeftArm) {                        // the batteries in his left hand, held out; his phone in his right: read at his chest, and raised over them for the photograph
        me.updateMatrixWorld(true);
        const G = R + player.dip + player.h, n = player.n, f = player.fwd, a = BULB.phase === 'out' ? sst(.15, 1.25, BULB.t) : 1;
        v4.crossVectors(n, f).normalize();                  // his left
        BULB.shoot += ((BULB.phase === 'cam' || BULB.phase === 'dev' ? 1 : 0) - BULB.shoot) * (1 - Math.pow(.02, dt));
        const sh = BULB.shoot * BULB.shoot * (3 - 2 * BULB.shoot);
        v1.copy(n).multiplyScalar(G + mix(1.0, .98, sh)).addScaledVector(f, .33).addScaledVector(v4, mix(.15, .09, sh));
        v2.copy(n).multiplyScalar(G + .78).addScaledVector(v4, .26).addScaledVector(f, .04); v1.lerp(v2, 1 - a);
        W.reachArm('Left', v1, v2.copy(v4).multiplyScalar(.6).addScaledVector(n, -.7).addScaledVector(f, -.4));
        v1.copy(n).multiplyScalar(G + mix(1.17, 1.36, sh)).addScaledVector(f, mix(.31, .36, sh)).addScaledVector(v4, mix(-.17, .03, sh));
        v2.copy(n).multiplyScalar(G + .78).addScaledVector(v4, -.26).addScaledVector(f, .04); v1.lerp(v2, 1 - a);
        W.reachArm('Right', v1, v2.copy(v4).multiplyScalar(-.7).addScaledVector(n, -.6).addScaledVector(f, -.35));
        if (W.turnBone && bones.Head) W.turnBone(bones.Head, v4, .3 * a);      // he looks down at it
        me.updateMatrixWorld(true);
        bones.LeftHand.getWorldPosition(v1); BAT.pile.position.copy(v1).addScaledVector(n, .035).addScaledVector(f, .06); BAT.pile.quaternion.setFromUnitVectors(UP, n);
        bones.RightHand.getWorldPosition(v2); BULB.phone.position.copy(v2).addScaledVector(n, .085).addScaledVector(f, .05);
        /* the phone: its glass toward his face while he reads; turned down over the batteries, its back to them, for the photograph */
        const zr = v1.copy(f).multiplyScalar(-.78).addScaledVector(n, .62).normalize(), yr = v3.copy(n).multiplyScalar(.78).addScaledVector(f, .62).normalize();
        mA.makeBasis(v2.crossVectors(yr, zr).normalize(), yr, zr); qA.setFromRotationMatrix(mA);
        BAT.pile.getWorldPosition(v1); const zs = v1.sub(BULB.phone.position).negate().normalize(), ys = v3.copy(f).addScaledVector(zs, -f.dot(zs)).normalize();
        mA.makeBasis(v2.crossVectors(ys, zs).normalize(), ys, zs); qB.setFromRotationMatrix(mA);
        BULB.phone.quaternion.copy(qA).slerp(qB, sh);
      }
    },
    camera(camera, dt) {
      if (DRV.on) {                                          // at the wheel: the eye rides behind the car, and swings round a moment after it turns
        const G = land.ground(DRV.n) + DRV.h, tall = camera.aspect < 1 ? 1.25 : 1;
        DRV.fs.lerp(DRV.f, 1 - Math.pow(.03, dt)); DRV.fs.addScaledVector(DRV.n, -DRV.fs.dot(DRV.n)).normalize();
        const back = (6.0 + Math.abs(DRV.v) * .2 + DRV.h * .45) * tall, up = 2.4 + DRV.h * .75 + Math.abs(DRV.v) * .05;      // the higher it flies, the higher the eye rides over it, and the more it looks down: the car over its planet, never the car alone in the sky
        v1.copy(DRV.n).multiplyScalar(G + up).addScaledVector(DRV.fs, -back);
        const rl = v1.length(); v2.copy(v1).divideScalar(rl); const floor = land.hull(v2) + .55; if (rl < floor) v1.multiplyScalar(floor / rl);      // never inside a crown or a roof
        if (!DRV.camSet) { DRV.cp.copy(camera.position); DRV.camSet = true; }
        DRV.cp.lerp(v1, 1 - Math.pow(.003, dt));
        camera.position.copy(DRV.cp); camera.up.copy(DRV.n); camera.lookAt(v3.copy(DRV.n).multiplyScalar(G + .75 - DRV.h * .55).addScaledVector(DRV.f, 1.5 + DRV.h * .1));
        camera.fov = (camera.aspect < 1 ? 62 : 50) + Math.abs(DRV.v) * .55;
        return;
      }
      if (ST.on && inside.on) {
        ST.vinK += ((ST.phase === 'vinyl' || ST.phase === 'dig' ? 1 : 0) - ST.vinK) * (1 - Math.pow(.03, dt));
        const close = ST.phase === 'brief' || ST.phase === 'pull' || ST.phase === 'app' || ST.phase === 'jam' || ST.phase === 'sit' || (ST.phase === 'enter' && ST.path && ST.path.i >= STAIRS.length - 1 && !done.has('trackon')) ? 1 : 0;
        ST.camK += (close - ST.camK) * (1 - Math.pow(.03, dt)); ST.phK += ((ST.phase === 'app' ? 1 : 0) - ST.phK) * (1 - Math.pow(.03, dt));
        const k = ST.camK * ST.camK * (3 - 2 * ST.camK), tall = camera.aspect < 1 ? 1.35 : 1, p = inside.pos;
        v1.set(5.3 * tall, 4.5 * tall, 7.9 * tall).lerp(v2.set(KB.x + 2.3 - ST.phK * .45, 1.9, KB.z + 3.1), k);
        v3.set(-.25 + p.x * .3, .95 + p.y * .5, .7 + p.z * .3).lerp(v2.set(KB.x + .35 + ST.phK * .8, 1.02, KB.z - .1), k);
        if (ST.vinK > .002) { const kv = ST.vinK * ST.vinK * (3 - 2 * ST.vinK); v1.lerp(v2.set(RECORDS.x + 2.5, 2.0, RECORDS.z + 3.0), kv); v3.lerp(v2.set(RECORDS.x + .5, 1.05, RECORDS.z - .5), kv); }      // at the records: nearer, the desk before the eye
        camera.position.copy(STUDIO).add(v1); camera.up.set(0, 1, 0); camera.lookAt(v2.copy(STUDIO).add(v3));
        camera.fov = mix(camera.aspect < 1 ? 58 : 40, camera.aspect < 1 ? 64 : 46, k);
        return;
      }
      if (BULB.on || BULB.k > 0) {                         // pass 77: he is seen doing it — in the left third of the picture, turned toward the app that stands on its right
        BULB.k = clamp(BULB.k + (BULB.on && BULB.phase !== 'bye' ? dt / 1.0 : -dt / .7), 0, 1);
        const k = BULB.k * BULB.k * (3 - 2 * BULB.k), G = R + player.dip + player.h, n = player.n, f = player.fwd, tall = camera.aspect < 1;
        v4.crossVectors(n, f).normalize();                  // his left
        v1.copy(n).multiplyScalar(G + 1.1);                 // his chest
        v2.copy(v1).addScaledVector(f, tall ? 3.4 : 2.5).addScaledVector(v4, tall ? -.5 : -.85).addScaledVector(n, tall ? .75 : .2);      // the eye: before him, a little to his right
        eye.position.copy(v2); eye.up.copy(n);
        v3.copy(v1).sub(v2).normalize(); v3.cross(n).normalize();      // the picture's right
        eye.lookAt(v1.addScaledVector(v3, tall ? 0 : .78).addScaledVector(n, tall ? -.65 : -.04));      // looked at beside him: he stands on the left (on a phone held upright: in the upper half)
        camera.position.lerp(eye.position, k); camera.quaternion.slerp(eye.quaternion, k); camera.fov = mix(camera.fov, 35, k);
      }
    },
    eviAt(v) {
      if (ST.on && inside.on) v.copy(STUDIO).add(inside.pos).add(v1.set(-.75, 1.55 + .05 * Math.sin(W.time * 2.1), -.35));
      else if (DRV.on) v.copy(DRV.n).multiplyScalar(land.ground(DRV.n) + DRV.h + 1.5 + .05 * Math.sin(W.time * 2.1)).addScaledVector(v1.crossVectors(DRV.n, DRV.f).normalize(), .95);      // she rides beside it
    },
    after() {
      if (BULB.on && BULB.phase === 'cam' && (BULB.tick++ & 1) === 0) recLiveDraw();      // his phone's screen, every other frame
      if (shotReq) { shotReq = false; recShot(); }
    },
    step(dt, t) {
      if (W.mode !== 'walk') return;
      if (loadAt && t > loadAt) { loadAt = 0; carLoad(); roomLoad(); }
      /* the batteries turn on their stones; walking up to one takes it */
      for (let i = 0; i < BAT.list.length; i++) {
        const b = BAT.list[i]; if (b.got >= 1) continue;
        b.t += dt; b.cell.rotation.y = b.t * 1.5; b.cell.position.y = .06 * Math.sin(b.t * 2.1);
        if (b.got > 0) { b.got = Math.min(1, b.got + dt * 3.2); b.g.scale.setScalar(1 + b.got * .8); b.cell.position.y += b.got * .6; b.gl.material.uniforms.k.value = 1 - b.got; if (b.got >= 1) b.g.visible = false; continue; }
        if (!inside.on && player.n.dot(b.dir) > .99) {
          v1.copy(player.n).multiplyScalar(R + player.dip + player.h + .7);
          if (v1.distanceTo(v2.copy(b.dir).multiplyScalar(b.r + .5)) < .95) {
            b.got = .001; BAT.got++; W.gemChime(false); hud();
            if (BAT.got === BAT.list.length) W.say('That’s every battery! Now take out your phone: press E.', false);
            else if (BAT.got === 1) W.say('A battery! Keep it: we’ll recycle them all at the top. There are more on the way up.', false);
          }
        }
      }
      BULB.t += dt;
      if (BULB.on && BULB.phase === 'out' && BULB.t > 1.6) { BULB.phase = 'app'; BULB.t = 0; }
      if (BULB.on && BULB.phase === 'app' && t > pollAt) { pollAt = t + .25; recPoll(); }
      if (BULB.burst) {                                    // what was recycled has gone to gems: they leap up and are gone
        BULB.bt += dt;
        BULB.burst.forEach((m) => { m.position.addScaledVector(m.userData.v, dt); m.userData.v.addScaledVector(player.n, -6 * dt); m.rotation.y += dt * 6; m.scale.setScalar(Math.max(.001, .4 * (1 - BULB.bt / 1.3))); });
        if (BULB.bt > 1.3) { BULB.burst.forEach((m) => scene.remove(m)); BULB.burst = null; BULB.bt = 0; }
      }
      if (BULB.on && BULB.phase === 'bye' && BULB.t > 1.4) { recClose(); complete('recyco'); }
      if (CAR.on && CAR.phase !== 'out') rideStep(dt);
      if (DRV.on) driveStep(dt);
      if (CAR.lamp && CAR.loaded) CAR.lamp.intensity = 4.6 + Math.sin(t * 2) * .5;
      if (CAR.beacon) CAR.beacon.material.uniforms.k.value = (current() === 'manic' ? 1 : .35) * (.85 + .15 * Math.sin(t * 2.4));
    }
  };
}
