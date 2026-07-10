import { TileData } from '../types';
import { getCropById } from '../entities/CropConfig';

export class GrowthSystem {
  static update(grid: TileData[][], currentTime: number): TileData[][] {
    const newGrid = grid.map(row => row.map(tile => ({ ...tile })));

    for (let row = 0; row < newGrid.length; row++) {
      for (let col = 0; col < newGrid[row].length; col++) {
        const tile = newGrid[row][col];
        if (tile.state === 'growing' && tile.cropId && tile.plantTime !== null) {
          const crop = getCropById(tile.cropId);
          if (crop) {
            const elapsed = (currentTime - tile.plantTime) / 1000;
            if (elapsed >= crop.growTime) {
              tile.state = 'mature';
            }
          }
        }
      }
    }

    return newGrid;
  }

  static getGrowthProgress(
    plantTime: number | null,
    growTime: number,
    currentTime: number
  ): number {
    if (plantTime === null) return 0;
    const elapsed = (currentTime - plantTime) / 1000;
    return Math.min(elapsed / growTime, 1);
  }
}
