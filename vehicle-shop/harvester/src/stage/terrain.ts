// vehicle-shop/harvester/src/stage/terrain.ts
// The test area: a gentle dune field and the height function the crawler
// rides. heightAt() is exported pure and is the SAME function that displaces
// the mesh, so the machine can never appear to drive through a dune it
// believes it is above — the identical contract the ornithopter shop uses.
//
// Deliberately GENTLE. The film harvester crawls over long desert swells; it
// is not a rock crawler. Amplitudes are tuned so the steepest slope stays
// well under 2 degrees, which keeps the terrain-following pitch/roll small
// enough to read as "riding the desert" rather than "scrambling".

import {
  Mesh, MeshStandardMaterial, PlaneGeometry, Group, Object3D, BoxGeometry,
} from 'three'

export const AREA_SIZE = 4000
const SEGMENTS = 200
const SAND_COLOR = 0xc9a271

/** Dune height at a world XZ. Long-wavelength swells, near-incommensurable
 *  so the pattern never repeats on camera. */
export function heightAt(x: number, z: number): number {
  const a = Math.sin(x * 0.0014) * Math.cos(z * 0.0011) * 9
  const b = Math.sin((x + z) * 0.0027 + 1.7) * 4
  const c = Math.sin(x * 0.006 - 0.6) * Math.sin(z * 0.005) * 0.7
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

  // Scale posts every 500m, 10m tall — under half the harvester's length, so
  // the machine is unambiguously the larger thing (the ornithopter shop's
  // scale-post lesson, applied).
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
