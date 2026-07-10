import Phaser from 'phaser';
import { GAME_CONFIG } from '../config';
import { CropConfig, ToolType } from '../types';
import { getUnlockedCrops } from '../entities/CropConfig';
import { EconomySystem } from '../systems/EconomySystem';

interface ShopItem {
  rect: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  priceText: Phaser.GameObjects.Text;
  actionText: Phaser.GameObjects.Text;
  crop: CropConfig;
  isBuy: boolean;
}

export class ShopPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private isOpen: boolean = false;
  private items: ShopItem[] = [];
  private gold: number = 0;
  private totalEarned: number = 0;
  private unlockedCrops: string[] = [];
  private inventory: Record<string, number> = {};
  private onBuy: ((cropId: string) => void) | null = null;
  private onSell: ((cropId: string) => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(200).setVisible(false);
    this.create();
  }

  private create(): void {
    const overlay = this.scene.add.rectangle(400, 300, 800, 600, 0x000000, 0.6)
      .setInteractive();
    overlay.on('pointerdown', () => this.close());
    this.container.add(overlay);

    const panel = this.scene.add.rectangle(400, 300, 500, 400, GAME_CONFIG.COLORS.SHOP_PANEL);
    this.container.add(panel);

    const title = this.scene.add.text(400, 130, '商 店', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container.add(title);

    const closeBtn = this.scene.add.text(630, 115, 'X', {
      fontSize: '20px',
      color: '#ff6666'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.close());
    this.container.add(closeBtn);
  }

  open(
    gold: number,
    totalEarned: number,
    unlockedCrops: string[],
    inventory: Record<string, number>,
    onBuy: (cropId: string) => void,
    onSell: (cropId: string) => void
  ): void {
    this.gold = gold;
    this.totalEarned = totalEarned;
    this.unlockedCrops = unlockedCrops;
    this.inventory = inventory;
    this.onBuy = onBuy;
    this.onSell = onSell;
    this.isOpen = true;
    this.container.setVisible(true);
    this.refreshItems();
  }

  close(): void {
    this.isOpen = false;
    this.container.setVisible(false);
    this.clearItems();
  }

  toggle(
    gold: number,
    totalEarned: number,
    unlockedCrops: string[],
    inventory: Record<string, number>,
    onBuy: (cropId: string) => void,
    onSell: (cropId: string) => void
  ): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open(gold, totalEarned, unlockedCrops, inventory, onBuy, onSell);
    }
  }

  getIsOpen(): boolean {
    return this.isOpen;
  }

  private refreshItems(): void {
    this.clearItems();

    const availableCrops = getUnlockedCrops(this.totalEarned, this.unlockedCrops);

    const leftLabel = this.scene.add.text(230, 170, '购买种子', {
      fontSize: '16px', color: '#88ff88'
    }).setOrigin(0.5);
    this.container.add(leftLabel);
    this.items.push({ rect: null as any, nameText: leftLabel, priceText: null as any, actionText: null as any, crop: null as any, isBuy: true });

    availableCrops.forEach((crop, i) => {
      const y = 200 + i * 28;
      const canAfford = this.gold >= crop.buyPrice;

      const nameText = this.scene.add.text(170, y, `${crop.name}`, {
        fontSize: '14px', color: '#ffffff'
      }).setOrigin(0, 0.5);
      this.container.add(nameText);

      const priceText = this.scene.add.text(270, y, `${crop.buyPrice}G`, {
        fontSize: '14px', color: canAfford ? '#ffd700' : '#888888'
      }).setOrigin(0, 0.5);
      this.container.add(priceText);

      const btnRect = this.scene.add.rectangle(330, y, 50, 22, canAfford ? GAME_CONFIG.COLORS.BUTTON : 0x333333)
        .setInteractive({ useHandCursor: canAfford });
      const btnText = this.scene.add.text(330, y, '购买', {
        fontSize: '12px', color: canAfford ? '#ffffff' : '#666666'
      }).setOrigin(0.5);

      if (canAfford) {
        btnRect.on('pointerdown', () => {
          if (this.onBuy) this.onBuy(crop.id);
        });
      }

      this.container.add([btnRect, btnText]);
      this.items.push({ rect: btnRect, nameText, priceText, actionText: btnText, crop, isBuy: true });
    });

    const rightLabel = this.scene.add.text(540, 170, '出售作物', {
      fontSize: '16px', color: '#ff8888'
    }).setOrigin(0.5);
    this.container.add(rightLabel);

    let sellIndex = 0;
    for (const [cropId, count] of Object.entries(this.inventory)) {
      const crop = availableCrops.find(c => c.id === cropId);
      if (!crop) continue;

      const y = 200 + sellIndex * 28;

      const nameText = this.scene.add.text(470, y, `${crop.name} x${count}`, {
        fontSize: '14px', color: '#ffffff'
      }).setOrigin(0, 0.5);
      this.container.add(nameText);

      const priceText = this.scene.add.text(570, y, `${crop.sellPrice}G`, {
        fontSize: '14px', color: '#ffd700'
      }).setOrigin(0, 0.5);
      this.container.add(priceText);

      const btnRect = this.scene.add.rectangle(630, y, 50, 22, GAME_CONFIG.COLORS.BUTTON)
        .setInteractive({ useHandCursor: true });
      const btnText = this.scene.add.text(630, y, '出售', {
        fontSize: '12px', color: '#ffffff'
      }).setOrigin(0.5);

      btnRect.on('pointerdown', () => {
        if (this.onSell) this.onSell(cropId);
      });

      this.container.add([btnRect, btnText]);
      this.items.push({ rect: btnRect, nameText, priceText, actionText: btnText, crop, isBuy: false });
      sellIndex++;
    }

    if (sellIndex === 0) {
      const emptyText = this.scene.add.text(540, 220, '(暂无作物)', {
        fontSize: '13px', color: '#888888'
      }).setOrigin(0.5);
      this.container.add(emptyText);
    }
  }

  private clearItems(): void {
    this.items.forEach(item => {
      if (item.rect) item.rect.destroy();
      if (item.nameText) item.nameText.destroy();
      if (item.priceText) item.priceText.destroy();
      if (item.actionText) item.actionText.destroy();
    });
    this.items = [];

    this.container.each((child: Phaser.GameObjects.GameObject) => {
      if (
        child.type === 'Text' &&
        !['商 店', 'X'].includes((child as Phaser.GameObjects.Text).text) &&
        (child as Phaser.GameObjects.Text).text !== '购买种子' &&
        (child as Phaser.GameObjects.Text).text !== '出售作物'
      ) {
        child.destroy();
      }
      if (child.type === 'Rectangle' && child !== this.container.getAt(0) && child !== this.container.getAt(1)) {
        child.destroy();
      }
    });
  }

  destroy(): void {
    this.container.destroy();
  }
}
