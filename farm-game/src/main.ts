import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { FarmScene } from './scenes/FarmScene';
import { UIScene } from './scenes/UIScene';
import { MineScene } from './scenes/MineScene';
import { PondScene } from './scenes/PondScene';
import { GreenhouseScene } from './scenes/GreenhouseScene';
import { GAME_CONFIG } from './config';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_CONFIG.CANVAS_WIDTH,
  height: GAME_CONFIG.CANVAS_HEIGHT,
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  backgroundColor: '#2d5a27',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [BootScene, FarmScene, UIScene, MineScene, PondScene, GreenhouseScene],
};

new Phaser.Game(config);
