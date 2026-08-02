// vehicle-shop/harvester/src/crawler/scalarMath.ts
// Tiny scalar helpers shared by the crawler core.

export function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value))
}
