import sys, time, json; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T, sheet
t = T(1440, 900)
t.nav('http://localhost:4322/about.html?mute&x=%d' % int(time.time())); time.sleep(5)
names = []
for k, f in enumerate((0, 1.8)):
    t.ev('window.scrollTo(0, innerHeight * %f); return 1' % f); time.sleep(3.2); t.shot('u82-%d' % k, 86, .5); names.append('u82-%d' % k)
y = t.ev('const e = document.querySelector(".journalsec"); return Math.round(e.getBoundingClientRect().top + scrollY - (innerHeight - e.getBoundingClientRect().height) / 2)')
t.ev('window.scrollTo(0, %d); return 1' % y); time.sleep(2.5); t.shot('u82-j', 86, .5); names.append('u82-j')
y = t.ev('const e = document.querySelector(".tvfly"); const r = e.getBoundingClientRect(); return Math.round(r.top + scrollY + r.height / 2 - innerHeight / 2)')
t.ev('window.scrollTo(0, %d); return 1' % y); time.sleep(5); t.shot('u82-tv', 86, .5); names.append('u82-tv')
z = t.ev('const b = document.querySelector(".tvfly__zap"), r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]')
t.click(z[0], z[1]); time.sleep(2.5); print('after Zap:', t.ev('return window.__tv.cur'))
t.ev('window.scrollTo(0, %d - innerHeight * .55); return 1' % y); time.sleep(1.5); t.shot('u82-gap', 86, .5); names.append('u82-gap')
print(sheet(names, 'sheet-u82', 3, 86)); print([str(l)[:200] for l in t.logs() if 'rror' in str(l)][:3])
