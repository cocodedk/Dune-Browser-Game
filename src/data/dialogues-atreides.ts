import type { DialogueNode } from '../types';

export const atreidesEmbassy: DialogueNode[] = [
  {
    id: 'atk_arrive',
    speaker: 'Atreides Envoy',
    text: 'Welcome. House Atreides remembers its oaths -- even on Arrakis, where oaths are cheap and blood is dear. What brings you to our embassy?',
    choices: [
      {
        id: 'atk_pledge_honor',
        text: 'I wish to stand with House Atreides. Honor demands no less.',
        nextId: 'atk_pledge',
        effect: { loyaltyDelta: 10, influenceDelta: 8, reputationAction: { type: 'help_village', factionAffinity: 'atreides' } },
      },
      {
        id: 'atk_ask_position',
        text: 'What is the Atreides position on Arrakis? I would understand before choosing.',
        nextId: 'atk_caution',
      },
      {
        id: 'atk_refuse_alliance',
        text: 'I serve no House. I look after my own interests.',
        nextId: 'atk_refuse',
        effect: { loyaltyDelta: -5, reputationAction: { type: 'ignore_attack', victimFaction: 'atreides' } },
      },
    ],
  },
  {
    id: 'atk_pledge',
    speaker: 'Atreides Envoy',
    text: 'Duke Leto placed his trust in Arrakis and its people. If you share that conviction, we will stand by you. But beware -- loyalty to Atreides carries a price.',
    choices: [
      {
        id: 'atk_accept_price',
        text: 'I accept. Honor is worth more than safety.',
        nextId: 'atk_aligned',
        effect: { loyaltyDelta: 15, influenceDelta: 12, reputationAction: { type: 'honor_agreement', partner: 'atreides' } },
      },
      {
        id: 'atk_ask_price',
        text: 'What price? I will not enter blind.',
        nextId: 'atk_caution',
        effect: { influenceDelta: 3 },
      },
    ],
  },
  {
    id: 'atk_caution',
    speaker: 'Atreides Envoy',
    text: 'Prudence is wise. The Harkonnen ravage the south, the Emperor watches from above, and the Fremen wait beneath the sand. We offer partnership -- not subjugation.',
    choices: [
      {
        id: 'atk_join_cautious',
        text: 'Partnership. That I can accept.',
        nextId: 'atk_aligned',
        effect: { loyaltyDelta: 8, influenceDelta: 10, reputationAction: { type: 'honor_agreement', partner: 'atreides' } },
      },
      {
        id: 'atk_decline_wary',
        text: 'I need more time. The sands are still shifting.',
        nextId: null,
        effect: { influenceDelta: 2 },
      },
    ],
  },
  {
    id: 'atk_refuse',
    speaker: 'Atreides Envoy',
    text: 'A pity. House Atreides does not compel -- we persuade. But remember: on Arrakis, those without allies are easily buried.',
    choices: [
      {
        id: 'atk_reconsider',
        text: 'Perhaps I spoke too hastily. I will consider your offer.',
        nextId: 'atk_caution',
        effect: { loyaltyDelta: 3 },
      },
      {
        id: 'atk_walk_away',
        text: 'I will take my chances alone.',
        nextId: null,
        effect: { loyaltyDelta: -3, reputationAction: { type: 'ignore_attack', victimFaction: 'atreides' } },
      },
    ],
  },
  {
    id: 'atk_aligned',
    speaker: 'Atreides Envoy',
    text: 'Then it is settled. House Atreides does not abandon its own. Walk with honor, and we walk with you.',
    choices: [
      {
        id: 'atk_depart',
        text: 'For the Duke.',
        nextId: null,
        effect: { loyaltyDelta: 5, influenceDelta: 5 },
      },
    ],
  },
];