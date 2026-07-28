// src/game-render/planet/Moons.ts
// Krelln and Arvon in orbit, lit by the same sun as the planet.
//
// Lit rather than emissive on purpose: a moon that shows a crescent, and whose
// crescent agrees with the terminator on Arrakis below it, is doing more for
// the sense of being in space than any amount of extra geometry would.

import {
  Group, Mesh, SphereGeometry, MeshStandardMaterial, Sprite, SpriteMaterial,
  CanvasTexture, LinearFilter, type CanvasTexture as Tex,
} from 'three'
import {
  moonPosition, KRELLN, ARVON, KRELLN_RADIUS, ARVON_RADIUS,
} from './orbits'
import type { MoonOrbit } from './orbits'
import { drawKrelln, drawArvon } from './moonTextures'

export interface Moons {
  group: Group
  /** Advance both moons to a moment. */
  update(timeSeconds: number): void
  dispose(): void
}

interface MoonBody {
  mesh: Mesh
  label: Sprite
  orbit: MoonOrbit
}

/** Small name plate, screen-relative so it stays readable at any zoom. */
function makeLabel(text: string, sub: string): { sprite: Sprite; texture: Tex } {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  ctx.font = '600 30px system-ui, sans-serif'
  const width = Math.ceil(ctx.measureText(text).width) + 34
  canvas.width = width
  canvas.height = 66

  ctx.font = '600 30px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(226, 216, 200, 0.92)'
  ctx.fillText(text, width / 2, 28)

  ctx.font = 'italic 19px system-ui, sans-serif'
  ctx.fillStyle = 'rgba(170, 186, 205, 0.75)'
  ctx.fillText(sub, width / 2, 52)

  const texture = new CanvasTexture(canvas)
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter

  const sprite = new Sprite(new SpriteMaterial({
    map: texture, transparent: true, depthTest: false, fog: false,
    sizeAttenuation: false,
  }))
  // Same viewport-fraction scale the sietch labels use.
  sprite.scale.set(width * 0.00042, 66 * 0.00042, 1)
  sprite.center.set(0.5, -0.6)
  sprite.renderOrder = 30
  return { sprite, texture }
}

export function createMoons(planetRadius: number, daySeconds: number): Moons {
  const group = new Group()
  group.name = 'moons'

  const textures: Tex[] = []
  const bodies: MoonBody[] = []

  function add(
    orbit: MoonOrbit,
    radiusFraction: number,
    map: Tex,
    name: string,
    sub: string,
  ): void {
    const geometry = new SphereGeometry(planetRadius * radiusFraction, 32, 24)
    const material = new MeshStandardMaterial({
      map,
      roughness: 1,
      // Airless rock. Any metalness at all renders black without an
      // environment map, which is the mistake the ornithopter made.
      metalness: 0,
      fog: false,
    })
    const mesh = new Mesh(geometry, material)
    mesh.name = `moon:${name}`
    group.add(mesh)

    const { sprite, texture } = makeLabel(name, sub)
    textures.push(texture, map)
    group.add(sprite)

    bodies.push({ mesh, label: sprite, orbit })
  }

  add(KRELLN, KRELLN_RADIUS, drawKrelln(), 'Krelln', 'the fist')
  add(ARVON, ARVON_RADIUS, drawArvon(), 'Arvon', "muad'dib")

  return {
    group,
    update(timeSeconds: number): void {
      for (const body of bodies) {
        const p = moonPosition(body.orbit, timeSeconds, daySeconds, planetRadius)
        body.mesh.position.set(p.x, p.y, p.z)
        body.label.position.set(p.x, p.y, p.z)
        // Turn the marked face toward the planet, the way a tidally locked
        // moon would. Both of Arrakis's are close in and would be.
        body.mesh.lookAt(0, 0, 0)
        body.mesh.rotateY(Math.PI)
      }
    },
    dispose(): void {
      for (const body of bodies) {
        body.mesh.geometry.dispose()
        ;(body.mesh.material as MeshStandardMaterial).dispose()
        ;(body.label.material as SpriteMaterial).dispose()
      }
      for (const t of textures) t.dispose()
      group.clear()
    },
  }
}
