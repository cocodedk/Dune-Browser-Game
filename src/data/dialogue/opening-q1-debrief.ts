// src/data/dialogue/opening-q1-debrief.ts
// Beat 7's post-settlement debrief (docs/PRD/game-completion/
// 03-opening-experience.md "Teaching sequence" Beat 7: "The player confirms
// once. Count Fenring delivers a state-specific response; Thufir gives a
// one-paragraph operational summary."). Own dedicated tree
// (Q1_DEBRIEF_TREE_ID) for the usual cross-location reward-budget reason.
//
// Three parallel two-node branches, one per PaymentBand (quota/quota.ts) —
// Fenring's opening line, then Thufir's summary — rather than one shared
// branch with inserted variance: DialogueNode.text has no interpolation
// mechanism anywhere in this codebase (checked, same constraint
// opening-ledger.ts's header names), so a band-specific line has to be a
// band-specific NODE. runtime/q1Debrief.ts picks the right root by band via
// q1DebriefRootId. No effects anywhere in this file — like Tabr's dilemma
// tree, this is pure narrative; opening.complete is already set by
// settleCommand.ts independently of whether this tree is ever watched to
// its end, and it is not in canCloseDialogue's mandatory set, so it closes
// freely at any point.

import type { DialogueNode } from '../../types'
import type { PaymentBand } from '../../game-engine/quota/quota'

export const Q1_DEBRIEF_NODES: DialogueNode[] = [
  // --- full ------------------------------------------------------------
  {
    id: 'q1_debrief_full',
    speaker: 'Count Fenring',
    text:
      'Full to the measure, and early enough that I need invent no kind ' +
      'words to cover a shortfall. The Emperor collects what he is owed, ' +
      'my lord — he rarely enjoys it this cleanly. Make a habit of it.',
    choices: [{ id: 'q1_debrief_full_1', text: 'Go on.', nextId: 'q1_debrief_full_thufir' }],
  },
  {
    id: 'q1_debrief_full_thufir',
    speaker: 'Thufir Hawat',
    text:
      'The ledger’s clean: the first tribute is closed with nothing ' +
      'carried forward, and the Emperor’s patience stands at its full ' +
      'measure again. Our crews keep working the fields they’re already ' +
      'assigned — watch the ledger for the next deadline, same as this ' +
      'one, and we hold the line the same way.',
    choices: [{ id: 'q1_debrief_full_thufir_1', text: 'Understood.', nextId: null }],
  },
  // --- partial -----------------------------------------------------------
  {
    id: 'q1_debrief_partial',
    speaker: 'Count Fenring',
    text:
      'Not the full sum, but close enough that I will not trouble the ' +
      'Emperor with the difference — this time. The balance is noted, ' +
      'with its interest, and so is your intention to close it. See that ' +
      'you do.',
    choices: [{ id: 'q1_debrief_partial_1', text: 'Go on.', nextId: 'q1_debrief_partial_thufir' }],
  },
  {
    id: 'q1_debrief_partial_thufir',
    speaker: 'Thufir Hawat',
    text:
      'The first tribute is closed, but not cleanly — what we didn’t pay ' +
      'is carried forward as arrears, with the usual surcharge added on ' +
      'top, so the next demand will ask for more than this one did. Our ' +
      'crews keep working; the ledger will show you exactly how much ' +
      'more, and when it is due.',
    choices: [{ id: 'q1_debrief_partial_thufir_1', text: 'Understood.', nextId: null }],
  },
  // --- short ---------------------------------------------------------------
  {
    id: 'q1_debrief_short',
    speaker: 'Count Fenring',
    text:
      'Considerably short, my lord, and the Emperor’s patience is not an ' +
      'account you may draw against indefinitely. I have recorded what ' +
      'was paid and what was not. I would not test how many more such ' +
      'records he is willing to read.',
    choices: [{ id: 'q1_debrief_short_1', text: 'Go on.', nextId: 'q1_debrief_short_thufir' }],
  },
  {
    id: 'q1_debrief_short_thufir',
    speaker: 'Thufir Hawat',
    text:
      'The first tribute is closed the hard way — the Emperor’s patience ' +
      'took a real loss, and the shortfall carries forward in full, no ' +
      'surcharge needed to make the point. Our crews are still working, ' +
      'and there is still time before the next deadline, but the ledger ' +
      'has less room in it than it did yesterday. Watch it.',
    choices: [{ id: 'q1_debrief_short_thufir_1', text: 'Understood.', nextId: null }],
  },
]

/** Which root node opens the debrief for a given settlement band. */
export function q1DebriefRootId(band: PaymentBand): string {
  switch (band) {
    case 'full': return 'q1_debrief_full'
    case 'partial': return 'q1_debrief_partial'
    case 'short': return 'q1_debrief_short'
  }
}
