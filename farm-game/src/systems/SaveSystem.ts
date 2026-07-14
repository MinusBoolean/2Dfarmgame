import { SaveData } from '../types';
import { GAME_CONFIG } from '../config';

export class SaveSystem {
  private static readonly KEY = GAME_CONFIG.SAVE_KEY;
  private static readonly VERSION = GAME_CONFIG.SAVE_VERSION;

  static createDefault(): SaveData {
    const rows = GAME_CONFIG.FARM_ROWS;
    const cols = GAME_CONFIG.FARM_COLS;
    return {
      version: this.VERSION,
      gold: GAME_CONFIG.INITIAL_GOLD,
      totalEarned: 0,
      totalHarvested: 0,
      currentSeason: 0,
      currentDay: 1,
      currentWeather: 'sunny',
      tomorrowWeather: 'sunny',
      energy: GAME_CONFIG.INITIAL_ENERGY,
      maxEnergy: GAME_CONFIG.MAX_ENERGY,
      inventorySize: GAME_CONFIG.INITIAL_INVENTORY_SIZE,
      inventory: [
        { id: 'seed_carrot', name: '胡萝卜种子', type: 'seed', quantity: 5, cropId: 'carrot' },
        { id: 'seed_wheat', name: '小麦种子', type: 'seed', quantity: 5, cropId: 'wheat' },
      ],
      farmGrid: Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => ({
          state: 'empty' as const,
          wateredToday: false,
          consecutiveWaterDays: 0,
        }))
      ),
      toolLevels: { hoe: 1, wateringCan: 1 },
      unlockedCrops: ['carrot', 'wheat', 'spinach'],
      farmRating: 'copper',
      tutorialDay: 1,
      shippingBin: [],
      settings: {
        musicVolume: 0.7,
        sfxVolume: 0.8,
        timeSpeed: 1,
        smartToolSwitch: true,
      },
      mineData: {
        currentFloor: 0,
        floors: Array.from({ length: 5 }, () => ({
          tiles: [],
          discovered: false,
        })),
      },
      quests: [],
      completedQuests: 0,
      collectedItems: [],
      pickaxeLevel: 1,
      foragePositions: [],
      fruitTrees: [],
      paths: [],
      greenhouseUnlocked: false,
    };
  }

  static save(data: SaveData): void {
    try {
      data.version = this.VERSION;
      localStorage.setItem(this.KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Save failed:', e);
    }
  }

  static load(): SaveData {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return this.createDefault();
      const saved = JSON.parse(raw) as SaveData;
      return this.migrate(saved);
    } catch (e) {
      console.error('Load failed, creating default:', e);
      return this.createDefault();
    }
  }

  static clear(): void {
    localStorage.removeItem(this.KEY);
  }

  private static migrate(data: SaveData): SaveData {
    const defaults = this.createDefault();
    for (const key of Object.keys(defaults) as (keyof SaveData)[]) {
      if (data[key] === undefined) {
        (data as any)[key] = defaults[key];
      }
    }
    // Ensure farmGrid dimensions match current config
    if (!data.farmGrid || data.farmGrid.length !== GAME_CONFIG.FARM_ROWS) {
      data.farmGrid = defaults.farmGrid;
    }
    return data;
  }
}
