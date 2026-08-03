// vehicle-shop/harvester/src/model/wheel.ts
// COMPONENT 6 — ONE wheel, built once and reused everywhere (user direction:
// "concentrate on one wheel component and make it perfect and then use it").
// A lathe-turned tire with rounded shoulders and a slight crown — not a
// plain cylinder — a dark rubber tread band around the crown, a steel face
// disc, a hub proud of each face, and six bolts per hub. Every wheel on the
// machine — road wheels and return rollers — is this component at its own
// radius; only the toothed sprockets are bespoke.
//
// The group's origin is the AXLE and its local X is the axle direction, so
// tracks.ts rolls the wheel by rotating the whole group about local X.

import {
  CylinderGeometry, Group, LatheGeometry, Mesh, Vector2,
  type BufferGeometry, type MeshStandardMaterial,
} from 'three'

export interface WheelPart {
  group: Group
  dispose(): void
}

/** Radius of the steel face disc and the tire's inner seat. */
const RIM_FRACTION = 0.6
const HUB_FRACTION = 0.34
const BOLT_COUNT = 6
const BOLT_RADIUS_FRACTION = 0.26
const TREAD_WIDTH_FRACTION = 0.42
const SEGMENTS = 28

export function buildWheel(
  radius: number,
  width: number,
  tireMaterial: MeshStandardMaterial,
  treadMaterial: MeshStandardMaterial,
  faceMaterial: MeshStandardMaterial,
): WheelPart {
  const group = new Group()
  group.name = 'wheel'
  const geometries: BufferGeometry[] = []

  // Tire: revolve a profile with rounded shoulders and a slight crown around
  // the axle — the "perfect wheel" read at close range, not a cylinder.
  const shoulder = radius * 0.16
  const profile = [
    new Vector2(radius * RIM_FRACTION, width / 2),
    new Vector2(radius * 0.88, width / 2),
    new Vector2(radius, width / 2 - shoulder),
    new Vector2(radius * 0.995, 0),
    new Vector2(radius, -width / 2 + shoulder),
    new Vector2(radius * 0.88, -width / 2),
    new Vector2(radius * RIM_FRACTION, -width / 2),
  ]
  const tire = new LatheGeometry(profile, SEGMENTS)
  geometries.push(tire)
  const tireMesh = new Mesh(tire, tireMaterial)
  tireMesh.rotation.z = Math.PI / 2 // axle along X
  tireMesh.castShadow = true
  group.add(tireMesh)

  // Tread band: a dark rubber strip around the crown, slightly proud of the
  // tire's own radius.
  const tread = new CylinderGeometry(radius * 1.01, radius * 1.01, width * TREAD_WIDTH_FRACTION, SEGMENTS)
  geometries.push(tread)
  const treadMesh = new Mesh(tread, treadMaterial)
  treadMesh.rotation.z = Math.PI / 2
  treadMesh.castShadow = true
  group.add(treadMesh)

  // Steel face disc, hub and six bolts on each side.
  const hubRadius = radius * HUB_FRACTION
  for (const face of [-1, 1] as const) {
    const disc = new CylinderGeometry(radius * RIM_FRACTION, radius * RIM_FRACTION, 0.12, SEGMENTS)
    geometries.push(disc)
    const discMesh = new Mesh(disc, faceMaterial)
    discMesh.rotation.z = Math.PI / 2
    discMesh.position.set(face * (width / 2 - 0.06), 0, 0)
    discMesh.castShadow = true
    group.add(discMesh)

    const hub = new CylinderGeometry(hubRadius, hubRadius, 0.3, 18)
    geometries.push(hub)
    const hubMesh = new Mesh(hub, tireMaterial)
    hubMesh.rotation.z = Math.PI / 2
    hubMesh.position.set(face * (width / 2 + 0.05), 0, 0)
    hubMesh.castShadow = true
    group.add(hubMesh)

    for (let b = 0; b < BOLT_COUNT; b++) {
      const angle = (b / BOLT_COUNT) * Math.PI * 2
      const bolt = new CylinderGeometry(radius * 0.07, radius * 0.07, 0.55, 8)
      geometries.push(bolt)
      const boltMesh = new Mesh(bolt, treadMaterial)
      boltMesh.rotation.z = Math.PI / 2
      boltMesh.position.set(
        face * (width / 2 + 0.05),
        radius * BOLT_RADIUS_FRACTION * Math.sin(angle),
        radius * BOLT_RADIUS_FRACTION * Math.cos(angle),
      )
      boltMesh.castShadow = true
      group.add(boltMesh)
    }
  }

  return {
    group,
    dispose() {
      for (const g of geometries) g.dispose()
    },
  }
}
