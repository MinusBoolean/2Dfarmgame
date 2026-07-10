import { SaveData } from '../types';

export class TutorialSystem {
  private static readonly TASKS = [
    { day: 1, task: '用锄头翻一块地 (按1选择锄头，按空格翻地)', reward: '5 金币' },
    { day: 2, task: '种一个胡萝卜 (在翻过的地上按空格)', reward: '胡萝卜种子 x3' },
    { day: 3, task: '给胡萝卜浇水 (按2选择水壶，按空格浇水)', reward: '10 金币' },
    { day: 4, task: '收获胡萝卜 (按H收获成熟作物)', reward: '20 金币' },
    { day: 5, task: '去商店卖胡萝卜 (按E打开商店)', reward: '稻草人 x1' },
  ];

  static getCurrentTask(saveData: SaveData): string | null {
    if (saveData.tutorialDay > 5) return null;
    return this.TASKS[saveData.tutorialDay - 1]?.task || null;
  }

  static advanceTutorial(saveData: SaveData): void {
    if (saveData.tutorialDay <= 5) {
      saveData.tutorialDay++;
    }
  }
}
