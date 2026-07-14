import Phaser from 'phaser';
import { GAME_CONFIG } from '../config';
import { SaveData, FishData } from '../types';
import { SaveSystem } from '../systems/SaveSystem';
import { FishingSystem } from '../systems/FishingSystem';
import { InventorySystem } from '../systems/InventorySystem';
import { SeasonSystem } from '../systems/SeasonSystem';
import { WeatherSystem } from '../systems/WeatherSystem';
import { EnergySystem } from '../systems/EnergySystem';

export class PondScene extends Phaser.Scene {
  private saveData!: SaveData;
  private inventory!: InventorySystem;
  private isFishing: boolean = false;
  private fishPointer!: Phaser.GameObjects.Rectangle;
  private fishBar!: Phaser.GameObjects.Rectangle;
  private fishSpeed: number = 3;
  private fishDirection: number = 1;
  private successZone!: Phaser.GameObjects.Rectangle;
  private messageText!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'PondScene' }); }

  init(data: { saveData: SaveData }): void {
    this.saveData = data.saveData;
    this.inventory = new InventorySystem(this.saveData.inventory, this.saveData.inventorySize);
  }

  create(): void {
    this.createPondMap();
    this.createPlayer();
    this.createFishingUI();
    this.createMessageText();
    this.setupInput();

    this.add.text(400, 20, '池塘 — 走到钓鱼点按 E 开始钓鱼', { fontSize: '14px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0);
    this.add.text(400, 40, 'ESC 返回农场', { fontSize: '12px', color: '#aaa' }).setOrigin(0.5).setScrollFactor(0);
  }

  private createPondMap(): void {
    const TILE = GAME_CONFIG.TILE_SIZE;

    // Grass background (entire area)
    const grassBg = this.add.tileSprite(0, 0, 32 * TILE, 32 * TILE, 'tile_grass');
    grassBg.setOrigin(0, 0);
    grassBg.setDepth(-1);

    // Pond water (center area)
    const waterBg = this.add.tileSprite(10 * TILE, 10 * TILE, 12 * TILE, 12 * TILE, 'tile_water');
    waterBg.setOrigin(0, 0);
    waterBg.setDepth(0);

    // Fishing spots (dock tiles around pond edge)
    const spots = [
      { r: 10, c: 9 }, { r: 15, c: 9 }, { r: 20, c: 9 },
      { r: 10, c: 22 }, { r: 15, c: 22 }, { r: 20, c: 22 },
    ];
    for (const spot of spots) {
      const dock = this.add.tileSprite(spot.c * TILE, spot.r * TILE, TILE, TILE, 'tile_dock');
      dock.setOrigin(0, 0);
      dock.setDepth(1);
    }

    this.physics.world.setBounds(0, 0, 32 * TILE, 32 * TILE);
  }

  private player!: Phaser.GameObjects.Rectangle;

  private createPlayer(): void {
    const TILE = GAME_CONFIG.TILE_SIZE;
    this.player = this.add.rectangle(5 * TILE, 15 * TILE, TILE * 1.6, TILE * 1.6, 0x3366cc);
    this.player.setDepth(10);
    this.physics.add.existing(this.player);
    (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, 32 * TILE, 32 * TILE);
  }

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  private createFishingUI(): void {
    // Fishing bar (hidden initially)
    this.fishBar = this.add.rectangle(750, 300, 20, 200, 0x333333).setScrollFactor(0).setDepth(200).setVisible(false);
    this.successZone = this.add.rectangle(750, 300, 20, 40, 0x44cc44).setScrollFactor(0).setDepth(201).setVisible(false);
    this.fishPointer = this.add.rectangle(750, 200, 20, 8, 0xff4444).setScrollFactor(0).setDepth(202).setVisible(false);
  }

  private createMessageText(): void {
    this.messageText = this.add.text(400, 400, '', { fontSize: '16px', color: '#fff', backgroundColor: '#000000aa', padding: { x: 8, y: 4 } }).setOrigin(0.5).setDepth(300).setAlpha(0);
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.input.keyboard!.addKey('W').on('down', () => this.movePlayer(0, -1));
    this.input.keyboard!.addKey('S').on('down', () => this.movePlayer(0, 1));
    this.input.keyboard!.addKey('A').on('down', () => this.movePlayer(-1, 0));
    this.input.keyboard!.addKey('D').on('down', () => this.movePlayer(1, 0));
    this.input.keyboard!.on('keydown-SPACE', () => this.handleFishingAction());
    this.input.keyboard!.on('keydown-ESC', () => this.returnToFarm());
  }

  private movePlayer(dx: number, dy: number): void {
    if (this.isFishing) return;
    const TILE = GAME_CONFIG.TILE_SIZE;
    this.player.x += dx * TILE;
    this.player.y += dy * TILE;
  }

  private handleFishingAction(): void {
    if (!this.isFishing) {
      this.tryStartFishing();
    } else {
      this.catchFish();
    }
  }

  private tryStartFishing(): void {
    const TILE = GAME_CONFIG.TILE_SIZE;
    const row = Math.floor(this.player.y / TILE);
    const col = Math.floor(this.player.x / TILE);

    // Check if near fishing spot
    const isFishingSpot = (row >= 9 && row <= 11 && col >= 8 && col <= 10) ||
                          (row >= 14 && row <= 16 && col >= 8 && col <= 10) ||
                          (row >= 19 && row <= 21 && col >= 8 && col <= 10) ||
                          (row >= 9 && row <= 11 && col >= 21 && col <= 23) ||
                          (row >= 14 && row <= 16 && col >= 21 && col <= 23) ||
                          (row >= 19 && row <= 21 && col >= 21 && col <= 23);

    if (!isFishingSpot) {
      this.showMessage('走到钓鱼点旁边再按空格');
      return;
    }

    this.startFishing();
  }

  private startFishing(): void {
    this.isFishing = true;
    this.fishBar.setVisible(true);
    this.successZone.setVisible(true);
    this.fishPointer.setVisible(true);

    // Random success zone position
    const zoneY = 220 + Math.random() * 160;
    this.successZone.setY(zoneY);
    this.fishPointer.setY(200);
    this.fishSpeed = 2 + Math.random() * 3;
    this.fishDirection = 1;

    this.showMessage('钓鱼中... 按空格在绿色区域停下！');
  }

  update(_time: number, _delta: number): void {
    if (this.isFishing) {
      this.fishPointer.y += this.fishSpeed * this.fishDirection;
      if (this.fishPointer.y >= 400) this.fishDirection = -1;
      if (this.fishPointer.y <= 200) this.fishDirection = 1;
    }
  }

  private catchFish(): void {
    this.isFishing = false;
    this.fishBar.setVisible(false);
    this.successZone.setVisible(false);
    this.fishPointer.setVisible(false);

    const cost = EnergySystem.getActionCost('FISH', 1);
    if (!EnergySystem.canPerform(this.saveData.energy, cost)) {
      this.showMessage('体力不足！');
      return;
    }
    this.saveData.energy = EnergySystem.consume(this.saveData.energy, cost);

    // Check if pointer is in success zone
    const pointerY = this.fishPointer.y;
    const zoneY = this.successZone.y;
    const distance = Math.abs(pointerY - zoneY);
    const accuracy = Math.max(0, 1 - distance / 100);

    const season = SeasonSystem.getSeason(this.saveData.currentSeason);
    const fish = FishingSystem.catchFish(season, this.saveData.currentWeather, accuracy);

    if (fish) {
      this.inventory.addItem({ id: `fish_${fish.id}`, name: fish.name, type: 'fish', quantity: 1, fishId: fish.id });
      this.showMessage(`钓到 ${fish.name}！(售价 ${fish.sellPrice}G)`);
    } else {
      this.showMessage('鱼跑掉了...');
    }

    SaveSystem.save(this.saveData);
  }

  private returnToFarm(): void {
    SaveSystem.save(this.saveData);
    this.scene.stop('UIScene');
    this.scene.start('FarmScene', { saveData: this.saveData });
  }

  private showMessage(msg: string): void {
    this.messageText.setText(msg);
    this.messageText.setAlpha(1);
    this.tweens.add({ targets: this.messageText, alpha: 0, duration: 2000, delay: 1000 });
  }
}
