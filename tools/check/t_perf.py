"""pass 84: smoothness — long animation frames (LoAF) while a hand scrolls the page down with the wheel.
   python3 t_perf.py [index|about] [step px] [seconds]"""
import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T
page = sys.argv[1] if len(sys.argv) > 1 else 'index'
step = int(sys.argv[2]) if len(sys.argv) > 2 else 80
secs = float(sys.argv[3]) if len(sys.argv) > 3 else 40
t = T(1440, 900)
t.p.call('Network.enable'); t.p.call('Network.setCacheDisabled', cacheDisabled=True)
t.nav('http://localhost:4322/%s.html?mute&x=%d' % (page, int(time.time()))); time.sleep(1)
t.ev('''window.__loaf = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__loaf.push({ t: Math.round(e.startTime), d: Math.round(e.duration),
  b: Math.round(e.blockingDuration || 0), s: (e.scripts || []).slice(0, 2).map((x) => (x.sourceURL || '').split('/').pop() + ':' + (x.sourceFunctionName || x.invoker || '') + ' ' + Math.round(x.duration)) }); })
  .observe({ type: 'long-animation-frame', buffered: true }); } catch (e) { window.__loaf.err = String(e); } return 1''')
time.sleep(8)
t.ev('window.__sy = []; addEventListener("scroll", () => window.__sy.push([Math.round(performance.now()), Math.round(scrollY)]), { passive: true }); return 1')
load = t.ev('return window.__loaf.splice(0)')
print('load: %d long frames; worst' % len(load), sorted(load, key=lambda e: -e['d'])[:4])
y0 = t.ev('return scrollY'); t0 = time.time(); n = 0
while time.time() - t0 < secs:
    t.wheel(720, 450, step); n += 1; time.sleep(.12)
    if n % 25 == 0 and t.ev('return Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight - 2'): break
sc = t.ev('return window.__loaf.splice(0)')
print('scroll: %d wheel steps, %d px; %d long frames (>50 ms)' % (n, t.ev('return scrollY') - y0, len(sc)))
sy = t.ev('return window.__sy')
lab = t.ev('const s = document.querySelector(".lab"); return s ? [Math.round(s.getBoundingClientRect().top + scrollY), innerHeight] : null')
def where(ms):
    best = None
    for a, y in sy:
        if a <= ms: best = y
    return best
for e in sorted(sc, key=lambda e: -e['d'])[:8]:
    y = where(e['t']); e['scrollY'] = y
    if lab and y is not None: e['s_lab'] = round((y - lab[0]) / lab[1], 2)
    print('  ', e)
print([str(l)[:200] for l in t.logs() if 'rror' in str(l)][:5])
