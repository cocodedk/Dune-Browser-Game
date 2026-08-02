// vehicle-shop/harvester/src/model/Harvester.ts
// ASSEMBLY — the only file that knows all five components. It owns the
// materials, adds the components in a fixed order, drives the wheels from
// the crawler state, and disposes everything. Each component is a pure
// builder ({ group, dispose }) reading spec.ts, so this file has nothing to
// get wrong beyond wiring — and the component test suite verifies each
// part's bounding invariants independently.

import { Group, MeshStandardMaterial } from 'three'
import type { HarvesterModel, CrawlerState } from '../contracts'
import { buildHull } from './hull'
import { buildTracks } from './tracks'
import { buildCutter } from './cutter'
import { buildCab } from './cab'
import { buildMachinery } from './machinery'

/** Sand body — the film's desert-industrial platform tone. */
const BODY_COLOR = 0xb8a87f
/** Near-black pods, housings and machinery. */
const DARK_COLOR = 0x2e2d29
/** Wheels and trim caps — the machine's only bright hardware. */
const WHEEL_COLOR = 0x6f6757
/** Rusted-metal accents — boom, hoppers, cutter. */
const ACCENT_COLOR = 0x6b4f35

export function createHarvester(): HarvesterModel {
  const root = new Group()
  root.name = 'harvester'

  const bodyMaterial = new MeshStandardMaterial({ color: BODY_COLOR, roughness: 0.9, metalness: 0.05, flatShading: true })
  const darkMaterial = new MeshStandardMaterial({ color: DARK_COLOR, roughness: 0.85, metalness: 0.1, flatShading: true })
  const wheelMaterial = new MeshStandardMaterial({ color: WHEEL_COLOR, roughness: 0.6, metalness: 0.3, flatShading: true })
  const accentMaterial = new MeshStandardMaterial({ color: ACCENT_COLOR, roughness: 0.7, metalness: 0.25, flatShading: true })

  const hull = buildHull(bodyMaterial, darkMaterial)
  const tracks = buildTracks(darkMaterial, wheelMaterial, accentMaterial)
  const cutter = buildCutter(darkMaterial, accentMaterial)
  const cab = buildCab(bodyMaterial, darkMaterial, accentMaterial)
  const machinery = buildMachinery(darkMaterial, accentMaterial)

  root.add(hull.group)
  root.add(tracks.group)
  root.add(cutter.group)
  root.add(cab.group)
  root.add(machinery.group)

  const materials = [bodyMaterial, darkMaterial, wheelMaterial, accentMaterial]

  return {
    root,
    update(state: Readonly<CrawlerState>, dt: number): void {
      tracks.update(state.trackLeft, state.trackRight, dt)
    },
    dispose(): void {
      hull.dispose()
      tracks.dispose()
      cutter.dispose()
      cab.dispose()
      machinery.dispose()
      for (const material of materials) material.dispose()
      root.clear()
    },
  }
}
