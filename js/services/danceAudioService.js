// ==============================================================================
// FITPULSE - DANCE AUDIO & RHYTHMIC BEAT ENGINE
// Servicio de audio especializado para actividades de baile y ritmos:
// 1. Sintetizador nativo Web Audio API de percusión y compases (100% offline, cero dependencias).
// 2. Integrador de playlists curadas por estilo (YouTube / Streaming).
// 3. Reproductor nativo de archivos de audio locales (MP3, M4A, WAV).
// 4. Control de volumen independiente y atenuación automática (Audio Ducking) con el cronómetro.
// ==============================================================================

import { Sound } from '../ui/sound.js';

export const DANCE_RHYTHMS = {
  bachata: {
    id: 'bachata',
    name: 'Bachata (Sensual & Tradicional)',
    defaultBpm: 128,
    category: 'Baile & Ritmos',
    icon: '💃',
    description: 'Compás de 8 tiempos con acento y tap característico en el 4 y en el 8.',
    streamingPlaylists: [
      {
        id: 'pl_bachata_sensual',
        title: 'Bachata Sensual & Romántica Hits',
        embedUrl: 'https://www.youtube-nocookie.com/embed/videoseries?list=PL4fGSIFgk5H3gTqgJz8i_e72zXJj6U5Wp',
        source: 'youtube'
      },
      {
        id: 'pl_bachata_clasica',
        title: 'Clásicos de Bachata Dominicana',
        embedUrl: 'https://www.youtube-nocookie.com/embed/videoseries?list=PL4fGSIFgk5H0W_4P2GzS3f8n9iO4gWzN1',
        source: 'youtube'
      },
      {
        id: 'pl_bachata_instrumental',
        title: 'Bachata Instrumental Chill & Práctica',
        embedUrl: 'https://www.youtube-nocookie.com/embed/videoseries?list=PL4fGSIFgk5H2uR7lJ0f8Y3t1wQzV8K9P0',
        source: 'youtube'
      }
    ]
  },
  salsa: {
    id: 'salsa',
    name: 'Salsa (Cubana & Línea)',
    defaultBpm: 185,
    category: 'Baile & Ritmos',
    icon: '🔥',
    description: 'Patrón de clave 2-3 con tumbao de congas, campana y ritmo dinámico.',
    streamingPlaylists: [
      {
        id: 'pl_salsa_dura',
        title: 'Salsa Brava & Cubana para Bailar',
        embedUrl: 'https://www.youtube-nocookie.com/embed/videoseries?list=PL4fGSIFgk5H1k9Y8r7q6P5o4N3m2L1k0J',
        source: 'youtube'
      },
      {
        id: 'pl_salsa_romantica',
        title: 'Salsa Romántica Clásica',
        embedUrl: 'https://www.youtube-nocookie.com/embed/videoseries?list=PL4fGSIFgk5H0L9k8J7i6H5g4F3e2D1c0B',
        source: 'youtube'
      }
    ]
  },
  merengue: {
    id: 'merengue',
    name: 'Merengue & Ritmos Latinos',
    defaultBpm: 150,
    category: 'Baile & Ritmos',
    icon: '🎺',
    description: 'Cadencia rápida con tambora dominicana, güira y marcha continua.',
    streamingPlaylists: [
      {
        id: 'pl_merengue_clasico',
        title: 'Merengue Clásico & Mambo Festivo',
        embedUrl: 'https://www.youtube-nocookie.com/embed/videoseries?list=PL4fGSIFgk5H3a4B5c6D7e8F9g0H1i2J3K',
        source: 'youtube'
      }
    ]
  },
  reggaeton: {
    id: 'reggaeton',
    name: 'Urbano & Reggaeton Dance',
    defaultBpm: 96,
    category: 'Baile & Ritmos',
    icon: '⚡',
    description: 'Base de Dembow clásica con kick profundo y caja acentuada.',
    streamingPlaylists: [
      {
        id: 'pl_urban_flow',
        title: 'Reggaeton Dance & Cardio Flow',
        embedUrl: 'https://www.youtube-nocookie.com/embed/videoseries?list=PL4fGSIFgk5H2k3L4m5N6o7P8q9R0s1T2U',
        source: 'youtube'
      }
    ]
  }
};

class DanceAudioService {
  constructor() {
    this.currentMode = 'synth'; // 'synth' | 'streaming' | 'local_file'
    this.activeRhythm = 'bachata';
    this.bpm = 128;
    this.isPlaying = false;
    this.volume = 0.75;
    this.isDucked = false;

    // Web Audio sintetizador nativo
    this.audioCtx = null;
    this.masterGain = null;
    this.beatInterval = null;
    this.currentBeatIndex = 0; // 0 to 7 para compás de 8 tiempos

    // Reproductor de archivos locales
    this.localAudioEl = null;
    this.localFileUrl = null;
    this.localFileName = '';

    // Streaming activo
    this.customStreamingUrl = '';
    this.selectedPlaylistIndex = 0;

    // Escuchar alertas del sistema sonoro para aplicar atenuación automática (Ducking)
    if (typeof window !== 'undefined') {
      window.addEventListener('fitpulse:audio-alert', () => {
        if (this.isPlaying) {
          this.duckAudio(1200);
        }
      });
    }
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
        this.masterGain.connect(this.audioCtx.destination);
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // ============================================================================
  // 1. SINTETIZADOR RÍTMICO NATIVO WEB AUDIO (100% OFFLINE)
  // ============================================================================

  /**
   * Dispara un golpe sintético de percusión de alta fidelidad
   */
  _triggerPercussion(type, time, intensity = 1.0) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    if (type === 'bongo_high') {
      // Bongó macho (tiempos 1, 2, 3, 5, 6, 7)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, time);
      osc.frequency.exponentialRampToValueAtTime(180, time + 0.08);

      gain.gain.setValueAtTime(0.35 * intensity, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(time);
      osc.stop(time + 0.09);
    } else if (type === 'bongo_slap_tap') {
      // Slap acentuado de Bachata en los tiempos 4 y 8 (TAP)
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, time);
      osc.frequency.exponentialRampToValueAtTime(80, time + 0.14);

      oscGain.gain.setValueAtTime(0.55 * intensity, time);
      oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(time);
      osc.stop(time + 0.15);

      // Pequeño chasquido de tap con filtro
      this._triggerNoise(time, 0.04, 3500, 0.25 * intensity);
    } else if (type === 'guira_scrape') {
      // Rasgueo rítmico de güira metálica
      this._triggerNoise(time, 0.06, 6500, 0.18 * intensity);
    } else if (type === 'bass_thump') {
      // Tumbao de bajo grave
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(75, time);
      osc.frequency.exponentialRampToValueAtTime(42, time + 0.18);

      gain.gain.setValueAtTime(0.4 * intensity, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(time);
      osc.stop(time + 0.19);
    } else if (type === 'clave') {
      // Sonido de clave de madera (Salsa)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2200, time);

      gain.gain.setValueAtTime(0.4 * intensity, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(time);
      osc.stop(time + 0.06);
    }
  }

  _triggerNoise(time, duration, filterFreq, gainVal) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, time);
    filter.Q.setValueAtTime(3.0, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + duration);
  }

  /**
   * Ejecuta un paso del compás según el ritmo seleccionado
   */
  _playStep(stepIndex) {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (this.activeRhythm === 'bachata') {
      // Compás de 8 tiempos de Bachata:
      // Tiempos 0, 1, 2 = 1, 2, 3 (Bongó agudo + Güira + Bajo)
      // Tiempo 3 = 4 TAP (Slap acentuado + Bajo acentuado)
      // Tiempos 4, 5, 6 = 5, 6, 7 (Bongó agudo + Güira + Bajo)
      // Tiempo 7 = 8 TAP (Slap acentuado + Bajo acentuado)
      const isTap = stepIndex === 3 || stepIndex === 7;

      if (isTap) {
        this._triggerPercussion('bongo_slap_tap', now, 1.2);
        this._triggerPercussion('bass_thump', now, 1.1);
      } else {
        this._triggerPercussion('bongo_high', now, 0.9);
        this._triggerPercussion('guira_scrape', now, 0.7);
        if (stepIndex === 0 || stepIndex === 2 || stepIndex === 4 || stepIndex === 6) {
          this._triggerPercussion('bass_thump', now, 0.8);
        }
      }

      // Rasgueo intermedio de contratiempo de güira
      const halfStepTime = now + (60 / this.bpm / 2);
      this._triggerPercussion('guira_scrape', halfStepTime, 0.5);
    } else if (this.activeRhythm === 'salsa') {
      // Clave 2-3 de salsa y congas
      const isClave = stepIndex === 0 || stepIndex === 2 || stepIndex === 3 || stepIndex === 5 || stepIndex === 6;
      if (isClave) this._triggerPercussion('clave', now, 0.8);
      this._triggerPercussion('bongo_high', now, 0.7);
      if (stepIndex === 3 || stepIndex === 7) this._triggerPercussion('bass_thump', now, 1.0);
    } else if (this.activeRhythm === 'merengue') {
      // Marcha enérgica de merengue
      this._triggerPercussion('guira_scrape', now, 1.0);
      if (stepIndex % 2 === 0) this._triggerPercussion('bongo_high', now, 0.9);
      else this._triggerPercussion('bass_thump', now, 1.1);
    } else {
      // Reggaeton / Dembow
      if (stepIndex === 0 || stepIndex === 4) this._triggerPercussion('bass_thump', now, 1.2);
      if (stepIndex === 3 || stepIndex === 6) this._triggerPercussion('bongo_slap_tap', now, 1.0);
      this._triggerPercussion('guira_scrape', now, 0.4);
    }

    // Notificar al oyente del compás visual (1 a 8)
    const beatNumber = stepIndex + 1;
    window.dispatchEvent(new CustomEvent('fitpulse:dance-beat', {
      detail: {
        beatNumber,
        isTap: (stepIndex === 3 || stepIndex === 7),
        rhythm: this.activeRhythm,
        bpm: this.bpm
      }
    }));
  }

  // ============================================================================
  // 2. CONTROL GLOBAL DE REPRODUCCIÓN (PLAY / PAUSE / VOLUMEN)
  // ============================================================================

  play(rhythmId = null) {
    if (rhythmId && DANCE_RHYTHMS[rhythmId]) {
      this.activeRhythm = rhythmId;
      this.bpm = DANCE_RHYTHMS[rhythmId].defaultBpm;
    }

    this.isPlaying = true;

    if (this.currentMode === 'synth') {
      this.stop(); // Limpiar timers previos
      this.isPlaying = true;
      this.getAudioContext();

      // Duración de cada tiempo de negra según BPM
      const stepDurationMs = (60 / this.bpm) * 1000;
      this.currentBeatIndex = 0;

      // Ejecutar primer golpe inmediatamente
      this._playStep(this.currentBeatIndex);

      this.beatInterval = setInterval(() => {
        if (!this.isPlaying) return;
        this.currentBeatIndex = (this.currentBeatIndex + 1) % 8;
        this._playStep(this.currentBeatIndex);
      }, stepDurationMs);
    } else if (this.currentMode === 'local_file') {
      if (this.localAudioEl) {
        this.localAudioEl.volume = this.volume;
        this.localAudioEl.play().catch((e) => console.warn('Error al reproducir audio local:', e));
      }
    }

    window.dispatchEvent(new CustomEvent('fitpulse:dance-audio-state', {
      detail: { isPlaying: true, mode: this.currentMode, rhythm: this.activeRhythm }
    }));
  }

  pause() {
    this.isPlaying = false;
    if (this.beatInterval) {
      clearInterval(this.beatInterval);
      this.beatInterval = null;
    }
    if (this.localAudioEl) {
      this.localAudioEl.pause();
    }
    window.dispatchEvent(new CustomEvent('fitpulse:dance-audio-state', {
      detail: { isPlaying: false, mode: this.currentMode, rhythm: this.activeRhythm }
    }));
  }

  stop() {
    this.pause();
    this.currentBeatIndex = 0;
  }

  togglePlay(rhythmId = null) {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play(rhythmId);
    }
    return this.isPlaying;
  }

  setVolume(newVol) {
    this.volume = Math.max(0, Math.min(1, parseFloat(newVol)));
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
    }
    if (this.localAudioEl) {
      this.localAudioEl.volume = this.volume;
    }
    window.dispatchEvent(new CustomEvent('fitpulse:dance-volume-changed', { detail: { volume: this.volume } }));
  }

  /**
   * Atenuación automática (Audio Ducking): baja el volumen un 60% durante beeps/alertas
   */
  duckAudio(durationMs = 1200) {
    if (this.isDucked) return;
    this.isDucked = true;
    const targetLowVol = this.volume * 0.35;

    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(targetLowVol, this.audioCtx.currentTime);
    }
    if (this.localAudioEl) {
      this.localAudioEl.volume = targetLowVol;
    }

    setTimeout(() => {
      if (this.masterGain && this.audioCtx) {
        this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
      }
      if (this.localAudioEl) {
        this.localAudioEl.volume = this.volume;
      }
      this.isDucked = false;
    }, durationMs);
  }

  // ============================================================================
  // 3. ARCHIVOS LOCALES (MP3 PROPIO DEL ATLETA)
  // ============================================================================

  loadLocalFile(file) {
    if (!file) return;
    if (this.localFileUrl) {
      URL.revokeObjectURL(this.localFileUrl);
    }

    this.localFileName = file.name;
    this.localFileUrl = URL.createObjectURL(file);

    if (!this.localAudioEl) {
      this.localAudioEl = new Audio();
      this.localAudioEl.loop = true;
    }
    this.localAudioEl.src = this.localFileUrl;
    this.localAudioEl.volume = this.volume;
    this.currentMode = 'local_file';

    return this.localFileName;
  }

  // ============================================================================
  // 4. METADATOS Y MÉTODOS AUXILIARES
  // ============================================================================

  setMode(mode) {
    if (['synth', 'streaming', 'local_file'].includes(mode)) {
      if (this.isPlaying) this.pause();
      this.currentMode = mode;
    }
  }

  setBpm(newBpm) {
    this.bpm = Math.max(60, Math.min(240, parseInt(newBpm, 10) || 128));
    if (this.isPlaying && this.currentMode === 'synth') {
      this.play(); // Reiniciar con el nuevo tempo
    }
  }

  getActiveRhythmData() {
    return DANCE_RHYTHMS[this.activeRhythm] || DANCE_RHYTHMS.bachata;
  }

  getAllRhythms() {
    return Object.values(DANCE_RHYTHMS);
  }
}

export const danceAudioService = new DanceAudioService();
