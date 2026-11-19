import sys, time; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.nav('http://localhost:4322/index.html?mute')
time.sleep(7)
top = t.ev('const e = document.querySelector("#work"); return e.getBoundingClientRect().top + scrollY')
names = []
vh = 900
t.ev('window.scrollTo(0, %f)' % (top + vh * .1)); time.sleep(.7); t.shot('h2-t0', 70, .5); names.append('h2-t0')
time.sleep(2.6); t.shot('h2-t1', 70, .5); names.append('h2-t1')
for i, k in enumerate((1.25, 1.55)):
    t.ev('window.scrollTo(0, %f)' % (top + vh * k)); time.sleep(1.0); n = 'h2-lab-%02d' % i; t.shot(n, 70, .5); names.append(n)
L = t.ev('const L = window.__lab; return {starts: [0,1,2,3].map(i => L.startOf(i)), lands: [0,1,2,3].map(i => L.landOf(i))}')
print(L)
# the quote at full size
t.ev('window.scrollTo(0, %f)' % (top + vh * 2.3)); time.sleep(1.0); t.shot('h2-why', 80)
# each device landed + demo running after 4 s
for i in range(4):
    t.ev('window.scrollTo(0, %f)' % (top + vh * (L['lands'][i] + .12))); time.sleep(4.5); n = 'h2-dev-%d' % i; t.shot(n, 70, .5); names.append(n)
# the car: standing and half-way in
P = L['starts'][2]
for j, k in enumerate((P + .3, P + .52, P + .9, P + 1.3)):
    t.ev('window.scrollTo(0, %f)' % (top + vh * k)); time.sleep(1.2); n = 'h2-car-%d' % j; t.shot(n, 70, .5); names.append(n)
print(sheet(names, 'sheet-home2', 4))
print(t.ev('return window.__lab.devs.map(d => ({k: d.key, state: d.state, demo: !!d.demo, loaded: d.loaded}))'))
print(t.logs())
