// landscape-shop/sietch/src/main.ts
// Dev + evidence harness: scene, the exact CAMERA_RIG from spec.ts, and
// the one authored light this round allows — near-black ambient plus a
// warm PointLight at DRESSING.hearthAtM (landscape-shop/docs/
// gauntlet-loop.md R1 bar: "a single warm point light... is allowed NOW
// because an interior's massing is unreadable without its key light").
// A second, harness-only DirectionalLight (clayLight) exists purely for
// debug.ts's setClay() pure-form pass — three's lights are physically
// correct since ~r155 (candela units, inverse-square falloff), so a flat
// ambient-only "clay" pass renders every normal identically and the shape
// vanishes; a directional light is what actually reveals form via
// shading gradients. It stays invisible (and out of the released look)
// until setClay(true) turns it on. tools/shoot.mjs drives
// window.__SIETCH__ (debug.ts) for evidence PNGs.
//
// R1.2: clayLight now casts a real shadow and sits ~30 degrees off the
// CAMERA_RIG view axis, not coaxial with it — a view-axis light's
// normal-based (Lambertian) shading alone cannot make a gallery socket's
// back cap read as dark, since it faces the camera/light almost head-on
// regardless of how deep it sits. Real occlusion (the near jamb shadowing
// the socket's own interior) is what makes a punched hole read as a hole.
// The hearth PointLight does NOT cast a shadow: measured (rig.png) that
// enabling it collapsed the entire lit render to a near-solid black
// silhouette against the background colour — a PointLight cube-shadow
// artifact this round didn't chase down further, given the lit look
// already reads correctly without it (jamb relief + falloff alone).

import {
  Scene, PerspectiveCamera, WebGLRenderer, AmbientLight, PointLight,
  DirectionalLight, Color, ACESFilmicToneMapping, SRGBColorSpace,
} from 'three'
import type { Object3D } from 'three'
import { createSietch } from './model/Sietch'
import { CAMERA_RIG, DRESSING, FOOTPRINT } from './spec'
import { installDebugHandle } from './debug'

const container = document.getElementById('app')
if (!container) throw new Error('#app missing')

const scene = new Scene()
scene.background = new Color(0x0b0a09)

const camera = new PerspectiveCamera(CAMERA_RIG.fovDeg, window.innerWidth / window.innerHeight, 0.1, 200)
camera.position.set(...(CAMERA_RIG.positionM as [number, number, number]))
camera.lookAt(...(CAMERA_RIG.lookAtM as [number, number, number]))

const renderer = new WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
// R2: match the CONSUMER's tone curve. src/game-render/core/Renderer.ts
// renders the game with ACESFilmicToneMapping at exposure 1.0; the shop
// was rendering with none, so every surface within a few metres of the
// hearth clipped to flat white and no amount of authored floor detail
// could have shown there. Judging the set under a different tone curve
// than the game will use is judging a different set.
// R3: clay is the one exception — debug.ts's setClay() swaps this to
// NoToneMapping while clay is on. Clay is a diagnostic, not a look: a
// single raking key under ACES either clipped the near-facing wall white
// or crushed the far hemisphere black before either extreme was even
// bright/dark enough to show the 0.04-0.32 m course relief. Linear
// response makes "mid-grey, nothing clipped" a value read straight off
// the pixels.
renderer.toneMapping = ACESFilmicToneMapping
renderer.toneMappingExposure = 1.0
renderer.outputColorSpace = SRGBColorSpace
// R1.2: shadow casting is what lets a punched gallery socket read as a
// dark void instead of a lit slot — see the header note.
renderer.shadowMap.enabled = true
container.appendChild(renderer.domElement)

const ambient = new AmbientLight(0x201812, 0.18)
scene.add(ambient)

// Physically-correct candela units, held at R3's own numbers — see the
// R2->R3 note below on why 340/60/1.4. R3 FINAL TRIED lowering DECAY
// further (1.4->1.2) against the same 35 m anchor for a fresh critic's
// "the hearth's light behaves like a stage spotlight... rather than a
// fire radiating warmth", and MEASURED it wrong: nearly the whole hall
// sits closer than the 35 m anchor, so flattening the curve to hold that
// one far point dimmed everything nearer it too (rig.png hall-mean outside
// the hearth zone, 67.8 -> 57.9, an 14.6% drop against the 5% budget).
// Lowering HEIGHT alone (toward the embers) cost 4.8% for no clipping
// gain, because a closer source is BRIGHTER directly beneath it, not
// dimmer. The light stays exactly as R3 left it; the fix that actually
// answers the critic is the floor's own — surface/floorWear.ts's
// hearthAshTaperAt, pulling the desire-line polish (the specular lane a
// nearby light needs to paint a wedge) back near the hearth.
const HEARTH_LIGHT_INTENSITY = 340
const HEARTH_LIGHT_RANGE_M = 60
const HEARTH_LIGHT_DECAY = 1.4
const HEARTH_LIGHT_HEIGHT_M = 2
const hearth = new PointLight(DRESSING.hearthColor, HEARTH_LIGHT_INTENSITY, HEARTH_LIGHT_RANGE_M, HEARTH_LIGHT_DECAY)
hearth.position.set(...(DRESSING.hearthAtM as [number, number, number]))
hearth.position.y = HEARTH_LIGHT_HEIGHT_M
scene.add(hearth)

// ~30 degrees off CAMERA_RIG's view axis (R1.2 — was near-coaxial, which
// left every socket's back cap facing the light almost head-on and unable
// to shade dark by normal falloff alone).
//
// R2.1 — THE SHADOW BOX WAS NOT BIG ENOUGH, and that is the whole of the
// critic's fourth finding: "a light wedge-shaped shard cutting into the
// wall/floor junction near the right edge... reads as a stray edge or
// unclosed seam". It was neither. R2's ortho box was +-30 x +-20 with
// near 1, and the hall's bounding sphere is 33.6 m of radius around a
// centre only 17 m from this light — so the light sits INSIDE its own
// subject and the near-camera wall fell outside the box entirely.
// Geometry outside a shadow camera is rendered UNSHADOWED, so that wall
// came back at full key while the rock around it was shadowed: a hard
// bright wedge at the frame edge, drawn by the envelope, caused by the
// harness. Proved by isolating it (still there with every carving family
// switched off) and then by widening the box (gone). The box now covers
// the bounding sphere, and near/far span the light's own position inside
// it. Resolution cost: 3.7 cm per texel, against 0.06 m risers.
// R2 TRIED AND REJECTED: a dim cool PointLight inside galleryLeftB's
// socket, to make the galleries read as somewhere rather than as holes.
// Shot and looked at: a point source 2 m from its own back cap prints a
// bright round blob on it, which reads as an unsourced light IN the
// picture rather than as spill FROM a lit space, and it lifted the
// socket out of the dark it is supposed to sit in. A sourced fill here
// needs geometry to hide the source behind — that is R3 dressing work,
// not a lighting knob. The hearth remains the only authored light.
// R3: intensity 11 (tuned for ACES) blew the near wall to clipped white
// the moment clay moved to NoToneMapping — no compression left to hide
// it. Retuned by histogram (screenshot, check the byte range, repeat)
// against bedding.ts's courses: their risers tilt the surface normal in
// Y (a course's proudM is a function of world Y, not of azimuth), so a
// key needs real vertical throw to shade them — raised to Y=20, close to
// the crown (22 m), well above its own target (Y=11) rather than beside
// it, so it rakes down across every wall AND reaches the floor. 7.0 is
// where the brightest pixel in rig-clay sits mid-200s, not 255.
// normalBias 0.5 was half a metre of shadow-sample offset against
// 0.04-0.32 m relief — it was erasing every contact shadow a course throws
// under itself. 0.03 is the smallest value R1.2's peter-panning went away
// at (measured on the gallery sockets, the deepest cut in the set).
const clayLight = new DirectionalLight(0xffffff, 7.0)
clayLight.position.set(14, 20, -30)
clayLight.target.position.set(0, FOOTPRINT.heightM * 0.5, -FOOTPRINT.depthM * 0.4)
clayLight.visible = false
clayLight.castShadow = true
clayLight.shadow.mapSize.set(2048, 2048)
clayLight.shadow.camera.left = -38
clayLight.shadow.camera.right = 38
clayLight.shadow.camera.top = 38
clayLight.shadow.camera.bottom = -38
clayLight.shadow.camera.near = 0.5
clayLight.shadow.camera.far = 95
clayLight.shadow.normalBias = 0.03
scene.add(clayLight)
scene.add(clayLight.target)

// R3: a dim, shadowless fill collocated with CAMERA_RIG — a "headlamp".
// The clay key alone leaves the far hemisphere (whatever faces away from
// it) a flat black silhouette with no gradient at all: correct occlusion
// on the SIDE facing away from the key, wrong when nothing in frame ever
// faces the key. A camera-collocated light lifts exactly what the camera
// sees, in proportion to how square it faces the lens — unlike raising
// ambient (R2's 1.5), which lit every normal identically and flattened
// the key's own shading right back out. Aimed a little BELOW
// CAMERA_RIG.lookAtM (y=2 not 6) so its throw reaches the floor, which
// the camera itself looks past rather than at.
const clayFill = new DirectionalLight(0xffffff, 2.6)
clayFill.position.set(...(CAMERA_RIG.positionM as [number, number, number]))
clayFill.target.position.set(0, 2, -6)
clayFill.visible = false
scene.add(clayFill)
scene.add(clayFill.target)

const model = createSietch()
scene.add(model.root as never)
;(model.root as unknown as Object3D).traverse((child) => {
  const mesh = child as Object3D & { isMesh?: boolean; castShadow?: boolean; receiveShadow?: boolean }
  if (mesh.isMesh) {
    mesh.castShadow = true
    mesh.receiveShadow = true
  }
})

installDebugHandle({ camera, scene, model, ambient, hearth, fills: [], clayLight, clayFill, renderer })

function resize(): void {
  const width = window.innerWidth
  const height = window.innerHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}
window.addEventListener('resize', resize)

function frame(): void {
  requestAnimationFrame(frame)
  renderer.render(scene, camera)
}
requestAnimationFrame(frame)
