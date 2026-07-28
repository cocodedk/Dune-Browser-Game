// src/data/dialogue/act1-desert-b.ts
// Second half of the Act 1 desert conversations. Split from act1-desert.ts,
// which had grown past the repository's file limit.

import type { DialogueNode } from '../../types'

export const DESERT_NODES_B: DialogueNode[] = [
  // --- Reverend Mother Ramallo, the rituals --------------------------------------------
  {
    id: 'sova_greeting_root',
    speaker: 'Reverend Mother Ramallo',
    text:
      'You are loud. Not your voice — the rest of you. Come back when fewer ' +
      'people are waiting on your decisions.',
    choices: [{ id: 'sova_g1', text: 'That may be a while.', nextId: null }],
  },
  {
    id: 'sova_ritual_root',
    speaker: 'Reverend Mother Ramallo',
    text:
      'There is a thing we do with spice that is not commerce. It shows you the ' +
      'shape of what you already know, which is worse than a surprise. It costs ' +
      'twenty measures and you may not like what it makes of you.',
    choices: [
      { id: 'sova_r1', text: 'Do it.', nextId: 'sova_after',
        effect: { spiceDelta: -20, influenceDelta: 5 } },
      { id: 'sova_r2', text: 'Not yet.', nextId: null },
    ],
  },
  {
    id: 'sova_after',
    speaker: 'Reverend Mother Ramallo',
    text:
      'There. You are wider than you were. Do not mistake that for being right.',
    choices: [{ id: 'sova_a1', text: 'I will try not to.', nextId: null }],
  },

  // --- Shishakli, the prospector ------------------------------------------------
  {
    id: 'pell_offer_root',
    speaker: 'Shishakli',
    text:
      'You have two fields and you are working both flat. That is fine until ' +
      'they are empty, and they will be empty sooner than you think. I can find ' +
      'you more — if you can spare a crew to look instead of dig.',
    choices: [
      { id: 'pell_o1', text: 'Teach a crew to prospect.', nextId: 'pell_teach',
        effect: { setFlags: { 'taught.prospecting': true } } },
      { id: 'pell_o2', text: 'I cannot spare anyone.', nextId: 'pell_cannot' },
    ],
  },
  {
    id: 'pell_teach',
    speaker: 'Shishakli',
    text:
      'Good. They need a thopter — you cannot read the dunes from the ground, ' +
      'you can only read the one you are standing on.',
    choices: [{ id: 'pell_t1', text: 'I will get one.', nextId: null }],
  },
  {
    id: 'pell_cannot',
    speaker: 'Shishakli',
    text:
      'Then you will dig the same two fields until they give out, and find out ' +
      'about the third one from whoever got there first.',
    choices: [{ id: 'pell_c1', text: 'I will think about it.', nextId: null }],
  },
  {
    id: 'pell_taught_root',
    speaker: 'Shishakli',
    text:
      'Your crew is reading ground properly now. Send them somewhere you have ' +
      'not looked — a region gives up three finds and then it is finished.',
    choices: [{ id: 'pell_tt1', text: 'Understood.', nextId: null }],
  },

  // --- Esmar Tuek, the smuggler ---------------------------------------------
  {
    id: 'meko_first_root',
    speaker: 'Esmar Tuek',
    text:
      'You are the new administration. I sell to administrations, and I sell to ' +
      'the people they are administering. Prices are the same. That is the only ' +
      'honesty I offer and it is more than most.',
    choices: [
      { id: 'meko_f1', text: 'What do you have?', nextId: 'meko_stock' },
      { id: 'meko_f2', text: 'You sell to the Harkonnens.', nextId: 'meko_harkonnen' },
    ],
  },
  {
    id: 'meko_stock',
    speaker: 'Esmar Tuek',
    text:
      'A harvester, if you have a hundred. A thopter for eighty — worth more ' +
      'than the harvester if you cannot find sand to put it on. Blades, cheap.',
    choices: [{ id: 'meko_s1', text: 'Let me look.', nextId: null }],
  },
  {
    id: 'meko_harkonnen',
    speaker: 'Esmar Tuek',
    text:
      'I did. They stopped paying and started taking. You will find that is the ' +
      'whole of my politics.',
    choices: [{ id: 'meko_h1', text: 'Then we will pay.', nextId: null }],
  },
  {
    id: 'meko_regular_root',
    speaker: 'Esmar Tuek',
    text:
      'Back again. Good. Regular buyers get told things first — that is not ' +
      'generosity, it is what keeps them regular.',
    choices: [{ id: 'meko_r1', text: 'What are you hearing?', nextId: null }],
  }
]
