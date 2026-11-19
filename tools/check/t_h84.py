"""pass 84: the scroll waits for the lab's name; "Lab" under the g; the fireflies; the why section with its photograph"""
import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.nav('http://localhost:4322/index.html?mute&x=%d' % int(time.time())); time.sleep(8)
names = []
def shot(n, s=.5): t.shot(n, 86, s); names.append(n)
L = t.ev('const L = window.__lab, sec = document.querySelector(".lab"); return { top: sec.getBoundingClientRect().top + scrollY, T3: L.T3, T4: L.T4, T1: L.SEG.title }')
print(L)
top = L['top']; go = lambda s: t.ev('window.scrollTo(0, %f); return 1' % (top + s * 900))
S = 'const sec = document.querySelector(".lab"), n = document.querySelector(".lab__name"); return [+(-sec.getBoundingClientRect().top / innerHeight).toFixed(3), n.style.getPropertyValue("--fill"), n.style.getPropertyValue("--lab-dx")]'
go(-.6); time.sleep(1.2)
print('before:', t.ev(S))
# a hand on the wheel: 120 px every 60 ms for 3 s
log = []; t0 = time.time()
while time.time() - t0 < 3.2:
    t.wheel(720, 450, 120); time.sleep(.06)
    log.append((round(time.time() - t0, 2),) + tuple(t.ev(S)[:2]))
for row in log[::3]: print(row)
held = [r for r in log if r[2] and float(r[2]) < 1]
print('max s while the name was still filling:', max([r[1] for r in held] or [None]), '(T1 =', L['T1'], ')  | s at the end:', log[-1][1])
# the g and the a
go(.1); time.sleep(2.5)
al = t.ev('''const g = document.querySelector(".lab__g"), lab = document.querySelector(".lab__name").children[1], tn = lab.firstChild;
  const r = document.createRange(); r.setStart(tn, 1); r.setEnd(tn, 2); const a = r.getBoundingClientRect(), gr = g.getBoundingClientRect();
  r.setStart(tn, 0); r.setEnd(tn, 1); const l = r.getBoundingClientRect(); r.setStart(tn, 2); r.setEnd(tn, 3); const b = r.getBoundingClientRect();
  return { g: [gr.left, gr.right], L: [l.left, l.right], a: [a.left, a.right], b: [b.left, b.right], dgc: (gr.left + gr.right) / 2 - (a.left + a.right) / 2 }''')
print('align:', json.dumps(al))
shot('h84-title', .6)
# the why, with the photograph
go(L['T3'] + .3); time.sleep(2); shot('h84-why')
go(L['T4'] + .5); time.sleep(1.5); shot('h84-flies')
print(sheet(names, 'sheet-h84', 3, 84)); print([str(l)[:200] for l in t.logs() if 'rror' in str(l)][:5])
