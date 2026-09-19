/**
 * soundManager.ts
 *
 * Lightweight PulseChain ambient sound layer using the Web Audio API.
 * All sounds are synthesised — no audio files required.
 *
 * Rules:
 *  - Sound is OFF by default.
 *  - Only plays after explicit user interaction (sound toggle in TopBar).
 *  - All sounds are extremely subtle; healthcare ambient, not game FX.
 *  - Preference is persisted to localStorage.
 */

export type SoundEvent = "drop" | "pulse" | "claim" | "transferStart" | "received";

const STORAGE_KEY = "pulsechain-sound-enabled";

class SoundManager {
  private ctx: AudioContext | null = null;
  private _enabled: boolean;

  constructor() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      // Strictly opt-in: default to false (muted) so users are not surprised by audio
      this._enabled = stored === "true";
    } catch {
      this._enabled = false;
    }
  }

  get isEnabled() {
    return this._enabled;
  }

  setEnabled(val: boolean) {
    this._enabled = val;
    try {
      localStorage.setItem(STORAGE_KEY, String(val));
    } catch {
      // ignore
    }
    if (val) {
      const ctx = this.getCtx();
      if (ctx.state === "suspended") {
        void ctx.resume();
      }
    }
  }

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  play(event: SoundEvent) {
    if (!this._enabled) return;
    try {
      const ctx = this.getCtx();
      if (ctx.state === "suspended") {
        void ctx.resume().then(() => this.synthesise(ctx, event));
      } else {
        this.synthesise(ctx, event);
      }
    } catch {
      // Web Audio not available — silent fail
    }
  }

  private synthesise(ctx: AudioContext, event: SoundEvent) {
    const now = ctx.currentTime;

    // Gentle, organic sine synthesis with soft exponential roll-off
    switch (event) {
      case "drop": {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.15);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.22);
        break;
      }

      case "pulse": {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.06, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.14);
        break;
      }

      case "claim": {
        // Soft, gentle marimba-like warm dual chime (440Hz -> 554Hz)
        const playSoft = (freq: number, start: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + start);
          gain.gain.setValueAtTime(0, now + start);
          gain.gain.linearRampToValueAtTime(0.07, now + start + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, now + start + 0.25);
          osc.start(now + start);
          osc.stop(now + start + 0.28);
        };
        playSoft(440, 0);
        playSoft(554.37, 0.12);
        break;
      }

      case "transferStart": {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(240, now + 0.2);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.05, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.27);
        break;
      }

      case "received": {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(554, now + 0.2);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.06, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.28);
        break;
      }
    }
  }
}

export const soundManager = new SoundManager();
