// vehicle-shop/harvester/src/input/keyboard.ts
// Key state -> normalised CrawlerInput. Kept separate from the crawler model
// so the model can be unit-tested without inventing a keyboard.

import type { CrawlerInput } from '../contracts'

export interface Controls {
  read(): CrawlerInput
  /** True on the frame a camera-cycle was requested. Consumed by the caller. */
  takeCameraCycle(): boolean
  takeReset(): boolean
  dispose(): void
}

export function createControls(target: EventTarget = window): Controls {
  const down = new Set<string>()
  let cameraCycle = false
  let reset = false

  const onDown = (event: Event) => {
    const key = (event as KeyboardEvent).key.toLowerCase()
    down.add(key)
    if (key === 'c') cameraCycle = true
    if (key === 'r') reset = true
    if (key.startsWith('arrow') || key === ' ') event.preventDefault()
  }
  const onUp = (event: Event) => down.delete((event as KeyboardEvent).key.toLowerCase())
  const onBlur = () => down.clear()

  target.addEventListener('keydown', onDown)
  target.addEventListener('keyup', onUp)
  target.addEventListener('blur', onBlur)

  const axis = (negative: string[], positive: string[]): number => {
    const n = negative.some((k) => down.has(k)) ? 1 : 0
    const p = positive.some((k) => down.has(k)) ? 1 : 0
    return p - n
  }

  return {
    read(): CrawlerInput {
      return {
        throttle: axis(['s', 'arrowdown'], ['w', 'arrowup']),
        steer: axis(['a', 'arrowleft'], ['d', 'arrowright']),
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
    dispose() {
      target.removeEventListener('keydown', onDown)
      target.removeEventListener('keyup', onUp)
      target.removeEventListener('blur', onBlur)
    },
  }
}
