import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.nav('http://localhost:4322/index.html?mute')
time.sleep(2); t.ev('sessionStorage.removeItem("uljo-quests"); return 1')
t.nav('http://localhost:4322/index.html?mute'); time.sleep(7)
t.ev('document.querySelector("[data-world-play]").click(); return 1'); time.sleep(4)
time.sleep(6)
t.ev('window.__world.Q.enterStudio(); return 1')
for i in range(14):
    time.sleep(1.0)
    if t.ev('return window.__world.Q.ST.phase') == 'brief': break
t.key('KeyE'); time.sleep(6.5)
print(t.ev('const W = window.__world; return { ph: W.Q.ST.phase, step: W.Q.ST.step }'))
fr = t.ev('const f = document.querySelector(".tq iframe"), r = f.getBoundingClientRect(); return [r.left, r.top, r.width]')
L, Tp, k = fr[0], fr[1], fr[2] / 402
def tap(sel, wait=1.3):
    r = t.ev('const d = document.querySelector(".tq iframe").contentWindow.document, e = d.querySelector(%s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width]' % json.dumps(sel))
    if not r or not r[2]: print('missing', sel); return False
    t.click(L + r[0] * k, Tp + r[1] * k); time.sleep(wait); return True
t.ev('window.__k = []; window.addEventListener("keydown", (e) => window.__k.push("top:" + e.code + ":" + e.isTrusted), true); const w = document.querySelector(".tq iframe").contentWindow; w.addEventListener("keydown", (e) => window.__k.push("frame:" + e.code), true); return 1')
tap('#dRec', 2.0)
print(t.ev('const W = window.__world; return { active: document.activeElement.tagName, rec: W.Q.ST.recording, step: W.Q.ST.step, recState: document.querySelector(".tq iframe").contentWindow.eval("Rec.state") }'))
t.key('KeyA'); time.sleep(.8); t.key('KeyS'); time.sleep(.8)
print(t.ev('const W = window.__world; return { k: window.__k, count: W.Q.ST.count, rec: W.Q.ST.recording, step: W.Q.ST.step }'))
