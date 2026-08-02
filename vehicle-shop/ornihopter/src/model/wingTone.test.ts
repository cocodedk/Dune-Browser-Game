// vehicle-shop/ornihopter/src/model/wingTone.test.ts
// The eight blades must belong to the same airframe as the hull they hang off.
//
// Two independent critics, fresh context, said the same thing: "bone-white
// hull with near-black wings — the relationship is inverted"; "the blades are
// flat black slabs". Measured against the render (probe at .30/.45/.60/.75
// span, hull deck as reference) the blades came in at 12-19% of lit-hull
// luminance in the hero view. The kit prints hull and wings in ONE filament
// (docs/dune_ornihopter_kit-2.png) so the target is the same one the landing
// gear was held to in round 4c.2: a lit blade face at ~80-90% of a lit hull
// face.
//
// This test is the MECHANICAL half of that bar — pixel luminance needs a GPU
// and this suite has no DOM. What it can pin is the two material properties
// that decided the render:
//
//   1. colour, against the gear's own pixel-verified bone tone, and
//   2. metalness, which is what actually made the blades black. stage/scene.ts
//      has no environment map, and in three.js a metal's specular comes from
//      the environment: with metalness 0.65 the material threw away 65% of its
//      diffuse response into a lobe that only the direct sun could fill, so a
//      blade read bright only where it happened to catch the highlight. That
//      is also why the eight blades split into two sets — see the parity note
//      in wingKinematics.ts's featherAngle.

import { describe, it, expect } from 'vitest'
import { MeshStandardMaterial, type Mesh, type Object3D } from 'three'
import { createOrnithopter } from './Ornithopter'

/** Perceptual luminance of an sRGB colour, 0..255 — the same quantity the
 *  render probe reads off the framebuffer, so the two are comparable. */
function srgbLuminance(hex: number): number {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function channels(hex: number): [number, number, number] {
  return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff]
}

function materialsByName(): Map<string, MeshStandardMaterial> {
  const craft = createOrnithopter()
  const found = new Map<string, MeshStandardMaterial>()
  ;(craft.root as unknown as Object3D).traverse((child) => {
    const mesh = child as Mesh
    if (!mesh.isMesh) return
    const material = mesh.material
    if (material instanceof MeshStandardMaterial) found.set(mesh.name, material)
  })
  craft.dispose()
  return found
}

describe('wing blades read as the same airframe as the rest of the craft', () => {
  const materials = materialsByName()
  const wing = materials.get('wing-blade')
  const gear = materials.get('landing-gear')

  it('found both a blade material and the gear material to compare it against', () => {
    expect(wing).toBeTruthy()
    expect(gear).toBeTruthy()
  })

  it('is not a metal — a metal with no envMap renders as its own shadow', () => {
    // The whole diffuse term is scaled by (1 - metalness). Anything much above
    // ~0.15 in a scene with only a DirectionalLight and a HemisphereLight
    // costs brightness it can never get back.
    expect(wing!.metalness).toBeLessThanOrEqual(0.2)
  })

  it('sits in the same bone/tan family as the pixel-verified gear tone', () => {
    const wingHex = wing!.color.getHex()
    const gearHex = gear!.color.getHex()
    const [wr, wg, wb] = channels(wingHex)
    const [gr, gg, gb] = channels(gearHex)

    // HUE first, and tightly: this is what "same filament" means, and a grey
    // or a blue-grey of the right brightness would sail past a luminance test.
    expect(wr / wg).toBeCloseTo(gr / gg, 2)
    expect(wr / wb).toBeCloseTo(gr / gb, 2)

    // VALUE second, and loosely, because albedo is NOT the bar — rendered
    // luminance is, and only a GPU can settle that. Measured with the render
    // probe at four span stations on all eight blades: hero 78.7-91.6% of the
    // lit hull deck, top 74.4-99.9%, against the round 4c.2 target of 80-90%.
    // Landing there took a lower albedo than the gear's, for the reason
    // GEAR_COLOR's own comment gives in reverse: a blade's upper face is
    // near-horizontal and meets a 57-degree sun almost square, where a gear
    // femur meets it obliquely. So this bound exists only to catch a PALETTE
    // change — the previous 0x5c5548 sat at 0.40 — not to pin a value that
    // the render owns.
    const ratio = srgbLuminance(wingHex) / srgbLuminance(gearHex)
    expect(ratio).toBeGreaterThan(0.62)
    expect(ratio).toBeLessThan(1.15)
  })

  it('keeps some sheen so the beat sweeps a highlight along the blade', () => {
    // Round 5's note on the previous wing material stands: the blade has to
    // catch the sun as it turns over, or the beat reads as a slide show. What
    // it must NOT do is get that sheen by giving up its diffuse.
    expect(wing!.roughness).toBeLessThan(0.7)
    expect(wing!.roughness).toBeGreaterThan(0.2)
  })
})
