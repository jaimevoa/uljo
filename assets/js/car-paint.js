/* ============================================================
   ULJO — the Manic GT's paint (pass 76)
   The car is one mesh under one picture (Meshy made it from Jaime's photograph), so paint, glass, rubber and
   trim all shared one finish, and the picture's own blotches showed in the paint. Here the shader tells them
   apart, texel by texel — by colour, and by how high on the car they are — and gives each its own surface:

     paint  : one even orange (the picture only whispers through), glossy like lacquer
     glass  : near-black, mirror-smooth — it shows the room, not a smudge of an interior
     rubber : matt
     the rest (white wheels, bright trim, the stripe's letters) stays as painted, a little shinier

   carPaint(material, { y0, y1 }) — y0…y1: the height (in the model's own units, one unit long) where the
   windows begin. Used by car-show.js (the lab) and quests.js (the planet).
   ============================================================ */
export function carPaint(mat, opt = {}) {
  const glass0 = (opt.glass0 ?? .158).toFixed(4), glass1 = (opt.glass1 ?? .172).toFixed(4);
  const tyre0 = (opt.tyre0 ?? .105).toFixed(4), tyre1 = (opt.tyre1 ?? .125).toFixed(4);
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCarP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCarP = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCarP;\nfloat carPaintK = 0., carGlassK = 0., carTyreK = 0., carTrimK = 0.;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          vec3 c = diffuseColor.rgb;
          float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b)), sat = (mx - mn) / max(mx, 1e-4), lum = dot(c, vec3(.2126, .7152, .0722));
          carPaintK = smoothstep(.5, .78, sat) * smoothstep(.1, .26, c.r) * step(c.b, c.g + .04) * (1. - smoothstep(.29, .38, c.g / max(c.r, 1e-4)));      // red-orange only: the tan of the seats seen through a window is not paint
          float dark = (1. - smoothstep(.015, .07, lum)) * (1. - carPaintK);
          carTrimK = smoothstep(.45, .8, lum) * (1. - smoothstep(.05, .16, sat));
          carGlassK = (1. - carPaintK) * (1. - carTrimK) * smoothstep(${glass0}, ${glass1}, vCarP.y);      // above the belt line, what is neither paint nor bright trim is glass (whatever the picture shows through it)
          carTyreK = dark * (1. - smoothstep(${tyre0}, ${tyre1}, vCarP.y));
          vec3 paint = vec3(.78, .066, .012) * (.9 + .25 * smoothstep(.05, .5, lum));      // the Manic's orange, with only a breath of the picture's light and shade
          diffuseColor.rgb = mix(c, paint, carPaintK * .92);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.01, .014, .022), carGlassK);
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, .2, carPaintK);
        roughnessFactor = mix(roughnessFactor, .07, carGlassK);
        roughnessFactor = mix(roughnessFactor, .92, carTyreK);
        roughnessFactor = mix(roughnessFactor, .26, carTrimK);`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        metalnessFactor = mix(metalnessFactor, 0., max(carPaintK, max(carGlassK, carTyreK)));`);
  };
  mat.customProgramCacheKey = () => 'car-paint-' + glass0 + tyre0;
  mat.needsUpdate = true;
  return mat;
}
