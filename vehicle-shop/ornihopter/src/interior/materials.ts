// vehicle-shop/ornihopter/src/interior/materials.ts
// Flat, cheap materials only — this round is layout and scale, not finish.
// Every function returns a fresh instance so each part module owns and
// disposes exactly what it created; nothing here is a shared singleton.

import { MeshStandardMaterial } from 'three'

const COLOR = {
  gunmetal: 0x2b2e33,
  hullLiner: 0x3a3f46,
  seatKhaki: 0x6b6250,
  seatKhakiDark: 0x554e3e,
  consoleBody: 0x24262a,
  figureSuit: 0x556052,
  figureSkin: 0xc79a72,
  figureHelmet: 0x1c1e21,
  amber: 0xd98a2b,
  green: 0x4caf60,
  red: 0xc94a3a,
  glassDark: 0x15171a,
} as const

function standard(color: number, roughness: number, metalness: number, emissive?: number) {
  return new MeshStandardMaterial({
    color,
    roughness,
    metalness,
    emissive: emissive ?? 0x000000,
    emissiveIntensity: emissive ? 1.4 : 0,
  })
}

export const gunmetalMaterial = () => standard(COLOR.gunmetal, 0.75, 0.35)
export const hullLinerMaterial = () => standard(COLOR.hullLiner, 0.85, 0.15)
export const seatMaterial = () => standard(COLOR.seatKhaki, 0.9, 0)
export const seatDarkMaterial = () => standard(COLOR.seatKhakiDark, 0.9, 0)
export const consoleBodyMaterial = () => standard(COLOR.consoleBody, 0.6, 0.4)
export const figureSuitMaterial = () => standard(COLOR.figureSuit, 0.85, 0)
export const figureSkinMaterial = () => standard(COLOR.figureSkin, 0.8, 0)
export const figureHelmetMaterial = () => standard(COLOR.figureHelmet, 0.4, 0.5)
export const stickGripMaterial = () => standard(COLOR.gunmetal, 0.5, 0.6)

export const amberLitMaterial = () => standard(COLOR.amber, 0.4, 0.1, COLOR.amber)
export const greenLitMaterial = () => standard(COLOR.green, 0.4, 0.1, COLOR.green)
export const redLitMaterial = () => standard(COLOR.red, 0.4, 0.1, COLOR.red)

/** Dial/switch faces: unlit, dark-glass look so the lit variants above read
 *  as switched-on against them rather than everything glowing equally. */
export const darkDialMaterial = () => standard(COLOR.glassDark, 0.3, 0.2)
