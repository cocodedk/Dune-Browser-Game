// src/data/characters.ts
// Act 1 speaking roster. All characters, roles and writing are original to
// this project.
//
// Each entry earns its place by gating or teaching a system — a character who
// only delivers exposition is content cost with no mechanical return.

import type { Character } from '../game-engine/dialogue/types'

export const INITIAL_CHARACTERS: Character[] = [
  {
    id: 'duke_armand',
    name: 'Duke Armand',
    role: 'Your father, and the Emperor’s reluctant tenant',
    locationId: 'arrakeen',
    recruited: true,
  },
  {
    id: 'vell',
    name: 'Ottone Vell',
    role: 'Steward of the household ledger',
    locationId: 'arrakeen',
    recruited: true,
  },
  {
    id: 'corvin',
    name: 'Legate Corvin',
    role: 'The Emperor’s envoy, and his patience made flesh',
    locationId: 'arrakeen',
    recruited: false,
  },
  {
    id: 'shadir',
    name: 'Naib Shadir',
    role: 'Leader of the sietch at Red Wall',
    locationId: 'red_wall_sietch',
    recruited: false,
  },
  {
    id: 'ysane',
    name: 'Ysane',
    role: 'Desert scout who knows the routes maps forget',
    locationId: 'sietch_tabr',
    recruited: false,
  },
  {
    id: 'sova',
    name: 'Mother Sova',
    role: 'Keeper of the sietch’s older knowledge',
    locationId: 'sietch_tabr',
    recruited: false,
  },
  {
    id: 'pell',
    name: 'Pell',
    role: 'Young prospector, more confident than accurate',
    locationId: 'hagg',
    recruited: false,
  },
  {
    id: 'meko',
    name: 'Rhaz Meko',
    role: 'Smuggler, and the only honest price on Arrakis',
    locationId: 'tsimpo',
    recruited: false,
  },
]
