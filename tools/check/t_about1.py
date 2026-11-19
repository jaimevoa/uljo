import sys, time; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.nav('http://localhost:4322/about.html?mute')
time.sleep(6)
names = []
H = t.ev('return document.documentElement.scrollHeight'); print('height', H)
t.ev('window.scrollTo(0, 900 * 1.8)'); time.sleep(3.5); t.shot('ab-hero', 82); names.append('ab-hero')
t.ev('window.scrollTo(0, 900 * 2.25)'); time.sleep(1.5); t.shot('ab-hero2', 75, .5)
pos = t.ev('return [...document.querySelectorAll(".moment, .journal, .tvfly")].map(e => Math.round(e.getBoundingClientRect().top + scrollY + e.getBoundingClientRect().height / 2 - 450))')
print(pos)
for i, y in enumerate(pos):
    t.ev('window.scrollTo(0, %d)' % y); time.sleep(2.2); n = 'ab-s%d' % i; t.shot(n, 75, .5); names.append(n)
print(sheet(['ab-hero2'] + names[1:], 'sheet-about1', 3))
print(t.ev('return { tv: window.__den && window.__den.tvBox, set: !!document.querySelector(".tvfly__screen.is-set"), tr: document.querySelector(".tvfly__screen").style.transform.slice(0, 120), wb: document.querySelector(".eclipse__words").style.getPropertyValue("--words-b") }'))
print(t.logs())
