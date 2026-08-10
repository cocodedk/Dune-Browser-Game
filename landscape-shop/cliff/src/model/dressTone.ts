// landscape-shop/cliff/src/model/dressTone.ts
// What colour R3's dressing is. Three families, three different jobs, one
// palette — spec.ts's. No feedstock colour reaches this set at all
// (model/dressing.ts reads positions only), so every value here is authored.
//
// The whole round is spent NOT breaking two locked reads: the massif's
// silhouette and the mouth's darkness. That is a colour problem more than a
// placement one, and the numbers below are set against MEASURED pixels from
// the R2.1 landing frame rather than chosen:
//
//   the open ground in front of the wall renders a dead-flat 87 of 255
//   the rock at the wall foot renders 73, ranging 41 to 88
//   the mouth's interior renders 9 to 50, and must stay the darkest thing
//
// So the sand is authored at the ground's own colour and reads by shape alone,
// the standing stones are varnished down to about a hundred, and the goods sit
// between the mouth's floor band and its roof — darker than the floor they
// stand on, lighter than the shaft behind them, visible from either side and
// bright from neither.

import { BufferAttribute, Color, SRGBColorSpace } from 'three'
import type { BufferGeometry, Mesh, Object3D } from 'three'
import { hexRgb, mix, type Rgb } from './rockRamp'
import { PALETTE } from '../spec'
import { bandColorAt, beddingHeightAt, HERO_PLANE } from './strata'
import { leewardness, type Point } from './weathering'
import { useVertexColors } from './paintRock'
import { pieceIndexFor } from './dressing'

// LOOSE is PALETTE.sandApron EXACTLY — the ground's own colour. Deliberate:
// the drifts and the gate banks are the same sand as the desert they stand on,
// so they read by SHAPE (a slope takes the low key light more squarely than
// flat ground and comes back about seven levels up) and their edges have
// nothing to draw a border with. A sand mound that also changed colour would
// outline itself against the ground, which is the one thing R3 must not do at
// the foot of a locked silhouette.
const LOOSE = hexRgb(PALETTE.sandApron)
// Fallen rock is fresher than the wall it left, exactly as model/weathering.ts
// paints the scars above it — the same target colour, at less than half the
// strength, because a 3 m block at the foot is a detail and a 40 m scar is a
// form.
const FRESH = hexRgb(0xcdbf9f)
const FOOT_SAND = hexRgb(0xbb9a6e)
// DESERT VARNISH, model/weathering.ts's own value. The markers get it and the
// fallen rock does not, and that is the whole difference between them: a stone
// somebody stood up generations ago has a manganese patina, and rock that came
// off the wall last season has none. It is also what stops the markers being
// the brightest thing in the frame — they are the only pieces in the set with
// faces square to a key light that rakes in from +X, and a first pass measured
// their lit facets at 169 of 255 against a wall at 73. Varnished they land
// near 100: a sunlit stone, not a tooth.
const VARNISH = hexRgb(0x241a10)
// The goods, as DISPLAYED values. Sides against the mouth's 43-50 floor band;
// tops against its 9-15 roof. Nothing here reaches the 69-83 of the rock
// outside, so the mouth stays the darkest thing in the frame.
// R3.1 lifted the TOPS by three levels and left the sides where they were.
// Two of the three R3 critics read the stack as "too tiny and low-contrast to
// confirm as human use": against the seal behind it at a measured 33 of 255 a
// side at 24 and a top at 38 give the silhouette barely six levels to work
// with. Widening the stack's OWN range — dark side, lighter top — is what
// makes it read as objects with faces rather than as a smudge, and it spends
// nothing at the bottom, where the sides still sit well under the 41 of the
// floor they stand on. The ceiling is dressingR3.test.ts's 0.175.
const GOODS_SIDE = hexRgb(0x1d1812)
const GOODS_TOP = hexRgb(0x322819)

const FRESH_PIECES = new Set(['scarFallWest', 'scarSpillWest', 'scarFallEast', 'scarSpillFlank'])

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

function scale(c: Rgb, k: number): Rgb {
  return [c[0] * k, c[1] * k, c[2] * k]
}

function write(colors: Float32Array, at: number, rgb: Rgb, scratch: Color): void {
  scratch.setRGB(clamp01(rgb[0]), clamp01(rgb[1]), clamp01(rgb[2]), SRGBColorSpace)
  colors[at] = scratch.r
  colors[at + 1] = scratch.g
  colors[at + 2] = scratch.b
}

/** A fallen or standing block, in the formation's own geology. It reads the
 *  HERO bedding like everything else procedural in the set (model/surface.ts),
 *  so a 3 m stone at the foot is the same rock as the 190 m wall behind it. */
function rockTone(p: Point, n: Point, fresh: number): Rgb {
  let c = bandColorAt(beddingHeightAt(HERO_PLANE, p.x, p.y, p.z))
  c = mix(c, VARNISH, 0.58 * (1 - fresh))
  c = scale(c, 1 - 0.3 * Math.pow(clamp01(-n.y), 1.3))
  c = scale(c, 1 - 0.14 * leewardness(n))
  // Sand laps the bottom of anything standing on the desert floor. Capped and
  // SHORT (it is gone by 2.2 m) — model/weathering.ts's own drift term runs to
  // y = 24, which on a 3 m stone would bury the whole thing and leave four
  // sand-coloured lumps where four stones were meant to be.
  c = mix(c, FOOT_SAND, 0.34 * (1 - smoothstep(0.2, 2.2, p.y)))
  return scale(mix(c, FRESH, 0.34 * fresh), 1 + 0.08 * fresh)
}

/** Sand, with a small lift toward the crest of a drift: the top of a dune is
 *  dry, sorted and pale, its foot is not. */
function sandTone(p: Point): Rgb {
  return scale(LOOSE, 1 + 0.055 * smoothstep(0.5, 8, p.y))
}

/** Unlit cargo. Up-facing faces catch the daylight coming in at the aperture,
 *  and that is the only light in here — so the tone is a pure function of how
 *  far the face looks up, with a touch more on the faces turned out toward the
 *  mouth so the stack has a front. */
function goodsTone(n: Point): Rgb {
  const sky = Math.pow(clamp01(n.y), 0.8)
  return scale(mix(GOODS_SIDE, GOODS_TOP, sky), 1 + 0.18 * clamp01(-n.z))
}

function faceAt(position: BufferAttribute, base: number): { p: Point; n: Point } {
  const at = (get: (i: number) => number): number => (get(base) + get(base + 1) + get(base + 2)) / 3
  const p = {
    x: at((i) => position.getX(i)), y: at((i) => position.getY(i)), z: at((i) => position.getZ(i)),
  }
  const e = (k: number, get: (i: number) => number): number => get(base + k) - get(base)
  const a = [e(1, (i) => position.getX(i)), e(1, (i) => position.getY(i)), e(1, (i) => position.getZ(i))]
  const b = [e(2, (i) => position.getX(i)), e(2, (i) => position.getY(i)), e(2, (i) => position.getZ(i))]
  const raw = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
  const length = Math.hypot(raw[0], raw[1], raw[2]) || 1
  return { p, n: { x: raw[0] / length, y: raw[1] / length, z: raw[2] / length } }
}

/** Per-FACE, for the two flat-shaded families: one flat colour on a flat
 *  facet, the same rule model/paintRock.ts applies to the massif. */
function paintFlat(geometry: BufferGeometry, colorAt: (p: Point, n: Point, t: number) => Rgb): void {
  const position = geometry.attributes.position as BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const scratch = new Color()
  for (let t = 0; t * 3 < position.count; t++) {
    const { p, n } = faceAt(position, t * 3)
    const rgb = colorAt(p, n, t)
    for (let k = 0; k < 3; k++) write(colors, (t * 3 + k) * 3, rgb, scratch)
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3))
}

function find(root: Object3D, name: string): Mesh {
  const mesh = root.getObjectByName(name) as Mesh | null
  if (!mesh) throw new Error(`dressTone: ${name} is missing from the set`)
  return mesh
}

export function paintDressing(root: Object3D): void {
  const rock = find(root, 'dressRock')
  const rockPiece = pieceIndexFor('rock')
  paintFlat(rock.geometry, (p, n, t) => rockTone(p, n, FRESH_PIECES.has(rockPiece[t]) ? 1 : 0))
  useVertexColors(rock)

  const goods = find(root, 'dressGoods')
  paintFlat(goods.geometry, (_p, n) => goodsTone(n))
  useVertexColors(goods)

  const sand = find(root, 'dressSand')
  const position = sand.geometry.attributes.position as BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const scratch = new Color()
  for (let i = 0; i < position.count; i++) {
    write(colors, i * 3, sandTone({
      x: position.getX(i), y: position.getY(i), z: position.getZ(i),
    }), scratch)
  }
  sand.geometry.setAttribute('color', new BufferAttribute(colors, 3))
  useVertexColors(sand)
}
