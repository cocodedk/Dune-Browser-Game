import { world } from './GameState';
import { pushEvent } from './EventSystem';
import type { Village } from '../types';

// Check if a loyalty change should flip village ownership.
// Called after any loyalty mutation (dialogue effects, visits).
export function checkOwnershipTransition(village: Village): void {
  if (village.owner === 'neutral' && village.loyalty >= 60) {
    village.owner = 'player';
    village.status = 'friendly';
    pushEvent('alliance_offer', `🤝 ${village.name} has joined your cause.`);
  } else if (village.owner === 'harkonnen' && village.loyalty >= 75) {
    // Village defects from Harkonnen through diplomacy
    village.owner = 'player';
    village.status = 'friendly';
    pushEvent('alliance_offer', `🤝 ${village.name} defected from the Harkonnen — they stand with you!`);
  }
}

// Called once per day boundary
export function updateVillages(): void {
  for (const village of world.villages) {
    // Spice production
    village.spice += village.productionRate;

    // Loyalty decay if not visited recently (simple: -1 per day if not player-owned)
    if (village.owner === 'neutral') {
      village.loyalty = Math.max(0, village.loyalty - 1);
    }

    // Rebellion check
    if (village.loyalty < 30 && village.status !== 'rebelling') {
      village.status = 'rebelling';
      pushEvent('faction_decision', `\u26a0 ${village.name} is rebelling \u2014 loyalty too low.`);
    } else if (village.loyalty >= 50 && village.status === 'rebelling') {
      village.status = village.owner === 'player' ? 'friendly' : 'neutral';
    }
  }
  collectPlayerSpice();
}

// Collect 10% of each player-owned village's spice stockpile (min 0.5 per village).
// Capped so the village stockpile never goes below 0.
export function collectPlayerSpice(): void {
  for (const village of world.villages) {
    if (village.owner !== 'player') continue;
    const collected = Math.max(0.5, village.spice * 0.1);
    const actual = Math.min(collected, village.spice);
    village.spice = Math.max(0, village.spice - actual);
    world.player.spice += actual;
  }
}

// Player visits a village — boost loyalty
export function visitVillage(villageId: string): void {
  const village = world.villages.find(v => v.id === villageId);
  if (!village) return;
  village.loyalty = Math.min(100, village.loyalty + 5);
  checkOwnershipTransition(village);
}

// Harkonnen attacks a village — reduce loyalty and take ownership
export function harkonnenAttack(villageId: string): void {
  const village = world.villages.find(v => v.id === villageId);
  if (!village) return;
  village.loyalty = Math.max(0, village.loyalty - 25);
  if (village.loyalty < 30 && village.owner === 'player') {
    village.owner = 'harkonnen';
    village.status = 'neutral';
    pushEvent('attack', `\u2694 Harkonnen forces seized ${village.name}!`);
  } else {
    pushEvent('attack', `\u2694 Harkonnen forces attacked ${village.name}. Loyalty \u201325.`);
  }
}

// Harkonnen bribes a village — cause betrayal
export function harkonnenBribe(villageId: string): void {
  const village = world.villages.find(v => v.id === villageId);
  if (!village || village.owner !== 'player') return;
  village.loyalty = Math.max(0, village.loyalty - 30);
  if (village.loyalty < 40) {
    village.owner = 'neutral';
    village.status = 'neutral';
    pushEvent('betrayal', `\ud83d\udc80 ${village.name} betrayed you \u2014 Harkonnen gold.`);
  }
}
