// src/data/regionAdjacency.ts
// Which regions border which. Authored rather than derived from geometry so
// the designer controls connectivity — Arrakis is not a Voronoi diagram, and
// the shape of the map is a pacing decision.
//
// Adjacency is used to gate travel: without a long-range ornithopter the
// player may only reach the current region and its neighbours.

export const REGION_ADJACENCY: Readonly<Record<string, readonly string[]>> = {
  // Southern sietch country — where the player starts.
  sietch_tabr: ['red_wall_sietch', 'cielago_depression', 'tsimpo'],
  red_wall_sietch: ['sietch_tabr', 'hagg', 'tsimpo'],
  cielago_depression: ['sietch_tabr', 'tsimpo', 'carthag'],

  // The central corridor, linking south to north.
  tsimpo: ['sietch_tabr', 'red_wall_sietch', 'cielago_depression', 'arrakeen'],
  arrakeen: ['tsimpo', 'hagg', 'carthag', 'imperial_basin'],

  // Northern holdings.
  hagg: ['red_wall_sietch', 'arrakeen'],
  carthag: ['cielago_depression', 'arrakeen', 'imperial_basin'],
  imperial_basin: ['arrakeen', 'carthag'],
}
