import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.nav('http://localhost:4322/index.html?mute'); time.sleep(9)
names = []
def shot(n): t.shot(n, 80, .5); names.append(n)
shot('tr-hero')
print(t.ev('const W = window.__world; return { tris: W.renderer.info.render.triangles, ms: +W.perf.ms.toFixed(1), parts: W.planetParts.length, verts: W.planetParts[0].geometry.attributes.position.count }'))
t.ev('document.querySelector("[data-world-play]").click(); return 1'); time.sleep(7)
# walk about: a few places among the trees, like his screenshot
spots = [((.5, 3.2), (-3.5, .5)), ((1, 2), (-1, -4.5)), ((-1.5, 1), (-5, -2)), ((2, -1), (6, 3)), ((6.4, 6.0), (7.2, 10.5)), ((-3, 3), (-7, 6))]
for i, (a, b) in enumerate(spots):
    t.ev('const W = window.__world; W.player.n.copy(W.at(%f, %f)); W.player.fwd.copy(W.at(%f, %f)).sub(W.player.n).normalize(); W.cam.f.copy(W.player.fwd); return 1' % (a + b))
    time.sleep(2.2); shot('tr-%d' % i)
print(t.ev('''const W = window.__world; let n = 0; const t0 = performance.now(); await new Promise((ok) => { const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else ok(); }; requestAnimationFrame(f); });
  return { fps: n / 2, ms: +W.perf.ms.toFixed(1), tris: W.renderer.info.render.triangles, lvl: W.gov.level }'''))
print(sheet(names, 'sheet-trees', 4))
print(t.logs())
