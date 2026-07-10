import { Season, Weather } from '../types';

export class WeatherSystem {
  private static readonly WEATHER_TABLE: Record<Season, { weather: Weather; weight: number }[]> = {
    spring: [
      { weather: 'sunny', weight: 60 },
      { weather: 'rainy', weight: 30 },
      { weather: 'foggy', weight: 10 },
    ],
    summer: [
      { weather: 'sunny', weight: 70 },
      { weather: 'rainy', weight: 20 },
      { weather: 'stormy', weight: 10 },
    ],
    autumn: [
      { weather: 'sunny', weight: 50 },
      { weather: 'rainy', weight: 30 },
      { weather: 'foggy', weight: 20 },
    ],
    winter: [
      { weather: 'sunny', weight: 40 },
      { weather: 'snowy', weight: 60 },
    ],
  };

  static generateWeather(season: Season): Weather {
    const table = this.WEATHER_TABLE[season];
    const total = table.reduce((s, w) => s + w.weight, 0);
    let roll = Math.random() * total;
    for (const entry of table) {
      roll -= entry.weight;
      if (roll <= 0) return entry.weather;
    }
    return 'sunny';
  }

  static getWeatherName(weather: Weather): string {
    const map: Record<Weather, string> = { sunny: '晴', rainy: '雨', stormy: '雷', foggy: '雾', snowy: '雪' };
    return map[weather];
  }

  static affectsMovement(weather: Weather): number {
    if (weather === 'rainy') return 0.9;
    if (weather === 'snowy') return 0.8;
    return 1;
  }

  static autoWaters(weather: Weather): boolean {
    return weather === 'rainy' || weather === 'stormy';
  }
}
