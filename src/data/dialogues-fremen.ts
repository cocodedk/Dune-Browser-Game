import type { DialogueNode } from '../types';

export const fremenSietch: DialogueNode[] = [
  {
    id: 'fremen_start',
    speaker: 'Fremen Naib',
    text: 'The Maker\'s path brought you here -- or was it desperation? Our sietch has sheltered many who could not shelter themselves. Speak.',
    choices: [
      {
        id: 'fremen_seek_alliance',
        text: 'I seek an alliance. The Harkonnen crush your people -- let me fight beside you.',
        nextId: 'fremen_alliance',
        effect: { loyaltyDelta: 10, influenceDelta: 5, reputationAction: { type: 'help_village', factionAffinity: 'fremen' } },
      },
      {
        id: 'fremen_ask_spice',
        text: 'Teach me about the spice. I wish to understand the desert\'s gift.',
        nextId: 'fremen_spice_wisdom',
      },
      {
        id: 'fremen_demand_water',
        text: 'I need water and supplies. You Fremen have plenty -- share them.',
        nextId: 'fremen_reject',
        effect: { loyaltyDelta: -15, reputationAction: { type: 'attack_faction', target: 'fremen' } },
      },
    ],
  },
  {
    id: 'fremen_alliance',
    speaker: 'Fremen Naib',
    text: 'You speak of fighting. Every Fremen child learns to fight before they learn to read. But trust is earned in the deep desert, not with words.',
    choices: [
      {
        id: 'fremen_pledge_life',
        text: 'My life for Arrakis. I will prove my worth.',
        nextId: 'fremen_bond',
        effect: { loyaltyDelta: 20, influenceDelta: 15, reputationAction: { type: 'honor_agreement', partner: 'fremen' } },
      },
      {
        id: 'fremen_pledge_aid',
        text: 'I can offer weapons and off-world allies. A practical exchange.',
        nextId: 'fremen_bond',
        effect: { loyaltyDelta: 10, influenceDelta: 8, reputationAction: { type: 'trade_with_faction', target: 'fremen', amount: 8 } },
      },
    ],
  },
  {
    id: 'fremen_spice_wisdom',
    speaker: 'Fremen Naib',
    text: 'The spice flows. It gives life, bends time, and poisons those who hoard it without respect. The cycle of Shai-Hulud is sacred. Do you understand?',
    choices: [
      {
        id: 'fremen_respect_cycle',
        text: 'I understand. The spice is not a commodity -- it is the breath of the desert.',
        nextId: 'fremen_bond',
        effect: { loyaltyDelta: 15, influenceDelta: 10, reputationAction: { type: 'help_village', factionAffinity: 'fremen' } },
      },
      {
        id: 'fremen_harvest_concern',
        text: 'Can we harvest it sustainably? The off-worlders take too much.',
        nextId: 'fremen_bond',
        effect: { loyaltyDelta: 12, influenceDelta: 6 },
      },
      {
        id: 'fremen_dismiss_wisdom',
        text: 'Poetry. I need practical knowledge, not proverbs.',
        nextId: 'fremen_reject',
        effect: { loyaltyDelta: -8, influenceDelta: -5, reputationAction: { type: 'attack_faction', target: 'fremen' } },
      },
    ],
  },
  {
    id: 'fremen_reject',
    speaker: 'Fremen Naib',
    text: 'You carry the stench of those who take without giving. The desert culls such men. Leave this sietch before the sands take you.',
    choices: [
      {
        id: 'fremen_apologize_depart',
        text: 'I was wrong. Forgive my arrogance.',
        nextId: 'fremen_alliance',
        effect: { loyaltyDelta: 5 },
      },
      {
        id: 'fremen_leave_hostile',
        text: 'I do not need Fremen approval.',
        nextId: null,
        effect: { loyaltyDelta: -5, influenceDelta: -5, reputationAction: { type: 'break_agreement', partner: 'fremen' } },
      },
    ],
  },
  {
    id: 'fremen_bond',
    speaker: 'Fremen Naib',
    text: 'Usul. You have a name among us now. The sietch remembers its friends. Walk with care -- the desert knows its enemies too.',
    choices: [
      {
        id: 'fremen_depart_honored',
        text: 'I will honor this bond.',
        nextId: null,
        effect: { influenceDelta: 5, spiceDelta: 10, reputationAction: { type: 'honor_agreement', partner: 'fremen' } },
      },
    ],
  },
];