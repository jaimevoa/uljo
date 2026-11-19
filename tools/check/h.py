"""helpers over tools/cdp.py — one session per script (size overrides are per session).
A headless Chrome must be listening (see the README, "Checking"); the dev server on 4322; pictures go to $ULJO_SHOTS."""
import sys, os, time, json, base64
sys.path.insert(0, '/Users/jaimeolivares/Projects/uljo/tools')
from cdp import Page, HOOK
OUT = os.environ.get('ULJO_SHOTS', '/tmp/uljo-shots')      # where the pictures go
os.makedirs(OUT, exist_ok=True)
class T:
    def __init__(self, w=1440, h=900, dpr=1, mobile=False):
        self.p = Page(); self.w, self.h = w, h
        self.p.call('Emulation.setDeviceMetricsOverride', width=w, height=h, deviceScaleFactor=dpr, mobile=mobile, screenWidth=w, screenHeight=h)      # (the screen too: the site reads it to choose the detailed planet)
        self.p.call('Page.enable')
        for m, kw in (('Emulation.setFocusEmulationEnabled', dict(enabled=True)), ('Page.setWebLifecycleState', dict(state='active')), ('Page.bringToFront', {})):
            try: self.p.call(m, **kw)
            except Exception as e: print('note:', m, e)
        try: self.p.call('Page.addScriptToEvaluateOnNewDocument', source=HOOK)
        except Exception as e: print('hook', e)
    def nav(self, url, wait=30):
        self.p.call('Page.navigate', url=url); t0 = time.time()
        time.sleep(.4)
        while time.time() - t0 < wait:
            time.sleep(.25)
            if self.p.eval('return document.readyState') == 'complete': break
    def ev(self, js, timeout=60000):
        return self.p.eval(js, timeout)
    def shot(self, name, q=72, scale=None):
        r = self.p.call('Page.captureScreenshot', format='jpeg', quality=90 if scale else q)
        f = OUT + '/' + name + '.jpg'; open(f, 'wb').write(base64.b64decode(r['data']))
        if scale:
            from PIL import Image
            im = Image.open(f); im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS); im.save(f, quality=q)
        return f
    def click(self, x, y):
        for t in ('mouseMoved',): self.p.call('Input.dispatchMouseEvent', type=t, x=x, y=y)
        self.p.call('Input.dispatchMouseEvent', type='mousePressed', x=x, y=y, button='left', clickCount=1)
        self.p.call('Input.dispatchMouseEvent', type='mouseReleased', x=x, y=y, button='left', clickCount=1)
    def move(self, x, y): self.p.call('Input.dispatchMouseEvent', type='mouseMoved', x=x, y=y)
    def key(self, code, hold=0.05):
        key = {'Space': ' ', 'Enter': 'Enter', 'Escape': 'Escape'}.get(code, code[3:].lower() if code.startswith('Key') else code)
        vk = {'Space': 32, 'Enter': 13, 'Escape': 27, 'ArrowUp': 38, 'ArrowDown': 40, 'ArrowLeft': 37, 'ArrowRight': 39}.get(code, ord(code[3:]) if code.startswith('Key') else 0)
        self.p.call('Input.dispatchKeyEvent', type='keyDown', code=code, key=key, windowsVirtualKeyCode=vk, nativeVirtualKeyCode=vk, text=(key if len(key) == 1 else ''))
        time.sleep(hold)
        self.p.call('Input.dispatchKeyEvent', type='keyUp', code=code, key=key, windowsVirtualKeyCode=vk, nativeVirtualKeyCode=vk)
    def keydown(self, code):
        key = {'Space': ' '}.get(code, code[3:].lower() if code.startswith('Key') else code)
        vk = {'Space': 32, 'ArrowUp': 38, 'ArrowDown': 40, 'ArrowLeft': 37, 'ArrowRight': 39}.get(code, ord(code[3:]) if code.startswith('Key') else 0)
        self.p.call('Input.dispatchKeyEvent', type='keyDown', code=code, key=key, windowsVirtualKeyCode=vk, nativeVirtualKeyCode=vk)
    def keyup(self, code):
        key = {'Space': ' '}.get(code, code[3:].lower() if code.startswith('Key') else code)
        vk = {'Space': 32, 'ArrowUp': 38, 'ArrowDown': 40, 'ArrowLeft': 37, 'ArrowRight': 39}.get(code, ord(code[3:]) if code.startswith('Key') else 0)
        self.p.call('Input.dispatchKeyEvent', type='keyUp', code=code, key=key, windowsVirtualKeyCode=vk, nativeVirtualKeyCode=vk)
    def rate(self):
        return self.ev('let k = 0; const t0 = performance.now(), id = setInterval(() => k++, 30); await new Promise(r => setTimeout(r, 900)); clearInterval(id); return +(k / ((performance.now() - t0) / 1000)).toFixed(1)')
    def logs(self):
        return self.ev('const l = window.__logs || []; const o = l.slice(); l.length = 0; return o;')
    def wheel(self, x, y, dy):
        self.p.call('Input.dispatchMouseEvent', type='mouseWheel', x=x, y=y, deltaX=0, deltaY=dy)

def sheet(names, out, cols=4, q=72):
    from PIL import Image
    ims = [Image.open(OUT + '/' + n + '.jpg') for n in names]
    w, h = ims[0].size; rows = (len(ims) + cols - 1) // cols
    sh = Image.new('RGB', (w * cols, h * rows))
    for i, im in enumerate(ims): sh.paste(im, ((i % cols) * w, (i // cols) * h))
    sh.save(OUT + '/' + out + '.jpg', quality=q); return sh.size


def _pump(self, secs, hz=60):
    """the display may be asleep (rAF then crawls): run the world's frames by hand, in real time, for secs seconds"""
    return self.ev('''const W = window.__world; if (!W) return 0; let n = 0; const t0 = performance.now();
      await new Promise((ok) => { const id = setInterval(() => { try { W.step(1, 1 / %d); } catch (e) { clearInterval(id); ok(); throw e; } n++; if (performance.now() - t0 > %d) { clearInterval(id); ok(); } }, %d); });
      return n;''' % (hz, int(secs * 1000), int(1000 / hz)), timeout=int(secs * 1000) + 20000)
T.pump = _pump
