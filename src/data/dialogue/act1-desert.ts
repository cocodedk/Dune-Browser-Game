// src/data/dialogue/act1-desert.ts
// Act 1 conversations in the deep desert: the naib, the scout, the seer,
// the prospector, the smuggler. All writing original to this project.
//
// The Fremen voice here is short and concrete. They do not explain themselves
// to outsiders, and they measure people by what those people spend.

import type { DialogueNode } from '../../types'

export const DESERT_NODES: DialogueNode[] = [
  // --- Naib Shadir ---------------------------------------------------------
  {
    id: 'shadir_wary_root',
    speaker: 'Naib Shadir',
    text:
      'Offworlders come to Red Wall twice. Once to count us, once to ask for ' +
      'something. You have not counted yet, so you are early.',
    choices: [
      { id: 'shadir_w1', text: 'I came to ask what you need.', nextId: 'shadir_need',
        effect: { loyaltyDelta: 6 } },
      { id: 'shadir_w2', text: 'I came to ask for spice.', nextId: 'shadir_blunt',
        effect: { loyaltyDelta: 2 } },
      { id: 'shadir_w3', text: 'I will come back when you are civil.', nextId: null,
        effect: { loyaltyDelta: -5 } },
    ],
  },
  {
    id: 'shadir_need',
    speaker: 'Naib Shadir',
    text:
      'Water. Always water. After that, to be left to work without a Harkonnen ' +
      'standing over the harvest counting what he has not earned.',
    choices: [
      { id: 'shadir_n1', text: 'I can do something about the second.', nextId: null,
        effect: { loyaltyDelta: 8 } },
      { id: 'shadir_n2', text: 'I cannot promise either yet.', nextId: null,
        effect: { loyaltyDelta: 4 } },
    ],
  },
  {
    id: 'shadir_blunt',
    speaker: 'Naib Shadir',
    text:
      'At least you said it plainly. The last one spent an hour arriving at it ' +
      'and thought we had not noticed where he was going.',
    choices: [{ id: 'shadir_b1', text: 'Plain is faster.', nextId: null,
      effect: { loyaltyDelta: 3 } }],
  },
  {
    id: 'shadir_considering_root',
    speaker: 'Naib Shadir',
    text:
      'The sietch has been talking about you. Not warmly — but they have been ' +
      'talking, and last season they would not have bothered.',
    choices: [
      { id: 'shadir_c1', text: 'What would settle it?', nextId: 'shadir_settle' },
      { id: 'shadir_c2', text: 'Let them talk.', nextId: null },
    ],
  },
  {
    id: 'shadir_settle',
    speaker: 'Naib Shadir',
    text:
      'Come back when you have nothing to ask for. That is the visit that ' +
      'counts.',
    choices: [{ id: 'shadir_s1', text: 'I will.', nextId: null, effect: { loyaltyDelta: 5 } }],
  },
  {
    id: 'shadir_pledged_root',
    speaker: 'Naib Shadir',
    text:
      'Our people are yours to send. Understand what that means: if you spend ' +
      'them badly, I will not be able to give you more, and I will not want to.',
    choices: [
      { id: 'shadir_p1', text: 'I will spend them carefully.', nextId: null,
        effect: { loyaltyDelta: 3 } },
      { id: 'shadir_p2', text: 'Where should they work?', nextId: 'shadir_work' },
    ],
  },
  {
    id: 'shadir_work',
    speaker: 'Naib Shadir',
    text:
      'The shallows south of here still give. The deep pans give more and take ' +
      'more. Choose by what the Emperor is asking this month.',
    choices: [{ id: 'shadir_wk1', text: 'Understood.', nextId: null }],
  },

  // --- Ysane, the scout ----------------------------------------------------
  {
    id: 'ysane_first_meeting_root',
    speaker: 'Ysane',
    text:
      'You walked here from the thopter in the open. In daylight. I watched, ' +
      'in case I had to explain to someone what happened to you.',
    choices: [
      { id: 'ysane_f1', text: 'Show me the better way.', nextId: 'ysane_show',
        effect: { loyaltyDelta: 5 } },
      { id: 'ysane_f2', text: 'I made it, didn\'t I?', nextId: 'ysane_made' },
    ],
  },
  {
    id: 'ysane_show',
    speaker: 'Ysane',
    text:
      'There is always a line where the rock holds the sand still. Walk it and ' +
      'the desert does not notice you. Ignore it and it does.',
    choices: [{ id: 'ysane_s1', text: 'Teach me the lines.', nextId: null,
      effect: { loyaltyDelta: 6 } }],
  },
  {
    id: 'ysane_made',
    speaker: 'Ysane',
    text: 'So did the last one. Twice.',
    choices: [{ id: 'ysane_m1', text: 'Point taken.', nextId: null,
      effect: { loyaltyDelta: 2 } }],
  },
  {
    id: 'ysane_recruited_root',
    speaker: 'Ysane',
    text:
      'I know six ways off this ridge and four of them are not on any map you ' +
      'own. Tell me where you are going and I will shorten it.',
    choices: [{ id: 'ysane_r1', text: 'Walk with me.', nextId: null }],
  },

  // --- Mother Sova, the rituals --------------------------------------------
  {
    id: 'sova_greeting_root',
    speaker: 'Mother Sova',
    text:
      'You are loud. Not your voice — the rest of you. Come back when fewer ' +
      'people are waiting on your decisions.',
    choices: [{ id: 'sova_g1', text: 'That may be a while.', nextId: null }],
  },
  {
    id: 'sova_ritual_root',
    speaker: 'Mother Sova',
    text:
      'There is a thing we do with spice that is not commerce. It shows you the ' +
      'shape of what you already know, which is worse than a surprise. It costs ' +
      'twenty measures and you may not like what it makes of you.',
    choices: [
      { id: 'sova_r1', text: 'Do it.', nextId: 'sova_after',
        effect: { spiceDelta: -20, influenceDelta: 5 } },
      { id: 'sova_r2', text: 'Not yet.', nextId: null },
    ],
  },
  {
    id: 'sova_after',
    speaker: 'Mother Sova',
    text:
      'There. You are wider than you were. Do not mistake that for being right.',
    choices: [{ id: 'sova_a1', text: 'I will try not to.', nextId: null }],
  },

  // --- Pell, the prospector ------------------------------------------------
  {
    id: 'pell_offer_root',
    speaker: 'Pell',
    text:
      'You have two fields and you are working both flat. That is fine until ' +
      'they are empty, and they will be empty sooner than you think. I can find ' +
      'you more — if you can spare a crew to look instead of dig.',
    choices: [
      { id: 'pell_o1', text: 'Teach a crew to prospect.', nextId: 'pell_teach',
        effect: { setFlags: { 'taught.prospecting': true } } },
      { id: 'pell_o2', text: 'I cannot spare anyone.', nextId: 'pell_cannot' },
    ],
  },
  {
    id: 'pell_teach',
    speaker: 'Pell',
    text:
      'Good. They need a thopter — you cannot read the dunes from the ground, ' +
      'you can only read the one you are standing on.',
    choices: [{ id: 'pell_t1', text: 'I will get one.', nextId: null }],
  },
  {
    id: 'pell_cannot',
    speaker: 'Pell',
    text:
      'Then you will dig the same two fields until they give out, and find out ' +
      'about the third one from whoever got there first.',
    choices: [{ id: 'pell_c1', text: 'I will think about it.', nextId: null }],
  },
  {
    id: 'pell_taught_root',
    speaker: 'Pell',
    text:
      'Your crew is reading ground properly now. Send them somewhere you have ' +
      'not looked — a region gives up three finds and then it is finished.',
    choices: [{ id: 'pell_tt1', text: 'Understood.', nextId: null }],
  },

  // --- Rhaz Meko, the smuggler ---------------------------------------------
  {
    id: 'meko_first_root',
    speaker: 'Rhaz Meko',
    text:
      'You are the new administration. I sell to administrations, and I sell to ' +
      'the people they are administering. Prices are the same. That is the only ' +
      'honesty I offer and it is more than most.',
    choices: [
      { id: 'meko_f1', text: 'What do you have?', nextId: 'meko_stock' },
      { id: 'meko_f2', text: 'You sell to the Harkonnens.', nextId: 'meko_harkonnen' },
    ],
  },
  {
    id: 'meko_stock',
    speaker: 'Rhaz Meko',
    text:
      'A harvester, if you have a hundred. A thopter for eighty — worth more ' +
      'than the harvester if you cannot find sand to put it on. Blades, cheap.',
    choices: [{ id: 'meko_s1', text: 'Let me look.', nextId: null }],
  },
  {
    id: 'meko_harkonnen',
    speaker: 'Rhaz Meko',
    text:
      'I did. They stopped paying and started taking. You will find that is the ' +
      'whole of my politics.',
    choices: [{ id: 'meko_h1', text: 'Then we will pay.', nextId: null }],
  },
  {
    id: 'meko_regular_root',
    speaker: 'Rhaz Meko',
    text:
      'Back again. Good. Regular buyers get told things first — that is not ' +
      'generosity, it is what keeps them regular.',
    choices: [{ id: 'meko_r1', text: 'What are you hearing?', nextId: null }],
  },
]
