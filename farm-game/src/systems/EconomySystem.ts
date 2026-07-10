import { getCropById } from '../entities/CropConfig';
import { GAME_CONFIG } from '../config';

interface BuyResult {
  success: boolean;
  gold: number;
  inventory: Record<string, number>;
}

interface SellResult {
  success: boolean;
  gold: number;
  inventory: Record<string, number>;
  totalEarned: number;
}

export class EconomySystem {
  static buySeed(
    cropId: string,
    gold: number,
    inventory: Record<string, number>
  ): BuyResult {
    const crop = getCropById(cropId);
    if (!crop) return { success: false, gold, inventory };

    if (gold < crop.buyPrice) return { success: false, gold, inventory };

    const newInventory = { ...inventory };
    newInventory[cropId] = (newInventory[cropId] || 0) + 1;

    return {
      success: true,
      gold: gold - crop.buyPrice,
      inventory: newInventory
    };
  }

  static sellCrop(
    cropId: string,
    gold: number,
    inventory: Record<string, number>,
    totalEarned: number
  ): SellResult {
    const crop = getCropById(cropId);
    if (!crop) return { success: false, gold, inventory, totalEarned };

    const count = inventory[cropId] || 0;
    if (count <= 0) return { success: false, gold, inventory, totalEarned };

    const newInventory = { ...inventory };
    newInventory[cropId] = count - 1;
    if (newInventory[cropId] === 0) delete newInventory[cropId];

    return {
      success: true,
      gold: gold + crop.sellPrice,
      inventory: newInventory,
      totalEarned: totalEarned + crop.sellPrice
    };
  }

  static canUnlockTile(
    gold: number,
    currentUnlocked: number,
    cost: number
  ): boolean {
    return gold >= cost;
  }

  static getUnlockCost(currentUnlocked: number): number {
    return 100 + Math.floor(currentUnlocked / 4) * 100;
  }

  static getUnlockedCols(unlockedTiles: number): number {
    return Math.min(Math.ceil(Math.sqrt(unlockedTiles)), GAME_CONFIG.GRID_COLS);
  }

  static getUnlockedRows(unlockedTiles: number): number {
    const cols = EconomySystem.getUnlockedCols(unlockedTiles);
    return Math.min(Math.ceil(unlockedTiles / cols), GAME_CONFIG.GRID_ROWS);
  }
}
