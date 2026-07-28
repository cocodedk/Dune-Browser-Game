// src/data/dialogue/act1-palace.ts
// Act 1 conversations at Arrakeen: the Duke, the steward, the Emperor's envoy.
// All writing original to this project.
//
// House style: nobody explains a mechanic. They state a position, and the
// mechanic is the shape of what they are worried about.

import type { DialogueNode } from '../../types'

export const PALACE_NODES: DialogueNode[] = [
  // --- Duke Leto Atreides ---------------------------------------------------------
  {
    id: 'duke_briefing_root',
    speaker: 'Duke Leto Atreides',
    text:
      'Spice is the only reason anyone tolerates this planet, and the Emperor ' +
      'has decided we are the ones who will dig it. The Fremen have been doing ' +
      'it for generations without our help. Go and ask them for theirs.',
    choices: [
      { id: 'duke_b1', text: 'They have no reason to give it.', nextId: 'duke_briefing_reason' },
      { id: 'duke_b2', text: 'How long do we have?', nextId: 'duke_briefing_time' },
      { id: 'duke_b3', text: 'I will go.', nextId: null, effect: { influenceDelta: 2 } },
    ],
  },
  {
    id: 'duke_briefing_reason',
    speaker: 'Duke Leto Atreides',
    text:
      'None at all. That is rather the point of asking rather than ordering. ' +
      'Take water, take patience, and take your time — you have a little of it.',
    choices: [{ id: 'duke_br1', text: 'Then I had better start.', nextId: null }],
  },
  {
    id: 'duke_briefing_time',
    speaker: 'Duke Leto Atreides',
    text:
      'Twelve days before the first tribute. After that, eight between each. ' +
      'They chose those numbers before they had seen the ground.',
    choices: [{ id: 'duke_bt1', text: 'Understood.', nextId: null }],
  },
  {
    id: 'duke_first_quota_root',
    speaker: 'Duke Leto Atreides',
    text:
      'Vell tells me the ledger balanced. He said it the way a physician says ' +
      'a fever has broken — accurately, and without promising anything.',
    choices: [
      { id: 'duke_q1', text: 'It will be harder next time.', nextId: 'duke_quota_harder' },
      { id: 'duke_q2', text: 'We will manage.', nextId: null },
    ],
  },
  {
    id: 'duke_quota_harder',
    speaker: 'Duke Leto Atreides',
    text: 'It is designed to be. That is not an accident of arithmetic.',
    choices: [{ id: 'duke_qh1', text: 'Say what you mean.', nextId: null }],
  },
  {
    id: 'duke_after_revelation_root',
    speaker: 'Duke Leto Atreides',
    text:
      'We were not given Arrakis. We were placed on it, the way a man places a ' +
      'coin on a table before turning over his cards. Whatever we build here, ' +
      'build it so it does not need us.',
    choices: [
      { id: 'duke_r1', text: 'The Fremen already do not need us.', nextId: null,
        effect: { influenceDelta: 4 } },
      { id: 'duke_r2', text: 'Then we make ourselves expensive to discard.', nextId: null,
        effect: { influenceDelta: 3 } },
    ],
  },

  // --- Thufir Hawat, the ledger ---------------------------------------------
  {
    id: 'vell_ledger_root',
    speaker: 'Thufir Hawat',
    text:
      'The ledger is current. What it does not say is where the next column ' +
      'comes from — that part is yours. I only write down what arrives.',
    choices: [
      { id: 'vell_l1', text: 'What arrives is not enough.', nextId: 'vell_not_enough' },
      { id: 'vell_l2', text: 'Keep it current.', nextId: null },
    ],
  },
  {
    id: 'vell_not_enough',
    speaker: 'Thufir Hawat',
    text:
      'No. Crews cost nothing to move and everything to waste. A crew standing ' +
      'idle is the most expensive thing on this planet.',
    choices: [{ id: 'vell_ne1', text: 'Noted.', nextId: null }],
  },
  {
    id: 'vell_arrears_root',
    speaker: 'Thufir Hawat',
    text:
      'We are carrying a balance. The Imperium adds a quarter to anything it ' +
      'has to wait for, and it never forgets to. Shortfalls compound.',
    choices: [
      { id: 'vell_a1', text: 'Can we clear it?', nextId: 'vell_clear' },
      { id: 'vell_a2', text: 'Then we stop being short.', nextId: null },
    ],
  },
  {
    id: 'vell_clear',
    speaker: 'Thufir Hawat',
    text:
      'One good cycle would. Two poor ones and the interest is doing more work ' +
      'than your crews are.',
    choices: [{ id: 'vell_c1', text: 'Understood.', nextId: null }],
  },

  // --- Count Fenring, the Emperor's patience -------------------------------
  {
    id: 'corvin_formal_root',
    speaker: 'Count Fenring',
    text:
      'His Imperial Majesty conveys his confidence in your administration. ' +
      'I am instructed to observe, record, and convey. I have conveyed.',
    choices: [
      { id: 'corvin_f1', text: 'And to observe what, exactly?', nextId: 'corvin_observe' },
      { id: 'corvin_f2', text: 'Thank the Emperor for me.', nextId: null },
    ],
  },
  {
    id: 'corvin_observe',
    speaker: 'Count Fenring',
    text:
      'Tonnage. Only ever tonnage. I am told the rest is atmosphere.',
    choices: [{ id: 'corvin_o1', text: 'Then you will be well fed here.', nextId: null }],
  },
  {
    id: 'corvin_displeased_root',
    speaker: 'Count Fenring',
    text:
      'The last shipment was light. I have written it down exactly as light as ' +
      'it was — I am not permitted to round in your favour, and I would not.',
    choices: [
      { id: 'corvin_d1', text: 'It will be made up.', nextId: 'corvin_made_up' },
      { id: 'corvin_d2', text: 'Write what you like.', nextId: null,
        effect: { influenceDelta: -2 } },
    ],
  },
  {
    id: 'corvin_made_up',
    speaker: 'Count Fenring',
    text:
      'They all say so. The ones who mean it usually look less certain than you do.',
    choices: [{ id: 'corvin_mu1', text: 'We will see.', nextId: null }],
  },
  {
    id: 'corvin_final_warning_root',
    speaker: 'Count Fenring',
    text:
      'I am instructed to inform you that His Majesty\'s patience is a finite ' +
      'instrument and you are near the end of it. I am also instructed to ' +
      'watch your face while I say it. I have done both.',
    choices: [
      { id: 'corvin_w1', text: 'What happens at the end of it?', nextId: 'corvin_end' },
      { id: 'corvin_w2', text: 'You have seen my face. Go.', nextId: null },
    ],
  },
  {
    id: 'corvin_end',
    speaker: 'Count Fenring',
    text:
      'Sardaukar arrive to audit the accounts. They are thorough, and they are ' +
      'not accountants.',
    choices: [{ id: 'corvin_e1', text: 'Then the accounts will balance.', nextId: null }],
  },
]
