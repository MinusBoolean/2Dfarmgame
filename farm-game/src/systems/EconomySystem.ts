import { QualityTier, SaveData } from '../types';
import { getCropById } from '../entities/CropConfig';
import { InventorySystem } from './InventorySystem';

export class EconomySystem {
  static buySeed(saveData: SaveData, inventory: InventorySystem, cropId: string): boolean {
    const crop = getCropById(cropId);
    if (!crop || saveData.gold < crop.seedPrice) return false;
    const seedId = `seed_${cropId}`;
    const added = inventory.addItem({ id: seedId, name: `${crop.name}种子`, type: 'seed', quantity: 1, cropId });
    if (!added) return false;
    saveData.gold -= crop.seedPrice;
    return true;
  }

  static sellItem(saveData: SaveData, inventory: InventorySystem, itemId: string, quality?: QualityTier): boolean {
    const item = inventory.getItems().find(i => i.id === itemId && (!quality || i.quality === quality));
    if (!item || item.type !== 'crop') return false;
    const crop = getCropById(item.cropId || '');
    if (!crop) return false;
    const qualityMultiplier = this.getQualityMultiplier(quality || 'normal');
    const price = Math.floor(crop.sellPrice * qualityMultiplier);
    inventory.removeItem(itemId, 1, quality);
    saveData.gold += price;
    saveData.totalEarned += price;
    return true;
  }

  static buyFood(saveData: SaveData, inventory: InventorySystem): boolean {
    if (saveData.gold < 20) return false;
    if (!inventory.addItem({ id: 'food_bread', name: '面包', type: 'food', quantity: 1 })) return false;
    saveData.gold -= 20;
    return true;
  }

  static buyScarecrow(saveData: SaveData, inventory: InventorySystem): boolean {
    if (saveData.gold < 50) return false;
    if (!inventory.addItem({ id: 'scarecrow', name: '稻草人', type: 'scarecrow', quantity: 1 })) return false;
    saveData.gold -= 50;
    return true;
  }

  static upgradeTool(saveData: SaveData, tool: 'hoe' | 'wateringCan'): boolean {
    const currentLevel = saveData.toolLevels[tool];
    if (currentLevel >= 3) return false;
    const cost = currentLevel * 500;
    if (saveData.gold < cost) return false;
    saveData.gold -= cost;
    saveData.toolLevels[tool]++;
    return true;
  }

  static expandInventory(saveData: SaveData): boolean {
    if (saveData.inventorySize >= 40) return false;
    if (saveData.gold < 500) return false;
    saveData.gold -= 500;
    saveData.inventorySize += 4;
    return true;
  }

  private static getQualityMultiplier(quality: QualityTier): number {
    const map: Record<QualityTier, number> = { normal: 1, silver: 1.25, gold: 1.5, iridium: 2 };
    return map[quality];
  }
}
