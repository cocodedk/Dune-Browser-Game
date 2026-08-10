// src/game-render/modes/location/SietchSet.ts
// The release adapter over the sietch landscape shop
// (docs/PRD/dune92/04-asset-pipeline.md): mounts the real 3D interior
// (@land/sietch) behind a perspective camera built from its own spec, in
// place of the painted diorama. sietchGate.ts decides WHEN this mounts;
// this file only owns HOW.
//
// The model and its camera share one true-metre coordinate space (spec.ts
// CAMERA_RIG, FOOTPRINT) — unlike Harvester.ts there is no scale mapping to
// apply, and the model "never writes its own root transform" (contracts.ts),
// so root stays at identity.

import { PerspectiveCamera, PointLight, AmbientLight, Vector3, MeshStandardMaterial } from 'three'
import type { Group, Scene } from 'three'
import { createSietch } from '@land/sietch/src/model/Sietch'
import { CAMERA_RIG, LIGHTING, DRESSING } from '@land/sietch/src/spec'
import type { Hotspot } from './locationDefs'
import { createSietchHud } from './sietchHud'
import { driftOffset } from './sietchRig'

const NEAR_M = 0.1
const FAR_M = 200

function aspectOf(canvas: HTMLElement | undefined): number {
  const w = canvas?.clientWidth || 1
  const h = canvas?.clientHeight || 1
  return w / h
}

export interface SietchSet {
  readonly camera: PerspectiveCamera
  setContent(spots: readonly Hotspot[], name: string): void
  update(elapsedMs: number): void
  setHover(id: string | null): void
  dispose(): void
}

export function createSietchSet(
  scene: Scene,
  canvas: HTMLElement | undefined,
  displayHeight: () => number,
  displayRatio: () => number,
): SietchSet {
  const model = createSietch()
  const root = model.root as unknown as Group
  scene.add(root)

  // The game's Renderer PMREMs the sky into scene.environment every frame
  // for every mode (Renderer.updateEnvironment) — right for the open desert,
  // wrong for a windowless cave: at the default envMapIntensity of 1 it
  // would swamp the authored 0x201812 @ 0.18 ambient with sky-blue IBL. Same
  // policy Harvester.ts applies for fog, just for environment instead.
  root.traverse(child => {
    const material = (child as unknown as { material?: MeshStandardMaterial }).material
    if (material) material.envMapIntensity = 0
  })

  const [px, py, pz] = CAMERA_RIG.positionM
  const lookAt = new Vector3(...CAMERA_RIG.lookAtM)
  const camera = new PerspectiveCamera(CAMERA_RIG.fovDeg, aspectOf(canvas), NEAR_M, FAR_M)
  camera.position.set(px, py, pz)
  camera.lookAt(lookAt)
  // The HUD (sietchHud.ts) is parented to this camera, so the camera itself
  // must be part of the scene graph for those children to render at all.
  scene.add(camera)

  // castShadow OFF: cube-shadow artifact against this geometry (spec.ts
  // LIGHTING comment, landscape-shop/sietch harness notes).
  const hearth = new PointLight(
    DRESSING.hearthColor, LIGHTING.hearth.intensity,
    LIGHTING.hearth.rangeM, LIGHTING.hearth.decay,
  )
  hearth.position.set(DRESSING.hearthAtM[0], LIGHTING.hearth.heightM, DRESSING.hearthAtM[2])
  hearth.castShadow = false
  scene.add(hearth)

  const ambient = new AmbientLight(LIGHTING.ambient.color, LIGHTING.ambient.intensity)
  scene.add(ambient)

  const hud = createSietchHud(camera, displayHeight, displayRatio)
  let spots: readonly Hotspot[] = []
  let name = ''

  return {
    camera,
    setContent(nextSpots, nextName): void {
      spots = nextSpots
      name = nextName
    },
    update(elapsedMs): void {
      const aspect = aspectOf(canvas)
      if (camera.aspect !== aspect) {
        camera.aspect = aspect
        camera.updateProjectionMatrix()
      }

      const drift = driftOffset(elapsedMs, LIGHTING.driftM)
      camera.position.set(px + drift.x, py + drift.y, pz)
      camera.lookAt(lookAt)

      hud.update(elapsedMs, spots, name)
    },
    setHover(id): void {
      hud.setHover(id)
    },
    dispose(): void {
      hud.dispose()
      scene.remove(root)
      model.dispose()
      scene.remove(camera)
      scene.remove(hearth)
      scene.remove(ambient)
    },
  }
}
