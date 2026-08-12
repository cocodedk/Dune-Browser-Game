import { world } from './GameState';
import { pushEvent } from './EventSystem';
import type { Village } from '../types';

// The day-boundary player-crediting half of this module (updateVillages,
// collectPlayerSpice) was removed in WP02e (legacy-authority-inventory.md
// category 2; dayRunner.ts's removed LEGACY PRODUCTION SEAM comment): every
// day, village.spice += village.productionRate fed collectPlayerSpice's 10%
// skim straight into world.player.spice, duplicating crew harvest. The
// functions below have live production callers OUTSIDE the day loop
// (TravelSystem.checkTravelArrival, DialogueSystem.applyEffect) or are kept
// compilable only because AISystem.ts still imports them — nothing calls
// AISystem from the campaign path (WP01 quarantine), so harkonnenAttack/
// harkonnenBribe are unreachable in production today, but AISystem.test.ts
// pins their behavior and is outside this package's scope to edit.

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
    pushEvent('attack', `⚔ Harkonnen forces seized ${village.name}!`);
  } else {
    pushEvent('attack', `⚔ Harkonnen forces attacked ${village.name}. Loyalty –25.`);
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
    pushEvent('betrayal', `💀 ${village.name} betrayed you — Harkonnen gold.`);
  }
}
