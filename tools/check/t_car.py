"""pass 78: the Manic GT on the home page: it stands still, its driver's window is open, the scroll takes the eye in through it.
usage: t_car.py [name] [w h]"""
import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
name = sys.argv[1] if len(sys.argv) > 1 else 'car'
w, h = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (1440, 900)
t = T(w, h, 2 if w < 700 else 1, w < 700)
t.nav('http://localhost:4322/index.html?mute'); time.sleep(8)
# where the lab's section starts on the page, and the car's stretch of it
info = t.ev('''const L = window.__lab, sec = document.querySelector('[data-lab]') || document.querySelector('.lab'); const i = L.devs.findIndex((d) => d.car);
  return { top: sec.getBoundingClientRect().top + scrollY, vh: innerHeight, start: L.startOf(i), land: L.landOf(i), SEG: L.SEG, i };''')
print(info)
top, vh, P, Ld, SEG = info['top'], info['vh'], info['start'], info['land'], info['SEG']
def at(s):
    t.ev('window.scrollTo(0, %f); return 1' % (top + s * vh)); time.sleep(.7)
names = []
at(P - .3); time.sleep(2.5)                                # the models load
for k in range(30):
    if t.ev('return !!(window.__carShow && window.__carShow.ready)'): break
    time.sleep(.5)
print('ready after', k * .5, 's;', t.ev('const d = window.__carShow.dbg; return { win: d.win, CK: d.CK }'))
dive0 = P + SEG['carIn'] + SEG['stand']
stations = [('in-20', P + SEG['carIn'] * .2), ('in-60', P + SEG['carIn'] * .6), ('stand', P + SEG['carIn'] + SEG['stand'] * .5)]
for u in (.12, .24, .34, .42, .5, .58, .66, .78, .9, .97):
    stations.append(('u%02d' % round(u * 100), dive0 + (Ld - dive0) * u))
stations.append(('landed', Ld + .15))
for nm, s in stations:
    at(s); time.sleep(.5)
    f = '%s-%s' % (name, nm); t.shot(f, 84, .5); names.append(f)
    if nm in ('stand', 'landed'):
        print(nm, t.ev('const it = document.querySelector("[data-show-item].has-car") ; const d = window.__carShow.dbg; return { cls: it.className, state: d.state, u: +d.dv.toFixed(2), standing: d.standing, text: [...it.querySelectorAll(".show__text > *")].map((e) => getComputedStyle(e).opacity), ry: +d.ry.toFixed(3) }'))
print(sheet(names, 'sheet-' + name, 4 if w >= 700 else 7, 82))
print([str(l)[:200] for l in t.logs() if 'rror' in str(l)][:4])
