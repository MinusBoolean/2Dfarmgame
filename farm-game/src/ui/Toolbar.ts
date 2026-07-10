import Phaser from 'phaser';
import { ToolType } from '../types';
import { GAME_CONFIG } from '../config';

interface ToolButton {
  rect: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  tool: ToolType;
}

export class Toolbar {
  private scene: Phaser.Scene;
  private buttons: ToolButton[] = [];
  private selectedTool: ToolType = ToolType.PLOW;
  private onToolChange: ((tool: ToolType) => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.create();
  }

  private create(): void {
    const bg = this.scene.add.rectangle(400, 582, 800, 36, GAME_CONFIG.COLORS.TOOLBAR_BG)
      .setDepth(100).setScrollFactor(0);

    const tools: { tool: ToolType; label: string; key: string }[] = [
      { tool: ToolType.PLOW, label: '翻地', key: '1' },
      { tool: ToolType.SEED, label: '播种', key: '2' },
      { tool: ToolType.HARVEST, label: '收获', key: '3' }
    ];

    const startX = 100;
    const spacing = 120;

    tools.forEach((t, i) => {
      const x = startX + i * spacing;
      const rect = this.scene.add.rectangle(x, 582, 100, 28, GAME_CONFIG.COLORS.BUTTON)
        .setDepth(101).setScrollFactor(0).setInteractive({ useHandCursor: true });
      const label = this.scene.add.text(x, 582, `${t.label} [${t.key}]`, {
        fontSize: '13px',
        color: '#cccccc'
      }).setDepth(102).setScrollFactor(0).setOrigin(0.5);

      rect.on('pointerdown', () => this.selectTool(t.tool));
      rect.on('pointerover', () => rect.setFillStyle(GAME_CONFIG.COLORS.BUTTON_HOVER));
      rect.on('pointerout', () => {
        rect.setFillStyle(
          this.selectedTool === t.tool ? 0x6666aa : GAME_CONFIG.COLORS.BUTTON
        );
      });

      this.buttons.push({ rect, label, tool: t.tool });
    });

    this.updateSelection();
  }

  selectTool(tool: ToolType): void {
    this.selectedTool = tool;
    this.updateSelection();
    if (this.onToolChange) {
      this.onToolChange(tool);
    }
  }

  getSelectedTool(): ToolType {
    return this.selectedTool;
  }

  setOnToolChange(callback: (tool: ToolType) => void): void {
    this.onToolChange = callback;
  }

  private updateSelection(): void {
    this.buttons.forEach(b => {
      if (b.tool === this.selectedTool) {
        b.rect.setFillStyle(0x6666aa);
        b.label.setColor('#ffffff');
      } else {
        b.rect.setFillStyle(GAME_CONFIG.COLORS.BUTTON);
        b.label.setColor('#cccccc');
      }
    });
  }

  destroy(): void {
    this.buttons.forEach(b => {
      b.rect.destroy();
      b.label.destroy();
    });
    this.buttons = [];
  }
}
