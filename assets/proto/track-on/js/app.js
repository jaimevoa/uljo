/* Track On — app. Phone and Mac share this file; css decides the layout. */
'use strict';
const DESKTOP = document.documentElement.classList.contains('desktop');
const NATIVE = !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.trackon);
const $ = id => document.getElementById(id);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmtT = s => { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const fmtClock = s => { const cs = Math.floor((s || 0) * 100); return String(Math.floor(cs / 6000)).padStart(2, '0') + ':' + String(Math.floor(cs / 100) % 60).padStart(2, '0') + '.' + String(cs % 100).padStart(2, '0'); };
const today = () => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
function hl(t, q){ t = esc(t); if (!q) return t; const i = t.toLowerCase().indexOf(q.toLowerCase()); return i < 0 ? t : t.slice(0, i) + '<mark>' + t.slice(i, i + q.length) + '</mark>' + t.slice(i + q.length); }
const store = { get(k, d){ try { const v = localStorage.getItem('trackon.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
                set(k, v){ try { localStorage.setItem('trackon.' + k, JSON.stringify(v)); } catch (e) {} } };
function nativePost(m){ if (NATIVE) try { window.webkit.messageHandlers.trackon.postMessage(m); } catch (e) {} }
function inkOn(bg){ if (!bg || bg[0] !== '#') return '#161616'; const n = parseInt(bg.slice(1), 16), f = c => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); };
  return (.2126 * f(n >> 16) + .7152 * f((n >> 8) & 255) + .0722 * f(n & 255)) > .42 ? '#161616' : '#F4F4F1'; }

/* ============================ CONTENT ============================ */
/* A fresh start: no ideas, lists or inspiration until you make them. Friends are sample people. */
let lists = [];
let songs = [];
const FRIENDS = [
  { name: 'Maya Reyes', handle: '@mayasings', online: true, face: 44 }, { name: 'Theo Lang', handle: '@theobeats', online: false, face: 12 },
  { name: 'Luca Moon', handle: '@lucamoon', online: true, face: 13 }, { name: 'Ava Kim', handle: '@avakim', online: false, face: 32 },
  { name: 'Noah Diaz', handle: '@noahd', online: true, face: 68 }, { name: 'Iris Vale', handle: '@irisv', online: false, face: 45 }];
const THREADS = {
  'Maya Reyes': [{ me: 0, t: 'Sent you the new hook', at: '10:42' }, { me: 1, t: 'It’s so good. Can I add harmonies?', at: '10:44' }, { me: 0, t: 'Yes! Add a layer whenever you want', at: '10:45' }],
  'Theo Lang': [{ me: 0, t: 'Rainy Window needs a bridge', at: 'Mon' }, { me: 1, t: 'On it tonight', at: 'Mon' }],
  'Luca Moon': [{ me: 1, t: 'That bedroom loop is great', at: 'Sun' }, { me: 0, t: 'Thanks! 92 bpm, in A', at: 'Sun' }],
  'Ava Kim': [{ me: 0, t: 'Writing session Friday?', at: 'Sat' }],
  'Noah Diaz': [{ me: 1, t: 'Sending you the subway sample', at: 'Fri' }],
  'Iris Vale': [{ me: 0, t: 'Lavender Hour lyrics are up', at: 'Thu' }] };
const UNREAD = new Set(['Maya Reyes', 'Ava Kim']);
const POSTS = [
  { id: 'p1', who: 'Maya Reyes', when: '2h', title: 'Sunset Boulevard', chords: ['C','G','Am','F'], bpm: 88, style: 'hum', dur: 26 },
  { id: 'p2', who: 'Theo Lang', when: '5h', title: 'Rainy Window', chords: ['Em','C','G','D'], bpm: 80, style: 'band', dur: 24 },
  { id: 'p3', who: 'Luca Moon', when: '1d', title: 'Bedroom Loop', chords: ['A','E','F#m','D'], bpm: 92, style: 'band', dur: 28 },
  { id: 'p4', who: 'Iris Vale', when: '1d', title: 'Lavender Hour', chords: ['Dm','Bb','F','C'], bpm: 74, style: 'hum', dur: 26 },
  { id: 'p5', who: 'Noah Diaz', when: '2d', title: 'Subway Sketch', chords: ['G','D','Em','C'], bpm: 96, style: 'band', dur: 22 }]
  .map((p, i) => ({ ...p, stems: [], notes: [], demo: { chords: p.chords, bpm: p.bpm, style: p.style, seed: 40 + i, name: p.who.split(' ')[0] } }));
let boards = [];
let inspItems = [];
let settings = Object.assign({ clean: false, instrument: 'guitar' }, store.get('settings', {}));
let me = Object.assign({ name: '', photo: null }, store.get('me', {}));

/* ============================ HELPERS ============================ */
const hasAudio = s => !!(s && (s.demo || (s.stems && s.stems.length)));
const songDur = s => { const d = Engine.songDuration(s); return d || s.dur || 0; };
const nextId = () => Math.max(100, ...songs.map(s => +s.id || 0)) + 1;
const listName = id => (lists.find(l => l.id === id) || {}).name;
function faceHTML(name, size){ const f = FRIENDS.find(x => x.name === name), sz = size || 44;
  if (f && f.face) return `<span class="face" style="width:${sz}px;height:${sz}px;background-image:url(https://i.pravatar.cc/${sz * 3}?img=${f.face})"></span>`;
  const ini = String(name).trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return `<span class="face" style="width:${sz}px;height:${sz}px;font-size:${Math.round(sz * .38)}px">${esc(ini)}</span>`; }

async function ensureAudio(s){
  if (s._loading) return s._loading;
  if (s.stems.length && s.stems.every(x => x.buf)){ if (!s.peaks) s.peaks = Engine.peaks(Engine.mix(s.stems), 400); return s; }
  s._loading = (async () => {
    if (s.demo && !s.stems.length){ const b = await Engine.renderDemo({ ...s.demo, dur: s.dur }); s.stems = [{ name: s.demo.name, buf: b }]; }
    for (const st of s.stems) if (!st.buf && st.url) st.buf = await Engine.decodeUrl(st.url);
    s.peaks = Engine.peaks(Engine.mix(s.stems), 400); s.dur = songDur(s); s._loading = null; return s;
  })();
  return s._loading;
}

/* ---------- toast ---------- */
let toastTimer;
function toast(m){ const t = $('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2000); }

/* ---------- waveform ---------- */
function waveHTML(cls){ return `<div class="wave ${cls || ''}"><div class="wave-bars"></div><div class="wave-bars played"></div></div>`; }
const waveRO = new ResizeObserver(es => es.forEach(e => { const el = e.target; if (el._peaks) drawWave(el, el._peaks, el._notes, el._dur); }));
function drawWave(el, peaks, notes, dur){
  el._peaks = peaks; el._notes = notes; el._dur = dur; if (!el._ro){ el._ro = 1; waveRO.observe(el); }
  const w = el.clientWidth; if (!w) return;
  const n = Math.max(12, Math.floor(w / 5)), bars = [];
  for (let i = 0; i < n; i++){ const a = Math.floor(i * peaks.length / n), b = Math.max(a + 1, Math.floor((i + 1) * peaks.length / n)); let m = 0; for (let j = a; j < b; j++) m = Math.max(m, peaks[j] || 0); bars.push(`<i style="--h:${Math.max(.07, m).toFixed(3)}"></i>`); }
  const html = bars.join(''); $$('.wave-bars', el).forEach(b => b.innerHTML = html);
  $$('.wave-note', el).forEach(x => x.remove());
  (notes || []).forEach(nt => { if (!dur) return; const d = document.createElement('span'); d.className = 'wave-note'; d.style.left = (100 * nt.t / dur) + '%'; d.title = fmtT(nt.t) + ' · ' + nt.text; el.appendChild(d); });
}
const setWave = (el, f) => el && el.style.setProperty('--p', clamp(f, 0, 1).toFixed(4));
function scrub(el, onSeek){
  el.addEventListener('pointerdown', e => { if (e.target.classList.contains('wave-note')) return; el.setPointerCapture(e.pointerId);
    const go = ev => { const r = el.getBoundingClientRect(); onSeek(clamp((ev.clientX - r.left) / r.width, 0, 1)); };
    go(e); el.onpointermove = go; el.onpointerup = () => { el.onpointermove = null; }; });
}

/* ============================ NAVIGATION ============================ */
const screens = { home: $('screen-home'), song: $('screen-song'), insp: $('screen-insp'), friends: $('screen-friends'), chat: $('screen-chat'), profile: $('screen-profile') };
let stack = ['home'];
const topScreen = () => stack[stack.length - 1];
function render(){
  Object.entries(screens).forEach(([id, el]) => { el.classList.remove('active', 'behind'); const i = stack.indexOf(id);
    if (id === topScreen()) el.classList.add('active'); else if (i > -1) el.classList.add('behind'); });
  const tb = $('tabbar'); tb.classList.toggle('off', !['home', 'friends', 'insp', 'profile'].includes(topScreen()));
  $$('.tb', tb).forEach(b => b.classList.toggle('active', b.dataset.tb === topScreen()));
  $('phone').classList.toggle('on-friends', topScreen() === 'friends');
}
function navMode(m){ const p = $('phone'), f = p.classList.contains('nav-fade'); if ((m === 'fade') === f) return;
  p.classList.add('nav-snap'); p.classList.toggle('nav-fade', m === 'fade'); void p.offsetWidth; p.classList.remove('nav-snap'); }
function navigate(id){ if (topScreen() === id) return; navMode('push'); stack = stack.filter(x => x !== id); stack.push(id); render(); }
function goBack(){ if (stack.length < 2) return; if (topScreen() === 'song') leaveSong(); navMode('push'); stack.pop(); render(); }
function goSection(name){ closeSheet(); if (name === 'profile') renderProfile(); if (topScreen() === 'song') leaveSong(); navMode('fade'); stack = name === 'home' ? ['home'] : ['home', name]; render(); }
$$('[data-back]').forEach(b => b.addEventListener('click', goBack));
$$('.tb[data-tb]').forEach(b => b.addEventListener('click', () => { goSection(b.dataset.tb); }));
$('tbRecord').addEventListener('click', () => openSong(null, 'record'));

/* ============================ SHEET (every pop-up) ============================ */
let lastPointer = null;
document.addEventListener('pointerdown', e => { lastPointer = { x: e.clientX, y: e.clientY }; }, true);
function openSheet(html, bind){
  const sh = $('sheet'), card = $('sheetCard');
  card.innerHTML = html; [...card.children].forEach((c, i) => c.style.setProperty('--i', i));
  card.scrollTop = 0;
  if (DESKTOP && lastPointer){ const r = card.getBoundingClientRect(); card.style.setProperty('--ox', (lastPointer.x - r.left) + 'px'); card.style.setProperty('--oy', (lastPointer.y - r.top) + 'px'); }
  sh.classList.remove('show'); void sh.offsetWidth; sh.classList.add('show'); $('scrim').classList.add('show');
  bind && bind(card);
  const f = card.querySelector('[autofocus]'); if (f) setTimeout(() => f.focus(), 280);
}
function closeSheet(){ $('sheet').classList.remove('show'); $('scrim').classList.remove('show'); }
$('scrim').addEventListener('click', closeSheet);
$('sheet').addEventListener('click', e => { if (e.target === $('sheet')) closeSheet(); });
if (window.visualViewport) visualViewport.addEventListener('resize', () => { const kb = Math.max(0, window.innerHeight - visualViewport.height); $('phone').style.setProperty('--kb', kb + 'px'); });
/** small building blocks for sheets */
const menuHTML = items => `<div class="menu">${items.map((it, i) => `<button class="menu-item ${it.danger ? 'danger' : ''}" data-mi="${i}"><i class="ph ${it.icon}"></i>${esc(it.label)}${it.check ? '<i class="ph ph-check check"></i>' : ''}</button>`).join('')}</div>`;
function openMenu(title, items){ openSheet((title ? `<h3 class="sheet-title">${esc(title)}</h3>` : '') + menuHTML(items), c => $$('[data-mi]', c).forEach(b => b.addEventListener('click', () => { const it = items[+b.dataset.mi]; if (!it.keep) closeSheet(); it.run(); }))); }
function ask(o){ // {title, text, value, placeholder, area, ok, run}
  openSheet(`<h3 class="sheet-title">${esc(o.title)}</h3>${o.text ? `<p class="sheet-text">${esc(o.text)}</p>` : ''}
    ${o.area ? `<textarea class="field" id="pv" placeholder="${esc(o.placeholder || '')}" autofocus>${esc(o.value || '')}</textarea>` : `<input class="field" id="pv" value="${esc(o.value || '')}" placeholder="${esc(o.placeholder || '')}" autocomplete="off" autofocus />`}
    <div class="actions"><button class="btn btn-quiet" id="pc">Cancel</button><button class="btn btn-ink" id="po">${esc(o.ok || 'Save')}</button></div>`, c => {
    const go = () => { const v = $('pv').value.trim(); if (!v){ $('pv').focus(); return; } closeSheet(); o.run(v); };
    $('pc').addEventListener('click', closeSheet); $('po').addEventListener('click', go);
    $('pv').addEventListener('keydown', e => { if (e.key === 'Enter' && !o.area){ e.preventDefault(); go(); } });
  });
}
function confirmSheet(title, text, ok, run){ openSheet(`<h3 class="sheet-title">${esc(title)}</h3><p class="sheet-text">${esc(text)}</p><div class="actions"><button class="btn btn-quiet" id="cc">Cancel</button><button class="btn btn-red" id="co">${esc(ok)}</button></div>`,
  () => { $('cc').addEventListener('click', closeSheet); $('co').addEventListener('click', () => { closeSheet(); run(); }); }); }
const PALETTE = ['#E6E6E1','#F4F4F1','#EDE4CF','#F3D9D2','#DCE6DA','#D9DEE8','#E8DCEB','#C9C9C4','#3B3B39','#161616','#E3261F','#2F5D50'];
function pickColour(title, current, run){ openSheet(`<h3 class="sheet-title">${esc(title)}</h3><div class="swatches">${PALETTE.map(c => `<button class="swatch ${c === current ? 'sel' : ''}" style="background:${c}" data-c="${c}" aria-label="${c}"></button>`).join('')}</div>`,
  c => $$('[data-c]', c).forEach(b => b.addEventListener('click', () => { closeSheet(); run(b.dataset.c); }))); }
function pickIdea(title, run){ openSheet(`<h3 class="sheet-title">${esc(title)}</h3>${songs.filter(s => s.title).map(s => `<button class="pick" data-id="${s.id}">${esc(s.title)}<small>${hasAudio(s) ? fmtT(songDur(s)) : 'Lyrics'}</small></button>`).join('')}`,
  c => $$('[data-id]', c).forEach(b => b.addEventListener('click', () => { closeSheet(); run(songs.find(s => String(s.id) === b.dataset.id)); }))); }
let fileCb = null;
function pickImage(cb){ fileCb = cb; $('fileInput').click(); }
$('fileInput').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (!f || !fileCb) return; const r = new FileReader(); r.onload = () => fileCb(r.result); r.readAsDataURL(f); });

/* ---------- search ---------- */
$$('.do-search').forEach(b => b.addEventListener('click', () => { const t = b.closest('.top'); t.classList.add('searching'); setTimeout(() => t.querySelector('.search input').focus(), 60); }));
$$('.search-cancel').forEach(b => b.addEventListener('click', () => { const t = b.closest('.top'), i = t.querySelector('.search input'); i.value = ''; t.classList.remove('searching'); runSearch(i.dataset.scope, ''); }));
$$('.search input').forEach(i => i.addEventListener('input', () => runSearch(i.dataset.scope, i.value.trim())));
function runSearch(scope, q){ if (scope === 'home') renderIdeas(q); else renderInsp(q); }

/* ============================ IDEAS ============================ */
let activeList = 'all';
function renderChips(){
  const all = [{ id: 'all', name: 'All' }, ...lists];
  $('homeChips').innerHTML = all.map(l => `<button class="chip ${l.id === activeList ? 'active' : ''}" data-l="${l.id}">${esc(l.name)}</button>`).join('') + `<button class="chip-add" id="addList" aria-label="New list"><span><i class="ph ph-plus"></i></span></button>`;
  $$('[data-l]', $('homeChips')).forEach(b => b.addEventListener('click', () => { const id = b.dataset.l;
    if (id === activeList && id !== 'all'){ listMenu(id); return; } activeList = id; renderChips(); renderIdeas(); }));
  $('addList').addEventListener('click', () => ask({ title: 'New list', placeholder: 'List name', ok: 'Create', run: v => { const id = 'l' + Date.now().toString(36); lists.push({ id, name: v }); activeList = id; renderChips(); renderIdeas(); toast('List created'); } }));
}
function listMenu(id){ const l = lists.find(x => x.id === id); openMenu(l.name, [
  { icon: 'ph-pencil-simple', label: 'Rename list', run: () => ask({ title: 'Rename list', value: l.name, run: v => { l.name = v; renderChips(); } }) },
  { icon: 'ph-trash', label: 'Delete list', danger: true, run: () => confirmSheet('Delete “' + l.name + '”?', 'The ideas stay in All.', 'Delete', () => { lists = lists.filter(x => x !== l); songs.forEach(s => { if (s.list === id) s.list = null; }); activeList = 'all'; renderChips(); renderIdeas(); }) }]); }

function memoHTML(s, q){
  const audio = hasAudio(s), layers = s.stems.length > 1 ? ' · ' + s.stems.length + ' layers' : '';
  return `<div class="memo" data-id="${s.id}"><div class="memo-row"><div class="memo-meta"><div class="memo-title">${hl(s.title || 'Untitled idea', q)}</div><div class="memo-sub">${esc(s.date)}${layers}${audio ? '' : ' · Lyrics'}</div></div>
    ${audio ? `<span class="memo-dur">${fmtT(songDur(s))}</span>` : `<i class="ph ph-pencil-simple memo-dur"></i>`}</div>
    ${audio ? `<div class="memo-more"><div><div class="memo-inner">${waveHTML()}<div class="times"><span class="t-cur">0:00</span><span class="t-rem">-${fmtT(songDur(s))}</span></div>
      <div class="controls"><button class="icon-btn" data-a="open" aria-label="Open idea"><i class="ph ph-arrow-up-right"></i></button><button class="icon-btn" data-a="back" aria-label="Back 15 seconds"><i class="ph ph-arrow-counter-clockwise"></i></button>
      <button class="play-btn" data-a="play" aria-label="Play"><i class="ph-fill ph-play"></i></button><button class="icon-btn" data-a="fwd" aria-label="Forward 15 seconds"><i class="ph ph-arrow-clockwise"></i></button><button class="icon-btn" data-a="del" aria-label="Delete"><i class="ph ph-trash"></i></button></div>
      <button class="btn btn-quiet btn-sm" data-a="lyrics"><i class="ph ph-text-align-left"></i> See lyrics</button><div class="lyrics-peek" hidden></div></div></div></div>` : ''}</div>`;
}
let openMemoId = null;
function renderIdeas(q){
  q = q || ''; const ql = q.toLowerCase();
  const list = songs.filter(s => (activeList === 'all' || s.list === activeList) && (!ql || (s.title + ' ' + s.lyrics).toLowerCase().includes(ql)));
  $('ideasList').innerHTML = list.map(s => memoHTML(s, q)).join('');
  $('homeEmpty').hidden = !!list.length;
  $('homeEmpty').innerHTML = q ? `<i class="ph ph-magnifying-glass"></i><h3>No results</h3><p>Nothing matches “${esc(q)}”.</p>` :
    `<i class="ph ph-waveform"></i><h3>No ideas here yet</h3><p>Tap the red button to record one.</p><button class="btn btn-red" id="emptyRec"><i class="ph-fill ph-circle"></i> Record</button>`;
  const er = $('emptyRec'); if (er) er.addEventListener('click', () => openSong(null, 'record'));
  $$('.memo', $('ideasList')).forEach(bindMemo);
  if (openMemoId){ const m = $$('.memo', $('ideasList')).find(x => x.dataset.id === String(openMemoId)); if (m) expandMemo(m, false, true); }
}
function bindMemo(el){
  const s = songs.find(x => String(x.id) === el.dataset.id);
  el.querySelector('.memo-row').addEventListener('click', () => { if (!hasAudio(s)){ openSong(s, 'play'); return; } el.classList.contains('open') ? collapseMemos() : expandMemo(el); });
  $$('[data-a]', el).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); const a = b.dataset.a;
    if (a === 'open') openSong(s, 'play'); else if (a === 'play') togglePlay(s); else if (a === 'back') seekBy(s, -15); else if (a === 'fwd') seekBy(s, 15);
    else if (a === 'del') confirmSheet('Delete “' + (s.title || 'Untitled idea') + '”?', 'This removes the recording and its lyrics.', 'Delete', () => deleteSong(s));
    else if (a === 'lyrics'){ const p = el.querySelector('.lyrics-peek'); p.hidden = !p.hidden;
      b.innerHTML = p.hidden ? '<i class="ph ph-text-align-left"></i> See lyrics' : '<i class="ph ph-text-align-left"></i> Hide lyrics';
      p.innerHTML = s.lyrics ? esc(s.lyrics) + '<br><button class="btn btn-ink btn-sm" data-edit>Edit lyrics</button>' : '<span style="color:var(--muted)">No lyrics yet.</span><br><button class="btn btn-ink btn-sm" data-edit>Write lyrics</button>';
      p.querySelector('[data-edit]').addEventListener('click', ev => { ev.stopPropagation(); openSong(s, 'play'); }); } }));
}
function collapseMemos(){ $$('.memo.open').forEach(m => m.classList.remove('open')); openMemoId = null; if (Engine.Player.playing && !Rec.mode) Engine.Player.stop(); }
async function expandMemo(el, autoplay, quiet){
  const s = songs.find(x => String(x.id) === el.dataset.id);
  if (!quiet) collapseMemos(); el.classList.add('open'); openMemoId = s.id;
  const w = el.querySelector('.wave'); drawWave(w, new Array(60).fill(.07), [], 1);
  await ensureAudio(s); drawWave(w, s.peaks, s.notes, songDur(s));
  if (!w._bound){ w._bound = 1; scrub(w, f => seekTo(s, f * songDur(s))); }
  if (autoplay) togglePlay(s);
}
function deleteSong(s){
  if (Engine.Player.song === s) Engine.Player.stop();
  songs = songs.filter(x => x !== s); inspItems = inspItems.filter(i => i.board !== 'song-' + s.id);
  if (s.mine) nativePost({ type: 'delete', id: s.id });
  if (topScreen() === 'song' && current === s){ current = null; navMode('push'); stack.pop(); render(); }
  renderIdeas(); renderBoards(); renderInsp(); toast('Deleted');
}

/* ---------- playback shared by memos, song page and feed ---------- */
function togglePlay(s){
  const P = Engine.Player;
  if (P.playing && P.song === s){ P.stop(); s._pos = P.off; return; }
  if (Rec.mode && Rec.state === 'recording') return;
  ensureAudio(s).then(() => { let pos = s._pos || 0; if (pos >= songDur(s) - .05) pos = 0; P.play(s, pos); });
}
function seekTo(s, t){ const P = Engine.Player; t = clamp(t, 0, songDur(s)); if (P.song === s && P.playing) P.seek(t); else s._pos = t; }
function seekBy(s, d){ const P = Engine.Player; seekTo(s, (P.song === s && P.playing ? P.pos() : (s._pos || 0)) + d); }
Engine.Player.onEnd = () => { const s = Engine.Player.song; if (s) s._pos = 0; };
const posOf = s => (Engine.Player.song === s && Engine.Player.playing) ? Engine.Player.pos() : (s._pos || 0);
const playingIs = s => Engine.Player.playing && Engine.Player.song === s;
function frame(){
  // memo rows
  if (openMemoId != null){ const el = $$('.memo.open')[0], s = songs.find(x => x.id === openMemoId);
    if (el && s){ const d = songDur(s) || 1, p = posOf(s); setWave(el.querySelector('.wave'), p / d); el.querySelector('.t-cur').textContent = fmtT(p); el.querySelector('.t-rem').textContent = '-' + fmtT(d - p);
      const ic = el.querySelector('[data-a="play"] i'); const want = playingIs(s) ? 'ph-fill ph-pause' : 'ph-fill ph-play'; if (ic.className !== want) ic.className = want; } }
  // song dock
  if (topScreen() === 'song') dockFrame();
  // feed
  $$('.post').forEach(el => { const s = POSTS.find(p => p.id === el.dataset.id); if (!s) return; setWave(el.querySelector('.wave'), posOf(s) / (songDur(s) || 1));
    const ic = el.querySelector('.play-btn i'); const want = playingIs(s) ? 'ph-fill ph-pause' : 'ph-fill ph-play'; if (ic.className !== want) ic.className = want; });
  requestAnimationFrame(frame);
}

/* ============================ SONG ============================ */
let current = null, songTab = 'song', showTab = false;
function draftSong(){ return { id: nextId(), title: '', list: activeList !== 'all' ? activeList : null, date: 'Today', lyrics: '', notes: [], stems: [], dur: 0, demo: null, draft: true }; }
function openSong(s, mode){
  closeSheet(); if (Engine.Player.playing) Engine.Player.stop(); collapseMemos();
  current = s || draftSong(); songTab = 'song'; showTab = false;
  $$('#songTabs .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'song'));
  $('songTitle').value = current.title || '';
  paintSongCard(); renderSongPane();
  Rec.reset(mode === 'layer' ? 'layer' : (mode === 'record' || !hasAudio(current)) ? 'new' : null);
  renderDock();
  navigate('song');
  if (hasAudio(current)) ensureAudio(current).then(() => { renderDock(); renderSongPane(); });
}
function leaveSong(){
  if (!current) return; if (Rec.state === 'recording') Rec.pause();
  Engine.Player.stop();
  const s = current;
  if (s.draft){ if (s.title || s.lyrics || inspItems.some(i => i.board === 'song-' + s.id)){ s.draft = false; s.date = today(); songs.unshift(s); renderIdeas(); } }
  else persist(s, false);
  Rec.reset(null);
}
function paintSongCard(){
  const s = current, card = $('songCard'), cov = $('songCover');
  card.style.background = s.bg || ''; card.style.color = s.bg ? inkOn(s.bg) : '';
  cov.style.backgroundImage = s.cover ? `url(${s.cover})` : ''; cov.classList.toggle('has-img', !!s.cover);
  const bits = [s.draft ? 'New idea' : s.date]; if (hasAudio(s)) bits.push(fmtT(songDur(s))); if (s.stems.length > 1) bits.push(s.stems.length + ' layers'); if (s.from) bits.push('with ' + s.from.split(' ')[0]);
  $('songSub').textContent = bits.join(' · ');
}
$('songTitle').addEventListener('input', () => { if (current){ current.title = $('songTitle').value; } });
$$('#songTabs .seg-btn').forEach(b => b.addEventListener('click', () => { songTab = b.dataset.tab; $$('#songTabs .seg-btn').forEach(x => x.classList.toggle('active', x === b)); renderSongPane(); }));
$('songCover').addEventListener('click', () => current.cover ? openMenu('Picture', [
  { icon: 'ph-image', label: 'Choose another picture', run: () => pickImage(d => { current.cover = d; paintSongCard(); }) },
  { icon: 'ph-x', label: 'Remove picture', danger: true, run: () => { current.cover = null; paintSongCard(); } }]) : pickImage(d => { current.cover = d; paintSongCard(); }));
$('songMore').addEventListener('click', () => { const s = current; openMenu(null, [
  { icon: 'ph-palette', label: 'Card colour', run: () => pickColour('Card colour', s.bg, c => { s.bg = c === '#E6E6E1' ? null : c; paintSongCard(); }) },
  { icon: 'ph-image', label: s.cover ? 'Change picture' : 'Add a picture', run: () => pickImage(d => { s.cover = d; paintSongCard(); }) },
  { icon: 'ph-list-plus', label: s.list ? 'In “' + listName(s.list) + '”' : 'Add to a list', run: () => openMenu('Add to a list', [
      ...lists.map(l => ({ icon: 'ph-list-bullets', label: l.name, check: s.list === l.id, run: () => { s.list = s.list === l.id ? null : l.id; renderIdeas(); toast(s.list ? 'Added to ' + l.name : 'Removed from list'); } })),
      { icon: 'ph-plus', label: 'New list', run: () => ask({ title: 'New list', placeholder: 'List name', ok: 'Create', run: v => { const id = 'l' + Date.now().toString(36); lists.push({ id, name: v }); s.list = id; renderChips(); renderIdeas(); toast('Added to ' + v); } }) }]) },
  ...(s.draft ? [] : [{ icon: 'ph-trash', label: 'Delete idea', danger: true, run: () => confirmSheet('Delete “' + (s.title || 'Untitled idea') + '”?', 'This removes the recording, layers and lyrics.', 'Delete', () => deleteSong(s)) }])]); });
$('songShare').addEventListener('click', () => sendToFriend(current));

function renderSongPane(){
  const s = current, el = $('songPane');
  if (songTab === 'mood'){ renderMood(el); return; }
  const audio = hasAudio(s) && !s.draft;
  el.innerHTML = `<textarea class="lyrics" id="lyrics" placeholder="Write your lyrics…">${esc(s.lyrics)}</textarea>${audio ? '<section class="chordbox" id="chordBox"></section>' : ''}`;
  const ta = $('lyrics'), grow = () => { ta.style.height = 'auto'; ta.style.height = Math.max(ta.scrollHeight, DESKTOP ? 260 : 200) + 'px'; };
  ta.addEventListener('input', () => { s.lyrics = ta.value; grow(); }); requestAnimationFrame(grow);
  if (audio) renderChords();
}
/* Chords, the way players read them: the loop in order, the key, an easier capo option,
   a diagram for every chord (guitar or piano), and the changes written under the waveform while it plays. */
function renderChords(){
  const s = current, box = $('chordBox'); if (!box) return;
  if (!s.recChords){
    box.innerHTML = `<div class="cb-empty"><button class="btn btn-ink btn-sm" id="recog"><i class="ph ph-waveform"></i> Find chords</button><span>Listens to the recording and writes out the chords for you.</span></div>`;
    $('recog').addEventListener('click', () => recognise(s)); return;
  }
  const rc = s.recChords, { pattern, times } = Engine.loopOf(rc.seq), uniq = [...new Set(rc.seq)], capo = capoFor(uniq), piano = settings.instrument === 'piano';
  const shapes = (capo && s._capo && !piano) ? uniq.map(c => transpose(c, -capo)) : uniq;
  box.innerHTML = `<div class="cb-head"><b>Chords</b><span>Key of ${esc(rc.key)}</span><button class="icon-btn" id="recog" aria-label="Listen again"><i class="ph ph-arrow-clockwise"></i></button></div>
    <div class="chords">${pattern.map(c => `<span class="chord">${esc(c)}</span>`).join('<i class="ph ph-caret-right chord-sep"></i>')}${times >= 1.5 ? `<span class="chords-note">×${Math.floor(times)}</span>` : ''}</div>
    ${capo && !piano ? `<button class="cb-capo ${s._capo ? 'on' : ''}" id="capoT"><span class="switch"></span>Capo ${capo} · play ${uniq.map(c => esc(transpose(c, -capo))).join(' · ')} shapes</button>` : ''}
    <div class="cb-inst seg"><button class="seg-btn ${piano ? '' : 'active'}" data-inst="guitar">Guitar</button><button class="seg-btn ${piano ? 'active' : ''}" data-inst="piano">Piano</button></div>
    <div class="diagrams">${uniq.map((c, i) => `<figure class="diagram">${piano ? pianoSVG(c) : guitarSVG(shapes[i])}<figcaption>${esc(c)}${(capo && s._capo && !piano) ? `<small>${esc(shapes[i])} shape</small>` : ''}</figcaption></figure>`).join('')}</div>`;
  $('recog').addEventListener('click', () => recognise(s));
  if ($('capoT')) $('capoT').addEventListener('click', () => { s._capo = !s._capo; renderChords(); });
  $$('[data-inst]', box).forEach(b => b.addEventListener('click', () => { settings.instrument = b.dataset.inst; store.set('settings', settings); renderChords(); }));
}
const transpose = (ch, k) => { const p = Engine.parseChord(ch); return p ? Engine.NAMES[((p.root + k) % 12 + 12) % 12] + (p.minor ? 'm' : '') : ch; };
const OPEN = new Set(['C','D','E','G','A','Am','Dm','Em']);
/** smallest capo that turns the most chords into open shapes (only when it really helps) */
function capoFor(chords){
  const score = k => chords.filter(c => OPEN.has(transpose(c, -k))).length, base = score(0); let best = 0, bs = base;
  for (let k = 1; k <= 7; k++){ const sc = score(k); if (sc > bs){ bs = sc; best = k; } }
  return (best && bs >= Math.min(chords.length, base + 2)) || (best && bs === chords.length && base < chords.length) ? best : 0;
}
/** key: the major/minor key whose diatonic triads cover the most chord time */
function keyOf(segments){
  const dur = {}; segments.forEach(g => dur[g.chord] = (dur[g.chord] || 0) + (g.end - g.start)); let best = null, bs = -1;
  for (let r = 0; r < 12; r++){ const dia = [[0,''],[2,'m'],[4,'m'],[5,''],[7,''],[9,'m']].map(([i, q]) => Engine.NAMES[(r + i) % 12] + q);
    const sc = dia.reduce((a, c) => a + (dur[c] || 0), 0) + (dur[dia[0]] || 0) * .5 + (dur[dia[5]] || 0) * .3;
    if (sc > bs){ bs = sc; const maj = dur[dia[0]] || 0, min = dur[dia[5]] || 0; best = min > maj * 1.2 ? Engine.NAMES[(r + 9) % 12] + ' minor' : Engine.NAMES[r] + ' major'; } }
  return best || '…';
}
let recognising = false;
async function recognise(s){
  if (recognising) return; recognising = true;
  const box = $('chordBox'); if (box) box.innerHTML = `<div class="cb-head"><b>Listening…</b></div><div class="progress-line"><span id="rp"></span></div>`;
  try {
    await ensureAudio(s);
    const r = await Engine.chords(Engine.mix(s.stems), Engine.context().sampleRate, p => { const x = $('rp'); if (x) x.style.width = Math.round(p * 100) + '%'; });
    if (!r.seq.length){ s.recChords = null; toast('No clear chords: try recording an instrument'); }
    else { s.recChords = { seq: r.seq, key: keyOf(r.segments), segments: r.segments.map(g => ({ chord: g.chord, start: +g.start.toFixed(2), end: +g.end.toFixed(2) })) }; persist(s, false); }
  } catch (e){ toast('Couldn’t listen to this recording'); nativePost({ type: 'log', msg: 'chords: ' + e }); }
  recognising = false; if (current === s){ renderChords(); renderDock(); }
}
/* ---------- chord diagrams ---------- */
const SHAPES = { C:'x32010', D:'xx0232', E:'022100', F:'133211', G:'320003', A:'x02220', B:'x24442', Am:'x02210', Bm:'x24432', Dm:'xx0231', Em:'022000', Fm:'133111', Cm:'x35543', Gm:'355333', 'F#m':'244222', 'C#m':'x46654', Bb:'x13331', Eb:'x68886', Ab:'466544', 'F#':'244322', 'C#':'x46664', Ebm:'x68876', Bbm:'x13321', 'G#m':'466444', Abm:'466444' };
function guitarShape(ch){
  if (SHAPES[ch]) return SHAPES[ch].split('').map(x => x === 'x' ? 'x' : +x);
  const p = Engine.parseChord(ch); if (!p) return ['x','x','x','x','x','x'];
  const e = ((p.root - 4) + 12) % 12 || 12, a = ((p.root - 9) + 12) % 12 || 12;
  return e <= a ? (p.minor ? [e, e + 2, e + 2, e, e, e] : [e, e + 2, e + 2, e + 1, e, e]) : (p.minor ? ['x', a, a + 2, a + 2, a + 1, a] : ['x', a, a + 2, a + 2, a + 2, a]);
}
function guitarSVG(ch){
  const sh = guitarShape(ch), p = Engine.parseChord(ch), OPENS = [40, 45, 50, 55, 59, 64];
  const fr = sh.filter(v => v !== 'x' && v > 0), lo = Math.min(...fr), hi = Math.max(...fr), base = hi <= 4 ? 1 : lo;
  const X = i => 9 + i * 9.2, Y = r => 16 + r * 13, out = [];
  out.push(`<svg viewBox="0 0 64 86" width="64" height="86" aria-label="${esc(ch)} guitar shape">`);
  for (let i = 0; i < 6; i++) out.push(`<line x1="${X(i)}" y1="${Y(0)}" x2="${X(i)}" y2="${Y(5)}" class="dg-line"/>`);
  for (let r = 0; r <= 5; r++) out.push(`<line x1="${X(0)}" y1="${Y(r)}" x2="${X(5)}" y2="${Y(r)}" class="dg-line"/>`);
  if (base === 1) out.push(`<rect x="${X(0) - 1}" y="${Y(0) - 2.5}" width="${X(5) - X(0) + 2}" height="3" rx="1" class="dg-nut"/>`); else out.push(`<text x="${X(5) + 3}" y="${Y(0) + 9}" class="dg-fr">${base}</text>`);
  let rootDone = false; const counts = {}; sh.forEach(v => { if (v !== 'x' && v > 0) counts[v] = (counts[v] || 0) + 1; });
  const barre = (lo !== hi && sh[sh.findIndex(v => v !== 'x')] === lo && sh[5] === lo) ? lo : null;
  if (barre){ const first = sh.findIndex(v => v === barre); out.push(`<rect x="${X(first) - 4}" y="${Y(barre - base + .5) - 4}" width="${X(5) - X(first) + 8}" height="8" rx="4" class="dg-dot"/>`); }
  sh.forEach((v, i) => {
    if (v === 'x'){ out.push(`<text x="${X(i)}" y="10" class="dg-mark">×</text>`); return; }
    const isRoot = p && !rootDone && ((OPENS[i] + v) % 12 === p.root); if (isRoot) rootDone = true;
    if (v === 0){ out.push(`<circle cx="${X(i)}" cy="7" r="2.6" class="dg-open ${isRoot ? 'root' : ''}"/>`); return; }
    if (v === barre && !isRoot) return;
    out.push(`<circle cx="${X(i)}" cy="${Y(v - base + .5)}" r="4" class="dg-dot ${isRoot ? 'root' : ''}"/>`);
  });
  return out.join('') + '</svg>';
}
function pianoSVG(ch){
  const p = Engine.parseChord(ch); if (!p) return '';
  const notes = [p.root, p.root + (p.minor ? 3 : 4), p.root + 7], W = 9, out = [`<svg viewBox="0 0 127 64" width="127" height="64" aria-label="${esc(ch)} on piano">`];
  const whites = [0, 2, 4, 5, 7, 9, 11], blackOff = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 };
  for (let o = 0; o < 2; o++) whites.forEach((n, i) => { const k = o * 12 + n, x = (o * 7 + i) * W; out.push(`<rect x="${x + .5}" y=".5" width="${W - 1}" height="62" rx="2" class="pk-w"/>`);
    if (notes.includes(k)) out.push(`<circle cx="${x + W / 2}" cy="52" r="3" class="dg-dot ${k === p.root ? 'root' : ''}"/>`); });
  for (let o = 0; o < 2; o++) Object.entries(blackOff).forEach(([n, i]) => { const k = o * 12 + +n, x = (o * 7 + i + 1) * W - 3; out.push(`<rect x="${x}" y=".5" width="6" height="38" rx="1.5" class="pk-b"/>`);
    if (notes.includes(k)) out.push(`<circle cx="${x + 3}" cy="31" r="2.4" class="dg-dot light ${k === p.root ? 'root' : ''}"/>`); });
  return out.join('') + '</svg>';
}

/* ---------- moodboard (one per song) ---------- */
function tileHTML(it){
  if (it.type === 'photo') return `<button class="tile photo" data-it="${it.id}"><img src="${it.src}" alt=""></button>`;
  if (it.type === 'link'){ let host = it.text; try { host = new URL(it.text).hostname.replace(/^www\./, ''); } catch (e) {}
    const ic = /youtu/.test(host) ? 'ph-youtube-logo' : /spotify/.test(host) ? 'ph-spotify-logo' : /soundcloud/.test(host) ? 'ph-soundcloud-logo' : 'ph-link';
    return `<button class="tile link" data-it="${it.id}"><span class="tile-ic"><i class="ph ${ic}"></i></span><span><b>${esc(host)}</b><small>${esc(it.text)}</small></span></button>`; }
  if (it.type === 'idea'){ const s = songs.find(x => x.id === it.song); return `<button class="tile idea" data-it="${it.id}"><span class="tile-ic"><i class="ph ph-waveform"></i></span><span><b>${esc(s ? s.title : 'Idea')}</b><small>${s && hasAudio(s) ? fmtT(songDur(s)) : 'Lyrics'}</small></span></button>`; }
  return `<button class="tile note" data-it="${it.id}" style="background:${it.color || '#EDE4CF'};color:${inkOn(it.color || '#EDE4CF')}">${esc(it.text)}</button>`;
}
function renderMood(el){
  const id = 'song-' + current.id, items = inspItems.filter(i => i.board === id);
  el.innerHTML = `<div class="mood">${items.map(tileHTML).join('')}<button class="tile tile-add" id="moodAdd"><i class="ph ph-plus"></i>Add to moodboard</button></div>`;
  $$('[data-it]', el).forEach(b => b.addEventListener('click', () => tileMenu(inspItems.find(i => String(i.id) === b.dataset.it))));
  $('moodAdd').addEventListener('click', () => addInspiration(id));
}

/* ============================ DOCK: recorder + player ============================ */
const Rec = {
  mode: null, state: 'idle', chunks: [], len: 0, capStart: null, capEnd: null, pos: 0, recorded: 0, levels: [], startedAt: 0,
  reset(mode){ Engine.Player.stop(); this.mode = mode; this.state = 'idle'; this.chunks = []; this.len = 0; this.capStart = this.capEnd = null; this.pos = this.recorded = 0; this.levels = []; },
  buffer(){ const out = new Float32Array(this.len); let o = 0; this.chunks.forEach(c => { out.set(c, o); o += c.length; }); return Engine.bufferFrom(out); },
  trim(sec){ const n = Math.round(sec * Engine.context().sampleRate); if (n >= this.len) return; let o = 0; const keep = [];
    for (const c of this.chunks){ if (o + c.length <= n){ keep.push(c); o += c.length; } else { if (n > o) keep.push(c.slice(0, n - o)); break; } } this.chunks = keep; this.len = n; this.recorded = sec; },
  async start(){
    try { await Engine.initMic(settings.clean); } catch (e){ toast(NATIVE ? 'Allow the microphone in System Settings › Privacy' : 'Microphone not available'); nativePost({ type: 'log', msg: 'mic: ' + e }); return; }
    const c = Engine.context();
    if (this.state === 'paused' && this.pos < this.recorded - .02){ this.trim(this.pos); this.levels = this.levels.slice(0, Math.round(this.levels.length * this.pos / (this.recorded || 1))); }
    Engine.Player.stop();
    const when = c.currentTime + (this.mode === 'layer' ? .15 : .03);
    this.capStart = when; this.capEnd = null; this.startedAt = this.recorded = this.len / c.sampleRate;
    if (this.mode === 'layer') Engine.Player.play(current, this.recorded, when);
    this.state = 'recording'; renderDock();
  },
  pause(){ if (this.state !== 'recording') return; const c = Engine.context(); this.capEnd = c.currentTime; this.recorded = this.startedAt + (this.capEnd - this.capStart);
    this.pos = this.recorded; this.state = 'paused'; Engine.Player.stop(); renderDock(); },
  elapsed(){ return this.state === 'recording' ? this.startedAt + Math.max(0, Engine.context().currentTime - this.capStart) : this.pos; },
  preview(){ const P = Engine.Player; if (P.playing && P.song && P.song._preview){ P.stop(); this.pos = P.off; return; }
    const stems = [...(this.mode === 'layer' ? current.stems : []), { buf: this.buffer(), name: 'take', offset: this.mode === 'layer' ? -Engine.latency() : 0 }], tmp = { stems, _preview: true };
    if (this.pos >= this.recorded - .05) this.pos = 0; P.play(tmp, this.pos); }
};
Engine.setChunkHandler((d, t) => {
  if (Rec.capStart == null) return; const rate = Engine.context().sampleRate, end = Rec.capEnd == null ? Infinity : Rec.capEnd;
  if (t + d.length / rate <= Rec.capStart || t >= end) return;
  let a = 0, b = d.length; if (t < Rec.capStart) a = Math.round((Rec.capStart - t) * rate); if (t + d.length / rate > end) b = Math.round((end - t) * rate);
  if (b <= a) return; const part = d.slice(a, b); Rec.chunks.push(part); Rec.len += part.length;
});

function renderDock(){
  const d = $('dock'), s = current;
  if (Rec.mode){
    const st = Rec.state, layerN = s.stems.length + 1;
    const tag = st === 'recording' ? 'Recording' : st === 'paused' ? 'Paused' : Rec.mode === 'layer' ? 'Layer ' + layerN + (s.from ? ' over ' + s.from.split(' ')[0] : '') : 'Ready';
    const stack = Rec.mode === 'layer' ? `<div class="dock-stack">${s.stems.map((x, i) => `<span style="--c:${LAYER_COL[i % LAYER_COL.length]}"><i>${i + 1}</i>${esc(x.name)}</span>`).join('')}<span class="new" style="--c:${LAYER_COL[s.stems.length % LAYER_COL.length]}"><i>${layerN}</i>Layer ${layerN}</span></div>` : '';
    d.innerHTML = `<div class="dock-tag ${st === 'recording' ? 'rec' : ''}"><i></i>${esc(tag)}</div>${stack}<div class="timer" id="dTimer">${fmtClock(Rec.elapsed())}</div>
      ${st === 'paused' ? waveHTML('') : `<div class="wave live" id="liveWave"><div class="wave-bars"></div></div>`}
      ${st === 'paused' ? `<div class="transport"><button class="seek" data-j="-10">-10</button><button class="play-btn" id="dPrev" aria-label="Play back"><i class="ph-fill ph-play"></i></button><button class="seek" data-j="10">+10</button></div>
        <div class="dock-row"><button class="btn btn-quiet btn-sm" id="dDel"><i class="ph ph-trash"></i> Delete</button><button class="btn btn-red btn-sm" id="dRes"><i class="ph-fill ph-circle"></i> ${Rec.pos < Rec.recorded - .05 ? 'Record from here' : 'Resume'}</button><button class="btn btn-ink btn-sm" id="dSave">Save</button></div>`
      : `<div class="transport"><button class="rec-btn" id="dRec" aria-label="${st === 'recording' ? 'Pause' : 'Record'}">${st === 'recording' ? '<i class="ph-fill ph-pause"></i>' : ''}</button></div>
        ${st === 'idle' && Rec.mode === 'layer' ? `<div class="dock-row"><button class="btn btn-quiet btn-sm" id="dCancel">Cancel layer</button></div>` : ''}`}`;
    if (st === 'paused'){ const w = d.querySelector('.wave'), b = Rec.buffer(); drawWave(w, Engine.peaks(b.getChannelData(0), 300), [], Rec.recorded);
      scrub(w, f => { Rec.pos = f * Rec.recorded; if (Engine.Player.playing) { Engine.Player.stop(); Rec.preview(); } renderDockTimer(); });
      $$('[data-j]', d).forEach(x => x.addEventListener('click', () => { Rec.pos = clamp(Rec.pos + +x.dataset.j, 0, Rec.recorded); if (Engine.Player.playing){ Engine.Player.stop(); Rec.preview(); } renderDock(); }));
      $('dPrev').addEventListener('click', () => Rec.preview());
      $('dDel').addEventListener('click', () => confirmSheet('Delete this take?', 'The recording you just made will be removed.', 'Delete', () => { Rec.reset(Rec.mode); renderDock(); }));
      $('dRes').addEventListener('click', () => Rec.start()); $('dSave').addEventListener('click', saveTake);
    } else {
      $('dRec').addEventListener('click', () => Rec.state === 'recording' ? Rec.pause() : Rec.start());
      const c = $('dCancel'); if (c) c.addEventListener('click', () => { Rec.reset(null); renderDock(); });
    }
    return;
  }
  if (!hasAudio(s)){ d.innerHTML = ''; return; }
  // player
  const segs = s.recChords && s.recChords.segments, sd = songDur(s) || 1;
  d.innerHTML = `${waveHTML('')}${segs ? `<div class="chordline" id="chordLine">${segs.map((g, i) => `<span data-g="${i}" style="left:${(100 * g.start / sd).toFixed(2)}%;width:${(100 * (g.end - g.start) / sd).toFixed(2)}%">${(g.end - g.start) / sd > .035 ? esc(g.chord) : ''}</span>`).join('')}</div>` : ''}<div class="times"><span id="pCur">0:00</span><span id="pTot">${fmtT(songDur(s))}</span></div>
    <div class="transport"><button class="seek" data-j="-10">-10</button><button class="play-btn" id="pPlay" aria-label="Play"><i class="ph-fill ph-play"></i></button><button class="seek" data-j="10">+10</button></div>
    ${layersHTML(s)}
    <div class="dock-row"><button class="btn btn-quiet btn-sm" id="pNote"><i class="ph ph-note-pencil"></i> Note</button><button class="btn btn-quiet btn-sm" id="pSend"><i class="ph ph-paper-plane-tilt"></i> Send to a friend</button></div>`;
  paintLayers(s);
  const w = d.querySelector('.wave');
  if (s.peaks) drawWave(w, s.peaks, s.notes, songDur(s)); else { drawWave(w, new Array(60).fill(.07), [], 1); ensureAudio(s).then(() => { if (current === s && !Rec.mode) renderDock(); }); }
  scrub(w, f => seekTo(s, f * songDur(s)));
  w.addEventListener('click', e => { if (e.target.classList.contains('wave-note')){ const n = s.notes.find(x => Math.abs(100 * x.t / songDur(s) - parseFloat(e.target.style.left)) < .01); if (n){ seekTo(s, n.t); toast(fmtT(n.t) + ' · ' + n.text); } } });
  $('pPlay').addEventListener('click', () => togglePlay(s));
  $$('[data-j]', d).forEach(x => x.addEventListener('click', () => seekBy(s, +x.dataset.j)));
  $('pSend').addEventListener('click', () => sendToFriend(s));
  $$('[data-mute]', d).forEach(x => x.addEventListener('click', () => { const st = s.stems[+x.dataset.mute]; st.muted = !st.muted;
    if (s.stems.every(z => z.muted)){ st.muted = false; return; } const was = playingIs(s), p = posOf(s); Engine.Player.stop(); s.peaks = Engine.peaks(Engine.mix(s.stems), 400); renderDock(); if (was) Engine.Player.play(s, p); }));
  $('pLayer').addEventListener('click', () => { Engine.Player.stop(); s._pos = 0; Rec.reset('layer'); renderDock(); toast('Layer ' + (s.stems.length + 1) + ': press record and play along'); });
  $('pNote').addEventListener('click', () => { const t = posOf(s); ask({ title: 'Note at ' + fmtT(t), placeholder: 'Here’s the chorus', ok: 'Add note', run: v => { s.notes.push({ t, text: v }); s.notes.sort((a, b) => a.t - b.t); renderDock(); persist(s, false); } }); });
}
/* The layers of an idea, one under the other like tracks: its number in its own colour, its name, the shape of its sound,
   and a speaker to silence it. Under them, the way to add one. */
const LAYER_COL = ['#161616', '#E3261F', '#3B6CF6', '#1F9D6B', '#C98A1B', '#8A4FD1'];
function layersHTML(s){
  const st = s.stems, n = st.length;
  return `<div class="layers" id="layers"><div class="layers-head"><b>Layers</b><span>${n < 2 ? 'One take so far' : n + ' layers, played together'}</span></div>
    ${st.map((x, i) => `<div class="layer ${x.muted ? 'off' : ''}" style="--c:${LAYER_COL[i % LAYER_COL.length]}"><i class="layer-n">${i + 1}</i><b>${esc(x.name)}</b><div class="layer-wave" data-lw="${i}"></div><button class="layer-mute" data-mute="${i}" aria-label="${x.muted ? 'Unmute' : 'Mute'} ${esc(x.name)}"><i class="ph-fill ${x.muted ? 'ph-speaker-slash' : 'ph-speaker-high'}"></i></button></div>`).join('')}
    <button class="layer-add" id="pLayer"><i class="ph ph-plus"></i><span><b>Add a layer</b><small>Sing or play over it. Each layer keeps its own track.</small></span></button></div>`;
}
function paintLayers(s){
  $$('[data-lw]', $('dock')).forEach(el => { const x = s.stems[+el.dataset.lw]; if (!x || !x.buf) return;
    const pk = x._pk || (x._pk = Engine.peaks(x.buf.getChannelData(0), 44)); el.innerHTML = pk.map(v => `<i style="--h:${v.toFixed(3)}"></i>`).join(''); });
}
function renderDockTimer(){ const t = $('dTimer'); if (t) t.textContent = fmtClock(Rec.elapsed()); }
function dockFrame(){
  const s = current; if (!s) return;
  if (Rec.mode){
    if (Rec.state === 'recording'){ renderDockTimer(); Rec.levels.push(Engine.level());
      const lw = $('liveWave'); if (lw){ const n = Math.floor(lw.clientWidth / 4), lv = Rec.levels.slice(-n); lw.firstElementChild.innerHTML = lv.map(v => `<i style="--h:${Math.max(.06, Math.min(1, v * 1.4)).toFixed(3)}"></i>`).join(''); } }
    else if (Rec.state === 'paused'){ const P = Engine.Player; if (P.playing && P.song && P.song._preview){ Rec.pos = Math.min(Rec.recorded, P.pos()); } renderDockTimer();
      setWave($('dock').querySelector('.wave'), Rec.pos / (Rec.recorded || 1)); const i = $('dPrev') && $('dPrev').firstElementChild; if (i){ const want = (P.playing && P.song && P.song._preview) ? 'ph-fill ph-pause' : 'ph-fill ph-play'; if (i.className !== want) i.className = want; } }
    return;
  }
  const w = $('dock').querySelector('.wave'); if (!w) return; const dd = songDur(s) || 1, p = posOf(s);
  setWave(w, p / dd); const c = $('pCur'); if (c) c.textContent = fmtT(p);
  const cl = $('chordLine'); if (cl && s.recChords){ const k = s.recChords.segments.findIndex(g => p >= g.start && p < g.end); if (cl._k !== k){ cl._k = k; $$('span', cl).forEach((x, i) => x.classList.toggle('now', i === k)); } }
  const i = $('pPlay') && $('pPlay').firstElementChild; if (i){ const want = playingIs(s) ? 'ph-fill ph-pause' : 'ph-fill ph-play'; if (i.className !== want) i.className = want; }
}
async function saveTake(){
  const s = current; if (!Rec.len){ toast('Nothing recorded yet'); return; }
  Engine.Player.stop(); const buf = Rec.buffer();
  if (Rec.mode === 'layer'){ s.stems.push({ name: 'Layer ' + (s.stems.length + 1), buf, offset: -Engine.latency() }); toast('Layer ' + s.stems.length + ' added'); }
  else { await ensureAudio(s).catch(() => {}); if (hasAudio(s) && s.stems.length) s.stems.push({ name: 'Take ' + (s.stems.length + 1), buf }); else { s.stems = [{ name: 'Take', buf }]; s.demo = null; } toast('Saved'); }
  s.dur = songDur(s); s.peaks = Engine.peaks(Engine.mix(s.stems), 400); s.recChords = null; s.mine = true;
  if (s.draft){ s.draft = false; s.date = today(); if (!s.title){ s.title = 'New idea ' + today(); $('songTitle').value = s.title; } songs.unshift(s); }
  Rec.reset(null); paintSongCard(); renderSongPane(); renderDock(); renderIdeas(); persist(s, true);
}

/* ---------- share ---------- */
/* To a friend, inside the app: the idea goes into your conversation with them, and they can add their own layer to it. */
function sendToFriend(s){
  if (!s) return; if (s.draft){ toast('Save the idea first'); return; }
  openSheet(`<h3 class="sheet-title">Send to a friend</h3><p class="sheet-text">They can listen, and add their own layer to it.</p>` +
    FRIENDS.map(f => `<button class="pick" data-f="${esc(f.name)}">${faceHTML(f.name, 36)}${esc(f.name)}<small>${f.online ? 'Online' : esc(f.handle)}</small></button>`).join('') +
    `<button class="pick" id="sendFile"><span class="invite-ic" style="width:36px;height:36px;font-size:16px"><i class="ph ph-export"></i></span>Export the audio file<small>Other apps</small></button>`, c => {
    $$('[data-f]', c).forEach(b => b.addEventListener('click', () => { const n = b.dataset.f; if (!THREADS[n]) THREADS[n] = [];
      THREADS[n].push({ me: 1, idea: s.title || 'Untitled idea', song: s.id, at: 'Now' }); s.sentTo = n; closeSheet(); renderChats(); toast('Sent to ' + n.split(' ')[0]); }));
    $('sendFile').addEventListener('click', () => { closeSheet(); shareSong(s); }); });
}
async function shareSong(s){
  if (!s) return;
  if (!hasAudio(s)){ const text = (s.title ? s.title + '\n\n' : '') + (s.lyrics || ''); if (!text.trim()){ toast('Nothing to share yet'); return; }
    if (navigator.share) navigator.share({ title: s.title || 'Lyrics', text }).catch(() => {}); else { try { await navigator.clipboard.writeText(text); toast('Lyrics copied'); } catch (e) { toast('Couldn’t copy'); } } return; }
  await ensureAudio(s); const blob = Engine.wav(Engine.mix(s.stems), Engine.context().sampleRate), name = (s.title || 'Track On idea').replace(/[\\/:*?"<>|]/g, ' ') + '.wav';
  if (NATIVE){ const r = new FileReader(); r.onload = () => nativePost({ type: 'share', name, wav: String(r.result).split(',')[1] }); r.readAsDataURL(blob); return; }
  const file = new File([blob], name, { type: 'audio/wav' });
  if (navigator.canShare && navigator.canShare({ files: [file] })){ navigator.share({ files: [file], title: s.title }).catch(() => {}); return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); toast('Downloading ' + name);
}

/* ============================ INSPIRATION ============================ */
let activeBoard = 'all';
function visibleBoards(){ const songBoards = [...new Set(inspItems.map(i => i.board).filter(b => b && b.startsWith('song-')))].map(id => { const s = songs.find(x => 'song-' + x.id === id); return s ? { id, name: s.title || 'Untitled idea', song: s } : null; }).filter(Boolean);
  return [{ id: 'all', name: 'All' }, ...boards, ...songBoards]; }
function renderBoards(){
  const bs = visibleBoards(); if (!bs.some(b => b.id === activeBoard)) activeBoard = 'all';
  $('boardChips').innerHTML = bs.map(b => `<button class="chip ${b.id === activeBoard ? 'active' : ''}" data-b="${b.id}">${esc(b.name)}</button>`).join('') + `<button class="chip-add" id="addBoard" aria-label="New board"><span><i class="ph ph-plus"></i></span></button>`;
  $$('[data-b]', $('boardChips')).forEach(x => x.addEventListener('click', () => { const id = x.dataset.b, b = bs.find(z => z.id === id);
    if (id === activeBoard && id !== 'all'){ boardMenu(b); return; } activeBoard = id; renderBoards(); renderInsp(); }));
  $('addBoard').addEventListener('click', () => ask({ title: 'New board', placeholder: 'Board name', ok: 'Create', run: v => { const id = 'b' + Date.now().toString(36); boards.push({ id, name: v }); activeBoard = id; renderBoards(); renderInsp(); } }));
}
function boardMenu(b){ if (b.song){ openMenu(b.name, [{ icon: 'ph-arrow-up-right', label: 'Open the song', run: () => { openSong(b.song, 'play'); songTab = 'mood'; $$('#songTabs .seg-btn').forEach(x => x.classList.toggle('active', x.dataset.tab === 'mood')); renderSongPane(); } }]); return; }
  openMenu(b.name, [{ icon: 'ph-pencil-simple', label: 'Rename board', run: () => ask({ title: 'Rename board', value: b.name, run: v => { b.name = v; renderBoards(); } }) },
    { icon: 'ph-trash', label: 'Delete board', danger: true, run: () => confirmSheet('Delete “' + b.name + '”?', 'Everything pinned to it goes too.', 'Delete', () => { boards = boards.filter(x => x !== b); inspItems = inspItems.filter(i => i.board !== b.id); activeBoard = 'all'; renderBoards(); renderInsp(); }) }]); }
function renderInsp(q){
  q = (q || '').toLowerCase();
  const items = inspItems.filter(i => (activeBoard === 'all' || i.board === activeBoard) && (!q || (i.text || '').toLowerCase().includes(q)));
  $('inspGrid').innerHTML = items.map(tileHTML).join('');
  $$('[data-it]', $('inspGrid')).forEach(b => b.addEventListener('click', () => tileMenu(inspItems.find(i => String(i.id) === b.dataset.it))));
  $('inspEmpty').hidden = !!items.length;
  $('inspEmpty').innerHTML = q ? `<i class="ph ph-magnifying-glass"></i><h3>No results</h3><p>Nothing matches “${esc(q)}”.</p>` : `<i class="ph ph-sparkle"></i><h3>Nothing pinned yet</h3><p>Save photos, links and notes that set the mood.</p><button class="btn btn-ink" id="emptyAdd"><i class="ph ph-plus"></i> Add inspiration</button>`;
  const ea = $('emptyAdd'); if (ea) ea.addEventListener('click', () => addInspiration(activeBoard));
}
const newItemId = () => Math.max(0, ...inspItems.map(i => i.id)) + 1;
function addInspiration(board){
  board = board === 'all' ? null : board;
  const done = msg => { renderBoards(); renderInsp(); if (topScreen() === 'song' && songTab === 'mood') renderSongPane(); toast(msg); };
  openMenu('Let’s get inspired', [
    { icon: 'ph-image', label: 'Photo', run: () => pickImage(src => { inspItems.push({ id: newItemId(), board, type: 'photo', src }); done('Photo added'); }) },
    { icon: 'ph-link', label: 'Link: YouTube, Spotify, SoundCloud…', run: () => ask({ title: 'Add a link', placeholder: 'Paste a link', ok: 'Add', run: v => { if (!/^https?:\/\//i.test(v)) v = 'https://' + v; inspItems.push({ id: newItemId(), board, type: 'link', text: v }); done('Link added'); } }) },
    { icon: 'ph-note', label: 'Note', run: () => ask({ title: 'New note', area: true, placeholder: 'A line, an idea, a feeling', ok: 'Add', run: v => { inspItems.push({ id: newItemId(), board, type: 'note', text: v, color: '#EDE4CF' }); done('Note added'); } }) },
    { icon: 'ph-waveform', label: 'One of your ideas', run: () => pickIdea('Choose an idea', s => { inspItems.push({ id: newItemId(), board, type: 'idea', song: s.id, text: s.title }); done('Idea added'); }) }]);
}
function tileMenu(it){
  const refresh = () => { renderBoards(); renderInsp(); if (topScreen() === 'song' && songTab === 'mood') renderSongPane(); };
  const del = { icon: 'ph-trash', label: 'Remove', danger: true, run: () => { inspItems = inspItems.filter(x => x !== it); refresh(); } };
  if (it.type === 'note') openMenu(null, [{ icon: 'ph-pencil-simple', label: 'Edit note', run: () => ask({ title: 'Edit note', area: true, value: it.text, run: v => { it.text = v; refresh(); } }) },
    { icon: 'ph-palette', label: 'Colour', run: () => pickColour('Note colour', it.color, c => { it.color = c; refresh(); }) }, del]);
  else if (it.type === 'link') openMenu(null, [{ icon: 'ph-arrow-square-out', label: 'Open link', run: () => window.open(it.text, '_blank') },
    { icon: 'ph-pencil-simple', label: 'Edit link', run: () => ask({ title: 'Edit link', value: it.text, run: v => { it.text = /^https?:\/\//i.test(v) ? v : 'https://' + v; refresh(); } }) }, del]);
  else if (it.type === 'idea') openMenu(null, [{ icon: 'ph-arrow-up-right', label: 'Open idea', run: () => { const s = songs.find(x => x.id === it.song); if (s) openSong(s, 'play'); else toast('This idea was deleted'); } }, del]);
  else openMenu(null, [del]);
}
$('inspAdd').addEventListener('click', () => addInspiration(activeBoard));

/* ============================ FRIENDS ============================ */
let fTab = 'chats', chatWith = null;
$$('[data-ftab]').forEach(b => b.addEventListener('click', () => { fTab = b.dataset.ftab; $$('[data-ftab]').forEach(x => x.classList.toggle('active', x === b));
  $('chatsPanel').hidden = fTab !== 'chats'; $('feedPanel').hidden = fTab !== 'feed'; if (fTab === 'feed') renderFeed(); }));
const lastOf = n => { const t = THREADS[n] || []; return t[t.length - 1] || { t: 'Say hi', at: '' }; };
function renderChats(){
  $('chatsPanel').innerHTML = Object.keys(THREADS).map(n => { const l = lastOf(n);
    return `<button class="thread ${UNREAD.has(n) ? 'unread' : ''} ${DESKTOP && n === chatWith ? 'sel' : ''}" data-n="${esc(n)}">${UNREAD.has(n) ? '<span class="unread-dot"></span>' : ''}${faceHTML(n, 48)}<span class="thread-meta"><span class="thread-top"><b>${esc(n)}</b><span>${esc(l.at)}</span></span><div class="thread-last">${l.me ? 'You: ' : ''}${esc(l.idea ? 'Shared “' + l.idea + '”' : l.t)}</div></span></button>`; }).join('') +
    `<button class="thread invite" id="inviteRow"><span class="invite-ic"><i class="ph ph-paper-plane-tilt"></i></span><span class="thread-meta"><span class="thread-top"><b>Don’t see your friend?</b></span><div class="thread-last">Invite them by text</div></span></button>`;
  $$('[data-n]', $('chatsPanel')).forEach(b => b.addEventListener('click', () => openChat(b.dataset.n)));
  $('inviteRow').addEventListener('click', newMessage);
}
function openChat(name, quiet){
  chatWith = name; if (!THREADS[name]) THREADS[name] = []; UNREAD.delete(name);
  const f = FRIENDS.find(x => x.name === name);
  $('chatWho').innerHTML = `${faceHTML(name, 36)}<span><b>${esc(name)}</b><small>${f ? (f.online ? 'Online' : f.handle) : 'Invited by text'}</small></span>`;
  renderMessages(); renderChats(); if (!quiet) closeSheet();
  if (!DESKTOP && !quiet) navigate('chat');
}
function renderMessages(){
  const b = $('chatBody'), t = THREADS[chatWith] || [];
  b.innerHTML = t.map((m, i) => m.idea ? `<div class="msg ${m.me ? 'me' : ''}"><button class="bubble bubble-idea" data-i="${i}"><i class="ph-fill ph-play"></i><span><b>${esc(m.idea)}</b><small>Idea · open</small></span></button></div>`
    : `<div class="msg ${m.me ? 'me' : ''}"><div class="bubble">${esc(m.t)}</div></div>`).join('') || '<p class="chat-empty">Say hi to start the conversation</p>';
  $$('.bubble-idea', b).forEach(x => x.addEventListener('click', () => { const s = songs.find(z => z.id === t[+x.dataset.i].song); if (s) openSong(s, 'play'); }));
  b.scrollTop = b.scrollHeight;
}
function sendMsg(){ const v = $('chatInput').value.trim(); if (!v || !chatWith) return; THREADS[chatWith].push({ me: 1, t: v, at: 'Now' }); $('chatInput').value = ''; renderMessages(); renderChats(); }
$('chatSend').addEventListener('click', sendMsg);
$('chatInput').addEventListener('keydown', e => { if (e.key === 'Enter') sendMsg(); });
$('chatShare').addEventListener('click', () => pickIdea('Share an idea', s => { THREADS[chatWith].push({ me: 1, idea: s.title || 'Untitled idea', song: s.id, at: 'Now' }); renderMessages(); renderChats(); }));
function newMessage(){
  openSheet(`<h3 class="sheet-title">New message</h3><div class="to-field"><span>To</span><input id="toIn" placeholder="Name or phone number" autocomplete="off" autofocus /></div><div id="toList"></div>`, () => {
    const draw = () => { const q = $('toIn').value.trim(), ql = q.toLowerCase(), hits = FRIENDS.filter(f => !ql || f.name.toLowerCase().includes(ql) || f.handle.includes(ql));
      $('toList').innerHTML = hits.map(f => `<button class="pick" data-f="${esc(f.name)}">${faceHTML(f.name, 36)}${esc(f.name)}<small>${esc(f.handle)}</small></button>`).join('') +
        (q ? `<button class="pick" id="textTo"><span class="invite-ic" style="width:36px;height:36px;font-size:16px"><i class="ph ph-paper-plane-tilt"></i></span>Text to: ${esc(q)}<small>Opens Messages</small></button>` : `<p class="sheet-text" style="margin-top:14px">Don’t see your friend? Type their name or number to invite them by text.</p>`);
      $$('[data-f]', $('toList')).forEach(b => b.addEventListener('click', () => openChat(b.dataset.f)));
      const tt = $('textTo'); if (tt) tt.addEventListener('click', () => { const num = q.replace(/[^\d+]/g, ''), body = encodeURIComponent('Join me on Track On so we can make songs together.');
        closeSheet(); window.location.href = 'sms:' + (num.length >= 6 ? num : '') + '&body=' + body; }); };
    $('toIn').addEventListener('input', draw); draw(); });
}
$('newMsg').addEventListener('click', newMessage);
function renderFeed(){
  $('feedPanel').innerHTML = POSTS.map(p => `<div class="post" data-id="${p.id}"><div class="post-top"><span>${faceHTML(p.who, 28)}${esc(p.who)}</span><span>${esc(p.when)}</span></div><div class="post-title">${esc(p.title)}</div>
    <div class="post-row"><button class="play-btn round sm" aria-label="Play"><i class="ph-fill ph-play"></i></button>${waveHTML('')}<button class="icon-btn" data-collab aria-label="Add a layer"><i class="ph ph-stack-plus"></i></button></div></div>`).join('');
  $$('.post').forEach(el => { const p = POSTS.find(x => x.id === el.dataset.id), w = el.querySelector('.wave');
    drawWave(w, new Array(60).fill(.07), [], 1); ensureAudio(p).then(() => drawWave(w, p.peaks, [], songDur(p)));
    scrub(w, f => seekTo(p, f * songDur(p))); el.querySelector('.play-btn').addEventListener('click', () => togglePlay(p));
    el.querySelector('[data-collab]').addEventListener('click', () => layerOver(p)); });
}
async function layerOver(p){
  Engine.Player.stop(); await ensureAudio(p);
  const s = { id: nextId(), title: p.title, list: null, date: today(), lyrics: '', notes: [], from: p.who, mine: true, demo: null, dur: p.dur,
              stems: [{ name: p.who.split(' ')[0], buf: p.stems[0].buf }] };
  s.peaks = p.peaks; songs.unshift(s); renderIdeas();
  openSong(s, 'layer'); toast('Record your layer over ' + p.who.split(' ')[0] + '’s take');
}
/* ============================ PROFILE (settings live here) ============================ */
function renderProfile(){
  const layers = songs.reduce((a, x) => a + Math.max(0, x.stems.length - 1), 0), initials = (me.name || 'You').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  $('profileBody').innerHTML = `
    <div class="me"><button class="me-photo" id="mePhoto" aria-label="Profile picture" style="${me.photo ? `background-image:url(${me.photo})` : ''}">${me.photo ? '' : esc(initials)}</button>
      <input class="me-name" id="meName" value="${esc(me.name)}" placeholder="Your name" autocomplete="off" /></div>
    <div class="stats"><div><b>${songs.length}</b><span>Ideas</span></div><div><b>${layers}</b><span>Layers</span></div><div><b>${FRIENDS.length}</b><span>Friends</span></div></div>
    <h2 class="section">Settings</h2>
    <div class="group cells">
      <button class="cell ${settings.clean ? 'on' : ''}" id="sClean"><span>Clean up voice<small>Reduces background noise. Leave off for instruments.</small></span><span class="switch"></span></button>
      <button class="cell" id="sInst"><span>Chord diagrams<small>How chords are drawn after you find them</small></span><span class="detail">${settings.instrument === 'piano' ? 'Piano' : 'Guitar'}</span></button>
      ${NATIVE ? `<button class="cell" id="sFolder"><span>Recordings<small>Saved as WAV in Music › Track On</small></span><span class="detail">Show</span></button>` : ''}
      <button class="cell" id="sInvite"><span>Invite a friend</span><span class="detail">Text</span></button>
      <button class="cell" id="sIntro"><span>Introduction</span><span class="detail">Show again</span></button>
      <div class="cell"><span>Version</span><span class="detail">1.0</span></div>
    </div>`;
  $('mePhoto').addEventListener('click', () => me.photo ? openMenu('Profile picture', [
    { icon: 'ph-image', label: 'Choose another picture', run: () => pickImage(d => { me.photo = d; store.set('me', me); renderProfile(); }) },
    { icon: 'ph-x', label: 'Remove picture', danger: true, run: () => { me.photo = null; store.set('me', me); renderProfile(); } }]) : pickImage(d => { me.photo = d; store.set('me', me); renderProfile(); }));
  $('meName').addEventListener('change', () => { me.name = $('meName').value.trim(); store.set('me', me); renderProfile(); });
  $('sClean').addEventListener('click', () => { settings.clean = !settings.clean; store.set('settings', settings); $('sClean').classList.toggle('on', settings.clean); });
  $('sInst').addEventListener('click', () => openMenu('Chord diagrams', [
    { icon: 'ph-guitar', label: 'Guitar', check: settings.instrument !== 'piano', run: () => { settings.instrument = 'guitar'; store.set('settings', settings); renderProfile(); } },
    { icon: 'ph-piano-keys', label: 'Piano', check: settings.instrument === 'piano', run: () => { settings.instrument = 'piano'; store.set('settings', settings); renderProfile(); } }]));
  if ($('sFolder')) $('sFolder').addEventListener('click', () => nativePost({ type: 'reveal' }));
  $('sInvite').addEventListener('click', newMessage);
  $('sIntro').addEventListener('click', showOnboarding);
}
$$('.go-profile').forEach(b => b.addEventListener('click', () => goSection('profile')));

/* ============================ ONBOARDING (3 steps) ============================ */
const STEPS = [
  { ic: 'ph-waveform', red: true, h: 'Ideas', p: 'Tap the red button to catch a melody the moment it comes. Each idea keeps its lyrics, chords and moodboard together.' },
  { ic: 'ph-users', h: 'Friends', p: 'Chat with the people you make music with. Add a layer to their songs, and they can add one to yours.' },
  { ic: 'ph-sparkle', h: 'Inspiration', p: 'Save the photos, links and notes that set the mood. Every song gets its own board.' }];
function showOnboarding(){
  const ob = $('onboard'); let k = 0;
  ob.innerHTML = `<div class="onboard-card"><svg class="ob-logo" viewBox="0 0 371.49 83.75" aria-label="track on"><use href="#logo"/></svg><div class="ob-steps">${STEPS.map((s, i) => `<section class="ob-step ${i === 0 ? 'on' : ''}"><div class="ob-ic ${s.red ? 'red' : ''}"><i class="ph-fill ${s.ic}"></i></div><h2>${s.h}</h2><p>${s.p}</p></section>`).join('')}</div>
    <div class="ob-foot"><div class="ob-dots">${STEPS.map((_, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('')}</div><span style="flex:1"></span><button class="ob-skip" id="obSkip">Skip</button><button class="btn btn-ink" id="obNext">Next</button></div></div>`;
  ob.hidden = false;
  const show = () => { $$('.ob-step', ob).forEach((s, i) => { s.classList.toggle('on', i === k); s.classList.toggle('past', i < k); }); $$('.ob-dots i', ob).forEach((d, i) => d.classList.toggle('on', i === k));
    $('obNext').textContent = k === STEPS.length - 1 ? 'Start' : 'Next'; $('obSkip').style.visibility = k === STEPS.length - 1 ? 'hidden' : ''; };
  const done = () => { ob.hidden = true; store.set('onboarded.v2', true); };
  $('obNext').addEventListener('click', () => { if (k < STEPS.length - 1){ k++; show(); } else done(); });
  $('obSkip').addEventListener('click', done);
}

/* ============================ PERSISTENCE (Mac app) ============================ */
const updTimers = {};
function persist(s, withAudio){
  if (!NATIVE || !s || s.draft || !s.mine) return;
  const meta = { id: s.id, title: s.title, date: s.date, lyrics: s.lyrics, list: s.list, bg: s.bg || null, notes: s.notes, cover: s.cover || null, from: s.from || null, recChords: s.recChords || null,
                 dur: songDur(s), stems: s.stems.map(st => ({ name: st.name, offset: st.offset || 0, muted: !!st.muted })) };
  if (!withAudio){ clearTimeout(updTimers[s.id]); updTimers[s.id] = setTimeout(() => nativePost({ type: 'update', song: meta }), 400); return; }
  const rate = Engine.context().sampleRate;
  Promise.all(s.stems.map(st => new Promise(res => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.readAsDataURL(Engine.wav(Engine.mix([{ buf: st.buf }]), rate)); })))
    .then(wavs => nativePost({ type: 'save', song: meta, wavs }));
}
function loadLibrary(){
  (window.TRACKON_LIBRARY || []).slice().reverse().forEach(x => {
    const stems = (x.stems && x.stems.length ? x.stems : [{ name: 'Take', url: x.url }]).filter(st => st.url).map(st => ({ name: st.name || 'Take', url: st.url, offset: st.offset || 0, muted: !!st.muted }));
    const s = { id: x.id, title: x.title || 'New idea', list: lists.some(l => l.id === x.list) ? x.list : null, date: x.date || '', lyrics: x.lyrics || '', notes: x.notes || [], bg: x.bg || null, cover: x.cover || null,
                from: x.from || null, recChords: x.recChords || null, dur: x.dur || 1, demo: null, mine: true, stems };
    songs = songs.filter(o => o.id !== s.id); songs.unshift(s);
  });
}

/* ============================ DESKTOP / KEYBOARD ============================ */
window.TrackOn = {
  go(n){ goSection(n === 'ideas' ? 'home' : n === 'inspirations' ? 'insp' : n); },
  newRecording(){ openSong(null, 'record'); },
  toggleRecord(){ if (topScreen() !== 'song' || !Rec.mode){ openSong(null, 'record'); setTimeout(() => Rec.start(), 350); return; }
    if (Rec.state === 'recording') Rec.pause(); else Rec.start(); },
  save(){ if (topScreen() === 'song' && Rec.mode && Rec.len) saveTake(); },
  back(){ if ($('sheet').classList.contains('show')){ closeSheet(); return; } if (!$('onboard').hidden) return; if (topScreen() === 'song' || (topScreen() === 'chat' && !DESKTOP)) goBack(); },
  find(){ const b = screens[topScreen()] && screens[topScreen()].querySelector('.do-search'); if (b) b.click(); },
  settings(){ goSection('profile'); }
};
document.addEventListener('keydown', e => {
  const typing = /^(INPUT|TEXTAREA)$/.test(e.target.tagName);
  if (e.key === 'Escape'){ TrackOn.back(); return; }
  if (e.key === ' ' && !typing && topScreen() === 'song'){ e.preventDefault(); if (Rec.mode){ if (Rec.state === 'paused') Rec.preview(); else TrackOn.toggleRecord(); } else togglePlay(current); return; }
  if (NATIVE || !DESKTOP || !e.metaKey) return;
  const k = e.key.toLowerCase();
  if (k === '1'){ e.preventDefault(); TrackOn.go('home'); } else if (k === '2'){ e.preventDefault(); TrackOn.go('friends'); } else if (k === '3'){ e.preventDefault(); TrackOn.go('insp'); }
  else if (k === 'r' && !typing){ e.preventDefault(); TrackOn.toggleRecord(); }
});

/* ============================ START ============================ */
loadLibrary();
renderChips(); renderIdeas(); renderBoards(); renderInsp(); renderChats(); render();
if (DESKTOP) openChat(Object.keys(THREADS)[0], true);
requestAnimationFrame(frame);
function applyHash(){
  const h = location.hash.slice(1);
  if (h === 'record') openSong(null, 'record');
  else if (h === 'song') openSong(songs.find(s => hasAudio(s)), 'play');
  else if (h === 'friends' || h === 'insp') goSection(h);
  else if (h === 'feed'){ goSection('friends'); $$('[data-ftab="feed"]')[0].click(); }
  else if (h === 'chat'){ goSection('friends'); openChat('Maya Reyes'); }
  else if (h === 'settings' || h === 'profile') goSection('profile');
  else if (h === 'onboarding') showOnboarding();
}
window.addEventListener('hashchange', applyHash);
if (location.hash) applyHash();
if (!store.get('onboarded.v2', false) && location.hash !== '#onboarding' && !/[?&]noob\b/.test(location.search)) showOnboarding();
nativePost({ type: 'ready', secure: window.isSecureContext, media: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia), saved: (window.TRACKON_LIBRARY || []).length });
