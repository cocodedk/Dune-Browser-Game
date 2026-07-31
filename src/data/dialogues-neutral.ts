import type { DialogueNode } from '../types';

export const neutralSettlement: DialogueNode[] = [
  {
    id: 'neutral_greet',
    speaker: 'Village Elder',
    text: 'Another off-worlder. We survive out here by trusting no one completely -- and offending no one unnecessarily. What is your business, stranger?',
    choices: [
      {
        id: 'neutral_offer_help',
        text: 'I can help your village. Food, protection, or both.',
        nextId: 'neutral_help',
        effect: { loyaltyDelta: 10, reputationAction: { type: 'help_village', factionAffinity: 'neutral' } },
      },
      {
        id: 'neutral_offer_trade',
        text: 'I come with goods to trade. Spice for supplies.',
        nextId: 'neutral_trade',
        effect: { spiceDelta: -5, reputationAction: { type: 'trade_with_faction', target: 'neutral', amount: 5 } },
      },
      {
        id: 'neutral_threaten',
        text: 'This village will serve me. Resistance is pointless.',
        nextId: 'neutral_threaten',
        effect: { loyaltyDelta: -15, reputationAction: { type: 'attack_faction', target: 'neutral' } },
      },
    ],
  },
  {
    id: 'neutral_help',
    speaker: 'Village Elder',
    text: 'Help, you say? Many have promised help before. The Harkonnen promised order. The Fremen promised freedom. We got neither. What makes you different?',
    choices: [
      {
        id: 'neutral_prove_deeds',
        text: 'Judge me by my deeds, not my words. Give me a chance.',
        nextId: 'neutral_decided',
        effect: { loyaltyDelta: 12, influenceDelta: 8, reputationAction: { type: 'help_village', factionAffinity: 'neutral' } },
      },
      {
        id: 'neutral_offer_resources',
        text: 'I can offer spice and soldiers. Practical aid, not promises.',
        nextId: 'neutral_decided',
        effect: { spiceDelta: -10, loyaltyDelta: 8, influenceDelta: 10, reputationAction: { type: 'honor_agreement', partner: 'neutral' } },
      },
    ],
  },
  {
    id: 'neutral_trade',
    speaker: 'Village Elder',
    text: 'Trade we understand. Fair exchange keeps the desert at bay. What do you need, and what can you offer?',
    choices: [
      {
        id: 'neutral_spice_for_loyalty',
        text: 'Spice from my stores for your loyalty and manpower.',
        nextId: 'neutral_decided',
        effect: { spiceDelta: -15, loyaltyDelta: 15, influenceDelta: 5, reputationAction: { type: 'trade_with_faction', target: 'neutral', amount: 15 } },
      },
      {
        id: 'neutral_even_exchange',
        text: 'An even trade. Supplies for spice, nothing more.',
        nextId: 'neutral_decided',
        effect: { spiceDelta: -5, loyaltyDelta: 5 },
      },
    ],
  },
  {
    id: 'neutral_threaten',
    speaker: 'Village Elder',
    text: 'You sound like every tyrant who has ever marched across our sands. We have endured Harkonnen, Sardaukar, and sandstorms. We will endure you too -- or you will leave.',
    choices: [
      {
        id: 'neutral_rethink',
        text: 'Perhaps I was too harsh. Let me prove my worth instead.',
        nextId: 'neutral_help',
        effect: { loyaltyDelta: 3 },
      },
      {
        id: 'neutral_leave_threat',
        text: 'We shall see.',
        nextId: null,
        effect: { loyaltyDelta: -10, influenceDelta: -8 },
      },
    ],
  },
  {
    id: 'neutral_decided',
    speaker: 'Village Elder',
    text: 'Very well. We are a practical people. Prove your word and we walk together. Break it and the sands will not forgive -- neither will we.',
    choices: [
      {
        id: 'neutral_depart',
        text: 'You have my word.',
        nextId: null,
        effect: { loyaltyDelta: 5, influenceDelta: 5, reputationAction: { type: 'honor_agreement', partner: 'neutral' } },
      },
    ],
  },
];