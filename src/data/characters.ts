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
    name: 'Duke Leto Atreides',
    role: 'Your father, and the Emperor’s reluctant tenant',
    locationId: 'arrakeen',
    recruited: true,
  },
  {
    id: 'vell',
    name: 'Thufir Hawat',
    role: 'Steward of the household ledger',
    locationId: 'arrakeen',
    recruited: true,
  },
  {
    id: 'corvin',
    name: 'Count Fenring',
    role: 'The Emperor’s envoy, and his patience made flesh',
    locationId: 'arrakeen',
    recruited: false,
  },
  {
    id: 'shadir',
    name: 'Stilgar',
    role: 'Leader of the sietch at Red Wall',
    locationId: 'red_wall_sietch',
    recruited: false,
  },
  {
    id: 'ysane',
    name: 'Chani',
    role: 'Desert scout who knows the routes maps forget',
    locationId: 'sietch_tabr',
    recruited: false,
  },
  {
    id: 'sova',
    name: 'Reverend Mother Ramallo',
    role: 'Keeper of the sietch’s older knowledge',
    locationId: 'sietch_tabr',
    recruited: false,
  },
  {
    id: 'pell',
    name: 'Shishakli',
    role: 'Young prospector, more confident than accurate',
    locationId: 'hagg',
    recruited: false,
  },
  // --- Act 2 arrivals ------------------------------------------------------
  {
    id: 'voss',
    name: 'Gurney Halleck',
    role: 'Sent to make soldiers of your spice crews',
    locationId: 'arrakeen',
    recruited: false,
  },
  {
    id: 'vast',
    name: 'Liet-Kynes',
    role: 'Planetologist, and inconveniently patient',
    locationId: 'hagg',
    recruited: false,
  },
  {
    id: 'maren',
    name: 'Lady Jessica',
    role: 'Your mother, and a better politician than your father',
    locationId: 'arrakeen',
    recruited: true,
  },
  // --- Act 3-4 antagonists -------------------------------------------------
  {
    id: 'varn',
    name: 'Glossu Rabban',
    role: 'Harkonnen field commander, and proud of the work',
    locationId: 'carthag',
    recruited: false,
  },
  {
    id: 'baron',
    name: 'Baron Vladimir Harkonnen',
    role: 'Holds Arrakis the way a hand holds a bird',
    locationId: 'carthag',
    recruited: false,
  },
  {
    id: 'meko',
    name: 'Esmar Tuek',
    role: 'Smuggler, and the only honest price on Arrakis',
    locationId: 'tsimpo',
    recruited: false,
  },
  // --- The far reaches ----------------------------------------------------
  //
  // Imperial Basin and Cielago Depression had nobody in them at all: a player
  // who travelled there found a place with no one to talk to. These also give
  // the systems added since — worms, ecology, the deep desert — a voice each,
  // so a mechanic can be taught by someone rather than by a tooltip.
  {
    id: 'sabiha',
    name: 'Harah',
    role: 'Reads the sand, and will tell you what it says for a price',
    locationId: 'cielago_depression',
    recruited: false,
  },
  {
    id: 'orrin',
    name: 'Otheym',
    role: 'Has ridden makers, and would rather not discuss it',
    locationId: 'cielago_depression',
    recruited: false,
  },
  {
    id: 'krail',
    name: 'Overseer Krail',
    role: 'Runs the Basin crews, and counts the dead as wastage',
    locationId: 'imperial_basin',
    recruited: false,
  },
  {
    id: 'dessin',
    name: 'Factor Dessin',
    role: 'Keeps the Guild\u2019s accounts, and no opinions whatever',
    locationId: 'imperial_basin',
    recruited: false,
  },
  {
    id: 'zurrah',
    name: 'Zurrah',
    role: 'Sells water, and hears everything sold with it',
    locationId: 'tsimpo',
    recruited: false,
  },
  {
    id: 'hallock',
    name: 'Sergeant Hallock',
    role: 'Harkonnen garrison, and tired enough to be bought',
    locationId: 'carthag',
    recruited: false,
  },
]
