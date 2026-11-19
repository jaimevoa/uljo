import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.nav('http://localhost:4322/index.html?mute')
time.sleep(2)
t.ev('sessionStorage.removeItem("uljo-quests"); return 1')
t.nav('http://localhost:4322/index.html?mute')
time.sleep(7)
t.ev('document.querySelector("[data-world-play]").click(); return 1'); time.sleep(4)
time.sleep(6)
names = []
def shot(n): t.shot(n, 72, .5); names.append(n)
# to the top stone, every battery in hand
print(t.ev('''const W = window.__world, Q = W.Q, top = W.Q.BAT.list[W.Q.BAT.list.length - 1]; Q.done.add('trackon');
  Q.BAT.list.forEach((b) => { b.got = 1; b.g.visible = false; }); Q.BAT.got = Q.BAT.list.length;
  const TW = W.gems ? null : null; const pl = W.Q.BAT.list[Q.BAT.list.length - 1];
  W.player.n.copy(pl.dir); W.player.h = pl.r - (9.5 + W.player.dip) + .0; W.step(30, 1/30);
  return { n: Q.BAT.list.length, got: Q.BAT.got, h: +W.player.h.toFixed(2), cta: document.querySelector("[data-world-place]").innerText }'''))
time.sleep(2.0)
print(t.ev('const e = document.querySelector("[data-world-place]"); return [e.hidden, e.innerText, +window.__world.player.h.toFixed(2)]'))
shot('rec-top')
t.key('KeyE'); time.sleep(1.2); shot('rec-out0'); time.sleep(2.2); shot('rec-out1')
print(t.ev('const W = window.__world; return { on: W.Q.BULB.on, ph: W.Q.BULB.phase, step: W.Q.BULB.step }'))
info = t.ev('const f = document.querySelector(".rp iframe"), r = f.getBoundingClientRect(); return { rect: [r.left, r.top, r.width, r.height], hit: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2).tagName }'); print(info)
L, Tp, Wd, Hd = info['rect']; k = Wd / 440
def tap(sel, wait=1.4):
    r = t.ev('const d = document.querySelector(".rp iframe").contentWindow.document, e = d.querySelector(%s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width]' % json.dumps(sel))
    if not r or not r[2]: print('missing', sel); return False
    t.click(L + r[0] * k, Tp + r[1] * k); time.sleep(wait); return True
time.sleep(1.0)
tap('#fab'); tap('#s-opts [data-go="s-form"]'); shot('rec-form')
tap('#form-bat .cat-plus'); tap('#pk-cam', 2.0); shot('rec-cam')
print(t.ev('const W = window.__world; return { ph: W.Q.BULB.phase, cam: !document.querySelector(".rp__cam").hidden }'))
t.key('Space'); time.sleep(1.6); shot('rec-shot')
print(t.ev('const w = document.querySelector(".rp iframe").contentWindow; return { ph: window.__world.Q.BULB.phase, n: w.eval("Object.values(photos.form).filter(Boolean).length"), cont: !w.document.querySelector("#form-next").disabled, say: document.querySelector("[data-world-say-text]").textContent }'))
tap('#form-next', 1.0)
for i in range(12):
    time.sleep(1.0)
    c = t.ev('return document.querySelector(".rp iframe").contentWindow.eval("cur")')
    if c == 's-approved': break
print('cur', c); shot('rec-approved')
tap('#pub-appr', 3.2); shot('rec-claim'); tap('#rec-btn', 2.5)
print(t.ev('const W = window.__world; return { ph: W.Q.BULB.phase, done: [...W.Q.done], cur: document.querySelector(".rp iframe") && document.querySelector(".rp iframe").getAttribute("src") }'))
shot('rec-done'); time.sleep(3.0); shot('rec-after')
print(t.ev('const W = window.__world; return { done: [...W.Q.done], gems: W.gems.filter(g => g.shown > 0 || g.showAt).length, say: document.querySelector("[data-world-say-text]").textContent.slice(0, 80) }'))
print(sheet(names, 'sheet-rec1', 4))
print(t.logs())
