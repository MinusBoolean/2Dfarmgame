import { SaveData, TileData } from '../types';
import { GAME_CONFIG } from '../config';
import { getDefaultUnlockedCrops } from '../entities/CropConfig';

export class SaveSystem {
  static load(): SaveData | null {
    try {
      const raw = localStorage.getItem(GAME_CONFIG.SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as SaveData;
      if (typeof data.gold !== 'number' || !Array.isArray(data.farmGrid)) {
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  static save(data: SaveData): void {
    data.lastSaveTime = Date.now();
    localStorage.setItem(GAME_CONFIG.SAVE_KEY, JSON.stringify(data));
  }

  static clear(): void {
    localStorage.removeItem(GAME_CONFIG.SAVE_KEY);
  }

  static hasSave(): boolean {
    return localStorage.getItem(GAME_CONFIG.SAVE_KEY) !== null;
  }

  static createDefaultSaveData(): SaveData {
    const grid: TileData[][] = [];
    for (let row = 0; row < GAME_CONFIG.GRID_ROWS; row++) {
      grid[row] = [];
      for (let col = 0; col < GAME_CONFIG.GRID_COLS; col++) {
        grid[row][col] = {
          state: 'empty',
          cropId: null,
          plantTime: null
        };
      }
    }

    return {
      gold: GAME_CONFIG.INITIAL_GOLD,
      totalEarned: 0,
      inventory: {},
      farmGrid: grid,
      unlockedTiles: GAME_CONFIG.INITIAL_UNLOCKED_TILES,
      unlockedCrops: getDefaultUnlockedCrops(),
      lastSaveTime: Date.now()
    };
  }
}
