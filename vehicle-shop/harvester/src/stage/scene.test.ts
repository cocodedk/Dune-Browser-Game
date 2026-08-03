// vehicle-shop/harvester/src/stage/scene.test.ts
// I7 tests-first: the art-director numbers (sun height, fog, fill) pinned
// against the SAME exported constants main.ts and createStage() read — a
// stale test constant and a stale scene constant could otherwise agree with
// each other and disagree with the spec. Importing scene.ts only evaluates
// its top-level constants; createStage() itself needs a real canvas and is
// never called here (same DOM-less pattern as every other unit test in this
// shop).

import { describe, it, expect } from 'vitest'
import { FOG_NEAR, FOG_FAR, SUN_OFFSET, FILL_OFFSET, SUN_INTENSITY, FILL_INTENSITY } from './scene'

describe('stage lighting/fog constants — I7 art-director numbers', () => {
  it('fog tightens from 400/3400 to 200/1500 (destination §8)', () => {
    expect(FOG_NEAR).toBe(200)
    expect(FOG_FAR).toBe(1500)
  })

  it('sun drops from 560m to 300m, keeping its port-side lateral character', () => {
    expect(SUN_OFFSET.y).toBe(300)
    // Port side is negative x (spec.ts axis convention); unchanged in sign.
    expect(SUN_OFFSET.x).toBeLessThan(0)
  })

  it('the fill comes from starboard and stays a restrained fraction of the sun', () => {
    expect(FILL_OFFSET.x).toBeGreaterThan(0)
    expect(FILL_INTENSITY).toBeGreaterThan(0)
    expect(FILL_INTENSITY).toBeLessThan(SUN_INTENSITY)
  })
})
