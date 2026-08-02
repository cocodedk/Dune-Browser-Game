// vehicle-shop/harvester/src/model/tracks.ts
// COMPONENT 2 — the two track assemblies. Each side: a continuous dark
// tread band with SEGMENTED RIBS (the belt read, not a plain slab), seven
// big wheels standing in it, and an upper housing with a cap trim tucked
// under the deck. The wheels roll from the crawler's signed track speeds
// (crawler/kinematics.ts wheelAngularSpeed); a unit test pins the sign.
// Left and right are built by the same loop with a mirrored X, so they
// cannot disagree.

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
/** Rib count per side; spacing falls out of the band length. */
const RIB_COUNT = 12
const RIB_SPACING = POD_LENGTH / RIB_COUNT
const RIB_LENGTH = RIB_SPACING * 0.62

export function buildTracks(darkMaterial: MeshStandardMaterial, wheelMaterial: MeshStandardMaterial): Tracks {
  const group = new Group()
  group.name = 'tracks'
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

    // Tread ribs on the OUTER face: the segmented belt read that makes a
    // track a track rather than a wall.
    for (let i = 0; i < RIB_COUNT; i++) {
      const rib = new BoxGeometry(0.45, TRACK.band.yHigh - TRACK.band.yLow + 0.1, RIB_LENGTH)
      geometries.push(rib)
      const ribMesh = new Mesh(rib, wheelMaterial)
      ribMesh.position.set(x + side * (OVERALL.trackWidth / 2 + 0.22), (TRACK.band.yLow + TRACK.band.yHigh) / 2, -POD_LENGTH / 2 + RIB_SPACING * (i + 0.5))
      ribMesh.castShadow = true
      group.add(ribMesh)
    }

    // Big wheels standing in the band, proud of both faces, tops above the
    // belt — the running gear.
    for (const wz of TRACK.wheelsZ) {
      const wheel = new CylinderGeometry(OVERALL.wheelRadius, OVERALL.wheelRadius, OVERALL.trackWidth + 0.6, 14)
      geometries.push(wheel)
      const mesh = new Mesh(wheel, wheelMaterial)
      mesh.name = 'wheel'
      mesh.rotation.z = Math.PI / 2 // axle along X
      mesh.position.set(x, OVERALL.wheelRadius, wz)
      mesh.castShadow = true
      group.add(mesh)
      wheels.push({ mesh, side })
    }

    // Upper housing over the running gear, with a slightly wider cap trim at
    // its top — the deck sits on these, tracks carrying a platform.
    const housing = new BoxGeometry(TRACK.housing.width, TRACK.housing.yHigh - TRACK.housing.yLow, POD_LENGTH)
    geometries.push(housing)
    const housingMesh = new Mesh(housing, darkMaterial)
    housingMesh.position.set(x, (TRACK.housing.yLow + TRACK.housing.yHigh) / 2, 0)
    housingMesh.castShadow = true
    housingMesh.receiveShadow = true
    group.add(housingMesh)
    const cap = new BoxGeometry(TRACK.housing.width + 0.5, 0.5, POD_LENGTH)
    geometries.push(cap)
    const capMesh = new Mesh(cap, wheelMaterial)
    capMesh.position.set(x, TRACK.housing.yHigh - 0.25, 0)
    capMesh.castShadow = true
    group.add(capMesh)
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
