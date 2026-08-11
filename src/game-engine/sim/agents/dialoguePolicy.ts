// src/game-engine/sim/agents/dialoguePolicy.ts
// The shared dialogue-walking policy every agent runs through unmodified
// (progress.md Round 16, WP04 chunk W4c: "walk any open dialogue via a
// shared dialogue policy — mandatory beats walked; optional trees: a
// per-agent hook, default decline/close").
//
// "Mandatory" is read straight off DialogueSystem.ts's own
// canCloseDialogue() — the SAME predicate DialoguePanel.tsx uses to hide
// its × button — never a hand-copied list of tree ids. At a mandatory
// node, every authored choice converges on the tree's own completion flag
// (opening-briefing.ts/opening-ledger.ts/opening-redwall-trust.ts's own
// headers: branches "differ only in later acknowledgement", both branches
// still set the shared completion flag; opening-q1-debrief.ts's four root
// nodes each carry exactly one choice) — so picking choices[0] at every
// mandatory node is a general, content-agnostic walk, not a script tied to
// one specific branch the way reserveLine.ts's own walkOpeningBriefing is.

import { canCloseDialogue } from '../../DialogueSystem'
import type { CampaignRunner } from '../runner'
import type { Agent } from './types'

/** Generous but finite — the longest authored mandatory chain today
 * (briefing -> ledger, chained through endDialogue) is well under this;
 * anything longer signals a real bug (a tree that never converges), which
 * should fail loudly rather than spin the harness forever. */
const DIALOGUE_STEP_CAP = 40

/**
 * Walk every dialogue open right now to a real end. Mandatory nodes always
 * pick choices[0]; optional nodes ask `agent.onOptionalDialogue`, defaulting
 * to `rc.close()` (the production endDialogue() DialoguePanel.tsx's × button
 * calls — see runner.ts's own doc). Loops because closing one tree can
 * auto-open another (Beat 1 -> Beat 2) and because an agent's optional-hook
 * choice can itself lead to a still-open conversation.
 */
export function drainDialogue(rc: CampaignRunner, agent: Agent): void {
  let steps = 0
  while (true) {
    const view = rc.visibleState()
    if (!view.dialogue) return
    if (steps++ >= DIALOGUE_STEP_CAP) {
      throw new Error(
        `${agent.name}: dialogue "${view.dialogue.treeId}" did not converge within ` +
        `${DIALOGUE_STEP_CAP} steps — a tree that never reaches a closing choice, not a spin guard tuning issue.`,
      )
    }

    if (!canCloseDialogue()) {
      rc.choose(view.dialogue.choices[0].id)
      continue
    }

    const choiceId = agent.onOptionalDialogue?.(view) ?? null
    if (choiceId) rc.choose(choiceId)
    else rc.close()
  }
}
