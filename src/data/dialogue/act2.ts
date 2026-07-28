// src/data/dialogue/act2.ts
// Act 2 conversations: the soldier, the planetologist, and the mother.
// All writing original to this project.
//
// Act 2's pressure is that the Duke is gone and everyone now wants a decision
// from you specifically. Each of these three is asking you to spend the same
// crews on something different, and none of them think they are being
// unreasonable.

import type { DialogueNode } from '../../types'

export const ACT2_NODES: DialogueNode[] = [
  // --- Captain Serra Voss --------------------------------------------------
  {
    id: 'voss_arrival_root',
    speaker: 'Captain Serra Voss',
    text:
      'I have seen your crews. They are excellent at digging and they will die ' +
      'in the first hour of anything else. That is not an insult to them — ' +
      'nobody has asked them to be anything but diggers.',
    choices: [
      { id: 'voss_a1', text: 'Then make them something else.', nextId: 'voss_teach',
        effect: { setFlags: { 'recruited.voss': true } } },
      { id: 'voss_a2', text: 'Every hand drilling is a hand not earning.',
        nextId: 'voss_cost' },
      { id: 'voss_a3', text: 'The Harkonnens have not come here.', nextId: 'voss_yet' },
    ],
  },
  {
    id: 'voss_teach',
    speaker: 'Captain Serra Voss',
    text:
      'Give me crews and time and I will give you soldiers. Without me they ' +
      'will get competent and stop. With me they get past that. It is a slower ' +
      'road than you want and the only one there is.',
    choices: [{ id: 'voss_t1', text: 'Begin.', nextId: null }],
  },
  {
    id: 'voss_cost',
    speaker: 'Captain Serra Voss',
    text:
      'Correct. And every hand earning is a hand that cannot hold a sietch when ' +
      'the raiders come. I am not telling you which to choose. I am telling you ' +
      'the choice is real and you are already making it by not making it.',
    choices: [
      { id: 'voss_c1', text: 'Then I will make it deliberately.', nextId: 'voss_teach',
        effect: { setFlags: { 'recruited.voss': true } } },
      { id: 'voss_c2', text: 'Later.', nextId: null },
    ],
  },
  {
    id: 'voss_yet',
    speaker: 'Captain Serra Voss',
    text:
      'No. They have been busy elsewhere and you have been useful to them ' +
      'quiet. Both of those things expire.',
    choices: [{ id: 'voss_y1', text: 'Say what you need.', nextId: 'voss_teach',
      effect: { setFlags: { 'recruited.voss': true } } }],
  },
  {
    id: 'voss_drilling_root',
    speaker: 'Captain Serra Voss',
    text:
      'They held. That is worth saying plainly, because it will not always be ' +
      'true and you should know what it sounds like when it is.',
    choices: [
      { id: 'voss_d1', text: 'What did it cost?', nextId: 'voss_cost_of' },
      { id: 'voss_d2', text: 'Keep them drilling.', nextId: null },
    ],
  },
  {
    id: 'voss_cost_of',
    speaker: 'Captain Serra Voss',
    text:
      'Fewer than it should have. Sand favours whoever is already lying down in ' +
      'it, and they were. That was training, not luck.',
    choices: [{ id: 'voss_co1', text: 'Good.', nextId: null }],
  },

  // --- Dr. Imrell Vast -----------------------------------------------------
  {
    id: 'vast_proposal_root',
    speaker: 'Dr. Imrell Vast',
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
    speaker: 'Dr. Imrell Vast',
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
    speaker: 'Dr. Imrell Vast',
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
    speaker: 'Dr. Imrell Vast',
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
    speaker: 'Dr. Imrell Vast',
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
    speaker: 'Dr. Imrell Vast',
    text:
      'Long enough that you will be tempted to pull the crews twice before it ' +
      'does. Both times it will look like the sensible decision.',
    choices: [{ id: 'vast_l1', text: 'Noted.', nextId: null }],
  },

  // --- Lady Maren ----------------------------------------------------------
  {
    id: 'maren_counsel_root',
    speaker: 'Lady Maren',
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
    speaker: 'Lady Maren',
    text:
      'No. They pay everything after the tribute. The Harkonnens held this ' +
      'planet for eighty years and could not raise a single sietch to fight for ' +
      'them. That was not a failure of arms.',
    choices: [{ id: 'maren_n1', text: 'I take the point.', nextId: null,
      effect: { influenceDelta: 2 } }],
  },
  {
    id: 'maren_next',
    speaker: 'Lady Maren',
    text:
      'The naibs first — they decide what their people believe about you before ' +
      'you have said anything. And the smuggler, because he tells the truth for ' +
      'money, which is more reliable than telling it for love.',
    choices: [{ id: 'maren_nx1', text: 'I will go.', nextId: null }],
  },
  {
    id: 'maren_alone_root',
    speaker: 'Lady Maren',
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
    speaker: 'Lady Maren',
    text:
      'Then let it be different in the desert first. Whatever you build out ' +
      'there is the only part of this they cannot summon.',
    choices: [{ id: 'maren_d1', text: 'Understood.', nextId: null }],
  },
  {
    id: 'maren_take',
    speaker: 'Lady Maren',
    text:
      'Not while you are producing. That is the whole of your protection, and ' +
      'it is worth knowing precisely how thin it is.',
    choices: [{ id: 'maren_t1', text: 'Thin is still protection.', nextId: null }],
  },
]
