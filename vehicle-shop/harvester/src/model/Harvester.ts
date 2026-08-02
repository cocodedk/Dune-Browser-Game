// vehicle-shop/harvester/src/model/Harvester.ts
// Entry point: assembles the hull, deck, cutter and the two track pods into
// one HarvesterModel. The root never sets its own position or rotation —
// main.ts drives those from the crawler state every frame (contracts.ts).
//
// Materials are flat-shaded authorings, no textures: this is the blockout
// round. A later round adds panel lines, weathering and tread detail.

import { Group, MeshStandardMaterial } from 'three'
import type { HarvesterModel, CrawlerState } from '../contracts'
import { buildHull } from './hull'
import { buildDeck } from './deck'
import { buildTracks } from './tracks'

/** Sand body — the film's desert-industrial platform tone. */
const BODY_COLOR = 0xb8a87f
/** Near-black pods and machinery — the two massive track masses. */
const DARK_COLOR = 0x2e2d29
/** Wheels and caps — the machine's only bright hardware. */
const WHEEL_COLOR = 0x6f6757
/** Rusted-metal accents — boom, hopper, cutter. */
const ACCENT_COLOR = 0x6b4f35

export function createHarvester(): HarvesterModel {
  const root = new Group()
  root.name = 'harvester'

  const bodyMaterial = new MeshStandardMaterial({ color: BODY_COLOR, roughness: 0.9, metalness: 0.05, flatShading: true })
  const darkMaterial = new MeshStandardMaterial({ color: DARK_COLOR, roughness: 0.85, metalness: 0.1, flatShading: true })
  const wheelMaterial = new MeshStandardMaterial({ color: WHEEL_COLOR, roughness: 0.6, metalness: 0.3, flatShading: true })
  const accentMaterial = new MeshStandardMaterial({ color: ACCENT_COLOR, roughness: 0.7, metalness: 0.25, flatShading: true })

  const hull = buildHull(bodyMaterial, darkMaterial)
  root.add(hull.group)
  const deck = buildDeck(bodyMaterial, darkMaterial, accentMaterial)
  root.add(deck.group)
  const tracks = buildTracks(darkMaterial, wheelMaterial)
  root.add(tracks.group)

  const materials = [bodyMaterial, darkMaterial, wheelMaterial, accentMaterial]

  return {
    root,
    update(state: Readonly<CrawlerState>, dt: number): void {
      tracks.update(state.trackLeft, state.trackRight, dt)
    },
    dispose(): void {
      hull.dispose()
      deck.dispose()
      tracks.dispose()
      for (const material of materials) material.dispose()
      root.clear()
    },
  }
}
