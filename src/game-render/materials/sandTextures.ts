// src/game-render/materials/sandTextures.ts
// Procedural wind-ripple normal + packed roughness/AO map for the sand
// material, baked on a canvas at startup — no art pipeline exists here.
// NoColorSpace below is load-bearing: these are DATA, not colour. Ripples
// use an integer wavevector (windWavevector) so a directional bake is
// exactly periodic on the unit square — tileable with no UV rotation, which
// would rotate sampling but not the encoded normal XY, a classic bug.

import { CanvasTexture, LinearMipmapLinearFilter, NoColorSpace, RepeatWrapping, type Texture } from 'three'

export interface RippleFieldOptions {
  windDirection: [number, number] // prevailing wind, world XZ; ripples run perpendicular to it
  frequency: number // wave count of the dominant ripple across one tile
  octaves: number
  persistence: number // amplitude falloff per octave
  leeFraction: number // fraction of wavelength given to the steep lee (downwind) face
}

export const RIPPLE_DEFAULTS: RippleFieldOptions = {
  windDirection: [1, 0.35], frequency: 46, octaves: 3, persistence: 0.55, leeFraction: 0.28,
}

function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123
  return s - Math.floor(s)
}

// Value noise on an integer-period lattice, so it tiles with no seam.
export function periodicNoise(x: number, y: number, period: number): number {
  const wrap = (v: number): number => ((v % period) + period) % period
  const xi = Math.floor(x), yi = Math.floor(y)
  const xf = x - xi, yf = y - yi
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
  const a = hash2(wrap(xi), wrap(yi)), b = hash2(wrap(xi + 1), wrap(yi))
  const c = hash2(wrap(xi), wrap(yi + 1)), d = hash2(wrap(xi + 1), wrap(yi + 1))
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

// Nearest integer wavevector to `wind` at `frequency` cycles/tile — keeps a directional wave exactly tileable.
export function windWavevector(wind: [number, number], frequency: number): [number, number] {
  const len = Math.hypot(wind[0], wind[1]) || 1
  const kx = Math.round((wind[0] / len) * frequency)
  const ky = Math.round((wind[1] / len) * frequency)
  return kx === 0 && ky === 0 ? [Math.max(1, Math.round(frequency)), 0] : [kx, ky]
}

// Long shallow windward rise, short steep lee drop — real aeolian ripples build up slowly and shed fast.
export function rippleWave(phase: number, leeFraction: number): number {
  const t = phase - Math.floor(phase)
  const lee = Math.min(0.9, Math.max(0.05, leeFraction))
  return t < 1 - lee ? t / (1 - lee) : 1 - (t - (1 - lee)) / lee
}

// Octaves of directional ripple plus a touch of noise so the field doesn't read as regular corduroy.
// Not normalized — callers needing [0,1] track min/max across the sampled field themselves.
export function rippleHeight(u: number, v: number, opts: RippleFieldOptions): number {
  let height = 0, amplitude = 1, total = 0
  for (let o = 0; o < opts.octaves; o++) {
    const [kx, ky] = windWavevector(opts.windDirection, opts.frequency * (o + 1))
    height += rippleWave(kx * u + ky * v, opts.leeFraction) * amplitude
    total += amplitude
    amplitude *= opts.persistence
  }
  height /= total || 1
  const noisePeriod = Math.max(4, Math.round(opts.frequency / 6))
  return height + (periodicNoise(u * noisePeriod, v * noisePeriod, noisePeriod) - 0.5) * 0.18
}

export function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x))
}

// Central-difference height gradient to a tangent-space unit normal.
export function heightToNormal(
  left: number, right: number, down: number, up: number, strength: number,
): [number, number, number] {
  const dx = (right - left) * strength, dy = (up - down) * strength
  const len = Math.hypot(dx, dy, 1) || 1
  return [-dx / len, -dy / len, 1 / len]
}

// Tangent-space normal to storable [0,1] RGB.
export function encodeNormal(n: [number, number, number]): [number, number, number] {
  return [n[0] * 0.5 + 0.5, n[1] * 0.5 + 0.5, n[2] * 0.5 + 0.5]
}

// Wind-polished crests (height near 1) read smoother than the coarse grain in the
// troughs — the correlation that sells raking light on a dune.
export function rippleRoughness(heightNorm: number, base: number, contrast: number): number {
  return clamp01(base + contrast * (0.5 - heightNorm))
}

// Subtle occlusion in the troughs; crests stay full-bright.
export function rippleAO(heightNorm: number, strength: number): number {
  return clamp01(1 - strength * (1 - heightNorm))
}

export interface SandTextureOptions {
  size?: number // canvas edge length; generated once and cached, not per-frame
  repeat?: number // UV tiling factor applied to both maps
  normalStrength?: number
  roughnessBase?: number
  roughnessContrast?: number
  aoStrength?: number
  ripple?: Partial<RippleFieldOptions>
}

export interface SandTextures {
  normalMap: Texture
  /** R = AO, G = roughness. Bind as both `aoMap` and `roughnessMap` — three reads each
   * channel independently, so one canvas covers both. */
  ormMap: Texture
}

type Resolved = Required<Omit<SandTextureOptions, 'ripple'>> & { ripple: RippleFieldOptions }

const DEFAULT_SIZE = 512
const cache = new Map<string, SandTextures>()

function makeCanvas(size: number): OffscreenCanvas | HTMLCanvasElement | null {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(size, size)
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  return c
}

function finishTexture(tex: Texture, repeat: number): void {
  tex.wrapS = RepeatWrapping
  tex.wrapT = RepeatWrapping
  tex.repeat.set(repeat, repeat)
  tex.colorSpace = NoColorSpace
  tex.generateMipmaps = true
  tex.minFilter = LinearMipmapLinearFilter
  tex.anisotropy = 8 // clamped to the device max by three at upload time
  tex.needsUpdate = true
}

function generate(o: Resolved): SandTextures | null {
  const [normalCanvas, ormCanvas] = [makeCanvas(o.size), makeCanvas(o.size)]
  const nCtx = normalCanvas?.getContext('2d') as CanvasRenderingContext2D | null | undefined
  const oCtx = ormCanvas?.getContext('2d') as CanvasRenderingContext2D | null | undefined
  if (!normalCanvas || !ormCanvas || !nCtx || !oCtx) return null
  const { size } = o
  const texel = 1 / size
  const heights = new Float32Array(size * size)
  let min = Infinity, max = -Infinity
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const h = rippleHeight(x * texel, y * texel, o.ripple)
      heights[y * size + x] = h
      if (h < min) min = h
      if (h > max) max = h
    }
  }
  const range = max - min || 1
  const at = (x: number, y: number): number => heights[((y + size) % size) * size + ((x + size) % size)]

  const nData = nCtx.createImageData(size, size)
  const oData = oCtx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const n = encodeNormal(heightToNormal(at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1), o.normalStrength))
      nData.data.set([n[0] * 255, n[1] * 255, n[2] * 255, 255], i)
      const hn = (heights[y * size + x] - min) / range
      const ao = rippleAO(hn, o.aoStrength) * 255
      const rough = rippleRoughness(hn, o.roughnessBase, o.roughnessContrast) * 255
      oData.data.set([ao, rough, 128, 255], i)
    }
  }
  nCtx.putImageData(nData, 0, 0)
  oCtx.putImageData(oData, 0, 0)
  const normalMap = new CanvasTexture(normalCanvas)
  const ormMap = new CanvasTexture(ormCanvas)
  finishTexture(normalMap, o.repeat)
  finishTexture(ormMap, o.repeat)
  return { normalMap, ormMap }
}

// Generated once per option set and cached at module scope — not per material instance.
// Returns null headlessly (no canvas/2d context, e.g. Vitest/SSR); callers skip the maps.
export function getSandTextures(options: SandTextureOptions = {}): SandTextures | null {
  const resolved: Resolved = {
    size: options.size ?? DEFAULT_SIZE,
    repeat: options.repeat ?? 180,
    normalStrength: options.normalStrength ?? 2.2,
    roughnessBase: options.roughnessBase ?? 0.85,
    roughnessContrast: options.roughnessContrast ?? 0.3,
    aoStrength: options.aoStrength ?? 0.25,
    ripple: { ...RIPPLE_DEFAULTS, ...options.ripple },
  }
  const key = JSON.stringify(resolved)
  const cached = cache.get(key)
  if (cached) return cached
  const result = generate(resolved)
  if (result) cache.set(key, result)
  return result
}
