/* ============================================================
   To ULJO — the small shooter, seen from the cockpit (pass 68)
   The same game as the 2D one (game.js, kept as play-2d.html): the story
   → how to play → the mission → 20 seconds of space-ghosts and asteroids,
   five hearts → ULJO comes up ahead → home. Only now you sit in the ship.
   Pass 75: W A S D fly the ship up, left, down and right through a lit corridor
   (so that moving is seen to be moving), the far worlds are Meshy's, the story
   is centred at the top, "Game over" for "Lost in space", no ghost count.

   The space-ghost is the 2D sprite made 3D by Meshy (tools/blender/
   build_ghost.py → assets/models/ghost.glb); the planet at the end is the
   real one (planet.glb). Rocks, stars, cockpit and lasers are made here.
   play.html?mute keeps it silent; window.__ship is for checking.
   ============================================================ */
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { DRACOLoader } from '../vendor/DRACOLoader.js';

const $ = (id) => document.getElementById(id);
const ui = { story: $('story'), go: $('go'), clock: $('clock'), hud: $('hud'), kills: $('kills'), evi: $('evi'), lost: $('lost'), fade: $('fade'), hearts: $('hearts'), aim: $('aim'), hurt: $('hurt') };
const canvas = $('c');
const MUTE = /[?&]mute\b/.test(location.search) || (() => { try { return localStorage.getItem('uljo-sound') === 'off'; } catch (e) { return false; } })();      // (pass 78: or the sound was turned off on the home page)
const TOUCH = matchMedia('(pointer: coarse)').matches;
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = THREE.MathUtils.clamp;

/* ---------- the picture ---------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x060a1e, .0028);
const camera = new THREE.PerspectiveCamera(64, 16 / 9, .05, 3000);
scene.add(camera);
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 86 : 64; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();

scene.add(new THREE.HemisphereLight(0x8fb4ff, 0x1c1238, 1.25));
const sun = new THREE.DirectionalLight(0xffe2c4, 2.4); sun.position.set(-.6, .55, .6); scene.add(sun);

/* the sky: night, with clouds of violet and teal (the same sky as the planet's) */
const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 20), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: `varying vec3 vDir;
    float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
    float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
      return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
    float fbm(vec3 p){ return .5 * n3(p) + .25 * n3(p * 2.1 + 3.) + .125 * n3(p * 4.3 + 7.) + .0625 * n3(p * 8.7 + 11.); }
    void main(){ vec3 d = normalize(vDir);
      vec3 col = mix(vec3(.012,.018,.07), vec3(.02,.05,.14), smoothstep(-.4, .6, d.y));
      float nb = fbm(d * 2.4 + 4.), nb2 = fbm(d * 5. - 2.);
      col += mix(vec3(.32,.08,.55), vec3(.05,.36,.52), smoothstep(.35, .7, nb2)) * pow(smoothstep(.38, .8, nb), 1.5) * .55;
      gl_FragColor = vec4(col, 1.); }`
}));
sky.renderOrder = -10; scene.add(sky);

/* stars streaming past: short lines, longer the faster we go */
const NS = 1300, starPos = new Float32Array(NS * 6), starCol = new Float32Array(NS * 6), starSeed = [];
for (let i = 0; i < NS; i++) {
  const s = { x: rnd(-170, 170), y: rnd(-100, 100), z: rnd(-520, 30), k: rnd(.5, 1.5) }; starSeed.push(s);
  const c = new THREE.Color().setHSL(rnd(.52, .72), rnd(.2, .9), rnd(.6, .95));
  starCol.set([c.r, c.g, c.b, c.r * .1, c.g * .1, c.b * .1], i * 6);
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3)); starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
const stars = new THREE.LineSegments(starGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
stars.frustumCulled = false; scene.add(stars);

/* far worlds drifting by: banded, like the little planets of the 2D game */
function banded(base, band, light) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 32; const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 64, 32);
  for (let i = 0; i < 9; i++) { x.fillStyle = i % 3 ? band : light; x.globalAlpha = rnd(.25, .7); x.fillRect(0, rnd(0, 32), 64, rnd(1, 4)); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; return t;
}
const worlds = [['#2aa39a', '#1f7f79', '#5fd1c5'], ['#b5622e', '#8e4a22', '#e0895a'], ['#5e4b9e', '#4a3a82', '#9a86d8'], ['#c94a6b', '#a13856', '#f08aa5'], ['#3f7fd6', '#2f62ad', '#8db8f2']].map((c, i) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshStandardMaterial({ map: banded(c[0], c[1], c[2]), roughness: 1, fog: false }));
  m.userData = { r: rnd(26, 70), v: rnd(5, 11) }; m.scale.setScalar(m.userData.r);
  m.position.set((i % 2 ? 1 : -1) * rnd(120, 420), rnd(-160, 180), -500 - i * 330); m.rotation.z = rnd(-.5, .5); scene.add(m); return m;
});
/* pass 75: three planets made in Meshy — a ringed giant, an ocean world, a crystal world — take the place of the
   banded balls as soon as they are here (tools/blender/reduce_glb.py → assets/models/planet-*.glb) */
{
  const draco = new DRACOLoader().setDecoderPath(new URL('../vendor/draco/', import.meta.url).href);
  Promise.all(['ring', 'ocean', 'crystal'].map((n) => new GLTFLoader().setDRACOLoader(draco).loadAsync(new URL('../models/planet-' + n + '.glb?v=1', import.meta.url).href))).then((files) => {
    draco.dispose();
    worlds.forEach((w, i) => {
      const src = files[i % files.length].scene.clone(true), holder = new THREE.Group();
      src.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.fog = false; m.material.metalness = 0; m.material.roughness = .75; m.material.emissiveMap = m.material.map; m.material.emissive = new THREE.Color(.3, .3, .34); } });
      src.position.y = -.5; holder.add(src);                // the models stand on their base: turn them about their middle
      const air = glow([0xff9fd0, 0x6fd6ff, 0x9a7dff][i % 3], 2.5); air.material.opacity = .33; holder.add(air);
      holder.userData = w.userData; holder.scale.setScalar(w.userData.r * 1.9); holder.position.copy(w.position); holder.rotation.set(rnd(-.3, .3), rnd(0, 6), rnd(-.35, .35));
      scene.remove(w); scene.add(holder); worlds[i] = holder;
    });
  }).catch((e) => { draco.dispose(); console.warn('[ship] no planets', e); });
}

/* ---------- soft lights: one picture for every glow ---------- */
const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const glow = (color, size) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); s.scale.setScalar(size); return s; };

/* ---------- the cockpit: it is fixed to the eye ---------- */
const cockpit = new THREE.Group(); camera.add(cockpit);
const metal = new THREE.MeshStandardMaterial({ color: 0x2a3454, roughness: .6, metalness: .35, emissive: 0x070a16 });
const dark = new THREE.MeshStandardMaterial({ color: 0x141a2e, roughness: .8, metalness: .2 });
const lit = (hex, k = 1.6) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), fog: false });
const box = (w, h, d, mat, x, y, z, rx = 0, rz = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); cockpit.add(m); return m; };
const dash = box(3.9, .5, 1.0, metal, 0, -.87, -1.05, .6);                       // the dashboard: a console tipped toward the eye
const on = (w, h, d, mat, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, .25 + h / 2, z); dash.add(m); return m; };
on(3.9, .012, .02, lit(0x4a9bd3, .9), 0, -.49);                                  // a thin line of light along its far edge
on(.62, .02, .5, dark, 0, -.3);                                                 // the plate the scope sits on
[-1, 1].forEach((sg) => {
  box(.07, 2.7, .07, metal, sg * 1.36, .34, -1.3, 0, sg * -.5);                 // the canopy's two spars
  on(.5, .02, .34, dark, sg * 1.02, -.3);                                        // side plates, with their small lights
  on(.22, .012, .03, lit(sg < 0 ? 0xff9a4a : 0x7fd6ff, 1.1), sg * 1.02, -.38);
  on(.07, .012, .03, lit(0x9dffb0, 1.1), sg * .9, -.24); on(.07, .012, .03, lit(0xff5a6e, 1.1), sg * 1.14, -.24);
});
box(2.3, .05, .05, metal, 0, 1.22, -1.3);                                       // the spar overhead
/* the scope: the ghosts and the rocks ahead, as dots */
const scopeC = document.createElement('canvas'); scopeC.width = scopeC.height = 128; const scopeX = scopeC.getContext('2d');
const scopeT = new THREE.CanvasTexture(scopeC); scopeT.colorSpace = THREE.SRGBColorSpace;
const scope = new THREE.Mesh(new THREE.CircleGeometry(.2, 40), new THREE.MeshBasicMaterial({ map: scopeT, fog: false }));
scope.position.set(0, .275, -.31); scope.rotation.x = -Math.PI / 2; dash.add(scope);
/* the guns, low at each side */
const guns = [-1, 1].map((sg) => {
  const g = new THREE.Mesh(new THREE.CylinderGeometry(.045, .06, .9, 12).rotateX(Math.PI / 2), metal); g.position.set(sg * 1.5, -.5, -1.75); cockpit.add(g);
  const f = glow(0x7fd6ff, .01); f.position.set(sg * 1.5, -.5, -2.22); cockpit.add(f); g.userData.flash = f; return g;
});
/* Evi rides on the dashboard */
const evi = new THREE.Group(); evi.position.set(.78, -.4, -1.12); cockpit.add(evi);
evi.add(glow(0x6cc6ff, .34), glow(0xffffff, .09));
const eviLight = new THREE.PointLight(0x6cc6ff, 1.4, 3, 1.6); evi.add(eviLight);

/* ---------- models ---------- */
let ghostSrc = null, uljo = null;
const loader = new GLTFLoader();
loader.loadAsync(new URL('../models/ghost.glb?v=1', import.meta.url).href).then((g) => {
  ghostSrc = g.scene; ghostSrc.traverse((m) => { if (m.isMesh) { m.material.metalness = 0; m.material.roughness = .65; m.material.emissiveMap = m.material.map; m.material.emissive = new THREE.Color(.16, .16, .2); } });
}).catch((e) => console.warn('[ship] no ghost model', e));
{                                                         // the planet itself, for the end (it is already in the cache when you come from the portal)
  const draco = new DRACOLoader().setDecoderPath(new URL('../vendor/draco/', import.meta.url).href);
  new GLTFLoader().setDRACOLoader(draco).loadAsync(new URL('../models/planet.glb?v=8', import.meta.url).href).then((g) => {
    uljo = g.scene; uljo.traverse((m) => { if (m.isMesh) { m.material.side = THREE.FrontSide; m.material.metalness = 0; m.material.roughness = .9; m.material.fog = false; m.material.emissiveMap = m.material.map; m.material.emissive = new THREE.Color(.22, .22, .26); m.frustumCulled = false; } });
    draco.dispose();
  }).catch(() => { draco.dispose(); });
}
function world() {                                        // ULJO: the real one, or a green ball if it has not come down the wire
  const g = new THREE.Group();
  if (uljo) { g.add(uljo); uljo.position.set(-.9, -1.4, .05); }
  else g.add(new THREE.Mesh(new THREE.SphereGeometry(9.5, 48, 32), new THREE.MeshStandardMaterial({ map: banded('#3fb35e', '#2f8f49', '#8fe39f'), roughness: 1, fog: false })));
  const air = glow(0x4f9dff, 62); air.material.opacity = .5; g.add(air);
  g.scale.setScalar(2.3); g.visible = false; scene.add(g); return g;
}
/* rocks: three shapes, knocked about */
const rockGeo = [0, 1, 2].map((k) => {
  const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const n = Math.sin(v.x * 3.1 + k * 7) * Math.cos(v.y * 2.7 - k) * .16 + Math.sin(v.z * 5.3 + v.x * 2.1 + k * 3) * .09 + Math.sin(v.y * 7.9 + k) * .05;
    v.multiplyScalar(1 + n); p.setXYZ(i, v.x, v.y * (.82 + .1 * k), v.z);
  }
  g.computeVertexNormals(); return g;
});
const rockMat = new THREE.MeshStandardMaterial({ color: 0x8b8f9e, roughness: .95, flatShading: true });
const boltGeo = new THREE.CylinderGeometry(.07, .07, 1, 8).rotateX(Math.PI / 2);
const blueMat = lit(0x7fd6ff, 2.4), redMat = lit(0xff4b5c, 2.4);

/* ---------- sound: the same small synth as the 2D game ---------- */
let actx = null;
function wake() { if (actx || MUTE) return; try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
function tone(f0, f1, dur, gain, type) {
  if (!actx) return; const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
  o.type = type || 'square'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(.0005, t + dur); o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + .02);
}
function noise(dur, gain, hz) {
  if (!actx) return; const n = Math.floor(actx.sampleRate * dur), b = actx.createBuffer(1, n, actx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain(); s.buffer = b; f.type = 'lowpass'; f.frequency.value = hz; g.gain.value = gain;
  s.connect(f); f.connect(g); g.connect(actx.destination); s.start();
}
const snd = {
  pew: () => tone(920, 380, .09, .035), pop: () => { noise(.18, .08, 900); tone(300, 90, .18, .04, 'triangle'); },
  hit: () => { noise(.25, .12, 300); tone(160, 60, .3, .06, 'sawtooth'); }, step: () => tone(660, 880, .07, .03, 'triangle'),
  arrive: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, f, .18, .05, 'triangle'), i * 120))
};

/* ---------- words, typed out ---------- */
let typing = null;
function typeInto(el, html, done, speed) {
  if (typing) { clearTimeout(typing); typing = null; }
  el.innerHTML = html; el.hidden = false;
  const nodes = []; (function walk(n) { for (let i = 0; i < n.childNodes.length; i++) { const c = n.childNodes[i]; if (c.nodeType === 3) nodes.push({ n: c, s: c.nodeValue }); else walk(c); } })(el);
  nodes.forEach((o) => { o.n.nodeValue = ''; });
  const caret = document.createElement('span'); caret.className = 'caret'; let k = 0, i = 0;
  (function step() {
    if (k >= nodes.length) { caret.remove(); typing = null; if (done) done(); return; }
    const o = nodes[k]; o.n.nodeValue = o.s.slice(0, ++i); o.n.parentNode.insertBefore(caret, o.n.nextSibling);
    if (i >= o.s.length) { k++; i = 0; }
    typing = setTimeout(step, speed);
  })();
  return function skip() { if (!typing) return; clearTimeout(typing); typing = null; nodes.forEach((o) => { o.n.nodeValue = o.s; }); caret.remove(); if (done) done(); };
}
const PRESS = TOUCH ? 'Tap' : 'Press space';
const STORY = '<p>You entered the portal that goes back in time. It’s the year 2026. Earth has developed a medicine that lets humans live forever. With the newest Personal Spaceships, people are free to travel wherever they please. Jaime and Evi decided to take an uncharted route to ULJO, a distant planet few have ever visited. Rumor has it that the people there spend all of eternity doing just one thing:</p><p class="fire">sit around the Fire.</p>';
/* pass 77: how to play and the mission are one screen now, and a button takes you on (it was "Press space to continue") */
const HOWTO = (TOUCH
  ? '<h2>How to play</h2><div class="keys"><p>Drag to steer the ship.</p><p>Hold to fire the blue lasers.</p><p>The goal is to not be hit by asteroids and the ghost’s lasers. You have five hearts. But don’t worry, even if you die, your soul lives forever. Good luck.</p></div>'
  : '<h2>How to play</h2><div class="keys"><p><kbd>W</kbd> up &nbsp; <kbd>A</kbd> left &nbsp; <kbd>S</kbd> down &nbsp; <kbd>D</kbd> right: fly the ship.</p><p><kbd>space</kbd> fire the blue lasers.</p><p>The goal is to not be hit by asteroids and the ghost’s lasers. You have five hearts. But don’t worry, even if you die, your soul lives forever. Good luck.</p></div>')
  + '<h2 class="mis">Mission</h2><p class="mis__line">Reach Planet ULJO 34 without dying.</p>';

/* ---------- the game ---------- */
let mode = 'story', skip = null, ready = false, S = null, keys = {}, dt = 0, time = 0;
const pool = { ghosts: [], rocks: [], shots: [], reds: [] };
const AREA = { x: 16, y: 8.5 };                             // pass 75: room to fly in (it was 10 × 5.6: a sidestep, not a flight)
/* the corridor: rounded gates of light coming at you, fixed in space — against them the ship is seen to move */
const gateGeo = (() => { const pts = [], w = AREA.x + 4, h = AREA.y + 3.5, r = 4; for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2, cx = Math.cos(a), sy = Math.sin(a); pts.push(new THREE.Vector3(Math.sign(cx) * (w - r) + cx * r, Math.sign(sy) * (h - r) + sy * r, 0)); } return new THREE.BufferGeometry().setFromPoints(pts); })();
const gates = Array.from({ length: 9 }, (_, i) => { const m = new THREE.LineLoop(gateGeo, new THREE.LineBasicMaterial({ color: 0x5fb8ff, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); m.position.z = -i * 50; scene.add(m); return m; });
/* and dust close by, streaming past: the nearer a thing, the more it slides when you turn */
const ND = 260, dustPos = new Float32Array(ND * 3), dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
for (let i = 0; i < ND; i++) dustPos.set([rnd(-46, 46), rnd(-28, 28), rnd(-150, 10)], i * 3);
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: .22, color: 0xbfe6ff, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); dust.frustumCulled = false; scene.add(dust);
function clear() { ['ghosts', 'rocks', 'shots', 'reds'].forEach((k) => { pool[k].forEach((o) => scene.remove(o.obj)); pool[k] = []; }); }
function reset() {
  clear();
  S = { t: 20, kills: 0, hearts: 5, blink: 0, shake: 0, cool: 0, x: 0, y: 0, vx: 0, vy: 0, spawnG: .6, spawnR: 1.2, speed: 1, tx: null, evi: 0, planet: S && S.planet };
  if (S.planet) S.planet.visible = false;
  ui.kills.textContent = '0'; hearts();
}
function hearts() { [...ui.hearts.children].forEach((h, i) => h.classList.toggle('is-gone', i >= S.hearts)); }
function goLabel(t) { const sp = ui.go.querySelector('span'); if (sp) sp.textContent = t; else ui.go.textContent = t; }
function screen(html) { ready = false; ui.go.hidden = true; skip = typeInto(ui.story, html, () => { ready = true; ui.go.hidden = false; skip = null; }, 22); }
function advance() {
  if (skip) { skip(); return; }
  if (!ready) return;
  snd.step();
  if (mode === 'story') { mode = 'howto'; screen(HOWTO); goLabel('Launch'); }
  else if (mode === 'howto') startPlay();
}
function startPlay() { ui.story.hidden = true; ui.go.hidden = true; [ui.clock, ui.hearts, ui.aim].forEach((e) => { e.hidden = false; }); mode = 'play'; }      // (pass 75: no ghost count)

function spawnGhost() {
  if (!ghostSrc) return;
  const obj = ghostSrc.clone(true); let mat = null;
  obj.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); mat = m.material; } });
  const s = rnd(1.25, 1.6); obj.scale.setScalar(s); obj.position.set(clamp(S.x + rnd(-11, 11), -AREA.x - 1, AREA.x + 1), clamp(S.y + rnd(-6, 6), -AREA.y, AREA.y), -200);      // they come where you are: the corridor is wide now
  scene.add(obj); pool.ghosts.push({ obj, mat, v: rnd(26, 36), t: rnd(0, 6), aim: rnd(1.2, 2.6), mad: 0, r: 1.15 * s, y0: obj.position.y });
}
function spawnRock() {
  const r = rnd(1.4, 3.1), obj = new THREE.Mesh(rockGeo[Math.floor(rnd(0, 3))], rockMat); obj.scale.setScalar(r);
  obj.position.set(clamp(S.x + rnd(-13, 13), -AREA.x - 2, AREA.x + 2), clamp(S.y + rnd(-7, 7), -AREA.y - 1, AREA.y + 1), -210); obj.rotation.set(rnd(0, 6), rnd(0, 6), 0);
  scene.add(obj); pool.rocks.push({ obj, v: rnd(34, 52), dx: rnd(-1.2, 1.2), dy: rnd(-.8, .8), r, ax: V(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize(), w: rnd(.3, 1.3) });
}
function bolt(mat, color, len) { const g = new THREE.Group(), m = new THREE.Mesh(boltGeo, mat); m.scale.z = len; g.add(m, glow(color, .9)); scene.add(g); return g; }
function fire() {
  S.cool = .17; snd.pew();
  [-1, 1].forEach((sg, i) => {
    const obj = bolt(blueMat, 0x4a9bd3, 3.2); obj.position.set(S.x + sg * 1.5, S.y - .5, -2.2);
    pool.shots.push({ obj, x: S.x, y: S.y, z: -2, sg, pair: i });
    guns[i].userData.flash.scale.setScalar(.5);
  });
}
/* small bright bits, when something bursts */
const NB = 260, bitPos = new Float32Array(NB * 3), bitCol = new Float32Array(NB * 3), bits = [];
const bitGeo = new THREE.BufferGeometry(); bitGeo.setAttribute('position', new THREE.BufferAttribute(bitPos, 3)); bitGeo.setAttribute('color', new THREE.BufferAttribute(bitCol, 3));
const bitPts = new THREE.Points(bitGeo, new THREE.PointsMaterial({ size: .5, map: glowTex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
bitPts.frustumCulled = false; scene.add(bitPts);
for (let i = 0; i < NB; i++) bits.push({ t: 0, p: V(0, -9999, 0), v: V(0, 0, 0), c: new THREE.Color() });
let bitN = 0;
function burst(p, cols, n, sp) { for (let i = 0; i < n; i++) { const b = bits[bitN++ % NB]; b.t = rnd(.3, .7); b.p.copy(p); b.v.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(2, sp)); b.c.set(cols[i % cols.length]); } }
function hurt() {
  if (S.blink > 0 || mode !== 'play') return;
  S.hearts--; S.blink = 1.8; S.shake = .3; snd.hit(); hearts();
  ui.hurt.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => ui.hurt.classList.remove('on')));
  if (S.hearts <= 0) { mode = 'lost'; ui.lost.hidden = false; [ui.clock, ui.aim].forEach((e) => { e.hidden = true; }); }
}

const tmp = V(0, 0, 0), drag = { on: false, id: -1, x: 0, y: 0 };
function update() {
  const playing = mode === 'play';
  time += dt;
  /* the ship: where the keys or the thumb take it */
  if (playing) {
    S.t -= dt;
    if (S.t <= 0) { S.t = 0; mode = 'arrive'; [ui.clock, ui.hud, ui.aim, ui.hearts].forEach((e) => { e.hidden = true; }); snd.arrive(); if (!S.planet) S.planet = world(); S.planet.visible = true; S.planet.position.set(34, -16, -1500); S.at = 0; }
    ui.clock.textContent = Math.ceil(S.t);
    const sp = 17, ax = ((keys.d || keys.arrowright) ? 1 : 0) - ((keys.a || keys.arrowleft) ? 1 : 0), ay = ((keys.w || keys.arrowup) ? 1 : 0) - ((keys.s || keys.arrowdown) ? 1 : 0);
    let tvx = ax * sp, tvy = ay * sp;
    if (S.tx !== null) { tvx = clamp((S.tx - S.x) * 7, -sp * 1.4, sp * 1.4); tvy = clamp((S.ty - S.y) * 7, -sp * 1.4, sp * 1.4); }
    S.vx += (tvx - S.vx) * Math.min(1, dt * 6.5); S.vy += (tvy - S.vy) * Math.min(1, dt * 6.5);      // it gathers way and carries it: a ship, not a cursor
    S.x = clamp(S.x + S.vx * dt, -AREA.x, AREA.x); S.y = clamp(S.y + S.vy * dt, -AREA.y, AREA.y);
    S.cool -= dt;
    if ((keys[' '] || drag.on) && S.cool <= 0) fire();
    S.spawnG -= dt; if (S.spawnG <= 0) { spawnGhost(); S.spawnG = rnd(.8, 1.4); }
    S.spawnR -= dt; if (S.spawnR <= 0) { spawnRock(); S.spawnR = rnd(1.1, 1.9); }
  } else { S.vx *= Math.pow(.02, dt); S.vy *= Math.pow(.02, dt); if (mode === 'arrive') { S.x += (0 - S.x) * Math.min(1, dt * 1.2); S.y += (0 - S.y) * Math.min(1, dt * 1.2); } }
  if (S.blink > 0) S.blink -= dt;
  if (S.shake > 0) S.shake -= dt;

  /* blue lasers out, red lasers in */
  pool.shots.forEach((b) => { b.z0 = b.z; b.z -= 230 * dt; const f = Math.max(0, 1 + b.z / 230); b.obj.position.set(b.x + b.sg * 1.5 * f, b.y - .5 * f, b.z); });      // from the guns, closing on the line of the sight
  pool.reds.forEach((b) => { b.z0 = b.obj.position.z; b.obj.position.addScaledVector(b.v, dt); });
  /* ghosts drift in, bob, and now and then fire at where you are */
  pool.ghosts.forEach((g) => {
    g.t += dt; g.obj.position.z += g.v * dt; g.obj.position.y = g.y0 + Math.sin(g.t * 2.2) * .9; g.obj.rotation.z = Math.sin(g.t * 1.7) * .12; g.obj.rotation.y = Math.sin(g.t * 1.1) * .2;
    if (g.mad > 0) g.mad -= dt;
    if (g.mat) g.mat.emissive.setRGB(.16 + Math.max(0, g.mad) * 2.6, .16, .2);
    if (playing) {
      g.aim -= dt; const z = g.obj.position.z;
      if (g.aim <= 0 && z > -165 && z < -30) {
        g.aim = rnd(1.6, 3.2); g.mad = .45;
        const obj = bolt(redMat, 0xff3048, 2.6); obj.position.copy(g.obj.position); tmp.set(S.x, S.y, 0).sub(obj.position).normalize();
        obj.lookAt(obj.position.clone().add(tmp)); scene.add(obj); pool.reds.push({ obj, v: tmp.clone().multiplyScalar(74) });
      }
    }
  });
  pool.rocks.forEach((r) => { r.obj.position.z += r.v * dt; r.obj.position.x += r.dx * dt; r.obj.position.y += r.dy * dt; r.obj.rotateOnAxis(r.ax, r.w * dt); });

  /* what hits what */
  pool.shots.forEach((b) => {
    if (b.dead) return;
    for (const g of pool.ghosts) {
      const p = g.obj.position;
      if (!g.dead && b.z0 >= p.z - 1.6 && b.z <= p.z + 1.6 && Math.abs(b.x - p.x) < g.r + 1.05 && Math.abs(b.y - p.y) < g.r + .6) {
        g.dead = true; b.dead = true; pool.shots.forEach((o) => { if (o !== b && o.z === b.z && o.x === b.x) o.dead = true; });
        if (playing) { S.kills++; ui.kills.textContent = S.kills; } snd.pop(); burst(p, ['#c8cfe0', '#a1262f', '#e8a58a', '#7fd6ff'], 26, 14); break;
      }
    }
    if (!b.dead) for (const r of pool.rocks) { const p = r.obj.position; if (b.z0 >= p.z - r.r && b.z <= p.z + r.r && Math.hypot(b.x - p.x, b.y - p.y) < r.r + .5) { b.dead = true; burst(tmp.set(b.x, b.y, p.z + r.r), ['#9aa0b0', '#7fd6ff'], 6, 6); break; } }
  });
  if (playing) {
    pool.reds.forEach((b) => { const p = b.obj.position; if (!b.dead && b.z0 < -.6 && p.z >= -.6) { b.dead = true; if (Math.hypot(p.x - S.x, p.y - S.y) < 1.25) hurt(); } });
    pool.rocks.forEach((r) => { const p = r.obj.position; if (!r.hit && p.z > -1.5 - r.r * .5 && p.z < 1.5 && Math.hypot(p.x - S.x, p.y - S.y) < r.r * .9 + .9) { r.hit = true; hurt(); } });
    pool.ghosts.forEach((g) => { const p = g.obj.position; if (!g.hit && !g.dead && p.z > -2 && p.z < 1.5 && Math.hypot(p.x - S.x, p.y - S.y) < g.r + .9) { g.hit = true; hurt(); } });
  }
  const keep = (k, alive) => { pool[k] = pool[k].filter((o) => { if (alive(o)) return true; scene.remove(o.obj); return false; }); };
  keep('shots', (b) => !b.dead && b.z > -260); keep('reds', (b) => !b.dead && b.obj.position.z < 12);
  keep('ghosts', (g) => !g.dead && g.obj.position.z < 14); keep('rocks', (r) => r.obj.position.z < 16);

  /* the sky moves; faster when the engines push */
  const flow = (mode === 'play' ? 95 : mode === 'arrive' ? 95 * Math.max(.06, 1 - S.at / 4.5) : 26);
  for (let i = 0; i < NS; i++) {
    const s = starSeed[i]; s.z += flow * s.k * dt; if (s.z > 30) { s.z -= 550; s.x = rnd(-170, 170); s.y = rnd(-100, 100); }
    const len = Math.min(9, flow * s.k * .028) + .12; starPos.set([s.x, s.y, s.z, s.x, s.y, s.z - len], i * 6);
  }
  starGeo.attributes.position.needsUpdate = true;
  gates.forEach((g) => { g.position.z += flow * dt; if (g.position.z > 20) g.position.z -= 450; g.material.opacity = (mode === 'play' ? .55 : .2) * clamp(1 + g.position.z / 420, 0, 1) * clamp(-g.position.z / 30 + .9, 0, 1); });
  for (let i = 0; i < ND; i++) { let z = dustPos[i * 3 + 2] + flow * 1.5 * dt; if (z > 10) { z -= 160; dustPos[i * 3] = S.x + rnd(-46, 46); dustPos[i * 3 + 1] = S.y + rnd(-28, 28); } dustPos[i * 3 + 2] = z; }
  dustGeo.attributes.position.needsUpdate = true;
  worlds.forEach((w) => { w.position.z += w.userData.v * (flow / 95) * dt * 4; w.rotation.y += dt * .02; if (w.position.z > 60) { w.position.z = -1700; w.position.x = (Math.random() < .5 ? -1 : 1) * rnd(120, 420); w.position.y = rnd(-160, 180); } });
  for (let i = 0; i < NB; i++) { const b = bits[i]; if (b.t > 0) { b.t -= dt; b.p.addScaledVector(b.v, dt); b.p.z += flow * .2 * dt; } const k = Math.max(0, b.t) * 2.2; bitPos.set([b.p.x, b.t > 0 ? b.p.y : -9999, b.p.z], i * 3); bitCol.set([b.c.r * k, b.c.g * k, b.c.b * k], i * 3); }
  bitGeo.attributes.position.needsUpdate = true; bitGeo.attributes.color.needsUpdate = true;

  /* the arrival: ULJO comes up ahead, the ship settles before it, Evi speaks */
  if (mode === 'arrive') {
    S.at += dt; const k = 1 - Math.pow(1 - clamp(S.at / 5.2, 0, 1), 3);
    S.planet.position.set(34 + (4 - 34) * k, -16 + (4.5 + 16) * k, -1500 + (-78 + 1500) * k); S.planet.rotation.y = -.6 + k * .5 + S.at * .01; S.planet.rotation.x = .5;
    if (k >= 1 && !S.evi) {
      S.evi = 1; ui.evi.hidden = false;
      typeInto(ui.evi, 'Hourraa! We made it Jaime, we made it to the ULJO 34 planet.', () => { setTimeout(() => { mode = 'leave'; ui.fade.classList.remove('from'); ui.fade.classList.add('on'); setTimeout(() => { location.href = 'index.html'; }, 1300); }, 2400); }, 40);
    }
  }

  /* the eye, the cockpit round it, Evi */
  const sh = S.shake > 0 && !calm ? S.shake * .5 : 0;
  camera.position.set(S.x + rnd(-sh, sh), S.y + rnd(-sh, sh), 0);
  camera.rotation.set(S.vy * .0012, -S.vx * .0012, -S.vx * .016);      // wings banked into the turn; the nose barely moves, so the sight stays true
  cockpit.position.set(S.vx * .005, -S.vy * .004, 0); cockpit.rotation.z = S.vx * .005;
  evi.position.y = -.4 + Math.sin(time * 2.1) * .025; eviLight.intensity = 1.3 + Math.sin(time * 3.3) * .25;
  guns.forEach((g) => { const f = g.userData.flash; f.scale.setScalar(Math.max(.01, f.scale.x * Math.pow(.0005, dt))); });
  sky.position.copy(camera.position);
  if (ui.evi && !ui.evi.hidden) { tmp.copy(evi.position).applyMatrix4(cockpit.matrixWorld).project(camera); { const hw = ui.evi.offsetWidth / 2 + 14; ui.evi.style.left = clamp((tmp.x * .5 + .5) * window.innerWidth, hw, window.innerWidth - hw).toFixed(1) + 'px'; }   /* (pass 77: her line is longer now: it stays on the screen) */   ui.evi.style.top = ((.5 - tmp.y * .5) * 100 - 6).toFixed(2) + '%'; }
  /* the scope */
  if (Math.floor(time * 20) !== update.sc) {
    update.sc = Math.floor(time * 20); const x = scopeX;
    x.fillStyle = '#04121c'; x.fillRect(0, 0, 128, 128); x.strokeStyle = 'rgba(90,200,255,.45)'; x.lineWidth = 1.5;
    [20, 40, 60].forEach((r) => { x.beginPath(); x.arc(64, 118, r * 1.6, Math.PI, 2 * Math.PI); x.stroke(); });
    const dot = (p, col, sz) => { const d = -p.z / 200; if (d < 0 || d > 1) return; x.fillStyle = col; x.beginPath(); x.arc(64 + (p.x - S.x) / 14 * 60 * (.4 + d), 118 - d * 100, sz, 0, 7); x.fill(); };
    pool.rocks.forEach((r) => dot(r.obj.position, '#9aa0b0', 3)); pool.ghosts.forEach((g) => dot(g.obj.position, '#ff5a6e', 3.5));
    x.fillStyle = '#7fd6ff'; x.beginPath(); x.moveTo(64, 108); x.lineTo(58, 122); x.lineTo(70, 122); x.fill();
    scopeT.needsUpdate = true;
  }
}

/* ---------- keys, thumbs ---------- */
function press() {
  wake();
  if (mode === 'story' || mode === 'howto') advance();
  else if (mode === 'lost') { ui.lost.hidden = true; reset(); mode = 'play'; [ui.clock, ui.aim].forEach((e) => { e.hidden = false; }); }
}
window.addEventListener('keydown', (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].indexOf(k) >= 0) e.preventDefault();
  if (k === ' ' && !keys[' ']) press();
  if (k === 'enter') press();
  keys[k] = true;
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
window.addEventListener('blur', () => { keys = {}; drag.on = false; });
canvas.addEventListener('pointerdown', (e) => {
  press();
  if (e.pointerType !== 'mouse' && mode === 'play') { drag.on = true; drag.id = e.pointerId; drag.x = e.clientX; drag.y = e.clientY; S.tx = S.x; S.ty = S.y; }
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag.on || e.pointerId !== drag.id) return;
  const k = 26 / Math.min(window.innerWidth, window.innerHeight);
  S.tx = clamp(S.tx + (e.clientX - drag.x) * k, -AREA.x, AREA.x); S.ty = clamp(S.ty - (e.clientY - drag.y) * k, -AREA.y, AREA.y); drag.x = e.clientX; drag.y = e.clientY;
});
const lift = (e) => { if (e.pointerId === drag.id) { drag.on = false; drag.id = -1; if (S) S.tx = null; } };
canvas.addEventListener('pointerup', lift); canvas.addEventListener('pointercancel', lift);

/* ---------- go ---------- */
reset();
goLabel('Play');
ui.go.addEventListener('click', (e) => { e.stopPropagation(); ui.go.blur(); if (e.detail) press(); });      // (a click made by the space bar is the key's own press, already taken)
ui.lost.querySelector('small').textContent = PRESS + ' to try again';
screen(STORY);
let last = performance.now(), held = 0;
function frame(now) {
  dt = held || Math.min(.033, (now - last) / 1000); last = now;
  update(); renderer.render(scene, camera);
}
function loop(now) { frame(now); requestAnimationFrame(loop); }
requestAnimationFrame((t) => { last = t; ui.fade.classList.remove('from'); loop(t); });
window.__ship = {
  get mode() { return mode; }, get S() { return S; }, pool, scene, camera, renderer, advance, press, keys: () => keys,
  step: (n = 1, d = 1 / 60) => { held = d; for (let i = 0; i < n; i++) frame(performance.now()); held = 0; last = performance.now(); },
  skipTo: (m) => { if (m === 'play') { if (typing) { clearTimeout(typing); typing = null; } skip = null; startPlay(); } }
};
