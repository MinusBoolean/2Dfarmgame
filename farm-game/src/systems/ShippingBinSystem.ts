import { ShippingBinItem } from '../types';

export class ShippingBinSystem {
  static addItem(bin: ShippingBinItem[], item: { id: string; name: string; sellPrice: number }, quantity: number): boolean {
    const existing = bin.find(b => b.id === item.id);
    if (existing) {
      existing.quantity += quantity;
      return true;
    }
    bin.push({ id: item.id, name: item.name, quantity, sellPrice: item.sellPrice });
    return true;
  }

  static settleDaily(bin: ShippingBinItem[]): number {
    let total = 0;
    for (const item of bin) {
      total += item.sellPrice * item.quantity;
    }
    bin.length = 0;
    return total;
  }

  static getItems(bin: ShippingBinItem[]): ShippingBinItem[] {
    return bin;
  }
}
