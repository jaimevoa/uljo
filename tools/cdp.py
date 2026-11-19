#!/usr/bin/env python3
"""A small hand on a headless Chrome, for checking the site without the Browser pane (pass 76).

    start :  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=9333 \
                 --user-data-dir=<scratch>/chrome --window-size=1440,900 --mute-audio --autoplay-policy=no-user-gesture-required about:blank
    use   :  python3 tools/cdp.py nav  <url>
             python3 tools/cdp.py eval '<javascript, may await; its value is printed as JSON>'
             python3 tools/cdp.py shot <file.jpg> [quality] [scale]
             python3 tools/cdp.py size <w> <h> [dpr]
             python3 tools/cdp.py key  <code>           (a keydown + keyup on the page, e.g. KeyE, Space)
             python3 tools/cdp.py click <x> <y>
             python3 tools/cdp.py logs                  (console messages and errors since the last call are kept by the page hook)

No modules beyond the standard library: the WebSocket is spoken by hand."""
import sys, os, json, socket, base64, struct, urllib.request, time

PORT = int(os.environ.get('CDP_PORT', '9333'))


class WS:
    def __init__(self, url):
        assert url.startswith('ws://')
        host, path = url[5:].split('/', 1)
        h, p = host.split(':')
        self.s = socket.create_connection((h, int(p)), timeout=120)
        key = base64.b64encode(os.urandom(16)).decode()
        self.s.sendall(('GET /%s HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n' % (path, host, key)).encode())
        buf = b''
        while b'\r\n\r\n' not in buf:
            buf += self.s.recv(4096)
        assert b' 101 ' in buf.split(b'\r\n', 1)[0], buf[:200]
        self.rest = buf.split(b'\r\n\r\n', 1)[1]

    def _read(self, n):
        while len(self.rest) < n:
            d = self.s.recv(1 << 20)
            if not d:
                raise IOError('closed')
            self.rest += d
        out, self.rest = self.rest[:n], self.rest[n:]
        return out

    def send(self, text):
        data = text.encode()
        head = bytearray([0x81])
        n = len(data)
        if n < 126:
            head.append(0x80 | n)
        elif n < 65536:
            head.append(0x80 | 126); head += struct.pack('>H', n)
        else:
            head.append(0x80 | 127); head += struct.pack('>Q', n)
        mask = os.urandom(4)
        head += mask
        self.s.sendall(bytes(head) + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))

    def recv(self):
        msg = b''
        while True:
            b0, b1 = self._read(2)
            op, fin, n = b0 & 15, b0 & 0x80, b1 & 127
            if n == 126:
                n = struct.unpack('>H', self._read(2))[0]
            elif n == 127:
                n = struct.unpack('>Q', self._read(8))[0]
            data = self._read(n)
            if op == 8:
                raise IOError('closed')
            if op == 9:                                    # ping
                continue
            msg += data
            if fin:
                return msg.decode('utf-8', 'replace')


class Page:
    def __init__(self):
        tabs = json.load(urllib.request.urlopen('http://127.0.0.1:%d/json' % PORT))
        tab = [t for t in tabs if t.get('type') == 'page'][0]
        self.ws = WS(tab['webSocketDebuggerUrl'])
        self.id = 0

    def call(self, method, **params):
        self.id += 1
        self.ws.send(json.dumps({'id': self.id, 'method': method, 'params': params}))
        while True:
            m = json.loads(self.ws.recv())
            if m.get('id') == self.id:
                if 'error' in m:
                    raise RuntimeError(m['error'])
                return m.get('result', {})

    def eval(self, js, timeout=60000):
        r = self.call('Runtime.evaluate', expression='(async () => { ' + js + ' })()', awaitPromise=True, returnByValue=True, timeout=timeout, userGesture=True)
        if 'exceptionDetails' in r:
            ex = r['exceptionDetails']
            return 'EXCEPTION: ' + str((ex.get('exception') or {}).get('description') or ex.get('text'))
        return r.get('result', {}).get('value')


HOOK = """(() => { if (window.__logs) return; window.__logs = [];
  const push = (k, a) => { try { window.__logs.push(k + ': ' + [...a].map(x => (x && x.stack) || (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ').slice(0, 400)); } catch (e) {} if (window.__logs.length > 200) window.__logs.shift(); };
  ['error', 'warn'].forEach(k => { const o = console[k]; console[k] = function () { push(k, arguments); return o.apply(console, arguments); }; });
  window.addEventListener('error', e => push('uncaught', [e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno]));
  window.addEventListener('unhandledrejection', e => push('rejection', [e.reason]));
})()"""


def main():
    a = sys.argv[1:]
    if not a:
        print(__doc__); return
    p = Page()
    cmd = a[0]
    if cmd == 'nav':
        p.call('Page.enable')
        p.call('Page.addScriptToEvaluateOnNewDocument', source=HOOK)
        p.call('Page.navigate', url=a[1])
        t0 = time.time()
        while time.time() - t0 < 30:
            time.sleep(.25)
            if p.eval('return document.readyState') == 'complete':
                break
        print('loaded', a[1])
    elif cmd == 'eval':
        v = p.eval(a[1], int(a[2]) if len(a) > 2 else 60000)
        print(v if isinstance(v, str) else json.dumps(v, ensure_ascii=False))
    elif cmd == 'shot':
        q = int(a[2]) if len(a) > 2 else 72
        params = dict(format='jpeg', quality=q)
        if len(a) > 3:
            m = p.call('Page.getLayoutMetrics')['cssVisualViewport']
            params['clip'] = dict(x=0, y=0, width=m['clientWidth'], height=m['clientHeight'], scale=float(a[3]))
        r = p.call('Page.captureScreenshot', **params)
        open(a[1], 'wb').write(base64.b64decode(r['data']))
        print('saved', a[1], os.path.getsize(a[1]))
    elif cmd == 'size':
        p.call('Emulation.setDeviceMetricsOverride', width=int(a[1]), height=int(a[2]), deviceScaleFactor=float(a[3]) if len(a) > 3 else 1, mobile=False)
        print('size', a[1], a[2])
    elif cmd == 'key':
        code = a[1]
        key = {'Space': ' ', 'Enter': 'Enter', 'Escape': 'Escape'}.get(code, code[3:].lower() if code.startswith('Key') else code)
        vk = {'Space': 32, 'Enter': 13, 'Escape': 27, 'ArrowUp': 38, 'ArrowDown': 40, 'ArrowLeft': 37, 'ArrowRight': 39}.get(code, ord(code[3:]) if code.startswith('Key') else 0)
        for t in ('keyDown', 'keyUp'):
            p.call('Input.dispatchKeyEvent', type=t, code=code, key=key, windowsVirtualKeyCode=vk, nativeVirtualKeyCode=vk, text=(key if t == 'keyDown' and len(key) == 1 else ''))
            if len(a) > 2 and t == 'keyDown':
                time.sleep(float(a[2]))
        print('key', code)
    elif cmd == 'click':
        x, y = float(a[1]), float(a[2])
        p.call('Input.dispatchMouseEvent', type='mouseMoved', x=x, y=y)
        p.call('Input.dispatchMouseEvent', type='mousePressed', x=x, y=y, button='left', clickCount=1)
        p.call('Input.dispatchMouseEvent', type='mouseReleased', x=x, y=y, button='left', clickCount=1)
        print('click', x, y)
    elif cmd == 'move':
        p.call('Input.dispatchMouseEvent', type='mouseMoved', x=float(a[1]), y=float(a[2]))
        print('move')
    elif cmd == 'logs':
        v = p.eval('const l = window.__logs || []; const o = l.slice(); l.length = 0; return o;')
        print('\n'.join(v) if v else '(no errors or warnings)')


if __name__ == '__main__':
    main()
