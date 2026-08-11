// src/game-engine/sim/investLine.ts
// The `opening-invest-line` fixture (07-balance-playtest-and-release.md's
// own required fixture name; commands/openingLineFixtures.test.ts is the
// engine-level shortcut version — teleported, loyalty force-set;
// e2e/opening3.spec.ts is the production-click precedent for this exact
// route). Shares Beats 1-5 with reserveLine.ts (briefing, ledger, Red Wall
// pledge+crew) — both lines are the same player up to that point — and adds
// Beat 6: travel to Tabr (one hop, adjacent to Red Wall), walk the
// story/tabr_dilemma tree to its own end (closes it exactly the way a
// player choosing either final reply would — no different from
// opening3.spec.ts's early '×' close for economic purposes: the dilemma's
// effects are solidarity/transaction flags for WP05, not spice or loyalty —
// progress.md Round 11's own scope reading), two gifts, second pledge,
// second crew.
//
// Deliberately does NOT call the giveHarvester debug bridge
// opening3.spec.ts/opening5.spec.ts lean on (progress.md Round 14's own
// disclosure: those scenarios reach the FULL band only because of it). WP04
// chunk W4b's own brief wants this line's honest, unassisted cycle-1 number
// as the "one partial-band settlement" fixture — see runner.investLine.test.ts
// for the measured figure.

import type { CampaignRunner } from './runner'
import { GIFT_SPICE_COST, PLEDGE_THRESHOLD } from '../sietch/loyalty'

export { GIFT_SPICE_COST, PLEDGE_THRESHOLD }

/**
 * Beat 6: Red Wall -> Tabr, the dilemma dialogue walked to its own end
 * (not closed early — every reply at every node here is legal, and walking
 * it deterministically avoids relying on the endDialogue-on-early-close path
 * a runner has no dedicated command for), two gifts (+8 loyalty each,
 * data/sietches.ts's Tabr seed is 45; PLEDGE_THRESHOLD is 60 — two gifts
 * clears it at 61), second pledge, second crew assigned to its own
 * recommended field.
 */
export function walkToSecondCrew(rc: CampaignRunner): void {
  rc.travel('sietch_tabr')
  rc.advanceTravel() // story/tabr_dilemma auto-opens on this arrival

  rc.choose('tabr_dilemma_root_1') // "Go on."
  rc.choose('tabr_dilemma_ramallo_1') // "And if I don't?"
  rc.choose('tabr_dilemma_close_consider') // nextId: null — ends the tree

  rc.gift('sietch_tabr')
  rc.gift('sietch_tabr')

  rc.pledge('sietch_tabr')
  rc.assignCrew('group_sietch_tabr', 'harvest', 'field_tabr_shallows')
}
