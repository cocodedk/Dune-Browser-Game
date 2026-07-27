import Phaser from 'phaser';
import type { WorldState, FactionId } from '../types';
import { pushEvent } from '../game-engine/EventSystem';
import { startDialogue } from '../game-engine/DialogueSystem';
import { currentTravelProgress } from '../game-engine/TravelSystem';
import { EventBus } from '../EventBus';
import { decideVisit } from '../runtime/VisitPolicy';
import { FACTION_PHASER_COLORS, FACTION_ABBREV } from './factionColors';

export function createVillageMarkers(
  scene: Phaser.Scene,
  world: WorldState,
): { hitZones: Phaser.GameObjects.Arc[]; labels: Phaser.GameObjects.Text[]; badges: Phaser.GameObjects.Text[] } {
  const hitZones: Phaser.GameObjects.Arc[] = [];
  const labels: Phaser.GameObjects.Text[] = [];
  const badges: Phaser.GameObjects.Text[] = [];

  for (const village of world.villages) {
    const color = FACTION_PHASER_COLORS[village.owner as FactionId] ?? 0xc8a84b;

    const circle = scene.add.circle(village.position.x, village.position.y, 24, color, 0.85)
      .setInteractive({ useHandCursor: true })
      .setDepth(5);

    circle.on('pointerdown', () => {
      const action = decideVisit(world, village.id);
      if (action.kind === 'none') return;

      if (action.kind === 'travel') {
        EventBus.emit('player:travel', { targetVillageId: action.targetId });
      } else if (action.kind === 'dialogue') {
        startDialogue(action.treeId, action.villageId);
      } else if (action.kind === 'event') {
        pushEvent('village_selected', action.message);
      }

      EventBus.emit('village:selected', { villageId: village.id });
    });

    circle.on('pointerover', () => circle.setAlpha(1));
    circle.on('pointerout', () => circle.setAlpha(0.85));

    hitZones.push(circle);

    // Faction badge text centered inside the circle
    const badge = scene.add.text(village.position.x, village.position.y, FACTION_ABBREV[village.owner as FactionId] ?? '?', {
      fontFamily: 'system-ui',
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setDepth(7);
    badges.push(badge);

    // Village name label below
    const label = scene.add.text(village.position.x, village.position.y + 30, village.name, {
      fontFamily: 'system-ui',
      fontSize: '12px',
      color: '#d4a017',
    }).setOrigin(0.5, 0).setDepth(6);
    labels.push(label);
  }

  return { hitZones, labels, badges };
}

export function refreshVillageColors(
  hitZones: Phaser.GameObjects.Arc[],
  badges: Phaser.GameObjects.Text[],
  world: WorldState,
): void {
  world.villages.forEach((village, i) => {
    const circle = hitZones[i];
    if (!circle) return;
    const color = FACTION_PHASER_COLORS[village.owner as FactionId] ?? 0xc8a84b;
    circle.setFillStyle(color, 0.85);
    const badge = badges[i];
    if (badge) badge.setText(FACTION_ABBREV[village.owner as FactionId] ?? '?');
  });
}

export function updatePlayerPosition(
  dot: Phaser.GameObjects.Arc,
  world: WorldState,
): void {
  const { player } = world;
  const currentVillage = world.villages.find(v => v.id === player.location);
  if (!currentVillage) return;

  if (player.state === 'traveling' && player.travelTarget) {
    const targetVillage = world.villages.find(v => v.id === player.travelTarget);
    if (targetVillage) {
      const progress = currentTravelProgress(world);
      const x = Phaser.Math.Linear(currentVillage.position.x, targetVillage.position.x, progress);
      const y = Phaser.Math.Linear(currentVillage.position.y, targetVillage.position.y, progress);
      dot.setPosition(x, y);
    }
  } else {
    dot.setPosition(currentVillage.position.x, currentVillage.position.y);
  }
}
