"""pass 84: close looks — the g over the a (full size), the name at the end of its wipe, the fireflies moving"""
import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet, OUT
t = T(1440, 900)
t.p.call('Network.enable'); t.p.call('Network.setCacheDisabled', cacheDisabled=True)
t.nav('http://localhost:4322/index.html?mute&x=%d' % int(time.time())); time.sleep(8)
top = t.ev('return document.querySelector(".lab").getBoundingClientRect().top + scrollY')
go = lambda s: t.ev('window.scrollTo(0, %f); return 1' % (top + s * 900))
go(-.2); time.sleep(3); go(.1); time.sleep(1)
f = t.shot('h84b-title', 92)
from PIL import Image
im = Image.open(f); im.crop((100, 260, 1340, 680)).save(OUT + '/h84b-title-crop.jpg', quality=92)
L = t.ev('return [window.__lab.T4]')[0]
names = []
for k in range(4):
    go(L + .5 + k * .002); time.sleep(.7); n = 'h84b-fly%d' % k; t.shot(n, 92); names.append(n)
print(sheet(names, 'sheet-h84b', 2, 88))
print(t.ev('return getComputedStyle(document.querySelector(".fx-fireflies")).opacity'))
print([str(l)[:200] for l in t.logs() if 'rror' in str(l)][:5])
