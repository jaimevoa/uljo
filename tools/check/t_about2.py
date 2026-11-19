import sys, time; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.nav('http://localhost:4322/about.html?mute')
time.sleep(6)
t.ev('window.scrollTo(0, 900 * 1.8)'); time.sleep(3.5); t.shot('ab2-hero', 80, .6)
y = t.ev('const e = document.querySelector(".tvfly__stage"); return Math.round(e.getBoundingClientRect().top + scrollY + e.getBoundingClientRect().height / 2 - 450)')
t.ev('window.scrollTo(0, %d)' % y); time.sleep(2.5); t.shot('ab2-tv', 80, .6)
# hover the journal: the pointer's box
y = t.ev('const e = document.querySelector(".journal"); return Math.round(e.getBoundingClientRect().top + scrollY + e.getBoundingClientRect().height / 2 - 450)')
t.ev('window.scrollTo(0, %d)' % y); time.sleep(1.5)
r = t.ev('const b = document.querySelector("[data-journal-open]").getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2, document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2).className]')
print('journal button', r)
t.move(r[0] - 30, r[1] - 20); time.sleep(.1); t.move(r[0], r[1]); time.sleep(.8); t.shot('ab2-jhover', 80, .6)
t.click(r[0], r[1]); time.sleep(2.2); t.shot('ab2-jopen', 80, .6)
print(t.ev('return { open: !document.querySelector("[data-jbook]").hidden, tip: document.querySelector(".try-tip--words").className }'))
print(sheet(['ab2-hero', 'ab2-tv', 'ab2-jhover', 'ab2-jopen'], 'sheet-about2', 2))
print(t.logs())
# a phone
t2 = T(390, 844, 2, True)
t2.nav('http://localhost:4322/about.html?mute'); time.sleep(6)
names = []
t2.ev('window.scrollTo(0, 844 * 1.8)'); time.sleep(3.5); t2.shot('abm-hero', 75, .5); names.append('abm-hero')
pos = t2.ev('return [...document.querySelectorAll(".moment, .journal, .tvfly")].map(e => Math.round(e.getBoundingClientRect().top + scrollY + e.getBoundingClientRect().height / 2 - 422))')
for i, y in enumerate(pos):
    t2.ev('window.scrollTo(0, %d)' % y); time.sleep(2.0); n = 'abm-s%d' % i; t2.shot(n, 75, .5); names.append(n)
print(sheet(names, 'sheet-about-m', 7))
print(t2.ev('return document.documentElement.scrollWidth'), t2.logs())
