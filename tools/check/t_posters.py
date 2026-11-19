"""pass 78: the posters arrive folded: frames along the scroll"""
import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
w, h = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (1440, 900)
t = T(w, h, 2 if w < 700 else 1, w < 700)
t.nav('http://localhost:4322/index.html?mute'); time.sleep(7)
info = t.ev('const p = document.querySelector(".unfold"); if (!p) return null; const r = p.getBoundingClientRect(); return { top: r.top + scrollY, h: r.height, vh: innerHeight }')
print(info)
names = []; tag = 'po' if w >= 700 else 'pom'
span = info['h'] - info['vh']
for k, p in enumerate((-.25, -.08, 0, .1, .2, .3, .4, .5, .6, .7, .8, .9, .95, 1.0, 1.08)):
    t.ev('window.scrollTo(0, %f); return 1' % (info['top'] + span * p)); time.sleep(.9)
    nm = '%s-%02d' % (tag, k); t.shot(nm, 84, .5); names.append(nm)
    if p in (0, .5, .95, 1.0):
        print(p, t.ev('const f = document.querySelector(".pfold"), c = document.querySelector("[data-carousel=poster]"), r = f.getBoundingClientRect(), i = c.querySelector(".slide[data-pos=\\"0\\"] img").getBoundingClientRect(); const cs = getComputedStyle(f); return { a: cs.getPropertyValue("--a"), b: cs.getPropertyValue("--b"), g: cs.getPropertyValue("--g"), cls: c.className, fold: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], img: [Math.round(i.left), Math.round(i.top), Math.round(i.width), Math.round(i.height)], gone: f.className }'))
print(sheet(names, 'sheet-' + tag, 5 if w >= 700 else 8, 82))
print(t.ev('return [document.documentElement.scrollWidth, innerWidth]'), [str(l)[:200] for l in t.logs() if 'rror' in str(l)][:4])
