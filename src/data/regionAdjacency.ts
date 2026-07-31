// src/data/regionAdjacency.ts
// Which regions border which. Authored rather than derived from geometry so
// the designer controls connectivity — Arrakis is not a Voronoi diagram, and
// the shape of the map is a pacing decision.
//
// Adjacency is used to gate travel: without a long-range ornithopter the
// player may only reach the current region and its neighbours.

export const REGION_ADJACENCY: Readonly<Record<string, readonly string[]>> = {
  // Southern sietch country — where the player starts.
  sietch_tabr: ['red_wall_sietch', 'cielago_depression', 'tsimpo', 'habbanya_ridge'],
  red_wall_sietch: ['sietch_tabr', 'hagg', 'tsimpo', 'plaster_basin'],
  cielago_depression: ['sietch_tabr', 'tsimpo', 'carthag', 'funeral_plain'],

  // The central corridor, linking south to north.
  tsimpo: ['sietch_tabr', 'red_wall_sietch', 'cielago_depression', 'arrakeen'],
  arrakeen: ['tsimpo', 'hagg', 'carthag', 'imperial_basin', 'old_gap'],

  // Northern holdings.
  hagg: ['red_wall_sietch', 'arrakeen', 'wind_pass'],
  carthag: ['cielago_depression', 'arrakeen', 'imperial_basin'],
  imperial_basin: ['arrakeen', 'carthag', 'bight_of_cliff'],

  // The wider map. Deliberately a ring around the old core rather than a
  // second cluster off to one side: every new region is one step from
  // somewhere the player already knows, so the map grows outward from where
  // they are standing instead of appearing whole.
  habbanya_ridge: ['sietch_tabr', 'funeral_plain', 'plaster_basin', 'cave_of_birds'],
  funeral_plain: ['habbanya_ridge', 'cielago_depression'],
  plaster_basin: ['habbanya_ridge', 'red_wall_sietch', 'wind_pass', 'gara_kulon'],
  wind_pass: ['plaster_basin', 'hagg', 'old_gap'],
  old_gap: ['wind_pass', 'arrakeen', 'bight_of_cliff'],
  bight_of_cliff: ['old_gap', 'imperial_basin', 'great_flat'],

  // The far side. Longitude wraps, so this closes the ring: travelling east
  // from the Bight or west from Habbanya both eventually arrive here, and the
  // map stops being a rectangle with edges.
  great_flat: ['bight_of_cliff', 'sihaya_ridge', 'red_chasm'],
  sihaya_ridge: ['great_flat', 'red_chasm', 'gara_kulon'],
  red_chasm: ['great_flat', 'sihaya_ridge', 'cave_of_birds'],
  cave_of_birds: ['red_chasm', 'gara_kulon', 'habbanya_ridge'],
  gara_kulon: ['sihaya_ridge', 'cave_of_birds', 'plaster_basin'],
}
