// src/game-engine/sim/reserveLine.ts
// The `opening-reserve-line` fixture (07-balance-playtest-and-release.md's
// own required fixture name; commands/openingLineFixtures.test.ts is the
// engine-level shortcut version of the same line — teleported, loyalty
// force-set), walked here for real through the runner API only: briefing
// dialogue -> ledger dialogue -> two travel hops -> Beat 4's trust dialogue
// (transaction branch) -> pledge -> assign -> day-by-day advance. Exactly
// one crew, no second pledge — "reserve" names the spice never spent on a
// second sietch's gift.
//
// Shared by runner.smoke.test.ts and runner.determinism.test.ts so the
// script is authored once — e2e/helpers.ts's reachFirstCrew is the
// production-click precedent for this exact route (Arrakeen -> Hagg -> Red
// Wall, the transaction branch, "Pledge", the recommended field).

import type { CampaignRunner } from './runner'

/** Beats 1-2: Duke Leto's briefing, then Thufir's ledger — the real reply
 * choice ids from data/dialogue/opening-briefing.ts, opening-ledger.ts. */
export function walkOpeningBriefing(rc: CampaignRunner): void {
  rc.choose('briefing_understand')
  rc.choose('briefing_ack_practical_1')
  rc.choose('ledger_root_1')
  rc.choose('ledger_stock_1')
  rc.choose('ledger_projection_1')
  rc.choose('ledger_shortfall_1')
  rc.choose('ledger_patience_1')
}

/** Beats 3-5: travel Arrakeen -> Hagg -> Red Wall, Beat 4's trust dialogue,
 * pledge, first harvest order. Reserve line: exactly one crew. */
export function walkToFirstCrew(rc: CampaignRunner): void {
  rc.travel('hagg')
  rc.advanceTravel()
  rc.travel('red_wall_sietch')
  rc.advanceTravel() // Beat 4's trust dialogue auto-opens on this arrival

  rc.choose('redwall_trust_transaction') // "a fair exchange" branch
  rc.choose('redwall_trust_ack_transaction_1') // "Agreed."

  rc.pledge('red_wall_sietch')
  rc.assignCrew('group_red_wall_sietch', 'harvest', 'field_red_wall_pan')
}

/**
 * Beat 7's debrief. Every band's root and Thufir's own follow-up node carry
 * exactly one reply (opening-q1-debrief.ts) — Fenring's own wording varies
 * by band, Thufir's by nothing — so picking the sole available choice twice
 * reaches Thufir's summary regardless of which band settleTribute() landed
 * in, the same way e2e/opening6.spec.ts's chooseReply(/Go on/) then
 * chooseReply(/Understood/) does not need to know the band either. One
 * `tick(1)` first: the debrief opens on the NEXT frame after
 * settleTribute(), not synchronously inside it (runtime/q1Debrief.ts's own
 * doc) — the same one-frame gap GameDriver's rAF loop closes in the browser.
 */
export function walkQ1Debrief(rc: CampaignRunner): void {
  rc.tick(1)
  for (let i = 0; i < 2; i++) {
    const dialogue = rc.visibleState().dialogue
    if (!dialogue) return
    rc.choose(dialogue.choices[0].id)
  }
}
