// vehicle-shop/ornihopter/src/interior/lighting.ts
// Cabin fill lighting. main.ts forces castShadow on every opaque mesh under
// the craft root, so the hull throws the cabin into its own shadow and the
// scene's sun cannot reach it; stage/scene.ts's HemisphereLight is not
// shadow-mapped and does reach, but alone it read as near-total black
// silhouette. These are the lights that make the cockpit legible.
//
// FIXED AT CAUSE, round 6b — THE TWO SUNS. A critic pixel-sampling the pilot
// capture found "TWO SUNS — two near-identical soft discs, peaks at (765,233)
// and (966,452)". There is exactly one light in the scene that can make a disc
// (stage/scene.ts's DirectionalLight), and at the craft's heading it sits
// BEHIND the craft — so both discs were fakes, and they were made here.
//
// The previous round chased this by intensity and by position and could not
// kill it: cutting the dome 18-fold "still barely dimmed the glow", and moving
// it made a NEW hotspot appear elsewhere. That is the signature of the actual
// mechanism, which is neither intensity nor placement but DECAY. three's
// getDistanceAttenuation (three.module.js, lights_pars_begin) computes
// `1 / max(pow(lightDistance, decay), 0.01)`, so a decay-2 point light 0.15m
// off a liner panel multiplies its own intensity by 44 at that spot. ACES
// tonemapping rolls anything that bright to white, and a white blob with a
// soft edge IS a sun. Any fix that keeps decay 2 can only move the blob.
//
// decay 0 removes the inverse-square term entirely — pow(d, 0) is 1 — while
// keeping the cutoff window, so the light still stops at `distance` and still
// does not leak into the desert. The cabin gets an even fill with no hotspot
// anywhere, at any distance, by construction rather than by tuning.

import { Group, PointLight } from 'three'
import { OVERHEAD, EYE, CONSOLE } from './layout'

// MEASURED, round 6b: with the dome at 0xffdca8 and the wash at 0xd8c090, on
// top of stage/scene.ts's sand-coloured HemisphereLight, every interior sample
// came back R > G > B by 30-40 counts — (121,112,80), (110,101,74),
// (86,79,54). The palette says grey-green machined plate; the frame read
// beige, because three warm sources were multiplying a green albedo. The dome
// keeps a little warmth (it is a tungsten fixture), the fill is properly cool,
// and the instrument wash is near-neutral, so the metal's own hue survives.
const DOME_COLOR = 0xfff0dc
const FILL_COLOR = 0x9fc0cc
const PANEL_COLOR = 0xe8ecdc

/** Flat within its radius, off outside it: see the header. Never raise this
 *  above 0 without re-capturing the pilot frame and counting the discs. */
const NO_FALLOFF = 0

export interface CabinLighting {
  group: Group
  dispose(): void
}

export function createCabinLighting(): CabinLighting {
  const group = new Group()
  group.name = 'cabinLighting'

  // The overhead panel's own fixture (thopter-03's "ILLUMINATED LIGHTS"
  // callout) doubling as the cabin's dome light.
  const dome = new PointLight(DOME_COLOR, 1.15, 5.5, NO_FALLOFF)
  dome.position.set(OVERHEAD.x, OVERHEAD.panelBottomY - 0.15, OVERHEAD.z)
  dome.castShadow = false

  // A cooler fill over the seats, centred on the aisle between pilot and
  // copilot so both sides read as lit volumes rather than silhouettes —
  // including the copilot figure, which the pilot only sees by turning their
  // head (camera/cameraRig.ts's lookAround).
  const fill = new PointLight(FILL_COLOR, 0.85, 6.5, NO_FALLOFF)
  fill.position.set(0, EYE.y + 0.35, EYE.z + 0.5)
  fill.castShadow = false

  // MEASURED, and why the seat fill came back down to 0.85 from 1.5: at 1.5
  // the port wall rendered at 125/255 while sky through the canopy rendered at
  // 74-120, so the cabin was BRIGHTER than the daylight outside it and the
  // window read as a dark panel among light ones. The reference is a cave with
  // one bright aperture. Dimming the cabin is the half of that contrast this
  // module owns; the other half is the canopy's own tint, which belongs to the
  // exterior and is named as a remaining gap rather than reached into.

  // Instrument wash: the light a dash gives back off its own faces. Kept low
  // and short-range so it lifts the console and the coaming out of the crush
  // the critic measured (3-23/255) without washing the roof.
  const panelWash = new PointLight(PANEL_COLOR, 0.85, 2.6, NO_FALLOFF)
  panelWash.position.set(-0.2, CONSOLE.topY + 0.55, CONSOLE.nearZ - 0.3)
  panelWash.castShadow = false

  group.add(dome, fill, panelWash)

  return {
    group,
    dispose() {
      group.clear()
    },
  }
}
