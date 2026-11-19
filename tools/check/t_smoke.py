"""pass 77: every page loads, nothing missing, no error"""
import sys, time, json, glob, os; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T
t = T(1440, 900)
pages = sorted(os.path.basename(p) for p in glob.glob('/Users/jaimeolivares/Projects/uljo/*.html'))
bad = 0
for pg in pages:
    t.nav('http://localhost:4322/%s?mute' % pg); time.sleep(4.5 if pg in ('index.html', 'about.html', 'play.html') else 2.2)
    r = t.ev('''const res = performance.getEntriesByType('resource'); const miss = res.filter((e) => e.responseStatus >= 400).map((e) => e.name.replace(location.origin, '') + ' ' + e.responseStatus);
      const dash = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const p = n.parentElement; if (!p || p.closest('script,style,noscript')) continue; if (/[—–]/.test(n.nodeValue)) dash.push(n.nodeValue.trim().slice(0, 60)); }
      return { n: res.length, miss, dash: dash.slice(0, 6), w: document.documentElement.scrollWidth, title: document.title };''')
    errs = [str(l)[:200] for l in t.logs() if 'rror' in str(l) or 'uncaught' in str(l)]
    flag = '' if not (r['miss'] or errs or r['dash'] or r['w'] > 1440) else '   <<<<'
    if flag: bad += 1
    print('%-22s %3d files  %s  %s%s' % (pg, r['n'], r['title'][:34], ('missing %s ' % r['miss']) if r['miss'] else '', flag))
    if errs: print('      errors:', errs[:3])
    if r['dash']: print('      dashes:', r['dash'])
    if r['w'] > 1440: print('      wide:', r['w'])
print('pages with something to look at:', bad)
