// src/data/villages.wider.ts
// The ring of settlements around the original eight.
//
// Split from villages.ts, which had grown past the repository's file limit.

import type { Village } from '../types'

export const WIDER_VILLAGES: Village[] = [
  // --- The wider map -------------------------------------------------------
  //
  // Eight settlements on a whole planet read as a diorama. These six push the
  // inhabited band out from roughly 45 degrees of longitude to 69, and from 27
  // of latitude to 40 — still nowhere near the poles, which is right: Arrakis
  // is supposed to be mostly empty. It should just be emptier than *this*.
  //
  // All are canonical Dune place names.
  {
    id: 'habbanya_ridge',
    kind: 'sietch',
    discovered: true,
    regionId: 'habbanya_ridge',
    name: 'Habbanya Ridge',
    position: { x: -60, y: 430 },
    population: 410,
    spice: 12,
    loyalty: 55,
    owner: 'fremen',
    status: 'neutral',
    productionRate: 1.6,
  },
  {
    id: 'funeral_plain',
    kind: 'sietch',
    discovered: false,
    regionId: 'funeral_plain',
    name: 'Funeral Plain',
    position: { x: 300, y: 560 },
    population: 150,
    spice: 4,
    loyalty: 25,
    owner: 'neutral',
    status: 'neutral',
    productionRate: 0.9,
  },
  {
    id: 'plaster_basin',
    kind: 'station',
    discovered: false,
    regionId: 'plaster_basin',
    name: 'Plaster Basin',
    position: { x: -100, y: 170 },
    population: 260,
    spice: 18,
    loyalty: 30,
    owner: 'smugglers',
    status: 'neutral',
    productionRate: 2.1,
  },
  {
    id: 'wind_pass',
    kind: 'sietch',
    discovered: false,
    regionId: 'wind_pass',
    name: 'Wind Pass',
    position: { x: 60, y: -40 },
    population: 340,
    spice: 9,
    loyalty: 48,
    owner: 'fremen',
    status: 'neutral',
    productionRate: 1.4,
  },
  {
    id: 'old_gap',
    kind: 'station',
    discovered: false,
    regionId: 'old_gap',
    name: 'Old Gap',
    position: { x: 560, y: -50 },
    population: 220,
    spice: 6,
    loyalty: 20,
    owner: 'harkonnen',
    status: 'rebelling',
    productionRate: 1.7,
  },
  {
    id: 'bight_of_cliff',
    kind: 'sietch',
    discovered: false,
    regionId: 'bight_of_cliff',
    name: 'Bight of the Cliff',
    position: { x: 900, y: 210 },
    population: 380,
    spice: 14,
    loyalty: 52,
    owner: 'fremen',
    status: 'neutral',
    productionRate: 1.5,
  },
]
