// src/data/dialogue/duncan.ts
// Duncan Idaho at Wind Pass. Writing original to this project.
//
// He is the one Atreides the Fremen let inside, which makes him the bridge
// between the two halves of the cast — and the person who can tell the player
// that the desert has rules rather than dangers.

import type { DialogueNode } from '../../types'

export const DUNCAN_NODES: DialogueNode[] = [
  {
    id: 'duncan_root',
    speaker: 'Duncan Idaho',
    text:
      'You found me. Good — I was starting to think the household had forgotten ' +
      'where they sent me. I have been three months in the sietches and I have ' +
      'learned one useful thing, which is that everything we were told about ' +
      'this planet was told to us by people who never left Arrakeen.',
    choices: [
      { id: 'dun_a1', text: 'What did they get wrong?', nextId: 'duncan_wrong' },
      { id: 'dun_a2', text: 'Can the Fremen be brought to us?',
        nextId: 'duncan_fremen' },
      { id: 'dun_a3', text: 'Come back with me.', nextId: 'duncan_stay' },
    ],
  },
  {
    id: 'duncan_wrong',
    speaker: 'Duncan Idaho',
    text:
      'The numbers. The Imperium counts maybe a few hundred thousand Fremen ' +
      'because that is how many it can see. I have walked through sietches that ' +
      'are not on any map holding more than Arrakeen does. If you can hold them ' +
      'you do not need the Emperor. That is not a strategy yet. It is an ' +
      'arithmetic problem nobody has done.',
    choices: [
      { id: 'dun_w1', text: 'Then I will do it.', nextId: null,
        effect: { setFlags: { 'taught.fremen_numbers': true }, influenceDelta: 4 } },
    ],
  },
  {
    id: 'duncan_fremen',
    speaker: 'Duncan Idaho',
    text:
      'Brought? No. They are not a resource to be moved. They will decide about ' +
      'you the way they decide about weather — by watching for a long time and ' +
      'then acting all at once. Pay what you promise, leave their water alone, ' +
      'and do not ask them to die for a house they have never seen.',
    choices: [
      { id: 'dun_f1', text: 'That is a slow road.', nextId: 'duncan_slow' },
      { id: 'dun_f2', text: 'Then I will earn it.', nextId: null,
        effect: { influenceDelta: 3 } },
    ],
  },
  {
    id: 'duncan_slow',
    speaker: 'Duncan Idaho',
    text:
      'It is the only one. The Harkonnens tried the fast one for eighty years ' +
      'and left with less than they arrived with.',
    choices: [{ id: 'dun_s1', text: 'Noted.', nextId: null }],
  },
  {
    id: 'duncan_stay',
    speaker: 'Duncan Idaho',
    text:
      'I am more use here than standing behind your chair. Send for me when ' +
      'there is something worth a sword, and I will come at a run. Until then ' +
      'let me keep being the one Atreides they will talk to.',
    choices: [{ id: 'dun_st1', text: 'Stay, then.', nextId: null }],
  },
]
