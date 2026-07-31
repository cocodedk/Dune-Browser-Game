import type { DialogueNode } from '../types';

export const smugglerOutpost: DialogueNode[] = [
  {
    id: 'smug_greet',
    speaker: 'Smuggler Baron',
    text: 'Well, well. Fresh dust on your boots and a strange look in your eyes. I deal in spice, off-worlder -- not sentiment. What do you want?',
    choices: [
      {
        id: 'smug_trade_offer',
        text: 'I want to trade. I have resources, you have routes. Let us make a deal.',
        nextId: 'smug_deal',
        effect: { influenceDelta: 5, reputationAction: { type: 'trade_with_faction', target: 'smugglers', amount: 5 } },
      },
      {
        id: 'smug_demand_cut',
        text: 'I need your spice routes. Name your price, or I take them.',
        nextId: 'smug_threaten',
        effect: { loyaltyDelta: -10, reputationAction: { type: 'attack_faction', target: 'smugglers' } },
      },
      {
        id: 'smug_ask_info',
        text: 'What can you tell me about the spice trade around here?',
        nextId: 'smug_info',
      },
    ],
  },
  {
    id: 'smug_deal',
    speaker: 'Smuggler Baron',
    text: 'A deal. Now that is a word I like. I move spice where the Harkonnen cannot reach. My terms: I keep seventy percent. You get reliability.',
    choices: [
      {
        id: 'smug_accept_terms',
        text: 'Done. A smaller share of a reliable trade beats nothing.',
        nextId: 'smug_settled',
        effect: { spiceDelta: 15, loyaltyDelta: 5, influenceDelta: 5, reputationAction: { type: 'trade_with_faction', target: 'smugglers', amount: 15 } },
      },
      {
        id: 'smug_negotiate',
        text: 'Seventy is steep. How about fifty-fifty, and I guarantee no Imperial entanglements?',
        nextId: 'smug_negotiated',
        effect: { spiceDelta: 5, influenceDelta: 3 },
      },
    ],
  },
  {
    id: 'smug_negotiated',
    speaker: 'Smuggler Baron',
    text: 'Fifty-fifty? Bold. But you have nerve, and nerve counts out here. All right -- we split evenly. Betray me and the desert buries you.',
    choices: [
      {
        id: 'smug_shake_on_it',
        text: 'Agreed. Profit to us both.',
        nextId: null,
        effect: { spiceDelta: 20, influenceDelta: 8, reputationAction: { type: 'trade_with_faction', target: 'smugglers', amount: 20 } },
      },
    ],
  },
  {
    id: 'smug_threaten',
    speaker: 'Smuggler Baron',
    text: 'Threats? In my own outpost? The Harkonnen pay well for people like you -- as examples. Last chance: trade or leave.',
    choices: [
      {
        id: 'smug_back_trade',
        text: 'Fine. Let us trade. No need for bloodshed.',
        nextId: 'smug_deal',
        effect: { loyaltyDelta: 3 },
      },
      {
        id: 'smug_leave_tense',
        text: 'I will go. But I will remember this.',
        nextId: null,
        effect: { loyaltyDelta: -5, influenceDelta: -5 },
      },
    ],
  },
  {
    id: 'smug_info',
    speaker: 'Smuggler Baron',
    text: 'Information costs spice, off-worlder. The Guild ships it, the Harkonnen hoard it, and I move it past them both. There is opportunity for anyone smart enough to see it.',
    choices: [
      {
        id: 'smug_buy_in',
        text: 'I am smart enough. Let us do business.',
        nextId: 'smug_deal',
        effect: { spiceDelta: -5, influenceDelta: 3 },
      },
      {
        id: 'smug_pass',
        text: 'I have heard enough. Goodbye.',
        nextId: null,
      },
    ],
  },
  {
    id: 'smug_settled',
    speaker: 'Smuggler Baron',
    text: 'Pleasure doing business. Spice flows, credits follow, and the desert stays silent about our arrangement.',
    choices: [
      {
        id: 'smug_depart',
        text: 'Until next time.',
        nextId: null,
        effect: { spiceDelta: 10 },
      },
    ],
  },
];