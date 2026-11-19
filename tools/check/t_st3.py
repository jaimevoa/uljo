import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.nav('http://localhost:4322/index.html?mute')
time.sleep(2); t.ev('sessionStorage.removeItem("uljo-quests"); return 1')
t.nav('http://localhost:4322/index.html?mute'); time.sleep(7)
t.ev('document.querySelector("[data-world-play]").click(); return 1'); time.sleep(4)
time.sleep(6)
def fps(tag):
    r = t.ev('''const W = window.__world; let n = 0; const t0 = performance.now(); await new Promise((ok) => { const f = () => { n++; if (performance.now() - t0 < 1500) requestAnimationFrame(f); else ok(); }; requestAnimationFrame(f); });
      return { fps: +(n / 1.5).toFixed(1), ms: +W.perf.ms.toFixed(1), calls: W.renderer.info.render.calls, tris: W.renderer.info.render.triangles, progs: W.renderer.info.programs.length, lvl: W.gov && W.gov.level }''')
    print(tag, r)
fps('outside')
t.ev('window.__world.Q.enterStudio(); return 1'); time.sleep(4)
fps('studio enter')
time.sleep(4); fps('studio +4s')
print(t.ev('const W = window.__world; return { ph: W.Q.ST.phase, t: +W.Q.ST.t.toFixed(1), lights: (() => { let n = 0; W.scene.traverse((o) => { if (o.isLight && o.visible) n++; }); return n; })() }'))
