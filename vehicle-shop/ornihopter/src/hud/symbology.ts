// vehicle-shop/ornihopter/src/hud/symbology.ts
// The flight symbology, hung off the CAMERA.
//
// WHERE IT LIVES, and why. Three places were possible: a DOM overlay beside the
// existing corner readout, a second orthographic pass, or geometry parented to
// the camera. The DOM is out on the house rule (ui/hud.ts's readout is the last
// of it and stays a debug instrument, not a flight one). A second pass would
// mean a second camera and a second render call in main.ts for something the
// first pass can already draw. So: unlit planes at 0.62m in front of the eye,
// parented to the camera, drawn last with depth testing off. That is an
// AH-64E monocle rather than a windscreen combiner — the symbology travels with
// the pilot's head, which is what the reference actually does and what makes it
// still readable when he looks off-axis.
//
// ONE LIGHT STILL. MeshBasicMaterial is unlit, so nothing here adds to the
// scene's single light or is affected by it, and palette.ts holds every ink
// under B3's luminance ceiling so the symbology cannot open a second bright
// region over the desert.
//
// UNITS. Everything inside the group is measured in half-screen-heights: y = 1
// is the top of the frame, x = +/-aspect the sides. The group's own scale does
// the conversion from the camera's field of view once, so a child is placed by
// where it should APPEAR and the ladder's degrees-per-unit is exact.

import {
  Group, Mesh, PlaneGeometry, MeshBasicMaterial, DoubleSide,
  type PerspectiveCamera, type DataTexture,
} from 'three'
import type { FlightState } from '../contracts'
import { readFlight } from './reading'
import { createSurface, surfaceTexture, type Surface } from './surface'
import { ladderTexture, boresightTexture, LADDER_RANGE_DEG } from './ladderFace'
import {
  paintHeading, paintAltitude, paintSpeed, HEADING_FACE, SIDE_FACE,
} from './tapeFaces'

const DIST = 0.62
/** Above every opaque surface in the cabin and above the glazing's transparent
 *  pass, so nothing in the panel can occlude an instrument. */
const RENDER_ORDER = 4000

export type HudFace = 'hud-heading' | 'hud-altitude' | 'hud-speed'

export interface HudSymbology {
  group: Group
  /** The repainted DataTexture behind a named face — the repaint proof. */
  face(name: HudFace): DataTexture
  setAspect(aspect: number): void
  setVisible(visible: boolean): void
  update(state: Readonly<FlightState>): void
  dispose(): void
}

function panel(name: string, map: DataTexture, w: number, h: number): Mesh {
  const mesh = new Mesh(
    new PlaneGeometry(w, h),
    new MeshBasicMaterial({
      map, transparent: true, depthTest: false, depthWrite: false, side: DoubleSide,
    })
  )
  mesh.name = name
  mesh.renderOrder = RENDER_ORDER
  // The planes sit inside the near plane's neighbourhood and are always in
  // view by construction; culling them costs a bounding-sphere test per frame
  // and can only ever be wrong.
  mesh.frustumCulled = false
  return mesh
}

interface LiveFace {
  mesh: Mesh
  surface: Surface
  texture: DataTexture
  paint: (surface: Surface, reading: ReturnType<typeof readFlight>) => void
  key: (reading: ReturnType<typeof readFlight>) => number
  last: number
}

export function createHudSymbology(camera: PerspectiveCamera): HudSymbology {
  const group = new Group()
  group.name = 'hud-symbology'
  const halfHeight = DIST * Math.tan(((camera.fov || 68) * Math.PI) / 360)
  const unitsPerDeg = 1 / ((camera.fov || 68) / 2)
  group.position.set(0, 0, -DIST)
  group.scale.set(halfHeight, halfHeight, 1)
  camera.add(group)

  const attitude = new Group()
  attitude.name = 'hud-attitude'
  const ladderMap = ladderTexture()
  const ladder = panel(
    'hud-pitch-ladder', ladderMap, 1.85, LADDER_RANGE_DEG * 2 * unitsPerDeg
  )
  attitude.add(ladder)

  const sightMap = boresightTexture()
  const boresight = panel('hud-boresight', sightMap, 0.62, 0.116)

  const build = (
    name: HudFace, w: number, h: number, planeW: number, planeH: number,
    paint: LiveFace['paint'], key: LiveFace['key']
  ): LiveFace => {
    const surface = createSurface(w, h)
    const texture = surfaceTexture(surface)
    return { mesh: panel(name, texture, planeW, planeH), surface, texture, paint, key, last: NaN }
  }

  const faces: LiveFace[] = [
    build('hud-heading', HEADING_FACE.w, HEADING_FACE.h, 1.34, 0.23,
      paintHeading, (r) => Math.round(r.headingDeg * 2)),
    build('hud-altitude', SIDE_FACE.w, SIDE_FACE.h, 0.381, 0.55,
      paintAltitude, (r) => Math.round(r.altitude * 2)),
    build('hud-speed', SIDE_FACE.w, SIDE_FACE.h, 0.381, 0.55,
      paintSpeed, (r) => Math.round(r.speed * 2)),
  ]
  const byName = new Map(faces.map((f) => [f.mesh.name as HudFace, f]))

  // The compass rides the top of the field, above the ladder's highest rung.
  faces[0].mesh.position.set(0, 0.85, 0)
  group.add(attitude, boresight, ...faces.map((f) => f.mesh))

  const setAspect = (aspect: number): void => {
    // Side readouts ride the frame edge, so a narrow window keeps them on
    // screen instead of pushing them out past the glass.
    const x = Math.max(0.5, aspect - 0.31)
    faces[1].mesh.position.set(x, 0.02, 0)
    faces[2].mesh.position.set(-x, 0.02, 0)
  }
  setAspect(camera.aspect || 1.6)

  return {
    group,
    face(name) {
      const found = byName.get(name)
      if (!found) throw new Error(`no hud face ${name}`)
      return found.texture
    },
    setAspect,
    setVisible(visible) {
      group.visible = visible
    },
    update(state) {
      const reading = readFlight(state)
      // Roll the whole attitude frame, then slide the ladder inside it: the
      // pitch offset must be applied along the ROLLED vertical or a banked
      // climb puts the horizon in the wrong place.
      attitude.rotation.z = (reading.rollDeg * Math.PI) / 180
      const shown = Math.max(-LADDER_RANGE_DEG, Math.min(LADDER_RANGE_DEG, reading.pitchDeg))
      ladder.position.y = -shown * unitsPerDeg

      for (const face of faces) {
        const key = face.key(reading)
        if (key === face.last) continue
        face.last = key
        face.paint(face.surface, reading)
        face.texture.needsUpdate = true
      }
    },
    dispose() {
      group.removeFromParent()
      ladderMap.dispose()
      sightMap.dispose()
      for (const mesh of [ladder, boresight, ...faces.map((f) => f.mesh)]) {
        mesh.geometry.dispose()
        ;(mesh.material as MeshBasicMaterial).dispose()
      }
      for (const face of faces) face.texture.dispose()
    },
  }
}
