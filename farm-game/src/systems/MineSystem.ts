import { MineFloorData, MineTileData, OreType } from '../types';

export class MineSystem {
  static readonly FLOOR_SIZE = 32;

  static generateFloor(floorNumber: number): MineFloorData {
    const size = this.FLOOR_SIZE;
    const tiles: MineTileData[][] = [];

    for (let row = 0; row < size; row++) {
      tiles[row] = [];
      for (let col = 0; col < size; col++) {
        const rand = Math.random();
        if (rand < 0.60) {
          tiles[row][col] = { type: 'rock', hitsRemaining: 3 };
        } else if (rand < 0.75) {
          const oreType = this.getOreForFloor(floorNumber);
          tiles[row][col] = { type: 'ore', oreType, hitsRemaining: 3 };
        } else if (rand < 0.80) {
          tiles[row][col] = { type: 'stairs', hitsRemaining: 0 };
        } else if (rand < 0.85) {
          const collectible = this.getCollectible();
          tiles[row][col] = { type: 'collectible', collectibleType: collectible, hitsRemaining: 1 };
        } else {
          tiles[row][col] = { type: 'empty', hitsRemaining: 0 };
        }
      }
    }

    // Entrance area clear
    for (let r = 0; r < 3; r++) {
      for (let c = 14; c < 18; c++) {
        tiles[r][c] = { type: 'empty', hitsRemaining: 0 };
      }
    }
    // Stairs accessible
    const stairRow = size - 3;
    const stairCol = Math.floor(size / 2);
    tiles[stairRow][stairCol] = { type: 'stairs', hitsRemaining: 0 };
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = stairRow + dr, c = stairCol + dc;
        if (r >= 0 && r < size && c >= 0 && c < size) {
          tiles[r][c] = { type: 'empty', hitsRemaining: 0 };
        }
      }
    }

    return { tiles, discovered: true };
  }

  static getOreForFloor(floor: number): OreType {
    const rand = Math.random();
    if (floor <= 2) return rand < 0.7 ? 'copper' : 'iron';
    if (floor <= 3) return rand < 0.4 ? 'copper' : rand < 0.8 ? 'iron' : 'gold';
    return rand < 0.2 ? 'copper' : rand < 0.6 ? 'iron' : 'gold';
  }

  static getCollectible(): string {
    const rand = Math.random();
    if (rand < 0.5) return 'fossil';
    if (rand < 0.8) return 'crystal';
    return 'relic';
  }

  static mineTile(tile: MineTileData, pickaxeLevel: number): { success: boolean; drops: { id: string; name: string; quantity: number }[] } {
    if (tile.hitsRemaining <= 0) return { success: false, drops: [] };
    tile.hitsRemaining--;
    if (tile.hitsRemaining > 0) return { success: true, drops: [] };

    const drops: { id: string; name: string; quantity: number }[] = [];
    if (tile.type === 'ore' && tile.oreType) {
      const names: Record<OreType, string> = { copper: '铜矿', iron: '铁矿', gold: '金矿' };
      drops.push({ id: `ore_${tile.oreType}`, name: names[tile.oreType], quantity: 1 });
    } else if (tile.type === 'collectible' && tile.collectibleType) {
      const names: Record<string, string> = { fossil: '化石', crystal: '水晶', relic: '古代遗物' };
      drops.push({ id: `collectible_${tile.collectibleType}`, name: names[tile.collectibleType], quantity: 1 });
    }
    tile.type = 'empty';
    return { success: true, drops };
  }

  static canMineOre(oreType: OreType, pickaxeLevel: number): boolean {
    const req: Record<OreType, number> = { copper: 1, iron: 2, gold: 3 };
    return pickaxeLevel >= req[oreType];
  }
}
