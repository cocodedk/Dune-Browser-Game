// landscape-shop/sietch/src/model/backWall.ts
// The back-wall cap: a solid infill plane set INSIDE the envelope tube at
// z = CAP_Z (not at the tube's own open end, z = 0) — the 4m gap between
// CAP_Z and 0 is the GALLERIES.recessM allowance spec.ts's FOOTPRINT
// comment reserves, so each gallery can punch a REAL socket back through
// it rather than a shallow 0.3m dent (R1.1's mistake, twice-failed).
//
// R1.2 root-cause fix: the cap used to be a single unbroken triangulated
// fan spanning the WHOLE vault profile, with the gallery "recess" meshes
// merely standing in front of it — so every ray toward an opening hit the
// solid cap first (gauntlet-loop.md R1 critic: "decals... not cuts").
// This cap is now a THREE.Shape with a real rectangular HOLE per gallery
// (galleryRecess.ts's cutBounds), so there is nothing left for a ray to
// hit until it reaches the socket's own jamb/lintel/sill/back-cap
// geometry, GALLERIES.recessM behind this plane.
//
// Placement is deliberately UNEVEN, never a metered row (R1 critic,
// twice): two openings clustered left-of-centre at floor level with a
// narrow rock pier between them, one set higher on the right over a
// stepped rock ramp (galleryRamp.ts).

import { Group, Mesh, Shape, Path, ShapeGeometry } from 'three'
import { buildVaultProfile, type VaultProfile } from './crossSection'
import { buildGalleryRecess, cutBounds, type GalleryLayout } from './galleryRecess'
import { buildGalleryRamp } from './galleryRamp'
import { vaultScaleAt } from './vaultScale'
import { vaultAsymmetryAt } from './vaultAsymmetry'
import { GALLERIES, FOOTPRINT } from '../spec'
import type { PaletteMaterials } from './materials'

export const CAP_Z = -4

export const GALLERY_LAYOUT: GalleryLayout[] = [
  { name: 'galleryLeftA', x: -11, baseY: 0, width: GALLERIES.widthM, height: GALLERIES.heightM },
  { name: 'galleryLeftB', x: -5.5, baseY: 0, width: GALLERIES.widthM, height: GALLERIES.heightM },
  { name: 'galleryRightHigh', x: 9, baseY: 2.4, width: GALLERIES.widthM, height: GALLERIES.heightM },
]

/** The vault profile boundary as a Shape, with one rectangular hole per
 *  gallery cut out — so ShapeGeometry's own triangulation removes exactly
 *  the opening's footprint, leaving true empty space for a ray to pass
 *  through. */
function capGeometry(profile: VaultProfile, holes: GalleryLayout[]): ShapeGeometry {
  const shape = new Shape()
  const loop = [...profile.points, { x: -profile.halfWidth, y: 0 }]
  shape.moveTo(loop[0].x, loop[0].y)
  for (const p of loop.slice(1)) shape.lineTo(p.x, p.y)
  shape.closePath()

  for (const layout of holes) {
    const { x0, x1, y0, y1 } = cutBounds(layout)
    const hole = new Path()
    hole.moveTo(x0, y0)
    hole.lineTo(x1, y0)
    hole.lineTo(x1, y1)
    hole.lineTo(x0, y1)
    hole.closePath()
    shape.holes.push(hole)
  }

  return new ShapeGeometry(shape)
}

export function buildBackWall(halfWidth: number, heightM: number, materials: PaletteMaterials): Group {
  const group = new Group()
  group.name = 'backWall'
  const scale = vaultScaleAt(CAP_Z)
  const asymmetry = vaultAsymmetryAt(CAP_Z, FOOTPRINT.depthM)
  const profile = buildVaultProfile(halfWidth * scale, heightM * scale, asymmetry)

  const cap = new Mesh(capGeometry(profile, GALLERY_LAYOUT), materials.rock)
  cap.name = 'backWallCap'
  cap.position.z = CAP_Z
  group.add(cap)

  for (const layout of GALLERY_LAYOUT) {
    group.add(buildGalleryRecess(layout, CAP_Z, GALLERIES.recessM, materials))
  }
  // Only the raised gallery has a ramp beneath it (galleryRamp.ts is a
  // no-op for baseY = 0), so building it for every layout is safe.
  for (const layout of GALLERY_LAYOUT) {
    group.add(buildGalleryRamp(layout, CAP_Z, materials))
  }

  return group
}
