import { GAME_CONFIG } from '../config';

export class EnergySystem {
  static canPerform(energy: number, cost: number): boolean {
    return energy >= cost;
  }

  static consume(energy: number, cost: number): number {
    return Math.max(0, energy - cost);
  }

  static restore(energy: number, amount: number): number {
    return Math.min(GAME_CONFIG.MAX_ENERGY, energy + amount);
  }

  static isLow(energy: number): boolean {
    return energy <= 10;
  }

  static isEmpty(energy: number): boolean {
    return energy <= 0;
  }

  static getCostMultiplier(toolLevel: number): number {
    return Math.max(0.5, 1 - (toolLevel - 1) * 0.15);
  }

  static getActionCost(action: keyof typeof GAME_CONFIG.ENERGY_COSTS, toolLevel: number): number {
    const baseCost = GAME_CONFIG.ENERGY_COSTS[action];
    return Math.ceil(baseCost * this.getCostMultiplier(toolLevel));
  }
}
