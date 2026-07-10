import Phaser from 'phaser';

type PlayableSound = Phaser.Sound.HTML5AudioSound | Phaser.Sound.WebAudioSound;

export class AudioSystem {
  private scene: Phaser.Scene;
  private currentBgm: PlayableSound | null = null;
  private currentBgmKey: string = '';
  private musicVolume: number;
  private sfxVolume: number;

  constructor(scene: Phaser.Scene, musicVolume = 0.7, sfxVolume = 0.8) {
    this.scene = scene;
    this.musicVolume = musicVolume;
    this.sfxVolume = sfxVolume;
  }

  setMusicVolume(vol: number): void {
    this.musicVolume = vol;
    this.currentBgm?.setVolume(vol);
  }

  setSfxVolume(vol: number): void { this.sfxVolume = vol; }

  playBgm(key: string, loop = true): void {
    if (this.currentBgmKey === key) return;
    this.stopBgm();
    this.currentBgmKey = key;
    this.currentBgm = this.scene.sound.add(key, { loop, volume: this.musicVolume }) as PlayableSound;
    this.currentBgm.play();
  }

  stopBgm(): void {
    if (this.currentBgm) {
      this.currentBgm.stop();
      this.currentBgm.destroy();
      this.currentBgm = null;
      this.currentBgmKey = '';
    }
  }

  playSfx(key: string): void {
    this.scene.sound.play(key, { volume: this.sfxVolume });
  }
}
