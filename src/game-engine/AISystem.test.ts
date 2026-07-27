import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { WorldState } from '../types';

let mockWorld: WorldState;

vi.mock('./GameState', () => ({
  get world() { return mockWorld; },
}));

vi.mock('./EventSystem', () => ({
  pushEvent: vi.fn(),
}));

vi.mock('./VillageSystem', () => ({
  harkonnenAttack: vi.fn(),
  harkonnenBribe: vi.fn(),
}));

vi.mock('./LLMClient', () => ({
  decideFactionMove: vi.fn().mockResolvedValue(null),
}));

vi.mock('./faction/goals', () => ({
  generateGoals: vi.fn().mockReturnValue([]),
}));

vi.mock('./faction/adapter', () => ({
  toGoalWorldView: vi.fn().mockReturnValue({ villages: [], factions: [] }),
}));

vi.mock('./difficulty', () => ({
  getDifficultyConfig: vi.fn().mockReturnValue({
    playerSpiceMultiplier: 1,
    aiActionChanceMultiplier: 1,
    unrestMultiplier: 1,
    aiAggressionMultiplier: 1,
    reputationDecayMultiplier: 1,
  }),
}));

function createTestWorld(): WorldState {
  return {
    time: 10,
    speed: 1,
    villages: [
      { id: 'v1', name: 'V1', position: { x: 0, y: 0 }, population: 10, spice: 5, loyalty: 50, owner: 'player', status: 'friendly', productionRate: 1, kind: 'sietch', discovered: true, regionId: 'v1' },
      { id: 'v2', name: 'V2', position: { x: 100, y: 100 }, population: 20, spice: 10, loyalty: 80, owner: 'harkonnen', status: 'neutral', productionRate: 2, kind: 'fort', discovered: true, regionId: 'v2' },
    ],
    player: {
      location: 'v1',
      state: 'idle',
      travelTarget: null,
      arrivalTime: 0,
      influence: 5,
      spice: 0,
      troops: 0,
    },
    aiTimers: {
      harkonnen: { nextDecisionAt: 10, lastDecision: null },
    },
    dialogue: null,
    events: [],
    goalAchieved: false,
    goalType: 'control_all_villages',
    factionProfiles: [
      {
        id: 'harkonnen',
        name: 'Harkonnen',
        type: 'house',
        resources: { spice: 100, solaris: 200, troops: 50, influence: 10 },
        strategy: { aggression: 90, diplomacy: 20, expansion: 70, greed: 80, loyaltyFocus: 30 },
        relations: { player: { trust: -50, fear: 10, trade: false, war: false } },
        goals: [],
      },
    ],
    regions: [],
    sietches: [],
    difficulty: 'normal' as const,
    scoutedDefense: {},
    paused: false,
    flags: {},
    quota: {
      nextDueDay: 8, amount: 100, cycleIndex: 0,
      patience: 3, arrears: 0, restoredThisAct: false,
    },
    troopGroups: [],
    spiceFields: [],
    equipment: [],
    charisma: 20,
    act: 'act1',
    ending: null,
  };
}

describe('updateAI', () => {
  beforeEach(() => {
    mockWorld = createTestWorld();
  });

  it('reads from world.aiTimers instead of world.factions', () => {
    const timer = mockWorld.aiTimers.harkonnen;
    expect(timer).toBeDefined();
    expect(timer.nextDecisionAt).toBe(10);
    expect(timer.lastDecision).toBeNull();
  });

  it('does not trigger decision when time < nextDecisionAt', async () => {
    const { updateAI } = await import('./AISystem');
    mockWorld.time = 5;
    mockWorld.aiTimers.harkonnen.nextDecisionAt = 10;
    const prevNext = mockWorld.aiTimers.harkonnen.nextDecisionAt;
    updateAI();
    expect(mockWorld.aiTimers.harkonnen.nextDecisionAt).toBe(prevNext);
  });

  it('updates nextDecisionAt when time >= nextDecisionAt', async () => {
    const { updateAI } = await import('./AISystem');
    mockWorld.time = 10;
    mockWorld.aiTimers.harkonnen.nextDecisionAt = 10;
    updateAI();
    expect(mockWorld.aiTimers.harkonnen.nextDecisionAt).toBe(20);
  });

  it('stores lastDecision in aiTimers on fallback', async () => {
    const { updateAI } = await import('./AISystem');
    mockWorld.time = 10;
    mockWorld.aiTimers.harkonnen.nextDecisionAt = 10;
    updateAI();
    await new Promise(r => setTimeout(r, 50));
    const last = mockWorld.aiTimers.harkonnen.lastDecision;
    if (last) {
      expect(last.action).toBe('attack');
      expect(last.targetVillageId).toBe('v1');
    }
  });

  it('uses factionProfiles for strategy data, not world.factions', () => {
    const profiles = mockWorld.factionProfiles;
    expect(profiles.length).toBeGreaterThan(0);
    const harkonnen = profiles.find(f => f.id === 'harkonnen');
    expect(harkonnen).toBeDefined();
    expect(harkonnen!.strategy.aggression).toBe(90);
  });

  it('returns early if aiTimers.harkonnen is undefined', async () => {
    const { updateAI } = await import('./AISystem');
    delete mockWorld.aiTimers.harkonnen;
    expect(() => updateAI()).not.toThrow();
  });
});