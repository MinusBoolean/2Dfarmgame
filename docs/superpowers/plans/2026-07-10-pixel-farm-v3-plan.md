# Pixel Farm V3 — 实施计划

> **For agentic workers:** Use superpowers:subagent-driven-development to implement task-by-task.

**Goal:** 在 V1/V2 基础上加入池塘钓鱼小游戏、觅食系统、果树、温室、出货箱、路径系统。

**Tech Stack:** Phaser 3 + TypeScript + Vite，沿用 V1/V2 架构。

---

## Task 1: 类型扩展

**Files:** Modify `src/types/index.ts`

- [ ] 新增类型：`FishData`, `ForageItem`, `FruitTreeData`, `PathType`

```typescript
export interface FishData {
  id: string;
  name: string;
  seasons: Season[];
  weather: Weather[];
  probability: number;
  sellPrice: number;
}

export interface ForageItem {
  id: string;
  name: string;
  seasons: Season[];
  probability: number;
  sellPrice: number;
}

export interface FruitTreeData {
  id: string;
  name: string;
  price: number;
  growthDays: number;
  fruitId: string;
  fruitName: string;
  fruitSellPrice: number;
  seasons: Season[];
}

export type PathType = 'stone' | 'wood' | 'grass';
```

- [ ] 扩展 SaveData：`shippingBin`, `forageItems`, `fruitTrees`, `paths`, `greenhouseUnlocked`
- [ ] 验证编译，提交

---

## Task 2: FishingSystem

**Files:** Create `src/systems/FishingSystem.ts`

- [ ] 实现 8 种鱼配置
- [ ] `startFishing()` — 开始钓鱼小游戏
- [ ] `calculateResult(pointerPosition)` — 根据指针位置计算钓到的鱼
- [ ] `getFishForConditions(season, weather)` — 获取当前条件下可钓鱼种
- [ ] 验证编译，提交

---

## Task 3: ForageSystem

**Files:** Create `src/systems/ForageSystem.ts`

- [ ] 实现 6 种觅食物品配置
- [ ] `generateDailyForage(season)` — 每天生成 3-5 个觅食物品
- [ ] `pickupForage(index)` — 拾取物品
- [ ] 验证编译，提交

---

## Task 4: FruitTreeSystem

**Files:** Create `src/systems/FruitTreeSystem.ts`

- [ ] 实现 3 种果树配置
- [ ] `plantTree(treeId, row, col)` — 种植果树
- [ ] `processDay(trees, season)` — 每日处理（生长/产出）
- [ ] `harvestFruit(tree)` — 收获果实
- [ ] 验证编译，提交

---

## Task 5: ShippingBinSystem

**Files:** Create `src/systems/ShippingBinSystem.ts`

- [ ] `addItem(item)` — 物品放入出货箱
- [ ] `settleDaily()` — 每日结算，返回总收入
- [ ] `getItems()` — 获取出货箱物品
- [ ] 验证编译，提交

---

## Task 6: PondScene — 钓鱼场景

**Files:** Create `src/scenes/PondScene.ts`

- [ ] 32x32 池塘地图（水面 + 岸边 + 钓鱼点）
- [ ] 玩家移动
- [ ] 钓鱼小游戏 UI（力度条 + 指针）
- [ ] 钓鱼结果展示
- [ ] 返回农场（ESC）
- [ ] 注册到 main.ts
- [ ] 验证编译，提交

---

## Task 7: GreenhouseScene — 温室场景

**Files:** Create `src/scenes/GreenhouseScene.ts`

- [ ] 16x12 温室地图（玻璃墙壁 + 种植区）
- [ ] 自动浇水
- [ ] 不受季节限制
- [ ] 返回农场（ESC）
- [ ] 注册到 main.ts
- [ ] 验证编译，提交

---

## Task 8: FarmScene V3 更新

**Files:** Modify `src/scenes/FarmScene.ts`

- [ ] 添加池塘入口（农场东边）
- [ ] 添加温室入口（农场西北角）
- [ ] 添加出货箱（西南角）
- [ ] 添加果树种植逻辑
- [ ] 添加路径铺设逻辑
- [ ] 每日刷新觅食物品
- [ ] 觅食物品自动拾取
- [ ] 出货箱交互
- [ ] 验证编译，提交

---

## Task 9: 钓鱼 UI

**Files:** Create `src/ui/FishingUI.ts`

- [ ] 力度条（垂直移动的指针）
- [ ] 成功区域标记
- [ ] 钓鱼结果弹窗
- [ ] 验证编译，提交

---

## Task 10: 出货箱 UI

**Files:** Create `src/ui/ShippingBinPanel.ts`

- [ ] 出货箱界面（显示可放入物品）
- [ ] 选择物品放入
- [ ] 显示当前出货箱内容
- [ ] 验证编译，提交

---

## Task 11: 素材生成

**Files:** 生成池塘和温室素材

- [ ] 生成池塘 tileset（水面、岸边、钓鱼点）
- [ ] 生成温室 tileset（玻璃、种植槽）
- [ ] 生成鱼精灵（8 种鱼图标）
- [ ] 生成觅食物品精灵（6 种）
- [ ] 生成果树精灵（3 种，含果实）
- [ ] 下载到 public/assets/
- [ ] 提交

---

## Task 12: 最终集成测试

- [ ] TypeScript 编译检查
- [ ] 完整 V3 流程测试
- [ ] 推送到 GitHub
