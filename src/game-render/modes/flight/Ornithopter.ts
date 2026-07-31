// src/game-render/modes/flight/Ornithopter.ts
// Procedurally built ornithopter.
//
// Built from geometry rather than loaded as a GLB so it needs no asset
// pipeline and no external art to look deliberate. The silhouette does the
// work: a long tapered fuselage, dragonfly wings set high and forward, and a
// canted tail. Read against bright sand it is the outline that registers, not
// the surface detail.

import {
  Group, Mesh, MeshStandardMaterial, BoxGeometry, CylinderGeometry,
  SphereGeometry, ConeGeometry, Color, type BufferGeometry,
} from 'three'

export interface Ornithopter {
  group: Group
  /** Beat the wings. Call per frame with elapsed milliseconds. */
  update(elapsedMs: number): void
  dispose(): void
}

const HULL_COLOR = 0x8a7a5c
const TRIM_COLOR = 0x5a4a34
const CANOPY_COLOR = 0x2e4a52

function buildWing(): BufferGeometry {
  // Tapered and thin: a wing that reads as a membrane rather than a plank.
  const geometry = new CylinderGeometry(0.6, 5.5, 34, 6, 1, false)
  geometry.rotateZ(Math.PI / 2)
  geometry.scale(1, 0.12, 1)
  return geometry
}

export function createOrnithopter(): Ornithopter {
  const group = new Group()
  const geometries: BufferGeometry[] = []

  // Metalness near zero, deliberately.
  //
  // A metal in three.js has no diffuse response at all — its entire look is a
  // reflection of the environment, and this scene has no environment map. Flown
  // backlit over the dunes, which is the shot the whole cinematic exists for,
  // the hull at metalness 0.35 rendered as a flat black cutout. The emissive
  // floor keeps the shadow side reading as painted composite rather than a
  // hole in the sky.
  const hull = new MeshStandardMaterial({
    color: HULL_COLOR,
    roughness: 0.62,
    metalness: 0.05,
    emissive: new Color(0x3a2a18),
    emissiveIntensity: 0.55,
  })
  const trim = new MeshStandardMaterial({
    color: TRIM_COLOR,
    roughness: 0.78,
    metalness: 0.05,
    emissive: new Color(0x241a10),
    emissiveIntensity: 0.5,
  })
  // The canopy keeps a little metal — a glass highlight is the one place a
  // reflection is meant to read as a reflection — but is emissive enough to
  // stay a canopy when there is nothing behind the camera to reflect.
  const canopy = new MeshStandardMaterial({
    color: CANOPY_COLOR,
    roughness: 0.18,
    metalness: 0.35,
    emissive: new Color(0x16303a),
    emissiveIntensity: 0.7,
  })

  // Fuselage — long and tapered, nose forward along -Z.
  const bodyGeometry = new CylinderGeometry(2.6, 1.4, 22, 8)
  bodyGeometry.rotateX(Math.PI / 2)
  geometries.push(bodyGeometry)
  group.add(new Mesh(bodyGeometry, hull))

  // Nose cone.
  const noseGeometry = new ConeGeometry(2.6, 7, 8)
  noseGeometry.rotateX(-Math.PI / 2)
  const nose = new Mesh(noseGeometry, hull)
  nose.position.z = -14.5
  geometries.push(noseGeometry)
  group.add(nose)

  // Canopy — the one glossy element, so the eye has somewhere to land.
  const canopyGeometry = new SphereGeometry(2.1, 10, 8)
  const canopyMesh = new Mesh(canopyGeometry, canopy)
  canopyMesh.position.set(0, 1.5, -6)
  canopyMesh.scale.set(1, 0.7, 1.8)
  geometries.push(canopyGeometry)
  group.add(canopyMesh)

  // Wings, mounted high and forward like a dragonfly's.
  const wingGeometry = buildWing()
  geometries.push(wingGeometry)

  const leftWing = new Mesh(wingGeometry, trim)
  leftWing.position.set(-17, 2.6, -3)
  group.add(leftWing)

  const rightWing = new Mesh(wingGeometry, trim)
  rightWing.position.set(17, 2.6, -3)
  group.add(rightWing)

  // A second, shorter pair aft — the detail that makes it read as a thopter
  // rather than a generic aircraft.
  const rearWingGeometry = buildWing()
  rearWingGeometry.scale(0.62, 1, 0.62)
  geometries.push(rearWingGeometry)

  const leftRear = new Mesh(rearWingGeometry, trim)
  leftRear.position.set(-11, 1.4, 5)
  group.add(leftRear)

  const rightRear = new Mesh(rearWingGeometry, trim)
  rightRear.position.set(11, 1.4, 5)
  group.add(rightRear)

  // Canted tail fin.
  const tailGeometry = new BoxGeometry(0.6, 7, 5)
  const tail = new Mesh(tailGeometry, trim)
  tail.position.set(0, 4, 10)
  tail.rotation.x = -0.25
  geometries.push(tailGeometry)
  group.add(tail)

  return {
    group,
    update(elapsedMs: number): void {
      // Fore and aft pairs beat out of phase, which reads as insect flight
      // rather than a bird's single stroke.
      const beat = Math.sin(elapsedMs * 0.022)
      const beatAft = Math.sin(elapsedMs * 0.022 + Math.PI * 0.6)

      leftWing.rotation.z = beat * 0.34
      rightWing.rotation.z = -beat * 0.34
      leftRear.rotation.z = beatAft * 0.26
      rightRear.rotation.z = -beatAft * 0.26
    },
    dispose(): void {
      for (const geometry of geometries) geometry.dispose()
      hull.dispose()
      trim.dispose()
      canopy.dispose()
      group.clear()
    },
  }
}
