"""pass 85: his new Manic GT inside the home page's tablet: the demo plays through (search, route, drive, a spot's chip, parked, phone, profile)"""
import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.p.call('Network.enable'); t.p.call('Network.setCacheDisabled', cacheDisabled=True)
t.nav('http://localhost:4322/index.html?mute&x=%d' % int(time.time())); time.sleep(8)
i = t.ev('return window.__lab.devs.findIndex((d) => d.item.querySelector(".dev--gt"))')
land = t.ev('return window.__lab.landOf(%d)' % i); print('gt index', i, 'lands at', land)
t.ev('window.__go(%f); return 1' % (land + .15)); time.sleep(1)
S = '''const f = document.querySelector(".dev--gt iframe"); let w; try { w = f.contentWindow; } catch (e) { return "no frame"; }
  if (!w || !w.GT) return ["loading", f.src.split("/").slice(-3).join("/")];
  const d = w.document, D = w.GT.S.drive; const v = [...d.querySelectorAll(".view.on, .view.open, [data-view].on")].map((e) => e.id || e.className).slice(0, 3);
  return [D ? D.ph : "-", d.querySelectorAll("#tags .bay").length, v.join(","), !!d.querySelector(".searching, #app.searching"), (d.querySelector("#placeCard:not([hidden])") ? "place " : "") + (d.querySelector("#routeCard:not([hidden])") ? "route" : "")]'''
names = []; t0 = time.time(); last = None
while time.time() - t0 < 95:
    r = t.ev(S)
    if r != last: print(round(time.time() - t0, 1), r); last = r
    k = int(time.time() - t0)
    if k in (8, 20, 35, 50, 65, 80) and ('g%d' % k) not in names: t.shot('g%d' % k, 86, .5); names.append('g%d' % k)
    time.sleep(.5)
print(sheet(names, 'sheet-gt85', 3, 84)); print([str(l)[:220] for l in t.logs() if 'rror' in str(l)][:6])
