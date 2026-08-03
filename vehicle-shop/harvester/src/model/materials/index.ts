// vehicle-shop/harvester/src/model/materials/index.ts
// THE MATERIAL SET — every surface the machine has, built once and handed to
// Harvester.ts. Round I6 moved this out of the assembly file because the
// palette stopped being five hex constants: it is now six tones, two of them
// carrying authored weathering maps in two variants, plus four belt-wear
// tints, and a dispose() that has to release textures a Material's own
// dispose() will not touch.
//
// MAPPED MATERIALS CARRY color 0xffffff. The maps bake albedo (the house
// pattern), so a clean texel renders exactly the tone the flat material used
// to have and the weathering is the only difference. `trim` and `wheel` stay
// unmapped: trim lands on strips 0.36 m tall, where a per-face map would
// darken the whole strip instead of drawing a line on it.

import { MeshStandardMaterial, type Texture } from 'three'
import { BELT_LINK_TINTS, TRIM_COLOR, WHEEL_COLOR } from './palette'
import { ACCENT_PLATE, BODY_LOW_PLATE, BODY_PLATE, DARK_PLATE } from './plateTexel'
import {
  PLATE_SIZE_LARGE, PLATE_SIZE_SMALL, buildBeltWearMap, buildPlateMaps, buildTireMap,
} from './maps'
import type { WeatheringMaps } from './dataTexture'

export interface HarvesterMaterials {
  /** Deck plates, cab body, tail tower — tan, up-facing. */
  body: MeshStandardMaterial
  /** The same tan where the face is vertical: nose tiers, underframe. */
  bodyLow: MeshStandardMaterial
  /** Housings, seam insets, louvres, glass, small hardware. */
  dark: MeshStandardMaterial
  /** Bare steel: housing caps, sprocket drums, drum core, ram barrels. */
  wheel: MeshStandardMaterial
  /** Wheel tires only — carries the contact-radius dirt ring. */
  tire: MeshStandardMaterial
  /** Rust: boom, hoppers, conveyors, cutter hardware. */
  accent: MeshStandardMaterial
  /** THE SIXTH MATERIAL (spec.TRIM_COLOR): deck edges and seam lips, the cab's
   *  window frame, ram rods, hopper rims, mast heads. A top note. */
  trim: MeshStandardMaterial
  /** The belt, one material per wear tint — see palette.BELT_LINK_TINTS. */
  belt: MeshStandardMaterial[]
  dispose(): void
}

export function createHarvesterMaterials(): HarvesterMaterials {
  const textures: Texture[] = []
  const keep = (maps: WeatheringMaps): WeatheringMaps => {
    textures.push(...maps.textures)
    return maps
  }

  const bodyMaps = keep(buildPlateMaps(BODY_PLATE, PLATE_SIZE_LARGE))
  const bodyLowMaps = keep(buildPlateMaps(BODY_LOW_PLATE, PLATE_SIZE_LARGE))
  const darkMaps = keep(buildPlateMaps(DARK_PLATE, PLATE_SIZE_SMALL))
  const accentMaps = keep(buildPlateMaps(ACCENT_PLATE, PLATE_SIZE_SMALL))
  const tireMaps = keep(buildTireMap())
  const beltMaps = keep(buildBeltWearMap())

  // roughness is 1 on every mapped material: the map IS the roughness, and a
  // material value below 1 would scale the whole authored range down.
  const mapped = (maps: WeatheringMaps, metalness: number): MeshStandardMaterial =>
    new MeshStandardMaterial({
      color: 0xffffff,
      map: maps.map,
      roughnessMap: maps.roughnessMap,
      roughness: 1,
      metalness,
      flatShading: true,
    })

  const body = mapped(bodyMaps, 0.05)
  const bodyLow = mapped(bodyLowMaps, 0.05)
  const dark = mapped(darkMaps, 0.1)
  const accent = mapped(accentMaps, 0.25)

  // Steel stays UNMAPPED, and that is a decision, not an omission: it is the
  // material on every large CYLINDER CAP the machine has — the wheel face
  // discs and the sprocket drums — and a cap's UV is the disc inscribed in
  // the unit square, so a plate map's border and scribed line come out as a
  // square frame drawn on a round wheel. Measured in this round's first
  // capture pass; see tracks.ts.
  const wheel = new MeshStandardMaterial({ color: WHEEL_COLOR, roughness: 0.6, metalness: 0.3, flatShading: true })
  const tire = new MeshStandardMaterial({ color: 0xffffff, map: tireMaps.map, roughness: 0.7, metalness: 0.3, flatShading: true })
  // polygonOffset, because trim's job is to sit ON another surface: the cab's
  // roof cap and its upper wall share a top plane at y = 15, and once the two
  // stopped being the same tone the depth fight between them showed as
  // striping across the whole cab roof in the top view. Trim always wins.
  const trim = new MeshStandardMaterial({
    color: TRIM_COLOR, roughness: 0.55, metalness: 0.2, flatShading: true,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  })

  // The belt's tints multiply the one shared wear map, so a worn link stays
  // worn wherever the chain carries it.
  const belt = BELT_LINK_TINTS.map((tint) => new MeshStandardMaterial({
    color: greyOf(tint),
    map: beltMaps.map,
    roughness: 0.85,
    metalness: 0.1,
    flatShading: true,
  }))

  const materials = [body, bodyLow, dark, wheel, tire, accent, trim, ...belt]
  return {
    body, bodyLow, dark, wheel, tire, accent, trim, belt,
    dispose() {
      for (const material of materials) material.dispose()
      for (const texture of textures) texture.dispose()
    },
  }
}

function greyOf(level: number): number {
  const c = Math.max(0, Math.min(255, Math.round(level * 255)))
  return (c << 16) | (c << 8) | c
}
