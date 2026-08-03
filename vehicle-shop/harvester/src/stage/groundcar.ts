// vehicle-shop/harvester/src/stage/groundcar.ts
// A small parked groundcar — an immediate scale reference beside the
// harvester (immediate-improvements.md §7: "a 4m groundcar parked beside
// the harvester"). Pure geometry, local frame: every mesh's bottom sits at
// local y=0, so the caller need only translate the returned group to
// (x, heightAt(x,z), z) to park it on the terrain — the same convention
// terrain.ts's own scale posts already use. Owns its own materials (stage
// dressing, not the harvester's five-material roster) and disposes them.

import {
  BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, type BufferGeometry,
} from 'three'

/** Bumper to bumper, along local Z — the §7 "4m groundcar" figure. */
export const GROUNDCAR_LENGTH = 4.0

const BODY_W = 1.9
const BODY_H = 1.0
const CAB_H = 0.6
const WHEEL_R = 0.4
const WHEEL_W = 0.25

export interface GroundcarParts {
  group: Group
  dispose(): void
}

export function buildGroundcar(): GroundcarParts {
  const group = new Group()
  group.name = 'groundcar'
  const geometries: BufferGeometry[] = []
  const bodyMat = new MeshStandardMaterial({ color: 0xb8a87f, roughness: 0.85, metalness: 0.1, flatShading: true })
  const darkMat = new MeshStandardMaterial({ color: 0x2e2d29, roughness: 0.8, metalness: 0.15, flatShading: true })
  const materials = [bodyMat, darkMat]

  const box = (w: number, h: number, d: number, mat: MeshStandardMaterial, x: number, y: number, z: number): void => {
    const g = new BoxGeometry(w, h, d)
    geometries.push(g)
    const m = new Mesh(g, mat)
    m.position.set(x, y, z)
    m.castShadow = true
    m.receiveShadow = true
    group.add(m)
  }

  // Hull: a low boxy chassis, GROUNDCAR_LENGTH long along Z, bottom at y=0.
  box(BODY_W, BODY_H, GROUNDCAR_LENGTH, bodyMat, 0, BODY_H / 2, 0)
  // Cab bump toward the front (-Z, matching the harvester's own forward
  // sense — parked facing the same way as the machine it scales).
  box(BODY_W * 0.8, CAB_H, GROUNDCAR_LENGTH * 0.4, darkMat, 0, BODY_H + CAB_H / 2, -GROUNDCAR_LENGTH * 0.15)

  // Four wheels, axle along X (rotation.z = pi/2, the same trick the
  // harvester's own drum/wheel components use to lay a Y-axis cylinder over).
  for (const side of [-1, 1] as const) {
    for (const zw of [-GROUNDCAR_LENGTH / 2 + 0.6, GROUNDCAR_LENGTH / 2 - 0.6]) {
      const g = new CylinderGeometry(WHEEL_R, WHEEL_R, WHEEL_W, 14)
      geometries.push(g)
      const m = new Mesh(g, darkMat)
      m.rotation.z = Math.PI / 2
      m.position.set(side * (BODY_W / 2 + WHEEL_W / 2), WHEEL_R, zw)
      m.castShadow = true
      group.add(m)
    }
  }

  return {
    group,
    dispose() {
      for (const g of geometries) g.dispose()
      for (const mat of materials) mat.dispose()
    },
  }
}
