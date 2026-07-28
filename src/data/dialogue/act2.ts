// src/data/dialogue/act2.ts
// Act 2 conversations: the soldier, the planetologist, and the mother.
// All writing original to this project.
//
// Act 2's pressure is that the Duke is gone and everyone now wants a decision
// from you specifically. Each of these three is asking you to spend the same
// crews on something different, and none of them think they are being
// unreasonable.

import type { DialogueNode } from '../../types'
import { ACT2_NODES_B } from './act2-b'

export const ACT2_NODES: DialogueNode[] = [
  // --- Gurney Halleck --------------------------------------------------
  {
    id: 'voss_arrival_root',
    speaker: 'Gurney Halleck',
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
    speaker: 'Gurney Halleck',
    text:
      'Give me crews and time and I will give you soldiers. Without me they ' +
      'will get competent and stop. With me they get past that. It is a slower ' +
      'road than you want and the only one there is.',
    choices: [{ id: 'voss_t1', text: 'Begin.', nextId: null }],
  },
  {
    id: 'voss_cost',
    speaker: 'Gurney Halleck',
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
    speaker: 'Gurney Halleck',
    text:
      'No. They have been busy elsewhere and you have been useful to them ' +
      'quiet. Both of those things expire.',
    choices: [{ id: 'voss_y1', text: 'Say what you need.', nextId: 'voss_teach',
      effect: { setFlags: { 'recruited.voss': true } } }],
  },
  {
    id: 'voss_drilling_root',
    speaker: 'Gurney Halleck',
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
    speaker: 'Gurney Halleck',
    text:
      'Fewer than it should have. Sand favours whoever is already lying down in ' +
      'it, and they were. That was training, not luck.',
    choices: [{ id: 'voss_co1', text: 'Good.', nextId: null }],
  },
  ...ACT2_NODES_B,
]
