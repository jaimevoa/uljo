"""pass 77: what are the dark shards on the path, and the flat violet slab at the far end? ask the scene itself."""
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
  const hits = rc.intersectObjects(W.scene.children, true).filter((h) => h.object.visible && h.object.isMesh).slice(0, 3);
  out.push(hits.map((h) => { let o = h.object, path = []; while (o && path.length < 5) { path.push(o.name || o.type); o = o.parent; }
    const g = h.object.geometry, f = h.face, P = g.attributes.position, vs = f ? [f.a, f.b, f.c].map((i) => new THREE.Vector3().fromBufferAttribute(P, i).applyMatrix4(h.object.matrixWorld)) : [];
    const hs = vs.map((v) => +(v.length() - W.ground(v.clone().normalize())).toFixed(3));
    return { d: +h.distance.toFixed(2), path: path.join('<'), planet: W.planetParts.includes(h.object), mat: (h.object.material && (h.object.material.name || h.object.material.type)) || '', above: hs, r: vs.map((v) => +v.length().toFixed(3)), tri: g.index ? g.index.count / 3 : P.count / 3,
      edge: vs.length ? [vs[0].distanceTo(vs[1]), vs[1].distanceTo(vs[2]), vs[2].distanceTo(vs[0])].map((x) => +x.toFixed(2)) : [] }; }));
}
return out;'''

def place(i, way):
    j = max(0, min(n - 1, i + way * 3))
    t.ev('''const W = window.__world, T = W.__T; W.player.n.copy(T[%d]); W.player.fwd.copy(T[%d]).sub(T[%d]).normalize();
      W.player.fwd.addScaledVector(W.player.n, -W.player.fwd.dot(W.player.n)).normalize(); W.cam.f.copy(W.player.fwd); W.sayDone && W.sayDone(); return 1''' % (i, j, i))
    time.sleep(2.4)

# 07a = index 55, forward: shards at (820, 810), (690, 715), (1010, 590)
place(55, 1); t.shot('dg-07a', 85)
for r in t.ev(PICK % json.dumps([[820, 810], [690, 715], [1010, 590], [800, 880]])): print('07a', json.dumps(r))
# 06b = index 48, backward: blades at (770, 690), (790, 830)
place(48, -1); t.shot('dg-06b', 85)
for r in t.ev(PICK % json.dumps([[770, 690], [790, 830], [430, 640]])): print('06b', json.dumps(r))
# 10b = index 76, backward: the violet slab at (1200, 800), (1000, 720)
place(76, -1); t.shot('dg-10b', 85)
for r in t.ev(PICK % json.dumps([[1200, 800], [1000, 720], [1300, 700]])): print('10b', json.dumps(r))
print('cam', t.ev('const W = window.__world; return { camR: +W.camera.position.length().toFixed(2), ground: +W.ground(W.camera.position.clone().normalize()).toFixed(2), playerR: +(W.me.position.length()).toFixed(2) }'))
