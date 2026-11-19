"""pass 89: My Universe — its title written in outline then white, 20 px higher; the scroll word; the TV headline per channel; Open journal keeps its size"""
import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.p.call('Network.enable'); t.p.call('Network.setCacheDisabled', cacheDisabled=True)
t.nav('http://localhost:4322/about.html?mute&x=%d' % int(time.time())); time.sleep(7)
names = []
def shot(n, s=.5): t.shot(n, 84, s); names.append(n)
shot('u0')
print('scroll sign:', t.ev('const w = document.querySelector(".eclipse__scroll .scroll-sign__word"), s = document.querySelector(".eclipse__scroll svg"); return [w.textContent, Math.round(w.getBoundingClientRect().top), Math.round(s.getBoundingClientRect().bottom), innerHeight]'))
H = t.ev('return document.querySelector("[data-eclipse]").getBoundingClientRect().height')
# scroll until the title comes, sampling its outline/fill
for k in range(1, 30):
    t.ev('window.scrollTo(0, %f); return 1' % (k * 60)); time.sleep(.12)
    r = t.ev('const h = document.getElementById("about-title"), w = h.closest(".eclipse__words"); return [+getComputedStyle(w).opacity, h.classList.contains("is-drawn")]')
    if r[1]: print('drawn from scroll', k * 60, r); break
for i, w in enumerate((.25, .45, .45, .8)):
    time.sleep(w)
    print(t.ev('const h = document.getElementById("about-title"), cs = getComputedStyle(h); return [cs.getPropertyValue("--dv-draw"), cs.getPropertyValue("--dv-fill"), cs.color, cs.webkitTextStroke || cs.getPropertyValue("-webkit-text-stroke-color")]'))
    shot('u-title%d' % i)
# the journal button: its width before and while the pointer is on it
y = t.ev('const e = document.querySelector(".journal__btn"); return e.getBoundingClientRect().top + scrollY')
t.ev('window.scrollTo(0, %f); return 1' % (y - 450)); time.sleep(2.5)
b = t.ev('const e = document.querySelector(".journal__btn"), r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, Math.round(r.width)]')
t.move(b[0], b[1]); time.sleep(.6)
print('journal button width: before', b[2], 'hovered', t.ev('return Math.round(document.querySelector(".journal__btn").getBoundingClientRect().width)'))
# the television
y = t.ev('const e = document.querySelector(".tvfly__h"); return e.getBoundingClientRect().top + scrollY')
t.ev('window.scrollTo(0, %f); return 1' % (y - 400)); time.sleep(2.5)
print('tv head:', t.ev('return document.querySelector(".tvfly__h").textContent')); shot('u-tv0')
z = t.ev('const e = document.querySelector(".tvfly__zap"), r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]')
t.click(z[0], z[1]); time.sleep(1.2)
print('after zap:', t.ev('return document.querySelector(".tvfly__h").textContent')); shot('u-tv1')
t.click(z[0], z[1]); time.sleep(1)
print('after zap 2:', t.ev('return document.querySelector(".tvfly__h").textContent'))
print(sheet(names, 'sheet-u89', 4, 82)); print([str(l)[:220] for l in t.logs() if 'rror' in str(l)][:6])
