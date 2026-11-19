import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.nav('http://localhost:4322/index.html?mute&x=%d' % int(time.time())); time.sleep(.9); t.shot('h82-intro', 86, .5)
time.sleep(8)
names = ['h82-intro']
def shot(n): t.shot(n, 86, .5); names.append(n)
shot('h82-menu')
L = t.ev('const L = window.__lab, sec = document.querySelector(".lab"); return { top: sec.getBoundingClientRect().top + scrollY, starts: L.devs.map((d, i) => L.startOf(i)), lands: L.devs.map((d, i) => L.landOf(i)), cars: L.devs.map((d) => d.car) }')
print('cars:', L['cars'])
top = L['top']; go = lambda s: t.ev('window.scrollTo(0, %f); return 1' % (top + s * 900))
go(-.2); time.sleep(2.2); shot('h82-title')
i = 2; P, Ld = L['starts'][i], L['lands'][i]
for k, f in enumerate((.5, .85)):
    go(P + (Ld - P) * f); time.sleep(1); shot('h82-gt%d' % k)
go(Ld + .2); time.sleep(2.5); shot('h82-gt-landed')
info = t.ev('const p = document.querySelector(".unfold"); const r = p.getBoundingClientRect(); return { top: r.top + scrollY, h: r.height }')
span = info['h'] - 900
for k, f in enumerate((.3, .6, .95)):
    t.ev('window.scrollTo(0, %f); return 1' % (info['top'] + span * f)); time.sleep(1.2); shot('h82-po%d' % k)
b = t.ev('const b = document.querySelector("[data-poster-more]"), r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return [r.left + r.width / 2, r.top + r.height / 2, e === b, document.querySelector("[data-carousel-title]").textContent]')
print('learn more:', b)
t.click(b[0], b[1]); time.sleep(1.2); shot('h82-lightbox')
t.key('Escape'); time.sleep(.8)
t.ev('window.scrollTo(0, document.documentElement.scrollHeight); return 1'); time.sleep(1.5); shot('h82-end')
print(sheet(names, 'sheet-h82', 4, 84)); print([str(l)[:200] for l in t.logs() if 'rror' in str(l)][:3])
