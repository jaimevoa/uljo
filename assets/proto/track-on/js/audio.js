/* Track On — audio engine.
   One AudioContext for everything: playback of songs made of stems (takes + layers), microphone capture
   with sample-accurate timestamps (so layers line up), synthesised demo songs, waveform peaks, WAV export
   and chord recognition. No UI in here. */
'use strict';
const Engine = (() => {
  let ctx = null, master = null;
  function context(){
    if (!ctx){ ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.connect(ctx.destination); }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* ---------- notes & chords ---------- */
  const NAMES = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
  const ALIAS = { Db:'C#', 'D#':'Eb', Gb:'F#', 'G#':'Ab', 'A#':'Bb' };
  function parseChord(name){
    const m = /^([A-G][#b]?)(m?)$/.exec(name); if (!m) return null;
    const root = NAMES.indexOf(ALIAS[m[1]] || m[1]); return { root, minor: m[2] === 'm' };
  }
  const freq = midi => 440 * Math.pow(2, (midi - 69) / 12);

  /* ---------- demo songs: a small band rendered offline from the song's chords ---------- */
  async function renderDemo(spec){
    // spec: { chords:[...], dur:seconds, bpm, style:'band'|'hum', seed }
    const c = context(), sr = c.sampleRate, len = Math.ceil(spec.dur * sr);
    const off = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, len, sr);
    const out = off.createGain(); out.gain.value = 0.9; out.connect(off.destination);
    const lp = off.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; lp.Q.value = 0.4; lp.connect(out);
    const beat = 60 / spec.bpm, bar = beat * 4;
    let rnd = (spec.seed || 1) * 9301 % 233280; const r = () => (rnd = (rnd * 9301 + 49297) % 233280) / 233280;
    function note(t, dur, f, type, gain, attack, release, dest){
      if (t >= spec.dur) return;
      const o = off.createOscillator(), g = off.createGain();
      o.type = type; o.frequency.value = f; o.connect(g); g.connect(dest || lp);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack);
      g.gain.setTargetAtTime(0, t + Math.max(attack, dur - release), release / 3);
      o.start(t); o.stop(Math.min(spec.dur, t + dur + release));
    }
    for (let b = 0, t = 0; t < spec.dur; b++, t += bar){
      const ch = parseChord(spec.chords[b % spec.chords.length]); if (!ch) continue;
      const third = ch.minor ? 3 : 4;
      const tones = [0, third, 7].map(i => 60 + ((ch.root + i) % 12) - (((ch.root + i) % 12) > 7 ? 12 : 0)); // close voicing around middle C
      // pad (soft triangle chords)
      tones.forEach(m => note(t, bar, freq(m), 'triangle', spec.style === 'hum' ? 0.07 : 0.09, 0.06, 0.25));
      // bass on 1 and 3
      const bass = 36 + ch.root;
      [0, 2].forEach(k => note(t + k * beat, beat * 1.8, freq(bass), 'sine', 0.32, 0.01, 0.35));
      if (spec.style === 'hum'){
        // a hummed melody on chord tones (sine + slow vibrato)
        for (let k = 0; k < 4; k++){
          const m = tones[Math.floor(r() * 3)] + 12, o = off.createOscillator(), g = off.createGain(), lfo = off.createOscillator(), lg = off.createGain();
          const s = t + k * beat; if (s >= spec.dur) break;
          o.type = 'sine'; o.frequency.value = freq(m); lfo.frequency.value = 5; lg.gain.value = 3; lfo.connect(lg); lg.connect(o.frequency);
          o.connect(g); g.connect(lp); g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(0.11, s + 0.08); g.gain.setTargetAtTime(0, s + beat * 0.8, 0.08);
          o.start(s); lfo.start(s); o.stop(Math.min(spec.dur, s + beat * 1.3)); lfo.stop(Math.min(spec.dur, s + beat * 1.3));
        }
      } else {
        // plucked arpeggio in eighths
        for (let k = 0; k < 8; k++){
          const m = tones[[0, 1, 2, 1, 0, 2, 1, 2][k]] + 12;
          note(t + k * beat / 2, beat * 0.45, freq(m), 'triangle', 0.05, 0.005, 0.18);
        }
      }
    }
    return off.startRendering();
  }

  /* ---------- buffers ---------- */
  function bufferFrom(data, rate){ const c = context(); const b = c.createBuffer(1, Math.max(1, data.length), rate || c.sampleRate); b.getChannelData(0).set(data); return b; }
  function loadArrayBuffer(url){
    return new Promise((res, rej) => { const x = new XMLHttpRequest(); x.open('GET', url); x.responseType = 'arraybuffer';
      x.onload = () => ((x.status === 0 || x.status === 200) && x.response) ? res(x.response) : rej(new Error('could not read audio'));
      x.onerror = () => rej(new Error('could not read audio')); x.send(); });
  }
  async function decodeUrl(url){ const ab = await loadArrayBuffer(url); return await context().decodeAudioData(ab); }
  /** mono mix of the active stems, at the context rate */
  function mix(stems){
    const c = context(), on = stems.filter(s => s.buf && !s.muted); if (!on.length) return new Float32Array(1);
    const len = Math.max(...on.map(s => Math.round(s.buf.duration * c.sampleRate) + Math.round((s.offset || 0) * c.sampleRate)));
    const out = new Float32Array(len);
    on.forEach(s => { const d = s.buf.getChannelData(0), ratio = s.buf.sampleRate / c.sampleRate, o = Math.round((s.offset || 0) * c.sampleRate);
      for (let i = 0; i + o < len; i++){ const j = i * ratio, k = j | 0; if (k >= d.length - 1) break; const v = d[k] + (d[k + 1] - d[k]) * (j - k); if (i + o >= 0) out[i + o] += v; } });
    let pk = 0; for (let i = 0; i < len; i++) pk = Math.max(pk, Math.abs(out[i]));
    if (pk > 0.98){ const g = 0.98 / pk; for (let i = 0; i < len; i++) out[i] *= g; }
    return out;
  }
  function peaks(data, n){
    const out = new Array(n).fill(0), step = data.length / n;
    for (let i = 0; i < n; i++){ let s = 0, c = 0; const a = Math.floor(i * step), b = Math.min(data.length, Math.floor((i + 1) * step));
      for (let j = a; j < b; j += 8){ s += data[j] * data[j]; c++; } out[i] = Math.sqrt(s / Math.max(1, c)); }
    // stretch the loudness range so phrasing and rhythm read clearly (quiet floor → short bar, loudest → full)
    const sorted = out.slice().sort((a, b) => a - b), lo = sorted[Math.floor(n * 0.04)] || 0, hi = sorted[n - 1] || 1;
    return out.map(v => hi > lo ? 0.1 + 0.9 * Math.pow(Math.max(0, (v - lo) / (hi - lo)), 1.35) : 0.1);
  }
  function wav(data, rate){
    const n = data.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf), w = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0, o = 44; i < n; i++, o += 2){ const x = Math.max(-1, Math.min(1, data[i])); v.setInt16(o, x < 0 ? x * 0x8000 : x * 0x7FFF, true); }
    return new Blob([buf], { type: 'audio/wav' });
  }

  /* ---------- player: plays a song's stems in sync ---------- */
  const Player = {
    song: null, srcs: [], t0: 0, off: 0, playing: false, onEnd: null,
    play(song, offset, when){
      const c = context(); this.stop(true); this.song = song; offset = Math.max(0, offset || 0);
      const at = when || c.currentTime + 0.04;
      (song.stems || []).forEach(st => { if (!st.buf || st.muted) return; const start = offset - (st.offset || 0);
        const s = c.createBufferSource(); s.buffer = st.buf; s.connect(master);
        if (start >= 0){ if (start < st.buf.duration) s.start(at, start); } else s.start(at - start, 0);
        this.srcs.push(s); });
      this.t0 = at - offset; this.playing = true;
      const dur = songDuration(song), me = this;
      clearTimeout(this._end); this._end = setTimeout(function tick(){ if (!me.playing) return; if (me.pos() >= dur){ me.stop(); me.off = dur; me.onEnd && me.onEnd(); } else me._end = setTimeout(tick, 100); }, 100);
    },
    pos(){ return this.playing ? Math.max(0, context().currentTime - this.t0) : this.off; },
    stop(keep){ this.srcs.forEach(s => { try { s.stop(); } catch (e) {} }); this.srcs = []; if (this.playing) this.off = this.pos(); this.playing = false; clearTimeout(this._end); },
    seek(t){ const was = this.playing; this.stop(); this.off = t; if (was) this.play(this.song, t); }
  };
  function songDuration(song){ return Math.max(0, ...(song.stems || []).filter(s => s.buf).map(s => s.buf.duration + (s.offset || 0))); }

  /* ---------- microphone: chunks stamped on the context clock ---------- */
  let mic = null;   // { stream, src, an, proc, clean }
  let onChunk = null;
  async function initMic(clean){
    const c = context();
    if (mic && mic.clean === !!clean) return mic;
    if (mic){ mic.stream.getTracks().forEach(t => t.stop()); try { mic.src.disconnect(); mic.proc.disconnect(); } catch (e) {} mic = null; }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: !!clean, noiseSuppression: !!clean, autoGainControl: !!clean } });
    const src = c.createMediaStreamSource(stream), an = c.createAnalyser(); an.fftSize = 1024; src.connect(an);
    const proc = c.createScriptProcessor(4096, 1, 1), mute = c.createGain(); mute.gain.value = 0;
    proc.onaudioprocess = e => { if (!onChunk) return; const d = e.inputBuffer.getChannelData(0); onChunk(new Float32Array(d), e.playbackTime - e.inputBuffer.duration); };
    src.connect(proc); proc.connect(mute); mute.connect(c.destination);
    const s = stream.getAudioTracks()[0].getSettings ? stream.getAudioTracks()[0].getSettings() : {};
    mic = { stream, src, an, proc, clean: !!clean, inLatency: s.latency || 0.012 };
    return mic;
  }
  function level(){ if (!mic) return 0; const b = new Float32Array(mic.an.fftSize); mic.an.getFloatTimeDomainData(b); let s = 0; for (let i = 0; i < b.length; i++) s += b[i] * b[i]; return Math.min(1, Math.sqrt(s / b.length) * 4); }
  function latency(){ const c = context(); return (c.outputLatency || 0) + (c.baseLatency || 0) + (mic ? mic.inLatency : 0.012); }

  /* ---------- chord recognition ----------
     Spectral peaks → tuning-corrected chroma (treble + bass) every ~85 ms → 24 major/minor triad templates →
     Viterbi smoothing (a chord change costs, so single noisy frames can't flip the result). */
  function fft(re, im){ const n = re.length;
    for (let i = 1, j = 0; i < n; i++){ let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j){ let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (let len = 2; len <= n; len <<= 1){ const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len){ let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++){ const a = i + k, b = a + len / 2, xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } } }
  const LABELS = []; const TEMPL = [];
  for (let r = 0; r < 12; r++) for (const [q, iv] of [['', 4], ['m', 3]]){ const t = new Float64Array(12); t[r] = 1; t[(r + iv) % 12] = 0.9; t[(r + 7) % 12] = 0.85; LABELS.push(NAMES[r] + q); TEMPL.push({ t, root: r }); }

  async function chords(data, sr, onProgress){
    const N = sr > 32000 ? 8192 : 4096, hop = N / 2, win = new Float64Array(N);
    for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
    const re = new Float64Array(N), im = new Float64Array(N), mag = new Float64Array(N / 2);
    let peak = 0; for (let i = 0; i < data.length; i += 32) peak = Math.max(peak, Math.abs(data[i]));
    const gate = Math.max(0.003, peak * 0.05);
    const frames = []; let tuneS = 0, tuneC = 0;
    const total = Math.max(1, Math.floor((data.length - N) / hop));
    for (let f = 0, fi = 0; f + N <= data.length; f += hop, fi++){
      let rms = 0; for (let i = 0; i < N; i += 4) rms += data[f + i] * data[f + i]; rms = Math.sqrt(rms / (N / 4));
      if (rms < gate){ frames.push(null); continue; }
      for (let i = 0; i < N; i++){ re[i] = data[f + i] * win[i]; im[i] = 0; }
      fft(re, im);
      let mx = 0; for (let k = 1; k < N / 2; k++){ mag[k] = Math.hypot(re[k], im[k]); if (mag[k] > mx) mx = mag[k]; }
      const pk = [];
      for (let k = 2; k < N / 2 - 1; k++){
        const f0 = k * sr / N; if (f0 < 40 || f0 > 2200) continue;
        if (mag[k] > mag[k - 1] && mag[k] >= mag[k + 1] && mag[k] > mx * 0.04){
          const a = mag[k - 1], b = mag[k], c = mag[k + 1], d = 0.5 * (a - c) / (a - 2 * b + c || 1);   // parabolic interpolation
          const fr = (k + d) * sr / N, semi = 12 * Math.log2(fr / 440) + 69;
          pk.push({ semi, w: Math.sqrt(b), fr });
          const dev = semi - Math.round(semi); tuneS += Math.sin(2 * Math.PI * dev) * b; tuneC += Math.cos(2 * Math.PI * dev) * b;
        }
      }
      frames.push(pk);
      if (fi % 32 === 0){ onProgress && onProgress(0.9 * fi / total); await new Promise(r => setTimeout(r)); }
    }
    const tuning = Math.atan2(tuneS, tuneC) / (2 * Math.PI);   // global detune in semitones (−0.5…0.5)
    const obs = frames.map(pk => {
      if (!pk || !pk.length) return null;
      // overtone suppression: a peak sitting on the 3rd/5th/6th/7th harmonic of a lower, strong peak is mostly that note's colour, not a new note
      pk.sort((a, b) => a.fr - b.fr);
      for (let i = 0; i < pk.length; i++) for (let j = 0; j < i; j++){
        const h = pk[i].fr / pk[j].fr, hr = Math.round(h);
        if ((hr === 3 || hr === 5 || hr === 6 || hr === 7) && Math.abs(h - hr) / hr < 0.015 && pk[j].w > pk[i].w * 0.35){ pk[i].w *= 0.25; break; }
      }
      const tr = new Float64Array(12), bs = new Float64Array(12);
      pk.forEach(p => { const m = Math.round(p.semi - tuning), pc = ((m % 12) + 12) % 12; if (p.fr < 220) bs[pc] += p.w; if (p.fr >= 130) tr[pc] += p.w; });
      const tm = Math.max(...tr) || 1, bm = Math.max(...bs) || 1;
      const e = TEMPL.map(({ t, root }) => { let dot = 0, n1 = 0, n2 = 0;
        for (let i = 0; i < 12; i++){ const v = tr[i] / tm; dot += v * t[i]; n1 += v * v; n2 += t[i] * t[i]; }
        let s = dot / (Math.sqrt(n1 * n2) || 1); if (bm > 0 && bs[root] / bm > 0.6) s += 0.08; return s; });
      return e;
    });
    // Viterbi over 24 chords + "no chord"
    const K = TEMPL.length + 1, SW = 0.32, BETA = 14, NC = 0.42;
    let score = new Float64Array(K), back = [];
    obs.forEach((e, t) => {
      const em = new Float64Array(K);
      if (!e){ em.fill(-3); em[K - 1] = 0; } else { for (let k = 0; k < K - 1; k++) em[k] = BETA * e[k]; em[K - 1] = BETA * NC; }
      if (t === 0){ score = em; back.push(new Int16Array(K).fill(-1)); return; }
      let best = 0; for (let k = 1; k < K; k++) if (score[k] > score[best]) best = k;
      const ns = new Float64Array(K), bp = new Int16Array(K);
      for (let k = 0; k < K; k++){ const stay = score[k], move = score[best] - BETA * SW;
        if (stay >= move){ ns[k] = stay + em[k]; bp[k] = k; } else { ns[k] = move + em[k]; bp[k] = best; } }
      score = ns; back.push(bp);
    });
    if (!obs.length) return { seq: [], segments: [] };
    let k = 0; for (let i = 1; i < K; i++) if (score[i] > score[k]) k = i;
    const path = new Array(obs.length); for (let t = obs.length - 1; t >= 0; t--){ path[t] = k; k = back[t][k] >= 0 ? back[t][k] : k; }
    const fdur = hop / sr, segs = [];
    path.forEach((p, t) => { const lab = p === K - 1 ? null : LABELS[p]; const last = segs[segs.length - 1];
      if (last && last.chord === lab) last.end = (t + 1) * fdur; else segs.push({ chord: lab, start: t * fdur, end: (t + 1) * fdur }); });
    const clean = segs.filter(s => s.chord && s.end - s.start >= 0.45);
    const seq = []; clean.forEach(s => { if (seq[seq.length - 1] !== s.chord) seq.push(s.chord); });
    onProgress && onProgress(1);
    return { seq, segments: clean, tuning };
  }
  /** shortest repeating pattern, e.g. [Am F C G Am F C G Am] → {pattern:[Am F C G], times:2.25} */
  function loopOf(seq){
    for (let p = 2; p <= Math.min(8, Math.floor(seq.length / 2)); p++){ let ok = true; for (let i = p; i < seq.length; i++) if (seq[i] !== seq[i % p]){ ok = false; break; } if (ok) return { pattern: seq.slice(0, p), times: seq.length / p }; }
    return { pattern: seq, times: 1 };
  }

  return { context, renderDemo, bufferFrom, decodeUrl, mix, peaks, wav, Player, songDuration, initMic, level, latency, chords, loopOf, parseChord, NAMES,
           setChunkHandler(fn){ onChunk = fn; } };
})();
