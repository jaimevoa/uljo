"""pass 77: My Universe on a phone: the journal stays whole in the picture, whatever the moment of its drift"""
import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(390, 844, 2, True)
t.nav('http://localhost:4322/about.html?mute'); time.sleep(6)
y = t.ev('const e = document.querySelector(".journal"); return Math.round(e.getBoundingClientRect().top + scrollY + e.getBoundingClientRect().height / 2 - 422)')
t.ev('window.scrollTo(0, %d)' % y); time.sleep(1.5)
names = []
info = t.ev('const s = window.__den && window.__den.journal; return s ? { W: s.W, H: s.H } : null'); print('stage', info)
for k, tt in enumerate((4, 14.3, 28.6, 42, 57, 71)):      # sin(t * .11) = ±1 near t = 14.3, 42.8, 71.4
    t.ev('const s = window.__den.journal; s.tick(0, %f); s.draw(); return 1' % tt); time.sleep(.25)
    r = t.ev('const b = document.querySelector("[data-journal-open]").getBoundingClientRect(); return [Math.round(b.left + b.width / 2), Math.round(b.top + b.height / 2)]')
    nm = 'abj-%d' % k; t.shot(nm, 80, .5); names.append(nm); print(tt, 'button at', r)
print(sheet(names, 'sheet-aboutj', 6, 82))
print(t.ev('return document.documentElement.scrollWidth'), [str(l)[:160] for l in t.logs() if 'rror' in str(l)][:3])
