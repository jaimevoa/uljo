/* ============================================================
   ULJO — the Manic GT comes as a car (pass 75; the way in redone in pass 78)
   On the home page the fourth project used to arrive like the others: a screen turning out of the dark.
   Now the car itself comes — Jaime's Manic GT, made in Meshy from his photograph (assets/models/manic-gt.glb)
   — and inside it its cockpit (assets/models/gt-cockpit.glb, a 1970 two-seater made in Meshy for this), set
   in the body where a cockpit is.

   Pass 78 (his words: "have the left window already fully opened, and the camera goes inside the opened
   window… I don't want the car to spin, make it stable then when scrolling it's travelling to inside the car"):
     · the car stands still, three-quarters, its driver's side to the eye; nothing turns by itself
     · its driver's window is open: the triangles of that glass are taken out of the body when it loads (WIN),
       and the inside of the body is a dark lining, so the cockpit is seen through the opening
     · the scroll takes the eye along one unbroken way: up to the window, through it, to where the driver's
       eyes are, then down to the screen in the middle of the dashboard. No cut, no fade.
     · the flat device (the real prototype) then stands exactly on that screen.

   main.js (lab) drives it: __carShow.warm() when the item is near, .fly(state, e, x, dv, k) with the scroll
   (e: arriving 0…1 · dv: the way in 0…1 · x: leaving). Where WebGL is missing nothing happens and the flat
   screen arrives as before.
   ============================================================ */
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { DRACOLoader } from '../vendor/DRACOLoader.js';
import { carPaint } from './car-paint.js?v=5';

const canvas = document.querySelector('[data-car-show]');
if (canvas) init(canvas);

function init(canvas) {
  const item = canvas.closest('[data-show-item]'), stage = canvas.parentNode;
  if (!item || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  item.insertBefore(canvas, item.firstChild);
  const scrim = document.createElement('i'); scrim.className = 'show__scrim'; scrim.setAttribute('aria-hidden', 'true'); item.insertBefore(scrim, canvas.nextSibling);      // inside the car the words on the left keep a dark ground under them
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), ramp = (v, a, b) => clamp((v - a) / (b - a), 0, 1);
  const ease = (t) => t * t * (3 - 2 * t), out = (t) => 1 - Math.pow(1 - t, 3);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const S = 4.2;                                           // the car is one unit long in its file (nose at -x, its driver's side at +z)
  const BASE = .72;                                        // how it stands: three-quarters, its nose toward the words, the driver's door toward the eye
  /* the driver's window, in the car's own units, seen from its side (x along the car, y up): the glass inside its
     bright trim, traced on a flat render of the model (tools/blender/wall_views.py). Triangles of the body whose
     middle lies in it, on that side, are left out. */
  const WIN = [[-.0775, .1858], [.1225, .1858], [.129, .199], [.132, .230], [.1335, .2475], [.060, .2495], [-.024, .2495], [-.0425, .2405], [-.0585, .2285], [-.0705, .2140], [-.0785, .1985]];
  const inWin = (x, y) => { let c = false; for (let i = 0, j = WIN.length - 1; i < WIN.length; j = i++) { const a = WIN[i], b = WIN[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  /* the cockpit (one unit wide in its file, its nose at -z): how it sits in the body — its size, how far back, how high */
  const CK = { s: .345, x: -.036, y: .034 };
  /* in the cockpit's own units: where the driver's eyes are, and the screen in the dashboard */
  const EYE = V(-.23, .47, .3), EYE_AT = V(.02, .31, -.3), SCR = V(-.0036, .3746, -.1298), SCR_N = V(.004, .226, .974).normalize(), SCR_W = .168, SCR_H = SCR_W * 832 / 1280;      // measured on the cockpit (tools/ref/probe.html)
  const api = window.__carShow = { ready: false, warm, fly, dive() {}, back() {}, step: (ms) => { last = performance.now() - (ms || 16); still = 0; frame(performance.now()); }, get u() { return dv; }, get dbg() { return { state, e, x, dv, turn, ry: car && car.rotation.y, standing, kdev, W, H, win, CK, cam: camera && camera.position.toArray(), fov: camera && camera.fov, P: P.map((q) => q.toArray()), L: L.map((q) => q.toArray()) }; }, CK, set(o) { Object.assign(CK, o); place(); } };      // step: one frame now (for checking); set: move the cockpit in the body (for checking)
  let renderer = null, scene = null, camera = null, car = null, cockpit = null, shadow = null, loading = false, failed = false;
  let state = 'off', e = 0, x = 0, dv = 0, kdev = 1, raf = 0, last = 0, t = 0, turn = 0, turnV = 0, drag = null, idle = 0, W = 0, H = 0, still = 0, standing = false;
  const win = { n: 0, x: .03, y: .218, z: .18 };          // the opening: how many triangles went, and where its middle is
  const cam0 = { p: V(0, 0, 0), sx: 0, sy: 0 }, look = new THREE.PerspectiveCamera();
  const P = [V(0, 0, 0), V(0, 0, 0), V(0, 0, 0), V(0, 0, 0)], L = [V(0, 0, 0), V(0, 0, 0), V(0, 0, 0), V(0, 0, 0)], curve = new THREE.CatmullRomCurve3(P, false, 'centripetal');
  const STOP = [0, .42, .66, 1], FOV = [28, 30, 42, 30];      // pass 80: far · outside the window, on the line from the screen through it · in the window · before the screen
  const wc = V(0, 0, 0), sw = V(0, 0, 0), dd = V(0, 0, 0);
  /* a monotone cubic through (x, y) points (Fritsch–Carlson): smooth, never going back */
  const mono = (x, y, t) => {
    const n = x.length, d = [], m = [];
    for (let i = 0; i < n - 1; i++) d.push((y[i + 1] - y[i]) / (x[i + 1] - x[i]));
    m.push(d[0] * .5); for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2); m.push(d[n - 2] * .5);
    for (let i = 0; i < n - 1; i++) { if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; } const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b; if (h > 9) { const k = 3 / Math.sqrt(h); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; } }
    let i = 0; while (i < n - 2 && t > x[i + 1]) i++;
    const hh = x[i + 1] - x[i], s = Math.min(1, Math.max(0, (t - x[i]) / hh)), s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * y[i] + (s3 - 2 * s2 + s) * hh * m[i] + (-2 * s3 + 3 * s2) * y[i + 1] + (s3 - s2) * hh * m[i + 1];
  };
  const pos = V(0, 0, 0), aim = V(0, 0, 0);

  function place() { if (!cockpit) return; cockpit.scale.setScalar(S * CK.s); cockpit.rotation.y = Math.PI / 2; cockpit.position.set(S * CK.x, S * CK.y, 0); }

  function warm() {
    if (loading || api.ready || failed) return; loading = true;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (err) { failed = true; return; }
    renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;      // pass 79: drawn a little finer than the screen even on a plain one: clean edges
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15; renderer.setClearColor(0x000000, 0);
    scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(28, 1.6, .02, 200);
    /* the light: a photographer's room, made here — soft panels above and to the sides — as what the paint reflects */
    {
      const es = new THREE.Scene(), box = (w, h, c, k, px, py, pz) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(px, py, pz); m.lookAt(0, 0, 0); es.add(m); };
      es.add(new THREE.Mesh(new THREE.SphereGeometry(30, 24, 16), new THREE.MeshBasicMaterial({ color: 0x06070c, side: THREE.BackSide })));
      box(16, 7, 0xffffff, 7, 0, 12, 2); box(7, 9, 0xbfd8ff, 4.5, -13, 4, 3); box(7, 9, 0xffd0a8, 1.9, 13, 4, -2); box(10, 3, 0xffffff, 3, 0, 3, -14); box(5, 2, 0xff8a5a, 2.5, 6, 1, 12);
      const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(es, .03).texture; pm.dispose();
    }
    scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x20222c, .55));
    const key = new THREE.DirectionalLight(0xfff2e2, 2.3); key.position.set(-5, 8, 6); scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fc0ff, 1.6); rim.position.set(6, 4, -7); scene.add(rim);
    const draco = new DRACOLoader().setDecoderPath(new URL('../vendor/draco/', import.meta.url).href);
    const load = (f) => new GLTFLoader().setDRACOLoader(draco).loadAsync(new URL('../models/' + f, import.meta.url).href);
    Promise.all([load('manic-gt-hq.glb?v=1'), load('gt-cockpit.glb?v=2'), new THREE.TextureLoader().loadAsync(new URL('../img/blocks/manic-gt-poster.webp', import.meta.url).href)]).then(([a, b, poster]) => {
      draco.dispose();
      car = new THREE.Group(); a.scene.scale.setScalar(S); car.add(a.scene); scene.add(car);
      a.scene.traverse((m) => {
        if (!m.isMesh || m.userData.lining) return;
        const mt = m.material; mt.metalness = 0; mt.roughness = .42; mt.envMapIntensity = 1.3; if (mt.map) mt.map.anisotropy = 8; carPaint(mt);      // paint, glass and rubber each get their own surface
        /* the driver's window is open: its glass is left out of the body */
        const g = m.geometry, ix = g.index, ps = g.attributes.position;
        if (ix && ps) {
          const keep = []; let sx = 0, sy = 0, sz = 0;
          for (let i = 0; i < ix.count; i += 3) {
            const i0 = ix.getX(i), i1 = ix.getX(i + 1), i2 = ix.getX(i + 2);
            const cx = (ps.getX(i0) + ps.getX(i1) + ps.getX(i2)) / 3, cy = (ps.getY(i0) + ps.getY(i1) + ps.getY(i2)) / 3, cz = (ps.getZ(i0) + ps.getZ(i1) + ps.getZ(i2)) / 3;
            if (cz > .1 && cz < .172 && inWin(cx, cy)) {      // (not the mirror: it stands out further than the glass)
 win.n++; sx += cx; sy += cy; sz += cz; continue; }
            keep.push(i0, i1, i2);
          }
          if (win.n) {
            g.setIndex(keep); win.x = sx / win.n; win.y = sy / win.n; win.z = sz / win.n;
            /* its edge is made clean: a point of what is left that still stands inside the outline is drawn back onto the outline (the cut followed the triangles, in teeth) */
            const seen = new Uint8Array(ps.count);
            for (let i = 0; i < keep.length; i++) {
              const v = keep[i]; if (seen[v]) continue; seen[v] = 1;
              const px = ps.getX(v), py = ps.getY(v); if (ps.getZ(v) <= .1 || ps.getZ(v) >= .172 || !inWin(px, py)) continue;
              let best = 1e9, bx = px, by = py;
              for (let k = 0, j = WIN.length - 1; k < WIN.length; j = k++) {
                const ax = WIN[j][0], ay = WIN[j][1], ex = WIN[k][0] - ax, ey = WIN[k][1] - ay, t = clamp(((px - ax) * ex + (py - ay) * ey) / (ex * ex + ey * ey), 0, 1), qx = ax + ex * t, qy = ay + ey * t, d = (px - qx) * (px - qx) + (py - qy) * (py - qy);
                if (d < best) { best = d; bx = qx; by = qy; }
              }
              ps.setXY(v, bx, by);
            }
            ps.needsUpdate = true;
          }
          /* and the inside of the body is a dark lining (it had no inside at all: one looked through it) */
          const lining = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 1, metalness: 0, envMapIntensity: 0, side: THREE.BackSide }));
          lining.userData.lining = true; lining.position.copy(m.position); lining.quaternion.copy(m.quaternion); lining.scale.copy(m.scale); m.parent.add(lining);
        }
      });
      /* pass 80: chrome frames round the windscreen and the side windows. The trim painted in the picture was ragged (the picture is
         hundreds of small islands, the trim crosses their seams); these are real lines, measured on the model
         (tools/check/t_carmeasure.py): the windscreen's outline seen from the front, the side window's from the side */
      {
        const WS = [[-0.1484, 0.2088, 0], [-0.1416, 0.2088, 0.06], [-0.1235, 0.209, 0.12], [-0.11, 0.2094, 0.146], [-0.1027, 0.2115, 0.1525], [-0.0933, 0.22, 0.1515], [-0.0872, 0.23, 0.149], [-0.0765, 0.24, 0.1455], [-0.0679, 0.249, 0.14], [-0.0605, 0.256, 0.1335], [-0.0591, 0.2615, 0.124], [-0.0603, 0.2648, 0.108], [-0.0649, 0.2665, 0.082], [-0.0714, 0.2673, 0.04], [-0.0744, 0.2675, 0], [-0.0714, 0.2673, -0.04], [-0.0642, 0.2665, -0.082], [-0.0611, 0.2648, -0.108], [-0.0597, 0.2615, -0.124], [-0.0609, 0.256, -0.1335], [-0.0679, 0.249, -0.14], [-0.0765, 0.24, -0.1455], [-0.0872, 0.23, -0.149], [-0.0934, 0.22, -0.1515], [-0.1028, 0.2115, -0.1525], [-0.1102, 0.2094, -0.146], [-0.1236, 0.209, -0.12], [-0.1417, 0.2088, -0.06]];
        const SW = [[-0.0775, 0.1858, 0.1705], [0.1225, 0.1858, 0.1708], [0.129, 0.199, 0.1691], [0.132, 0.23, 0.1602], [0.1335, 0.2475, 0.1534], [0.06, 0.2495, 0.1511], [-0.024, 0.2495, 0.153], [-0.0425, 0.2405, 0.1563], [-0.0585, 0.2285, 0.1604], [-0.0705, 0.214, 0.1636], [-0.0785, 0.1985, 0.1675]];
        const chrome = new THREE.MeshStandardMaterial({ color: 0xe4e8ee, metalness: 1, roughness: .17, envMapIntensity: 1.3 });
        const frame = (pts, r) => { const c = new THREE.CatmullRomCurve3(pts.map((q) => V(q[0], q[1], q[2])), true, 'centripetal'); const m = new THREE.Mesh(new THREE.TubeGeometry(c, pts.length * 16, r, 10, true), chrome); m.scale.setScalar(S); car.add(m); };
        frame(WS, .0042); frame(SW, .0036); frame(SW.map((q) => [q[0], q[1], -q[2]]), .0036);
      }
      /* the dark it stands on: a soft shadow */
      const sc = document.createElement('canvas'); sc.width = sc.height = 256; const sx2 = sc.getContext('2d'), g2 = sx2.createRadialGradient(128, 128, 0, 128, 128, 128);
      g2.addColorStop(0, 'rgba(0,0,0,.85)'); g2.addColorStop(.55, 'rgba(0,0,0,.45)'); g2.addColorStop(1, 'rgba(0,0,0,0)'); sx2.fillStyle = g2; sx2.fillRect(0, 0, 256, 256);
      shadow = new THREE.Mesh(new THREE.PlaneGeometry(S * 1.45, S * .75).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false })); shadow.position.y = .01; car.add(shadow);
      /* the cockpit, in the body; and on its dashboard a screen that already shows the prototype's first page */
      cockpit = new THREE.Group(); cockpit.add(b.scene); car.add(cockpit); place();
      b.scene.traverse((m) => { if (m.isMesh) { const mt = m.material; mt.metalness = 0; mt.roughness = .5; mt.envMapIntensity = .35; mt.color = new THREE.Color(.032, .032, .036); if (mt.map) mt.map.anisotropy = 8; } });      // pass 79: a black interior (the picture only whispers through: stitching, gauges)
      poster.colorSpace = THREE.SRGBColorSpace; poster.anisotropy = 8;
      const tab = new THREE.Group(); tab.position.copy(SCR).addScaledVector(SCR_N, .012); tab.lookAt(V(0, 0, 0).copy(SCR).addScaledVector(SCR_N, 1)); cockpit.add(tab);
      tab.add(new THREE.Mesh(new THREE.BoxGeometry(SCR_W + .014, SCR_H + .014, .01), new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: .35, metalness: .4 })));
      const face = new THREE.Mesh(new THREE.PlaneGeometry(SCR_W, SCR_H), new THREE.MeshBasicMaterial({ map: poster, toneMapped: false })); face.position.z = .0056; tab.add(face);
      const lamp = new THREE.PointLight(0xffe6c8, 1.5, 2.6, 1.4); lamp.position.set(0, .7, .25); cockpit.add(lamp);      // (the roof is over it now: a cabin light, a little stronger)
      api.ready = true; item.classList.add('has-car'); loop();
      window.dispatchEvent(new Event('scroll'));          // main.js looks again: from here on the car is what comes, not the flat screen
    }).catch((err) => { console.warn('[car-show]', err); failed = true; draco.dispose(); });
    canvas.addEventListener('pointerdown', (ev) => { if (!standing) return; still = 0; loop(); drag = { id: ev.pointerId, x: ev.clientX }; try { canvas.setPointerCapture(ev.pointerId); } catch (er) {} canvas.style.cursor = 'grabbing'; });
    canvas.addEventListener('pointermove', (ev) => { if (!drag || ev.pointerId !== drag.id) return; const dx = ev.clientX - drag.x; drag.x = ev.clientX; turn += dx * .008; turnV = dx * .008; idle = 0; still = 0; loop(); });
    const up = (ev) => { if (drag && ev.pointerId === drag.id) { drag = null; canvas.style.cursor = ''; still = 0; loop(); } };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  }

  function fly(st, e_, x_, dv_, k_) {
    const was = state, moved = st !== state || e_ !== e || x_ !== x || (dv_ || 0) !== dv;
    state = st; e = e_; x = x_; dv = dv_ || 0; if (k_) kdev = k_;
    if (moved) still = 0;
    if (st !== 'off' && api.ready) loop();
    if (st === 'off' && was !== 'off') { canvas.style.opacity = ''; canvas.style.filter = ''; scrim.style.opacity = '0'; scrim._k = 0; turn = 0; turnV = 0; }
  }
  function size() {
    const r = canvas.getBoundingClientRect(); if (!r.width || !r.height) return false;
    if (Math.abs(r.width - W) > .5 || Math.abs(r.height - H) > .5) { W = r.width; H = r.height; renderer.setSize(W, H, false); camera.aspect = W / H; }
    return true;
  }
  /* where the flat device stands once the eye has come to rest: the middle of its stage, at the size main.js gives it */
  function target(sr, cr) { return { w: 1280 * kdev, cx: sr.left + sr.width / 2 - cr.left, cy: sr.top + sr.height / 2 - cr.top }; }
  function frame(now) {
    raf = 0;
    if (!api.ready || state === 'off' || document.hidden || !size()) return;
    const dt = Math.min(.05, (now - last) / 1000 || 0); last = now; t += dt;
    const sr = stage.getBoundingClientRect(), cr = canvas.getBoundingClientRect();
    const sx = sr.left + sr.width / 2 - (cr.left + W / 2), sy = sr.top + sr.height / 2 - (cr.top + H / 2);
    /* how far in the eye is: 0 outside, 1 at the screen */
    const u = state === 'in' ? dv : (state === 'down' || state === 'out') ? 1 : 0;
    const st = state === 'in' && e >= .999 && u <= .001;
    if (st !== standing) { standing = st; item.classList.toggle('is-standing', st); if (!st && drag) { drag = null; canvas.style.cursor = ''; } }
    /* the car: it is simply there. It comes out of the dark as the eye draws a little nearer; nothing turns, nothing bounces */
    let alpha = 1, far = 1;
    if (state === 'in' && e < 1) { alpha = ramp(e, 0, .6); far = 1 + .16 * (1 - out(e)); }
    else if (state === 'out') alpha = 1 - ramp(x, .05, .7);
    if (!drag) { turn += turnV; turnV *= Math.pow(.02, dt); idle += dt; if (idle > 2.5 || !standing) turn += (0 - turn) * (1 - Math.pow(standing ? .35 : .002, dt)); }      // (a hand may turn it while it stands; it comes back by itself)
    car.rotation.y = BASE + turn; car.updateMatrixWorld(true);
    /* the eye, at rest: far enough for the car to fill the stage it stands in */
    const fovB = 28, th = Math.tan(THREE.MathUtils.degToRad(fovB / 2));
    const dist = Math.max((S * 1.28 / 2) / (th * Math.max(.2, sr.width / H)), (S * .62 / 2) / (th * Math.max(.2, sr.height / H)));
    cam0.p.set(0, 2.0, dist * far); cam0.sx = sx; cam0.sy = sy;
    /* the way in: five stations, one curve through them */
    const tg = target(sr, cr), fovE = FOV[3], dEnd = SCR_W * H / (2 * Math.tan(THREE.MathUtils.degToRad(fovE / 2)) * tg.w);
    const inCar = (v, px, py, pz) => v.set(px, py, pz).multiplyScalar(S).applyMatrix4(car.matrixWorld), inCock = (v, src) => v.copy(src).applyMatrix4(cockpit.matrixWorld);
    P[0].copy(cam0.p); L[0].set(0, .56, 0);
    inCar(wc, win.x, win.y, win.z); inCock(sw, SCR); dd.copy(wc).sub(sw).normalize();       // the line from the screen out through the window
    P[1].copy(wc).addScaledVector(dd, .3 * S); L[1].copy(sw);                                // outside, on that line: the screen is seen through the window, straight on
    P[2].copy(wc).addScaledVector(dd, -.015 * S); L[2].copy(sw);                             // in the opening
    inCock(P[3], V(0, 0, 0).copy(SCR).addScaledVector(SCR_N, dEnd)); L[3].copy(sw);          // before the screen, at the distance that makes it as large as the real one
    /* pass 81: one smooth stroke at an even speed along the curve (no change of pace at the stations), the eye on the screen early */
    /* time along the way: about two fifths of the scroll to come to the window, a fifth to pass through it, two fifths inside to
       the screen; the speed never jumps (a monotone cubic through those points, on the curve's own length) */
    curve.needsUpdate = true; const ls = curve.getLengths(240), tot = ls[240] || 1;
    const KX = [0, .4, .6, 1], KY = [0, ls[80] / tot, ls[160] / tot, 1], uu = mono(KX, KY, u);
    curve.getPointAt(Math.min(1, Math.max(0, uu)), pos); aim.copy(L[0]).lerp(sw, ease(ramp(u, 0, .38)));
    look.position.copy(pos); look.up.set(0, 1, 0); look.lookAt(aim);
    const fov = 28 + (FOV[3] - 28) * uu + 9 * Math.sin(Math.PI * uu);
    const ox = sx * (1 - ease(ramp(u, 0, .35))) + (tg.cx - W / 2) * ease(ramp(u, .65, 1)), oy = sy * (1 - ease(ramp(u, 0, .35))) + (tg.cy - H / 2) * ease(ramp(u, .65, 1));
    const soft = ramp(u, .82, 1) * .6;                     // what is round the screen goes a little soft: the screen is what is looked at
    camera.position.copy(pos); camera.quaternion.copy(look.quaternion); camera.fov = fov;
    camera.setViewOffset(W, H, -ox, -oy, W, H); camera.updateProjectionMatrix();
    canvas.style.opacity = item.classList.contains('is-stage') ? '' : String(alpha.toFixed(3));
    const fl = soft > .002 ? 'blur(' + (soft * 7).toFixed(2) + 'px) brightness(' + (1 - soft * .5).toFixed(3) + ')' : '';
    const sk = (item.classList.contains('is-stage') ? 0 : ramp(u, .8, .96) * .7) * (state === 'out' ? alpha : 1);      // (pass 80: lighter, and none at all while the prototype is in use) if (sk !== scrim._k) { scrim._k = sk; scrim.style.opacity = sk.toFixed(3); }
    if (canvas.style.filter !== fl) canvas.style.filter = fl;
    renderer.render(scene, camera);
    if (state === 'down' && ++still > 3) return;          // at rest by the screen: nothing more to draw until the scroll moves
    if (standing && !drag && Math.abs(turn) < 1e-4 && Math.abs(turnV) < 1e-4 && ++still > 3) return;      // standing still: nothing moves, nothing is drawn again
    loop();
  }
  function loop() { if (!raf) raf = requestAnimationFrame(frame); }

  document.addEventListener('visibilitychange', () => { if (!document.hidden && state !== 'off') { last = performance.now(); still = 0; loop(); } });
}
