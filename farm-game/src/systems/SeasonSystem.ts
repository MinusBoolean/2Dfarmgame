import { Season } from '../types';
import { GAME_CONFIG } from '../config';

export class SeasonSystem {
  static readonly SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];

  static getSeason(index: number): Season {
    return this.SEASONS[index % 4];
  }

  static getSeasonName(season: Season): string {
    const map: Record<Season, string> = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
    return map[season];
  }

  static advanceDay(currentSeason: number, currentDay: number): { season: number; day: number; seasonChanged: boolean } {
    let day = currentDay + 1;
    let season = currentSeason;
    let seasonChanged = false;
    if (day > GAME_CONFIG.SEASON_DAYS) {
      day = 1;
      season = (season + 1) % 4;
      seasonChanged = true;
    }
    return { season, day, seasonChanged };
  }
}
