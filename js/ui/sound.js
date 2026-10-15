// ==============================================================================
// FITPULSE - NATIVE WEB AUDIO SYNTH & SOUND EFFECTS
// Genera alertas sonoras atléticas nativas sin dependencias ni archivos externos.
// ==============================================================================

class SoundService {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  getContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.2) {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Navegador bloqueó audio o no soporta
    }
  }

  // 1. Pitido corto de cuenta regresiva (3, 2, 1)
  playCountdown() {
    this.playTone(880, 'sine', 0.12, 0.25);
    if (navigator.vibrate) navigator.vibrate(80);
  }

  // 2. Pitido de inicio de trabajo / ¡A Entrenar!
  playGo() {
    this.playTone(1760, 'triangle', 0.35, 0.3);
    if (navigator.vibrate) navigator.vibrate([120, 80, 200]);
  }

  // 3. Pitido de inicio de descanso
  playRest() {
    this.playTone(587.33, 'sine', 0.25, 0.25);
    if (navigator.vibrate) navigator.vibrate(100);
  }

  // 4. Acorde triunfal al finalizar el entrenamiento
  playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G C
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', 0.35, 0.2);
      }, idx * 110);
    });
    if (navigator.vibrate) navigator.vibrate([150, 100, 150, 100, 300]);
  }
}

export const Sound = new SoundService();
