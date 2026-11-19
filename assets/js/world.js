/* ============================================================
   ULJO — the little earth (pass 67: the planet is now the one Jaime
   generated in Meshy — house, lakes, hatch, chair and portal are its
   own; tools/blender/build_planet.py makes it ready for the browser)
   The home hero as a real place: a planet four metres in radius, the
   campsite on top of it — the fire, Jaime with his guitar against the
   big tree, Evi beside him, pines leaning out all round, the dusk behind.

   Pass 60 drew it in fat pixels; this one is smooth. The people and the
   things are modelled in Blender (tools/blender/build_world.py →
   assets/models/world.bin) and lit here like a film set at dusk: an HDR
   frame, soft shadows from the last of the sun and from the fire, the sky
   itself as the ambient light, bloom, filmic tone mapping, a little grain.

   At rest the camera stands where the picture was painted from. Play
   stands him up: third person, the camera behind his shoulder, and the
   whole planet to walk round (WASD / arrows, drag to look, Shift to run,
   Space to hop; a thumb on a phone). Back — or Esc — sits him down again.

   Only three.js itself is loaded (vendored); the model loader, the bloom
   and the tone mapping are written here. window.__world is for checking.
   ============================================================ */
import * as THREE from 'three';                           // mapped to assets/vendor/three.module.min.js in index.html
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { DRACOLoader } from '../vendor/DRACOLoader.js';
import { makeQuests } from './quests.js?v=19';

const hero = document.querySelector('[data-hero]');
const canvas = document.querySelector('[data-world]');
if (hero && canvas) {
  if (/[?&]flat\b/.test(location.search)) fallback();      // index.html?flat — the painted clip, to compare
  else start().catch((err) => { console.warn('[world]', err); fallback(); });
}

/* no WebGL2, no model: the campfire clip plays, as before */
function fallback() {
  if (hero) hero.classList.add('no-world');                // only now may the painted picture be seen (pass 75: it used to flash while the planet loaded)
  const v = document.querySelector('[data-hero-clip]');
  if (!v) return;
  v.addEventListener('playing', () => v.classList.add('is-live'));
  v.muted = true; v.loop = true; v.autoplay = true;
  const src = v.querySelector('source[data-src]');
  if (src) { src.src = src.getAttribute('data-src'); v.load(); }
  const p = v.play(); if (p && p.catch) p.catch(() => {});
}

/* ---------- the models: one file, typed arrays behind a JSON header ---------- */
async function loadModels(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('models: ' + res.status);
  const buf = await res.arrayBuffer();
  const hl = new DataView(buf).getUint32(0, true);
  const head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hl)));
  const base = 4 + hl, geo = {};
  const lin = new Float32Array(256);
  for (let i = 0; i < 256; i++) { const c = i / 255; lin[i] = c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); }
  head.meshes.forEach((m) => {
    const g = new THREE.BufferGeometry(), n = m.n;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buf.slice(base + m.pos, base + m.pos + n * 12)), 3));
    const n8 = new Int8Array(buf, base + m.nor, n * 4), c8 = new Uint8Array(buf, base + m.col, n * 4);
    const nf = new Float32Array(n * 3), cf = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const x = n8[i * 4], y = n8[i * 4 + 1], z = n8[i * 4 + 2], l = Math.hypot(x, y, z) || 1;
      nf[i * 3] = x / l; nf[i * 3 + 1] = y / l; nf[i * 3 + 2] = z / l;
      cf[i * 3] = lin[c8[i * 4]]; cf[i * 3 + 1] = lin[c8[i * 4 + 1]]; cf[i * 3 + 2] = lin[c8[i * 4 + 2]];
    }
    g.setAttribute('normal', new THREE.BufferAttribute(nf, 3));
    g.setAttribute('color', new THREE.BufferAttribute(cf, 3));
    const ib = buf.slice(base + m.idx, base + m.idx + m.ni * (m.i32 ? 4 : 2));
    g.setIndex(new THREE.BufferAttribute(m.i32 ? new Uint32Array(ib) : new Uint16Array(ib), 1));
    if (m.ji !== undefined) {
      g.setAttribute('skinIndex', new THREE.BufferAttribute(Uint16Array.from(new Uint8Array(buf, base + m.ji, n * 4)), 4));
      g.setAttribute('skinWeight', new THREE.BufferAttribute(Float32Array.from(new Uint8Array(buf, base + m.jw, n * 4), (v) => v / 255), 4));
    }
    g.computeBoundingSphere(); g.computeBoundingBox();
    geo[m.name] = g;
  });
  return { geo, head };
}

async function start() {
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lite = window.matchMedia('(pointer: coarse)').matches || Math.min(window.screen.width, window.screen.height) < 700;
  /* pass 80: while the logo writes itself, nothing heavy happens here: the files are fetched (that is off the page's thread),
     but nothing is parsed, built or compiled until the intro is over (it froze half-way, at 0.9 s) */
  if (document.querySelector('[data-intro]') && !calm) {
    ['../models/world.bin?v=10', '../models/props.glb?v=4', '../models/character-hq.glb?v=1', lite ? '../models/planet.glb?v=8' : '../models/planet-hq.glb?v=3', '../models/planet.bin?v=8', '../models/chair.glb?v=1']
      .forEach((f) => fetch(new URL(f, import.meta.url)).catch(() => {}));
    await new Promise((ok) => setTimeout(ok, 1150));      // pass 84: once the star has landed (1.05 s): the rest of the intro runs on the compositor, so the build cannot freeze it, and the menu then appears with the world ready
  }
  const R = 9.5;                                         // metres: the radius of the dome the lawn makes (the planet is Jaime's own, from Meshy)
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const UP = V(0, 1, 0);
  const mix = (a, b, t) => a + (b - a) * t;
  const clamp = THREE.MathUtils.clamp;

  /* ---------- renderer ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' });
  const gl = renderer.getContext();
  if (!renderer.capabilities.isWebGL2 || !(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'))) {
    renderer.dispose(); throw new Error('no HDR targets here');
  }
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;            // with a radius: soft edges
  renderer.localClippingEnabled = true;                    // the house's door is cut out of its wall with planes
  const NO_SFX = true;                                     // pass 81: he asked for no sound effects made in code (the music and the campfire are recordings)
  const URL_MUTE = /[?&]mute\b/.test(location.search);     // index.html?mute — no sound at all (for checking at night)
  /* pass 78: and the visitor's own switch (the round button with a loudspeaker): the music and every sound of the planet, off and on; his choice is kept */
  let soundOff = false; try { soundOff = localStorage.getItem('uljo-sound') === 'off'; } catch (e) {}
  let MUTE = URL_MUTE || soundOff; window.__uljoSoundOff = MUTE;
  renderer.toneMapping = THREE.NoToneMapping;              // the last pass does it

  const draco = new DRACOLoader().setDecoderPath(new URL('../vendor/draco/', import.meta.url).href);
  const get = (path, as) => fetch(new URL(path, import.meta.url)).then((r) => { if (!r.ok) throw new Error(path + ' ' + r.status); return r[as](); });
  const [{ geo, head: info }, props, charFile, planetFile, landBuf, landInfo, chairFile] = await Promise.all([
    loadModels(new URL('../models/world.bin?v=10', import.meta.url)),
    new GLTFLoader().loadAsync(new URL('../models/props.glb?v=4', import.meta.url).href),     // the guitar and the grass: models from the web (tools/blender/web/SOURCES.txt)
    new GLTFLoader().loadAsync(new URL('../models/character-hq.glb?v=1', import.meta.url).href),      // pass 71: the sharper copy (2048 px, normal map)  // Jaime: his Meshy character, rigged and animated there (tools/blender/build_character.py)
    /* the planet: the one he generated in Meshy. Pass 77: its trees were shredded by the first reduction (240 000 triangles); a
       computer now gets the finer copy (650 000, most of them in the trees, bushes and rocks: tools/blender/planet_reduce_hq.py),
       a phone keeps the light one. What the game measures (planet.bin) is the same for both. */
    (lite ? Promise.reject() : new GLTFLoader().setDRACOLoader(draco).loadAsync(new URL('../models/planet-hq.glb?v=3', import.meta.url).href)).catch(() => new GLTFLoader().setDRACOLoader(draco).loadAsync(new URL('../models/planet.glb?v=8', import.meta.url).href)),
    get('../models/planet.bin?v=8', 'arrayBuffer'),          // what the planet says about itself: ground, hull, what is in the way, kinds of ground
    get('../models/planet.json?v=7', 'json'),                // its lakes and its portal
    new GLTFLoader().setDRACOLoader(draco).loadAsync(new URL('../models/chair.glb?v=1', import.meta.url).href).catch(() => null)      // pass 75: the armchair and its telephone, made in Meshy (tools/blender/reduce_glb.py)
  ]);
  draco.dispose();
  /* later models (the car, the bulb's friends) come when they are needed */
  const loadGLB = (path) => { const d = new DRACOLoader().setDecoderPath(new URL('../vendor/draco/', import.meta.url).href); return new GLTFLoader().setDRACOLoader(d).loadAsync(new URL(path, import.meta.url).href).finally(() => d.dispose()); };
  const prop = (name) => { const out = [], o = props.scene.getObjectByName(name); if (o) o.traverse((m) => { if (m.isMesh) out.push(m); }); return out; };
  props.scene.traverse((m) => {
    if (!m.isMesh) return;
    const mt = m.material; mt.envMapIntensity = .55; mt.metalness = 0;
    if (/Leaves|Grass/i.test(mt.name)) { mt.transparent = false; mt.alphaTest = .5; mt.side = THREE.DoubleSide; mt.depthWrite = true; }
    if (/Leaves/i.test(mt.name)) { mt.emissiveMap = mt.map; mt.emissive = new THREE.Color(.018, .03, .016); }
    if (mt.map) mt.map.anisotropy = 4;
  });

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1.4, 0.1, 500);
  const uTime = { value: 0 };

  /* a seeded dice, so the planet is the same planet every visit */
  let seed = 20260914;
  const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const rr = (a, b) => a + (b - a) * rnd();
  const anyDir = () => { const u = rnd() * 2 - 1, t = rnd() * 6.2832, q = Math.sqrt(1 - u * u); return V(q * Math.cos(t), u, q * Math.sin(t)); };

  /* a place on the planet: x metres to the right of the pole, z metres toward the viewer */
  function at(x, z) {
    const d = Math.hypot(x, z);
    if (d < 1e-6) return V(0, 1, 0);
    const a = d / R;
    return V(Math.sin(a) * x / d, Math.cos(a), Math.sin(a) * z / d);
  }
  function plant(obj, dir, spin = 0, sink = 0) {
    obj.position.copy(dir).multiplyScalar(R - sink);
    obj.quaternion.setFromUnitVectors(UP, dir).multiply(new THREE.Quaternion().setFromAxisAngle(UP, spin));
    return obj;
  }

  /* ---------- the land: what the planet's model says about itself ----------
     build_planet.py asked it, ray by ray: a grid of 512 × 256 directions (its two poles on ±X, away from the lawn),
     and for each one the height of the ground, of the hull (roofs, crowns), the distance to the nearest thing in
     the way, and the kind of ground. */
  const land = (() => {
    const dv = new DataView(landBuf), W = dv.getUint16(4, true), H = dv.getUint16(6, true), n = W * H;
    const tmin = dv.getFloat32(8, true), tstep = dv.getFloat32(12, true), hstep = dv.getFloat32(16, true), smin = dv.getFloat32(20, true), sstep = dv.getFloat32(24, true);
    const T = new Uint8Array(landBuf, 28, n), HU = new Uint8Array(landBuf, 28 + n, n), SD = new Uint8Array(landBuf, 28 + 2 * n, n), KD = new Uint8Array(landBuf, 28 + 3 * n, n);
    let fu = 0, fv = 0;
    const uv = (d) => { fu = (Math.atan2(d.z, d.y) + Math.PI) / (2 * Math.PI) * W - .5; fv = Math.acos(clamp(d.x, -1, 1)) / Math.PI * H - .5; };
    const tap = (A) => {
      const i0 = Math.floor(fu), j0 = clamp(Math.floor(fv), 0, H - 1), j1 = Math.min(H - 1, j0 + 1), a = fu - i0, b = clamp(fv - j0, 0, 1);
      const ia = ((i0 % W) + W) % W, ib = (ia + 1) % W;
      return (A[j0 * W + ia] * (1 - a) + A[j0 * W + ib] * a) * (1 - b) + (A[j1 * W + ia] * (1 - a) + A[j1 * W + ib] * a) * b;
    };
    const cell = (d) => { uv(d); return clamp(Math.round(fv), 0, H - 1) * W + (((Math.round(fu) % W) + W) % W); };
    return { W, H, SD, smin, sstep, cell,
      ground: (d) => { uv(d); return tmin + tap(T) * tstep; },                          // where his feet are
      hull: (d) => { uv(d); return tmin + tap(T) * tstep + tap(HU) * hstep; },           // the top of whatever stands there
      free: (d) => { uv(d); return smin + tap(SD) * sstep; },                            // metres to the nearest thing in the way (negative inside it)
      kind: (d) => KD[cell(d)],                                                          // 1 a lawn · 2 water
      dirOf: (c, out) => { const j = Math.floor(c / W), i = c - j * W, th = (j + .5) / H * Math.PI, ph = (i + .5) / W * 2 * Math.PI - Math.PI; return out.set(Math.cos(th), Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph)); } };
  })();
  const ground = land.ground;
  const TRAIL = (landInfo.trail || []).map((q) => V(q[0], q[1], q[2]).normalize());
  const onTrail = (d, w) => { for (let i = 0; i < TRAIL.length; i++) if (TRAIL[i].dot(d) > .999 && TRAIL[i].angleTo(d) * R < w) return true; return false; };      // (only far from the fire: the camp keeps its grass)
  const FIRE = V(0, ground(UP) + .25, 0);

  /* ---------- materials ---------- */
  const ENV = .55;
  const rimU = { value: new THREE.Color(.42, .68, 1.15) };  // the cool edge every round thing wears
  const std = (o, rimK = 0) => {
    const m = new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: .8, metalness: 0, envMapIntensity: ENV }, o));
    if (rimK) m.onBeforeCompile = (sh) => {
      sh.uniforms.rimC = rimU; sh.uniforms.rimK = { value: rimK };
      const hook = sh.fragmentShader.includes('#include <opaque_fragment>') ? '#include <opaque_fragment>' : '#include <output_fragment>';
      sh.fragmentShader = 'uniform vec3 rimC; uniform float rimK;\n' + sh.fragmentShader.replace(hook,
        'outgoingLight += rimC * rimK * .6 * pow(1. - clamp(dot(normalize(vViewPosition), normal), 0., 1.), 3.4);\n' + hook);
    };
    return m;
  };
  const M = {
    skin: std({ roughness: .6 }, .3), hair: std({ roughness: .5 }, .45), cloth: std({ roughness: .85 }, .4),
    guitar: std({ roughness: .3, envMapIntensity: 1.1 }, .3), wood: std({ roughness: .92 }, .22), leaf: std({ roughness: .78 }, .2),
    rock: std({ roughness: .86 }, .35), ground: std({ roughness: 1, envMapIntensity: .4 })
  };
  M.cloth.color.setRGB(1.3, 1.3, 1.45); M.hair.color.setRGB(1.2, 1.2, 1.45); M.leaf.color.setRGB(1.25, 1.5, 1.15); M.wood.color.setRGB(1.35, 1.25, 1.2); M.rock.color.setRGB(1.2, 1.25, 1.35);
  M.ground.emissive.setRGB(.005, .016, .005);
  const hdr = (r, g, b, k = 1) => new THREE.Color(r * k, g * k, b * k);
  const glowMat = (color, power = 2) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { color: { value: color }, k: { value: 1 }, power: { value: power } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec2 vUv;uniform vec3 color;uniform float k,power;void main(){float d=length(vUv-.5)*2.;float a=pow(max(0.,1.-d),power);gl_FragColor=vec4(color*a*k,1.);}'
  });
  const billboards = [];
  function glow(color, size, power) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), glowMat(color, power));
    m.renderOrder = 5; billboards.push(m); return m;
  }

  /* ---------- the sky: night, teal, and the last of the sun ---------- */
  const sunDir = V(0, 0, -1);                              // set once the camera is placed
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { sun: { value: sunDir } },
    vertexShader: 'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `
      varying vec3 vDir; uniform vec3 sun;
      float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
      float fbm(vec3 p){ return .5 * n3(p) + .25 * n3(p * 2.1 + 3.) + .125 * n3(p * 4.3 + 7.) + .0625 * n3(p * 8.7 + 11.); }
      void main(){
        vec3 d = normalize(vDir);
        vec3 sr = normalize(cross(sun, vec3(0., 1., 0.))), su = cross(sr, sun);
        float g = degrees(atan(length(vec2(dot(d, sr), dot(d, su) * 1.3)), dot(d, sun)));     // how far from the sunset; the glow lies wide
        vec3 night = vec3(.010,.014,.066), deep = vec3(.016,.046,.135), green = vec3(.028,.165,.185);
        vec3 col = mix(deep, night, smoothstep(22., 40., g));
        col = mix(green, col, smoothstep(11., 25., g));
        col = mix(vec3(.50,.150,.185), col, smoothstep(7.5, 15.5, g));
        col = mix(vec3(.80,.150,.200), col, smoothstep(3., 10.5, g));
        float low = smoothstep(.15, -.04, d.y - sun.y);
        col = mix(col, vec3(1.0,.34,.115), (1. - smoothstep(2., 11., g)) * low);
        // space is not empty: clouds of violet and teal away from the sunset
        float nb = fbm(d * 2.6 + 4.), nb2 = fbm(d * 5.2 - 2.);
        col += mix(vec3(.30,.07,.52), vec3(.05,.34,.50), smoothstep(.35, .7, nb2)) * pow(smoothstep(.36, .8, nb), 1.5) * .5 * smoothstep(10., 30., g);
        gl_FragColor = vec4(col, 1.);
      }`
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 32), skyMat);
  sky.frustumCulled = false; sky.renderOrder = -10;
  scene.add(sky);

  const starMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { time: uTime, px: { value: 1 } },
    vertexShader: `attribute float aSize; attribute float aPhase; attribute vec3 color; varying vec3 vC; uniform float time, px;
      void main(){ vC = color * (.55 + .45 * sin(time * (.7 + aPhase * 1.9) + aPhase * 40.));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_PointSize = aSize * px; }`,
    fragmentShader: `varying vec3 vC; void main(){ vec2 q = gl_PointCoord - .5; float d = length(q) * 2.;
        float a = pow(max(0., 1. - d), 2.2) + .35 * max(0., 1. - 14. * abs(q.x) - 1.2 * d) + .35 * max(0., 1. - 14. * abs(q.y) - 1.2 * d);
        gl_FragColor = vec4(vC * a, 1.); }`
  });
  /* pass 77: now and then a small shooting star, far off — on the title screen and on a walk. A thin streak, always
     turned to the eye; it is far beyond the planet, so the planet and its trees pass in front of it. */
  /* pass 79: many of them — the first 0.75 s after the logo has been revealed, then about one every three seconds,
     each from its own place in the sky, going its own way (a few may cross at once) */
  const meteorMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide, uniforms: { k: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `varying vec2 vUv; uniform float k;
      void main(){ float y = abs(vUv.y - .5) * 2., x = clamp(vUv.x, .0005, 1.);      // (never a power of nothing: a card may answer "not a number", and the glow pass then smears it into a blot)
        float tail = pow(x, 2.4) * pow(max(.0005, 1. - y), 2.5) * step(.001, vUv.x);
        float head = exp(-(1. - x) * (1. - x) * 900.) * exp(-y * y * 9.);
        gl_FragColor = vec4((vec3(.55, .8, 1.) * tail * 1.5 + vec3(1., .97, .9) * head * 4.) * k, 1.); }`
  });
  const INTRO_END = document.querySelector('[data-intro]') ? 1550 : 0;      // when the logo stands revealed (main.js: the intro ends at 1.55 s)
  const meteor = { first: INTRO_END + 750, next: 0, fired: false, pool: [] };
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), meteorMat.clone());
    m.frustumCulled = false; m.renderOrder = -8; m.visible = false; m.matrixAutoUpdate = false; scene.add(m);
    meteor.pool.push({ t: -1, dur: 1.3, from: new THREE.Vector3(), vel: new THREE.Vector3(), len: 30, m });
  }
  const stars = (() => {
    const N = 900, p = [], c = [], s = [], ph = [], col = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const d = anyDir(); p.push(d.x * 280, d.y * 280, d.z * 280);
      col.set([0x6fe6ff, 0xbff4ff, 0xffffff, 0xff9fb8, 0xffe38a, 0xc9a2ff][Math.floor(rnd() * 6)]);
      const big = rnd() < .12, k = big ? rr(3.2, 6) : rr(.8, 2.4);
      c.push(col.r * k, col.g * k, col.b * k); s.push(big ? rr(9, 14) : rr(2.2, 4.6)); ph.push(rnd());
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    g.setAttribute('aSize', new THREE.Float32BufferAttribute(s, 1));
    g.setAttribute('aPhase', new THREE.Float32BufferAttribute(ph, 1));
    const pts = new THREE.Points(g, starMat); pts.frustumCulled = false; pts.renderOrder = -9; scene.add(pts); return pts;
  })();

  /* ---------- light ---------- */
  const hemi = new THREE.HemisphereLight(0x9db8ff, 0x5a4a9a, .92);       // the night is never black: its shade is blue and violet (pass 75: nearly twice as much of it)
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xff9a66, 2.2);         // the last of the sun, low behind the hill
  key.castShadow = true; key.shadow.mapSize.set(lite ? 1024 : 2048, lite ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 2, far: 80 });
  key.shadow.bias = -.0006; key.shadow.normalBias = .035; key.shadow.radius = 3.2;
  scene.add(key, key.target);
  const moon = new THREE.DirectionalLight(0x9ab4ff, 1.7); scene.add(moon, moon.target);      // the far side has its own light, a clear blue moon: nowhere is dark
  const rim = new THREE.DirectionalLight(0xb8a8ff, 1.05);        // a cool violet edge from the night side
  scene.add(rim, rim.target);
  const fireLight = new THREE.PointLight(0xff8a35, 4, 11, 1.25);
  const fireFill = new THREE.PointLight(0xff9a4a, 2.6, 10, 1.25);        // a fire is wide: its shadows are never black
  scene.add(fireFill);
  fireLight.castShadow = true; fireLight.shadow.mapSize.set(lite ? 256 : 512, lite ? 256 : 512);
  fireLight.shadow.camera.near = .06; fireLight.shadow.camera.far = 6.5;
  fireLight.shadow.bias = -.004; fireLight.shadow.normalBias = .03; fireLight.shadow.radius = 5;
  scene.add(fireLight);
  scene.fog = new THREE.FogExp2(0x1a2456, .0085);
  const zen = new THREE.DirectionalLight(0xa9c6ff, 0); scene.add(zen, zen.target);      // pass 75: a moon that is always overhead wherever he stands away from the sun — the far fields are lit, blue and clear, not left in the dark
  const LIT = { hemi: hemi.intensity, key: key.intensity, moon: moon.intensity, rim: rim.intensity };

  /* ---------- the lakes: two of them, as the model has them ---------- */
  const sst = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const LAKES = landInfo.lakes.map((l) => {
    const c = V(l.c[0], l.c[1], l.c[2]), e1 = V(l.e1[0], l.e1[1], l.e1[2]);
    return { c, e1, e2: V(0, 0, 0).crossVectors(c, e1), rim: l.rim, level: l.level || R };
  });
  /* how far inside a lake's rim a direction is, in metres (negative on the land); lakeAt.lake says which lake */
  function lakeAt(n) {
    let bd = -1e9; lakeAt.lake = LAKES[0];
    for (let k = 0; k < LAKES.length; k++) {
      const L = LAKES[k], dd = n.dot(L.c);
      if (dd < .3) continue;
      const N = L.rim.length, a = ((Math.atan2(n.dot(L.e2), n.dot(L.e1)) / 6.283185 + 1) % 1) * N, i0 = Math.floor(a) % N, f = a - Math.floor(a);
      const inside = L.rim[i0] * (1 - f) + L.rim[(i0 + 1) % N] * f - Math.acos(Math.min(1, dd)) * R;
      if (inside > bd) { bd = inside; lakeAt.lake = L; }
    }
    return bd;
  }
  const HOME = LAKES.reduce((a, b) => (b.c.y > a.c.y ? b : a));      // the lake by the camp

  /* the places: each one is a part of the site.
     dir: the thing itself · spot: where he stands before it · eye: what the picture closes on (and how high) · tag: where its name goes on the map */
  const PLACES = [
    { id: 'lab', label: 'Home', name: 'Jaime\u2019s Home', verb: 'Go in', dir: at(2.6, -3.0), spot: at(3.5, -.8), eye: [at(3.05, -2.0), 1.05], near: 2.9, pick: 3.0, zoom: 3.1, rise: .3, tag: [1, 0], href: '#work', tint: 0x8fc0ff },
    { id: 'about', label: 'Universe', name: 'My Universe', verb: 'Look into the water', dir: HOME.c.clone(), near: 1.0, tag: [-1, 0], href: 'about.html', tint: 0x7fe6d6 },
    { id: 'studio', label: 'Studio', name: 'Underground Studio', verb: 'Open the hatch', dir: at(4.7, 1.65), spot: at(4.65, 3.0), eye: [at(4.7, 1.65), .1], near: 1.9, pick: 1.25, zoom: 2.6, rise: 1.5, tag: [0, 1], href: 'studio.html', tint: 0xffc56b },
    { id: 'contact', label: 'Phone', name: 'Keep in touch', verb: 'Use the phone', dir: at(2.6, 1.25), spot: at(3.5, .95), eye: [at(2.56, 1.18), .78], near: 1.6, pick: .95, zoom: 2.6, rise: .8, tag: [-1, 0], href: 'contact.html', tint: 0xff9ab0 }
  ];
  const placeDist = (p, n) => p.id === 'about' ? Math.max(0, -lakeAt(n)) : p.dir.angleTo(n) * R;      // for the lake: from its shore

  /* ---------- the planet: Jaime's own, generated in Meshy ---------- */
  const landU = { uHouse: { value: new THREE.Vector4() }, uPortal: { value: new THREE.Vector4() }, uGlow: { value: 1 }, uCutA: { value: new THREE.Matrix4().makeScale(0, 0, 0) }, uCutB: { value: new THREE.Matrix4().makeScale(0, 0, 0) }, uCutC: { value: new THREE.Matrix4().makeScale(0, 0, 0) }, uCutD: { value: new THREE.Matrix4().makeScale(0, 0, 0) } };      // uCut: world → a box's own unit cube; what is inside is not drawn (the door, the hatch)
  const PORTAL = V(landInfo.portal.c[0], landInfo.portal.c[1], landInfo.portal.c[2]).multiplyScalar(landInfo.portal.r);
  landU.uPortal.value.set(PORTAL.x, PORTAL.y, PORTAL.z, 3.6);
  /* the portal: the way he came. A passage is cut through the ledges to it (build_planet.py); he walks up and jumps in */
  PLACES.push({ id: 'portal', label: 'Portal', name: 'The portal', verb: 'Jump in', dir: PORTAL.clone().normalize(), spot: at(10.75, 3.75), near: 3.5, pick: 2.5, tag: [-1, 0], href: 'play.html', tint: 0xc08cff });
  { const hc = at(2.4, -3.3); hc.multiplyScalar(ground(hc) + 1.7); landU.uHouse.value.set(hc.x, hc.y, hc.z, 3.7); }
  const planetParts = []; let cutMat = null;
  {
    let src = null; planetFile.scene.traverse((m) => { if (m.isMesh) src = m; });
    src.updateWorldMatrix(true, false);
    const g0 = src.geometry.clone().applyMatrix4(src.matrixWorld), mt = src.material;
    mt.side = THREE.FrontSide; mt.metalness = 0; mt.roughness = .9; mt.envMapIntensity = .5;
    if (mt.map) mt.map.anisotropy = lite ? 2 : 8;
    if (lite && mt.map && mt.map.image && mt.map.image.width > 2048) {      // a phone gets the planet's picture at half the size: a quarter of the memory
      const c = document.createElement('canvas'); c.width = c.height = 2048; c.getContext('2d').drawImage(mt.map.image, 0, 0, 2048, 2048);
      if (mt.map.image.close) mt.map.image.close();
      mt.map.image = c; mt.map.needsUpdate = true;
    }
    /* what glows glows: the windows are lit from inside, the portal burns violet — and everything keeps a little of its own colour in any light */
    const planetHook = (sh, cut) => {
      Object.assign(sh.uniforms, landU, { uTime });
      sh.vertexShader = 'varying vec3 vWp;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vWp = (modelMatrix * vec4(transformed, 1.)).xyz;');
      sh.fragmentShader = 'varying vec3 vWp; uniform vec4 uHouse, uPortal; uniform float uTime, uGlow; uniform mat4 uCutA, uCutB, uCutC, uCutD;\n' + sh.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        ${cut ? 'if (all(lessThan(abs((uCutA * vec4(vWp, 1.)).xyz), vec3(1.))) || all(lessThan(abs((uCutB * vec4(vWp, 1.)).xyz), vec3(1.))) || all(lessThan(abs((uCutC * vec4(vWp, 1.)).xyz), vec3(1.))) || all(lessThan(abs((uCutD * vec4(vWp, 1.)).xyz), vec3(1.)))) discard;' : ''}`).replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          vec3 bc = diffuseColor.rgb;
          float lamp = smoothstep(.5, .85, bc.r) * smoothstep(.3, .55, bc.g) * (1. - smoothstep(.3, .6, bc.b)) * (1. - smoothstep(uHouse.w * .8, uHouse.w, distance(vWp, uHouse.xyz)));
          float gate = smoothstep(.02, .22, bc.b - bc.g) * smoothstep(.12, .5, bc.b) * (1. - smoothstep(uPortal.w * .7, uPortal.w, distance(vWp, uPortal.xyz)));
          totalEmissiveRadiance += bc * (lamp * 3.0 + gate * (2.6 + .7 * sin(uTime * 1.1 + vWp.y * 2.)) + .11) * uGlow;
        }`);
    };
    mt.onBeforeCompile = (sh) => planetHook(sh, false);
    cutMat = mt.clone(); cutMat.onBeforeCompile = (sh) => planetHook(sh, true);      // only the pieces round the door and the hatch pay for the cut (pass 71)
    /* in pieces, so that what is out of sight — or out of the fire's reach — is not drawn. The pieces share one set of points. */
    const K = 28, cs = [], idx = g0.index.array, pos = g0.attributes.position, bins = Array.from({ length: K }, () => []), tv = new THREE.Vector3();
    for (let i = 0; i < K; i++) { const y = 1 - 2 * (i + .5) / K, q = Math.sqrt(1 - y * y), a = i * 2.39996; cs.push(V(q * Math.cos(a), y, q * Math.sin(a))); }
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t], b = idx[t + 1], c = idx[t + 2];
      const x = pos.getX(a) + pos.getX(b) + pos.getX(c), y = pos.getY(a) + pos.getY(b) + pos.getY(c), z = pos.getZ(a) + pos.getZ(b) + pos.getZ(c);
      let best = 0, bd = -1e9;
      for (let k = 0; k < K; k++) { const d = x * cs[k].x + y * cs[k].y + z * cs[k].z; if (d > bd) { bd = d; best = k; } }
      bins[best].push(a, b, c);
    }
    bins.forEach((bin) => {
      if (!bin.length) return;
      const g = new THREE.BufferGeometry();
      for (const name in g0.attributes) g.setAttribute(name, g0.attributes[name]);
      g.setIndex(new THREE.BufferAttribute(new Uint32Array(bin), 1));
      const box = new THREE.Box3(); for (let i = 0; i < bin.length; i++) box.expandByPoint(tv.fromBufferAttribute(pos, bin[i]));
      g.boundingBox = box; g.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
      const m = new THREE.Mesh(g, mt); m.castShadow = true; m.receiveShadow = true; scene.add(m); planetParts.push(m);
    });
  }
  /* ---------- what opens (pass 70) ----------
     The house: a box of six planes cuts the painted door out of the wall — clean edges — and a real door hangs in its
     place: planks, iron straps, a handle, on its hinge. Behind it a small lit room, so the doorway has depth.
     The hatch: its painted planks are taken out of the planet's skin, and a real lid lies there — planks, straps, an
     iron ring — hinged on its west side, over a lit shaft with a ladder going down. */
  const DOOR = { k: 0, was: -1 }, HATCH = { k: 0, was: -1, want: 0, going: false, at: new THREE.Vector3(0, 1, 0) };
  const planks = (n, base, seam) => {                      // a painted board of planks
    const c = document.createElement('canvas'); c.width = 256; c.height = 512; const x = c.getContext('2d');
    x.fillStyle = base; x.fillRect(0, 0, 256, 512);
    const w = 256 / n;
    for (let i = 0; i < n; i++) {
      const x0 = i * w, gr = x.createLinearGradient(x0, 0, x0 + w, 0);
      gr.addColorStop(0, 'rgba(255,214,160,.16)'); gr.addColorStop(.45, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.22)');
      x.fillStyle = gr; x.fillRect(x0, 0, w, 512);
      for (let k = 0; k < 10; k++) {                       // the grain
        x.strokeStyle = 'rgba(50,24,8,' + (.07 + rnd() * .12).toFixed(3) + ')'; x.lineWidth = .8 + rnd() * 1.6;
        const xx = x0 + 5 + rnd() * (w - 10); x.beginPath(); x.moveTo(xx, 0); x.bezierCurveTo(xx + 7, 170, xx - 7, 340, xx + 3, 512); x.stroke();
      }
      x.fillStyle = seam; x.fillRect(x0, 0, 3, 512);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  };
  const iron = new THREE.MeshStandardMaterial({ color: 0x2a2c33, roughness: .55, metalness: .7 });
  const framed = (ex, ey, ez, at_) => { const g = new THREE.Group(); g.matrixAutoUpdate = false; g.matrix.makeBasis(ex, ey, ez).setPosition(at_); scene.add(g); return g; };
  /* pass 75: both are built from a handful of numbers that can be changed and built again (window.__world.tune…),
     because the house leans and the hatch lies askew in its stones — the door and the lid have to do the same */
  const DOORQ = { c: [3.0, -2.1], u: [.933, -.359], g0: 9.12, s0: -.215, s1: .475, h0: .2, h1: 1.3, t0: -.5, t1: .12, td: -.2, roll: .085, yaw: 0, grow: [.05, .04], dx: 0, dy: 0 };      // roll: the house leans five degrees, and so does its door
  let doorFrame = null, doorWood = null;
  function buildDoor() {
    const q = DOORQ, N = [-q.u[1], q.u[0]];
    const P = (sv, tv, hv) => at(q.c[0] + q.u[0] * sv + N[0] * tv, q.c[1] + q.u[1] * sv + N[1] * tv).multiplyScalar(q.g0 + hv);
    const o = P((q.s0 + q.s1) / 2, (q.t0 + q.t1) / 2, (q.h0 + q.h1) / 2), ey = o.clone().normalize(), ex = P(.5, 0, .8).sub(P(-.5, 0, .8)).normalize();
    ex.addScaledVector(ey, -ex.dot(ey)).normalize(); const ez = new THREE.Vector3().crossVectors(ex, ey);      // ez: out of the house
    if (q.yaw) { ex.applyAxisAngle(ey, q.yaw); ez.applyAxisAngle(ey, q.yaw); }
    if (q.roll) { ex.applyAxisAngle(ez, q.roll); ey.applyAxisAngle(ez, q.roll); }                              // the lean of the house
    o.addScaledVector(ex, q.dx).addScaledVector(ey, q.dy);
    const S = q.s1 - q.s0, H = q.h1 - q.h0, T = q.t1 - q.t0;
    landU.uCutA.value.makeBasis(ex.clone().multiplyScalar(S / 2), ey.clone().multiplyScalar(H / 2), ez.clone().multiplyScalar(T / 2)).setPosition(o).invert();      // the painted door is not drawn
    planetParts.forEach((m) => { if (m.geometry.boundingSphere.center.distanceTo(o) < m.geometry.boundingSphere.radius + 1.2) m.material = cutMat; });
    /* the door: hinge at its left edge, swinging out onto the step */
    const W_ = S + q.grow[0], H_ = H + q.grow[1];
    doorWood = doorWood || new THREE.MeshStandardMaterial({ map: planks(5, '#7a4a28', 'rgba(30,14,4,.75)'), roughness: .82 }); const wood = doorWood, edge = new THREE.MeshStandardMaterial({ color: 0x4b2a14, roughness: .9 });
    if (doorFrame) scene.remove(doorFrame);
    const frame = doorFrame = framed(ex, ey, ez, o.clone().addScaledVector(ex, -W_ / 2).addScaledVector(ey, -H_ / 2).addScaledVector(ez, q.td - (q.t0 + q.t1) / 2)), pivot = new THREE.Group(); frame.add(pivot);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(W_, H_, .06), [edge, edge, edge, edge, wood, wood]); leaf.position.set(W_ / 2, H_ / 2, 0); leaf.castShadow = true; leaf.receiveShadow = true; pivot.add(leaf);
    [.2, .8].forEach((f) => { const st = new THREE.Mesh(new THREE.BoxGeometry(W_ * .82, .045, .075), iron); st.position.set(W_ * .45, H_ * f, 0); pivot.add(st); });
    const handle = new THREE.Mesh(new THREE.TorusGeometry(.045, .012, 8, 18), iron); handle.position.set(W_ - .1, H_ * .48, .055); pivot.add(handle);
    /* the room behind: warm walls, a lamp */
    const roomMat = new THREE.MeshStandardMaterial({ color: 0x8a5a36, emissive: 0x4a200a, emissiveIntensity: .7, roughness: 1, side: THREE.BackSide });
    const room = new THREE.Mesh(new THREE.BoxGeometry(W_ + .8, H_ + .5, 1.3), roomMat); room.position.set(W_ / 2, H_ / 2 + .1, -.7); frame.add(room);
    const lamp = new THREE.PointLight(0xffb060, 2.4, 2.6, 1.6); lamp.position.set(W_ / 2, H_ * .85, -.6); frame.add(lamp);
    DOOR.set = (k) => { pivot.rotation.y = -1.9 * k; };
    DOOR.set(DOOR.k || 0);
  }
  buildDoor();
  const HATCHQ = { x0: 4.09, x1: 5.28, z0: 1.04, z1: 2.39, yaw: .03, dx: 0, dz: 0, lift: 0, grow: .06 };
  let hatchFrame = null, hatchWood = null;
  function buildHatch() {
    const q = HATCHQ, cx = (q.x0 + q.x1) / 2 + q.dx, cz = (q.z0 + q.z1) / 2 + q.dz, mid = at(cx, cz); HATCH.at.copy(mid);
    /* its frame on the planet: x east, z south, y up — then turned as the stones round it are turned */
    const ey = mid.clone(), ex = at(cx + .5, cz).sub(at(cx - .5, cz)), ez = at(cx, cz + .5).sub(at(cx, cz - .5));
    ex.addScaledVector(ey, -ex.dot(ey)).normalize(); ez.addScaledVector(ey, -ez.dot(ey)).addScaledVector(ex, -ez.dot(ex)).normalize();
    if (q.yaw) { ex.applyAxisAngle(ey, q.yaw); ez.applyAxisAngle(ey, q.yaw); }
    let top = 0; [[0, 0], [-.4, -.4], [.4, -.4], [-.4, .4], [.4, .4]].forEach((d) => { top += land.hull(at(cx + d[0], cz + d[1])); }); top = top / 5 + q.lift;
    const Lx = q.x1 - q.x0, Lz = q.z1 - q.z0, Wx = Lx + q.grow, Wz = Lz + q.grow, T = .07;
    planetParts.forEach((m) => { if (m.geometry.boundingSphere.center.distanceTo(mid.clone().multiplyScalar(top)) < m.geometry.boundingSphere.radius + 1.5) m.material = cutMat; });
    landU.uCutB.value.makeBasis(ex.clone().multiplyScalar(Lx / 2 - .02), ey.clone().multiplyScalar(.32), ez.clone().multiplyScalar(Lz / 2 - .02)).setPosition(mid.clone().multiplyScalar(top - .2)).invert();      // the painted planks are not drawn
    if (hatchFrame) scene.remove(hatchFrame);
    const frame = hatchFrame = framed(ex, ey, ez, mid.clone().multiplyScalar(top - T / 2).addScaledVector(ex, -Wx / 2)), pivot = new THREE.Group(); frame.add(pivot);
    hatchWood = hatchWood || new THREE.MeshStandardMaterial({ map: planks(4, '#6e4426', 'rgba(25,12,4,.8)'), roughness: .85 }); const wood = hatchWood, edge = new THREE.MeshStandardMaterial({ color: 0x3f2410, roughness: .9 });
    const lid = new THREE.Mesh(new THREE.BoxGeometry(Wx, T, Wz), [edge, edge, wood, wood, edge, edge]); lid.position.set(Wx / 2, 0, 0); lid.castShadow = true; lid.receiveShadow = true; pivot.add(lid);
    [-.3, .3].forEach((f) => { const st = new THREE.Mesh(new THREE.BoxGeometry(Wx * .9, .02, .08), iron); st.position.set(Wx / 2, T / 2 + .006, Wz * f); pivot.add(st); });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.085, .016, 8, 24), iron); ring.rotation.x = Math.PI / 2; ring.position.set(Wx * .78, T / 2 + .016, 0); pivot.add(ring);
    /* the shaft under it: dark walls, and (pass 77) a flight of stone steps going down from its south edge — he walks down them himself */
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0x2a1a12, emissive: 0x1a0c04, roughness: 1, side: THREE.BackSide });
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(Wx - .04, 2.2, Wz - .04), shaftMat); shaft.position.set(Wx / 2, -1.15, 0); frame.add(shaft);
    const stone = new THREE.MeshStandardMaterial({ color: 0x8a8296, roughness: .95, emissive: 0x15120f }), nose = new THREE.MeshStandardMaterial({ color: 0xb9b0c4, roughness: .9, emissive: 0x1c1814 });
    const NS = 6, RUN = (Wz - .06) / NS, RISE = .23;
    for (let i = 0; i < NS; i++) {
      const top = -T / 2 - (i + 1) * RISE, hgt = 2.2 + top + T / 2, z = Wz / 2 - .03 - (i + .5) * RUN;
      const st = new THREE.Mesh(new THREE.BoxGeometry(Wx - .08, hgt, RUN), stone); st.position.set(Wx / 2, top - hgt / 2, z); st.receiveShadow = true; frame.add(st);
      const ns = new THREE.Mesh(new THREE.BoxGeometry(Wx - .08, .03, .05), nose); ns.position.set(Wx / 2, top + .001, z + RUN / 2 - .025); frame.add(ns);
    }
    HATCH.inv = new THREE.Matrix4().makeBasis(ex, ey, ez).setPosition(mid.clone().multiplyScalar(top).addScaledVector(ex, -Wx / 2)).invert();      // the world → its own frame: x east from its west edge, y up from its top, z south from its middle
    HATCH.dim = { Wx, Wz, RUN, RISE, NS, top, ey: ey.clone() };
    HATCH.lamp = new THREE.PointLight(0xffb86a, 0, 3.2, 1.5); HATCH.lamp.position.set(Wx / 2, -1.3, 0); frame.add(HATCH.lamp);
    HATCH.set = (k) => { pivot.rotation.z = 1.95 * k; HATCH.lamp.intensity = 7 * k; };
    HATCH.set(HATCH.k || 0);
  }
  buildHatch();
  /* a press on E opens the lid where it lies (no close-up of it any more); he then walks down the steps himself, and
     once he is under the ground the picture goes dark and the studio is there */
  function openHatch() {
    if (HATCH.want || HATCH.going) return;
    HATCH.want = 1; travel = null; if (placeEl) placeEl.classList.remove('is-on');
    visit('studio'); Q.roomLoad();
    say('It\u2019s open! The steps go down to the Underground Studio.', false);
  }

  /* ---------- the far field (pass 70): a tower of floating stones to climb, coins all the way up, and a ring race
     round its foot that only running can win. Up top the eye pulls back and the whole planet is there, and space. */
  const FIELD = (() => {
    const c = V(-.658, -.752, -.032).normalize(), g0 = ground(c), e1 = V(0, 0, 1).addScaledVector(c, -c.z).normalize(), e2 = V(0, 0, 0).crossVectors(c, e1).normalize();
    const dirAt = (ang, dist) => c.clone().multiplyScalar(Math.cos(dist / g0)).addScaledVector(e1, Math.sin(dist / g0) * Math.cos(ang)).addScaledVector(e2, Math.sin(dist / g0) * Math.sin(ang)).normalize();
    return { c, g0, e1, e2, dirAt };
  })();
  /* the trail to the far field (pass 72): a beaten-earth path laid along the way build_planet.py cleared,
     and small lanterns beside it every few steps, so in the dark it is plain where you can go */
  if (TRAIL.length > 3) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 512; const x = c.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 128, 0);
    gr.addColorStop(0, 'rgba(120,92,62,0)'); gr.addColorStop(.2, 'rgba(132,102,70,.9)'); gr.addColorStop(.5, 'rgba(150,118,82,1)'); gr.addColorStop(.8, 'rgba(132,102,70,.9)'); gr.addColorStop(1, 'rgba(120,92,62,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 512);
    for (let i = 0; i < 900; i++) { const px = 18 + rnd() * 92, py = rnd() * 512; x.fillStyle = 'rgba(' + (rnd() < .5 ? '70,52,34' : '190,160,120') + ',' + (.12 + rnd() * .2).toFixed(2) + ')'; x.fillRect(px, py, 1 + rnd() * 2, 1 + rnd() * 2); }
    for (let i = 0; i < 46; i++) { const px = 24 + rnd() * 80, py = rnd() * 512, r = 1.5 + rnd() * 3.5; x.fillStyle = 'rgba(' + (150 + rnd() * 40 | 0) + ',' + (145 + rnd() * 30 | 0) + ',' + (150 + rnd() * 40 | 0) + ',.85)'; x.beginPath(); x.ellipse(px, py, r, r * .7, rnd() * 3, 0, 6.3); x.fill(); }      // pebbles
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 8;
    const WD = 1.45, NX = 6, SUB = 2, pos = [], uv = [], col = [], idx = [], tg = V(0, 0, 0), sd = V(0, 0, 0), q = V(0, 0, 0), q2 = V(0, 0, 0), dd = V(0, 0, 0); let L = 0, rows = 0;
    /* pass 77: a close weave, a hand across and a foot along, that follows every bump of the finer ground
       (with two edges only, the lawn came up through the middle of the path in dark shards) */
    const top = (d) => { let h = ground(d); for (let k = 0; k < 4; k++) { q2.copy(d).addScaledVector(k < 2 ? sd : tg, (k % 2 ? 1 : -1) * .09 / R).normalize(); h = Math.max(h, ground(q2)); } return h; };
    const TG = TRAIL.map((d, i) => V(0, 0, 0).copy(TRAIL[Math.min(TRAIL.length - 1, i + 1)]).sub(TRAIL[Math.max(0, i - 1)]).normalize());
    TRAIL.forEach((d, i) => {
      const last = i === TRAIL.length - 1, seg = last ? 0 : TRAIL[i + 1].angleTo(d) * R;
      for (let sb = 0; sb < (last ? 1 : SUB); sb++) {
        const f = sb / SUB, Ld = L + seg * f;
        dd.copy(d); tg.copy(TG[i]);
        if (sb) { dd.lerp(TRAIL[i + 1], f).normalize(); tg.lerp(TG[i + 1], f).normalize(); }
        sd.crossVectors(dd, tg).normalize();
        const a = clamp((Ld - 2.2) / 2.5, 0, 1) * clamp((TRAIL.length * .5 - Ld) / 1.5, .25, 1);      // it begins a little way from the fire
        for (let k = 0; k <= NX; k++) { q.copy(dd).addScaledVector(sd, (k / NX - .5) * WD / R).normalize(); const r = top(q) + .045; pos.push(q.x * r, q.y * r, q.z * r); uv.push(k / NX, Ld / 2.2); col.push(1, 1, 1, a); }
        if (rows) for (let k = 0; k < NX; k++) { const a0 = (rows - 1) * (NX + 1) + k, b0 = rows * (NX + 1) + k; idx.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1); }
        rows++;
      }
      L += seg;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4)); g.setIndex(idx); g.computeVertexNormals();
    const path = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, transparent: true, depthWrite: false, roughness: 1, emissive: 0x6a4a2a, emissiveMap: tex, polygonOffset: true, polygonOffsetFactor: -2 }));      // it shows even on the night side
    path.receiveShadow = true; path.renderOrder = 1; scene.add(path);
    /* the lanterns */
    const post = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: .9 }), lampM = new THREE.MeshBasicMaterial({ color: hdr(1, .72, .38, 2.2) });
    let next = 5.2, side = 1; L = 0;                        // pass 77: the first one further from the camp, and all of them a good step off the path: beside the way, not across it
    for (let i = 1; i < TRAIL.length; i++) {
      L += TRAIL[i].angleTo(TRAIL[i - 1]) * R;
      if (L < next) continue;
      next += 3.4; side = -side;
      tg.copy(TRAIL[Math.min(TRAIL.length - 1, i + 1)]).sub(TRAIL[i - 1]).normalize(); sd.crossVectors(TRAIL[i], tg).normalize();
      q.copy(TRAIL[i]).addScaledVector(sd, side * 1.85 / R).normalize();
      if (land.free(q) < .05) q.copy(TRAIL[i]).addScaledVector(sd, side * 1.4 / R).normalize();
      const busy = (d) => PLACES.some((pl) => pl.id !== 'about' && pl.dir.angleTo(d) * R < 1.9) || at(2.56, 1.18).angleTo(d) * R < 1.6;      // (pass 75: one of them stood in the middle of the hatch)
      if (busy(q)) { q.copy(TRAIL[i]).addScaledVector(sd, -side * 1.85 / R).normalize(); if (busy(q)) continue; }
      const lg = new THREE.Group(); plant(lg, q, rnd() * 6, R - ground(q)); scene.add(lg);
      const pm = new THREE.Mesh(new THREE.CylinderGeometry(.03, .045, .85, 7), post); pm.position.y = .42; pm.castShadow = true; lg.add(pm);
      const lm = new THREE.Mesh(new THREE.OctahedronGeometry(.075, 0), lampM); lm.position.y = .92; lg.add(lm);
      const lgw = glow(hdr(1, .62, .3, .9), 1.1, 2.4); lgw.position.y = .92; lg.add(lgw);
    }
  }

  /* pass 75: what he gathers are Recyco's gems — the same brilliant cut the app draws (a flat table, six crown
     facets, a deep point) — and they are the way to the dead light bulb that waits on the highest stone */
  const gemGeo = (() => {
    const N = 6, pos = [], G = [], U = [], B = [0, -1.15, 0], C = [0, .5, 0];
    for (let k = 0; k < N; k++) { const an = k * 6.283185 / N, au = an + Math.PI / N; G.push([Math.cos(an), 0, Math.sin(an)]); U.push([.56 * Math.cos(au), .5, .56 * Math.sin(au)]); }
    const tri = (a, b, c) => {                              // every face looks outward, whichever way it was named
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, mx = a[0] + b[0] + c[0], my = a[1] + b[1] + c[1] + .6, mz = a[2] + b[2] + c[2];
      if (nx * mx + ny * my + nz * mz < 0) pos.push(...a, ...c, ...b); else pos.push(...a, ...b, ...c);
    };
    for (let k = 0; k < N; k++) { const a = G[k], b = G[(k + 1) % N], u = U[k], u0 = U[(k + N - 1) % N]; tri(C, u0, u); tri(a, b, u); tri(u0, a, u); tri(B, a, b); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); g.scale(.2, .2, .2); return g;
  })();
  const gemMat = new THREE.MeshStandardMaterial({ color: 0x8be89b, roughness: .14, metalness: 0, emissive: 0x1f7a3c, emissiveIntensity: 1.25, flatShading: true, envMapIntensity: 1.6 });
  const gems = [];
  function addGem(dir, r, kind) {                          // kind: 'tower' (always there) · 'trail' (they appear when the quest begins)
    const g = new THREE.Group(); g.position.copy(dir).multiplyScalar(r); g.quaternion.setFromUnitVectors(UP, dir); scene.add(g);
    const m = new THREE.Mesh(gemGeo, gemMat); m.castShadow = true; g.add(m);
    const gl = glow(new THREE.Color(.3, 1., .45).multiplyScalar(.7), 1.0, 2.6); g.add(gl);
    const gm = { g, m, gl, dir: dir.clone(), r, kind, got: 0, t: rnd() * 6, shown: 0, showAt: 0 };      // pass 76: none of them is there at first — they all come once the bulb and the batteries are recycled (quests.js)
    g.visible = false;
    gems.push(gm); return gm;
  }
  const TOWER = { plats: [], top: null, base: FIELD.c, on: -1, view: 0 };
  {
    const rockSide = new THREE.MeshStandardMaterial({ color: 0x6d6a82, roughness: .95 }), grassTop = new THREE.MeshStandardMaterial({ color: 0x4f8a3e, roughness: 1, emissive: 0x0d2208 });
    const rimMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(.35, .75, 1.3), fog: false });
    const STEP = .95, RT = 2.3, N = 14;
    for (let i = 0; i <= N; i++) {
      const last = i === N, h = .95 + i * STEP, r = FIELD.g0 + h, rad = last ? 1.5 : .85;
      const dir = last ? FIELD.c.clone() : FIELD.dirAt(i * .9, RT * FIELD.g0 / r);
      const g = new THREE.Group(); g.position.copy(dir).multiplyScalar(r); g.quaternion.setFromUnitVectors(UP, dir); scene.add(g);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * .55, .32, 22, 1), [rockSide, grassTop, rockSide]); body.position.y = -.16; body.castShadow = true; body.receiveShadow = true; g.add(body);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(rad * .5, .55, 9), rockSide); tip.rotation.x = Math.PI; tip.position.y = -.58; g.add(tip);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(rad * .98, .018, 6, 40).rotateX(Math.PI / 2), rimMat); rim.position.y = .005; g.add(rim);
      TOWER.plats.push({ dir, r, rad, i });
      if (!last) addGem(dir, r + .95, 'tower');           // on the last one stands the bulb (quests.js)
    }
    TOWER.top = TOWER.plats[N];
    const beacon = glow(new THREE.Color(.55, .8, 1.4), 3.2, 2.2); beacon.position.copy(TOWER.top.dir).multiplyScalar(TOWER.top.r + 1.9); scene.add(beacon); TOWER.beacon = beacon;
    for (let k = 0; k < 6; k++) { const d = FIELD.dirAt(k * 1.047 + .5, 1.15); addGem(d, ground(d) + .75, 'tower'); }      // a few at its foot, to show the way up
    /* and a line of them all along the lantern path, from the camp to the tower: they come up one after the other
       when the Recyco quest begins, and they are the way */
    { let L = 0, next = 4.2; for (let i = 1; i < TRAIL.length; i++) { L += TRAIL[i].angleTo(TRAIL[i - 1]) * R; if (L < next) continue; next += 1.9; if (TRAIL[i].dot(FIELD.c) > Math.cos(2.2 / FIELD.g0)) break; addGem(TRAIL[i], ground(TRAIL[i]) + .7, 'trail').order = gems.length; } }
  }
  const RACE = { gates: [], next: 0, on: false, t: 0, limit: 12, best: 0 };
  {
    const N = 8, RR = 5.4;
    for (let k = 0; k < N; k++) {
      const a = k / N * 6.2832, dir = FIELD.dirAt(a, RR), ahead = FIELD.dirAt(a + .05, RR), g = new THREE.Group();
      const fw = ahead.clone().sub(dir).normalize(); fw.addScaledVector(dir, -fw.dot(dir)).normalize(); const x = V(0, 0, 0).crossVectors(dir, fw);
      g.matrixAutoUpdate = false; g.matrix.makeBasis(x, dir, fw).setPosition(dir.clone().multiplyScalar(ground(dir))); scene.add(g);
      const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(.3, .6, 1), fog: false });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, .06, 10, 40), mat); ring.position.y = 1.08; g.add(ring);
      RACE.gates.push({ dir, mat, ring });
    }
  }
  const coinEl = document.querySelector('[data-world-coins]'), raceEl = document.querySelector('[data-world-race]');
  let gemN = 0, gemCombo = 0, gemAt = 0;
  function gemChime(big) {                                 // glass: two clear partials and a shimmer above them; each one in a row rings a step higher
    if (NO_SFX) return;                                    // pass 81: no sound effects made in code
    if (!actx || actx.state !== 'running') return;
    const t = actx.currentTime, LADDER = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
    gemCombo = time - gemAt < 2.2 ? Math.min(LADDER.length - 1, gemCombo + 1) : 0; gemAt = time;
    const f0 = 1046.5 * Math.pow(2, LADDER[gemCombo] / 12);
    (big ? [[1, .05, 0], [1.5, .04, .08], [2, .04, .16], [3, .03, .24], [4, .025, .32]] : [[1, .05, 0], [2.01, .028, .012], [3.02, .014, .02], [1.5, .018, .07]]).forEach((q) => {
      const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = f0 * q[0];
      g.gain.setValueAtTime(0, t + q[2]); g.gain.linearRampToValueAtTime(q[1], t + q[2] + .006); g.gain.exponentialRampToValueAtTime(.0004, t + q[2] + (big ? .9 : .5));
      o.connect(g); g.connect(actx.destination); o.start(t + q[2]); o.stop(t + q[2] + (big ? .95 : .55));
    });
  }
  const coinChime = gemChime;
  function showGems() { if (!coinEl) return; coinEl.hidden = false; coinEl.querySelector('b').textContent = gemN; coinEl.querySelector('span').textContent = gems.length; requestAnimationFrame(() => coinEl.classList.add('is-on')); }

  /* the telephone, on the seat of the chair (the lump the model had there is gone: build_planet.py) */
  const CHAIRQ = { x: 2.56, z: 1.18, spin: -.9, size: 1.1, sink: .03, cut: [.78, .8, .8, .13] };      // cut: half width, half height, half depth of what is taken out, and how far above the ground it starts
  const phoneSpot = at(CHAIRQ.x, CHAIRQ.z), phoneSeat = new THREE.Group(), phone = new THREE.Group();
  scene.add(phoneSeat);
  function buildChair() {
    const q = CHAIRQ, d = at(q.x, q.z), g = ground(d);
    phone.clear(); phoneSeat.clear(); phone.rotation.set(0, 0, 0); phone.position.set(0, 0, 0);
    if (chairFile) {                                       // Meshy's armchair, the rotary telephone on its cushion
      const src = chairFile.scene.clone(true);
      src.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; const mt = m.material; mt.metalness = 0; mt.roughness = .7; mt.envMapIntensity = .6; mt.emissiveMap = mt.map; mt.emissive = new THREE.Color(.11, .11, .12); if (mt.map) mt.map.anisotropy = 4; } });
      phone.add(src); phone.scale.setScalar(q.size);
      /* the lump the planet had there for a chair is taken out of its skin: a box that lies on the slope of the
         lawn there (it is not level), so that it takes the chair and none of the ground */
      const gp = (dx, dz) => { const q = at(q0x + dx, q0z + dz); return q.multiplyScalar(ground(q)); }, q0x = q.x, q0z = q.z;
      const ex = gp(.7, 0).sub(gp(-.7, 0)).normalize(), ez0 = gp(0, .7).sub(gp(0, -.7)).normalize(), ey = new THREE.Vector3().crossVectors(ez0, ex).normalize();
      if (ey.dot(d) < 0) ey.negate();
      const ez = new THREE.Vector3().crossVectors(ex, ey).normalize(), mid = gp(.7, 0).add(gp(-.7, 0)).add(gp(0, .7)).add(gp(0, -.7)).multiplyScalar(.25);
      const c = mid.clone().addScaledVector(ey, q.cut[3] + q.cut[1]);
      landU.uCutC.value.makeBasis(ex.clone().multiplyScalar(q.cut[0]), ey.clone().multiplyScalar(q.cut[1]), ez.clone().multiplyScalar(q.cut[2])).setPosition(c).invert();
      planetParts.forEach((m) => { if (m.geometry.boundingSphere.center.distanceTo(c) < m.geometry.boundingSphere.radius + 1.4) m.material = cutMat; });
      /* and the new one stands on that same slope, turned to face the camp */
      phoneSeat.position.copy(mid).addScaledVector(ey, -q.sink);
      phoneSeat.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(ex, ey, ez)).multiply(new THREE.Quaternion().setFromAxisAngle(UP, q.spin));
    } else {                                               // (no model: the old telephone on the old seat)
      let w = 1e-6; prop('phone').forEach((m) => { m.geometry.computeBoundingBox(); const b = m.geometry.boundingBox; w = Math.max(w, b.max.x - b.min.x); const c = new THREE.Mesh(m.geometry, m.material); c.castShadow = true; c.receiveShadow = true; phone.add(c); });
      phone.scale.setScalar(.5 / w); plant(phoneSeat, d, .7, R - 9.87);
    }
    phoneSeat.add(phone);
  }
  buildChair();
  /* a station for the Manic GT (quests.js sets it on its platform). Whatever of the planet's own would stand in it is
     not drawn — a fourth cut in the planet's material, from just under the platform's top upward.
     STATIONQ: its middle in metres from the fire, half its length (along x) and half its width. */
  const STATIONQ = { x: -1.5, z: 13.7, yaw: Math.PI, hx: 1.4, hz: 1.175, lift: .1, tall: 1.9 };      // pass 77: it stood squeezed between the house and the bushes; now on the wide lawn past the lake, by the lantern path, its open side toward the camp
  const station = new THREE.Group(); station.matrixAutoUpdate = false; scene.add(station);
  function buildStation() {
    const q = STATIONQ, gp = (dx, dz) => { const pt = at(q.x + dx, q.z + dz); return pt.multiplyScalar(ground(pt)); };
    const mid = gp(0, 0), ex = gp(q.hx, 0).sub(gp(-q.hx, 0)).normalize(), ez0 = gp(0, q.hz).sub(gp(0, -q.hz)).normalize(), ey = new THREE.Vector3().crossVectors(ez0, ex).normalize();
    if (ey.dot(mid) < 0) ey.negate();
    const ez = new THREE.Vector3().crossVectors(ex, ey).normalize();
    if (q.yaw) { ex.applyAxisAngle(ey, q.yaw); ez.applyAxisAngle(ey, q.yaw); }
    let hi = -1e9;                                         // the highest ground under it: its top stands a little above that
    for (let a = -1; a <= 1; a += .5) for (let b = -1; b <= 1; b += .5) hi = Math.max(hi, gp(a * q.hx, b * q.hz).sub(mid).dot(ey));
    const top = mid.clone().addScaledVector(ey, hi + q.lift);
    station.userData = { ex, ey, ez, mid, top, q, dir: mid.clone().normalize() };
    station.matrix.makeBasis(ex, ey, ez).setPosition(top); station.matrixWorldNeedsUpdate = true;
    landU.uCutD.value.makeBasis(ex.clone().multiplyScalar(q.hx - .05), ey.clone().multiplyScalar(q.tall), ez.clone().multiplyScalar(q.hz - .05)).setPosition(top.clone().addScaledVector(ey, q.tall - .07)).invert();
    planetParts.forEach((m) => { if (m.geometry.boundingSphere.center.distanceTo(top) < m.geometry.boundingSphere.radius + 2.4) m.material = cutMat; });
  }
  buildStation();
  const inStation = (d, pad = .2) => { const u = station.userData, w = d.clone().multiplyScalar(R).sub(u.mid); return Math.abs(w.dot(u.ex)) < u.q.hx + pad && Math.abs(w.dot(u.ez)) < u.q.hz + pad; };

  /* the portal: its own light on the stones round it */
  const portalLight = new THREE.PointLight(0xb070ff, 26, 13, 1.6); portalLight.position.copy(PORTAL).multiplyScalar(1.12); scene.add(portalLight);
  const portalGlow = glow(new THREE.Color(.5, .22, 1.), 7, 2.2); portalGlow.position.copy(PORTAL).multiplyScalar(1.04); scene.add(portalGlow);
  /* the house: the light of its windows falls on the lawn */
  const houseLight = new THREE.PointLight(0xffb45e, 5, 7, 1.5); { const d = at(3.3, -1.5); houseLight.position.copy(d).multiplyScalar(ground(d) + 1.3); } scene.add(houseLight);

  /* grass: tufts of blades on the lawns, moving in the wind */
  const windy = (mat, amp) => {
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = uTime;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 ip = instanceMatrix[3].xyz; float bend = position.y * position.y * 22.;
          transformed.x += (sin(uTime * 1.7 + ip.x * 1.3 + ip.z * 1.7) * .6 + sin(uTime * 3.1 + ip.y * 2.1 + ip.x * .7) * .3) * bend * ${amp.toFixed(3)};
          transformed.z += cos(uTime * 1.3 + ip.z * 2. + ip.y) * bend * ${(amp * .6).toFixed(3)};
        #endif`);
    };
    return mat;
  };
  const grassChunks = [];
  {
    /* tufts (a model from the web), planted by the thousand — only where the planet is a lawn, and in the open */
    const src = prop('grass2')[0], g = src.geometry;
    const N = lite ? 4200 : 9000, near = Math.round(N * .45);
    const mat = windy(src.material.clone(), calm ? 0 : .011);
    mat.emissiveMap = mat.map; mat.emissive = new THREE.Color(.02, .05, .016); mat.roughness = 1; mat.envMapIntensity = .15;      // painted more than lit: it stays green in any light
    /* in patches, so the far side of the planet is not drawn (it is below the horizon) */
    const K = 28, centres = [];
    for (let i = 0; i < K; i++) { const y = 1 - 2 * (i + .5) / K, q = Math.sqrt(1 - y * y), a = i * 2.39996; centres.push({ c: V(q * Math.cos(a), y, q * Math.sin(a)), m: [], col: [], a: 0 }); }
    const d = new THREE.Object3D(), c = new THREE.Color();
    for (let i = 0, tries = 0; i < N && tries < N * 40; tries++) {
      let dir;
      if (i < near) { const r = Math.sqrt(rnd()) * 10, t = rnd() * 6.2832; dir = at(Math.cos(t) * r, Math.sin(t) * r); } else dir = anyDir();
      if (!(land.kind(dir) & 1) || land.free(dir) < .1 || dir.y > .9982 || (dir.y < .97 && onTrail(dir, .95)) || inStation(dir)) continue;      // not on the lantern path      // a lawn, in the open, and not in the fire
      const top = i < near; i++;
      plant(d, dir, rnd() * 6.2832, R - ground(dir) + .02);
      d.rotateX(rr(-.12, .12)); d.rotateZ(rr(-.12, .12));
      const s = rr(.2, .34) * (top ? 1 : 1.3); d.scale.set(s * 1.45, s * rr(.75, 1.2), s * 1.45);
      d.updateMatrix();
      const k = rnd(), dry = rnd() < .12 ? .5 : 0;
      c.setRGB(.30 + .14 * k + .12 * dry, .62 + .2 * k, .16 + .08 * k);
      let best = centres[0], bd = -2;
      centres.forEach((ch) => { const q = ch.c.dot(dir); if (q > bd) { bd = q; best = ch; } });
      best.m.push(d.matrix.clone()); best.col.push(c.clone()); best.a = Math.max(best.a, Math.acos(Math.min(1, bd)));
    }
    centres.forEach((ch) => {
      if (!ch.m.length) return;
      const im = new THREE.InstancedMesh(g, mat, ch.m.length);
      ch.m.forEach((m, i) => { im.setMatrixAt(i, m); im.setColorAt(i, ch.col[i]); });
      im.receiveShadow = true; im.computeBoundingSphere(); scene.add(im);
      grassChunks.push({ mesh: im, c: ch.c, a: ch.a, full: ch.m.length });
    });
  }

  /* what he walks round, apart from what the planet itself has (the fire) */
  const obstacles = [];                                    // {dir, rad}

  /* flowers and mushrooms to find */
  function scatter(g, n, tint, smin, smax, keep) {
    const im = new THREE.InstancedMesh(g, windy(std({ roughness: .8 }), calm ? 0 : .02), n), d = new THREE.Object3D(), c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      let dir; do { dir = anyDir(); } while (!keep(dir));
      plant(d, dir, rnd() * 6.2832, R - ground(dir) + .004);
      const s = rr(smin, smax); d.scale.set(s, s, s); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
      c.set(tint[Math.floor(rnd() * tint.length)]); im.setColorAt(i, c);
    }
    im.receiveShadow = true; im.frustumCulled = false; scene.add(im);
  }
  scatter(geo.flower, 150, [0xffffff, 0xffc4d6, 0xffe9a8, 0xbfeaff], .8, 1.5, (d) => (land.kind(d) & 1) && land.free(d) > .2 && d.y < .997 && !inStation(d) && !onTrail(d, .9));
  scatter(geo.mushroom, 36, [0xffffff, 0xffe1c8], .8, 1.7, (d) => d.y < .3 && (land.kind(d) & 1) && land.free(d) > .3);

  /* a small light floats over each place */
  PLACES.forEach((p) => {
    const gl = glow(new THREE.Color(p.tint).multiplyScalar(.9), 1.5, 2.4);
    gl.position.copy(p.dir).multiplyScalar(p.id === 'about' ? ground(p.dir) + .55 : land.hull(p.dir) + (p.id === 'lab' ? .6 : .85)); scene.add(gl); p.glow = gl;
    if (p.eye) p.look = p.eye[0].clone().multiplyScalar(ground(p.eye[0]) + p.eye[1]);
  });

  /* the water: a living skin over the lakes the model paints — ripples, the dusk, the fire's long glint; it mirrors whoever leans over it */
  const rtRefl = new THREE.WebGLRenderTarget(lite ? 384 : 640, lite ? 256 : 400, { type: THREE.HalfFloatType });
  const reflCam = new THREE.PerspectiveCamera(), texMat = new THREE.Matrix4();
  const waterMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide,
    uniforms: { time: uTime, tRefl: { value: rtRefl.texture }, texMat: { value: texMat }, refl: { value: 0 }, look: { value: 0 }, uFire: { value: FIRE }, uSun: { value: V(0, .3, -1) }, uFlick: { value: 1 } },
    vertexShader: `varying vec2 vUv; varying vec3 vW; varying vec4 vP; uniform mat4 texMat;
      void main(){ vUv = uv; vW = position; vP = texMat * vec4(position, 1.); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `varying vec2 vUv; varying vec3 vW; varying vec4 vP; uniform sampler2D tRefl; uniform float time, refl, look, uFlick; uniform vec3 uFire, uSun;
      void main(){
        vec3 n = normalize(vW), v = normalize(cameraPosition - vW);
        vec3 t1 = normalize(cross(n, vec3(.3, .1, .9))), t2 = cross(n, t1);
        vec2 p = vec2(dot(vW, t1), dot(vW, t2));
        float calm = 1. - .8 * look;                         // it stills where he looks into it
        float a1 = p.x * 5.1 + p.y * 2.3 + time * 1.1, a2 = p.x * -3.7 + p.y * 6.9 - time * 1.5, a3 = p.x * 11. + p.y * 9. + time * 2.1;
        vec2 gr = (vec2(5.1, 2.3) * cos(a1) * .5 + vec2(-3.7, 6.9) * cos(a2) * .3 + vec2(11., 9.) * cos(a3) * .14) * .02 * calm;      // the slope of the ripples
        vec3 nw = normalize(n - t1 * gr.x - t2 * gr.y);
        float fr = pow(1. - clamp(dot(nw, v), 0., 1.), 3.);
        vec3 rd = reflect(-v, nw), sun = normalize(uSun);
        vec3 sky = mix(vec3(.03, .09, .24), vec3(.42, .17, .24), pow(clamp(.5 + .5 * dot(rd, sun), 0., 1.), 3.));         // the dusk, when the mirror itself is not drawn
        vec3 col = mix(sky, texture2DProj(tRefl, vP + vec4(gr * .9, 0., 0.) * vP.w).rgb, refl);
        vec3 toF = uFire - vW; float dF = length(toF); toF /= dF;
        float sF = pow(max(dot(nw, normalize(toF + v)), 0.), 160.) * 26. / (1. + dF * dF * .05) * uFlick * (1. - look);          // the fire, broken by the ripples
        float sS = pow(max(dot(nw, normalize(sun + v)), 0.), 260.) * 7. * (1. - look);                                          // and the last of the sun
        col += vec3(1., .5, .16) * sF + vec3(1., .55, .32) * sS;
        col = mix(col, col * vec3(.72, .86, 1.), look);          // seen in water, not in glass
        float a = clamp(.2 + .7 * fr + .76 * look * refl + (sF + sS) * .4, 0., .97) * (1. - smoothstep(.74, 1., vUv.y));
        gl_FragColor = vec4(col, a);
      }`
  });
  const water = (() => {
    const pos = [], uv = [], idx = [], RG = 7, v = new THREE.Vector3(); let base = 0;
    LAKES.forEach((L) => {
      const N = L.rim.length;
      for (let r = 0; r <= RG; r++) for (let a = 0; a < N; a++) {
        const k = r / RG, t = a / N * 6.283185, arc = L.rim[a] * k * 1.03 / R;
        v.copy(L.c).multiplyScalar(Math.cos(arc)).addScaledVector(L.e1, Math.sin(arc) * Math.cos(t)).addScaledVector(L.e2, Math.sin(arc) * Math.sin(t)).normalize();
        const rad = ground(v) + .03; pos.push(v.x * rad, v.y * rad, v.z * rad); uv.push(a / N, k);
      }
      for (let r = 0; r < RG; r++) for (let a = 0; a < N; a++) { const p0 = base + r * N + a, p1 = base + r * N + (a + 1) % N; idx.push(p0, p0 + N, p1, p1, p0 + N, p1 + N); }
      base += (RG + 1) * N;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    const m = new THREE.Mesh(g, waterMat); m.renderOrder = 2; m.frustumCulled = false; scene.add(m); return m;
  })();
  /* a soft blue air round the whole planet */
  {
    const air = new THREE.Mesh(new THREE.SphereGeometry(9 * 1.16, 96, 64), new THREE.ShaderMaterial({
      transparent: false, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.BackSide,      // pass 78: a backdrop, drawn after the sky and before everything else. (It was tested against depth: the roof of the house, which rises through this shell, was blue above a straight line.)
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float f = pow(clamp(-dot(vN, vV) / .47, 0., 1.), 2.6); gl_FragColor = vec4(vec3(.14, .40, 1.) * f * .5, 1.); }'
    }));
    air.position.set(.9, 1.4, -.05);                        // the middle of the whole body (the lawn's dome has its own, lower: tools/blender/planet_frame.py)
    air.renderOrder = -5; scene.add(air);
  }

  /* ---------- the fire ---------- */
  const fire = new THREE.Group(); plant(fire, UP, 0, R - ground(UP)); scene.add(fire);
  obstacles.push({ dir: at(0, 0), rad: .5 });
  {
    const logs = new THREE.Mesh(geo.fire, M.wood); logs.receiveShadow = true; fire.add(logs);
    const em = new THREE.Mesh(geo.embers, new THREE.MeshBasicMaterial({ color: hdr(1, .32, .05, 5), fog: false })); fire.add(em);
  }
  const flameMat = (seedv, gain) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    uniforms: { time: uTime, seed: { value: seedv }, gain: { value: gain } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `
      varying vec2 vUv; uniform float time, seed, gain;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ return .5 * noise(p) + .28 * noise(p * 2.1 + 3.) + .14 * noise(p * 4.3 + 7.) + .08 * noise(p * 8.7); }
      void main(){
        vec2 p = vec2((vUv.x - .5) * 2., vUv.y);
        float t = time * 1.5 + seed;
        float n = fbm(vec2(p.x * 1.7 + seed, p.y * 2.3 - t * 1.25));
        float n2 = fbm(vec2(p.x * 3.4 - seed, p.y * 4.6 - t * 2.1));
        p.x += (n - .5) * .75 * p.y;
        float w = .7 * pow(max(0., 1. - p.y), .85) * (.8 + .34 * n2);
        float d = abs(p.x) / max(w, .001);
        float body = smoothstep(1., .12, d) * smoothstep(0., .07, p.y);
        float heat = clamp(body * (1.16 - p.y * .82) + (n2 - .52) * .55 * body, 0., 1.);
        vec3 col = mix(vec3(.9,.07,.01), vec3(1.,.33,.03), smoothstep(.08,.42,heat));
        col = mix(col, vec3(1.,.72,.2), smoothstep(.4,.74,heat));
        col = mix(col, vec3(1.,.9,.6), smoothstep(.82,1.,heat));
        float a = smoothstep(.04,.34,heat);
        gl_FragColor = vec4(col * a * gain * (.7 + heat * 1.6), 1.);
      }`
  });
  const flames = [[.62, .58, 0, 1.25], [.44, .42, 3.7, 1.0]].map((f) => {
    const g = new THREE.PlaneGeometry(f[0], f[1]); g.translate(0, f[1] / 2, 0);
    const m = new THREE.Mesh(g, flameMat(f[2], f[3])); m.position.y = .045; m.renderOrder = 4; fire.add(m); return m;
  });
  const fireGlow = glow(hdr(1, .36, .08, .3), 3.2, 2.8); fireGlow.position.set(0, .34, 0); fire.add(fireGlow);

  /* sparks and smoke: soft points */
  const pointMat = (blending, soft) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending, fog: false, uniforms: { px: { value: 1 } },
    vertexShader: `attribute float aSize; attribute vec4 aColor; varying vec4 vC; uniform float px;
      void main(){ vC = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = aSize * px * 600. / max(.1, -mv.z); }`,
    fragmentShader: `varying vec4 vC; void main(){ float d = length(gl_PointCoord - .5) * 2.; float a = pow(max(0., 1. - d), ${soft.toFixed(1)}); gl_FragColor = vec4(vC.rgb * ${blending === THREE.AdditiveBlending ? 'a' : '1.'}, vC.a * a); }`
  });
  function points(n, mat) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(n * 4), 4));
    g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n), 1));
    const p = new THREE.Points(g, mat); p.frustumCulled = false; scene.add(p); return p;
  }
  const softMats = [pointMat(THREE.AdditiveBlending, 1.6), pointMat(THREE.NormalBlending, 1.3)];
  const sparks = points(34, softMats[0]); sparks.renderOrder = 6;
  const sparkSeed = Array.from({ length: 34 }, () => ({ o: rnd(), a: rnd() * 6.2832, r: rr(.03, .16), s: rr(.5, 1.1), w: rr(.6, 1.6) }));
  const smoke = points(22, softMats[1]); smoke.renderOrder = 3;
  const flies = points(40, softMats[0]); flies.renderOrder = 6;
  const flySeed = Array.from({ length: 40 }, (_, i) => { const dir = i < 24 ? at(rr(-9, 9), rr(-9, 9)) : anyDir(); return { dir, g: land.hull(dir), h: rr(.35, 2.2), a: rnd() * 6.2832, s: rr(.2, .6), ax: V(rr(-1, 1), rr(-1, 1), rr(-1, 1)).normalize() }; });     // more of them over the lawn and its water

  /* ---------- Jaime: the Meshy character, moved by the animations made there ---------- */
  const me = new THREE.Group(); scene.add(me);
  const body = charFile.scene; me.add(body);
  const bones = {};
  body.traverse((o) => {
    if (o.isBone) bones[o.name.replace(/^mixamorig:?/, '')] = o;
    if (o.isMesh) {
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
      const mt = o.material; mt.envMapIntensity = .6; mt.metalness = 0; mt.roughness = .8;
      mt.emissiveMap = mt.map; mt.emissive = new THREE.Color(.085, .085, .1);          // a little of his own colour in any light: a cartoon, not a photograph
    }
  });
  bones.head = bones.Head;
  const mixer = new THREE.AnimationMixer(body), acts = {};
  charFile.animations.forEach((clip) => {
    {                                                       // every clip stays on its spot: the planet turns under him, and he never drifts into the tree
      clip.tracks.forEach((tr) => { if (/Hips\.position$/.test(tr.name)) { const v = tr.values, x0 = v[0], z0 = v[2]; for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; } } });
    }
    acts[clip.name] = mixer.clipAction(clip);
  });
  {
    const up = charFile.animations.find((c) => c.name === 'standup'), end = Math.round(up.duration * 24);
    acts.idle = mixer.clipAction(THREE.AnimationUtils.subclip(up, 'idle', end - 1, end, 24));   // standing still: where getting up leaves him
    acts.standup.setLoop(THREE.LoopOnce, 1); acts.standup.clampWhenFinished = true; acts.standup.timeScale = 1.55;
    acts.run.timeScale = 1.15;
  }
  {
    const pick = (clip, name, re) => new THREE.AnimationClip(name, clip.duration, clip.tracks.filter((tr) => re.test(tr.name)));
    const sitC = charFile.animations.find((c) => c.name === 'sit'), playC = charFile.animations.find((c) => c.name === 'play');
    acts.legs = mixer.clipAction(pick(sitC, 'legs', /(Hips|UpLeg|Leg|Foot|Toe)/));
    acts.upper = mixer.clipAction(pick(playC, 'upper', /(Spine|Neck|Head\.|Shoulder)/));
  }
  const ARMB = ['LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand'].map((n) => bones[n]).filter(Boolean);
  const armRest = ARMB.map((b) => b.quaternion.clone()), armPre = ARMB.map(() => new THREE.Quaternion());
  let nowAct = null, animDt = 0, seated = false;
  function setAnim(name, fade = .28) {
    const a = acts[name];
    if (!a || a === nowAct) return;
    a.reset().setEffectiveWeight(1).play();
    if (nowAct) nowAct.crossFadeTo(a, fade, false);
    nowAct = a;
  }
  /* the guitar: a real one (from the web). In his lap while he plays, on his back when he walks. */
  const guitar = new THREE.Group();
  prop('guitar').forEach((m) => { const g = m.clone(); g.castShadow = true; g.receiveShadow = true; guitar.add(g); });
  guitar.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.roughness = .4; m.material.envMapIntensity = 1; m.material.emissive = m.material.color.clone().multiplyScalar(.22); } });
  scene.add(guitar); guitar.matrixAutoUpdate = false;
  const GS = .8;                                           // the model is 1.28 long: a metre of guitar
  const gA = { p: V(0, 0, 0), q: new THREE.Quaternion() }, gB = { p: V(0, 0, 0), q: new THREE.Quaternion() };
  const gm = new THREE.Matrix4(), gx = V(0, 0, 0), gy = V(0, 0, 0), gz = V(0, 0, 0), hL = V(0, 0, 0), hR = V(0, 0, 0), gsc = V(GS, GS, GS), gp = V(0, 0, 0), gq = new THREE.Quaternion();
  const TUNE = { neck: 1.06, lift: -.03, top: [.8, .45], back: .19, low: -.16, side: -.03, tilt: .42, flip: 1 };
  function gFrame(out, y, zHint) { gy.copy(y).normalize(); gx.crossVectors(gy, zHint).normalize(); gz.crossVectors(gx, gy).normalize(); gm.makeBasis(gx, gy, gz); out.setFromRotationMatrix(gm); }
  /* each hand: which way its fingers run, which way its palm faces, the line of its knuckles — read once from the pose he was made in */
  const HANDS = {};
  ['Left', 'Right'].forEach((S) => {
    const hand = bones[S + 'Hand'], i1 = bones[S + 'HandIndex1'], m1 = bones[S + 'HandMiddle1'], p1 = bones[S + 'HandPinky1'];
    if (!hand || !i1 || !m1 || !p1) return;
    body.updateMatrixWorld(true);
    const ph = hand.getWorldPosition(V(0, 0, 0)), pi = i1.getWorldPosition(V(0, 0, 0)), pm = m1.getWorldPosition(V(0, 0, 0)), pp = p1.getWorldPosition(V(0, 0, 0));
    const f = pm.clone().sub(ph).normalize(), kn = pp.clone().sub(pi).normalize(), n = f.clone().cross(kn).normalize();
    if (n.y > 0) n.negate();                               // palms down, in that pose
    const sgn = f.clone().applyAxisAngle(kn, .3).dot(n) > f.dot(n) ? 1 : -1, inv = hand.getWorldQuaternion(new THREE.Quaternion()).invert();
    const fingers = ['Index', 'Middle', 'Ring', 'Pinky'].map((nm) => [1, 2, 3].map((k) => bones[S + 'Hand' + nm + k]).filter(Boolean)), all = fingers.flat();
    HANDS[S] = { hand, f: f.applyQuaternion(inv), n: n.applyQuaternion(inv), kn: kn.applyQuaternion(inv), sgn, fingers, all, restQ: all.map((b) => b.quaternion.clone()) };
  });
  let fingersOn = false;
  const CHORDS = [.7, .82, .75, .88];                       // pass 75: on the frets (it was up at the head, off the end of the neck)
  /* pass 75: the seated pose, in numbers (window.__world.GQ): where the guitar lies against him, where each wrist goes
     relative to it (along the neck, off its top, across it), which way the fingers run and the palms face */
  const GQ = { f: .25, n: -.1, s: .1, a: .33, neck: [-.84, .46, .2], top: [.12, .42, .9],
    pick: [.40, .12, .065], pickF: [-1, -.45, -.2], pickN: [-.3, -1, 0], pickPole: [.9, -.35, -.45],
    fret: [-.03, -.075], fretF: [1, .3, 0], fretN: [.15, 1, 0], fretPole: [-.75, -.6, -.3], lift: .025 };      // the fretting hand comes from behind the neck and closes round it (it used to lie through it, from the front)
  const SHAPES = [[1.0, 1.15, .95, .8], [.7, 1.2, 1.15, .95], [1.15, .85, 1.05, 1.15], [.9, 1.05, .75, 1.05]];      // how each finger bends on each chord                    // where along the neck his hand stops, bar after bar
  const ikA = V(0, 0, 0), ikF = V(0, 0, 0), ikH = V(0, 0, 0), ikU = V(0, 0, 0), ikW = V(0, 0, 0), ikE = V(0, 0, 0), ikD = V(0, 0, 0), ikQ = new THREE.Quaternion(), ikQw = new THREE.Quaternion(), ikQp = new THREE.Quaternion();
  function aimBone(bone, from, to) {                       // turn a bone, in the world, so that one direction becomes another
    ikQ.setFromUnitVectors(from, to); bone.getWorldQuaternion(ikQw); ikQw.premultiply(ikQ);
    bone.parent.getWorldQuaternion(ikQp); bone.quaternion.copy(ikQp.invert().multiply(ikQw)); bone.updateMatrixWorld(true);
  }
  function reachArm(side, target, pole) {                  // shoulder and elbow turn so the wrist is on the target
    const A = bones[side + 'Arm'], F = bones[side + 'ForeArm'], Hd = bones[side + 'Hand'];
    A.getWorldPosition(ikA); F.getWorldPosition(ikF); Hd.getWorldPosition(ikH);
    const a = ikA.distanceTo(ikF), b = ikF.distanceTo(ikH);
    ikU.copy(target).sub(ikA); const d = clamp(ikU.length(), .06, (a + b) * .995); ikU.normalize();
    const ca = clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1), sa = Math.sqrt(1 - ca * ca);
    ikW.copy(pole).addScaledVector(ikU, -pole.dot(ikU)).normalize();
    ikE.copy(ikA).addScaledVector(ikU, a * ca).addScaledVector(ikW, a * sa);
    aimBone(A, ikD.copy(ikF).sub(ikA).normalize(), ikW.copy(ikE).sub(ikA).normalize());
    F.getWorldPosition(ikF); Hd.getWorldPosition(ikH);
    aimBone(F, ikD.copy(ikH).sub(ikF).normalize(), ikW.copy(target).sub(ikF).normalize());
  }
  function turnBone(bone, axis, ang) { ikQ.setFromAxisAngle(axis, ang); bone.getWorldQuaternion(ikQw); ikQw.premultiply(ikQ); bone.parent.getWorldQuaternion(ikQp); bone.quaternion.copy(ikQp.invert().multiply(ikQw)); bone.updateMatrixWorld(true); }
  function setHand(S, fDir, nDir) {                        // fingers along one direction, the palm facing another
    const Hh = HANDS[S]; if (!Hh) return;
    Hh.hand.getWorldQuaternion(ikQw); ikD.copy(Hh.f).applyQuaternion(ikQw); ikU.copy(fDir).normalize(); aimBone(Hh.hand, ikD, ikU);
    Hh.hand.getWorldQuaternion(ikQw); ikD.copy(Hh.n).applyQuaternion(ikQw); ikD.addScaledVector(ikU, -ikD.dot(ikU)).normalize();
    ikW.copy(nDir).addScaledVector(ikU, -nDir.dot(ikU)).normalize(); aimBone(Hh.hand, ikD, ikW);
  }
  function curlHand(S, bend) {                             // bend: one amount per finger (index … little)
    const Hh = HANDS[S]; if (!Hh) return;
    Hh.all.forEach((b, i) => b.quaternion.copy(Hh.restQ[i])); Hh.hand.updateMatrixWorld(true);
    Hh.hand.getWorldQuaternion(ikQw); ikE.copy(Hh.kn).applyQuaternion(ikQw);
    Hh.fingers.forEach((chain, fi) => chain.forEach((b, k) => turnBone(b, ikE, Hh.sgn * bend[fi] * [1, 1.1, .7][k])));
  }
  const bendA = [0, 0, 0, 0], bendB = [0, 0, 0, 0];
  function holdGuitar(st) {
    me.updateMatrixWorld(true);
    const k = sst(.3, .78, st);
    const ks = 1 - sst(0, .3, st);
    if (ks <= 0 && fingersOn) { fingersOn = false; ['Left', 'Right'].forEach((S) => { const Hh = HANDS[S]; if (Hh) Hh.all.forEach((b, i) => b.quaternion.copy(Hh.restQ[i])); }); }
    if (k < 1) {                                           // seated: the guitar lies in his lap, the neck out to his right and up
      gx.set(GQ.neck[0], GQ.neck[1], GQ.neck[2]).normalize().transformDirection(me.matrixWorld);          // along the neck
      gz.set(GQ.top[0], GQ.top[1], GQ.top[2]).normalize().transformDirection(me.matrixWorld);             // the way its top faces
      v1.copy(gx); v2.copy(gz); gFrame(gA.q, v1, v2);
      (bones.Spine1 || bones.Hips).getWorldPosition(gA.p);                           // it rests against his belly, wherever he leans
      gA.p.addScaledVector(curF, GQ.f).addScaledVector(curN, GQ.n).addScaledVector(gp.crossVectors(curN, curF).normalize(), GQ.s).addScaledVector(gy, -GQ.a * GS);
      if (ks > 0 && ARMB.length === 6) {                   // and his hands are on it: one walks the neck from chord to chord, one strums
        const tt = time, bar = Math.floor(tt / 2.4), u = tt / 2.4 - bar, ch = CHORDS[bar % CHORDS.length], prev = CHORDS[(bar + CHORDS.length - 1) % CHORDS.length];
        const mv = sst(0, .13, u), fy = mix(prev, ch, mv), liftF = Math.sin(Math.PI * mv) * GQ.lift;
        const beat = tt * 2.9, sw = Math.sin(beat * Math.PI) * (.6 + .4 * Math.sin(beat * Math.PI * .5 + .6));
        hL.copy(gA.p).addScaledVector(gy, GQ.pick[0] * GS).addScaledVector(gz, GQ.pick[1]).addScaledVector(gx, GQ.pick[2] + sw * .008);       // picking wrist: resting over the strings, by the hole
        hR.copy(gA.p).addScaledVector(gy, fy * GS).addScaledVector(gz, GQ.fret[0] - liftF).addScaledVector(gx, GQ.fret[1]);           // fretting wrist: behind the neck and under it, the fingers come up round it
        ARMB.forEach((b, i) => { armPre[i].copy(b.quaternion); b.quaternion.copy(armRest[i]); });
        me.updateMatrixWorld(true);
        reachArm('Left', hL, v1.set(GQ.pickPole[0], GQ.pickPole[1], GQ.pickPole[2]).transformDirection(me.matrixWorld));
        reachArm('Right', hR, v1.set(GQ.fretPole[0], GQ.fretPole[1], GQ.fretPole[2]).transformDirection(me.matrixWorld));
        // the hands themselves: the picking one lies over the strings, its fingers taking them one after another; the other is closed round the neck
        setHand('Left', v1.copy(gx).multiplyScalar(GQ.pickF[0]).addScaledVector(gz, GQ.pickF[1]).addScaledVector(gy, GQ.pickF[2]), v2.copy(gx).multiplyScalar(GQ.pickN[0]).addScaledVector(gz, GQ.pickN[1]).addScaledVector(gy, GQ.pickN[2]));      // fingers down across the strings, palm to the top
        setHand('Right', v1.copy(gx).multiplyScalar(GQ.fretF[0]).addScaledVector(gz, GQ.fretF[1]).addScaledVector(gy, GQ.fretF[2]), v2.copy(gx).multiplyScalar(GQ.fretN[0]).addScaledVector(gz, GQ.fretN[1]).addScaledVector(gy, GQ.fretN[2]));  // fingers up round the neck from behind it, palm to its back
        for (let i = 0; i < 4; i++) {
          const pl = Math.pow(Math.max(0, Math.sin(6.2832 * (tt * 1.25 - i * .25))), 6);
          bendA[i] = i < 3 ? .5 + .55 * pl : .85;
          bendB[i] = mix(SHAPES[(bar + SHAPES.length - 1) % SHAPES.length][i], SHAPES[bar % SHAPES.length][i], mv) * (1 - .35 * Math.sin(Math.PI * mv));
        }
        curlHand('Left', bendA); curlHand('Right', bendB); fingersOn = true;
        if (ks < 1) ARMB.forEach((b, i) => { gq.copy(b.quaternion); b.quaternion.copy(armPre[i]).slerp(gq, ks); });
        if (bones.Head) { bones.Head.rotation.x += -.06 + .05 * Math.sin(beat * Math.PI * .5); bones.Head.rotation.y += -.2 + .1 * Math.sin(tt * .5); }        // chin up a little: his face is seen
      }
    }
    if (k > 0 && bones.Spine2) {                           // walking: flat against his back, the neck over his left shoulder
      bones.Spine2.getWorldPosition(hL); bones.Head.getWorldPosition(hR); bones.Hips.getWorldPosition(gp);
      const up = v1.copy(hR).sub(gp).normalize(), left = v2.crossVectors(up, curF).normalize(), back = v3.crossVectors(up, left).normalize();
      gz.copy(up).multiplyScalar(.9).addScaledVector(left, TUNE.tilt);
      gB.p.copy(hL).addScaledVector(back, TUNE.back).addScaledVector(up, TUNE.low).addScaledVector(left, TUNE.side);
      gFrame(gB.q, gz, gx.copy(back).multiplyScalar(TUNE.flip));
      gB.p.addScaledVector(gy, -.36 * GS);
    }
    gp.copy(gA.p).lerp(gB.p, k); gq.copy(gA.q).slerp(gB.q, k);
    if (k <= 0) { gp.copy(gA.p); gq.copy(gA.q); } else if (k >= 1) { gp.copy(gB.p); gq.copy(gB.q); }
    guitar.matrix.compose(gp, gq, gsc); guitar.matrixWorldNeedsUpdate = true;
  }
  const POSE = {}, Z4 = [0, 0, 0, 0];
  function pose(st, add) {                                 // st: 0 seated … 1 on his feet
    const walking = mode === 'walk';
    const want = (!walking || sitting) ? 'play' : st < 1 ? 'standup' : player.speed > 2.9 ? 'run' : player.speed > .25 ? 'walk' : 'idle';
    if (want === 'play') {
      if (!seated) {
        seated = true;
        if (walking && nowAct) { nowAct.fadeOut(.55); nowAct = null; acts.legs.reset().setEffectiveWeight(1).fadeIn(.55).play(); acts.upper.reset().setEffectiveWeight(1).fadeIn(.55).play(); }      // down he goes, where he stands
        else { if (nowAct) { nowAct.stop(); nowAct = null; } acts.legs.reset().setEffectiveWeight(1).play(); acts.upper.reset().setEffectiveWeight(1).play(); }
      }
    } else {
      if (seated) { seated = false; acts.legs.fadeOut(.4); acts.upper.fadeOut(.4); }
      setAnim(want, want === 'standup' ? .4 : .22);
    }
    if (nowAct === acts.walk) acts.walk.timeScale = clamp(player.speed / 1.5, .6, 1.9);
    mixer.update(animDt);
    if (seated && st < 1) { const lean = 1 - st; if (bones.Spine) bones.Spine.rotation.x += .24 * lean; if (bones.Spine1) bones.Spine1.rotation.x += .2 * lean; }      // he bends over the guitar
    if (add.lean) {                                        // over the water: the animation, and then a bow
      if (bones.Spine) bones.Spine.rotation.x += add.lean * .5;
      if (bones.Spine1) bones.Spine1.rotation.x += add.lean * .5;
      if (bones.Head) bones.Head.rotation.x += add.lean * .3;
    }
  }

  /* where he sits: on the lawn before his door, a good metre from the fire, turned a little toward it */
  const SEAT = at(1.06, .14);
  const seatFwd = (() => { const f = V(-.42, 0, 1); return f.sub(SEAT.clone().multiplyScalar(f.dot(SEAT))).normalize(); })();
  const player = { n: SEAT.clone(), fwd: seatFwd.clone(), h: 0, vy: 0, speed: 0, phase: 0, stand: 0, dip: ground(SEAT) - R, shrink: 1 };
  let sitting = false, jump = null;                         // sitting: he has sat down to play, out on a walk · jump: on his way into the portal
  me.matrixAutoUpdate = false;
  const curN = V(0, 1, 0), curF = V(0, 0, 1);
  const ROOM = V(140, -300, 0);                             // pass 77: Jaime's home is a room of its own, far from the planet, in a warm dark (as the studio is: it has no ceiling and two open sides)
  const HS = 6.4, HFLOOR = .05;                             // its model (made in Meshy) is one unit wide: 6.4 m of room; its floor stands at .05
  const inside = { on: false, kind: 'house', base: ROOM, state: 0, t: 0, pos: V(0, 0, 0), fwd: V(0, 0, -1), drop: 0, doors: 0, path: null };      // kind 'studio': the room under the hatch (quests.js), kept deeper down
  function placeMe() {
    if (inside.on) { curN.set(0, 1, 0); curF.copy(inside.fwd); v1.copy(inside.base).add(inside.pos); v1.y -= inside.drop; }
    else { curN.copy(player.n); curF.copy(player.fwd); v1.copy(player.n).multiplyScalar(R + player.h + player.dip); }
    const x = new THREE.Vector3().crossVectors(curN, curF).normalize();
    me.matrix.makeBasis(x, curN, curF); if (player.shrink < 1) me.matrix.scale(x.setScalar(Math.max(.001, player.shrink))); me.matrix.setPosition(v1);
    me.matrixWorldNeedsUpdate = true;
  }
  /* pass 77 — Jaime's home. He asked Meshy for it: a cabin's living room, cosy and warm — a stone fireplace with its fire,
     an armchair and its blanket, a round rug, books, a guitar, a bed under a quilt and a lit window (home.glb; its floor
     plan is home-map.json, for walking in it). What is not from the model: the elevator down to the Underground Lab —
     the same one as before, set against the bare stretch of the back wall — and the record player of My Universe,
     on a small table: it plays Desiderium. */
  const elev = { doors: [], car: new THREE.Group(), group: new THREE.Group(), booth: new THREE.Group(), at: V(-.9, 0, -2.1), k: .8 };
  const home = { loaded: false, loading: null, map: null, near: '', disc: null, spin: 0, playing: false, led: null, fire: null, t: 0 };
  const TT = V(2.62, 0, -.3);                                // the record player's table, in metres from the middle of the room
  {
    const flatM = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .85 }, o));
    const add = (geo, mat, x, y, z, parent) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); (parent || elev.booth).add(m); return m; };
    elev.group.position.copy(ROOM); scene.add(elev.group);
    /* the dark the room floats in */
    add(new THREE.SphereGeometry(40, 24, 16), new THREE.MeshBasicMaterial({ color: 0x0b0806, side: THREE.BackSide, fog: false }), 0, 0, 0, elev.group);
    add(new THREE.CircleGeometry(16, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x100b08, fog: false }), 0, -.6, 0, elev.group);
    /* the elevator: a booth against the back wall — two wide pillars the doors slide into, a lintel with its sign, the car between them */
    elev.booth.position.copy(elev.at); elev.booth.scale.setScalar(elev.k); elev.group.add(elev.booth);
    const metal = flatM(0x4a5058, { roughness: .45, metalness: .5 }), steel = flatM(0xaab3bd, { roughness: .35, metalness: .6 });
    [-1, 1].forEach((sgn) => add(new THREE.BoxGeometry(.8, 2.5, 1.18), metal, sgn * 1.15, 1.25, 0));
    add(new THREE.BoxGeometry(3.1, .4, 1.18), metal, 0, 2.5, 0);
    elev.car.position.set(0, 0, -.01); elev.booth.add(elev.car);
    add(new THREE.BoxGeometry(1.5, 2.3, 1.12), flatM(0xcfd6de, { side: THREE.BackSide, roughness: .6 }), 0, 1.15, 0, elev.car);
    add(new THREE.BoxGeometry(1.5, .04, 1.12), flatM(0x5a6068), 0, .01, 0, elev.car);
    add(new THREE.BoxGeometry(.5, .04, .5), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.5, 1.2) }), 0, 2.27, 0, elev.car);
    [-1, 1].forEach((sgn) => { const d = add(new THREE.BoxGeometry(.75, 2.3, .05), steel, sgn * .375, 1.15, .55); d.userData.sgn = sgn; elev.doors.push(d); });
    add(new THREE.BoxGeometry(.5, .2, .03), new THREE.MeshBasicMaterial({ color: new THREE.Color(.5, 1.0, 1.9) }), 0, 2.5, .6);       // the sign: lit, an arrow down
    const tri = new THREE.Shape(); tri.moveTo(-.07, .05); tri.lineTo(.07, .05); tri.lineTo(0, -.06); tri.closePath();
    add(new THREE.ShapeGeometry(tri), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.4, 2.4) }), 0, 2.5, .62);
    add(new THREE.BoxGeometry(.1, .16, .03), flatM(0x2c3036), 1.0, 1.15, .6); add(new THREE.CylinderGeometry(.025, .025, .02, 16).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.2, .5) }), 1.0, 1.15, .62);
    const lamp2 = new THREE.PointLight(0xdfe9ff, 3, 5, 1.6); lamp2.position.set(0, 1.8, .01); elev.booth.add(lamp2);
    /* the room's own light: the fire, the lamp by the bed, the window, and a little of the night from the open side */
    home.fire = new THREE.PointLight(0xff8a3c, 16, 9, 1.5); home.fire.position.set(-2.55, .6, .95); elev.group.add(home.fire);
    [[0xffd29a, 10, 8, 2.75, 1.5, -2.0], [0xffe2bd, 11, 13, 0, 3.3, .5], [0xffc58a, 6, 7, 1.9, 1.6, -2.4], [0x9ab8ff, 4, 12, 3.6, 2.6, 3.4]].forEach((q) => { const l = new THREE.PointLight(q[0], q[1], q[2], 1.5); l.position.set(q[3], q[4], q[5]); elev.group.add(l); });
    /* the record player's table: a plain small one, by the open side */
    const wood = flatM(0x7a4a28, { roughness: .7 }), tbl = new THREE.Group(); tbl.position.copy(TT); elev.group.add(tbl);
    add(new THREE.BoxGeometry(.56, .04, .86), wood, 0, .6, 0, tbl); add(new THREE.BoxGeometry(.5, .03, .8), flatM(0x5c371d), 0, .2, 0, tbl);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach((q) => add(new THREE.BoxGeometry(.045, .6, .045), wood, q[0] * .24, .3, q[1] * .39, tbl));
    home.table = tbl;
    elev.group.visible = false;
  }
  function homeLoad() {
    if (home.loading) return home.loading;
    home.loading = Promise.all([loadGLB('../models/home.glb?v=1'), fetch(new URL('../models/home-map.json?v=1', import.meta.url)).then((r) => r.json()), loadGLB('../models/turntable.glb?v=1').catch(() => null),
      new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = new URL('../img/about/desiderium-640.webp', import.meta.url).href; })]).then(([g, map, tt, cover]) => {
      const m = g.scene; m.scale.setScalar(HS); m.position.y = -HFLOOR * HS;
      m.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; const mt = o.material; mt.metalness = 0; mt.roughness = .9; mt.emissiveMap = mt.map; mt.emissive = new THREE.Color(.46, .41, .36); mt.envMapIntensity = .2; if (mt.map) mt.map.anisotropy = 8; } });
      elev.group.add(m); home.map = map;
      if (tt) {                                              // the record player, turned to face the room; its record wears the single's cover for a label
        const K = .56, tg = new THREE.Group(); tg.position.set(0, .62, 0); tg.rotation.y = -Math.PI / 2; home.table.add(tg);
        tt.scene.traverse((o) => { if (o.isMesh) { const mt = o.material; mt.metalness = 0; mt.roughness = .55; mt.emissiveMap = mt.map; mt.emissive = new THREE.Color(.2, .19, .18); if (mt.map) mt.map.anisotropy = 8; } });
        tt.scene.scale.setScalar(K); tg.add(tt.scene);
        const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
        x.fillStyle = '#0c0c0f'; x.beginPath(); x.arc(256, 256, 256, 0, 7); x.fill();
        for (let r = 100; r < 250; r += 3) { x.strokeStyle = 'rgba(255,255,255,' + (.03 + .05 * rnd()).toFixed(3) + ')'; x.lineWidth = 1; x.beginPath(); x.arc(256, 256, r, 0, 7); x.stroke(); }
        x.save(); x.beginPath(); x.arc(256, 256, 92, 0, 7); x.clip(); if (cover) x.drawImage(cover, 164, 164, 184, 184); else { x.fillStyle = '#d8572a'; x.fillRect(164, 164, 184, 184); } x.restore();
        x.fillStyle = '#d9d9d4'; x.beginPath(); x.arc(256, 256, 7, 0, 7); x.fill();
        const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
        home.disc = new THREE.Mesh(new THREE.CircleGeometry(.318, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tx, roughness: .32, metalness: 0, emissiveMap: tx, emissive: new THREE.Color(.25, .25, .25) }));
        home.disc.position.set(-.065 * K, .459 * K, -.008 * K); home.disc.scale.setScalar(K); tg.add(home.disc);
        home.led = new THREE.PointLight(0xffb060, 0, 1.4, 1.6); home.led.position.set(-.12 * K, .3 * K, .56 * K); tg.add(home.led);
      }
      home.loaded = true;
    }).catch((e) => { console.warn('[world] no home', e); home.loading = null; });
    return home.loading;
  }
  /* walking in it: a picture of heights (tools/blender/height_map.py). A step is taken where the height is about the
     same as underfoot — the floor and the rug can be walked, the bed, the armchair and the hearth cannot */
  function homeH(x, z) { const P = home.map; if (!P) return 0; const i = Math.round((x / HS - P.x0) / P.cell), j = Math.round((z / HS - P.z0) / P.cell); if (i < 0 || j < 0 || i >= P.nx || j >= P.nz) return null; const h = P.h[j * P.nx + i]; return h < 0 ? null : (h - HFLOOR) * HS; }
  function homeStand(x, z, y) {
    if (x > 3.02 || z > 2.62) return null;                   // its two open sides: no further
    if (Math.abs(x - elev.at.x) < 1.34 && z < elev.at.z + .66) return null;      // the booth
    if (Math.abs(x - TT.x) < .5 && Math.abs(z - TT.z) < .66) return null;         // the record player's table
    const h = homeH(x, z); if (h == null) return null;
    return (h - y < .2 && y - h < .4) ? h : null;
  }
  function homeRoam(dt) {
    let ix = stick.x, iz = stick.y; for (const k in MOVE) if (keys[k]) { ix += MOVE[k][0]; iz += MOVE[k][1]; }
    const len = Math.hypot(ix, iz), p = inside.pos;
    if (len > .12) {
      const k = 1 / Math.max(1, len), sp = (keys.ShiftLeft || keys.ShiftRight ? 3.2 : 2.1) * Math.min(1, len);
      const dx = (.8 * ix - .6 * iz) * k, dz = (-.6 * ix - .8 * iz) * k;      // "up" is away from the corner the eye stands in
      const nx = p.x + dx * sp * dt, nz = p.z + dz * sp * dt;
      let h = homeStand(nx, nz, p.y);
      if (h != null) { p.x = nx; p.z = nz; } else if ((h = homeStand(nx, p.z, p.y)) != null) p.x = nx; else if ((h = homeStand(p.x, nz, p.y)) != null) p.z = nz;
      v1.set(dx, 0, dz).normalize(); inside.fwd.lerp(v1, 1 - Math.pow(.001, dt)).normalize();
      player.speed = h != null ? sp : 0; player.phase += player.speed * dt * 3.1;
    } else player.speed = 0;
    const g = homeH(p.x, p.z); if (g != null && g < .3) p.y += (g - p.y) * (1 - Math.pow(.0002, dt));
  }
  function homeGo(x, z, dt, sp) {                            // a few steps he takes by himself (into the elevator)
    const p = inside.pos, dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz), st = sp * dt;
    if (d <= st) { p.x = x; p.z = z; player.speed = 0; return true; }
    p.x += dx / d * st; p.z += dz / d * st; v1.set(dx / d, 0, dz / d); inside.fwd.lerp(v1, 1 - Math.pow(.002, dt)).normalize();
    player.speed = sp; player.phase += sp * dt * 3.1; return false;
  }
  const HOME_CTA = { lift: ['The elevator', 'Go down'], tt: ['Record player', 'Play Desiderium'], out: ['', 'Go outside'] };
  function homeNear(kind) {
    if (kind === home.near) return; home.near = kind;
    if (!placeEl) return;
    if (kind) { const q = HOME_CTA[kind]; cta(q[0], kind === 'tt' && home.playing ? 'Lift the needle' : q[1]); placeEl.hidden = false; requestAnimationFrame(() => placeEl.classList.add('is-on')); }
    else { placeEl.classList.remove('is-on'); setTimeout(() => { if (inside.on && inside.kind === 'house' && !home.near) placeEl.hidden = true; }, 350); }
  }
  function homeAct() {                                     // E, or the button: what it does depends on where he stands
    if (!inside.on || inside.kind !== 'house' || inside.state !== 2) return;
    if (home.near === 'lift') { inside.state = 3; inside.t = 0; inside.path = [[elev.at.x, elev.at.z + 1.05], [elev.at.x, elev.at.z + .02]]; homeNear(''); }
    else if (home.near === 'tt') { home.playing = !home.playing; musicTo(home.playing ? .8 : 0, 1.1); soundOn(); const k = home.near; home.near = ''; homeNear(k); }
    else if (home.near === 'out') outside();
  }
  function goInside() {                                    // through the door
    const go = () => {
      inside.on = true; inside.kind = 'house'; inside.base = ROOM; inside.state = 1; inside.t = 0; inside.drop = 0; inside.doors = 1; inside.path = null;
      inside.pos.set(1.7, 0, 2.5); inside.fwd.set(-.45, 0, -1).normalize(); player.speed = 0; home.near = ''; home.playing = false; home.spin = 0;
      elev.group.visible = true; elev.car.position.y = 0; for (const k in keys) keys[k] = false;
      travel = null; zoomSeq = null; nearP = null;
      if (mapEl) mapEl.hidden = true;
      if (placeEl) { placeEl.classList.remove('is-on'); placeEl.hidden = true; }
      visit('lab');
      setTimeout(() => document.body.classList.remove('is-landing'), 80);
      if (!home.greeted) { home.greeted = true; setTimeout(() => { if (inside.on && inside.kind === 'house') say('Jaime\u2019s home! Make yourself comfortable. The elevator at the back goes down to his Underground Lab.', false); }, 900); }
    };
    if (home.loaded) go(); else { document.body.classList.add('is-landing'); homeLoad().then(() => { if (mode === 'walk') go(); else document.body.classList.remove('is-landing'); }); }
  }
  function indoors(base, kind) {                           // any other room: who made it moves him in it (inside.pos, inside.fwd) and sets the camera
    inside.on = true; inside.kind = kind; inside.base = base; inside.state = 1; inside.t = 0; inside.drop = 0; player.speed = 0;
    travel = null; zoomSeq = null; nearP = null; leavingTo = null;
    if (mapEl) mapEl.hidden = true;
    if (placeEl) { placeEl.classList.remove('is-on'); placeEl.hidden = true; }
    setTimeout(() => document.body.classList.remove('is-landing'), 80);
  }
  function outside() {                                     // back in front of the house — or, from the studio, beside its hatch
    if (!inside.on) return;
    const was = inside.kind;
    if (was !== 'house') Q.left(was);
    inside.on = false; inside.state = 0; inside.kind = 'house'; inside.base = ROOM; elev.group.visible = false; leavingTo = null; home.near = ''; home.playing = false;
    if (mapEl && mode === 'walk') mapEl.hidden = false;
    if (placeEl) { placeEl.classList.remove('is-on'); placeEl.hidden = true; }
    DOOR.k = 0;
    if (was === 'studio') {                                // he comes up by the hatch: on the lawn to the south of it, his back to it
      const sp = PLACES.find((q) => q.id === 'studio').spot; player.n.copy(sp); player.h = 0; player.vy = 0; player.speed = 0; cam.h = 0;
      player.fwd.copy(sp).sub(at(HATCHQ.x0 + .6, HATCHQ.z0 + .6)); player.fwd.addScaledVector(player.n, -player.fwd.dot(player.n)).normalize(); cam.f.copy(player.fwd);
      HATCH.want = 0; HATCH.k = 0; HATCH.going = false;
    }
    if (mode === 'walk') musicTo(BG, 1.8);
  }
  function takeLift() { homeAct(); }
  function insideStep(dt) {                                // at home: he walks where he likes; at the elevator a press takes him in, the doors shut, it goes down
    inside.t += dt;
    if (inside.kind !== 'house') { Q.indoorStep(dt); return; }
    const p = inside.pos;
    home.t += dt; home.fire.intensity = 14 + 3.2 * Math.sin(home.t * 11.3) * Math.sin(home.t * 7.1 + 1.3) + 1.2 * Math.sin(home.t * 23);
    home.spin += ((home.playing ? 1 : 0) - home.spin) * (1 - Math.pow(.1, dt));
    if (home.disc) home.disc.rotation.y -= dt * 3.49 * home.spin;      // 33⅓ turns a minute
    if (home.led) home.led.intensity = .3 + home.spin * 1.8;
    if (inside.state === 1) { if (homeGo(1.25, 1.75, dt, 1.5)) inside.state = 2; }
    else if (inside.state === 2) {
      homeRoam(dt); inside.doors = Math.min(1, inside.doors + dt * 1.2);
      homeNear(Math.hypot(p.x - elev.at.x, p.z - elev.at.z - 1.1) < 1.15 ? 'lift' : Math.hypot(p.x - TT.x + .5, p.z - TT.z) < 1.05 ? 'tt' : (p.z > 2.25 || p.x > 2.7) ? 'out' : '');
    }
    else if (inside.state === 3) { if (!inside.path.length) { inside.state = 4; inside.t = 0; inside.fwd.set(0, 0, 1); player.speed = 0; } else if (homeGo(inside.path[0][0], inside.path[0][1], dt, 1.5)) inside.path.shift(); }
    else if (inside.state === 4) { player.speed = 0; inside.fwd.lerp(v1.set(0, 0, 1), 1 - Math.pow(.01, dt)).normalize(); inside.doors = Math.max(0, 1 - inside.t / .9); if (inside.t > 1.1) { inside.state = 5; inside.t = 0; } }
    else if (inside.state === 5) {
      inside.drop = 2.6 * sst(0, 2.0, inside.t); elev.car.position.y = -inside.drop / elev.k;
      if (inside.t > 1.1 && !document.body.classList.contains('is-landing')) document.body.classList.add('is-landing');
      if (inside.t > 1.7) { inside.state = 6; outside(); leaveWalk(true); setTimeout(() => { const el = document.querySelector('#work'); if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' }); }, 415); }
    }
    elev.doors.forEach((d) => { d.position.x = d.userData.sgn * (.375 + .74 * inside.doors); });
  }
  /* a soft dark under him, so he stands on the grass and not above it */
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false, uniforms: { k: { value: .5 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec2 vUv;uniform float k;void main(){float d=length(vUv-.5)*2.;float a=pow(max(0.,1.-d),1.8)*k;gl_FragColor=vec4(0.,0.,0.,a);}'
  }));
  blob.geometry.rotateX(-Math.PI / 2); blob.renderOrder = 1; scene.add(blob);

  /* ---------- Evi ---------- */
  const evi = new THREE.Group(); scene.add(evi);
  evi.add(new THREE.Mesh(geo.evi_body, new THREE.MeshBasicMaterial({ color: hdr(.55, .9, 1, 5), fog: false })));
  const wingMat = new THREE.MeshBasicMaterial({ color: hdr(.18, .55, 1, 2.4), side: THREE.DoubleSide, transparent: true, opacity: .8, depthWrite: false, fog: false });
  const wings = [[geo.evi_wing_u, 1], [geo.evi_wing_u, -1], [geo.evi_wing_l, 1], [geo.evi_wing_l, -1]].map((w) => {
    const m = new THREE.Mesh(w[0], wingMat); m.scale.x = w[1]; m.userData.side = w[1]; evi.add(m); return m;
  });
  const eviGlow = glow(hdr(.12, .5, 1, .9), .62, 2.6); evi.add(eviGlow);
  const eviLight = new THREE.PointLight(0x6cc6ff, 8, 8, 1.6);          // she is his lamp on the night side
  evi.add(eviLight);
  const eviPos = V(0, 0, 0);
  /* pass 76: in the box where her words are written she is there herself — her own model, drawn small in its frame
     (it was a drawing). A second, tiny picture of her alone: night behind, her light, her wings beating. */
  const face = { cvs: [...document.querySelectorAll('[data-evi-face]')], n: 192, at: 0, rt: null, scene: null, cam: null, wings: [], g: null, buf: null, img: null, lut: null, body: null };
  function eviFace(t) {
    const live = face.cvs.filter((c) => c.offsetParent !== null && c.closest('.is-on'));
    if (!live.length || t < face.at) return;
    face.at = t + 1 / 24;
    if (!face.rt) {
      const N = face.n;
      face.rt = new THREE.WebGLRenderTarget(N, N); face.scene = new THREE.Scene(); face.cam = new THREE.PerspectiveCamera(30, 1, .05, 10);
      face.cam.position.set(0, .018, .54); face.cam.lookAt(0, .018, 0);
      const sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ depthWrite: false, depthTest: false,
        vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,1.,1.);}',
        fragmentShader: 'varying vec2 vUv;void main(){float d=distance(vUv,vec2(.5,.46));vec3 c=mix(vec3(.03,.1,.3),vec3(.004,.008,.03),smoothstep(0.,.75,d));float s=step(.9965,fract(sin(dot(floor(vUv*46.),vec2(12.9898,78.233)))*43758.5453));gl_FragColor=vec4(c+s*.5*smoothstep(.2,.6,d),1.);}' }));
      sky.frustumCulled = false; sky.renderOrder = -10; face.scene.add(sky);
      const g = face.g = new THREE.Group(); face.scene.add(g);
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(.62, .62), glowMat(new THREE.Color(.05, .22, .62), 2.2)); halo.position.z = -.02; g.add(halo);
      const core = new THREE.Mesh(new THREE.PlaneGeometry(.2, .2), glowMat(new THREE.Color(.3, .62, 1), 2.6)); core.position.z = .04; g.add(core);
      face.body = new THREE.Mesh(geo.evi_body, new THREE.MeshBasicMaterial({ color: new THREE.Color(.9, .97, 1), fog: false })); g.add(face.body);
      const wm = new THREE.MeshBasicMaterial({ color: new THREE.Color(.16, .5, 1), side: THREE.DoubleSide, transparent: true, opacity: .9, depthWrite: false, fog: false });
      [[geo.evi_wing_u, 1], [geo.evi_wing_u, -1], [geo.evi_wing_l, 1], [geo.evi_wing_l, -1]].forEach((w) => { const m = new THREE.Mesh(w[0], wm); m.scale.x = w[1]; m.userData.side = w[1]; g.add(m); face.wings.push(m); });
      face.buf = new Uint8Array(N * N * 4); face.img = new ImageData(N, N);
      face.lut = new Uint8Array(256); for (let i = 0; i < 256; i++) { const c = i / 255; face.lut[i] = Math.round(255 * (c <= .0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - .055)); }
    }
    const N = face.n, flap = Math.sin(t * 26) * .5 + .5, talking = document.querySelector('.world-talk.is-on.is-talking');
    face.wings.forEach((w) => { w.rotation.y = w.userData.side * (.2 + .85 * flap); });
    face.g.position.set(.012 * Math.sin(t * 1.3), .014 * Math.sin(t * 2.1) + (talking ? .008 * Math.sin(t * 13) : 0), 0);
    face.g.rotation.z = .06 * Math.sin(t * .9); face.body.scale.setScalar(talking ? 1 + .12 * Math.abs(Math.sin(t * 9)) : 1);
    const keep = renderer.getRenderTarget();
    renderer.setRenderTarget(face.rt); renderer.clear(); renderer.render(face.scene, face.cam);
    renderer.readRenderTargetPixels(face.rt, 0, 0, N, N, face.buf); renderer.setRenderTarget(keep);
    const src = face.buf, dst = face.img.data, L = face.lut;
    for (let y = 0; y < N; y++) { let a = (N - 1 - y) * N * 4, b = y * N * 4; for (let x = 0; x < N; x++, a += 4, b += 4) { dst[b] = L[src[a]]; dst[b + 1] = L[src[a + 1]]; dst[b + 2] = L[src[a + 2]]; dst[b + 3] = 255; } }
    live.forEach((c) => { if (c.width !== N) { c.width = c.height = N; } c.getContext('2d').putImageData(face.img, 0, 0); });
  }

  /* ---------- the camera ---------- */
  /* At rest: across the lake, a little above the lawn — the fire, the guitarist before his door, the house
     and its lit windows behind, the water in front. On a narrow screen it turns to keep the fire and the
     guitarist in the middle. */
  const REST = { pos: V(0, FIRE.y + 5.0, 14.6), fov: 31 };
  const restCam = new THREE.PerspectiveCamera(30, 1.4, .1, 500);
  let fix = null;                                          // set while walking: how the full screen relates to the hero's frame
  function aimRest(aspect) {
    restCam.aspect = aspect;
    const wide = clamp(((fix ? fix.a0 : aspect) - .75) / (1.41 - .75), 0, 1);
    let fov = mix(20, REST.fov, wide);                     // a phone shows the top band only
    restCam.position.copy(REST.pos);
    restCam.up.set(0, 1, 0);
    restCam.lookAt(FIRE);
    restCam.rotateY(THREE.MathUtils.degToRad(mix(-2.4, 3.05, wide)));
    restCam.rotateX(THREE.MathUtils.degToRad(mix(-.9, .2, wide)));
    if (fix) {                                             // the same picture, seen through a window of another height
      const th = Math.tan(THREE.MathUtils.degToRad(fov / 2));
      restCam.rotateX(Math.atan(th * (1 - fix.k + fix.e)));
      fov = THREE.MathUtils.radToDeg(2 * Math.atan(th * fix.k));
    }
    restCam.fov = fov;
    restCam.updateProjectionMatrix(); restCam.updateMatrixWorld(true);
  }
  aimRest(1.413);
  // the sunset stands where it does in the picture: behind the hill, left of the fire
  sunDir.copy(V(2 * .625 - 1, 1 - 2 * .43, .5).unproject(restCam).sub(restCam.position).normalize());
  const keyDir = V(sunDir.x, 0, sunDir.z).normalize().multiplyScalar(Math.cos(.36)).add(V(0, Math.sin(.36), 0));
  const rimDir = V(.75, .5, -.45).normalize();
  {                                                        // the sky lights the scene: its own image, blurred, as the ambient
    const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
    es.add(new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), skyMat));
    scene.environment = pm.fromScene(es, 0, .1, 100).texture; pm.dispose();
  }

  const front = new THREE.Group(), frontMats = [];           // (the painted picture had a dark slope in its corner; this planet frames itself)
  waterMat.uniforms.uSun.value.copy(keyDir);

  /* ---------- the film: HDR frame → bloom → tone map ---------- */
  const fsScene = new THREE.Scene(), fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const fsGeo = new THREE.BufferGeometry(); fsGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const fsMesh = new THREE.Mesh(fsGeo, null); fsMesh.frustumCulled = false; fsScene.add(fsMesh);
  const FSV = 'varying vec2 vUv;void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}';
  const pass = (frag, uniforms, extra) => new THREE.ShaderMaterial(Object.assign({ vertexShader: FSV, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, fog: false }, extra));
  const LEVELS = lite ? 4 : 5;
  const rtOpt = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
  const rtScene = new THREE.WebGLRenderTarget(4, 4, Object.assign({}, rtOpt, { depthBuffer: true, samples: lite ? 2 : 4 }));
  const rtB = Array.from({ length: LEVELS }, () => new THREE.WebGLRenderTarget(2, 2, rtOpt));
  const pre = pass(`varying vec2 vUv; uniform sampler2D tex; uniform vec2 texel;
    void main(){ vec3 c = (texture2D(tex, vUv + texel * vec2(-.5, -.5)).rgb + texture2D(tex, vUv + texel * vec2(.5, -.5)).rgb + texture2D(tex, vUv + texel * vec2(-.5, .5)).rgb + texture2D(tex, vUv + texel * vec2(.5, .5)).rgb) * .25;
      c = min(c, vec3(24.)); float br = max(c.r, max(c.g, c.b)); const float thr = .85, knee = .5;
      float soft = clamp(br - thr + knee, 0., 2. * knee); soft = soft * soft / (4. * knee + 1e-4);
      c *= max(soft, br - thr) / max(br, 1e-4); gl_FragColor = vec4(c, 1.); }`, { tex: { value: null }, texel: { value: new THREE.Vector2() } });
  const down = pass(`varying vec2 vUv; uniform sampler2D tex; uniform vec2 texel;
    void main(){ vec3 c = texture2D(tex, vUv).rgb * 4.; c += texture2D(tex, vUv + texel * vec2(-1., -1.)).rgb + texture2D(tex, vUv + texel * vec2(1., -1.)).rgb + texture2D(tex, vUv + texel * vec2(-1., 1.)).rgb + texture2D(tex, vUv + texel * vec2(1., 1.)).rgb;
      gl_FragColor = vec4(c / 8., 1.); }`, { tex: { value: null }, texel: { value: new THREE.Vector2() } });
  const up = pass(`varying vec2 vUv; uniform sampler2D tex; uniform vec2 texel;
    void main(){ vec3 c = texture2D(tex, vUv + texel * vec2(-2., 0.)).rgb + texture2D(tex, vUv + texel * vec2(2., 0.)).rgb + texture2D(tex, vUv + texel * vec2(0., -2.)).rgb + texture2D(tex, vUv + texel * vec2(0., 2.)).rgb;
      c += (texture2D(tex, vUv + texel * vec2(-1., 1.)).rgb + texture2D(tex, vUv + texel * vec2(1., 1.)).rgb + texture2D(tex, vUv + texel * vec2(-1., -1.)).rgb + texture2D(tex, vUv + texel * vec2(1., -1.)).rgb) * 2.;
      gl_FragColor = vec4(c / 12., 1.); }`, { tex: { value: null }, texel: { value: new THREE.Vector2() } }, { blending: THREE.AdditiveBlending, transparent: true });
  const film = pass(`varying vec2 vUv; uniform sampler2D tScene, tBloom; uniform float bloom, exposure, time, dim;
    vec3 fit(vec3 v){ vec3 a = v * (v + .0245786) - .000090537; vec3 b = v * (.983729 * v + .4329510) + .238081; return a / b; }
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec3 c = texture2D(tScene, vUv).rgb + texture2D(tBloom, vUv).rgb * bloom;
      vec2 q = vUv - .5; c *= (1. - dot(q, q) * .62) * exposure;
      c = clamp((c * (2.51 * c + .03)) / (c * (2.43 * c + .59) + .14), 0., 1.);     // a film curve: deep shadows, a long warm shoulder
      float l_ = dot(c, vec3(.2126, .7152, .0722)); c = clamp(mix(vec3(l_), c, 1.1), 0., 1.);
      c = mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c));
      c += (hash(gl_FragCoord.xy + fract(time) * 61.) - .5) * (1.8 / 255.);
      gl_FragColor = vec4(c * dim, 1.); }`,
    { tScene: { value: rtScene.texture }, tBloom: { value: rtB[0].texture }, bloom: { value: .17 }, exposure: { value: 1.18 }, time: uTime, dim: { value: 1 } });
  renderer.autoClear = false;
  function blit(mat, target) { fsMesh.material = mat; renderer.setRenderTarget(target); renderer.render(fsScene, fsCam); }
  function develop() {
    pre.uniforms.tex.value = rtScene.texture; pre.uniforms.texel.value.set(1 / rtScene.width, 1 / rtScene.height); blit(pre, rtB[0]);
    for (let i = 1; i < LEVELS; i++) { down.uniforms.tex.value = rtB[i - 1].texture; down.uniforms.texel.value.set(1 / rtB[i - 1].width, 1 / rtB[i - 1].height); blit(down, rtB[i]); }
    for (let i = LEVELS - 1; i > 0; i--) { up.uniforms.tex.value = rtB[i].texture; up.uniforms.texel.value.set(1 / rtB[i].width, 1 / rtB[i].height); blit(up, rtB[i - 1]); }
    blit(film, null);
  }

  /* ---------- size ---------- */
  const dbg = { scale: 0, spy: null, dt: 0 };
  /* if the machine cannot keep up, the picture gives way, never the smoothness: fewer pixels first, then the shadows */
  const gov = { level: 0, acc: 0, n: 0, last: 0, scale: 1 };
  function ease() {                                        // every level sets everything, so it can go both ways
    const L = gov.level, sm = L >= 1 ? 1024 : (lite ? 1024 : 2048);
    gov.scale = [1, .82, .68, .56, .46][L];
    if (key.shadow.mapSize.x !== sm) { key.shadow.mapSize.set(sm, sm); if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; } }
    grassChunks.forEach((ch) => {
      const rs = L < 1; if (ch.mesh.receiveShadow !== rs) { ch.mesh.receiveShadow = rs; ch.mesh.material.needsUpdate = true; }   // the ground under it still takes them
      ch.mesh.count = L >= 2 ? Math.ceil(ch.full * .55) : ch.full;
    });
    fireLight.castShadow = L < 2;
    film.uniforms.bloom.value = L >= 3 ? 0 : .17;
    key.castShadow = L < 4;
    cssW = 0; resize();
  }
  /* a slow stretch steps the picture down; a long fast one steps it back up. Nothing is judged in the first seconds
     (models arriving, shaders being built) — that used to cost the sharpness for good. */
  gov.quiet = performance.now() + 4500; gov.base = 0; gov.upAt = 0;
  function pace() {
    const now = performance.now(), d = now - gov.last; gov.last = now;
    if (now < gov.quiet || d < 4 || d > 100) { gov.acc = gov.n = 0; return; }       // a pause, not a slow frame
    gov.acc += d;
    if (++gov.n >= 90) {
      const avg = gov.acc / gov.n; gov.acc = gov.n = 0;
      /* pass 77: a screen that shows thirty pictures a second whatever is drawn (a phone or a laptop saving its battery)
         is not a slow machine. If three steps down (a third of the pixels, no bloom) make it no faster, the picture is
         not what holds it back: everything comes back, and stays, unless it gets truly slower than that. */
      if (gov.cap) { if (avg > gov.cap * 1.4) gov.cap = 0; else return; }
      if (avg > 21) {
        if (gov.level === gov.base) gov.avg0 = avg;
        if (gov.level >= Math.min(4, gov.base + 3) && gov.avg0 && avg > gov.avg0 * .9) { gov.cap = avg; gov.level = gov.base; gov.upAt = now + 8000; ease(); }
        else if (gov.level < 4) { gov.level++; gov.upAt = now + 8000; ease(); }
      }
      else if (avg < 12.5 && gov.level > gov.base && now > gov.upAt) { gov.level--; gov.upAt = now + 6000; ease(); }
    }
  }                    // for checking: another resolution, another camera
  const perf = { ms: 16, n: 0 };
  let cssW = 0, cssH = 0, bufH = 600;
  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    if (Math.abs(r.width - cssW) < 1 && Math.abs(r.height - cssH) < 1) return;
    cssW = r.width; cssH = r.height;
    const cap = lite ? 1.4e6 : 3.6e6;                    // pass 71: a Retina screen gets most of its pixels (it was 1.7 M, soft)
    const s = dbg.scale || Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 2, Math.sqrt(cap / (cssW * cssH))) * gov.scale;
    const w = Math.max(8, Math.round(cssW * s)), h = Math.max(8, Math.round(cssH * s));
    renderer.setSize(w, h, false); rtScene.setSize(w, h); bufH = h;
    rtB.forEach((rt, i) => rt.setSize(Math.max(2, w >> (i + 1)), Math.max(2, h >> (i + 1))));
    camera.aspect = cssW / cssH;
    aimRest(camera.aspect);
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  window.addEventListener('resize', resize);

  /* ---------- walking ---------- */
  const keys = {};
  let mode = 'rest', blend = 0;                            // blend: 0 the picture's camera … 1 behind his shoulder
  const cam = { f: seatFwd.clone(), pitch: .3, dist: 4.4, dragAt: -9, pull: 1, h: 0 };      // h: how high off the ground the eye rides (it follows his feet up the floating stones)
  const stick = { on: false, id: -1, x0: 0, y0: 0, x: 0, y: 0 };
  const look = { on: false, id: -1, x: 0, y: 0 };
  const back = document.querySelector('[data-world-back]');
  const hint = document.querySelector('[data-world-hint]');
  const pad = document.querySelector('[data-world-stick]'), nub = pad && pad.querySelector('i');
  const jumpBtn = document.querySelector('[data-world-jump]');
  if (jumpBtn) { const jd = (on) => (e) => { e.preventDefault(); keys.Space = on; }; jumpBtn.addEventListener('pointerdown', jd(true)); ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => jumpBtn.addEventListener(ev, jd(false))); }
  function drawStick() { if (nub) nub.style.transform = 'translate(' + (stick.x * 26).toFixed(1) + 'px,' + (-stick.y * 26).toFixed(1) + 'px)'; }
  const q1 = new THREE.Quaternion(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();
  const clock = new THREE.Clock();
  let ready = false, visible = true, raf = 0;

  function tangent(v, n) { return v.sub(v2.copy(n).multiplyScalar(v.dot(n))).normalize(); }

  /* the river is a mirror: click it and he goes to the bank, leans over, and the water shows him */
  const mirror = { state: 0, t: 0, k: 0, n: V(0, 1, 0), c: V(0, 1, 0) };      // 0 no · 1 on his way · 2 looking
  const mirrorCam = new THREE.PerspectiveCamera(50, 1.4, .05, 500);
  const mirrorLight = new THREE.PointLight(0xfff1dc, 0, 3.2, 1.4); scene.add(mirrorLight);      // the water gives his face its light back
  const about = document.querySelector('[data-world-about]');
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function onRiver(x, y) {
    const r = canvas.getBoundingClientRect();
    ndc.set((x - r.left) / r.width * 2 - 1, 1 - (y - r.top) / r.height * 2); ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(water, false)[0];
    if (!hit || hit.uv.y > .93) return null;
    const solid = ray.intersectObjects(planetParts, false)[0];       // not through a trunk or a bank
    return !solid || solid.distance > hit.distance - .35 ? hit.point : null;
  }
  function toRiver(point) {
    lakeAt(v1.copy(point).normalize());
    const L = lakeAt.lake, N = L.rim.length, a0 = Math.round(((Math.atan2(player.n.dot(L.e2), player.n.dot(L.e1)) / 6.283185 + 1) % 1) * N);
    let shore = null;
    for (let k = 0; k < N && !shore; k++) {                  // the bank nearest to him that he can stand on
      const a = (a0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) + N * 2) % N, t = a / N * 6.283185;
      v2.copy(L.e1).multiplyScalar(Math.cos(t)).addScaledVector(L.e2, Math.sin(t));
      for (let d = L.rim[a] + .05; d < L.rim[a] + 1.3; d += .08) {
        v3.copy(L.c).multiplyScalar(Math.cos(d / R)).addScaledVector(v2, Math.sin(d / R)).normalize();
        if (land.free(v3) > .27) {
          shore = v3.clone();
          mirror.n.copy(L.c).multiplyScalar(Math.cos((L.rim[a] - .12) / R)).addScaledVector(v2, Math.sin((L.rim[a] - .12) / R)).normalize();      // his feet at the very edge
          mirror.c.copy(L.c).multiplyScalar(Math.cos((L.rim[a] - 1.1) / R)).addScaledVector(v2, Math.sin((L.rim[a] - 1.1) / R)).normalize();       // the water he looks into
          break;
        }
      }
    }
    if (!shore) return;
    mirror.state = 1; mirror.t = 0;
    go(shore, () => {
      mirror.state = 2; mirror.t = 0; mirror.said = 0; player.speed = 0;
      player.fwd.copy(mirror.c).addScaledVector(player.n, -player.n.dot(mirror.c)); tangent(player.fwd, player.n); cam.f.copy(player.fwd);
    }, mirror.n);
    if (hint) hint.classList.add('is-gone');
  }

  /* the way round things: the shortest walk over the open ground from where he is to where he is going */
  const route = (() => {
    const W = land.W, H = land.H, n = W * H, OPEN = Math.ceil((.24 - land.smin) / land.sstep), tv = new THREE.Vector3();
    let dist = null, prev = null, heap = null, hk = null, hn = 0;
    const open = (c) => land.SD[c] >= OPEN;
    function nearestOpen(d) {
      const c = land.cell(d); if (open(c)) return c;
      const j0 = Math.floor(c / W), i0 = c - j0 * W;
      for (let r = 1; r < 48; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const j = j0 + dj; if (j < 0 || j >= H) continue;
        const c2 = j * W + (((i0 + di) % W) + W) % W; if (open(c2)) return c2;
      }
      return -1;
    }
    const push = (c, k) => { let i = hn++; while (i > 0) { const q = (i - 1) >> 1; if (hk[q] <= k) break; heap[i] = heap[q]; hk[i] = hk[q]; i = q; } heap[i] = c; hk[i] = k; };
    const pop = () => {
      const top = heap[0], c = heap[--hn], k = hk[hn]; let i = 0;
      for (;;) { let l = 2 * i + 1; if (l >= hn) break; if (l + 1 < hn && hk[l + 1] < hk[l]) l++; if (hk[l] >= k) break; heap[i] = heap[l]; hk[i] = hk[l]; i = l; }
      heap[i] = c; hk[i] = k; return top;
    };
    const clear = (a, b) => {
      const steps = Math.ceil(a.angleTo(b) * R / .12);
      for (let q = 1; q < steps; q++) { tv.copy(a).lerp(b, q / steps).normalize(); if (land.free(tv) < .215) return false; }
      return true;
    };
    return (from, to) => {
      const s0 = nearestOpen(from), g0 = nearestOpen(to);
      if (s0 < 0 || g0 < 0) return null;
      if (!dist) { dist = new Float32Array(n); prev = new Int32Array(n); heap = new Int32Array(n * 4); hk = new Float32Array(n * 4); }
      dist.fill(Infinity); hn = 0; dist[s0] = 0; prev[s0] = -1; push(s0, 0);
      const relax = (c, c2, w) => {
        if (c2 < 0 || !open(c2)) return;
        const d2 = dist[c] + w * (1 + .6 / (1 + land.SD[c2] - OPEN));      // a little dearer along the walls: he keeps to the middle of the way
        if (d2 < dist[c2]) { dist[c2] = d2; prev[c2] = c; push(c2, d2); }
      };
      while (hn) {
        const k = hk[0], c = pop();
        if (k > dist[c]) continue;
        if (c === g0) break;
        const j = Math.floor(c / W), i = c - j * W, sx = Math.max(.02, Math.sin((j + .5) / H * Math.PI));        // a step along a row is shorter near the grid's poles
        relax(c, j * W + (i + 1) % W, sx); relax(c, j * W + (i + W - 1) % W, sx); relax(c, j > 0 ? c - W : -1, 1); relax(c, j < H - 1 ? c + W : -1, 1);
      }
      if (dist[g0] === Infinity) return null;
      const cells = []; for (let c = g0; c >= 0; c = prev[c]) cells.push(c);
      cells.reverse();
      const pts = [from.clone()];
      for (let i = 2; i < cells.length - 1; i += 3) pts.push(land.dirOf(cells[i], new THREE.Vector3()));
      pts.push(land.free(to) > .2 ? to.clone() : land.dirOf(g0, new THREE.Vector3()));
      const out = [];                                         // pull the string tight
      for (let i = 0; i < pts.length - 1;) { let j = pts.length - 1; while (j > i + 1 && !clear(pts[i], pts[j])) j--; out.push(pts[j]); i = j; }
      return out;
    };
  })();
  function go(to, done, last) {                              // last: a final step straight on, where the open ground ends (the water's edge)
    const pts = route(player.n, to) || [to.clone()];
    if (last) pts.push(last.clone());
    travel = { pts, i: 0, t: 0, done, ghost: !!last };
  }
  /* walking to a place by itself (a click on it, or on its dot on the map) */
  let travel = null, nearP = null, leavingTo = null;
  function travelTo(p) {
    if (mode !== 'walk') return;
    if (p.id === 'about') { travel = null; if (!mirror.state) toRiver(v1.copy(p.dir).multiplyScalar(R)); return; }
    exitMirror();
    if (p.spot.angleTo(player.n) * R < .35) return;
    go(p.spot, () => { player.fwd.copy(p.dir).addScaledVector(player.n, -player.n.dot(p.dir)); tangent(player.fwd, player.n); });      // he arrives facing it
    if (hint) hint.classList.add('is-gone');
  }
  const placeEl = document.querySelector('[data-world-place]'), goEl = placeEl && placeEl.querySelector('[data-world-go]');
  const RACE_P = { id: 'race', name: 'Ring race', verb: 'Hold to run', key: 'Shift' }, TOWER_P = { id: 'tower', name: 'Sky tower', verb: 'Jump', key: 'Space' };
  function cta(name, verb, key) { if (!placeEl) return; goEl.querySelector('kbd').textContent = key || 'E'; placeEl.querySelector('b').textContent = name; goEl.querySelector('span').textContent = verb; }
  const CONTACT = PLACES.find((q) => q.id === 'contact'), SIT = { id: 'sit', name: '', verb: 'Stand up' };
  const FIRE_P = { id: 'fire', name: '', verb: 'Sit around the fire', key: 'E' };      // pass 77: by the fire a button sits him down in his place, and he plays
  function sitByFire() {
    if (sitting) return;
    const there = () => { player.fwd.copy(seatFwd); tangent(player.fwd, player.n); sitToPlay(); };
    if (player.n.angleTo(SEAT) * R < .25) there(); else go(SEAT, there);
    if (placeEl) placeEl.classList.remove('is-on');
  }
  let zoomSeq = null;
  function enterPlace(p) {                                // the picture closes on the place, goes dark, and the site is there
    if (!p || leavingTo || zoomSeq || inside.on || jump) return;
    if (p.id === 'sit') { standUp(); return; }
    if (p.id === 'fire') { sitByFire(); return; }
    if (p.id === 'studio') { openHatch(); return; }          // pass 77: no picture of the lid opening — E opens it where it lies, and the stairs under it are his to walk down
    if (p.quest) { Q.use(p); return; }                      // the bulb, the car: quests.js
    if (p.id === 'race') { say('Run through all eight rings before the clock runs out. Hold Shift to run!', false); return; }
    if (p.id === 'tower') { say(Q.BULB.done ? 'Jump from stone to stone with Space: gems all the way up!' : 'Jump from stone to stone with Space. Some of the stones have a battery to pick up!', false); return; }
    if (p.id === 'contact') { if (!call.on) return; ringStop(); call.on = false; }      // pass 96: only once it has rung; picked up, it is quiet
    if (placeEl) placeEl.classList.remove('is-on');
    travel = null;
    visit(p.id);
    if (p.id === 'portal') { leavingTo = p; jump = { t: 0, p }; return; }
    if (p.id === 'about') { mirror.go = true; prefetchAbout(); if (!mirror.state) toRiver(v1.copy(p.dir).multiplyScalar(R)); return; }
    leavingTo = p;
    /* where the picture ends up: at arm's length from the thing, round to one side of him — never through him — and clear of whatever stands there */
    const end = new THREE.Vector3(); let best = -1e9;
    (p.id === 'lab' ? [.6, -.6] : [.75, -.75, 1.3, -1.3]).forEach((turn) => {
      v2.copy(followCam.position).sub(p.look); v2.addScaledVector(player.n, -v2.dot(player.n)).normalize().applyAxisAngle(player.n, turn);
      v2.multiplyScalar(p.zoom).add(p.look).addScaledVector(player.n, p.rise);
      const rl = v2.length(), air = rl - land.hull(v3.copy(v2).divideScalar(rl)) - Math.abs(turn) * .12;
      if (air > best) { best = air; end.copy(v2); if (air < .35) end.multiplyScalar((rl + .35 - air) / rl); }
    });
    zoomSeq = { t: 0, at: p.look, end, open: p.id === 'lab' ? DOOR : null, go: p.id === 'lab' ? goInside : () => { window.location.href = p.href; } };
  }
  if (placeEl) placeEl.addEventListener('click', () => { if (inside.on && inside.kind !== 'house') Q.act(); else if (inside.on) homeAct(); else enterPlace(nearP); });       // (the button is the whole of it: name and verb)
  window.addEventListener('contextmenu', (e) => { if (mode !== 'walk') return; e.preventDefault(); if (Q.busy) return; if (inside.on) homeAct(); else if (nearP) enterPlace(nearP); });
  window.addEventListener('pageshow', () => { leavingTo = null; jump = null; player.shrink = 1; DOOR.k = HATCH.k = 0; HATCH.want = 0; HATCH.going = false; if (flashEl) flashEl.classList.remove('is-on'); document.body.classList.remove('is-landing'); });

  /* the map: the top of the planet from above, the campfire in the middle (the picture is made by build_planet.py) */
  const mapEl = document.querySelector('[data-world-map]'), mapC = mapEl && mapEl.querySelector('canvas'), mapX = mapC && mapC.getContext('2d');
  const MAPR = 116, MAPC = 132, MAPM = 8.5;                 // it shows 8.5 m round the fire
  const mapImg = new Image(); if (mapEl) mapImg.src = new URL('../models/planet-map.webp?v=3', import.meta.url).href;
  const MAPK = Math.SQRT2;                                   // pass 91: the map is square: its round picture is drawn √2 larger, so that it fills it
  function mapXY(dir) {
    const m = Math.acos(clamp(dir.y, -1, 1)) * R, ph = Math.atan2(dir.x, dir.z), r = m / MAPM * MAPR * MAPK;
    let x = r * Math.sin(ph), y = r * Math.cos(ph); const over = Math.max(Math.abs(x), Math.abs(y)) / (MAPR - 3);
    mapXY.out = over > 1; if (over > 1) { x /= over; y /= over; }
    return [MAPC + x, MAPC + y];
  }
  function mapSquare(x, pad) { const a = MAPC - MAPR - pad, w = 2 * (MAPR + pad), rr = 22 + pad; x.beginPath(); x.moveTo(a + rr, a); x.arcTo(a + w, a, a + w, a + w, rr); x.arcTo(a + w, a + w, a, a + w, rr); x.arcTo(a, a + w, a, a, rr); x.arcTo(a, a, a + w, a, rr); x.closePath(); }
  function drawMap() {
    if (!mapX) return;
    const x = mapX; x.clearRect(0, 0, 264, 264);
    mapSquare(x, 8); x.fillStyle = 'rgba(12,16,34,.72)'; x.fill();
    if (mapImg.complete && mapImg.naturalWidth) { const K = (MAPR + 2) * MAPK; x.save(); mapSquare(x, 2); x.clip(); x.globalAlpha = .92; x.drawImage(mapImg, MAPC - K, MAPC - K, 2 * K, 2 * K); x.restore(); }
    mapSquare(x, 8); x.lineWidth = 2; x.strokeStyle = 'rgba(255,255,255,.45)'; x.stroke();
    if (TRAIL.length) { x.save(); x.setLineDash([5, 6]); x.beginPath(); TRAIL.forEach((q, i) => { if (i % 2) return; const m = mapXY(q); if (!i) x.moveTo(m[0], m[1]); else x.lineTo(m[0], m[1]); }); x.strokeStyle = 'rgba(255,196,120,.85)'; x.lineWidth = 2.5; x.stroke(); x.restore(); }      // the lantern path
    x.beginPath(); x.arc(MAPC, MAPC, 5, 0, 6.2832); x.fillStyle = '#ffb04a'; x.fill();
    x.font = '600 21px "Space Grotesk", system-ui, sans-serif'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    PLACES.forEach((p) => {
      const m = mapXY(p.dir), col = '#' + new THREE.Color(p.tint).getHexString();
      x.beginPath(); x.arc(m[0], m[1], p === nearP ? 10 : 7.5, 0, 6.2832); x.fillStyle = col; x.fill(); x.lineWidth = 2; x.strokeStyle = 'rgba(255,255,255,.9)'; x.stroke();
      x.textAlign = p.tag[0] > 0 ? 'left' : p.tag[0] < 0 ? 'right' : 'center';
      const tx = m[0] + p.tag[0] * 14, ty = m[1] + 1 + p.tag[1] * 23;
      x.lineWidth = 5; x.strokeStyle = 'rgba(10,14,30,.8)'; x.strokeText(p.label, tx, ty); x.fillStyle = 'rgba(255,255,255,.97)'; x.fillText(p.label, tx, ty);
    });
    Q.dots().forEach((d) => { const m = mapXY(d.dir); x.beginPath(); x.arc(m[0], m[1], mapXY.out ? 5 : 7, 0, 6.2832); x.fillStyle = d.col; x.fill(); x.lineWidth = 2; x.strokeStyle = 'rgba(255,255,255,.9)'; x.stroke(); });      // the Manic GT, wherever it is (on the rim when it is beyond the map)
    /* pass 90: where he is, at a glance: a ring that breathes round him, and an arrow the way he faces (Evi's blue, outlined) */
    const me2 = mapXY(player.n), off = mapXY.out, ah = mapXY(v1.copy(player.n).addScaledVector(player.fwd, .12).normalize());
    const pulse = (performance.now() / 1400) % 1;
    x.beginPath(); x.arc(me2[0], me2[1], 11 + pulse * 16, 0, 6.2832); x.fillStyle = 'rgba(120,200,255,' + (.42 * (1 - pulse)).toFixed(3) + ')'; x.fill();
    x.beginPath(); x.arc(me2[0], me2[1], 13, 0, 6.2832); x.fillStyle = 'rgba(10,18,40,.55)'; x.fill(); x.lineWidth = 2.5; x.strokeStyle = '#fff'; x.stroke();
    let ax = ah[0] - me2[0], ay = ah[1] - me2[1]; const al = Math.hypot(ax, ay) || 1; ax /= al; ay /= al; if (off || al < .5) { ax = 0; ay = -1; }
    const px = -ay, py = ax;
    x.beginPath(); x.moveTo(me2[0] + ax * 10, me2[1] + ay * 10); x.lineTo(me2[0] - ax * 6 + px * 7, me2[1] - ay * 6 + py * 7); x.lineTo(me2[0] - ax * 2.5, me2[1] - ay * 2.5); x.lineTo(me2[0] - ax * 6 - px * 7, me2[1] - ay * 6 - py * 7); x.closePath();
    x.fillStyle = '#7cc8ff'; x.fill(); x.lineWidth = 1.5; x.strokeStyle = '#fff'; x.stroke();
  }
  if (mapEl) mapEl.addEventListener('click', (e) => {
    const r = mapC.getBoundingClientRect(), cx = (e.clientX - r.left) / r.width * 264, cy = (e.clientY - r.top) / r.height * 264;
    let best = null, bd = 30;
    PLACES.forEach((p) => { const m = mapXY(p.dir), d = Math.hypot(m[0] - cx, m[1] - cy); if (d < bd) { bd = d; best = p; } });
    if (best) travelTo(best);
  });

  /* Evi speaks in a box at the foot of the screen: her on the left, the words on the right, letter by letter
     (pass 75: it was a bubble by her, in the middle of the picture) */
  const sayEl = document.querySelector('[data-world-say]'), sayTx = sayEl && sayEl.querySelector('[data-world-say-text]');
  let sayUntil = 0, sayTimer = 0, sayFull = '', sayAfter = null;
  function sayEnd() {                                      // the line is all there
    clearInterval(sayTimer); sayTimer = 0;
    if (sayEl) sayEl.classList.remove('is-talking');
    if (sayTx) sayTx.textContent = sayFull;
    const cb = sayAfter; sayAfter = null; if (cb) cb();
  }
  function say(text, hold, done) {                         // hold: it stays until something else is said (the water's words, the steps of a quest)
    if (!sayEl || mode !== 'walk') return;
    if (!hold && mirror.state) return;                     // at the water only the water's words
    clearInterval(sayTimer); sayFull = text; sayAfter = done || null; sayUntil = 0; say.hold = !!hold;
    sayEl.hidden = false; sayTx.textContent = ''; document.body.classList.add('is-saying');
    requestAnimationFrame(() => sayEl.classList.add('is-on', 'is-talking'));
    let i = 0;
    sayTimer = setInterval(() => {
      if (mode !== 'walk' || sayEl.hidden) { clearInterval(sayTimer); sayTimer = 0; return; }
      const ch = text[i++]; sayTx.textContent = text.slice(0, i);
      if (ch && /[a-z]/i.test(ch) && i % 3 === 0) chirp(ch);
      if (i >= text.length) { sayEnd(); if (!hold) sayUntil = time + Math.max(4.5, text.length * .075); }
    }, 30);
  }
  const SAY = 'Welcome to ULJO! I\u2019m Evi, your guide. Walk around and explore: Jaime\u2019s projects are hidden all over this little planet.';
  function sayHello() { say(SAY, false, () => { setTimeout(() => { if (mode === 'walk') Q.brief(); }, 5200); }); }
  /* what she remembers about him (all of it is on this site), and what she reminds him of */
  const visited = new Set();
  try { JSON.parse(localStorage.getItem('uljo-visited') || '[]').forEach((v) => visited.add(v)); } catch (e) {}
  function visit(id) { if (visited.has(id)) return; visited.add(id); try { localStorage.setItem('uljo-visited', JSON.stringify([...visited])); } catch (e) {} }
  const FACTS = [
    'Did you know? Jaime once played a twelve-string guitar at C\u00e9geps en spectacle. The whole room held its breath.',
    'Desiderium is Jaime\u2019s first single. It\u2019s the song you\u2019re hearing right now.',
    'Jaime redesigned self-checkouts with Decathlon, so that everyone can use them. That\u2019s Easy-Checkout.',
    'Jaime says empathy is what separates engineering from design. I think about that a lot. For a firefly.',
    'Click the guitar on Jaime\u2019s back and he\u2019ll sit down and play for you.',
    'Jaime says he doesn\u2019t know much about anything, but he knows how music makes him feel.',
    'Posters, a bike-shop brand, a car\u2019s screen\u2026 Jaime designs a bit of everything. Scroll the site to see.'
  ];
  const NUDGES = {
    lab: 'See the little house? That\u2019s Jaime\u2019s home. Go in: the elevator inside goes down to his Underground Lab.',
    about: 'Psst! The little lake by the camp. Look into it. Trust me.',
    contact: 'That old phone on the armchair really works. It\u2019s how you reach Jaime.',
    portal: 'The violet portal is how we got here. Jump in if you want the story.',
    race: 'You can run, you know. Hold Shift: the rings at the end of the lantern path are waiting.'
  };
  let factBag = [], chatAt = 0;
  function remark() {
    const q = Q.hint(); if (q && Math.random() < .55) return q;      // first of all: the quest that is waiting
    const left = Object.keys(NUDGES).filter((k) => !visited.has(k));
    if (left.length && Math.random() < .5) return NUDGES[left[Math.floor(Math.random() * left.length)]];
    if (!factBag.length) factBag = FACTS.slice().sort(() => Math.random() - .5);
    return factBag.pop();
  }
  /* what she says over the water, before About opens */
  const MIRROR_LINE = 'Look, it\u2019s you! No one can see their reflection in running water. Only in still water can we see ourselves.';
  /* pass 77: her box can carry a button — what there is to do next, right where she says it (the studio's Done) */
  const sayBtn = sayEl && sayEl.querySelector('[data-world-say-act]'); let sayFn = null;
  function sayAct(label, fn) { if (!sayBtn) return; sayFn = fn || null; sayBtn.hidden = !fn; if (fn) sayBtn.textContent = label; sayEl.classList.toggle('has-act', !!fn); }
  if (sayBtn) sayBtn.addEventListener('click', (e) => { e.stopPropagation(); const f = sayFn; if (f) f(); });
  function sayDone() {
    clearInterval(sayTimer); sayTimer = 0; sayAfter = null; sayUntil = 0; sayAct('', null);
    if (!sayEl || sayEl.hidden) return;
    sayEl.classList.remove('is-on', 'is-talking'); document.body.classList.remove('is-saying');
    setTimeout(() => { if (!sayEl.classList.contains('is-on')) sayEl.hidden = true; }, 450);
  }
  if (sayEl) sayEl.addEventListener('click', () => { if (sayTimer) sayEnd(); else if (!say.hold) sayDone(); else Q.tap(); });      // a click: the whole line at once; another, and it goes

  /* his steps in the grass: a breath of filtered noise, very quiet */
  let actx = null, noiseBuf = null, lastStep = 0;
  function soundOn() {
    if (MUTE) return;
    if (actx) { if (actx.state === 'suspended') actx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try {
      actx = new AC(); const n = Math.floor(actx.sampleRate * .3); noiseBuf = actx.createBuffer(1, n, actx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    } catch (e) { actx = null; }
  }
  function footstep(wet) {
    if (NO_SFX) return;                                    // pass 81: no sound effects made in code
    if (!actx || actx.state !== 'running') return;
    const t = actx.currentTime, src = actx.createBufferSource(), bp = actx.createBiquadFilter(), g = actx.createGain();
    src.buffer = noiseBuf; src.playbackRate.value = .7 + Math.random() * .5;
    bp.type = 'bandpass'; bp.frequency.value = wet ? 650 + Math.random() * 300 : 1500 + Math.random() * 1500; bp.Q.value = .7;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.014 + Math.random() * .008, t + .014); g.gain.exponentialRampToValueAtTime(.0004, t + .13);      // pass 75: a third of what they were
    src.connect(bp); bp.connect(g); g.connect(actx.destination); src.start(t); src.stop(t + .17);
  }

  function chirp(ch) {                                     // Evi's voice: a small soft note now and then, low and round (pass 75: it was high and sharp)
    if (NO_SFX) return;                                    // pass 81: no sound effects made in code
    if (!actx || actx.state !== 'running') return;
    const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain(), lp = actx.createBiquadFilter(), c = ch.toLowerCase().charCodeAt(0) - 97;
    const f = 392 * Math.pow(2, [0, 2, 4, 7, 9][((c * 7) % 5 + 5) % 5] / 12) * ('aeiou'.indexOf(ch.toLowerCase()) >= 0 ? 1.5 : 1);
    o.type = 'sine'; o.frequency.setValueAtTime(f * .97, t); o.frequency.exponentialRampToValueAtTime(f, t + .04);
    lp.type = 'lowpass'; lp.frequency.value = 1500;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.017, t + .018); g.gain.exponentialRampToValueAtTime(.0004, t + .13);
    o.connect(lp); lp.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + .15);
  }
  /* the telephone: a press and it rings — two rings and a rest, like the old ones — and the next press picks it up */
  const ring = { on: false, t: 0, nodes: null };
  const call = { on: false, timer: 0, next: 0 };            // pass 96: on once it has rung (30 s into the walk) until he picks up; it rings again every half-minute meanwhile
  function ringStart() {
    ring.on = true; ring.t = 0; cta(CONTACT.name, 'Pick up');
    if (NO_SFX || !actx || actx.state !== 'running') return;
    const t0 = actx.currentTime, out = actx.createGain(), trem = actx.createGain(), lfo = actx.createOscillator(), dep = actx.createGain(), o1 = actx.createOscillator(), o2 = actx.createOscillator();
    o1.type = o2.type = 'triangle'; o1.frequency.value = 1318; o2.frequency.value = 1568; lfo.type = 'square'; lfo.frequency.value = 22;
    trem.gain.value = .5; dep.gain.value = .5; lfo.connect(dep); dep.connect(trem.gain); o1.connect(trem); o2.connect(trem); trem.connect(out); out.connect(actx.destination); out.gain.value = 0;
    for (let c = 0; c < 5; c++) [0, .55].forEach((off) => { const a = t0 + c * 2.6 + off; out.gain.setValueAtTime(0, a); out.gain.linearRampToValueAtTime(.045, a + .02); out.gain.setValueAtTime(.045, a + .38); out.gain.linearRampToValueAtTime(0, a + .42); });
    [o1, o2, lfo].forEach((n) => { n.start(t0); n.stop(t0 + 13.2); }); ring.nodes = [o1, o2, lfo];
  }
  function ringStop() {
    ring.on = false; phone.rotation.set(0, 0, 0); phone.position.set(0, 0, 0);
    if (ring.nodes) { ring.nodes.forEach((n) => { try { n.stop(); } catch (e) {} }); ring.nodes = null; }
  }
  /* his songs: a click on the guitar and he sits down where he is and plays one. To add one: the file in assets/audio/, a line here. */
  const SONGS = [{ title: 'Desiderium', src: '../audio/desiderium.mp3' }];
  let songEl = null, songN = 0, songFade = 0;
  /* the music: Desiderium, very low, from the moment you press Play; louder when he sits down to play it himself */
  const BGM = '../audio/desiderium.mp3', BG = .2144, BGM_FROM = 0;      // pass 79: ten per cent lower; pass 80: seven per cent lower again      // from the very beginning (his choice: the quiet opening included) · pass 75: louder by ten points
  const music = { el: null, want: 0, vol: 0, timer: 0 };
  /* pass 90: Desiderium opens very quietly and grows about 20 dB; past its first half-minute it is eased down, at most
     1.2 dB a second, by as much as 13 dB (measured from the file, a second at a time) */
  const MUSIC_DB = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,-1.5,-2.5,-2.5,-2.5,-3.5,-4.5,-6,-6,-6.5,-6.5,-6.5,-6.5,-7,-8,-9,-9,-9,-9,-9.5,-9.5,-9.5,-9,-9.5,-9,-9.5,-9,-9.5,-8.5,-9,-9,-10,-10,-10,-9.5,-10,-10,-10,-9.5,-10,-9.5,-10,-9.5,-10,-9.5,-9.5,-9,-10,-10,-10,-9.5,-10,-10,-10.5,-10,-10,-10,-10,-10,-10.5,-10.5,-11.5,-11.5,-12.5,-12.5,-12.5,-12,-12.5,-12.5,-12.5,-12,-12.5,-12.5,-12.5,-12,-12.5,-12,-12.5,-12.5,-12.5,-12.5,-12.5,-12.5,-13,-13,-13,-12.5,-12.5,-12.5,-12.5,-12.5,-12.5,-11,-9,-7,-5,-3,-1,-2,-3.5,-4.5,-5,-4.5,-2.5,-.5,0];
  function musicLevel() {
    const el = music.el; if (!el) return 1;
    const t = el.currentTime || 0, i = Math.floor(t), f = t - i, a = MUSIC_DB[Math.min(i, MUSIC_DB.length - 1)] || 0, b = MUSIC_DB[Math.min(i + 1, MUSIC_DB.length - 1)] || 0;
    return Math.pow(10, (a + (b - a) * f) / 20);
  }
  setInterval(() => { if (music.el && !music.el.paused && !MUTE) { try { music.el.volume = clamp(music.vol * musicLevel(), 0, 1); } catch (e) {} } }, 200);
  function musicTo(v, secs = 1.6) {
    music.want = v;
    if (MUTE) { clearInterval(music.timer); music.vol = 0; if (music.el) { try { music.el.volume = 0; music.el.pause(); } catch (e) {} } return; }
    if (!music.el) {
      try {
        const el = music.el = new Audio(new URL(BGM, import.meta.url).href); el.preload = 'auto'; el.volume = 0;
        const from = () => { try { el.currentTime = BGM_FROM; } catch (e) {} };
        if (el.readyState >= 1) from(); else el.addEventListener('loadedmetadata', from, { once: true });
        el.addEventListener('ended', () => { from(); if (music.want > 0) { const pr = el.play(); if (pr && pr.catch) pr.catch(() => {}); } });      // round again, from where it opens up
      } catch (e) { return; }
    }
    if (v > 0 && music.el.paused && !document.hidden) { const pr = music.el.play(); if (pr && pr.catch) pr.catch(() => { music.blocked = true; }); }      // (a browser may refuse sound before the first click: it starts then)
    clearInterval(music.timer);
    const step = Math.max(.004, Math.abs(v - music.vol) / (secs * 20));
    music.timer = setInterval(() => {                    // a fade of its own: it goes on even where the picture is paused
      music.vol = music.vol < music.want ? Math.min(music.want, music.vol + step) : Math.max(music.want, music.vol - step);
      try { music.el.volume = clamp(music.vol * musicLevel(), 0, 1); } catch (e) {}
      if (music.vol === music.want) { clearInterval(music.timer); if (music.want === 0) music.el.pause(); }
    }, 50);
  }
  /* on the title screen it plays as the page opens, and sinks away as the page is scrolled; walking, it stays */
  const menuVol = () => 0;                                 // pass 79: the title screen is silent: the song begins when Playground is pressed
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, () => {
    soundOn();
    if (music.el && music.want > 0 && music.el.paused && !document.hidden && !MUTE) { music.blocked = false; const pr = music.el.play(); if (pr && pr.catch) pr.catch(() => {}); }
  }, { passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (!music.el) return;
    if (document.hidden) music.el.pause(); else if (music.want > 0 && !MUTE) { const pr = music.el.play(); if (pr && pr.catch) pr.catch(() => {}); }
  });
  const soundBtn = document.querySelector('[data-world-sound]');
  const soundPaint = () => { if (!soundBtn) return; soundBtn.classList.toggle('is-off', MUTE); soundBtn.setAttribute('aria-pressed', String(MUTE)); soundBtn.setAttribute('aria-label', MUTE ? 'Turn the music on' : 'Turn the music off'); };
  function setSound(on) {
    soundOff = !on; MUTE = URL_MUTE || soundOff; window.__uljoSoundOff = MUTE;
    try { localStorage.setItem('uljo-sound', soundOff ? 'off' : 'on'); } catch (e) {}
    if (songEl) { try { songEl.muted = MUTE; } catch (e) {} }
    if (!MUTE) soundOn();
    musicTo(music.want, .7); soundPaint();
    window.dispatchEvent(new Event('uljo-sound'));          // (the campfire of main.js listens)
  }
  if (soundBtn) { soundBtn.hidden = false; soundBtn.addEventListener('click', (e) => { e.stopPropagation(); setSound(MUTE); soundBtn.blur(); }); soundPaint(); }
  function sitToPlay() {
    if (sitting || mode !== 'walk' || mirror.state || inside.on || zoomSeq || jump || leavingTo || player.stand < 1 || player.h > 0) return;
    sitting = true; travel = null; player.speed = 0; if (ring.on) ringStop();
    const sg = SONGS[songN++ % SONGS.length]; SIT.name = sg.title;
    clearInterval(songFade);
    if (sg.src === BGM) { musicTo(.85, 1.2); if (hint) hint.classList.add('is-gone'); return; }      // the song that is already playing: he plays it, louder
    musicTo(0, .8);
    if (!MUTE) { try { songEl = new Audio(new URL(sg.src, import.meta.url).href); songEl.volume = .85; songEl.onended = standUp; const pr = songEl.play(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) { songEl = null; } }
    if (hint) hint.classList.add('is-gone');
  }
  function standUp() {
    if (!sitting) return;
    sitting = false;
    if (mode === 'walk') musicTo(BG, 2.4);
    const a = songEl; songEl = null;
    if (a) { clearInterval(songFade); songFade = setInterval(() => { a.volume = Math.max(0, a.volume - .07); if (a.volume <= .01) { clearInterval(songFade); a.pause(); } }, 60); }
  }

  /* pass 79: into his reflection, and through it */
  /* pass 90: on the way to the water, My Universe's heavy parts are fetched ahead, so it opens quickly */
  let prefetched = false;
  function prefetchAbout() {
    if (prefetched) return; prefetched = true;
    const im = new Image(); im.src = new URL('../img/about-face.webp', import.meta.url).href;
    ['../../about.html', './about-world.js?v=25', './den.js?v=17', './about.js?v=18', '../models/character-hq.glb?v=1', '../models/journal.glb?v=1', '../models/tv.glb?v=1',
     (window.matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 700 ? '../models/planet.glb?v=8' : '../models/planet-hq.glb?v=3')].forEach((u) => {
      const l = document.createElement('link'); l.rel = 'prefetch'; l.href = new URL(u, import.meta.url).href; document.head.appendChild(l);
    });
  }
  function toUniverse() {
    if (leavingTo === PLACES[1] && mirror.out) return;
    leavingTo = PLACES[1]; musicTo(0, 1.2); mirror.out = { t: 0, fov: 32 }; mirror.qa = mirror.qa || new THREE.Quaternion();
    if (about) { about.classList.remove('is-on'); setTimeout(() => { about.hidden = true; }, 300); }
    if (sayEl) sayEl.classList.remove('is-on');
    document.body.classList.add('is-through');
    /* pass 90: a quick look, then his face as My Universe opens on it (a picture of its first frame, assets/img/about-face.webp)
       comes up over the water in half a second, the face where the face was; the page changes under that same picture,
       which My Universe shows first and lets go of once its own is drawn: no white, no dark */
    prefetchAbout();
    setTimeout(() => {
      try { sessionStorage.setItem('uljo-through', String(Date.now())); } catch (e) {}
      const ov = document.createElement('div'); ov.className = 'world-to-me'; ov.setAttribute('aria-hidden', 'true'); document.body.appendChild(ov);
      requestAnimationFrame(() => requestAnimationFrame(() => ov.classList.add('is-on')));
      setTimeout(() => { window.location.href = 'about.html'; }, 520);
    }, 380);
  }
  if (about) { const a = about.querySelector('a'); if (a) a.addEventListener('click', (e) => { if (mirror.state === 2) { e.preventDefault(); toUniverse(); } }); }
  window.addEventListener('pageshow', (e) => { if (e.persisted && mirror.out) { mirror.out = null; leavingTo = null; document.body.classList.remove('is-through'); exitMirror(); } });      // back from My Universe by the browser's own button
  function exitMirror() {
    mirror.out = null;
    mirror.go = false;
    if (!mirror.state) return;
    if (travel && travel.ghost) travel = null;
    mirror.state = 0; if (mirror.said) { mirror.said = 0; sayDone(); }
    if (about) { about.classList.remove('is-on'); setTimeout(() => { if (!mirror.state) about.hidden = true; }, 500); }
  }

  function enter() {
    if (mode !== 'rest') return;
    setDive(0); menuHush();
    mode = 'walk';
    window.scrollTo(0, 0);
    const r0 = canvas.getBoundingClientRect();
    fix = { a0: r0.width / r0.height, k: window.innerHeight / r0.height, e: 2 * r0.top / r0.height };
    document.body.classList.add('is-walking');
    cam.f.set(.12, 0, -1);                                  // he gets up facing his house and the last of the sun; the camera settles behind him, over the lake
    tangent(cam.f, player.n);
    player.fwd.copy(cam.f);
    if (back) back.hidden = false;
    if (pad) pad.hidden = false;
    if (jumpBtn) jumpBtn.hidden = !window.matchMedia('(pointer: coarse)').matches;
    if (hint) { hint.hidden = false; hint.classList.remove('is-gone'); setTimeout(() => hint.classList.add('is-gone'), 6000); }
    if (mapEl) mapEl.hidden = false;
    soundOn(); intro(); musicTo(BG, 2); Q.show(); setTimeout(() => { if (mode === 'walk') homeLoad(); }, 3200);
    /* pass 96: the phone is silent at first and offers nothing; half a minute in, it rings, and only then can it be picked up */
    clearTimeout(call.timer); call.on = false; call.next = 0;
    call.timer = setTimeout(() => { if (mode !== 'walk') return; call.on = true; call.next = 0; nearP = undefined; say('The phone on the armchair is ringing! Go and pick it up.', false); }, 30000);
    gov.quiet = performance.now() + 3000; gov.acc = gov.n = 0;      // the walk's first seconds build shaders: not judged
    resize(); requestAnimationFrame(resize);
    wake();
  }
  const quoteEl = document.querySelector('[data-world-quote]'), cardEl = document.querySelector('[data-world-card]'), flashEl = document.querySelector('[data-world-flash]');
  let introT = [], quoteTimer = 0;
  function intro() {                                       // the words he came for; when they have gone, Evi tells him where he is
    introT.forEach(clearTimeout); introT = [];
    const later = (fn, ms) => introT.push(setTimeout(() => { if (mode === 'walk') fn(); }, ms));
    /* pass 79: first the quote alone; the missions and the E buttons come slowly once it has gone (at least five seconds in) */
    document.body.classList.add('is-hush'); const unhush = (ms) => introT.push(setTimeout(() => document.body.classList.remove('is-hush'), ms));
    if (cardEl) { cardEl.hidden = false; later(() => cardEl.classList.add('is-on'), 900); }
    if (!quoteEl) { unhush(5000); later(sayHello, 2200); return; }
    /* the words come letter by letter (the rest waits, unseen, so the line never moves), then whose they are */
    const qt = quoteEl.querySelector('[data-world-quote-text]'), QT = quoteEl.dataset.text || (quoteEl.dataset.text = qt.textContent.trim()), PER = 52;
    qt.innerHTML = '<span class="q-on"></span><span class="q-off"></span>'; const on = qt.firstChild, off = qt.lastChild; off.textContent = QT;
    quoteEl.classList.remove('is-cited'); quoteEl.hidden = false;
    later(() => {
      quoteEl.classList.add('is-on'); let i = 0; clearInterval(quoteTimer);
      quoteTimer = setInterval(() => { if (mode !== 'walk') { clearInterval(quoteTimer); return; } i++; on.textContent = QT.slice(0, i); off.textContent = QT.slice(i); if (i >= QT.length) { clearInterval(quoteTimer); quoteEl.classList.add('is-cited'); } }, PER);
    }, 450);
    const end = 450 + QT.length * PER + 3300;
    later(() => quoteEl.classList.remove('is-on'), end); later(() => { quoteEl.hidden = true; }, end + 1700); unhush(Math.max(5000, end + 600));
    later(sayHello, end + 1900);
    later(() => { chatAt = time + 60; }, end + 1900);
  }
  function leaveWalk() {
    if (mode !== 'walk') return;
    introT.forEach(clearTimeout); introT = []; standUp(); ringStop(); jump = null; Q.cancel(); cam.h = 0;
    clearTimeout(call.timer); call.on = false;
    setTimeout(() => { if (mode === 'rest') { musicTo(menuVol(), 1.6); onScroll(); menuTalk(4000); } }, 700);
    clearInterval(quoteTimer); if (quoteEl) { quoteEl.classList.remove('is-on', 'is-cited'); quoteEl.hidden = true; }
    if (cardEl) { cardEl.classList.remove('is-on'); cardEl.hidden = true; }
    outside(); zoomSeq = null;
    exitMirror();
    mode = 'rest';
    document.body.classList.add('is-landing');
    setTimeout(() => {                                     // behind a blink of black, he is back by the fire
      travel = null; nearP = null; if (mapEl) mapEl.hidden = true; if (placeEl) placeEl.hidden = true; sayDone();
      player.n.copy(SEAT); player.fwd.copy(seatFwd); player.h = 0; player.vy = 0; player.speed = 0; player.stand = 0; player.dip = ground(SEAT) - R; player.shrink = 1; DOOR.k = HATCH.k = 0; HATCH.want = 0; HATCH.going = false; blend = 0; fix = null; mirror.k = 0;
      evi.userData.set = false;
      if (pad) pad.hidden = true;
      if (jumpBtn) jumpBtn.hidden = true; ['[data-world-coins]', '[data-world-race]'].forEach((q) => { const e = document.querySelector(q); if (e) { e.classList.remove('is-on'); e.hidden = true; } });
      document.body.classList.remove('is-walking');
      if (back) back.hidden = true;
      if (hint) hint.hidden = true;
      cssW = 0; resize(); requestAnimationFrame(() => { cssW = 0; resize(); });
      setTimeout(() => document.body.classList.remove('is-landing'), 60);
    }, 380);
  }
  let wantPlay = false;                                     // pass 91: pressed before the planet was ready: it opens when it is
  document.querySelectorAll('[data-world-play]').forEach((a) => a.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    if (ready) enter(); else wantPlay = true;
  }));
  if (back) back.addEventListener('click', () => { if (Q.back()) return; if (inside.on) outside(); else if (mirror.state) exitMirror(); else leaveWalk(); });

  const MOVE = { KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };
  window.addEventListener('keydown', (e) => {
    if (mode !== 'walk') return;
    if (Q.key(e)) { e.preventDefault(); return; }           // a quest has the keys: the studio's keyboard, the phone's shutter
    if (e.code === 'Escape') { if (mirror.state) exitMirror(); else leaveWalk(); return; }
    if (inside.on) {                                        // at home: he walks; E is the elevator, the record player, the way out
      if ((e.code === 'Enter' || e.code === 'KeyE') && !e.repeat) homeAct();
      if (e.code === 'Escape') outside();
      if (MOVE[e.code] || e.code.startsWith('Shift')) keys[e.code] = true;
      e.preventDefault(); return;
    }
    if ((e.code === 'Enter' || e.code === 'KeyE') && nearP) { enterPlace(nearP); return; }
    if (sitting && (MOVE[e.code] || e.code === 'Space')) { standUp(); return; }
    if (MOVE[e.code] || e.code === 'Space' || e.code.startsWith('Shift')) { keys[e.code] = true; e.preventDefault(); if (hint) hint.classList.add('is-gone'); }
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; Q.keyUp(e); });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  canvas.addEventListener('pointerdown', (e) => {
    if (mode !== 'walk' || Q.busy) return;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    if (e.pointerType === 'touch' && e.clientX < window.innerWidth * .45 && !stick.on) {
      stick.on = true; stick.id = e.pointerId; stick.x0 = e.clientX; stick.y0 = e.clientY; stick.x = stick.y = 0;
      if (pad) { pad.style.left = (e.clientX - pad.offsetWidth / 2) + 'px'; pad.style.top = (e.clientY - pad.offsetHeight / 2) + 'px'; pad.style.bottom = 'auto'; }
      drawStick();
      if (hint) hint.classList.add('is-gone');
    } else if (!look.on) { look.on = true; look.id = e.pointerId; look.x = e.clientX; look.y = e.clientY; look.x0 = e.clientX; look.y0 = e.clientY; look.t0 = performance.now(); }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (stick.on && e.pointerId === stick.id) {
      stick.x = clamp((e.clientX - stick.x0) / 46, -1, 1);
      stick.y = clamp((stick.y0 - e.clientY) / 46, -1, 1);
      drawStick();
    } else if (look.on && e.pointerId === look.id) {
      const dx = e.clientX - look.x, dy = e.clientY - look.y; look.x = e.clientX; look.y = e.clientY;
      cam.f.applyAxisAngle(player.n, -dx * .0065);
      cam.pitch = clamp(cam.pitch + dy * .004, -.1, 1.05);
      cam.dragAt = time;
    } else if (mode === 'walk' && e.pointerType === 'mouse' && performance.now() - (look.hov || 0) > 90) {     // the water answers the pointer
      look.hov = performance.now(); canvas.style.cursor = !mirror.state && (onThing(e.clientX, e.clientY) || onRiver(e.clientX, e.clientY)) ? 'pointer' : '';
    }
  });
  function onThing(x, y) {                                 // under the pointer: the guitar on his back, or the telephone
    const r = canvas.getBoundingClientRect();
    ndc.set((x - r.left) / r.width * 2 - 1, 1 - (y - r.top) / r.height * 2); ray.setFromCamera(ndc, camera);
    if (!sitting && !inside.on && player.stand >= 1 && ray.intersectObject(guitar, true).length) return 'guitar';
    if (!inside.on && ray.intersectObject(phone, true).length) return 'phone';
    return null;
  }
  const lift = (e) => {
    if (e.pointerId === stick.id) { stick.on = false; stick.id = -1; stick.x = stick.y = 0; drawStick(); if (pad) { pad.style.left = pad.style.top = pad.style.bottom = ''; } }
    if (e.pointerId === look.id) {
      if (look.on && e.type === 'pointerup' && mode === 'walk' && Math.hypot(e.clientX - look.x0, e.clientY - look.y0) < 7 && performance.now() - look.t0 < 450) {   // a click, not a drag
        if (inside.on) { /* at home a click does nothing by itself: the button, or E */ }
        else if (mirror.state) exitMirror();
        else if (sitting) { /* he plays on: the button, or a step, stands him up */ }
        else if (onThing(e.clientX, e.clientY) === 'guitar') sitToPlay();
        else if (onThing(e.clientX, e.clientY) === 'phone') { if (placeDist(CONTACT, player.n) < CONTACT.near + .9) enterPlace(CONTACT); else { travelTo(CONTACT); if (travel) travel.then = CONTACT; } }
        else {
          const pt = onRiver(e.clientX, e.clientY);
          if (pt) { mirror.go = true; prefetchAbout(); toRiver(pt); }
          else {
            const hit = ray.intersectObjects(planetParts, false)[0]; let pl = null;
            if (hit) { v1.copy(hit.point).normalize(); PLACES.forEach((q) => { if (q.pick && q.dir.angleTo(v1) * R < q.pick) pl = q; }); }
            if (pl) { if (placeDist(pl, player.n) < pl.near) enterPlace(pl); else { travelTo(pl); if (travel) travel.then = pl; } }
          }
        }
      }
      look.on = false;
    }
  };
  canvas.addEventListener('pointerup', lift); canvas.addEventListener('pointercancel', lift);

  function walk(dt, t) {
    let ix = stick.x, iz = stick.y;
    for (const k in MOVE) if (keys[k]) { ix += MOVE[k][0]; iz += MOVE[k][1]; }
    let len = Math.hypot(ix, iz), auto = false;
    const upNow = player.stand >= 1;
    if (jump) {                                             // a run, a leap, and the portal takes him
      jump.t += dt; const c = jump.p.dir, d = Math.acos(Math.min(1, player.n.dot(c))) * R;
      if (d > .08) { player.fwd.copy(c).addScaledVector(player.n, -player.n.dot(c)); tangent(player.fwd, player.n); }
      if (jump.t > .2 && d > .08 && jump.t < 1.6) {
        q1.setFromAxisAngle(v1.crossVectors(player.n, player.fwd).normalize(), Math.min(d, 3.4 * dt) / R);
        player.n.applyQuaternion(q1).normalize(); player.fwd.applyQuaternion(q1); cam.f.applyQuaternion(q1);
        player.speed = 3.4; player.phase += player.speed * dt * 3.1;
      } else player.speed = 0;
      if (jump.t > .35 && !jump.up) { jump.up = true; player.vy = 5.2; }
      if (player.h > 0 || player.vy > 0) { player.h += player.vy * dt; player.vy -= 11 * dt; if (player.h < 0) { player.h = 0; player.vy = 0; } }
      if (jump.t > 1.0) { player.shrink = Math.max(0, 1 - (jump.t - 1.0) / .75); player.fwd.applyAxisAngle(player.n, dt * 11); }
      if (jump.t > 1.15 && !jump.flash) { jump.flash = true; musicTo(0, .8); if (flashEl) flashEl.classList.add('is-on'); }
      if (jump.t > 2.1 && !jump.gone) { jump.gone = true; window.location.href = jump.p.href; }
      tangent(cam.f, player.n); tangent(player.fwd, player.n);
      return;
    }
    if (mirror.state && len > .08) exitMirror();
    if (travel && len > .08) travel = null;
    if (mirror.state === 2) len = 0;
    else if (travel && upNow) {                              // on his way, from one turn of the path to the next
      travel.t += dt;
      const lastLeg = travel.i >= travel.pts.length - 1;
      if (Math.acos(Math.min(1, player.n.dot(travel.pts[travel.i]))) * R < (lastLeg ? .14 : .4)) travel.i++;
      if (travel.i >= travel.pts.length || travel.t > 45) { const tr = travel; travel = null; player.speed = 0; len = 0; if (tr.done) tr.done(); if (tr.then) enterPlace(tr.then); }
      else { auto = true; len = 1; }
    } else if (mirror.state === 1 && !travel) exitMirror();
    prevN.copy(player.n);
    if (len > .08 && upNow) {
      const k = Math.min(1, len);
      let dir;
      const goal = travel ? travel.pts[travel.i] : mirror.n;
      if (auto) dir = v3.copy(goal).addScaledVector(player.n, -player.n.dot(goal)).normalize();
      else { ix /= len; iz /= len; const right = v1.crossVectors(cam.f, player.n).normalize(); dir = v3.copy(cam.f).multiplyScalar(iz).addScaledVector(right, ix).normalize(); }
      const run = keys.ShiftLeft || keys.ShiftRight || (stick.on && Math.hypot(stick.x, stick.y) > .96);      // on a phone: the stick pushed all the way
      player.speed = mix(player.speed, (run ? 3.6 : 2.1) * k, 1 - Math.pow(.0005, dt));
      const ang = player.speed * dt / R;
      const axis = v1.crossVectors(player.n, dir).normalize();
      q1.setFromAxisAngle(axis, ang);
      player.n.applyQuaternion(q1).normalize();
      cam.f.applyQuaternion(q1); player.fwd.applyQuaternion(q1); dir.applyQuaternion(q1);
      player.fwd.lerp(dir, 1 - Math.pow(.00002, dt)); tangent(player.fwd, player.n);   // he turns to where he goes
      // the camera drifts round behind him, unless you are holding it
      if (!look.on && t - cam.dragAt > 1.2 && (auto || iz > -.3)) {      // (turned, not blended: it comes round even from straight ahead of him)
        const ang = Math.atan2(v1.crossVectors(cam.f, player.fwd).dot(player.n), cam.f.dot(player.fwd));
        cam.f.applyAxisAngle(player.n, ang * (1 - Math.pow(auto ? .1 : .45, dt)));
      }
      player.phase += player.speed * dt * 3.1;
    } else {
      player.speed = mix(player.speed, 0, 1 - Math.pow(.0001, dt));
    }
    tangent(cam.f, player.n); tangent(player.fwd, player.n);
    /* what he stands on: the ground, or the top of a floating stone (one-way: he jumps up through them) */
    let sup = 0; TOWER.on = -1;
    if (player.n.dot(FIELD.c) > .93) for (let i = 0; i < TOWER.plats.length; i++) {
      const pl = TOWER.plats[i], top = pl.r - (R + player.dip);
      if (top <= player.h + .06 && top > sup && Math.acos(Math.min(1, player.n.dot(pl.dir))) * pl.r < pl.rad + .12) { sup = top; TOWER.on = i; }
    }
    let onSteps = false;
    if (HATCH.k > .8 && HATCH.dim && !HATCH.going && player.n.angleTo(HATCH.at) * R < 2.2) {      // the open hatch: where its planks were there are steps now, going down toward the north
      const D = HATCH.dim; v1.copy(player.n).multiplyScalar(R + player.dip).applyMatrix4(HATCH.inv);
      const zs = D.Wz / 2 - v1.z;
      if (v1.x > .1 && v1.x < D.Wx - .1 && zs > 0 && zs < D.Wz) {
        onSteps = true;
        const step = clamp(Math.floor(zs / D.RUN) + 1, 1, D.NS), yT = -step * D.RISE - .07;                 // the top of the step he is over, under the hatch's own top
        sup = (D.top + yT) / Math.max(.9, player.n.dot(D.ey)) - (R + player.dip);
        if (player.h < -.25) {                              // below the ground the shaft's walls keep him in
          const x = clamp(v1.x, .2, D.Wx - .2), z = Math.max(v1.z, -D.Wz / 2 + .12);
          if (x !== v1.x || z !== v1.z) { v2.set(x, v1.y, z).applyMatrix4(v4m.copy(HATCH.inv).invert()).normalize(); player.n.copy(v2); tangent(cam.f, player.n); tangent(player.fwd, player.n); }
        }
        if (step >= D.NS - 1 && player.h < sup + .12) {      // at the foot of them: the dark, then the studio
          HATCH.going = true; player.speed = 0; musicTo(0, .6); document.body.classList.add('is-landing');
          setTimeout(() => { if (mode === 'walk') Q.enterStudio(); else document.body.classList.remove('is-landing'); }, 430);
        }
      }
    }
    const grounded = player.h <= sup + .001 && player.vy <= 0;
    if (keys.Space && grounded && upNow && !mirror.state) player.vy = 5.4;      // a jump: about a metre and a third
    if (player.vy > 0 || player.h > sup + .001) {
      player.h += player.vy * dt; player.vy -= 11 * dt;
      if (player.h <= sup && player.vy <= 0) { player.h = sup; player.vy = 0; }
    } else { player.h = sup; player.vy = 0; }
    if (player.h < 1.0) for (let i = 0; i < obstacles.length; i++) {            // trunks, rocks and the fire are solid (not for someone up in the air)
      const o = obstacles[i], d = player.n.dot(o.dir);
      if (d < .2) continue;
      const need = (o.rad + .2) / R, ang = Math.acos(Math.min(1, d));
      if (ang < need) {
        v1.copy(player.n).addScaledVector(o.dir, -d);
        if (v1.lengthSq() < 1e-8) v1.copy(player.fwd);
        v1.normalize();
        player.n.copy(o.dir).multiplyScalar(Math.cos(need)).addScaledVector(v1, Math.sin(need)).normalize();
      }
    }
    /* the planet's own things — trunks, walls, rocks, banks: he slides along them, and never goes in */
    const ghost = mirror.state === 2 || (travel && travel.ghost && travel.i >= travel.pts.length - 1) || player.h > 1.0 || onSteps;
    if (!ghost) {
      let fr = land.free(player.n);
      for (let it = 0; it < 4 && fr < BODY; it++) {
        const e1 = tangent(v1.copy(player.fwd), player.n), e2 = v3.crossVectors(player.n, e1), eps = .12 / R;
        const g1 = land.free(v2.copy(player.n).addScaledVector(e1, eps).normalize()) - land.free(v2.copy(player.n).addScaledVector(e1, -eps).normalize());
        const g2 = land.free(v2.copy(player.n).addScaledVector(e2, eps).normalize()) - land.free(v2.copy(player.n).addScaledVector(e2, -eps).normalize());
        const gl = Math.hypot(g1, g2); if (gl < 1e-4) break;
        const mv = (BODY - fr + .012) / R / gl;
        player.n.addScaledVector(e1, g1 * mv).addScaledVector(e2, g2 * mv).normalize();
        fr = land.free(player.n);
      }
      if (fr < BODY - .1 && land.free(prevN) > fr) player.n.copy(prevN);       // nothing to slide along: he stays where he was
      tangent(cam.f, player.n); tangent(player.fwd, player.n);
    }
  }
  const BODY = .2, prevN = new THREE.Vector3(), v4m = new THREE.Matrix4();

  /* ---------- the quests (pass 75): three things to do, each one a project of his — quests.js ---------- */
  const Q = makeQuests({
    THREE, scene, camera, canvas, hero, V, R, UP, at, ground, land, plant, glow, hdr, sst, clamp, mix, rnd, lite, calm, get MUTE() { return MUTE; },
    player, me, bones, cam, inside, indoors, outside, mirror, FIELD, TOWER, TRAIL, PLACES, CONTACT, obstacles, gems, gemGeo, gemMat, gemChime,
    say, sayDone, sayAct, visit, visited, go, cta, loadGLB, musicTo, music, BG, reachArm, turnBone, setHand, curlHand, ARMB, armRest, HATCH, guitar, phoneSeat, ring, ringStart, ringStop,
    keys, stick, MOVE, renderer, station, STATIONQ, eviPos, evi, flash: (on) => { if (flashEl) flashEl.classList.toggle('is-on', on); }, dark: (on) => document.body.classList.toggle('is-landing', on),
    get actx() { return actx; }, get time() { return time; }, get mode() { return mode; }, get nearP() { return nearP; },
    stopTravel: () => { travel = null; }, soundOn, showGems, hideMap: (h) => { if (mapEl) mapEl.hidden = h; }
  });

  /* ---------- the frame ---------- */
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener('pointermove', (e) => { mouse.x = e.clientX / window.innerWidth * 2 - 1; mouse.y = e.clientY / window.innerHeight * 2 - 1; ptr.x = e.clientX; ptr.y = e.clientY; ptr.mouse = e.pointerType === 'mouse'; }, { passive: true });
  /* over the title screen Evi is the cursor: she flies where the hand points; Play sends her back to him */
  const ptr = { x: -1, y: -1, mouse: false, on: false, fine: window.matchMedia('(hover: hover) and (pointer: fine)').matches };
  document.addEventListener('mouseout', (e) => { if (!e.relatedTarget) ptr.x = -1; });
  const eviMats = [];
  function eviOnTop(on) {                                  // as a cursor nothing may hide her
    if (!eviMats.length) evi.traverse((o) => { if (o.material) eviMats.push(o.material); });
    eviMats.forEach((m) => { m.depthTest = !on; }); evi.traverse((o) => { o.renderOrder = on ? 30 : (o === eviGlow ? 5 : 0); });
  }
  const followCam = new THREE.PerspectiveCamera(46, 1.4, .1, 500);
  const focus = SEAT.clone().multiplyScalar(R);
  const setPt = (p, i, pos, size, r, g, b, a) => {
    p.geometry.attributes.position.setXYZ(i, pos.x, pos.y, pos.z); p.geometry.attributes.aSize.setX(i, size); p.geometry.attributes.aColor.setXYZW(i, r, g, b, a);
  };
  let blink = 3, frameNo = 0, time = 0, wasNear = true;

  function frame() {
    raf = 0;
    const t0 = performance.now();
    if (!dbg.dt) pace();
    const dt = dbg.dt || Math.min(.05, clock.getDelta()); time += dt;
    const t = time, amp = calm ? 0 : 1;
    uTime.value = t; frameNo++;

    // standing up / the camera coming round
    const walking = mode === 'walk';
    player.stand = clamp(player.stand + (walking && !sitting ? dt / 1.95 : -dt / (sitting ? .8 : .5)), 0, 1);       // as long as it takes him to get up
    blend = clamp(blend + (walking ? dt / 1.5 : -dt / .4), 0, 1);
    const st = player.stand * player.stand * (3 - 2 * player.stand);
    if (walking && inside.on) insideStep(dt); else if (walking && !Q.busy) walk(dt, t); else if (walking) { player.speed = 0; if (!Q.driving) keys.Space = false; }
    { const d0 = player.dip; player.dip += (ground(player.n) - R - player.dip) * (1 - Math.pow(.002, dt)); if (player.h > 0) player.h = Math.max(0, player.h - (player.dip - d0)); }      // up in the air (or on a stone) he keeps his true height when the ground under him dips
    /* pass 77: looking into the water was stiff — one short move, everything at once. Now it takes its time and is eased at
       both ends; the knees give first, then the back, then the head, and the eye only follows once he is leaning */
    mirror.k = clamp(mirror.k + (mirror.state === 2 ? dt / (mirror.go ? 1.05 : 2.5) : -dt / 1.15), 0, 1);      // (pass 90: asked for, the look is quick)
    const e5 = (a, b) => { const x = clamp((mirror.k - a) / (b - a), 0, 1); return x * x * x * (x * (x * 6 - 15) + 10); };
    const mk = e5(.16, 1), mkb = e5(0, .86);                 // mk: the eye · mkb: his body
    if (mirror.state === 2) {                              // he looks; she speaks; then About
      mirror.t += dt;
      if (mirror.t > 1.9 && !mirror.said) { mirror.said = 1; visit('about'); say(MIRROR_LINE, true, () => { mirror.said = 2; mirror.saidAt = time; }); }
      if (mirror.said === 2 && time - mirror.saidAt > .8 && about && about.hidden && !mirror.out) { about.hidden = false; requestAnimationFrame(() => about.classList.add('is-on')); }
      if (mirror.go && mirror.t > 1.15 && !leavingTo) toUniverse();      // pass 90: no waiting for her words
      if (!mirror.go && mirror.t > 1.2 && about && about.hidden && !mirror.out) { about.hidden = false; requestAnimationFrame(() => about.classList.add('is-on')); }
    }

    // his body
    const add = {};
    if (st < 1) {                                          // playing: one hand strums, the head keeps time
      const k = (1 - st) * amp, s = Math.sin(t * 5.2);
      add.strum = .032 * s * k;
      add.head = [.035 * Math.sin(t * 1.3) * k, 0, .025 * Math.sin(t * .9) * k];
      add.torso = [.014 * Math.sin(t * 1.3) * k, 0, 0];
      add.elR = [.02 * Math.sin(t * 2.6 + 1) * k, 0, 0, 0];
    }
    if (st > 0) {
      const w = Math.min(1, player.speed / 2) * st, c = Math.sin(player.phase), c2 = Math.cos(player.phase), fast = clamp((player.speed - 2.2) / 1.4, 0, 1);
      add.legL = [(.72 + .25 * fast) * c * w, 0, 0]; add.legR = [-(.72 + .25 * fast) * c * w, 0, 0];
      add.knL = [Math.max(0, c2) * (1.0 + .5 * fast) * w, 0, 0]; add.knR = [Math.max(0, -c2) * (1.0 + .5 * fast) * w, 0, 0];
      const aL = add.armL || Z4, aR = add.armR || Z4;
      add.armL = [aL[0] - (.55 + .3 * fast) * c * w, 0, 0]; add.armR = [aR[0] + (.55 + .3 * fast) * c * w, 0, 0];
      const eL = add.elL || Z4, eR = add.elR || Z4;
      add.elL = [eL[0] - (.35 + .9 * fast) * w, 0, eL[2], 0]; add.elR = [eR[0] - (.35 + .9 * fast) * w, 0, 0, 0];
      add.bob = Math.abs(c2) * (.035 + .03 * fast) * w + (1 - w) * st * .006 * Math.sin(t * 2);
      add.torso = [(add.torso ? add.torso[0] : 0) + (.1 + .12 * fast) * w, .09 * c * w, 0];
      add.head = [(add.head ? add.head[0] : 0) - .05 * w, -.06 * c * w, 0];
    }
    if (mkb > 0) {                                          // leaning over the water
      const kL = e5(0, .6), kT = e5(.06, .86), kH = e5(.3, 1), kA = e5(.14, .92), br = mirror.k >= 1 ? Math.sin(t * 1.15) : 0;      // legs, back, head, arms — one after the other; then he breathes
      add.lean = .95 * kT;
      const h_ = add.head || Z4, t_ = add.torso || Z4;
      add.head = [h_[0] + .3 * kH + .012 * br, h_[1], h_[2]]; add.torso = [t_[0] + .92 * kT + .014 * br, t_[1], t_[2]];
      add.legL = [-.28 * kL, 0, 0]; add.legR = [-.28 * kL, 0, 0]; add.knL = [.5 * kL, 0, 0]; add.knR = [.5 * kL, 0, 0]; add.bob = (add.bob || 0) - .035 * kL;      // knees soft
      add.armL = [-.75 * kA, 0, .12 * kA]; add.armR = [-.75 * kA, 0, -.12 * kA];                                                       // hands to his knees
    }
    animDt = dt; pose(st, add);
    placeMe();
    holdGuitar(st);
    Q.pose(dt);                                              // his hands on the studio's keys, his phone held up
    blink -= dt; if (blink < -.13) blink = rr(2.2, 5.5);
    const shut = st < .5 || blink < 0;
    if (inside.on) { blob.position.copy(inside.base).add(inside.pos); blob.position.y += .03 - inside.drop; blob.quaternion.identity(); }
    else { blob.position.copy(player.n).multiplyScalar(ground(player.n) + .03); blob.quaternion.setFromUnitVectors(UP, player.n); }
    blob.material.uniforms.k.value = mix(.55, .42, st) * clamp(1 - player.h * 1.2, .2, 1);
    blob.scale.setScalar(mix(1.25, .8, st));

    // fire, sparks, smoke
    const fl = .5 + .5 * Math.sin(t * 11.3) * Math.sin(t * 7.1 + 1.3) + .2 * Math.sin(t * 23.);
    fireLight.position.copy(FIRE).addScaledVector(UP, .22);
    fireLight.intensity = 9 + amp * 2.2 * fl;
    fireFill.position.copy(FIRE).addScaledVector(UP, 1.0); fireFill.intensity = 7 + amp * 1.5 * fl;
    fireGlow.material.uniforms.k.value = 1 + amp * .14 * fl;
    waterMat.uniforms.uFlick.value = .8 + amp * .3 * fl; portalGlow.material.uniforms.k.value = 1 + amp * .22 * Math.sin(t * 1.1);
    const fy = Math.atan2(camera.position.x - fire.position.x, camera.position.z - fire.position.z);
    flames.forEach((f, i) => { f.rotation.y = fy + i * .5; });
    sparkSeed.forEach((s, i) => {
      const u = (t * s.w * .32 + s.o) % 1, y = FIRE.y - .05 + u * 2.1 * s.s, a = s.a + u * 3.2, r = s.r * (1 + u * 2.4);
      v1.set(Math.cos(a) * r + Math.sin(t * 1.3 + i) * .05 * u, y, Math.sin(a) * r);
      const k = Math.pow(1 - u, 1.6) * 7; setPt(sparks, i, v1, .016 * (1 - u * .5), 1 * k, .42 * k, .08 * k, 1);
    });
    for (let i = 0; i < 22; i++) {
      const u = (t * .07 + i / 22) % 1, y = .55 + u * 4.4;
      v1.set(Math.sin(y * 2.1 + t * .6) * .1 * (1 + u * 2.2), FIRE.y - .25 + y, Math.cos(y * 1.6 + t * .45) * .07 * (1 + u));
      setPt(smoke, i, v1, .22 + u * .6, .30, .21, .26, .2 * Math.sin(Math.PI * u) * (1 - u * .35));
    }
    flySeed.forEach((d, i) => {
      d.a += dt * d.s * amp;
      v1.copy(d.dir).applyAxisAngle(d.ax, Math.sin(d.a) * .25).multiplyScalar(d.g + d.h + .25 * Math.sin(d.a * 1.7));
      const k = (.25 + .75 * (.5 + .5 * Math.sin(d.a * 3.1))) * 3.2; setPt(flies, i, v1, .03, .45 * k, .85 * k, 1 * k, 1);
    });
    [sparks, smoke, flies].forEach((p) => { p.geometry.attributes.position.needsUpdate = true; p.geometry.attributes.aColor.needsUpdate = true; p.geometry.attributes.aSize.needsUpdate = true; });

    // the camera: the picture's, the follower's, or on its way between them
    mouse.sx += (mouse.x - mouse.sx) * (1 - Math.pow(.02, dt)); mouse.sy += (mouse.y - mouse.sy) * (1 - Math.pow(.02, dt));
    aimRest(camera.aspect);
    let dimK = 1;
    if (dive.state === 1 && !walking && blend <= 0) {       // pass 77: nothing opens in the ground any more. Scrolled, the eye is lowered — the picture rises as a page does — and goes in, down to the lawn before the fire and into the planet; the dark has the picture before it gets there, and the Underground Lab comes out of that dark
      const dv = clamp(window.scrollY / Math.max(1, dive.top), 0, 1);
      if (!dive.set) {                                       // where the screen's own point (the lawn under the fire, low in the picture) meets the ground
        dive.set = true; restCam.updateMatrixWorld(true);
        v1.set(dive.ndc[0], dive.ndc[1], .5).unproject(restCam).sub(restCam.position).normalize(); dive.dir.copy(v1);
        let far = 0;
        for (let d = 6; d < 90; d += .2) { v2.copy(restCam.position).addScaledVector(v1, d); const rl = v2.length(); if (rl < land.hull(v3.copy(v2).divideScalar(rl)) + .05) { far = d; break; } }
        dive.len = far || 30; dive.pt.copy(restCam.position).addScaledVector(v1, dive.len);
        mirrorCam.position.copy(restCam.position); mirrorCam.up.set(0, 1, 0); mirrorCam.lookAt(dive.pt); dive.q.copy(mirrorCam.quaternion);      // looking straight down the way it goes
      }
      const r0 = .14, go = (1 - Math.pow(r0, dv)) / (1 - r0);      // the distance left shrinks by the same share with every step of the scroll: an even zoom
      restCam.position.addScaledVector(dive.dir, dive.len * go * .9);      // pass 81: the old zoom, back: straight in
      restCam.quaternion.slerp(dive.q, sst(0, .7, dv));
      restCam.updateMatrixWorld(true);
      dimK = 1 - sst(.28, .76, dv);                          // black well before the ground is reached
    }
    film.uniforms.dim.value += (dimK - film.uniforms.dim.value) * (dive.state ? 1 : .2);
    if (amp && blend < 1 && dive.state !== 1) {                                // a slight lean with the pointer: it is a place, not a picture
      restCam.position.addScaledVector(v1.set(1, 0, 0).applyQuaternion(restCam.quaternion), mouse.sx * .22)
        .addScaledVector(v2.set(0, 1, 0).applyQuaternion(restCam.quaternion), -mouse.sy * .1);
    }
    if (blend > 0) {
      const tall = camera.aspect < 1 ? 1.4 : 1;              // a phone held upright stands further back
      { const ph = Math.max(player.h, -.28); cam.h += (ph - cam.h) * (1 - Math.pow(ph > cam.h ? .004 : .02, dt)); }      // (down the hatch's steps the eye stays above the ground)      // pass 75: it rides up with him — it used to follow at half his height and lose him
      const hi = clamp(cam.h / 13, 0, 1);                    // up the tower the eye stands back and a little higher
      const ch = (1.25 + cam.pitch * 2.4) * (tall > 1 ? 1.2 : 1) + hi * 1.4, cd = cam.dist * tall * (1 - cam.pitch * .25) * (1 + hi * .9);
      const G = R + player.dip; let pull = 1;
      v3.copy(player.n).multiplyScalar(G + 1.35 + player.h);      // his head: the camera's arm starts there
      for (let it = 0; it < 6; it++) {                       // if a crown, a roof or a rise of the ground is in the way, come closer
        followCam.position.copy(player.n).multiplyScalar(G + cam.h + ch).addScaledVector(cam.f, -cd * pull);
        let hit = false;
        for (let q = 1; q <= 5 && !hit; q++) { v2.lerpVectors(v3, followCam.position, q / 5); const rl = v2.length(); v2.divideScalar(rl); if (rl < land.hull(v2) + .3) hit = true; }
        for (let q = 2; q <= 5 && !hit; q++) {                // and nothing may stand between the camera and his waist
          v2.copy(player.n).multiplyScalar(G + .75 + player.h).lerp(followCam.position, q / 5.6); const rl = v2.length(); v2.divideScalar(rl); if (rl < land.hull(v2) + .12) hit = true;
        }
        if (!hit) break;
        pull *= .74;
      }
      cam.pull += (pull - cam.pull) * (1 - Math.pow(pull < cam.pull ? .0005 : .08, dt));
      followCam.position.copy(player.n).multiplyScalar(G + cam.h + ch).addScaledVector(cam.f, -cd * cam.pull);
      followCam.up.copy(player.n);
      followCam.lookAt(v1.copy(player.n).multiplyScalar(G + 1.05 + cam.h).addScaledVector(cam.f, .6));
      TOWER.view += ((TOWER.on === TOWER.plats.length - 1 && player.speed < .3 && Q.BULB.done && !Q.busy ? 1 : 0) - (TOWER.view || 0)) * (1 - Math.pow(.25, dt));      // (pass 75: only once the bulb has been dealt with — it is the reward)
      if (TOWER.view > .001) {                               // on the top stone, standing still: the whole planet, and space round it
        const k = TOWER.view * TOWER.view * (3 - 2 * TOWER.view);
        v2.copy(player.n).multiplyScalar(G + player.h + 9).addScaledVector(cam.f, -24);
        mirrorCam.position.copy(v2); mirrorCam.up.copy(player.n); mirrorCam.lookAt(v1.set(.9, 1.4, -.05));
        followCam.position.lerp(mirrorCam.position, k); followCam.quaternion.slerp(mirrorCam.quaternion, k);
      }
      const b = blend * blend * (3 - 2 * blend);
      camera.position.lerpVectors(restCam.position, followCam.position, b);
      camera.quaternion.slerpQuaternions(restCam.quaternion, followCam.quaternion, b);
      camera.fov = mix(restCam.fov, camera.aspect < 1 ? 64 : 51, b);
    } else {
      camera.position.copy(restCam.position); camera.quaternion.copy(restCam.quaternion); camera.fov = restCam.fov;
    }
    if (mk > 0) {                                           // his own eyes, looking down into it
      me.updateMatrixWorld(true);
      bones.head.getWorldPosition(v1);
      mirrorCam.position.copy(v1).addScaledVector(player.n, .12).addScaledVector(player.fwd, .22);
      mirrorCam.up.copy(player.fwd);
      v2.copy(mirrorCam.position).addScaledVector(player.fwd, -.16).normalize(); mirrorCam.lookAt(v2.multiplyScalar(ground(v2) + .03));
      if (mirror.out) {                                     // leaving: the eye turns to his face in the water and closes on it
        mirror.out.t += dt; const ko = sst(0, .7, mirror.out.t);
        const q0 = mirrorCam.quaternion.clone(), hd = mirror.hd || (mirror.hd = new THREE.Vector3());
        bones.head.getWorldPosition(hd); const nn = hd.clone().normalize(); lakeAt(nn.clone()); const wl = lakeAt.lake.level;      // (lakeAt uses the shared scratch vectors: nothing of ours is kept in them)
        hd.addScaledVector(nn, -2 * (hd.length() - wl) + .06);       // the head, mirrored in the water's surface
        mirrorCam.lookAt(hd); mirror.qa.copy(mirrorCam.quaternion);
        mirrorCam.quaternion.copy(q0).slerp(mirror.qa, ko);
        mirror.out.fov = 32 + (13 - 32) * ko;
      }
      camera.position.lerp(mirrorCam.position, mk); camera.quaternion.slerp(mirrorCam.quaternion, mk); camera.fov = mix(camera.fov, mirror.out ? mirror.out.fov : 32, mk);
      { const arc = Math.sin(Math.PI * mk); camera.position.addScaledVector(v3.crossVectors(player.fwd, player.n).normalize(), arc * .85).addScaledVector(player.n, arc * .32); }      // pass 77: round his right shoulder, not straight through the guitar on his back
      mirrorLight.position.copy(v2).addScaledVector(player.n, .1).addScaledVector(player.fwd, .1); mirrorLight.intensity = 3.2 * mk;
    }
    if (zoomSeq && !inside.on) {                            // going in: the picture closes on the thing itself, then goes dark
      zoomSeq.t += dt; const kz = sst(0, 1.2, zoomSeq.t), more = zoomSeq.open ? .75 : 0;      // a door takes its time
      if (zoomSeq.open) zoomSeq.open.k = sst(.45, 1.5, zoomSeq.t);
      camera.position.lerp(zoomSeq.end, kz); mirrorCam.position.copy(camera.position); mirrorCam.up.copy(player.n); mirrorCam.lookAt(zoomSeq.at);
      camera.quaternion.slerp(mirrorCam.quaternion, kz); camera.fov = mix(camera.fov, 30, kz);
      if (zoomSeq.t > 1.05 + more && !zoomSeq.dark) { zoomSeq.dark = true; musicTo(0, .5); document.body.classList.add('is-landing'); }
      if (zoomSeq.t > 1.5 + more && !zoomSeq.done) { zoomSeq.done = true; const go = zoomSeq.go; zoomSeq = null; go(); }
    }
    if (inside.on && inside.kind === 'house') {             // at home the eye stands at the open corner of the room, and turns a little with him
      const tall = camera.aspect < 1 ? 1.35 : 1, p = inside.pos;
      camera.position.copy(ROOM).add(v1.set(4.7 * tall, 4.1 * tall - inside.drop * .1, 6.5 * tall)); camera.up.set(0, 1, 0);
      camera.lookAt(v2.copy(ROOM).add(v1.set(-.45 + p.x * .28, .8 - inside.drop * .35, -.35 + p.z * .28))); camera.fov = camera.aspect < 1 ? 58 : 40;
    }
    Q.camera(camera, dt);                                   // the studio's corner, his own eyes behind the phone
    if (dbg.spy) dbg.spy(camera);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
    sky.position.copy(camera.position); stars.position.copy(camera.position);
    if (!calm && !inside.on) {                              // shooting stars
      const now = performance.now();
      if (!meteor.fired ? now >= meteor.first : (meteor.next -= dt) <= 0) {
        const ms = meteor.pool.find((q) => q.t < 0);
        meteor.fired = true; meteor.next = rr(2.4, 3.6);
        if (ms) {                                           // anywhere in the upper two thirds of the picture, any way across it, falling a little
          const th = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), ang = rr(0, Math.PI * 2);
          const r = v1.set(1, 0, 0).applyQuaternion(camera.quaternion), u = v2.set(0, 1, 0).applyQuaternion(camera.quaternion), f = v3.set(0, 0, -1).applyQuaternion(camera.quaternion);
          ms.from.copy(f).addScaledVector(r, th * camera.aspect * rr(-.9, .9)).addScaledVector(u, th * rr(-.1, .92)).normalize().multiplyScalar(250);
          const dx = Math.cos(ang), dy = -Math.abs(Math.sin(ang)) * rr(.25, .8) - .12;
          ms.vel.copy(r).multiplyScalar(dx).addScaledVector(u, dy).normalize().multiplyScalar(rr(70, 110));
          ms.dur = rr(.9, 1.6); ms.len = rr(18, 34); ms.t = 0; ms.m.visible = true;
        }
      }
      meteor.pool.forEach((ms) => {
        if (ms.t < 0) return;
        ms.t += dt;
        if (ms.t >= ms.dur) { ms.t = -1; ms.m.visible = false; return; }
        const x = v1.copy(ms.vel).normalize(), head = v2.copy(ms.from).addScaledVector(ms.vel, ms.t), z = v3.copy(head).negate().normalize();
        z.addScaledVector(x, -z.dot(x)).normalize(); const y = new THREE.Vector3().crossVectors(z, x);
        ms.m.matrix.makeBasis(x.multiplyScalar(ms.len), y.multiplyScalar(1.5), z).setPosition(head.add(camera.position).addScaledVector(ms.vel, -ms.len / 2 / ms.vel.length()));
        ms.m.matrixWorldNeedsUpdate = true;
        ms.m.material.uniforms.k.value = Math.pow(Math.sin(Math.PI * ms.t / ms.dur), .7) * .9;
      });
    } else meteor.pool.forEach((ms) => { if (ms.m.visible) { ms.m.visible = false; ms.t = -1; } });
    const fo = Math.max(0, 1 - blend * 2.5);
    front.visible = fo > 0; frontMats.forEach((m) => { m.opacity = fo; });

    // Evi: by his head at rest; over his shoulder, a little behind, when he walks
    const side = v1.crossVectors(player.n, player.fwd).normalize();   // his left
    v3.copy(player.n).multiplyScalar(R + player.dip + mix(.98, 1.6, st) + player.h + .05 * Math.sin(t * 2.1) * amp)
      .addScaledVector(side, mix(.44, .48, st) + .04 * Math.sin(t * 1.3) * amp)
      .addScaledVector(player.fwd, mix(-.02, -.3, st));
    if (inside.on) v3.copy(inside.base).add(inside.pos).add(v2.set(.5, 1.55 - inside.drop + .05 * Math.sin(t * 2.1), .25));
    Q.eviAt(v3);
    {
      const r = canvas.getBoundingClientRect();
      const cur = false;                                   // pass 70: Evi is no longer the cursor (the code stays, off)
      if (cur !== ptr.on) { ptr.on = cur; hero.classList.toggle('is-evi-cursor', cur); eviOnTop(cur); }
      if (cur) {                                           // ten metres down the ray under the pointer
        v2.set((ptr.x - r.left) / r.width * 2 - 1, 1 - (ptr.y - r.top) / r.height * 2, .5).unproject(camera).sub(camera.position).normalize();
        v3.copy(camera.position).addScaledVector(v2, 6.5).addScaledVector(camera.up, .02 * Math.sin(t * 2.1) * amp);
      }
    }
    if (!evi.userData.set) { eviPos.copy(v3); evi.userData.set = true; }
    eviPos.lerp(v3, 1 - Math.pow(ptr.on ? 1e-12 : walking ? .02 : .004, dt));
    evi.position.copy(eviPos);
    evi.scale.setScalar(1 + .35 * (ptr.on ? 1 : 0));
    evi.quaternion.copy(camera.quaternion);
    const flap = Math.sin(t * 26) * .5 + .5;
    wings.forEach((w) => { w.rotation.y = w.userData.side * (.2 + .85 * flap * (calm ? .3 : 1)); });
    eviGlow.material.uniforms.k.value = 1 + .18 * Math.sin(t * 3.3);
    billboards.forEach((m) => { m.getWorldPosition(v2); m.quaternion.copy(camera.quaternion); if (m.parent && m.parent !== scene) { m.parent.getWorldQuaternion(q1); m.quaternion.premultiply(q1.invert()); } });

    // what opens, opens; the telephone rings
    if (DOOR.k !== DOOR.was) { DOOR.was = DOOR.k; DOOR.set(DOOR.k); }
    if (!zoomSeq && HATCH.want !== undefined) {
      if (HATCH.want && !HATCH.going && walking && !inside.on && player.n.angleTo(HATCH.at) * R > 5) HATCH.want = 0;      // left open behind him: it shuts
      HATCH.k = clamp(HATCH.k + (HATCH.want ? dt / .85 : -dt / .6), 0, 1);
    }
    if (HATCH.k !== HATCH.was) { HATCH.was = HATCH.k; HATCH.set(HATCH.k * HATCH.k * (3 - 2 * HATCH.k)); }
    if (ring.on) {
      ring.t += dt; const c = ring.t % 2.6, live = c < .42 || (c > .55 && c < .97);
      phone.rotation.z = live ? Math.sin(t * 62) * .022 : 0; phone.position.y = live ? Math.abs(Math.sin(t * 62)) * .006 : 0;
      if (Q.calling) { Q.calling = false; ringStop(); }      // (pass 91: never rings)      // the quests are done: it rings until it is answered
      else if (ring.t > 13) { ringStop(); call.next = performance.now() + 17000; }      // pass 96: it rings wherever he is; a rest, then again
    }
    if (call.on && !ring.on && mode === 'walk' && !inside.on && performance.now() >= call.next) ringStart();
    // the places: which one he is at; what the screen says about it
    if (walking) {
      let np = null, nd = 1e9;
      for (let i = 0; i < PLACES.length; i++) { const p = PLACES[i], d = placeDist(p, player.n); if (d < p.near && d < nd) { nd = d; np = p; } }
      if (!np) np = Q.near();                              // the bulb, the car
      if (np && np.id === 'studio' && HATCH.want) np = null;      // the hatch is open: nothing more to press, the stairs are there
      if (!np && !travel && player.n.y > Math.cos(2.9 / R)) np = FIRE_P;      // by the fire
      if (!np && player.n.dot(FIELD.c) > .9) {             // out on the far field
        if (player.n.angleTo(RACE.gates[0].dir) * R < 1.8 && !RACE.on) np = RACE_P;
        else if (player.n.angleTo(FIELD.c) * R < 3.6 && player.h < .5) np = TOWER_P;
      }
      if (np === CONTACT && !call.on) np = null;            // pass 96: no button by the phone until it has rung
      if (sitting) np = SIT; else if (mirror.state === 2 || player.stand < 1 || inside.on || zoomSeq || jump || Q.busy) np = null;
      if (np !== nearP && !inside.on) {
        nearP = np;
        if (placeEl) {
          if (np) { cta(np.name, np === CONTACT ? 'Pick up' : np.verb, np.key); placeEl.hidden = false; requestAnimationFrame(() => placeEl.classList.add('is-on')); }
          else { placeEl.classList.remove('is-on'); setTimeout(() => { if (!nearP) placeEl.hidden = true; }, 350); }
        }
      }
      if (frameNo % 4 === 0) drawMap();
      const stepN = Math.floor(player.phase / Math.PI);
      if (stepN !== lastStep) { lastStep = stepN; if (player.speed > .5 && player.h <= 0 && player.stand >= 1) footstep(lakeAt(player.n) > -.35); }
    }
    for (let i = 0; i < PLACES.length; i++) { const g = PLACES[i].glow; g.material.uniforms.k.value = ((PLACES[i] === nearP ? 1.5 : .8) + .25 * Math.sin(t * 2 + i)) * blend; }      // the little lights are for the walk: the picture at rest has none
    if (sayEl && !sayEl.hidden && sayUntil && t > sayUntil) sayDone();
    // the gems turn; he gathers them (pass 75: this whole part had been lost, which is why nothing could be picked up)
    for (let i = 0; i < gems.length; i++) {
      const gm = gems[i];
      if (gm.got >= 1 || (!gm.shown && !gm.showAt)) continue;
      if (gm.shown < 1) { if (t < gm.showAt) continue; gm.g.visible = true; gm.shown = Math.min(1, gm.shown + dt * 3); const e = gm.shown, b = 1 + 2.70158 * Math.pow(e - 1, 3) + 1.70158 * Math.pow(e - 1, 2); gm.g.scale.setScalar(Math.max(.01, b)); }
      gm.t += dt; gm.m.rotation.y = gm.t * 1.6; gm.m.position.y = .07 * Math.sin(gm.t * 2);
      if (gm.got > 0) { gm.got = Math.min(1, gm.got + dt * 3.4); gm.g.scale.setScalar(1 + gm.got * .9); gm.m.position.y += gm.got * .5; gm.gl.material.uniforms.k.value = 1 - gm.got; if (gm.got >= 1) gm.g.visible = false; continue; }
      if (walking && !inside.on && gm.shown >= 1 && player.n.dot(gm.dir) > .985) {
        v1.copy(player.n).multiplyScalar(R + player.dip + player.h + .85);
        if (v1.distanceTo(v2.copy(gm.dir).multiplyScalar(gm.r)) < .85) {
          gm.got = .001; gemN++; gemChime(false); showGems();
          if (gemN === gems.length) say('Every single gem! Recyco would be proud of you.', false);
        }
      }
    }
    if (TOWER.beacon) TOWER.beacon.material.uniforms.k.value = 1 + .3 * Math.sin(t * 2.2);
    // the ring race: through the first ring starts the clock; all eight, in order, before it runs out
    if (walking && !inside.on && !Q.busy && player.n.dot(FIELD.c) > .8) {
      const g = RACE.gates[RACE.next];
      if (player.n.angleTo(g.dir) * R < .95 && player.h < 1.6) {
        if (!RACE.on) { RACE.on = true; RACE.t = 0; visit('race'); if (raceEl) { raceEl.hidden = false; requestAnimationFrame(() => raceEl.classList.add('is-on')); } }
        g.passed = true; RACE.next++; gemChime(false);
        if (RACE.next >= RACE.gates.length) {
          const tt = RACE.t; RACE.on = false; RACE.next = 0; RACE.best = RACE.best ? Math.min(RACE.best, tt) : tt;
          say('Woo! ' + tt.toFixed(1) + ' seconds! Told you you could run.', false);
          setTimeout(() => { RACE.gates.forEach((q) => { q.passed = false; }); if (raceEl) raceEl.classList.remove('is-on'); }, 2600);
        }
      }
    }
    if (RACE.on) {
      RACE.t += dt;
      if (raceEl) raceEl.querySelector('b').textContent = RACE.next + ' / ' + RACE.gates.length + '  \u00b7  ' + Math.max(0, RACE.limit - RACE.t).toFixed(1) + ' s';
      if (RACE.t > RACE.limit) { RACE.on = false; RACE.next = 0; RACE.gates.forEach((q) => { q.passed = false; }); say('So close! Hold Shift and you run. Try again!', false); if (raceEl) raceEl.classList.remove('is-on'); }
    }
    RACE.gates.forEach((q, i) => { const nx = i === RACE.next; q.mat.color.setRGB(q.passed ? 1.4 : nx ? .5 : .22, q.passed ? 1.05 : nx ? 1.1 : .45, q.passed ? .4 : nx ? 1.8 : .9); q.ring.scale.setScalar(nx ? 1 + .05 * Math.sin(t * 6) : 1); });
    // Evi, now and then: the quest that waits, a place not yet seen, a word about him
    if (walking && chatAt && time > chatAt) {
      chatAt = time + 50 + rnd() * 30;
      if (!mirror.state && !inside.on && !zoomSeq && !jump && !leavingTo && !Q.busy && sayEl && sayEl.hidden) say(remark(), false);
    }
    Q.step(dt, t);

    // the lights follow what is looked at, so the shadows stay fine
    focus.lerp(v2.copy(player.n).multiplyScalar(R + player.dip), 1 - Math.pow(.01, dt));
    key.target.position.copy(focus); key.position.copy(focus).addScaledVector(keyDir, 34);
    rim.target.position.copy(focus); rim.position.copy(focus).addScaledVector(rimDir, 30);
    moon.target.position.copy(focus); moon.position.copy(focus).addScaledVector(keyDir, -30).addScaledVector(UP, 14);
    zen.target.position.copy(focus); zen.position.copy(focus).addScaledVector(player.n, 30).addScaledVector(cam.f, -9);
    zen.intensity = (inside.on ? 0 : 1) * 2.1 * sst(.5, -.3, player.n.dot(keyDir));
    // the fire's shadows barely move while he sits: they are redrawn now and then, and not at all once he has walked away
    { const out = inside.on ? 0 : 1; key.intensity = LIT.key * out; moon.intensity = LIT.moon * out; rim.intensity = LIT.rim * out; hemi.intensity = LIT.hemi * (out ? 1 : .4); }     // indoors only the lamps light the room
    key.shadow.autoUpdate = false; key.shadow.needsUpdate = frameNo < 4 || frameNo % (walking ? 2 : 3) === 0;      // the planet does not move: the sun's shadows are redrawn every other frame
    const nearFire = player.n.y > .55;
    fireLight.shadow.autoUpdate = false;
    fireLight.shadow.needsUpdate = frameNo < 4 || (nearFire && frameNo % (walking ? 2 : 4) === 0) || (!nearFire && wasNear);
    wasNear = nearFire;
    // grass below the horizon is not drawn
    const cd0 = camera.position.length(), lim0 = Math.acos(Math.min(1, 7.6 / cd0)) + .1;
    v2.copy(camera.position).divideScalar(cd0);
    grassChunks.forEach((ch) => { ch.mesh.visible = ch.c.angleTo(v2) < lim0 + ch.a; });

    starMat.uniforms.px.value = bufH / 820;
    const sc = bufH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / 600;
    softMats.forEach((m) => { m.uniforms.px.value = sc; });

    // the water's picture of the world: drawn only when he is near it
    const rd = -lakeAt(player.n), nearRiver = blend > 0 && (mkb > 0 || rd < 2.6);
    waterMat.uniforms.refl.value += ((nearRiver ? 1 : 0) - waterMat.uniforms.refl.value) * (1 - Math.pow(.02, dt));
    waterMat.uniforms.look.value = mk;
    if (nearRiver) {
      const pn = v3.copy(mk > 0 ? mirror.c : lakeAt.lake.c), pp = v2.copy(pn).multiplyScalar(ground(pn) + .03);     // the mirror: the water's own plane, where he looks into it
      if (v1.copy(pp).sub(camera.position).dot(pn) < 0) {
        const view = v1.copy(pp).sub(camera.position).reflect(pn).negate().add(pp);
        reflCam.position.copy(view);
        const lookAt = V(0, 0, -1).applyQuaternion(camera.quaternion).add(camera.position), tgt = pp.clone().sub(lookAt).reflect(pn).negate().add(pp);
        reflCam.up.set(0, 1, 0).applyQuaternion(camera.quaternion).reflect(pn);
        reflCam.lookAt(tgt); reflCam.updateMatrixWorld(true);
        reflCam.projectionMatrix.copy(camera.projectionMatrix);
        texMat.set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1).multiply(reflCam.projectionMatrix).multiply(reflCam.matrixWorldInverse);
        // nothing under the water is in the mirror: the near plane is laid on it (Lengyel's oblique frustum)
        const pl = new THREE.Plane().setFromNormalAndCoplanarPoint(pn, pp).applyMatrix4(reflCam.matrixWorldInverse);
        const cp = new THREE.Vector4(pl.normal.x, pl.normal.y, pl.normal.z, pl.constant), pm = reflCam.projectionMatrix.elements, qv = new THREE.Vector4();
        qv.x = (Math.sign(cp.x) + pm[8]) / pm[0]; qv.y = (Math.sign(cp.y) + pm[9]) / pm[5]; qv.z = -1; qv.w = (1 + pm[10]) / pm[14];
        cp.multiplyScalar(2 / cp.dot(qv)); pm[2] = cp.x; pm[6] = cp.y; pm[10] = cp.z + 1 - .003; pm[14] = cp.w;
        water.visible = false; const fv = front.visible; front.visible = false; me.visible = true;
        sky.position.copy(reflCam.position); stars.position.copy(reflCam.position);
        renderer.shadowMap.autoUpdate = false;
        renderer.setRenderTarget(rtRefl); renderer.clear(); renderer.render(scene, reflCam);
        renderer.shadowMap.autoUpdate = true;
        water.visible = true; front.visible = fv; sky.position.copy(camera.position); stars.position.copy(camera.position);
      }
    }
    guitar.visible = !Q.hideMe;
    me.visible = mk < .55 && !Q.hideMe;                      // when the camera is his eyes, only the water shows him (or the phone in his hand)
    if (mk <= 0) mirrorLight.intensity = 0;
    renderer.setRenderTarget(rtScene); renderer.clear();
    renderer.render(scene, camera);
    develop();
    Q.after();                                               // (a photograph taken with his phone is this very picture)
    eviFace(t);
    perf.ms += (performance.now() - t0 - perf.ms) * .05; perf.n++;
    if (!ready) { ready = true; hero.classList.add('has-world'); if (wantPlay) { wantPlay = false; setTimeout(() => { if (mode === 'rest') { window.scrollTo({ top: 0, behavior: 'instant' }); enter(); } }, 60); } }
    loop();
  }
  function loop() { if (!raf && (visible || mode === 'walk') && !document.hidden) raf = requestAnimationFrame(frame); }
  function wake() { clock.getDelta(); loop(); }
  if ('IntersectionObserver' in window) new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) wake(); }, { rootMargin: '120px' }).observe(hero);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });

  /* pass 75 — the title screen. Scrolled, the picture stays where it is (fixed to the window) and the eye goes
     down into the lawn before the house, to black, where the lab begins; the music sinks away with it. */
  const dive = { state: 0, top: 1, set: false, ndc: [.04, -.46], dir: V(0, 0, -1), pt: V(0, 0, 0), len: 30, q: new THREE.Quaternion() };
  const labEl = document.querySelector('#work');
  function setDive(st) {                                   // 0: the hero's own picture · 1: fixed to the window, going down · 2: gone (the lab covers it)
    if (st === dive.state) return;
    const was = dive.state; dive.state = st;
    if (st && !was) {
      const r = canvas.getBoundingClientRect(), top0 = r.top + window.scrollY, bs = document.body.style;
      bs.setProperty('--dive-x', r.left.toFixed(1) + 'px'); bs.setProperty('--dive-y', top0.toFixed(1) + 'px');
      bs.setProperty('--dive-m0', (r.height * .74).toFixed(1) + 'px'); bs.setProperty('--dive-m1', r.height.toFixed(1) + 'px');
      fix = { a0: r.width / r.height, k: (window.innerHeight - top0) / r.height, e: 0 }; dive.set = false;
      document.body.classList.add('is-diving');
    }
    if (!st && was) { document.body.classList.remove('is-diving'); fix = null; film.uniforms.dim.value = 1; }
    canvas.style.visibility = st === 2 ? 'hidden' : '';
    cssW = 0; resize();
  }
  let scrollTick = false;
  function onScroll() {
    scrollTick = false;
    if (mode !== 'rest' || !ready) return;
    dive.top = labEl ? labEl.getBoundingClientRect().top + window.scrollY : window.innerHeight;
    const dv = window.scrollY / Math.max(1, dive.top);
    setDive(dv <= .002 ? 0 : dv < 1 ? 1 : 2);
    if (music.want !== menuVol()) musicTo(menuVol(), .5);
    if (dv > .3) menuHush();
    if (dv < 1) wake();
  }
  window.addEventListener('scroll', () => { if (!scrollTick) { scrollTick = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', () => { if (dive.state) { setDive(0); onScroll(); } });

  /* (pass 77: Evi no longer quotes anyone on the title screen) */
  function menuHush() {}
  function menuTalk() {}

  resize();
  if (lite || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4) { gov.level = gov.base = 1; ease(); }     // a modest machine starts a step down
  pose(0, {}); placeMe(); holdGuitar(0);
  loop();
  musicTo(menuVol(), 3); onScroll(); menuTalk(document.querySelector('[data-intro]') ? 5200 : 2200);
  if (location.hash === '#playground') {
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}      // pass 77: the mark is taken off the address, so a reload opens the title screen and not the walk
    setTimeout(() => { if (mode === 'rest') { window.scrollTo(0, 0); enter(); } }, document.querySelector('[data-intro]') ? 3400 : 700);
  }      // "Playground" on the other pages comes straight here

  window.__world = { toMenu: () => { if (mode === 'walk') leaveWalk(); },      // pass 96: the logo in the bar brings him back to the title screen
    setSound, get muted() { return MUTE; }, home, homeAct, homeLoad, openHatch, meteor, sitByFire, enterPlace, keys, ROOM, Q, STATIONQ, station, buildStation, GQ, CHORDS, DOORQ, HATCHQ, CHAIRQ, buildDoor, buildHatch, buildChair, gems, say, sayDone, dive, setDive, menuTalk, indoors, outside, reachArm, inside, goInside, takeLift, elev, acts, mixer, TUNE, PLACES, travelTo, enterPlace, music, DOOR, HATCH, phone, phoneSeat, ring, sitToPlay, standUp, SONGS, get sitting() { return sitting; }, get jump() { return jump; }, land, LAKES, lakeAt, route, go, planetParts, landU, waterMat, FIRE, at, mirror, toRiver, exitMirror, water, ground, POSE, guitar, bones, info, dbg, perf, gov, ease, me, bones, THREE, scene, camera, restCam, renderer, film, lights: { key, rim, hemi, fireLight, fireFill }, mats: M, player, cam, POSE, REST, enter, leave: leaveWalk, obstacles,
    get mode() { return mode; }, resize: () => { cssW = 0; resize(); },
    /* run frames by hand (a hidden tab gets no animation frames): n frames of dt seconds */
    step: (n = 1, dt = 1 / 60) => { dbg.dt = dt; for (let i = 0; i < n; i++) frame(); dbg.dt = 0; clock.getDelta(); } };
}
