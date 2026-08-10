// landscape-shop/cliff/tools/bake/dressSand.mjs
// The sand half of R3's dressing: two banks either side of the gate, and three
// drifts out along the foot of the wall.
//
// ONE STORY. Wind piles sand against the whole base of a desert scarp; where
// people walk in and out of a door, traffic beats it back down. So the sand at
// the gate comes as two mounds with a 70 m gap between them aimed at the
// mouth, and tools/bake/dressPlan.mjs's waymarker stones stand IN that gap.
// The swept approach is the NOTCH — nothing is laid on the ground to draw it.
//
// WHAT WAS TRIED AND MEASURED OUT. The obvious build is a thin apron sheet
// lying on the forecourt, darker down the middle where feet have packed it.
// Four passes of it were shot at the landing rig and every one drew a line
// across the frame:
//   1. one 124 m hardpan slab — its 14 cm rim rendered as a ruled edge 1250 px
//      wide, and the tile's cracked-mud plates magnified into 10 m shards;
//   2. the same from the drift mound, feathered along a wandering toe — the
//      remaining 8 cm lip became a dashed line of lit facets;
//   3. seated under the ground and lifted by a level term instead of a scale,
//      so it had no rim at all — the surface then GRAZED the ground plane at
//      the rig's own 17-degree depression and the intersection came out
//      dotted;
//   4. lifted onto a 1.05 m terrace to steepen that crossing — worse, two
//      dashed lines instead of one.
// The cause is not the source and not the tuning. A sheet a few tens of
// centimetres thick, lying on a coplanar ground plane and seen along it, has
// nowhere to put its edge. The mounds below have no edge problem because they
// are 4 to 12 m tall and cross the ground steeply. The beaten-lane COLOUR went
// with the sheet; the round report carries the note for the lead.
//
// WHERE A DRIFT MAY STAND. model/weathering.ts's WIND travels (0.28, -0.10,
// 0.95): the front wall is windward, so the massif's own lee face is the back
// one, which neither camera rig can see. What the rigs DO see is the sand
// shadow behind each block at the foot — the tail that forms downwind of an
// obstacle. Downwind here is +x and +z, and +z runs into the rock, so the tail
// shows on a block's +x flank. Each of the three flank drifts is anchored to a
// named talus block and offset into that wedge; dressingR3.test.ts measures
// the offset against WIND rather than trusting this comment.
//
// The anchors are deliberately the blocks NO scar is pinned to (model/scars.ts
// owns talus4, jointWedge0 and jointWedge4): old drift lapping over a fresh
// rockfall would argue with the story the debris pieces are reinforcing. The
// two gate banks carry no anchor at all — they answer to the door, not to a
// block, and the lee rule is about blocks.

/** The clear gap between the two gate banks. dressPlan.mjs stands its
 *  waymarkers inside it, and nothing else in the set may fill it. */
export const LANE = { centreX: -3, westEdgeM: -36, eastEdgeM: 35 }

export const SAND_PIECES = [
  {
    name: 'gateBankWest',
    family: 'sand',
    src: 'drift',
    cell: 0.12,
    story: 'Sand banked against the wall west of the gate, and the west side ' +
      'of the swept approach: its inner toe is the edge of the ground the ' +
      'sietch keeps clear.',
    sizeM: [40, 4.6, 20],
    pos: [-56, -0.4, -207.6],
    rotY: 0.09,
    noise: 0.04,
    seed: 601,
  },
  {
    name: 'gateBankEast',
    family: 'sand',
    src: 'drift',
    cell: 0.14,
    story: 'Its east counterpart, a size down and mirrored. The two are not a ' +
      'matched pair and the gap between them is not centred on the mouth ' +
      'either — a swept approach is worn where people walk, not surveyed.',
    sizeM: [38, 3.9, 19],
    pos: [54, -0.35, -207.2],
    rotY: -0.07,
    mirrorX: true,
    noise: 0.04,
    seed: 617,
  },
  {
    name: 'driftWest',
    family: 'sand',
    src: 'drift',
    cell: 0.2,
    anchor: 'talus1',
    story: 'Sand shadow downwind of talus1, the lowest block on the west ' +
      'flank: it laps over the block and buries roughly the lower half of it, ' +
      'which is what ties the rock line into the desert at the approach rig.',
    sizeM: [80, 12, 42],
    pos: [-219, -0.6, -186],
    rotY: 0.24,
    noise: 0.05,
    seed: 613,
  },
  {
    name: 'driftEast',
    family: 'sand',
    src: 'drift',
    cell: 0.24,
    anchor: 'talus10',
    story: 'The east counterpart, downwind of talus10 and a size smaller, ' +
      'turned the other way and mirrored so the two do not read as a pair.',
    sizeM: [52, 8.6, 30],
    pos: [266, -0.5, -184],
    rotY: -0.3,
    mirrorX: true,
    noise: 0.05,
    seed: 631,
  },
  {
    name: 'driftMid',
    family: 'sand',
    src: 'drift',
    cell: 0.26,
    anchor: 'talus6',
    story: 'Downwind of talus6, mid-way out on the east flank — the third ' +
      'point that keeps the sand line from reading as two lumps at the ends.',
    sizeM: [58, 8, 32],
    pos: [159, -0.5, -184.5],
    rotY: 0.86,
    noise: 0.045,
    seed: 647,
  },
]
