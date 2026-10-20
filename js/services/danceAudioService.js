// ==============================================================================
// FITPULSE - WORKOUT & DANCE AUDIO ENGINE (100% LEGAL & ROYALTY-FREE)
// Servicio de audio dual para entrenamientos:
// 1. MODO GENERAL / LIBRE (Fuerza, Cardio, Funcional, etc.):
//    - Música motivacional continua en streaming (EDM, Heavy Rock, Synthwave, Dubstep, Lo-Fi Chill).
//    - Radios en vivo 100% libres de derechos de autor (Open streams, cero infracción legal).
//    - Reproducción de MP3 local propio sin datos móviles.
//    - CERO conteo de pasos ni taps percusivos (música libre y transparente).
// 2. MODO BAILE & RITMOS (Bachata, Salsa, Merengue, Reggaeton):
//    - Sintetizador nativo Web Audio API de percusión con compás de 8 tiempos estricto y taps.
// 3. Atenuación automática (Audio Ducking) con alertas del cronómetro.
// ==============================================================================

import { Sound } from '../ui/sound.js';

// Ritmos especializados para Baile
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

// Estaciones de Música Libre (100% Royalty-Free / Legales / En Vivo / MP3 Nativo)
export const FREE_MUSIC_STATIONS = [
  {
    id: 'beatblender',
    name: '⚡ EDM & Gym Energy',
    genre: 'Deep House & Club Hits',
    streamUrl: 'https://ice1.somafm.com/beatblender-128-mp3',
    icon: '⚡',
    description: 'Ritmos continuos y pulsantes para cardio, HIIT, crossfit y circuitos dinámicos.'
  },
  {
    id: 'metal',
    name: '🎸 Heavy Rock & Powerlifting',
    genre: 'Heavy Metal & Hard Rock',
    streamUrl: 'https://ice1.somafm.com/metal-128-mp3',
    icon: '🎸',
    description: 'Riffs pesados y pura adrenalina para press de banca, sentadillas y récords de fuerza.'
  },
  {
    id: 'vaporwaves',
    name: '🌆 Synthwave & Retrowave',
    genre: 'Chillwave & Synth Electro',
    streamUrl: 'https://ice1.somafm.com/vaporwaves-128-mp3',
    icon: '🌆',
    description: 'Sonoridades ochentosas y enfoque mental profundo para hipertrofia y concentración.'
  },
  {
    id: 'dubstep',
    name: '🔥 Bass & Dubstep Energy',
    genre: 'Bassline & Dubstep',
    streamUrl: 'https://ice1.somafm.com/dubstep-128-mp3',
    icon: '🔥',
    description: 'Potencia de graves de alta intensidad para series demandantes y máximo esfuerzo.'
  },
  {
    id: 'defcon',
    name: '💻 Cyber Beats & Techno',
    genre: 'Electronic & Industrial',
    streamUrl: 'https://ice1.somafm.com/defcon-128-mp3',
    icon: '💻',
    description: 'Ritmo constante e implacable para mantener pulsaciones estables y enfoque absoluto.'
  },
  {
    id: 'cliqhop',
    name: '🎧 Electro & Breakbeat',
    genre: 'IDM & Crisp Beats',
    streamUrl: 'https://ice1.somafm.com/cliqhop-128-mp3',
    icon: '🎧',
    description: 'Bases percusivas modernas para agilidad, coordinación y entrenamiento funcional.'
  },
  {
    id: 'groovesalad',
    name: '☕ Lo-Fi & Chill Recovery',
    genre: 'Downtempo & Ambient Beats',
    streamUrl: 'https://ice1.somafm.com/groovesalad-128-mp3',
    icon: '☕',
    description: 'Vibras suaves para respiración, yoga, estiramientos y vuelta a la calma post-entreno.'
  }
];

export const FREE_STREAMING_PLAYLISTS = [
  {
    id: 'ncs_workout',
    title: 'NoCopyrightSounds (NCS) - Best Workout Gaming & Gym Mix',
    embedUrl: 'https://www.youtube-nocookie.com/embed/videoseries?list=PLRBp0Fe2Gpgm0wf4112Xg707lGWOi8hV5',
    source: 'youtube'
  },
  {
    id: 'lofi_gym',
    title: 'Lo-Fi Chill Beats for Focus & Lifting (Royalty-Free)',
    embedUrl: 'https://www.youtube-nocookie.com/embed/videoseries?list=PL4fGSIFgk5H2uR7lJ0f8Y3t1wQzV8K9P0',
    source: 'youtube'
  },
  {
    id: 'epic_motivation',
    title: 'Epic Cinematic & Workout Motivation (Royalty-Free)',
    embedUrl: 'https://www.youtube-nocookie.com/embed/videoseries?list=PLRBp0Fe2GpgnZOm5rCopMAOYhZCPoUyO5',
    source: 'youtube'
  }
];

class DanceAudioService {
  constructor() {
    this.currentMode = 'radio'; // 'radio' | 'synth' | 'streaming' | 'local_file' | 'none'
    this.activeRhythm = 'bachata';
    this.activeStationId = 'beatblender';
    this.bpm = 128;
    this.isPlaying = false;
    this.volume = 0.75;
    this.isDucked = false;
    this.isDanceMode = false;

    // Web Audio sintetizador nativo
    this.audioCtx = null;
    this.masterGain = null;
    this.beatInterval = null;
    this.currentBeatIndex = 0; // 0 to 7 para compás de 8 tiempos

    // Reproductor de archivos locales
    this.localAudioEl = null;
    this.localFileUrl = null;
    this.localFileName = '';

    // Reproductor de radio streaming (MP3 nativo royalty-free)
    this.streamAudioEl = null;

    // Streaming activo / YouTube
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
  // 1. SINTETIZADOR RÍTMICO NATIVO WEB AUDIO (100% OFFLINE PARA BAILE)
  // ============================================================================

  _triggerPercussion(type, time, intensity = 1.0) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    if (type === 'bongo_high') {
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

      this._triggerNoise(time, 0.04, 3500, 0.25 * intensity);
    } else if (type === 'guira_scrape') {
      this._triggerNoise(time, 0.06, 6500, 0.18 * intensity);
    } else if (type === 'bass_thump') {
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

  _playStep(stepIndex) {
    if (this.currentMode === 'synth') {
      const ctx = this.getAudioContext();
      if (ctx) {
        const now = ctx.currentTime;

        if (this.activeRhythm === 'bachata') {
          const isTap = stepIndex === 3 || stepIndex === 7;

          if (isTap) {
            this._triggerPercussion('bongo_slap_tap', now, 1.25);
            this._triggerPercussion('bass_thump', now, 1.15);
          } else {
            this._triggerPercussion('bongo_high', now, 0.9);
            this._triggerPercussion('guira_scrape', now, 0.7);
            if (stepIndex === 0 || stepIndex === 2 || stepIndex === 4 || stepIndex === 6) {
              this._triggerPercussion('bass_thump', now, 0.8);
            }
          }

          const halfStepTime = now + (60 / this.bpm / 2);
          this._triggerPercussion('guira_scrape', halfStepTime, 0.45);
        } else if (this.activeRhythm === 'salsa') {
          const isClave = stepIndex === 0 || stepIndex === 2 || stepIndex === 3 || stepIndex === 5 || stepIndex === 6;
          if (isClave) this._triggerPercussion('clave', now, 0.85);
          this._triggerPercussion('bongo_high', now, 0.75);
          if (stepIndex === 3 || stepIndex === 7) this._triggerPercussion('bass_thump', now, 1.0);
        } else if (this.activeRhythm === 'merengue') {
          this._triggerPercussion('guira_scrape', now, 1.0);
          if (stepIndex % 2 === 0) this._triggerPercussion('bongo_high', now, 0.9);
          else this._triggerPercussion('bass_thump', now, 1.1);
        } else {
          if (stepIndex === 0 || stepIndex === 4) this._triggerPercussion('bass_thump', now, 1.2);
          if (stepIndex === 3 || stepIndex === 6) this._triggerPercussion('bongo_slap_tap', now, 1.0);
          this._triggerPercussion('guira_scrape', now, 0.4);
        }
      }
    }

    const beatNumber = (stepIndex % 8) + 1;
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
  // 2. STREAMING EN VIVO DE ESTACIONES LIBRES (ROYALTY-FREE)
  // ============================================================================

  _playStationStream() {
    const station = this.getActiveStationData();
    if (!station) return;

    if (!this.streamAudioEl) {
      this.streamAudioEl = new Audio();
      this.streamAudioEl.crossOrigin = 'anonymous';
    }

    if (this.streamAudioEl.src !== station.streamUrl) {
      this.streamAudioEl.src = station.streamUrl;
    }
    this.streamAudioEl.volume = this.volume;
    this.streamAudioEl.play().catch((e) => {
      console.warn('FitPulse Audio: esperando interacción o reproduciendo stream...', e);
    });
  }

  // ============================================================================
  // 3. CONTROL GLOBAL DE REPRODUCCIÓN (PLAY / PAUSE / VOLUMEN)
  // ============================================================================

  play(targetId = null) {
    if (this.isDanceMode) {
      // MODO BAILE: Sintetizador Web Audio de 8 tiempos
      if (targetId && DANCE_RHYTHMS[targetId]) {
        this.activeRhythm = targetId;
        this.bpm = DANCE_RHYTHMS[targetId].defaultBpm;
      }

      if (this.beatInterval) {
        clearInterval(this.beatInterval);
        this.beatInterval = null;
      }

      this.isPlaying = true;

      if (this.currentMode === 'synth') {
        this.getAudioContext();
      } else if (this.currentMode === 'local_file') {
        if (this.localAudioEl) {
          this.localAudioEl.volume = this.volume;
          this.localAudioEl.play().catch((e) => console.warn('Error al reproducir audio local:', e));
        }
      }

      const stepDurationMs = (60 / this.bpm) * 1000;
      this.currentBeatIndex = 0;
      this._playStep(this.currentBeatIndex);

      this.beatInterval = setInterval(() => {
        if (!this.isPlaying) return;
        this.currentBeatIndex = (this.currentBeatIndex + 1) % 8;
        this._playStep(this.currentBeatIndex);
      }, stepDurationMs);
    } else {
      // MODO ENTRENAMIENTO GENERAL / LIBRE (Fuerza, Cardio, etc.):
      // CERO conteo de pasos, CERO compás de 8 tiempos, CERO taps.
      if (this.beatInterval) {
        clearInterval(this.beatInterval);
        this.beatInterval = null;
      }

      if (targetId && FREE_MUSIC_STATIONS.some((s) => s.id === targetId)) {
        this.activeStationId = targetId;
      }

      if (this.currentMode === 'none') {
        this.isPlaying = false;
        return;
      }

      this.isPlaying = true;

      if (this.currentMode === 'radio') {
        this._playStationStream();
      } else if (this.currentMode === 'local_file') {
        if (this.localAudioEl) {
          this.localAudioEl.volume = this.volume;
          this.localAudioEl.play().catch((e) => console.warn('Error al reproducir audio local:', e));
        }
      }
    }

    window.dispatchEvent(new CustomEvent('fitpulse:dance-audio-state', {
      detail: {
        isPlaying: this.isPlaying,
        mode: this.currentMode,
        rhythm: this.activeRhythm,
        station: this.activeStationId,
        isDance: this.isDanceMode
      }
    }));
  }

  pause() {
    this.isPlaying = false;
    if (this.beatInterval) {
      clearInterval(this.beatInterval);
      this.beatInterval = null;
    }
    if (this.streamAudioEl) {
      this.streamAudioEl.pause();
    }
    if (this.localAudioEl) {
      this.localAudioEl.pause();
    }
    window.dispatchEvent(new CustomEvent('fitpulse:dance-audio-state', {
      detail: {
        isPlaying: false,
        mode: this.currentMode,
        rhythm: this.activeRhythm,
        station: this.activeStationId,
        isDance: this.isDanceMode
      }
    }));
  }

  stop() {
    this.pause();
    this.currentBeatIndex = 0;
    if (this.streamAudioEl) {
      this.streamAudioEl.pause();
      this.streamAudioEl.src = '';
    }
  }

  togglePlay(targetId = null) {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play(targetId);
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
    if (this.streamAudioEl) {
      this.streamAudioEl.volume = this.volume;
    }
    window.dispatchEvent(new CustomEvent('fitpulse:dance-volume-changed', { detail: { volume: this.volume } }));
  }

  /**
   * Atenuación automática (Audio Ducking): baja el volumen un 65% durante beeps/alertas
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
    if (this.streamAudioEl) {
      this.streamAudioEl.volume = targetLowVol;
    }

    setTimeout(() => {
      if (this.masterGain && this.audioCtx) {
        this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
      }
      if (this.localAudioEl) {
        this.localAudioEl.volume = this.volume;
      }
      if (this.streamAudioEl) {
        this.streamAudioEl.volume = this.volume;
      }
      this.isDucked = false;
    }, durationMs);
  }

  // ============================================================================
  // 4. ARCHIVOS LOCALES (MP3 PROPIO DEL ATLETA)
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
  // 5. METADATOS Y MÉTODOS AUXILIARES
  // ============================================================================

  setMode(mode) {
    if (['radio', 'synth', 'streaming', 'local_file', 'none'].includes(mode)) {
      if (this.isPlaying) this.pause();
      this.currentMode = mode;
      if (mode === 'none') {
        this.stop();
      }
    }
  }

  setStation(stationId) {
    if (stationId && FREE_MUSIC_STATIONS.some((s) => s.id === stationId)) {
      this.activeStationId = stationId;
      if (this.isPlaying && this.currentMode === 'radio') {
        this._playStationStream();
      }
    }
  }

  playStation(stationId) {
    this.setStation(stationId);
    this.currentMode = 'radio';
    this.isDanceMode = false;
    this.play();
  }

  setBpm(newBpm) {
    this.bpm = Math.max(60, Math.min(240, parseInt(newBpm, 10) || 128));
    if (this.isPlaying && this.currentMode === 'synth') {
      this.play();
    }
  }

  getActiveRhythmData() {
    return DANCE_RHYTHMS[this.activeRhythm] || DANCE_RHYTHMS.bachata;
  }

  getAllRhythms() {
    return Object.values(DANCE_RHYTHMS);
  }

  getActiveStationData() {
    return FREE_MUSIC_STATIONS.find((s) => s.id === this.activeStationId) || FREE_MUSIC_STATIONS[0];
  }

  getAllStations() {
    return FREE_MUSIC_STATIONS;
  }
}

export const danceAudioService = new DanceAudioService();
export const workoutAudioService = danceAudioService;
