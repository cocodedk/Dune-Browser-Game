// src/data/dialogue/reaches-desert.ts
// The deep south: the people who live where the maps stop.
// All writing original to this project.
//
// Imperial Basin and Cielago Depression had nobody in them — a player who
// travelled there arrived somewhere with no one to talk to. These six also
// give the systems added recently a voice each: worms, the deep desert, and
// the fact that Harkonnen strength has a direction it arrives from.

import type { DialogueNode } from '../../types'

export const REACHES_DESERT_NODES: DialogueNode[] = [
  // --- Sayyadina Sabiha — reads the sand -----------------------------------
  {
    id: 'sabiha_root',
    speaker: 'Sayyadina Sabiha',
    text:
      'You walked in from the north without listening once. The sand here is ' +
      'drum sand for two hundred metres in the direction you came. You are ' +
      'either very lucky or very loud, and out here those look the same right ' +
      'up until they do not.',
    choices: [
      { id: 'sab_a1', text: 'Teach me to listen.', nextId: 'sabiha_teach',
        effect: { setFlags: { 'taught.wormsign': true } } },
      { id: 'sab_a2', text: 'What is out there worth walking to?',
        nextId: 'sabiha_deep' },
      { id: 'sab_a3', text: 'I have crews for that.', nextId: 'sabiha_crews' },
    ],
  },
  {
    id: 'sabiha_teach',
    speaker: 'Sayyadina Sabiha',
    text:
      'A maker comes to noise and it comes to spice, and a blow is both at ' +
      'once. That is why the richest sand is the sand nobody is standing on. ' +
      'When your people mark wormsign, believe them and move. The sign holds ' +
      'for days and so does the maker.',
    choices: [{ id: 'sab_t1', text: 'Understood.', nextId: null }],
  },
  {
    id: 'sabiha_deep',
    speaker: 'Sayyadina Sabiha',
    text:
      'Wrecks, mostly. The Harkonnens lost machines out there and never went ' +
      'back for one of them — cheaper to buy another than to cross that sand. ' +
      'Also caches, which are ours, and which you will leave alone if you want ' +
      'this conversation to happen twice.',
    choices: [
      { id: 'sab_d1', text: 'I will leave them.', nextId: null,
        effect: { setFlags: { 'promised.caches': true }, influenceDelta: 2 } },
      { id: 'sab_d2', text: 'I make no promises about water.', nextId: null,
        effect: { influenceDelta: -2 } },
    ],
  },
  {
    id: 'sabiha_crews',
    speaker: 'Sayyadina Sabiha',
    text:
      'Then your crews will walk two days out and two days back and find the ' +
      'same sand every time. Range is the whole thing. On foot the deep desert ' +
      'is a rumour. In the air it is a map.',
    choices: [{ id: 'sab_c1', text: 'Then I need thopters.', nextId: null }],
  },

  // --- Orrin of the Fedaykin — has ridden ----------------------------------
  {
    id: 'orrin_root',
    speaker: 'Orrin of the Fedaykin',
    text:
      'They told you I have ridden makers. They tell everyone. It is not a ' +
      'skill, it is a decision you make once and then keep making until the ' +
      'sand stops moving. I would not sell it to you and you could not pay.',
    choices: [
      { id: 'orr_a1', text: 'I am not buying. I am asking.', nextId: 'orrin_ask' },
      { id: 'orr_a2', text: 'Everything has a price.', nextId: 'orrin_price',
        effect: { influenceDelta: -2 } },
    ],
  },
  {
    id: 'orrin_ask',
    speaker: 'Orrin of the Fedaykin',
    text:
      'Then I will answer. A maker cannot be stopped, only left. Everything ' +
      'else you have been told is somebody selling you courage. Keep your ' +
      'people off open sand when they are loud, and you will not need any.',
    choices: [
      { id: 'orr_k1', text: 'That is worth more than courage.', nextId: null,
        effect: { setFlags: { 'taught.makers': true }, influenceDelta: 3 } },
    ],
  },
  {
    id: 'orrin_price',
    speaker: 'Orrin of the Fedaykin',
    text:
      'Off-worlder. The last man who said that to me is under the sand at ' +
      'Habbanya, and he is still wrong.',
    choices: [{ id: 'orr_p1', text: 'I withdraw it.', nextId: 'orrin_ask' }],
  },
]
