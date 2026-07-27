import type { SietchState } from '../game-engine/sietch/types'

export const INITIAL_SIETCHES: SietchState[] = [
  { villageId: 'hagg',               pledgedToPlayer: false, fremenWorkers: 20, currentTask: null, outputProgress: 0 },
  { villageId: 'arrakeen',           pledgedToPlayer: false, fremenWorkers: 30, currentTask: null, outputProgress: 0 },
  { villageId: 'imperial_basin',     pledgedToPlayer: false, fremenWorkers: 40, currentTask: null, outputProgress: 0 },
  { villageId: 'red_wall_sietch',    pledgedToPlayer: false, fremenWorkers: 50, currentTask: null, outputProgress: 0 },
  { villageId: 'tsimpo',             pledgedToPlayer: false, fremenWorkers: 25, currentTask: null, outputProgress: 0 },
  { villageId: 'sietch_tabr',        pledgedToPlayer: false, fremenWorkers: 60, currentTask: null, outputProgress: 0 },
  { villageId: 'carthag',            pledgedToPlayer: false, fremenWorkers: 20, currentTask: null, outputProgress: 0 },
  { villageId: 'cielago_depression', pledgedToPlayer: false, fremenWorkers: 15, currentTask: null, outputProgress: 0 },
]
