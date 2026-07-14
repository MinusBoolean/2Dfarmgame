import Phaser from 'phaser';
import { SaveData, QuestData } from '../types';
import { QuestSystem } from '../systems/QuestSystem';

export class BulletinBoard {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private saveData: SaveData;
  private selectedIndex: number = 0;
  private tab: 'available' | 'active' = 'available';
  private visible: boolean = false;
  private onQuestUpdate?: () => void;

  constructor(scene: Phaser.Scene, saveData: SaveData) {
    this.scene = scene;
    this.saveData = saveData;
  }

  setOnQuestUpdate(callback: () => void): void { this.onQuestUpdate = callback; }

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

    const bg = this.scene.add.rectangle(0, 0, 500, 350, 0x222222, 0.95);
    bg.setStrokeStyle(2, 0xffd700);
    this.container.add(bg);

    const title = this.scene.add.text(0, -160, '公告板', { fontSize: '18px', color: '#ffd700' }).setOrigin(0.5);
    this.container.add(title);

    const tabAvail = this.scene.add.text(-100, -135, '可接取', {
      fontSize: '14px', color: this.tab === 'available' ? '#ffd700' : '#888'
    }).setOrigin(0.5);
    this.container.add(tabAvail);
    tabAvail.setInteractive();
    tabAvail.on('pointerdown', () => { this.tab = 'available'; this.selectedIndex = 0; this.render(); });

    const tabActive = this.scene.add.text(100, -135, '进行中', {
      fontSize: '14px', color: this.tab === 'active' ? '#ffd700' : '#888'
    }).setOrigin(0.5);
    this.container.add(tabActive);
    tabActive.setInteractive();
    tabActive.on('pointerdown', () => { this.tab = 'active'; this.selectedIndex = 0; this.render(); });

    const quests = this.tab === 'available'
      ? QuestSystem.getAvailableQuests(this.saveData)
      : QuestSystem.getActiveQuests(this.saveData);

    const startY = -110;
    for (let i = 0; i < quests.length; i++) {
      const quest = quests[i];
      const y = startY + i * 50;

      if (i === this.selectedIndex) {
        const highlight = this.scene.add.rectangle(0, y + 10, 480, 45, 0x444444);
        this.container.add(highlight);
      }

      const name = this.scene.add.text(-230, y, quest.title, { fontSize: '13px', color: '#fff' }).setOrigin(0, 0.5);
      this.container.add(name);

      const desc = this.scene.add.text(-230, y + 16, quest.description, { fontSize: '10px', color: '#aaa' }).setOrigin(0, 0.5);
      this.container.add(desc);

      const progress = this.scene.add.text(200, y, `${quest.progress}/${quest.target.count}`, {
        fontSize: '12px', color: quest.completed ? '#44cc44' : '#ffd700'
      }).setOrigin(1, 0.5);
      this.container.add(progress);

      const reward = this.scene.add.text(200, y + 16, `奖励: ${quest.reward.gold}G`, {
        fontSize: '10px', color: '#ffd700'
      }).setOrigin(1, 0.5);
      this.container.add(reward);
    }

    if (quests.length === 0) {
      const empty = this.scene.add.text(0, 0, this.tab === 'available' ? '暂无可用任务' : '暂无进行中任务', {
        fontSize: '14px', color: '#888'
      }).setOrigin(0.5);
      this.container.add(empty);
    }

    const selected = quests[this.selectedIndex];
    if (selected) {
      const btnLabel = this.tab === 'available' ? '接取' : (selected.completed ? '领取奖励' : '进行中');
      const canAct = this.tab === 'available' || selected.completed;
      const btnColor = canAct ? 0x4a8c3f : 0x444444;
      const btn = this.scene.add.rectangle(0, 150, 100, 28, btnColor);
      btn.setStrokeStyle(1, canAct ? 0x8fd672 : 0x666666);
      this.container.add(btn);
      const btnText = this.scene.add.text(0, 150, btnLabel, { fontSize: '14px', color: canAct ? '#fff' : '#666' }).setOrigin(0.5);
      this.container.add(btnText);

      if (canAct) {
        btn.setInteractive();
        btn.on('pointerdown', () => this.doAction());
      }
    }

    const hint = this.scene.add.text(0, 185, 'Tab切换  ↑↓选择  Enter操作  ESC关闭', { fontSize: '10px', color: '#888' }).setOrigin(0.5);
    this.container.add(hint);

    this.scene.input.keyboard!.once('keydown-UP', () => { this.selectedIndex = Math.max(0, this.selectedIndex - 1); this.render(); });
    this.scene.input.keyboard!.once('keydown-DOWN', () => { this.selectedIndex = Math.min(quests.length - 1, this.selectedIndex + 1); this.render(); });
    this.scene.input.keyboard!.once('keydown-TAB', (e: KeyboardEvent) => { e.preventDefault(); this.tab = this.tab === 'available' ? 'active' : 'available'; this.selectedIndex = 0; this.render(); });
    this.scene.input.keyboard!.once('keydown-ENTER', () => this.doAction());
    this.scene.input.keyboard!.once('keydown-ESC', () => this.hide());
  }

  private doAction(): void {
    const quests = this.tab === 'available'
      ? QuestSystem.getAvailableQuests(this.saveData)
      : QuestSystem.getActiveQuests(this.saveData);
    const quest = quests[this.selectedIndex];
    if (!quest) return;

    if (this.tab === 'available') {
      quest.accepted = true;
      this.onQuestUpdate?.();
      this.render();
    } else if (quest.completed) {
      QuestSystem.claimReward(this.saveData, quest.id);
      this.onQuestUpdate?.();
      this.render();
    }
  }

  updateData(saveData: SaveData): void {
    this.saveData = saveData;
  }
}
