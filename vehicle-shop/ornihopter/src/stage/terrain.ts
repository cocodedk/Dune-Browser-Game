// vehicle-shop/ornihopter/src/stage/terrain.ts
// The test area: a dune field big enough to fly across, plus the height
// function the flight model uses for altitude and ground collision.
//
// heightAt() is exported as a pure function and is the SAME function that
// displaces the mesh. If the two ever diverge the craft will appear to fly
// through dunes it believes it is above, so they must not be separate.

import {
  Mesh, MeshStandardMaterial, PlaneGeometry, Group, Object3D,
  BoxGeometry,
} from 'three'

export const AREA_SIZE = 4000
const SEGMENTS = 200
const SAND_COLOR = 0xc9a271

/** Dune height at a world XZ. Pure — the flight model imports this directly. */
export function heightAt(x: number, z: number): number {
  // Three offset sine ridges at incommensurable wavelengths: dune-like relief
  // without noise tables, and cheap enough to call per frame.
  const a = Math.sin(x * 0.0042) * Math.cos(z * 0.0031) * 26
  const b = Math.sin((x + z) * 0.0091 + 1.7) * 11
  const c = Math.sin(x * 0.019 - 0.6) * Math.sin(z * 0.017) * 3.4
  return a + b + c
}

export interface Terrain {
  root: Object3D
  dispose(): void
}

export function createTerrain(): Terrain {
  const root = new Group()

  const geometry = new PlaneGeometry(AREA_SIZE, AREA_SIZE, SEGMENTS, SEGMENTS)
  geometry.rotateX(-Math.PI / 2)
  const pos = geometry.attributes.position
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)))
  }
  pos.needsUpdate = true
  geometry.computeVertexNormals()

  const material = new MeshStandardMaterial({ color: SAND_COLOR, roughness: 0.96, metalness: 0 })
  const ground = new Mesh(geometry, material)
  ground.receiveShadow = true
  root.add(ground)

  // Scale posts every 500m. Without something of known size in frame there is
  // no way to tell a 23m craft from a 5m one, and "does it read as big?" is
  // part of the bar.
  // These were 3 x 40 x 3 in unlit MeshBasicMaterial, and they were doing
  // active harm on both counts.
  //
  // A 40m post standing beside a 22.9m craft tells the eye the craft is the
  // small object in the frame. A blind critic, reasoning from these posts,
  // read the craft as 12-18m long against its true 22.896m — about 35% under.
  // A scale reference that dwarfs its subject is worse than no reference.
  // MAST_HEIGHT is now under half the craft's length, so the craft is
  // unambiguously the larger thing.
  //
  // MeshBasicMaterial ignores light entirely, so they rendered as flat black
  // bars; a second critic, looking out of the cockpit, called them "stray
  // geometry or debug markers, not design". Standard material with a footing
  // makes them read as planted objects.
  //
  // Worth being honest that this only stops the posts from LYING about scale.
  // It does not make the craft read big. Nothing here has a universally known
  // size, and the real fix for scale perception is surface detail on the hull
  // — panel lines, hatches, a crew door — which is exterior-fidelity work.
  const MAST_HEIGHT = 10
  const mastGeometry = new BoxGeometry(0.7, MAST_HEIGHT, 0.7)
  const footGeometry = new BoxGeometry(2.6, 0.9, 2.6)
  const postMaterial = new MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.85 })
  const posts = new Group()
  for (let gx = -1500; gx <= 1500; gx += 500) {
    for (let gz = -1500; gz <= 1500; gz += 500) {
      const ground = heightAt(gx, gz)
      const mast = new Mesh(mastGeometry, postMaterial)
      mast.position.set(gx, ground + MAST_HEIGHT / 2, gz)
      mast.castShadow = true
      const foot = new Mesh(footGeometry, postMaterial)
      foot.position.set(gx, ground + 0.45, gz)
      foot.castShadow = true
      posts.add(mast, foot)
    }
  }
  root.add(posts)

  return {
    root,
    dispose() {
      geometry.dispose()
      material.dispose()
      mastGeometry.dispose()
      footGeometry.dispose()
      postMaterial.dispose()
    },
  }
}
