// src/game-render/TerritoryZones.ts — Draws filled territory polygons on the map

import Phaser from 'phaser'
import type { WorldState } from '../types'
import { EventBus } from '../EventBus'
import { TERRITORY_POLYGONS } from '../data/territoryPolygons'
import { FACTION_PHASER_COLORS } from './factionColors'

export interface TerritoryLayer {
  graphics: Phaser.GameObjects.Graphics
  labels: Phaser.GameObjects.Text[]
}

/** Ray-casting point-in-polygon check */
function pointInPolygon(x: number, y: number, verts: [number, number][]): boolean {
  let inside = false
  const n = verts.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = verts[i]
    const [xj, yj] = verts[j]
    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

export function createTerritoryZones(
  scene: Phaser.Scene,
  world: WorldState,
): TerritoryLayer {
  const graphics = scene.add.graphics().setDepth(1)

  const labels: Phaser.GameObjects.Text[] = TERRITORY_POLYGONS.map(tp => {
    const region = world.regions.find(r => r.id === tp.id)
    const text = region ? region.name : tp.id.replace(/_/g, ' ')
    return scene.add
      .text(tp.center.x, tp.center.y, text, {
        fontSize: '9px',
        color: '#c8a84b',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(3)
      .setAlpha(0.75)
  })

  // Single pointer listener — no world capture; closure uses only static polygon data
  scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    const { x, y } = pointer
    for (const tp of TERRITORY_POLYGONS) {
      if (pointInPolygon(x, y, tp.vertices)) {
        EventBus.emit('territory:selected', { regionId: tp.id })
        break
      }
    }
  })

  const layer: TerritoryLayer = { graphics, labels }
  refreshTerritoryZones(layer, world)
  return layer
}

export function refreshTerritoryZones(layer: TerritoryLayer, world: WorldState): void {
  const { graphics, labels } = layer
  graphics.clear()

  TERRITORY_POLYGONS.forEach((tp, idx) => {
    const region = world.regions.find(r => r.id === tp.id)
    const owner = region?.owner ?? null
    const color = owner ? (FACTION_PHASER_COLORS[owner] ?? 0x3d2b10) : 0x3d2b10
    const fillAlpha = owner ? 0.15 : 0.06
    const strokeAlpha = owner ? 0.4 : 0.18

    const [first, ...rest] = tp.vertices

    // Filled polygon
    graphics.fillStyle(color, fillAlpha)
    graphics.beginPath()
    graphics.moveTo(first[0], first[1])
    for (const [vx, vy] of rest) graphics.lineTo(vx, vy)
    graphics.closePath()
    graphics.fillPath()

    // Border
    graphics.lineStyle(1, color, strokeAlpha)
    graphics.beginPath()
    graphics.moveTo(first[0], first[1])
    for (const [vx, vy] of rest) graphics.lineTo(vx, vy)
    graphics.closePath()
    graphics.strokePath()

    // Label color based on unrest
    const label = labels[idx]
    if (label) {
      if (region && region.unrest >= 60) {
        label.setColor('#c62828')
      } else {
        label.setColor('#c8a84b')
      }
    }
  })
}
