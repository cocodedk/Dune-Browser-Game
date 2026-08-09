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
  DirectionalLight, Color,
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
// R1.2: shadow casting is what lets a punched gallery socket read as a
// dark void instead of a lit slot — see the header note.
renderer.shadowMap.enabled = true
container.appendChild(renderer.domElement)

const ambient = new AmbientLight(0x201812, 0.18)
scene.add(ambient)

// Physically-correct candela units: reaching a ~36 x 22 x 52m hall from one
// point needs three orders of magnitude more than a "6" that reads fine in
// pre-r155 arbitrary units — measured by capturing rig.png and adjusting
// until the vault silhouette was actually visible, not assumed.
const hearth = new PointLight(DRESSING.hearthColor, 900, 60, 1.7)
hearth.position.set(...(DRESSING.hearthAtM as [number, number, number]))
hearth.position.y = 2
scene.add(hearth)

// ~30 degrees off CAMERA_RIG's view axis (R1.2 — was near-coaxial, which
// left every socket's back cap facing the light almost head-on and unable
// to shade dark by normal falloff alone). The shadow camera's ortho box is
// sized in LIGHT space to cover the whole hall so no socket's shadow gets
// silently clipped.
const clayLight = new DirectionalLight(0xffffff, 4)
clayLight.position.set(14, 16, -32)
clayLight.target.position.set(0, FOOTPRINT.heightM * 0.5, -FOOTPRINT.depthM * 0.4)
clayLight.visible = false
clayLight.castShadow = true
clayLight.shadow.mapSize.set(2048, 2048)
clayLight.shadow.camera.left = -30
clayLight.shadow.camera.right = 30
clayLight.shadow.camera.top = 20
clayLight.shadow.camera.bottom = -20
clayLight.shadow.camera.near = 1
clayLight.shadow.camera.far = 80
clayLight.shadow.normalBias = 0.5
scene.add(clayLight)
scene.add(clayLight.target)

const model = createSietch()
scene.add(model.root as never)
;(model.root as unknown as Object3D).traverse((child) => {
  const mesh = child as Object3D & { isMesh?: boolean; castShadow?: boolean; receiveShadow?: boolean }
  if (mesh.isMesh) {
    mesh.castShadow = true
    mesh.receiveShadow = true
  }
})

installDebugHandle({ camera, scene, model, ambient, hearth, clayLight })

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
