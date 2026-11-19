import sys, time; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.nav('http://localhost:4322/index.html?mute')
time.sleep(7)
# views: camera position (x,y,z) looking at target
views = {
 'top': ((0, 34, .01), (0, 9, 0)),
 'front': ((0, 16, 24), (0, 8, 0)),
 'left': ((-24, 14, 6), (0, 7, 0)),
 'right': ((24, 14, 6), (0, 7, 0)),
 'back': ((0, 16, -24), (0, 8, 0)),
 'camp1': ((-4.5, 12.4, 5.5), (-1.5, 10.2, 0)),
 'camp2': ((5, 12.6, 6), (1.5, 10, -1)),
 'camp3': ((0, 12, -7), (0, 10, 0)),
}
names = []
for k, (p, a) in views.items():
    t.ev('''const W = window.__world; W.dbg.spy = (c) => { c.position.set(%f,%f,%f); c.up.set(0,1,0); c.lookAt(%f,%f,%f); c.fov = 40; c.updateProjectionMatrix(); c.updateMatrixWorld(true); }; W.step(3); return 1''' % (p + a))
    time.sleep(.6); t.shot('pl-' + k, 70, .5); names.append('pl-' + k)
print(sheet(names, 'sheet-planet', 4))
