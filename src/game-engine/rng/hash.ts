// src/game-engine/rng/hash.ts
// PURE 64-bit hashing primitives for the campaign's seeded RNG.
//
// Every mixing step stays in BigInt integer/bitwise math — never float
// accumulation — because BigInt arithmetic is exact and spec-guaranteed
// identical across JS engines, unlike floats which can differ in rounding
// for exotic operations. The hash for step n is computed directly from n
// (an arithmetic-progression SplitMix64 variant: the pre-mix state advances
// by one fixed increment per step, reached by multiplication, not a loop),
// so any step is reachable in O(1) rather than by replaying n draws.

const MASK64 = (1n << 64n) - 1n
const GOLDEN_GAMMA = 0x9e3779b97f4a7c15n
const MUL_A = 0xbf58476d1ce4e5b9n
const MUL_B = 0x94d049bb133111ebn

/** Normalize a JS number into an unsigned 64-bit BigInt lane. */
function toUint64(n: number): bigint {
  const truncated = BigInt(Math.trunc(n))
  return truncated & MASK64
}

/**
 * SplitMix64 avalanche/finalizer: spreads a linear (arithmetic-progression)
 * state into a well-distributed 64-bit hash.
 */
function mix64(input: bigint): bigint {
  let z = input
  z = ((z ^ (z >> 30n)) * MUL_A) & MASK64
  z = ((z ^ (z >> 27n)) * MUL_B) & MASK64
  z = z ^ (z >> 31n)
  return z & MASK64
}

/**
 * The 64-bit hash for draw `step` of `seed`.
 *
 * The pre-mix state is `seed + (step + 1) * GOLDEN_GAMMA (mod 2^64)`,
 * computed directly via multiplication rather than by iterating `step`
 * times, so restoring a snapshot and resuming is O(1), not O(step).
 */
export function hashAt(seed: number, step: number): bigint {
  const seedLane = toUint64(seed)
  const stepLane = toUint64(step)
  const state = (seedLane + (stepLane + 1n) * GOLDEN_GAMMA) & MASK64
  return mix64(state)
}

/**
 * Map a 64-bit hash to a float in [0, 1) using its top 53 bits — the
 * mantissa width of a double, the standard technique for hash-to-float.
 */
export function hashToUnitFloat(hash: bigint): number {
  const top53 = hash >> 11n
  return Number(top53) / 2 ** 53
}

/**
 * Map a 64-bit hash to an integer in [0, maxExclusive) via a multiply-shift
 * (Lemire-style, without rejection): scales the full 64-bit hash range down
 * proportionally instead of `% max`, which would bias low results whenever
 * `max` does not evenly divide 2^64.
 */
export function hashToInt(hash: bigint, maxExclusive: number): number {
  const max = BigInt(Math.trunc(maxExclusive))
  const scaled = (hash * max) >> 64n
  return Number(scaled)
}
