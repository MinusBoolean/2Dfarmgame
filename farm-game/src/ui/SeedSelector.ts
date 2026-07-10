import Phaser from 'phaser';
import { GAME_CONFIG } from '../config';
import { getCropById } from '../entities/CropConfig';

interface SeedItem {
  rect: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  countText: Phaser.GameObjects.Text;
  cropId: string;
}

export class SeedSelector {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private items: SeedItem[] = [];
  private onSelect: ((cropId: string) => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(250).setVisible(false);
  }

  show(
    x: number,
    y: number,
    inventory: Record<string, number>,
    onSelect: (cropId: string) => void
  ): void {
    this.onSelect = onSelect;

    this.clear();

    const seeds = Object.entries(inventory).filter(([_, count]) => count > 0);
    if (seeds.length === 0) {
      this.hide();
      return;
    }

    const panelW = 140;
    const panelH = seeds.length * 30 + 16;
    const panelX = Math.min(x, 800 - panelW / 2 - 8);
    const panelY = Math.max(y - panelH, 8);

    const bg = this.scene.add.rectangle(panelX, panelY, panelW, panelH, GAME_CONFIG.COLORS.SHOP_BG, 0.95)
      .setOrigin(0, 0);
    this.container.add(bg);

    seeds.forEach(([cropId, count], i) => {
      const crop = getCropById(cropId);
      if (!crop) return;

      const itemY = panelY + 15 + i * 30;

      const rect = this.scene.add.rectangle(panelX + panelW / 2, itemY, panelW - 8, 26, GAME_CONFIG.COLORS.BUTTON)
        .setInteractive({ useHandCursor: true });

      const nameText = this.scene.add.text(panelX + 12, itemY, crop.name, {
        fontSize: '13px', color: '#ffffff'
      }).setOrigin(0, 0.5);

      const countText = this.scene.add.text(panelX + panelW - 12, itemY, `x${count}`, {
        fontSize: '12px', color: '#aaaaaa'
      }).setOrigin(1, 0.5);

      rect.on('pointerdown', () => {
        if (this.onSelect) this.onSelect(cropId);
        this.hide();
      });

      rect.on('pointerover', () => rect.setFillStyle(GAME_CONFIG.COLORS.BUTTON_HOVER));
      rect.on('pointerout', () => rect.setFillStyle(GAME_CONFIG.COLORS.BUTTON));

      this.container.add([rect, nameText, countText]);
      this.items.push({ rect, nameText, countText, cropId });
    });

    this.container.setVisible(true);
  }

  hide(): void {
    this.container.setVisible(false);
  }

  getIsVisible(): boolean {
    return this.container.visible;
  }

  private clear(): void {
    this.container.removeAll(true);
    this.items = [];
  }

  destroy(): void {
    this.container.destroy();
  }
}
