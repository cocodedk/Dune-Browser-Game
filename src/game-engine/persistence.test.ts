import { describe, it, expect } from 'vitest';
import { createInitialState } from './GameState';
import { serializeWorld, deserializeWorld } from './persistence';
import type { WorldState } from '../types';

describe('persistence serialization', () => {
  it('round-trips a WorldState via JSON parse/stringify', () => {
    const state = createInitialState();
    const json = serializeWorld(state);
    const restored = deserializeWorld(json);
    expect(restored.time).toBe(state.time);
    expect(restored.speed).toBe(state.speed);
    expect(restored.villages).toHaveLength(state.villages.length);
    expect(restored.player.location).toBe(state.player.location);
    expect(restored.difficulty).toBe(state.difficulty);
  });

  it('handles empty regions and events', () => {
    const state: WorldState = {
      ...createInitialState(),
      regions: [],
      events: [],
    };
    const json = serializeWorld(state);
    const restored = deserializeWorld(json);
    expect(restored.regions).toHaveLength(0);
    expect(restored.events).toHaveLength(0);
  });

  it('preserves faction profile structure', () => {
    const state = createInitialState();
    const json = serializeWorld(state);
    const restored = deserializeWorld(json);
    expect(restored.factionProfiles).toHaveLength(state.factionProfiles.length);
    const original = state.factionProfiles[0];
    const restoredFp = restored.factionProfiles[0];
    expect(restoredFp.id).toBe(original.id);
    expect(restoredFp.name).toBe(original.name);
    expect(restoredFp.type).toBe(original.type);
  });

  it('preserves AI timers and null dialogue', () => {
    const state = createInitialState();
    const json = serializeWorld(state);
    const restored = deserializeWorld(json);
    expect(restored.aiTimers).toEqual(state.aiTimers);
    expect(restored.dialogue).toBeNull();
  });

  it('round-trips modified WorldState fields', () => {
    const state = createInitialState();
    state.time = 500;
    state.speed = 5;
    state.player.spice = 100;
    state.player.influence = 50;
    state.goalAchieved = true;
    const json = serializeWorld(state);
    const restored = deserializeWorld(json);
    expect(restored.time).toBe(500);
    expect(restored.speed).toBe(5);
    expect(restored.player.spice).toBe(100);
    expect(restored.player.influence).toBe(50);
    expect(restored.goalAchieved).toBe(true);
  });
});