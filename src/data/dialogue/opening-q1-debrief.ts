// src/data/dialogue/opening-q1-debrief.ts
// Beat 7's post-settlement debrief (docs/PRD/game-completion/
// 03-opening-experience.md "Teaching sequence" Beat 7: "The player confirms
// once. Count Fenring delivers a state-specific response; Thufir gives a
// one-paragraph operational summary."). Own dedicated tree
// (Q1_DEBRIEF_TREE_ID) for the usual cross-location reward-budget reason.
//
// Four two-node branches — full/partial-near/partial-bare/short, one per
// PaymentBand (quota/quota.ts) plus the partial band's own qualitative
// split (W3h) — Fenring's opening line, then Thufir's summary, rather than
// one shared branch with inserted variance: DialogueNode.text has no
// interpolation mechanism anywhere in this codebase (checked, same
// constraint opening-ledger.ts's header names), so a band-specific line has
// to be a band-specific NODE. runtime/q1Debrief.ts picks the right root by
// band (and, inside 'partial', by nearlyFull) via q1DebriefRootId. No
// effects anywhere in this file — like Tabr's dilemma tree, this is pure
// narrative; opening.complete is already set by settleCommand.ts
// independently of whether this tree is ever watched to its end.
//
// W3h: NOT free to close at the root any more. Q1_DEBRIEF_ROOT_IDS joins
// DialogueSystem.ts's canCloseDialogue mandatory set for exactly the four
// root ids above — Fenring's lines read as terminal on their own ("Make a
// habit of it." / "See that you do."), so × and Escape being live there let
// a player close the whole tree believing it was finished, skipping
// Thufir's summary every time (the blind-play verdict's finding: Fenring
// seen, Thufir never seen, in both cold runs). Once past the root — at
// Thufir's own node — the tree closes freely again, same as before.

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
  // --- partial (two variants — W3h: magnitude, qualitatively, no digits) --
  {
    id: 'q1_debrief_partial_near',
    speaker: 'Count Fenring',
    text:
      'Not the full sum, but close enough that I will not trouble the ' +
      'Emperor with the difference — this time. The balance is noted, ' +
      'with its interest, and so is your intention to close it. See that ' +
      'you do.',
    choices: [{ id: 'q1_debrief_partial_near_1', text: 'Go on.', nextId: 'q1_debrief_partial_thufir' }],
  },
  {
    id: 'q1_debrief_partial_bare',
    speaker: 'Count Fenring',
    text:
      'The bare minimum, my lord, and not a measure more. The Emperor ' +
      'accepts it — this time — but a habit of scraping the floor is not ' +
      'one I would recommend to him. The rest is noted, with its interest.',
    choices: [{ id: 'q1_debrief_partial_bare_1', text: 'Go on.', nextId: 'q1_debrief_partial_thufir' }],
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

/**
 * Which root node opens the debrief for a given settlement band.
 * `nearlyFull` only matters inside the 'partial' band — see
 * Q1_DEBRIEF_NEARLY_FULL_FRACTION (quota/settlement.ts).
 */
export function q1DebriefRootId(band: PaymentBand, nearlyFull = false): string {
  switch (band) {
    case 'full': return 'q1_debrief_full'
    case 'partial': return nearlyFull ? 'q1_debrief_partial_near' : 'q1_debrief_partial_bare'
    case 'short': return 'q1_debrief_short'
  }
}

/**
 * Every root node this tree can open on — used by DialogueSystem.ts's
 * canCloseDialogue to force the player past Fenring to Thufir (see this
 * file's own header: the close affordance used to be live at the root,
 * which let a player Escape/× away before ever reaching Thufir's summary).
 */
export const Q1_DEBRIEF_ROOT_IDS: readonly string[] = [
  'q1_debrief_full', 'q1_debrief_partial_near', 'q1_debrief_partial_bare', 'q1_debrief_short',
]
