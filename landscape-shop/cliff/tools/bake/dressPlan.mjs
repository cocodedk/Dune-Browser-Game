// landscape-shop/cliff/tools/bake/dressPlan.mjs
// R3's placement table: the rock and the goods. The sand half lives next door
// in tools/bake/dressSand.mjs (one file each, both under the 200-line rule).
//
// Every piece answers a question the set could not answer before:
//
//   markers*    HOW BIG IS THAT DOOR? Four stones standing in the gap between
//               the two gate banks (tools/bake/dressSand.mjs), the outer pair
//               further from the mouth and further BACK than the inner pair,
//               so the four of them funnel toward the gate instead of standing
//               in a row across it. Fremen
//               waymarking is a stone somebody stood up, not a monument —
//               these are 2.4 to 3.6 m, the size of the thing a person walks
//               past, which is the only reason they are here.
//   scar*       WHERE DID THE MISSING ROCK GO? model/scars.ts already pins
//               three pale spall scars to three real blocks in the bake. This
//               puts fresh broken rock on the ground under each of those three
//               and nowhere else: the pairing was a fact in the vertex colours
//               and is now a fact on the floor.
//   goods*      WHO USES THIS DOOR? Cargo stacked on the shaft floor just
//               inside the aperture. They are the only pieces in the set that
//               are neither rock nor sand, and they carry the whole "a sietch
//               takes deliveries here" read on about 300 triangles.
//               R3.1: a quarter bigger, and spread a little wider apart. Two
//               of the three R3 critics could see something on the sill and
//               neither could confirm it as human use — at 3 m against a 12 m
//               aperture the stack rendered about 20 px tall. A quarter more
//               is the most that can be spent before cargo starts competing
//               with the door it is meant to give a scale to.
//
// The goods are UNLIT (model/dressTone.ts), like every other surface inside
// the mouth. The sun sits low and well off to +X (main.ts) and its travel has
// a +Z component, so nothing in this set casts shade onto the ground in front
// of the gate — a lit crate there or in the aperture would be the one bright
// thing in the mouth, which is the read R2.1 spent the whole round protecting.

export const FEEDSTOCK = {
  // De-Draco'd copies, produced once into the gitignored feedstock directory —
  // see the header of tools/bakeDressing.mjs for the command.
  boulder: 'landscape-shop/cliff/feedstock/plain/sandstone-boulder.glb',
  debris: 'landscape-shop/cliff/feedstock/plain/rockfall-debris.glb',
  rubble: 'landscape-shop/cliff/feedstock/plain/rubble-scatter.glb',
  // Plain GLB in the pack, no decompression needed.
  drift: 'landscape-shop/feedstock-packs/desert-kingdom/glb/individual/sand_drift.glb',
  sacks: 'landscape-shop/feedstock-packs/desert-kingdom/glb/individual/spice_sacks.glb',
  baskets: 'landscape-shop/feedstock-packs/desert-kingdom/glb/individual/basket_set.glb',
  bale: 'landscape-shop/feedstock-packs/desert-kingdom/glb/individual/carpet_roll.glb',
}

// Hard limits the bake throws on, mirroring tools/bake/compose.mjs's own
// assertions. The entrance owns the set's -Z extreme by construction
// (model/socket.ts) and seam.test.ts checks it to five decimal places, so no
// dressing may reach the gate lip's frontmost plane; the massif owns +-300 in
// x and the footprint guard allows 1% on 600 m, so no dressing may widen it.
export const DRESS_FRONT_Z = -218.9
export const DRESS_HALF_WIDTH_M = 299.5
export const DRESS_TRIANGLE_BUDGET = 3000

const marker = (name, sizeM, pos, rotY, extra) => ({
  name, family: 'rock', src: 'boulder', cell: 0.32, sizeM, pos, rotY, ...extra,
})

export const ROCK_PIECES = [
  marker('markerNearW', [3.1, 2.9, 2.7], [-24, -0.25, -216.9], 0.7,
    { taperK: 0.16, noise: 0.055, seed: 701 }),
  marker('markerFarW', [2.5, 3.6, 2.3], [-34, -0.3, -215.4], 2.1,
    { mirrorX: true, taperK: 0.3, noise: 0.05, seed: 719 }),
  marker('markerNearE', [2.7, 3.2, 2.5], [22, -0.25, -216.7], 4.0,
    { taperK: 0.22, noise: 0.05, seed: 733 }),
  marker('markerFarE', [2.3, 2.4, 2.1], [32, -0.2, -215.7], 1.3,
    { mirrorX: true, taperK: 0.2, noise: 0.045, seed: 751 }),

  {
    name: 'scarFallWest',
    family: 'rock',
    src: 'debris',
    cell: 0.55,
    anchor: 'jointWedge0',
    story: 'The block that came out of the west scar, lying under it. Sits ' +
      'on the prow foot at the scar own x-span, which is the pairing ' +
      'model/scars.ts asserts in colour.',
    sizeM: [23, 3.6, 12],
    pos: [-58, -0.45, -207.5],
    rotY: 0.5,
    noise: 0.14,
    seed: 761,
  },
  {
    name: 'scarSpillWest',
    family: 'rock',
    src: 'rubble',
    cell: 0.22,
    anchor: 'jointWedge0',
    story: 'The fines that came down with it — a flat spread in front of the ' +
      'blocks, so the fall has a run-out and is not one tidy heap.',
    sizeM: [31, 1.4, 15],
    pos: [-51, -0.15, -210.4],
    rotY: 0.2,
    mirrorX: true,
    noise: 0.09,
    seed: 773,
  },
  {
    name: 'scarFallEast',
    family: 'rock',
    src: 'debris',
    cell: 0.58,
    anchor: 'jointWedge4',
    story: 'The same fall on the east side of the gate. Off frame at the ' +
      'landing rig; it is the approach rig and the game camera that read it.',
    sizeM: [20, 3.1, 11],
    pos: [78, -0.4, -207],
    rotY: 2.4,
    mirrorX: true,
    noise: 0.13,
    seed: 787,
  },
  {
    name: 'scarSpillFlank',
    family: 'rock',
    src: 'rubble',
    cell: 0.26,
    anchor: 'talus4',
    story: 'Run-out under the west flank scar, out where the approach rig ' +
      'reads the whole wall — flatter and more scattered than the two at the ' +
      'gate, because it fell further and ran.',
    sizeM: [25, 1.9, 13],
    pos: [-153, -0.2, -210],
    rotY: 0.2,
    noise: 0.1,
    seed: 809,
  },
]

export const GOODS_PIECES = [
  {
    name: 'goodsSacks',
    family: 'goods',
    src: 'sacks',
    cell: 0.24,
    story: 'Spice sacks stacked on the shaft floor a metre inside the ' +
      'aperture. The tallest of the three, so something in the mouth has a ' +
      'human measure against the 12 m gate above it.',
    sizeM: [4.6, 3.75, 3.1],
    pos: [-4.9, -0.12, -214.6],
    rotY: 0.35,
    noise: 0.03,
    seed: 821,
  },
  {
    name: 'goodsBundles',
    family: 'goods',
    src: 'baskets',
    cell: 0.22,
    story: 'Covered bundles beside them, lower and wider — a second silhouette ' +
      'so the group does not read as one box.',
    sizeM: [3.75, 2.9, 2.6],
    pos: [1.2, -0.12, -214.9],
    rotY: -0.6,
    mirrorX: true,
    noise: 0.025,
    seed: 839,
  },
  {
    name: 'goodsBale',
    family: 'goods',
    src: 'bale',
    cell: 0.2,
    story: 'A bale stood on end against the east jamb — the vertical that ' +
      'stops the stack reading as a low wall. A first pass ran it 2.1 x 3.4 ' +
      'and it rendered as a thin dark POST, which at the sill of a sietch is ' +
      'a chimney, not cargo. Wider and shorter reads as a bale.',
    sizeM: [3.25, 3.5, 2.75],
    pos: [5.2, -0.12, -214.2],
    rotY: 0.45,
    noise: 0.03,
    seed: 853,
  },
]
