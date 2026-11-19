"""pass 92: Try prototype pressed while the device still turns (in, or away): it comes to rest and opens"""
import sys, time; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900); t.p.call('Network.enable'); t.p.call('Network.setCacheDisabled', cacheDisabled=True)
t.nav('http://localhost:4322/index.html?mute&x=%d' % int(time.time())); time.sleep(8)
names = []
for label, key, i, pick in (('turning in', 're', 0, lambda L: L['start'] + (L['land'] - L['start']) * .82), ('turning away', 'to', 1, lambda L: L['land'] + .4 + .04), ('Case study, turning in', 'ec', 2, lambda L: L['start'] + (L['land'] - L['start']) * .85)):
    L = t.ev('const L = window.__lab; return { start: L.startOf(%d), land: L.landOf(%d) }' % (i, i))
    t.ev('window.__go(%f); return 1' % pick(L)); time.sleep(.6)
    sel = '.show__cta' if 'Case' in label else '.show__try'
    b = t.ev('const it = document.querySelector(".show__item--%s"), b = it.querySelector("%s"), r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return [r.left + r.width / 2, r.top + r.height / 2, !!(e && e.closest("%s")), window.__lab.devs[%d].state]' % (key, sel, sel, i))
    print(label, '| button', b[:3], 'state', b[3])
    t.click(b[0], b[1]); time.sleep(1.4)
    r = t.ev('const it = document.querySelector(".show__item--%s"); return [window.__lab.devs[%d].state, it.classList.contains("is-stage"), !!document.querySelector(".case-sheet")]' % (key, i))
    print('   -> state %s, opened: %s, case sheet: %s' % tuple(r))
    n = 'try-%s' % key; t.shot(n, 82, .5); names.append(n)
    t.key('Escape'); time.sleep(1.6)
print(sheet(names, 'sheet-try92', 3, 82)); print([str(l)[:200] for l in t.logs() if 'rror' in str(l)][:5])
