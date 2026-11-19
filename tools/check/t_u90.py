"""pass 90: My Universe — the scroll waits for its title; the journal's pages inside the leather; the sounds asked for; the sky"""
import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.p.call('Network.enable'); t.p.call('Network.setCacheDisabled', cacheDisabled=True)
t.p.call('Page.addScriptToEvaluateOnNewDocument', source='window.__sfxLog = []; Object.defineProperty(window, "__uljoSfx", { configurable: true, set(f) { this.__sf = f; }, get() { return (n, o) => { window.__sfxLog.push([n, o && +(o.rate || 1).toFixed(2)]); }; } });')
t.nav('http://localhost:4322/about.html?mute&x=%d' % int(time.time())); time.sleep(7)
names = []
def shot(n, s=.5): t.shot(n, 84, s); names.append(n)
# a hand on the wheel, hard, from the top
log = []; t0 = time.time()
while time.time() - t0 < 4.5:
    t.wheel(720, 450, 300); time.sleep(.05)
    log.append((round(time.time() - t0, 2), t.ev('const h = document.getElementById("about-title"); return [Math.round(scrollY), h.classList.contains("is-drawn"), +getComputedStyle(h.closest(".eclipse__words")).opacity, getComputedStyle(h).getPropertyValue("--dv-fill")]')))
for l in log[::4]: print(l)
shot('u-title')
# the journal
y = t.ev('const e = document.querySelector(".journal__btn"); return e.getBoundingClientRect().top + scrollY')
t.ev('window.scrollTo({ top: %f, behavior: "instant" }); return 1' % (y - 450)); time.sleep(2.5)
print('buttons:', t.ev('return [Math.round(document.querySelector(".journal__btn").getBoundingClientRect().height), Math.round(document.querySelector(".tvfly__zap").getBoundingClientRect().height)]'))
b = t.ev('const e = document.querySelector(".journal__btn"), r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]')
t.click(b[0], b[1]); time.sleep(1.25); shot('j-closed'); time.sleep(.5); shot('j-opening'); time.sleep(2.2); shot('j-open')
print('journal:', t.ev('const R = (e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round); }; return { cover: R(document.querySelector(".jbook__coverface")), board: R(document.querySelector(".jbook__board")), page: R(document.querySelectorAll("[data-leaf]")[1]), endpaper: R(document.querySelector(".jbook__endpaper")) }'))
t.click(1100, 450); time.sleep(1.3); t.click(1100, 450); time.sleep(1.3); shot('j-turned')
t.key('Escape'); time.sleep(3)
# the television
y = t.ev('const e = document.querySelector(".tvfly__h"); return e.getBoundingClientRect().top + scrollY')
t.ev('window.scrollTo({ top: %f, behavior: "instant" }); return 1' % (y - 400)); time.sleep(2)
z = t.ev('const e = document.querySelector(".tvfly__zap"), r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]')
t.click(z[0], z[1]); time.sleep(1)
print('sounds asked for:', t.ev('return window.__sfxLog'))
# the sky, a few seconds of it
t.ev('window.scrollTo({ top: 0, behavior: "instant" }); return 1'); time.sleep(1)
for i in range(3): time.sleep(2.5); shot('sky%d' % i)
print(sheet(names, 'sheet-u90', 3, 82)); print([str(l)[:220] for l in t.logs() if 'rror' in str(l)][:6])
