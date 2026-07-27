import type { DialogueNode } from '../types';

export const emperorDelegation: DialogueNode[] = [
  {
    id: 'emp_summon',
    speaker: 'Imperial Legate',
    text: 'By order of the Padishah Emperor, this territory is subject to Imperial oversight. You will present your spice tribute. Am I understood?',
    choices: [
      {
        id: 'emp_comply',
        text: 'Of course. The Emperor\'s will is law.',
        nextId: 'emp_paid',
        effect: { spiceDelta: -20, loyaltyDelta: 5, influenceDelta: -5, reputationAction: { type: 'honor_agreement', partner: 'emperor' } },
      },
      {
        id: 'emp_negotiate',
        text: 'The tribute is steep. I wish to negotiate terms.',
        nextId: 'emp_negotiate',
        effect: { loyaltyDelta: -3 },
      },
      {
        id: 'emp_defy',
        text: 'The Emperor has no authority here. Send my regards to Kaitain.',
        nextId: 'emp_defy',
        effect: { loyaltyDelta: -15, influenceDelta: -10, reputationAction: { type: 'attack_faction', target: 'emperor' } },
      },
    ],
  },
  {
    id: 'emp_paid',
    speaker: 'Imperial Legate',
    text: 'Wise. The Emperor appreciates compliance. Your contribution will be noted in the Imperial record. Continue your operations -- under our watchful eye.',
    choices: [
      {
        id: 'emp_accept_oversight',
        text: 'I understand. We will meet the next quota as well.',
        nextId: null,
        effect: { spiceDelta: -5, influenceDelta: 3 },
      },
      {
        id: 'emp_cautionary',
        text: 'I trust this is the last such... visit.',
        nextId: null,
        effect: { loyaltyDelta: -2 },
      },
    ],
  },
  {
    id: 'emp_negotiate',
    speaker: 'Imperial Legate',
    text: 'Negotiate? With the Imperial delegation? There is a protocol for this. You may petition for a reduced rate -- if you offer something of equal value in return.',
    choices: [
      {
        id: 'emp_offer_alliance',
        text: 'I offer my services as a local informer. Knowledge for a lighter tribute.',
        nextId: 'emp_concede',
        effect: { spiceDelta: -10, influenceDelta: 5, reputationAction: { type: 'trade_with_faction', target: 'emperor', amount: 10 } },
      },
      {
        id: 'emp_offered_little',
        text: 'I can offer a smaller shipment now, with the rest to follow.',
        nextId: 'emp_concede',
        effect: { spiceDelta: -8, loyaltyDelta: -5 },
      },
    ],
  },
  {
    id: 'emp_concede',
    speaker: 'Imperial Legate',
    text: 'Acceptable -- this time. The Emperor is patient, but his patience has a price. Do not test it again.',
    choices: [
      {
        id: 'emp_depart_respectful',
        text: 'I will not. The Empire has my cooperation.',
        nextId: null,
        effect: { influenceDelta: 5 },
      },
    ],
  },
  {
    id: 'emp_defy',
    speaker: 'Imperial Legate',
    text: 'Defiance. The Sardaukar have broken greater men than you. Consider this a formal warning -- the next delegation will not be diplomats.',
    choices: [
      {
        id: 'emp_retreat',
        text: 'Perhaps I was hasty. I will pay the tribute.',
        nextId: 'emp_paid',
        effect: { spiceDelta: -20, loyaltyDelta: -5 },
      },
      {
        id: 'emp_stand_firm',
        text: 'I stand by my words. Send whoever you wish.',
        nextId: null,
        effect: { loyaltyDelta: -10, influenceDelta: -10, reputationAction: { type: 'attack_faction', target: 'emperor' } },
      },
    ],
  },
];