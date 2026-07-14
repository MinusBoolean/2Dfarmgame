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

  private tileSprites: Phaser.GameObjects.TileSprite[][] = [];
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

    this.tileSprites = [];
    for (let row = 0; row < size; row++) {
      this.tileSprites[row] = [];
      for (let col = 0; col < size; col++) {
        const x = col * TILE;
        const y = row * TILE;
        const tile = this.floorData.tiles[row][col];
        const textureKey = this.getMineTextureKey(tile);
        const ts = this.add.tileSprite(x, y, TILE, TILE, textureKey);
        ts.setOrigin(0, 0);
        ts.setDepth(1);
        this.tileSprites[row][col] = ts;
      }
    }
  }

  private getMineTextureKey(tile: MineTileData): string {
    switch (tile.type) {
      case 'rock': return 'tile_mine_rock';
      case 'ore':
        switch (tile.oreType) {
          case 'copper': return 'tile_copper';
          case 'iron': return 'tile_iron';
          case 'gold': return 'tile_gold';
          default: return 'tile_mine_rock';
        }
      case 'stairs': return 'tile_stairs';
      case 'collectible':
        switch (tile.collectibleType) {
          case 'fossil': return 'tile_fossil';
          case 'crystal': return 'tile_crystal';
          default: return 'tile_fossil';
        }
      case 'empty': return 'tile_mine_rock';
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
    const textureKey = this.getMineTextureKey(tile);
    this.tileSprites[row][col].setTexture(textureKey);

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
