import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T
t = T(1440, 900)
t.nav('http://localhost:4322/index.html?mute'); time.sleep(6)
print(t.ev('''let n = 0, k = 0; const t0 = performance.now(); const id = setInterval(() => k++, 30);
  await new Promise((ok) => { const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else ok(); }; requestAnimationFrame(f); });
  clearInterval(id); return { raf_fps: n / 2, timers_per_s: k / ((performance.now() - t0) / 1000), hidden: document.hidden, vis: document.visibilityState }'''))
t.ev('document.querySelector("[data-world-play]").click(); return 1'); time.sleep(1)
print('pumped frames', t.pump(3))
print(t.ev('const W = window.__world; return { mode: W.mode, stand: +W.player.stand.toFixed(2) }'))
