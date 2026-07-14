import Phaser from 'phaser';
import { SaveData, WorkshopRecipe } from '../types';
import { WorkshopSystem } from '../systems/WorkshopSystem';
import { InventorySystem } from '../systems/InventorySystem';

export class WorkshopPanel {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private saveData: SaveData;
  private inventory: InventorySystem;
  private selectedIndex: number = 0;
  private visible: boolean = false;
  private onCraft?: () => void;

  constructor(scene: Phaser.Scene, saveData: SaveData, inventory: InventorySystem) {
    this.scene = scene;
    this.saveData = saveData;
    this.inventory = inventory;
  }

  setOnCraft(callback: () => void): void { this.onCraft = callback; }

  toggle(): void {
    if (this.visible) this.hide();
    else this.show();
  }

  show(): void {
    this.visible = true;
    this.container = this.scene.add.container(400, 300);
    this.container.setDepth(300);
    this.container.setScrollFactor(0);
    this.render();
  }

  hide(): void {
    this.visible = false;
    this.container?.destroy();
  }

  isVisible(): boolean { return this.visible; }

  private render(): void {
    this.container.removeAll(true);

    const panelBg = this.scene.add.image(0, 0, 'ui_elements');
    panelBg.setDisplaySize(500, 350);
    this.container.add(panelBg);

    const bg = this.scene.add.rectangle(0, 0, 500, 350, 0x222222, 0.95);
    bg.setStrokeStyle(2, 0xffd700);
    this.container.add(bg);

    const title = this.scene.add.text(0, -160, '工坊', { fontSize: '18px', color: '#ffd700' }).setOrigin(0.5);
    this.container.add(title);

    const recipes = WorkshopSystem.getRecipes();
    const startY = -130;

    for (let i = 0; i < recipes.length; i++) {
      const recipe = recipes[i];
      const canCraft = WorkshopSystem.canCraft(recipe, this.saveData, this.inventory);
      const y = startY + i * 24;

      if (i === this.selectedIndex) {
        const highlight = this.scene.add.rectangle(0, y, 480, 22, 0x444444);
        this.container.add(highlight);
      }

      const nameColor = canCraft ? '#ffffff' : '#666666';
      const name = this.scene.add.text(-230, y, recipe.name, { fontSize: '12px', color: nameColor }).setOrigin(0, 0.5);
      this.container.add(name);

      const matText = recipe.materials.map(m => `${m.quantity}x ${m.itemId.replace('ore_', '').replace('crop_', '')}`).join(', ');
      const mats = this.scene.add.text(-100, y, matText, { fontSize: '10px', color: canCraft ? '#aaa' : '#555' }).setOrigin(0, 0.5);
      this.container.add(mats);

      const cost = this.scene.add.text(200, y, `${recipe.goldCost}G`, { fontSize: '12px', color: canCraft ? '#ffd700' : '#555' }).setOrigin(1, 0.5);
      this.container.add(cost);
    }

    const selected = recipes[this.selectedIndex];
    if (selected) {
      const desc = this.scene.add.text(0, 140, selected.description, { fontSize: '12px', color: '#ccc' }).setOrigin(0.5);
      this.container.add(desc);
    }

    const selectedRecipe = recipes[this.selectedIndex];
    const canCraftSelected = selectedRecipe && WorkshopSystem.canCraft(selectedRecipe, this.saveData, this.inventory);
    const btnColor = canCraftSelected ? 0x4a8c3f : 0x444444;
    const btn = this.scene.add.rectangle(0, 165, 100, 28, btnColor);
    btn.setStrokeStyle(1, canCraftSelected ? 0x8fd672 : 0x666666);
    this.container.add(btn);
    const btnText = this.scene.add.text(0, 165, '制作', { fontSize: '14px', color: canCraftSelected ? '#fff' : '#666' }).setOrigin(0.5);
    this.container.add(btnText);

    if (canCraftSelected) {
      btn.setInteractive();
      btn.on('pointerdown', () => this.doCraft());
    }

    const hint = this.scene.add.text(0, 185, '↑↓选择  Enter制作  ESC关闭', { fontSize: '10px', color: '#888' }).setOrigin(0.5);
    this.container.add(hint);

    this.scene.input.keyboard!.once('keydown-UP', () => { this.selectedIndex = Math.max(0, this.selectedIndex - 1); this.render(); });
    this.scene.input.keyboard!.once('keydown-DOWN', () => { this.selectedIndex = Math.min(recipes.length - 1, this.selectedIndex + 1); this.render(); });
    this.scene.input.keyboard!.once('keydown-ENTER', () => this.doCraft());
    this.scene.input.keyboard!.once('keydown-ESC', () => this.hide());
  }

  private doCraft(): void {
    const recipes = WorkshopSystem.getRecipes();
    const recipe = recipes[this.selectedIndex];
    if (!recipe) return;

    if (WorkshopSystem.craft(recipe, this.saveData, this.inventory)) {
      this.onCraft?.();
      this.render();
    }
  }

  updateData(saveData: SaveData, inventory: InventorySystem): void {
    this.saveData = saveData;
    this.inventory = inventory;
  }
}
