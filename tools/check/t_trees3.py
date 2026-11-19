"""pass 77: the whole lantern path, both ways, on the rebuilt planet: any tree cut in half, any shard left lying?"""
import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.nav('http://localhost:4322/index.html?mute'); time.sleep(9)
t.ev('sessionStorage.removeItem("uljo-quests"); return 1')
t.ev('document.querySelector("[data-world-play]").click(); return 1'); time.sleep(7)
n = t.ev('const W = window.__world, d = await (await fetch("assets/models/planet.json?v=6")).json(); W.__T = d.trail.map((q) => new W.THREE.Vector3(q[0], q[1], q[2]).normalize()); return W.__T.length')
print('trail points', n)
names = []
idx = list(range(6, n - 1, 7))
for k, i in enumerate(idx):
    for way in (1, -1):
        j = max(0, min(n - 1, i + way * 3))
        t.ev('''const W = window.__world, T = W.__T; W.player.n.copy(T[%d]); W.player.fwd.copy(T[%d]).sub(T[%d]).normalize();
          W.player.fwd.addScaledVector(W.player.n, -W.player.fwd.dot(W.player.n)).normalize(); W.cam.f.copy(W.player.fwd); W.sayDone && W.sayDone(); return 1''' % (i, j, i))
        time.sleep(2.2)
        nm = 'trp-%02d%s' % (k, 'a' if way > 0 else 'b'); t.shot(nm, 82, .5); names.append(nm)
print(sheet(names, 'sheet-trail', cols=4, q=80), len(names))
print(t.ev('return window.__world.planetParts[0].geometry.attributes.position.count'), t.rate())
print([l for l in t.logs() if 'error' in str(l).lower()][:5])
