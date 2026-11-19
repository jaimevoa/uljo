import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
from PIL import Image
t = T(1440, 900)
t.nav('http://localhost:4322/index.html?mute')
time.sleep(7)
t.ev('const W = window.__world; W.dbg.dt = 1e-7; W.meteor.next = 0; return 1'); time.sleep(.3)
t.ev('const W = window.__world; W.dbg.dt = 0; W.step(1, .5); W.dbg.dt = 1e-7; return 1'); time.sleep(.3)
info = t.ev('''const W = window.__world, m = W.meteor, c = W.camera; const head = m.from.clone().addScaledVector(m.vel, m.t).add(c.position).project(c); const tail = m.from.clone().addScaledVector(m.vel, m.t - m.len / m.vel.length()).add(c.position).project(c);
  return { t: m.t, head: [(head.x * .5 + .5) * 1440, (1 - (head.y * .5 + .5)) * 900], tail: [(tail.x * .5 + .5) * 1440, (1 - (tail.y * .5 + .5)) * 900] }''')
print(info)
t.shot('met-f', 95)
hx, hy = info['head']; tx, ty = info['tail']
cx, cy = (hx + tx) / 2, (hy + ty) / 2
im = Image.open('/private/tmp/claude-501/-Users-jaimeolivares/e1776c3d-233f-40e1-bcee-ae1d809012d0/scratchpad/p77/shots/met-f.jpg')
box = (int(cx - 150), int(cy - 70), int(cx + 150), int(cy + 70)); print(box)
im.crop(box).resize((1200, 560), Image.LANCZOS).save('/private/tmp/claude-501/-Users-jaimeolivares/e1776c3d-233f-40e1-bcee-ae1d809012d0/scratchpad/p77/shots/met-crop.jpg', quality=92)
