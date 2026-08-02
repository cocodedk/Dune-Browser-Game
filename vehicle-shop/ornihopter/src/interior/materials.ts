// vehicle-shop/ornihopter/src/interior/materials.ts
// The cockpit's palette. Every function returns a fresh instance so each part
// module owns and disposes exactly what it created; nothing here is a shared
// singleton.
//
// FOUND, round 6b, by a critic sampling the capture: "every interior surface
// samples 3-23/255... no mid-tone metal anywhere", and separately "modern-UI
// mint/salmon where the reference is desaturated military amber, red and olive
// on grey-green machined metal". Both were true and they had different causes.
//
// The crush was not only lighting. The old structural tones were 0x2b2e33 and
// 0x24262a — 36-51/255 BEFORE any light reaches them, in a cabin that sits in
// the hull's own shadow (main.ts casts the hull and the canopy into the shadow
// map). A surface that dark in shade cannot land above single digits whatever
// the fill does. The tones below are mid-tone by construction: 95-145/255 on
// the structure, so shading has somewhere to fall FROM and the facets read.
//
// The saturation was the accents. 0x4caf60 and 0xc94a3a at emissiveIntensity
// 1.4 are UI chips, not instruments. .shots/reference/thopter-03.jpg's
// "ILLUMINATED LIGHTS" inset is a grey-green machined plate carrying muted
// amber, dull red, ivory and olive tiles — lit, but not glowing. The lit
// materials below keep their emissive, since an unlit annunciator is not an
// annunciator, at a quarter of the old intensity and on desaturated hues.
//
// DoubleSide on every material here is load-bearing, not cosmetic: these are
// single-thickness plates and the pilot sits on the inside of all of them.
// Round 6a's liner panels were FrontSide, so whichever way a quad's winding
// happened to face decided whether the cabin had a wall there at all — and
// interior/enclosure.test.ts's raycast honours `side` exactly as the renderer
// does, so a backface reads as a hole in both.

import { MeshStandardMaterial, DoubleSide, type Texture } from 'three'

const COLOR = {
  /** Grey-green machined plate — the cabin's structural tone. */
  machined: 0x86927f,
  machinedDark: 0x596053,
  /** Roof and bulkhead liner, a shade cooler and lighter than the frames. */
  liner: 0x77857a,
  /** Anodised black-green for frames, rails and mullions. */
  frame: 0x414a3f,
  seatKhaki: 0x8a7f66,
  seatKhakiDark: 0x5c5545,
  /** ROUND 9d. Retinted off olive-grey (was 0x616d5f/0x454e44) toward the
   *  dark equipment family below: a critic named the cabin "uniformly warm
   *  sage-olive... no separation between inside and out". crewPalette.test.ts
   *  holds the ratio against the olive structure tones. */
  consoleBody: 0x5a5e60,
  consoleFace: 0x373a3c,
  figureSuit: 0x6b7566,
  figureSkin: 0xc79a72,
  figureHelmet: 0x2a2e2b,
  /** Desaturated military accents. Amber first: the reference's dominant
   *  instrument colour, closer to brass than to orange. */
  amber: 0xb98b3f,
  red: 0x9c4638,
  olive: 0x77733f,
  ivory: 0xcfc8b2,
  dialFace: 0x2b2e29,
  /** ROUND 9b. The glass cockpit's own carrier tone. The AH-64E crew station
   *  is a DARK panel hung inside a lighter airframe, and that contrast is
   *  half of what reads as "modern glass cockpit" before a single screen
   *  lights up — charcoal with tone left in it (round 6b's crush lesson: a
   *  surface below ~40/255 before any light reaches it renders as black). */
  panelCarrier: 0x33383b,
  bezel: 0x3d4347,
  key: 0x565c60,
  /** ROUND 9d. The armored-tub family: coaming, side sills, seat frames —
   *  the surfaces a body sits down inside of. Near-black and desaturated,
   *  per the AH-64E reference's "dark grey/black equipment... against olive
   *  structure"; crewPalette.test.ts measures the ratio. */
  armor: 0x252729,
} as const

function standard(
  color: number,
  roughness: number,
  metalness: number,
  emissive?: number,
  emissiveIntensity = 0.35
) {
  return new MeshStandardMaterial({
    color,
    roughness,
    metalness,
    side: DoubleSide,
    emissive: emissive ?? 0x000000,
    emissiveIntensity: emissive ? emissiveIntensity : 0,
  })
}

export const gunmetalMaterial = () => standard(COLOR.frame, 0.62, 0.5)
export const machinedMaterial = () => standard(COLOR.machined, 0.7, 0.35)
export const machinedDarkMaterial = () => standard(COLOR.machinedDark, 0.72, 0.4)
export const hullLinerMaterial = () => standard(COLOR.liner, 0.86, 0.18)
export const seatMaterial = () => standard(COLOR.seatKhaki, 0.92, 0)
export const seatDarkMaterial = () => standard(COLOR.seatKhakiDark, 0.92, 0)
export const consoleBodyMaterial = () => standard(COLOR.consoleBody, 0.68, 0.35)
export const consoleFaceMaterial = () => standard(COLOR.consoleFace, 0.55, 0.4)
/** The tub/armor tone: coaming, side sills, seat frames. See COLOR.armor. */
export const armorMaterial = () => standard(COLOR.armor, 0.6, 0.3)
export const figureSuitMaterial = () => standard(COLOR.figureSuit, 0.88, 0)
export const figureSkinMaterial = () => standard(COLOR.figureSkin, 0.8, 0)
export const figureHelmetMaterial = () => standard(COLOR.figureHelmet, 0.45, 0.5)
export const stickGripMaterial = () => standard(0x33372f, 0.85, 0.15)

export const amberLitMaterial = () => standard(COLOR.amber, 0.5, 0.15, COLOR.amber)
export const redLitMaterial = () => standard(COLOR.red, 0.5, 0.15, COLOR.red)
export const oliveMaterial = () => standard(COLOR.olive, 0.7, 0.2)
export const ivoryMaterial = () => standard(COLOR.ivory, 0.6, 0.1)

/** The overhead panel's under-lit strip — the one detail round 6's critic
 *  credited as already matching the reference. Kept warm and kept emissive;
 *  only the intensity comes down, in step with everything else. */
export const stripLightMaterial = () => standard(0xffd9a0, 0.35, 0, 0xffc98a, 0.9)

/** Dial/switch bezel: unlit and dark, so the lit faces read as switched-on
 *  against it rather than everything glowing equally. */
export const darkDialMaterial = () => standard(COLOR.dialFace, 0.45, 0.25)

/**
 * A gauge face carrying one of dialFaces.ts's DataTextures. Emissive uses the
 * SAME map, so the dial's own printed markings light up rather than a flat
 * wash sitting behind them — which is how an instrument reads lit without
 * turning into a glowing tile.
 */
export function dialFaceMaterial(map: Texture): MeshStandardMaterial {
  return new MeshStandardMaterial({
    map,
    emissiveMap: map,
    emissive: 0xffffff,
    emissiveIntensity: 0.28,
    roughness: 0.55,
    metalness: 0.05,
    side: DoubleSide,
  })
}

/** Round 9b's glass-cockpit trio: the dark carrier the whole panel is hung on,
 *  the harder bezel each MFD sits in, and the keys around it. Deliberately
 *  three near tones rather than one — a bezel that is exactly its carrier's
 *  colour is invisible, and B2 asks for keys a critic can COUNT. */
export const panelCarrierMaterial = () => standard(COLOR.panelCarrier, 0.66, 0.3)
export const bezelMaterial = () => standard(COLOR.bezel, 0.52, 0.45)
export const keyMaterial = () => standard(COLOR.key, 0.6, 0.35)

/**
 * An MFD screen. Same map-as-emissiveMap trick as dialFaceMaterial, at nearly
 * twice the intensity: a dial is a printed face catching cabin light, a
 * multifunction display is the thing generating it. Held below 1 on purpose —
 * see mfdFaces.ts on B3's "exactly one region above luminance 215".
 */
export function screenMaterial(map: Texture): MeshStandardMaterial {
  return new MeshStandardMaterial({
    map,
    emissiveMap: map,
    emissive: 0xffffff,
    emissiveIntensity: 0.62,
    roughness: 0.3,
    metalness: 0.0,
    side: DoubleSide,
  })
}

/**
 * The inner windscreen pane. The canopy's own glazing (canopyGeometry.ts) is
 * a tint on the OUTSIDE of the deck; this is the cabin-side pane inside the
 * same reveal, and the two stack along the pilot's own sightline.
 *
 * ROUND 9a, "the pilot cannot see out" (Q3 interior critic, 3/10): forwardCone
 * proved the geometry already correct — the central cone hits glazing edge to
 * edge — but PERCEPTION was not: the old numbers here (a dark 0x334039 tint at
 * opacity 0.1) stacked behind the exterior's old 0.34 rendered a sightline
 * pixel of ~114-124, indistinguishable from the 117-125 cabin wall beside it.
 * A ray that hits "glazing" and renders as "wall" is still a wall to the eye.
 *
 * MEASURED: the exterior layer was the dominant loss — this pane's own
 * transmission can never exceed what THAT layer already lets through, however
 * low this opacity goes. It came down too (canopyGeometry.ts's glassMaterial,
 * 0.34 -> 0.14, justified and pixel-proven equivalent there). This layer then
 * spends its own budget on opacity 0.1 -> 0.045 with a PALE cool tint (was
 * dark, near the wall's own hue) rather than a dark one: a light colour
 * blended in at low opacity barely dims what passes through it; a dark one
 * taxes the view twice. A touch of metalness (0 -> 0.08) gives the pane its
 * own faint sheen so it still reads as glass, not an empty hole, once
 * transmission is this high — see innerGlazingTransparency.test.ts.
 */
export const innerGlazingMaterial = () =>
  new MeshStandardMaterial({
    color: 0xcfe6e6,
    roughness: 0.42,
    metalness: 0.08,
    transparent: true,
    opacity: 0.045,
    side: DoubleSide,
    depthWrite: false,
  })
