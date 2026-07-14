import Phaser from 'phaser';
import { GAME_CONFIG } from '../config';
import { SaveData, TileSaveData } from '../types';
import { SaveSystem } from '../systems/SaveSystem';
import { GrowthSystem } from '../systems/GrowthSystem';

export class GreenhouseScene extends Phaser.Scene {
  private saveData!: SaveData;
  private greenhouseGrid: TileSaveData[][] = [];
  private player!: Phaser.GameObjects.Rectangle;
  private tileGraphics: Phaser.GameObjects.Graphics[][] = [];

  constructor() { super({ key: 'GreenhouseScene' }); }

  init(data: { saveData: SaveData }): void {
    this.saveData = data.saveData;
    // Initialize greenhouse grid (8x6 planting area)
    this.greenhouseGrid = Array.from({ length: 8 }, () =>
      Array.from({ length: 6 }, () => ({
        state: 'empty' as const,
        wateredToday: true, // Auto-watered
        consecutiveWaterDays: 0,
      }))
    );
  }

  create(): void {
    this.createGreenhouseMap();
    this.createPlayer();
    this.setupInput();

    this.add.text(400, 20, '温室 — 不受季节限制，自动浇水', { fontSize: '14px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0);
    this.add.text(400, 40, 'ESC 返回农场', { fontSize: '12px', color: '#aaa' }).setOrigin(0.5).setScrollFactor(0);
  }

  private createGreenhouseMap(): void {
    const TILE = GAME_CONFIG.TILE_SIZE;

    // Greenhouse background
    const greenhouseBg = this.add.image(
      12 * TILE * 2 / 2,
      16 * TILE * 2 / 2,
      'greenhouse_sprites'
    );
    greenhouseBg.setDepth(-1);
    greenhouseBg.setDisplaySize(12 * TILE * 2, 16 * TILE * 2);

    const g = this.add.graphics();

    // Glass walls
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 12; c++) {
        if (r === 0 || r === 15 || c === 0 || c === 11) {
          g.fillStyle(0x88ccff, 0.5); // Glass
        } else {
          g.fillStyle(0x2d5a27); // Floor
        }
        g.fillRect(c * TILE * 2, r * TILE * 2, TILE * 2, TILE * 2);
      }
    }

    // Planting area (center)
    for (let r = 2; r < 10; r++) {
      for (let c = 2; c < 8; c++) {
        g.fillStyle(0x8b6914); // Dirt
        g.fillRect(c * TILE * 2, r * TILE * 2, TILE * 2, TILE * 2);
      }
    }

    this.physics.world.setBounds(0, 0, 12 * TILE * 2, 16 * TILE * 2);
  }

  private createPlayer(): void {
    const TILE = GAME_CONFIG.TILE_SIZE;
    this.player = this.add.rectangle(6 * TILE * 2, 12 * TILE * 2, TILE * 2, TILE * 2, 0x3366cc);
    this.player.setDepth(10);
    this.physics.add.existing(this.player);
    (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }

  private setupInput(): void {
    this.input.keyboard!.on('keydown-ESC', () => {
      SaveSystem.save(this.saveData);
      this.scene.start('FarmScene', { saveData: this.saveData });
    });
  }
}
