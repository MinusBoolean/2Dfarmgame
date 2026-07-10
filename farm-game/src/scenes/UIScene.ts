import Phaser from 'phaser';
import { GAME_CONFIG } from '../config';
import { Season, Weather, ToolType } from '../types';

export class UIScene extends Phaser.Scene {
  private goldText!: Phaser.GameObjects.Text;
  private dayText!: Phaser.GameObjects.Text;
  private weatherText!: Phaser.GameObjects.Text;
  private energyBar!: Phaser.GameObjects.Rectangle;
  private energyBarBg!: Phaser.GameObjects.Rectangle;
  private saveIndicator!: Phaser.GameObjects.Text;
  private toolbarSlots: Phaser.GameObjects.Rectangle[] = [];
  private toolbarIcons: Phaser.GameObjects.Text[] = [];
  private selectedTool: ToolType = 'hoe';
  private selectedToolIndex: number = 0;

  constructor() { super({ key: 'UIScene' }); }

  create(): void {
    this.add.rectangle(400, 16, 796, 28, 0x000000, 0.5).setOrigin(0.5, 0.5);

    this.goldText = this.add.text(12, 4, '100', { fontSize: '14px', color: '#ffd700' });

    this.dayText = this.add.text(150, 4, 'Day 1 | 春', { fontSize: '14px', color: '#ffffff' });

    this.weatherText = this.add.text(350, 4, '晴', { fontSize: '14px', color: '#ffffff' });

    this.energyBarBg = this.add.rectangle(700, 16, 80, 12, 0x333333).setOrigin(1, 0.5);
    this.energyBar = this.add.rectangle(658, 16, 76, 8, 0x44cc44).setOrigin(0, 0.5);

    this.saveIndicator = this.add.text(400, 580, '', { fontSize: '12px', color: '#88ff88' }).setOrigin(0.5).setAlpha(0);

    this.createToolbar();

    const farmScene = this.scene.get('FarmScene');
    farmScene.events.on('gold-changed', (gold: number) => this.updateGold(gold));
    farmScene.events.on('day-changed', (day: number, season: Season) => this.updateDay(day, season));
    farmScene.events.on('weather-changed', (weather: Weather) => this.updateWeather(weather));
    farmScene.events.on('energy-changed', (energy: number) => this.updateEnergy(energy));
    farmScene.events.on('save-indicator', () => this.showSaveIndicator());
  }

  private createToolbar(): void {
    const startY = 560;
    const slotW = 40, slotH = 40, gap = 4;
    const tools: { icon: string; tool: ToolType }[] = [
      { icon: 'H', tool: 'hoe' },
      { icon: 'W', tool: 'wateringCan' },
      { icon: 'F', tool: 'food' },
    ];

    const totalW = tools.length * (slotW + gap) - gap;
    const startX = (800 - totalW) / 2;

    this.add.rectangle(400, startY + 20, totalW + 12, slotH + 8, 0x000000, 0.6).setOrigin(0.5, 0.5);

    for (let i = 0; i < tools.length; i++) {
      const x = startX + i * (slotW + gap);
      const slot = this.add.rectangle(x + slotW / 2, startY + 20, slotW, slotH, 0x333333, 0.8);
      slot.setStrokeStyle(2, i === 0 ? 0xffd700 : 0x666666);
      this.toolbarSlots.push(slot);

      const icon = this.add.text(x + slotW / 2, startY + 20, tools[i].icon, { fontSize: '20px' }).setOrigin(0.5);
      this.toolbarIcons.push(icon);

      this.add.text(x + slotW / 2, startY + 44, `${i + 1}`, { fontSize: '10px', color: '#888' }).setOrigin(0.5);
    }

    this.input.keyboard!.on('keydown-ONE', () => this.selectToolIndex(0));
    this.input.keyboard!.on('keydown-TWO', () => this.selectToolIndex(1));
    this.input.keyboard!.on('keydown-THREE', () => this.selectToolIndex(2));
  }

  private selectToolIndex(index: number): void {
    this.selectedToolIndex = index;
    for (let i = 0; i < this.toolbarSlots.length; i++) {
      this.toolbarSlots[i].setStrokeStyle(2, i === index ? 0xffd700 : 0x666666);
    }
  }

  private updateGold(gold: number): void { this.goldText.setText(`${gold}`); }

  private updateDay(day: number, season: Season): void {
    const names: Record<Season, string> = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
    this.dayText.setText(`Day ${day} | ${names[season]}`);
  }

  private updateWeather(weather: Weather): void {
    const names: Record<Weather, string> = { sunny: '晴', rainy: '雨', stormy: '雷', foggy: '雾', snowy: '雪' };
    this.weatherText.setText(`${names[weather]}`);
  }

  private updateEnergy(energy: number): void {
    const ratio = energy / GAME_CONFIG.MAX_ENERGY;
    this.energyBar.width = 76 * ratio;
    this.energyBar.setFillStyle(ratio > 0.3 ? 0x44cc44 : ratio > 0.1 ? 0xcccc44 : 0xcc4444);
  }

  private showSaveIndicator(): void {
    this.saveIndicator.setText('保存中...');
    this.tweens.add({
      targets: this.saveIndicator,
      alpha: { from: 1, to: 0 },
      duration: 1000,
      ease: 'Power2',
    });
  }
}
