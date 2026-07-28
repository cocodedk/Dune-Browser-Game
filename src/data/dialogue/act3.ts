// src/data/dialogue/act3.ts
// Acts 3-4: the field commander, the Baron, and the Emperor's last demand.
// All writing original to this project.
//
// The antagonists are written as competent professionals rather than as
// theatrical villains. Varn likes his work and is good at it. The Baron makes
// an offer that is genuinely worth taking, which is what makes refusing it a
// decision instead of a formality.

import type { DialogueNode } from '../../types'

export const ACT3_NODES: DialogueNode[] = [
  // --- Draeg Varn ----------------------------------------------------------
  {
    id: 'varn_confident_root',
    speaker: 'Draeg Varn',
    text:
      'You are the one raising sietches. I have burned four of them this year ' +
      'and I expect I will burn yours. Nothing personal in it — you are simply ' +
      'the thing in front of me.',
    choices: [
      { id: 'varn_c1', text: 'Four is not many, over a year.', nextId: 'varn_four' },
      { id: 'varn_c2', text: 'Try.', nextId: null, effect: { influenceDelta: 2 } },
      { id: 'varn_c3', text: 'Why tell me at all?', nextId: 'varn_why' },
    ],
  },
  {
    id: 'varn_four',
    speaker: 'Draeg Varn',
    text:
      'It is enough. Sietches are not forts — they are people who have decided ' +
      'to stay somewhere. You only have to make staying expensive.',
    choices: [{ id: 'varn_f1', text: 'Then I will make leaving expensive.', nextId: null,
      effect: { influenceDelta: 2 } }],
  },
  {
    id: 'varn_why',
    speaker: 'Draeg Varn',
    text:
      'Because half of what I do is arithmetic in someone else\'s head. If you ' +
      'move crews to garrison after this conversation, that is a field I did ' +
      'not have to ride to.',
    choices: [{ id: 'varn_w1', text: 'Honest, at least.', nextId: null }],
  },
  {
    id: 'varn_losing_root',
    speaker: 'Draeg Varn',
    text:
      'You took a wall. I want you to know I am not surprised — I told them ' +
      'the outposts were too far apart and was told the cost of moving them ' +
      'was unjustified. It is being justified now.',
    choices: [
      { id: 'varn_l1', text: 'Will they listen next time?', nextId: 'varn_listen' },
      { id: 'varn_l2', text: 'I will take the rest.', nextId: null,
        effect: { influenceDelta: 3 } },
    ],
  },
  {
    id: 'varn_listen',
    speaker: 'Draeg Varn',
    text:
      'They will move the garrisons and call it their idea. That is how it ' +
      'works, and it is why you will get the second one cheaper than the first.',
    choices: [{ id: 'varn_li1', text: 'Noted.', nextId: null }],
  },

  // --- The Baron -----------------------------------------------------------
  {
    id: 'baron_truce_root',
    speaker: 'Baron Vorrik Harkonnen',
    text:
      'A proposal, and I will be brief because the shape of it insults us both. ' +
      'I stop raiding. You keep your sietches. In exchange I take a share of ' +
      'your tonnage, and the Emperor hears from me that you are cooperative.',
    choices: [
      { id: 'baron_t1', text: 'What does his word buy me?', nextId: 'baron_word' },
      { id: 'baron_t2', text: 'The Fremen would never forgive it.',
        nextId: 'baron_forgive' },
      { id: 'baron_t3', text: 'No.', nextId: 'baron_refused',
        effect: { influenceDelta: 4 } },
    ],
  },
  {
    id: 'baron_word',
    speaker: 'Baron Vorrik Harkonnen',
    text:
      'Time. Which is the only thing being sold anywhere on this planet. His ' +
      'patience with you extends; your quota pressure eases. I am offering you ' +
      'exactly what you need and I am not pretending it is a gift.',
    choices: [
      { id: 'baron_w1', text: 'And the price is my people.', nextId: 'baron_forgive' },
      { id: 'baron_w2', text: 'I will consider it.', nextId: null },
    ],
  },
  {
    id: 'baron_forgive',
    speaker: 'Baron Vorrik Harkonnen',
    text:
      'They would not. That is the cost, and I have priced it in — you would be ' +
      'buying breathing room with the only thing you have that I cannot take by ' +
      'force. It is a real trade. Most men take it.',
    choices: [
      { id: 'baron_f1', text: 'Then most men are cheaper than me.', nextId: 'baron_refused',
        effect: { influenceDelta: 5 } },
      { id: 'baron_f2', text: 'I need the time.', nextId: 'baron_accepted',
        effect: { loyaltyDelta: -20, setFlags: { 'baron.truce': true } } },
    ],
  },
  {
    id: 'baron_refused',
    speaker: 'Baron Vorrik Harkonnen',
    text:
      'As you like. I made the offer because it was cheaper than the alternative, ' +
      'not because I feared it. Now we find out which of us was doing the better ' +
      'arithmetic.',
    choices: [{ id: 'baron_r1', text: 'We will.', nextId: null }],
  },
  {
    id: 'baron_accepted',
    speaker: 'Baron Vorrik Harkonnen',
    text:
      'Sensible. Do not expect them to say so. They will keep working for you ' +
      'and they will stop looking at you, and you will find the second thing ' +
      'costs more than the first was worth.',
    choices: [{ id: 'baron_a1', text: 'Get out.', nextId: null }],
  },
  {
    id: 'baron_cornered_root',
    speaker: 'Baron Vorrik Harkonnen',
    text:
      'Two of my walls are yours. I notice you did not take the offer and I ' +
      'notice the Fremen are still with you, which I confess I had not costed ' +
      'correctly.',
    choices: [
      { id: 'baron_c1', text: 'You costed them as property.', nextId: 'baron_property',
        effect: { influenceDelta: 4 } },
      { id: 'baron_c2', text: 'Your capital is next.', nextId: null,
        effect: { influenceDelta: 3 } },
    ],
  },
  {
    id: 'baron_property',
    speaker: 'Baron Vorrik Harkonnen',
    text:
      'I costed them as a supply, which is what everyone who has ever held this ' +
      'planet has done, including the man who sent you. The difference between ' +
      'us is that you have not needed to yet.',
    choices: [{ id: 'baron_p1', text: 'I will not need to.', nextId: null }],
  },

  // --- Act 4: the last demand ----------------------------------------------
  {
    id: 'corvin_final_demand_root',
    speaker: 'Legate Corvin',
    text:
      'The figure is not an error. I checked it twice because I assumed it was, ' +
      'and I was instructed to convey it exactly as written. You cannot produce ' +
      'this. I believe that is the intention.',
    choices: [
      { id: 'final_1', text: 'Then I will pay what I can and keep my head down.',
        nextId: 'final_submit', effect: { setFlags: { 'act4.choice_submit': true } } },
      { id: 'final_2', text: 'Tell him the tribute stops.', nextId: 'final_defy',
        effect: { setFlags: { 'act4.choice_defy': true }, influenceDelta: 6 } },
      { id: 'final_3', text: 'What happens to you when you carry that back?',
        nextId: 'final_corvin' },
    ],
  },
  {
    id: 'final_submit',
    speaker: 'Legate Corvin',
    text:
      'It buys you time and nothing else. He will send the audit eventually; ' +
      'you are only choosing when. I will record that you complied.',
    choices: [{ id: 'fs1', text: 'Record it.', nextId: null }],
  },
  {
    id: 'final_defy',
    speaker: 'Legate Corvin',
    text:
      'Then the Sardaukar will be here within a fortnight, and I will not be ' +
      'the one they send to explain. I have watched three administrations say ' +
      'that sentence. You are the first one the Fremen were standing behind.',
    choices: [{ id: 'fd1', text: 'Go and tell him.', nextId: null }],
  },
  {
    id: 'final_corvin',
    speaker: 'Legate Corvin',
    text:
      'Nothing good, and nothing you need to weigh. I am the instrument, not ' +
      'the hand. Answer the demand.',
    choices: [
      { id: 'fc1', text: 'I will pay what I can.', nextId: 'final_submit',
        effect: { setFlags: { 'act4.choice_submit': true } } },
      { id: 'fc2', text: 'The tribute stops.', nextId: 'final_defy',
        effect: { setFlags: { 'act4.choice_defy': true }, influenceDelta: 6 } },
    ],
  },
]
