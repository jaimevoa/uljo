"""pass 77: the Manic GT mission to its very end, with real clicks: in, pick a place, Start, the tunnel of years, the drive,
ManiScan, Park, parked, out of the car, the mission done, the telephone"""
import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.nav('http://localhost:4322/index.html?mute'); time.sleep(2)
t.ev('sessionStorage.removeItem("uljo-quests"); return 1')
t.nav('http://localhost:4322/index.html?mute'); time.sleep(8)
t.ev('document.querySelector("[data-world-play]").click(); return 1'); time.sleep(9)
names = []
def shot(n): t.shot(n, 78, .5); names.append(n)
say = lambda: t.ev('return document.querySelector("[data-world-say-text]").textContent')
print(t.ev('''const W = window.__world; W.Q.done.add('trackon'); W.Q.done.add('recyco'); const U = W.station.userData; const p = U.top.clone().addScaledVector(U.ez, 2.35).normalize(); W.player.n.copy(p); W.player.fwd.copy(U.dir).sub(p).normalize(); W.cam.f.copy(W.player.fwd); return { car: W.Q.CAR.loaded, free: +W.land.free(p).toFixed(2) }'''))
time.sleep(3); shot('g4-station'); print('cta:', t.ev('const e = document.querySelector("[data-world-place]"); return [e.hidden, e.innerText]'))
t.key('KeyE'); time.sleep(1.2); shot('g4-seat')
for i in range(16):
    time.sleep(1.5)
    r = t.ev('const W = window.__world; return { ph: W.Q.CAR.phase, u: +W.Q.COCK.u.toFixed(2), screen: document.querySelector(".gt").classList.contains("is-screen") }')
    if r['ph'] == 'pick': break
print(r, '|', say()); time.sleep(1.0); shot('g4-pick')
info = t.ev('const f = document.querySelector(".gt iframe"), r = f.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]')
L, Tp, Wd, Hd = info; k = Wd / 1280
def tap(sel, wait=1.3):
    r = t.ev('const d = document.querySelector(".gt iframe").contentWindow.document, e = d.querySelector(%s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width]' % json.dumps(sel))
    if not r or not r[2]: print('missing', sel); return False
    x, y = L + r[0] * k, Tp + r[1] * k
    hit = t.ev('const e = document.elementFromPoint(%f, %f); return e ? e.tagName + "." + e.className : null' % (x, y))
    if 'IFRAME' not in str(hit): print('   under the pointer for', sel, ':', hit)
    t.click(x, y); time.sleep(wait); return True
tap('#searchQ'); tap('#results [data-cat="cafe"]', 1.6); tap('#results [data-pick="2"]', 1.6); print('place |', say()); tap('#placeCard [data-pc="route"]', 2.2); print('route |', say()); tap('#routeCard [data-rc="start"]', 1.0)
time.sleep(.9); shot('g4-warp'); print('warp:', t.ev('return { ph: window.__world.Q.CAR.phase, year: document.querySelector(".gt__year").innerText }'), '|', say())
time.sleep(2.2); print('year then:', t.ev('return document.querySelector(".gt__year b").textContent'))
time.sleep(2.2); shot('g4-drive'); print('drive |', say())
t0 = time.time()
for i in range(40):
    time.sleep(1.5)
    r = t.ev('const W = window.__world; let ph = ""; try { ph = document.querySelector(".gt iframe").contentWindow.GT.S.drive.ph; } catch (e) {} return { ph: W.Q.CAR.phase, gt: ph }')
    if r['ph'] in ('scan', 'parked'): break
print(r, 'after', round(time.time() - t0), 's |', say()); time.sleep(2.5); shot('g4-scan')
# the visitor presses the screen's own Park button (if it is there), as soon as ManiScan has a place
for i in range(14):
    time.sleep(1.2)
    if tap('#parkAct [data-s="park"]', .2): print('Park pressed after', round((i + 1) * 1.2, 1), 's'); break
t0 = time.time()
for i in range(50):
    time.sleep(1.5)
    r = t.ev('const W = window.__world; let ph = ""; try { ph = document.querySelector(".gt iframe").contentWindow.GT.S.drive.ph; } catch (e) {} return { ph: W.Q.CAR.phase, gt: ph }')
    if r['ph'] == 'parked': break
print(r, 'after', round(time.time() - t0), 's |', say()); shot('g4-parked')
b = t.ev('const b = document.querySelector(".gt__back"), r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return [r.left + r.width / 2, r.top + r.height / 2, b.hidden, b.innerText, e && e.className]'); print('back button:', b)
t.click(b[0], b[1]); time.sleep(1.0); shot('g4-leaving'); time.sleep(3.2); shot('g4-out')
print(t.ev('const W = window.__world; return { done: [...W.Q.done], on: W.Q.CAR.on, busy: W.Q.busy, hud: document.querySelector(".world-hud, [data-world-quests]") ? (document.querySelector("[data-world-quests]") || document.querySelector(".world-hud")).innerText : null }'), '|', say())
time.sleep(6); shot('g4-after'); print('later |', say(), '| ring:', t.ev('const W = window.__world; return { ring: !!(W.phone && W.phone.ringing), cta: document.querySelector("[data-world-place]").innerText }'))
time.sleep(6); shot('g4-after2'); print('later still |', say())
print(sheet(names, 'sheet-gt4', 4, 80))
print([str(l)[:200] for l in t.logs() if 'rror' in str(l)][:5])
