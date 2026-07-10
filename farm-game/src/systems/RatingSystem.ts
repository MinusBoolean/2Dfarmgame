import { FarmRating, SaveData } from '../types';

export class RatingSystem {
  static readonly RATINGS: { rating: FarmRating; harvestNeeded: number; goldNeeded: number; unlocks: string[] }[] = [
    { rating: 'copper', harvestNeeded: 0, goldNeeded: 0, unlocks: ['carrot', 'wheat', 'spinach'] },
    { rating: 'silver', harvestNeeded: 50, goldNeeded: 500, unlocks: ['tomato', 'potato', 'pepper'] },
    { rating: 'gold', harvestNeeded: 200, goldNeeded: 5000, unlocks: ['corn', 'pumpkin', 'eggplant'] },
    { rating: 'iridium', harvestNeeded: 500, goldNeeded: 20000, unlocks: ['watermelon', 'strawberry', 'blueberry'] },
  ];

  static checkRating(saveData: SaveData): FarmRating {
    let newRating: FarmRating = 'copper';
    for (const r of this.RATINGS) {
      if (saveData.totalHarvested >= r.harvestNeeded && saveData.totalEarned >= r.goldNeeded) {
        newRating = r.rating;
        for (const cropId of r.unlocks) {
          if (!saveData.unlockedCrops.includes(cropId)) {
            saveData.unlockedCrops.push(cropId);
          }
        }
      }
    }
    return newRating;
  }

  static getRatingName(rating: FarmRating): string {
    const map: Record<FarmRating, string> = { copper: '铜', silver: '银', gold: '金', iridium: '铱' };
    return map[rating];
  }
}
