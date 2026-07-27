// src/game-render/terrain/polygon.ts
// PURE point-in-polygon test, carried over from the retired Phaser
// TerritoryZones layer. Stage 03's territory overlay needs the same maths
// against terrain UV space, so it lives here with tests rather than buried in
// a renderer.

export type Vertex = readonly [number, number]

/**
 * Ray-casting point-in-polygon test.
 *
 * Counts crossings of a ray cast along +x from the point; an odd count means
 * inside. Handles concave polygons, which the territory shapes are.
 *
 * Points exactly on an edge are not guaranteed either way — that is inherent
 * to the algorithm and fine here, since a click landing precisely on a border
 * pixel may resolve to either neighbouring region.
 */
export function pointInPolygon(x: number, y: number, vertices: readonly Vertex[]): boolean {
  const n = vertices.length
  if (n < 3) return false // A line or a point encloses nothing.

  let inside = false
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = vertices[i]
    const [xj, yj] = vertices[j]

    // The half-open comparison (yi > y) !== (yj > y) is what stops a vertex
    // lying exactly on the ray from being counted twice.
    const straddles = yi > y !== yj > y
    if (!straddles) continue

    const intersectX = ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (x < intersectX) inside = !inside
  }
  return inside
}
