// landscape-shop/sietch/tools/bake/pieces.mjs
// THE COMPOSITION. Every object in the hall, why it is there, and what it
// took to stop being a kit piece. Fields:
//
//   src        key into zones.mjs FEEDSTOCK
//   zone       which cluster it belongs to (guarded, see zones.mjs)
//   heightM    finished height in true metres, against a 22 m vault
//   spreadXZ   footprint multiplier — 1 keeps the asset's proportions
//   squashZ    depth multiplier on top of spreadXZ (wall pieces only)
//   rotYDeg    nothing in a cave is axis-aligned
//   atM        [x, supportY, z] — x/z centre the footprint, y is the
//              surface it STANDS ON (floor 0, hearth lip 0.35, ramp
//              landing 2.4, tier 5.5). src/dressing.test.ts casts a ray
//              down from every piece and fails it if the rock is not
//              there.
//   cellM      decimation cell, world metres (tools/bake/reshape.mjs)
//   crop       source-space box to keep, or {invert:true} to cut away
//   ramp       which PALETTE-derived ramp its warm/neutral parts take
//   foliage    which ramp its GREEN parts take (tools/bake/tones.mjs)
//   split      emit the asset's emissive part as a second `<name>Embers`
//              piece on the ember material
//
// Placement rule the rig enforces: the camera stands at z = -40 looking
// down +Z, so world -X is SCREEN RIGHT. The hearth (x = -6) is right of
// frame centre and the basin and tier (x = +10..15) are left of it.

export const PIECES = [
  // ---- hearthCircle -------------------------------------------------
  // The fire finally has a body. R2 left a blown-out disc of floor with
  // no object in it; a brazier standing on the lip puts the light inside
  // something, and its flame geometry (the kit's only above-1.0 vertex
  // colours) becomes the one emissive surface in the set.
  {
    name: 'hearthBrazier', src: 'brazier', zone: 'hearthCircle',
    // Cropped to the BOWL AND ITS COALS, top and bottom. Shot twice
    // before this: the kit's tripod legs render as three black sticks at
    // 40 px per metre, and its flame is a 0.5 m spike that reads as a
    // white paper cone. What is left is a 2 m fire-bowl on a stub foot,
    // standing on the hearth lip, with the coals (the asset's only
    // above-1.0 vertex colours) glowing at its rim — a fire the camera
    // can see the source of, at the eye-level angle the rig looks from.
    heightM: 0.8, spreadXZ: 1.1, rotYDeg: 24, atM: [-6.0, 0.35, -20.2], cellM: 0.07,
    crop: [{ minY: 0.55, maxY: 0.95 }], ramp: 'char', foliage: 'frond', split: true,
  },
  // Three mats, not four, and none of them square to anything. The gap
  // between them is deliberate: it is where surface/floorWear.ts's
  // mouth-to-hearth line arrives, and a mat laid across the busiest path
  // in the sietch would be a mat nobody would lay.
  {
    name: 'hearthMatWest', src: 'carpet', zone: 'hearthCircle',
    heightM: 0.26, spreadXZ: 7.4, squashZ: 0.62, rotYDeg: 18, atM: [-10.8, 0, -20.6], cellM: 0.12,
    ramp: 'cloth', foliage: 'frond', toneRange: [0.16, 0.62],
  },
  // A rolled cushion, and it sits BEYOND the fire. Everything on the
  // camera's side of a point light is a silhouette, and a rolled bundle
  // in silhouette is a black rectangle — shot twice before it moved. Past
  // the fire it is lit on the face the camera sees, and it reads as what
  // it is. Only low ROCK is left on the near arc, where a lumpy outline
  // survives being black.
  {
    name: 'hearthBolsterFar', src: 'carpet', zone: 'hearthCircle',
    heightM: 0.54, spreadXZ: 2.2, rotYDeg: -52, atM: [-8.0, 0, -16.8], cellM: 0.09,
    ramp: 'fibre', foliage: 'frond', toneRange: [0.24, 0.8],
  },
  // THREE SITTING STONES, and the reason they are stones. Two shots of a
  // fabric ring failed the same way: a rug at CAMERA_RIG's 5-degree
  // depression is a dark strip, and a rolled bundle at 40 px per metre is
  // a black box with a lit lid — neither reads as somewhere to sit. A
  // low boulder does, instantly, and it is the right answer for a people
  // who carry water and not furniture. The kit's boulder is squashed to
  // seat height and spread wide so it reads as worn and sat-on rather
  // than as rockfall.
  {
    name: 'hearthSeatWest', src: 'seatStone', zone: 'hearthCircle',
    heightM: 0.55, spreadXZ: 1.7, rotYDeg: 25, atM: [-9.8, 0, -17.8], cellM: 0.1,
    ramp: 'stone', foliage: 'frond', toneRange: [0.28, 0.88],
  },
  {
    name: 'hearthSeatNear', src: 'seatStone', zone: 'hearthCircle',
    heightM: 0.52, spreadXZ: 1.6, rotYDeg: 130, atM: [-8.8, 0, -23.4], cellM: 0.1,
    ramp: 'stone', foliage: 'frond', toneRange: [0.28, 0.86],
  },
  {
    name: 'hearthSeatEast', src: 'seatStone', zone: 'hearthCircle',
    heightM: 0.57, spreadXZ: 1.75, rotYDeg: -70, atM: [-2.6, 0, -17.4], cellM: 0.1,
    ramp: 'stone', foliage: 'frond', toneRange: [0.3, 0.9],
  },
  // A bolster left where someone was sitting — the same carpet asset,
  // this time NOT unrolled. Between the camera and the fire, so it reads
  // as a silhouette against the floor's bright pool.
  // Two jars on the far side of the fire: front-lit from the hearth, so
  // they carry the warmest colour in the frame and give the light
  // something to fall off across.
  {
    name: 'hearthJarTall', src: 'amphora', zone: 'hearthCircle',
    heightM: 1.25, rotYDeg: 15, atM: [-1.2, 0, -19.6], cellM: 0.10,
    ramp: 'stone', foliage: 'frond', toneRange: [0.14, 0.86],
  },
  {
    name: 'hearthJarSmall', src: 'amphora', zone: 'hearthCircle',
    heightM: 0.95, rotYDeg: -55, atM: [-0.6, 0, -20.9], cellM: 0.12,
    ramp: 'cloth', foliage: 'frond', toneRange: [0.14, 0.78],
  },
  {
    name: 'hearthBaskets', src: 'baskets', zone: 'hearthCircle',
    heightM: 0.74, spreadXZ: 0.85, rotYDeg: 65, atM: [-11.2, 0, -17.6], cellM: 0.14,
    ramp: 'fibre', foliage: 'frond', toneRange: [0.12, 0.7],
  },

  // ---- basinPalmary -------------------------------------------------
  // Two species, three trees, none the same height: a row of identical
  // palms is a texture, a graded group is a stand. All three are pulled
  // in narrower than the kit made them (spreadXZ < 1) — sietch palms grow
  // on rationed water, and the crowns have to clear the tier at x = 13.
  {
    name: 'palmTall', src: 'datePalm', zone: 'basinPalmary',
    heightM: 5.4, spreadXZ: 0.8, rotYDeg: 35, atM: [10.2, 0, -10.4], cellM: 0.15,
    ramp: 'wood', foliage: 'frond',
  },
  {
    name: 'palmForked', src: 'doumPalm', zone: 'basinPalmary',
    heightM: 4.4, spreadXZ: 0.78, rotYDeg: -20, atM: [11.6, 0, -15.4], cellM: 0.15,
    ramp: 'wood', foliage: 'frond',
  },
  {
    name: 'palmYoung', src: 'datePalm', zone: 'basinPalmary',
    heightM: 3.3, spreadXZ: 0.7, rotYDeg: 110, atM: [8.4, 0, -13.4], cellM: 0.16,
    ramp: 'wood', foliage: 'frond',
  },
  // The urn beside the pool, not in it: water is carried away from the
  // basin, never left standing where it can evaporate.
  {
    name: 'basinUrn', src: 'urn', zone: 'basinPalmary',
    heightM: 1.15, spreadXZ: 0.9, rotYDeg: -30, atM: [12.3, 0, -13.6], cellM: 0.11,
    ramp: 'stone', foliage: 'frond',
  },
  {
    name: 'scrubNear', src: 'scrub', zone: 'basinPalmary',
    heightM: 0.62, rotYDeg: 20, atM: [7.7, 0, -10.4], cellM: 0.07,
    ramp: 'stone', foliage: 'frond',
  },
  {
    name: 'scrubTier', src: 'scrub', zone: 'basinPalmary',
    heightM: 0.5, rotYDeg: 140, atM: [12.4, 0, -12.2], cellM: 0.07,
    ramp: 'stone', foliage: 'frond',
  },
  {
    name: 'scrubFar', src: 'scrub', zone: 'basinPalmary',
    heightM: 0.72, rotYDeg: -75, atM: [8.9, 0, -15.6], cellM: 0.07,
    ramp: 'stone', foliage: 'frond',
  },

  // ---- tierStores ---------------------------------------------------
  // The carved surround. tomb_entrance is an Egyptian pylon facade, and
  // what survives of it here is only the FRAME: everything behind the
  // front slab is cropped away (minZ), the door leaf and its tympanum are
  // cut out (invert crop) so the socket keeps its darkness, and what is
  // left is stretched 1.61x across and 1.85x up — a proportion no kit
  // piece has — until its opening clears galleryRightHigh's own 3.6 x 4.4
  // jamb line, then squashed to 0.2 of its depth so it sits as relief on
  // the wall rather than as a porch standing off it.
  {
    name: 'gallerySurround', src: 'doorway', zone: 'tierStores',
    heightM: 5.61, spreadXZ: 0.789, squashZ: 0.501, atM: [9.0, 2.4, -4.1], cellM: 0.11,
    crop: [{ minZ: 2.05, minX: -2.5, maxX: 2.5 }],
    shave: { absX: 1.9, maxY: 2.95, minZ: 2.25, openX: 1.32, openY: 2.55 },
    ramp: 'stone', foliage: 'frond', toneRange: [0.5, 1],
  },
  // Trade goods at the threshold and up the ramp: the reason the ramp is
  // worn is that things are carried up it.
  {
    name: 'thresholdSacks', src: 'sacks', zone: 'tierStores',
    heightM: 0.8, spreadXZ: 0.5, rotYDeg: -25, atM: [10.2, 2.4, -4.45], cellM: 0.13,
    ramp: 'cloth', foliage: 'frond',
  },
  {
    name: 'rampBaskets', src: 'baskets', zone: 'tierStores',
    heightM: 0.5, spreadXZ: 0.55, rotYDeg: 200, atM: [7.4, 1.8, -5.3], cellM: 0.13,
    ramp: 'fibre', foliage: 'frond',
  },
  {
    name: 'tierSacks', src: 'sacks', zone: 'tierStores',
    heightM: 0.85, spreadXZ: 0.8, rotYDeg: 15, atM: [14.2, 5.5, -12.0], cellM: 0.16,
    ramp: 'cloth', foliage: 'frond',
  },
  {
    name: 'tierCarpetRolls', src: 'carpet', zone: 'tierStores',
    heightM: 0.45, spreadXZ: 1.6, rotYDeg: 100, atM: [14.4, 5.5, -14.2], cellM: 0.10,
    ramp: 'fibre', foliage: 'frond',
  },
  {
    name: 'tierJar', src: 'amphora', zone: 'tierStores',
    heightM: 0.9, rotYDeg: -40, atM: [14.3, 5.5, -9.6], cellM: 0.12,
    ramp: 'stone', foliage: 'frond',
  },
]
