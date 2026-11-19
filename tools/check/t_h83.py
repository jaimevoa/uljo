import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.nav('http://localhost:4322/index.html?mute&x=%d' % int(time.time())); time.sleep(9)
names = []
def shot(n, s=.5): t.shot(n, 86, s); names.append(n)
L = t.ev('const L = window.__lab, sec = document.querySelector(".lab"); return { top: sec.getBoundingClientRect().top + scrollY, T3: L.T3, T4: L.T4, P0: L.startOf(0) }')
print(L)
top = L['top']; go = lambda s: t.ev('window.scrollTo(0, %f); return 1' % (top + s * 900))
go(L['T3'] + .3); time.sleep(2); shot('h83-why')
for k, d in enumerate((-.35, -.1, .15)):
    go(L['T4'] + d); time.sleep(1); shot('h83-out%d' % k)
info = t.ev('const c = document.querySelector("[data-carousel=poster]"); const r = c.getBoundingClientRect(); return [r.top + scrollY, r.height]')
t.ev('window.scrollTo(0, %f); return 1' % (info[0] + info[1] / 2 - 450)); time.sleep(1.5); shot('h83-po0')
nx = t.ev('const b = document.querySelector("[data-carousel-next]"), r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return [r.left + r.width / 2, r.top + r.height / 2, !!(e && e.closest("[data-carousel-next]"))]')
print('next arrow:', nx)
t.click(nx[0], nx[1]); time.sleep(1); shot('h83-po1')
print('title now:', t.ev('return document.querySelector("[data-carousel-title]").textContent'), '| lightbox open:', t.ev('return !document.querySelector("[data-lightbox]").hidden'))
print(sheet(names, 'sheet-h83', 3, 84)); print([str(l)[:200] for l in t.logs() if 'rror' in str(l)][:3])
