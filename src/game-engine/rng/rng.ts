// src/game-engine/rng/rng.ts
// The campaign's single seeded RNG service.
//
// docs/PRD/game-completion/02-runtime-consolidation.md ("Randomness"):
// prospecting, worms, combat variance, raids, and authored random-event
// selection must all consume this service through explicit injected calls
// rather than `Math.random()`, so save/load, replay, and the headless
// simulator stay deterministic. State is exactly `{ seed, step }` — every
// draw is derived purely from that pair (see hash.ts), so a restored
// snapshot resumes the exact original sequence and does so in O(1).

import { hashAt, hashToUnitFloat, hashToInt } from './hash'

/** Serializable RNG state. Fixed shape — other WP01 modules depend on it. */
export interface RngState {
  seed: number
  step: number
}

export interface RngService {
  /** Next float in [0, 1). Advances step by 1. */
  next(): number
  /** Next integer in [0, maxExclusive). Advances step by 1. */
  int(maxExclusive: number): number
  /** Uniformly pick one item from a non-empty array. Advances step by 1. */
  pick<T>(items: readonly T[]): T
  /** Snapshot of the current seed and step, safe to persist. */
  state(): RngState
}

/**
 * Create an RNG service starting from `state`.
 *
 * `createRng({ seed, step: n })` behaves identically to `createRng({ seed,
 * step: 0 })` advanced n times, because each draw depends only on (seed,
 * step) and never on prior calls — there is no mutable generator internals
 * to replay.
 */
export function createRng(state: RngState): RngService {
  const seed = state.seed
  let step = state.step

  function draw(): bigint {
    const hash = hashAt(seed, step)
    step += 1
    return hash
  }

  function next(): number {
    return hashToUnitFloat(draw())
  }

  function int(maxExclusive: number): number {
    if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) {
      throw new RangeError(`int() requires maxExclusive > 0, got ${maxExclusive}`)
    }
    return hashToInt(draw(), maxExclusive)
  }

  function pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new RangeError('pick() requires a non-empty items array')
    }
    return items[int(items.length)]
  }

  function snapshot(): RngState {
    return { seed, step }
  }

  return { next, int, pick, state: snapshot }
}
