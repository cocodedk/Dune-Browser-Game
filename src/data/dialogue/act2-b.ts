// src/data/dialogue/act2-b.ts
// Second half of the Act 2 conversations. Split from act2.ts, which had grown
// past the repository's file limit.

import type { DialogueNode } from '../../types'

export const ACT2_NODES_B: DialogueNode[] = [
  // --- Liet-Kynes -----------------------------------------------------
  {
    id: 'vast_proposal_root',
    speaker: 'Liet-Kynes',
    text:
      'I can make part of this planet hold water. Not quickly — decades, ' +
      'properly done, and I will not see the end of it. What I need is people, ' +
      'and the only people here are yours.',
    choices: [
      { id: 'vast_p1', text: 'What does it cost me?', nextId: 'vast_cost' },
      { id: 'vast_p2', text: 'What does it give me?', nextId: 'vast_gives' },
      { id: 'vast_p3', text: 'I am owed spice, not gardens.', nextId: 'vast_gardens' },
    ],
  },
  {
    id: 'vast_cost',
    speaker: 'Liet-Kynes',
    text:
      'Everything they would have dug, and it never comes back as spice. Worse: ' +
      'where the green takes properly, the sand stops giving at all. No blows, ' +
      'not ever again. I will not pretend otherwise to get your crews.',
    choices: [
      { id: 'vast_c1', text: 'You are honest, at least.', nextId: 'vast_gives',
        effect: { setFlags: { 'taught.ecology': true } } },
      { id: 'vast_c2', text: 'Then no.', nextId: null },
    ],
  },
  {
    id: 'vast_gives',
    speaker: 'Liet-Kynes',
    text:
      'Ground that holds people. Sietches that stop losing a tenth of their ' +
      'young to the crossing. The Fremen have been told what this planet is for ' +
      'by everyone who ever landed on it. Nobody has asked them what they want ' +
      'it to be.',
    choices: [
      { id: 'vast_g1', text: 'Take the crews you need.', nextId: null,
        effect: { setFlags: { 'taught.ecology': true }, influenceDelta: 3 } },
      { id: 'vast_g2', text: 'Not while the Emperor is counting.', nextId: null },
    ],
  },
  {
    id: 'vast_gardens',
    speaker: 'Liet-Kynes',
    text:
      'You are owed spice by a man who will be owed spice by someone else long ' +
      'after you are recalled. I am proposing the only thing here that outlasts ' +
      'the arrangement.',
    choices: [
      { id: 'vast_gd1', text: 'Go on.', nextId: 'vast_gives' },
      { id: 'vast_gd2', text: 'The arrangement is what feeds us.', nextId: null },
    ],
  },
  {
    id: 'vast_planting_root',
    speaker: 'Liet-Kynes',
    text:
      'The first plantings have taken. They will not look like anything for a ' +
      'long while — that is normal, and it is the part that makes people stop.',
    choices: [
      { id: 'vast_pl1', text: 'We will not stop.', nextId: null, effect: { influenceDelta: 2 } },
      { id: 'vast_pl2', text: 'How long until it matters?', nextId: 'vast_long' },
    ],
  },
  {
    id: 'vast_long',
    speaker: 'Liet-Kynes',
    text:
      'Long enough that you will be tempted to pull the crews twice before it ' +
      'does. Both times it will look like the sensible decision.',
    choices: [{ id: 'vast_l1', text: 'Noted.', nextId: null }],
  },

  // --- Lady Jessica ----------------------------------------------------------
  {
    id: 'maren_counsel_root',
    speaker: 'Lady Jessica',
    text:
      'Your father governs as though the ledger were the whole of it. He is not ' +
      'wrong, only incomplete. Every name you learn out there is worth a column ' +
      'of it.',
    choices: [
      { id: 'maren_c1', text: 'Names do not pay tribute.', nextId: 'maren_names' },
      { id: 'maren_c2', text: 'Whose name should I learn next?', nextId: 'maren_next',
        effect: { influenceDelta: 2 } },
    ],
  },
  {
    id: 'maren_names',
    speaker: 'Lady Jessica',
    text:
      'No. They pay everything after the tribute. The Harkonnens held this ' +
      'planet for eighty years and could not raise a single sietch to fight for ' +
      'them. That was not a failure of arms.',
    choices: [{ id: 'maren_n1', text: 'I take the point.', nextId: null,
      effect: { influenceDelta: 2 } }],
  },
  {
    id: 'maren_next',
    speaker: 'Lady Jessica',
    text:
      'The naibs first — they decide what their people believe about you before ' +
      'you have said anything. And the smuggler, because he tells the truth for ' +
      'money, which is more reliable than telling it for love.',
    choices: [{ id: 'maren_nx1', text: 'I will go.', nextId: null }],
  },
  {
    id: 'maren_alone_root',
    speaker: 'Lady Jessica',
    text:
      'They have taken him as surety and called it a summons. So it is you now, ' +
      'and everyone downstairs is waiting to find out whether that is different.',
    choices: [
      { id: 'maren_a1', text: 'It will be different.', nextId: 'maren_different',
        effect: { influenceDelta: 4 } },
      { id: 'maren_a2', text: 'Will they take me too?', nextId: 'maren_take' },
    ],
  },
  {
    id: 'maren_different',
    speaker: 'Lady Jessica',
    text:
      'Then let it be different in the desert first. Whatever you build out ' +
      'there is the only part of this they cannot summon.',
    choices: [{ id: 'maren_d1', text: 'Understood.', nextId: null }],
  },
  {
    id: 'maren_take',
    speaker: 'Lady Jessica',
    text:
      'Not while you are producing. That is the whole of your protection, and ' +
      'it is worth knowing precisely how thin it is.',
    choices: [{ id: 'maren_t1', text: 'Thin is still protection.', nextId: null }],
  }
]
