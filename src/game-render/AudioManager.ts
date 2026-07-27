import { EventBus } from '../EventBus';

export class AudioManager {
  private scene: Phaser.Scene;
  private currentKey: string | null = null;
  private _isMuted = false;
  private _volume = 0.5;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    EventBus.on('audio:mute', () => this.toggleMute());
  }

  playAmbient(key: string): void {
    if (this.currentKey === key && this.scene.sound.getAllPlaying().length > 0) return;
    this.stopAmbient();
    try {
      this.scene.sound.play(key, { loop: true, volume: this._isMuted ? 0 : this._volume });
      this.currentKey = key;
    } catch {
      // Audio asset not loaded yet — fail silently
    }
    this.emitState();
  }

  stopAmbient(): void {
    if (this.currentKey) {
      try {
        this.scene.sound.stopByKey(this.currentKey);
      } catch {
        // Sound may not exist
      }
      this.currentKey = null;
    }
    this.emitState();
  }

  setVolume(vol: number): void {
    this._volume = Math.max(0, Math.min(1, vol));
    if (this.currentKey && !this._isMuted) {
      try {
        const sound = this.scene.sound.getAllPlaying().find(s => s.key === this.currentKey);
        if (sound) (sound as Phaser.Sound.WebAudioSound).setVolume(this._volume);
      } catch {
        // Sound may not exist
      }
    }
    this.emitState();
  }

  toggleMute(): void {
    this._isMuted = !this._isMuted;
    if (this.currentKey) {
      try {
        const sound = this.scene.sound.getAllPlaying().find(s => s.key === this.currentKey);
        if (sound) (sound as Phaser.Sound.WebAudioSound).setVolume(this._isMuted ? 0 : this._volume);
      } catch {
        // Sound may not exist
      }
    }
    this.emitState();
  }

  get isMuted(): boolean {
    return this._isMuted;
  }

  private emitState(): void {
    EventBus.emit('audio:changed', {
      isPlaying: this.currentKey !== null,
      isMuted: this._isMuted,
      volume: this._volume,
    });
  }
}