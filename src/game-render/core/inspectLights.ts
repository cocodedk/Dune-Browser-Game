// src/game-render/core/inspectLights.ts
// What is actually lighting the active scene, in numbers.
//
// Written because three separate attempts to fix the globe's daylight failed
// while reasoning from the source read correct. The formula said the sun sat
// 8.6 degrees off the camera at noon; the terminator in a captured frame sat
// 0.42 of the disc radius above centre, which is about 65 degrees. Only one of
// those can be true, and neither reading the code nor changing it settled it.
// This reports the vector the renderer is really using, so the next question
// is answered by measurement rather than by another guess.
//
// It settled that one immediately: at noon the globe's sun measures 9.6 degrees
// off the camera at intensity 2.56, exactly as the formula says. The pale band
// read as a terminator is the polar ice cap. So the disc is uniformly lit and
// simply dark, which makes it an albedo problem and not a lighting one.
//
// That is still unsolved. Ruled out so far, each by measurement over the full
// disc of a captured noon frame (mean luma 37.1, with 83% of it under luma 40):
//   - sun geometry and intensity      measured correct, above
//   - the sand palette anchors        lifting both moved mean luma +2.4
//   - the rock biome tint             0.60 -> 0.88 moved it +1.4
//   - the night wash                  night = 0 across the lit face at noon
//   - the height-fog override         guarded by #ifdef USE_FOG; the globe
//                                     scene sets no fog, so it never runs
//   - vertex normals                  computeVertexNormals runs after
//                                     displacement, and relief is only 1.5%
// Whatever remains is worth finding with this tool rather than by reading.

import { Vector3, type Camera, type Object3D } from 'three'

export interface InspectedLight {
  type: string
  intensity: number
  /** Hex colour, as the renderer holds it. */
  color: string
  position: { x: number; y: number; z: number }
  /** Unit direction from the light's target toward the light. */
  direction: { x: number; y: number; z: number }
  /**
   * Angle between this light and the camera's own view direction, in degrees.
   *
   * The single most useful number here for a body lit from orbit: 0 means the
   * light sits directly behind the viewer and the whole visible disc is lit,
   * 90 puts the terminator across the middle of it, 180 is a fully dark face.
   */
  angleFromCameraDegrees: number
}

const lightPos = new Vector3()
const targetPos = new Vector3()
const lightDir = new Vector3()
const camDir = new Vector3()

function isLight(o: Object3D): boolean {
  return (o as { isLight?: boolean }).isLight === true
}

/** Every light in the scene, with its geometry relative to the camera. */
export function inspectLights(
  scene: Object3D | null,
  camera: Camera,
): InspectedLight[] {
  if (!scene) return []

  // The camera looks from its own position toward the origin in every mode
  // that matters here, so its view direction is its normalised position.
  camera.getWorldPosition(camDir).normalize()

  const out: InspectedLight[] = []
  scene.traverse(object => {
    if (!isLight(object)) return

    const light = object as Object3D & {
      intensity?: number
      color?: { getHexString: () => string }
      target?: Object3D
    }

    object.getWorldPosition(lightPos)
    if (light.target) light.target.getWorldPosition(targetPos)
    else targetPos.set(0, 0, 0)

    lightDir.copy(lightPos).sub(targetPos)
    const length = lightDir.length()
    if (length > 0) lightDir.divideScalar(length)

    out.push({
      type: object.type,
      intensity: light.intensity ?? 0,
      color: light.color ? `#${light.color.getHexString()}` : '',
      position: { x: lightPos.x, y: lightPos.y, z: lightPos.z },
      direction: { x: lightDir.x, y: lightDir.y, z: lightDir.z },
      angleFromCameraDegrees:
        (Math.acos(Math.max(-1, Math.min(1, lightDir.dot(camDir)))) * 180) / Math.PI,
    })
  })
  return out
}
