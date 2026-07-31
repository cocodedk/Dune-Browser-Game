// src/game-engine/territory/territory.ts — Territory control (impl/24)

import type { FactionId, Region, RegionId, TerritoryEvent } from '../../types';

// Minimal world view for territory operations
export interface TerritoryWorld {
  regions: Region[];
  factions: Array<{
    id: FactionId;
    relations: Record<string, { trust: number; trade: boolean; war: boolean }>;
  }>;
}

// Capture a region — transfer ownership, spike unrest by 20
export function captureRegion(
  regionId: RegionId,
  newOwner: FactionId,
  world: TerritoryWorld,
): { world: TerritoryWorld; event: TerritoryEvent } {
  const region = world.regions.find(r => r.id === regionId);
  if (!region) throw new Error(`Region not found: ${regionId}`);

  const prevOwner = region.owner;
  const updatedRegion: Region = {
    ...region,
    owner: newOwner,
    unrest: Math.min(100, region.unrest + 20),
  };

  const updatedWorld: TerritoryWorld = {
    ...world,
    regions: world.regions.map(r => (r.id === regionId ? updatedRegion : r)),
  };

  const event: TerritoryEvent = {
    type: 'region_captured',
    regionId,
    newOwner,
    prevOwner,
  };

  return { world: updatedWorld, event };
}

// Count war relations for a faction
function countWarRelations(
  factionId: FactionId,
  world: TerritoryWorld,
): number {
  const faction = world.factions.find(f => f.id === factionId);
  if (!faction) return 0;
  return Object.values(faction.relations).filter(r => r.war).length;
}

// Check if faction has any trade relation
function hasTradeRelation(
  factionId: FactionId,
  world: TerritoryWorld,
): boolean {
  const faction = world.factions.find(f => f.id === factionId);
  if (!faction) return false;
  return Object.values(faction.relations).some(r => r.trade);
}

// Accumulate unrest per cycle based on conditions
// +2 if owner != null (base occupation pressure)
// +3 if owner is at war with >2 factions
// +2 if spice > 70 (high extraction pressure)
// -2 if owner has any trade relation
// Clamp result to [0, 100]
export function accumulateUnrest(region: Region, world: TerritoryWorld, unrestMultiplier: number = 1): Region {
  let delta = 0;

  if (region.owner !== null) {
    delta += 2;
    if (countWarRelations(region.owner, world) > 2) delta += 3;
  }

  if (region.spice > 70) delta += 2;

  if (region.owner !== null && hasTradeRelation(region.owner, world)) {
    delta -= 2;
  }

  delta = delta * unrestMultiplier;

  const newUnrest = Math.max(0, Math.min(100, region.unrest + delta));
  return { ...region, unrest: newUnrest };
}

// Spice production per cycle: region.spice * (1 - region.unrest/100) * 0.1
// Returns 0 if unrest >= 80
export function produceSpice(region: Region): number {
  if (region.unrest >= 80) return 0;
  return region.spice * (1 - region.unrest / 100) * 0.1;
}

// If unrest >= 100: region defects — owner loses it (owner becomes null)
// Returns updated world and event (or null if no defection)
export function processRegionDefection(
  region: Region,
  world: TerritoryWorld,
): { world: TerritoryWorld; event: TerritoryEvent | null } {
  if (region.unrest < 100 || region.owner === null) {
    return { world, event: null };
  }

  const fromOwner = region.owner;
  const defectedRegion: Region = { ...region, owner: null, unrest: 50 };

  const updatedWorld: TerritoryWorld = {
    ...world,
    regions: world.regions.map(r => (r.id === region.id ? defectedRegion : r)),
  };

  const event: TerritoryEvent = {
    type: 'region_defected',
    regionId: region.id,
    fromOwner,
  };

  return { world: updatedWorld, event };
}

// Get all regions owned by a faction
export function getFactionRegions(
  factionId: FactionId,
  world: TerritoryWorld,
): Region[] {
  return world.regions.filter(r => r.owner === factionId);
}
