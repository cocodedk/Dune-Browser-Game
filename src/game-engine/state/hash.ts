// src/game-engine/state/hash.ts
// Pure FNV-1a 64-bit hashing — the state module's only hash primitive. No
// dependencies; BigInt arithmetic is exact so the result is identical across
// machines and JS engines, unlike a float accumulator.

import type { WorldState } from '../../types'
import { serializeCanonical } from './canonical'

const FNV64_OFFSET = 0xcbf29ce484222325n
const FNV64_PRIME = 0x100000001b3n
const MASK64 = (1n << 64n) - 1n

/** FNV-1a over a string's UTF-16 code units, folded to an unsigned 64-bit BigInt. */
export function fnv1a64(input: string): bigint {
  let hash = FNV64_OFFSET
  for (let i = 0; i < input.length; i++) {
    hash ^= BigInt(input.charCodeAt(i))
    hash = (hash * FNV64_PRIME) & MASK64
  }
  return hash
}

/**
 * Stable hash of campaign state: FNV-1a over its canonical serialization.
 * Two canonically-equal states (see ./canonical.ts) always hash equal; any
 * canonical difference — spice, rng step, act — changes the hash.
 */
export function hashState(world: WorldState): string {
  return fnv1a64(serializeCanonical(world)).toString(16).padStart(16, '0')
}
