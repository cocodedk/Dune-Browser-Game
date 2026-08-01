// src/game-render/machines/Harvester.ts
// A spice harvester, built from geometry.
//
// Harvesters have existed in this game as a line item in the smugglers'
// market and a flag on a crew: buying one changed a number and nothing else.
// Now the machine is on the sand, working, where the player can see what they
// bought and — more to the point — see what a worm is coming for.
//
// Same approach as the ornithopter: geometry rather than an asset, because the
// silhouette does the work. A harvester is a slab on tracks with a wide intake
// at the front and a chimney throwing dust. Nothing else needs to read.

import {
  Group, Mesh, BoxGeometry, CylinderGeometry, MeshStandardMaterial, Color,
  type BufferGeometry,
} from 'three'
import { neutralEnvMap } from '../materials/neutralEnvMap'

export interface Harvester {
  group: Group
  /** Crawl and throw dust. Call per frame with elapsed milliseconds. */
  update(elapsedMs: number): void
  dispose(): void
}

const HULL_COLOR = 0x9a7c4e
const TRACK_COLOR = 0x3a2f22
const INTAKE_COLOR = 0x6d5636

/**
 * @param scale World units for the machine's length. A harvester is enormous —
 *   the books put it at hundreds of metres — so at map scale it is still only
 *   a few units across, and legibility comes from the silhouette.
 */
export function createHarvester(scale = 1): Harvester {
  const group = new Group()
  group.name = 'harvester'

  const geometries: BufferGeometry[] = []
  const materials: MeshStandardMaterial[] = []

  function material(color: number, rough: number): MeshStandardMaterial {
    // Metalness stays near zero for the same reason it did on the
    // ornithopter before its own fix (env/skyEnvironment.ts): a metal with no
    // environment map to reflect renders black, and these are usually seen
    // backlit against bright sand. Revisiting the emissive workaround itself
    // is out of scope here — this machine is not part of this change — but
    // it opts out of the now-global scene.environment (neutralEnvMap.ts) so
    // that cannot silently shift its tuned look either.
    const m = new MeshStandardMaterial({
      color,
      roughness: rough,
      metalness: 0.04,
      emissive: new Color(0x2a1e12),
      emissiveIntensity: 0.45,
      fog: false,
      envMap: neutralEnvMap(),
    })
    materials.push(m)
    return m
  }

  const hull = material(HULL_COLOR, 0.7)
  const track = material(TRACK_COLOR, 0.95)
  const intake = material(INTAKE_COLOR, 0.85)

  // Body: a long slab, wider than it is tall.
  const bodyGeometry = new BoxGeometry(scale * 1.5, scale * 0.42, scale * 2.4)
  geometries.push(bodyGeometry)
  const body = new Mesh(bodyGeometry, hull)
  body.position.y = scale * 0.38
  group.add(body)

  // Intake: the wide mouth at the front that eats the sand.
  const intakeGeometry = new BoxGeometry(scale * 2.1, scale * 0.3, scale * 0.5)
  geometries.push(intakeGeometry)
  const mouth = new Mesh(intakeGeometry, intake)
  mouth.position.set(0, scale * 0.22, -scale * 1.35)
  group.add(mouth)

  // Tracks, one each side, sunk so the machine sits *in* the sand.
  const trackGeometry = new BoxGeometry(scale * 0.34, scale * 0.34, scale * 2.5)
  geometries.push(trackGeometry)
  for (const side of [-1, 1]) {
    const t = new Mesh(trackGeometry, track)
    t.position.set(side * scale * 0.78, scale * 0.16, 0)
    group.add(t)
  }

  // Chimney. The dust plume is what makes a harvester visible from orbit, and
  // in the fiction it is exactly what brings the worm.
  const stackGeometry = new CylinderGeometry(scale * 0.14, scale * 0.2, scale * 0.7, 6)
  geometries.push(stackGeometry)
  const stack = new Mesh(stackGeometry, hull)
  stack.position.set(scale * 0.36, scale * 0.9, scale * 0.7)
  group.add(stack)

  // The plume itself: a cone that swells and fades as it works.
  const plumeGeometry = new CylinderGeometry(scale * 0.62, scale * 0.1, scale * 1.5, 7, 1, true)
  geometries.push(plumeGeometry)
  const plumeMaterial = new MeshStandardMaterial({
    color: 0xd8b487,
    transparent: true,
    opacity: 0.34,
    roughness: 1,
    metalness: 0,
    emissive: new Color(0x6a5233),
    emissiveIntensity: 0.6,
    depthWrite: false,
    fog: false,
    // Same reasoning as the hull material above: opted out (neutralEnvMap.ts).
    envMap: neutralEnvMap(),
  })
  materials.push(plumeMaterial)
  const plume = new Mesh(plumeGeometry, plumeMaterial)
  plume.position.set(scale * 0.36, scale * 1.85, scale * 0.9)
  group.add(plume)

  return {
    group,
    update(elapsedMs: number): void {
      // A slow crawl and a slight roll: a harvester that sits perfectly still
      // reads as a model of a harvester rather than a working one.
      const t = elapsedMs * 0.0006
      group.rotation.z = Math.sin(t * 1.7) * 0.02
      body.position.y = scale * (0.38 + Math.sin(t * 2.3) * 0.012)

      // The plume breathes with the intake.
      const breath = 0.5 + Math.sin(t * 3.1) * 0.5
      plumeMaterial.opacity = 0.22 + breath * 0.22
      plume.scale.set(1 + breath * 0.25, 1 + breath * 0.35, 1 + breath * 0.25)
    },
    dispose(): void {
      for (const g of geometries) g.dispose()
      for (const m of materials) m.dispose()
      group.clear()
    },
  }
}
