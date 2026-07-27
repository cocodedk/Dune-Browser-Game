import { world, playerControlsAll, hasPlayerSurvived } from './GameState';
import { tick, isDayBoundary, resetTime } from './TimeSystem';
import { resetEvents, pushEvent } from './EventSystem';
import { updateVillages } from './VillageSystem';
import { checkTravelArrival } from './TravelSystem';
import { updateAI, updateFactionAI } from './AISystem';
import { accumulateUnrest, processRegionDefection, produceSpice } from './territory/territory';
import { decayReputation } from './faction/reputation';
import { toTerritoryWorld, toReputationWorld } from './faction/adapter';
import { executeGoals } from './faction/GoalExecutor';
import { updateSietches } from './sietch/updateSietches';
import { applyDiplomaticAction, updateRelations } from './faction/diplomacy';
import type { WorldDiplomacyEvent } from './faction/diplomacy';
import { generateDiplomaticActions } from './faction/diplomacyEngine';
import { getDifficultyConfig } from './difficulty';
import type { FactionId } from '../types';

function updateFactionSystems(): void {
  if (world.factionProfiles.length === 0) return;

  const config = getDifficultyConfig(world.difficulty);

  // Step 1: Accumulate unrest for each region (scaled by difficulty)
  const tWorld = toTerritoryWorld(world);
  world.regions = world.regions.map(r => accumulateUnrest(r, tWorld, config.unrestMultiplier));

  // Step 2: Spice production — accumulate per faction, then apply in one pass
  // Player spice is scaled by playerSpiceMultiplier; AI factions get normal rate
  const spiceByFaction = new Map<FactionId, number>();
  for (const r of world.regions) {
    const amt = produceSpice(r);
    if (amt > 0 && r.owner !== null) {
      const scaled = r.owner === 'player' ? amt * config.playerSpiceMultiplier : amt;
      spiceByFaction.set(r.owner, (spiceByFaction.get(r.owner) ?? 0) + scaled);
    }
  }
  world.factionProfiles = world.factionProfiles.map(f => {
    const extra = spiceByFaction.get(f.id) ?? 0;
    if (extra === 0) return f;
    return { ...f, resources: { ...f.resources, spice: f.resources.spice + extra } };
  });

  // Step 3: Region defection (after unrest applied)
  const tWorldAfterUnrest = toTerritoryWorld(world);
  for (const region of [...world.regions]) {
    const { world: tw, event } = processRegionDefection(region, tWorldAfterUnrest);
    if (event) {
      const defected = tw.regions.find(r => r.id === region.id)!;
      world.regions = world.regions.map(r => (r.id === region.id ? defected : r));
    }
  }

  // Step 4: Reputation decay (scaled by difficulty)
  const decayed = decayReputation(toReputationWorld(world), config.reputationDecayMultiplier);
  world.factionProfiles = decayed.factions;

  // Step 5: Diplomacy
  for (const faction of [...world.factionProfiles]) {
    if (faction.id === 'player') continue;
    const actions = generateDiplomaticActions(faction, world.factionProfiles);
    for (const action of actions) {
      const result = applyDiplomaticAction(action, world.factionProfiles);
      world.factionProfiles = world.factionProfiles.map(f => {
        if (f.id !== action.actor) return f;
        return { ...f, relations: { ...f.relations, [action.target]: result.updatedRelation } };
      });
      for (const se of result.sideEffects) {
        world.factionProfiles = world.factionProfiles.map(f => {
          if (f.id !== se.factionId) return f;
          const existing = f.relations[action.actor] ?? { trust: 0, fear: 0, trade: false, war: false };
          return {
            ...f,
            relations: { ...f.relations, [action.actor]: { ...existing, ...se.relationChange } },
          };
        });
      }
      if (!result.accepted && action.type === 'demand_tribute') {
        const targetName = world.factionProfiles.find(f => f.id === action.target)?.name ?? action.target;
        pushEvent('tribute_refused', `${faction.name} demands tribute from ${targetName} \u2014 refused!`);
        const diplomacyEvent: WorldDiplomacyEvent = { type: 'tribute_refused', actor: action.actor, target: action.target };
        world.factionProfiles = updateRelations(diplomacyEvent, world.factionProfiles);
      }
    }
  }
}

export function update(delta: number): void {
  if (world.goalAchieved || world.dialogue !== null) {
    // Pause time during dialogue; stop when goal achieved
    return;
  }

  const gameDelta = delta * world.speed;
  tick(gameDelta);

  // Day boundary: update village production
  if (isDayBoundary()) {
    const config = getDifficultyConfig(world.difficulty);
    updateVillages();
    updateFactionSystems();
    updateFactionAI();
    executeGoals(config.aiActionChanceMultiplier);
    const sietchResult = updateSietches(world.sietches);
    world.sietches = sietchResult.sietches;
    for (const payout of sietchResult.payouts) {
      const village = world.villages.find(v => v.id === payout.villageId);
      const name = village?.name ?? payout.villageId;
      if (payout.kind === 'spice') {
        world.player.spice += payout.amount;
        pushEvent('spice_shipment_received', `Fremen at ${name} deliver ${payout.amount} spice`);
      } else {
        world.player.troops += payout.amount;
        pushEvent('fedaykin_ready', `${payout.amount} Fedaykin at ${name} ready for your command`);
      }
    }
  }

  // Check travel arrival every frame
  checkTravelArrival();

  // AI decision loop
  updateAI();

  // Check win conditions
  if (!world.goalAchieved) {
    if (world.goalType === 'control_all_villages' && playerControlsAll()) {
      world.goalAchieved = true;
      pushEvent('poc_goal_achieved', '✔ You control all villages. Arrakis bows to you.');
    } else if (world.goalType === 'survive_20_min' && hasPlayerSurvived()) {
      world.goalAchieved = true;
      pushEvent('poc_goal_achieved', '✔ You survived 20 minutes. Arrakis endures.');
    }
  }
}

export function initLoop(): void {
  resetTime();
  resetEvents();
}
