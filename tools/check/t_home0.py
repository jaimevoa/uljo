import sys, time; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.nav('http://localhost:4322/index.html?mute')
time.sleep(7)
top = t.ev('const e = document.querySelector("#work"); return e.getBoundingClientRect().top + scrollY')
names = []
for k in (.2, .5, .8):
    t.ev('window.scrollTo(0, %f)' % (top * k)); time.sleep(.9); n = 'home-dive-%02d' % int(k * 100); t.shot(n, 60, .5); names.append(n)
vh = 900
for i, k in enumerate((.15, .3, .6, .9, 1.1, 1.3, 1.6, 1.9, 2.2)):
    t.ev('window.scrollTo(0, %f)' % (top + vh * k)); time.sleep(1.0); n = 'lab-%02d' % i; t.shot(n, 60, .5); names.append(n)
print(sheet(names, 'sheet-home0', 4))
print(t.logs())
