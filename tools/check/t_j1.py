"""pass 78: My Universe: the words above the trees, the journal opened and leafed through, closed again.
usage: t_j1.py [w h]"""
import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
w, h = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (1440, 900)
mob = w < 700; tag = 'jm' if mob else 'j'
t = T(w, h, 2 if mob else 1, mob)
t.nav('http://localhost:4322/about.html?x=%d' % int(time.time())); time.sleep(7)
names = []
def shot(n, s=.5): t.shot(n, 84, s); names.append(n)
errs = lambda: [str(l)[:220] for l in t.logs() if 'rror' in str(l) or 'uncaught' in str(l)]
print('errors at load:', errs())
t.ev('window.scrollTo(0, innerHeight * 1.8); return 1'); time.sleep(3.5); shot(tag + '-hero')
print('words:', t.ev('const e = document.querySelector(".eclipse__words"), r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), b: getComputedStyle(e).getPropertyValue("--words-b") }'))
y = t.ev('const e = document.querySelector(".journalsec"); return Math.round(e.getBoundingClientRect().top + scrollY - (innerHeight - e.getBoundingClientRect().height) / 2)')
t.ev('window.scrollTo(0, %d); return 1' % y); time.sleep(2.5); shot(tag + '-closed')
st = lambda: t.ev('return window.__den.journal.state')
print('journal:', st(), '| cover picture:', t.ev('return (window.__den.journalCover || "").length'), '| ar', t.ev('return getComputedStyle(document.querySelector("[data-jbook]")).getPropertyValue("--ar")'))
b = t.ev('const b = document.querySelector(".journal__btn"), r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return [r.left + r.width / 2, r.top + r.height / 2, b.innerText, e === b]')
print('button:', b)
t.click(b[0], b[1])
for k in range(9):
    time.sleep(.38); shot('%s-open%d' % (tag, k))
time.sleep(1.2); print('opened:', st(), errs())
shot(tag + '-s0')
nb = lambda: t.ev('const b = document.querySelector("[data-jbook-next]"), r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, b.hidden]')
i = 0
while i < 20:
    q = nb()
    if q[2]: break
    t.click(q[0], q[1]); time.sleep(.5);
    if i == 0: shot(tag + '-turning')
    time.sleep(1.0); i += 1; shot('%s-s%d' % (tag, i))
print('turned to the end in', i, 'clicks:', st())
# back one by a click on the left page, then close
r = t.ev('const b = document.querySelector("[data-jbook-book]").getBoundingClientRect(); return [b.left, b.top, b.width, b.height]')
t.click(r[0] + r[2] * (.25 if not mob else .6), r[1] + r[3] * .5) if not mob else t.click(40, h / 2); time.sleep(1.4); print('after a click on the left page:', st())
c = t.ev('const b = document.querySelector(".jbook__close"), r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]')
t.click(c[0], c[1])
for k in range(6):
    time.sleep(.5); shot('%s-shut%d' % (tag, k))
time.sleep(1.5); print('closed:', st(), '| dialog hidden:', t.ev('return document.querySelector("[data-jbook]").hidden'), errs())
shot(tag + '-after')
print(sheet(names, 'sheet-' + tag, 6 if not mob else 9, 82))
print('page wide:', t.ev('return [document.documentElement.scrollWidth, innerWidth]'))
