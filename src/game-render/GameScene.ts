import Phaser from 'phaser';
import { world } from '../game-engine/GameState';
import { initLoop, tick } from '../runtime/GameDriver';
import { wireCommands } from '../runtime/CommandWiring';
import { drawBackground, drawRoads } from './MapRenderer';
import type { TerritoryLayer } from './TerritoryZones';
import { createTerritoryZones, refreshTerritoryZones } from './TerritoryZones';
import { createVillageMarkers, refreshVillageColors, updatePlayerPosition } from './VillageMarkers';
import { AudioManager } from './AudioManager';

export class GameScene extends Phaser.Scene {
  private playerDot!: Phaser.GameObjects.Arc;
  private villageHitZones: Phaser.GameObjects.Arc[] = [];
  private villageBadges: Phaser.GameObjects.Text[] = [];
  private territoryLayer!: TerritoryLayer;
  private unwireCommands: (() => void) | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    initLoop();
    this.unwireCommands = wireCommands();

    this.cameras.main.setBackgroundColor('#1a1208');
    drawBackground(this);
    this.territoryLayer = createTerritoryZones(this, world);
    drawRoads(this, world);

    const { hitZones, badges } = createVillageMarkers(this, world);
    this.villageHitZones = hitZones;
    this.villageBadges = badges;

    const startVillage = world.villages.find(v => v.id === 'sietch_tabr')!;
    this.playerDot = this.add.circle(startVillage.position.x, startVillage.position.y, 8, 0xffffff)
      .setDepth(10);

    new AudioManager(this).playAmbient('ambient_desert');
  }

  update(_time: number, delta: number): void {
    const shouldRefresh = tick(delta);
    updatePlayerPosition(this.playerDot, world);

    if (shouldRefresh) {
      refreshTerritoryZones(this.territoryLayer, world);
      refreshVillageColors(this.villageHitZones, this.villageBadges, world);
    }
  }

  shutdown(): void {
    this.unwireCommands?.();
    this.unwireCommands = null;
  }
}
