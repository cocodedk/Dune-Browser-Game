// src/data/dialogue/opening-briefing.ts
// Beat 1 — the Duke's briefing (docs/PRD/game-completion/
// 03-opening-experience.md "Teaching sequence" Beat 1). Its own dedicated
// tree, registered under BRIEFING_TREE_ID in DialogueSystem.ts's TREES —
// deliberately NOT folded into STORY_NODES/STORY_TREE_ID, the same reasoning
// progress.md Round 11 states for Beat 4: an opening beat's (tree, node)
// reward budget must not share a tree with ongoing narrative content, or
// content authored later under 'story' could accidentally look "already
// paid" against a node id this tree also happens to use.
//
// All three root replies are pure tone: no loyaltyDelta/spiceDelta/
// charismaDelta anywhere in this file (03 Beat 1 point 3 — "do not conceal
// a mechanical trap"; progress.md Round 11 — "NO new positive spiceDelta in
// opening content"). Only the three closing choices carry an effect at all,
// and it is the same one regardless of path: `setFlags: { 'briefing.complete':
// true }` (03 Beat 1 point 4). DialogueSystem.ts's endDialogue() refuses to
// close this tree early (see canCloseDialogue) — the beat completes exactly
// once, through exactly one of these three closings.

import type { DialogueNode } from '../../types'

export const BRIEFING_NODES: DialogueNode[] = [
  {
    id: 'briefing_root',
    speaker: 'Duke Leto Atreides',
    text:
      'Arrakis is not a gift, whatever the Emperor calls it. He has placed us ' +
      'here to fail where he can watch it happen, and the price of failing ' +
      'starts with the first tribute — spice we have no way to raise ' +
      'ourselves yet. The Fremen have raised it for generations without our ' +
      'help. Learn what the ledger demands of us, then go earn Red Wall ' +
      'Sietch’s trust; without them, we dig nothing at all.',
    choices: [
      { id: 'briefing_understand', text: 'Then I should understand the numbers first.', nextId: 'briefing_ack_practical' },
      { id: 'briefing_doubt', text: 'The Fremen won’t simply hand it to us.', nextId: 'briefing_ack_skeptical' },
      { id: 'briefing_promise', text: 'I won’t let the house fail on my account.', nextId: 'briefing_ack_personal' },
    ],
  },
  {
    id: 'briefing_ack_practical',
    speaker: 'Duke Leto Atreides',
    text:
      'Good. Thufir has the figures exactly, to the measure — hear him out ' +
      'before you go anywhere near the desert.',
    choices: [
      { id: 'briefing_ack_practical_1', text: 'I’ll hear him out.', nextId: null,
        effect: { setFlags: { 'briefing.complete': true } } },
    ],
  },
  {
    id: 'briefing_ack_skeptical',
    speaker: 'Duke Leto Atreides',
    text:
      'No one is asking them to hand over anything. Trust is earned at ' +
      'walking distance from here, not demanded by a title none of them ' +
      'recognize.',
    choices: [
      { id: 'briefing_ack_skeptical_1', text: 'Understood.', nextId: null,
        effect: { setFlags: { 'briefing.complete': true } } },
    ],
  },
  {
    id: 'briefing_ack_personal',
    speaker: 'Duke Leto Atreides',
    text: 'Then don’t. Go carefully, and go informed — Thufir first.',
    choices: [
      { id: 'briefing_ack_personal_1', text: 'I will.', nextId: null,
        effect: { setFlags: { 'briefing.complete': true } } },
    ],
  },
]
