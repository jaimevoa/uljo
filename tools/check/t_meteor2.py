import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
from PIL import Image
t = T(1440, 900)
t.nav('http://localhost:4322/index.html?mute')
time.sleep(7)
O = '/private/tmp/claude-501/-Users-jaimeolivares/e1776c3d-233f-40e1-bcee-ae1d809012d0/scratchpad/p77/shots/'
t.ev('const W = window.__world; W.meteor.next = 99; W.dbg.dt = 1e-7; return 1'); time.sleep(.3)
t.shot('met-none', 95)
Image.open(O + 'met-none.jpg').crop((553, 67, 853, 207)).resize((900, 420), Image.LANCZOS).save(O + 'met-none-crop.jpg', quality=92)
# the meteor again, with the head glow's own numbers
t.ev('const W = window.__world; W.meteor.next = 0; W.dbg.dt = 0; W.step(1, .02); W.step(1, .45); W.dbg.dt = 1e-7; return 1'); time.sleep(.3)
info = t.ev('''const W = window.__world, m = W.meteor, c = W.camera; const P = (v) => { v.project(c); return [Math.round((v.x * .5 + .5) * 1440), Math.round((1 - (v.y * .5 + .5)) * 900)]; };
  const M = m.m.matrix, a = new W.THREE.Vector3(.5, 0, 0).applyMatrix4(M), b = new W.THREE.Vector3(-.5, 0, 0).applyMatrix4(M);
  return { t: m.t, plusX: P(a), minusX: P(b), k: m.m.material.uniforms.k.value }''')
print(info)
t.shot('met-g', 95)
(ax, ay), (bx, by) = info['plusX'], info['minusX']
cx, cy = (ax + bx) / 2, (ay + by) / 2
Image.open(O + 'met-g.jpg').crop((int(cx - 150), int(cy - 70), int(cx + 150), int(cy + 70))).resize((900, 420), Image.LANCZOS).save(O + 'met-g-crop.jpg', quality=92)
sh = Image.new('RGB', (900, 840)); sh.paste(Image.open(O + 'met-none-crop.jpg'), (0, 0)); sh.paste(Image.open(O + 'met-g-crop.jpg'), (0, 420)); sh.save(O + 'met-two.jpg', quality=90)
