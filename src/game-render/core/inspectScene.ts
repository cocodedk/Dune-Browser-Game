// src/game-render/core/inspectScene.ts
// Projects a live scene to screen space for the debug handle.
//
// Split from DebugHandle once that file outgrew the repository's limit. This
// is the half that does actual geometry; DebugHandle is the half that decides
// what is exposed and when.

import type { Camera, Object3D } from 'three'
import { Quaternion, Vector3 } from 'three'
import type { InspectedObject } from './DebugHandle'

/**
 * Project every object in a scene to screen space.
 *
 * Meshes only — groups and lights have no visible extent, and listing them
 * just buries the thing being looked for.
 */
export function inspectScene(
  root: Object3D,
  camera: Camera,
  width: number,
  height: number,
): InspectedObject[] {
  const out: InspectedObject[] = []
  const world = new Vector3()
  const edge = new Vector3()
  const right = new Vector3()
  const up = new Vector3()
  const spin = new Quaternion()

  root.updateMatrixWorld(true)
  root.traverse(object => {
    const geometry = (object as { geometry?: { boundingSphere?: { radius: number } | null;
      computeBoundingSphere?: () => void } }).geometry
    if (!geometry) return

    object.getWorldPosition(world)
    const view = world.clone().project(camera)
    const behind = view.z > 1
    const screen: [number, number] | null = behind
      ? null
      : [(view.x * 0.5 + 0.5) * width, (-view.y * 0.5 + 0.5) * height]

    // Bounding-sphere radius, scaled by world scale, projected as an offset
    // from the centre — that is the on-screen size in pixels.
    //
    // The offset runs along the camera's right vector, not along all three
    // axes: offsetting diagonally and measuring only x overstates the radius
    // by root-3, which is exactly the kind of quietly-wrong number that sends
    // an investigation down the wrong road.
    let screenRadius: number | null = null
    if (!geometry.boundingSphere) geometry.computeBoundingSphere?.()
    const radius = geometry.boundingSphere?.radius
    if (radius != null && screen) {
      const scale = object.getWorldScale(new Vector3())
      const maxScale = Math.max(scale.x, scale.y, scale.z)
      right.setFromMatrixColumn(camera.matrixWorld, 0).normalize()
      edge.copy(world).addScaledVector(right, radius * maxScale).project(camera)
      screenRadius = Math.abs((edge.x - view.x) * 0.5 * width)
    }

    up.set(0, 1, 0).applyQuaternion(object.getWorldQuaternion(spin)).normalize()

    out.push({
      name: object.name || '(unnamed)',
      type: object.type,
      visible: object.visible,
      world: [world.x, world.y, world.z],
      up: [up.x, up.y, up.z],
      screen,
      screenRadius,
    })
  })
  return out
}
