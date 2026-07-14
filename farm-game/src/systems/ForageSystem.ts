import { ForageItem, Season } from '../types';
import { GAME_CONFIG } from '../config';

export class ForageSystem {
  static readonly ITEMS: ForageItem[] = [
    { id: 'wildflower', name: '野花', seasons: ['spring'], probability: 0.30, sellPrice: 10 },
    { id: 'mushroom', name: '蘑菇', seasons: ['autumn'], probability: 0.25, sellPrice: 20 },
    { id: 'shell', name: '贝壳', seasons: ['summer'], probability: 0.20, sellPrice: 15 },
    { id: 'pinecone', name: '松果', seasons: ['winter'], probability: 0.20, sellPrice: 12 },
    { id: 'berry', name: '浆果', seasons: ['spring', 'summer'], probability: 0.15, sellPrice: 25 },
    { id: 'orchid', name: '稀有兰花', seasons: ['spring', 'summer', 'autumn', 'winter'], probability: 0.05, sellPrice: 100 },
  ];

  static generateDailyForage(season: Season): { id: string; row: number; col: number }[] {
    const count = 3 + Math.floor(Math.random() * 3);
    const items: { id: string; row: number; col: number }[] = [];

    const available = this.ITEMS.filter(i => i.seasons.includes(season));

    for (let i = 0; i < count; i++) {
      const roll = Math.random();
      let cumulative = 0;
      let selected = available[0];
      for (const item of available) {
        cumulative += item.probability;
        if (roll <= cumulative) { selected = item; break; }
      }

      let row: number, col: number;
      do {
        row = Math.floor(Math.random() * GAME_CONFIG.FARM_ROWS);
        col = Math.floor(Math.random() * GAME_CONFIG.FARM_COLS);
      } while (row >= 10 && row < 30 && col >= 10 && col < 35);

      items.push({ id: selected.id, row, col });
    }

    return items;
  }

  static getItemById(id: string): ForageItem | undefined {
    return this.ITEMS.find(i => i.id === id);
  }
}
