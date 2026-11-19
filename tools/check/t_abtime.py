import sys, time; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T
t = T(1440, 900)
t.p.call('Page.addScriptToEvaluateOnNewDocument', source='''window.__seen = null; (function f(){ const s = document.querySelector('.eclipse--uljo'); if (s && s.classList.contains('has-world') && !window.__seen) window.__seen = Math.round(performance.now()); if (!window.__seen) requestAnimationFrame(f); })();''')
t.nav('http://localhost:4322/index.html?mute'); time.sleep(8)          # the home page warms the cache, as a visitor's would
t0 = time.time(); t.nav('http://localhost:4322/about.html?mute&x=%d' % int(t0)); time.sleep(6)
print('has-world at', t.ev('return window.__seen'), 'ms; canvas opacity transition', t.ev('return getComputedStyle(document.querySelector(".eclipse__world")).transitionDuration'))
