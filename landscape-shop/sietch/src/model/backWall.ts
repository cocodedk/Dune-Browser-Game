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
// R2: the outline is now the CARVED profile (surface/carvedProfile.ts) at
// CAP_Z — the same ring the envelope tube has at that depth, because
// RING_COUNT puts a real ring exactly on z = -4. So the arch overhead is
// notched by the bedding courses instead of running as a perfect ellipse,
// and cap and tube meet with no step. ShapeGeometry's own UVs are the
// shape's metres, which is what lets the wall map be a world-planar bake
// (surface/maps.ts) — a horizontal course on the wall is the same course
// at the same height on the side walls beside it.

import { BufferGeometry, Float32BufferAttribute, Group, Mesh, Shape, Path, ShapeGeometry } from 'three'
import { buildGalleryRecess, cutBounds, type GalleryLayout } from './galleryRecess'
import { buildGalleryRamp } from './galleryRamp'
import { buildBackWallCourseGeometry } from './backWallCourses'
import { carvedRingAt } from './surface/carvedProfile'
import { GALLERIES } from '../spec'
import { CAP_Z, GALLERY_LAYOUT } from './galleryLayout'
import type { Point2 } from './crossSection'
import type { PaletteMaterials } from './materials'

export { CAP_Z, GALLERY_LAYOUT }

// R2.3: backWallCourses.ts hands back raw geometry (CourseGeometry) —
// merging it into meshes is "assembly", which is what keeps that file
// inside the 200-line rule while it grew a real parting-groove system.
function mergeGrids(geoms: BufferGeometry[]): BufferGeometry {
  const posLen = geoms.reduce((n, g) => n + g.attributes.position.array.length, 0)
  const uvLen = geoms.reduce((n, g) => n + g.attributes.uv.array.length, 0)
  const position = new Float32Array(posLen)
  const normal = new Float32Array(posLen)
  const uv = new Float32Array(uvLen)
  let po = 0, uo = 0
  for (const g of geoms) {
    position.set(g.attributes.position.array as Float32Array, po)
    normal.set(g.attributes.normal.array as Float32Array, po)
    uv.set(g.attributes.uv.array as Float32Array, uo)
    po += g.attributes.position.array.length
    uo += g.attributes.uv.array.length
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(position, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normal, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  return geometry
}

/** Every course slab on the back wall, as a group of two meshes. */
function buildBackWallCourses(materials: PaletteMaterials): Group {
  const group = new Group()
  group.name = 'backWallCourses'
  const { stepOut, frontGeoms } = buildBackWallCourseGeometry()

  const stepGeometry = new BufferGeometry()
  stepGeometry.setAttribute('position', new Float32BufferAttribute(stepOut.position, 3))
  stepGeometry.setAttribute('uv', new Float32BufferAttribute(stepOut.uv, 2))
  stepGeometry.computeVertexNormals()
  const steps = new Mesh(stepGeometry, materials.wall)
  steps.name = 'backWallCourseSteps'
  group.add(steps)

  const faces = new Mesh(mergeGrids(frontGeoms), materials.wall)
  faces.name = 'backWallCourseFaces'
  group.add(faces)

  return group
}

/** The carved profile boundary as a Shape, with one rectangular hole per
 *  gallery cut out — so ShapeGeometry's own triangulation removes exactly
 *  the opening's footprint, leaving true empty space for a ray to pass
 *  through. */
function capGeometry(points: Point2[], holes: GalleryLayout[]): ShapeGeometry {
  const shape = new Shape()
  // Close the loop back along the floor line to the left floor corner,
  // which carvedProfile.ts guarantees is undisplaced (points[0]).
  const loop = [...points, { x: points[0].x, y: 0 }]
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

export function buildBackWall(materials: PaletteMaterials): Group {
  const group = new Group()
  group.name = 'backWall'

  const cap = new Mesh(capGeometry(carvedRingAt(CAP_Z).points, GALLERY_LAYOUT), materials.wall)
  cap.name = 'backWallCap'
  cap.position.z = CAP_Z
  group.add(cap)

  // R2.1: the cap is now only the BACKING. What the camera sees is a slab
  // per bedding course standing proud of it (backWallCourses.ts) — the
  // fix for "the back wall has zero relief ... the painted bands are a
  // lie under raking light". The cap stays because it is the one surface
  // whose outline is exactly the carved ring, so nothing can show through
  // between a slab and the tube.
  group.add(buildBackWallCourses(materials))

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
