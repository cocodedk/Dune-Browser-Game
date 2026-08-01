// vehicle-shop/ornihopter/src/input/keyboard.ts
// Key state -> normalised FlightInput. Kept separate from the flight model so
// the model can be unit-tested without inventing a keyboard.

import type { FlightInput } from '../contracts'

export interface Controls {
  read(): FlightInput
  /** True on the frame a camera-cycle was requested. Consumed by the caller. */
  takeCameraCycle(): boolean
  takeReset(): boolean
  /** Where the pilot's head is turned, in degrees. Yaw positive to starboard. */
  head(): { yaw: number; pitch: number }
  dispose(): void
}

const THROTTLE_RATE = 0.55

export function createControls(target: EventTarget = window): Controls {
  const down = new Set<string>()
  let throttle = 0.45
  let cameraCycle = false
  let reset = false
  let last = performance.now()

  const onDown = (event: Event) => {
    const key = (event as KeyboardEvent).key.toLowerCase()
    down.add(key)
    if (key === 'c') cameraCycle = true
    if (key === 'r') reset = true
    // Arrow keys and space scroll the page otherwise.
    if (key.startsWith('arrow') || key === ' ') event.preventDefault()
  }
  const onUp = (event: Event) => down.delete((event as KeyboardEvent).key.toLowerCase())
  const onBlur = () => down.clear()

  // Head-look. Held right mouse button, or hold H and move the mouse — no
  // pointer lock, so a capture harness and a casual visitor both get at it
  // without a click to grab the cursor.
  const headAim = { yaw: 0, pitch: 0 }
  const onMove = (event: Event) => {
    const mouse = event as MouseEvent
    const looking = mouse.buttons === 2 || down.has('h')
    if (!looking) return
    headAim.yaw += mouse.movementX * 0.22
    headAim.pitch -= mouse.movementY * 0.22
  }
  const onContext = (event: Event) => event.preventDefault()

  target.addEventListener('keydown', onDown)
  target.addEventListener('keyup', onUp)
  target.addEventListener('blur', onBlur)
  target.addEventListener('mousemove', onMove)
  target.addEventListener('contextmenu', onContext)

  const axis = (negative: string[], positive: string[]): number => {
    const n = negative.some((k) => down.has(k)) ? 1 : 0
    const p = positive.some((k) => down.has(k)) ? 1 : 0
    return p - n
  }

  return {
    read(): FlightInput {
      const now = performance.now()
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now

      if (down.has('shift')) throttle += THROTTLE_RATE * dt
      if (down.has('control')) throttle -= THROTTLE_RATE * dt
      throttle = Math.min(1, Math.max(0, throttle))

      return {
        // W / ArrowUp pushes the nose DOWN, the aircraft convention: stick
        // forward, nose down. The correctness bar asserts the resulting
        // altitude change, so this sign is not a matter of taste.
        pitch: axis(['w', 'arrowup'], ['s', 'arrowdown']),
        roll: axis(['a', 'arrowleft'], ['d', 'arrowright']),
        yaw: axis(['q'], ['e']),
        throttle,
      }
    },
    takeCameraCycle() {
      const value = cameraCycle
      cameraCycle = false
      return value
    },
    takeReset() {
      const value = reset
      reset = false
      return value
    },
    head() {
      // Zero the head when nothing is holding it, so letting go recentres
      // rather than leaving the pilot permanently looking at their own wing.
      if (!down.has('h')) {
        headAim.yaw *= 0.86
        headAim.pitch *= 0.86
      }
      return headAim
    },
    dispose() {
      target.removeEventListener('keydown', onDown)
      target.removeEventListener('keyup', onUp)
      target.removeEventListener('blur', onBlur)
      target.removeEventListener('mousemove', onMove)
      target.removeEventListener('contextmenu', onContext)
    },
  }
}
