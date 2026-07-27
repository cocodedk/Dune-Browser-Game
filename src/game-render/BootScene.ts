import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // PoC: no external assets — using programmatic graphics
    // Uncomment when ambient audio asset is available:
    // this.load.audio('ambient_desert', 'assets/audio/ambient_desert.ogg');
    // Generate loading text
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    this.add.text(width / 2, height / 2, 'Loading Arrakis...', {
      fontFamily: 'system-ui',
      fontSize: '18px',
      color: '#d4a017',
    }).setOrigin(0.5);
  }

  create(): void {
    this.scene.start('GameScene');
  }
}
