"""pass 93: Try prototype pressed mid-turn: it opens at once, from its turn (frames right after the press)"""
import sys, time; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900); t.p.call('Network.enable'); t.p.call('Network.setCacheDisabled', cacheDisabled=True)
t.nav('http://localhost:4322/index.html?mute&x=%d' % int(time.time())); time.sleep(8)
names = []
for key, i, frac in (('re', 0, .7), ('to', 1, .72)):
    L = t.ev('const L = window.__lab; return { start: L.startOf(%d), land: L.landOf(%d) }' % (i, i))
    t.ev('window.__go(%f); return 1' % (L['start'] + (L['land'] - L['start']) * frac)); time.sleep(.6)
    b = t.ev('const b = document.querySelector(".show__item--%s .show__try"), r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return [r.left + r.width / 2, r.top + r.height / 2, !!(e && e.closest(".show__try")), window.__lab.devs[%d].state]' % (key, i))
    print(key, 'button', b[2], 'state', b[3]); n = '%s-0' % key; t.shot(n, 80, .4); names.append(n)
    t.click(b[0], b[1])
    for k, w in enumerate((.08, .12, .16, .5)):
        time.sleep(w); n = '%s-%d' % (key, k + 1); t.shot(n, 80, .4); names.append(n)
    print('   ->', t.ev('const it = document.querySelector(".show__item--%s"), d = window.__lab.devs[%d]; return [d.state, it.classList.contains("is-stage"), !!d.toRest]' % (key, i)))
    t.key('Escape'); time.sleep(1.5)
print(sheet(names, 'sheet-try93', 5, 80)); print([str(l)[:200] for l in t.logs() if 'rror' in str(l)][:5])
