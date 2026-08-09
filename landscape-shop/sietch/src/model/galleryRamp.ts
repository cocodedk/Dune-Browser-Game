// landscape-shop/sietch/src/model/galleryRamp.ts
// A stepped rock mass climbing from the hall floor (y=0) up to a raised
// gallery's threshold, flush against the back wall — so the higher-right
// opening reads as reached BY something carved into the floor, not a door
// floating partway up a blank wall (R1.2 spec: "one placed higher on the
// right with a rough rock ramp/step mass rooted beneath it"). Four
// terraces, each flush to the cap plane.
//
// R1.3 root-cause fix: the previous version grew BOTH height and outward
// reach together (tallest step = deepest reach), which made the tallest
// riser fully CONTAIN the shorter ones — they never had a chance to poke
// out and read as separate treads, so from CAMERA_RIG the whole thing
// rendered as one solid block, not stairs (a fresh critic: "occluded by
// its pedestal"). Reach now runs the OPPOSITE way — the SHORTEST riser
// reaches farthest from the wall, the TALLEST stays closest to it — so
// each step's top is exposed as a visible tread beyond its taller
// neighbour, and critically the riser nearest the camera is the short
// one, not the full-height one, so the gallery's sill and dark interior
// read clearly above it.

import { Group, Mesh, BoxGeometry } from 'three'
import type { GalleryLayout } from './galleryRecess'
import type { PaletteMaterials } from './materials'

const STEP_COUNT = 4
const RUN_M = 3.4 // total z-depth the stair occupies, flush to the wall
const STEP_WIDTH_MARGIN_M = 0.6 // wider than the opening on each side

export function buildGalleryRamp(gallery: GalleryLayout, capZ: number, materials: PaletteMaterials): Group {
  const group = new Group()
  group.name = 'galleryRamp'
  if (gallery.baseY <= 0) return group // nothing to climb for a floor-level opening

  const stepRise = gallery.baseY / STEP_COUNT
  const stepRun = RUN_M / STEP_COUNT
  const width = gallery.width + STEP_WIDTH_MARGIN_M

  for (let i = 0; i < STEP_COUNT; i++) {
    const topY = stepRise * (i + 1)
    // Shortest riser (i=0) reaches the FULL run; tallest (i=STEP_COUNT-1)
    // reaches only one stepRun — see the header note on why this is
    // inverted from the naive "tall steps reach further" version.
    const reach = stepRun * (STEP_COUNT - i)
    const mesh = new Mesh(new BoxGeometry(width, topY, reach), materials.rock)
    mesh.name = `${gallery.name}RampStep${i}`
    mesh.position.set(gallery.x, topY / 2, capZ - reach / 2)
    group.add(mesh)
  }

  return group
}
