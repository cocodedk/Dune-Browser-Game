// vehicle-shop/ornihopter/src/interior/lighting.ts
// Cabin fill lighting. Bar item: "the cabin must be lit". main.ts forces
// castShadow/receiveShadow true on every mesh under the craft root (see its
// header) with no exceptions, so the sun's shadow map treats the hull and
// the canopy glazing alike as full shadow casters — the cabin sits in their
// combined shadow almost regardless of what any material in this directory
// does, and that shadow cannot be opted out of from here. HemisphereLight
// (stage/scene.ts) is not shadow-mapped and always reaches the cabin, but at
// its own scene-wide intensity that alone still read as near-total black
// silhouette (progress.md's round-1 cockpit critic). These are ordinary,
// non-shadow-casting point lights local to the cabin: cheap, and in this
// small an enclosed volume a missing self-shadow will not be noticed.

import { Group, PointLight } from 'three'
import { OVERHEAD, EYE } from './layout'

const DOME_COLOR = 0xffdca8
const FILL_COLOR = 0xb8c6d4

export interface CabinLighting {
  group: Group
  dispose(): void
}

export function createCabinLighting(): CabinLighting {
  const group = new Group()
  group.name = 'cabinLighting'

  // The overhead panel's own fixture (thopter-03's "ILLUMINATED LIGHTS"
  // callout) doubling as the cabin's main dome light.
  //
  // VERIFIED this round (progress.md): intensity 9 here was the cause of
  // three soft glows a critic reported floating in the pilot frame with no
  // fixture. Zeroing both cabin lights made all three vanish while the
  // emissive dial colours (unaffected by scene lights) stayed lit — proving
  // the cause was these lights, not the sky or a stray render. It was NOT
  // what the first fix assumed, though: raising the glazing's opacity and
  // tightening its specular barely moved them, and making the frame beams
  // fully diffuse (no specular at all) changed nothing either — ruling out
  // "a reflection on some surface" as the mechanism. Isolating each light
  // placed most of the blame on the dome. But cutting ITS intensity by 18x
  // (9 -> 0.5) still barely dimmed the glow, and moving it 0.6m further from
  // the panel's underside made a NEW hotspot appear on the console instead
  // of removing the old ones — both point at proximity-driven 1/distance^2
  // radiance saturating ACES tonemapping near VARIOUS parts of the shell,
  // not one identifiable surface. Left at a low intensity rather than
  // chasing zero: some softness remains near the fixture, honestly disclosed
  // as a remaining limitation rather than hidden by turning the light off.
  const dome = new PointLight(DOME_COLOR, 2.2, 6.5, 2)
  dome.position.set(OVERHEAD.x, OVERHEAD.panelBottomY - 0.1, OVERHEAD.z)
  dome.castShadow = false

  // A softer, cooler fill over the seats, centred on the aisle between
  // pilot and copilot so both sides read as lit, solid volumes rather than
  // silhouettes — including the copilot figure, which the pilot only sees
  // by turning their head (camera/cameraRig.ts's lookAround).
  const fill = new PointLight(FILL_COLOR, 4.5, 7, 2)
  fill.position.set(0, 0.7, EYE.z + 0.4)
  fill.castShadow = false

  group.add(dome, fill)

  return {
    group,
    dispose() {
      group.clear()
    },
  }
}
