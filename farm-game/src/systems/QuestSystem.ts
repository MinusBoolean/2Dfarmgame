import { QuestData, SaveData } from '../types';

export class QuestSystem {
  static readonly TEMPLATES: Omit<QuestData, 'id' | 'progress' | 'accepted' | 'completed'>[] = [
    { title: '收获胡萝卜', description: '收获 5 个胡萝卜', target: { type: 'harvest', id: 'carrot', count: 5 }, reward: { gold: 50, ratingPoints: 10 } },
    { title: '收获小麦', description: '收获 8 个小麦', target: { type: 'harvest', id: 'wheat', count: 8 }, reward: { gold: 60, ratingPoints: 12 } },
    { title: '挖掘铜矿', description: '挖掘 10 个铜矿', target: { type: 'mine', id: 'ore_copper', count: 10 }, reward: { gold: 100, ratingPoints: 20 } },
    { title: '挖掘铁矿', description: '挖掘 5 个铁矿', target: { type: 'mine', id: 'ore_iron', count: 5 }, reward: { gold: 120, ratingPoints: 25 } },
    { title: '制作肥料', description: '制作 3 个普通肥料', target: { type: 'craft', id: 'fertilizer_normal', count: 3 }, reward: { gold: 80, ratingPoints: 15 } },
    { title: '深入矿洞', description: '到达矿洞第 3 层', target: { type: 'mine', id: 'floor_3', count: 1 }, reward: { gold: 150, ratingPoints: 30 } },
    { title: '收集化石', description: '找到 1 个化石', target: { type: 'collect', id: 'collectible_fossil', count: 1 }, reward: { gold: 250, ratingPoints: 50 } },
    { title: '大量收获', description: '收获 20 个任意作物', target: { type: 'harvest', count: 20 }, reward: { gold: 150, ratingPoints: 30 } },
  ];

  static generateDailyQuests(saveData: SaveData): void {
    saveData.quests = saveData.quests.filter(q => q.accepted);
    const available = this.TEMPLATES.filter(t => !saveData.quests.some(q => q.title === t.title));
    const shuffled = available.sort(() => Math.random() - 0.5);
    const newQuests = shuffled.slice(0, 3).map((t, i) => ({
      ...t, id: `quest_${saveData.currentDay}_${i}`, progress: 0, accepted: false, completed: false,
    }));
    saveData.quests.push(...newQuests);
  }

  static updateProgress(saveData: SaveData, type: string, id?: string): void {
    for (const quest of saveData.quests) {
      if (!quest.accepted || quest.completed) continue;
      if (quest.target.type !== type) continue;
      let matches = false;
      if (quest.target.id) { if (quest.target.id === id) matches = true; }
      else { matches = true; }
      if (matches) {
        quest.progress = Math.min(quest.progress + 1, quest.target.count);
        if (quest.progress >= quest.target.count) quest.completed = true;
      }
    }
  }

  static claimReward(saveData: SaveData, questId: string): { gold: number; ratingPoints: number } | null {
    const quest = saveData.quests.find(q => q.id === questId && q.completed);
    if (!quest) return null;
    saveData.gold += quest.reward.gold;
    saveData.totalEarned += quest.reward.gold;
    saveData.completedQuests++;
    saveData.quests = saveData.quests.filter(q => q.id !== questId);
    return quest.reward;
  }

  static getActiveQuests(saveData: SaveData): QuestData[] {
    return saveData.quests.filter(q => q.accepted && !q.completed);
  }

  static getAvailableQuests(saveData: SaveData): QuestData[] {
    return saveData.quests.filter(q => !q.accepted);
  }
}
