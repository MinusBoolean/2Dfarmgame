export type TileState = 'empty' | 'plowed' | 'planted' | 'growing' | 'mature' | 'dead';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Weather = 'sunny' | 'rainy' | 'stormy' | 'foggy' | 'snowy';
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';
export type QualityTier = 'normal' | 'silver' | 'gold' | 'iridium';
export type FarmRating = 'copper' | 'silver' | 'gold' | 'iridium';
export type ToolType = 'hoe' | 'wateringCan' | 'food';

export interface CropConfig {
  id: string;
  name: string;
  seedPrice: number;
  sellPrice: number;
  growthDays: number;
  seasons: Season[];
  unlockCondition: { type: 'gold'; amount: number } | { type: 'rating'; rating: FarmRating };
  spriteFrames: {
    seed: string;
    sprout: string;
    growing: string;
    mature: string;
  };
}

export interface InventoryItem {
  id: string;
  name: string;
  type: 'seed' | 'crop' | 'food' | 'scarecrow';
  quantity: number;
  quality?: QualityTier;
  cropId?: string;
}

export interface TileSaveData {
  state: TileState;
  cropId?: string;
  plantTime?: number;
  wateredToday: boolean;
  consecutiveWaterDays: number;
  quality?: QualityTier;
}

export interface SaveData {
  version: number;
  gold: number;
  totalEarned: number;
  totalHarvested: number;
  currentSeason: number;
  currentDay: number;
  currentWeather: Weather;
  tomorrowWeather: Weather;
  energy: number;
  maxEnergy: number;
  inventorySize: number;
  inventory: InventoryItem[];
  farmGrid: TileSaveData[][];
  toolLevels: { hoe: number; wateringCan: number };
  unlockedCrops: string[];
  farmRating: FarmRating;
  tutorialDay: number;
  shippingBin: InventoryItem[];
  settings: {
    musicVolume: number;
    sfxVolume: number;
    timeSpeed: number;
    smartToolSwitch: boolean;
  };
}
