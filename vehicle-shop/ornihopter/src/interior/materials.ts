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
  consoleBody: 0x616d5f,
  consoleFace: 0x454e44,
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

/**
 * The inner windscreen pane. The canopy's own glazing (canopyGeometry.ts) is
 * a 0.6-opacity tint on the OUTSIDE of the deck; this is the cabin-side pane
 * inside the same reveal. Two layers is what gives the measurable brightness
 * step a critic could not find from inside — "sky through the canopy is
 * identical to sky at the open top of frame" — without reaching into the
 * exterior module to darken a surface the hull round already signed off.
 */
export const innerGlazingMaterial = () =>
  new MeshStandardMaterial({
    color: 0x334039,
    // TWO measurements set these numbers, in opposite directions.
    // (1) Built at roughness 0.18, the pane is nearly horizontal and the pilot
    //     looks ALONG it at about 15 degrees, so it answered with a full-width
    //     grazing specular sheen: sky through it measured 183.1 against 188.4
    //     for bare sky, a 2.8% step — the critic's "sky through the canopy is
    //     identical to sky at the open top of frame" all over again, made by
    //     the glass rather than by its absence. Rough and non-metallic tints;
    //     shiny mirrors.
    // (2) Then at opacity 0.55 it went the other way: the window measured 45,
    //     against 125 for the cabin wall beside it — a window darker than its
    //     own wall, which is not a window. Isolating the layers (this pane at
    //     0.05) showed the EXTERIOR canopy glazing alone already takes 188 down
    //     to 74-120, so nearly all the tint budget is spent before this pane
    //     sees the light at all. The exterior's own opacity came down to 0.34
    //     as a result (canopyGeometry.ts, justified there); 0.1 is what is
    //     left for this layer to spend without undoing that.
    roughness: 0.62,
    metalness: 0,
    transparent: true,
    opacity: 0.1,
    side: DoubleSide,
    depthWrite: false,
  })
