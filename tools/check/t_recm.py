"""pass 77: the Recyco mission on a phone held upright, and on a small laptop: is the phone on the right, whole, and he on the left?"""
import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
names = []
for (w, h, dpr, mob, tag) in ((390, 844, 2, True, 'p'), (844, 390, 2, True, 'l'), (1180, 700, 1, False, 's')):
    t = T(w, h, dpr, mob)
    t.nav('http://localhost:4322/index.html?mute'); time.sleep(2)
    t.ev('sessionStorage.removeItem("uljo-quests"); return 1')
    t.nav('http://localhost:4322/index.html?mute'); time.sleep(9)
    t.ev('document.querySelector("[data-world-play]").click(); return 1'); time.sleep(10)
    t.ev('''const W = window.__world, Q = W.Q; Q.done.add('trackon'); Q.BAT.list.forEach((b) => { b.got = 1; b.g.visible = false; }); Q.BAT.got = Q.BAT.list.length;
      const pl = Q.BAT.list[Q.BAT.list.length - 1]; W.player.n.copy(pl.dir); W.player.h = pl.r - (9.5 + W.player.dip); W.sayDone && W.sayDone(); return 1''')
    time.sleep(2.5); print(tag, 'cta:', t.ev('const e = document.querySelector("[data-world-place]"); return [e.hidden, e.innerText]'))
    t.shot('rcm-%s-0' % tag, 80, .5 if mob else .6)
    t.key('KeyE'); time.sleep(5)
    info = t.ev('const p = document.querySelector(".rp"); if (!p) return null; const r = p.getBoundingClientRect(), f = p.querySelector("iframe"), fr = f ? f.getBoundingClientRect() : null; return { hidden: p.hidden, cls: p.className, box: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], frame: fr ? [Math.round(fr.left), Math.round(fr.top), Math.round(fr.right), Math.round(fr.bottom)] : null, vw: [innerWidth, innerHeight], sw: document.documentElement.scrollWidth }')
    print(tag, info, '| phase', t.ev('return window.__world.Q.BULB.phase'))
    t.shot('rcm-%s-1' % tag, 80, .5 if mob else .6); names += ['rcm-%s-0' % tag, 'rcm-%s-1' % tag]
    print([str(l)[:160] for l in t.logs() if 'rror' in str(l)][:3])
