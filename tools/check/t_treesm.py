"""pass 77: the path on a phone (the light planet): the closed holes, the path's weave"""
import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(390, 844, 2, True)
t.nav('http://localhost:4322/index.html?mute'); time.sleep(10)
t.ev('sessionStorage.removeItem("uljo-quests"); return 1')
t.ev('document.querySelector("[data-world-play]").click(); return 1'); time.sleep(9)
n = t.ev('const W = window.__world, d = await (await fetch("assets/models/planet.json?v=7")).json(); W.__T = d.trail.map((q) => new W.THREE.Vector3(q[0], q[1], q[2]).normalize()); return W.__T.length')
print('triangles', t.ev('let n = 0; for (const m of window.__world.planetParts) n += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; return n'))
names = []
for k, (i, way) in enumerate(((13, 1), (20, 1), (27, 1), (34, 1), (41, 1), (41, -1), (48, 1), (55, 1), (62, 1), (69, 1))):
    j = max(0, min(n - 1, i + way * 3))
    t.ev('''const W = window.__world, T = W.__T; W.player.n.copy(T[%d]); W.player.fwd.copy(T[%d]).sub(T[%d]).normalize();
      W.player.fwd.addScaledVector(W.player.n, -W.player.fwd.dot(W.player.n)).normalize(); W.cam.f.copy(W.player.fwd); W.sayDone && W.sayDone(); return 1''' % (i, j, i))
    time.sleep(2.2); nm = 'trm-%02d' % k; t.shot(nm, 80, .5); names.append(nm)
print(sheet(names, 'sheet-trailm', 10, 82))
print(t.ev('const W = window.__world; return { level: W.gov.level, cap: W.gov.cap || 0, ms: +W.perf.ms.toFixed(1), px: [W.renderer.domElement.width, W.renderer.domElement.height] }'))
print([str(l)[:160] for l in t.logs() if 'rror' in str(l)][:3])
