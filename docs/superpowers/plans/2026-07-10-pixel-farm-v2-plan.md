# Pixel Farm V2 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 V1 基础上加入矿洞探索（5 层随机地图）、镐子工具、工坊制作系统、公告板任务系统。

**Architecture:** 新增 MineScene（矿洞场景）+ WorkshopUI（工坊面板）+ BulletinBoardUI（公告板面板）。扩展 SaveData 结构，新增 MineSystem、WorkshopSystem、QuestSystem。

**Tech Stack:** Phaser 3 + TypeScript + Vite，沿用 V1 架构。

## Global Constraints

- 矿洞每层 32x32 tiles（512x512 像素）
- 3 种矿石（铜/铁/金）+ 稀有收集品
- 镐子 3 级（木/铜/铁），敲击 3 次破碎
- 工坊制作 12 种配方
- 公告板每天 3 个可选任务
- 存档兼容 V1，新增字段自动填充

---

## Task 1: 类型扩展

**Files:**
- Modify: `src/types/index.ts` — 新增矿洞、工坊、任务类型

**Interfaces:**
- Produces: `MineFloorData`, `MineTileData`, `QuestData`, `WorkshopRecipe`

- [ ] **Step 1: 扩展 types/index.ts**

在现有类型基础上新增：

```typescript
// 矿洞相关
export type MineTileType = 'empty' | 'rock' | 'ore' | 'stairs' | 'collectible';
export type OreType = 'copper' | 'iron' | 'gold';

export interface MineTileData {
  type: MineTileType;
  oreType?: OreType;
  collectibleType?: string;
  hitsRemaining: number;
}

export interface MineFloorData {
  tiles: MineTileData[][];
  discovered: boolean;
}

// 任务相关
export interface QuestTarget {
  type: 'harvest' | 'mine' | 'craft' | 'collect';
  id?: string;
  count: number;
}

export interface QuestReward {
  gold: number;
  ratingPoints: number;
}

export interface QuestData {
  id: string;
  title: string;
  description: string;
  target: QuestTarget;
  reward: QuestReward;
  progress: number;
  accepted: boolean;
  completed: boolean;
}

// 工坊配方
export interface WorkshopRecipe {
  id: string;
  name: string;
  description: string;
  materials: { itemId: string; quantity: number }[];
  goldCost: number;
  result: { type: 'tool_upgrade' | 'item'; tool?: 'hoe' | 'wateringCan' | 'pickaxe'; itemId?: string; quantity?: number };
}
```

- [ ] **Step 2: 验证编译**

```bash
cd /workspace/farm-game && npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add src/types/index.ts && git commit -m "feat(v2): add mine, workshop, and quest types"
```

---

## Task 2: SaveData 扩展

**Files:**
- Modify: `src/systems/SaveSystem.ts` — 扩展存档结构

**Interfaces:**
- Consumes: `MineFloorData`, `QuestData`
- Produces: 扩展的 `SaveData` 接口

- [ ] **Step 1: 扩展 SaveData 接口**

在 `src/types/index.ts` 的 SaveData 接口中新增：

```typescript
export interface SaveData {
  // ... V1 字段保持不变
  // V2 新增
  mineData: {
    currentFloor: number;
    floors: MineFloorData[];
  };
  quests: QuestData[];
  completedQuests: number;
  collectedItems: string[];
  pickaxeLevel: number;
}
```

- [ ] **Step 2: 更新 SaveSystem.createDefault()**

在 `src/systems/SaveSystem.ts` 的 createDefault 中新增默认值：

```typescript
mineData: {
  currentFloor: 0,
  floors: Array.from({ length: 5 }, () => ({
    tiles: [],
    discovered: false,
  })),
},
quests: [],
completedQuests: 0,
collectedItems: [],
pickaxeLevel: 1,
```

- [ ] **Step 3: 验证编译并提交**

```bash
cd /workspace/farm-game && npx tsc --noEmit && git add -A && git commit -m "feat(v2): extend SaveData with mine, quest, and pickaxe fields"
```

---

## Task 3: MineSystem — 矿层生成

**Files:**
- Create: `src/systems/MineSystem.ts` — 矿层随机生成和挖掘逻辑

**Interfaces:**
- Consumes: `MineFloorData`, `MineTileData`, `OreType`
- Produces: `generateFloor()`, `mineTile()`, `getOreForFloor()`

- [ ] **Step 1: 实现 MineSystem**

```typescript
import { MineFloorData, MineTileData, OreType } from '../types';

export class MineSystem {
  static readonly FLOOR_SIZE = 32;

  static generateFloor(floorNumber: number): MineFloorData {
    const size = this.FLOOR_SIZE;
    const tiles: MineTileData[][] = [];

    for (let row = 0; row < size; row++) {
      tiles[row] = [];
      for (let col = 0; col < size; col++) {
        const rand = Math.random();
        if (rand < 0.60) {
          tiles[row][col] = { type: 'rock', hitsRemaining: 3 };
        } else if (rand < 0.75) {
          const oreType = this.getOreForFloor(floorNumber);
          tiles[row][col] = { type: 'ore', oreType, hitsRemaining: 3 };
        } else if (rand < 0.80) {
          tiles[row][col] = { type: 'stairs', hitsRemaining: 0 };
        } else if (rand < 0.85) {
          const collectible = this.getCollectible();
          tiles[row][col] = { type: 'collectible', collectibleType: collectible, hitsRemaining: 1 };
        } else {
          tiles[row][col] = { type: 'empty', hitsRemaining: 0 };
        }
      }
    }

    // Ensure entrance area is clear
    for (let r = 0; r < 3; r++) {
      for (let c = 14; c < 18; c++) {
        tiles[r][c] = { type: 'empty', hitsRemaining: 0 };
      }
    }
    // Ensure stairs are accessible
    const stairRow = size - 3;
    const stairCol = Math.floor(size / 2);
    tiles[stairRow][stairCol] = { type: 'stairs', hitsRemaining: 0 };
    tiles[stairRow - 1][stairCol] = { type: 'empty', hitsRemaining: 0 };
    tiles[stairRow + 1][stairCol] = { type: 'empty', hitsRemaining: 0 };
    tiles[stairRow][stairCol - 1] = { type: 'empty', hitsRemaining: 0 };
    tiles[stairRow][stairCol + 1] = { type: 'empty', hitsRemaining: 0 };

    return { tiles, discovered: true };
  }

  static getOreForFloor(floor: number): OreType {
    const rand = Math.random();
    if (floor <= 2) {
      return rand < 0.7 ? 'copper' : 'iron';
    } else if (floor <= 3) {
      if (rand < 0.4) return 'copper';
      if (rand < 0.8) return 'iron';
      return 'gold';
    } else {
      if (rand < 0.2) return 'copper';
      if (rand < 0.6) return 'iron';
      return 'gold';
    }
  }

  static getCollectible(): string {
    const rand = Math.random();
    if (rand < 0.5) return 'fossil';
    if (rand < 0.8) return 'crystal';
    return 'relic';
  }

  static mineTile(tile: MineTileData, pickaxeLevel: number): { success: boolean; drops: { id: string; name: string; quantity: number }[] } {
    if (tile.hitsRemaining <= 0) return { success: false, drops: [] };

    tile.hitsRemaining--;

    if (tile.hitsRemaining > 0) return { success: true, drops: [] };

    // Tile destroyed
    const drops: { id: string; name: string; quantity: number }[] = [];

    if (tile.type === 'ore' && tile.oreType) {
      const oreNames: Record<OreType, string> = { copper: '铜矿', iron: '铁矿', gold: '金矿' };
      drops.push({ id: `ore_${tile.oreType}`, name: oreNames[tile.oreType], quantity: 1 });
    } else if (tile.type === 'collectible' && tile.collectibleType) {
      const collectibleNames: Record<string, string> = { fossil: '化石', crystal: '水晶', relic: '古代遗物' };
      drops.push({ id: `collectible_${tile.collectibleType}`, name: collectibleNames[tile.collectibleType], quantity: 1 });
    }

    tile.type = 'empty';
    return { success: true, drops };
  }

  static canMineOre(oreType: OreType, pickaxeLevel: number): boolean {
    const requirements: Record<OreType, number> = { copper: 1, iron: 2, gold: 3 };
    return pickaxeLevel >= requirements[oreType];
  }
}
```

- [ ] **Step 2: 验证编译并提交**

```bash
cd /workspace/farm-game && npx tsc --noEmit && git add -A && git commit -m "feat(v2): add MineSystem with floor generation and mining logic"
```

---

## Task 4: WorkshopSystem

**Files:**
- Create: `src/systems/WorkshopSystem.ts` — 工坊制作逻辑

**Interfaces:**
- Consumes: `WorkshopRecipe`, `InventorySystem`, `SaveData`
- Produces: `getRecipes()`, `canCraft()`, `craft()`

- [ ] **Step 1: 实现 WorkshopSystem**

```typescript
import { WorkshopRecipe, SaveData } from '../types';
import { InventorySystem } from './InventorySystem';

export class WorkshopSystem {
  static readonly RECIPES: WorkshopRecipe[] = [
    {
      id: 'pickaxe_copper',
      name: '铜镐',
      description: '升级镐子到 2 级，可挖掘铁矿',
      materials: [{ itemId: 'ore_copper', quantity: 5 }],
      goldCost: 500,
      result: { type: 'tool_upgrade', tool: 'pickaxe' },
    },
    {
      id: 'pickaxe_iron',
      name: '铁镐',
      description: '升级镐子到 3 级，可挖掘金矿',
      materials: [{ itemId: 'ore_iron', quantity: 3 }],
      goldCost: 1000,
      result: { type: 'tool_upgrade', tool: 'pickaxe' },
    },
    {
      id: 'hoe_copper',
      name: '铜锄头',
      description: '升级锄头到 2 级，蓄力翻 3 格',
      materials: [{ itemId: 'ore_copper', quantity: 3 }],
      goldCost: 400,
      result: { type: 'tool_upgrade', tool: 'hoe' },
    },
    {
      id: 'hoe_iron',
      name: '铁锄头',
      description: '升级锄头到 3 级，蓄力翻 3x3',
      materials: [{ itemId: 'ore_iron', quantity: 2 }],
      goldCost: 800,
      result: { type: 'tool_upgrade', tool: 'hoe' },
    },
    {
      id: 'watercan_copper',
      name: '铜水壶',
      description: '升级水壶到 2 级，蓄力浇 3 格',
      materials: [{ itemId: 'ore_copper', quantity: 3 }],
      goldCost: 400,
      result: { type: 'tool_upgrade', tool: 'wateringCan' },
    },
    {
      id: 'watercan_iron',
      name: '铁水壶',
      description: '升级水壶到 3 级，蓄力浇 3x3',
      materials: [{ itemId: 'ore_iron', quantity: 2 }],
      goldCost: 800,
      result: { type: 'tool_upgrade', tool: 'wateringCan' },
    },
    {
      id: 'inventory_expand',
      name: '背包扩展',
      description: '背包容量 +4 格',
      materials: [{ itemId: 'ore_iron', quantity: 2 }],
      goldCost: 500,
      result: { type: 'item', itemId: 'inventory_expand', quantity: 1 },
    },
    {
      id: 'bread',
      name: '面包',
      description: '恢复 30 体力',
      materials: [{ itemId: 'crop_wheat', quantity: 2 }],
      goldCost: 10,
      result: { type: 'item', itemId: 'food_bread', quantity: 1 },
    },
    {
      id: 'juice',
      name: '果汁',
      description: '恢复 50 体力',
      materials: [{ itemId: 'crop_carrot', quantity: 3 }],
      goldCost: 15,
      result: { type: 'item', itemId: 'food_juice', quantity: 1 },
    },
    {
      id: 'fertilizer_normal',
      name: '普通肥料',
      description: '品质 +1 级',
      materials: [{ itemId: 'ore_copper', quantity: 1 }],
      goldCost: 20,
      result: { type: 'item', itemId: 'fertilizer_normal', quantity: 1 },
    },
    {
      id: 'fertilizer_speed',
      name: '速效肥料',
      description: '生长时间 -25%',
      materials: [{ itemId: 'ore_iron', quantity: 1 }],
      goldCost: 50,
      result: { type: 'item', itemId: 'fertilizer_speed', quantity: 1 },
    },
    {
      id: 'scarecrow',
      name: '稻草人',
      description: '保护半径 5 格内作物',
      materials: [{ itemId: 'ore_copper', quantity: 2 }],
      goldCost: 50,
      result: { type: 'item', itemId: 'scarecrow', quantity: 1 },
    },
  ];

  static getRecipes(): WorkshopRecipe[] {
    return this.RECIPES;
  }

  static canCraft(recipe: WorkshopRecipe, saveData: SaveData, inventory: InventorySystem): boolean {
    if (saveData.gold < recipe.goldCost) return false;
    for (const mat of recipe.materials) {
      if (inventory.getItemCount(mat.itemId) < mat.quantity) return false;
    }

    // Check tool upgrade prerequisites
    if (recipe.result.type === 'tool_upgrade') {
      const tool = recipe.result.tool!;
      if (tool === 'pickaxe') {
        if (recipe.id === 'pickaxe_copper' && saveData.pickaxeLevel >= 2) return false;
        if (recipe.id === 'pickaxe_iron' && saveData.pickaxeLevel >= 3) return false;
        if (recipe.id === 'pickaxe_iron' && saveData.pickaxeLevel < 2) return false;
      } else {
        const currentLevel = saveData.toolLevels[tool];
        if (recipe.id.includes('_copper') && currentLevel >= 2) return false;
        if (recipe.id.includes('_iron') && currentLevel >= 3) return false;
        if (recipe.id.includes('_iron') && currentLevel < 2) return false;
      }
    }

    return true;
  }

  static craft(recipe: WorkshopRecipe, saveData: SaveData, inventory: InventorySystem): boolean {
    if (!this.canCraft(recipe, saveData, inventory)) return false;

    // Consume materials
    for (const mat of recipe.materials) {
      inventory.removeItem(mat.itemId, mat.quantity);
    }
    saveData.gold -= recipe.goldCost;

    // Apply result
    if (recipe.result.type === 'tool_upgrade') {
      const tool = recipe.result.tool!;
      if (tool === 'pickaxe') {
        saveData.pickaxeLevel++;
      } else {
        saveData.toolLevels[tool]++;
      }
    } else if (recipe.result.type === 'item') {
      const itemId = recipe.result.itemId!;
      const quantity = recipe.result.quantity || 1;

      if (itemId === 'inventory_expand') {
        saveData.inventorySize = Math.min(40, saveData.inventorySize + 4);
        inventory.setSize(saveData.inventorySize);
      } else {
        const names: Record<string, string> = {
          food_bread: '面包',
          food_juice: '果汁',
          fertilizer_normal: '普通肥料',
          fertilizer_speed: '速效肥料',
          scarecrow: '稻草人',
        };
        const types: Record<string, string> = {
          food_bread: 'food',
          food_juice: 'food',
          fertilizer_normal: 'item',
          fertilizer_speed: 'item',
          scarecrow: 'scarecrow',
        };
        inventory.addItem({
          id: itemId,
          name: names[itemId] || itemId,
          type: (types[itemId] || 'item') as any,
          quantity,
        });
      }
    }

    return true;
  }
}
```

- [ ] **Step 2: 验证编译并提交**

```bash
cd /workspace/farm-game && npx tsc --noEmit && git add -A && git commit -m "feat(v2): add WorkshopSystem with 12 crafting recipes"
```

---

## Task 5: QuestSystem

**Files:**
- Create: `src/systems/QuestSystem.ts` — 任务生成和追踪

**Interfaces:**
- Consumes: `QuestData`, `SaveData`
- Produces: `generateDailyQuests()`, `updateProgress()`, `claimReward()`

- [ ] **Step 1: 实现 QuestSystem**

```typescript
import { QuestData, SaveData } from '../types';

export class QuestSystem {
  static readonly QUEST_TEMPLATES: Omit<QuestData, 'id' | 'progress' | 'accepted' | 'completed'>[] = [
    { title: '收获胡萝卜', description: '收获 5 个胡萝卜', target: { type: 'harvest', id: 'carrot', count: 5 }, reward: { gold: 50, ratingPoints: 10 } },
    { title: '收获小麦', description: '收获 8 个小麦', target: { type: 'harvest', id: 'wheat', count: 8 }, reward: { gold: 60, ratingPoints: 12 } },
    { title: '挖掘铜矿', description: '挖掘 10 个铜矿', target: { type: 'mine', id: 'ore_copper', count: 10 }, reward: { gold: 100, ratingPoints: 20 } },
    { title: '挖掘铁矿', description: '挖掘 5 个铁矿', target: { type: 'mine', id: 'ore_iron', count: 5 }, reward: { gold: 120, ratingPoints: 25 } },
    { title: '制作肥料', description: '制作 3 个普通肥料', target: { type: 'craft', id: 'fertilizer_normal', count: 3 }, reward: { gold: 80, ratingPoints: 15 } },
    { title: '深入矿洞', description: '到达矿洞第 3 层', target: { type: 'mine', id: 'floor_3', count: 1 }, reward: { gold: 150, ratingPoints: 30 } },
    { title: '收获金品质作物', description: '收获 3 个金品质作物', target: { type: 'harvest', id: 'quality_gold', count: 3 }, reward: { gold: 200, ratingPoints: 40 } },
    { title: '制作面包', description: '制作 5 个面包', target: { type: 'craft', id: 'food_bread', count: 5 }, reward: { gold: 60, ratingPoints: 12 } },
    { title: '收集化石', description: '找到 1 个化石', target: { type: 'collect', id: 'collectible_fossil', count: 1 }, reward: { gold: 250, ratingPoints: 50 } },
    { title: '大量收获', description: '收获 20 个任意作物', target: { type: 'harvest', count: 20 }, reward: { gold: 150, ratingPoints: 30 } },
  ];

  static generateDailyQuests(saveData: SaveData): void {
    // Remove unaccepted quests
    saveData.quests = saveData.quests.filter(q => q.accepted);

    // Generate 3 new quests
    const available = this.QUEST_TEMPLATES.filter(t =>
      !saveData.quests.some(q => q.title === t.title)
    );

    const shuffled = available.sort(() => Math.random() - 0.5);
    const newQuests = shuffled.slice(0, 3).map((t, i) => ({
      ...t,
      id: `quest_${saveData.currentDay}_${i}`,
      progress: 0,
      accepted: false,
      completed: false,
    }));

    saveData.quests.push(...newQuests);
  }

  static updateProgress(saveData: SaveData, type: string, id?: string, quality?: string): void {
    for (const quest of saveData.quests) {
      if (!quest.accepted || quest.completed) continue;
      if (quest.target.type !== type) continue;

      let matches = false;
      if (quest.target.id) {
        if (quest.target.id === id) matches = true;
        if (quest.target.id === `quality_${quality}`) matches = true;
        if (quest.target.id === id) matches = true;
      } else {
        matches = true; // No specific ID requirement
      }

      if (matches) {
        quest.progress = Math.min(quest.progress + 1, quest.target.count);
        if (quest.progress >= quest.target.count) {
          quest.completed = true;
        }
      }
    }
  }

  static claimReward(saveData: SaveData, questId: string): { gold: number; ratingPoints: number } | null {
    const quest = saveData.quests.find(q => q.id === questId && q.completed);
    if (!quest) return null;

    saveData.gold += quest.reward.gold;
    saveData.totalEarned += quest.reward.gold;
    saveData.completedQuests++;

    // Remove claimed quest
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
```

- [ ] **Step 2: 验证编译并提交**

```bash
cd /workspace/farm-game && npx tsc --noEmit && git add -A && git commit -m "feat(v2): add QuestSystem with daily quest generation and tracking"
```

---

## Task 6: MineScene — 矿洞场景

**Files:**
- Create: `src/scenes/MineScene.ts` — 矿洞场景

**Interfaces:**
- Consumes: `MineSystem`, `InventorySystem`, `SaveSystem`
- Produces: 矿洞场景，通过 `this.scene.start('FarmScene')` 返回农场

- [ ] **Step 1: 实现 MineScene**

矿洞场景功能：
- 32x32 程序化瓦片地图（矿石、石头、楼梯、空地）
- 玩家移动（复用 V1 的输入逻辑）
- 镐子工具（按 4 选择，按空格敲击）
- 矿石破碎动画（3 次敲击后破碎）
- 物品掉落自动拾取
- 楼梯交互（按 E 进入下一层）
- 矿洞照明（玩家周围发光，越深越暗）
- 返回农场（按 ESC 或走到入口）

- [ ] **Step 2: 验证编译并提交**

---

## Task 7: FarmScene 矿洞入口 + 工坊 + 公告板

**Files:**
- Modify: `src/scenes/FarmScene.ts` — 新增矿洞入口、工坊建筑、公告板建筑

**Interfaces:**
- Consumes: `MineSystem`, `WorkshopSystem`, `QuestSystem`
- Produces: 矿洞入口交互、工坊交互、公告板交互

- [ ] **Step 1: 在 FarmScene 中添加矿洞入口**

农场南边（row 45-47, col 30-34）添加矿洞入口标记：
- 显示为洞口纹理（棕色矩形 + 文字"矿洞"）
- 玩家走到入口附近按 E 进入 MineScene
- 传递存档数据到 MineScene

- [ ] **Step 2: 在 FarmScene 中添加工坊建筑**

农场中央偏南（row 35-38, col 28-32）添加工坊：
- 显示为建筑纹理（木屋 + 文字"工坊"）
- 玩家走到工坊附近按 E 打开制作界面

- [ ] **Step 3: 在 FarmScene 中添加公告板**

农场入口附近（row 10-12, col 5-8）添加公告板：
- 显示为木牌纹理（棕色 + 文字"公告板"）
- 玩家走到公告板附近按 E 打开任务界面

- [ ] **Step 4: 验证编译并提交**

---

## Task 8: 工坊 UI 面板

**Files:**
- Create: `src/ui/WorkshopPanel.ts` — 工坊制作界面

**Interfaces:**
- Consumes: `WorkshopSystem`, `InventorySystem`, `SaveData`
- Produces: 制作界面 UI

- [ ] **Step 1: 实现 WorkshopPanel**

工坊面板功能：
- 左侧：可制作物品列表（名称 + 材料需求 + 金币成本）
- 灰色显示材料不足的配方
- 点击物品高亮选中
- 右侧：选中物品详情（名称、描述、材料、效果）
- 底部："制作"按钮（材料不足时禁用）
- 制作成功显示动画 + 音效
- ESC 关闭

- [ ] **Step 2: 验证编译并提交**

---

## Task 9: 公告板 UI 面板

**Files:**
- Create: `src/ui/BulletinBoard.ts` — 公告板任务界面

**Interfaces:**
- Consumes: `QuestSystem`, `SaveData`
- Produces: 任务界面 UI

- [ ] **Step 1: 实现 BulletinBoard**

公告板面板功能：
- 上方：可用任务列表（未接取）
- 下方：已接取任务列表（进行中）
- 点击任务查看详情（目标、奖励、进度）
- "接取"按钮（可用任务）/ "领取奖励"按钮（已完成任务）
- ESC 关闭

- [ ] **Step 2: 验证编译并提交**

---

## Task 10: 素材生成 — 矿洞

**Files:**
- Create: `public/assets/sprites/mine_tiles.png` — 矿洞 tileset
- Create: `public/assets/sprites/ores.png` — 矿石精灵

**Interfaces:**
- Produces: 矿洞素材文件

- [ ] **Step 1: 生成矿洞 tileset**

使用 image_generate 生成矿洞 tileset：
- 石头（3 种变体）
- 矿脉（铜色/铁色/金色）
- 楼梯
- 空地（岩石地面）

- [ ] **Step 2: 生成矿石精灵**

使用 image_generate 生成矿石：
- 铜矿（橙色晶体）
- 铁矿（灰色晶体）
- 金矿（金色晶体）
- 收集品（化石/水晶/遗物）

- [ ] **Step 3: 下载并提交**

---

## Task 11: 音效 — 矿洞

**Files:**
- Create: `public/assets/audio/sfx/mine_hit.mp3` — 敲击声
- Create: `public/assets/audio/sfx/ore_break.mp3` — 矿石破碎声
- Create: `public/assets/audio/sfx/stairs.mp3` — 楼梯声
- Create: `public/assets/audio/bgm/mine.mp3` — 矿洞 BGM

**Interfaces:**
- Produces: 矿洞音效文件

- [ ] **Step 1: 下载矿洞音效**

从 freesound.org 下载：
- mine_hit.mp3 — 金属敲击声
- ore_break.mp3 — 石头破碎声
- stairs.mp3 — 脚步声
- mine.mp3 — 紧张氛围 BGM

- [ ] **Step 2: 提交**

---

## Task 12: 最终集成测试

- [ ] **Step 1: 完整 V2 流程测试**

1. 在农场找到矿洞入口，按 E 进入
2. 在矿洞第 1 层挖掘铜矿
3. 找到楼梯进入第 2 层
4. 返回农场，走到工坊按 E
5. 制作铜镐
6. 走到公告板接取任务
7. 完成任务领取奖励

- [ ] **Step 2: TypeScript 编译检查**

```bash
cd /workspace/farm-game && npx tsc --noEmit
```

- [ ] **Step 3: 最终提交**

```bash
git add -A && git commit -m "feat(v2): pixel farm V2 complete — mine, workshop, and quests"
```
