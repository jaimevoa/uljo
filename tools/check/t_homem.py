"""pass 77: the home page on a phone: the menu, the dive, the lab's title, its gate, the words, the four prototypes, the car"""
import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(390, 844, 2, True)
t.nav('http://localhost:4322/index.html?mute'); time.sleep(9)
H = t.ev('return document.documentElement.scrollHeight'); print('page', H, 'wide', t.ev('return [document.documentElement.scrollWidth, innerWidth]'))
names = []; t.shot('hm-00', 78, .5); names.append('hm-00')
N = 20
for k in range(1, N + 1):
    y = int((H - 844) * k / N)
    t.ev('window.scrollTo(0, %d)' % y); time.sleep(1.6)
    nm = 'hm-%02d' % k; t.shot(nm, 78, .5); names.append(nm)
    w = t.ev('return [document.documentElement.scrollWidth, innerWidth]')
    if w[0] != 390 or w[1] != 390: print('   at', y, 'the page is', w)
print(sheet(names[:11], 'sheet-homem-0', 11, 80)); print(sheet(names[11:], 'sheet-homem-1', 10, 80))
print([str(l)[:160] for l in t.logs() if 'rror' in str(l)][:3])
