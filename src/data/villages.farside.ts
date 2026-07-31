// src/data/villages.farside.ts
// Settlements on the hemisphere you cannot see from the opening camera.

import type { Village } from '../types'

export const FAR_SIDE_VILLAGES: Village[] = [
  // --- The far side --------------------------------------------------------
  //
  // Past 90 degrees of longitude: the hemisphere you cannot see from the
  // opening camera. All undiscovered, and all far enough that a foot crew will
  // never reach one — this is what a long-range ornithopter is *for*, and the
  // first reason the far side of the globe has ever been worth turning to.
  //
  // Canvas coordinates run outside the original 800x500 box on purpose. That
  // box was a flat map of one region; the projection turns it into longitude,
  // and longitude wraps.
  {
    id: 'great_flat',
    kind: 'sietch',
    discovered: false,
    regionId: 'great_flat',
    name: 'The Great Flat',
    position: { x: 1200, y: 250 },
    population: 90,
    spice: 3,
    loyalty: 20,
    owner: 'neutral',
    status: 'neutral',
    productionRate: 0.6,
  },
  {
    id: 'sihaya_ridge',
    kind: 'sietch',
    discovered: false,
    regionId: 'sihaya_ridge',
    name: 'Sihaya Ridge',
    position: { x: 1430, y: 120 },
    population: 300,
    spice: 16,
    loyalty: 62,
    owner: 'fremen',
    status: 'neutral',
    productionRate: 1.7,
  },
  {
    id: 'red_chasm',
    kind: 'sietch',
    discovered: false,
    regionId: 'red_chasm',
    name: 'Red Chasm',
    position: { x: 1650, y: 370 },
    population: 240,
    spice: 22,
    loyalty: 40,
    owner: 'fremen',
    status: 'neutral',
    productionRate: 1.9,
  },
  {
    id: 'cave_of_birds',
    kind: 'sietch',
    discovered: false,
    regionId: 'cave_of_birds',
    name: 'Cave of Birds',
    position: { x: -420, y: 300 },
    population: 190,
    spice: 11,
    loyalty: 70,
    owner: 'fremen',
    status: 'friendly',
    productionRate: 1.3,
  },
  {
    id: 'gara_kulon',
    kind: 'station',
    discovered: false,
    regionId: 'gara_kulon',
    name: 'Gara Kulon',
    position: { x: -700, y: 180 },
    population: 130,
    spice: 28,
    loyalty: 15,
    owner: 'smugglers',
    status: 'neutral',
    productionRate: 2.4,
  },
]
