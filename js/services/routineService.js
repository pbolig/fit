// ==============================================================================
// FITPULSE - WORKOUT ROUTINE TEMPLATES & PERSISTENCE SERVICE
// Permite guardar rutinas completas (tiempos, rondas, ejercicios, reps y pesos),
// crear nuevas variantes (ej. Cardio, HIIT, Fuerza), editarlas y eliminarlas offline-first.
// ==============================================================================

import { localDB } from '../db/indexedDB.js';
import { EXERCISE_CATALOG, exerciseCatalogService } from './exerciseCatalog.js';

export const BUILTIN_PRESETS = [
  {
    id: 'preset_fullbody',
    name: 'Full-Body Biomecánico',
    category: 'Fuerza',
    prepSeconds: 10,
    workSeconds: 0, // Libre
    restSeconds: 90,
    rounds: 4,
    isPreset: true,
    exerciseIds: [
      { id: 'bench_press_barbell', targetReps: 10, targetWeight: 60 },
      { id: 'pullups', targetReps: 8, targetWeight: 0 },
      { id: 'barbell_back_squat', targetReps: 10, targetWeight: 80 },
      { id: 'plank_isometric', targetReps: 45, targetWeight: 0 }
    ]
  },
  {
    id: 'preset_bachata_sensual',
    name: 'Bachata Sensual & Pasos de Baile',
    category: 'Baile & Ritmos',
    prepSeconds: 10,
    workSeconds: 45,
    restSeconds: 20,
    rounds: 3,
    isPreset: true,
    exerciseIds: [
      { id: 'dance_bachata_basico', targetReps: 45, targetWeight: 0, danceMode: 'solo' },
      { id: 'dance_bachata_madrid', targetReps: 45, targetWeight: 0, danceMode: 'solo' },
      { id: 'dance_bachata_twist', targetReps: 45, targetWeight: 0, danceMode: 'solo' },
      { id: 'dance_bachata_slide', targetReps: 45, targetWeight: 0, danceMode: 'solo' },
      { id: 'dance_bachata_pareja', targetReps: 45, targetWeight: 0, danceMode: 'pareja' }
    ]
  },
  {
    id: 'preset_cardio_dance',
    name: 'Cardio Dance & Ritmos Latinos',
    category: 'Baile & Ritmos',
    prepSeconds: 10,
    workSeconds: 45,
    restSeconds: 30,
    rounds: 3,
    isPreset: true,
    exerciseIds: [
      { id: 'dance_salsa_cubana', targetReps: 20, targetWeight: 0, danceMode: 'solo' },
      { id: 'dance_bachata_sensual', targetReps: 20, targetWeight: 0, danceMode: 'solo' },
      { id: 'dance_merengue_latino', targetReps: 25, targetWeight: 0, danceMode: 'solo' },
      { id: 'dance_zumba_fitness', targetReps: 30, targetWeight: 0, danceMode: 'solo' }
    ]
  },
  {
    id: 'preset_hiit_fatburn',
    name: 'Circuito HIIT Quema Grasa',
    category: 'Cardio',
    prepSeconds: 10,
    workSeconds: 30,
    restSeconds: 30,
    rounds: 4,
    isPreset: true,
    exerciseIds: [
      { id: 'burpees_hiit', targetReps: 12, targetWeight: 0 },
      { id: 'box_jumps', targetReps: 15, targetWeight: 0 },
      { id: 'jump_rope_cardio', targetReps: 50, targetWeight: 0 },
      { id: 'kettlebell_swings', targetReps: 15, targetWeight: 16 }
    ]
  },
  {
    id: 'preset_upper_strength',
    name: 'Fuerza Tren Superior & Pecho',
    category: 'Fuerza',
    prepSeconds: 10,
    workSeconds: 0,
    restSeconds: 90,
    rounds: 4,
    isPreset: true,
    exerciseIds: [
      { id: 'incline_dumbbell_press', targetReps: 10, targetWeight: 22 },
      { id: 'barbell_biceps_curl', targetReps: 10, targetWeight: 30 },
      { id: 'overhead_barbell_press', targetReps: 8, targetWeight: 45 },
      { id: 'pushups', targetReps: 15, targetWeight: 0 }
    ]
  }
];

class RoutineService {
  constructor() {
    this._initialized = false;
  }

  async init() {
    if (this._initialized) return;
    await exerciseCatalogService.init();
    this._initialized = true;
  }

  _hydratePresetExercises(preset) {
    const exercises = preset.exerciseIds.map((item) => {
      const catalogEx = EXERCISE_CATALOG.find((e) => e.id === item.id);
      if (catalogEx) {
        return {
          ...catalogEx,
          targetReps: item.targetReps ?? 10,
          targetWeight: item.targetWeight ?? 0,
          danceMode: item.danceMode || 'solo',
          sets: []
        };
      }
      return {
        id: item.id,
        name: item.id.replace(/_/g, ' '),
        category: preset.category,
        primaryMuscle: 'General',
        metValue: 5.0,
        targetReps: item.targetReps ?? 10,
        targetWeight: item.targetWeight ?? 0,
        danceMode: item.danceMode || 'solo',
        sets: []
      };
    });

    return {
      id: preset.id,
      name: preset.name,
      category: preset.category,
      prepSeconds: preset.prepSeconds,
      workSeconds: preset.workSeconds,
      restSeconds: preset.restSeconds,
      rounds: preset.rounds,
      isPreset: true,
      exercises
    };
  }

  /**
   * Obtiene todas las rutinas disponibles (Presets + Rutinas personalizadas del atleta)
   */
  async getAllRoutines() {
    await this.init();
    const customRoutines = (await localDB.getSetting('fitpulse_saved_routines')) || [];
    const deletedPresets = (await localDB.getSetting('fitpulse_deleted_presets')) || [];

    const activePresets = BUILTIN_PRESETS
      .filter((p) => !deletedPresets.includes(p.id))
      .map((p) => this._hydratePresetExercises(p));

    return [...customRoutines, ...activePresets];
  }

  /**
   * Obtiene una rutina por su ID
   */
  async getRoutineById(id) {
    const all = await this.getAllRoutines();
    return all.find((r) => r.id === id) || null;
  }

  /**
   * Guarda o actualiza una rutina existente
   */
  async saveRoutine(routine) {
    await this.init();
    const customRoutines = (await localDB.getSetting('fitpulse_saved_routines')) || [];

    const cleanExercises = (routine.exercises || []).map((ex) => ({
      id: ex.id,
      name: ex.name,
      category: ex.category || routine.category || 'General',
      primaryMuscle: ex.primaryMuscle || '',
      secondaryMuscles: ex.secondaryMuscles || [],
      equipment: ex.equipment || '',
      metValue: ex.metValue || 5.0,
      targetReps: parseInt(ex.targetReps, 10) || 10,
      targetWeight: parseFloat(ex.targetWeight) || 0,
      danceMode: ex.danceMode || 'solo',
      youtube_url: ex.youtube_url || '',
      sets: []
    }));

    // Si es un preset que se modifica, lo convertimos en rutina personalizada
    const isBuiltIn = BUILTIN_PRESETS.some((p) => p.id === routine.id);
    let targetId = routine.id;
    let wasConvertedFromPreset = false;

    if (isBuiltIn || !targetId || targetId.startsWith('preset_')) {
      targetId = `routine_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      wasConvertedFromPreset = true;
    }

    const payload = {
      id: targetId,
      name: routine.name || routine.title || 'Nueva Rutina',
      title: routine.name || routine.title || 'Nueva Rutina',
      category: routine.category || 'Fuerza',
      prepSeconds: parseInt(routine.prepSeconds, 10) ?? 10,
      workSeconds: parseInt(routine.workSeconds, 10) ?? 0,
      restSeconds: parseInt(routine.restSeconds, 10) ?? 90,
      rounds: parseInt(routine.rounds, 10) ?? 4,
      isPreset: false,
      isCustom: true,
      exercises: cleanExercises,
      updatedAt: new Date().toISOString()
    };

    const existingIdx = customRoutines.findIndex((r) => r.id === targetId);
    if (existingIdx >= 0) {
      customRoutines[existingIdx] = { ...customRoutines[existingIdx], ...payload };
    } else {
      payload.createdAt = new Date().toISOString();
      customRoutines.unshift(payload);
    }

    await localDB.setSetting('fitpulse_saved_routines', customRoutines);
    await this.setActiveRoutineId(targetId);

    return { routine: payload, wasConvertedFromPreset };
  }

  /**
   * Crea una nueva rutina independiente
   */
  async createRoutine(routineData) {
    await this.init();
    const newId = `routine_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newRoutine = {
      ...routineData,
      id: newId,
      name: routineData.name || routineData.title || 'Mi Rutina',
      title: routineData.name || routineData.title || 'Mi Rutina',
      isPreset: false,
      isCustom: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const customRoutines = (await localDB.getSetting('fitpulse_saved_routines')) || [];
    customRoutines.unshift(newRoutine);
    await localDB.setSetting('fitpulse_saved_routines', customRoutines);
    await this.setActiveRoutineId(newId);

    return newRoutine;
  }

  /**
   * Elimina una rutina (personalizada o archiva preset)
   */
  async deleteRoutine(id) {
    await this.init();
    const customRoutines = (await localDB.getSetting('fitpulse_saved_routines')) || [];
    const isCustom = customRoutines.some((r) => r.id === id);

    if (isCustom) {
      const filtered = customRoutines.filter((r) => r.id !== id);
      await localDB.setSetting('fitpulse_saved_routines', filtered);
    } else {
      // Es un preset: agregarlo a la lista de presets eliminados/ocultos
      const deletedPresets = (await localDB.getSetting('fitpulse_deleted_presets')) || [];
      if (!deletedPresets.includes(id)) {
        deletedPresets.push(id);
        await localDB.setSetting('fitpulse_deleted_presets', deletedPresets);
      }
    }

    // Si la rutina eliminada era la activa, seleccionar el primer preset disponible
    const activeId = await this.getActiveRoutineId();
    if (activeId === id) {
      const remaining = await this.getAllRoutines();
      const nextId = remaining.length > 0 ? remaining[0].id : 'preset_fullbody';
      await this.setActiveRoutineId(nextId);
    }

    return true;
  }

  /**
   * Obtiene la ID de la rutina activa actual
   */
  async getActiveRoutineId() {
    return (await localDB.getSetting('fitpulse_active_routine_id')) || 'preset_fullbody';
  }

  /**
   * Guarda la ID de la rutina activa
   */
  async setActiveRoutineId(id) {
    await localDB.setSetting('fitpulse_active_routine_id', id);
  }

  /**
   * Obtiene el objeto completo de la rutina activa
   */
  async getActiveRoutine() {
    const activeId = await this.getActiveRoutineId();
    let routine = await this.getRoutineById(activeId);
    if (!routine) {
      const all = await this.getAllRoutines();
      routine = all[0] || this._hydratePresetExercises(BUILTIN_PRESETS[0]);
    }
    return routine;
  }
}

export const routineService = new RoutineService();
