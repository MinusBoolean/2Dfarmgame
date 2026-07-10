import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  preload(): void {
    const { width, height } = this.scale;
    const barW = 300, barH = 20;
    const barX = (width - barW) / 2, barY = height / 2;

    this.add.rectangle(width / 2, height / 2, barW + 4, barH + 4, 0x333333);
    const bar = this.add.rectangle(barX + 2, barY + 2, 0, barH - 4, 0x4a8c3f).setOrigin(0, 0);
    const text = this.add.text(width / 2, barY - 20, '加载中...', { fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);

    this.load.on('progress', (v: number) => {
      bar.width = (barW - 4) * v;
      text.setText(`加载中... ${Math.floor(v * 100)}%`);
    });

    this.load.on('complete', () => {
      text.setText('点击开始');
      this.input.once('pointerdown', () => this.startGame());
      this.input.keyboard?.once('keydown', () => this.startGame());
    });

    // Player sprites
    this.load.image('player_sheet', 'assets/sprites/player_sheet.png');
    
    // Crops
    this.load.image('crops_sheet', 'assets/sprites/crops_sheet.png');
    
    // Tileset
    this.load.image('farm_tiles', 'assets/tilesets/farm_tiles.png');
    
    // Decorations
    this.load.image('decorations', 'assets/sprites/decorations.png');
    
    // UI
    this.load.image('ui_elements', 'assets/sprites/ui_elements.png');
    
    // Items
    this.load.image('items', 'assets/sprites/items.png');

    // Audio (optional - don't fail if missing)
    try {
      this.load.audio('bgm_day', ['assets/audio/bgm/farm_day.mp3']);
      this.load.audio('bgm_night', ['assets/audio/bgm/farm_night.mp3']);
      this.load.audio('sfx_plow', ['assets/audio/sfx/plow.mp3']);
      this.load.audio('sfx_plant', ['assets/audio/sfx/plant.mp3']);
      this.load.audio('sfx_water', ['assets/audio/sfx/water.mp3']);
      this.load.audio('sfx_harvest', ['assets/audio/sfx/harvest.mp3']);
      this.load.audio('sfx_coin', ['assets/audio/sfx/coin.mp3']);
      this.load.audio('sfx_click', ['assets/audio/sfx/click.mp3']);
      this.load.audio('sfx_rain', ['assets/audio/sfx/rain.mp3']);
      this.load.audio('sfx_season', ['assets/audio/sfx/season.mp3']);
    } catch {
      // Audio files may not exist yet
    }
  }

  create(): void {
    this.createPlayerAnimations();
    this.createParticleTextures();
  }

  private startGame(): void {
    this.scene.start('FarmScene');
    this.scene.launch('UIScene');
  }

  private createPlayerAnimations(): void {
    // For now, use the single player_sheet image
    // Later we can split into per-direction sheets
    // The sprite sheet has 4 frames horizontally
    this.anims.create({
      key: 'walk_down',
      frames: this.anims.generateFrameNumbers('player_sheet', { start: 0, end: 0 }),
      frameRate: 1,
      repeat: -1,
    });
  }

  private createParticleTextures(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffd700); g.fillCircle(4, 4, 3); g.generateTexture('particle_gold', 8, 8); g.clear();
    g.fillStyle(0x6b8fd6); g.fillCircle(4, 4, 3); g.generateTexture('particle_water', 8, 8); g.clear();
    g.fillStyle(0xa67c2e); g.fillRect(1, 1, 6, 6); g.generateTexture('particle_dirt', 8, 8); g.clear();
    g.fillStyle(0xffffff); g.fillCircle(4, 4, 2); g.generateTexture('particle_snow', 8, 8); g.clear();
    g.fillStyle(0xff6666); g.fillCircle(4, 4, 2); g.generateTexture('particle_red', 8, 8); g.clear();
    g.destroy();
  }
}
