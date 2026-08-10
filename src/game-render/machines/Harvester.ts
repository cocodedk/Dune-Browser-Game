// src/game-render/machines/Harvester.ts
// The release adapter over the harvester shop — this file no longer builds a
// harvester, it wraps one. vehicle-shop/harvester/src/model/Harvester.ts is
// the real machine: an authored ~48m hull with a 60m cutter overhang, built
// component-by-component and gauntlet-judged on its own turntable. The
// @shop alias (vite.config.ts, tsconfig.json) is the only sanctioned route
// in, and eslint.config.js fences everything under vehicle-shop/ except its
// public surface (model/**, contracts, spec) off from src/ entirely. What
// lived here before was a ~140-line box placeholder standing in for that
// machine while the shop was being built.
//
// The adapter's job is narrow: turn CrewUnits.ts's per-frame elapsedMs into
// the shop's dt-and-CrawlerState language, and apply the one policy every
// machine placed on the fog-shrouded planet needs (fog off) without
// reaching into the shop's own materials to do it.

import type { Group } from 'three'
import { createHarvester as createShopHarvester } from '@shop/harvester/src/model/Harvester'
import type { CrawlerState } from '@shop/harvester/src/contracts'
// import { neutralEnvMap } from '../materials/neutralEnvMap' -- see the
// commented envMap line in the traverse below. Whether this machine opts
// into the shared env map (same reasoning as the old placeholder: it is
// usually seen backlit against bright sand) is a look-gate decision, not
// one this adapter makes unilaterally.

export interface Harvester {
  group: Group
  /** Crawl and throw dust. Call per frame with elapsed milliseconds. */
  update(elapsedMs: number): void
  dispose(): void
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value))
}

// Structural stand-in for the materials this traverse actually meets
// (MeshStandardMaterial on the hull/tracks/cutter, SpriteMaterial on the
// dust plumes) — both declare `fog` as a real instance property, but
// @types/three 0.185.1's common `Material` base type does not, so a narrow
// shape here typechecks accurately instead of casting to the wrong base.
type FoggableMaterial = { fog?: boolean }

/**
 * @param scale World units for the machine's length, the same unit callers
 *   have always passed. The shop model is authored in true metres (~48m
 *   hull, ~60m with the cutter); dividing by 20 maps that onto the footprint
 *   the old placeholder's own `scale * 2.4` body gave callers, so nothing
 *   downstream of this function needs to change.
 */
export function createHarvester(scale = 1): Harvester {
  const model = createShopHarvester()
  // The shop contract types root as Object3DLike — a three-free structural
  // stand-in (contracts.ts) so the crawler core never imports three.js. The
  // runtime object is a real Group, built by the same three instance this
  // file imports (one node_modules copy, repo-wide): this cast holds only as
  // long as that stays true, so bump three in the game and every shop in
  // lockstep, never independently.
  const group = model.root as unknown as Group

  group.scale.setScalar(scale / 20)

  // Same reasoning as the old placeholder: these machines are seen backlit
  // against bright sand through planet fog, and undoing that per-material
  // here is cheaper than threading a fog flag through the shop's own build.
  group.traverse((child) => {
    const holder = child as unknown as { material?: FoggableMaterial | FoggableMaterial[] }
    const material = holder.material
    if (!material) return
    for (const m of Array.isArray(material) ? material : [material]) {
      m.fog = false
      // m.envMap = neutralEnvMap() -- flip this on together with the import
      // above once the look gate decides this machine wants it.
    }
  })

  // CrewUnits.ts owns placement: it sets group.position/quaternion itself
  // and skips update() on machines it currently hides, so position/yaw stay
  // zero here forever and dt has to tolerate gaps of arbitrary size.
  const state: CrawlerState = {
    position: { x: 0, y: 0, z: 0 },
    yaw: 0,
    pitch: 0,
    roll: 0,
    // A slow working crawl, not a stop: nonzero track speed is what makes
    // the wheels turn and the dust plumes breathe (dust.ts is deterministic
    // off track speed alone, and exactly zero when the tracks are still).
    speed: 1.2,
    trackLeft: 1.2,
    trackRight: 1.2,
  }
  let lastElapsed: number | undefined

  return {
    group,
    update(elapsedMs: number): void {
      // The clamp does double duty: it covers the very first call (lastElapsed
      // is still undefined, so the diff can be large) and the gaps CrewUnits
      // leaves behind by skipping update() on machines it currently hides —
      // both land here as an oversized delta, and both get the same 0.1s cap.
      const dt = clamp((elapsedMs - (lastElapsed ?? 0)) / 1000, 0, 0.1)
      lastElapsed = elapsedMs
      model.update(state, dt)
    },
    dispose(): void {
      model.dispose()
    },
  }
}
