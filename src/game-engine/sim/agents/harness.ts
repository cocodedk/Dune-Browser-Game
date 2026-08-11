// src/game-engine/sim/agents/harness.ts
// runAgentCampaign — the shared agent-driven campaign loop (progress.md
// Round 16, WP04 chunk W4c). Every step: drain any open dialogue (shared
// policy), ask the agent for exactly one action, execute it through the
// runner's production commands, then either let the agent act again or
// advance to the next decision point (07's "Runtime-faithful simulator":
// "Advance to the next decision or a bounded number of days").
//
// Two spin guards beyond the null-action case (an agent returning null is
// the ordinary "nothing useful left today" signal, handled by advancing):
// a pending settlement MUST be resolved by a 'settle' action (07: "Every
// agent must settle tribute explicitly") — a no-op there is a policy bug,
// not a legal pause, so it throws; and a bounded run of non-null actions
// between day-advances (ACTIONS_PER_ADVANCE) force-advances the clock even
// if a flawed policy keeps returning "useful" actions that never resolve —
// a refused command or a same-day ping-pong cannot spin forever either way.

import { createCampaignRunner, type CampaignRunner } from '../runner'
import type { Difficulty } from '../../../types'
import type { PendingSettlement } from '../../quota/quota'
import { drainDialogue } from './dialoguePolicy'
import type { VisibleState } from '../visibleState'
import type { Agent, AgentAction, AgentRunResult, SettlementRecord } from './types'

const ACTIONS_PER_ADVANCE = 20

export interface RunAgentOptions {
  /** A pre-built runner to continue from (recovery.test.ts's own
   * distressedCampaign(seed) fixture) instead of a fresh campaign. */
  runner?: CampaignRunner
  /** Stop once the campaign's own day counter exceeds this — a safety
   * bound, not a rule; the loop's real stop condition is `ending() !==
   * null`. */
  throughDay?: number
  /** WP04 chunk W4d: called once per decision-point loop iteration, right
   * after `view` is read and before the agent (or the settlement branch)
   * acts on it — the sweep's min/max-stock and similar per-run
   * distributions sample here. Sampling granularity is therefore per
   * decision point, not per calendar day: a multi-day forceAdvance can
   * cross a lower or higher stock value than either endpoint samples. The
   * sweep report states this caveat rather than implying per-day precision
   * it does not have. */
  onStep?: (view: VisibleState) => void
  /** WP04 chunk W4d: the save/reload parity spot-audit (07's "Seed sweep":
   * "Save/reload parity"). The first time the loop's day counter reaches
   * this value, save() then immediately reload() the SAME state — proven to
   * round-trip to an identical continuation by runner.determinism.test.ts's
   * own day-6 fixture — so a run that opts in IS its own parity check
   * rather than needing a second run to diff against. Fires at most once. */
  reloadAtDay?: number
}

export function runAgentCampaign(
  agent: Agent,
  seed: number,
  difficulty: Difficulty,
  opts: RunAgentOptions = {},
): AgentRunResult {
  const rc = opts.runner ?? createCampaignRunner(seed, difficulty)
  const throughDay = opts.throughDay ?? 60

  const settlements: SettlementRecord[] = []
  const actionCounts: Record<string, number> = {}
  let sinceAdvance = 0
  let reloaded = false

  drainDialogue(rc, agent) // the opening/campaign-creation auto-open, if any

  while (rc.ending() === null && rc.visibleState().day <= throughDay) {
    const view = rc.visibleState()
    opts.onStep?.(view)

    if (!reloaded && opts.reloadAtDay !== undefined && view.day >= opts.reloadAtDay) {
      rc.reload(rc.save())
      reloaded = true
    }

    if (view.pendingSettlement) {
      const action = agent.decide(view)
      if (!action || action.kind !== 'settle') {
        throw new Error(
          `${agent.name}: a settlement is pending and decide() returned ` +
          `${action ? action.kind : 'null'} — every agent must settle tribute explicitly (07).`,
        )
      }
      const pending = view.pendingSettlement
      rc.settleTribute(action.amount)
      settlements.push(recordSettlement(pending, action.amount, rc.visibleState().quota.patience))
      count(actionCounts, 'settle')
      rc.tick(1) // Q1 debrief's next-frame open (q1Debrief.ts); harmless past cycle 0
      drainDialogue(rc, agent)
      sinceAdvance = 0
      continue
    }

    const action = agent.decide(view)
    if (!action) {
      // WP04 chunk W4d: "days with no useful legal command" reads directly
      // off this count — forceAdvance below moves exactly one day whenever
      // the player is not mid-travel, its own ordinary case.
      count(actionCounts, 'idle')
      forceAdvance(rc)
      sinceAdvance = 0
      continue
    }

    dispatchAction(rc, action)
    count(actionCounts, action.kind)
    drainDialogue(rc, agent)

    if (++sinceAdvance >= ACTIONS_PER_ADVANCE) {
      forceAdvance(rc)
      sinceAdvance = 0
    }
  }

  const finalView = rc.visibleState()
  return {
    agentName: agent.name, seed, difficulty, settlements,
    ending: rc.ending(), finalDay: finalView.day,
    actionCounts, trace: rc.trace, hashLog: rc.hashLog,
    // WP04 chunk W4d: final-state reads for the sweep's progression
    // metrics — taken from THIS finished runner before any later
    // createCampaignRunner() call re-points the shared world singleton
    // (runner.ts's own doc on why a late read is silently wrong, not a
    // throw), same discipline the trace/hashLog capture above already uses.
    finalPledgedCount: finalView.sietches.filter(s => s.pledgedToPlayer).length,
    finalCrewCount: finalView.crews.length,
    finalFieldsAssigned: new Set(
      finalView.crews.filter(c => c.task === 'harvest' && c.taskTargetId).map(c => c.taskTargetId),
    ).size,
  }
}

/** Band read from PendingSettlement's OWN snapshotted, player-visible
 * numbers (amountDue, minPartialPayment) — never settleQuota's private
 * classify() (sim/noFormulaCopies.test.ts's forbidden-call list). The same
 * comparison the settlement modal's own Full/Partial/Short preview already
 * makes against these exact fields. */
function recordSettlement(pending: PendingSettlement, paid: number, patienceAfter: number): SettlementRecord {
  const band = paid >= pending.amountDue ? 'full' : paid >= pending.minPartialPayment ? 'partial' : 'short'
  return {
    cycleIndex: pending.cycleIndex, dueDay: pending.dueDay, amountDue: pending.amountDue,
    minPartialPayment: pending.minPartialPayment, stockBefore: pending.stock, paid, band, patienceAfter,
  }
}

function dispatchAction(rc: CampaignRunner, action: AgentAction): void {
  switch (action.kind) {
    case 'travel': rc.travel(action.targetId); rc.advanceTravel(); break
    case 'pledge': rc.pledge(action.villageId); break
    case 'gift': rc.gift(action.villageId); break
    case 'assign': rc.assignCrew(action.groupId, action.task, action.targetId); break
    case 'settle': rc.settleTribute(action.amount); break
    case 'buy': rc.buyEquipment(action.equipmentKind); break
    case 'issue': rc.issueEquipment(action.equipmentId, action.groupId); break
  }
}

function forceAdvance(rc: CampaignRunner): void {
  if (rc.visibleState().player.state === 'traveling') rc.advanceTravel()
  else rc.advanceToDay(rc.visibleState().day + 1)
}

function count(counts: Record<string, number>, kind: string): void {
  counts[kind] = (counts[kind] ?? 0) + 1
}
