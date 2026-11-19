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
t.ev('''const W = window.__world, Q = W.Q; Q.BAT.list.forEach((b) => { b.got = 1; b.g.visible = false; }); Q.BAT.got = Q.BAT.list.length;
  const pl = Q.BAT.list[Q.BAT.list.length - 1]; W.player.n.copy(pl.dir); W.player.h = pl.r - (9.5 + W.player.dip); W.step(30, 1/30); return 1''')
time.sleep(2.0); t.key('KeyE'); time.sleep(4.5)
t.ev('const d = document.querySelector(".rp iframe").contentWindow; d.eval("goTo(\'s-form\')"); return 1'); time.sleep(1.2)
t.ev('const d = document.querySelector(".rp iframe").contentWindow.document; d.querySelector("#form-bat .cat-plus").click(); return 1'); time.sleep(1.2)
t.ev('const d = document.querySelector(".rp iframe").contentWindow.document; d.querySelector("#pk-cam").click(); return 1'); time.sleep(2.5)
print(t.ev('''const W = window.__world, B = W.Q.BULB, T3 = W.THREE; const p = new T3.Vector3(), q = new T3.Vector3(); W.Q.BAT.pile.getWorldPosition(p); B.phone.getWorldPosition(q);
  const f = new T3.Vector3(0, 0, -1).applyQuaternion(B.eye.quaternion), toPile = p.clone().sub(B.eye.position);
  const perf = W.perf ? +W.perf.ms.toFixed(1) : null;
  return { ph: B.phase, dist: +toPile.length().toFixed(3), dot: +f.dot(toPile.normalize()).toFixed(3), eye: B.eye.position.toArray().map(v => +v.toFixed(2)), pile: p.toArray().map(v => +v.toFixed(2)), phone: q.toArray().map(v => +v.toFixed(2)), px: [B.buf[0], B.buf[1], B.buf[2], B.buf[73920*4], B.buf[73920*4+1], B.buf[73920*4+2]], ms: perf, near: B.eye.near, pileVis: W.Q.BAT.pile.visible, pileParent: !!W.Q.BAT.pile.parent }'''))
t.shot('rec2-cam', 80)
