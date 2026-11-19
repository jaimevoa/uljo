"""pass 89: the journal's first moments when it is opened (does it jump larger?)"""
import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.p.call('Network.enable'); t.p.call('Network.setCacheDisabled', cacheDisabled=True)
t.nav('http://localhost:4322/about.html?mute&x=%d' % int(time.time())); time.sleep(7)
y = t.ev('const e = document.querySelector(".journal__btn"); return e.getBoundingClientRect().top + scrollY')
t.ev('window.scrollTo(0, %f); return 1' % (y - 450)); time.sleep(3)
b = t.ev('const e = document.querySelector(".journal__btn"), r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]')
names = []
t.shot('j0', 80, .5); names.append('j0')
t.click(b[0], b[1]); t0 = time.time()
log = []
for i in range(16):
    n = 'j%d' % (i + 1); t.shot(n, 80, .5); names.append(n)
    log.append((round(time.time() - t0, 2), t.ev('const D = window.__den && window.__den.journal; const f = document.querySelector("[data-jbook-fly]"), b = document.querySelector("[data-jbook-book]"); const r = b.getBoundingClientRect(); return [D ? D.state.k.toFixed(2) : null, D ? D.state.pending : null, !document.querySelector("[data-jbook]").hidden, f.style.transform.slice(0, 60), Math.round(r.width) + "x" + Math.round(r.height)]')))
for l in log: print(l)
print(sheet(names[:12], 'sheet-j89', 4, 80))
