"""pass 77: every patch that closed a hole (tools/blender/planet-patches.json), seen from above and from two sides
(the eye is set by dbg.spy).   usage: t_patch.py [prefix] [first] [count]"""
import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
pre = sys.argv[1] if len(sys.argv) > 1 else 'pt'
first = int(sys.argv[2]) if len(sys.argv) > 2 else 0; count = int(sys.argv[3]) if len(sys.argv) > 3 else 8
P = json.load(open('/Users/jaimeolivares/Projects/uljo/tools/blender/planet-patches.json'))
t = T(1440, 900)
t.nav('http://localhost:4322/index.html?mute'); time.sleep(10)
t.ev('sessionStorage.removeItem("uljo-quests"); return 1')
t.ev('document.querySelector("[data-world-play]").click(); return 1'); time.sleep(7)
print('triangles', t.ev('let n = 0; for (const m of window.__world.planetParts) n += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; return n'))
t.ev('const W = window.__world; W.sayDone && W.sayDone(); document.querySelectorAll(".world-talk, .world-hud, .world-map, .world-cta, .world-back").forEach((e) => e.style.visibility = "hidden"); return 1')
names = []
for k, p in enumerate(P[first:first + count]):
    c = p['c']; d = max(2.6, p['L'] * 1.9)
    for view, (up, side, back) in (('top', (d * 1.25, 0, .01)), ('a', (d * .42, 0, d)), ('b', (d * .42, d, 0)), ('c', (d * .42, -d * .7, -d * .7))):
        t.ev('''const W = window.__world, THREE = W.THREE, c = new THREE.Vector3(%f, %f, %f), n = c.clone().normalize();
          const e1 = new THREE.Vector3(0, 0, 1).addScaledVector(n, -n.z).normalize(), e2 = new THREE.Vector3().crossVectors(n, e1).normalize();
          const eye = c.clone().addScaledVector(n, %f).addScaledVector(e1, %f).addScaledVector(e2, %f);
          W.me.visible = false; W.dbg.spy = (cam) => { cam.position.copy(eye); cam.up.copy(n); cam.lookAt(c); cam.updateMatrixWorld(true); }; return 1''' % (c[0], c[1], c[2], up, side, back))
        time.sleep(.8)
        nm = '%s-%02d-%s' % (pre, first + k, view); t.shot(nm, 84, .5); names.append(nm)
t.ev('window.__world.dbg.spy = null; window.__world.me.visible = true; return 1')
for s in range(0, len(names), 16):
    print(sheet(names[s:s + 16], 'sheet-%s-%d' % (pre, (first * 4 + s) // 16), cols=4, q=82))
print([l for l in t.logs() if 'rror' in str(l)][:4])
