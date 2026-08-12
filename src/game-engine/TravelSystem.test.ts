// src/game-engine/TravelSystem.test.ts
// travelDuration and currentTravelProgress — including the fix for the marker
// interpolation bug that assumed every trip took exactly 10 seconds.

import { describe, it, expect } from 'vitest';
import { setWorld, createInitialState, world } from './GameState';
import { travelDuration, currentTravelProgress, startTravel, checkTravelArrival } from './TravelSystem';
import { TRAVEL_RED_WALL_FLAG, REDWALL_TRUST_ACKNOWLEDGED_FLAG } from './acts/openingObjectives';
import { REDWALL_TRUST_TREE_ID } from '../data/dialogue';
import type { WorldState } from '../types';

function worldWithTrip(distance: number): WorldState {
  const state = createInitialState();
  const template = state.villages[0];
  state.villages = [
    { ...template, id: 'origin', position: { x: 0, y: 0 } },
    { ...template, id: 'dest', position: { x: distance, y: 0 } },
  ];
  state.player.location = 'origin';
  state.player.travelTarget = null;
  state.player.state = 'idle';
  return state;
}

describe('travelDuration', () => {
  it('clamps short hops to a 4-second minimum', () => {
    setWorld(worldWithTrip(10));
    expect(travelDuration('origin', 'dest')).toBe(4);
  });

  it('derives an exact 4-second trip from a 200-unit distance', () => {
    setWorld(worldWithTrip(200));
    expect(travelDuration('origin', 'dest')).toBe(4);
  });

  it('derives an exact 16-second trip from an 800-unit distance', () => {
    setWorld(worldWithTrip(800));
    expect(travelDuration('origin', 'dest')).toBe(16);
  });

  it('falls back to 10 seconds when a village id is unknown', () => {
    setWorld(worldWithTrip(200));
    expect(travelDuration('origin', 'ghost')).toBe(10);
  });
});

describe('currentTravelProgress', () => {
  it('returns 0 when the player is idle', () => {
    setWorld(worldWithTrip(200));
    expect(currentTravelProgress(world)).toBe(0);
  });

  it('interpolates a 4-second trip from 0 to 1 (previously hardcoded to 10s)', () => {
    setWorld(worldWithTrip(200));
    startTravel('dest');
    expect(travelDuration('origin', 'dest')).toBe(4);

    expect(currentTravelProgress(world)).toBe(0);
    world.time += 2;
    expect(currentTravelProgress(world)).toBeCloseTo(0.5);
    world.time += 2;
    expect(currentTravelProgress(world)).toBe(1);
  });

  it('interpolates a 16-second trip from 0 to 1 (previously hardcoded to 10s)', () => {
    setWorld(worldWithTrip(800));
    startTravel('dest');
    expect(travelDuration('origin', 'dest')).toBe(16);

    expect(currentTravelProgress(world)).toBe(0);
    world.time += 8;
    expect(currentTravelProgress(world)).toBeCloseTo(0.5);
    world.time += 8;
    expect(currentTravelProgress(world)).toBe(1);
  });

  it('clamps progress at 1 if time overshoots the arrival instant', () => {
    setWorld(worldWithTrip(200));
    startTravel('dest');
    world.time += 100;
    expect(currentTravelProgress(world)).toBe(1);
  });
});

describe('checkTravelArrival: opening objective seam (acts/openingObjectives.ts)', () => {
  it('sets travel.red_wall_sietch once arrival resolves, not before', () => {
    const state = createInitialState();
    state.player.location = 'hagg';
    setWorld(state);

    startTravel('red_wall_sietch');
    expect(world.flags[TRAVEL_RED_WALL_FLAG]).toBeUndefined();

    world.time = world.player.arrivalTime;
    checkTravelArrival();

    expect(world.player.location).toBe('red_wall_sietch');
    expect(world.flags[TRAVEL_RED_WALL_FLAG]).toBe(true);
  });

  it('does not set the flag on arrival anywhere else', () => {
    const state = createInitialState();
    state.player.location = 'hagg';
    setWorld(state);

    startTravel('arrakeen');
    world.time = world.player.arrivalTime;
    checkTravelArrival();

    expect(world.player.location).toBe('arrakeen');
    expect(world.flags[TRAVEL_RED_WALL_FLAG]).toBeUndefined();
  });
});

describe('checkTravelArrival: Beat 4 auto-open trigger (story/redwall_trust)', () => {
  it('opens the tree once arrival at Red Wall resolves', () => {
    const state = createInitialState();
    state.player.location = 'hagg';
    setWorld(state);

    startTravel('red_wall_sietch');
    expect(world.dialogue).toBeNull();

    world.time = world.player.arrivalTime;
    checkTravelArrival();

    expect(world.dialogue).toEqual({
      treeId: REDWALL_TRUST_TREE_ID,
      currentNodeId: 'redwall_trust_root',
      villageId: 'red_wall_sietch',
    });
  });

  it('does not reopen once already acknowledged', () => {
    const state = createInitialState();
    state.player.location = 'hagg';
    state.flags[REDWALL_TRUST_ACKNOWLEDGED_FLAG] = true;
    setWorld(state);

    startTravel('red_wall_sietch');
    world.time = world.player.arrivalTime;
    checkTravelArrival();

    expect(world.player.location).toBe('red_wall_sietch');
    expect(world.dialogue).toBeNull();
  });

  it('does not open at any other destination', () => {
    const state = createInitialState();
    state.player.location = 'hagg';
    setWorld(state);

    startTravel('arrakeen');
    world.time = world.player.arrivalTime;
    checkTravelArrival();

    expect(world.dialogue).toBeNull();
  });
});
