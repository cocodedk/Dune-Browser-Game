// landscape-shop/cliff/src/model/Cliff.ts
// Composes the set: 'massing' (baked massif + the procedural gate prow that
// grows out of it), 'skirt' (rock + sand apron below y = 0), 'entrance' (the
// carved socket) — names kept for the seam test and the loop contract.
//
// R1.3 changed TECHNIQUE, not just numbers. The primary masses are no longer
// hand-guessed profiles: they are reshaped licensed feedstock, ten instances
// of two artist-authored rock forms composited offline into one derived
// geometry (tools/bakeMassif.mjs → model/massifBake.json → model/massif.ts).
// Two earlier procedural passes read as dunes and then as a ruin; the
// feedstock's own stacked-strata shape language is what those were missing.
//
// Every world-space extreme is hit by construction, not by luck:
//   x: +-300           bake normalize      -> FOOTPRINT.widthM
//   y: 190 .. -40      bake crest, skirt   -> heightM + skirtDepthM
//   z: 0 .. socket.frontZ                  -> FOOTPRINT.depthM
// The socket's inner lip is the single frontmost point of the whole set:
// gateWall.ts's surface sinks monotonically away from the mouth, so nothing
// else can get in front of it (seam.test.ts's -Z convention check).

import { Group, Mesh } from 'three'
import type { LandscapeModel } from '../contracts'
import { FOOTPRINT } from '../spec'
import { buildMassif } from './massif'
import { buildGateWall } from './gateWall'
import { buildSkirtApron } from './skirtApron'
import { buildSocket } from './socket'
import { surfaceCliff } from './surface'

export function createCliff(): LandscapeModel {
  const root = new Group()
  root.name = 'cliff'
  const meshes: Mesh[] = []
  const track = (mesh: Mesh): Mesh => {
    meshes.push(mesh)
    return mesh
  }

  const massing = new Group()
  massing.name = 'massing'
  const gateWall = buildGateWall()
  massing.add(track(buildMassif()))
  massing.add(track(gateWall.mesh))
  root.add(massing)

  const socket = buildSocket(gateWall.minZ)
  const entrance = new Group()
  entrance.name = 'entrance'
  for (const mesh of socket.meshes) entrance.add(track(mesh))
  root.add(entrance)

  const skirt = new Group()
  skirt.name = 'skirt'
  for (const mesh of buildSkirtApron(FOOTPRINT.skirtDepthM, socket.frontZ)) {
    skirt.add(track(mesh))
  }
  root.add(skirt)

  // R2: the geology, the wind and the weather go on last, in one place, off
  // the finished geometry — see model/surface.ts.
  surfaceCliff(root)

  return {
    root,
    dispose(): void {
      for (const mesh of meshes) {
        mesh.geometry.dispose()
        ;(mesh.material as { dispose(): void }).dispose()
      }
      root.clear()
    },
  }
}
