import Phaser from 'phaser';
import { TileData } from '../types';
import { GAME_CONFIG } from '../config';
import { getCropById } from './CropConfig';

export class FarmTile extends Phaser.GameObjects.Rectangle {
  public row: number;
  public col: number;
  public tileData: TileData;

  constructor(
    scene: Phaser.Scene,
    row: number,
    col: number,
    tileData: TileData
  ) {
    const x = GAME_CONFIG.GRID_OFFSET_X + col * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
    const y = GAME_CONFIG.GRID_OFFSET_Y + row * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;

    super(scene, x, y, GAME_CONFIG.TILE_SIZE - 2, GAME_CONFIG.TILE_SIZE - 2);

    this.row = row;
    this.col = col;
    this.tileData = { ...tileData };

    this.setStrokeStyle(1, 0x3a6c2f);
    this.setInteractive();
    this.updateAppearance();
    scene.add.existing(this);
  }

  setTileData(data: TileData): void {
    this.tileData = { ...data };
    this.updateAppearance();
  }

  updateAppearance(): void {
    switch (this.tileData.state) {
      case 'empty':
        this.setFillStyle(GAME_CONFIG.COLORS.GRASS);
        break;
      case 'plowed':
        this.setFillStyle(GAME_CONFIG.COLORS.PLOWED);
        break;
      case 'growing': {
        const crop = this.tileData.cropId ? getCropById(this.tileData.cropId) : null;
        if (crop) {
          const elapsed = this.tileData.plantTime
            ? (this.scene.time.now - this.tileData.plantTime) / 1000
            : 0;
          const progress = Math.min(elapsed / crop.growTime, 1);
          const r = (crop.tileColor >> 16) & 0xff;
          const g = (crop.tileColor >> 8) & 0xff;
          const b = crop.tileColor & 0xff;
          const mr = (crop.matureColor >> 16) & 0xff;
          const mg = (crop.matureColor >> 8) & 0xff;
          const mb = crop.matureColor & 0xff;
          const cr = Math.floor(r + (mr - r) * progress);
          const cg = Math.floor(g + (mg - g) * progress);
          const cb = Math.floor(b + (mb - b) * progress);
          this.setFillStyle((cr << 16) | (cg << 8) | cb);
        } else {
          this.setFillStyle(GAME_CONFIG.COLORS.GROWING);
        }
        break;
      }
      case 'mature': {
        const crop = this.tileData.cropId ? getCropById(this.tileData.cropId) : null;
        this.setFillStyle(crop ? crop.matureColor : GAME_CONFIG.COLORS.GROWING);
        break;
      }
    }
  }

  highlight(active: boolean): void {
    if (active) {
      this.setStrokeStyle(3, 0xffffff);
    } else {
      this.setStrokeStyle(1, 0x3a6c2f);
    }
  }

  isUnlocked(currentUnlockedTiles: number): boolean {
    const cols = Math.min(Math.ceil(Math.sqrt(currentUnlockedTiles)), GAME_CONFIG.GRID_COLS);
    const rows = Math.min(Math.ceil(currentUnlockedTiles / cols), GAME_CONFIG.GRID_ROWS);
    return this.row < rows && this.col < cols;
  }

  getWorldX(): number {
    return GAME_CONFIG.GRID_OFFSET_X + this.col * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
  }

  getWorldY(): number {
    return GAME_CONFIG.GRID_OFFSET_Y + this.row * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
  }
}
