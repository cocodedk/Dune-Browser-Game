// vehicle-shop/harvester/src/model/wheel.ts
// COMPONENT 6 — ONE wheel, built once and reused everywhere (user direction:
// "concentrate on one wheel component and make it perfect and then use it").
// A smooth tire, a hub proud of each face, and six bolts on each hub. Every
// wheel on the machine — road wheels and return rollers — is this component
// at its own radius; only the toothed sprockets are bespoke.
//
// The group's origin is the AXLE and its local X is the axle direction, so
// tracks.ts rolls the wheel by rotating the whole group about local X.

import { CylinderGeometry, Group, Mesh, type BufferGeometry, type MeshStandardMaterial } from 'three'

export interface WheelPart {
  group: Group
  dispose(): void
}

const HUB_FRACTION = 0.38
const BOLT_COUNT = 6
const BOLT_RADIUS_FRACTION = 0.26

export function buildWheel(
  radius: number,
  width: number,
  tireMaterial: MeshStandardMaterial,
  hubMaterial: MeshStandardMaterial,
  boltMaterial: MeshStandardMaterial,
): WheelPart {
  const group = new Group()
  group.name = 'wheel'
  const geometries: BufferGeometry[] = []

  const tire = new CylinderGeometry(radius, radius, width, 24)
  geometries.push(tire)
  const tireMesh = new Mesh(tire, tireMaterial)
  tireMesh.rotation.z = Math.PI / 2 // axle along X
  tireMesh.castShadow = true
  group.add(tireMesh)

  // A hub proud of each face, with a ring of bolts around it.
  const hubRadius = radius * HUB_FRACTION
  const hubX = width / 2 + 0.18
  for (const face of [-1, 1] as const) {
    const hub = new CylinderGeometry(hubRadius, hubRadius, 0.35, 16)
    geometries.push(hub)
    const hubMesh = new Mesh(hub, hubMaterial)
    hubMesh.rotation.z = Math.PI / 2
    hubMesh.position.set(face * hubX, 0, 0)
    hubMesh.castShadow = true
    group.add(hubMesh)

    for (let b = 0; b < BOLT_COUNT; b++) {
      const angle = (b / BOLT_COUNT) * Math.PI * 2
      const bolt = new CylinderGeometry(radius * 0.08, radius * 0.08, 0.55, 8)
      geometries.push(bolt)
      const boltMesh = new Mesh(bolt, boltMaterial)
      boltMesh.rotation.z = Math.PI / 2
      boltMesh.position.set(
        face * hubX,
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
