// vehicle-shop/ornihopter/src/stage/terrain.ts
// The test area: a dune field big enough to fly across, plus the height
// function the flight model uses for altitude and ground collision.
//
// heightAt() is exported as a pure function and is the SAME function that
// displaces the mesh. If the two ever diverge the craft will appear to fly
// through dunes it believes it is above, so they must not be separate.

import {
  Mesh, MeshStandardMaterial, PlaneGeometry, Group, Object3D,
  BoxGeometry, MeshBasicMaterial,
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
  const postGeometry = new BoxGeometry(3, 40, 3)
  const postMaterial = new MeshBasicMaterial({ color: 0x3a2a1c })
  const posts = new Group()
  for (let gx = -1500; gx <= 1500; gx += 500) {
    for (let gz = -1500; gz <= 1500; gz += 500) {
      const post = new Mesh(postGeometry, postMaterial)
      post.position.set(gx, heightAt(gx, gz) + 20, gz)
      posts.add(post)
    }
  }
  root.add(posts)

  return {
    root,
    dispose() {
      geometry.dispose()
      material.dispose()
      postGeometry.dispose()
      postMaterial.dispose()
    },
  }
}
