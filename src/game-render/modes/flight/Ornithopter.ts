// src/game-render/modes/flight/Ornithopter.ts
// The release adapter over the ornithopter shop — this file no longer builds
// an ornithopter, it wraps one. vehicle-shop/ornihopter/src/model/Ornithopter.ts
// is the real machine: an authored ~22.9m hull with an eight-wing beat rig,
// built component-by-component and gauntlet-judged on its own turntable. The
// @shop alias (vite.config.ts, tsconfig.json) is the only sanctioned route
// in, and eslint.config.js fences everything under vehicle-shop/ except its
// public surface (model/**, contracts, spec) off from src/ entirely. What
// lived here before was the Stage-22 procedural craft (fuselage lathe,
// four-wing dragonfly rig, hand-tuned attitude drift) — deleted alongside
// this rewrite; Ornithopter.test.ts pinned its dimensions before it went.
//
// The adapter's job is narrow: FlightMode.ts owns craft.group.position and
// .rotation outright (it drives both every frame from FlightPath's pure arc
// helpers), so the FlightState fields the shop model's update() actually
// reads reduce to three — beatPhase, beatAmplitude, foldProgress, all read
// by WingRig.ts alone (vehicle-shop/ornihopter/src/model/WingRig.ts). This
// synthesises those per frame and fills the rest of the contract with inert
// cruise values so FlightState is honestly satisfied, never consumed.

import type { Group } from 'three'
import { createOrnithopter as createShopCraft } from '@shop/ornihopter/src/model/Ornithopter'
import type { FlightState } from '@shop/ornihopter/src/contracts'
import { OVERALL, CRUISE_BEAT_HZ } from '@shop/ornihopter/src/spec'

export interface Ornithopter {
  group: Group
  /** Beat the wings. Call per frame with elapsed milliseconds. */
  update(elapsedMs: number): void
  dispose(): void
}

const TWO_PI = Math.PI * 2

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value))
}

/**
 * The Stage-22 craft measured 41.810m nose-to-tail (Box3 z-extent of the
 * full assembled group, pinned before deletion; Ornithopter.test.ts
 * re-measures this adapter's own output against the same figure so it
 * cannot silently drift). The shop model is authored in true metres
 * (spec.ts's OVERALL.length = 22.896m); SCALE maps it onto that same
 * footprint so FlightPath's arc geometry and FlightMode's chase camera,
 * both tuned against the old craft's size, need no retuning.
 */
const PINNED_OLD_LENGTH_M = 41.81041070398643
const SCALE = PINNED_OLD_LENGTH_M / OVERALL.length

/**
 * Drop-in for the old geometry/fuselageGeometry.ts's HULL_MAX_RADIUS (2.1) —
 * the constant radius of a body-of-revolution hull, whose only reader was
 * its own re-export and the old craft's own test (grep confirms no other
 * consumer). The shop hull is not a revolve; OVERALL.bodyWidth / 2 (2.7m —
 * model/geometry/hullStations.ts's widthFrac column peaks at 1.0 there,
 * making it the widest single cross-section half-extent, wider than
 * bodyHeight / 2's 2.15m) is the closest true analogue: a single-axis
 * maximum, not a corner-to-corner diagonal, matching what the old radius
 * was. Scaled by SCALE to land in the same world units the old constant
 * did: ~4.93 against the old 2.1. Nothing outside this module's own test
 * reads it today, so a value meant only for future camera-framing margins
 * is the honest level of precision to hold it to.
 */
export const HULL_MAX_RADIUS = (OVERALL.bodyWidth / 2) * SCALE

export function createOrnithopter(): Ornithopter {
  const model = createShopCraft()
  // The shop contract types root as Object3DLike — a three-free structural
  // stand-in (contracts.ts) so the craft model never imports three.js. The
  // runtime object is a real Group, built by the same three instance this
  // file imports (one node_modules copy, repo-wide): this cast holds only as
  // long as that stays true, so bump three in the game and every shop in
  // lockstep, never independently.
  const group = model.root as unknown as Group
  group.scale.setScalar(SCALE)

  // The shop craft's materials were gauntlet-judged under its own stage
  // lighting (vehicle-shop/ornihopter/src/stage/scene.ts); the flight scene
  // has real sky lighting and planet haze instead (env/skyEnvironment.ts,
  // FlightMode.ts's FogExp2). The old Stage-22 craft never set an explicit
  // `material.fog` flag either — its materials took three.js's own default
  // (fog: true) — so this adapter leaves the shop's materials untouched
  // rather than inventing a fog policy the craft it replaces never had.
  // Whether this craft opts into the shared env map (materials/
  // neutralEnvMap.ts, the same look-gate Harvester.ts defers) is a separate,
  // later decision, not one this adapter makes unilaterally.

  // FlightMode.ts sets craft.group.position and .rotation itself every frame
  // from FlightPath's pure arc helpers; per contracts.ts's CraftModel
  // contract the model must never write its own root transform, so this
  // state's position/orientation are never read by anything and stay at the
  // identity forever. throttle/speed/altitude/landed are likewise dead
  // today — WingRig.ts, the only thing update() drives, reads beatPhase,
  // beatAmplitude and foldProgress alone (beatAmplitude is left absent,
  // defaulting to 1 per contracts.ts: full-stroke cruise) — but are filled
  // with sane cruise values so the contract is honestly met, not stubbed.
  const state: FlightState = {
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    throttle: 0.5,
    speed: 50,
    altitude: 60,
    beatPhase: 0,
    beatHz: CRUISE_BEAT_HZ,
    foldProgress: 0,
    landed: false,
  }
  let lastElapsed: number | undefined

  return {
    group,
    update(elapsedMs: number): void {
      // Same clamp as Harvester.ts's adapter, for the same two reasons: the
      // very first call (lastElapsed still undefined) and any gap a caller
      // leaves by skipping frames both land here as an oversized delta.
      const dt = clamp((elapsedMs - (lastElapsed ?? 0)) / 1000, 0, 0.1)
      lastElapsed = elapsedMs
      // Mirrors flight/wingBeat.ts's nextBeat: advance by Hz * 2*PI * dt,
      // wrapped into [0, 2*PI) so the phase never grows without bound over
      // a long session.
      state.beatPhase = (state.beatPhase + dt * CRUISE_BEAT_HZ * TWO_PI) % TWO_PI
      model.update(state)
    },
    dispose(): void {
      model.dispose()
    },
  }
}
