import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T
t = T(1440, 900)
t.p.call('Page.addScriptToEvaluateOnNewDocument', source='''window.__lt = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
  window.__fr = []; (function f(t){ window.__fr.push(Math.round(t)); if (t < 4000) requestAnimationFrame(f); })(0);''')
t.nav('http://localhost:4322/index.html?mute&x=%d' % int(time.time()), 30); time.sleep(1.0); t.shot('in-a', 85, .5); time.sleep(.25); t.shot('in-b', 85, .5); time.sleep(.3); t.shot('in-c', 85, .5); time.sleep(4.5)
print('long tasks (start ms, duration ms):', t.ev('return window.__lt'))
fr = t.ev('return window.__fr'); gaps = [(fr[i - 1], fr[i] - fr[i - 1]) for i in range(1, len(fr)) if fr[i] - fr[i - 1] > 60]
print('frame gaps > 60 ms (at, gap):', gaps)

print('world ready at', t.ev('return document.querySelector("[data-hero]").classList.contains("has-world")'))
