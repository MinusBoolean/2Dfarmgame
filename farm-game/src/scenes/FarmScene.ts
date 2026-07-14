import Phaser from 'phaser';
import { GAME_CONFIG } from '../config';
import { SaveData, TileSaveData, ToolType, Weather, Season, InventoryItem, PathType } from '../types';
import { SaveSystem } from '../systems/SaveSystem';
import { ShippingBinSystem } from '../systems/ShippingBinSystem';
import { InventorySystem } from '../systems/InventorySystem';
import { EnergySystem } from '../systems/EnergySystem';
import { GrowthSystem } from '../systems/GrowthSystem';
import { SeasonSystem } from '../systems/SeasonSystem';
import { WeatherSystem } from '../systems/WeatherSystem';
import { EconomySystem } from '../systems/EconomySystem';
import { AudioSystem } from '../systems/AudioSystem';
import { RatingSystem } from '../systems/RatingSystem';
import { TutorialSystem } from '../systems/TutorialSystem';
import { DailySummary } from '../ui/DailySummary';
import { WorkshopPanel } from '../ui/WorkshopPanel';
import { BulletinBoard } from '../ui/BulletinBoard';
import { ShippingBinPanel } from '../ui/ShippingBinPanel';
import { QuestSystem } from '../systems/QuestSystem';
import { ForageSystem } from '../systems/ForageSystem';
import { FruitTreeSystem } from '../systems/FruitTreeSystem';
import { getCropById, getUnlockedCrops } from '../entities/CropConfig';

type Direction = 'up' | 'down' | 'left' | 'right';

export class FarmScene extends Phaser.Scene {
  private saveData!: SaveData;
  private inventory!: InventorySystem;
  private audio!: AudioSystem;

  private player!: Phaser.GameObjects.Image;
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
  private tileOverlays: Phaser.GameObjects.TileSprite[][] = [];

  private rainEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private snowEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;

  private messageText!: Phaser.GameObjects.Text;
  private messageTimer: number = 0;

  private hudTexts: Record<string, Phaser.GameObjects.Text> = {};

  private dayHarvested: number = 0;
  private dayWatered: number = 0;
  private dayIncome: number = 0;
  private matureTweens: Phaser.Tweens.Tween[] = [];
  private overlayObjects: Phaser.GameObjects.GameObject[] = [];
  private shopOpen: boolean = false;
  private shopMode: 'buy' | 'sell' = 'buy';
  private seedSelectOpen: boolean = false;
  private workshopPanel!: WorkshopPanel;
  private bulletinBoard!: BulletinBoard;
  private shippingBinPanel!: ShippingBinPanel;
  private forageGraphics: Phaser.GameObjects.Graphics[] = [];
  private treeGraphics: Phaser.GameObjects.Graphics[] = [];
  private pathSelectOpen: boolean = false;
  private selectedPathType: PathType = 'stone';
  private placingPath: boolean = false;

  constructor() {
    super({ key: 'FarmScene' });
  }

  create(): void {
    this.saveData = SaveSystem.load();
    this.inventory = new InventorySystem(this.saveData.inventory, this.saveData.inventorySize);
    this.audio = new AudioSystem(this, this.saveData.settings.musicVolume, this.saveData.settings.sfxVolume);

    this.createFarmGrid();
    this.createDecorations();
    this.createPlayer();
    this.createNightOverlay();
    this.createHud();
    this.createMessageText();
    this.setupInput();

    // Initialize WorkshopPanel and BulletinBoard
    this.workshopPanel = new WorkshopPanel(this, this.saveData, this.inventory);
    this.workshopPanel.setOnCraft(() => {
      this.emitEvent('gold-changed', this.saveData.gold);
      this.emitEvent('save-indicator');
      SaveSystem.save(this.saveData);
    });
    this.bulletinBoard = new BulletinBoard(this, this.saveData);
    this.bulletinBoard.setOnQuestUpdate(() => {
      this.emitEvent('save-indicator');
      SaveSystem.save(this.saveData);
    });
    this.shippingBinPanel = new ShippingBinPanel(this, this.saveData, this.inventory);

    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    }

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
    this.renderForageItems();
    this.renderFruitTrees();
    this.renderPaths();
    this.emitAllEvents();

    this.events.on('shutdown', () => {
      this.rainEmitter?.destroy();
      this.snowEmitter?.destroy();
      this.matureTweens.forEach(t => t.destroy());
      this.closeOverlay();
    });
  }

  update(_time: number, delta: number): void {
    this.handleMovement();
    this.updateTime(delta);
    this.updateWeatherEffects();
    this.updateMessage(delta);
    this.updateHud();
    this.checkForagePickup();
  }

  // ─── Farm Grid ──────────────────────────────────────────────

  private createFarmGrid(): void {
    const TILE = GAME_CONFIG.TILE_SIZE;
    const MAP_W = GAME_CONFIG.FARM_COLS * TILE;
    const MAP_H = GAME_CONFIG.FARM_ROWS * TILE;

    // Grass background (entire farm)
    const grassBg = this.add.tileSprite(0, 0, MAP_W, MAP_H, 'tile_grass');
    grassBg.setOrigin(0, 0);
    grassBg.setDepth(-1);

    // Farm soil area (rows 10-30, cols 10-35)
    const soilX = 10 * TILE;
    const soilY = 10 * TILE;
    const soilW = 25 * TILE;
    const soilH = 20 * TILE;
    const soilBg = this.add.tileSprite(soilX, soilY, soilW, soilH, 'tile_dirt');
    soilBg.setOrigin(0, 0);
    soilBg.setDepth(0);

    // Stone path border above soil (row 9, cols 10-35)
    const stoneBorder = this.add.tileSprite(10 * TILE, 9 * TILE, 26 * TILE, TILE, 'tile_stone');
    stoneBorder.setOrigin(0, 0);
    stoneBorder.setDepth(0);

    // Mine entrance (rows 45-48, cols 30-35)
    const mineEntrance = this.add.tileSprite(30 * TILE, 45 * TILE, 5 * TILE, 3 * TILE, 'tile_mine_rock');
    mineEntrance.setOrigin(0, 0);
    mineEntrance.setDepth(0);

    // Workshop (rows 35-38, cols 28-32)
    const workshop = this.add.tileSprite(28 * TILE, 35 * TILE, 4 * TILE, 3 * TILE, 'tile_wood');
    workshop.setOrigin(0, 0);
    workshop.setDepth(0);

    // Bulletin board (rows 10-12, cols 5-8)
    const bulletin = this.add.tileSprite(5 * TILE, 10 * TILE, 3 * TILE, 2 * TILE, 'tile_wood');
    bulletin.setOrigin(0, 0);
    bulletin.setDepth(0);

    // Pond entrance (rows 15-18, cols 58-62)
    const pondEntrance = this.add.tileSprite(58 * TILE, 15 * TILE, 4 * TILE, 3 * TILE, 'tile_water');
    pondEntrance.setOrigin(0, 0);
    pondEntrance.setDepth(0);

    // Greenhouse entrance (rows 5-8, cols 3-7)
    const greenhouseEntrance = this.add.tileSprite(3 * TILE, 5 * TILE, 4 * TILE, 3 * TILE, 'tile_grass');
    greenhouseEntrance.setOrigin(0, 0);
    greenhouseEntrance.setDepth(0);

    // Shipping bin (rows 40-42, cols 5-8)
    const shippingBin = this.add.tileSprite(5 * TILE, 40 * TILE, 3 * TILE, 2 * TILE, 'tile_wood');
    shippingBin.setOrigin(0, 0);
    shippingBin.setDepth(0);

    this.baseMapGraphics = this.add.graphics();
    this.baseMapGraphics.setDepth(0);

    // Grid lines
    this.baseMapGraphics.lineStyle(1, 0x000000, 0.08);
    for (let row = 0; row <= GAME_CONFIG.FARM_ROWS; row++) {
      this.baseMapGraphics.lineBetween(0, row * TILE, MAP_W, row * TILE);
    }
    for (let col = 0; col <= GAME_CONFIG.FARM_COLS; col++) {
      this.baseMapGraphics.lineBetween(col * TILE, 0, col * TILE, MAP_H);
    }

    // Building labels
    this.add.text(32 * TILE, 46 * TILE, '矿洞入口', { fontSize: '10px', color: '#ffd700' }).setOrigin(0.5).setDepth(5);
    this.add.text(30 * TILE, 36 * TILE, '工坊', { fontSize: '10px', color: '#ffd700' }).setOrigin(0.5).setDepth(5);
    this.add.text(6 * TILE, 11 * TILE, '公告板', { fontSize: '10px', color: '#ffd700' }).setOrigin(0.5).setDepth(5);
    this.add.text(60 * TILE, 16 * TILE, '池塘', { fontSize: '10px', color: '#4a6fb5' }).setOrigin(0.5).setDepth(5);
    this.add.text(5 * TILE, 6 * TILE, '温室', { fontSize: '10px', color: '#88ccff' }).setOrigin(0.5).setDepth(5);
    this.add.text(6 * TILE, 41 * TILE, '出货箱', { fontSize: '10px', color: '#ffd700' }).setOrigin(0.5).setDepth(5);

    // Per-tile overlay tileSprites for state changes
    this.tileOverlays = [];
    for (let row = 0; row < GAME_CONFIG.FARM_ROWS; row++) {
      this.tileOverlays[row] = [];
      for (let col = 0; col < GAME_CONFIG.FARM_COLS; col++) {
        this.tileOverlays[row][col] = this.add.tileSprite(col * TILE, row * TILE, TILE, TILE, 'tile_plowed');
        this.tileOverlays[row][col].setOrigin(0, 0);
        this.tileOverlays[row][col].setDepth(1);
        this.tileOverlays[row][col].setVisible(false);
      }
    }

    // Per-tile overlay graphics for crop indicators
    this.tileGraphics = [];
    for (let row = 0; row < GAME_CONFIG.FARM_ROWS; row++) {
      this.tileGraphics[row] = [];
      for (let col = 0; col < GAME_CONFIG.FARM_COLS; col++) {
        const g = this.add.graphics();
        g.setDepth(2);
        this.tileGraphics[row][col] = g;
      }
    }
  }

  private createDecorations(): void {
    const TILE = GAME_CONFIG.TILE_SIZE;

    // House (northwest)
    const house = this.add.image(5 * TILE, 7 * TILE, 'decorations');
    house.setDisplaySize(TILE * 6, TILE * 6);
    house.setDepth(2);

    // Shipping bin (southwest)
    const shipper = this.add.image(6 * TILE, 41 * TILE, 'decorations');
    shipper.setDisplaySize(TILE * 4, TILE * 3);
    shipper.setDepth(2);
  }

  private renderAllTiles(): void {
    for (let row = 0; row < GAME_CONFIG.FARM_ROWS; row++) {
      for (let col = 0; col < GAME_CONFIG.FARM_COLS; col++) {
        this.updateTileVisual(row, col);
        this.addMatureGlow(row, col, this.saveData.farmGrid[row][col]);
      }
    }
  }

  private updateTileVisual(row: number, col: number): void {
    const tile = this.saveData.farmGrid[row]?.[col];
    const g = this.tileGraphics[row]?.[col];
    const overlay = this.tileOverlays[row]?.[col];
    if (!tile || !g) return;

    const TILE = GAME_CONFIG.TILE_SIZE;
    const x = col * TILE;
    const y = row * TILE;

    g.clear();
    if (overlay) overlay.setVisible(false);

    if (tile.state === 'empty') return;

    // Show texture overlay for soil states
    if (overlay) {
      switch (tile.state) {
        case 'plowed':
          overlay.setTexture('tile_plowed');
          overlay.setVisible(true);
          break;
        case 'planted':
        case 'growing':
          overlay.setTexture(tile.wateredToday ? 'tile_watered' : 'tile_plowed');
          overlay.setVisible(true);
          break;
        case 'mature':
          overlay.setTexture('tile_watered');
          overlay.setVisible(true);
          break;
        case 'dead':
          overlay.setTexture('tile_plowed');
          overlay.setVisible(true);
          break;
      }
    }

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
    this.player = this.add.image(22 * TILE, 20 * TILE, 'player_sheet');
    this.player.setDepth(10);
    this.player.setDisplaySize(TILE * 2, TILE * 2);

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
    this.input.keyboard.on('keydown-E', () => {
      const { row, col } = this.getFacingTile();
      if (row >= 45 && row < 48 && col >= 30 && col < 35) {
        this.tryEnterMine();
        return;
      }
      if (row >= 15 && row < 18 && col >= 58 && col < 62) {
        this.enterPond();
        return;
      }
      if (row >= 5 && row < 8 && col >= 3 && col < 7) {
        this.enterGreenhouse();
        return;
      }
      if (row >= 40 && row < 42 && col >= 5 && col < 8) {
        this.toggleShippingBin();
        return;
      }
      this.toggleShop();
    });
    this.input.keyboard.on('keydown-W', () => {
      if (this.isNearWorkshop()) {
        this.workshopPanel.toggle();
      }
    });
    this.input.keyboard.on('keydown-T', () => {
      if (this.isNearBulletinBoard()) {
        this.bulletinBoard.toggle();
      }
    });
    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.input.keyboard.on('keydown-O', () => this.togglePathMode());
    this.input.keyboard.on('keydown-Q', () => this.cycleSeed());
    this.input.keyboard.on('keydown-H', () => this.tryHarvest());

    const uiScene = this.scene.get('UIScene');
    uiScene.events.on('tool-changed', (tool: ToolType) => {
      this.selectTool(tool);
    });
  }

  private selectTool(tool: ToolType): void {
    if (this.isPaused) return;
    this.selectedTool = tool;
    this.audio.playSfx('sfx_click');
    this.emitEvent('tool-sync', tool);
    this.emitEvent('inventory-changed', this.inventory.getItems());
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
    if (this.shopOpen) {
      this.closeOverlay();
      this.shopOpen = false;
      return;
    }
    this.closeOverlay();

    if (this.saveData.tutorialDay === 5) {
      TutorialSystem.advanceTutorial(this.saveData);
    }

    const season = SeasonSystem.getSeason(this.saveData.currentSeason);
    const unlocked = getUnlockedCrops(this.saveData.totalEarned);
    const available = unlocked.filter(c => c.seasons.includes(season));
    const trees = FruitTreeSystem.TREES;

    const { width, height } = this.scale;
    const buyItemCount = available.length + trees.length + 2; // +2 for bread and scarecrow
    const sellItems = this.inventory.getItems().filter(i => i.type === 'crop');
    const maxItemCount = Math.max(buyItemCount, sellItems.length);
    const panelW = 300, panelH = 60 + maxItemCount * 24;
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setDepth(200).setScrollFactor(0);

    const itemsBg = this.add.image(width / 2, height / 2, 'items');
    itemsBg.setDisplaySize(panelW, panelH);
    itemsBg.setDepth(200);
    itemsBg.setScrollFactor(0);

    const panel = this.add.rectangle(width / 2, height / 2, panelW, panelH, 0x222222).setDepth(201).setScrollFactor(0);
    panel.setStrokeStyle(2, 0xffd700);

    const title = this.add.text(width / 2, height / 2 - panelH / 2 + 16, '商店', {
      fontSize: '16px', color: '#ffd700',
    }).setOrigin(0.5).setDepth(202).setScrollFactor(0);

    this.overlayObjects = [overlay, itemsBg, panel, title];

    // Tab buttons
    const tabY = height / 2 - panelH / 2 + 36;
    const buyTab = this.add.text(width / 2 - 50, tabY, '购买', {
      fontSize: '14px', color: this.shopMode === 'buy' ? '#ffd700' : '#888',
    }).setOrigin(0.5).setDepth(202).setScrollFactor(0);
    buyTab.setInteractive({ useHandCursor: true });
    buyTab.on('pointerdown', () => {
      this.shopMode = 'buy';
      this.closeOverlay();
      this.shopOpen = false;
      this.toggleShop();
    });
    this.overlayObjects.push(buyTab);

    const sellTab = this.add.text(width / 2 + 50, tabY, '出售', {
      fontSize: '14px', color: this.shopMode === 'sell' ? '#ffd700' : '#888',
    }).setOrigin(0.5).setDepth(202).setScrollFactor(0);
    sellTab.setInteractive({ useHandCursor: true });
    sellTab.on('pointerdown', () => {
      this.shopMode = 'sell';
      this.closeOverlay();
      this.shopOpen = false;
      this.toggleShop();
    });
    this.overlayObjects.push(sellTab);

    // Separator
    const sepY = tabY + 14;
    const sep = this.add.rectangle(width / 2, sepY, panelW - 20, 1, 0xffd700, 0.5).setDepth(202).setScrollFactor(0);
    this.overlayObjects.push(sep);

    if (this.shopMode === 'buy') {
      this.renderBuyShop(available, trees, width, height, panelH);
    } else {
      this.renderSellShop(sellItems, width, height, panelH);
    }

    this.shopOpen = true;
  }

  private renderBuyShop(available: any[], trees: any[], width: number, height: number, panelH: number): void {
    const season = SeasonSystem.getSeason(this.saveData.currentSeason);

    // Seeds
    available.forEach((crop, i) => {
      const y = height / 2 - panelH / 2 + 68 + i * 24;
      const label = `${crop.name}种子 - ${crop.seedPrice}金 | 卖价${crop.sellPrice}`;
      const t = this.add.text(width / 2, y, label, {
        fontSize: '13px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(202).setScrollFactor(0);
      t.setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => {
        if (EconomySystem.buySeed(this.saveData, this.inventory, crop.id)) {
          this.showMessage(`购买了 ${crop.name}种子 (-${crop.seedPrice}金币)`);
          this.audio.playSfx('sfx_coin');
          this.emitEvent('gold-changed', this.saveData.gold);
          this.emitEvent('inventory-changed', this.inventory.getItems());
          this.emitEvent('save-indicator');
          SaveSystem.save(this.saveData);
        } else {
          this.showMessage('金币不足或背包已满！');
        }
        this.closeOverlay();
        this.shopOpen = false;
      });
      t.on('pointerover', () => t.setColor('#ffd700'));
      t.on('pointerout', () => t.setColor('#ffffff'));
      this.overlayObjects.push(t);
    });

    // Fruit tree saplings
    trees.forEach((tree, i) => {
      const y = height / 2 - panelH / 2 + 68 + (available.length + i) * 24;
      const label = `${tree.name}苗 - ${tree.price}金 | 产${tree.fruitName}(${tree.fruitSellPrice}G)`;
      const t = this.add.text(width / 2, y, label, {
        fontSize: '13px', color: '#88cc88',
      }).setOrigin(0.5).setDepth(202).setScrollFactor(0);
      t.setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => {
        if (this.saveData.gold >= tree.price) {
          if (this.inventory.isFull()) {
            this.showMessage('背包已满！');
            return;
          }
          this.saveData.gold -= tree.price;
          this.inventory.addItem({
            id: `sapling_${tree.id}`,
            name: `${tree.name}苗`,
            type: 'crop',
            quantity: 1,
          });
          this.showMessage(`购买了 ${tree.name}苗 (-${tree.price}金币)`);
          this.audio.playSfx('sfx_coin');
          this.emitEvent('gold-changed', this.saveData.gold);
          this.emitEvent('inventory-changed', this.inventory.getItems());
          SaveSystem.save(this.saveData);
        } else {
          this.showMessage('金币不足！');
        }
        this.closeOverlay();
        this.shopOpen = false;
      });
      t.on('pointerover', () => t.setColor('#ffd700'));
      t.on('pointerout', () => t.setColor('#88cc88'));
      this.overlayObjects.push(t);
    });

    const itemOffset = available.length + trees.length;

    // Buy bread
    const breadY = height / 2 - panelH / 2 + 68 + itemOffset * 24;
    const breadText = this.add.text(width / 2, breadY, '面包 - 20金 (恢复30体力)', {
      fontSize: '13px', color: '#ffcc88',
    }).setOrigin(0.5).setDepth(202).setScrollFactor(0);
    breadText.setInteractive({ useHandCursor: true });
    breadText.on('pointerdown', () => {
      if (EconomySystem.buyFood(this.saveData, this.inventory)) {
        this.showMessage('购买了面包 (-20金币)');
        this.audio.playSfx('sfx_coin');
        this.emitEvent('gold-changed', this.saveData.gold);
        this.emitEvent('save-indicator');
        SaveSystem.save(this.saveData);
      } else {
        this.showMessage('金币不足或背包已满！');
      }
      this.closeOverlay();
      this.shopOpen = false;
    });
    breadText.on('pointerover', () => breadText.setColor('#ffd700'));
    breadText.on('pointerout', () => breadText.setColor('#ffcc88'));
    this.overlayObjects.push(breadText);

    // Buy scarecrow
    const scareY = height / 2 - panelH / 2 + 68 + (itemOffset + 1) * 24;
    const scareText = this.add.text(width / 2, scareY, '稻草人 - 50金 (保护作物)', {
      fontSize: '13px', color: '#cc9988',
    }).setOrigin(0.5).setDepth(202).setScrollFactor(0);
    scareText.setInteractive({ useHandCursor: true });
    scareText.on('pointerdown', () => {
      if (EconomySystem.buyScarecrow(this.saveData, this.inventory)) {
        this.showMessage('购买了稻草人 (-50金币)');
        this.audio.playSfx('sfx_coin');
        this.emitEvent('gold-changed', this.saveData.gold);
        this.emitEvent('save-indicator');
        SaveSystem.save(this.saveData);
      } else {
        this.showMessage('金币不足或背包已满！');
      }
      this.closeOverlay();
      this.shopOpen = false;
    });
    scareText.on('pointerover', () => scareText.setColor('#ffd700'));
    scareText.on('pointerout', () => scareText.setColor('#cc9988'));
    this.overlayObjects.push(scareText);
  }

  private renderSellShop(items: any[], width: number, height: number, panelH: number): void {
    if (items.length === 0) {
      const t = this.add.text(width / 2, height / 2, '没有可出售的作物', {
        fontSize: '13px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(202).setScrollFactor(0);
      this.overlayObjects.push(t);
      return;
    }

    items.forEach((item, i) => {
      const y = height / 2 - panelH / 2 + 68 + i * 24;
      const crop = getCropById(item.cropId || '');
      if (!crop) return;
      const qualityMultiplier = EconomySystem.getQualityMultiplier(item.quality || 'normal');
      const price = Math.floor(crop.sellPrice * qualityMultiplier);
      const qualityLabel = item.quality && item.quality !== 'normal' ? `[${item.quality}]` : '';
      const label = `${item.name}${qualityLabel} x${item.quantity} - 售价 ${price}金`;
      const t = this.add.text(width / 2, y, label, {
        fontSize: '13px', color: '#ffcc88',
      }).setOrigin(0.5).setDepth(202).setScrollFactor(0);
      t.setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => {
        EconomySystem.sellItem(this.saveData, this.inventory, item.id, item.quality);
        this.showMessage(`出售了 ${item.name} (+${price}金币)`);
        this.emitEvent('gold-changed', this.saveData.gold);
        this.emitEvent('save-indicator');
        SaveSystem.save(this.saveData);
        this.closeOverlay();
        this.shopOpen = false;
        this.toggleShop();
      });
      t.on('pointerover', () => t.setColor('#ffd700'));
      t.on('pointerout', () => t.setColor('#ffcc88'));
      this.overlayObjects.push(t);
    });
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.showMessage('暂停中 (P继续)');
    }
  }

  private tryEnterMine(): void {
    const { row, col } = this.getFacingTile();
    if (row >= 45 && row < 48 && col >= 30 && col < 35) {
      this.scene.start('MineScene', { saveData: this.saveData });
    }
  }

  private isNearWorkshop(): boolean {
    const { row, col } = this.getFacingTile();
    return row >= 34 && row < 39 && col >= 27 && col < 33;
  }

  private isNearBulletinBoard(): boolean {
    const { row, col } = this.getFacingTile();
    return row >= 9 && row < 13 && col >= 4 && col < 9;
  }

  // ─── Scene Transitions ─────────────────────────────────────

  private enterPond(): void {
    SaveSystem.save(this.saveData);
    this.scene.start('PondScene', { saveData: this.saveData });
  }

  private enterGreenhouse(): void {
    if (!this.saveData.greenhouseUnlocked) {
      this.showMessage('温室尚未解锁！');
      return;
    }
    SaveSystem.save(this.saveData);
    this.scene.start('GreenhouseScene', { saveData: this.saveData });
  }

  private toggleShippingBin(): void {
    this.shippingBinPanel.updateData(this.saveData, this.inventory);
    this.shippingBinPanel.toggle();
  }

  // ─── Forage System ─────────────────────────────────────────

  private renderForageItems(): void {
    this.forageGraphics.forEach(g => g.destroy());
    this.forageGraphics = [];

    const TILE = GAME_CONFIG.TILE_SIZE;
    for (const item of this.saveData.foragePositions) {
      const g = this.add.graphics();
      g.setDepth(3);
      const x = item.col * TILE + TILE / 2;
      const y = item.row * TILE + TILE / 2;

      const forage = ForageSystem.getItemById(item.id);
      const color = forage ? this.getForageColor(forage.id) : 0x88cc88;

      g.fillStyle(color, 0.9);
      g.fillCircle(x, y, 4);
      g.lineStyle(1, 0x2d5a1a, 0.8);
      g.lineBetween(x, y + 4, x, y + TILE / 2);

      this.forageGraphics.push(g);
    }
  }

  private getForageColor(id: string): number {
    const colorMap: Record<string, number> = {
      wildflower: 0xff69b4,
      mushroom: 0x8b4513,
      shell: 0xffd700,
      pinecone: 0x8b6914,
      berry: 0xff1493,
      orchid: 0xda70d6,
    };
    return colorMap[id] || 0x88cc88;
  }

  private checkForagePickup(): void {
    const TILE = GAME_CONFIG.TILE_SIZE;
    const playerRow = Math.floor(this.player.y / TILE);
    const playerCol = Math.floor(this.player.x / TILE);

    const pickupRange = 1;
    const toRemove: number[] = [];

    this.saveData.foragePositions.forEach((item, index) => {
      if (Math.abs(item.row - playerRow) <= pickupRange && Math.abs(item.col - playerCol) <= pickupRange) {
        const forage = ForageSystem.getItemById(item.id);
        if (forage) {
          const forageItem: InventoryItem = {
            id: `forage_${forage.id}`,
            name: forage.name,
            type: 'crop',
            quantity: 1,
          };
          if (this.inventory.addItem(forageItem)) {
            this.showMessage(`捡到了 ${forage.name}！`);
            this.audio.playSfx('sfx_click');
            this.emitEvent('inventory-changed', this.inventory.getItems());
            toRemove.push(index);
          }
        }
      }
    });

    if (toRemove.length > 0) {
      for (let i = toRemove.length - 1; i >= 0; i--) {
        this.saveData.foragePositions.splice(toRemove[i], 1);
      }
      this.renderForageItems();
      SaveSystem.save(this.saveData);
    }
  }

  // ─── Fruit Tree System ─────────────────────────────────────

  private renderFruitTrees(): void {
    this.treeGraphics.forEach(g => g.destroy());
    this.treeGraphics = [];

    const TILE = GAME_CONFIG.TILE_SIZE;
    for (const tree of this.saveData.fruitTrees) {
      const g = this.add.graphics();
      g.setDepth(3);
      const x = tree.col * TILE + TILE / 2;
      const y = tree.row * TILE + TILE / 2;

      const isMature = FruitTreeSystem.isMature(tree, this.saveData.currentDay);
      const color = isMature ? 0x228b22 : 0x8b6914;

      // Trunk
      g.fillStyle(0x8b4513, 0.9);
      g.fillRect(x - 2, y - 2, 4, TILE);

      // Canopy
      g.fillStyle(color, 0.9);
      g.fillCircle(x, y - TILE / 2, TILE * 0.8);

      // Fruit indicator if mature and can harvest
      if (isMature) {
        const treeData = FruitTreeSystem.getTreeById(tree.id);
        if (treeData && FruitTreeSystem.canHarvest(tree, this.saveData.currentDay, SeasonSystem.getSeason(this.saveData.currentSeason))) {
          g.fillStyle(0xff4444, 0.9);
          g.fillCircle(x - 3, y - TILE / 2 - 2, 2);
          g.fillCircle(x + 3, y - TILE / 2 + 2, 2);
        }
      }

      this.treeGraphics.push(g);
    }
  }

  // ─── Path System ───────────────────────────────────────────

  private pathObjects: Phaser.GameObjects.TileSprite[] = [];

  private renderPaths(): void {
    this.pathObjects.forEach(obj => obj.destroy());
    this.pathObjects = [];

    const TILE = GAME_CONFIG.TILE_SIZE;
    for (const path of this.saveData.paths) {
      const x = path.col * TILE;
      const y = path.row * TILE;

      let textureKey: string;
      switch (path.type) {
        case 'stone': textureKey = 'tile_stone'; break;
        case 'wood': textureKey = 'tile_wood'; break;
        case 'grass': textureKey = 'tile_grass'; break;
        default: textureKey = 'tile_stone';
      }

      const ts = this.add.tileSprite(x, y, TILE, TILE, textureKey);
      ts.setOrigin(0, 0);
      ts.setDepth(0);
      this.pathObjects.push(ts);
    }
  }

  private togglePathMode(): void {
    if (this.pathSelectOpen) {
      this.closeOverlay();
      this.pathSelectOpen = false;
      this.placingPath = false;
      return;
    }

    this.closeOverlay();
    const { width, height } = this.scale;
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5).setDepth(200).setScrollFactor(0);
    const panelH = 120;
    const panel = this.add.rectangle(width / 2, height / 2, 200, panelH, 0x222222).setDepth(201).setScrollFactor(0);
    panel.setStrokeStyle(2, 0x88cc88);

    const title = this.add.text(width / 2, height / 2 - panelH / 2 + 12, '选择路径类型', {
      fontSize: '14px', color: '#88cc88',
    }).setOrigin(0.5).setDepth(202).setScrollFactor(0);

    this.overlayObjects = [overlay, panel, title];
    this.pathSelectOpen = true;

    const pathTypes: { type: PathType; name: string; color: string }[] = [
      { type: 'stone', name: '石板路', color: '#808080' },
      { type: 'wood', name: '木板路', color: '#8b6914' },
      { type: 'grass', name: '草径', color: '#6db856' },
    ];

    pathTypes.forEach((p, i) => {
      const y = height / 2 - panelH / 2 + 36 + i * 24;
      const t = this.add.text(width / 2, y, p.name, {
        fontSize: '13px', color: p.color,
      }).setOrigin(0.5).setDepth(202).setScrollFactor(0);

      t.setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => {
        this.selectedPathType = p.type;
        this.placingPath = true;
        this.closeOverlay();
        this.pathSelectOpen = false;
        this.showMessage(`铺设${p.name} — 点击地块放置，P退出`);
      });
      t.on('pointerover', () => t.setColor('#ffd700'));
      t.on('pointerout', () => t.setColor(p.color));
      this.overlayObjects.push(t);
    });
  }

  private placePath(row: number, col: number): void {
    const existing = this.saveData.paths.findIndex(p => p.row === row && p.col === col);
    if (existing !== -1) {
      this.saveData.paths[existing].type = this.selectedPathType;
    } else {
      this.saveData.paths.push({ row, col, type: this.selectedPathType });
    }
    this.renderPaths();
    SaveSystem.save(this.saveData);
  }

  private closeOverlay(): void {
    this.overlayObjects.forEach(obj => obj.destroy());
    this.overlayObjects = [];
    this.shopOpen = false;
    this.seedSelectOpen = false;
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

    // Path placement mode
    if (this.placingPath) {
      this.placePath(row, col);
      return;
    }

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
    this.emitEvent('save-indicator');
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

    if (this.saveData.tutorialDay === 1) {
      TutorialSystem.advanceTutorial(this.saveData);
    }
  }

  private plantCrop(tile: TileSaveData, row: number, col: number): void {
    const seeds = this.inventory.getItems().filter(i => i.type === 'seed');
    if (seeds.length === 0) {
      this.showMessage('没有种子！按E购买');
      return;
    }

    // Show seed selector if multiple seeds available
    if (seeds.length > 1 && !this.seedSelectOpen) {
      this.showSeedSelector(tile, row, col, seeds);
      return;
    }

    const seedIdx = Math.min(this.selectedSeedIndex, seeds.length - 1);
    const seed = seeds[seedIdx];
    this.plantSeed(tile, row, col, seed);
  }

  private showSeedSelector(tile: TileSaveData, row: number, col: number, seeds: InventoryItem[]): void {
    this.closeOverlay();
    const { width, height } = this.scale;
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5).setDepth(200).setScrollFactor(0);
    const panelH = 30 + seeds.length * 22;
    const panel = this.add.rectangle(width / 2, height / 2, 220, panelH, 0x222222).setDepth(201).setScrollFactor(0);
    panel.setStrokeStyle(2, 0x88cc88);

    const title = this.add.text(width / 2, height / 2 - panelH / 2 + 12, '选择种子', {
      fontSize: '14px', color: '#88cc88',
    }).setOrigin(0.5).setDepth(202).setScrollFactor(0);

    this.overlayObjects = [overlay, panel, title];
    this.seedSelectOpen = true;

    seeds.forEach((seed, i) => {
      const y = height / 2 - panelH / 2 + 32 + i * 22;
      const crop = seed.cropId ? getCropById(seed.cropId) : null;
      const season = SeasonSystem.getSeason(this.saveData.currentSeason);
      const inSeason = crop ? crop.seasons.includes(season) : true;
      const label = `${seed.name} x${seed.quantity}${inSeason ? '' : ' (非当季)'}`;

      const t = this.add.text(width / 2, y, label, {
        fontSize: '13px', color: inSeason ? '#ffffff' : '#666666',
      }).setOrigin(0.5).setDepth(202).setScrollFactor(0);

      if (inSeason) {
        t.setInteractive({ useHandCursor: true });
        t.on('pointerdown', () => {
          this.selectedSeedIndex = i;
          this.closeOverlay();
          this.plantSeed(tile, row, col, seed);
        });
        t.on('pointerover', () => t.setColor('#88cc88'));
        t.on('pointerout', () => t.setColor('#ffffff'));
      }
      this.overlayObjects.push(t);
    });
  }

  private plantSeed(tile: TileSaveData, row: number, col: number, seed: InventoryItem): void {
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
    this.addMatureGlow(row, col, tile);
    this.showParticles(row, col, 'dirt');
    this.audio.playSfx('sfx_plant');
    this.showMessage(`种下了 ${crop.name}`);
    this.emitEvent('inventory-changed', this.inventory.getItems());

    if (this.saveData.tutorialDay === 2) {
      TutorialSystem.advanceTutorial(this.saveData);
    }
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
    this.dayWatered++;
    this.saveData.energy = EnergySystem.consume(this.saveData.energy, cost);
    this.updateTileVisual(row, col);
    this.showParticles(row, col, 'water');
    this.audio.playSfx('sfx_water');

    if (this.saveData.tutorialDay === 3) {
      TutorialSystem.advanceTutorial(this.saveData);
    }
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
    this.dayHarvested++;

    tile.state = 'plowed';
    tile.cropId = undefined;
    tile.plantTime = undefined;
    tile.quality = undefined;

    this.updateTileVisual(row, col);
    this.showParticles(row, col, 'gold');
    this.cameras.main.shake(100, 0.004);
    this.audio.playSfx('sfx_harvest');
    this.showMessage(`收获了 ${crop.name}${quality !== 'normal' ? ` (${quality})` : ''}！`);

    QuestSystem.updateProgress(this.saveData, 'harvest', crop.id);

    if (this.saveData.tutorialDay === 4) {
      TutorialSystem.advanceTutorial(this.saveData);
    }

    this.emitEvent('energy-changed', this.saveData.energy);
    this.emitEvent('inventory-changed', this.inventory.getItems());
    this.emitEvent('save-indicator');
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
    this.emitEvent('energy-changed', this.saveData.energy);
    this.emitEvent('inventory-changed', this.inventory.getItems());
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

    let config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig;
    switch (type) {
      case 'gold':
        config = {
          speed: { min: 40, max: 80 },
          angle: { min: 240, max: 300 },
          lifespan: 600,
          quantity: 7,
          scale: { start: 1.2, end: 0.2 },
          alpha: { start: 1, end: 0 },
          emitting: false,
        };
        break;
      case 'water':
        config = {
          speed: { min: 30, max: 70 },
          angle: { min: 220, max: 320 },
          lifespan: 500,
          quantity: 6,
          scale: { start: 1, end: 0.3 },
          alpha: { start: 0.8, end: 0 },
          emitting: false,
        };
        break;
      case 'dirt':
      default:
        config = {
          speed: { min: 25, max: 55 },
          angle: { min: 240, max: 300 },
          lifespan: 450,
          quantity: 4,
          scale: { start: 1, end: 0.3 },
          alpha: { start: 1, end: 0 },
          emitting: false,
        };
        break;
    }

    try {
      const emitter = this.add.particles(x, y, texture, config);
      emitter.setDepth(15);
      emitter.explode(type === 'gold' ? 7 : type === 'water' ? 6 : 4);
      this.time.delayedCall(700, () => emitter.destroy());
    } catch {
      // Particles may fail silently
    }
  }

  private addMatureGlow(row: number, col: number, tile: TileSaveData): void {
    if (tile.state !== 'mature') return;
    const TILE = GAME_CONFIG.TILE_SIZE;
    const x = col * TILE + TILE / 2;
    const y = row * TILE + TILE / 2;

    const cropOverlay = this.add.image(x, y, 'crops_sheet');
    cropOverlay.setDisplaySize(TILE * 0.8, TILE * 0.8);
    cropOverlay.setDepth(2);
    cropOverlay.setAlpha(0.9);

    const glow = this.add.rectangle(x, y, TILE, TILE, 0xffd700, 0.15).setDepth(2);
    const tween = this.tweens.add({
      targets: glow,
      alpha: { from: 0.1, to: 0.35 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.matureTweens.push(tween);

    // Remove glow when tile is no longer mature
    const checkInterval = this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        const currentTile = this.saveData.farmGrid[row]?.[col];
        if (!currentTile || currentTile.state !== 'mature') {
          cropOverlay.destroy();
          glow.destroy();
          tween.destroy();
          checkInterval.destroy();
        }
      },
    });
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
    const prevGold = this.saveData.gold;

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
        this.addMatureGlow(row, col, tile);
      }
    }

    // Advance greenhouse tiles (auto-watered, no season restriction)
    if (this.saveData.greenhouseGrid) {
      for (const row of this.saveData.greenhouseGrid) {
        for (const tile of row) {
          GrowthSystem.advanceGreenhouseTile(tile);
        }
      }
    }

    this.saveData.energy = this.saveData.maxEnergy;

    this.settleShippingBin();
    this.checkCrows();

    // Generate daily forage items
    this.saveData.foragePositions = ForageSystem.generateDailyForage(season);

    // Generate daily quests
    QuestSystem.generateDailyQuests(this.saveData);

    // Rating check
    const newRating = RatingSystem.checkRating(this.saveData);
    if (newRating !== this.saveData.farmRating) {
      this.saveData.farmRating = newRating;
      this.showMessage(`农场评级提升至 ${RatingSystem.getRatingName(newRating)}！`);
    }

    TutorialSystem.advanceTutorial(this.saveData);

    // Daily summary
    const dayIncome = this.saveData.gold - prevGold;
    DailySummary.show(this, {
      gold: this.saveData.gold,
      harvested: this.dayHarvested,
      watered: this.dayWatered,
      dayIncome,
      day: result.day,
    });

    this.dayHarvested = 0;
    this.dayWatered = 0;
    this.dayIncome = 0;

    if (result.seasonChanged) {
      this.audio.playSfx('sfx_season');
      this.showMessage(`季节变更为 ${SeasonSystem.getSeasonName(season)}！`);
      this.emitEvent('season-changed', season);
    }

    this.showMessage(`${SeasonSystem.getSeasonName(season)} 第${result.day}天 - ${WeatherSystem.getWeatherName(this.saveData.currentWeather)}`);

    this.emitEvent('day-changed', result.day, season);
    this.emitEvent('weather-changed', this.saveData.currentWeather);
    this.emitEvent('energy-changed', this.saveData.energy);
    this.emitEvent('save-indicator');
    SaveSystem.save(this.saveData);
  }

  private settleShippingBin(): void {
    const total = ShippingBinSystem.settleDaily(this.saveData.shippingBin);
    if (total > 0) {
      this.saveData.gold += total;
      this.saveData.totalEarned += total;
    }
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
    this.emitEvent('tool-sync', this.selectedTool);
    this.emitEvent('inventory-changed', this.inventory.getItems());

    const tutorialTask = TutorialSystem.getCurrentTask(s);
    if (tutorialTask) {
      this.showMessage(tutorialTask);
    }
  }
}
