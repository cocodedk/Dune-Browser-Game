// src/data/forts.ts
// Harkonnen strongholds. Three outposts and a capital — enough to make the
// Act 3 campaign a sequence of decisions rather than a single battle, without
// the grind of a dozen identical sieges.

import type { FortState } from '../game-engine/acts/endgame'

export const INITIAL_FORTS: FortState[] = [
  { locationId: 'tsimpo', strength: 160, isCapital: false, destroyed: false },
  { locationId: 'cielago_depression', strength: 220, isCapital: false, destroyed: false },
  { locationId: 'imperial_basin', strength: 280, isCapital: false, destroyed: false },
  { locationId: 'carthag', strength: 400, isCapital: true, destroyed: false },
]
