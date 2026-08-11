// src/data/dialogue/opening-redwall-trust.ts
// Beat 4 — Stilgar tests the newcomer, then extends trust (docs/PRD/
// game-completion/03-opening-experience.md "Teaching sequence" Beat 4). Its
// own dedicated tree (REDWALL_TRUST_TREE_ID), for the same cross-location
// reward-budget reason opening-briefing.ts's header states, and because
// progress.md Round 11 says it explicitly: "opening beats get their OWN
// dialogue trees, never the shared fremen_sietch tree whose (tree, node)
// budget is cross-location."
//
// Unlike Beats 1-2 (opening-briefing.ts, opening-ledger.ts), this tree DOES
// carry a mechanical reward — that is the entire point of Beat 4, so it is
// deliberately absent from opening.test.ts's "no positive reward anywhere"
// describe.each; see opening-redwall-trust.test.ts for this tree's own
// content-integrity coverage instead.
//
// The two root replies differ only in LATER acknowledgement — solidarity
// versus transaction (03: "The two replies must differ in later
// acknowledgement... not in whether the tutorial can continue") — both carry
// `loyaltyDelta: 5`, and BOTH live on redwall_trust_root's own two choices,
// not on the two acknowledgement nodes below it. That placement matters:
// applyEffect's once-per-(treeId, node.id) reward gate (dialogue/
// applyEffect.ts) keys on the NODE the choice sits on, not the choice id, so
// putting the award on two DIFFERENT ack nodes would open two independent
// reward budgets (55 -> 65 on a hypothetical replay) instead of the one
// budget this beat is meant to have. Seed loyalty 55 (data/sietches.ts) plus
// either reply's +5 lands exactly on PLEDGE_THRESHOLD (60,
// sietch/loyalty.ts) — the canonical-numbers pairing this chunk records.
//
// The acknowledgement nodes set `redwall.trust.acknowledged` (the shared
// completion flag DialogueSystem.ts's canCloseDialogue reads — this tree is
// mandatory-to-finish, like Beats 1-2, so the E2E flow that depends on
// reaching 60 loyalty is deterministic) alongside their own distinct
// `redwall.trust.solidarity`/`redwall.trust.transaction` flag, recorded here
// for WP05 content to acknowledge later — this chunk sets them and stops.

import type { DialogueNode } from '../../types'

export const REDWALL_TRUST_NODES: DialogueNode[] = [
  {
    id: 'redwall_trust_root',
    speaker: 'Stilgar',
    text:
      'You crossed two hops of open sand to stand in my sietch, son of ' +
      'Atreides. Tell me plainly — why should Red Wall put its water and ' +
      'its hands behind your name?',
    choices: [
      {
        id: 'redwall_trust_solidarity',
        text: 'Because if this world breaks us, it breaks you with it. We share the same sand.',
        nextId: 'redwall_trust_ack_solidarity',
        effect: { loyaltyDelta: 5 },
      },
      {
        id: 'redwall_trust_transaction',
        text: 'Because I need a working crew, and you need spice moved off ground you already hold. That is a fair exchange.',
        nextId: 'redwall_trust_ack_transaction',
        effect: { loyaltyDelta: 5 },
      },
    ],
  },
  {
    id: 'redwall_trust_ack_solidarity',
    speaker: 'Stilgar',
    text:
      'Then we are already speaking one language — Fremen have said as ' +
      'much to each other longer than your house has held this planet. ' +
      'Prove it in the work, not the words, and Red Wall stands with you.',
    choices: [
      {
        id: 'redwall_trust_ack_solidarity_1',
        text: 'I intend to.',
        nextId: null,
        effect: { setFlags: { 'redwall.trust.acknowledged': true, 'redwall.trust.solidarity': true } },
      },
    ],
  },
  {
    id: 'redwall_trust_ack_transaction',
    speaker: 'Stilgar',
    text:
      'Fair. That word carries weight here — the desert punishes anyone ' +
      'who breaks a bargain, us included. Keep to it, and Red Wall keeps ' +
      'to its side.',
    choices: [
      {
        id: 'redwall_trust_ack_transaction_1',
        text: 'Agreed.',
        nextId: null,
        effect: { setFlags: { 'redwall.trust.acknowledged': true, 'redwall.trust.transaction': true } },
      },
    ],
  },
]
