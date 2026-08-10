// landscape-shop/cliff/tools/bake/instances.mjs
// The composition: which reshaped feedstock mass stands where. Authored in
// DESIGN meters; compose.mjs normalizes the finished formation onto
// spec.ts's FOOTPRINT exactly, so these numbers are proportions, not the
// guarantee. The foot-scale scatters live in scatter.mjs.
//
// Shape reading of the feedstock, MEASURED (tools/bake, not the vendor
// blurb): mesa_outcrop is 3.30 x 2.88 x 3.12 units of stacked strata whose
// courses step in and out by ~0.1 unit, standing in a low talus ring — but
// its summit FLARES to +/-1.34 against a +/-0.85 column, i.e. it is a
// mushroom-capped hoodoo, not the flat-topped butte the pack blurb claims.
// Left alone at massif scale that cap reads as a stacked plate hat, so
// every instance carries a hard capScale that pulls the flare inside the
// column.
//
// R1.4 RESTRUCTURE — HIERARCHY. R1.3 built the formation as two wide
// plinths carrying five summits of similar size. The critic read exactly
// that: "a row of similarly-sized boxy chunks with the same horizontal
// shelf-terrace rhythm repeated across every tower". Two things changed:
//
//   1. ONE HERO. heroButtress is now a single mass carrying the crest, the
//      centre and the gate — over twice the solid volume of anything else
//      in the formation (compose.mjs measures it; bakeSeam.test.ts guards
//      the ratio). Everything else was demoted and GRADED, each step down
//      about 12-15% shorter than the one above it, so the silhouette has a
//      clear first, second and third instead of a row of peers.
//   2. NO TWO SHELF RHYTHMS ALIKE. One source feeds every mass, so course
//      spacing is set by the mass's own y-scale: the graded heights alone
//      spread it over more than 3:1. On top of that each mass carries its
//      own dip (deform.mjs — tilts the bedding), its own rotation, mirror
//      and taper, so no two towers band at the same height in the same
//      direction.
//
// sizeM is the mass's own bounding box in meters BEFORE rotation; pos is
// its horizontal centre and its base height. Heights are authored above
// spec so the normalize step lands the crest on exactly FOOTPRINT.heightM.

import { talus, jointWedges } from './scatter.mjs'

export const FEEDSTOCK = {
  mesa: 'landscape-shop/feedstock-packs/desert-kingdom/glb/individual/mesa_outcrop.glb',
  boulder: 'landscape-shop/feedstock-packs/desert-kingdom/glb/individual/sandstone_boulder.glb',
}

// Masses flagged clampFront are authored poking a long way forward and then
// shaved back to this scarp (design meters), which is what turns separate
// buttes into one sheer face for the gate to be cut into.
export const SCARP = { planeZ: -212, batter: 0.05, bow: 0.03 }

export const INSTANCES = [
  // --- THE HERO ---
  // Owns the crest, the centre and the gate. Wide enough at the foot to
  // carry the middle 340 m of the formation on its own, tapered hard so it
  // still comes to a summit rather than standing as a slab.
  { name: 'heroButtress', src: 'mesa', sizeM: [400, 216, 206], pos: [-14, -8, -168],
    rotY: 0.1, capR: 0.86, taperK: 0.82, taperP: 1.35, shearX: 0.045, dip: -0.07,
    noise: 0.05, seed: 11, clampFront: true },

  // --- THE GRADED FLANKERS ---
  // Each step down is 10-15% shorter than the one above it, and each one
  // carries a different capR (plated or sheer) and a different dip, so no
  // two of them band at the same height in the same direction.
  //
  // Second: the west bastion. SHEER — capR takes it below the source's own
  // column radius, so its courses are shaved into one wall of vertical
  // grooves. It and the east bastion are the two towers the approach rig
  // actually sees beside the hero, so they carry opposite finishes: this
  // one a cliff wall, that one a plated stack.
  //
  // R1.5: pos.x pulled in from -198 to -165 (33 m). The hero's own volume
  // ratio was already >2 (bakeSeam.test.ts), but the SADDLE between it and
  // this mass — where the hero's east taper meets this mass's own east
  // taper, roughly x -180..-70 — sank to ~20-30 m against a 190 m/115 m
  // pair of peaks either side, low enough that the approach rig's dune
  // horizon shows through it: "two separate masses ... joined by a low
  // gap". Pulling this mass 33 m east moves its own less-tapered bulk (not
  // just its bounding box) into that saddle instead of only its thin
  // trailing edge. Guarded in bakeSeam.test.ts's silhouette test.
  { name: 'westBastion', src: 'mesa', sizeM: [206, 126, 134], pos: [-165, -5, -152],
    rotY: 2.35, capR: 0.58, taperK: 0.7, taperP: 1.2, dip: 0.16, noise: 0.05, seed: 37, clampFront: true },
  // Third: sheer-walled, and stands well back of the scarp, so it reads as
  // depth behind the hero's shoulder rather than as another face on the
  // same wall.
  { name: 'northSummit', src: 'mesa', sizeM: [158, 111, 124], pos: [131, -3, -104],
    rotY: -1.15, mirrorX: true, capR: 0.62, taperK: 0.66, taperP: 1.25, dip: -0.2,
    noise: 0.05, seed: 23 },
  // Fourth: the east bastion, the west's counterweight but a size down, a
  // quarter-turn off it and dipping the opposite way.
  { name: 'eastBastion', src: 'mesa', sizeM: [226, 98, 158], pos: [180, -5, -158],
    rotY: -0.72, mirrorX: true, capR: 0.95, taperK: 0.72, taperP: 1.2, dip: 0.22,
    noise: 0.05, seed: 17, clampFront: true },
  // Fifth: fills the notch of sky between hero and east flank.
  { name: 'midRise', src: 'mesa', sizeM: [150, 82, 126], pos: [78, -4, -186],
    rotY: -1.75, mirrorX: true, capR: 0.66, taperK: 0.64, taperP: 1.15, dip: -0.26,
    noise: 0.05, seed: 97, clampFront: true },
  // Sixth: carries the formation back to the rear bound so the crest line
  // has rock behind it from every rig angle.
  { name: 'backMass', src: 'mesa', sizeM: [210, 75, 170], pos: [34, -3, -40],
    rotY: 2.9, capR: 1, taperK: 0.6, taperP: 1.2, dip: 0.14, noise: 0.05, seed: 113 },
  // Seventh and eighth: the receding tails. Sheared and turned flat so they
  // die into the sand instead of ending the wall on a corner.
  { name: 'eastTail', src: 'mesa', sizeM: [170, 59, 134], pos: [252, -3, -108],
    rotY: 1.25, mirrorX: true, shearX: 0.16, capR: 0.78, taperK: 0.62, taperP: 1.2,
    dip: -0.19, noise: 0.05, seed: 51, clampFront: true },
  { name: 'westSpur', src: 'mesa', sizeM: [146, 53, 114], pos: [-274, -3, -156],
    rotY: 4.1, capR: 1, taperK: 0.58, taperP: 1.1, dip: 0.24, noise: 0.05, seed: 67, clampFront: true },

  // --- THE COL FILLER (R3.2) ---
  // Not a primary and deliberately not sized like one. R1.5 bridged the
  // hero/westBastion saddle at the CREST line, and the crest guard has been
  // green ever since — but the approach rig still read sky through the col
  // ABOVE that crest: rasterized on the R3.1 shot, the box at screen
  // (880..930, 380..430) — world x -70..-97 between y 96 and 140 — was 89%
  // open. The saddle floor there stands at 71-108 m while the hero's west
  // shoulder rises past 143 m and westBastion's plateau holds 114 m, so the
  // gap is a notch of sky between two shoulders, not a dip in the crest.
  //
  // One block fills it, seated ON the col floor rather than founded in the
  // sand: its base is authored well above ground so its own solid volume
  // stays UNDER westSpur's (the smallest primary), which is what keeps it out
  // of the eight the height-step chain is measured on. It is a subordinate
  // filler, and the hierarchy still has to read it as one.
  { name: 'colBlock', src: 'mesa', sizeM: [50, 108, 122], pos: [-99, 50, -152],
    rotY: 2.05, capR: 0.82, taperK: 0.5, taperP: 1.15, dip: -0.12, noise: 0.05, seed: 179 },

  // Fallen blocks at the foot: the feedstock's own boulder, big enough to
  // break the base line where the masses meet the sand.
  { name: 'blockfallWest', src: 'boulder', sizeM: [104, 56, 92], pos: [-166, -8, -148],
    rotY: 0.6, taperK: 0.25, noise: 0.03, seed: 131 },
  { name: 'blockfallEast', src: 'boulder', sizeM: [80, 44, 72], pos: [112, -6, -136],
    rotY: 1.9, mirrorX: true, taperK: 0.25, noise: 0.03, seed: 149 },

  ...jointWedges(SCARP),
  ...talus(SCARP),
]
