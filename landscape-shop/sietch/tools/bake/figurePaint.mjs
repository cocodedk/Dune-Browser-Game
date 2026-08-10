// landscape-shop/sietch/tools/bake/figurePaint.mjs
// THE RE-TINT, for the CC0 figure kit. paint.mjs's paintTriangles reads a
// SOURCE vertex colour to decide a triangle's family (foliage / water /
// char / the piece's own ramp) — the Desert Kingdom feedstock is vertex
// coloured, so a colour is there to read. The CC0 figures are UV/texture
// coloured (glb.mjs fills a neutral placeholder for their missing
// COLOR_0), so there is no source colour worth reading here at all.
//
// A figure's shape already tells robe from skin without one: every source
// model stands with its head at the top and its robe/legs below, so the
// SOURCE vertex's height fraction — before placement, before decimation,
// the one number that survives both unchanged (placePiece scales Y
// linearly; decimate's `.source` field keeps pointing at the original
// vertex) — is the whole rule. Above SKIN_BAND_MIN is the head: skin.
// Below it is robe, darkest at the hem and lightening toward the
// shoulders (the one gradient a flat UV-coloured mesh has no other way to
// carry), which is what keeps three uniformly-grey source meshes from
// baking into three flat, same-toned silhouettes.

import { rampAt } from './tones.mjs'

// The head starts here as a fraction of total source height. Measured off
// the widest kit piece (Evil Wizard): its shoulders/arms band ends and the
// head narrows back down at y=0.80 of its 17.22-unit height; 0.86 sits
// safely inside the head on all three sourced figures, none of which have
// a neck long enough to put bare skin below it.
const SKIN_BAND_MIN = 0.86
// Same quantisation paint.mjs uses (RAMP_STEPS there): a continuous height
// fraction would mint one tone table entry per distinct decimated Y —
// hundreds of near-duplicates, and the table has to fit a Uint8 index
// (tools/bake/pack.mjs). 24 steps is already finer than one point light on
// flat-shaded facets can show.
const RAMP_STEPS = 24
const quantise = (t) => Math.round(Math.max(0, Math.min(1, t)) * RAMP_STEPS) / RAMP_STEPS

// `skinBandMin` overrides SKIN_BAND_MIN per piece — `null` turns the skin
// band off entirely (robe on every triangle). hearthElder uses this: its
// own placement sits at the seat-stones' hearth radius, where a lighter
// skin tone still clips toward white under the 340-candela point light
// (measured, rig.png) the way an unranged hearth prop would; the darker
// robe ramp holds there the way the stone seats do.
export function paintFigureTriangles(soup, triangles, srcMinY, srcMaxY, tones, skinBandMin = SKIN_BAND_MIN) {
  const span = Math.max(1e-4, srcMaxY - srcMinY)
  return triangles.map(({ source }) => {
    const frac = (soup.positions[source * 3 + 1] - srcMinY) / span
    if (skinBandMin != null && frac >= skinBandMin) return toneIndex(tones, rampAt('skin', 0.5))
    // Hem (frac 0) darkest, shoulders (frac just under the skin band)
    // lightest — the one shading cue a flat source can still carry.
    const band = skinBandMin ?? 1
    return toneIndex(tones, rampAt('robe', quantise(frac / band)))
  })
}

/** Mirrors paint.mjs's own toneIndex — kept local so this module has no
 *  dependency beyond tones.mjs, and the shared table it appends to is
 *  still just the array the caller passes in. */
function toneIndex(tones, hex) {
  const at = tones.indexOf(hex)
  if (at >= 0) return at
  tones.push(hex)
  return tones.length - 1
}
