import { InventoryItem, QualityTier } from '../types';

export class InventorySystem {
  private items: InventoryItem[];
  private maxSize: number;

  constructor(items: InventoryItem[], maxSize: number) {
    this.items = items;
    this.maxSize = maxSize;
  }

  getItems(): InventoryItem[] { return this.items; }
  getMaxSize(): number { return this.maxSize; }
  setSize(size: number): void { this.maxSize = size; }

  isFull(): boolean {
    return this.items.length >= this.maxSize;
  }

  hasItem(id: string, quality?: QualityTier): boolean {
    return this.items.some(i => i.id === id && (!quality || i.quality === quality));
  }

  getItemCount(id: string, quality?: QualityTier): number {
    const item = this.items.find(i => i.id === id && (!quality || i.quality === quality));
    return item ? item.quantity : 0;
  }

  addItem(item: InventoryItem): boolean {
    const existing = this.items.find(i => i.id === item.id && i.quality === item.quality);
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + item.quantity);
      return true;
    }
    if (this.isFull()) return false;
    this.items.push({ ...item });
    return true;
  }

  removeItem(id: string, quantity: number, quality?: QualityTier): boolean {
    const idx = this.items.findIndex(i => i.id === id && (!quality || i.quality === quality));
    if (idx === -1) return false;
    const item = this.items[idx];
    if (item.quantity < quantity) return false;
    item.quantity -= quantity;
    if (item.quantity <= 0) this.items.splice(idx, 1);
    return true;
  }
}
