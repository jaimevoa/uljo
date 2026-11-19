/* iOS continuous corners ("squircles").
   CSS border-radius draws circular arcs; iOS draws a smoothed curve that eases into the straight edge.
   WebKit has no `corner-shape` yet, so every rounded surface listed below gets a clip-path built with
   the same geometry Figma uses for "iOS corner smoothing" (60 %). Each element keeps its CSS radius as
   the source of truth; capsules and circles are left alone (they are already continuous). */
(function(){
  'use strict';
  const SMOOTH = 0.6;
  const SEL = [
    '.song-card','.sheet-card','.tile','.tile-ic','.bubble','.cover','.tabgrid','.lyrics-peek','.chord','.onboard-card','.ob-ic',
    '.tabbar','.thread','.field','.to-field','.menu-item','.cell'
  ].join(',');

  function corner(r, budget){
    let s = SMOOTH, p = (1 + s) * r;
    if (p > budget){ s = Math.max(0, Math.min(s, budget / r - 1)); p = Math.min(p, budget); }
    const arc = 90 * (1 - s), rad = d => d * Math.PI / 180;
    const arcLen = Math.sin(rad(arc / 2)) * r * Math.SQRT2;
    const alpha = (90 - arc) / 2, p34 = r * Math.tan(rad(alpha / 2)), beta = 45 * s;
    const c = p34 * Math.cos(rad(beta)), d = c * Math.tan(rad(beta));
    const b = (p - arcLen - c - d) / 3, a = 2 * b;
    return { r, p, a, b, c, d, arcLen };
  }
  const f = n => +n.toFixed(2);
  function path(w, h, radii){
    const budget = Math.min(w, h) / 2;
    const [tl, tr, br, bl] = radii.map(r => corner(Math.min(r, budget), budget));
    let s = `M ${f(w - tr.p)} 0 `;
    if (tr.r) s += `c ${f(tr.a)} 0 ${f(tr.a + tr.b)} 0 ${f(tr.a + tr.b + tr.c)} ${f(tr.d)} a ${f(tr.r)} ${f(tr.r)} 0 0 1 ${f(tr.arcLen)} ${f(tr.arcLen)} c ${f(tr.d)} ${f(tr.c)} ${f(tr.d)} ${f(tr.b + tr.c)} ${f(tr.d)} ${f(tr.a + tr.b + tr.c)} `;
    s += `L ${f(w)} ${f(h - br.p)} `;
    if (br.r) s += `c 0 ${f(br.a)} 0 ${f(br.a + br.b)} ${f(-br.d)} ${f(br.a + br.b + br.c)} a ${f(br.r)} ${f(br.r)} 0 0 1 ${f(-br.arcLen)} ${f(br.arcLen)} c ${f(-br.c)} ${f(br.d)} ${f(-(br.b + br.c))} ${f(br.d)} ${f(-(br.a + br.b + br.c))} ${f(br.d)} `;
    s += `L ${f(bl.p)} ${f(h)} `;
    if (bl.r) s += `c ${f(-bl.a)} 0 ${f(-(bl.a + bl.b))} 0 ${f(-(bl.a + bl.b + bl.c))} ${f(-bl.d)} a ${f(bl.r)} ${f(bl.r)} 0 0 1 ${f(-bl.arcLen)} ${f(-bl.arcLen)} c ${f(-bl.d)} ${f(-bl.c)} ${f(-bl.d)} ${f(-(bl.b + bl.c))} ${f(-bl.d)} ${f(-(bl.a + bl.b + bl.c))} `;
    s += `L 0 ${f(tl.p)} `;
    if (tl.r) s += `c 0 ${f(-tl.a)} 0 ${f(-(tl.a + tl.b))} ${f(tl.d)} ${f(-(tl.a + tl.b + tl.c))} a ${f(tl.r)} ${f(tl.r)} 0 0 1 ${f(tl.arcLen)} ${f(-tl.arcLen)} c ${f(tl.c)} ${f(-tl.d)} ${f(tl.b + tl.c)} ${f(-tl.d)} ${f(tl.a + tl.b + tl.c)} ${f(-tl.d)} `;
    return s + 'Z';
  }

  function apply(el){
    const w = el.offsetWidth, h = el.offsetHeight;
    if (!w || !h){ return; }
    const cs = getComputedStyle(el);
    const radii = ['borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius'].map(k => parseFloat(cs[k]) || 0);
    const max = Math.max(...radii), half = Math.min(w, h) / 2;
    const key = w + 'x' + h + ':' + radii.join(',');
    if (el.__sqKey === key) return;
    el.__sqKey = key;
    if (max < 3 || radii.every(r => r >= half - 0.5)){ el.style.clipPath = ''; return; }   // square, capsule or circle
    el.style.clipPath = `path('${path(w, h, radii)}')`;
  }

  const ro = new ResizeObserver(entries => entries.forEach(e => apply(e.target)));
  function watch(el){ if (el.__sq) { apply(el); return; } el.__sq = 1; ro.observe(el); apply(el); }
  function scan(root){
    if (root.nodeType !== 1) return;
    if (root.matches(SEL)) watch(root);
    root.querySelectorAll(SEL).forEach(watch);
  }
  new MutationObserver(ms => ms.forEach(m => {
    m.addedNodes.forEach(scan);
    if (m.type === 'attributes' && m.target.nodeType === 1 && m.target.matches(SEL)) { m.target.__sqKey = ''; apply(m.target); }
  })).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  scan(document.body);
  window.addEventListener('load', () => document.querySelectorAll(SEL).forEach(el => { el.__sqKey = ''; apply(el); }));
  window.TrackOnCorners = { path };
})();
