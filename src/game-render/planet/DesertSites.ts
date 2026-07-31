// src/game-render/planet/DesertSites.ts
// Discovered sites out in the deep desert.
//
// Undiscovered sites are not drawn at all — the point of prospecting is that
// the desert does not tell you what is in it. Once found, a site stays on the
// globe so the player can navigate back to it.

import {
  Group, Mesh, Sprite, SpriteMaterial, CanvasTexture, LinearFilter,
  ConeGeometry, OctahedronGeometry, TorusGeometry, MeshBasicMaterial,
  Vector3, type BufferGeometry,
} from 'three'
import type { DesertSite, SiteKind } from '../../game-engine/desert/sites'
import { latLonToVec3 } from './sphere'

/** One colour per kind, so a glance across the planet reads as information. */
const KIND_COLOR: Record<SiteKind, number> = {
  spice_blow: 0xe8913a,
  wreck: 0x8a8f96,
  outcrop: 0x6e5a44,
  wormsign: 0x8e2318,
  cache: 0x4fb3c8,
}

const KIND_LABEL: Record<SiteKind, string> = {
  spice_blow: 'spice blow',
  wreck: 'wreck',
  outcrop: 'outcrop',
  wormsign: 'wormsign',
  cache: 'cache',
}

const UP = new Vector3(0, 1, 0)

/** Distinct silhouettes, so kind is legible without reading the label. */
function geometryFor(kind: SiteKind, scale: number): BufferGeometry {
  switch (kind) {
    case 'spice_blow':
      return new ConeGeometry(scale * 0.9, scale * 2.2, 7)
    case 'wreck':
      return new OctahedronGeometry(scale, 0)
    case 'wormsign':
      return new TorusGeometry(scale * 1.1, scale * 0.22, 6, 14)
    case 'cache':
      return new OctahedronGeometry(scale * 0.8, 1)
    default:
      return new ConeGeometry(scale, scale * 0.8, 5)
  }
}

function labelFor(site: DesertSite): Sprite {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const text = KIND_LABEL[site.kind]
  ctx.font = '600 24px system-ui, sans-serif'
  const width = Math.ceil(ctx.measureText(text).width) + 26
  canvas.width = width
  canvas.height = 34

  ctx.font = '600 24px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = `#${KIND_COLOR[site.kind].toString(16).padStart(6, '0')}`
  ctx.fillText(text, width / 2, 25)

  const texture = new CanvasTexture(canvas)
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter

  const sprite = new Sprite(new SpriteMaterial({
    map: texture, transparent: true, depthTest: false, fog: false,
    sizeAttenuation: false, opacity: 0.85,
  }))
  sprite.scale.set(width * 0.00034, 34 * 0.00034, 1)
  sprite.center.set(0.5, -0.7)
  sprite.renderOrder = 30
  return sprite
}

export interface DesertSites {
  group: Group
  /** Show whatever has been discovered. Cheap; safe to call per frame. */
  update(sites: readonly DesertSite[], zoom: number): void
  dispose(): void
}

export function createDesertSites(
  sites: readonly DesertSite[],
  planetRadius: number,
  radiusAt: (direction: Vector3) => number,
): DesertSites {
  const group = new Group()
  group.name = 'desert-sites'

  const geometries: BufferGeometry[] = []
  const materials: MeshBasicMaterial[] = []
  const entries: { id: string; mesh: Mesh; label: Sprite }[] = []

  const markerScale = planetRadius * 0.022

  for (const site of sites) {
    const geometry = geometryFor(site.kind, markerScale)
    geometries.push(geometry)

    const material = new MeshBasicMaterial({
      color: KIND_COLOR[site.kind],
      fog: false,
      // Same reasoning as the sietch markers: gameplay furniture standing in
      // the world must never be swallowed by a dune.
      depthTest: false,
    })
    materials.push(material)

    const mesh = new Mesh(geometry, material)
    mesh.name = `site:${site.id}`
    mesh.renderOrder = 9

    const dir = latLonToVec3({ lat: site.latitude, lon: site.longitude }, 1)
    const out = new Vector3(dir.x, dir.y, dir.z).normalize()
    mesh.position.copy(out).multiplyScalar(radiusAt(out) + markerScale)
    mesh.quaternion.setFromUnitVectors(UP, out)

    const label = labelFor(site)
    label.position.copy(out).multiplyScalar(radiusAt(out) + markerScale * 3)

    mesh.visible = false
    label.visible = false
    group.add(mesh)
    group.add(label)
    entries.push({ id: site.id, mesh, label })
  }

  return {
    group,
    update(current, zoom): void {
      const byId = new Map(current.map(s => [s.id, s]))
      // Labels would swamp the system view; the markers themselves stay.
      const showLabels = zoom > 0.4

      for (const entry of entries) {
        const site = byId.get(entry.id)
        const found = site?.discovered === true
        entry.mesh.visible = found
        entry.label.visible = found && showLabels
      }
    },
    dispose(): void {
      for (const g of geometries) g.dispose()
      for (const m of materials) m.dispose()
      for (const e of entries) (e.label.material as SpriteMaterial).dispose()
      group.clear()
    },
  }
}
