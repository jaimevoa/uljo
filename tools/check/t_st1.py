import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.nav('http://localhost:4322/index.html?mute')
time.sleep(2); t.ev('sessionStorage.removeItem("uljo-quests"); return 1')
t.nav('http://localhost:4322/index.html?mute'); time.sleep(7)
t.ev('document.querySelector("[data-world-play]").click(); return 1'); time.sleep(4)
time.sleep(6)
names = []
def shot(n): t.shot(n, 72, .5); names.append(n)
# beside the hatch, to the south of it, facing north
print(t.ev('''const W = window.__world, sp = W.PLACES.find(p => p.id === 'studio').spot; W.player.n.copy(sp); W.player.fwd.copy(W.at(4.68, 1.7)).sub(sp).normalize(); W.cam.f.copy(W.player.fwd); W.step(30, 1/30);
  const e = document.querySelector("[data-world-place]"); return [e.hidden, e.innerText]'''))
time.sleep(1.5); shot('st-hatch0')
t.key('KeyE'); time.sleep(1.6); shot('st-hatch1')
print(t.ev('const W = window.__world; return { want: W.HATCH.want, k: +W.HATCH.k.toFixed(2), inside: W.inside.on, zoom: !!W.dbg && 0 }'))
t.keydown('KeyW'); 
for i in range(10):
    time.sleep(.45)
    r = t.ev('const W = window.__world; return { h: +W.player.h.toFixed(2), going: W.HATCH.going, inside: W.inside.on, kind: W.inside.kind }')
    if i in (1, 3): shot('st-down%d' % i)
    if r['inside']: break
print(r); t.keyup('KeyW')
for i in range(12):
    time.sleep(1.0)
    r = t.ev('const W = window.__world; return { ph: W.Q.ST.phase, inside: W.inside.on, kind: W.inside.kind }')
    if r['ph'] == 'brief': break
print(r); shot('st-room')
t.key('KeyE')
def st(): return t.ev('const W = window.__world; return { ph: W.Q.ST.phase, step: W.Q.ST.step, rec: W.Q.ST.recording, count: W.Q.ST.count, saved: W.Q.ST.saved, layers: W.Q.ST.layers, act: !document.querySelector("[data-world-say-act]").hidden, say: document.querySelector("[data-world-say-text]").textContent.slice(0, 90) }')
def until(cond, secs=20, tag=''):
    r = None
    for i in range(int(secs * 2)):
        time.sleep(.5); r = st()
        if cond(r): return r
    print('TIMEOUT', tag, r); return r
print('timers/s', t.rate()); print('app', until(lambda r: r['ph'] == 'app' and r['step'] == 0, 20, 'app'))
shot('st-app')
fr = t.ev('const f = document.querySelector(".tq iframe"), r = f.getBoundingClientRect(); return [r.left, r.top, r.width, r.height, document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2).tagName]'); print(fr)
L, Tp, Wd = fr[0], fr[1], fr[2]; k = Wd / 402
def tap(sel, wait=1.3):
    r = t.ev('const d = document.querySelector(".tq iframe").contentWindow.document, e = d.querySelector(%s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width]' % json.dumps(sel))
    if not r or not r[2]: print('missing', sel); return False
    t.click(L + r[0] * k, Tp + r[1] * k); time.sleep(wait); return True
time.sleep(1.0); tap('#dRec', .5)                                 # a real click inside the app: its page now has the keyboard
print('rec', until(lambda r: r['step'] == 1, 8, 'rec'))
for kc in ('KeyA', 'KeyS', 'KeyD', 'KeyF'):
    t.key(kc); time.sleep(1.45)
print('played', until(lambda r: r['step'] == 2, 8, 'played')); shot('st-played')
tap('#dRec', 1.2); tap('#dSave', .5); print('saved', until(lambda r: r['step'] == 3, 8, 'saved'))
print('timers/s', t.rate()); tap('#recog', .5); r = until(lambda r: r['step'] >= 4, 20, 'chords'); print('chords', r); shot('st-chords')
tap('#pLayer', .5); print('layer mode', until(lambda r: r['step'] == 5, 8, 'layer')); shot('st-layer0')
tap('#dRec', 1.4)
for kc in ('KeyG', 'KeyH', 'KeyJ'):
    t.key(kc); time.sleep(1.3)
tap('#dRec', 1.2); tap('#dSave', .5); print('layer saved', until(lambda r: r['step'] == 6, 10, 'layers')); time.sleep(.8); shot('st-layers')
tap('#pSend', 1.5); shot('st-send'); tap('[data-f]', .5); print('sent', until(lambda r: r['step'] == 7, 8, 'sent')); time.sleep(1.5); shot('st-sent')
b = t.ev('const b = document.querySelector("[data-world-say-act]"), r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, b.hidden, b.textContent]'); print('done button', b)
t.click(b[0], b[1]); time.sleep(2.5)
print(t.ev('const W = window.__world; return { ph: W.Q.ST.phase, done: [...W.Q.done] }'))
# the records
t.ev('const W = window.__world; W.inside.pos.set(-1.0, 0, .1); return 1'); time.sleep(.8)
print(t.ev('const h = document.querySelector(".tq__hint"); return [h.hidden, h.innerText, window.__world.Q.ST.nearRec]'))
t.key('KeyE'); time.sleep(2.2); shot('st-vinyl0'); t.key('KeyD'); time.sleep(.8); t.key('KeyD'); time.sleep(.9); shot('st-vinyl2')
print(t.ev('const W = window.__world; return { ph: W.Q.ST.phase, v: W.Q.ST.vinyl }'))
t.key('KeyE'); time.sleep(1.0)
# the walls: a look at where the posters were
t.ev('const W = window.__world; W.inside.pos.set(-.6, 0, 2.2); return 1'); time.sleep(1.5); shot('st-walls')
# out by the stairs
t.ev('const W = window.__world; W.inside.pos.set(1.62, 0, -.2); return 1'); time.sleep(.6); t.key('KeyE')
for i in range(12):
    time.sleep(1.0)
    r = t.ev('const W = window.__world; return { inside: W.inside.on, ph: W.Q.ST.phase }')
    if not r['inside']: break
print(r); time.sleep(1.5); shot('st-out')
print(t.ev('const W = window.__world; return { h: W.player.h, hatch: W.HATCH.k, want: W.HATCH.want }'))
print(sheet(names, 'sheet-st1', 4))
print(t.logs())
