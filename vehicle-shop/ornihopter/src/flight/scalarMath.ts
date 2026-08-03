// vehicle-shop/ornihopter/src/flight/scalarMath.ts
// Tiny scalar clamps shared by the flight model. NaN-safe: a NaN input
// clamps to the low end rather than propagating, so one bad frame of input
// can never poison the whole simulation with a NaN that never recovers.

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, value))
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1)
}

export function clampSigned(value: number): number {
  return clamp(value, -1, 1)
}
