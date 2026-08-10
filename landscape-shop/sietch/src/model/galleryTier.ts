// landscape-shop/sietch/src/model/galleryTier.ts
// R1.3 composition gap: "the hall must read VAST and INHABITED... human-
// scaled steps are the measuring stick that sells the room's size." A
// walkable ledge along part of the right wall (positive X — the same
// convention backWall.ts's galleryRightHigh already uses) at ~5.5m
// height, reached by a rough stepped stair rooted in the floor. Both hug
// the vault's OWN measured wall position at their z (vaultScaleAt), never
// a hardcoded x, so neither can ever poke past the rock — the lesson
// floor.ts's old corner ledge() learned the hard way. The stair uses
// galleryRamp.ts's R1.3 fix: the SHORTEST riser reaches farthest out (so
// it's the one closest to CAMERA_RIG), the tallest stays tucked against
// the tier — a visible staircase, not one solid pedestal.
//
// Placement: z = -8.5..-16 keeps clear of the gallery cluster and its
// ramp (both end by z=-7.4) and stays inboard of CAMERA_RIG's own frustum
// at this X (measured: the vault wall itself starts leaving frame past
// about z=-17 here). The stair's approach (z=-3.5..-8.5) sits narrow
// enough in X to clear galleryRightHigh's jamb (max x=11.25) with margin.
//
// R1.4 termination fix: the stair only roots the NEAR end (z=-8.5); the
// far two segments (z=-11.5..-16) read as a bare plank merely touching a
// flat wall — a fresh critic couldn't confirm it as carved-in from off-
// frame ("can't confirm it's carved-in rather than floating"). A knuckle
// pier at the far tip (buildTierTermination), flush to the SAME wallXAt
// formula the segments themselves use, floor-rooted and reaching well
// past the walkway's own inward depth, gives the far end an unambiguous
// rock mass to grow out of — measured to stay inside the rig frame (and
// both drifts) rather than trailing off unresolved past the edge.

import { Group, Mesh, BoxGeometry } from 'three'
import { FOOTPRINT } from '../spec'
import { vaultScaleAt } from './vaultScale'
import type { PaletteMaterials } from './materials'

// R3 FINAL: the termination pier is the single biggest flat box in the
// set (4.1 x 6.3 m), and materials.stone's one shared chisel map
// (surface/chisel.ts) tiles 3x3 across ANY box's default 0..1 UVs — on a
// mass this large that tiling is legible as a diamond-quilted grid (a
// fresh critic: "reads as retail furniture"). The material is shared by
// six meshes and surface.test.ts pins the hall family at exactly six, so
// a dedicated untiled material is not an option — this shrinks the UVs
// this ONE box samples down to a near-point instead, which re-maps it to
// a near-flat slice of the same chisel field (no new material, no tiling
// legible at rig distance) rather than re-texturing it.
const PIER_UV_SHRINK = 0.02

function detileUV(geometry: BoxGeometry): void {
  const uv = geometry.attributes.uv
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, 0.5 + (uv.getX(i) - 0.5) * PIER_UV_SHRINK, 0.5 + (uv.getY(i) - 0.5) * PIER_UV_SHRINK)
  }
  uv.needsUpdate = true
}

export const TIER_TOP_Y_M = 5.5
const TIER_THICKNESS_M = 0.7
const TIER_DEPTH_M = 2.6 // walkway width, inward from the wall

// Segment boundaries (z, most-negative last): several short slabs, each
// flush to the wall at ITS OWN span, read as one continuous ledge without
// the wall's taper opening a gap beneath a single long box.
const TIER_SEGMENTS_Z: number[] = [-8.5, -11.5, -14, -16]

const STAIR_STEP_COUNT = 6
const STAIR_NEAR_Z_M = -3.5 // closest to camera, floor level
const STAIR_FAR_Z_M = -8.5 // meets the tier's near edge, full height
const STAIR_WIDTH_M = TIER_DEPTH_M

// The knuckle pier picks up exactly where the far platform segment ends
// (TIER_SEGMENTS_Z's last entry) so there is no gap or overlap between
// plank and mass. Top sits a bit above TIER_TOP_Y_M so the walkway reads
// as emerging FROM the knuckle, not merely resting on top of it. Reach is
// well past TIER_DEPTH_M so the mass is unmistakably thicker than the
// plank it roots — a buttress, not more of the same ledge.
const TERMINATION_Z_NEAR = TIER_SEGMENTS_Z[TIER_SEGMENTS_Z.length - 1]
const TERMINATION_DEPTH_M = 1.2
const TERMINATION_TOP_Y_M = TIER_TOP_Y_M + 0.8
const TERMINATION_REACH_M = TIER_DEPTH_M + 1.5

function wallXAt(z: number): number {
  return (FOOTPRINT.widthM / 2) * vaultScaleAt(z)
}

function tierSegment(index: number, z0: number, z1: number, materials: PaletteMaterials): Mesh {
  // The segment's shallower end sets a conservative outer edge so the
  // whole slab stays inside the rock across its span — the wall only
  // ever grows wider going deeper into the hall across this z-range.
  const outerX = Math.min(wallXAt(z0), wallXAt(z1))
  const innerX = outerX - TIER_DEPTH_M
  const depth = Math.abs(z1 - z0)
  const mesh = new Mesh(
    new BoxGeometry(outerX - innerX, TIER_THICKNESS_M, depth),
    materials.stoneWorn,
  )
  mesh.name = `galleryTierSlab${index}`
  mesh.position.set(innerX + (outerX - innerX) / 2, TIER_TOP_Y_M - TIER_THICKNESS_M / 2, (z0 + z1) / 2)
  return mesh
}

function buildTierPlatform(materials: PaletteMaterials): Group {
  const group = new Group()
  group.name = 'galleryTierPlatform'
  for (let i = 0; i < TIER_SEGMENTS_Z.length - 1; i++) {
    group.add(tierSegment(i, TIER_SEGMENTS_Z[i], TIER_SEGMENTS_Z[i + 1], materials))
  }
  return group
}

function buildTierStair(materials: PaletteMaterials): Group {
  const group = new Group()
  group.name = 'galleryTierStair'
  const stepRise = TIER_TOP_Y_M / STAIR_STEP_COUNT
  const totalRun = Math.abs(STAIR_FAR_Z_M - STAIR_NEAR_Z_M)
  const stepRun = totalRun / STAIR_STEP_COUNT
  const outerX = Math.min(wallXAt(STAIR_NEAR_Z_M), wallXAt(STAIR_FAR_Z_M))
  const innerX = outerX - STAIR_WIDTH_M

  for (let i = 0; i < STAIR_STEP_COUNT; i++) {
    const topY = stepRise * (i + 1)
    // Shortest riser (i=0) reaches the FULL run toward the camera;
    // tallest (last) reaches only one stepRun, tucked against the tier —
    // same inversion as galleryRamp.ts and for the same reason.
    const reach = stepRun * (STAIR_STEP_COUNT - i)
    const mesh = new Mesh(new BoxGeometry(STAIR_WIDTH_M, topY, reach), materials.stone)
    mesh.name = `galleryTierStairStep${i}`
    mesh.position.set(innerX + STAIR_WIDTH_M / 2, topY / 2, STAIR_FAR_Z_M + reach / 2)
    group.add(mesh)
  }
  return group
}

/** A solid knuckle merging the walkway's far tip into the wall: flush to
 *  wallXAt at the SAME z the last platform segment ends on (so the seam
 *  between plank and pier is invisible), floor-rooted at y=0, reaching
 *  further inward than the plank itself so it reads as a distinct mass —
 *  see the header note on the R1.4 termination fix. */
function buildTierTermination(materials: PaletteMaterials): Mesh {
  const z0 = TERMINATION_Z_NEAR
  const z1 = z0 - TERMINATION_DEPTH_M
  const outerX = wallXAt(z0) // conservative: the shallower (nearer) end
  const innerX = outerX - TERMINATION_REACH_M
  const geometry = new BoxGeometry(TERMINATION_REACH_M, TERMINATION_TOP_Y_M, TERMINATION_DEPTH_M)
  detileUV(geometry)
  const mesh = new Mesh(geometry, materials.stone)
  mesh.name = 'galleryTierTerminationPier'
  mesh.position.set(innerX + TERMINATION_REACH_M / 2, TERMINATION_TOP_Y_M / 2, (z0 + z1) / 2)
  return mesh
}

export function buildGalleryTier(materials: PaletteMaterials): Group {
  const group = new Group()
  group.name = 'galleryTier'
  group.add(buildTierPlatform(materials))
  group.add(buildTierStair(materials))
  group.add(buildTierTermination(materials))
  return group
}
