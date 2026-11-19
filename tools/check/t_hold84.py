"""pass 84: the scroll waits for the lab's name, by keyboard (desktop) and by finger (phone)"""
import sys, time, json, threading; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from h import T
S = 'const sec = document.querySelector(".lab"), n = document.querySelector(".lab__name"); return [+(-sec.getBoundingClientRect().top / innerHeight).toFixed(3), n.style.getPropertyValue("--fill")]'
def run(mode):
    t = T(390, 844, 3, True) if mode == 'touch' else T(1440, 900)
    t.p.call('Network.enable'); t.p.call('Network.setCacheDisabled', cacheDisabled=True)
    if mode == 'touch': t.p.call('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
    t.nav('http://localhost:4322/index.html?mute&x=%d' % int(time.time())); time.sleep(8)
    top = t.ev('return document.querySelector(".lab").getBoundingClientRect().top + scrollY'); vh = t.ev('return innerHeight')
    t.ev('window.scrollTo(0, %f); return 1' % (top - .6 * vh)); time.sleep(1.2)
    log = []; t0 = time.time()
    while time.time() - t0 < 3.4:
        if mode == 'key': t.key('ArrowDown', .02); time.sleep(.05)
        else: t.p.call('Input.synthesizeScrollGesture', x=195, y=600, yDistance=-int(vh * .25), speed=1600, gestureSourceType='touch', preventFling=True)
        log.append((round(time.time() - t0, 2),) + tuple(t.ev(S)))
    held = [r for r in log if r[2] and float(r[2]) < 1]
    print(mode, '| max s while filling:', max([r[1] for r in held] or [None]), '| s at the end:', log[-1][1], '| samples', log[::max(1, len(log) // 8)])
run(sys.argv[1]) if len(sys.argv) > 1 else (run("key"), run("touch"))
