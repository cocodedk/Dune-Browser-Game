// src/game-render/modes/conversation/ConversationMode.ts
// The conversation view: a character card framed against a dimmed desert.
//
// Conversations are the interface to every other system in this game, so this
// mode carries more of the player's time than any other. It keeps the world
// visible behind the speaker rather than cutting to a black screen — you are
// standing somewhere, talking to someone, not reading a dialog box.

import {
  Scene, OrthographicCamera, PerspectiveCamera, Mesh, PlaneGeometry,
  MeshBasicMaterial, Color, Group,
} from 'three'
import type { SceneModeId, WorldState } from '../../../types'
import type { SceneMode } from '../../core/ModeManager'
import { createCharacterCard } from './CharacterCard'
import { INITIAL_CHARACTERS } from '../../../data/characters'
import { currentNode } from '../../../game-engine/DialogueSystem'
import { speakerCharacter } from '../../../game-engine/dialogue/speakerCharacter'
import { fitOrtho } from '../../core/orthoFit'

const CARD_PLANE_WIDTH = 1400
const CARD_PLANE_HEIGHT = 900
/** Card centre above the middle of the frame, in view units. */
const CARD_LIFT = 120

/** Who is speaking at this location, if anyone. */
function speakerAt(world: WorldState): { name: string; role: string; id: string } {
  // Match the current dialogue node's named speaker first — location-only
  // resolution shows the wrong figure the moment two named characters share
  // a location (Duke Leto rendered behind Thufir's own ledger talk). Same
  // rule the 2D portrait uses: game-engine/dialogue/speakerCharacter.ts.
  const node = currentNode()
  const character = speakerCharacter(
    INITIAL_CHARACTERS, node?.speaker ?? '', world.player.location,
  )
  if (character) return { name: character.name, role: character.role, id: character.id }

  // A location with no named resident still gets a speaker, so the player is
  // never left facing an empty card with no explanation.
  const place = world.villages.find(v => v.id === world.player.location)
  return { name: place?.name ?? 'A voice', role: 'of this place', id: '' }
}

export function createConversationMode(
  camera: PerspectiveCamera,
  canvas?: HTMLElement,
): SceneMode {
  const scene = new Scene()

  // Orthographic framing: the card must sit at a fixed size on screen
  // regardless of where the strategic camera happened to be.
  const view = new OrthographicCamera(
    -CARD_PLANE_WIDTH / 2, CARD_PLANE_WIDTH / 2,
    CARD_PLANE_HEIGHT / 2, -CARD_PLANE_HEIGHT / 2,
    -1000, 1000,
  )
  view.position.z = 10

  const root = new Group()
  scene.add(root)

  // Dimming scrim, so the text layer over the top stays readable against
  // whatever the desert is doing behind it.
  const scrimGeometry = new PlaneGeometry(CARD_PLANE_WIDTH * 2, CARD_PLANE_HEIGHT * 2)
  const scrimMaterial = new MeshBasicMaterial({
    // Measured: the card renders at its authored colour (196,141,81). The
    // view read as black because the scrim rendered the surrounding 80% of
    // the frame at (13,8,4), and against that contrast a bright card looks
    // dark. Lifting the scrim fixes the composition; the card never needed
    // touching.
    color: new Color('#2a1d12'),
    transparent: true,
    opacity: 0.42,
    depthTest: false,
  })
  const scrim = new Mesh(scrimGeometry, scrimMaterial)
  scrim.renderOrder = 40
  root.add(scrim)

  // The conversation frustum was fixed at 1400x900 and never resized either,
  // so the card and its scrim drifted out of frame on any window that was not
  // that shape.
  let fitKey = ''
  function refit(): void {
    const width = canvas?.clientWidth || CARD_PLANE_WIDTH
    const height = canvas?.clientHeight || CARD_PLANE_HEIGHT
    const key = `${width}x${height}`
    if (key === fitKey) return
    fitKey = key

    const fit = fitOrtho(CARD_PLANE_WIDTH, CARD_PLANE_HEIGHT, width, height)
    view.left = -fit.viewWidth / 2
    view.right = fit.viewWidth / 2
    view.top = fit.viewHeight / 2
    view.bottom = -fit.viewHeight / 2
    view.updateProjectionMatrix()
    scrim.scale.setScalar(Math.max(1, fit.coverScale))
  }

  let card: ReturnType<typeof createCharacterCard> | null = null
  let currentName = ''
  let elapsedMs = 0

  function ensureCard(world: WorldState): void {
    const speaker = speakerAt(world)
    if (card && speaker.name === currentName) return

    // Rebuild only when the speaker actually changes — redrawing a canvas
    // texture every frame would be a needless GPU upload.
    card?.dispose()
    if (card) root.remove(card.group)

    // Lifted clear of the dialogue box, which owns the lower third of the frame.
    card = createCharacterCard(speaker.name, speaker.role, speaker.id, CARD_LIFT)
    currentName = speaker.name
    root.add(card.group)
  }

  return {
    id: 'conversation' as SceneModeId,
    scene,
    update(deltaMs: number, world: WorldState): void {
      elapsedMs += deltaMs
      refit()
      ensureCard(world)
      card?.update(elapsedMs)

      // Keep the shared perspective camera in step so returning to another
      // mode does not inherit a stale projection.
      camera.updateProjectionMatrix()
    },
    /** The card itself is not a pick target; choices are React buttons. */
    dispose(): void {
      card?.dispose()
      if (card) root.remove(card.group)
      scrimGeometry.dispose()
      scrimMaterial.dispose()
      scene.remove(root)
    },
    // Drawn with orthographic framing rather than the shared camera.
    camera: view,
  }
}
