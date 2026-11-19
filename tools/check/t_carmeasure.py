"""pass 80: measure the Manic GT's windshield outline (from the front) and the side window's depth, on the model itself."""
import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T
t = T(1200, 800)
t.nav('http://localhost:4322/index.html?mute'); time.sleep(4)
r = t.ev(r'''
const THREE = await import('three');
const { GLTFLoader } = await import('./assets/vendor/GLTFLoader.js');
const { DRACOLoader } = await import('./assets/vendor/DRACOLoader.js');
const dl = new DRACOLoader().setDecoderPath('./assets/vendor/draco/');
const g = await new GLTFLoader().setDRACOLoader(dl).loadAsync('./assets/models/manic-gt-hq.glb?v=1');
let mesh = null; g.scene.traverse((m) => { if (m.isMesh) mesh = m; });
g.scene.updateMatrixWorld(true);
const img = mesh.material.map.image, c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
const x = c.getContext('2d'); x.drawImage(img, 0, 0); const px = x.getImageData(0, 0, c.width, c.height).data, W = c.width, H = c.height;
const flip = mesh.material.map.flipY;
const col = (uv) => { const u = ((uv.x % 1) + 1) % 1, v = ((uv.y % 1) + 1) % 1; const ix = Math.min(W - 1, Math.floor(u * W)), iy = Math.min(H - 1, Math.floor((flip ? 1 - v : v) * H)); const k = (iy * W + ix) * 4; return [px[k] / 255, px[k + 1] / 255, px[k + 2] / 255]; };
const dark = (c3) => { const mx = Math.max(...c3), mn = Math.min(...c3), l = (c3[0] + c3[1] + c3[2]) / 3; return l < .3 && (mx - mn) < .22; };
const rc = new THREE.Raycaster(); const V = (a, b, cc) => new THREE.Vector3(a, b, cc);
const hit = (o, d) => { rc.set(o, d); const h = rc.intersectObject(mesh, false)[0]; return h || null; };
// the windshield: rays from the front (toward +x), over z and y
const rows = [];
for (let y = .14; y <= .285; y += .0025) {
  const row = [];
  for (let z = -.2; z <= .2; z += .004) { const h = hit(V(-1, y, z), V(1, 0, 0)); row.push(h && h.uv && dark(col(h.uv)) ? +h.point.x.toFixed(4) : null); }
  rows.push([+y.toFixed(4), row]);
}
// the side window: from outside (toward -z), along its outline, a little outside it
const WIN = [[-.0775, .1858], [.1225, .1858], [.129, .199], [.132, .230], [.1335, .2475], [.060, .2495], [-.024, .2495], [-.0425, .2405], [-.0585, .2285], [-.0705, .2140], [-.0785, .1985]];
const side = WIN.map(([a, b]) => { const h = hit(V(a, b, 1), V(0, 0, -1)); return h ? +h.point.z.toFixed(4) : null; });
return JSON.stringify({ rows, side, tris: mesh.geometry.index.count / 3 });
''', timeout=600000)
open('/private/tmp/claude-501/-Users-jaimeolivares/e1776c3d-233f-40e1-bcee-ae1d809012d0/scratchpad/p78/car/measure.json', 'w').write(r)
d = json.loads(r); print('side z:', d['side'], 'tris', d['tris'])
for y, row in d['rows'][::4]: print(y, ''.join('#' if v is not None else '.' for v in row))
