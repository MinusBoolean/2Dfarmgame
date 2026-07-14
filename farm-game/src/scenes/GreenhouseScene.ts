import Phaser from 'phaser';
import { GAME_CONFIG } from '../config';
import { SaveData, TileSaveData, ToolType } from '../types';
import { SaveSystem } from '../systems/SaveSystem';
import { GrowthSystem } from '../systems/GrowthSystem';
import { EnergySystem } from '../systems/EnergySystem';
import { InventorySystem } from '../systems/InventorySystem';
import { getCropById } from '../entities/CropConfig';

type Direction = 'up' | 'down' | 'left' | 'right';

export class GreenhouseScene extends Phaser.Scene {
  private static readonly GRID_COLS = 6;
  private static readonly GRID_ROWS = 8;
  private static readonly GRID_OFFSET_X = 2;
  private static readonly GRID_OFFSET_Y = 2;

  private saveData!: SaveData;
  private inventory!: InventorySystem;
  private greenhouseGrid: TileSaveData[][] = [];
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
  private tileGraphics: Phaser.GameObjects.Graphics[][] = [];
  private hudTexts: Record<string, Phaser.GameObjects.Text> = {};
  private messageText!: Phaser.GameObjects.Text;
  private messageTimer: number = 0;
  private isPaused: boolean = false;

  constructor() { super({ key: 'GreenhouseScene' }); }

  // ─── Lifecycle ───────────────────────────────────────────────

  init(data: { saveData: SaveData }): void {
    this.saveData = data.saveData;
    this.inventory = new InventorySystem(this.saveData.inventory, this.saveData.inventorySize);
    this.greenhouseGrid = this.saveData.greenhouseGrid;
  }

  create(): void {
    this.createGreenhouseMap();
    this.createPlayer();
    this.createHud();
    this.createMessageText();
    this.setupInput();
    this.renderAllTiles();

    this.add.text(400, 20, '温室 — 不受季节限制，自动浇水', {
      fontSize: '14px', color: '#fff', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

    this.add.text(400, 40, 'ESC 返回农场 | 1锄头 2水壶 Q换种子 空格使用 H收获', {
      fontSize: '11px', color: '#aaa', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

    this.updateHud();
  }

  update(_time: number, delta: number): void {
    this.handleMovement();
    this.updateMessage(delta);
  }

  // ─── Map ─────────────────────────────────────────────────────

  private createGreenhouseMap(): void {
    const TILE = GAME_CONFIG.TILE_SIZE;
    const TILE2 = TILE * 2;
    const COLS = 12;
    const ROWS = 16;

    const g = this.add.graphics();
    g.setDepth(0);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
          g.fillStyle(0x88ccff, 0.5);
        } else {
          g.fillStyle(0x2d5a27);
        }
        g.fillRect(c * TILE2, r * TILE2, TILE2, TILE2);
      }
    }

    for (let r = 2; r < 10; r++) {
      for (let c = 2; c < 8; c++) {
        g.fillStyle(0x8b6914);
        g.fillRect(c * TILE2, r * TILE2, TILE2, TILE2);
      }
    }

    this.tileGraphics = [];
    for (let r = 0; r < GreenhouseScene.GRID_ROWS; r++) {
      this.tileGraphics[r] = [];
      for (let c = 0; c < GreenhouseScene.GRID_COLS; c++) {
        const tg = this.add.graphics();
        tg.setDepth(1);
        this.tileGraphics[r][c] = tg;
      }
    }

    this.physics.world.setBounds(0, 0, COLS * TILE2, ROWS * TILE2);
    this.cameras.main.setBounds(0, 0, COLS * TILE2, ROWS * TILE2);
  }

  // ─── Player ─────────────────────────────────────────────────

  private createPlayer(): void {
    const TILE = GAME_CONFIG.TILE_SIZE;
    this.player = this.add.rectangle(
      6 * TILE * 2, 12 * TILE * 2, TILE * 2, TILE * 2, 0x3366cc
    );
    this.player.setDepth(10);
    this.physics.add.existing(this.player);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(TILE * 1.8, TILE * 1.2);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }

  // ─── Movement ───────────────────────────────────────────────

  private handleMovement(): void {
    if (this.isPaused) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const speed = GAME_CONFIG.PLAYER_SPEED;

    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.wasd.A.isDown) { vx = -speed; this.facing = 'left'; }
    else if (this.cursors.right.isDown || this.wasd.D.isDown) { vx = speed; this.facing = 'right'; }

    if (this.cursors.up.isDown || this.wasd.W.isDown) { vy = -speed; this.facing = 'up'; }
    else if (this.cursors.down.isDown || this.wasd.S.isDown) { vy = speed; this.facing = 'down'; }

    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }

    body.setVelocity(vx, vy);
  }

  // ─── Tile Mapping ───────────────────────────────────────────

  private getFacingTile(): { row: number; col: number } | null {
    const TILE2 = GAME_CONFIG.TILE_SIZE * 2;
    const px = this.player.x;
    const py = this.player.y;

    let tx = px, ty = py;
    switch (this.facing) {
      case 'up': ty -= TILE2 * 1.5; break;
      case 'down': ty += TILE2 * 1.5; break;
      case 'left': tx -= TILE2 * 1.5; break;
      case 'right': tx += TILE2 * 1.5; break;
    }

    const worldCol = Math.floor(tx / TILE2);
    const worldRow = Math.floor(ty / TILE2);

    const gridCol = worldCol - GreenhouseScene.GRID_OFFSET_X;
    const gridRow = worldRow - GreenhouseScene.GRID_OFFSET_Y;

    if (gridRow < 0 || gridRow >= GreenhouseScene.GRID_ROWS ||
        gridCol < 0 || gridCol >= GreenhouseScene.GRID_COLS) {
      return null;
    }
    return { row: gridRow, col: gridCol };
  }

  // ─── HUD ───────────────────────────────────────────────────

  private createHud(): void {
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '13px', color: '#fff', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 3,
    };
    this.hudTexts.energy = this.add.text(10, 58, '', style).setDepth(200).setScrollFactor(0);
    this.hudTexts.tool = this.add.text(10, 76, '', style).setDepth(200).setScrollFactor(0);
    this.hudTexts.seed = this.add.text(10, 94, '', style).setDepth(200).setScrollFactor(0);
  }

  private updateHud(): void {
    this.hudTexts.energy.setText(`体力: ${this.saveData.energy}/${this.saveData.maxEnergy}`);
    this.hudTexts.tool.setText(`工具: ${this.toolName(this.selectedTool)} [1/2]`);

    const seeds = this.inventory.getItems().filter(i => i.type === 'seed');
    if (seeds.length > 0) {
      const idx = Math.min(this.selectedSeedIndex, seeds.length - 1);
      this.hudTexts.seed.setText(`种子: ${seeds[idx].name} x${seeds[idx].quantity} [Q切换]`);
    } else {
      this.hudTexts.seed.setText('种子: 无');
    }
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
        fontSize: '16px', color: '#fff', fontFamily: 'sans-serif',
        stroke: '#000', strokeThickness: 4, align: 'center',
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

  // ─── Input ─────────────────────────────────────────────────

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
    this.input.keyboard.on('keydown-Q', () => this.cycleSeed());
    this.input.keyboard.on('keydown-SPACE', () => this.useTool());
    this.input.keyboard.on('keydown-H', () => this.tryHarvest());

    this.input.keyboard.on('keydown-ESC', () => {
      SaveSystem.save(this.saveData);
      this.scene.stop('UIScene');
      this.scene.start('FarmScene', { saveData: this.saveData });
    });
  }

  private selectTool(tool: ToolType): void {
    if (this.isPaused) return;
    this.selectedTool = tool;
    this.updateHud();
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
    this.updateHud();
  }

  // ─── Tool Use ──────────────────────────────────────────────

  private useTool(): void {
    if (this.isPaused) return;
    const ft = this.getFacingTile();
    if (!ft) return;

    const tile = this.greenhouseGrid[ft.row][ft.col];

    switch (this.selectedTool) {
      case 'hoe':
        if (tile.state === 'empty') {
          this.plowTile(tile, ft.row, ft.col);
        } else if (tile.state === 'plowed') {
          this.plantCrop(tile, ft.row, ft.col);
        }
        break;
      case 'wateringCan':
        this.waterTile(tile, ft.row, ft.col);
        break;
    }

    this.updateHud();
    this.saveAndUpdate();
  }

  private plowTile(tile: TileSaveData, row: number, col: number): void {
    const cost = EnergySystem.getActionCost('PLOW', this.saveData.toolLevels.hoe);
    if (!EnergySystem.canPerform(this.saveData.energy, cost)) {
      this.showMessage('体力不足！');
      return;
    }
    tile.state = 'plowed';
    this.saveData.energy = EnergySystem.consume(this.saveData.energy, cost);
    this.updateTileVisual(row, col);
    this.cameras.main.shake(80, 0.002);
  }

  private plantCrop(tile: TileSaveData, row: number, col: number): void {
    const seeds = this.inventory.getItems().filter(i => i.type === 'seed');
    if (seeds.length === 0) {
      this.showMessage('没有种子！');
      return;
    }
    const seedIdx = Math.min(this.selectedSeedIndex, seeds.length - 1);
    const seed = seeds[seedIdx];
    const cropId = seed.cropId;
    if (!cropId) return;

    const crop = getCropById(cropId);
    if (!crop) return;

    const cost = EnergySystem.getActionCost('PLANT', this.saveData.toolLevels.hoe);
    if (!EnergySystem.canPerform(this.saveData.energy, cost)) {
      this.showMessage('体力不足！');
      return;
    }

    if (!this.inventory.removeItem(seed.id, 1)) return;

    tile.state = 'planted';
    tile.cropId = cropId;
    tile.plantTime = Date.now();
    tile.wateredToday = true;
    tile.consecutiveWaterDays = 0;

    this.saveData.energy = EnergySystem.consume(this.saveData.energy, cost);
    this.updateTileVisual(row, col);
    this.cameras.main.shake(60, 0.001);
    this.showMessage(`种下了 ${crop.name}`);

    const seedIdx2 = Math.min(this.selectedSeedIndex, seeds.length - 1);
    if (seeds[seedIdx2].quantity <= 0 || seedIdx2 >= seeds.length) {
      this.selectedSeedIndex = 0;
    }
  }

  private waterTile(tile: TileSaveData, row: number, col: number): void {
    if (tile.state !== 'planted' && tile.state !== 'growing') return;
    if (tile.wateredToday) {
      this.showMessage('今天已经浇过水了（温室自动浇水）');
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
    this.cameras.main.shake(40, 0.001);
  }

  private tryHarvest(): void {
    if (this.isPaused) return;
    const ft = this.getFacingTile();
    if (!ft) return;

    const tile = this.greenhouseGrid[ft.row][ft.col];
    if (tile.state !== 'mature' || !tile.cropId) return;

    const crop = getCropById(tile.cropId);
    if (!crop) return;

    const cost = EnergySystem.getActionCost('HARVEST', this.saveData.toolLevels.hoe);
    if (!EnergySystem.canPerform(this.saveData.energy, cost)) {
      this.showMessage('体力不足！');
      return;
    }

    const quality = tile.quality || 'normal';
    const cropItem = {
      id: `crop_${tile.cropId}`,
      name: crop.name,
      type: 'crop' as const,
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

    this.updateTileVisual(ft.row, ft.col);
    this.cameras.main.shake(100, 0.004);
    this.showMessage(`收获了 ${crop.name}${quality !== 'normal' ? ` (${quality})` : ''}！`);

    this.updateHud();
    this.saveAndUpdate();
  }

  // ─── Rendering ─────────────────────────────────────────────

  private renderAllTiles(): void {
    for (let r = 0; r < GreenhouseScene.GRID_ROWS; r++) {
      for (let c = 0; c < GreenhouseScene.GRID_COLS; c++) {
        this.updateTileVisual(r, c);
      }
    }
  }

  private updateTileVisual(row: number, col: number): void {
    const tile = this.greenhouseGrid[row]?.[col];
    const g = this.tileGraphics[row]?.[col];
    if (!tile || !g) return;

    const TILE2 = GAME_CONFIG.TILE_SIZE * 2;
    const worldCol = col + GreenhouseScene.GRID_OFFSET_X;
    const worldRow = row + GreenhouseScene.GRID_OFFSET_Y;
    const x = worldCol * TILE2;
    const y = worldRow * TILE2;

    g.clear();

    let bgColor: number;
    switch (tile.state) {
      case 'empty': bgColor = 0x8b6914; break;
      case 'plowed': bgColor = 0xa67c2e; break;
      case 'planted': bgColor = 0x8b6914; break;
      case 'growing': bgColor = 0x4a6e1a; break;
      case 'mature': bgColor = 0x2d8a2d; break;
      case 'dead': bgColor = 0x606060; break;
      default: return;
    }

    g.fillStyle(bgColor, 0.9);
    g.fillRect(x + 1, y + 1, TILE2 - 2, TILE2 - 2);

    if (tile.cropId && (tile.state === 'planted' || tile.state === 'growing' || tile.state === 'mature')) {
      this.drawCropOnTile(g, x, y, tile);
    }

    if (tile.state === 'dead') {
      g.lineStyle(2, 0xff0000, 0.8);
      g.lineBetween(x + 4, y + 4, x + TILE2 - 4, y + TILE2 - 4);
      g.lineBetween(x + TILE2 - 4, y + 4, x + 4, y + TILE2 - 4);
    }
  }

  private drawCropOnTile(g: Phaser.GameObjects.Graphics, x: number, y: number, tile: TileSaveData): void {
    const TILE2 = GAME_CONFIG.TILE_SIZE * 2;
    const cx = x + TILE2 / 2;
    const cy = y + TILE2 / 2;
    const cropColor = this.getCropColor(tile.cropId || '');

    switch (tile.state) {
      case 'planted':
        g.fillStyle(cropColor, 0.9);
        g.fillCircle(cx, cy + 4, 3);
        break;
      case 'growing':
        g.fillStyle(cropColor, 0.9);
        g.fillCircle(cx, cy, 5);
        g.lineStyle(2, 0x2d5a1a, 0.8);
        g.lineBetween(cx, cy + 5, cx, cy + TILE2 / 2 - 2);
        break;
      case 'mature':
        g.fillStyle(cropColor, 1);
        g.fillCircle(cx, cy - 2, 7);
        g.lineStyle(2, 0x2d5a1a, 0.9);
        g.lineBetween(cx, cy + 5, cx, cy + TILE2 / 2);
        if (tile.quality === 'gold' || tile.quality === 'iridium') {
          g.fillStyle(0xffd700, 0.3);
          g.fillCircle(cx, cy, 10);
        }
        break;
    }
  }

  private getCropColor(cropId: string): number {
    const colorMap: Record<string, number> = {
      carrot: 0xff8c00, wheat: 0xdaa520, tomato: 0xff4444,
      corn: 0xffd700, watermelon: 0x2e8b57, potato: 0xd2b48c,
      pumpkin: 0xff6600, strawberry: 0xff1493, blueberry: 0x4169e1,
      pepper: 0xff0000, eggplant: 0x6a0dad, spinach: 0x228b22,
    };
    return colorMap[cropId] || 0x88cc88;
  }

  // ─── Save & Events ─────────────────────────────────────────

  private saveAndUpdate(): void {
    this.emitEvent('energy-changed', this.saveData.energy);
    this.emitEvent('save-indicator');
    SaveSystem.save(this.saveData);
  }

  private emitEvent(event: string, ...args: unknown[]): void {
    this.events.emit(event, ...args);
  }
}
