// landscape-shop/cliff/src/model/socketTone.ts
// How dark the inside of the gate is, point by point.
//
// R1.3 painted every interior face one flat unlit near-black and the critic
// read "a painted-on hole". R1.4, R1.5 and R2 each added a measurable
// gradient and each critic still read a black cutout — R2's words were "flat,
// gradientless black — no reflected light, no floor visible".
//
// R2.1 stopped guessing where the light should go and MEASURED where the
// mouth actually is. tools/probe.mjs sweeps the landing PNG in world height,
// and it says the aperture's visible interior runs from y = 1 (the inner
// lip's own bottom edge) up to y = 25. Every previous pass put its brightest
// zone at y = 0 to 6 — a band that is almost entirely BEHIND the lip and the
// sand — and faded it out by y = 16, spending the rest on wall a person
// cannot see into. So the void is authored as three things, all placed where
// the sweep says the pixels are:
//
//   A WARM FLOOR BAND, full strength from the lip's bottom to about y = 7 and
//   broken off by y = 12.6. It is not merely lighter, it is ORANGE — mixed
//   toward reflected sand rather than scaled up from rock — and warmth reads
//   as light at a luminance darkness would otherwise own. Measured on the
//   shot it renders about 40-52 of 255 over an 80-pixel strip.
//
//   A DARK ROOF above the break, at the unlit DEEP end: about 10 of 255.
//   Floor against roof is the contrast that says "shaft".
//
//   CHISELLED FLUTES, quantized into steps, so the jamb carries tool marks
//   with edges rather than one more smooth wash.
//
// Depth falloff runs under all three: the back of the shaft keeps a share of
// the mouth's tone, so the passage goes somewhere.

import { BufferAttribute, Color, DoubleSide, MeshBasicMaterial, SRGBColorSpace } from 'three'
import type { BufferGeometry } from 'three'

/** The mouth plane and the back of the shaft, in world z. */
export interface SocketDepth {
  frontZ: number
  backZ: number
}

// The two ends of the interior's own colour scale, as DISPLAYED 0-255 values.
// DEEP is the unlit far end of the shaft; BOUNCE is sand-light landing on the
// sill. BOUNCE measures 0.235 relative luminance and its red/blue ratio of
// 2.8 is what makes it read as reflected desert rather than as grey rock
// turned up. The ceiling on it is the rock AROUND the mouth, which R2.1's
// banding brought up to a measured 69-83 of 255 in the landing frame: the
// brightest interior pixel renders near 55, so the void stays unmistakably
// the darkest thing in the shot.
const DEEP = [10, 8, 7]
const BOUNCE = [86, 55, 31]

// Fraction of the mouth's tone still alive at the back of the shaft.
//
// 0.42 -> 0.70, and this is the change that actually put a floor in the
// frame. R2's mouth rendered 36, 32, 31, 29, 24, 19, 15, 11 of 255 from y = 2
// upward — a smooth dark ramp with nothing in it a person would call a floor.
// Nearly all of the area a person can see into is DEEP in the recess (the
// seal and the back of the funnel), so it was the depth falloff, not the sill
// colour, that was holding the read down.
const BACK_SHARE = 0.7

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

// Where the bounce stops climbing the wall. The line is BROKEN — it wanders
// about 2.3 m across the mouth's width — because a lit floor's upper edge is
// where the light stops reaching, and that follows the rock's own steps, not
// a ruled line. CEILING is fixed and hard: above it there is no bounce at any
// x, which is what keeps the roof unmistakably dark whatever the line does.
const LIP_Y = 9.2
const CEILING_Y = 12.6

function bounceLip(x: number): number {
  return Math.min(CEILING_Y - 1.4, LIP_Y + 1.4 * Math.sin(x * 0.42 + 0.9) + 0.9 * Math.sin(x * 0.17 - 2.1))
}

/** How much sand-bounce reaches (x, y, z), 0 to 1 — the field every interior
 *  surface shares. A pure function of world position, which is what keeps it
 *  continuous across the rings the chamfer, jamb, shaft, seal and sill meet
 *  at: two meshes touching at a ring read the same numbers there, so no ring
 *  edge can show. */
export function interiorTone(x: number, y: number, z: number, depth: SocketDepth): number {
  const into = Math.min(1, Math.max(0, (z - depth.frontZ) / (depth.backZ - depth.frontZ)))
  const byDepth = 1 - (1 - BACK_SHARE) * into
  // Up: bounce holds at full strength over the whole floor band a person can
  // actually see into (y = 1 to about 7), then breaks off. R2's first pass
  // faded it from y = 4 to y = 16, which spent the brightness on rock above
  // the sight line and left the visible band at two thirds. Down: it dies
  // again below the throat's own lower rim, so what shows under the sill is a
  // slot and not a lit surface.
  const overhead = 1 - smoothstep(bounceLip(x), CEILING_Y, y)
  const underSill = smoothstep(-8, -3, y)
  // CHISELLED, not rippled: quantized into four steps, so the jamb carries
  // tool marks with edges instead of one more smooth wash.
  const chisel = 0.5 + 0.5 * Math.sin(x * 0.55 + y * 0.08)
  const flute = 1 - 0.17 * (Math.round(chisel * 3) / 3)
  return Math.min(1, Math.max(0, byDepth * overhead * underSill * flute))
}

/** Unlit, so a self-shadowed facet and a directly-lit one come out
 *  identically: the tone is the geometry's own, never the sun's. */
export function interiorMaterial(): MeshBasicMaterial {
  return new MeshBasicMaterial({ vertexColors: true, side: DoubleSide })
}

/** Bakes `interiorTone` onto a finished interior lattice as vertex colours.
 *  Written through SRGBColorSpace so the numbers above are the DISPLAYED
 *  values, not linear ones — a 5% linear value would render at 24%. */
export function paintInterior(geometry: BufferGeometry, depth: SocketDepth): void {
  const position = geometry.attributes.position
  const colors = new Float32Array(position.count * 3)
  const color = new Color()
  for (let i = 0; i < position.count; i++) {
    const tone = interiorTone(position.getX(i), position.getY(i), position.getZ(i), depth)
    const channel = (k: number): number => (DEEP[k] + (BOUNCE[k] - DEEP[k]) * tone) / 255
    color.setRGB(channel(0), channel(1), channel(2), SRGBColorSpace)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3))
}
