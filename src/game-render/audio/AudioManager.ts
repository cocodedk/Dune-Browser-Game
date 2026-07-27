// src/game-render/audio/AudioManager.ts
// Raw WebAudio ambient loop. Replaces the Phaser sound version; the EventBus
// contract (audio:changed, audio:mute) is unchanged, so StatusBar needs no edit.
//
// Browsers refuse to start an AudioContext without a user gesture. Rather than
// throwing or logging on every load, this stays silent and resumes on the
// player's first interaction.

import { EventBus } from '../../EventBus'

const ASSET_BASE = 'assets/audio'

export class AudioManager {
  private context: AudioContext | null = null
  private gain: GainNode | null = null
  private source: AudioBufferSourceNode | null = null
  private buffers = new Map<string, AudioBuffer>()
  private currentKey: string | null = null
  private pendingKey: string | null = null
  private _isMuted = false
  private _volume = 0.5
  private unlockBound: (() => void) | null = null

  constructor() {
    EventBus.on('audio:mute', this.toggleMute)
    this.installUnlockHandler()
  }

  /** Start (or queue) an ambient loop by asset key. */
  playAmbient = (key: string): void => {
    this.pendingKey = key
    void this.tryPlay(key)
  }

  stopAmbient = (): void => {
    if (this.source) {
      try {
        this.source.stop()
      } catch {
        // Already stopped — nothing to do.
      }
      this.source.disconnect()
      this.source = null
    }
    this.currentKey = null
    this.emitState()
  }

  setVolume = (volume: number): void => {
    this._volume = Math.max(0, Math.min(1, volume))
    this.applyGain()
    this.emitState()
  }

  toggleMute = (): void => {
    this._isMuted = !this._isMuted
    this.applyGain()
    this.emitState()
  }

  get isMuted(): boolean {
    return this._isMuted
  }

  dispose = (): void => {
    EventBus.off('audio:mute', this.toggleMute)
    this.removeUnlockHandler()
    this.stopAmbient()
    void this.context?.close().catch(() => undefined)
    this.context = null
    this.gain = null
    this.buffers.clear()
  }

  // -------------------------------------------------------------------------

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context
    const Ctor = window.AudioContext ?? (window as unknown as {
      webkitAudioContext?: typeof AudioContext
    }).webkitAudioContext
    if (!Ctor) return null

    this.context = new Ctor()
    this.gain = this.context.createGain()
    this.gain.connect(this.context.destination)
    this.applyGain()
    return this.context
  }

  private applyGain(): void {
    if (!this.gain || !this.context) return
    const target = this._isMuted ? 0 : this._volume
    this.gain.gain.setTargetAtTime(target, this.context.currentTime, 0.05)
  }

  private async tryPlay(key: string): Promise<void> {
    const context = this.ensureContext()
    if (!context) return

    // Blocked until a gesture; the unlock handler retries.
    if (context.state === 'suspended') return

    let buffer = this.buffers.get(key)
    if (!buffer) {
      try {
        const response = await fetch(`${ASSET_BASE}/${key}.ogg`)
        if (!response.ok) return // Asset not authored yet — stay silent.
        buffer = await context.decodeAudioData(await response.arrayBuffer())
        this.buffers.set(key, buffer)
      } catch {
        return // Missing or undecodable audio must never break the game.
      }
    }

    if (this.currentKey === key && this.source) return
    this.stopAmbient()

    const source = context.createBufferSource()
    source.buffer = buffer
    source.loop = true
    source.connect(this.gain!)
    source.start()

    this.source = source
    this.currentKey = key
    this.emitState()
  }

  private installUnlockHandler(): void {
    if (typeof window === 'undefined') return
    this.unlockBound = () => {
      const context = this.ensureContext()
      void context?.resume().then(() => {
        if (this.pendingKey) void this.tryPlay(this.pendingKey)
      }).catch(() => undefined)
      this.removeUnlockHandler()
    }
    window.addEventListener('pointerdown', this.unlockBound, { once: true })
    window.addEventListener('keydown', this.unlockBound, { once: true })
  }

  private removeUnlockHandler(): void {
    if (!this.unlockBound) return
    window.removeEventListener('pointerdown', this.unlockBound)
    window.removeEventListener('keydown', this.unlockBound)
    this.unlockBound = null
  }

  private emitState(): void {
    EventBus.emit('audio:changed', {
      isPlaying: this.currentKey !== null,
      isMuted: this._isMuted,
      volume: this._volume,
    })
  }
}
