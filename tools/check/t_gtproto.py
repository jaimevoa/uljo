import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1280, 832)
t.nav('http://localhost:4322/assets/proto/manic-gt/index.html')
time.sleep(5)
def tap(sel, wait=1.2):
    r = t.ev('const e = document.querySelector(%s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width]' % json.dumps(sel))
    if not r or not r[2]: print('missing', sel); return False
    t.click(r[0], r[1]); time.sleep(wait); return True
print(t.ev('return { ready: typeof GEO !== "undefined" && GEO.ready, view: GT.S.view }'))
tap('.rail-btn[data-go="nav"]'); tap('#searchQ'); tap('#results [data-cat="cafe"]', 1.5); tap('#results [data-pick="2"]', 1.5); tap('#placeCard [data-pc="route"]', 2.0); tap('#routeCard [data-rc="start"]', 1.5)
names = []
mind = 1e9
for i in range(16):
    time.sleep(1.1)
    r = t.ev('''const w = GT.world, D = GT.S.drive; if (!w || !D) return null; const P = w.cp, v = new THREE.Vector3(P.x, .8, P.z).project(w.cam);
      let md = 1e9; for (const a of w.agents) if (a.rd && a.mesh.visible) { const d = Math.hypot(a.mesh.position.x - P.x, a.mesh.position.z - P.z); if (d < md) md = d; }
      return { ph: D.ph, ndc: [+v.x.toFixed(2), +v.y.toFixed(2)], md: +md.toFixed(1), agents: w.agents.filter(a => a.rd).length, eff: w.eff }''')
    print(r)
    if r and r['md'] < mind: mind = r['md']
    if i % 3 == 0: n = 'gtp-%d' % i; t.shot(n, 70, .5); names.append(n)
    if r and r['ph'] in ('cruise', 'stopped', 'arrived', 'parked'): break
print('closest another car came:', mind)
t.shot('gtp-end', 70, .5); names.append('gtp-end')
print(sheet(names, 'sheet-gtproto', 3))
print(t.logs())
