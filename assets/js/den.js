/* ============================================================
   ULJO — My Universe: a journal that is opened and leafed through, a television with channels (pass 78)

     · the journal — an old leather one (made in Meshy), adrift, turning slowly with nothing to hold it. Over it
       the pointer becomes a small box, "Open journal"; under it stands a button that says the same. Asked to
       open, it comes to the middle and stands up, its cover to the eye; there a paper book — plain HTML and
       CSS, its cover a picture of the leather one taken at that moment — takes its place exactly, comes
       forward, and its cover swings open. Its pages are then turned one by one (a click on a page, the two
       round buttons, the arrow keys, a swipe); on a phone one page is shown at a time. His photographs are
       taped in, his own words are in handwriting: first himself, then with every page another side of his life.
     · the television — the old set alone (its desk is cut away), drifting; a film plays inside its screen,
       bent onto the glass corner for corner (about.js makes the players and changes the channels). Its knobs
       are a button: the next channel.

   Nothing here plays a sound of its own. Where WebGL is missing the page still works: the journal's
   button opens the paper book, and the films are ordinary players.
   ============================================================ */
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { DRACOLoader } from '../vendor/DRACOLoader.js';

const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), sst = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const draco = new DRACOLoader().setDecoderPath(new URL('../vendor/draco/', import.meta.url).href);
const load = (f) => new GLTFLoader().setDRACOLoader(draco).loadAsync(new URL('../models/' + f, import.meta.url).href);

/* a small stage: one canvas, one eye, soft light; it draws only while it is on screen */
function stage(canvas, fov) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12; renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(fov, 1, .05, 100);
  {                                                        // what things reflect: a few soft panels in the dark
    const es = new THREE.Scene(), box = (w, h, c, k, px, py, pz) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(px, py, pz); m.lookAt(0, 0, 0); es.add(m); };
    es.add(new THREE.Mesh(new THREE.SphereGeometry(30, 16, 12), new THREE.MeshBasicMaterial({ color: 0x090a12, side: THREE.BackSide })));
    box(14, 7, 0xfff1dc, 5, 0, 11, 4); box(7, 9, 0x9fb8ff, 3, -12, 4, 3); box(7, 9, 0xff9fd0, 2.4, 12, 4, -2);
    const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(es, .04).texture; pm.dispose();
  }
  scene.add(new THREE.HemisphereLight(0xdfe4ff, 0x2a2233, .65));
  const key = new THREE.DirectionalLight(0xffe2c0, 2.2); key.position.set(-3, 6, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fb0ff, 1.3); rim.position.set(4, 3, -5); scene.add(rim);
  const st = { renderer, scene, camera, canvas, W: 0, H: 0, visible: false, raf: 0, last: 0, t: 0, tick: null, live: () => false };
  st.size = () => {
    const r = canvas.getBoundingClientRect(); if (!r.width || !r.height) return false;
    if (Math.abs(r.width - st.W) > .5 || Math.abs(r.height - st.H) > .5) { st.W = r.width; st.H = r.height; renderer.setSize(st.W, st.H, false); camera.aspect = st.W / st.H; if (st.onSize) st.onSize(); camera.updateProjectionMatrix(); }
    return true;
  };
  const frame = (now) => {
    st.raf = 0; if (!st.visible || document.hidden || !st.size()) return;
    const dt = Math.min(.05, (now - st.last) / 1000 || 0); st.last = now; st.t += dt;
    if (st.tick) st.tick(dt, st.t);
    renderer.render(scene, camera);
    if (st.live()) st.loop();
  };
  st.loop = () => { if (!st.raf) st.raf = requestAnimationFrame(frame); };
  st.draw = () => { st.last = performance.now(); st.loop(); };
  st.step = (dt) => { if (!st.size()) return; st.t += dt; if (st.tick) st.tick(dt, st.t); renderer.render(scene, camera); };      // one frame by hand, for checking
  new IntersectionObserver((es) => { st.visible = es[0].isIntersecting; if (st.visible) st.draw(); }, { rootMargin: '200px' }).observe(canvas);
  window.addEventListener('resize', st.draw);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) st.draw(); });
  return st;
}
const soften = (root, rough, glow) => root.traverse((m) => { if (m.isMesh) { const mt = m.material; mt.metalness = 0; mt.roughness = rough; mt.envMapIntensity = .9; if (glow) { mt.emissiveMap = mt.map; mt.emissive = new THREE.Color(glow, glow, glow); } if (mt.map) mt.map.anisotropy = 8; } });
const dbg = window.__den = {};

/* over a thing that can be opened the pointer becomes a small box of words (as "Try it" does on the home page) */
function pointerBox(words) {
  const tip = document.createElement('div'); tip.className = 'try-tip try-tip--words'; tip.setAttribute('aria-hidden', 'true'); tip.innerHTML = '<b></b>'; tip.firstChild.textContent = words;
  document.body.appendChild(tip);
  const at = (e) => { tip.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)'; };
  const off = () => tip.classList.remove('is-on', 'is-down');
  window.addEventListener('scroll', off, { passive: true });
  return (el) => {
    el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'touch') return; at(e); tip.classList.add('is-on'); });
    el.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') at(e); });
    el.addEventListener('pointerleave', off);
    el.addEventListener('pointerdown', () => tip.classList.add('is-down'));
    el.addEventListener('pointerup', () => tip.classList.remove('is-down'));
    el.addEventListener('click', off);
  };
}

/* ============================================================
   the journal
   ============================================================ */
(function journal() {
  const sec = document.querySelector('[data-journal]'), canvas = sec && sec.querySelector('[data-journal-canvas]');
  const hit = sec && sec.querySelector('.journal__open'), dlg = document.querySelector('[data-jbook]');
  if (!sec || !dlg) return;
  const openers = [...document.querySelectorAll('[data-journal-open]')];
  const book = dlg.querySelector('[data-jbook-book]'), fly = dlg.querySelector('[data-jbook-fly]'), coverFace = dlg.querySelector('[data-jbook-cover]');
  const leaves = [...dlg.querySelectorAll('[data-leaf]')], cover = leaves[0], pages = leaves.slice(1), LAST = pages.length - 1;      // (the last leaf is never turned: its front is the last page)
  const prevB = dlg.querySelector('[data-jbook-prev]'), nextB = dlg.querySelector('[data-jbook-next]'), closeB = dlg.querySelector('.jbook__close');
  const narrow = matchMedia('(max-width: 46em)');
  leaves.forEach((l, i) => l.style.setProperty('--z', leaves.length - i));      // closed, the first leaf lies on top; turned, the last one turned does (the same number, seen from the other side)
  let open = false, busy = false, turned = 0, side = 'r', lastFocus = null;

  /* ---- the paper book: its pages ---- */
  const mark = (leaf) => { if (leaf !== cover && window.__uljoSfx) window.__uljoSfx('page', { rate: .94 + Math.random() * .14, vol: .42 }); leaf.classList.add('is-turning'); leaf.style.zIndex = '5'; setTimeout(() => { leaf.classList.remove('is-turning'); leaf.style.zIndex = ''; }, calm ? 0 : 1080); };
  const paint = () => {
    pages.forEach((l, i) => l.classList.toggle('is-flipped', i < turned));
    book.classList.toggle('is-left', side === 'l'); book.classList.toggle('is-right', side === 'r');
    const one = narrow.matches;
    prevB.hidden = turned === 0 && (!one || side === 'r'); nextB.hidden = turned === LAST && (!one || side === 'r');
  };
  const turn = (d) => {
    if (!open || busy) return;
    if (narrow.matches) {                                  // one page at a time: to the left-hand page, then the page is turned
      if (d > 0) { if (side === 'l') side = 'r'; else if (turned < LAST) { turned++; side = 'l'; mark(pages[turned - 1]); } else return; }
      else { if (side === 'r' && turned > 0) side = 'l'; else if (side === 'l') { turned--; side = 'r'; mark(pages[turned]); } else return; }
    } else {
      if (d > 0) { if (turned >= LAST) return; turned++; mark(pages[turned - 1]); }
      else { if (turned <= 0) return; turned--; mark(pages[turned]); }
    }
    paint();
  };
  let pics = false;
  const loadPics = () => { if (pics) return; pics = true; dlg.querySelectorAll('img[data-src]').forEach((im) => { im.src = im.dataset.src; im.removeAttribute('data-src'); }); };
  nextB.addEventListener('click', (e) => { e.stopPropagation(); turn(1); });
  prevB.addEventListener('click', (e) => { e.stopPropagation(); turn(-1); });
  let sx = null, swiped = false;
  book.addEventListener('pointerdown', (e) => { sx = e.clientX; swiped = false; });
  book.addEventListener('pointerup', (e) => { if (sx === null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 42) { swiped = true; turn(dx < 0 ? 1 : -1); } });
  book.addEventListener('click', (e) => {                  // the right-hand page turns it on; the left-hand one turns it back
    if (swiped) { swiped = false; return; }
    const r = book.getBoundingClientRect(), right = narrow.matches ? e.clientX > window.innerWidth * .38 : e.clientX > r.left + r.width / 2;
    turn(right ? 1 : -1);
  });
  window.addEventListener('keydown', (e) => {
    if (dlg.hidden) return;
    if (e.key === 'Escape') shut(); else if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); turn(1); } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); turn(-1); }
  });
  dlg.querySelectorAll('[data-jbook-close]').forEach((b) => b.addEventListener('click', () => shut()));
  narrow.addEventListener && narrow.addEventListener('change', () => { if (!narrow.matches) side = 'r'; paint(); });

  /* ---- the leather one, adrift ---- */
  if (hit) pointerBox('Open journal')(hit);                // over it the pointer says what a click does
  const st = canvas && stage(canvas, 30);
  const g = new THREE.Group(), tilt = new THREE.Group();
  let ready = false, pending = false, k = 0, box = null, model = null;
  /* where its cover is on the screen (the four corners of its top, as the eye sees them) */
  const corner = V(0, 0, 0);
  const coverRect = () => {
    if (!ready || !st.W) return null;
    const cr = canvas.getBoundingClientRect(); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    model.updateWorldMatrix(true, false);
    [[box.min.x, box.min.z], [box.max.x, box.min.z], [box.max.x, box.max.z], [box.min.x, box.max.z]].forEach(([x, z]) => {
      corner.set(x, box.max.y, z).applyMatrix4(model.matrixWorld).project(st.camera);
      const px = cr.left + (corner.x * .5 + .5) * cr.width, py = cr.top + (-corner.y * .5 + .5) * cr.height;
      x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py);
    });
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
  };
  /* the paper book takes the leather one's place, exactly where it stands, comes to the middle and opens */
  const flyTo = (r) => {
    const b = book.getBoundingClientRect(), ch = b.height, ccx = b.left + b.width * .75, ccy = b.top + b.height / 2;      // (closed, the book's box is slid a quarter to the left: its cover, the right half, is then in the middle of the screen)
    fly.style.transform = r ? 'translate(' + (r.cx - ccx).toFixed(1) + 'px,' + (r.cy - ccy).toFixed(1) + 'px) scale(' + (r.h / ch).toFixed(4) + ')' : 'scale(.86)';
  };
  const show = () => {
    busy = true; lastFocus = document.activeElement;
    dlg.hidden = false; document.documentElement.classList.add('has-jbook'); loadPics();
    turned = 0; side = 'r'; cover.classList.remove('is-flipped'); book.classList.add('is-closed', 'is-shut'); paint();
    fly.classList.add('is-held'); fly.style.transform = ''; flyTo(coverRect());
    if (canvas) canvas.style.visibility = 'hidden';        // the paper one is what is seen from here on
    void fly.offsetWidth;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      dlg.classList.add('is-on'); fly.classList.remove('is-held'); fly.style.transform = '';
      setTimeout(() => { if (window.__uljoSfx) window.__uljoSfx('page', { rate: .88, vol: .55 }); cover.classList.add('is-flipped'); mark(cover); book.classList.remove('is-closed', 'is-shut'); dlg.classList.add('is-open'); open = true; busy = false; paint(); if (closeB) closeB.focus({ preventScroll: true }); }, calm ? 0 : 300);
    }));
  };
  const shut = () => {
    if (!open || busy) return; busy = true; open = false; dlg.classList.remove('is-open');
    const had = turned > 0 || side === 'l'; turned = 0; side = 'r'; paint();      // its pages fall back, its cover closes, and it goes back to where the leather one drifts
    setTimeout(() => {
      if (window.__uljoSfx) window.__uljoSfx('page', { rate: .74, vol: .45 }); cover.classList.remove('is-flipped'); mark(cover); book.classList.add('is-closed');
      setTimeout(() => {
        book.classList.add('is-shut'); dlg.classList.remove('is-on'); flyTo(coverRect());
        setTimeout(() => {
          dlg.hidden = true; document.documentElement.classList.remove('has-jbook'); fly.classList.add('is-held'); fly.style.transform = ''; void fly.offsetWidth; fly.classList.remove('is-held');
          if (canvas) canvas.style.visibility = ''; pending = false; busy = false; if (st) st.draw();
          if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
        }, calm ? 0 : 700);
      }, calm ? 0 : 820);
    }, calm || !had ? 0 : 520);
  };
  const ask = () => { if (busy || open || pending) return; if (!ready || calm) { show(); return; } pending = true; busy = true; st.draw(); };
  openers.forEach((b) => b.addEventListener('click', ask));
  if (!st) { if (hit) hit.classList.add('is-plain'); return; }
  st.camera.position.set(0, 0, 7.6); st.scene.add(g); g.add(tilt);
  load('journal.glb?v=1').then((gl) => {
    model = gl.scene; soften(model, .78, .12); model.scale.setScalar(2.1); tilt.add(model);      // it lies flat in its file, its cover up
    model.updateWorldMatrix(true, true);
    box = new THREE.Box3(); { const inv = new THREE.Matrix4().copy(model.matrixWorld).invert(), mm = new THREE.Matrix4(); model.traverse((o) => { if (o.isMesh) { o.geometry.computeBoundingBox(); box.union(o.geometry.boundingBox.clone().applyMatrix4(mm.multiplyMatrices(inv, o.matrixWorld))); } }); }      // in the model's own measures
    model.position.set(-(box.min.x + box.max.x) / 2 * 2.1, -(box.min.y + box.max.y) / 2 * 2.1, -(box.min.z + box.max.z) / 2 * 2.1);      // it turns about its own middle
    /* its cover, as a picture, for the paper book: seen flat from above, exactly its outline */
    try {
      /* (in its file its spine runs along x, at -z: stood up, its spine is at the left and its x points up) */
      const bw = (box.max.z - box.min.z) * 2.1, bh = (box.max.x - box.min.x) * 2.1, oc = new THREE.OrthographicCamera(-bw / 2, bw / 2, bh / 2, -bh / 2, .1, 40);
      oc.position.set(0, 12, 0); oc.up.set(1, 0, 0); oc.lookAt(0, 0, 0);
      const H = 900, Wd = Math.round(H * bw / bh);
      st.renderer.setPixelRatio(1); st.renderer.setSize(Wd, H, false); st.renderer.render(st.scene, oc);
      const url = canvas.toDataURL('image/webp', .9);
      st.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); st.W = 0; st.size();
      if (url && url.length > 2000) { coverFace.style.backgroundImage = 'url("' + url + '")'; coverFace.classList.add('has-art'); }
      dlg.style.setProperty('--ar', (bw / bh).toFixed(4));
      dbg.journalCover = url;
    } catch (e) { console.warn('[den] no cover picture', e); }
    ready = true; sec.classList.add('has-book');
    try { if (st.renderer.compileAsync) st.renderer.compileAsync(st.scene, st.camera).then(() => st.draw()); else st.draw(); } catch (e) { st.draw(); }      // pass 84: its shaders ready before it is scrolled to
  }).catch((e) => { console.warn('[den] no journal', e); if (hit) hit.classList.add('is-plain'); });
  const p = V(0, 0, 0), q = new THREE.Quaternion(), qa = new THREE.Quaternion(), e = new THREE.Euler(), front = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(0, 1, 0), V(0, 0, 1), V(1, 0, 0)));      // upright before the eye: its cover toward it, its spine at the left
  st.live = () => ready && !calm && dlg.hidden || pending;
  st.tick = (dt, t) => {
    if (!ready) return;
    /* what the eye sees at the book's depth, from the middle to the side: the book fits in it and wanders only as far as leaves it whole */
    /* pass 79: half as big again, and on a wide screen it drifts in the right half (its button is in the left one) */
    const halfW = 7.6 * Math.tan(15 * Math.PI / 180) * st.W / st.H, wide = st.W > 760, sc = clamp(halfW / 2.2, .5, 1);      // (half as big again on the screen: its stage is half as tall again, about.css)
    const cx = wide ? halfW * .44 : 0, roam = wide ? clamp(halfW * .5 - 1.6 * sc, 0, 1.1) : clamp(halfW - 1.55 * sc, 0, 2.6);
    /* adrift: no up, no down — a slow wander and a slower tumble */
    p.set(cx + (Math.sin(t * .11) * .82 + Math.sin(t * .047 + 1) * .18) * roam, Math.cos(t * .09) * .35 + Math.sin(t * .05) * .12, Math.sin(t * .07) * .5);
    e.set(.95 + Math.sin(t * .13) * .45, t * .09, Math.sin(t * .1) * .3); qa.setFromEuler(e);
    /* asked to open: it comes to the middle and stands up, its cover to the eye; then the paper one takes over */
    if (pending && dlg.hidden) { k = Math.min(1, k + dt / .5); if (k >= 1) show(); }      // (pass 94: quicker: it was .95 s)
    else if (dlg.hidden) k = Math.max(0, k - dt / .7);
    const s = k * k * (3 - 2 * k);
    g.position.copy(p).lerp(V(cx * .6, .1, 1.1), s); q.copy(qa).slerp(front, s); tilt.quaternion.copy(q);
    g.scale.setScalar(sc * (1 + .05 * s));
    /* the button that opens it follows it (so the pointer and a finger can find it) */
    if (hit) { const v = g.position.clone().project(st.camera); hit.style.transform = 'translate3d(' + ((v.x * .5 + .5) * st.W).toFixed(1) + 'px,' + ((-v.y * .5 + .5) * st.H).toFixed(1) + 'px,0) translate(-50%,-50%)'; }
  };
  if (calm) st.tick(0, 4);
  dbg.journal = { st, g, tilt, front, coverRect, turn, show, shut, get state() { return { open, busy, turned, side, k, pending, ready }; } };
})();

/* ============================================================
   the television, adrift
   ============================================================ */
(function tv() {
  const cv = document.querySelector('[data-den="tv"]'), screen = document.querySelector('[data-den-screen]');
  if (!cv) return;
  const st = stage(cv, 26);
  if (!st) { if (screen) screen.classList.add('is-plain'); return; }
  st.renderer.localClippingEnabled = true;
  st.camera.position.set(0, 0, 3.05);
  /* in the model's own measures: the top of the desk it stood on, and the four corners of its glass */
  const DESK = .441, GLASS = [V(-.236, .758, .085), V(.138, .758, .085), V(.138, .494, .085), V(-.236, .494, .085)], BW = 640, BH = Math.round(640 * (.758 - .494) / (.138 + .236));
  const g = new THREE.Group(); st.scene.add(g);
  const cutLocal = new THREE.Plane(V(0, 1, 0), -DESK - .002), cut = new THREE.Plane();
  const glassLight = new THREE.PointLight(0xbfd4ff, .5, 2.2, 1.6);
  let ready = false, set = null;
  load('tv.glb?v=1').then((gl) => {
    const m = gl.scene; soften(m, .62, .1);
    /* only the set: what was desk is not drawn — and the set is closed underneath */
    const box = new THREE.Box3(), p = V(0, 0, 0);
    m.updateMatrixWorld(true);
    m.traverse((o) => {
      if (!o.isMesh) return;
      o.material.clippingPlanes = [cut]; o.material.side = THREE.DoubleSide;
      const pos = o.geometry.attributes.position;
      for (let i = 0; i < pos.count; i += 3) { p.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); if (p.y > DESK + .02) box.expandByPoint(p); }
    });
    const c = box.getCenter(V(0, 0, 0)), size = box.getSize(V(0, 0, 0));
    set = new THREE.Group(); set.position.copy(c).negate(); set.add(m);      // it turns about its own middle
    const under = new THREE.Mesh(new THREE.BoxGeometry(size.x * .94, .012, size.z * .9), new THREE.MeshStandardMaterial({ color: 0x2a211b, roughness: .7 })); under.position.set(c.x, DESK + .004, c.z); /* pass 79: no plate under it */
    glassLight.position.set(-.05, .63, .5); set.add(glassLight);
    g.add(set);
    g.userData.k = 1.08 / size.x;      // pass 83: smaller, all of it in its stage, the foot too      // pass 79: larger (its stage is as tall as the screen allows; it fills more of it)                            // as large as the stage lets it be with all of it in the picture, aerials and feet (pass 78: its foot was cut by the stage's edge)
    g.scale.setScalar(g.userData.k);
    dbg.tvBox = { c, size };
    ready = true; if (screen) screen.classList.add('is-3d');
    try { if (st.renderer.compileAsync) st.renderer.compileAsync(st.scene, st.camera).then(() => st.draw()); else st.draw(); } catch (e) { st.draw(); }
  }).catch((e) => { console.warn('[den] no television', e); if (screen) screen.classList.add('is-plain'); });

  /* the player's box, bent onto the glass: the four corners of the glass, as the eye sees them, are where its own four corners go */
  const solve = (A, b) => {                                // eight unknowns
    const n = 8;
    for (let i = 0; i < n; i++) {
      let mx = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[mx][i])) mx = r;
      [A[i], A[mx]] = [A[mx], A[i]]; [b[i], b[mx]] = [b[mx], b[i]];
      for (let r = i + 1; r < n; r++) { const f = A[r][i] / A[i][i]; for (let c2 = i; c2 < n; c2++) A[r][c2] -= f * A[i][c2]; b[r] -= f * b[i]; }
    }
    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let c2 = i + 1; c2 < n; c2++) s -= A[i][c2] * x[c2]; x[i] = s / A[i][i]; }
    return x;
  };
  const corner = V(0, 0, 0), SRC = [[0, 0], [BW, 0], [BW, BH], [0, BH]];
  const lay = () => {
    if (!screen || !set || !st.W) return;
    set.updateMatrixWorld(true); st.camera.updateMatrixWorld(true);
    const A = [], b = [];
    for (let i = 0; i < 4; i++) {
      corner.copy(GLASS[i]).applyMatrix4(set.children[0].matrixWorld).project(st.camera);
      const X = (corner.x * .5 + .5) * st.W, Y = (-corner.y * .5 + .5) * st.H, x = SRC[i][0], y = SRC[i][1];
      A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]); b.push(X); A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]); b.push(Y);
    }
    const h = solve(A, b);
    if (h.some((v) => !isFinite(v))) return;
    screen.style.transform = 'matrix3d(' + [h[0], h[3], 0, h[6], h[1], h[4], 0, h[7], 0, 0, 1, 0, h[2], h[5], 0, 1].map((v) => +v.toFixed(7)).join(',') + ')';
    if (!screen.classList.contains('is-set')) screen.classList.add('is-set');
  };
  if (screen) { screen.style.width = BW + 'px'; screen.style.height = BH + 'px'; }
  const on = () => !!(screen && screen.classList.contains('is-playing'));      // a film is running in it (about.js says so)
  const knobs = document.querySelector('.tvfly__knobs'), KNOB = [V(.158, .77, .085), V(.305, .47, .085)], kc = V(0, 0, 0);      // the panel of knobs at the right of the glass, in the model's own measures
  let hold = 0;
  st.live = () => ready && !calm;
  st.tick = (dt, t) => {
    if (!ready) return;
    hold += ((on() ? 1 : 0) - hold) * (1 - Math.pow(.2, dt));        // while the film runs it keeps almost still, so it can be watched
    const a = (calm ? 0 : 1 - .72 * hold) * 1.45, wide = Math.min(1, st.W / st.H / 1.5);      // pass 79: it floats about a little more
    g.position.set((Math.sin(t * .13) * .2 + Math.sin(t * .05 + 2) * .07) * a * wide, -.02 + (Math.cos(t * .11) * .045 + Math.sin(t * .061) * .02) * a / 1.45, 0);      // (up and down it stays within its stage)
    g.rotation.set((.045 + Math.sin(t * .17 + 1) * .075) * a + .03, (Math.sin(t * .12) * .26 + Math.sin(t * .29) * .05) * a, Math.sin(t * .09 + .5) * .05 * a);
    g.scale.setScalar(g.userData.k * Math.min(1, .62 + .38 * wide + (st.W / st.H < .9 ? -.1 : 0)));
    g.updateMatrixWorld(true);
    cut.copy(cutLocal).applyMatrix4(set.children[0].matrixWorld);     // the cut travels with it
    glassLight.intensity = on() ? 2.4 : .5;
    lay();
    if (knobs && st.W) {                                   // the button over its knobs follows them
      kc.copy(KNOB[0]).applyMatrix4(set.children[0].matrixWorld).project(st.camera); const x0 = (kc.x * .5 + .5) * st.W, y0 = (-kc.y * .5 + .5) * st.H;
      kc.copy(KNOB[1]).applyMatrix4(set.children[0].matrixWorld).project(st.camera); const x1 = (kc.x * .5 + .5) * st.W, y1 = (-kc.y * .5 + .5) * st.H;
      knobs.style.transform = 'translate3d(' + Math.min(x0, x1).toFixed(1) + 'px,' + Math.min(y0, y1).toFixed(1) + 'px,0)'; knobs.style.width = Math.abs(x1 - x0).toFixed(1) + 'px'; knobs.style.height = Math.abs(y1 - y0).toFixed(1) + 'px';
    }
  };
  if (screen) new MutationObserver(() => st.draw()).observe(screen, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] });
  if (calm) setTimeout(() => st.draw(), 0);
  dbg.tv = st; dbg.tvGroup = g;
})();
