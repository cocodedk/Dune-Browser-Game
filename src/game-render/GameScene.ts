import Phaser from 'phaser';
import { world } from '../game-engine/GameState';
import { update as loopUpdate, initLoop } from '../game-engine/GameLoop';
import { startTravel } from '../game-engine/TravelSystem';
import { chooseDialogue } from '../game-engine/DialogueSystem';
import { pledgePlayerSietch, assignPlayerSietchTask, stopPlayerSietchTask } from '../game-engine/SietchSystem';
import { attackVillage, scoutVillage } from '../game-engine/CombatSystem';
import { EventBus } from '../EventBus';
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
  private updateTimer = 0;
  private readonly UI_UPDATE_INTERVAL = 100; // ms — throttle React updates
  private audioManager!: AudioManager;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    initLoop();

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

    this.audioManager = new AudioManager(this);
    this.audioManager.playAmbient('ambient_desert');

    EventBus.on('player:travel', ({ targetVillageId }) => {
      startTravel(targetVillageId);
    });
    EventBus.on('player:choose', ({ choiceId }) => {
      chooseDialogue(choiceId);
    });
    EventBus.on('game:speed', ({ speed }) => {
      world.speed = speed;
      EventBus.emit('world:updated', { state: world });
    });
    EventBus.on('player:pledge_sietch', ({ villageId }) => {
      pledgePlayerSietch(villageId);
    });
    EventBus.on('player:assign_sietch_task', ({ villageId, task }) => {
      assignPlayerSietchTask(villageId, task);
    });
    EventBus.on('player:stop_sietch_task', ({ villageId }) => {
      stopPlayerSietchTask(villageId);
    });
    EventBus.on('player:attack_village', ({ targetVillageId, troopsCommitted }) => {
      attackVillage(targetVillageId, troopsCommitted);
    });
    EventBus.on('player:scout_village', ({ targetVillageId }) => {
      scoutVillage(targetVillageId);
    });
    EventBus.on('game:difficulty', ({ difficulty }) => {
      world.difficulty = difficulty;
      EventBus.emit('world:updated', { state: world });
    });
    EventBus.on('audio:mute', () => {
      this.audioManager.toggleMute();
    });

    EventBus.emit('world:updated', { state: world });
  }

  update(_time: number, delta: number): void {
    loopUpdate(delta / 1000);
    updatePlayerPosition(this.playerDot, world);

    this.updateTimer += delta;
    if (this.updateTimer >= this.UI_UPDATE_INTERVAL) {
      this.updateTimer = 0;
      refreshTerritoryZones(this.territoryLayer, world);
      refreshVillageColors(this.villageHitZones, this.villageBadges, world);
      EventBus.emit('world:updated', { state: world });
    }
  }
}
