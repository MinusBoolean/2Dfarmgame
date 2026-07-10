import { CropConfig } from '../types';

export const CROPS: CropConfig[] = [
  {
    id: 'carrot',
    name: '胡萝卜',
    seedPrice: 10,
    sellPrice: 20,
    growthDays: 3,
    seasons: ['spring'],
    unlockCondition: { type: 'gold', amount: 0 },
    spriteFrames: { seed: 'crop_carrot_0', sprout: 'crop_carrot_1', growing: 'crop_carrot_2', mature: 'crop_carrot_3' },
  },
  {
    id: 'wheat',
    name: '小麦',
    seedPrice: 5,
    sellPrice: 12,
    growthDays: 4,
    seasons: ['spring', 'summer'],
    unlockCondition: { type: 'gold', amount: 0 },
    spriteFrames: { seed: 'crop_wheat_0', sprout: 'crop_wheat_1', growing: 'crop_wheat_2', mature: 'crop_wheat_3' },
  },
  {
    id: 'tomato',
    name: '番茄',
    seedPrice: 15,
    sellPrice: 35,
    growthDays: 5,
    seasons: ['spring', 'summer'],
    unlockCondition: { type: 'gold', amount: 200 },
    spriteFrames: { seed: 'crop_tomato_0', sprout: 'crop_tomato_1', growing: 'crop_tomato_2', mature: 'crop_tomato_3' },
  },
  {
    id: 'corn',
    name: '玉米',
    seedPrice: 20,
    sellPrice: 45,
    growthDays: 6,
    seasons: ['summer', 'autumn'],
    unlockCondition: { type: 'gold', amount: 500 },
    spriteFrames: { seed: 'crop_corn_0', sprout: 'crop_corn_1', growing: 'crop_corn_2', mature: 'crop_corn_3' },
  },
  {
    id: 'watermelon',
    name: '西瓜',
    seedPrice: 30,
    sellPrice: 65,
    growthDays: 8,
    seasons: ['summer'],
    unlockCondition: { type: 'gold', amount: 1000 },
    spriteFrames: { seed: 'crop_watermelon_0', sprout: 'crop_watermelon_1', growing: 'crop_watermelon_2', mature: 'crop_watermelon_3' },
  },
  {
    id: 'potato',
    name: '土豆',
    seedPrice: 12,
    sellPrice: 28,
    growthDays: 4,
    seasons: ['spring'],
    unlockCondition: { type: 'gold', amount: 150 },
    spriteFrames: { seed: 'crop_potato_0', sprout: 'crop_potato_1', growing: 'crop_potato_2', mature: 'crop_potato_3' },
  },
  {
    id: 'pumpkin',
    name: '南瓜',
    seedPrice: 25,
    sellPrice: 55,
    growthDays: 7,
    seasons: ['autumn'],
    unlockCondition: { type: 'gold', amount: 800 },
    spriteFrames: { seed: 'crop_pumpkin_0', sprout: 'crop_pumpkin_1', growing: 'crop_pumpkin_2', mature: 'crop_pumpkin_3' },
  },
  {
    id: 'strawberry',
    name: '草莓',
    seedPrice: 35,
    sellPrice: 75,
    growthDays: 6,
    seasons: ['spring'],
    unlockCondition: { type: 'gold', amount: 1500 },
    spriteFrames: { seed: 'crop_strawberry_0', sprout: 'crop_strawberry_1', growing: 'crop_strawberry_2', mature: 'crop_strawberry_3' },
  },
  {
    id: 'blueberry',
    name: '蓝莓',
    seedPrice: 40,
    sellPrice: 85,
    growthDays: 7,
    seasons: ['summer'],
    unlockCondition: { type: 'gold', amount: 2000 },
    spriteFrames: { seed: 'crop_blueberry_0', sprout: 'crop_blueberry_1', growing: 'crop_blueberry_2', mature: 'crop_blueberry_3' },
  },
  {
    id: 'pepper',
    name: '辣椒',
    seedPrice: 18,
    sellPrice: 40,
    growthDays: 5,
    seasons: ['summer', 'autumn'],
    unlockCondition: { type: 'gold', amount: 300 },
    spriteFrames: { seed: 'crop_pepper_0', sprout: 'crop_pepper_1', growing: 'crop_pepper_2', mature: 'crop_pepper_3' },
  },
  {
    id: 'eggplant',
    name: '茄子',
    seedPrice: 22,
    sellPrice: 50,
    growthDays: 6,
    seasons: ['summer', 'autumn'],
    unlockCondition: { type: 'gold', amount: 600 },
    spriteFrames: { seed: 'crop_eggplant_0', sprout: 'crop_eggplant_1', growing: 'crop_eggplant_2', mature: 'crop_eggplant_3' },
  },
  {
    id: 'spinach',
    name: '菠菜',
    seedPrice: 8,
    sellPrice: 18,
    growthDays: 3,
    seasons: ['spring', 'autumn'],
    unlockCondition: { type: 'gold', amount: 100 },
    spriteFrames: { seed: 'crop_spinach_0', sprout: 'crop_spinach_1', growing: 'crop_spinach_2', mature: 'crop_spinach_3' },
  },
];

export function getCropById(id: string): CropConfig | undefined {
  return CROPS.find(c => c.id === id);
}

export function getUnlockedCrops(totalEarned: number): CropConfig[] {
  return CROPS.filter(crop => {
    if (crop.unlockCondition.type === 'gold') return totalEarned >= crop.unlockCondition.amount;
    return false;
  });
}

export function isCropUnlocked(id: string, totalEarned: number): boolean {
  const crop = getCropById(id);
  if (!crop) return false;
  if (crop.unlockCondition.type === 'gold') return totalEarned >= crop.unlockCondition.amount;
  return false;
}
