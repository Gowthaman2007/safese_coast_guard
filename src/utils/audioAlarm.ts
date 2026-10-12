import { AlertLevel } from '../types';

class NauticalAudioAlarm {
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private intervalId: number | null = null;
  private currentLevel: AlertLevel = 'SAFE';

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) this.ctx = new AudioContextClass();
    }
    if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) this.stopAlarmLoop();
    else this.syncLevel(this.currentLevel);
  }

  public triggerTone(frequency: number, durationSec: number, type: OscillatorType = 'sine', gainVal = 0.15) {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSec);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + durationSec);
    } catch {}
  }

  public syncLevel(level: AlertLevel) {
    if (level === this.currentLevel && this.intervalId !== null) return;
    this.currentLevel = level;
    if (this.isMuted) return;
    this.stopAlarmLoop();

    // WARNING intentionally has NO buzzer/audio, matching the ESP32.
    if (level === 'CRITICAL') {
      const beep = () => this.triggerTone(780, 0.12, 'square', 0.16);
      beep();
      this.intervalId = window.setInterval(beep, 2000);
    } else if (level === 'RAPID_ALARM') {
      const rapid = () => {
        this.triggerTone(980, 0.09, 'square', 0.18);
        window.setTimeout(() => this.triggerTone(1250, 0.09, 'square', 0.18), 110);
      };
      rapid();
      this.intervalId = window.setInterval(rapid, 360);
    }
  }

  public stopAlarmLoop() {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const nauticalAudio = new NauticalAudioAlarm();
