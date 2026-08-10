// landscape-shop/sietch/tools/bake/figurePieces.mjs
// R4 — THE FIGURES. "find some human figures... and drop them in the
// sietch too. not many, a few." (user directive). Kept apart from
// pieces.mjs's Desert Kingdom composition — different feedstock, different
// licence, different paint path (figurePaint.mjs, not paint.mjs's
// vertex-colour families; see tools/bake/glb.mjs's NEUTRAL_COLOR header) —
// and combined with it only in tools/bakeDressing.mjs.
//
// EVERY sourced CC0 humanoid on Poly Pizza — the entire non-rigged,
// non-animated slice of its People & Characters catalogue, searched
// exhaustively — ships in its rigging-base reference pose: a horizontal
// T along ONE of the model's own local axes. There is no "natural pose"
// option to pick instead (measured, not assumed — see the R4 report).
// stripAxis + stripThresholdM (tools/bake/figureLimbs.mjs) removes that
// limb, POST-decimate, in world metres — the only technique that does not
// leave a spike triangle bridging the cut (that file's own header has the
// failed alternative). Two figures share figureBasin's source (the same
// reuse pieces.mjs already makes of seatStone, one boulder for three
// seats): both keep rotYDeg 0 so figureLimbs' Z-axis strip stays valid —
// the strip runs in WORLD Z, and only rotYDeg 0/180 keeps the source
// model's own limb axis aligned with it.
//
// Placement rule, same as pieces.mjs: camera at z=-40 looking +Z, world -X
// is SCREEN RIGHT. All three stand on existing zones (spec.ts names only
// the anchors; the zones themselves are tools/bake/zones.mjs).

export const FIGURE_PIECES = [
  // A quiet presence at the hearth, stripped down to robe and hood — no
  // skin band (skinBandMin: null): this placement sits at the seat-stones'
  // own ~4.4 m radius, where even the darkest robe stop clips toward white
  // under the 340-candela point light without a toneRange, and a lighter
  // skin tone would be worse, not better (measured, rig.png first pass).
  // Reuses figureBasin at a shorter heightM and a different zone/turn so
  // it does not read as the same figure twice.
  {
    name: 'hearthElder', src: 'figureBasin', zone: 'hearthCircle', figure: true,
    heightM: 1.66, rotYDeg: 0, atM: [-3.0, 0, -15.5], cellM: 0.11,
    stripAxis: 'z', stripThresholdM: 0.35, skinBandMin: null,
    ramp: 'robe', foliage: 'skin',
  },
  // Stands at the basin's edge. Full skinBandMin (figurePaint.mjs's own
  // default): this placement is far enough from the hearth's point light
  // that a lighter head tone survives without clipping, and it is the one
  // piece in the set that keeps the skin ramp in the tone table at all
  // (dressingBake.test.ts's skin-tone-window guard reads it from here).
  {
    name: 'basinTender', src: 'figureBasin', zone: 'basinPalmary', figure: true,
    heightM: 1.78, rotYDeg: 0, atM: [7.8, 0, -13.0], cellM: 0.10,
    stripAxis: 'z', stripThresholdM: 0.35,
    ramp: 'robe', foliage: 'skin',
  },
  // Evil Wizard's reference pose spreads along its own local X instead
  // (measured: bounding box 22.3 wide vs 17.2 tall at rotYDeg 0 — the
  // opposite axis from the Polygonal Mind kit above, a different
  // creator's authoring convention). crop removes the horned crown
  // (y>14.5 of 17.2) — an off-theme prop cut the same way gallerySurround's
  // door leaf was, not kept and re-tinted. Stands on the tier (y=5.5, the
  // same landing tierSacks and tierJar stand on), positioned to actually
  // sit inside CAMERA_RIG's view of that landing (checked by projecting
  // the point through the spec camera — the first placement, z=-10.8, sat
  // one segment too deep into the recess and never showed a single pixel).
  {
    name: 'tierSentinel', src: 'figureTier', zone: 'tierStores', figure: true,
    heightM: 1.85, rotYDeg: 0, atM: [13.2, 5.5, -9.3], cellM: 0.14,
    crop: [{ maxY: 14.5 }],
    stripAxis: 'x', stripThresholdM: 0.35,
    ramp: 'robe', foliage: 'skin',
  },
]
