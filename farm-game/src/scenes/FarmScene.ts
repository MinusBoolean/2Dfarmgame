import Phaser from 'phaser';
import { GAME_CONFIG } from '../config';
import { SaveData, TileSaveData, ToolType, Weather, Season, InventoryItem } from '../types';
import { SaveSystem } from '../systems/SaveSystem';
import { InventorySystem } from '../systems/InventorySystem';
import { EnergySystem } from '../systems/EnergySystem';
import { GrowthSystem } from '../systems/GrowthSystem';
import { SeasonSystem } from '../systems/SeasonSystem';
import { WeatherSystem } from '../systems/WeatherSystem';
import { EconomySystem } from '../systems/EconomySystem';
import { AudioSystem } from '../systems/AudioSystem';
import { getCropById, getUnlockedCrops } from '../entities/CropConfig';

type Direction = 'up' | 'down' | 'left' | 'right';

export class FarmScene extends Phaser.Scene {
  private saveData!: SaveData;
  private inventory!: InventorySystem;
  private audio!: AudioSystem;

  private player!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  private facing: Direction = 'down';
  private selectedTool: ToolType = 'hoe';
  private selectedSeedIndex: number = 0;
  private isPaused: boolean = false;

  private dayTimer: number = 0;
  private isNight: boolean = false;
  private nightOverlay!: Phaser.GameObjects.Rectangle;

  private tileGraphics: Phaser.GameObjects.Graphics[][] = [];
  private baseMapGraphics!: Phaser.GameObjects.Graphics;

  private rainEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private snowEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;

  private messageText!: Phaser.GameObjects.Text;
  private messageTimer: number = 0;

  private hudTexts: Record<string, Phaser.GameObjects.Text> = {};

  constructor() {
    super({ key: 'FarmScene' });
  }

  create(): void {
    this.saveData = SaveSystem.load();
    this.inventory = new InventorySystem(this.saveData.inventory, this.saveData.inventorySize);
    this.audio = new AudioSystem(this, this.saveData.settings.musicVolume, this.saveData.settings.sfxVolume);

    this.createFarmGrid();
    this.createPlayer();
    this.createNightOverlay();
    this.createHud();
    this.createMessageText();
    this.setupInput();

    if (this.saveData.tomorrowWeather === 'sunny' && this.saveData.currentDay === 1 && this.saveData.currentSeason === 0) {
      this.saveData.tomorrowWeather = WeatherSystem.generateWeather(
        SeasonSystem.getSeason(this.saveData.currentSeason)
      );
    }

    this.physics.world.setBounds(0, 0,
      GAME_CONFIG.FARM_COLS * GAME_CONFIG.TILE_SIZE,
      GAME_CONFIG.FARM_ROWS * GAME_CONFIG.TILE_SIZE
    );

    this.renderAllTiles();
    this.emitAllEvents();

    this.events.on('shutdown', () => {
      this.rainEmitter?.destroy();
      this.snowEmitter?.destroy();
    });
  }

  update(_time: number, delta: number): void {
    this.handleMovement();
    this.updateTime(delta);
    this.updateWeatherEffects();
    this.updateMessage(delta);
    this.updateHud();
  }

  // ─── Farm Grid ──────────────────────────────────────────────

  private createFarmGrid(): void {
    const TILE = GAME_CONFIG.TILE_SIZE;
    this.baseMapGraphics = this.add.graphics();
    this.baseMapGraphics.setDepth(0);

    for (let row = 0; row < GAME_CONFIG.FARM_ROWS; row++) {
      for (let col = 0; col < GAME_CONFIG.FARM_COLS; col++) {
        const x = col * TILE;
        const y = row * TILE;
        let color = 0x4a8c3f;

        if (row >= 10 && row < 30 && col >= 10 && col < 35) {
          color = 0x8b6914;
        }
        if (row === 9 && col >= 10 && col <= 35) {
          color = 0x808080;
        }
        if (row >= 5 && row < 9 && col >= 3 && col < 8) {
          color = 0xa67c2e;
        }

        this.baseMapGraphics.fillStyle(color);
        this.baseMapGraphics.fillRect(x, y, TILE, TILE);
      }
    }

    // Grid lines
    this.baseMapGraphics.lineStyle(1, 0x000000, 0.08);
    for (let row = 0; row <= GAME_CONFIG.FARM_ROWS; row++) {
      this.baseMapGraphics.lineBetween(0, row * TILE, GAME_CONFIG.FARM_COLS * TILE, row * TILE);
    }
    for (let col = 0; col <= GAME_CONFIG.FARM_COLS; col++) {
      this.baseMapGraphics.lineBetween(col * TILE, 0, col * TILE, GAME_CONFIG.FARM_ROWS * TILE);
    }

    // Per-tile overlay graphics
    this.tileGraphics = [];
    for (let row = 0; row < GAME_CONFIG.FARM_ROWS; row++) {
      this.tileGraphics[row] = [];
      for (let col = 0; col < GAME_CONFIG.FARM_COLS; col++) {
        const g = this.add.graphics();
        g.setDepth(1);
        this.tileGraphics[row][col] = g;
      }
    }
  }

  private renderAllTiles(): void {
    for (let row = 0; row < GAME_CONFIG.FARM_ROWS; row++) {
      for (let col = 0; col < GAME_CONFIG.FARM_COLS; col++) {
        this.updateTileVisual(row, col);
      }
    }
  }

  private updateTileVisual(row: number, col: number): void {
    const tile = this.saveData.farmGrid[row]?.[col];
    const g = this.tileGraphics[row]?.[col];
    if (!tile || !g) return;

    const TILE = GAME_CONFIG.TILE_SIZE;
    const x = col * TILE;
    const y = row * TILE;

    g.clear();

    // Only draw overlays for non-empty tiles
    if (tile.state === 'empty') return;

    let bgColor: number;
    switch (tile.state) {
      case 'plowed': bgColor = 0x7a5a10; break;
      case 'planted':
      case 'growing': bgColor = tile.wateredToday ? 0x5a3a0a : 0x7a5a10; break;
      case 'mature': bgColor = 0x2d8a2d; break;
      case 'dead': bgColor = 0x606060; break;
      default: return;
    }

    g.fillStyle(bgColor, 0.7);
    g.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);

    // Draw crop indicator
    if (tile.cropId && (tile.state === 'planted' || tile.state === 'growing' || tile.state === 'mature')) {
      this.drawCropIndicator(g, x, y, tile);
    }

    // Dead marker
    if (tile.state === 'dead') {
      g.lineStyle(2, 0xff0000, 0.8);
      g.lineBetween(x + 2, y + 2, x + TILE - 2, y + TILE - 2);
      g.lineBetween(x + TILE - 2, y + 2, x + 2, y + TILE - 2);
    }
  }

  private drawCropIndicator(g: Phaser.GameObjects.Graphics, x: number, y: number, tile: TileSaveData): void {
    const TILE = GAME_CONFIG.TILE_SIZE;
    const cx = x + TILE / 2;
    const cy = y + TILE / 2;
    const crop = getCropById(tile.cropId || '');
    const cropColor = this.getCropColor(tile.cropId || '');

    switch (tile.state) {
      case 'planted':
        g.fillStyle(cropColor, 0.9);
        g.fillCircle(cx, cy + 2, 2);
        break;
      case 'growing':
        g.fillStyle(cropColor, 0.9);
        g.fillCircle(cx, cy, 3);
        g.lineStyle(1, 0x2d5a1a, 0.8);
        g.lineBetween(cx, cy + 3, cx, cy + TILE / 2 - 1);
        break;
      case 'mature':
        g.fillStyle(cropColor, 1);
        g.fillCircle(cx, cy - 1, 4);
        g.lineStyle(2, 0x2d5a1a, 0.9);
        g.lineBetween(cx, cy + 3, cx, cy + TILE / 2);
        // Quality glow
        if (tile.quality === 'gold' || tile.quality === 'iridium') {
          g.fillStyle(0xffd700, 0.3);
          g.fillCircle(cx, cy, 6);
        }
        break;
    }
  }

  private getCropColor(cropId: string): number {
    const colorMap: Record<string, number> = {
      carrot: 0xff8c00,
      wheat: 0xdaa520,
      tomato: 0xff4444,
      corn: 0xffd700,
      watermelon: 0x2e8b57,
      potato: 0xd2b48c,
      pumpkin: 0xff6600,
      strawberry: 0xff1493,
      blueberry: 0x4169e1,
      pepper: 0xff0000,
      eggplant: 0x6a0dad,
      spinach: 0x228b22,
    };
    return colorMap[cropId] || 0x88cc88;
  }

  // ─── Player ─────────────────────────────────────────────────

  private createPlayer(): void {
    const TILE = GAME_CONFIG.TILE_SIZE;
    this.player = this.add.rectangle(22 * TILE, 20 * TILE, TILE * 1.6, TILE * 1.6, 0x3366cc);
    this.player.setDepth(10);
    this.player.setStrokeStyle(2, 0x1a3366);

    this.physics.add.existing(this.player);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(TILE * 1.2, TILE * 1.2);

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0,
      GAME_CONFIG.FARM_COLS * TILE,
      GAME_CONFIG.FARM_ROWS * TILE
    );
  }

  // ─── Night Overlay ──────────────────────────────────────────

  private createNightOverlay(): void {
    const TILE = GAME_CONFIG.TILE_SIZE;
    this.nightOverlay = this.add.rectangle(
      (GAME_CONFIG.FARM_COLS * TILE) / 2,
      (GAME_CONFIG.FARM_ROWS * TILE) / 2,
      GAME_CONFIG.FARM_COLS * TILE,
      GAME_CONFIG.FARM_ROWS * TILE,
      0x000033
    );
    this.nightOverlay.setAlpha(0);
    this.nightOverlay.setDepth(50);
    this.nightOverlay.setScrollFactor(1);
  }

  // ─── HUD ────────────────────────────────────────────────────

  private createHud(): void {
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '13px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 3,
    };

    this.hudTexts.gold = this.add.text(10, 10, '', style).setDepth(200).setScrollFactor(0);
    this.hudTexts.energy = this.add.text(10, 28, '', style).setDepth(200).setScrollFactor(0);
    this.hudTexts.day = this.add.text(10, 46, '', style).setDepth(200).setScrollFactor(0);
    this.hudTexts.weather = this.add.text(10, 64, '', style).setDepth(200).setScrollFactor(0);
    this.hudTexts.tool = this.add.text(10, 82, '', style).setDepth(200).setScrollFactor(0);
  }

  private updateHud(): void {
    const s = this.saveData;
    const season = SeasonSystem.getSeason(s.currentSeason);
    this.hudTexts.gold.setText(`金币: ${s.gold}`);
    this.hudTexts.energy.setText(`体力: ${s.energy}/${s.maxEnergy}`);
    this.hudTexts.day.setText(`${SeasonSystem.getSeasonName(season)} 第${s.currentDay}天`);
    this.hudTexts.weather.setText(`天气: ${WeatherSystem.getWeatherName(s.currentWeather)}`);
    this.hudTexts.tool.setText(`工具: ${this.toolName(this.selectedTool)} [1/2/3]`);
  }

  private toolName(t: ToolType): string {
    const map: Record<ToolType, string> = { hoe: '锄头', wateringCan: '水壶', food: '食物' };
    return map[t];
  }

  // ─── Messages ───────────────────────────────────────────────

  private createMessageText(): void {
    this.messageText = this.add.text(
      GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT - 60, '',
      {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'sans-serif',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
      }
    ).setOrigin(0.5).setDepth(300).setScrollFactor(0).setAlpha(0);
  }

  private showMessage(msg: string): void {
    this.messageText.setText(msg);
    this.messageText.setAlpha(1);
    this.messageTimer = 2500;
  }

  private updateMessage(delta: number): void {
    if (this.messageTimer > 0) {
      this.messageTimer -= delta;
      if (this.messageTimer <= 500) {
        this.messageText.setAlpha(Math.max(0, this.messageTimer / 500));
      }
      if (this.messageTimer <= 0) {
        this.messageText.setAlpha(0);
      }
    }
  }

  // ─── Input ──────────────────────────────────────────────────

  private setupInput(): void {
    if (!this.input.keyboard) return;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard.addKey('W'),
      A: this.input.keyboard.addKey('A'),
      S: this.input.keyboard.addKey('S'),
      D: this.input.keyboard.addKey('D'),
    };

    this.input.keyboard.on('keydown-ONE', () => this.selectTool('hoe'));
    this.input.keyboard.on('keydown-TWO', () => this.selectTool('wateringCan'));
    this.input.keyboard.on('keydown-THREE', () => this.selectTool('food'));
    this.input.keyboard.on('keydown-SPACE', () => this.useTool());
    this.input.keyboard.on('keydown-B', () => this.toggleInventory());
    this.input.keyboard.on('keydown-E', () => this.toggleShop());
    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.input.keyboard.on('keydown-Q', () => this.cycleSeed());
    this.input.keyboard.on('keydown-H', () => this.tryHarvest());
  }

  private selectTool(tool: ToolType): void {
    if (this.isPaused) return;
    this.selectedTool = tool;
    this.audio.playSfx('sfx_click');
  }

  private cycleSeed(): void {
    if (this.isPaused) return;
    const seeds = this.inventory.getItems().filter(i => i.type === 'seed');
    if (seeds.length === 0) {
      this.showMessage('没有种子！');
      return;
    }
    this.selectedSeedIndex = (this.selectedSeedIndex + 1) % seeds.length;
    const seed = seeds[this.selectedSeedIndex];
    this.showMessage(`选择种子: ${seed.name}`);
  }

  private toggleInventory(): void {
    this.showMessage('背包: ' + this.inventory.getItems().map(i => `${i.name}x${i.quantity}`).join(', ') || '空');
  }

  private toggleShop(): void {
    if (this.isPaused) return;
    const season = SeasonSystem.getSeason(this.saveData.currentSeason);
    const unlocked = getUnlockedCrops(this.saveData.totalEarned);
    if (unlocked.length === 0) {
      this.showMessage('没有可购买的种子');
      return;
    }
    // Buy first available seed for the current season
    const available = unlocked.filter(c => c.seasons.includes(season));
    if (available.length === 0) {
      this.showMessage('当季没有可种植的种子');
      return;
    }
    const crop = available[0];
    if (EconomySystem.buySeed(this.saveData, this.inventory, crop.id)) {
      this.showMessage(`购买了 ${crop.name}种子 (-${crop.seedPrice}金币)`);
      this.audio.playSfx('sfx_coin');
      this.emitEvent('gold-changed', this.saveData.gold);
      SaveSystem.save(this.saveData);
    } else {
      this.showMessage('金币不足或背包已满！');
    }
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.showMessage('暂停中 (P继续)');
    }
  }

  // ─── Movement ───────────────────────────────────────────────

  private handleMovement(): void {
    if (this.isPaused) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const speed = GAME_CONFIG.PLAYER_SPEED * WeatherSystem.affectsMovement(this.saveData.currentWeather);

    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.wasd.A.isDown) { vx = -speed; this.facing = 'left'; }
    else if (this.cursors.right.isDown || this.wasd.D.isDown) { vx = speed; this.facing = 'right'; }

    if (this.cursors.up.isDown || this.wasd.W.isDown) { vy = -speed; this.facing = 'up'; }
    else if (this.cursors.down.isDown || this.wasd.S.isDown) { vy = speed; this.facing = 'down'; }

    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    body.setVelocity(vx, vy);
  }

  // ─── Farming ────────────────────────────────────────────────

  private getFacingTile(): { row: number; col: number } {
    const px = this.player.x;
    const py = this.player.y;
    const TILE = GAME_CONFIG.TILE_SIZE;

    let tx = px;
    let ty = py;
    switch (this.facing) {
      case 'up': ty -= TILE * 1.5; break;
      case 'down': ty += TILE * 1.5; break;
      case 'left': tx -= TILE * 1.5; break;
      case 'right': tx += TILE * 1.5; break;
    }

    return {
      row: Math.floor(ty / TILE),
      col: Math.floor(tx / TILE),
    };
  }

  private useTool(): void {
    if (this.isPaused) return;
    const { row, col } = this.getFacingTile();
    if (row < 0 || row >= GAME_CONFIG.FARM_ROWS || col < 0 || col >= GAME_CONFIG.FARM_COLS) return;

    const tile = this.saveData.farmGrid[row][col];

    switch (this.selectedTool) {
      case 'hoe':
        this.plowTile(tile, row, col);
        break;
      case 'wateringCan':
        this.waterTile(tile, row, col);
        break;
      case 'food':
        this.eatFood();
        break;
    }

    this.emitEvent('energy-changed', this.saveData.energy);
    SaveSystem.save(this.saveData);
  }

  private plowTile(tile: TileSaveData, row: number, col: number): void {
    if (tile.state !== 'empty') {
      // If plowed, try to plant
      if (tile.state === 'plowed') {
        this.plantCrop(tile, row, col);
        return;
      }
      return;
    }

    const cost = EnergySystem.getActionCost('PLOW', this.saveData.toolLevels.hoe);
    if (!EnergySystem.canPerform(this.saveData.energy, cost)) {
      this.showMessage('体力不足！');
      return;
    }

    tile.state = 'plowed';
    this.saveData.energy = EnergySystem.consume(this.saveData.energy, cost);
    this.updateTileVisual(row, col);
    this.showParticles(row, col, 'dirt');
    this.cameras.main.shake(80, 0.002);
    this.audio.playSfx('sfx_plow');
  }

  private plantCrop(tile: TileSaveData, row: number, col: number): void {
    const seeds = this.inventory.getItems().filter(i => i.type === 'seed');
    if (seeds.length === 0) {
      this.showMessage('没有种子！按E购买');
      return;
    }

    // Use currently selected seed, or first available
    const seedIdx = Math.min(this.selectedSeedIndex, seeds.length - 1);
    const seed = seeds[seedIdx];
    const cropId = seed.cropId;
    if (!cropId) return;

    const crop = getCropById(cropId);
    if (!crop) return;

    const season = SeasonSystem.getSeason(this.saveData.currentSeason);
    if (!crop.seasons.includes(season)) {
      this.showMessage(`${crop.name}不能在${SeasonSystem.getSeasonName(season)}种植！`);
      return;
    }

    const cost = EnergySystem.getActionCost('PLANT', this.saveData.toolLevels.hoe);
    if (!EnergySystem.canPerform(this.saveData.energy, cost)) {
      this.showMessage('体力不足！');
      return;
    }

    if (!this.inventory.removeItem(seed.id, 1)) return;

    tile.state = 'planted';
    tile.cropId = cropId;
    tile.plantTime = Date.now();
    tile.wateredToday = false;
    tile.consecutiveWaterDays = 0;

    this.saveData.energy = EnergySystem.consume(this.saveData.energy, cost);
    this.updateTileVisual(row, col);
    this.showParticles(row, col, 'dirt');
    this.audio.playSfx('sfx_plant');
    this.showMessage(`种下了 ${crop.name}`);
  }

  private waterTile(tile: TileSaveData, row: number, col: number): void {
    if (tile.state !== 'planted' && tile.state !== 'growing') return;
    if (tile.wateredToday) {
      this.showMessage('今天已经浇过水了');
      return;
    }

    const cost = EnergySystem.getActionCost('WATER', this.saveData.toolLevels.wateringCan);
    if (!EnergySystem.canPerform(this.saveData.energy, cost)) {
      this.showMessage('体力不足！');
      return;
    }

    tile.wateredToday = true;
    this.saveData.energy = EnergySystem.consume(this.saveData.energy, cost);
    this.updateTileVisual(row, col);
    this.showParticles(row, col, 'water');
    this.audio.playSfx('sfx_water');
  }

  private tryHarvest(): void {
    if (this.isPaused) return;
    const { row, col } = this.getFacingTile();
    if (row < 0 || row >= GAME_CONFIG.FARM_ROWS || col < 0 || col >= GAME_CONFIG.FARM_COLS) return;

    const tile = this.saveData.farmGrid[row][col];
    if (tile.state !== 'mature' || !tile.cropId) return;

    const crop = getCropById(tile.cropId);
    if (!crop) return;

    const cost = EnergySystem.getActionCost('HARVEST', this.saveData.toolLevels.hoe);
    if (!EnergySystem.canPerform(this.saveData.energy, cost)) {
      this.showMessage('体力不足！');
      return;
    }

    const quality = tile.quality || 'normal';
    const cropItem: InventoryItem = {
      id: `crop_${tile.cropId}`,
      name: crop.name,
      type: 'crop',
      quantity: 1,
      quality,
      cropId: tile.cropId,
    };

    if (!this.inventory.addItem(cropItem)) {
      this.showMessage('背包已满！');
      return;
    }

    this.saveData.energy = EnergySystem.consume(this.saveData.energy, cost);
    this.saveData.totalHarvested++;

    tile.state = 'plowed';
    tile.cropId = undefined;
    tile.plantTime = undefined;
    tile.quality = undefined;

    this.updateTileVisual(row, col);
    this.showParticles(row, col, 'gold');
    this.cameras.main.shake(100, 0.004);
    this.audio.playSfx('sfx_harvest');
    this.showMessage(`收获了 ${crop.name}${quality !== 'normal' ? ` (${quality})` : ''}！`);

    this.emitEvent('energy-changed', this.saveData.energy);
    SaveSystem.save(this.saveData);
  }

  private eatFood(): void {
    const food = this.inventory.getItems().find(i => i.type === 'food');
    if (!food) {
      this.showMessage('没有食物！按E购买面包');
      return;
    }

    this.inventory.removeItem(food.id, 1);
    this.saveData.energy = EnergySystem.restore(this.saveData.energy, 30);
    this.showMessage(`吃了 ${food.name} (+30体力)`);
    this.audio.playSfx('sfx_click');
  }

  // ─── Particles ──────────────────────────────────────────────

  private showParticles(row: number, col: number, type: 'dirt' | 'water' | 'gold'): void {
    const TILE = GAME_CONFIG.TILE_SIZE;
    const x = col * TILE + TILE / 2;
    const y = row * TILE + TILE / 2;

    const textureMap: Record<string, string> = {
      dirt: 'particle_dirt',
      water: 'particle_water',
      gold: 'particle_gold',
    };

    const texture = textureMap[type] || 'particle_dirt';

    try {
      const emitter = this.add.particles(x, y, texture, {
        speed: { min: 20, max: 60 },
        angle: { min: 0, max: 360 },
        lifespan: 500,
        quantity: 6,
        scale: { start: 1, end: 0.3 },
        alpha: { start: 1, end: 0 },
        emitting: false,
      });
      emitter.setDepth(15);
      emitter.explode(6);
      this.time.delayedCall(600, () => emitter.destroy());
    } catch {
      // Particles may fail silently
    }
  }

  // ─── Time System ────────────────────────────────────────────

  private updateTime(delta: number): void {
    if (this.isPaused) return;

    this.dayTimer += delta * this.saveData.settings.timeSpeed;

    const dayPortion = this.dayTimer % GAME_CONFIG.DAY_DURATION;
    this.isNight = dayPortion >= GAME_CONFIG.DAY_PORTION;

    if (this.isNight) {
      this.nightOverlay.setAlpha(0.35);
    } else {
      this.nightOverlay.setAlpha(0);
    }

    if (this.dayTimer >= GAME_CONFIG.DAY_DURATION) {
      this.dayTimer = 0;
      this.advanceDay();
    }
  }

  private advanceDay(): void {
    const result = SeasonSystem.advanceDay(this.saveData.currentSeason, this.saveData.currentDay);
    this.saveData.currentSeason = result.season;
    this.saveData.currentDay = result.day;

    const season = SeasonSystem.getSeason(result.season);

    this.saveData.currentWeather = this.saveData.tomorrowWeather;
    this.saveData.tomorrowWeather = WeatherSystem.generateWeather(season);

    GrowthSystem.resetDayTiles(this.saveData.farmGrid, this.saveData.currentWeather);
    for (let row = 0; row < GAME_CONFIG.FARM_ROWS; row++) {
      for (let col = 0; col < GAME_CONFIG.FARM_COLS; col++) {
        const tile = this.saveData.farmGrid[row][col];
        GrowthSystem.processDay(tile, season);
        GrowthSystem.advanceGrowth(tile, 1);
        this.updateTileVisual(row, col);
      }
    }

    this.saveData.energy = this.saveData.maxEnergy;

    this.settleShippingBin();
    this.checkCrows();

    if (result.seasonChanged) {
      this.audio.playSfx('sfx_season');
      this.showMessage(`季节变更为 ${SeasonSystem.getSeasonName(season)}！`);
      this.emitEvent('season-changed', season);
    }

    this.showMessage(`${SeasonSystem.getSeasonName(season)} 第${result.day}天 - ${WeatherSystem.getWeatherName(this.saveData.currentWeather)}`);

    this.emitEvent('day-changed', result.day, season);
    this.emitEvent('weather-changed', this.saveData.currentWeather);
    this.emitEvent('energy-changed', this.saveData.energy);
    SaveSystem.save(this.saveData);
  }

  private settleShippingBin(): void {
    for (const item of this.saveData.shippingBin) {
      if (item.type === 'crop' && item.cropId) {
        const crop = getCropById(item.cropId);
        if (crop) {
          const qualityMap: Record<string, number> = { normal: 1, silver: 1.25, gold: 1.5, iridium: 2 };
          const mult = qualityMap[item.quality || 'normal'] || 1;
          const price = Math.floor(crop.sellPrice * mult) * item.quantity;
          this.saveData.gold += price;
          this.saveData.totalEarned += price;
        }
      }
    }
    this.saveData.shippingBin = [];
    this.emitEvent('gold-changed', this.saveData.gold);
  }

  // ─── Weather Effects ────────────────────────────────────────

  private updateWeatherEffects(): void {
    const weather = this.saveData.currentWeather;

    if (weather === 'rainy' || weather === 'stormy') {
      if (!this.rainEmitter) {
        try {
          this.rainEmitter = this.add.particles(0, 0, 'particle_water', {
            x: { min: this.cameras.main.scrollX, max: this.cameras.main.scrollX + GAME_CONFIG.CANVAS_WIDTH },
            y: this.cameras.main.scrollY - 10,
            speedY: { min: 200, max: 400 },
            speedX: { min: -20, max: 20 },
            lifespan: 1000,
            quantity: 3,
            frequency: 50,
            scale: { start: 0.5, end: 0.2 },
            alpha: { start: 0.6, end: 0 },
          });
          this.rainEmitter.setDepth(100);
        } catch { /* particle texture missing */ }
      }
      if (this.rainEmitter) {
        this.rainEmitter.setPosition(
          this.cameras.main.scrollX,
          this.cameras.main.scrollY - 10
        );
        (this.rainEmitter as any).ops?.x?.setMin?.(this.cameras.main.scrollX);
        (this.rainEmitter as any).ops?.x?.setMax?.(this.cameras.main.scrollX + GAME_CONFIG.CANVAS_WIDTH);
      }
    } else {
      if (this.rainEmitter) {
        this.rainEmitter.destroy();
        this.rainEmitter = undefined;
      }
    }

    if (weather === 'snowy') {
      if (!this.snowEmitter) {
        try {
          this.snowEmitter = this.add.particles(0, 0, 'particle_snow', {
            x: { min: this.cameras.main.scrollX, max: this.cameras.main.scrollX + GAME_CONFIG.CANVAS_WIDTH },
            y: this.cameras.main.scrollY - 10,
            speedY: { min: 30, max: 80 },
            speedX: { min: -30, max: 30 },
            lifespan: 3000,
            quantity: 1,
            frequency: 100,
            scale: { start: 1, end: 0.5 },
            alpha: { start: 0.8, end: 0 },
          });
          this.snowEmitter.setDepth(100);
        } catch { /* particle texture missing */ }
      }
    } else {
      if (this.snowEmitter) {
        this.snowEmitter.destroy();
        this.snowEmitter = undefined;
      }
    }
  }

  // ─── Scarecrow ──────────────────────────────────────────────

  private isProtectedByScarecrow(row: number, col: number): boolean {
    const R = GAME_CONFIG.SCARECROW_RADIUS;
    for (let dr = -R; dr <= R; dr++) {
      for (let dc = -R; dc <= R; dc++) {
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || r >= GAME_CONFIG.FARM_ROWS || c < 0 || c >= GAME_CONFIG.FARM_COLS) continue;
        const t = this.saveData.farmGrid[r][c];
        // Check if there's a scarecrow item on this tile (stored as a special cropId)
        if (t.cropId === 'scarecrow') return true;
      }
    }
    return false;
  }

  private checkCrows(): void {
    if (Math.random() >= GAME_CONFIG.CROW_CHANCE) return;

    const unprotected: { row: number; col: number }[] = [];
    for (let row = 0; row < GAME_CONFIG.FARM_ROWS; row++) {
      for (let col = 0; col < GAME_CONFIG.FARM_COLS; col++) {
        const tile = this.saveData.farmGrid[row][col];
        if (tile.state === 'planted' || tile.state === 'growing') {
          if (!this.isProtectedByScarecrow(row, col)) {
            unprotected.push({ row, col });
          }
        }
      }
    }

    if (unprotected.length > 0) {
      const target = unprotected[Math.floor(Math.random() * unprotected.length)];
      const tile = this.saveData.farmGrid[target.row][target.col];
      tile.state = 'plowed';
      tile.cropId = undefined;
      tile.plantTime = undefined;
      tile.quality = undefined;
      this.updateTileVisual(target.row, target.col);
      this.showMessage('乌鸦偷吃了一棵作物！');
    }
  }

  // ─── Events ─────────────────────────────────────────────────

  private emitEvent(event: string, ...args: unknown[]): void {
    this.events.emit(event, ...args);
  }

  private emitAllEvents(): void {
    const s = this.saveData;
    const season = SeasonSystem.getSeason(s.currentSeason);
    this.emitEvent('gold-changed', s.gold);
    this.emitEvent('day-changed', s.currentDay, season);
    this.emitEvent('weather-changed', s.currentWeather);
    this.emitEvent('energy-changed', s.energy);
    this.emitEvent('season-changed', season);
  }
}
