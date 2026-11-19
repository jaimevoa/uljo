import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.nav('http://localhost:4322/index.html?mute')
time.sleep(2)
t.ev('sessionStorage.removeItem("uljo-quests"); return 1')
t.nav('http://localhost:4322/index.html?mute')
time.sleep(7)
t.ev('document.querySelector("[data-world-play]").click(); return 1'); time.sleep(4)
time.sleep(6)
print('logs after enter', t.logs())
names = []
def shot(n): t.shot(n, 72, .5); names.append(n)
# go to the station, look at it
print(t.ev('''const W = window.__world, U = W.station.userData; const p = U.top.clone().addScaledVector(U.ez, 2.35).normalize(); W.player.n.copy(p); W.player.fwd.copy(U.dir).sub(p).normalize(); W.cam.f.copy(W.player.fwd); W.step(40, 1/30); return { car: W.Q.CAR.loaded, cta: document.querySelector("[data-world-place]").innerText, free: +W.land.free(p).toFixed(2) }'''))
time.sleep(2.5); shot('gt2-station')
print(t.ev('const e = document.querySelector("[data-world-place]"); return [e.hidden, e.innerText]'))
t.key('KeyE'); 
for i in range(14):
    time.sleep(1.5)
    r = t.ev('const W = window.__world, f = document.querySelector(".gt iframe"); let m = null; try { m = f.contentWindow.GT.S.nav.mode; } catch (e) {} return { ph: W.Q.CAR.phase, mode: m, cock: W.Q.COCK.ready }')
    if r['ph'] == 'pick': break
print(r); time.sleep(1.2); shot('gt2-pick')
info = t.ev('''const f = document.querySelector(".gt iframe"), r = f.getBoundingClientRect(); return { rect: [r.left, r.top, r.width, r.height], hit: (() => { const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return e.tagName; })() }''')
print(info)
L, Tp, Wd, Hd = info['rect']; k = Wd / 1280
def tap(sel, wait=1.3):
    r = t.ev('const d = document.querySelector(".gt iframe").contentWindow.document, e = d.querySelector(%s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width]' % json.dumps(sel))
    if not r or not r[2]: print('missing', sel); return False
    t.click(L + r[0] * k, Tp + r[1] * k); time.sleep(wait); return True
tap('#searchQ'); print('after search tap:', t.ev('return document.querySelector(".gt iframe").contentWindow.GT.S.nav.mode'))
tap('#results [data-cat="cafe"]', 1.6); tap('#results [data-pick="2"]', 1.6); shot('gt2-place'); tap('#placeCard [data-pc="route"]', 2.2); tap('#routeCard [data-rc="start"]', 1.2)
time.sleep(1.2); shot('gt2-warp'); print(t.ev('return { ph: window.__world.Q.CAR.phase, year: document.querySelector(".gt__year").innerText }'))
time.sleep(3.5); shot('gt2-drive')
for i in range(20):
    time.sleep(1.5)
    r = t.ev('const W = window.__world; return { ph: W.Q.CAR.phase, say: document.querySelector("[data-world-say-text]").textContent.slice(0, 60) }')
    if r['ph'] in ('scan', 'parked'): break
print(r); shot('gt2-scan')
for i in range(22):
    time.sleep(1.5)
    r = t.ev('const W = window.__world; return { ph: W.Q.CAR.phase }')
    if r['ph'] == 'parked': break
print(r); shot('gt2-parked')
b = t.ev('const b = document.querySelector(".gt__back"), r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, b.hidden]'); print(b)
t.click(b[0], b[1]); time.sleep(3.5); shot('gt2-out')
print(t.ev('const W = window.__world; return { done: [...W.Q.done], on: W.Q.CAR.on, cta: document.querySelector("[data-world-place]").innerText, card: document.querySelector("[data-world-card]").innerText }'))
print(sheet(names, 'sheet-gt2', 4))
print(t.logs())
