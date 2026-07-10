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
