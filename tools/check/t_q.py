import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T
t = T(1440, 900)
t.nav('http://localhost:4322/index.html?mute')
time.sleep(6)
top = t.ev('const e = document.querySelector("#work"); return e.getBoundingClientRect().top + scrollY')
t.ev('window.scrollTo(0, %f)' % (top + 900 * .15)); time.sleep(3.2)
print(json.dumps(t.ev('''const n = document.querySelector('.lab__name'), cs = getComputedStyle(n); return { cls: n.className, style: n.getAttribute('style'), bg: cs.backgroundImage.slice(0, 200), clip: cs.webkitBackgroundClip, color: cs.color, ts: cs.textShadow.slice(0, 200), filter: cs.filter, op: cs.opacity, anim: cs.animationName, html: n.innerHTML.slice(0, 200), sheets: [...document.styleSheets].map(s => s.href && s.href.split('/').pop()) }'''), indent=1))
