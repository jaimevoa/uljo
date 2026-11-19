import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.nav('http://localhost:4322/index.html?mute'); time.sleep(2)
t.ev('sessionStorage.removeItem("uljo-quests"); return 1')
t.nav('http://localhost:4322/index.html?mute'); time.sleep(9)
t.ev('document.querySelector("[data-world-play]").click(); return 1'); time.sleep(9)
t.ev('const W = window.__world; W.sayDone && W.sayDone(); return 1')
t.ev('const W = window.__world, d = await (await fetch("assets/models/planet.json?v=7")).json(); const q = d.trail[6]; W.player.n.set(q[0], q[1], q[2]).normalize(); return 1')
time.sleep(1.5); t.key('KeyE')
for k in range(80):
    time.sleep(.2)
    if t.ev('return window.__world.mirror.k') >= .999: break
time.sleep(2.0); t.shot('mir-end', 88)
# the last moment before the page changes
for k in range(120):
    time.sleep(.05)
    if t.ev('return document.body.classList.contains("is-through")'): break
for k in range(8):
    t.shot('mir-out%d' % k, 85, .5); time.sleep(.05)
time.sleep(1.2)
print(t.ev('return [location.pathname, document.documentElement.className]'))
for k in range(5):
    t.shot('ab-in%d' % k, 85); time.sleep(.35)
