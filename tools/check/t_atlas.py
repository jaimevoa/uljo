"""pass 77: which parts of the planet's picture does no face use? (to lay new grass there for the closed holes)
draws every face's uv triangle on a 2048 canvas, a little fat, then looks for the largest empty squares."""
import sys, time, json, base64; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, OUT
t = T(1200, 800)
if 'index.html' not in t.ev('return location.href'):
    t.nav('http://localhost:4322/index.html?mute'); time.sleep(9)
r = t.ev('''const W = window.__world; const S = 2048, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
x.fillStyle = '#000'; x.fillRect(0, 0, S, S); x.fillStyle = '#fff'; x.strokeStyle = '#fff'; x.lineWidth = 5; x.lineJoin = 'round';
let nT = 0;
for (const m of W.planetParts) { const g = m.geometry, U = g.attributes.uv, I = g.index, N = I ? I.count : U.count;
  for (let i = 0; i < N; i += 3) { const a = I ? I.getX(i) : i, b = I ? I.getX(i + 1) : i + 1, d = I ? I.getX(i + 2) : i + 2;
    const ax = U.getX(a) * S, ay = U.getY(a) * S, bx = U.getX(b) * S, by = U.getY(b) * S, dx = U.getX(d) * S, dy = U.getY(d) * S;
    x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.lineTo(dx, dy); x.closePath(); x.fill(); x.stroke(); nT++; } }
const im = x.getImageData(0, 0, S, S).data; const used = new Uint8Array(S * S); let nu = 0;
for (let i = 0; i < S * S; i++) { used[i] = im[i * 4] > 20 ? 1 : 0; nu += used[i]; }
/* the largest empty square at each cell (dynamic programme), then greedily the biggest ones that do not overlap */
const sq = new Uint16Array(S * S);
for (let y = 0; y < S; y++) for (let xx = 0; xx < S; xx++) { const i = y * S + xx; if (used[i]) { sq[i] = 0; continue; } sq[i] = (xx && y) ? 1 + Math.min(sq[i - 1], sq[i - S], sq[i - S - 1]) : 1; }
const found = []; const taken = new Uint8Array(S * S);
for (let round = 0; round < 40; round++) { let best = 0, bi = -1;
  for (let i = 0; i < S * S; i++) if (sq[i] > best && !taken[i]) { const s = sq[i], xx = i % S, y = (i / S) | 0; if (!taken[(y - s + 1) * S + (xx - s + 1)] && !taken[(y - s + 1) * S + xx] && !taken[y * S + (xx - s + 1)]) { best = s; bi = i; } }
  if (best < 40) break; const xx = bi % S, y = (bi / S) | 0; found.push([xx - best + 1, y - best + 1, best]);
  for (let yy = y - best + 1; yy <= y; yy++) for (let x2 = xx - best + 1; x2 <= xx; x2++) taken[yy * S + x2] = 1;
  /* squares that would overlap this one are found again smaller: recompute with taken as used */
  for (let yy = 0; yy < S; yy++) for (let x2 = 0; x2 < S; x2++) { const i = yy * S + x2; if (used[i] || taken[i]) { sq[i] = 0; continue; } sq[i] = (x2 && yy) ? 1 + Math.min(sq[i - 1], sq[i - S], sq[i - S - 1]) : 1; } }
W.__mask = c; return JSON.stringify({ tris: nT, usedShare: +(nu / S / S).toFixed(3), squares: found, png: c.toDataURL('image/png').length });''', timeout=240000)
d = json.loads(r); print('triangles', d['tris'], 'used share', d['usedShare'])
print('free squares (x, y, side) at 2048, from the top-left as in the glb:'); print(d['squares'])
png = t.ev('return window.__world.__mask.toDataURL("image/png")', timeout=120000)
open(OUT + '/../atlas/used-2048.png', 'wb').write(base64.b64decode(png.split(',', 1)[1]))
json.dump(d['squares'], open(OUT + '/../atlas/free-squares.json', 'w'))
