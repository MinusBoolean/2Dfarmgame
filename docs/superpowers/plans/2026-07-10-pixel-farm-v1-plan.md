# Pixel Farm V1 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从彩色方块原型升级为星露谷风格的像素农场游戏，包含完整种地循环、季节/天气/昼夜、体力/背包/商店、音效/特效。

**Architecture:** 保留现有游戏逻辑层（GrowthSystem/EconomySystem/SaveSystem），重写表现层。使用 Phaser Tilemap 渲染农场地图，Sprite Sheet 实现像素动画，AudioSystem 管理音效。多场景架构（BootScene + UIScene + FarmScene）。

**Tech Stack:** Phaser 3.90 + TypeScript + Vite 5，16x16 像素精灵，AI 生成素材。

## Global Constraints

- Canvas: 800x600, Scale: FIT, pixelArt: true, roundPixels: true
- Tile: 16x16, Farm: 64x48 tiles (1024x768)
- Initial gold: 100, Initial energy: 100, Initial inventory: 20 slots
- Save key: `pixel_farm_v1_save`, SaveData version: 2
- Season: 14 days/season, Day: 60 seconds (40 day + 20 night)
- All sprites AI-generated, unified 32-color palette
- TDD where applicable, frequent commits

---

## Task 1: 项目重置与 Phaser 配置

**Files:**
- Modify: `src/main.ts` — pixel art 渲染配置，多场景注册
- Modify: `src/config.ts` — 扩展为全局配置（世界尺寸、tile 大小、调色板）
- Modify: `src/types/index.ts` — 扩展类型定义

**Interfaces:**
- Produces: `GAME_CONFIG` 常量对象，包含所有游戏配置

- [ ] **Step 1: 重写 main.ts 配置**

```typescript
// src/main.ts
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { UIScene } from './scenes/UIScene';
import { FarmScene } from './scenes/FarmScene';
import { GAME_CONFIG } from './config';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_CONFIG.CANVAS_WIDTH,
  height: GAME_CONFIG.CANVAS_HEIGHT,
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  backgroundColor: '#2d5a27',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [BootScene, UIScene, FarmScene],
};

new Phaser.Game(config);
```

- [ ] **Step 2: 重写 config.ts**

```typescript
// src/config.ts
export const GAME_CONFIG = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 600,
  TILE_SIZE: 16,
  FARM_COLS: 64,
  FARM_ROWS: 48,
  PLAYER_SPEED: 120,
  INITIAL_GOLD: 100,
  INITIAL_ENERGY: 100,
  MAX_ENERGY: 100,
  INITIAL_INVENTORY_SIZE: 20,
  MAX_INVENTORY_SIZE: 40,
  SEASON_DAYS: 14,
  DAY_DURATION: 60000,      // 60 seconds per game day
  DAY_PORTION: 40000,       // 40 seconds daytime
  NIGHT_PORTION: 20000,     // 20 seconds nighttime
  SAVE_KEY: 'pixel_farm_v1_save',
  SAVE_VERSION: 2,
  CROW_CHANCE: 0.10,
  SCARECROW_RADIUS: 5,
  ENERGY_COSTS: {
    PLOW: 2,
    PLANT: 1,
    WATER: 2,
    HARVEST: 1,
  },
  QUALITY_TIERS: {
    NORMAL: { name: 'normal', multiplier: 1, minWaterDays: 0 },
    SILVER: { name: 'silver', multiplier: 1.25, minWaterDays: 3 },
    GOLD: { name: 'gold', multiplier: 1.5, minWaterDays: 7 },
    IRIDIUM: { name: 'iridium', multiplier: 2, minWaterDays: 14 },
  },
  COLORS: {
    GRASS: [0x4a8c3f, 0x6db856, 0x8fd672],
    DIRT: [0x8b6914, 0xa67c2e, 0xc49a48],
    WATER: [0x4a6fb5, 0x6b8fd6, 0x8bb5f5],
    WARM: [0xe8a030, 0xf0c060, 0xf8e090],
    GRAY: [0x404040, 0x606060, 0x808080],
  },
} as const;
```

- [ ] **Step 3: 重写 types/index.ts**

```typescript
// src/types/index.ts
export type TileState = 'empty' | 'plowed' | 'planted' | 'growing' | 'mature' | 'dead';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Weather = 'sunny' | 'rainy' | 'stormy' | 'foggy' | 'snowy';
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';
export type QualityTier = 'normal' | 'silver' | 'gold' | 'iridium';
export type FarmRating = 'copper' | 'silver' | 'gold' | 'iridium';
export type ToolType = 'hoe' | 'wateringCan' | 'food';

export interface CropConfig {
  id: string;
  name: string;
  seedPrice: number;
  sellPrice: number;
  growthDays: number;
  seasons: Season[];
  unlockCondition: { type: 'gold'; amount: number } | { type: 'rating'; rating: FarmRating };
  spriteFrames: {
    seed: string;
    sprout: string;
    growing: string;
    mature: string;
  };
}

export interface InventoryItem {
  id: string;
  name: string;
  type: 'seed' | 'crop' | 'food' | 'scarecrow';
  quantity: number;
  quality?: QualityTier;
  cropId?: string;
}

export interface TileSaveData {
  state: TileState;
  cropId?: string;
  plantTime?: number;
  wateredToday: boolean;
  consecutiveWaterDays: number;
  quality?: QualityTier;
}

export interface SaveData {
  version: number;
  gold: number;
  totalEarned: number;
  totalHarvested: number;
  currentSeason: number;
  currentDay: number;
  currentWeather: Weather;
  tomorrowWeather: Weather;
  energy: number;
  maxEnergy: number;
  inventorySize: number;
  inventory: InventoryItem[];
  farmGrid: TileSaveData[][];
  toolLevels: { hoe: number; wateringCan: number };
  unlockedCrops: string[];
  farmRating: FarmRating;
  tutorialDay: number;
  shippingBin: InventoryItem[];
  settings: {
    musicVolume: number;
    sfxVolume: number;
    timeSpeed: number;
    smartToolSwitch: boolean;
  };
}

export interface ParticleConfig {
  key: string;
  speed: { min: number; max: number };
  angle: { min: number; max: number };
  lifespan: number;
  quantity: number;
  scale: { start: number; end: number };
  tint?: number;
}
```

- [ ] **Step 4: 验证编译**

```bash
cd /workspace/farm-game && npx tsc --noEmit
```

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "refactor: reset project config for pixel art farm V1"
```

---

## Task 2: 素材生成 — 玩家角色

**Files:**
- Create: `public/assets/sprites/player_*.png` — 16 帧玩家精灵
- Create: `public/assets/sprites/manifest.json` — 素材清单

**Interfaces:**
- Produces: 玩家精灵文件（32x32 per frame），供 BootScene 加载

- [ ] **Step 1: 生成玩家精灵**

使用 image_generate 工具生成 4 组精灵（每组 4 帧：idle + walk1 + walk2 + walk3）：
- player_down: 面向下 x4 帧
- player_up: 面向上 x4 帧
- player_left: 面向左 x4 帧
- player_right: 面向右 x4 帧

Prompt 模板：`"pixel art character sprite, 32x32, 16-bit RPG style, farmer with hat, facing [direction], [idle/walking], warm color palette, transparent background, sprite sheet, 4 frames horizontal"`

- [ ] **Step 2: 下载并裁剪**

将生成的图片下载到 `public/assets/sprites/`，裁剪对齐到 32x32 网格。

- [ ] **Step 3: 创建素材清单**

```json
// public/assets/sprites/manifest.json
{
  "player": {
    "down": "player_down.png",
    "up": "player_up.png",
    "left": "player_left.png",
    "right": "player_right.png",
    "frameWidth": 32,
    "frameHeight": 32,
    "framesPerDirection": 4
  }
}
```

- [ ] **Step 4: 验证图片文件存在**

```bash
ls -la public/assets/sprites/player_*.png
```

- [ ] **Step 5: 提交**

```bash
git add public/assets/sprites/ && git commit -m "assets: add player character sprite sheets"
```

---

## Task 3: 素材生成 — 作物精灵

**Files:**
- Create: `public/assets/sprites/crops.png` — 作物精灵表（12种 x 4阶段）
- Modify: `public/assets/sprites/manifest.json` — 添加作物条目

**Interfaces:**
- Produces: crops.png (16x16 per frame, 12 rows x 4 columns)

- [ ] **Step 1: 生成作物精灵表**

使用 image_generate 生成 12 种作物的 4 阶段精灵：
- 阶段 1：种子（小点）
- 阶段 2：小苗（嫩芽）
- 阶段 3：大苗（有叶子）
- 阶段 4：成熟（有果实）

Prompt：`"pixel art crop sprites, 16x16 per tile, sprite sheet, 12 crops x 4 growth stages, Stardew Valley style, warm color palette, transparent background, crops: carrot wheat tomato corn watermelon potato pumpkin strawberry blueberry pepper eggplant spinach"`

- [ ] **Step 2: 下载并整理为 sprite sheet**

将图片裁剪为 12 行 x 4 列的 sprite sheet（总尺寸 64x192）。

- [ ] **Step 3: 更新 manifest.json**

```json
{
  "crops": {
    "file": "crops.png",
    "frameWidth": 16,
    "frameHeight": 16,
    "rows": 12,
    "columns": 4,
    "cropOrder": ["carrot", "wheat", "tomato", "corn", "watermelon", "potato", "pumpkin", "strawberry", "blueberry", "pepper", "eggplant", "spinach"],
    "stages": ["seed", "sprout", "growing", "mature"]
  }
}
```

- [ ] **Step 4: 提交**

```bash
git add public/assets/sprites/ && git commit -m "assets: add crop sprite sheet (12 crops x 4 stages)"
```

---

## Task 4: 素材生成 — Tileset

**Files:**
- Create: `public/assets/tilesets/farm_tiles.png` — 农场 tileset
- Create: `public/assets/maps/farm.json` — Tiled 格式农场地图

**Interfaces:**
- Produces: farm_tiles.png (16x16 per tile), farm.json (Tiled JSON)

- [ ] **Step 1: 生成 tileset**

使用 image_generate 生成 16x16 像素 tileset：
- 草地（3 种变体）
- 泥土（翻过/未翻/浇水后）
- 路径（石板/木板）
- 围栏（水平/垂直/转角）
- 建筑墙壁/屋顶
- 水面

Prompt：`"pixel art tileset, 16x16 per tile, Stardew Valley style, farm tiles: grass dirt path fence wall roof water, warm color palette, transparent background, tile sheet"`

- [ ] **Step 2: 创建 Tiled 地图**

使用 Tiled 编辑器（或代码生成）创建 64x48 的农场地图：
- Ground 层：草地 + 泥土区域
- Object 层：建筑、围栏、出货箱
- Collision 层：不可通行标记

如果无法使用 Tiled，用代码生成基础地图数据：

```typescript
// 生成基础地图数据（64x48）
// 中央 20x15 区域为可耕地（tile index 3 = 泥土）
// 其余为草地（tile index 0 = 草地）
// 左上角 6x6 为小屋区域
// 右下角 4x4 为出货箱区域
```

- [ ] **Step 3: 提交**

```bash
git add public/assets/tilesets/ public/assets/maps/ && git commit -m "assets: add farm tileset and map"
```

---

## Task 5: 素材生成 — UI 和粒子

**Files:**
- Create: `public/assets/sprites/ui.png` — UI 元素 atlas
- Create: `public/assets/sprites/particles.png` — 粒子精灵
- Create: `public/assets/sprites/items.png` — 物品图标（食物、稻草人）

**Interfaces:**
- Produces: ui.png, particles.png, items.png

- [ ] **Step 1: 生成 UI 元素**

使用 image_generate 生成像素风格 UI：
- 按钮（正常/悬停/按下）
- 面板背景（9-slice）
- 图标（金币、体力、天气、季节）
- 工具栏背景
- Tooltip 边框

Prompt：`"pixel art UI elements, 16-bit RPG style, buttons panel icons, Stardew Valley style, warm color palette, transparent background"`

- [ ] **Step 2: 生成粒子精灵**

使用代码生成简单粒子（8x8 像素）：
- 金色光点（金币/收获）
- 蓝色水滴（浇水/雨）
- 棕色碎片（翻地/泥土）
- 白色雪花
- 紫色光圈（品质）

```typescript
// 用 Phaser Graphics 生成粒子纹理（在 BootScene 中）
this.make.graphics({ x: 0, y: 0 })
  .fillStyle(0xffd700)
  .fillCircle(4, 4, 3)
  .generateTexture('particle_gold', 8, 8)
  .destroy();
```

- [ ] **Step 3: 生成物品图标**

使用 image_generate 生成：
- 面包（食物）
- 稻草人

Prompt：`"pixel art item icons, 16x16, bread and scarecrow, Stardew Valley style, warm palette"`

- [ ] **Step 4: 提交**

```bash
git add public/assets/sprites/ && git commit -m "assets: add UI elements, particles, and item icons"
```

---

## Task 6: 素材生成 — 音效

**Files:**
- Create: `public/assets/audio/bgm/` — 3 首 BGM
- Create: `public/assets/audio/sfx/` — ~10 个 SFX

**Interfaces:**
- Produces: 音频文件（.ogg + .mp3 格式）

- [ ] **Step 1: 下载 BGM**

从 freesound.org 或 opengameart.org 下载：
- farm_day.ogg — 轻松田园曲
- farm_night.ogg — 宁静钢琴曲
- shop.ogg — 轻快电子曲

- [ ] **Step 2: 下载 SFX**

从 freesound.org 下载：
- plow.ogg — 泥土翻动声
- plant.ogg — 种子落入泥土
- water.ogg — 水流声
- harvest.ogg — 清脆收获声
- coin.ogg — 硬币声
- click.ogg — UI 按钮声
- backpack.ogg — 打开声
- season.ogg — 季节切换提示
- rain.ogg — 雨声循环
- wind.ogg — 风声循环

- [ ] **Step 3: 验证文件**

```bash
ls -la public/assets/audio/bgm/ public/assets/audio/sfx/
```

- [ ] **Step 4: 提交**

```bash
git add public/assets/audio/ && git commit -m "assets: add BGM and SFX audio files"
```

---

## Task 7: CropConfig 数据

**Files:**
- Create: `src/entities/CropConfig.ts` — 12 种作物配置

**Interfaces:**
- Produces: `CROPS: CropConfig[]`, `getCropById(id: string): CropConfig | undefined`

- [ ] **Step 1: 实现 CropConfig**

```typescript
// src/entities/CropConfig.ts
import { CropConfig } from '../types';

export const CROPS: CropConfig[] = [
  {
    id: 'carrot',
    name: '胡萝卜',
    seedPrice: 10,
    sellPrice: 20,
    growthDays: 3,
    seasons: ['spring'],
    unlockCondition: { type: 'gold', amount: 0 },
    spriteFrames: { seed: 'crop_carrot_0', sprout: 'crop_carrot_1', growing: 'crop_carrot_2', mature: 'crop_carrot_3' },
  },
  {
    id: 'wheat',
    name: '小麦',
    seedPrice: 5,
    sellPrice: 12,
    growthDays: 4,
    seasons: ['spring', 'summer'],
    unlockCondition: { type: 'gold', amount: 0 },
    spriteFrames: { seed: 'crop_wheat_0', sprout: 'crop_wheat_1', growing: 'crop_wheat_2', mature: 'crop_wheat_3' },
  },
  // ... 10 more crops following same pattern
];

export function getCropById(id: string): CropConfig | undefined {
  return CROPS.find(c => c.id === id);
}

export function getUnlockedCrops(totalEarned: number, farmRating: string): CropConfig[] {
  return CROPS.filter(crop => {
    if (crop.unlockCondition.type === 'gold') return totalEarned >= crop.unlockCondition.amount;
    return false; // rating-based unlocks handled separately
  });
}
```

- [ ] **Step 2: 验证编译**

```bash
cd /workspace/farm-game && npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add src/entities/CropConfig.ts && git commit -m "feat: add 12-crop configuration with unlock tiers"
```

---

## Task 8: SaveSystem 重写

**Files:**
- Modify: `src/systems/SaveSystem.ts` — v2 存档结构

**Interfaces:**
- Consumes: `SaveData` from types
- Produces: `SaveSystem.save(data)`, `SaveSystem.load(): SaveData`, `SaveSystem.clear()`

- [ ] **Step 1: 实现 SaveSystem**

```typescript
// src/systems/SaveSystem.ts
import { SaveData } from '../types';
import { GAME_CONFIG } from '../config';

export class SaveSystem {
  private static readonly KEY = GAME_CONFIG.SAVE_KEY;
  private static readonly VERSION = GAME_CONFIG.SAVE_VERSION;

  static createDefault(): SaveData {
    return {
      version: this.VERSION,
      gold: GAME_CONFIG.INITIAL_GOLD,
      totalEarned: 0,
      totalHarvested: 0,
      currentSeason: 0,
      currentDay: 1,
      currentWeather: 'sunny',
      tomorrowWeather: 'sunny',
      energy: GAME_CONFIG.INITIAL_ENERGY,
      maxEnergy: GAME_CONFIG.MAX_ENERGY,
      inventorySize: GAME_CONFIG.INITIAL_INVENTORY_SIZE,
      inventory: [
        { id: 'seed_carrot', name: '胡萝卜种子', type: 'seed', quantity: 5, cropId: 'carrot' },
        { id: 'seed_wheat', name: '小麦种子', type: 'seed', quantity: 5, cropId: 'wheat' },
      ],
      farmGrid: Array.from({ length: GAME_CONFIG.FARM_ROWS }, () =>
        Array.from({ length: GAME_CONFIG.FARM_COLS }, () => ({
          state: 'empty' as const,
          wateredToday: false,
          consecutiveWaterDays: 0,
        }))
      ),
      toolLevels: { hoe: 1, wateringCan: 1 },
      unlockedCrops: ['carrot', 'wheat', 'spinach'],
      farmRating: 'copper',
      tutorialDay: 1,
      shippingBin: [],
      settings: { musicVolume: 0.7, sfxVolume: 0.8, timeSpeed: 1, smartToolSwitch: true },
    };
  }

  static save(data: SaveData): void {
    try {
      data.version = this.VERSION;
      localStorage.setItem(this.KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Save failed:', e);
    }
  }

  static load(): SaveData {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return this.createDefault();
      const saved = JSON.parse(raw) as SaveData;
      return this.migrate(saved);
    } catch (e) {
      console.error('Load failed, creating default:', e);
      return this.createDefault();
    }
  }

  static clear(): void {
    localStorage.removeItem(this.KEY);
  }

  private static migrate(data: SaveData): SaveData {
    const defaults = this.createDefault();
    // Fill missing fields with defaults
    for (const key of Object.keys(defaults) as (keyof SaveData)[]) {
      if (data[key] === undefined) {
        (data as any)[key] = defaults[key];
      }
    }
    return data;
  }
}
```

- [ ] **Step 2: 验证编译**

```bash
cd /workspace/farm-game && npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add src/systems/SaveSystem.ts && git commit -m "feat: rewrite SaveSystem with v2 structure and migration"
```

---

## Task 9: InventorySystem

**Files:**
- Create: `src/systems/InventorySystem.ts` — 背包管理

**Interfaces:**
- Consumes: `InventoryItem`, `SaveData`
- Produces: `addItem()`, `removeItem()`, `hasItem()`, `getItemCount()`, `isFull()`

- [ ] **Step 1: 实现 InventorySystem**

```typescript
// src/systems/InventorySystem.ts
import { InventoryItem, QualityTier } from '../types';

export class InventorySystem {
  private items: InventoryItem[];
  private maxSize: number;

  constructor(items: InventoryItem[], maxSize: number) {
    this.items = items;
    this.maxSize = maxSize;
  }

  getItems(): InventoryItem[] { return this.items; }
  getMaxSize(): number { return this.maxSize; }
  setSize(size: number): void { this.maxSize = size; }

  isFull(): boolean {
    return this.items.length >= this.maxSize;
  }

  hasItem(id: string, quality?: QualityTier): boolean {
    return this.items.some(i => i.id === id && (!quality || i.quality === quality));
  }

  getItemCount(id: string, quality?: QualityTier): number {
    const item = this.items.find(i => i.id === id && (!quality || i.quality === quality));
    return item ? item.quantity : 0;
  }

  addItem(item: InventoryItem): boolean {
    const existing = this.items.find(i => i.id === item.id && i.quality === item.quality);
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + item.quantity);
      return true;
    }
    if (this.isFull()) return false;
    this.items.push({ ...item });
    return true;
  }

  removeItem(id: string, quantity: number, quality?: QualityTier): boolean {
    const idx = this.items.findIndex(i => i.id === id && (!quality || i.quality === quality));
    if (idx === -1) return false;
    const item = this.items[idx];
    if (item.quantity < quantity) return false;
    item.quantity -= quantity;
    if (item.quantity <= 0) this.items.splice(idx, 1);
    return true;
  }

  getSeedsForSeason(season: string): InventoryItem[] {
    return this.items.filter(i => i.type === 'seed');
  }
}
```

- [ ] **Step 2: 验证编译并提交**

```bash
cd /workspace/farm-game && npx tsc --noEmit && git add -A && git commit -m "feat: add InventorySystem with stacking and capacity"
```

---

## Task 10: EconomySystem 重写

**Files:**
- Modify: `src/systems/EconomySystem.ts` — 扩展支持品质和新物品

**Interfaces:**
- Consumes: `InventoryItem`, `CropConfig`, `QualityTier`
- Produces: `buySeed()`, `sellItem()`, `buyScarecrow()`, `buyFood()`, `upgradeTool()`, `expandInventory()`

- [ ] **Step 1: 实现 EconomySystem**

```typescript
// src/systems/EconomySystem.ts
import { InventoryItem, QualityTier, SaveData } from '../types';
import { getCropById } from '../entities/CropConfig';
import { InventorySystem } from './InventorySystem';

export class EconomySystem {
  static buySeed(saveData: SaveData, inventory: InventorySystem, cropId: string): boolean {
    const crop = getCropById(cropId);
    if (!crop || saveData.gold < crop.seedPrice) return false;
    const seedId = `seed_${cropId}`;
    const added = inventory.addItem({ id: seedId, name: `${crop.name}种子`, type: 'seed', quantity: 1, cropId });
    if (!added) return false;
    saveData.gold -= crop.seedPrice;
    return true;
  }

  static sellItem(saveData: SaveData, inventory: InventorySystem, itemId: string, quality?: QualityTier): boolean {
    const item = inventory.getItems().find(i => i.id === itemId && (!quality || i.quality === quality));
    if (!item || item.type !== 'crop') return false;
    const crop = getCropById(item.cropId || '');
    if (!crop) return false;
    const qualityMultiplier = this.getQualityMultiplier(quality || 'normal');
    const price = Math.floor(crop.sellPrice * qualityMultiplier);
    inventory.removeItem(itemId, 1, quality);
    saveData.gold += price;
    saveData.totalEarned += price;
    return true;
  }

  static buyFood(saveData: SaveData, inventory: InventorySystem): boolean {
    if (saveData.gold < 20) return false;
    if (!inventory.addItem({ id: 'food_bread', name: '面包', type: 'food', quantity: 1 })) return false;
    saveData.gold -= 20;
    return true;
  }

  static upgradeTool(saveData: SaveData, tool: 'hoe' | 'wateringCan'): boolean {
    const currentLevel = saveData.toolLevels[tool];
    if (currentLevel >= 3) return false;
    const cost = currentLevel * 500;
    if (saveData.gold < cost) return false;
    saveData.gold -= cost;
    saveData.toolLevels[tool]++;
    return true;
  }

  static expandInventory(saveData: SaveData): boolean {
    if (saveData.inventorySize >= 40) return false;
    const cost = 500;
    if (saveData.gold < cost) return false;
    saveData.gold -= cost;
    saveData.inventorySize += 4;
    return true;
  }

  private static getQualityMultiplier(quality: QualityTier): number {
    const map: Record<QualityTier, number> = { normal: 1, silver: 1.25, gold: 1.5, iridium: 2 };
    return map[quality];
  }
}
```

- [ ] **Step 2: 验证编译并提交**

```bash
cd /workspace/farm-game && npx tsc --noEmit && git add -A && git commit -m "feat: rewrite EconomySystem with quality tiers and new item types"
```

---

## Task 11: GrowthSystem 重写

**Files:**
- Modify: `src/systems/GrowthSystem.ts` — 支持品质、季节、天气

**Interfaces:**
- Consumes: `TileSaveData`, `CropConfig`, `Season`, `Weather`
- Produces: `update()`, `advanceDay()`, `getGrowthProgress()`

- [ ] **Step 1: 实现 GrowthSystem**

```typescript
// src/systems/GrowthSystem.ts
import { TileSaveData, Season, Weather, QualityTier } from '../types';
import { getCropById } from '../entities/CropConfig';

export class GrowthSystem {
  static update(tile: TileSaveData, currentDay: number, season: Season): void {
    if (tile.state !== 'planted' && tile.state !== 'growing') return;
    const crop = getCropById(tile.cropId || '');
    if (!crop) return;
    if (!crop.seasons.includes(season)) {
      tile.state = 'dead';
      return;
    }
    if (!tile.wateredToday) return;
    tile.consecutiveWaterDays++;
    const daysSincePlant = currentDay - (tile.plantTime || 0);
    const progress = daysSincePlant / crop.growthDays;
    if (progress >= 1) {
      tile.state = 'mature';
      tile.quality = this.calculateQuality(tile.consecutiveWaterDays);
    } else if (progress >= 0.5) {
      tile.state = 'growing';
    }
  }

  static advanceDay(tiles: TileSaveData[][], season: Season, weather: Weather): void {
    for (const row of tiles) {
      for (const tile of row) {
        if (weather === 'rainy' || weather === 'stormy') {
          tile.wateredToday = true;
        }
        if (tile.state === 'planted' || tile.state === 'growing') {
          if (!tile.wateredToday) {
            tile.consecutiveWaterDays = 0;
          }
        }
        if (tile.state === 'dead') continue;
        tile.wateredToday = false;
      }
    }
  }

  static getGrowthProgress(tile: TileSaveData): number {
    const crop = getCropById(tile.cropId || '');
    if (!crop || !tile.plantTime) return 0;
    return Math.min(1, (tile.plantTime) / crop.growthDays);
  }

  private static calculateQuality(waterDays: number): QualityTier {
    if (waterDays >= 14) return 'iridium';
    if (waterDays >= 7) return 'gold';
    if (waterDays >= 3) return 'silver';
    return 'normal';
  }
}
```

- [ ] **Step 2: 验证编译并提交**

```bash
cd /workspace/farm-game && npx tsc --noEmit && git add -A && git commit -m "feat: rewrite GrowthSystem with quality, season, weather support"
```

---

## Task 12: SeasonSystem + WeatherSystem

**Files:**
- Create: `src/systems/SeasonSystem.ts` — 季节管理
- Create: `src/systems/WeatherSystem.ts` — 天气管理

**Interfaces:**
- Produces: `SeasonSystem.advanceDay()`, `WeatherSystem.generateWeather()`

- [ ] **Step 1: 实现 SeasonSystem**

```typescript
// src/systems/SeasonSystem.ts
import { Season } from '../types';
import { GAME_CONFIG } from '../config';

export class SeasonSystem {
  static readonly SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];

  static getSeason(index: number): Season {
    return this.SEASONS[index % 4];
  }

  static getSeasonName(season: Season): string {
    const map: Record<Season, string> = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
    return map[season];
  }

  static advanceDay(currentSeason: number, currentDay: number): { season: number; day: number; seasonChanged: boolean } {
    let day = currentDay + 1;
    let season = currentSeason;
    let seasonChanged = false;
    if (day > GAME_CONFIG.SEASON_DAYS) {
      day = 1;
      season = (season + 1) % 4;
      seasonChanged = true;
    }
    return { season, day, seasonChanged };
  }
}
```

- [ ] **Step 2: 实现 WeatherSystem**

```typescript
// src/systems/WeatherSystem.ts
import { Season, Weather } from '../types';

export class WeatherSystem {
  private static readonly WEATHER_TABLE: Record<Season, { weather: Weather; weight: number }[]> = {
    spring: [
      { weather: 'sunny', weight: 60 },
      { weather: 'rainy', weight: 30 },
      { weather: 'foggy', weight: 10 },
    ],
    summer: [
      { weather: 'sunny', weight: 70 },
      { weather: 'rainy', weight: 20 },
      { weather: 'stormy', weight: 10 },
    ],
    autumn: [
      { weather: 'sunny', weight: 50 },
      { weather: 'rainy', weight: 30 },
      { weather: 'foggy', weight: 20 },
    ],
    winter: [
      { weather: 'sunny', weight: 40 },
      { weather: 'snowy', weight: 60 },
    ],
  };

  static generateWeather(season: Season): Weather {
    const table = this.WEATHER_TABLE[season];
    const total = table.reduce((s, w) => s + w.weight, 0);
    let roll = Math.random() * total;
    for (const entry of table) {
      roll -= entry.weight;
      if (roll <= 0) return entry.weather;
    }
    return 'sunny';
  }

  static getWeatherName(weather: Weather): string {
    const map: Record<Weather, string> = { sunny: '晴', rainy: '雨', stormy: '雷', foggy: '雾', snowy: '雪' };
    return map[weather];
  }

  static affectsMovement(weather: Weather): number {
    if (weather === 'rainy') return 0.9;
    if (weather === 'snowy') return 0.8;
    return 1;
  }

  static autoWaters(weather: Weather): boolean {
    return weather === 'rainy' || weather === 'stormy';
  }
}
```

- [ ] **Step 3: 验证编译并提交**

```bash
cd /workspace/farm-game && npx tsc --noEmit && git add -A && git commit -m "feat: add SeasonSystem and WeatherSystem"
```

---

## Task 13: EnergySystem

**Files:**
- Create: `src/systems/EnergySystem.ts` — 体力管理

- [ ] **Step 1: 实现 EnergySystem**

```typescript
// src/systems/EnergySystem.ts
import { GAME_CONFIG } from '../config';

export class EnergySystem {
  static canPerform(energy: number, cost: number): boolean {
    return energy >= cost;
  }

  static consume(energy: number, cost: number): number {
    return Math.max(0, energy - cost);
  }

  static restore(energy: number, amount: number): number {
    return Math.min(GAME_CONFIG.MAX_ENERGY, energy + amount);
  }

  static isLow(energy: number): boolean {
    return energy <= 10;
  }

  static isEmpty(energy: number): boolean {
    return energy <= 0;
  }

  static getCostMultiplier(toolLevel: number): number {
    return Math.max(0.5, 1 - (toolLevel - 1) * 0.15);
  }
}
```

- [ ] **Step 2: 验证编译并提交**

```bash
cd /workspace/farm-game && npx tsc --noEmit && git add -A && git commit -m "feat: add EnergySystem"
```

---

## Task 14: AudioSystem

**Files:**
- Create: `src/systems/AudioSystem.ts` — 音频管理

- [ ] **Step 1: 实现 AudioSystem**

```typescript
// src/systems/AudioSystem.ts
import Phaser from 'phaser';

export class AudioSystem {
  private scene: Phaser.Scene;
  private currentBgm: Phaser.Sound.BaseSound | null = null;
  private musicVolume: number;
  private sfxVolume: number;

  constructor(scene: Phaser.Scene, musicVolume = 0.7, sfxVolume = 0.8) {
    this.scene = scene;
    this.musicVolume = musicVolume;
    this.sfxVolume = sfxVolume;
  }

  setMusicVolume(vol: number): void { this.musicVolume = vol; }
  setSfxVolume(vol: number): void { this.sfxVolume = vol; }

  playBgm(key: string, loop = true): void {
    if (this.currentBgm?.key === key) return;
    this.stopBgm();
    this.currentBgm = this.scene.sound.add(key, { loop, volume: this.musicVolume });
    this.currentBgm.play();
  }

  stopBgm(): void {
    if (this.currentBgm) {
      this.currentBgm.stop();
      this.currentBgm.destroy();
      this.currentBgm = null;
    }
  }

  playSfx(key: string): void {
    this.scene.sound.play(key, { volume: this.sfxVolume });
  }
}
```

- [ ] **Step 2: 验证编译并提交**

```bash
cd /workspace/farm-game && npx tsc --noEmit && git add -A && git commit -m "feat: add AudioSystem"
```

---

## Task 15: BootScene — 资源加载

**Files:**
- Rewrite: `src/scenes/BootScene.ts` — 真实资源预加载

- [ ] **Step 1: 实现 BootScene**

```typescript
// src/scenes/BootScene.ts
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  preload(): void {
    const { width, height } = this.scale;
    const barW = 300, barH = 20;
    const barX = (width - barW) / 2, barY = height / 2;

    const bg = this.add.rectangle(width / 2, height / 2, barW + 4, barH + 4, 0x333333);
    const bar = this.add.rectangle(barX + 2, barY + 2, 0, barH - 4, 0x4a8c3f).setOrigin(0, 0);
    const text = this.add.text(width / 2, barY - 20, '加载中...', { fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);

    this.load.on('progress', (v: number) => {
      bar.width = (barW - 4) * v;
      text.setText(`加载中... ${Math.floor(v * 100)}%`);
    });

    this.load.spritesheet('player_down', 'assets/sprites/player_down.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('player_up', 'assets/sprites/player_up.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('player_left', 'assets/sprites/player_left.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('player_right', 'assets/sprites/player_right.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('crops', 'assets/sprites/crops.png', { frameWidth: 16, frameHeight: 16 });
    this.load.image('farm_tiles', 'assets/tilesets/farm_tiles.png');
    this.load.tilemapTiledJSON('farm_map', 'assets/maps/farm.json');
    this.load.image('ui_atlas', 'assets/sprites/ui.png');
    this.load.image('items_atlas', 'assets/sprites/items.png');
    this.load.image('particle_gold', 'assets/sprites/particles.png');

    // Audio
    this.load.audio('bgm_day', ['assets/audio/bgm/farm_day.ogg', 'assets/audio/bgm/farm_day.mp3']);
    this.load.audio('bgm_night', ['assets/audio/bgm/farm_night.ogg', 'assets/audio/bgm/farm_night.mp3']);
    this.load.audio('sfx_plow', ['assets/audio/sfx/plow.ogg', 'assets/audio/sfx/plow.mp3']);
    this.load.audio('sfx_plant', ['assets/audio/sfx/plant.ogg', 'assets/audio/sfx/plant.mp3']);
    this.load.audio('sfx_water', ['assets/audio/sfx/water.ogg', 'assets/audio/sfx/water.mp3']);
    this.load.audio('sfx_harvest', ['assets/audio/sfx/harvest.ogg', 'assets/audio/sfx/harvest.mp3']);
    this.load.audio('sfx_coin', ['assets/audio/sfx/coin.ogg', 'assets/audio/sfx/coin.mp3']);
    this.load.audio('sfx_click', ['assets/audio/sfx/click.ogg', 'assets/audio/sfx/click.mp3']);
    this.load.audio('sfx_rain', ['assets/audio/sfx/rain.ogg', 'assets/audio/sfx/rain.mp3']);
    this.load.audio('sfx_season', ['assets/audio/sfx/season.ogg', 'assets/audio/sfx/season.mp3']);
  }

  create(): void {
    this.createPlayerAnimations();
    this.createParticleTextures();
    this.scene.start('FarmScene');
    this.scene.launch('UIScene');
  }

  private createPlayerAnimations(): void {
    const dirs = ['down', 'up', 'left', 'right'];
    for (const dir of dirs) {
      this.anims.create({
        key: `walk_${dir}`,
        frames: this.anims.generateFrameNumbers(`player_${dir}`, { start: 1, end: 3 }),
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({
        key: `idle_${dir}`,
        frames: [{ key: `player_${dir}`, frame: 0 }],
        frameRate: 1,
      });
    }
  }

  private createParticleTextures(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffd700); g.fillCircle(4, 4, 3); g.generateTexture('particle_gold', 8, 8); g.clear();
    g.fillStyle(0x6b8fd6); g.fillCircle(4, 4, 3); g.generateTexture('particle_water', 8, 8); g.clear();
    g.fillStyle(0xa67c2e); g.fillRect(1, 1, 6, 6); g.generateTexture('particle_dirt', 8, 8); g.clear();
    g.fillStyle(0xffffff); g.fillCircle(4, 4, 2); g.generateTexture('particle_snow', 8, 8);
    g.destroy();
  }
}
```

- [ ] **Step 2: 验证编译并提交**

```bash
cd /workspace/farm-game && npx tsc --noEmit && git add -A && git commit -m "feat: rewrite BootScene with real asset loading"
```

---

## Task 16: UIScene — HUD

**Files:**
- Create: `src/scenes/UIScene.ts` — 常驻 HUD 场景

- [ ] **Step 1: 实现 UIScene**

UIScene 并行运行，显示：
- 左上：金币图标 + 数字
- 中上：Day X | 季节 | 天气 → 明天天气
- 右上：体力条（绿→红渐变）
- 保存指示器
- 背包面板（B 键切换）
- 商店面板（E 键切换，靠近商店时）
- 设置菜单（ESC 键切换）

UIScene 通过事件监听 FarmScene 的数据变化：

```typescript
// 监听 FarmScene 事件
const farmScene = this.scene.get('FarmScene');
farmScene.events.on('gold-changed', (gold: number) => this.updateGold(gold));
farmScene.events.on('day-changed', (day: number, season: string) => this.updateDay(day, season));
farmScene.events.on('weather-changed', (weather: string) => this.updateWeather(weather));
farmScene.events.on('energy-changed', (energy: number) => this.updateEnergy(energy));
```

- [ ] **Step 2: 验证编译并提交**

---

## Task 17: FarmScene — Tilemap + 玩家

**Files:**
- Rewrite: `src/scenes/FarmScene.ts` — Tilemap 渲染 + 玩家控制

- [ ] **Step 1: 实现 FarmScene 核心**

FarmScene 负责：
- 加载 Tilemap（64x48）
- 创建玩家 Sprite（32x32，Arcade Physics）
- Camera 跟随玩家
- 输入处理（WASD/方向键移动，空格使用工具，B 打开背包）
- 工具操作（翻地/播种/浇水/收获）
- 时间系统（昼夜循环，每天 60 秒）
- 天气效果（雨/雪粒子）
- 作物状态管理
- 保存/加载

- [ ] **Step 2: 验证编译并提交**

---

## Task 18: Toolbar + ShopPanel + SeedSelector

**Files:**
- Rewrite: `src/ui/Toolbar.ts` — 像素风格工具栏
- Rewrite: `src/ui/ShopPanel.ts` — 像素风格商店
- Rewrite: `src/ui/SeedSelector.ts` — 种子选择弹窗

- [ ] **Step 1: 实现 Toolbar**

底部工具栏：6 个格子，像素风格面板，数字键切换。

- [ ] **Step 2: 实现 ShopPanel**

商店面板：左侧购买种子，右侧出售作物，品质显示。

- [ ] **Step 3: 实现 SeedSelector**

种子选择器：播种时弹出，显示可用种子。

- [ ] **Step 4: 验证编译并提交**

---

## Task 19: 每日结算 + 教程 + 评级

**Files:**
- Create: `src/ui/DailySummary.ts` — 每日结算面板
- Create: `src/systems/TutorialSystem.ts` — 教程系统
- Create: `src/systems/RatingSystem.ts` — 农场评级系统

- [ ] **Step 1: 实现 DailySummary**

晚上自动触发，显示今日收入、收获数、浇水数。

- [ ] **Step 2: 实现 TutorialSystem**

前 5 天引导任务，完成获得奖励。

- [ ] **Step 3: 实现 RatingSystem**

铜/银/金/铱评级，解锁新作物。

- [ ] **Step 4: 验证编译并提交**

---

## Task 20: 游戏手感 — 粒子 + 震动 + 动画

**Files:**
- Modify: `src/scenes/FarmScene.ts` — 添加粒子和震动效果

- [ ] **Step 1: 添加屏幕震动**

翻地/收获/升级时的屏幕震动。

- [ ] **Step 2: 添加粒子效果**

翻地泥土、浇水水花、收获金币、天气雨雪。

- [ ] **Step 3: 添加 UI 动画**

面板打开/关闭 tween，作物生长弹跳动画。

- [ ] **Step 4: 验证编译并提交**

---

## Task 21: 存档集成 + 设置

**Files:**
- Modify: `src/scenes/FarmScene.ts` — 存档触发
- Modify: `src/scenes/UIScene.ts` — 设置菜单

- [ ] **Step 1: 实现存档触发**

每次操作后自动保存，显示保存指示器。

- [ ] **Step 2: 实现设置菜单**

ESC 键打开，音量/流速/开关/重置存档。

- [ ] **Step 3: 验证编译并提交**

---

## Task 22: 最终集成测试

- [ ] **Step 1: 完整游戏流程测试**

从新游戏开始，玩完整的一天：
1. 翻地 3 块
2. 播种胡萝卜
3. 浇水
4. 等待生长（快速模式）
5. 收获
6. 去商店卖
7. 买新种子
8. 扩地

- [ ] **Step 2: 存档/读档测试**

- [ ] **Step 3: TypeScript 编译检查**

```bash
cd /workspace/farm-game && npx tsc --noEmit
```

- [ ] **Step 4: 最终提交**

```bash
git add -A && git commit -m "feat: pixel farm V1 complete — playable pixel art farming game"
```
