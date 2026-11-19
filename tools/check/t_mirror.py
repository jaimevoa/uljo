"""pass 77: looking into the water: is the way down to it smooth? a frame every 0.3 s"""
import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.nav('http://localhost:4322/index.html?mute'); time.sleep(2)
t.ev('sessionStorage.removeItem("uljo-quests"); return 1')
t.nav('http://localhost:4322/index.html?mute'); time.sleep(8)
t.ev('document.querySelector("[data-world-play]").click(); return 1'); time.sleep(9)
t.ev('const W = window.__world; W.sayDone && W.sayDone(); return 1')
print(t.ev('const W = window.__world, d = await (await fetch("assets/models/planet.json?v=7")).json(); const q = d.trail[6]; W.player.n.set(q[0], q[1], q[2]).normalize(); const p = W.PLACES.find((x) => x.id === "about"); return { id: p.id, verb: p.verb, near: +(p.dir.angleTo(W.player.n) * 9.5).toFixed(2) }'))
time.sleep(1.5); print('cta:', t.ev('const e = document.querySelector("[data-world-place]"); return [e.hidden, e.innerText]'))
names = []
t.shot('mr-00', 80, .4); names.append('mr-00')
t.key('KeyE')
ks = []; n = 0
for k in range(1, 90):
    time.sleep(.22); st = t.ev('const W = window.__world; return [+W.mirror.k.toFixed(3), W.mirror.state]'); kk = st[0]; ks.append(kk if st[1] == 2 else 'walk' if st[1] == 1 else kk)
    if 0 < kk and n < 19: n += 1; nm = 'mr-%02d' % n; t.shot(nm, 80, .4); names.append(nm)
    if kk >= .999 and n >= 3: break
print('mirror.k over time:', ks)
time.sleep(2); print(t.ev('const W = window.__world; return { k: +W.mirror.k.toFixed(2), href: location.pathname }'))
print(sheet(names, 'sheet-mirror', 4, 80))
print([str(l)[:200] for l in t.logs() if 'rror' in str(l)][:5])
