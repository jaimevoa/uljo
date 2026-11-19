import sys, time; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.nav('http://localhost:4322/index.html?mute')
time.sleep(7)
top = t.ev('const e = document.querySelector("#work"); return e.getBoundingClientRect().top + scrollY')
names = []
t.shot('h1-00', 60, .5); names.append('h1-00')
for k in (.12, .25, .4, .55, .7, .85):
    t.ev('window.scrollTo(0, %f)' % (top * k)); time.sleep(.8); n = 'h1-dive-%02d' % int(k * 100); t.shot(n, 60, .5); names.append(n)
vh = 900
t.ev('window.scrollTo(0, %f)' % (top + vh * -.2)); time.sleep(.5); t.shot('h1-t0', 60, .5); names.append('h1-t0')
time.sleep(.9); t.shot('h1-t1', 60, .5); names.append('h1-t1')
time.sleep(1.2); t.shot('h1-t2', 60, .5); names.append('h1-t2')
for i, k in enumerate((.15, 1.0, 1.3, 1.6, 2.0, 2.3)):
    t.ev('window.scrollTo(0, %f)' % (top + vh * k)); time.sleep(1.0); n = 'h1-lab-%02d' % i; t.shot(n, 60, .5); names.append(n)
print(sheet(names, 'sheet-home1', 4))
print(t.logs())
