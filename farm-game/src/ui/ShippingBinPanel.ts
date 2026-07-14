import Phaser from 'phaser';
import { SaveData, ShippingBinItem } from '../types';
import { ShippingBinSystem } from '../systems/ShippingBinSystem';
import { InventorySystem } from '../systems/InventorySystem';

export class ShippingBinPanel {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private saveData: SaveData;
  private inventory: InventorySystem;
  private visible: boolean = false;
  private selectedIndex: number = 0;

  constructor(scene: Phaser.Scene, saveData: SaveData, inventory: InventorySystem) {
    this.scene = scene;
    this.saveData = saveData;
    this.inventory = inventory;
  }

  toggle(): void { this.visible ? this.hide() : this.show(); }
  isVisible(): boolean { return this.visible; }

  show(): void {
    this.visible = true;
    this.container = this.scene.add.container(400, 300).setDepth(300).setScrollFactor(0);
    this.render();
  }

  hide(): void {
    this.visible = false;
    this.container?.destroy();
  }

  private render(): void {
    this.container.removeAll(true);
    const panelBg = this.scene.add.image(0, 0, 'ui_elements');
    panelBg.setDisplaySize(400, 300);
    this.container.add(panelBg);
    const bg = this.scene.add.rectangle(0, 0, 400, 300, 0x222222, 0.95).setStrokeStyle(2, 0xffd700);
    this.container.add(bg);
    this.container.add(this.scene.add.text(0, -135, '出货箱', { fontSize: '18px', color: '#ffd700' }).setOrigin(0.5));

    // Show shipping bin contents
    const bin = ShippingBinSystem.getItems(this.saveData.shippingBin);
    if (bin.length === 0) {
      this.container.add(this.scene.add.text(0, 0, '出货箱为空\n将物品放入后一天结束时结算', { fontSize: '14px', color: '#888' }).setOrigin(0.5));
    } else {
      bin.forEach((item, i) => {
        const y = -100 + i * 25;
        this.container.add(this.scene.add.text(-180, y, `${item.name} x${item.quantity}`, { fontSize: '12px', color: '#fff' }));
        this.container.add(this.scene.add.text(180, y, `${item.sellPrice * item.quantity}G`, { fontSize: '12px', color: '#ffd700' }).setOrigin(1, 0.5));
      });
    }

    // Inventory items to add
    const items = this.inventory.getItems().filter(i => i.type === 'crop');
    this.container.add(this.scene.add.text(0, 80, '选择物品放入出货箱:', { fontSize: '12px', color: '#aaa' }).setOrigin(0.5));

    items.slice(0, 5).forEach((item, i) => {
      const y = 100 + i * 20;
      const selected = i === this.selectedIndex;
      if (selected) this.container.add(this.scene.add.rectangle(0, y, 380, 18, 0x444444));
      this.container.add(this.scene.add.text(-180, y, `${item.name} x${item.quantity}`, { fontSize: '11px', color: selected ? '#ffd700' : '#ccc' }));
    });

    this.container.add(this.scene.add.text(0, 140, '↑↓选择 Enter放入 ESC关闭', { fontSize: '10px', color: '#888' }).setOrigin(0.5));

    this.scene.input.keyboard!.once('keydown-UP', () => { this.selectedIndex = Math.max(0, this.selectedIndex - 1); this.render(); });
    this.scene.input.keyboard!.once('keydown-DOWN', () => { this.selectedIndex = Math.min(items.length - 1, this.selectedIndex + 1); this.render(); });
    this.scene.input.keyboard!.once('keydown-ENTER', () => {
      const item = items[this.selectedIndex];
      if (item) {
        const price = Math.floor((item.quality === 'iridium' ? 2 : item.quality === 'gold' ? 1.5 : item.quality === 'silver' ? 1.25 : 1) * 20);
        ShippingBinSystem.addItem(this.saveData.shippingBin, { id: item.id, name: item.name, sellPrice: price }, 1);
        this.inventory.removeItem(item.id, 1, item.quality);
        this.render();
      }
    });
    this.scene.input.keyboard!.once('keydown-ESC', () => this.hide());
  }

  updateData(saveData: SaveData, inventory: InventorySystem): void {
    this.saveData = saveData;
    this.inventory = inventory;
  }
}
