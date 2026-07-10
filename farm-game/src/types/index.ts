export type TileState = 'empty' | 'plowed' | 'growing' | 'mature';

export interface CropConfig {
  id: string;
  name: string;
  growthStages: number;
  growTime: number;
  buyPrice: number;
  sellPrice: number;
  unlockGold: number;
  tileColor: number;
  matureColor: number;
}

export interface TileData {
  state: TileState;
  cropId: string | null;
  plantTime: number | null;
}

export interface SaveData {
  gold: number;
  totalEarned: number;
  inventory: Record<string, number>;
  farmGrid: TileData[][];
  unlockedTiles: number;
  unlockedCrops: string[];
  lastSaveTime: number;
}

export enum ToolType {
  PLOW = 'plow',
  SEED = 'seed',
  WATER = 'water',
  HARVEST = 'harvest'
}
