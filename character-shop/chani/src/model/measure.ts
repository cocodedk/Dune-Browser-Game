// character-shop/chani/src/model/measure.ts
// Vertex measurement of the finished head, in the head's OWN local frame.
//
// This exists because of a rule in this project's history: report the
// render, not the table's intent. A reported 43.2% once reproduced at 8%,
// and an "upper-back curve" turned out to be a 16mm wobble. Every number
// head.test.ts asserts is read back off the triangles that actually got
// built, through these functions, never restated from the authoring
// constants — a table can say "cheekbone at 66.8mm" while a Catmull-Rom
// overshoot or a warp term puts the vertex somewhere else entirely.

import { Vector3 } from 'three'
import type { Mesh, Object3D } from 'three'

export interface Sample {
  x: number
  y: number
  z: number
}

/** Every vertex of every mesh under `part`, expressed in `part`'s frame. */
export function verticesOf(part: Object3D): Sample[] {
  part.updateMatrixWorld(true)
  const out: Sample[] = []
  const v = new Vector3()
  part.traverse((child) => {
    const mesh = child as Mesh
    if (!mesh.isMesh || !mesh.geometry) return
    const position = mesh.geometry.attributes.position
    if (!position) return
    for (let i = 0; i < position.count; i++) {
      v.fromBufferAttribute(position, i)
      mesh.localToWorld(v)
      part.worldToLocal(v)
      out.push({ x: v.x, y: v.y, z: v.z })
    }
  })
  return out
}

/** Vertices of ONE named mesh, in `part`'s frame. */
export function verticesOfMesh(part: Object3D, name: string): Sample[] {
  const mesh = part.getObjectByName(name)
  if (!mesh) throw new Error(`${name} missing from the armature`)
  return verticesOf(mesh).map((s) => {
    const v = new Vector3(s.x, s.y, s.z)
    mesh.localToWorld(v)
    part.worldToLocal(v)
    return { x: v.x, y: v.y, z: v.z }
  })
}

interface Window {
  yMin: number
  yMax: number
  /** Absolute-X window; both default to the whole head. */
  axMin?: number
  axMax?: number
  /** Depth ceiling. REQUIRED in practice for rearmost(): a head is a closed
   *  surface, so any |x| window that catches the eye socket also catches
   *  the OCCIPUT at the same height and half-width. Without it a
   *  "socket floor" measurement returns the back of the skull and a relief
   *  guard passes at 166mm — which is what this one did until it was read
   *  back and disbelieved. */
  zMax?: number
}

function inWindow(s: Sample, w: Window): boolean {
  const ax = Math.abs(s.x)
  return s.y >= w.yMin && s.y <= w.yMax
    && ax >= (w.axMin ?? 0) && ax <= (w.axMax ?? 1)
    && s.z <= (w.zMax ?? Infinity)
}

/** Frontmost (most negative Z) vertex inside a window — the one the eye
 *  sees as the high point of a form. Throws rather than returning a
 *  sentinel: an empty window is an authoring mistake, not a measurement. */
export function frontmost(samples: Sample[], w: Window): Sample {
  let best: Sample | null = null
  for (const s of samples) if (inWindow(s, w) && (!best || s.z < best.z)) best = s
  if (!best) throw new Error(`no vertices in y[${w.yMin}, ${w.yMax}]`)
  return best
}

/** Rearmost (least forward) vertex inside a window — a hollow's floor. */
export function rearmost(samples: Sample[], w: Window): Sample {
  let best: Sample | null = null
  for (const s of samples) if (inWindow(s, w) && (!best || s.z > best.z)) best = s
  if (!best) throw new Error(`no vertices in y[${w.yMin}, ${w.yMax}]`)
  return best
}

/** Widest half-width inside a height band. */
export function halfWidth(samples: Sample[], yMin: number, yMax: number): number {
  let max = 0
  let found = false
  for (const s of samples) {
    if (s.y < yMin || s.y > yMax) continue
    found = true
    max = Math.max(max, Math.abs(s.x))
  }
  if (!found) throw new Error(`no vertices in y[${yMin}, ${yMax}]`)
  return max
}

/** The centre-line front profile: for each height step, the frontmost
 *  vertex within 5mm of the centre line. This is the curve a critic reads
 *  as "the profile", and the curve every facial-thirds landmark is found
 *  on. */
export function centreProfile(
  samples: Sample[], yMin: number, yMax: number, step = 0.002,
): number[][] {
  const rows: number[][] = []
  for (let y = yMin; y <= yMax + 1e-9; y += step) {
    let z = Infinity
    for (const s of samples) {
      if (Math.abs(s.x) > 0.005) continue
      if (s.y < y - step / 2 || s.y > y + step / 2) continue
      if (s.z < z) z = s.z
    }
    if (z < Infinity) rows.push([y, z])
  }
  return rows
}

/** Height of the LOCAL extreme of a profile inside a window: 'front' for a
 *  peak that projects (nose tip, chin, brow), 'back' for a recess
 *  (subnasale, nasion, lip seam). */
export function profilePeak(
  profile: number[][], yMin: number, yMax: number, dir: 'front' | 'back',
): number[] {
  let best: number[] | null = null
  for (const row of profile) {
    if (row[0] < yMin || row[0] > yMax) continue
    if (!best || (dir === 'front' ? row[1] < best[1] : row[1] > best[1])) best = row
  }
  if (!best) throw new Error(`no profile rows in y[${yMin}, ${yMax}]`)
  return best
}
