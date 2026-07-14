import { FishData, Season, Weather } from '../types';

export class FishingSystem {
  static readonly FISH: FishData[] = [
    { id: 'carp', name: '鲤鱼', seasons: ['spring', 'summer', 'autumn', 'winter'], weather: ['sunny', 'rainy', 'stormy', 'foggy', 'snowy'], probability: 0.30, sellPrice: 15 },
    { id: 'bass', name: '鲈鱼', seasons: ['spring', 'summer'], weather: ['sunny'], probability: 0.20, sellPrice: 25 },
    { id: 'salmon', name: '鲑鱼', seasons: ['autumn'], weather: ['rainy', 'stormy'], probability: 0.15, sellPrice: 40 },
    { id: 'trout', name: '鳟鱼', seasons: ['spring'], weather: ['sunny', 'rainy', 'foggy', 'stormy', 'snowy'], probability: 0.15, sellPrice: 30 },
    { id: 'goldfish', name: '金鱼', seasons: ['spring', 'summer', 'autumn', 'winter'], weather: ['sunny', 'rainy', 'stormy', 'foggy', 'snowy'], probability: 0.10, sellPrice: 60 },
    { id: 'pufferfish', name: '河豚', seasons: ['summer'], weather: ['sunny'], probability: 0.05, sellPrice: 80 },
    { id: 'icefish', name: '冰鱼', seasons: ['winter'], weather: ['snowy'], probability: 0.03, sellPrice: 100 },
    { id: 'legend', name: '传说之鱼', seasons: ['autumn'], weather: ['stormy'], probability: 0.02, sellPrice: 200 },
  ];

  static getAvailableFish(season: Season, weather: Weather): FishData[] {
    return this.FISH.filter(f => f.seasons.includes(season) && f.weather.includes(weather));
  }

  static catchFish(season: Season, weather: Weather, accuracy: number): FishData | null {
    const available = this.getAvailableFish(season, weather);
    if (available.length === 0) return null;

    const adjusted = available.map(f => ({
      fish: f,
      weight: f.probability * (accuracy > 0.8 ? 1.5 : accuracy > 0.5 ? 1 : 0.5),
    }));

    const total = adjusted.reduce((s, a) => s + a.weight, 0);
    let roll = Math.random() * total;
    for (const a of adjusted) {
      roll -= a.weight;
      if (roll <= 0) return a.fish;
    }
    return adjusted[adjusted.length - 1].fish;
  }
}
