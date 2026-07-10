# 2D 农场游戏 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个基于 Phaser 3 + TypeScript + Vite 的 2D 像素风格农场模拟经营网页游戏，实现翻地→播种→生长→收获→出售的完整种地循环。

**Architecture:** Phaser 3 场景驱动架构，FarmScene 作为主场景承载所有游戏逻辑，通过独立系统类管理生长计时、经济流转和存档持久化，地块和角色为独立实体游戏对象，UI 层通过 Phaser GameObjects 叠加渲染。

**Tech Stack:** Phaser 3.80+, TypeScript 5.x, Vite 5.x

## Global Constraints

- 画布尺寸：800×600，Scale mode: FIT
- 地块大小：64×64 像素，初始网格 4×4
- 初始金币：100
- 数据持久化：localStorage key = `farm_game_save`
- 所有精灵使用程序化生成的彩色矩形占位（无外部美术资源依赖）
- 作物生长时间在开发阶段缩短为设计文档值的 1/10（3秒/6秒/9秒/12秒/18秒），方便调试

---

### Task 1: 项目脚手架搭建

**Files:**
- Create: `farm-game/package.json`
- Create: `farm-game/tsconfig.json`
- Create: `farm-game/vite.config.ts`
- Create: `farm-game/index.html`
- Create: `farm-game/src/main.ts`

**Interfaces:**
- Produces: Phaser 游戏实例启动，端口 5173

- [ ] **Step 1: 初始化项目目录**

```bash
mkdir -p farm-game/src farm-game/public
```

- [ ] **Step 2: 创建 package.json**

```json
{
  "name": "farm-game",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "phaser": "^3.80.1"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 3: 安装依赖**

```bash
npm install
```

- [ ] **Step 4: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "sourceMap": true,
    "declaration": false,
    "jsx": "preserve"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 5: 创建 vite.config.ts**

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    allowedHosts: ['.monkeycode-ai.online']
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});
```

- [ ] **Step 6: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>农场游戏</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #1a1a2e; display: flex; justify-content: center; align-items: center; min-height: 100vh; overflow: hidden; }
  </style>
</head>
<body>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 7: 创建 src/main.ts（最小 Phaser 启动）**

```typescript
import Phaser from 'phaser';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: document.body,
  backgroundColor: '#5c94fc',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: {
    create() {
      this.add.text(400, 300, 'Farm Game', { fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
    }
  }
};

new Phaser.Game(config);
```

- [ ] **Step 8: 验证项目启动**

```bash
npm run dev
```

Expected: 浏览器打开后显示蓝色背景，居中显示 "Farm Game" 白色文字。

- [ ] **Step 9: 提交**

```bash
git add farm-game/ && git commit -m "feat: scaffold Phaser + TypeScript + Vite project"
```

---

### Task 2: 类型定义与游戏常量

**Files:**
- Create: `farm-game/src/types/index.ts`
- Create: `farm-game/src/config.ts`

**Interfaces:**
- Produces: `TileState`, `CropConfig`, `TileData`, `SaveData`, `ToolType`, `GAME_CONFIG` 常量

- [ ] **Step 1: 创建类型定义文件**

```typescript
// farm-game/src/types/index.ts

export type TileState = 'empty' | 'plowed' | 'growing' | 'mature';

export interface CropConfig {
  id: string;
  name: string;
  growthStages: number;
  growTime: number;
  buyPrice: number;
  sellPrice: number;
  unlockGold: number;
  tileColor: number;
  matureColor: number;
}

export interface TileData {
  state: TileState;
  cropId: string | null;
  plantTime: number | null;
}

export interface SaveData {
  gold: number;
  totalEarned: number;
  inventory: Record<string, number>;
  farmGrid: TileData[][];
  unlockedTiles: number;
  unlockedCrops: string[];
  lastSaveTime: number;
}

export enum ToolType {
  PLOW = 'plow',
  SEED = 'seed',
  WATER = 'water',
  HARVEST = 'harvest'
}
```

- [ ] **Step 2: 创建游戏常量文件**

```typescript
// farm-game/src/config.ts

export const GAME_CONFIG = {
  WIDTH: 800,
  HEIGHT: 600,
  TILE_SIZE: 64,
  GRID_COLS: 8,
  GRID_ROWS: 8,
  INITIAL_UNLOCKED_TILES: 16,
  INITIAL_GOLD: 100,
  PLAYER_SPEED: 160,
  SAVE_KEY: 'farm_game_save',
  GRID_OFFSET_X: 144,
  GRID_OFFSET_Y: 44,
  TILE_EXPANSION_COST: 200,
  COLORS: {
    GRASS: 0x4a7c3f,
    PLOWED: 0x8b6914,
    GROWING: 0x6baa3e,
    EMPTY_HIGHLIGHT: 0x5a9c4f,
    PLAYER: 0x4488ff,
    HUD_BG: 0x2d2d2d,
    HUD_TEXT: '#ffffff',
    TOOLBAR_BG: 0x3d3d3d,
    SHOP_BG: 0x1a1a2e,
    SHOP_PANEL: 0x2d2d44,
    BUTTON: 0x4a4a6a,
    BUTTON_HOVER: 0x6a6a8a,
    GOLD_COLOR: '#ffd700'
  }
} as const;
```

- [ ] **Step 3: 验证编译**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: 提交**

```bash
git add farm-game/src/types/ farm-game/src/config.ts && git commit -m "feat: add type definitions and game constants"
```

---

### Task 3: 作物配置数据

**Files:**
- Create: `farm-game/src/entities/CropConfig.ts`

**Interfaces:**
- Produces: `CROPS` 数组, `getCropById(id)`, `getUnlockedCrops(totalEarned, alreadyUnlocked)`

- [ ] **Step 1: 创建作物配置文件**

```typescript
// farm-game/src/entities/CropConfig.ts

import { CropConfig } from '../types';

export const CROPS: CropConfig[] = [
  {
    id: 'carrot',
    name: '萝卜',
    growthStages: 3,
    growTime: 3,
    buyPrice: 5,
    sellPrice: 15,
    unlockGold: 0,
    tileColor: 0x8b6914,
    matureColor: 0xff6b35
  },
  {
    id: 'wheat',
    name: '小麦',
    growthStages: 3,
    growTime: 6,
    buyPrice: 10,
    sellPrice: 30,
    unlockGold: 0,
    tileColor: 0x8b6914,
    matureColor: 0xf5d742
  },
  {
    id: 'corn',
    name: '玉米',
    growthStages: 4,
    growTime: 9,
    buyPrice: 25,
    sellPrice: 70,
    unlockGold: 100,
    tileColor: 0x8b6914,
    matureColor: 0xffcc00
  },
  {
    id: 'tomato',
    name: '番茄',
    growthStages: 4,
    growTime: 12,
    buyPrice: 50,
    sellPrice: 130,
    unlockGold: 300,
    tileColor: 0x8b6914,
    matureColor: 0xff4444
  },
  {
    id: 'watermelon',
    name: '西瓜',
    growthStages: 5,
    growTime: 18,
    buyPrice: 100,
    sellPrice: 250,
    unlockGold: 800,
    tileColor: 0x8b6914,
    matureColor: 0x2d8b2d
  }
];

export function getCropById(id: string): CropConfig | undefined {
  return CROPS.find(c => c.id === id);
}

export function getUnlockedCrops(totalEarned: number, alreadyUnlocked: string[]): CropConfig[] {
  return CROPS.filter(c => c.unlockGold <= totalEarned || alreadyUnlocked.includes(c.id));
}

export function getDefaultUnlockedCrops(): string[] {
  return CROPS.filter(c => c.unlockGold === 0).map(c => c.id);
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add farm-game/src/entities/CropConfig.ts && git commit -m "feat: add crop configuration data"
```

---

### Task 4: 存档系统

**Files:**
- Create: `farm-game/src/systems/SaveSystem.ts`

**Interfaces:**
- Produces: `SaveSystem.load(): SaveData | null`, `SaveSystem.save(data: SaveData): void`, `SaveSystem.clear(): void`, `SaveSystem.createDefaultSaveData(): SaveData`

- [ ] **Step 1: 创建存档系统**

```typescript
// farm-game/src/systems/SaveSystem.ts

import { SaveData, TileData } from '../types';
import { GAME_CONFIG } from '../config';
import { getDefaultUnlockedCrops } from '../entities/CropConfig';

export class SaveSystem {
  static load(): SaveData | null {
    try {
      const raw = localStorage.getItem(GAME_CONFIG.SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as SaveData;
      if (typeof data.gold !== 'number' || !Array.isArray(data.farmGrid)) {
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  static save(data: SaveData): void {
    data.lastSaveTime = Date.now();
    localStorage.setItem(GAME_CONFIG.SAVE_KEY, JSON.stringify(data));
  }

  static clear(): void {
    localStorage.removeItem(GAME_CONFIG.SAVE_KEY);
  }

  static hasSave(): boolean {
    return localStorage.getItem(GAME_CONFIG.SAVE_KEY) !== null;
  }

  static createDefaultSaveData(): SaveData {
    const grid: TileData[][] = [];
    for (let row = 0; row < GAME_CONFIG.GRID_ROWS; row++) {
      grid[row] = [];
      for (let col = 0; col < GAME_CONFIG.GRID_COLS; col++) {
        grid[row][col] = {
          state: 'empty',
          cropId: null,
          plantTime: null
        };
      }
    }

    return {
      gold: GAME_CONFIG.INITIAL_GOLD,
      totalEarned: 0,
      inventory: {},
      farmGrid: grid,
      unlockedTiles: GAME_CONFIG.INITIAL_UNLOCKED_TILES,
      unlockedCrops: getDefaultUnlockedCrops(),
      lastSaveTime: Date.now()
    };
  }
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add farm-game/src/systems/SaveSystem.ts && git commit -m "feat: add save/load system with localStorage"
```

---

### Task 5: 经济系统

**Files:**
- Create: `farm-game/src/systems/EconomySystem.ts`

**Interfaces:**
- Produces: `EconomySystem.buySeed(cropId, gold, inventory): { success, gold, inventory }`, `EconomySystem.sellCrop(cropId, gold, inventory, totalEarned): { success, gold, inventory, totalEarned }`, `EconomySystem.canUnlockTile(gold, currentUnlocked, cost): boolean`

- [ ] **Step 1: 创建经济系统**

```typescript
// farm-game/src/systems/EconomySystem.ts

import { getCropById } from '../entities/CropConfig';

interface BuyResult {
  success: boolean;
  gold: number;
  inventory: Record<string, number>;
}

interface SellResult {
  success: boolean;
  gold: number;
  inventory: Record<string, number>;
  totalEarned: number;
}

export class EconomySystem {
  static buySeed(
    cropId: string,
    gold: number,
    inventory: Record<string, number>
  ): BuyResult {
    const crop = getCropById(cropId);
    if (!crop) return { success: false, gold, inventory };

    if (gold < crop.buyPrice) return { success: false, gold, inventory };

    const newInventory = { ...inventory };
    newInventory[cropId] = (newInventory[cropId] || 0) + 1;

    return {
      success: true,
      gold: gold - crop.buyPrice,
      inventory: newInventory
    };
  }

  static sellCrop(
    cropId: string,
    gold: number,
    inventory: Record<string, number>,
    totalEarned: number
  ): SellResult {
    const crop = getCropById(cropId);
    if (!crop) return { success: false, gold, inventory, totalEarned };

    const count = inventory[cropId] || 0;
    if (count <= 0) return { success: false, gold, inventory, totalEarned };

    const newInventory = { ...inventory };
    newInventory[cropId] = count - 1;
    if (newInventory[cropId] === 0) delete newInventory[cropId];

    return {
      success: true,
      gold: gold + crop.sellPrice,
      inventory: newInventory,
      totalEarned: totalEarned + crop.sellPrice
    };
  }

  static canUnlockTile(
    gold: number,
    currentUnlocked: number,
    cost: number
  ): boolean {
    return gold >= cost;
  }

  static getUnlockCost(currentUnlocked: number): number {
    return 100 + Math.floor(currentUnlocked / 4) * 100;
  }

  static getUnlockedCols(unlockedTiles: number): number {
    return Math.min(Math.ceil(Math.sqrt(unlockedTiles)), 8);
  }

  static getUnlockedRows(unlockedTiles: number): number {
    const cols = EconomySystem.getUnlockedCols(unlockedTiles);
    return Math.min(Math.ceil(unlockedTiles / cols), 8);
  }
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add farm-game/src/systems/EconomySystem.ts && git commit -m "feat: add economy system (buy/sell/unlock)"
```

---

### Task 6: 生长系统

**Files:**
- Create: `farm-game/src/systems/GrowthSystem.ts`

**Interfaces:**
- Produces: `GrowthSystem.update(tiles, time): TileData[][]` 返回更新后的网格，`GrowthSystem.getGrowthProgress(plantTime, growTime, currentTime): number` (0-1)

- [ ] **Step 1: 创建生长系统**

```typescript
// farm-game/src/systems/GrowthSystem.ts

import { TileData } from '../types';
import { getCropById } from '../entities/CropConfig';

export class GrowthSystem {
  static update(grid: TileData[][], currentTime: number): TileData[][] {
    const newGrid = grid.map(row => row.map(tile => ({ ...tile })));

    for (let row = 0; row < newGrid.length; row++) {
      for (let col = 0; col < newGrid[row].length; col++) {
        const tile = newGrid[row][col];
        if (tile.state === 'growing' && tile.cropId && tile.plantTime !== null) {
          const crop = getCropById(tile.cropId);
          if (crop) {
            const elapsed = (currentTime - tile.plantTime) / 1000;
            if (elapsed >= crop.growTime) {
              tile.state = 'mature';
            }
          }
        }
      }
    }

    return newGrid;
  }

  static getGrowthProgress(
    plantTime: number | null,
    growTime: number,
    currentTime: number
  ): number {
    if (plantTime === null) return 0;
    const elapsed = (currentTime - plantTime) / 1000;
    return Math.min(elapsed / growTime, 1);
  }
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add farm-game/src/systems/GrowthSystem.ts && git commit -m "feat: add growth timer system"
```

---

### Task 7: 地块实体

**Files:**
- Create: `farm-game/src/entities/FarmTile.ts`

**Interfaces:**
- Produces: `FarmTile` class extends `Phaser.GameObjects.Rectangle`，方法 `setTileData(data)`, `highlight(active)`, 属性 `row`, `col`, `tileData`

- [ ] **Step 1: 创建地块实体**

```typescript
// farm-game/src/entities/FarmTile.ts

import Phaser from 'phaser';
import { TileData } from '../types';
import { GAME_CONFIG } from '../config';
import { getCropById } from './CropConfig';

export class FarmTile extends Phaser.GameObjects.Rectangle {
  public row: number;
  public col: number;
  public tileData: TileData;

  constructor(
    scene: Phaser.Scene,
    row: number,
    col: number,
    tileData: TileData
  ) {
    const x = GAME_CONFIG.GRID_OFFSET_X + col * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
    const y = GAME_CONFIG.GRID_OFFSET_Y + row * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;

    super(scene, x, y, GAME_CONFIG.TILE_SIZE - 2, GAME_CONFIG.TILE_SIZE - 2);

    this.row = row;
    this.col = col;
    this.tileData = { ...tileData };

    this.setStrokeStyle(1, 0x3a6c2f);
    this.setInteractive();
    this.updateAppearance();
    scene.add.existing(this);
  }

  setTileData(data: TileData): void {
    this.tileData = { ...data };
    this.updateAppearance();
  }

  updateAppearance(): void {
    switch (this.tileData.state) {
      case 'empty':
        this.setFillStyle(GAME_CONFIG.COLORS.GRASS);
        break;
      case 'plowed':
        this.setFillStyle(GAME_CONFIG.COLORS.PLOWED);
        break;
      case 'growing': {
        const crop = this.tileData.cropId ? getCropById(this.tileData.cropId) : null;
        if (crop) {
          const elapsed = this.tileData.plantTime
            ? (this.scene.time.now - this.tileData.plantTime) / 1000
            : 0;
          const progress = Math.min(elapsed / crop.growTime, 1);
          const r = (crop.tileColor >> 16) & 0xff;
          const g = (crop.tileColor >> 8) & 0xff;
          const b = crop.tileColor & 0xff;
          const mr = (crop.matureColor >> 16) & 0xff;
          const mg = (crop.matureColor >> 8) & 0xff;
          const mb = crop.matureColor & 0xff;
          const cr = Math.floor(r + (mr - r) * progress);
          const cg = Math.floor(g + (mg - g) * progress);
          const cb = Math.floor(b + (mb - b) * progress);
          this.setFillStyle((cr << 16) | (cg << 8) | cb);
        } else {
          this.setFillStyle(GAME_CONFIG.COLORS.GROWING);
        }
        break;
      }
      case 'mature': {
        const crop = this.tileData.cropId ? getCropById(this.tileData.cropId) : null;
        this.setFillStyle(crop ? crop.matureColor : GAME_CONFIG.COLORS.GROWING);
        break;
      }
    }
  }

  highlight(active: boolean): void {
    if (active) {
      this.setStrokeStyle(3, 0xffffff);
    } else {
      this.setStrokeStyle(1, 0x3a6c2f);
    }
  }

  isUnlocked(currentUnlockedTiles: number): boolean {
    const cols = Math.min(Math.ceil(Math.sqrt(currentUnlockedTiles)), GAME_CONFIG.GRID_COLS);
    const rows = Math.min(Math.ceil(currentUnlockedTiles / cols), GAME_CONFIG.GRID_ROWS);
    return this.row < rows && this.col < cols;
  }

  getWorldX(): number {
    return GAME_CONFIG.GRID_OFFSET_X + this.col * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
  }

  getWorldY(): number {
    return GAME_CONFIG.GRID_OFFSET_Y + this.row * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
  }
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add farm-game/src/entities/FarmTile.ts && git commit -m "feat: add farm tile entity with state-based rendering"
```

---

### Task 8: 玩家实体

**Files:**
- Create: `farm-game/src/entities/Player.ts`

**Interfaces:**
- Produces: `Player` class extends `Phaser.GameObjects.Rectangle`，方法 `update(delta, cursors, wasd)`, `getGridPosition()`, `getDirection()`

- [ ] **Step 1: 创建玩家实体**

```typescript
// farm-game/src/entities/Player.ts

import Phaser from 'phaser';
import { GAME_CONFIG } from '../config';

export class Player extends Phaser.GameObjects.Rectangle {
  private moveSpeed: number = GAME_CONFIG.PLAYER_SPEED;
  private direction: string = 'down';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 28, 36, GAME_CONFIG.COLORS.PLAYER);
    this.setDepth(10);
    scene.add.existing(this);
  }

  update(
    _delta: number,
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    wasd: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key }
  ): void {
    let vx = 0;
    let vy = 0;

    if (cursors.left.isDown || wasd.left.isDown) {
      vx = -1;
      this.direction = 'left';
    } else if (cursors.right.isDown || wasd.right.isDown) {
      vx = 1;
      this.direction = 'right';
    }

    if (cursors.up.isDown || wasd.up.isDown) {
      vy = -1;
      this.direction = 'up';
    } else if (cursors.down.isDown || wasd.down.isDown) {
      vy = 1;
      this.direction = 'down';
    }

    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    this.x += vx * this.moveSpeed * (_delta / 1000);
    this.y += vy * this.moveSpeed * (_delta / 1000);

    this.x = Phaser.Math.Clamp(this.x, GAME_CONFIG.GRID_OFFSET_X - 16, GAME_CONFIG.GRID_OFFSET_X + GAME_CONFIG.GRID_COLS * GAME_CONFIG.TILE_SIZE + 16);
    this.y = Phaser.Math.Clamp(this.y, GAME_CONFIG.GRID_OFFSET_Y - 16, GAME_CONFIG.GRID_OFFSET_Y + GAME_CONFIG.GRID_ROWS * GAME_CONFIG.TILE_SIZE + 16);
  }

  getGridPosition(): { row: number; col: number } {
    const col = Math.floor((this.x - GAME_CONFIG.GRID_OFFSET_X) / GAME_CONFIG.TILE_SIZE);
    const row = Math.floor((this.y - GAME_CONFIG.GRID_OFFSET_Y) / GAME_CONFIG.TILE_SIZE);
    return { row, col };
  }

  getDirection(): string {
    return this.direction;
  }

  getFacingTile(): { row: number; col: number } {
    const pos = this.getGridPosition();
    switch (this.direction) {
      case 'up': return { row: pos.row - 1, col: pos.col };
      case 'down': return { row: pos.row + 1, col: pos.col };
      case 'left': return { row: pos.row, col: pos.col - 1 };
      case 'right': return { row: pos.row, col: pos.col + 1 };
      default: return pos;
    }
  }
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add farm-game/src/entities/Player.ts && git commit -m "feat: add player entity with WASD/arrow movement"
```

---

### Task 9: 启动场景

**Files:**
- Create: `farm-game/src/scenes/BootScene.ts`

**Interfaces:**
- Produces: BootScene 加载完成后自动跳转 FarmScene

- [ ] **Step 1: 创建启动场景**

```typescript
// farm-game/src/scenes/BootScene.ts

import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.rectangle(width / 2, height / 2, 300, 20, 0x333333);
    const progressFill = this.add.rectangle(width / 2 - 148, height / 2, 0, 16, 0x4488ff).setOrigin(0, 0.5);
    const loadingText = this.add.text(width / 2, height / 2 - 40, '加载中...', {
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressFill.width = 296 * value;
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressFill.destroy();
      loadingText.destroy();
    });
  }

  create(): void {
    this.scene.start('FarmScene');
  }
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add farm-game/src/scenes/BootScene.ts && git commit -m "feat: add boot scene with loading bar"
```

---

### Task 10: 主场景 — 网格与玩家

**Files:**
- Create: `farm-game/src/scenes/FarmScene.ts`
- Modify: `farm-game/src/main.ts`

**Interfaces:**
- Produces: FarmScene 渲染地块网格、玩家角色可移动、高亮面向地块

- [ ] **Step 1: 创建 FarmScene 基础结构（网格渲染 + 玩家）**

```typescript
// farm-game/src/scenes/FarmScene.ts

import Phaser from 'phaser';
import { GAME_CONFIG } from '../config';
import { SaveData, TileData, ToolType } from '../types';
import { SaveSystem } from '../systems/SaveSystem';
import { FarmTile } from '../entities/FarmTile';
import { Player } from '../entities/Player';
import { GrowthSystem } from '../systems/GrowthSystem';
import { CROPS } from '../entities/CropConfig';

export class FarmScene extends Phaser.Scene {
  private tileGrid: FarmTile[][] = [];
  private player!: Player;
  private saveData!: SaveData;
  private currentTool: ToolType = ToolType.PLOW;
  private highlightedTile: FarmTile | null = null;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private hudTexts!: {
    goldText: Phaser.GameObjects.Text;
    toolText: Phaser.GameObjects.Text;
  };

  constructor() {
    super({ key: 'FarmScene' });
  }

  create(): void {
    this.tileGrid = [];
    this.saveData = SaveSystem.load() || SaveSystem.createDefaultSaveData();

    this.drawGround();

    for (let row = 0; row < GAME_CONFIG.GRID_ROWS; row++) {
      this.tileGrid[row] = [];
      for (let col = 0; col < GAME_CONFIG.GRID_COLS; col++) {
        const tile = new FarmTile(this, row, col, this.saveData.farmGrid[row][col]);
        tile.on('pointerdown', () => this.onTileClick(tile));
        this.tileGrid[row][col] = tile;
      }
    }

    const startX = GAME_CONFIG.GRID_OFFSET_X + GAME_CONFIG.TILE_SIZE * 1.5;
    const startY = GAME_CONFIG.GRID_OFFSET_Y + GAME_CONFIG.TILE_SIZE * 1.5;
    this.player = new Player(this, startX, startY);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };

    this.input.keyboard!.on('keydown-ONE', () => this.setTool(ToolType.PLOW));
    this.input.keyboard!.on('keydown-TWO', () => this.setTool(ToolType.SEED));
    this.input.keyboard!.on('keydown-THREE', () => this.setTool(ToolType.HARVEST));
    this.input.keyboard!.on('keydown-E', () => this.toggleShop());
    this.input.keyboard!.on('keydown-SPACE', () => this.interactWithFacingTile());

    this.createHUD();

    this.updateTileVisibility();
    this.updateHUD();
  }

  private drawGround(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x3a5c2f, 1);
    graphics.fillRect(
      GAME_CONFIG.GRID_OFFSET_X - 8,
      GAME_CONFIG.GRID_OFFSET_Y - 8,
      GAME_CONFIG.GRID_COLS * GAME_CONFIG.TILE_SIZE + 16,
      GAME_CONFIG.GRID_ROWS * GAME_CONFIG.TILE_SIZE + 16
    );

    for (let row = 0; row < GAME_CONFIG.GRID_ROWS; row++) {
      for (let col = 0; col < GAME_CONFIG.GRID_COLS; col++) {
        const x = GAME_CONFIG.GRID_OFFSET_X + col * GAME_CONFIG.TILE_SIZE;
        const y = GAME_CONFIG.GRID_OFFSET_Y + row * GAME_CONFIG.TILE_SIZE;
        graphics.fillStyle(0x4a7c3f, 1);
        graphics.fillRect(x + 1, y + 1, GAME_CONFIG.TILE_SIZE - 2, GAME_CONFIG.TILE_SIZE - 2);
      }
    }
  }

  private createHUD(): void {
    this.add.rectangle(400, 20, 800, 40, GAME_CONFIG.COLORS.HUD_BG).setDepth(100).setScrollFactor(0);

    this.hudTexts = {
      goldText: this.add.text(16, 12, '', {
        fontSize: '16px',
        color: GAME_CONFIG.COLORS.GOLD_COLOR
      }).setDepth(101).setScrollFactor(0),
      toolText: this.add.text(784, 12, '', {
        fontSize: '14px',
        color: GAME_CONFIG.COLORS.HUD_TEXT
      }).setDepth(101).setScrollFactor(0).setOrigin(1, 0)
    };
  }

  private updateHUD(): void {
    this.hudTexts.goldText.setText(`金币: ${this.saveData.gold}`);
    const toolNames: Record<ToolType, string> = {
      [ToolType.PLOW]: '翻地 [1]',
      [ToolType.SEED]: '播种 [2]',
      [ToolType.HARVEST]: '收获 [3]',
      [ToolType.WATER]: '浇水'
    };
    this.hudTexts.toolText.setText(`工具: ${toolNames[this.currentTool]} | [E]商店 [空格]交互`);
  }

  private setTool(tool: ToolType): void {
    this.currentTool = tool;
    this.updateHUD();
  }

  private updateTileVisibility(): void {
    for (let row = 0; row < GAME_CONFIG.GRID_ROWS; row++) {
      for (let col = 0; col < GAME_CONFIG.GRID_COLS; col++) {
        const tile = this.tileGrid[row][col];
        const unlocked = tile.isUnlocked(this.saveData.unlockedTiles);
        tile.setVisible(unlocked);
        if (!unlocked) {
          tile.disableInteractive();
        } else {
          tile.setInteractive();
        }
      }
    }
  }

  update(time: number, delta: number): void {
    this.player.update(delta, this.cursors, this.wasd);

    const grid = this.tileGrid.map(row =>
      row.map(tile => tile.tileData)
    );
    const newGrid = GrowthSystem.update(grid, time);

    let gridChanged = false;
    for (let row = 0; row < GAME_CONFIG.GRID_ROWS; row++) {
      for (let col = 0; col < GAME_CONFIG.GRID_COLS; col++) {
        if (newGrid[row][col].state !== this.tileGrid[row][col].tileData.state) {
          this.tileGrid[row][col].setTileData(newGrid[row][col]);
          gridChanged = true;
        }
      }
    }

    if (this.highlightedTile) {
      this.highlightedTile.highlight(false);
      this.highlightedTile = null;
    }
    const facing = this.player.getFacingTile();
    if (
      facing.row >= 0 && facing.row < GAME_CONFIG.GRID_ROWS &&
      facing.col >= 0 && facing.col < GAME_CONFIG.GRID_COLS
    ) {
      const tile = this.tileGrid[facing.row][facing.col];
      if (tile.visible) {
        tile.highlight(true);
        this.highlightedTile = tile;
      }
    }

    if (gridChanged) {
      this.saveGame();
    }
  }

  private onTileClick(tile: FarmTile): void {
    this.interactWithTile(tile);
  }

  private interactWithFacingTile(): void {
    const facing = this.player.getFacingTile();
    if (
      facing.row >= 0 && facing.row < GAME_CONFIG.GRID_ROWS &&
      facing.col >= 0 && facing.col < GAME_CONFIG.GRID_COLS
    ) {
      const tile = this.tileGrid[facing.row][facing.col];
      if (tile.visible) {
        this.interactWithTile(tile);
      }
    }
  }

  private interactWithTile(tile: FarmTile): void {
    const data = tile.tileData;

    switch (this.currentTool) {
      case ToolType.PLOW:
        if (data.state === 'empty') {
          this.saveData.farmGrid[tile.row][tile.col] = {
            state: 'plowed',
            cropId: null,
            plantTime: null
          };
          tile.setTileData(this.saveData.farmGrid[tile.row][tile.col]);
          this.saveGame();
        }
        break;

      case ToolType.SEED:
        if (data.state === 'plowed') {
          // TODO: will be connected to seed selection UI in Task 13
        }
        break;

      case ToolType.HARVEST:
        if (data.state === 'mature' && data.cropId) {
          const { inventory, totalEarned, gold } = this.saveData;
          const cropId = data.cropId;
          const newInventory = { ...inventory };
          newInventory[cropId] = (newInventory[cropId] || 0) + 1;

          this.saveData.inventory = newInventory;
          this.saveData.gold = gold; // gold doesn't change on harvest, only on sell
          this.saveData.totalEarned = totalEarned;
          this.saveData.farmGrid[tile.row][tile.col] = {
            state: 'empty',
            cropId: null,
            plantTime: null
          };

          this.checkCropUnlocks();
          tile.setTileData(this.saveData.farmGrid[tile.row][tile.col]);
          this.updateHUD();
          this.saveGame();
        }
        break;
    }
  }

  private checkCropUnlocks(): void {
    for (const crop of CROPS) {
      if (crop.unlockGold <= this.saveData.totalEarned &&
          !this.saveData.unlockedCrops.includes(crop.id)) {
        this.saveData.unlockedCrops.push(crop.id);
      }
    }
  }

  private saveGame(): void {
    for (let row = 0; row < GAME_CONFIG.GRID_ROWS; row++) {
      for (let col = 0; col < GAME_CONFIG.GRID_COLS; col++) {
        this.saveData.farmGrid[row][col] = { ...this.tileGrid[row][col].tileData };
      }
    }
    SaveSystem.save(this.saveData);
  }

  private toggleShop(): void {
    // Connected to ShopPanel in Task 12
    console.log('Shop toggled');
  }
}
```

- [ ] **Step 2: 更新 main.ts 使用场景**

```typescript
// farm-game/src/main.ts

import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { FarmScene } from './scenes/FarmScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: document.body,
  backgroundColor: '#5c94fc',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, FarmScene]
};

new Phaser.Game(config);
```

- [ ] **Step 3: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: 验证游戏运行**

```bash
npm run dev
```

Expected: 游戏显示 4×4 绿色地块网格，蓝色角色方块可用 WASD/方向键移动，面向的地块高亮白框。按 1/2/3 切换工具，HUD 显示金币和当前工具。

- [ ] **Step 5: 提交**

```bash
git add farm-game/src/scenes/FarmScene.ts farm-game/src/main.ts && git commit -m "feat: add main farm scene with grid, player, and basic interactions"
```

---

### Task 11: HUD 与工具栏增强

**Files:**
- Create: `farm-game/src/ui/Toolbar.ts`

**Interfaces:**
- Produces: 底部工具栏 UI 组件，显示工具按钮，点击切换工具

- [ ] **Step 1: 创建工具栏**

```typescript
// farm-game/src/ui/Toolbar.ts

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
```

- [ ] **Step 2: 集成工具栏到 FarmScene**

在 FarmScene 的 `create()` 末尾添加工具栏初始化。需要在文件顶部导入 Toolbar，在类中添加 `toolbar` 属性，并将键盘快捷键绑定到 toolbar。

修改 FarmScene：

在 import 区域添加：
```typescript
import { Toolbar } from '../ui/Toolbar';
```

在类属性区域添加：
```typescript
private toolbar!: Toolbar;
```

在 `create()` 方法的 `this.createHUD()` 之后添加：
```typescript
this.toolbar = new Toolbar(this);
this.toolbar.setOnToolChange((tool: ToolType) => {
  this.currentTool = tool;
  this.updateHUD();
});
```

修改键盘快捷键绑定，使用 toolbar：
```typescript
this.input.keyboard!.on('keydown-ONE', () => this.toolbar.selectTool(ToolType.PLOW));
this.input.keyboard!.on('keydown-TWO', () => this.toolbar.selectTool(ToolType.SEED));
this.input.keyboard!.on('keydown-THREE', () => this.toolbar.selectTool(ToolType.HARVEST));
```

删除旧的 `setTool` 方法中的 keyboard 绑定代码重复。

- [ ] **Step 3: 验证编译和运行**

```bash
npx tsc --noEmit && npm run dev
```

- [ ] **Step 4: 提交**

```bash
git add farm-game/src/ui/Toolbar.ts farm-game/src/scenes/FarmScene.ts && git commit -m "feat: add bottom toolbar with tool switching"
```

---

### Task 12: 商店面板

**Files:**
- Create: `farm-game/src/ui/ShopPanel.ts`
- Modify: `farm-game/src/scenes/FarmScene.ts`

**Interfaces:**
- Produces: 商店弹出面板，显示可购买的种子和可出售的作物列表

- [ ] **Step 1: 创建商店面板**

```typescript
// farm-game/src/ui/ShopPanel.ts

import Phaser from 'phaser';
import { GAME_CONFIG } from '../config';
import { CropConfig, ToolType } from '../types';
import { getUnlockedCrops } from '../entities/CropConfig';
import { EconomySystem } from '../systems/EconomySystem';

interface ShopItem {
  rect: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  priceText: Phaser.GameObjects.Text;
  actionText: Phaser.GameObjects.Text;
  crop: CropConfig;
  isBuy: boolean;
}

export class ShopPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private isOpen: boolean = false;
  private items: ShopItem[] = [];
  private gold: number = 0;
  private totalEarned: number = 0;
  private unlockedCrops: string[] = [];
  private inventory: Record<string, number> = {};
  private onBuy: ((cropId: string) => void) | null = null;
  private onSell: ((cropId: string) => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(200).setVisible(false);
    this.create();
  }

  private create(): void {
    const overlay = this.scene.add.rectangle(400, 300, 800, 600, 0x000000, 0.6)
      .setInteractive();
    overlay.on('pointerdown', () => this.close());
    this.container.add(overlay);

    const panel = this.scene.add.rectangle(400, 300, 500, 400, GAME_CONFIG.COLORS.SHOP_PANEL);
    this.container.add(panel);

    const title = this.scene.add.text(400, 130, '商 店', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container.add(title);

    const closeBtn = this.scene.add.text(630, 115, 'X', {
      fontSize: '20px',
      color: '#ff6666'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.close());
    this.container.add(closeBtn);
  }

  open(
    gold: number,
    totalEarned: number,
    unlockedCrops: string[],
    inventory: Record<string, number>,
    onBuy: (cropId: string) => void,
    onSell: (cropId: string) => void
  ): void {
    this.gold = gold;
    this.totalEarned = totalEarned;
    this.unlockedCrops = unlockedCrops;
    this.inventory = inventory;
    this.onBuy = onBuy;
    this.onSell = onSell;
    this.isOpen = true;
    this.container.setVisible(true);
    this.refreshItems();
  }

  close(): void {
    this.isOpen = false;
    this.container.setVisible(false);
    this.clearItems();
  }

  toggle(
    gold: number,
    totalEarned: number,
    unlockedCrops: string[],
    inventory: Record<string, number>,
    onBuy: (cropId: string) => void,
    onSell: (cropId: string) => void
  ): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open(gold, totalEarned, unlockedCrops, inventory, onBuy, onSell);
    }
  }

  getIsOpen(): boolean {
    return this.isOpen;
  }

  private refreshItems(): void {
    this.clearItems();

    const availableCrops = getUnlockedCrops(this.totalEarned, this.unlockedCrops);

    const leftLabel = this.scene.add.text(230, 170, '购买种子', {
      fontSize: '16px', color: '#88ff88'
    }).setOrigin(0.5);
    this.container.add(leftLabel);
    this.items.push({ rect: null as any, nameText: leftLabel, priceText: null as any, actionText: null as any, crop: null as any, isBuy: true });

    availableCrops.forEach((crop, i) => {
      const y = 200 + i * 28;
      const canAfford = this.gold >= crop.buyPrice;

      const nameText = this.scene.add.text(170, y, `${crop.name}`, {
        fontSize: '14px', color: '#ffffff'
      }).setOrigin(0, 0.5);
      this.container.add(nameText);

      const priceText = this.scene.add.text(270, y, `${crop.buyPrice}G`, {
        fontSize: '14px', color: canAfford ? '#ffd700' : '#888888'
      }).setOrigin(0, 0.5);
      this.container.add(priceText);

      const btnRect = this.scene.add.rectangle(330, y, 50, 22, canAfford ? GAME_CONFIG.COLORS.BUTTON : 0x333333)
        .setInteractive({ useHandCursor: canAfford });
      const btnText = this.scene.add.text(330, y, '购买', {
        fontSize: '12px', color: canAfford ? '#ffffff' : '#666666'
      }).setOrigin(0.5);

      if (canAfford) {
        btnRect.on('pointerdown', () => {
          if (this.onBuy) this.onBuy(crop.id);
        });
      }

      this.container.add([btnRect, btnText]);
      this.items.push({ rect: btnRect, nameText, priceText, actionText: btnText, crop, isBuy: true });
    });

    const rightLabel = this.scene.add.text(540, 170, '出售作物', {
      fontSize: '16px', color: '#ff8888'
    }).setOrigin(0.5);
    this.container.add(rightLabel);

    let sellIndex = 0;
    for (const [cropId, count] of Object.entries(this.inventory)) {
      const crop = availableCrops.find(c => c.id === cropId);
      if (!crop) continue;

      const y = 200 + sellIndex * 28;

      const nameText = this.scene.add.text(470, y, `${crop.name} x${count}`, {
        fontSize: '14px', color: '#ffffff'
      }).setOrigin(0, 0.5);
      this.container.add(nameText);

      const priceText = this.scene.add.text(570, y, `${crop.sellPrice}G`, {
        fontSize: '14px', color: '#ffd700'
      }).setOrigin(0, 0.5);
      this.container.add(priceText);

      const btnRect = this.scene.add.rectangle(630, y, 50, 22, GAME_CONFIG.COLORS.BUTTON)
        .setInteractive({ useHandCursor: true });
      const btnText = this.scene.add.text(630, y, '出售', {
        fontSize: '12px', color: '#ffffff'
      }).setOrigin(0.5);

      btnRect.on('pointerdown', () => {
        if (this.onSell) this.onSell(cropId);
      });

      this.container.add([btnRect, btnText]);
      this.items.push({ rect: btnRect, nameText, priceText, actionText: btnText, crop, isBuy: false });
      sellIndex++;
    }

    if (sellIndex === 0) {
      const emptyText = this.scene.add.text(540, 220, '(暂无作物)', {
        fontSize: '13px', color: '#888888'
      }).setOrigin(0.5);
      this.container.add(emptyText);
    }
  }

  private clearItems(): void {
    this.items.forEach(item => {
      if (item.rect) item.rect.destroy();
      if (item.nameText) item.nameText.destroy();
      if (item.priceText) item.priceText.destroy();
      if (item.actionText) item.actionText.destroy();
    });
    this.items = [];

    this.container.each(child => {
      if (
        child.type === 'Text' &&
        !['商 店', 'X'].includes((child as Phaser.GameObjects.Text).text) &&
        (child as Phaser.GameObjects.Text).text !== '购买种子' &&
        (child as Phaser.GameObjects.Text).text !== '出售作物'
      ) {
        child.destroy();
      }
      if (child.type === 'Rectangle' && child !== this.container.getAt(0) && child !== this.container.getAt(1)) {
        child.destroy();
      }
    });
  }

  destroy(): void {
    this.container.destroy();
  }
}
```

- [ ] **Step 2: 集成商店到 FarmScene**

在 `FarmScene.ts` 中添加：

Import:
```typescript
import { ShopPanel } from '../ui/ShopPanel';
import { EconomySystem } from '../systems/EconomySystem';
import { getCropById, getUnlockedCrops } from '../entities/CropConfig';
```

类属性:
```typescript
private shopPanel!: ShopPanel;
```

在 `create()` 方法的 `this.createHUD()` 之后添加：
```typescript
this.shopPanel = new ShopPanel(this);
```

替换 `toggleShop()` 方法：
```typescript
private toggleShop(): void {
  const unlockedCrops = getUnlockedCrops(this.saveData.totalEarned, this.saveData.unlockedCrops);
  this.shopPanel.toggle(
    this.saveData.gold,
    this.saveData.totalEarned,
    unlockedCrops.map(c => c.id),
    this.saveData.inventory,
    (cropId) => this.handleBuy(cropId),
    (cropId) => this.handleSell(cropId)
  );
}

private handleBuy(cropId: string): void {
  const result = EconomySystem.buySeed(cropId, this.saveData.gold, this.saveData.inventory);
  if (result.success) {
    this.saveData.gold = result.gold;
    this.saveData.inventory = result.inventory;
    this.updateHUD();
    this.saveGame();
    // Refresh shop
    const unlockedCrops = getUnlockedCrops(this.saveData.totalEarned, this.saveData.unlockedCrops);
    this.shopPanel.close();
    this.shopPanel.open(
      this.saveData.gold, this.saveData.totalEarned,
      unlockedCrops.map(c => c.id), this.saveData.inventory,
      (id) => this.handleBuy(id), (id) => this.handleSell(id)
    );
  }
}

private handleSell(cropId: string): void {
  const result = EconomySystem.sellCrop(
    cropId, this.saveData.gold, this.saveData.inventory, this.saveData.totalEarned
  );
  if (result.success) {
    this.saveData.gold = result.gold;
    this.saveData.inventory = result.inventory;
    this.saveData.totalEarned = result.totalEarned;
    this.checkCropUnlocks();
    this.updateHUD();
    this.saveGame();
    // Refresh shop
    const unlockedCrops = getUnlockedCrops(this.saveData.totalEarned, this.saveData.unlockedCrops);
    this.shopPanel.close();
    this.shopPanel.open(
      this.saveData.gold, this.saveData.totalEarned,
      unlockedCrops.map(c => c.id), this.saveData.inventory,
      (id) => this.handleBuy(id), (id) => this.handleSell(id)
    );
  }
}
```

更新 SEED 工具交互，实现播种（从背包消费种子）：
```typescript
case ToolType.SEED:
  if (data.state === 'plowed') {
    const inventory = this.saveData.inventory;
    const firstSeed = Object.keys(inventory).find(k => (inventory[k] || 0) > 0);
    if (firstSeed) {
      const newInventory = { ...inventory };
      newInventory[firstSeed] = (newInventory[firstSeed] || 1) - 1;
      if (newInventory[firstSeed] <= 0) delete newInventory[firstSeed];

      this.saveData.inventory = newInventory;
      this.saveData.farmGrid[tile.row][tile.col] = {
        state: 'growing',
        cropId: firstSeed,
        plantTime: this.time.now
      };
      tile.setTileData(this.saveData.farmGrid[tile.row][tile.col]);
      this.saveGame();
    }
  }
  break;
```

- [ ] **Step 3: 验证编译和运行**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: 启动并测试**

```bash
npm run dev
```

Expected: 按 E 打开商店，左侧可买种子，右侧可卖作物。购买后金币减少，出售后金币增加。已翻地块在 SEED 工具下按空格自动用背包第一个种子播种。

- [ ] **Step 5: 提交**

```bash
git add farm-game/src/ui/ShopPanel.ts farm-game/src/scenes/FarmScene.ts && git commit -m "feat: add shop panel with buy/sell and seed planting"
```

---

### Task 13: 种子选择器

**Files:**
- Create: `farm-game/src/ui/SeedSelector.ts`
- Modify: `farm-game/src/scenes/FarmScene.ts`

**Interfaces:**
- Produces: 播种时可选择背包中特定种子的 UI 弹出面板

- [ ] **Step 1: 创建种子选择器**

```typescript
// farm-game/src/ui/SeedSelector.ts

import Phaser from 'phaser';
import { GAME_CONFIG } from '../config';
import { getCropById } from '../entities/CropConfig';

interface SeedItem {
  rect: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  countText: Phaser.GameObjects.Text;
  cropId: string;
}

export class SeedSelector {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private items: SeedItem[] = [];
  private onSelect: ((cropId: string) => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(250).setVisible(false);
  }

  show(
    x: number,
    y: number,
    inventory: Record<string, number>,
    onSelect: (cropId: string) => void
  ): void {
    this.onSelect = onSelect;

    this.clear();

    const seeds = Object.entries(inventory).filter(([_, count]) => count > 0);
    if (seeds.length === 0) {
      this.hide();
      return;
    }

    const panelW = 140;
    const panelH = seeds.length * 30 + 16;
    const panelX = Math.min(x, 800 - panelW / 2 - 8);
    const panelY = Math.max(y - panelH, 8);

    const bg = this.scene.add.rectangle(panelX, panelY, panelW, panelH, GAME_CONFIG.COLORS.SHOP_BG, 0.95)
      .setOrigin(0, 0);
    this.container.add(bg);

    seeds.forEach(([cropId, count], i) => {
      const crop = getCropById(cropId);
      if (!crop) return;

      const itemY = panelY + 15 + i * 30;

      const rect = this.scene.add.rectangle(panelX + panelW / 2, itemY, panelW - 8, 26, GAME_CONFIG.COLORS.BUTTON)
        .setInteractive({ useHandCursor: true });

      const nameText = this.scene.add.text(panelX + 12, itemY, crop.name, {
        fontSize: '13px', color: '#ffffff'
      }).setOrigin(0, 0.5);

      const countText = this.scene.add.text(panelX + panelW - 12, itemY, `x${count}`, {
        fontSize: '12px', color: '#aaaaaa'
      }).setOrigin(1, 0.5);

      rect.on('pointerdown', () => {
        if (this.onSelect) this.onSelect(cropId);
        this.hide();
      });

      rect.on('pointerover', () => rect.setFillStyle(GAME_CONFIG.COLORS.BUTTON_HOVER));
      rect.on('pointerout', () => rect.setFillStyle(GAME_CONFIG.COLORS.BUTTON));

      this.container.add([rect, nameText, countText]);
      this.items.push({ rect, nameText, countText, cropId });
    });

    this.container.setVisible(true);
  }

  hide(): void {
    this.container.setVisible(false);
  }

  getIsVisible(): boolean {
    return this.container.visible;
  }

  private clear(): void {
    this.container.removeAll(true);
    this.items = [];
  }

  destroy(): void {
    this.container.destroy();
  }
}
```

- [ ] **Step 2: 集成到 FarmScene**

在 FarmScene 中添加属性：
```typescript
import { SeedSelector } from '../ui/SeedSelector';
private seedSelector!: SeedSelector;
```

在 `create()` 中初始化：
```typescript
this.seedSelector = new SeedSelector(this);
```

修改 SEED 工具交互逻辑，在 `interactWithTile` 的 SEED case 中改为弹出选择器：

```typescript
case ToolType.SEED:
  if (data.state === 'plowed') {
    const seeds = Object.entries(this.saveData.inventory).filter(([_, c]) => c > 0);
    if (seeds.length === 0) break;

    this.seedSelector.show(
      tile.getWorldX(),
      tile.getWorldY() - GAME_CONFIG.TILE_SIZE,
      this.saveData.inventory,
      (cropId: string) => {
        this.plantSeed(tile, cropId);
      }
    );
  }
  break;
```

添加 `plantSeed` 方法：
```typescript
private plantSeed(tile: FarmTile, cropId: string): void {
  const newInventory = { ...this.saveData.inventory };
  newInventory[cropId] = (newInventory[cropId] || 1) - 1;
  if (newInventory[cropId] <= 0) delete newInventory[cropId];

  this.saveData.inventory = newInventory;
  this.saveData.farmGrid[tile.row][tile.col] = {
    state: 'growing',
    cropId,
    plantTime: this.time.now
  };
  tile.setTileData(this.saveData.farmGrid[tile.row][tile.col]);
  this.updateHUD();
  this.saveGame();
}
```

- [ ] **Step 3: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: 提交**

```bash
git add farm-game/src/ui/SeedSelector.ts farm-game/src/scenes/FarmScene.ts && git commit -m "feat: add seed selector popup for planting"
```

---

### Task 14: 地块扩展与打磨

**Files:**
- Modify: `farm-game/src/scenes/FarmScene.ts`

**Interfaces:**
- Produces: 完整游戏循环：买种子→播种→等生长→收获→卖钱→解锁作物→扩展地块

- [ ] **Step 1: 在 FarmScene 中添加地块扩展按钮和方法**

在 `create()` 方法中（HUD 区域）添加扩展地块按钮：

```typescript
const unlockBtn = this.add.rectangle(760, 58, 64, 26, GAME_CONFIG.COLORS.BUTTON)
  .setDepth(101).setScrollFactor(0).setInteractive({ useHandCursor: true });
const unlockLabel = this.add.text(760, 58, '扩地', {
  fontSize: '13px', color: '#ffffff'
}).setDepth(102).setScrollFactor(0).setOrigin(0.5);

unlockBtn.on('pointerdown', () => this.unlockTile());
unlockBtn.on('pointerover', () => unlockBtn.setFillStyle(GAME_CONFIG.COLORS.BUTTON_HOVER));
unlockBtn.on('pointerout', () => unlockBtn.setFillStyle(GAME_CONFIG.COLORS.BUTTON));
```

添加 `unlockTile` 方法：

```typescript
private unlockTile(): void {
  const cost = EconomySystem.getUnlockCost(this.saveData.unlockedTiles);
  const maxTiles = GAME_CONFIG.GRID_COLS * GAME_CONFIG.GRID_ROWS;

  if (this.saveData.unlockedTiles >= maxTiles) {
    this.showMessage('地块已全部解锁!');
    return;
  }

  if (this.saveData.gold < cost) {
    this.showMessage(`金币不足! 需要 ${cost}G`);
    return;
  }

  this.saveData.gold -= cost;
  this.saveData.unlockedTiles += 1;
  this.updateTileVisibility();
  this.updateHUD();
  this.saveGame();
  this.showMessage(`解锁新地块! (-${cost}G)`);
}

private showMessage(text: string): void {
  const msg = this.add.text(400, 100, text, {
    fontSize: '18px',
    color: '#ffffff',
    backgroundColor: '#000000aa',
    padding: { x: 12, y: 6 }
  }).setOrigin(0.5).setDepth(300);

  this.tweens.add({
    targets: msg,
    alpha: 0,
    y: 80,
    duration: 1500,
    ease: 'Power2',
    onComplete: () => msg.destroy()
  });
}
```

- [ ] **Step 2: 添加新游戏功能**

在 HUD 区域添加新游戏按钮：

```typescript
const newGameBtn = this.add.rectangle(60, 58, 80, 26, 0xaa4444)
  .setDepth(101).setScrollFactor(0).setInteractive({ useHandCursor: true });
this.add.text(60, 58, '新游戏', {
  fontSize: '13px', color: '#ffffff'
}).setDepth(102).setScrollFactor(0).setOrigin(0.5);

newGameBtn.on('pointerdown', () => this.resetGame());
```

添加 `resetGame` 方法：

```typescript
private resetGame(): void {
  SaveSystem.clear();
  this.scene.restart();
}
```

- [ ] **Step 3: 添加耕地数量显示**

修改 HUD 的 `goldText` 扩展信息：

```typescript
private updateHUD(): void {
  this.hudTexts.goldText.setText(
    `金币: ${this.saveData.gold} | 地块: ${this.saveData.unlockedTiles}`
  );
  const toolNames: Record<ToolType, string> = {
    [ToolType.PLOW]: '翻地 [1]',
    [ToolType.SEED]: '播种 [2]',
    [ToolType.HARVEST]: '收获 [3]',
    [ToolType.WATER]: '浇水'
  };
  this.hudTexts.toolText.setText(`工具: ${toolNames[this.currentTool]} | [E]商店 [空格]交互`);
}
```

- [ ] **Step 4: 验证编译和运行**

```bash
npx tsc --noEmit && npm run dev
```

Expected: 完整游戏循环正常运行。可买种子、播种选择、等待生长（颜色渐变）、收获入库、商店出售赚钱、解锁新作物、点击扩地按钮扩展地块。

- [ ] **Step 5: 提交**

```bash
git add farm-game/src/scenes/FarmScene.ts && git commit -m "feat: add tile expansion and new game features"
```

---

### Task 15: 集成测试与最终验证

**Files:**
- No new files. Manual verification only.

- [ ] **Step 1: 完整游戏流程验证**

启动游戏：
```bash
npm run dev
```

逐项验证：
1. 游戏加载显示启动画面→主场景，4×4 绿色地块，蓝色角色
2. WASD 移动角色，面向地块白框高亮
3. 按 1 切换翻地工具，空格翻地，地块变棕色
4. 按 E 打开商店，购买萝卜种子 (5G)，金币从 100 变 95
5. 按 2 切换播种，空格弹出种子选择器，选萝卜，地块开始生长（颜色渐变）
6. 等待约 3 秒，地块变橙色（成熟）
7. 按 3 切换收获，空格收获，背包中萝卜 x1
8. 按 E 打开商店，出售萝卜 (+15G)，金币 110
9. 累计收益 ≥ 100，商店出现玉米
10. 累计收益 ≥ 300，金幣足够，点击扩地解锁新地块
11. 关闭页面重新打开，进度保持不变
12. 点击新游戏，重置为初始状态

- [ ] **Step 2: 提交最终版本**

```bash
git add -A && git commit -m "chore: final verification and cleanup"
```

---

## 文件清单总览

| 文件 | 状态 |
|------|------|
| `farm-game/package.json` | 新建 |
| `farm-game/tsconfig.json` | 新建 |
| `farm-game/vite.config.ts` | 新建 |
| `farm-game/index.html` | 新建 |
| `farm-game/src/main.ts` | 新建 |
| `farm-game/src/config.ts` | 新建 |
| `farm-game/src/types/index.ts` | 新建 |
| `farm-game/src/entities/CropConfig.ts` | 新建 |
| `farm-game/src/entities/FarmTile.ts` | 新建 |
| `farm-game/src/entities/Player.ts` | 新建 |
| `farm-game/src/systems/SaveSystem.ts` | 新建 |
| `farm-game/src/systems/EconomySystem.ts` | 新建 |
| `farm-game/src/systems/GrowthSystem.ts` | 新建 |
| `farm-game/src/scenes/BootScene.ts` | 新建 |
| `farm-game/src/scenes/FarmScene.ts` | 新建 |
| `farm-game/src/ui/Toolbar.ts` | 新建 |
| `farm-game/src/ui/ShopPanel.ts` | 新建 |
| `farm-game/src/ui/SeedSelector.ts` | 新建 |
