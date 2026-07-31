import type { DialogueNode } from '../types';

export const villageLeader: DialogueNode[] = [
  {
    id: 'start',
    speaker: 'Village Elder',
    text: 'A stranger arrives. The desert does not welcome the weak. What do you want, off-worlder?',
    choices: [
      {
        id: 'offer_help',
        text: 'I want to help your people. The Harkonnen are your true enemy.',
        nextId: 'offer_accepted',
        effect: { loyaltyDelta: 15, influenceDelta: 5, reputationAction: { type: 'help_village', factionAffinity: 'fremen' } },
      },
      {
        id: 'demand_spice',
        text: 'I need your spice production. The Emperor demands it.',
        nextId: 'demand_rejected',
        effect: { loyaltyDelta: -10, reputationAction: { type: 'attack_faction', target: 'fremen' } },
      },
      {
        id: 'just_passing',
        text: 'Just passing through.',
        nextId: null,
      },
    ],
  },
  {
    id: 'offer_accepted',
    speaker: 'Village Elder',
    text: 'Bold words. The Fremen judge by actions, not words. Prove yourself and we may walk the same path.',
    choices: [
      {
        id: 'swear_protection',
        text: 'I swear my protection to this village.',
        nextId: 'sworn',
        effect: { loyaltyDelta: 20, influenceDelta: 10, reputationAction: { type: 'honor_agreement', partner: 'fremen' } },
      },
      {
        id: 'learn_more',
        text: 'Tell me about the Harkonnen threat.',
        nextId: 'harkonnen_info',
      },
    ],
  },
  {
    id: 'demand_rejected',
    speaker: 'Village Elder',
    text: 'Leave. You are no different from the Harkonnen. The desert will swallow you.',
    choices: [
      {
        id: 'apologize',
        text: 'I spoke too harshly. Forgive me.',
        nextId: 'offer_accepted',
        effect: { loyaltyDelta: 5 },
      },
      {
        id: 'leave_hostile',
        text: 'You will regret this.',
        nextId: null,
        effect: { loyaltyDelta: -5 },
      },
    ],
  },
  {
    id: 'harkonnen_info',
    speaker: 'Village Elder',
    text: 'The Harkonnen bleed us dry. They take spice and leave hunger. Three villages remain free -- for now. If they fall, Arrakis is lost.',
    choices: [
      {
        id: 'commit',
        text: 'I will stop them.',
        nextId: 'sworn',
        effect: { loyaltyDelta: 15, influenceDelta: 8, reputationAction: { type: 'help_village', factionAffinity: 'fremen' } },
      },
      {
        id: 'end_info',
        text: 'I understand. I must go.',
        nextId: null,
      },
    ],
  },
  {
    id: 'sworn',
    speaker: 'Village Elder',
    text: 'Then we stand together. Shai-Hulud watches. Do not break your word.',
    choices: [
      {
        id: 'farewell',
        text: 'I will return.',
        nextId: null,
        effect: { influenceDelta: 5 },
      },
    ],
  },
];

export const harkonnenStronghold: DialogueNode[] = [
  {
    id: 'hk_start',
    speaker: 'Harkonnen Overseer',
    text: 'Halt. This settlement answers to House Harkonnen. State your business -- and choose your words carefully, off-worlder.',
    choices: [
      {
        id: 'hk_trade',
        text: 'I carry spice credits. I seek safe passage and perhaps a mutually profitable arrangement.',
        nextId: 'hk_bribed',
        effect: { loyaltyDelta: 8, spiceDelta: -5, reputationAction: { type: 'trade_with_faction', target: 'harkonnen', amount: 5 } },
      },
      {
        id: 'hk_challenge',
        text: 'I answer to no Harkonnen dog. Step aside.',
        nextId: 'hk_dismissed',
        effect: { loyaltyDelta: -15, reputationAction: { type: 'attack_faction', target: 'harkonnen' } },
      },
      {
        id: 'hk_observe',
        text: 'My apologies. I am merely a traveller -- curious about who holds this territory.',
        nextId: 'hk_suspicious',
      },
    ],
  },
  {
    id: 'hk_suspicious',
    speaker: 'Harkonnen Overseer',
    text: 'Curious, are you? Curiosity is expensive out here. The Baron does not appreciate spies in his settlements. Make yourself useful or make yourself scarce.',
    choices: [
      {
        id: 'hk_offer_info',
        text: 'I have seen Fremen movement two dunes north. That information might interest your garrison.',
        nextId: 'hk_bribed',
        effect: { loyaltyDelta: 10, influenceDelta: -3, reputationAction: { type: 'help_village', factionAffinity: 'harkonnen' } },
      },
      {
        id: 'hk_retreat_quiet',
        text: 'Scarce it is. I meant no offence.',
        nextId: null,
      },
    ],
  },
  {
    id: 'hk_bribed',
    speaker: 'Harkonnen Overseer',
    text: 'Sensible. You may pass -- this time. Cross us again and the desert will be the least of your concerns. We are watching.',
    choices: [
      {
        id: 'hk_accept_terms',
        text: 'Understood. I will not forget this... courtesy.',
        nextId: null,
        effect: { influenceDelta: 5 },
      },
    ],
  },
  {
    id: 'hk_dismissed',
    speaker: 'Harkonnen Overseer',
    text: 'Bold words for a dead man walking. Leave now -- before I change my mind about letting you walk at all.',
    choices: [
      {
        id: 'hk_back_down',
        text: 'I spoke rashly. I will go.',
        nextId: null,
        effect: { loyaltyDelta: 5 },
      },
      {
        id: 'hk_leave_defiant',
        text: 'We will meet again, Overseer.',
        nextId: null,
      },
    ],
  },
];