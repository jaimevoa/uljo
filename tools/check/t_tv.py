"""pass 78: the television: its channels, zapped by the buttons under it and by its knobs"""
import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
w, h = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (1440, 900)
mob = w < 700; tag = 'tvm' if mob else 'tv'
t = T(w, h, 2 if mob else 1, mob)
t.nav('http://localhost:4322/about.html?x=%d' % int(time.time())); time.sleep(6)
names = []
def shot(n, s=.5): t.shot(n, 84, s); names.append(n)
errs = lambda: [str(l)[:220] for l in t.logs() if 'rror' in str(l) or 'uncaught' in str(l)]
y = t.ev('const e = document.querySelector(".tvfly__stage"); const r = e.getBoundingClientRect(); return Math.round(r.top + scrollY + r.height / 2 - innerHeight / 2 + 30)')
t.ev('window.scrollTo(0, %d); return 1' % y); time.sleep(3)
st = lambda: t.ev('''const T = window.__tv, c = T.chans[T.cur], s = document.querySelector("[data-tv]"); return { cur: T.cur, playing: c.playing, cover: !c.cover.hidden, film: c.video ? +c.video.currentTime.toFixed(2) : null, yt: c.player && c.player.getCurrentTime ? +c.player.getCurrentTime().toFixed(1) : null, state: c.player && c.player.getPlayerState ? c.player.getPlayerState() : null, cls: s.className.replace("stagevid__frame tvfly__screen", "").trim(), title: document.querySelector("[data-tv-title]").textContent, sub: document.querySelector("[data-tv-sub]").textContent, osd: document.querySelector("[data-tv-osd]").className + ":" + document.querySelector("[data-tv-osd]").textContent }''')
print('at rest:', st()); shot(tag + '-0')
kb = t.ev('const k = document.querySelector(".tvfly__knobs"), r = k.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return [r.left + r.width / 2, r.top + r.height / 2, Math.round(r.width), Math.round(r.height), e === k]')
print('knobs button:', kb)
nx = t.ev('const b = document.querySelector(".tvfly__zbtn[data-tv-next]"), r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return [r.left + r.width / 2, r.top + r.height / 2, !!(e && e.closest("[data-tv-next]"))]')
print('next button:', nx)
t.click(nx[0], nx[1]); time.sleep(.2); shot(tag + '-zap'); time.sleep(1.6); print('after a zap:', st()); shot(tag + '-ch2')
time.sleep(2.5); print('2.5 s later:', st()); shot(tag + '-ch2b')
t.click(kb[0], kb[1]); time.sleep(.25); shot(tag + '-zap2')
for k in range(12):
    time.sleep(1.0); s = st()
    if s['playing'] or s['state'] == 1: break
print('by its knobs, back to 1 (after', k + 1, 's):', s); time.sleep(2); print('2 s later:', st()); shot(tag + '-ch1')
print(sheet(names, 'sheet-' + tag, 3 if not mob else 6, 84))
print(errs(), t.ev('return [document.documentElement.scrollWidth, innerWidth]'))
