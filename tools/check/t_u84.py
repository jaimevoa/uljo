"""pass 84: My Universe — Open journal and Zap lower"""
import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet, OUT
t = T(1440, 900)
t.p.call('Network.enable'); t.p.call('Network.setCacheDisabled', cacheDisabled=True)
t.nav('http://localhost:4322/about.html?mute&x=%d' % int(time.time())); time.sleep(7)
names = []
for sel, n in (('.journal__btn', 'u84-journal'), ('.tvfly__zap', 'u84-tv')):
    y = t.ev('const e = document.querySelector("%s"); return e.getBoundingClientRect().top + scrollY' % sel)
    t.ev('window.scrollTo(0, %f); return 1' % (y - 450)); time.sleep(2.5)
    print(sel, t.ev('const e = document.querySelector("%s"), r = e.getBoundingClientRect(), c = getComputedStyle(e); return [Math.round(r.width), Math.round(r.height), c.padding, c.minHeight, c.fontSize]' % sel))
    t.shot(n, 86, .5); names.append(n)
print(sheet(names, 'sheet-u84', 2, 86)); print([str(l)[:200] for l in t.logs() if 'rror' in str(l)][:5])
