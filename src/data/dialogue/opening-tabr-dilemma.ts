// src/data/dialogue/opening-tabr-dilemma.ts
// Beat 6 — the Tabr gift dilemma (docs/PRD/game-completion/
// 03-opening-experience.md "Teaching sequence" Beat 6: "The Tabr route
// teaches that relationships can cost the same resource used for tribute.
// Chani and Ramallo provide the context; a gift has a previewed cost and
// loyalty gain... The opening must not script the decision."). Its own
// dedicated tree (TABR_DILEMMA_TREE_ID), for the same cross-location
// reward-budget reason opening-briefing.ts's header states.
//
// UNLIKE every other opening beat tree, this one carries NO effect of any
// kind — no loyaltyDelta/spiceDelta/charismaDelta, and no setFlags either.
// It only explains the numbers; the actual gift stays the GiftPanel command
// (GIFT_SPICE_COST/GIFT_LOYALTY_GAIN in sietch/loyalty.ts), which this
// content previews in prose but never touches. It is also NOT in
// DialogueSystem.ts's canCloseDialogue mandatory set — 03 explicitly
// forbids scripting this decision, so the player may Escape/× out at any
// node, unlike Beat 4's mandatory trust exchange. See TravelSystem.ts's
// maybeOpenTabrDilemma for how "auto-opens ONCE" is still guaranteed
// despite that legal early exit.

import type { DialogueNode } from '../../types'

export const TABR_DILEMMA_NODES: DialogueNode[] = [
  {
    id: 'tabr_dilemma_root',
    speaker: 'Chani',
    text:
      'Tabr is not Red Wall. We do not know your name here, and trust is ' +
      'not a thing you win in one conversation. But there is a road open to ' +
      'you if you want it — and it runs through the same stores the ' +
      'Emperor is already asking you to empty.',
    choices: [
      { id: 'tabr_dilemma_root_1', text: 'Go on.', nextId: 'tabr_dilemma_ramallo' },
    ],
  },
  {
    id: 'tabr_dilemma_ramallo',
    speaker: 'Reverend Mother Ramallo',
    text:
      'A gift of spice earns trust here, the way it earns trust anywhere — ' +
      'twenty measures spent for eight measures of loyalty gained, each ' +
      'time you offer it. That is the same spice the ledger in Arrakeen is ' +
      'counting toward your tribute. Spend it here, and you spend it ' +
      'nowhere else.',
    choices: [
      { id: 'tabr_dilemma_ramallo_1', text: 'And if I don’t?', nextId: 'tabr_dilemma_close' },
    ],
  },
  {
    id: 'tabr_dilemma_close',
    speaker: 'Chani',
    text:
      'Then you keep what you have, and Tabr stays a place you have ' +
      'visited, not a place that answers to you. Neither road fails you ' +
      'outright — the choice is only ever yours to make, and only ever ' +
      'yours to answer for.',
    choices: [
      { id: 'tabr_dilemma_close_consider', text: 'I’ll think on it.', nextId: null },
      { id: 'tabr_dilemma_close_commit', text: 'I’ll come back with spice.', nextId: null },
    ],
  },
]
