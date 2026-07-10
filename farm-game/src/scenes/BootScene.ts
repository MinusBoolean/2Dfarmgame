import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.rectangle(width / 2, height / 2, 300, 20, 0x333333);
    const progressFill = this.add.rectangle(width / 2 - 148, height / 2, 0, 16, 0x4488ff).setOrigin(0, 0.5);
    const loadingText = this.add.text(width / 2, height / 2 - 40, '加载中...', {
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressFill.width = 296 * value;
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressFill.destroy();
      loadingText.destroy();
    });
  }

  create(): void {
    this.scene.start('FarmScene');
  }
}
