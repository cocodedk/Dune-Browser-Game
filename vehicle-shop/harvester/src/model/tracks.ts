// vehicle-shop/harvester/src/model/tracks.ts
// One track assembly: a continuous dark tread band on the ground, big wheels
// standing in it (the classic tracked running-gear read), and a raised
// housing over them that tucks under the deck. Round 2 rebuilt the old flat
// full-height pods — a 48m x 14m dark wall that read as a wall, not a track
// — into this band + wheels + housing, which is the silhouette the film's
// harvester actually shows.
//
// The wheel rotation is driven from the PURE crawler math (crawler/
// kinematics.ts wheelAngularSpeed) — forward motion rolls the wheels so the
// ground contact point stands still — and a unit test pins the sign.

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

    // The tread band: a long dark belt sitting on the ground line.
    const band = new BoxGeometry(OVERALL.trackWidth, TRACK.band.yHigh - TRACK.band.yLow, POD_LENGTH)
    geometries.push(band)
    const bandMesh = new Mesh(band, darkMaterial)
    bandMesh.position.set(x, (TRACK.band.yLow + TRACK.band.yHigh) / 2, 0)
    bandMesh.castShadow = true
    bandMesh.receiveShadow = true
    group.add(bandMesh)

    // Big wheels standing in the band, proud of both faces, tops above the
    // belt — the running gear that makes a track read as a track.
    for (const wz of TRACK.wheelsZ) {
      const wheel = new CylinderGeometry(OVERALL.wheelRadius, OVERALL.wheelRadius, OVERALL.trackWidth + 0.6, 14)
      geometries.push(wheel)
      const mesh = new Mesh(wheel, wheelMaterial)
      mesh.rotation.z = Math.PI / 2 // axle along X
      mesh.position.set(x, OVERALL.wheelRadius, wz)
      mesh.castShadow = true
      group.add(mesh)
      wheels.push({ mesh, side })
    }

    // The upper housing over the running gear, narrower than the band, tucked
    // under the deck slab so the machine reads as tracks carrying a platform.
    const housing = new BoxGeometry(TRACK.housing.width, TRACK.housing.yHigh - TRACK.housing.yLow, POD_LENGTH)
    geometries.push(housing)
    const housingMesh = new Mesh(housing, darkMaterial)
    housingMesh.position.set(x, (TRACK.housing.yLow + TRACK.housing.yHigh) / 2, 0)
    housingMesh.castShadow = true
    housingMesh.receiveShadow = true
    group.add(housingMesh)
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
