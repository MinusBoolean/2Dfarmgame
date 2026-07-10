import Phaser from 'phaser';
import { GAME_CONFIG } from '../config';
import { SaveData, ToolType } from '../types';
import { SaveSystem } from '../systems/SaveSystem';
import { FarmTile } from '../entities/FarmTile';
import { Player } from '../entities/Player';
import { GrowthSystem } from '../systems/GrowthSystem';
import { CROPS } from '../entities/CropConfig';
import { Toolbar } from '../ui/Toolbar';
import { ShopPanel } from '../ui/ShopPanel';
import { SeedSelector } from '../ui/SeedSelector';
import { EconomySystem } from '../systems/EconomySystem';
import { getUnlockedCrops } from '../entities/CropConfig';

export class FarmScene extends Phaser.Scene {
  private tileGrid: FarmTile[][] = [];
  private player!: Player;
  private saveData!: SaveData;
  private currentTool: ToolType = ToolType.PLOW;
  private highlightedTile: FarmTile | null = null;
  private interactionChanged: boolean = false;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private hudTexts!: {
    goldText: Phaser.GameObjects.Text;
    toolText: Phaser.GameObjects.Text;
  };
  private toolbar!: Toolbar;
  private shopPanel!: ShopPanel;
  private seedSelector!: SeedSelector;

  constructor() {
    super({ key: 'FarmScene' });
  }

  create(): void {
    this.tileGrid = [];
    this.saveData = SaveSystem.load() || SaveSystem.createDefaultSaveData();

    this.drawGround();

    for (let row = 0; row < GAME_CONFIG.GRID_ROWS; row++) {
      this.tileGrid[row] = [];
      for (let col = 0; col < GAME_CONFIG.GRID_COLS; col++) {
        const tile = new FarmTile(this, row, col, this.saveData.farmGrid[row][col]);
        tile.on('pointerdown', () => this.onTileClick(tile));
        this.tileGrid[row][col] = tile;
      }
    }

    const startX = GAME_CONFIG.GRID_OFFSET_X + GAME_CONFIG.TILE_SIZE * 1.5;
    const startY = GAME_CONFIG.GRID_OFFSET_Y + GAME_CONFIG.TILE_SIZE * 1.5;
    this.player = new Player(this, startX, startY);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };

    this.input.keyboard!.on('keydown-ONE', () => this.toolbar.selectTool(ToolType.PLOW));
    this.input.keyboard!.on('keydown-TWO', () => this.toolbar.selectTool(ToolType.SEED));
    this.input.keyboard!.on('keydown-THREE', () => this.toolbar.selectTool(ToolType.HARVEST));
    this.input.keyboard!.on('keydown-E', () => this.toggleShop());
    this.input.keyboard!.on('keydown-SPACE', () => this.interactWithFacingTile());

    this.createHUD();

    this.shopPanel = new ShopPanel(this);

    this.seedSelector = new SeedSelector(this);

    this.toolbar = new Toolbar(this);
    this.toolbar.setOnToolChange((tool: ToolType) => {
      this.currentTool = tool;
      this.updateHUD();
    });

    const unlockBtn = this.add.rectangle(760, 58, 64, 26, GAME_CONFIG.COLORS.BUTTON)
      .setDepth(101).setScrollFactor(0).setInteractive({ useHandCursor: true });
    this.add.text(760, 58, '扩地', {
      fontSize: '13px', color: '#ffffff'
    }).setDepth(102).setScrollFactor(0).setOrigin(0.5);

    unlockBtn.on('pointerdown', () => this.unlockTile());
    unlockBtn.on('pointerover', () => unlockBtn.setFillStyle(GAME_CONFIG.COLORS.BUTTON_HOVER));
    unlockBtn.on('pointerout', () => unlockBtn.setFillStyle(GAME_CONFIG.COLORS.BUTTON));

    const newGameBtn = this.add.rectangle(60, 58, 80, 26, 0xaa4444)
      .setDepth(101).setScrollFactor(0).setInteractive({ useHandCursor: true });
    this.add.text(60, 58, '新游戏', {
      fontSize: '13px', color: '#ffffff'
    }).setDepth(102).setScrollFactor(0).setOrigin(0.5);

    newGameBtn.on('pointerdown', () => this.resetGame());

    this.updateTileVisibility();
    this.updateHUD();
  }

  private drawGround(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x3a5c2f, 1);
    graphics.fillRect(
      GAME_CONFIG.GRID_OFFSET_X - 8,
      GAME_CONFIG.GRID_OFFSET_Y - 8,
      GAME_CONFIG.GRID_COLS * GAME_CONFIG.TILE_SIZE + 16,
      GAME_CONFIG.GRID_ROWS * GAME_CONFIG.TILE_SIZE + 16
    );

    for (let row = 0; row < GAME_CONFIG.GRID_ROWS; row++) {
      for (let col = 0; col < GAME_CONFIG.GRID_COLS; col++) {
        const x = GAME_CONFIG.GRID_OFFSET_X + col * GAME_CONFIG.TILE_SIZE;
        const y = GAME_CONFIG.GRID_OFFSET_Y + row * GAME_CONFIG.TILE_SIZE;
        graphics.fillStyle(0x4a7c3f, 1);
        graphics.fillRect(x + 1, y + 1, GAME_CONFIG.TILE_SIZE - 2, GAME_CONFIG.TILE_SIZE - 2);
      }
    }
  }

  private createHUD(): void {
    this.add.rectangle(400, 20, 800, 40, GAME_CONFIG.COLORS.HUD_BG).setDepth(100).setScrollFactor(0);

    this.hudTexts = {
      goldText: this.add.text(16, 12, '', {
        fontSize: '16px',
        color: GAME_CONFIG.COLORS.GOLD_COLOR
      }).setDepth(101).setScrollFactor(0),
      toolText: this.add.text(784, 12, '', {
        fontSize: '14px',
        color: GAME_CONFIG.COLORS.HUD_TEXT
      }).setDepth(101).setScrollFactor(0).setOrigin(1, 0)
    };
  }

  private updateHUD(): void {
    this.hudTexts.goldText.setText(
      `金币: ${this.saveData.gold} | 地块: ${this.saveData.unlockedTiles}`
    );
    const toolNames: Record<ToolType, string> = {
      [ToolType.PLOW]: '翻地 [1]',
      [ToolType.SEED]: '播种 [2]',
      [ToolType.HARVEST]: '收获 [3]',
      [ToolType.WATER]: '浇水'
    };
    this.hudTexts.toolText.setText(`工具: ${toolNames[this.currentTool]} | [E]商店 [空格]交互`);
  }

  private setTool(tool: ToolType): void {
    this.currentTool = tool;
    this.updateHUD();
  }

  private updateTileVisibility(): void {
    for (let row = 0; row < GAME_CONFIG.GRID_ROWS; row++) {
      for (let col = 0; col < GAME_CONFIG.GRID_COLS; col++) {
        const tile = this.tileGrid[row][col];
        const unlocked = tile.isUnlocked(this.saveData.unlockedTiles);
        tile.setVisible(unlocked);
        if (!unlocked) {
          tile.disableInteractive();
        } else {
          tile.setInteractive();
        }
      }
    }
  }

  update(time: number, delta: number): void {
    this.player.update(delta, this.cursors, this.wasd);

    const grid = this.tileGrid.map(row =>
      row.map(tile => tile.tileData)
    );
    const newGrid = GrowthSystem.update(grid, time);

    let gridChanged = false;
    for (let row = 0; row < GAME_CONFIG.GRID_ROWS; row++) {
      for (let col = 0; col < GAME_CONFIG.GRID_COLS; col++) {
        if (newGrid[row][col].state !== this.tileGrid[row][col].tileData.state) {
          this.tileGrid[row][col].setTileData(newGrid[row][col]);
          gridChanged = true;
        }
      }
    }

    if (this.highlightedTile) {
      this.highlightedTile.highlight(false);
      this.highlightedTile = null;
    }

    for (let row = 0; row < GAME_CONFIG.GRID_ROWS; row++) {
      for (let col = 0; col < GAME_CONFIG.GRID_COLS; col++) {
        if (this.tileGrid[row][col].tileData.state === 'growing') {
          this.tileGrid[row][col].updateAppearance();
        }
      }
    }

    const facing = this.player.getFacingTile();
    if (
      facing.row >= 0 && facing.row < GAME_CONFIG.GRID_ROWS &&
      facing.col >= 0 && facing.col < GAME_CONFIG.GRID_COLS
    ) {
      const tile = this.tileGrid[facing.row][facing.col];
      if (tile.visible) {
        tile.highlight(true);
        this.highlightedTile = tile;
      }
    }

    if (gridChanged || this.interactionChanged) {
      this.saveGame();
      this.interactionChanged = false;
    }
  }

  private onTileClick(tile: FarmTile): void {
    this.interactWithTile(tile);
  }

  private interactWithFacingTile(): void {
    const facing = this.player.getFacingTile();
    if (
      facing.row >= 0 && facing.row < GAME_CONFIG.GRID_ROWS &&
      facing.col >= 0 && facing.col < GAME_CONFIG.GRID_COLS
    ) {
      const tile = this.tileGrid[facing.row][facing.col];
      if (tile.visible) {
        this.interactWithTile(tile);
      }
    }
  }

  private interactWithTile(tile: FarmTile): void {
    const data = tile.tileData;

    switch (this.currentTool) {
      case ToolType.PLOW:
        if (data.state === 'empty') {
          this.saveData.farmGrid[tile.row][tile.col] = {
            state: 'plowed',
            cropId: null,
            plantTime: null
          };
          tile.setTileData(this.saveData.farmGrid[tile.row][tile.col]);
          this.interactionChanged = true;
        }
        break;

      case ToolType.SEED:
        if (data.state === 'plowed') {
          const seeds = Object.entries(this.saveData.inventory).filter(([_, c]) => c > 0);
          if (seeds.length === 0) break;

          this.seedSelector.show(
            tile.getWorldX(),
            tile.getWorldY() - GAME_CONFIG.TILE_SIZE,
            this.saveData.inventory,
            (cropId: string) => {
              this.plantSeed(tile, cropId);
            }
          );
        }
        break;

      case ToolType.HARVEST:
        if (data.state === 'mature' && data.cropId) {
          const cropId = data.cropId;
          const newInventory = { ...this.saveData.inventory };
          newInventory[cropId] = (newInventory[cropId] || 0) + 1;

          this.saveData.inventory = newInventory;
          this.saveData.farmGrid[tile.row][tile.col] = {
            state: 'empty',
            cropId: null,
            plantTime: null
          };

          this.checkCropUnlocks();
          tile.setTileData(this.saveData.farmGrid[tile.row][tile.col]);
          this.updateHUD();
          this.interactionChanged = true;
        }
        break;
    }
  }

  private plantSeed(tile: FarmTile, cropId: string): void {
    const newInventory = { ...this.saveData.inventory };
    newInventory[cropId] = (newInventory[cropId] || 1) - 1;
    if (newInventory[cropId] <= 0) delete newInventory[cropId];

    this.saveData.inventory = newInventory;
    this.saveData.farmGrid[tile.row][tile.col] = {
      state: 'growing',
      cropId,
      plantTime: this.time.now
    };
    tile.setTileData(this.saveData.farmGrid[tile.row][tile.col]);
    this.updateHUD();
    this.saveGame();
  }

  private checkCropUnlocks(): void {
    for (const crop of CROPS) {
      if (crop.unlockGold <= this.saveData.totalEarned &&
          !this.saveData.unlockedCrops.includes(crop.id)) {
        this.saveData.unlockedCrops.push(crop.id);
      }
    }
  }

  private saveGame(): void {
    for (let row = 0; row < GAME_CONFIG.GRID_ROWS; row++) {
      for (let col = 0; col < GAME_CONFIG.GRID_COLS; col++) {
        this.saveData.farmGrid[row][col] = { ...this.tileGrid[row][col].tileData };
      }
    }
    SaveSystem.save(this.saveData);
  }

  private toggleShop(): void {
    const unlockedCrops = getUnlockedCrops(this.saveData.totalEarned, this.saveData.unlockedCrops);
    this.shopPanel.toggle(
      this.saveData.gold,
      this.saveData.totalEarned,
      unlockedCrops.map(c => c.id),
      this.saveData.inventory,
      (cropId) => this.handleBuy(cropId),
      (cropId) => this.handleSell(cropId)
    );
  }

  private handleBuy(cropId: string): void {
    const result = EconomySystem.buySeed(cropId, this.saveData.gold, this.saveData.inventory);
    if (result.success) {
      this.saveData.gold = result.gold;
      this.saveData.inventory = result.inventory;
      this.updateHUD();
      this.saveGame();
      const unlockedCrops = getUnlockedCrops(this.saveData.totalEarned, this.saveData.unlockedCrops);
      this.shopPanel.close();
      this.shopPanel.open(
        this.saveData.gold, this.saveData.totalEarned,
        unlockedCrops.map(c => c.id), this.saveData.inventory,
        (id) => this.handleBuy(id), (id) => this.handleSell(id)
      );
    }
  }

  private handleSell(cropId: string): void {
    const result = EconomySystem.sellCrop(
      cropId, this.saveData.gold, this.saveData.inventory, this.saveData.totalEarned
    );
    if (result.success) {
      this.saveData.gold = result.gold;
      this.saveData.inventory = result.inventory;
      this.saveData.totalEarned = result.totalEarned;
      this.checkCropUnlocks();
      this.updateHUD();
      this.saveGame();
      const unlockedCrops = getUnlockedCrops(this.saveData.totalEarned, this.saveData.unlockedCrops);
      this.shopPanel.close();
      this.shopPanel.open(
        this.saveData.gold, this.saveData.totalEarned,
        unlockedCrops.map(c => c.id), this.saveData.inventory,
        (id) => this.handleBuy(id), (id) => this.handleSell(id)
      );
    }
  }

  private unlockTile(): void {
    const cost = EconomySystem.getUnlockCost(this.saveData.unlockedTiles);
    const maxTiles = GAME_CONFIG.GRID_COLS * GAME_CONFIG.GRID_ROWS;

    if (this.saveData.unlockedTiles >= maxTiles) {
      this.showMessage('地块已全部解锁!');
      return;
    }

    if (this.saveData.gold < cost) {
      this.showMessage(`金币不足! 需要 ${cost}G`);
      return;
    }

    this.saveData.gold -= cost;
    this.saveData.unlockedTiles += 1;
    this.updateTileVisibility();
    this.updateHUD();
    this.saveGame();
    this.showMessage(`解锁新地块! (-${cost}G)`);
  }

  private showMessage(text: string): void {
    const msg = this.add.text(400, 100, text, {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 12, y: 6 }
    }).setOrigin(0.5).setDepth(300);

    this.tweens.add({
      targets: msg,
      alpha: 0,
      y: 80,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => msg.destroy()
    });
  }

  private resetGame(): void {
    SaveSystem.clear();
    this.scene.restart();
  }
}
