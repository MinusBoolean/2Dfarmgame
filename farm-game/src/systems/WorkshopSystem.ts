import { WorkshopRecipe, SaveData } from '../types';
import { InventorySystem } from './InventorySystem';

export class WorkshopSystem {
  static readonly RECIPES: WorkshopRecipe[] = [
    { id: 'pickaxe_copper', name: '铜镐', description: '升级镐子到 2 级', materials: [{ itemId: 'ore_copper', quantity: 5 }], goldCost: 500, result: { type: 'tool_upgrade', tool: 'pickaxe' } },
    { id: 'pickaxe_iron', name: '铁镐', description: '升级镐子到 3 级', materials: [{ itemId: 'ore_iron', quantity: 3 }], goldCost: 1000, result: { type: 'tool_upgrade', tool: 'pickaxe' } },
    { id: 'hoe_copper', name: '铜锄头', description: '升级锄头到 2 级', materials: [{ itemId: 'ore_copper', quantity: 3 }], goldCost: 400, result: { type: 'tool_upgrade', tool: 'hoe' } },
    { id: 'hoe_iron', name: '铁锄头', description: '升级锄头到 3 级', materials: [{ itemId: 'ore_iron', quantity: 2 }], goldCost: 800, result: { type: 'tool_upgrade', tool: 'hoe' } },
    { id: 'watercan_copper', name: '铜水壶', description: '升级水壶到 2 级', materials: [{ itemId: 'ore_copper', quantity: 3 }], goldCost: 400, result: { type: 'tool_upgrade', tool: 'wateringCan' } },
    { id: 'watercan_iron', name: '铁水壶', description: '升级水壶到 3 级', materials: [{ itemId: 'ore_iron', quantity: 2 }], goldCost: 800, result: { type: 'tool_upgrade', tool: 'wateringCan' } },
    { id: 'inventory_expand', name: '背包扩展', description: '背包容量 +4 格', materials: [{ itemId: 'ore_iron', quantity: 2 }], goldCost: 500, result: { type: 'item', itemId: 'inventory_expand', quantity: 1 } },
    { id: 'bread', name: '面包', description: '恢复 30 体力', materials: [{ itemId: 'crop_wheat', quantity: 2 }], goldCost: 10, result: { type: 'item', itemId: 'food_bread', quantity: 1 } },
    { id: 'juice', name: '果汁', description: '恢复 50 体力', materials: [{ itemId: 'crop_carrot', quantity: 3 }], goldCost: 15, result: { type: 'item', itemId: 'food_juice', quantity: 1 } },
    { id: 'fertilizer_normal', name: '普通肥料', description: '品质 +1 级', materials: [{ itemId: 'ore_copper', quantity: 1 }], goldCost: 20, result: { type: 'item', itemId: 'fertilizer_normal', quantity: 1 } },
    { id: 'fertilizer_speed', name: '速效肥料', description: '生长时间 -25%', materials: [{ itemId: 'ore_iron', quantity: 1 }], goldCost: 50, result: { type: 'item', itemId: 'fertilizer_speed', quantity: 1 } },
    { id: 'scarecrow', name: '稻草人', description: '保护半径 5 格', materials: [{ itemId: 'ore_copper', quantity: 2 }], goldCost: 50, result: { type: 'item', itemId: 'scarecrow', quantity: 1 } },
  ];

  static getRecipes(): WorkshopRecipe[] { return this.RECIPES; }

  static canCraft(recipe: WorkshopRecipe, saveData: SaveData, inventory: InventorySystem): boolean {
    if (saveData.gold < recipe.goldCost) return false;
    for (const mat of recipe.materials) {
      if (inventory.getItemCount(mat.itemId) < mat.quantity) return false;
    }
    if (recipe.result.type === 'tool_upgrade') {
      const tool = recipe.result.tool!;
      if (tool === 'pickaxe') {
        if (recipe.id === 'pickaxe_copper' && saveData.pickaxeLevel >= 2) return false;
        if (recipe.id === 'pickaxe_iron' && (saveData.pickaxeLevel >= 3 || saveData.pickaxeLevel < 2)) return false;
      } else {
        const lvl = saveData.toolLevels[tool];
        if (recipe.id.includes('_copper') && lvl >= 2) return false;
        if (recipe.id.includes('_iron') && (lvl >= 3 || lvl < 2)) return false;
      }
    }
    return true;
  }

  static craft(recipe: WorkshopRecipe, saveData: SaveData, inventory: InventorySystem): boolean {
    if (!this.canCraft(recipe, saveData, inventory)) return false;
    for (const mat of recipe.materials) inventory.removeItem(mat.itemId, mat.quantity);
    saveData.gold -= recipe.goldCost;
    if (recipe.result.type === 'tool_upgrade') {
      const tool = recipe.result.tool!;
      if (tool === 'pickaxe') saveData.pickaxeLevel++;
      else saveData.toolLevels[tool]++;
    } else {
      const itemId = recipe.result.itemId!;
      const qty = recipe.result.quantity || 1;
      if (itemId === 'inventory_expand') {
        saveData.inventorySize = Math.min(40, saveData.inventorySize + 4);
        inventory.setSize(saveData.inventorySize);
      } else {
        const names: Record<string, string> = { food_bread: '面包', food_juice: '果汁', fertilizer_normal: '普通肥料', fertilizer_speed: '速效肥料', scarecrow: '稻草人' };
        const types: Record<string, string> = { food_bread: 'food', food_juice: 'food', fertilizer_normal: 'item', fertilizer_speed: 'item', scarecrow: 'scarecrow' };
        inventory.addItem({ id: itemId, name: names[itemId] || itemId, type: (types[itemId] || 'item') as any, quantity: qty });
      }
    }
    return true;
  }
}
