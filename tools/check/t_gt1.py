import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.nav('http://localhost:4322/index.html?mute')
time.sleep(7)
t.ev('document.querySelector("[data-world-play]").click(); return 1'); time.sleep(4)
t.ev('window.__world.step(200, 1/30); return 1'); time.sleep(1)
print(t.ev('const W = window.__world; W.Q.use({ id: "car" }); return W.Q.CAR.phase'))
for i in range(14):
    time.sleep(1.5)
    r = t.ev('const W = window.__world, f = document.querySelector(".gt iframe"); let m = null; try { m = f.contentWindow.GT.S.nav.mode; } catch (e) {} return { ph: W.Q.CAR.phase, mode: m, busy: W.Q.busy }')
    if r['ph'] == 'pick': break
print(r)
t.shot('gt1-pick', 75)
info = t.ev('''const f = document.querySelector(".gt iframe"), r = f.getBoundingClientRect(); const pts = [[.5,.5],[.5,.12],[.2,.5],[.08,.3]];
  return { rect: [r.left, r.top, r.width, r.height], hit: pts.map(p => { const x = r.left + r.width * p[0], y = r.top + r.height * p[1], e = document.elementFromPoint(x, y); return [Math.round(x), Math.round(y), e ? (e.tagName + '.' + (e.className || '').toString().slice(0, 40)) : null]; }),
    pe: getComputedStyle(f).pointerEvents, gtpe: getComputedStyle(document.querySelector('.gt')).pointerEvents, z: getComputedStyle(document.querySelector('.gt')).zIndex,
    chain: (() => { const out = []; let e = f; while (e && e !== document.body) { const cs = getComputedStyle(e); out.push(e.className.toString().slice(0, 30) + ' pe:' + cs.pointerEvents + ' z:' + cs.zIndex + ' pos:' + cs.position); e = e.parentElement; } return out; })() }''')
print(json.dumps(info, indent=1))
