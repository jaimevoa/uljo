import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
import sys
hq = len(sys.argv) < 2
t = T(1440, 900)
t.nav('http://localhost:4322/index.html?mute' + ('' if hq else '&lowplanet')); time.sleep(9)
if not hq: pass
t.ev('document.querySelector("[data-world-play]").click(); return 1'); time.sleep(7)
for i, (a, b) in enumerate([((6.4, 6.0), (7.2, 10.5)), ((6.9, 9.0), (5.0, 13.0)), ((-1.5, 1), (-5, -2))]):
    t.ev('const W = window.__world; W.player.n.copy(W.at(%f, %f)); W.player.fwd.copy(W.at(%f, %f)).sub(W.player.n).normalize(); W.cam.f.copy(W.player.fwd); return 1' % (a + b))
    time.sleep(2.5); t.shot(('trh-%d' if hq else 'trl-%d') % i, 85, .7)
print(t.ev('return window.__world.planetParts[0].geometry.attributes.position.count'))
