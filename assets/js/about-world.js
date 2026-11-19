/* ============================================================
   ULJO — About: the real planet (pass 69)
   The page opens close on Jaime's face, standing on ULJO by the fire.
   Scrolling pulls the eye back — slowly at first, then by powers of ten —
   until the whole planet hangs there, turning very slightly, its air lit
   from inside and an aura streaming out of it. The words arrive last.

   The planet is the one generated in Meshy (assets/models/planet.glb), the
   same file the home page walks on; Jaime is his Meshy character
   (character.glb). If WebGL or the files fail, the painted eclipse in
   about.js takes over (window.__eclipseFallback).
   ============================================================ */
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { DRACOLoader } from '../vendor/DRACOLoader.js';

const sec = document.querySelector('[data-eclipse-3d]');
const canvas = sec && sec.querySelector('[data-eclipse-world]');
if (sec && canvas) start().catch((err) => { console.warn('[about-world]', err); fallback(); });

function fallback() {
  if (!sec) return;
  sec.removeAttribute('data-eclipse-3d'); sec.classList.remove('has-world');
  const w = sec.querySelector('.eclipse__words'); if (w) { w.style.opacity = ''; w.style.transform = ''; }
  window.dispatchEvent(new Event('scroll')); window.dispatchEvent(new Event('resize'));      // the painted eclipse wakes up
}

async function start() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const clamp = THREE.MathUtils.clamp, sst = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const R = 9.5, C = V(.9, 1.4, -.05);                   // the lawn's dome (the game's frame) · the middle of the whole body
  const at = (x, z) => { const d = Math.hypot(x, z); if (d < 1e-6) return V(0, 1, 0); const a = d / R; return V(Math.sin(a) * x / d, Math.cos(a), Math.sin(a) * z / d); };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  if (!renderer.capabilities.isWebGL2) throw new Error('no WebGL2');
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1.6, .03, 900);

  const draco = new DRACOLoader().setDecoderPath(new URL('../vendor/draco/', import.meta.url).href);
  const [planetFile, charFile] = await Promise.all([
    (window.matchMedia('(pointer: coarse)').matches || Math.min(window.screen.width, window.screen.height) < 700 ? Promise.reject() : new GLTFLoader().setDRACOLoader(draco).loadAsync(new URL('../models/planet-hq.glb?v=3', import.meta.url).href))      // pass 77: the finer planet on a computer (its trees are whole), the light one on a phone
      .catch(() => new GLTFLoader().setDRACOLoader(draco).loadAsync(new URL('../models/planet.glb?v=8', import.meta.url).href)),
    new GLTFLoader().loadAsync(new URL('../models/character-hq.glb?v=1', import.meta.url).href)      // the sharper copy: 2048 px, its normal map (build_character.py --hq)
  ]);
  draco.dispose();

  /* everything that turns: the planet, him, the fire — round the planet's own middle */
  const spin = new THREE.Group(); spin.position.copy(C); scene.add(spin);
  const world = new THREE.Group(); world.position.copy(C).negate(); spin.add(world);

  planetFile.scene.traverse((m) => {
    if (!m.isMesh) return;
    const mt = m.material; mt.side = THREE.FrontSide; mt.metalness = 0; mt.roughness = .9; mt.envMapIntensity = .4;
    mt.emissiveMap = mt.map; mt.emissive = new THREE.Color(.3, .29, .27);       // pass 80: much more of its own colours (the orange trees, the wood, the grass), less of the night's violet
    m.frustumCulled = false;
  });
  world.add(planetFile.scene);

  /* Jaime, standing on the lawn a metre from the fire, turned toward us */
  const n = at(1.06, .14), foot = n.clone().multiplyScalar(9.35);      // (pass 80: his soles a little into the ground, as they are in the grass of the game)
  const fwd = V(0, 0, 1).addScaledVector(n, -n.z).normalize(), side = V(0, 0, 0).crossVectors(n, fwd).normalize();
  const me = new THREE.Group(); me.matrixAutoUpdate = false; me.matrix.makeBasis(side, n, fwd).setPosition(foot); world.add(me);
  const body = charFile.scene; me.add(body);
  const bones = {};
  body.traverse((o) => {
    if (o.isBone) bones[o.name.replace(/^mixamorig:?/, '')] = o;
    if (o.isMesh) { o.frustumCulled = false; o.layers.set(1); const mt = o.material; mt.metalness = 0; mt.roughness = .66; mt.envMapIntensity = .5; mt.emissiveMap = mt.map; mt.emissive = new THREE.Color(.12, .11, .1); if (mt.map) mt.map.anisotropy = 8; }      // layer 1: he is drawn sharp over the soft background
  });
  const mixer = new THREE.AnimationMixer(body);
  const up = charFile.animations.find((c) => c.name === 'standup');
  if (up) {
    up.tracks.forEach((tr) => { if (/Hips\.position$/.test(tr.name)) { const v = tr.values, x0 = v[0], z0 = v[2]; for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; } } });
    const end = Math.round(up.duration * 24);
    mixer.clipAction(THREE.AnimationUtils.subclip(up, 'idle', end - 1, end, 24)).play();
  }
  mixer.update(0);
  {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,.7)'); g.addColorStop(.45, 'rgba(0,0,0,.4)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(.95, .62).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
    sh.position.set(0, .03, .02); sh.renderOrder = 2; me.add(sh); sh.layers.enableAll();
  }

  /* the fire */
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.3, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const sprite = (color, size) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); s.scale.setScalar(size); return s; };
  const fireAt = at(0, 0).multiplyScalar(9.466 + .3);
  const fireGlow = sprite(new THREE.Color(1, .45, .12), 1.4); fireGlow.position.copy(fireAt); world.add(fireGlow);
  const fireCore = sprite(new THREE.Color(1, .8, .45), .45); fireCore.position.copy(fireAt); world.add(fireCore);
  const fireLight = new THREE.PointLight(0xff8a3c, 9, 7, 1.4); fireLight.position.copy(fireAt).addScaledVector(n, .2); world.add(fireLight);

  /* the light: the last of a sun behind him, the night all round, a cool edge */
  const lights = [
    new THREE.HemisphereLight(0xb4c6ff, 0x5a5048, .55),                                // pass 80: the game's own light: a blue night, a warm low sun, a clear moon
    Object.assign(new THREE.DirectionalLight(0xff9a66, 2.0), { name: 'key' }),
    Object.assign(new THREE.DirectionalLight(0xffb07a, 1.0), { name: 'sun rim' }),
    Object.assign(new THREE.DirectionalLight(0x9ab4ff, 1.35), { name: 'moon' }),
    Object.assign(new THREE.DirectionalLight(0xe2eaff, .7), { name: 'front' })
  ];
  lights[1].position.set(-30, 26, -40); lights[2].position.set(-34, 12, -30); lights[3].position.set(36, 10, -30); lights[4].position.set(8, 14, 40);
  lights.forEach((l) => { l.layers.enableAll(); scene.add(l); });
  fireLight.layers.enableAll();

  /* pass 77: the glow is added to the picture but leaves the canvas see-through — so the words of the page, which stand
     BEHIND this canvas, show through the light and are hidden only by the planet itself: its trees stand before them */
  const GLOW = { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor };
  /* its air: a shell lit at the edge */
  const air = new THREE.Mesh(new THREE.SphereGeometry(10.9, 96, 64), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, ...GLOW, side: THREE.BackSide, uniforms: { k: { value: 0 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float k; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(clamp(-dot(vN, vV) / .5, 0., 1.), 2.4); gl_FragColor = vec4(mix(vec3(.42,.3,1.), vec3(1.,.55,.85), f) * f * .34 * k, 1.); }'      // violet thinning to pink at the limb, like the game's sky
  }));
  air.position.copy(C); air.renderOrder = 1; scene.add(air);

  /* pass 80: the game's own sky behind his face (night blue, a band of teal, the last of the sun low behind him); as the eye
     pulls back it gives way to space */
  const sunDir = V(0, 0, -1);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { sun: { value: sunDir }, k: { value: 1 } }, transparent: false, depthTest: false, toneMapped: false,
    vertexShader: 'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `
      varying vec3 vDir; uniform vec3 sun; uniform float k;
      float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
      float fbm(vec3 p){ return .5 * n3(p) + .25 * n3(p * 2.1 + 3.) + .125 * n3(p * 4.3 + 7.) + .0625 * n3(p * 8.7 + 11.); }
      void main(){
        vec3 d = normalize(vDir);
        vec3 sr = normalize(cross(sun, vec3(0., 1., 0.))), su = cross(sr, sun);
        float g = degrees(atan(length(vec2(dot(d, sr), dot(d, su) * 1.3)), dot(d, sun)));     // how far from the sunset; the glow lies wide
        vec3 night = vec3(.010,.014,.066), deep = vec3(.016,.046,.135), green = vec3(.028,.165,.185);
        vec3 col = mix(deep, night, smoothstep(22., 40., g));
        col = mix(green, col, smoothstep(11., 25., g));
        col = mix(vec3(.50,.150,.185), col, smoothstep(7.5, 15.5, g));
        col = mix(vec3(.80,.150,.200), col, smoothstep(3., 10.5, g));
        float low = smoothstep(.15, -.04, d.y - sun.y);
        col = mix(col, vec3(1.0,.34,.115), (1. - smoothstep(2., 11., g)) * low);
        // space is not empty: clouds of violet and teal away from the sunset
        float nb = fbm(d * 2.6 + 4.), nb2 = fbm(d * 5.2 - 2.);
        col += mix(vec3(.30,.07,.52), vec3(.05,.34,.50), smoothstep(.35, .7, nb2)) * pow(smoothstep(.36, .8, nb), 1.5) * .5 * smoothstep(10., 30., g);
        gl_FragColor = vec4(col * 1.08 * k, k);
      }`
  });
  const skyDome = (() => { const g = new THREE.SphereGeometry(400, 48, 24); const m = new THREE.Mesh(g, skyMat); m.renderOrder = -20; m.frustumCulled = false; scene.add(m); return m; })();

  /* the aura: light streaming out of it, slow, in long rays — a sheet always turned to the eye */
  const auraMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, ...GLOW,
    uniforms: { time: { value: 0 }, k: { value: 0 }, rIn: { value: 10.2 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `varying vec2 vP; uniform float time, k, rIn;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){
        /* pass 77: an eclipse — a thin bright light right at the planet's edge, a short soft crown round it, and only
           a breath beyond (it used to stream far out). The colours go round the circle without a seam: the last of the
           sun (red, orange) on one side, then pink, violet, and the blue of the night on the other. */
        float r = length(vP), a = atan(vP.y, vP.x);
        float out_ = max(0., r - rIn);
        float near = exp(-out_ / .55), mid = exp(-out_ / 2.4), far = exp(-out_ / 8.5);
        vec2 ring = vec2(cos(a), sin(a));                                    // (the rays are read round a circle: no seam where the angle wraps)
        float rays = n2(ring * 3.2 + vec2(out_ * .1 - time * .12, 7.)) * .6 + n2(ring * 7.5 + vec2(3., out_ * .25 - time * .2)) * .4;
        float inner = smoothstep(rIn - 1.8, rIn + .5, r);
        float t = .5 + .5 * cos(a + 2.45);                                   // 1 toward the low sun (lower left)
        /* pass 82: the sunset's own gradient, all round it, in bands from its edge outward — the painted eclipse of the first
           site: cream, orange, red, pink, mauve, then the teal and the navy of the night, into space */
        vec3 c0 = vec3(1., .949, .839), c1 = vec3(1., .455, .094), c2 = vec3(.992, .325, .196), c3 = vec3(.996, .341, .439),
             c4 = vec3(.773, .376, .471), c5 = vec3(0., .345, .42), c6 = vec3(0., .224, .322), c7 = vec3(.024, .082, .22);
        float d = out_ * .72;                                               // (pass 82: wider, a glow and not a ring)
        vec3 col = mix(c0, c1, smoothstep(0., .16, d));
        col = mix(col, c2, smoothstep(.16, .45, d));
        col = mix(col, c3, smoothstep(.45, .9, d));
        col = mix(col, c4, smoothstep(.9, 1.45, d));
        col = mix(col, c5, smoothstep(1.45, 2.2, d));
        col = mix(col, c6, smoothstep(2.2, 3.0, d));
        col = mix(col, c7, smoothstep(3.0, 4.2, d));
        float env = (1. - smoothstep(0., 6.4, d)) * (.42 + .58 * smoothstep(-.1, .8, t));     // strongest toward the low sun, never gone
        float v = inner * pow(env, .9) * (1.05 - .1 * rays) * k;
        float rim = inner * exp(-out_ / .35) * (.55 + .45 * t) * k;                        // the thin bright edge of the eclipse
        /* and far out, a breath of the game's own sky: its clouds of violet and teal, very faint */
        float cl = n2(vP * .11 + vec2(time * .012, 4.)) * .6 + n2(vP * .26 - vec2(3., time * .02)) * .4;
        float cl2 = n2(vP * .19 + vec2(9., -time * .015));
        vec3 sky = mix(vec3(.30, .07, .52), vec3(.05, .34, .50), smoothstep(.35, .7, cl2));
        float sv = inner * smoothstep(2., 6., out_) * exp(-out_ / 11.) * pow(smoothstep(.3, .82, cl), 1.4) * .7 * k * (1. - smoothstep(22., 38., r));
        /* pass 83: and a broad glow of the same sunset, so it shines and does not only ring: orange and pink toward the low sun,
           mauve and blue on the other side, fading slowly into space */
        float halo = inner * exp(-out_ / 7.) * (1. - smoothstep(24., 40., r)) * k;
        vec3 hc = mix(mix(c6 * 1.6, c4, smoothstep(.15, .5, t)), mix(c3, c1, smoothstep(.6, .95, t)), smoothstep(.4, .8, t));
        gl_FragColor = vec4(col * pow(v, .85) * 1.25 + c0 * rim * .8 + hc * halo * .5 + sky * sv, 1.);
      }`
  });
  const aura = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), auraMat); aura.renderOrder = -1; scene.add(aura);

  /* ---------- a shallow depth of field, for the close-up ---------- */
  renderer.autoClear = false;
  const rtOpt = { type: THREE.HalfFloatType, depthBuffer: false };
  const rtFull = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 }), rtA = new THREE.WebGLRenderTarget(2, 2, rtOpt), rtB = new THREE.WebGLRenderTarget(2, 2, rtOpt);
  const fsScene = new THREE.Scene(), fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const fsQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); fsQuad.frustumCulled = false; fsScene.add(fsQuad);
  const FSV = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
  const blurMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { tex: { value: null }, step: { value: new THREE.Vector2() } }, vertexShader: FSV,
    fragmentShader: `varying vec2 vUv; uniform sampler2D tex; uniform vec2 step;
      void main(){ vec4 c = texture2D(tex, vUv) * .2270270;
        c += (texture2D(tex, vUv + step * 1.3846154) + texture2D(tex, vUv - step * 1.3846154)) * .3162162;
        c += (texture2D(tex, vUv + step * 3.2307692) + texture2D(tex, vUv - step * 3.2307692)) * .0702703;
        gl_FragColor = c; }` });
  function blurPass(src, dst, x, y, k) { blurMat.uniforms.tex.value = src; blurMat.uniforms.step.value.set(x * 1.5 * k / dst.width, y * 1.5 * k / dst.height); fsQuad.material = blurMat; renderer.setRenderTarget(dst); renderer.clear(); renderer.render(fsScene, fsCam); }      // pass 71: a softer focus, not a smear
  const compMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, transparent: true, premultipliedAlpha: true, blending: THREE.NoBlending, uniforms: { sharp: { value: null }, soft: { value: null }, k: { value: 0 } }, vertexShader: FSV,
    fragmentShader: `varying vec2 vUv; uniform sampler2D sharp, soft; uniform float k;
      void main(){ vec4 c = mix(texture2D(sharp, vUv), texture2D(soft, vUv), clamp(k, 0., 1.) * .45); float l = dot(c.rgb, vec3(.2126, .7152, .0722)); c.rgb = mix(vec3(l), c.rgb, 1. + .22 * k) * vec3(1.04, 1., .95); gl_FragColor = c;      // pass 80: a light blur only, a touch warmer and more saturated: the scene's own colours, not a violet wash
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` });
  compMat.toneMapped = true;

  /* ---------- the eye: from his face to the whole planet ---------- */
  const words = sec.querySelector('.eclipse__words'), cue = sec.querySelector('[data-eclipse-scroll]'), dive = words && words.querySelector('.t-display');
  let diveAt = 0, diveHeld = false;
  const head = V(0, 0, 0), n_w = V(0, 0, 0), f_w = V(0, 0, 0), tgt = V(0, 0, 0), dir = V(0, 0, 0), dirEnd = V(.16, .38, 1).normalize(), lookEnd = C.clone().add(V(0, 4.2, 0));
  const q = new THREE.Quaternion(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), Z = V(0, 0, 1);
  let W = 0, H = 0, visible = true, raf = 0, last = performance.now(), t = 0, p = 0, pS = -1;
  const LIMB = 10.6;                          // how far the body reaches up from its middle; how far below that edge (a share of the screen) the words' feet stand
  function size() {
    const r = canvas.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, W * H > 2.4e6 ? 1.5 : 2)); renderer.setSize(W, H, false);      // pass 71: sharper
    const bw = Math.round(W * renderer.getPixelRatio()), bh = Math.round(H * renderer.getPixelRatio());
    rtFull.setSize(bw, bh); rtA.setSize(Math.max(2, bw >> 1), Math.max(2, bh >> 1)); rtB.setSize(Math.max(2, bw >> 1), Math.max(2, bh >> 1));
    camera.aspect = W / H; camera.updateProjectionMatrix();
  }
  function progress() {
    const r = sec.getBoundingClientRect(), span = Math.max(1, r.height - H);
    return clamp(-r.top / span, 0, 1);
  }
  let held = false;                                          // the trailer drives it frame by frame (window.__aboutWorld.shot)
  function frame(now) {
    raf = 0;
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!held) { t += dt; p += (progress() - p) * (1 - Math.pow(.0008, dt)); }      // the scroll, eased
    render();
    loop();
  }
  function render() {
    spin.rotation.y = reduce ? 0 : t * .018;                 // it turns, very slightly
    spin.updateMatrixWorld(true);
    const e = 1 - Math.pow(1 - p, 1.6);
    /* where he is now: his eyes, his up, the way he faces */
    bones.Head.getWorldPosition(head);
    n_w.copy(n).transformDirection(spin.matrixWorld); f_w.copy(fwd).transformDirection(spin.matrixWorld);
    head.addScaledVector(n_w, .07);
    /* the target moves from his face to the planet once the eye is far enough out */
    const w = sst(.18, .86, p);
    tgt.copy(head).lerp(lookEnd, w);
    /* the eye's direction turns from his facing to the last view */
    qa.setFromUnitVectors(Z, f_w.clone().addScaledVector(n_w, -.42).normalize());      // pass 82: from lower, looking up at him: space behind his head      // a little below his eyes, looking up: more sky behind him qb.setFromUnitVectors(Z, dirEnd);
    q.slerpQuaternions(qa, qb, sst(.05, .95, p)); dir.copy(Z).applyQuaternion(q);
    const d0 = 1.2, d1 = 66, dist = d0 * Math.pow(d1 / d0, e);
    camera.position.copy(tgt).addScaledVector(dir, dist);
    camera.up.copy(n_w).lerp(V(0, 1, 0), sst(.2, .8, p)).normalize();
    camera.lookAt(tgt);
    camera.fov = 30 + 6 * sst(.4, 1, p); camera.updateProjectionMatrix();
    /* the air and the aura come with the distance */
    const far = camera.position.distanceTo(C);
    air.material.uniforms.k.value = sst(14, 26, far);
    skyDome.position.copy(camera.position);
    sunDir.copy(f_w).negate().addScaledVector(n_w, .06).normalize();             // the last of the sun, low, behind him
    skyMat.uniforms.k.value = 0; skyDome.visible = false;          // pass 82: space behind him, not a sky
    auraMat.uniforms.k.value = .55 + .45 * sst(12, 40, far); auraMat.uniforms.time.value = t;
    aura.position.copy(C); aura.quaternion.copy(camera.quaternion);
    /* the fire breathes */
    const fl = .85 + .15 * Math.sin(t * 11.3) * Math.sin(t * 7.1 + 1.3);
    fireLight.intensity = 9 * fl; fireGlow.material.opacity = .8 + .2 * fl;
    /* close on his face the background falls out of focus; it sharpens as the eye pulls back */
    const dof = 1 - sst(.05, .3, p);
    if (dof > .01) {
      renderer.setRenderTarget(rtFull); renderer.clear(); camera.layers.set(0); renderer.render(scene, camera);
      blurPass(rtFull.texture, rtA, 1, 0, dof); blurPass(rtA.texture, rtB, 0, 1, dof);
      compMat.uniforms.sharp.value = rtFull.texture; compMat.uniforms.soft.value = rtB.texture; compMat.uniforms.k.value = dof;
      renderer.setRenderTarget(null); renderer.clear(); fsQuad.material = compMat; renderer.render(fsScene, fsCam);
      renderer.clearDepth(); camera.layers.set(1); renderer.render(scene, camera);
    } else {
      renderer.setRenderTarget(null); renderer.clear(); camera.layers.enableAll(); renderer.render(scene, camera);
    }
    /* the words come when the planet is whole */
    if (Math.abs(p - pS) > .001) {
      pS = p;
      const k = sst(.76, .92, p);                            // (pass 78: a little later: by then the tall pines no longer reach into them)
      if (words) {
        tgt.copy(C).addScaledVector(camera.up, LIMB).project(camera);      // the planet's upper edge, on the screen: the headline's feet stand just over it
        const FEET = -.012;                                                 // pass 79: a tiny bit lower again: the letters' feet among the tree tops, a little behind them                                                 // pass 78: their feet stand clear above the tree tops on every screen ("the intro is hidden… so we can see everything"); they were a little under the edge on a wide one
        const yy = (-tgt.y * .5 + .5) + FEET, y = clamp(yy, .12, .6), kw = k * sst(.06, .12, yy);      // …and they come only once there is room for them over the trees (while the planet still fills the screen they would stand among them)
        words.style.opacity = kw.toFixed(3);
        if (dive && (kw > .04) !== dive.classList.contains('is-drawn')) { if (kw > .04) { dive.classList.add('is-drawn'); diveAt = performance.now(); } else if (kw <= 0) dive.classList.remove('is-drawn'); }      // pass 89
        /* pass 90: once the title stands whole, the page waits there until it is written (outline, then white: 1.7 s) */
        if (dive && kw > .97 && diveAt && performance.now() - diveAt < 1750 && window.__uljoHold && !diveHeld) { diveHeld = true; const at0 = diveAt; window.__uljoHold(window.scrollY, () => performance.now() - at0 > 1750); }
        if (kw <= 0) diveHeld = false; words.style.transform = 'translateY(' + ((1 - kw) * 1.5).toFixed(2) + 'rem)';
        words.style.setProperty('--words-b', ((1 - y) * 100).toFixed(2) + '%');
      }
      if (cue) cue.classList.toggle('is-gone', p > .04);
    }
  }
  function loop() { if (!held && !raf && visible && !document.hidden) raf = requestAnimationFrame(frame); }
  size(); p = progress();
  frame(performance.now());
  sec.classList.add('has-world');
  if (document.documentElement.classList.contains('from-through')) {      // pass 79: come from the water: his face is there at once, and the light lifts off it
    sec.querySelectorAll('.eclipse__world, .eclipse__sky').forEach((el) => { el.style.transition = 'none'; });
    requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('is-shown')));
  }
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; last = performance.now(); loop(); }, { rootMargin: '80px' }).observe(sec);
  document.addEventListener('visibilitychange', () => { last = performance.now(); loop(); });
  window.addEventListener('resize', () => { size(); loop(); });
  window.__aboutWorld = { scene, camera, renderer, spin, me, bones, get p() { return p; }, set p(v) { p = v; }, progress,
    /* for the trailer: a fixed size, then exactly the frame asked for */
    film: (w, h) => { held = true; renderer.setPixelRatio(1); renderer.setSize(w, h, false); rtFull.setSize(w, h); rtA.setSize(w >> 1, h >> 1); rtB.setSize(w >> 1, h >> 1); camera.aspect = w / h; camera.updateProjectionMatrix(); W = w; H = h; },
    shot: (pp, tt) => { p = pp; t = tt; render(); } };
}
