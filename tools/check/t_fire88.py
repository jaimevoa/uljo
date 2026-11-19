"""pass 88: the campfire fades with distance while he walks (and is whole on the title screen)"""
import sys, time, json, math; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T
t = T(1440, 900)
t.p.call('Network.enable'); t.p.call('Network.setCacheDisabled', cacheDisabled=True)
t.nav('http://localhost:4322/index.html?x=%d' % int(time.time())); time.sleep(8)
t.click(700, 600); time.sleep(3)
F = 'const f = window.__fire; return f ? { base: +f.gain.gain.value.toFixed(4), near: +f.near.gain.value.toFixed(3), now: +f.nearness().toFixed(3), master: +f.master.gain.value.toFixed(3), walking: document.body.classList.contains("is-walking") } : null'
print('title screen:', t.ev(F))
b = t.ev('const a = document.querySelector(".hero-menu__item[data-world-play]"), r = a.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]')
t.click(b[0], b[1]); time.sleep(7); t.pump(2)
print('walking, at the seat:', t.ev(F))
for deg in (25, 50, 90, 135, 175):
    a = math.radians(deg)
    t.ev('const W = window.__world; W.player.n.set(Math.sin(%f), Math.cos(%f), 0).normalize(); return 1' % (a, a))
    t.pump(1.2)
    r = t.ev(F); d = t.ev('const W = window.__world, e = W.me.matrixWorld.elements; return +Math.hypot(e[12] - W.FIRE.x, e[13] - W.FIRE.y, e[14] - W.FIRE.z).toFixed(2)')
    print('%3d deg from the fire, %5.2f m:' % (deg, d), r)
print([str(l)[:200] for l in t.logs() if 'rror' in str(l)][:5])
