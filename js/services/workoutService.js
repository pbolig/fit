// ==============================================================================
// FITPULSE - WORKOUT & ATHLETE PROFILE SERVICE
// Gestiona el perfil biométrico, sesiones activas, cálculo de series, 1RM,
// cronómetro de descanso y persistencia con sincronización silenciosa.
// ==============================================================================

import { localDB } from '../db/indexedDB.js';
import { syncManager } from '../db/syncManager.js';
import { authService } from './authService.js';
import { Biometrics } from './biometrics.js';
import { EXERCISE_CATALOG } from './exerciseCatalog.js';
import { generateUUID, isValidUUID } from '../config.js';

class WorkoutService {
  constructor() {
    this.activeWorkout = null;
    this.activeWorkoutTimer = null;
    this.activeTimerSeconds = 0;
  }

  // ============================================================================
  // 1. PERFIL BIOMÉTRICO DEL ATLETA (FASE 1)
  // ============================================================================

  /**
   * Obtiene el perfil biométrico del usuario activo.
   * Si no existe, inicializa uno con valores predeterminados de referencia.
   */
  async getProfile() {
    const user = authService.getCurrentUser();
    const userId = user ? user.id : 'local_default';

    let profile = await localDB.get('profiles', userId);

    if (!profile) {
      // Perfil de partida inteligente
      profile = {
        id: userId,
        email: user?.email || '',
        full_name: user?.name || 'Atleta',
        sex: 'male',
        birth_date: '1998-05-15',
        age: 28,
        height_cm: 178,
        weight_kg: 78.5,
        target_weight_kg: 80.0,
        body_fat_pct: 15.0,
        resting_heart_rate: 62,
        activity_level: 'moderate',
        goal: 'muscle_gain',
        experience_level: 'intermediate',
        training_days_per_week: 4,
        preferred_units: 'metric',
        injuries_notes: '',
        bmr: 1785,
        tdee: 2766,
        max_hr: 188,
        bmi: 24.8,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Guardar localmente
      await localDB.put('profiles', profile);
    }

    return profile;
  }

  /**
   * Guarda y actualiza el perfil del atleta, recalculando automáticamente
   * todas las métricas biométricas científicas y sincronizando con Supabase.
   */
  async saveProfile(profileData) {
    const user = authService.getCurrentUser();
    const userId = user ? user.id : 'local_default';

    const age = profileData.birth_date
      ? Biometrics.calculateAge(profileData.birth_date)
      : parseInt(profileData.age, 10) || 28;

    const weight = parseFloat(profileData.weight_kg) || 75;
    const height = parseFloat(profileData.height_cm) || 175;
    const bodyFat = profileData.body_fat_pct ? parseFloat(profileData.body_fat_pct) : null;
    const sex = profileData.sex || 'male';
    const activity = profileData.activity_level || 'moderate';

    // Recalcular métricas
    const bmr = Biometrics.calculateBMR(weight, height, age, sex, bodyFat);
    const tdee = Biometrics.calculateTDEE(bmr, activity);
    const maxHr = Biometrics.calculateMaxHR(age);
    const bmiData = Biometrics.calculateBMI(weight, height);

    const updatedProfile = {
      ...profileData,
      id: userId,
      age,
      weight_kg: weight,
      height_cm: height,
      body_fat_pct: bodyFat,
      bmr,
      tdee,
      max_hr: maxHr,
      bmi: bmiData.bmi,
      updated_at: new Date().toISOString()
    };

    // Guardar en IndexedDB y encolar sincronización silenciosa con Supabase
    await syncManager.saveAndQueue('profiles', 'profiles', updatedProfile, 'UPSERT');

    // Registrar también este pesaje en el historial de métricas
    await this.logBodyMetric({
      date: new Date().toISOString().split('T')[0],
      weight_kg: weight,
      body_fat_pct: bodyFat,
      resting_heart_rate: updatedProfile.resting_heart_rate || null,
      notes: 'Actualización de perfil biométrico'
    });

    window.dispatchEvent(new CustomEvent('fitpulse:profile-updated', { detail: { profile: updatedProfile } }));
    return updatedProfile;
  }

  // ============================================================================
  // 2. HISTORIAL DE PESO Y MÉTRICAS CORPORALES
  // ============================================================================

  async logBodyMetric(metricData) {
    const user = authService.getCurrentUser();
    const metric = {
      id: generateUUID(),
      user_id: user ? user.id : 'local_default',
      date: metricData.date || new Date().toISOString().split('T')[0],
      weight_kg: parseFloat(metricData.weight_kg),
      body_fat_pct: metricData.body_fat_pct ? parseFloat(metricData.body_fat_pct) : null,
      resting_heart_rate: metricData.resting_heart_rate ? parseInt(metricData.resting_heart_rate, 10) : null,
      notes: metricData.notes || '',
      created_at: new Date().toISOString()
    };

    await syncManager.saveAndQueue('body_metrics', 'body_metrics_log', metric, 'UPSERT');
    return metric;
  }

  async getBodyMetricsHistory() {
    const metrics = await localDB.getAll('body_metrics');
    return metrics.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  // ============================================================================
  // 3. SESIÓN DE ENTRENAMIENTO ACTIVA
  // ============================================================================

  /**
   * Inicia una nueva sesión de entrenamiento
   */
  startWorkout(title = 'Entrenamiento del Día', category = 'Fuerza') {
    const user = authService.getCurrentUser();
    this.activeWorkout = {
      id: generateUUID(),
      user_id: user ? user.id : 'local_default',
      title,
      category,
      start_time: new Date().toISOString(),
      duration_seconds: 0,
      exercises: [],
      notes: '',
      status: 'in_progress'
    };

    this.activeTimerSeconds = 0;
    this.startActiveTimer();
    this.saveActiveWorkoutToStorage();
    window.dispatchEvent(new CustomEvent('fitpulse:workout-started', { detail: { workout: this.activeWorkout } }));
    return this.activeWorkout;
  }

  getActiveWorkout() {
    if (!this.activeWorkout) {
      try {
        const saved = localStorage.getItem('fitpulse_active_workout');
        if (saved) {
          this.activeWorkout = JSON.parse(saved);
          // Calcular segundos transcurridos
          const startTime = new Date(this.activeWorkout.start_time).getTime();
          const now = Date.now();
          this.activeTimerSeconds = Math.max(0, Math.floor((now - startTime) / 1000));
          this.startActiveTimer();
        }
      } catch (e) {
        console.warn('Error al recuperar sesión activa:', e);
      }
    }
    return this.activeWorkout;
  }

  startActiveTimer() {
    if (this.activeWorkoutTimer) clearInterval(this.activeWorkoutTimer);
    this.activeWorkoutTimer = setInterval(() => {
      this.activeTimerSeconds++;
      if (this.activeWorkout) {
        this.activeWorkout.duration_seconds = this.activeTimerSeconds;
        // Guardar cada 15 segundos
        if (this.activeTimerSeconds % 15 === 0) {
          this.saveActiveWorkoutToStorage();
        }
      }
      window.dispatchEvent(new CustomEvent('fitpulse:workout-timer-tick', {
        detail: { seconds: this.activeTimerSeconds }
      }));
    }, 1000);
  }

  saveActiveWorkoutToStorage() {
    if (this.activeWorkout) {
      localStorage.setItem('fitpulse_active_workout', JSON.stringify(this.activeWorkout));
    } else {
      localStorage.removeItem('fitpulse_active_workout');
    }
  }

  /**
   * Añade un ejercicio a la sesión activa
   */
  addExerciseToActiveWorkout(exerciseId) {
    if (!this.activeWorkout) return null;

    const catalogEx = EXERCISE_CATALOG.find((e) => e.id === exerciseId);
    if (!catalogEx) return null;

    const workoutExercise = {
      id: generateUUID(),
      workout_id: this.activeWorkout.id,
      exercise_id: catalogEx.id,
      exercise_name: catalogEx.name,
      category: catalogEx.category,
      type: catalogEx.type, // 'strength', 'cardio', 'duration'
      metValue: catalogEx.metValue,
      sets: [
        this.createDefaultSet(catalogEx.type, 1)
      ],
      notes: ''
    };

    this.activeWorkout.exercises.push(workoutExercise);
    this.saveActiveWorkoutToStorage();
    return workoutExercise;
  }

  createDefaultSet(type, setNumber) {
    if (type === 'cardio') {
      return {
        set_number: setNumber,
        duration_minutes: 15,
        distance_km: 2.5,
        speed_kmh: 10,
        completed: false,
        calories_burned: 0
      };
    } else if (type === 'duration') {
      return {
        set_number: setNumber,
        duration_seconds: 60,
        completed: false,
        calories_burned: 0
      };
    } else {
      // Fuerza estándar
      return {
        set_number: setNumber,
        weight_kg: 60,
        reps: 10,
        rpe: 8,
        estimated_1rm: 80,
        completed: false
      };
    }
  }

  addSetToExercise(exerciseIndex) {
    if (!this.activeWorkout || !this.activeWorkout.exercises[exerciseIndex]) return null;
    const exercise = this.activeWorkout.exercises[exerciseIndex];
    const prevSet = exercise.sets[exercise.sets.length - 1];

    const newSet = {
      ...this.createDefaultSet(exercise.type, exercise.sets.length + 1),
      weight_kg: prevSet?.weight_kg || 60,
      reps: prevSet?.reps || 10,
      rpe: prevSet?.rpe || 8
    };

    if (exercise.type === 'strength') {
      newSet.estimated_1rm = Biometrics.calculate1RM(newSet.weight_kg, newSet.reps);
    }

    exercise.sets.push(newSet);
    this.saveActiveWorkoutToStorage();
    return newSet;
  }

  removeSetFromExercise(exerciseIndex, setIndex) {
    if (!this.activeWorkout || !this.activeWorkout.exercises[exerciseIndex]) return;
    this.activeWorkout.exercises[exerciseIndex].sets.splice(setIndex, 1);
    // Renumerar
    this.activeWorkout.exercises[exerciseIndex].sets.forEach((s, idx) => {
      s.set_number = idx + 1;
    });
    this.saveActiveWorkoutToStorage();
  }

  removeExerciseFromWorkout(exerciseIndex) {
    if (!this.activeWorkout) return;
    this.activeWorkout.exercises.splice(exerciseIndex, 1);
    this.saveActiveWorkoutToStorage();
  }

  /**
   * Finaliza el entrenamiento activo, calcula estadísticas totales y sincroniza
   */
  async finishWorkout(userProfile) {
    if (!this.activeWorkout) return null;

    if (this.activeWorkoutTimer) clearInterval(this.activeWorkoutTimer);

    const workout = { ...this.activeWorkout };
    workout.end_time = new Date().toISOString();
    workout.duration_seconds = this.activeTimerSeconds;
    workout.status = 'completed';

    const userWeight = userProfile?.weight_kg || 75;
    const durationMins = Math.max(1, Math.round(workout.duration_seconds / 60));

    // Cálculos de volumen total, 1RM más alto y calorías
    let totalVolumeKg = 0;
    let totalCalories = 0;
    let totalSets = 0;

    for (const ex of workout.exercises) {
      let exVolume = 0;
      let exBest1RM = 0;
      let exCalories = 0;

      for (const set of ex.sets) {
        if (set.completed || true) { // contabilizar series realizadas
          totalSets++;
          if (ex.type === 'strength') {
            const w = parseFloat(set.weight_kg) || 0;
            const r = parseInt(set.reps, 10) || 0;
            const vol = w * r;
            exVolume += vol;
            const oneRm = Biometrics.calculate1RM(w, r);
            if (oneRm > exBest1RM) exBest1RM = oneRm;
          } else if (ex.type === 'cardio') {
            const mins = parseFloat(set.duration_minutes) || 10;
            const cals = Biometrics.calculateCardioCalories(ex.metValue || 8.0, userWeight, mins);
            exCalories += cals;
          }
        }
      }

      ex.total_volume_kg = exVolume;
      ex.best_1rm = exBest1RM;

      totalVolumeKg += exVolume;
      if (ex.type === 'cardio') {
        totalCalories += exCalories;
      }
    }

    // Calorías de la porción de fuerza / tiempo global
    const strengthCalories = Biometrics.calculateStrengthCalories(userWeight, durationMins, totalSets, true);
    totalCalories += strengthCalories;

    workout.total_volume_kg = totalVolumeKg;
    workout.total_calories = Math.round(totalCalories);

    // 1. Guardar la sesión principal en IndexedDB y cola de Supabase
    const sessionPayload = {
      id: workout.id,
      user_id: workout.user_id,
      title: workout.title,
      category: workout.category,
      start_time: workout.start_time,
      end_time: workout.end_time,
      duration_seconds: workout.duration_seconds,
      total_volume_kg: workout.total_volume_kg,
      total_calories: workout.total_calories,
      notes: workout.notes,
      status: 'completed'
    };

    await syncManager.saveAndQueue('workouts', 'workout_sessions', sessionPayload, 'UPSERT');

    // 2. Guardar cada ejercicio de la sesión
    for (let i = 0; i < workout.exercises.length; i++) {
      const ex = workout.exercises[i];
      const exPayload = {
        id: ex.id,
        workout_id: workout.id,
        user_id: workout.user_id,
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_name,
        category: ex.category,
        order_index: i,
        sets: ex.sets,
        best_1rm: ex.best_1rm || 0,
        total_volume_kg: ex.total_volume_kg || 0,
        calories_burned: ex.calories_burned || 0
      };
      await syncManager.saveAndQueue('workout_exercises', 'workout_exercises', exPayload, 'UPSERT');
    }

    // Limpiar estado activo
    this.activeWorkout = null;
    this.activeTimerSeconds = 0;
    this.saveActiveWorkoutToStorage();

    window.dispatchEvent(new CustomEvent('fitpulse:workout-completed', { detail: { workout } }));
    return workout;
  }

  discardActiveWorkout() {
    if (this.activeWorkoutTimer) clearInterval(this.activeWorkoutTimer);
    this.activeWorkout = null;
    this.activeTimerSeconds = 0;
    this.saveActiveWorkoutToStorage();
    window.dispatchEvent(new CustomEvent('fitpulse:workout-discarded'));
  }

  // ============================================================================
  // 4. HISTORIAL Y ESTADÍSTICAS
  // ============================================================================

  async getAllWorkouts() {
    const workouts = await localDB.getAll('workouts');
    // Filtrar y purgar registros corruptos sin start_time de pruebas anteriores
    const valid = [];
    for (const w of workouts) {
      if (!w || !w.id || !w.start_time) {
        if (w?.id) await localDB.delete('workouts', w.id);
      } else {
        valid.push(w);
      }
    }
    return valid.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
  }

  async getWorkoutWithExercises(workoutId) {
    const workout = await localDB.get('workouts', workoutId);
    if (!workout) return null;

    const allExercises = await localDB.getAll('workout_exercises');
    workout.exercises = allExercises.filter((e) => e.workout_id === workoutId);
    return workout;
  }

  async deleteWorkout(workoutId) {
    if (this.activeWorkout && this.activeWorkout.id === workoutId) {
      this.discardActiveWorkout();
    }
    
    // 1. Eliminar la sesión de IndexedDB local
    await localDB.delete('workouts', workoutId);
    
    // 2. Eliminar también todos los ejercicios asociados a esta sesión en IndexedDB
    try {
      const allExercises = await localDB.getAll('workout_exercises');
      const workoutExercises = allExercises.filter((e) => e.workout_id === workoutId);
      for (const we of workoutExercises) {
        await localDB.delete('workout_exercises', we.id);
        if (isValidUUID(we.id)) {
          await localDB.enqueueSync('workout_exercises', 'DELETE', { id: we.id });
        }
      }
    } catch (e) {
      console.warn('Error al limpiar ejercicios de la sesión eliminada:', e);
    }

    // 3. Encolar borrado remoto sólo si es UUID válido (si era ID local nunca existió en Supabase)
    if (isValidUUID(workoutId)) {
      await localDB.enqueueSync('workout_sessions', 'DELETE', { id: workoutId });
      if (navigator.onLine && !syncManager.isSyncing) {
        syncManager.syncNow().catch((err) => console.warn('Sync delete err:', err));
      }
    }

    window.dispatchEvent(new CustomEvent('fitpulse:workout-deleted', { detail: { id: workoutId } }));
  }

  /**
   * Obtiene récords personales (1RM máximo alcanzado por ejercicio)
   */
  async getPersonalRecords() {
    const exercises = await localDB.getAll('workout_exercises');
    const prMap = {};

    for (const ex of exercises) {
      const best = parseFloat(ex.best_1rm) || 0;
      if (best > 0) {
        if (!prMap[ex.exercise_name] || best > prMap[ex.exercise_name].best_1rm) {
          prMap[ex.exercise_name] = {
            exercise_id: ex.exercise_id,
            exercise_name: ex.exercise_name,
            best_1rm: best,
            category: ex.category
          };
        }
      }
    }

    return Object.values(prMap);
  }
}

export const workoutService = new WorkoutService();
