import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.nav('http://localhost:4322/index.html?mute')
time.sleep(7)
names = []
def shot(n): t.shot(n, 72, .5); names.append(n)
t.ev('window.__world.meteor.next = .05; return 1'); time.sleep(.6); shot('w1-meteor')
t.ev('document.querySelector("[data-world-play]").click(); return 1'); time.sleep(5.5)
print('mode', t.ev('return window.__world.mode'))
time.sleep(6)
shot('w1-walk')
print(t.ev('const p = document.querySelector("[data-world-place]"); return { hidden: p.hidden, txt: p.innerText }'))
# sit around the fire
t.key('KeyE'); time.sleep(4.5); shot('w1-fire')
print(t.ev('return { sitting: window.__world.sitting, place: document.querySelector("[data-world-place]").innerText }'))
t.key('KeyE'); time.sleep(2.5)
# the home
t.ev('const W = window.__world; W.goInside(); return 1'); time.sleep(3.5); shot('w1-home0')
print(t.ev('const W = window.__world; return { on: W.inside.on, st: W.inside.state, loaded: W.home.loaded, pos: W.inside.pos.toArray().map(v => +v.toFixed(2)) }'))
t.keydown('KeyW'); time.sleep(1.6); t.keyup('KeyW'); time.sleep(.3); shot('w1-home1')
t.keydown('KeyA'); time.sleep(1.2); t.keyup('KeyA'); time.sleep(.3); shot('w1-home2')
print(t.ev('const W = window.__world; return { st: W.inside.state, near: W.home.near, pos: W.inside.pos.toArray().map(v => +v.toFixed(2)), cta: document.querySelector("[data-world-place]").innerText }'))
# to the record player
t.ev('const W = window.__world; W.inside.pos.set(1.9, 0, -.3); return 1'); time.sleep(.5)
print(t.ev('const W = window.__world; return { near: W.home.near, cta: document.querySelector("[data-world-place]").innerText }'))
t.key('KeyE'); time.sleep(1.5); shot('w1-home-tt')
print(t.ev('const W = window.__world; return { playing: W.home.playing, spin: +W.home.spin.toFixed(2), cta: document.querySelector("[data-world-place]").innerText, want: W.music.want }'))
# to the elevator
t.ev('const W = window.__world; W.inside.pos.set(-.9, 0, -.9); return 1'); time.sleep(.5)
print(t.ev('const W = window.__world; return { near: W.home.near, cta: document.querySelector("[data-world-place]").innerText }'))
shot('w1-home-lift')
print(sheet(names, 'sheet-world1', 4))
print(t.logs())
