import Phaser from 'phaser';
import { GAME_CONFIG } from '../config';
import { SaveData, MineFloorData, MineTileData, OreType } from '../types';
import { SaveSystem } from '../systems/SaveSystem';
import { InventorySystem } from '../systems/InventorySystem';
import { EnergySystem } from '../systems/EnergySystem';
import { MineSystem } from '../systems/MineSystem';
import { QuestSystem } from '../systems/QuestSystem';

export class MineScene extends Phaser.Scene {
  private saveData!: SaveData;
  private inventory!: InventorySystem;
  private currentFloor!: number;
  private floorData!: MineFloorData;

  private player!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private facing: 'up' | 'down' | 'left' | 'right' = 'down';
  private selectedTool: 'pickaxe' | 'hoe' | 'wateringCan' = 'pickaxe';

  private tileGraphics: Phaser.GameObjects.Graphics[][] = [];
  private messageText!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'MineScene' }); }

  init(data: { saveData: SaveData }): void {
    this.saveData = data.saveData;
    this.inventory = new InventorySystem(this.saveData.inventory, this.saveData.inventorySize);
    this.currentFloor = this.saveData.mineData.currentFloor;
  }

  create(): void {
    if (!this.saveData.mineData.floors[this.currentFloor].discovered) {
      this.saveData.mineData.floors[this.currentFloor] = MineSystem.generateFloor(this.currentFloor);
    }
    this.floorData = this.saveData.mineData.floors[this.currentFloor];

    this.createMineGrid();
    this.createPlayer();
    this.setupInput();
    this.createMessageText();
    this.createHUD();

    const size = MineSystem.FLOOR_SIZE * GAME_CONFIG.TILE_SIZE;
    const darkOverlay = this.add.rectangle(size / 2, size / 2, size, size, 0x000000, 0.3);
    darkOverlay.setDepth(40);

    this.physics.world.setBounds(0, 0, size, size);
  }

  private createMineGrid(): void {
    const TILE = GAME_CONFIG.TILE_SIZE;
    const size = MineSystem.FLOOR_SIZE;

    // Mine tiles background
    const mineBg = this.add.image(
      size * TILE / 2,
      size * TILE / 2,
      'mine_tiles'
    );
    mineBg.setDepth(-1);
    mineBg.setDisplaySize(size * TILE, size * TILE);

    this.tileGraphics = [];
    const g = this.add.graphics();
    g.setDepth(0);

    for (let row = 0; row < size; row++) {
      this.tileGraphics[row] = [];
      for (let col = 0; col < size; col++) {
        const x = col * TILE;
        const y = row * TILE;
        const tile = this.floorData.tiles[row][col];

        const tileG = this.add.graphics();
        this.drawMineTile(tileG, tile, x, y, TILE);
        tileG.setDepth(1);
        this.tileGraphics[row][col] = tileG;
      }
    }
  }

  private drawMineTile(g: Phaser.GameObjects.Graphics, tile: MineTileData, x: number, y: number, size: number): void {
    g.clear();
    g.fillStyle(0x333333, 0.7);
    g.fillRect(x, y, size, size);

    switch (tile.type) {
      case 'rock':
        g.fillStyle(0x666666, 0.7);
        g.fillRect(x + 2, y + 2, size - 4, size - 4);
        g.fillStyle(0x555555, 0.7);
        g.fillRect(x + 4, y + 4, size - 8, size - 8);
        break;
      case 'ore':
        const oreColors: Record<OreType, number> = { copper: 0xcc7722, iron: 0xaaaaaa, gold: 0xffd700 };
        g.fillStyle(0x555555, 0.7);
        g.fillRect(x + 2, y + 2, size - 4, size - 4);
        g.fillStyle(oreColors[tile.oreType || 'copper'], 0.7);
        g.fillRect(x + 5, y + 5, size - 10, size - 10);
        g.fillStyle(0xffffff, 0.4);
        g.fillRect(x + 7, y + 7, 3, 3);
        break;
      case 'stairs':
        g.fillStyle(0x444444, 0.7);
        g.fillRect(x + 2, y + 2, size - 4, size - 4);
        g.fillStyle(0x222222, 0.7);
        for (let i = 0; i < 3; i++) {
          g.fillRect(x + 4 + i * 4, y + 4 + i * 4, size - 8 - i * 8, 3);
        }
        break;
      case 'collectible':
        g.fillStyle(0x333333, 0.7);
        g.fillRect(x, y, size, size);
        const collectColors: Record<string, number> = { fossil: 0xddccaa, crystal: 0xaa88ff, relic: 0xffaa55 };
        g.fillStyle(collectColors[tile.collectibleType || 'fossil'] || 0xffffff, 0.7);
        g.fillRect(x + 6, y + 6, size - 12, size - 12);
        g.fillStyle(0xffffff, 0.6);
        g.fillRect(x + 8, y + 8, 3, 3);
        break;
      case 'empty':
        g.fillStyle(0x2a2a2a, 0.5);
        g.fillRect(x, y, size, size);
        break;
    }
  }

  private createPlayer(): void {
    const TILE = GAME_CONFIG.TILE_SIZE;
    this.player = this.add.rectangle(16 * TILE, 2 * TILE, TILE * 1.6, TILE * 1.6, 0x3366cc);
    this.player.setDepth(10);
    this.player.setStrokeStyle(2, 0x1a3366);
    this.physics.add.existing(this.player);
    (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    const size = MineSystem.FLOOR_SIZE * TILE;
    this.cameras.main.setBounds(0, 0, size, size);
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey('W'),
      A: this.input.keyboard!.addKey('A'),
      S: this.input.keyboard!.addKey('S'),
      D: this.input.keyboard!.addKey('D'),
    };
    this.input.keyboard!.on('keydown-ONE', () => { this.selectedTool = 'pickaxe'; });
    this.input.keyboard!.on('keydown-SPACE', () => this.usePickaxe());
    this.input.keyboard!.on('keydown-E', () => this.tryDescend());
    this.input.keyboard!.on('keydown-ESC', () => this.returnToFarm());
  }

  update(): void {
    this.handleMovement();
  }

  private handleMovement(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const speed = GAME_CONFIG.PLAYER_SPEED;
    let vx = 0, vy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) { vx = -speed; this.facing = 'left'; }
    else if (this.cursors.right.isDown || this.wasd.D.isDown) { vx = speed; this.facing = 'right'; }
    if (this.cursors.up.isDown || this.wasd.W.isDown) { vy = -speed; this.facing = 'up'; }
    else if (this.cursors.down.isDown || this.wasd.S.isDown) { vy = speed; this.facing = 'down'; }
    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }
    body.setVelocity(vx, vy);
  }

  private getFacingTile(): { row: number; col: number } {
    const TILE = GAME_CONFIG.TILE_SIZE;
    let tx = this.player.x, ty = this.player.y;
    switch (this.facing) {
      case 'up': ty -= TILE * 1.5; break;
      case 'down': ty += TILE * 1.5; break;
      case 'left': tx -= TILE * 1.5; break;
      case 'right': tx += TILE * 1.5; break;
    }
    return { row: Math.floor(ty / TILE), col: Math.floor(tx / TILE) };
  }

  private usePickaxe(): void {
    const { row, col } = this.getFacingTile();
    const size = MineSystem.FLOOR_SIZE;
    if (row < 0 || row >= size || col < 0 || col >= size) return;

    const tile = this.floorData.tiles[row][col];
    if (tile.type !== 'rock' && tile.type !== 'ore' && tile.type !== 'collectible') return;

    const cost = EnergySystem.getActionCost('MINE', this.saveData.pickaxeLevel);
    if (!EnergySystem.canPerform(this.saveData.energy, cost)) {
      this.showMessage('体力不足！');
      return;
    }

    if (tile.type === 'ore' && tile.oreType && !MineSystem.canMineOre(tile.oreType, this.saveData.pickaxeLevel)) {
      const names: Record<OreType, string> = { copper: '铜', iron: '铁', gold: '金' };
      this.showMessage(`需要${names[tile.oreType]}镐才能挖掘！`);
      return;
    }

    this.saveData.energy = EnergySystem.consume(this.saveData.energy, cost);
    const result = MineSystem.mineTile(tile, this.saveData.pickaxeLevel);

    if (result.drops.length > 0) {
      for (const drop of result.drops) {
        this.inventory.addItem({ id: drop.id, name: drop.name, type: 'crop', quantity: drop.quantity });
        this.showMessage(`获得 ${drop.name}！`);

        QuestSystem.updateProgress(this.saveData, 'mine', drop.id);
      }
    }

    const TILE = GAME_CONFIG.TILE_SIZE;
    this.drawMineTile(this.tileGraphics[row][col], tile, col * TILE, row * TILE, TILE);

    this.cameras.main.shake(100, 0.005);

    SaveSystem.save(this.saveData);
  }

  private tryDescend(): void {
    const { row, col } = this.getFacingTile();
    const size = MineSystem.FLOOR_SIZE;
    if (row < 0 || row >= size || col < 0 || col >= size) return;

    const tile = this.floorData.tiles[row][col];
    if (tile.type !== 'stairs') return;
    if (this.currentFloor >= 4) {
      this.showMessage('已到达最深层！');
      return;
    }

    this.currentFloor++;
    this.saveData.mineData.currentFloor = this.currentFloor;
    SaveSystem.save(this.saveData);

    this.scene.restart({ saveData: this.saveData });
  }

  private returnToFarm(): void {
    this.saveData.mineData.currentFloor = this.currentFloor;
    SaveSystem.save(this.saveData);
    this.scene.stop('UIScene');
    this.scene.start('FarmScene', { saveData: this.saveData });
  }

  private createMessageText(): void {
    this.messageText = this.add.text(
      MineSystem.FLOOR_SIZE * GAME_CONFIG.TILE_SIZE / 2,
      50,
      '',
      { fontSize: '16px', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 8, y: 4 } }
    ).setOrigin(0.5).setDepth(100).setAlpha(0);
  }

  private showMessage(msg: string): void {
    this.messageText.setText(msg);
    this.messageText.setAlpha(1);
    this.tweens.add({ targets: this.messageText, alpha: 0, duration: 2000, delay: 500 });
  }

  private createHUD(): void {
    this.add.text(10, 10, `矿洞 B${this.currentFloor + 1}`, { fontSize: '16px', color: '#ffd700' }).setScrollFactor(0).setDepth(100);
    this.add.text(10, 30, '空格:挖掘  E:下楼梯  ESC:返回', { fontSize: '12px', color: '#aaa' }).setScrollFactor(0).setDepth(100);
  }
}
