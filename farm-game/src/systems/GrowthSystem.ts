import { TileSaveData, Season, Weather, QualityTier } from '../types';
import { getCropById } from '../entities/CropConfig';

export class GrowthSystem {
  static processDay(tile: TileSaveData, season: Season): boolean {
    if (tile.state !== 'planted' && tile.state !== 'growing') return false;
    const crop = getCropById(tile.cropId || '');
    if (!crop) return false;
    if (!crop.seasons.includes(season)) {
      tile.state = 'dead';
      return true;
    }
    if (!tile.wateredToday) {
      tile.consecutiveWaterDays = 0;
      return false;
    }
    tile.consecutiveWaterDays++;
    return true;
  }

  static advanceGreenhouseTile(tile: TileSaveData): void {
    if (tile.state !== 'planted' && tile.state !== 'growing') return;
    const crop = getCropById(tile.cropId || '');
    if (!crop) return;
    tile.wateredToday = true;
    tile.consecutiveWaterDays++;
    this.advanceGrowth(tile, 1);
  }

  static advanceGrowth(tile: TileSaveData, daysPassed: number): void {
    if (tile.state !== 'planted' && tile.state !== 'growing') return;
    const crop = getCropById(tile.cropId || '');
    if (!crop || !tile.plantTime) return;
    const totalDays = tile.consecutiveWaterDays;
    if (totalDays >= crop.growthDays) {
      tile.state = 'mature';
      tile.quality = this.calculateQuality(tile.consecutiveWaterDays);
    } else if (totalDays >= Math.ceil(crop.growthDays / 2)) {
      tile.state = 'growing';
    }
  }

  static resetDayTiles(tiles: TileSaveData[][], weather: Weather): void {
    for (const row of tiles) {
      for (const tile of row) {
        if (weather === 'rainy' || weather === 'stormy') {
          tile.wateredToday = true;
        } else {
          tile.wateredToday = false;
        }
      }
    }
  }

  private static calculateQuality(waterDays: number): QualityTier {
    if (waterDays >= 14) return 'iridium';
    if (waterDays >= 7) return 'gold';
    if (waterDays >= 3) return 'silver';
    return 'normal';
  }
}
