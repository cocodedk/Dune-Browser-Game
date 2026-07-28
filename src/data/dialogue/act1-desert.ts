// src/data/dialogue/act1-desert.ts
// Act 1 conversations in the deep desert: the naib, the scout, the seer,
// the prospector, the smuggler. All writing original to this project.
//
// The Fremen voice here is short and concrete. They do not explain themselves
// to outsiders, and they measure people by what those people spend.

import type { DialogueNode } from '../../types'
import { DESERT_NODES_B } from './act1-desert-b'

export const DESERT_NODES: DialogueNode[] = [
  // --- Stilgar ---------------------------------------------------------
  {
    id: 'shadir_wary_root',
    speaker: 'Stilgar',
    text:
      'Offworlders come to Red Wall twice. Once to count us, once to ask for ' +
      'something. You have not counted yet, so you are early.',
    choices: [
      { id: 'shadir_w1', text: 'I came to ask what you need.', nextId: 'shadir_need',
        effect: { loyaltyDelta: 6 } },
      { id: 'shadir_w2', text: 'I came to ask for spice.', nextId: 'shadir_blunt',
        effect: { loyaltyDelta: 2 } },
      { id: 'shadir_w3', text: 'I will come back when you are civil.', nextId: null,
        effect: { loyaltyDelta: -5 } },
    ],
  },
  {
    id: 'shadir_need',
    speaker: 'Stilgar',
    text:
      'Water. Always water. After that, to be left to work without a Harkonnen ' +
      'standing over the harvest counting what he has not earned.',
    choices: [
      { id: 'shadir_n1', text: 'I can do something about the second.', nextId: null,
        effect: { loyaltyDelta: 8 } },
      { id: 'shadir_n2', text: 'I cannot promise either yet.', nextId: null,
        effect: { loyaltyDelta: 4 } },
    ],
  },
  {
    id: 'shadir_blunt',
    speaker: 'Stilgar',
    text:
      'At least you said it plainly. The last one spent an hour arriving at it ' +
      'and thought we had not noticed where he was going.',
    choices: [{ id: 'shadir_b1', text: 'Plain is faster.', nextId: null,
      effect: { loyaltyDelta: 3 } }],
  },
  {
    id: 'shadir_considering_root',
    speaker: 'Stilgar',
    text:
      'The sietch has been talking about you. Not warmly — but they have been ' +
      'talking, and last season they would not have bothered.',
    choices: [
      { id: 'shadir_c1', text: 'What would settle it?', nextId: 'shadir_settle' },
      { id: 'shadir_c2', text: 'Let them talk.', nextId: null },
    ],
  },
  {
    id: 'shadir_settle',
    speaker: 'Stilgar',
    text:
      'Come back when you have nothing to ask for. That is the visit that ' +
      'counts.',
    choices: [{ id: 'shadir_s1', text: 'I will.', nextId: null, effect: { loyaltyDelta: 5 } }],
  },
  {
    id: 'shadir_pledged_root',
    speaker: 'Stilgar',
    text:
      'Our people are yours to send. Understand what that means: if you spend ' +
      'them badly, I will not be able to give you more, and I will not want to.',
    choices: [
      { id: 'shadir_p1', text: 'I will spend them carefully.', nextId: null,
        effect: { loyaltyDelta: 3 } },
      { id: 'shadir_p2', text: 'Where should they work?', nextId: 'shadir_work' },
    ],
  },
  {
    id: 'shadir_work',
    speaker: 'Stilgar',
    text:
      'The shallows south of here still give. The deep pans give more and take ' +
      'more. Choose by what the Emperor is asking this month.',
    choices: [{ id: 'shadir_wk1', text: 'Understood.', nextId: null }],
  },

  // --- Chani, the scout ----------------------------------------------------
  {
    id: 'ysane_first_meeting_root',
    speaker: 'Chani',
    text:
      'You walked here from the thopter in the open. In daylight. I watched, ' +
      'in case I had to explain to someone what happened to you.',
    choices: [
      { id: 'ysane_f1', text: 'Show me the better way.', nextId: 'ysane_show',
        effect: { loyaltyDelta: 5 } },
      { id: 'ysane_f2', text: 'I made it, didn\'t I?', nextId: 'ysane_made' },
    ],
  },
  {
    id: 'ysane_show',
    speaker: 'Chani',
    text:
      'There is always a line where the rock holds the sand still. Walk it and ' +
      'the desert does not notice you. Ignore it and it does.',
    choices: [{ id: 'ysane_s1', text: 'Teach me the lines.', nextId: null,
      effect: { loyaltyDelta: 6 } }],
  },
  {
    id: 'ysane_made',
    speaker: 'Chani',
    text: 'So did the last one. Twice.',
    choices: [{ id: 'ysane_m1', text: 'Point taken.', nextId: null,
      effect: { loyaltyDelta: 2 } }],
  },
  {
    id: 'ysane_recruited_root',
    speaker: 'Chani',
    text:
      'I know six ways off this ridge and four of them are not on any map you ' +
      'own. Tell me where you are going and I will shorten it.',
    choices: [{ id: 'ysane_r1', text: 'Walk with me.', nextId: null }],
  },
  ...DESERT_NODES_B,
]
