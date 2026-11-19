import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.nav('http://localhost:4322/index.html?mute&x=%d' % int(time.time())); time.sleep(9)
names = []
def shot(n, s=.5): t.shot(n, 86, s); names.append(n)
L = t.ev('const L = window.__lab, sec = document.querySelector(".lab"); return { top: sec.getBoundingClientRect().top + scrollY, T3: L.T3, T4: L.T4, starts: L.devs.map((d, i) => L.startOf(i)), lands: L.devs.map((d, i) => L.landOf(i)), SEG: L.SEG }')
top = L['top']
go = lambda s: t.ev('window.scrollTo(0, %f); return 1' % (top + s * 900))
# the dive back to the old zoom
for k, f in enumerate((.25, .6)):
    t.ev('window.scrollTo(0, %f); return 1' % (top * f)); time.sleep(1.3); shot('h81-dive%d' % k)
# the title: from the moment it is reached, a few frames of its writing
go(-.25); time.sleep(.05)
for k in range(5):
    time.sleep(.42); shot('h81-title%d' % k)
go(.6); time.sleep(1.2); shot('h81-gate')
go((L['T3'] + L['T4']) / 2 - .05); time.sleep(2.2); shot('h81-why', 1)
# an app arriving: its words come with it
i = 0; P = L['starts'][i]; Ld = L['lands'][i]
for k, f in enumerate((.4, .6, .8)):
    go(P + (Ld - P) * f); time.sleep(.9); shot('h81-app%d' % k)
print(sheet(names, 'sheet-h81', 4, 84)); print([str(l)[:200] for l in t.logs() if 'rror' in str(l)][:3])
