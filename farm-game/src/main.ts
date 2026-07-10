import Phaser from 'phaser';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: document.body,
  backgroundColor: '#5c94fc',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: {
    create() {
      this.add.text(400, 300, 'Farm Game', { fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
    }
  }
};

new Phaser.Game(config);
