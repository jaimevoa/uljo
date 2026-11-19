"""pass 90: the game — no headline over E, where he is on the map, no missions, the music eased down, into the house
   without a dark screen, and into the water: quick, then My Universe opening on his face"""
import sys, time, json, math; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.p.call('Network.enable'); t.p.call('Network.setCacheDisabled', cacheDisabled=True)
t.nav('http://localhost:4322/index.html?x=%d' % int(time.time())); time.sleep(8)
t.click(700, 600); time.sleep(.5)
b = t.ev('const a = document.querySelector(".hero-menu__item[data-world-play]"), r = a.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]')
t.click(b[0], b[1]); time.sleep(8); t.pump(1.5)
names = []
def shot(n, s=.5): t.shot(n, 84, s); names.append(n)
shot('g-walk')
print('ui:', t.ev('const p = document.querySelector("[data-world-place]"); return [getComputedStyle(document.querySelector(".world-quests")).display, p.hidden, getComputedStyle(p.querySelector("b")).display, p.querySelector("span").textContent]'))
print('music:', t.ev('const W = window.__world; const m = W.music; if (!m.el) return "no music el"; m.el.currentTime = 100; await new Promise((r) => setTimeout(r, 600)); return [+m.vol.toFixed(3), +m.el.volume.toFixed(4), +m.el.currentTime.toFixed(1)]'))
# the house: as if E had been pressed by its door
print('house:', t.ev('const W = window.__world; W.enterPlace(W.PLACES.find((p) => p.id === "lab")); return 1'))
seq = []
for i in range(40):
    t.pump(.15)
    r = t.ev('const W = window.__world, x = document.querySelector(".world-xfade"); return [W.inside.on, document.body.classList.contains("is-landing"), x ? +getComputedStyle(x).opacity : null, +(+document.querySelector(".hero__world").style.filter.length)]')
    seq.append(r)
    if i in (4, 10, 16) or (r[0] and 'g-in0' not in names): shot('g-in%d' % i if i in (4, 10, 16) else 'g-in0')
    if r[0] and len([s for s in seq if s[0]]) > 6: break
print('house steps (inside, dark, xfade):', [s[:3] for s in seq[::3]], '| ever dark:', any(s[1] for s in seq))
t.pump(1); shot('g-inside')
# out again, then the water
t.ev('const W = window.__world; W.outside(); return 1'); t.pump(1)
t0 = time.time()
t.ev('const W = window.__world; W.enterPlace(W.PLACES.find((p) => p.id === "about")); return 1')
url = ''
while time.time() - t0 < 25:
    try:
        t.pump(.2); url = t.ev('return location.pathname')
    except Exception as e:
        url = 'nav'
    if url != '/index.html': break
print('to My Universe after %.1f s:' % (time.time() - t0), url)
time.sleep(.25)
try:
    for i in range(5):
        r = t.ev('const d = document.documentElement; return [d.className, getComputedStyle(document.body, "::after").opacity, getComputedStyle(document.body, "::after").backgroundImage.slice(0, 30)]')
        print('  about:', round(time.time() - t0, 1), r); t.shot('a%d' % i, 84, .5); names.append('a%d' % i); time.sleep(.35)
except Exception as e: print('about read failed', e)
print(sheet(names, 'sheet-g90', 4, 80)); print([str(l)[:220] for l in t.logs() if 'rror' in str(l)][:6])
