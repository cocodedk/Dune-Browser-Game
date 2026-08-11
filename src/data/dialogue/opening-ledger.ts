// src/data/dialogue/opening-ledger.ts
// Beat 2 — Thufir's tribute ledger (docs/PRD/game-completion/
// 03-opening-experience.md "Teaching sequence" Beat 2). Own dedicated tree
// (LEDGER_TREE_ID), for the same reason opening-briefing.ts states.
//
// Five nodes, strictly linear, one per item of 03's reveal order: amount/due
// day, current stock, projected stock at the deadline, surplus/shortfall,
// then patience and the full/partial/short consequences (plus "a crew needs
// a pledge"). DialogueNode.text has no interpolation mechanism anywhere in
// this codebase (checked: every authored node is a static string), and Q1's
// amount is difficulty-scaled (game-engine/quota/quota.ts's
// createQuotaState(difficultyMultiplier) — 90 only on Normal) — so no node
// states the amount as a digit. The due day (FIRST_DEADLINE_DAY = 12) is NOT
// difficulty-scaled and is stated as flavor text for that reason. Every
// other figure is left to the ledger panel itself (gated onto screen by this
// tree's own completion — see App.tsx), which already reads live state.
//
// No spiceDelta/charismaDelta/loyaltyDelta anywhere in this file, matching
// opening-briefing.ts's constraint. Completing sets `ledger.read`, the same
// way and for the same reason (canCloseDialogue in DialogueSystem.ts refuses
// to close this tree early).

import type { DialogueNode } from '../../types'

export const LEDGER_NODES: DialogueNode[] = [
  {
    id: 'ledger_root',
    speaker: 'Thufir Hawat',
    text:
      'The first demand is entered already — what is owed, and the day it ' +
      'falls: the twelfth day from now. I do not round either number in the ' +
      'house’s favor, and neither does the Emperor’s collector.',
    choices: [{ id: 'ledger_root_1', text: 'Show me the rest.', nextId: 'ledger_stock' }],
  },
  {
    id: 'ledger_stock',
    speaker: 'Thufir Hawat',
    text:
      'What is actually in the stores is a smaller number than you would ' +
      'like it to be. That is not pessimism. That is the count.',
    choices: [{ id: 'ledger_stock_1', text: 'And what it becomes?', nextId: 'ledger_projection' }],
  },
  {
    id: 'ledger_projection',
    speaker: 'Thufir Hawat',
    text:
      'By the deadline, the ledger will show you what your crews are likely ' +
      'to add — today, that is nothing, because you have no crews. It reads ' +
      'the stock exactly as it stands, not as a promise.',
    choices: [{ id: 'ledger_projection_1', text: 'So we are short.', nextId: 'ledger_shortfall' }],
  },
  {
    id: 'ledger_shortfall',
    speaker: 'Thufir Hawat',
    text:
      'Short, yes, and it will say so plainly — not "no income" dressed up ' +
      'as bad news, but the honest gap between what is held and what is ' +
      'owed. That gap is the thing you are here to close.',
    choices: [{ id: 'ledger_shortfall_1', text: 'Then tell me what closes it.', nextId: 'ledger_patience' }],
  },
  {
    id: 'ledger_patience',
    speaker: 'Thufir Hawat',
    text:
      'A crew — and a crew needs a sietch that has pledged to you first. Pay ' +
      'the tribute in full and the Emperor’s patience holds. Pay part of it ' +
      'and it holds a little longer, at a price. Pay too little, or ' +
      'nothing, and it does not hold at all; watch the pips on the ledger ' +
      'for that answer, not my face. I will keep it all in front of you ' +
      'from now on — plainly, whenever you want to look.',
    choices: [
      { id: 'ledger_patience_1', text: 'Understood. I’ll go earn one.', nextId: null,
        effect: { setFlags: { 'ledger.read': true } } },
    ],
  },
]
