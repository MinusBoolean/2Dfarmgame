import Phaser from 'phaser';

export class DailySummary {
  static show(scene: Phaser.Scene, data: { gold: number; harvested: number; watered: number; dayIncome: number; day: number }): void {
    const { width, height } = scene.scale;

    const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7).setDepth(200).setScrollFactor(0);
    const panel = scene.add.rectangle(width / 2, height / 2, 300, 200, 0x222222).setDepth(201).setScrollFactor(0);
    panel.setStrokeStyle(2, 0xffd700);

    const title = scene.add.text(width / 2, height / 2 - 70, `Day ${data.day} 结算`, {
      fontSize: '18px', color: '#ffd700',
    }).setOrigin(0.5).setDepth(202).setScrollFactor(0);

    const lineTexts: Phaser.GameObjects.Text[] = [];
    const lines = [
      `今日收获: ${data.harvested} 个`,
      `今日浇水: ${data.watered} 次`,
      `今日收入: ${data.dayIncome} 金币`,
      `总金币: ${data.gold}`,
    ];

    lines.forEach((line, i) => {
      const t = scene.add.text(width / 2, height / 2 - 30 + i * 25, line, {
        fontSize: '14px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(202).setScrollFactor(0);
      lineTexts.push(t);
    });

    const continueText = scene.add.text(width / 2, height / 2 + 70, '点击继续', {
      fontSize: '14px', color: '#888888',
    }).setOrigin(0.5).setDepth(202).setScrollFactor(0);

    const allObjects = [overlay, panel, title, continueText, ...lineTexts];

    const dismiss = () => {
      allObjects.forEach(obj => obj.destroy());
    };

    scene.input.once('pointerdown', dismiss);
    scene.time.delayedCall(3000, dismiss);
  }
}
