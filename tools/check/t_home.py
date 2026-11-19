"""pass 78: the home page: the words behind the gate (larger, new wording), the buttons' new words, and Track On's take of two seconds"""
import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.nav('http://localhost:4322/index.html?x=%d' % int(time.time())); time.sleep(8)       # (not ?mute: Track On only records where sound may run; the browser itself is muted)
names = []
def shot(n, s=.5): t.shot(n, 84, s); names.append(n)
L = t.ev('const L = window.__lab, sec = document.querySelector(".lab"); return { top: sec.getBoundingClientRect().top + scrollY, T3: L.T3, T4: L.T4, starts: L.devs.map((d, i) => L.startOf(i)), lands: L.devs.map((d, i) => L.landOf(i)), names: L.devs.map((d) => d.item.className) }')
top, vh = L['top'], 900
print('menu:', t.ev('return [...document.querySelectorAll(".hero-menu__item")].map((a) => a.textContent.trim())'), '| bar:', t.ev('return [...document.querySelectorAll(".topbar__nav > *")].map((a) => a.textContent.trim().split("\\n")[0].slice(0, 14))'))
at = lambda s: (t.ev('window.scrollTo(0, %f); return 1' % (top + s * vh)), time.sleep(1.4))
at((L['T3'] + L['T4']) / 2 - .05); time.sleep(1.2); shot('h-why', 1)
print('words:', t.ev('const b = document.querySelector(".lab__why-big"), p = document.querySelector(".lab__why-text"), r = p.getBoundingClientRect(); const lh = parseFloat(getComputedStyle(p).lineHeight); return { big: b.textContent, size: getComputedStyle(p).fontSize, rows: Math.round(r.height / lh), w: Math.round(r.width), text: p.textContent.slice(0, 96) }'))
# a real click on the page (sound may then run), then to Track On, landed
t.click(700, 500); time.sleep(.3)
i = next(k for k, n in enumerate(L['names']) if 'show__item--to' in n or 'track' in n.lower()) if any('show__item--to' in n or 'track' in n.lower() for n in L['names']) else 1
print('items:', [n.replace('show__item', '').strip()[:30] for n in L['names']], '-> track on is', i)
at(L['lands'][i] + .12); time.sleep(1.5); shot('h-to-0')
print('labels:', t.ev('return [...document.querySelectorAll(".show__item")].map((it) => [it.querySelector(".show__name, h3") ? it.querySelector(".show__name, h3").textContent.trim() : "", it.querySelector(".show__line").textContent.trim(), ...[...it.querySelectorAll(".show__actions > *")].map((b) => b.textContent.trim().split("\\n")[0])])'))
seen = {}
t0 = time.time()
for k in range(60):
    time.sleep(.5)
    r = t.ev('''const f = document.querySelectorAll(".show__item")[%d].querySelector("iframe"); let w = null; try { w = f.contentWindow; } catch (e) {} if (!w || !w.document) return null; const d = w.document;
      const rec = d.querySelector("#dRec"); return { vm: !!(w.__vm && w.__vm.ok && w.__vm.ok()), recOn: !!(d.querySelector(".dock.is-rec, .rec.is-on, #dock.rec, .recording")), timer: (d.querySelector("#dTime, .dock-time, .rec-time") || {}).textContent || "", chords: [...d.querySelectorAll("#chordBox .chords .chord, #chordBox .chords b, #chordBox .chords span")].map((e) => e.textContent.trim()).filter(Boolean).slice(0, 8), toast: (d.querySelector(".toast.on, .toast.show, .toast") || {}).textContent || "", song: !!d.querySelector("#screen-song.on, #screen-song.is-on, #screen-song:not([hidden])") }''' % i)
    if not r: continue
    key = json.dumps(r, sort_keys=True)
    if key not in seen: seen[key] = round(time.time() - t0, 1); print('  ', seen[key], 's', r)
    if r['chords']: break
shot('h-to-1')
print(sheet(names, 'sheet-home', 3, 84))
print([str(l)[:200] for l in t.logs() if 'rror' in str(l)][:4])
