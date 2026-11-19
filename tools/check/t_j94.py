"""pass 94: the journal opens quicker — frames from the press"""
import sys, time; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900); t.p.call('Network.enable'); t.p.call('Network.setCacheDisabled', cacheDisabled=True)
t.nav('http://localhost:4322/about.html?mute&x=%d' % int(time.time())); time.sleep(7)
y = t.ev('const e = document.querySelector(".journal__btn"); return e.getBoundingClientRect().top + scrollY')
t.ev('window.scrollTo({ top: %f, behavior: "instant" }); return 1' % (y - 450)); time.sleep(2.5)
b = t.ev('const e = document.querySelector(".journal__btn"), r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]')
t.click(b[0], b[1]); t0 = time.time(); names = []; opened = None
for k in range(10):
    time.sleep(.2); n = 'j%d' % k; t.shot(n, 80, .4); names.append(n)
    st = t.ev('const D = window.__den.journal.state; return [D.open, document.querySelector(".jbook__leaf--cover").classList.contains("is-flipped")]')
    if st[0] and opened is None: opened = round(time.time() - t0, 2)
print('open after ~%s s' % opened)
print(sheet(names, 'sheet-j94', 5, 80)); print([str(l)[:200] for l in t.logs() if 'rror' in str(l)][:5])
