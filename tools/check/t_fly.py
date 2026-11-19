"""pass 77: the car in the air: is the planet in the picture at every height?"""
import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.nav('http://localhost:4322/index.html?mute'); time.sleep(2)
t.ev('sessionStorage.removeItem("uljo-quests"); return 1')
t.nav('http://localhost:4322/index.html?mute'); time.sleep(8)
t.ev('document.querySelector("[data-world-play]").click(); return 1'); time.sleep(9)
names = []
def shot(n): t.shot(n, 80, .5); names.append(n)
t.ev('''const W = window.__world; ['trackon', 'recyco', 'manic'].forEach((q) => W.Q.done.add(q)); const U = W.station.userData; const p = U.top.clone().addScaledVector(U.ez, 2.35).normalize(); W.player.n.copy(p); W.player.fwd.copy(U.dir).sub(p).normalize(); W.cam.f.copy(W.player.fwd); W.sayDone && W.sayDone(); return 1''')
time.sleep(2.5); t.key('KeyE'); time.sleep(1.6); shot('fl-0')
t.keydown('KeyW'); time.sleep(2.0); shot('fl-1')
t.keydown('Space')
for k in range(5):
    time.sleep(1.5); shot('fl-up%d' % k); print(k, t.ev('const D = window.__world.Q.DRV; return { h: +D.h.toFixed(1), v: +D.v.toFixed(1) }'))
t.keydown('KeyA'); time.sleep(2.2); shot('fl-turn'); t.keyup('KeyA'); time.sleep(1.5); shot('fl-top')
t.keyup('Space'); time.sleep(1.5); shot('fl-down0'); time.sleep(2.0); shot('fl-down1'); time.sleep(2.5); shot('fl-land')
t.keyup('KeyW'); time.sleep(2.2); shot('fl-stop')
print(t.ev('const D = window.__world.Q.DRV; return { h: +D.h.toFixed(2), v: +D.v.toFixed(2), out: !document.querySelector(".dv__out").hidden }'))
print(sheet(names, 'sheet-fly', 4, 80))
print([str(l)[:200] for l in t.logs() if 'rror' in str(l)][:5])
