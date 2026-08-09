// landscape-shop/cliff/src/main.ts
// Dev harness: the two spec'd CAMERA_RIGS (spec.ts), a grazing warm key
// light (FlightMode's sun, read-only context), FogExp2 matching
// FlightMode's 0xe0a070/0.0009 exactly (so distance alone produces the
// right amount of haze at each rig — no per-rig special-casing needed),
// and a displaced dune ground so the massif reads as rising from open
// terrain, not a flat plane. Rig switch: press 1 (approach) or 2
// (landing), or ?rig=approach|landing in the URL. The model is static
// (contracts.ts); the loop just re-renders the unchanging scene.
//
// R1 REVISION (post-critic): shadow mapping is now on, so the entrance's
// jamb/lintel actually throw shadow into the recessed aperture instead of
// relying on flat material color alone. This is a HARNESS/presentation
// choice (shadow flags are set here by traversal, not baked into the
// model builders — placement/lighting concerns stay the consumer's job,
// contracts.ts) so it costs the model files nothing.

import {
  Scene, PerspectiveCamera, WebGLRenderer, DirectionalLight, AmbientLight,
  FogExp2, Color, Mesh, PlaneGeometry, MeshStandardMaterial, DoubleSide,
  PCFSoftShadowMap, type Object3D,
} from 'three'
import { createCliff } from './model/Cliff'
import { installDebugHandle, type RigName } from './debug'
import { PALETTE } from './spec'

// Ground: FlightMode's actual terrain is a heightfield (amplitude 70, long
// wind-perpendicular ridges via stretch [1, 3.2] —
// src/game-render/terrain/heightfield.ts), not a flat plane; a dead-flat
// harness ground reads as a billiard table under the massif. This is a
// self-contained sine/fbm stand-in at a lower amplitude (shops don't share
// code with root src/ or with each other — tools/shoot.mjs), stretched the
// same way so ridges read as long and perpendicular to one axis. A flat
// apron is held right around the massif's own footprint (FOOTPRINT: x
// +-300, z 0..-212) so model/skirtApron.ts still seats against y=0 with no
// visible gap or floating base.
const DUNE_AMPLITUDE_M = 26
const DUNE_BASE_FREQ = 0.009
const DUNE_STRETCH_Z = 3.2
const APRON_HALF_WIDTH_M = 340
const APRON_FRONT_Z = -260
const APRON_BACK_Z = 80
const APRON_FALLOFF_M = 170

function smoothstep01(t: number): number {
  const c = Math.max(0, Math.min(1, t))
  return c * c * (3 - 2 * c)
}

/** 0 inside the flat apron box, ramping to 1 over APRON_FALLOFF_M beyond it. */
function duneWeightAt(x: number, z: number): number {
  const dx = Math.max(Math.abs(x) - APRON_HALF_WIDTH_M, 0)
  const dz = Math.max(APRON_FRONT_Z - z, z - APRON_BACK_Z, 0)
  return smoothstep01(Math.sqrt(dx * dx + dz * dz) / APRON_FALLOFF_M)
}

/** Three sine octaves, stretched along Z (FlightMode's stretch[1]=3.2) so the
 *  DOMINANT term oscillates fast across Z and only slowly warps along X —
 *  crests that run long across X, wind-perpendicular, not crumpled paper.
 *  Returns roughly [-1, 1]; the caller remaps to non-negative, matching
 *  generateHeightfield's own convention (relief only ever adds height, it
 *  never digs a trough below the base plane). */
function duneNoiseAt(x: number, z: number): number {
  const nx = x * DUNE_BASE_FREQ
  const nz = z * DUNE_BASE_FREQ * DUNE_STRETCH_Z
  return 0.5 * Math.sin(nz + 0.6 * Math.sin(nx * 0.5))
    + 0.3 * Math.sin(nz * 2.2 + nx * 1.3 + 1.7)
    + 0.2 * Math.sin(nx * 2.7 - nz * 0.6 + 4.1)
}

function buildDuneGroundGeometry(): PlaneGeometry {
  const geometry = new PlaneGeometry(4000, 4000, 160, 160)
  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    // Pre-rotation plane vertices are (localX, localY, 0); rotation.x =
    // -PI/2 below sends localX -> worldX, localY -> -worldZ, and localZ ->
    // worldY, so a height goes into localZ here and displacement (not the
    // flat-plane radius) is computed from the WORLD x/z it will land at.
    const worldX = position.getX(i)
    const worldZ = -position.getY(i)
    const relief = duneNoiseAt(worldX, worldZ) * 0.5 + 0.5 // [-1,1] -> [0,1]
    position.setZ(i, relief * DUNE_AMPLITUDE_M * duneWeightAt(worldX, worldZ))
  }
  geometry.computeVertexNormals()
  return geometry
}

const container = document.getElementById('app')
if (!container) throw new Error('#app missing')

const scene = new Scene()
scene.background = new Color(0xc9a06c)
scene.fog = new FogExp2(0xe0a070, 0.0009)

// far=3000 comfortably clears the approach rig at z=-900 (spec.ts).
const camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 3000)

const renderer = new WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = PCFSoftShadowMap
container.appendChild(renderer.domElement)

scene.add(new AmbientLight(0xfff2e0, 0.45))
// Grazing lateral key, low and strongly off to the +X side: the earlier
// (600, 420, -650) sun travelled almost straight down the entrance shaft's
// own -Z axis (z-fraction of its direction ~0.66) and flooded the recess
// head-on, so the back wall came out brighter than the rim. This position
// puts ~92% of the light's travel along X (elevation ~17 deg), so the
// jamb/lip it already casts shadow with (see R1 REVISION above) actually
// blocks the mouth's interior while the strata's own facets still catch
// a raking highlight. Shadow-camera left/right/top/bottom re-fit to this
// angle's actual footprint over the massif (checked numerically, not
// eyeballed); far extended past 1550 to 2000 because an orthographic
// shadow camera's left/right/top/bottom only need to bound the CASTERS
// (a ground point directly under a caster's shadow shares that caster's
// local x/y by construction — only its depth differs), but a low sun
// throws the massif's own shadow much farther along the ground than the
// massif itself, so depth range alone needed the room.
const sun = new DirectionalLight(0xffd9a0, 1.6)
sun.position.set(950, 300, -280)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.left = -350
sun.shadow.camera.right = 350
sun.shadow.camera.top = 300
sun.shadow.camera.bottom = -250
sun.shadow.camera.near = 1
sun.shadow.camera.far = 2000
sun.shadow.bias = -0.0008
scene.add(sun)

const groundMaterial = new MeshStandardMaterial({ color: PALETTE.sandApron, side: DoubleSide })
const ground = new Mesh(buildDuneGroundGeometry(), groundMaterial)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

const model = createCliff()
const modelRoot = model.root as unknown as Object3D
modelRoot.traverse((child: Object3D) => {
  const mesh = child as Object3D & { isMesh?: boolean }
  if (!mesh.isMesh) return
  mesh.castShadow = true
  mesh.receiveShadow = true
})
scene.add(model.root as never)

const debugHandle = installDebugHandle({ camera, scene, model, groundMaterial })

function rigFromUrl(): RigName {
  const param = new URLSearchParams(window.location.search).get('rig')
  return param === 'landing' ? 'landing' : 'approach'
}
debugHandle.setRig(rigFromUrl())

window.addEventListener('keydown', (event) => {
  if (event.key === '1') debugHandle.setRig('approach')
  if (event.key === '2') debugHandle.setRig('landing')
})

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
