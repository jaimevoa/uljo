"""pass 91: Playground pressed early opens the planet (never the space game); the square map; the glass E button;
   the house as before; the phone answered without ringing"""
import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.p.call('Network.enable'); t.p.call('Network.setCacheDisabled', cacheDisabled=True)
t.nav('http://localhost:4322/index.html?mute&x=%d' % int(time.time())); time.sleep(1.2)
# pressed at once, while the planet is still loading
b = t.ev('const a = document.querySelector(".hero-menu__item[data-world-play]"); if (!a) return null; const r = a.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, !!window.__world]')
print('early press at', b); t.click(b[0], b[1])
for i in range(30):
    time.sleep(.5)
    r = t.ev('return [location.pathname, location.hash, !!window.__world, window.__world ? window.__world.mode : null]')
    if r[3] == 'walk' or r[0] != '/index.html': break
print('after the early press:', r, 'in %.1f s' % ((i + 1) * .5))
t.pump(1.5)
names = []
def shot(n, s=.5): t.shot(n, 84, s); names.append(n)
shot('g-map')
print('E button:', t.ev('const g = document.querySelector(".world-go"), cs = getComputedStyle(g); return [cs.backgroundColor, cs.color, cs.backdropFilter || cs.webkitBackdropFilter, getComputedStyle(g.querySelector("kbd")).backgroundColor]'))
# the phone: E by it goes to Keep in touch at once
t.ev('const W = window.__world; window.__rang = 0; const rs = W.ring; return 1')
t.ev('const W = window.__world; W.enterPlace(W.PLACES.find((p) => p.id === "contact")); return [W.ring.on]')
print('phone ringing after E:', t.ev('return window.__world.ring.on'))
time.sleep(.3)
try:
    for i in range(12):
        t.pump(.25)
        if t.ev('return location.pathname') != '/index.html': break
except Exception: pass
time.sleep(1.5)
print('after the phone:', t.ev('return location.pathname'))
# the house, as before
t.nav('http://localhost:4322/index.html?mute&x=%d#playground' % int(time.time())); time.sleep(9); t.pump(1)
print('hash start:', t.ev('return window.__world.mode'))
t.ev('const W = window.__world; W.enterPlace(W.PLACES.find((p) => p.id === "lab")); return 1')
seq = []
for i in range(14):
    t.pump(.25); r = t.ev('return [window.__world.inside.on, document.body.classList.contains("is-landing")]'); seq.append(r)
    if i in (3, 6): shot('g-house%d' % i)
print('house (inside, dark):', seq)
print(sheet(names, 'sheet-g91', 3, 82)); print([str(l)[:220] for l in t.logs() if 'rror' in str(l)][:6])
