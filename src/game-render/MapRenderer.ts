import Phaser from 'phaser';
import type { WorldState } from '../types';

export function drawBackground(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  g.fillStyle(0x1a1208, 1);
  g.fillRect(0, 0, 800, 500);

  // Sand color variation patches
  g.fillStyle(0x221508, 0.35);
  g.fillEllipse(150, 400, 180, 70);
  g.fillStyle(0x1f1409, 0.25);
  g.fillEllipse(620, 100, 220, 90);
  g.fillStyle(0x251a0a, 0.2);
  g.fillEllipse(400, 270, 280, 110);

  // Multi-layer dune ridges for depth
  for (let layer = 0; layer < 3; layer++) {
    const alpha = 0.12 + layer * 0.08;
    const color = layer === 0 ? 0x2a1e0a : layer === 1 ? 0x3d2b10 : 0x4a3418;
    g.lineStyle(1 + layer, color, alpha);
    const yStart = 40 + layer * 8;
    for (let y = yStart; y < 500; y += 28) {
      g.beginPath();
      g.moveTo(0, y + Math.sin(y * 0.09 + layer * 0.7) * 10);
      for (let x = 20; x <= 800; x += 20) {
        g.lineTo(x, y + Math.sin(x * 0.018 + y * 0.09 + layer * 0.7) * 10);
      }
      g.strokePath();
    }
  }
}

export function drawRoads(scene: Phaser.Scene, world: WorldState): void {
  const g = scene.add.graphics();
  const vs = world.villages;
  // Road glow pass
  g.lineStyle(7, 0x3d2b10, 0.15);
  for (let i = 0; i < vs.length; i++) {
    for (let j = i + 1; j < vs.length; j++) {
      g.lineBetween(vs[i].position.x, vs[i].position.y, vs[j].position.x, vs[j].position.y);
    }
  }
  // Road center line
  g.lineStyle(2, 0x5a3d1a, 0.5);
  for (let i = 0; i < vs.length; i++) {
    for (let j = i + 1; j < vs.length; j++) {
      g.lineBetween(vs[i].position.x, vs[i].position.y, vs[j].position.x, vs[j].position.y);
    }
  }
}
