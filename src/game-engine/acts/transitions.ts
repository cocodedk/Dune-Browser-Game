// src/game-engine/acts/transitions.ts
// PURE act state machine — the spine that sequences the whole game.
//
// Triggers are conjunctive and evaluated at the day boundary. Keeping this
// pure means the entire narrative structure can be tested without running a
// game, including the awkward cases where two transitions could fire at once.

export type ActId = 'act1' | 'act2' | 'act3' | 'act4'

export type EndingId =
  | 'win_military' | 'win_ecology'
  | 'loss_patience' | 'loss_palace' | 'loss_abandoned'

export const ACT_ORDER: readonly ActId[] = ['act1', 'act2', 'act3', 'act4']

/**
 * Did the player win?
 *
 * Trivial, and it needs to exist: the end-of-run overlay was reading only the
 * "run has ended" flag and captioning every one of the five endings
 * "Victory!" — including losing Arrakis to the Emperor. An ending has a
 * winner or it does not, and that has to be a fact the interface can ask for
 * rather than one it assumes.
 */
export function isVictory(ending: EndingId | null): boolean {
  return ending === 'win_military' || ending === 'win_ecology'
}

export interface ActWorldView {
  act: ActId
  /** Quota cycles fully paid. */
  quotasPaid: number
  pledgedCount: number
  charisma: number
  patience: number
  raidsRepelled: number
  maxRegionVegetation: number
  fortsDestroyed: number
  capitalFortDestroyed: boolean
  palaceHeld: boolean
  greenRegions: number
  averagePledgedLoyalty: number
  countdownExpired: boolean
}

/**
 * Loss states are checked before advancement.
 *
 * A player who has just lost their last sietch has not "completed act 2",
 * whatever else was true that day.
 */
export function evaluateEnding(view: ActWorldView): EndingId | null {
  if (view.patience <= 0) return 'loss_patience'
  if (!view.palaceHeld) return 'loss_palace'
  // Only a loss once the player has actually had something to lose.
  if (view.pledgedCount === 0 && view.quotasPaid > 0) return 'loss_abandoned'

  if (view.act === 'act4') {
    if (view.greenRegions >= 3 && view.averagePledgedLoyalty >= 80) return 'win_ecology'
    if (view.capitalFortDestroyed) return 'win_military'
  }
  return null
}

/** Next act, or null when the current act's exit conditions are unmet. */
export function evaluateActTransition(view: ActWorldView): ActId | null {
  switch (view.act) {
    case 'act1':
      // Three tributes paid and three sietches sworn — the player has proved
      // they can run a spice operation before the story widens.
      return view.quotasPaid >= 3 && view.pledgedCount >= 3 ? 'act2' : null

    case 'act2':
      return view.raidsRepelled >= 2 &&
        view.maxRegionVegetation >= 30 &&
        view.charisma >= 50
        ? 'act3'
        : null

    case 'act3':
      return view.fortsDestroyed >= 2 ? 'act4' : null

    case 'act4':
      return null // Act 4 resolves into an ending, not another act.
  }
}

export interface ActEvaluation {
  ending: EndingId | null
  nextAct: ActId | null
}

/**
 * Single entry point for the day-boundary check.
 * An ending always takes precedence over an act advance.
 */
export function evaluateAct(view: ActWorldView): ActEvaluation {
  const ending = evaluateEnding(view)
  if (ending) return { ending, nextAct: null }
  return { ending: null, nextAct: evaluateActTransition(view) }
}

/**
 * The act as a number, for dialogue gates.
 *
 * Conditions compare against a number — `corvin.final_demand` is
 * `{ op: 'eq', key: 'act', value: 4 }` — while `world.act` is the string
 * 'act1'..'act4'. Nothing bridged the two, so that gate could never be true and
 * Count Fenring's final demand was unreachable however far the story ran. The
 * flag is written from here rather than parsed at each comparison, so the two
 * representations cannot drift.
 */
export function actNumber(act: ActId): number {
  switch (act) {
    case 'act1': return 1
    case 'act2': return 2
    case 'act3': return 3
    case 'act4': return 4
  }
}

/** Quota multiplier applied on entering an act — the escalation curve. */
export function actQuotaMultiplier(act: ActId): number {
  switch (act) {
    case 'act1': return 1
    case 'act2': return 1
    case 'act3': return 1.5
    case 'act4': return 1.5
  }
}
