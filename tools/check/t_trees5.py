"""pass 77: are the flat green fans by the path the patches that closed the holes (one colour for the whole patch), or plants of the model?
A patch face has the same uv at its three corners."""
import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.nav('http://localhost:4322/index.html?mute'); time.sleep(9)
t.ev('sessionStorage.removeItem("uljo-quests"); return 1')
t.ev('document.querySelector("[data-world-play]").click(); return 1'); time.sleep(7)
n = t.ev('const W = window.__world, d = await (await fetch("assets/models/planet.json?v=6")).json(); W.__T = d.trail.map((q) => new W.THREE.Vector3(q[0], q[1], q[2]).normalize()); return W.__T.length')

PICK = '''const W = window.__world, THREE = W.THREE, rc = new THREE.Raycaster(); const out = [];
for (const [px, py] of %s) {
  rc.setFromCamera(new THREE.Vector2(px / 1440 * 2 - 1, 1 - py / 900 * 2), W.camera);
  const h = rc.intersectObjects(W.planetParts, false)[0];
  if (!h) { out.push(null); continue; }
  const g = h.object.geometry, f = h.face, P = g.attributes.position, U = g.attributes.uv, vs = [f.a, f.b, f.c].map((i) => new THREE.Vector3().fromBufferAttribute(P, i).applyMatrix4(h.object.matrixWorld));
  const uvs = [f.a, f.b, f.c].map((i) => [+U.getX(i).toFixed(4), +U.getY(i).toFixed(4)]);
  const hs = vs.map((v) => +(v.length() - W.ground(v.clone().normalize())).toFixed(2));
  const flat = Math.max(Math.abs(uvs[0][0] - uvs[1][0]), Math.abs(uvs[0][1] - uvs[1][1]), Math.abs(uvs[0][0] - uvs[2][0]), Math.abs(uvs[0][1] - uvs[2][1])) < 1e-4;
  out.push({ d: +h.distance.toFixed(2), patch: flat, uv: uvs, above: hs, edge: [vs[0].distanceTo(vs[1]), vs[1].distanceTo(vs[2]), vs[2].distanceTo(vs[0])].map((x) => +x.toFixed(2)) });
}
return out;'''

def place(i, way):
    j = max(0, min(n - 1, i + way * 3))
    t.ev('''const W = window.__world, T = W.__T; W.player.n.copy(T[%d]); W.player.fwd.copy(T[%d]).sub(T[%d]).normalize();
      W.player.fwd.addScaledVector(W.player.n, -W.player.fwd.dot(W.player.n)).normalize(); W.cam.f.copy(W.player.fwd); W.sayDone && W.sayDone(); return 1''' % (i, j, i))
    time.sleep(2.4)

# 04a = index 34, forward: the fan at the left (200, 640), (120, 700); the dark facets at the right (1040, 640), (1100, 560), (960, 700)
place(34, 1); t.shot('dg-04a', 85)
for r in t.ev(PICK % json.dumps([[200, 640], [120, 700], [1040, 640], [1100, 560], [960, 700], [1180, 760]])): print('04a', json.dumps(r))
# 05b = index 41, backward: the dark mound at the left (300, 640), (400, 700), (200, 560)
place(41, -1); t.shot('dg-05b', 85)
for r in t.ev(PICK % json.dumps([[300, 640], [400, 700], [200, 560], [1100, 700]])): print('05b', json.dumps(r))
# 03a = index 27, forward
place(27, 1); t.shot('dg-03a', 85)
for r in t.ev(PICK % json.dumps([[160, 700], [260, 520], [1100, 640], [1240, 540]])): print('03a', json.dumps(r))
# how many patch faces in all, and where
print(t.ev('''const W = window.__world, THREE = W.THREE; let nP = 0, big = 0; const spots = [];
for (const m of W.planetParts) { const g = m.geometry, U = g.attributes.uv, P = g.attributes.position, I = g.index; const N = I ? I.count : P.count;
  for (let i = 0; i < N; i += 3) { const a = I ? I.getX(i) : i, b = I ? I.getX(i + 1) : i + 1, c = I ? I.getX(i + 2) : i + 2;
    if (Math.abs(U.getX(a) - U.getX(b)) < 1e-5 && Math.abs(U.getY(a) - U.getY(b)) < 1e-5 && Math.abs(U.getX(a) - U.getX(c)) < 1e-5 && Math.abs(U.getY(a) - U.getY(c)) < 1e-5) { nP++;
      const va = new THREE.Vector3().fromBufferAttribute(P, a), vb = new THREE.Vector3().fromBufferAttribute(P, b), vc = new THREE.Vector3().fromBufferAttribute(P, c);
      const ar = vb.clone().sub(va).cross(vc.clone().sub(va)).length() / 2; if (ar > .05) { big++; if (spots.length < 60) spots.push([+ar.toFixed(2), +(va.length() - W.ground(va.clone().normalize())).toFixed(2), +(vb.length() - W.ground(vb.clone().normalize())).toFixed(2), +(vc.length() - W.ground(vc.clone().normalize())).toFixed(2)]); } } } }
return JSON.stringify({ patchFaces: nP, big, spots });'''))
