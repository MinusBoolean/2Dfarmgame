import { CropConfig } from '../types';

export const CROPS: CropConfig[] = [
  {
    id: 'carrot',
    name: '萝卜',
    growthStages: 3,
    growTime: 3,
    buyPrice: 5,
    sellPrice: 15,
    unlockGold: 0,
    tileColor: 0x8b6914,
    matureColor: 0xff6b35
  },
  {
    id: 'wheat',
    name: '小麦',
    growthStages: 3,
    growTime: 6,
    buyPrice: 10,
    sellPrice: 30,
    unlockGold: 0,
    tileColor: 0x8b6914,
    matureColor: 0xf5d742
  },
  {
    id: 'corn',
    name: '玉米',
    growthStages: 4,
    growTime: 9,
    buyPrice: 25,
    sellPrice: 70,
    unlockGold: 100,
    tileColor: 0x8b6914,
    matureColor: 0xffcc00
  },
  {
    id: 'tomato',
    name: '番茄',
    growthStages: 4,
    growTime: 12,
    buyPrice: 50,
    sellPrice: 130,
    unlockGold: 300,
    tileColor: 0x8b6914,
    matureColor: 0xff4444
  },
  {
    id: 'watermelon',
    name: '西瓜',
    growthStages: 5,
    growTime: 18,
    buyPrice: 100,
    sellPrice: 250,
    unlockGold: 800,
    tileColor: 0x8b6914,
    matureColor: 0x2d8b2d
  }
];

export function getCropById(id: string): CropConfig | undefined {
  return CROPS.find(c => c.id === id);
}

export function getUnlockedCrops(totalEarned: number, alreadyUnlocked: string[]): CropConfig[] {
  return CROPS.filter(c => c.unlockGold <= totalEarned || alreadyUnlocked.includes(c.id));
}

export function getDefaultUnlockedCrops(): string[] {
  return CROPS.filter(c => c.unlockGold === 0).map(c => c.id);
}
