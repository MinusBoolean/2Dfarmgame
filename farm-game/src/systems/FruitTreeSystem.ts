import { FruitTreeData, Season } from '../types';

export class FruitTreeSystem {
  static readonly TREES: FruitTreeData[] = [
    { id: 'apple', name: '苹果树', price: 500, growthDays: 28, fruitId: 'fruit_apple', fruitName: '苹果', fruitSellPrice: 50, seasons: ['spring'] },
    { id: 'peach', name: '桃树', price: 600, growthDays: 28, fruitId: 'fruit_peach', fruitName: '桃子', fruitSellPrice: 60, seasons: ['summer'] },
    { id: 'cherry', name: '樱桃树', price: 400, growthDays: 28, fruitId: 'fruit_cherry', fruitName: '樱桃', fruitSellPrice: 45, seasons: ['spring'] },
  ];

  static getTreeById(id: string): FruitTreeData | undefined {
    return this.TREES.find(t => t.id === id);
  }

  static getGrowthProgress(tree: { id: string; plantDay: number }, currentDay: number): number {
    const t = this.getTreeById(tree.id);
    if (!t) return 0;
    return Math.min(1, (currentDay - tree.plantDay) / t.growthDays);
  }

  static isMature(tree: { id: string; plantDay: number }, currentDay: number): boolean {
    const t = this.getTreeById(tree.id);
    if (!t) return false;
    return currentDay - tree.plantDay >= t.growthDays;
  }

  static canHarvest(tree: { id: string; lastHarvestDay: number }, currentDay: number, season: Season): boolean {
    const t = this.getTreeById(tree.id);
    if (!t) return false;
    if (!t.seasons.includes(season)) return false;
    return currentDay > tree.lastHarvestDay;
  }
}
