"""pass 77: the game page: story, [Play], how to play + mission, [Launch], the game, then the end line"""
import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.nav('http://localhost:4322/play.html?mute'); time.sleep(4)
names = []
def shot(n): t.shot(n, 84, .5); names.append(n)
print('story typing', t.ev('const g = document.getElementById("go"); return { hidden: g.hidden, text: g.textContent.trim(), story: document.querySelector(".story, #story") ? (document.querySelector("#story") || document.querySelector(".story")).innerText.slice(0, 90) : null }'))
shot('gm-0-story-typing')
# a click anywhere (or the button) finishes the typing; then the button shows
for k in range(40):
    time.sleep(.5)
    if not t.ev('return document.getElementById("go").hidden'): break
print('after', (k + 1) * .5, 's:', t.ev('const g = document.getElementById("go"), r = g.getBoundingClientRect(); return { hidden: g.hidden, text: g.innerText.trim(), box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], story: document.getElementById("story").innerText }'))
shot('gm-1-story')
r = t.ev('const r = document.getElementById("go").getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return [r.left + r.width / 2, r.top + r.height / 2, e && (e.id || e.tagName)]'); print('button under the pointer:', r)
t.click(r[0], r[1]); time.sleep(.6)
print('mode after Play:', t.ev('return window.__ship && window.__ship.mode ? (typeof window.__ship.mode === "function" ? window.__ship.mode() : window.__ship.mode) : null'))
for k in range(40):
    time.sleep(.5)
    if not t.ev('return document.getElementById("go").hidden'): break
print('how-to after', (k + 1) * .5, 's:', t.ev('const g = document.getElementById("go"); return { text: g.innerText.trim(), story: document.getElementById("story").innerText }'))
shot('gm-2-howto')
r = t.ev('const r = document.getElementById("go").getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]')
t.click(r[0], r[1]); time.sleep(2.5)
print('after Launch:', t.ev('return { storyHidden: document.getElementById("story").hidden, goHidden: document.getElementById("go").hidden, keys: Object.keys(window.__ship || {}) }'))
shot('gm-3-play')
print(sheet(names, 'sheet-game', cols=2, q=82))
print([str(l)[:200] for l in t.logs() if 'rror' in str(l)][:4])
