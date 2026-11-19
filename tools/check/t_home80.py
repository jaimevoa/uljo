import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.nav('http://localhost:4322/index.html?mute&x=%d' % int(time.time())); time.sleep(9)
names = []
def shot(n): t.shot(n, 86, .5); names.append(n)
shot('h80-menu')
L = t.ev('const L = window.__lab, sec = document.querySelector(".lab"); const i = L.devs.findIndex((d) => d.car); return { top: sec.getBoundingClientRect().top + scrollY, T3: L.T3, T4: L.T4, land: L.landOf(i), i }')
for k, f in enumerate((.12, .3, .5)):
    t.ev('window.scrollTo(0, %f); return 1' % (L['top'] * f)); time.sleep(1.4); shot('h80-dive%d' % k)
t.ev('window.scrollTo(0, %f); return 1' % (L['top'] + ((L['T3'] + L['T4']) / 2 - .05) * 900)); time.sleep(2.2); shot('h80-why')
t.ev('window.scrollTo(0, %f); return 1' % (L['top'] + (L['land'] - 1) * 900)); time.sleep(2.5)
t.ev('window.scrollTo(0, %f); return 1' % (L['top'] + (L['land'] + .15) * 900)); time.sleep(3); shot('h80-car')
b = t.ev('const b = document.querySelectorAll(".show__item")[%d].querySelector("[data-try]"), r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]' % L['i'])
t.click(b[0], b[1]); time.sleep(3); shot('h80-try')
print(t.ev('const it = document.querySelectorAll(".show__item")[%d]; return { cls: it.className, scrim: getComputedStyle(it.querySelector(".show__scrim")).opacity }' % L['i']))
print(sheet(names, 'sheet-h80', 4, 84)); print([str(l)[:200] for l in t.logs() if 'rror' in str(l)][:3])
