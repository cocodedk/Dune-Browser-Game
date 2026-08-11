import type { SietchState } from '../game-engine/sietch/types'
import { MORALE_NEUTRAL } from '../game-engine/sietch/morale'

/**
 * Seed data for world.sietches — one entry per village id (see
 * GameState.createInitialState), matching data/villages.ts today.
 *
 * `loyalty` is snapshotted from each corresponding village's own `loyalty`
 * value at authoring time: docs/PRD/game-completion/
 * 02-runtime-consolidation.md "Sietches and loyalty" makes SietchState the
 * sole authority for a sietch's loyalty, so this is the one place that
 * authority now starts from. `morale`/`lastVisitedDay`/`giftedThisVisit`/
 * `lastMoraleVisitDay`/`crewIds` are new fields this chunk adds to every
 * entry explicitly, so a fresh campaign never depends on the `?? default`
 * fallback that only pre-existing test fixtures and old saves still need.
 */
function seed(villageId: string, fremenWorkers: number, loyalty: number): SietchState {
  return {
    villageId,
    pledgedToPlayer: false,
    fremenWorkers,
    currentTask: null,
    outputProgress: 0,
    loyalty,
    morale: MORALE_NEUTRAL,
    lastVisitedDay: 0,
    giftedThisVisit: 0,
    lastMoraleVisitDay: 0,
    crewIds: [],
  }
}

export const INITIAL_SIETCHES: SietchState[] = [
  seed('hagg', 20, 60),
  seed('arrakeen', 30, 35),
  seed('imperial_basin', 40, 55),
  seed('red_wall_sietch', 50, 80),
  seed('tsimpo', 25, 40),
  seed('sietch_tabr', 60, 45),
  seed('carthag', 20, 20),
  seed('cielago_depression', 15, 30),
  seed('habbanya_ridge', 45, 55),
  seed('funeral_plain', 10, 25),
  seed('plaster_basin', 25, 30),
  seed('wind_pass', 35, 48),
  seed('old_gap', 15, 20),
  seed('bight_of_cliff', 40, 52),
  seed('great_flat', 6, 20),
  seed('sihaya_ridge', 38, 62),
  seed('red_chasm', 30, 40),
  seed('cave_of_birds', 22, 70),
  seed('gara_kulon', 12, 15),
]
