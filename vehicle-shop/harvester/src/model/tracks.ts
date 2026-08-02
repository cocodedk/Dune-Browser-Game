// vehicle-shop/harvester/src/model/tracks.ts
// One track pod: a long dark box running the full length at x = +-trackSpan/2
// with wheels on its outer face that roll with the crawler's track speed.
//
// The wheel rotation is driven from the PURE crawler math (crawler/
// kinematics.ts wheelAngularSpeed) — forward motion rolls the wheels so the
// ground contact point stands still — and a unit test pins the sign, so the
// visual cannot silently run the tracks backwards.

import { BoxGeometry, CylinderGeometry, Group, Mesh, type MeshStandardMaterial } from 'three'
import { OVERALL, TRACK, BODY } from '../spec'
import { wheelAngularSpeed } from '../crawler/kinematics'

export interface Tracks {
  group: Group
  /** Advance the wheels from the crawler's signed track speeds. */
  update(trackLeft: number, trackRight: number, dt: number): void
  dispose(): void
}

/** Pods run the hull's own length, not the full footprint (which the forward
 *  cutter extends past). */
const POD_LENGTH = BODY.tailZ - BODY.noseZ

export function buildTracks(darkMaterial: MeshStandardMaterial, wheelMaterial: MeshStandardMaterial): Tracks {
  const group = new Group()
  const geometries: (BoxGeometry | CylinderGeometry)[] = []

  const wheels: { mesh: Mesh; side: 1 | -1 }[] = []

  for (const side of [1, -1] as const) {
    const x = side * TRACK.centreX

    const pod = new BoxGeometry(OVERALL.trackWidth, TRACK.podTopY, POD_LENGTH)
    geometries.push(pod)
    const podMesh = new Mesh(pod, darkMaterial)
    podMesh.position.set(x, TRACK.podTopY / 2, 0)
    podMesh.castShadow = true
    podMesh.receiveShadow = true
    group.add(podMesh)

    // Tread hint: a lighter cap strip along the pod's top edge.
    const cap = new BoxGeometry(OVERALL.trackWidth + 0.3, 0.7, POD_LENGTH)
    geometries.push(cap)
    const capMesh = new Mesh(cap, wheelMaterial)
    capMesh.position.set(x, TRACK.podTopY - 0.35, 0)
    capMesh.castShadow = true
    group.add(capMesh)

    // Wheels on the OUTER face, slightly proud of the pod, rolling with the
    // track speed. The pod's inner face stays flat against the hull.
    for (const wz of TRACK.wheelsZ) {
      const wheel = new CylinderGeometry(OVERALL.wheelRadius, OVERALL.wheelRadius, OVERALL.trackWidth + 0.8, 14)
      geometries.push(wheel)
      const mesh = new Mesh(wheel, wheelMaterial)
      mesh.rotation.z = Math.PI / 2 // axle along X
      mesh.position.set(x, OVERALL.wheelRadius, wz)
      mesh.castShadow = true
      group.add(mesh)
      wheels.push({ mesh, side })
    }
  }

  return {
    group,
    update(trackLeft, trackRight, dt) {
      for (const { mesh, side } of wheels) {
        const speed = side === 1 ? trackRight : trackLeft
        mesh.rotation.x += wheelAngularSpeed(speed, OVERALL.wheelRadius) * dt
      }
    },
    dispose() {
      for (const g of geometries) g.dispose()
    },
  }
}
