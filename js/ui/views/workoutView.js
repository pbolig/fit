// ==============================================================================
// FITPULSE - ADVANCED WORKOUT ROUTINE BUILDER & PHASE-DRIVEN GIANT TIMER
// Incluye:
// 1. Gestor de Rutinas Persistentes (Guardar, Crear variantes, Seleccionar, Editar y Eliminar).
// 2. Coordinador de tiempos (preparación, trabajo, descanso, vueltas y series con repeticiones y cargas).
// 3. Cronómetro gigante de alto impacto visual con fases (Prep, Trabajo, Descanso).
// 4. Sonidos atléticos y alertas hápticas en cuenta regresiva.
// 5. Pantalla final de resumen con métricas biométricas, volumen y calorías.
// ==============================================================================

import { workoutService } from '../../services/workoutService.js';
import { Biometrics } from '../../services/biometrics.js';
import { EXERCISE_CATALOG, CATEGORIES, exerciseCatalogService } from '../../services/exerciseCatalog.js';
import { routineService } from '../../services/routineService.js';
import { Sound } from '../sound.js';
import { Toast } from '../toast.js';
import { router } from '../router.js';
import { generateUUID } from '../../config.js';

export const WorkoutView = {
  // Estado local del controlador de fases y configuración de la rutina activa
  routineConfig: {
    id: 'preset_fullbody',
    title: 'Full-Body Biomecánico',
    category: 'Fuerza',
    prepSeconds: 10,
    workSeconds: 0, // 0 = libre/manual
    restSeconds: 90,
    rounds: 4,
    isPreset: true,
    exercises: []
  },

  activeController: {
    phase: 'idle', // 'prep' | 'work' | 'rest' | 'summary'
    phaseTimer: null,
    phaseSeconds: 0,
    phaseTotalSeconds: 0,
    isPaused: false,
    currentExerciseIdx: 0,
    currentRound: 1,
    summaryData: null
  },

  async render(container) {
    const profile = await workoutService.getProfile();
    const activeWorkout = workoutService.getActiveWorkout();

    // Si ya hay un entrenamiento en curso con ejercicios válidos, restaurar el controlador activo
    if (activeWorkout && activeWorkout.status === 'in_progress' && activeWorkout.exercises && activeWorkout.exercises.length > 0) {
      if (activeWorkout.config) {
        this.routineConfig = { ...this.routineConfig, ...activeWorkout.config };
      }
      if (this.activeController.phase === 'idle') {
        this.enterPhase(container, activeWorkout, profile, 'work', this.routineConfig.workSeconds);
      } else {
        this.renderActivePhaseScreen(container, activeWorkout, profile);
      }
      return;
    }

    // Inicializar catálogo y gestor de rutinas
    await routineService.init();
    await exerciseCatalogService.init();

    // Cargar rutina activa guardada (o preset por defecto)
    const activeRoutine = await routineService.getActiveRoutine();
    if (activeRoutine) {
      this.routineConfig = {
        id: activeRoutine.id,
        title: activeRoutine.name || activeRoutine.title || 'Mi Rutina',
        name: activeRoutine.name || activeRoutine.title || 'Mi Rutina',
        category: activeRoutine.category || 'Fuerza',
        prepSeconds: activeRoutine.prepSeconds ?? 10,
        workSeconds: activeRoutine.workSeconds ?? 0,
        restSeconds: activeRoutine.restSeconds ?? 90,
        rounds: activeRoutine.rounds ?? 4,
        isPreset: !!activeRoutine.isPreset,
        exercises: (activeRoutine.exercises || []).map((e) => ({
          ...e,
          targetReps: parseInt(e.targetReps, 10) || 10,
          targetWeight: parseFloat(e.targetWeight) || 0,
          sets: []
        }))
      };
    }

    // Renderizar la pantalla de configuración previa
    await this.renderRoutineSetupScreen(container, profile);
  },

  // Genera las opciones agrupadas del dropdown de rutinas
  renderRoutineSelectOptions(allRoutines, activeId) {
    const custom = allRoutines.filter((r) => !r.isPreset);
    const presets = allRoutines.filter((r) => r.isPreset);

    let html = '';
    if (custom.length > 0) {
      html += `<optgroup label="⭐ Mis Rutinas Guardadas">`;
      html += custom.map((r) => `
        <option value="${r.id}" ${r.id === activeId ? 'selected' : ''}>
          ${r.name || r.title} (${r.category})
        </option>
      `).join('');
      html += `</optgroup>`;
    }

    html += `<optgroup label="💎 Plantillas Predefinidas">`;
    html += presets.map((r) => `
      <option value="${r.id}" ${r.id === activeId ? 'selected' : ''}>
        ${r.name || r.title} (${r.category})
      </option>
    `).join('');
    html += `</optgroup>`;

    return html;
  },

  // ============================================================================
  // PANTALLA 1: PREPARACIÓN Y GESTIÓN DE RUTINAS
  // ============================================================================
  async renderRoutineSetupScreen(container, profile) {
    // Si la rutina no tiene ejercicios, asignar dos iniciales
    if (this.routineConfig.exercises.length === 0) {
      this.routineConfig.exercises = [
        { ...EXERCISE_CATALOG[0], targetReps: 10, targetWeight: 60, sets: [] },
        { ...EXERCISE_CATALOG[5], targetReps: 8, targetWeight: 0, sets: [] }
      ];
    }

    const allRoutines = await routineService.getAllRoutines();

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <span class="badge-tag">Planificador & Gestor de Rutinas</span>
          <h1 class="view-title">Coordinar Rutina & Tiempos</h1>
          <p class="view-subtitle">Guarda tus rutinas favoritas (Cardio, Fuerza, Ritmos), ajusta tiempos y repeticiones, o crea nuevas variantes independientes.</p>
        </div>
      </div>

      <!-- BARRA SUPERIOR: GESTOR Y SELECTOR DE RUTINAS -->
      <div class="card glass-card routine-manager-card">
        <div class="routine-manager-main">
          <div class="routine-selector-col">
            <div class="routine-selector-label-row">
              <label for="select-saved-routine" class="routine-selector-label">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                <span>Rutina Activa</span>
              </label>
              <span class="routine-type-badge ${this.routineConfig.isPreset ? 'badge-preset' : 'badge-custom'}" id="routine-badge-type">
                ${this.routineConfig.isPreset ? '💎 Plantilla Predefinida' : '⭐ Mi Rutina Guardada'}
              </span>
            </div>

            <div class="routine-select-wrapper">
              <select id="select-saved-routine" class="select-field routine-dropdown">
                ${this.renderRoutineSelectOptions(allRoutines, this.routineConfig.id)}
              </select>
            </div>
          </div>

          <div class="routine-actions-buttons">
            <button type="button" id="btn-save-current-routine" class="btn btn-secondary btn-routine-act" title="Guardar cambios de tiempos, ejercicios y repeticiones en esta rutina">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              <span>💾 Guardar Cambios</span>
            </button>

            <button type="button" id="btn-create-new-routine" class="btn btn-primary btn-glow btn-routine-act" title="Crear otra rutina nueva con diferentes valores sin alterar la actual">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              <span>➕ Guardar como Nueva</span>
            </button>

            <button type="button" id="btn-delete-current-routine" class="btn btn-outline-danger btn-routine-act" title="Eliminar la rutina seleccionada">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              <span>🗑️ Eliminar</span>
            </button>
          </div>
        </div>
      </div>

      <div class="routine-setup-grid">
        <!-- COLUMNA IZQUIERDA: CONFIGURACIÓN DE TIEMPOS Y RONDAS -->
        <div class="card glass-card">
          <div class="card-header">
            <div class="card-icon-box accent-cyan">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div>
              <h2 class="card-title">Parámetros del Cronómetro</h2>
              <p class="card-description">Control de intervalos para cada paso de la actividad</p>
            </div>
          </div>

          <div class="setup-controls-stack">
            <!-- 1. Nombre y Enfoque -->
            <div class="form-group full-width">
              <label for="setup-title">Nombre de la Rutina</label>
              <input type="text" id="setup-title" class="input-field" value="${this.routineConfig.title}">
            </div>

            <!-- 1.1 Categoría -->
            <div class="form-group full-width">
              <label for="setup-category">Categoría Principal</label>
              <select id="setup-category" class="select-field">
                ${CATEGORIES.map((cat) => `
                  <option value="${cat}" ${cat === this.routineConfig.category ? 'selected' : ''}>${cat}</option>
                `).join('')}
              </select>
            </div>

            <!-- 2. Tiempo para Largar / Preparación -->
            <div class="timing-selector-block">
              <div class="timing-label-row">
                <span class="timing-title">⏱️ Tiempo para Largar (Prepárate)</span>
                <span class="timing-value" id="disp-prep-secs">${this.routineConfig.prepSeconds} seg</span>
              </div>
              <p class="timing-hint">Cuenta regresiva inicial para acomodar el peso y posicionarte.</p>
              <div class="preset-pill-group" id="prep-pill-group">
                <button type="button" class="preset-pill ${this.routineConfig.prepSeconds === 5 ? 'active' : ''}" data-secs="5">5s</button>
                <button type="button" class="preset-pill ${this.routineConfig.prepSeconds === 10 ? 'active' : ''}" data-secs="10">10s</button>
                <button type="button" class="preset-pill ${this.routineConfig.prepSeconds === 15 ? 'active' : ''}" data-secs="15">15s</button>
                <button type="button" class="preset-pill ${this.routineConfig.prepSeconds === 20 ? 'active' : ''}" data-secs="20">20s</button>
              </div>
            </div>

            <!-- 3. Tiempo de Descanso Entre Series -->
            <div class="timing-selector-block">
              <div class="timing-label-row">
                <span class="timing-title">🧘 Tiempo de Descanso Entre Series</span>
                <span class="timing-value text-accent-cyan" id="disp-rest-secs">${this.routineConfig.restSeconds} seg</span>
              </div>
              <p class="timing-hint">Pausa obligatoria para recuperación neuromuscular (fuerza e hipertrofia).</p>
              <div class="preset-pill-group" id="rest-pill-group">
                <button type="button" class="preset-pill ${this.routineConfig.restSeconds === 30 ? 'active' : ''}" data-secs="30">30s (Cardio)</button>
                <button type="button" class="preset-pill ${this.routineConfig.restSeconds === 60 ? 'active' : ''}" data-secs="60">60s</button>
                <button type="button" class="preset-pill ${this.routineConfig.restSeconds === 90 ? 'active' : ''}" data-secs="90">90s (Óptimo)</button>
                <button type="button" class="preset-pill ${this.routineConfig.restSeconds === 120 ? 'active' : ''}" data-secs="120">2 min</button>
                <button type="button" class="preset-pill ${this.routineConfig.restSeconds === 180 ? 'active' : ''}" data-secs="180">3 min (Fuerza)</button>
              </div>
            </div>

            <!-- 4. Cantidad de Vueltas / Series -->
            <div class="timing-selector-block">
              <div class="timing-label-row">
                <span class="timing-title">🔄 Cantidad de Vueltas / Series</span>
                <span class="timing-value" id="disp-rounds-count">${this.routineConfig.rounds} vueltas</span>
              </div>
              <p class="timing-hint">Número de series efectivas por ejercicio o vueltas al circuito.</p>
              <div class="preset-pill-group" id="rounds-pill-group">
                <button type="button" class="preset-pill ${this.routineConfig.rounds === 2 ? 'active' : ''}" data-rounds="2">2 Vueltas</button>
                <button type="button" class="preset-pill ${this.routineConfig.rounds === 3 ? 'active' : ''}" data-rounds="3">3 Vueltas</button>
                <button type="button" class="preset-pill ${this.routineConfig.rounds === 4 ? 'active' : ''}" data-rounds="4">4 Vueltas</button>
                <button type="button" class="preset-pill ${this.routineConfig.rounds === 5 ? 'active' : ''}" data-rounds="5">5 Vueltas</button>
              </div>
            </div>

            <!-- 5. Duración de la Serie de Trabajo -->
            <div class="timing-selector-block">
              <div class="timing-label-row">
                <span class="timing-title">⚡ Modo de Ejecución por Serie</span>
                <span class="timing-value" id="disp-work-mode">${this.routineConfig.workSeconds === 0 ? 'Libre (Manual)' : this.routineConfig.workSeconds + 's'}</span>
              </div>
              <div class="preset-pill-group" id="work-pill-group">
                <button type="button" class="preset-pill ${this.routineConfig.workSeconds === 0 ? 'active' : ''}" data-secs="0">Libre (Terminar al completar reps)</button>
                <button type="button" class="preset-pill ${this.routineConfig.workSeconds === 30 ? 'active' : ''}" data-secs="30">30s tiempo fijo</button>
                <button type="button" class="preset-pill ${this.routineConfig.workSeconds === 45 ? 'active' : ''}" data-secs="45">45s tiempo fijo</button>
                <button type="button" class="preset-pill ${this.routineConfig.workSeconds === 60 ? 'active' : ''}" data-secs="60">60s tiempo fijo</button>
              </div>
            </div>
          </div>
        </div>

        <!-- COLUMNA DERECHA: LISTA DE EJERCICIOS DE LA SESIÓN -->
        <div class="card glass-card">
          <div class="card-header">
            <div class="card-icon-box accent-emerald">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6.5 6.5 11 11M21 21l-1-1M3 3l1 1M18 22l4-4M2 6l4-4M3 10l7-7M14 21l7-7"/></svg>
            </div>
            <div>
              <h2 class="card-title">Ejercicios de la Rutina</h2>
              <p class="card-description" id="exercise-count-text">${this.routineConfig.exercises.length} movimientos seleccionados</p>
            </div>
          </div>

          <div class="setup-exercise-list" id="setup-exercise-list">
            ${this.renderSetupExerciseItems()}
          </div>

          <div class="setup-actions-bottom">
            <button type="button" id="btn-add-exercise-modal" class="btn btn-secondary full-width">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>+ Añadir Más Ejercicios del Catálogo</span>
            </button>

            <button type="button" id="btn-start-phased-workout" class="btn btn-primary btn-glow btn-lg full-width">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span>⚡ Largar Entrenamiento con Cronómetro</span>
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL NUEVA RUTINA -->
      <div class="modal-backdrop" id="modal-create-routine" style="display: none;">
        <div class="modal-card glass-modal" style="max-width: 520px;">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">✨ Guardar como Nueva Rutina</h3>
              <p class="modal-subtitle">Crea una rutina independiente con otros valores sin alterar la actual</p>
            </div>
            <button class="modal-close-btn" id="btn-close-new-routine-modal">&times;</button>
          </div>

          <form id="form-create-routine" class="form-stack">
            <div class="form-group full-width">
              <label for="new-routine-name">Nombre de la Rutina *</label>
              <input type="text" id="new-routine-name" class="input-field" placeholder="ej. Cardio & Ritmos 30 min, Piernas & Glúteos..." required>
            </div>

            <div class="form-group full-width">
              <label for="new-routine-category">Categoría Principal</label>
              <select id="new-routine-category" class="select-field">
                ${CATEGORIES.map((c) => `<option value="${c}" ${c === this.routineConfig.category ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
            </div>

            <div class="form-group full-width">
              <label>Configuración Inicial</label>
              <div style="display: flex; flex-direction: column; gap: 0.5rem; background: rgba(0,0,0,0.3); padding: 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
                <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.88rem; cursor: pointer;">
                  <input type="radio" name="routine-init-mode" value="clone" checked>
                  <span><strong>Copiar configuración actual</strong> (conservar tiempos y ${this.routineConfig.exercises.length} ejercicios)</span>
                </label>
                <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.88rem; cursor: pointer;">
                  <input type="radio" name="routine-init-mode" value="empty">
                  <span><strong>Rutina en blanco</strong> (lista vacía para armar desde cero)</span>
                </label>
              </div>
            </div>

            <div class="modal-actions-row" style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1rem;">
              <button type="button" class="btn btn-secondary" id="btn-cancel-create-routine">Cancelar</button>
              <button type="submit" class="btn btn-primary btn-glow">💾 Guardar Nueva Rutina</button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL SELECTOR DE EJERCICIOS -->
      <div class="modal-backdrop" id="modal-select-exercises" style="display: none;">
        <div class="modal-card glass-modal">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">Catálogo de Ejercicios & Ritmos</h3>
              <p class="modal-subtitle">Añade ejercicios a tu rutina coordinada</p>
            </div>
            <button class="modal-close-btn" id="btn-close-cat-modal">&times;</button>
          </div>

          <div class="modal-search-row">
            <input type="text" id="cat-search-box" class="input-field" placeholder="Buscar por nombre, ritmo o músculo (ej. salsa, sentadilla, bíceps...)">
          </div>

          <div class="category-pills-scroll" id="cat-filter-pills">
            ${CATEGORIES.map((cat, i) => `
              <button class="filter-pill ${i === 0 ? 'active' : ''}" data-cat="${cat}">${cat}</button>
            `).join('')}
          </div>

          <div class="modal-exercise-list" id="cat-list-items"></div>
        </div>
      </div>
    `;

    this.attachSetupEvents(container, profile);
  },

  renderSetupExerciseItems() {
    if (this.routineConfig.exercises.length === 0) {
      return `
        <div class="empty-exercise-box">
          <p>Aún no has agregado ejercicios a esta rutina. Haz clic en el botón de abajo para seleccionar del catálogo de ejercicios o ritmos.</p>
        </div>
      `;
    }

    return this.routineConfig.exercises.map((ex, idx) => `
      <div class="setup-exercise-item" data-idx="${idx}">
        <span class="ex-order-number">${idx + 1}</span>
        <div class="ex-item-info">
          <h4 class="ex-item-name">${ex.name}</h4>
          <span class="ex-item-cat">${ex.category} · ${ex.primaryMuscle || 'General'} · MET ${ex.metValue || 5.0}</span>
        </div>

        <!-- REPS & PESO OBJETIVO -->
        <div class="ex-item-targets">
          <div class="target-control-pill" title="Repeticiones objetivo">
            <span class="target-lbl">Reps</span>
            <input type="number" class="input-target-reps" data-idx="${idx}" min="1" max="500" value="${ex.targetReps || 10}">
          </div>
          <div class="target-control-pill" title="Peso sugerido en kg">
            <span class="target-lbl">Kg</span>
            <input type="number" class="input-target-weight" data-idx="${idx}" min="0" step="2.5" value="${ex.targetWeight || 0}">
          </div>
        </div>

        <!-- ORDEN Y ELIMINACIÓN -->
        <div class="ex-item-actions">
          <button type="button" class="btn-order-ex" data-dir="up" data-idx="${idx}" title="Subir orden" ${idx === 0 ? 'disabled' : ''}>▲</button>
          <button type="button" class="btn-order-ex" data-dir="down" data-idx="${idx}" title="Bajar orden" ${idx === this.routineConfig.exercises.length - 1 ? 'disabled' : ''}>▼</button>
          <button type="button" class="btn-del-setup-ex" data-idx="${idx}" title="Eliminar de la rutina">&times;</button>
        </div>
      </div>
    `).join('');
  },

  // Aplica la rutina seleccionada en todos los controles del DOM
  applyRoutineToUI(container, routine) {
    this.routineConfig = {
      id: routine.id,
      title: routine.name || routine.title || 'Mi Rutina',
      name: routine.name || routine.title || 'Mi Rutina',
      category: routine.category || 'Fuerza',
      prepSeconds: parseInt(routine.prepSeconds, 10) ?? 10,
      workSeconds: parseInt(routine.workSeconds, 10) ?? 0,
      restSeconds: parseInt(routine.restSeconds, 10) ?? 90,
      rounds: parseInt(routine.rounds, 10) ?? 4,
      isPreset: !!routine.isPreset,
      exercises: (routine.exercises || []).map((e) => ({
        ...e,
        targetReps: parseInt(e.targetReps, 10) || 10,
        targetWeight: parseFloat(e.targetWeight) || 0,
        sets: []
      }))
    };

    // Actualizar nombre y categoría
    const titleInput = container.querySelector('#setup-title');
    if (titleInput) titleInput.value = this.routineConfig.title;

    const catSelect = container.querySelector('#setup-category');
    if (catSelect) catSelect.value = this.routineConfig.category;

    // Actualizar pills de tiempo de preparación
    container.querySelectorAll('#prep-pill-group .preset-pill').forEach((btn) => {
      const s = parseInt(btn.getAttribute('data-secs'), 10);
      btn.classList.toggle('active', s === this.routineConfig.prepSeconds);
    });
    const prepDisp = container.querySelector('#disp-prep-secs');
    if (prepDisp) prepDisp.textContent = `${this.routineConfig.prepSeconds} seg`;

    // Actualizar pills de descanso
    container.querySelectorAll('#rest-pill-group .preset-pill').forEach((btn) => {
      const s = parseInt(btn.getAttribute('data-secs'), 10);
      btn.classList.toggle('active', s === this.routineConfig.restSeconds);
    });
    const restDisp = container.querySelector('#disp-rest-secs');
    if (restDisp) restDisp.textContent = `${this.routineConfig.restSeconds} seg`;

    // Actualizar pills de vueltas
    container.querySelectorAll('#rounds-pill-group .preset-pill').forEach((btn) => {
      const r = parseInt(btn.getAttribute('data-rounds'), 10);
      btn.classList.toggle('active', r === this.routineConfig.rounds);
    });
    const roundsDisp = container.querySelector('#disp-rounds-count');
    if (roundsDisp) roundsDisp.textContent = `${this.routineConfig.rounds} vueltas`;

    // Actualizar pills de trabajo
    container.querySelectorAll('#work-pill-group .preset-pill').forEach((btn) => {
      const s = parseInt(btn.getAttribute('data-secs'), 10);
      btn.classList.toggle('active', s === this.routineConfig.workSeconds);
    });
    const workDisp = container.querySelector('#disp-work-mode');
    if (workDisp) workDisp.textContent = this.routineConfig.workSeconds === 0 ? 'Libre (Manual)' : `${this.routineConfig.workSeconds}s`;

    // Actualizar badge de tipo
    const badgeType = container.querySelector('#routine-badge-type');
    if (badgeType) {
      badgeType.className = `routine-type-badge ${this.routineConfig.isPreset ? 'badge-preset' : 'badge-custom'}`;
      badgeType.textContent = this.routineConfig.isPreset ? '💎 Plantilla Predefinida' : '⭐ Mi Rutina Guardada';
    }

    // Actualizar lista de ejercicios
    const exList = container.querySelector('#setup-exercise-list');
    if (exList) exList.innerHTML = this.renderSetupExerciseItems();

    const exCount = container.querySelector('#exercise-count-text');
    if (exCount) exCount.textContent = `${this.routineConfig.exercises.length} movimientos seleccionados`;
  },

  attachSetupEvents(container, profile) {
    // 0. CAMBIAR RUTINA EN EL SELECTOR
    const routineSelect = container.querySelector('#select-saved-routine');
    routineSelect?.addEventListener('change', async (e) => {
      const routineId = e.target.value;
      const routine = await routineService.getRoutineById(routineId);
      if (routine) {
        await routineService.setActiveRoutineId(routineId);
        this.applyRoutineToUI(container, routine);
        Toast.info(`Rutina cargada: ${routine.name || routine.title}`);
      }
    });

    // 0.1 GUARDAR CAMBIOS EN LA RUTINA ACTUAL
    container.querySelector('#btn-save-current-routine')?.addEventListener('click', async () => {
      const title = container.querySelector('#setup-title')?.value.trim() || 'Mi Rutina';
      const category = container.querySelector('#setup-category')?.value || this.routineConfig.category;
      this.routineConfig.title = title;
      this.routineConfig.name = title;
      this.routineConfig.category = category;

      // Recolectar valores actuales de reps y peso de los inputs
      container.querySelectorAll('.setup-exercise-item').forEach((item) => {
        const idx = parseInt(item.getAttribute('data-idx'), 10);
        const repsInput = item.querySelector('.input-target-reps');
        const weightInput = item.querySelector('.input-target-weight');
        if (this.routineConfig.exercises[idx]) {
          if (repsInput) this.routineConfig.exercises[idx].targetReps = parseInt(repsInput.value, 10) || 10;
          if (weightInput) this.routineConfig.exercises[idx].targetWeight = parseFloat(weightInput.value) || 0;
        }
      });

      const { routine: saved, wasConvertedFromPreset } = await routineService.saveRoutine(this.routineConfig);
      this.routineConfig.id = saved.id;
      this.routineConfig.isPreset = false;

      // Actualizar dropdown con las opciones recargadas
      const allRoutines = await routineService.getAllRoutines();
      if (routineSelect) {
        routineSelect.innerHTML = this.renderRoutineSelectOptions(allRoutines, saved.id);
      }

      // Actualizar badge
      const badgeType = container.querySelector('#routine-badge-type');
      if (badgeType) {
        badgeType.className = 'routine-type-badge badge-custom';
        badgeType.textContent = '⭐ Mi Rutina Guardada';
      }

      if (wasConvertedFromPreset) {
        Toast.success(`¡Plantilla guardada como tu rutina personalizada "${saved.name}"!`);
      } else {
        Toast.success(`¡Rutina "${saved.name}" guardada con éxito!`);
      }
    });

    // 0.2 CREAR NUEVA RUTINA (MODAL)
    const newRoutineModal = container.querySelector('#modal-create-routine');
    const newRoutineForm = container.querySelector('#form-create-routine');
    const openNewRoutineBtn = container.querySelector('#btn-create-new-routine');
    const closeNewRoutineBtn = container.querySelector('#btn-close-new-routine-modal');
    const cancelNewRoutineBtn = container.querySelector('#btn-cancel-create-routine');

    const openNewModal = () => {
      if (newRoutineModal.parentElement !== document.body) {
        document.body.appendChild(newRoutineModal);
      }
      const nameInput = newRoutineModal.querySelector('#new-routine-name');
      if (nameInput) {
        nameInput.value = `${this.routineConfig.title} (Copia)`;
      }
      const catSelect = newRoutineModal.querySelector('#new-routine-category');
      if (catSelect) {
        catSelect.value = this.routineConfig.category;
      }
      newRoutineModal.style.display = 'flex';
      nameInput?.focus();
    };

    const closeNewModal = () => {
      newRoutineModal.style.display = 'none';
    };

    openNewRoutineBtn?.addEventListener('click', openNewModal);
    closeNewRoutineBtn?.addEventListener('click', closeNewModal);
    cancelNewRoutineBtn?.addEventListener('click', closeNewModal);
    newRoutineModal?.addEventListener('click', (e) => {
      if (e.target === newRoutineModal) closeNewModal();
    });

    newRoutineForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = newRoutineModal.querySelector('#new-routine-name')?.value.trim() || 'Nueva Rutina';
      const category = newRoutineModal.querySelector('#new-routine-category')?.value || 'Fuerza';
      const mode = newRoutineModal.querySelector('input[name="routine-init-mode"]:checked')?.value || 'clone';

      const exercises = mode === 'clone'
        ? this.routineConfig.exercises.map((ex) => ({ ...ex }))
        : [];

      const newRoutine = await routineService.createRoutine({
        name,
        title: name,
        category,
        prepSeconds: this.routineConfig.prepSeconds,
        workSeconds: this.routineConfig.workSeconds,
        restSeconds: this.routineConfig.restSeconds,
        rounds: this.routineConfig.rounds,
        exercises
      });

      closeNewModal();

      // Recargar dropdown y seleccionar la nueva rutina
      const allRoutines = await routineService.getAllRoutines();
      if (routineSelect) {
        routineSelect.innerHTML = this.renderRoutineSelectOptions(allRoutines, newRoutine.id);
      }

      this.applyRoutineToUI(container, newRoutine);
      Toast.success(`¡Rutina "${newRoutine.name}" creada con éxito! Ahora puedes editar sus parámetros y ejercicios sin alterar las demás.`);
    });

    // 0.3 ELIMINAR RUTINA SELECCIONADA
    container.querySelector('#btn-delete-current-routine')?.addEventListener('click', async () => {
      const routineName = this.routineConfig.title || this.routineConfig.name;
      const isPreset = this.routineConfig.isPreset;
      const confirmMsg = isPreset
        ? `¿Deseas ocultar la plantilla predefinida "${routineName}"?`
        : `¿Estás seguro de que deseas eliminar definitivamente tu rutina "${routineName}"?`;

      if (confirm(confirmMsg)) {
        await routineService.deleteRoutine(this.routineConfig.id);
        const remaining = await routineService.getAllRoutines();
        const nextRoutine = remaining[0] || null;

        if (nextRoutine) {
          await routineService.setActiveRoutineId(nextRoutine.id);
          if (routineSelect) {
            routineSelect.innerHTML = this.renderRoutineSelectOptions(remaining, nextRoutine.id);
          }
          this.applyRoutineToUI(container, nextRoutine);
        }

        Toast.info(`Rutina "${routineName}" eliminada.`);
      }
    });

    // 1. Selector de tiempo de preparación
    container.querySelectorAll('#prep-pill-group .preset-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('#prep-pill-group .preset-pill').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const secs = parseInt(btn.getAttribute('data-secs'), 10);
        this.routineConfig.prepSeconds = secs;
        container.querySelector('#disp-prep-secs').textContent = `${secs} seg`;
      });
    });

    // 2. Selector de tiempo de descanso
    container.querySelectorAll('#rest-pill-group .preset-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('#rest-pill-group .preset-pill').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const secs = parseInt(btn.getAttribute('data-secs'), 10);
        this.routineConfig.restSeconds = secs;
        container.querySelector('#disp-rest-secs').textContent = `${secs} seg`;
      });
    });

    // 3. Selector de vueltas/rondas
    container.querySelectorAll('#rounds-pill-group .preset-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('#rounds-pill-group .preset-pill').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const rounds = parseInt(btn.getAttribute('data-rounds'), 10);
        this.routineConfig.rounds = rounds;
        container.querySelector('#disp-rounds-count').textContent = `${rounds} vueltas`;
      });
    });

    // 4. Selector de modo de trabajo
    container.querySelectorAll('#work-pill-group .preset-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('#work-pill-group .preset-pill').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const secs = parseInt(btn.getAttribute('data-secs'), 10);
        this.routineConfig.workSeconds = secs;
        container.querySelector('#disp-work-mode').textContent = secs === 0 ? 'Libre (Manual)' : `${secs}s`;
      });
    });

    // 5. Cambio en inputs de Reps y Peso dentro de la lista de ejercicios
    container.addEventListener('input', (e) => {
      if (e.target.classList.contains('input-target-reps')) {
        const idx = parseInt(e.target.getAttribute('data-idx'), 10);
        if (this.routineConfig.exercises[idx]) {
          this.routineConfig.exercises[idx].targetReps = parseInt(e.target.value, 10) || 1;
        }
      } else if (e.target.classList.contains('input-target-weight')) {
        const idx = parseInt(e.target.getAttribute('data-idx'), 10);
        if (this.routineConfig.exercises[idx]) {
          this.routineConfig.exercises[idx].targetWeight = parseFloat(e.target.value) || 0;
        }
      }
    });

    // 5.1 Reordenar (▲ / ▼) y eliminar ejercicio de la rutina
    container.addEventListener('click', (e) => {
      // Reordenar ejercicio
      const orderBtn = e.target.closest('.btn-order-ex');
      if (orderBtn) {
        const idx = parseInt(orderBtn.getAttribute('data-idx'), 10);
        const dir = orderBtn.getAttribute('data-dir');
        if (dir === 'up' && idx > 0) {
          const temp = this.routineConfig.exercises[idx];
          this.routineConfig.exercises[idx] = this.routineConfig.exercises[idx - 1];
          this.routineConfig.exercises[idx - 1] = temp;
          container.querySelector('#setup-exercise-list').innerHTML = this.renderSetupExerciseItems();
        } else if (dir === 'down' && idx < this.routineConfig.exercises.length - 1) {
          const temp = this.routineConfig.exercises[idx];
          this.routineConfig.exercises[idx] = this.routineConfig.exercises[idx + 1];
          this.routineConfig.exercises[idx + 1] = temp;
          container.querySelector('#setup-exercise-list').innerHTML = this.renderSetupExerciseItems();
        }
        return;
      }

      // Eliminar ejercicio
      const delBtn = e.target.closest('.btn-del-setup-ex');
      if (delBtn) {
        const idx = parseInt(delBtn.getAttribute('data-idx'), 10);
        this.routineConfig.exercises.splice(idx, 1);
        container.querySelector('#setup-exercise-list').innerHTML = this.renderSetupExerciseItems();
        const countElem = container.querySelector('#exercise-count-text');
        if (countElem) countElem.textContent = `${this.routineConfig.exercises.length} movimientos seleccionados`;
      }
    });

    // 6. Modal de Catálogo
    const modal = container.querySelector('#modal-select-exercises');
    const openModalBtn = container.querySelector('#btn-add-exercise-modal');
    const closeModalBtn = container.querySelector('#btn-close-cat-modal');
    const searchBox = container.querySelector('#cat-search-box');
    const pills = container.querySelectorAll('#cat-filter-pills .filter-pill');
    const listItems = container.querySelector('#cat-list-items');
    let selectedCat = 'Todos';

    const renderCatalogModal = () => {
      const q = (searchBox.value || '').toLowerCase().trim();
      const filtered = EXERCISE_CATALOG.filter((ex) => {
        const matchCat = selectedCat === 'Todos' || ex.category === selectedCat;
        const matchQ = !q || ex.name.toLowerCase().includes(q) || (ex.primaryMuscle && ex.primaryMuscle.toLowerCase().includes(q));
        return matchCat && matchQ;
      });

      listItems.innerHTML = filtered.map((ex) => `
        <div class="modal-exercise-row">
          <div class="row-info">
            <h4 class="row-name">${ex.name}</h4>
            <span class="tag-cat">${ex.category}</span>
            <span class="tag-muscle">${ex.primaryMuscle || ''}</span>
          </div>
          <button type="button" class="btn btn-primary btn-sm btn-pick-exercise" data-id="${ex.id}">+ Añadir</button>
        </div>
      `).join('');
    };

    openModalBtn.addEventListener('click', () => {
      if (modal.parentElement !== document.body) {
        document.body.appendChild(modal);
      }
      modal.style.display = 'flex';
      renderCatalogModal();
      searchBox.focus();
    });

    closeModalBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });

    searchBox.addEventListener('input', renderCatalogModal);

    pills.forEach((p) => {
      p.addEventListener('click', () => {
        pills.forEach((pill) => pill.classList.remove('active'));
        p.classList.add('active');
        selectedCat = p.getAttribute('data-cat');
        renderCatalogModal();
      });
    });

    listItems.addEventListener('click', (e) => {
      const pickBtn = e.target.closest('.btn-pick-exercise');
      if (pickBtn) {
        const id = pickBtn.getAttribute('data-id');
        const ex = EXERCISE_CATALOG.find((x) => x.id === id);
        if (ex) {
          const defaultReps = ex.category === 'Baile & Ritmos' ? 20 : (ex.category === 'Cardio' ? 30 : 10);
          const defaultWeight = (ex.category === 'Baile & Ritmos' || ex.category === 'Movilidad') ? 0 : (ex.type === 'strength' ? 20 : 0);

          this.routineConfig.exercises.push({
            ...ex,
            targetReps: defaultReps,
            targetWeight: defaultWeight,
            sets: []
          });
          container.querySelector('#setup-exercise-list').innerHTML = this.renderSetupExerciseItems();
          const countElem = container.querySelector('#exercise-count-text');
          if (countElem) countElem.textContent = `${this.routineConfig.exercises.length} movimientos seleccionados`;
          modal.style.display = 'none';
          Toast.success(`Añadido: ${ex.name}`);
        }
      }
    });

    // 7. LARGAR ENTRENAMIENTO
    container.querySelector('#btn-start-phased-workout').addEventListener('click', () => {
      if (this.routineConfig.exercises.length === 0) {
        Toast.warning('Agrega al menos un ejercicio a la rutina antes de largar.');
        return;
      }

      const title = container.querySelector('#setup-title').value.trim() || 'Sesión FitPulse';
      const category = container.querySelector('#setup-category')?.value || this.routineConfig.category;
      this.routineConfig.title = title;
      this.routineConfig.category = category;

      // Recolectar reps y pesos actuales
      container.querySelectorAll('.setup-exercise-item').forEach((item) => {
        const idx = parseInt(item.getAttribute('data-idx'), 10);
        const repsInput = item.querySelector('.input-target-reps');
        const weightInput = item.querySelector('.input-target-weight');
        if (this.routineConfig.exercises[idx]) {
          if (repsInput) this.routineConfig.exercises[idx].targetReps = parseInt(repsInput.value, 10) || 10;
          if (weightInput) this.routineConfig.exercises[idx].targetWeight = parseFloat(weightInput.value) || 0;
        }
      });

      // Iniciar sesión en workoutService con la estructura de ejercicios
      const workout = workoutService.startWorkout(title, this.routineConfig.category);
      workout.config = { ...this.routineConfig };
      workout.exercises = this.routineConfig.exercises.map((ex) => ({
        id: generateUUID(),
        workout_id: workout.id,
        exercise_id: ex.id,
        exercise_name: ex.name,
        category: ex.category || category,
        type: ex.type || 'strength',
        metValue: ex.metValue || 6.0,
        tips: ex.tips || '',
        target_reps: parseInt(ex.targetReps, 10) || 10,
        target_weight: parseFloat(ex.targetWeight) || 0,
        sets: []
      }));
      workoutService.saveActiveWorkoutToStorage();

      // Iniciar controlador en fase de Preparación
      this.startPhasedRoutine(container, workout, profile);
    });
  },

  // ============================================================================
  // PANTALLA 2: MODO DE ENTRENAMIENTO ACTIVO (CRONÓMETRO GIGANTE & FASES)
  // ============================================================================
  startPhasedRoutine(container, workout, profile) {
    this.activeController.currentExerciseIdx = 0;
    this.activeController.currentRound = 1;
    this.activeController.isPaused = false;

    // Si hay tiempo de preparación seteado (> 0), largar en PREPARACIÓN
    if (this.routineConfig.prepSeconds > 0) {
      this.enterPhase(container, workout, profile, 'prep', this.routineConfig.prepSeconds);
    } else {
      this.enterPhase(container, workout, profile, 'work', this.routineConfig.workSeconds);
    }
  },

  enterPhase(container, workout, profile, phase, durationSeconds) {
    if (this.activeController.phaseTimer) {
      clearInterval(this.activeController.phaseTimer);
      this.activeController.phaseTimer = null;
    }

    this.activeController.phase = phase;
    this.activeController.phaseSeconds = durationSeconds;
    this.activeController.phaseTotalSeconds = durationSeconds;
    this.activeController.isPaused = false;

    if (phase === 'prep') {
      Sound.playCountdown();
    } else if (phase === 'work') {
      Sound.playGo();
    } else if (phase === 'rest') {
      Sound.playRest();
    }

    this.renderActivePhaseScreen(container, workout, profile);

    // Iniciar temporizador de la fase
    this.activeController.phaseTimer = setInterval(() => {
      if (this.activeController.isPaused) return;

      if (phase === 'work' && this.routineConfig.workSeconds === 0) {
        // Modo libre en trabajo: incrementa hacia arriba
        this.activeController.phaseSeconds++;
        this.updateGiantDigits(container, this.activeController.phaseSeconds, false);
      } else {
        // Modos regresivos (Prep, Rest, o Work fijo)
        this.activeController.phaseSeconds--;
        this.updateGiantDigits(container, this.activeController.phaseSeconds, true);

        // Sonido en 3, 2, 1
        if (this.activeController.phaseSeconds > 0 && this.activeController.phaseSeconds <= 3) {
          Sound.playCountdown();
        }

        if (this.activeController.phaseSeconds <= 0) {
          this.handlePhaseEnd(container, workout, profile);
        }
      }
    }, 1000);
  },

  handlePhaseEnd(container, workout, profile) {
    if (this.activeController.phaseTimer) {
      clearInterval(this.activeController.phaseTimer);
      this.activeController.phaseTimer = null;
    }

    const currentEx = workout.exercises[this.activeController.currentExerciseIdx];

    if (this.activeController.phase === 'prep') {
      // De preparación pasa inmediatamente a TRABAJO
      this.enterPhase(container, workout, profile, 'work', this.routineConfig.workSeconds);
    } else if (this.activeController.phase === 'work') {
      // Al terminar trabajo, registrar la serie completada
      this.recordActiveSet(container, workout, profile);

      // Verificar si completó todas las vueltas y ejercicios
      const isLastRound = this.activeController.currentRound >= this.routineConfig.rounds;
      const isLastExercise = this.activeController.currentExerciseIdx >= workout.exercises.length - 1;

      if (isLastRound && isLastExercise) {
        // Rutina finalizada con éxito
        this.completeWorkoutRoutine(container, workout, profile);
      } else {
        // Pasar a descanso
        this.enterPhase(container, workout, profile, 'rest', this.routineConfig.restSeconds);
      }
    } else if (this.activeController.phase === 'rest') {
      // Al terminar descanso, avanzar a la siguiente vuelta o ejercicio
      this.advanceToNextTurn(container, workout, profile);
    }
  },

  recordActiveSet(container, workout, profile) {
    const currentEx = workout.exercises[this.activeController.currentExerciseIdx];
    if (!currentEx) return;

    // Obtener valores de los inputs en pantalla gigante
    const weightInput = container.querySelector('#active-input-weight');
    const repsInput = container.querySelector('#active-input-reps');
    const rpeInput = container.querySelector('#active-input-rpe');

    const weight = weightInput ? parseFloat(weightInput.value) || 0 : 60;
    const reps = repsInput ? parseInt(repsInput.value, 10) || 10 : 10;
    const rpe = rpeInput ? parseFloat(rpeInput.value) || 8 : 8;
    const estimated1RM = Biometrics.calculate1RM(weight, reps);

    const newSet = {
      set_number: currentEx.sets.length + 1,
      round: this.activeController.currentRound,
      weight_kg: weight,
      reps: reps,
      rpe: rpe,
      estimated_1rm: estimated1RM,
      duration_seconds: this.activeController.phaseTotalSeconds || 45,
      completed: true
    };

    currentEx.sets.push(newSet);
    workoutService.saveActiveWorkoutToStorage();
  },

  advanceToNextTurn(container, workout, profile) {
    // Si quedan más ejercicios en esta misma vuelta (modo circuito)
    if (this.activeController.currentExerciseIdx < workout.exercises.length - 1) {
      this.activeController.currentExerciseIdx++;
    } else {
      // Terminó la vuelta completa para todos los ejercicios -> pasar a la siguiente vuelta
      this.activeController.currentExerciseIdx = 0;
      this.activeController.currentRound++;
    }

    // Largar trabajo para la nueva serie
    this.enterPhase(container, workout, profile, 'work', this.routineConfig.workSeconds);
  },

  renderActivePhaseScreen(container, workout, profile) {
    if (!workout || !workout.exercises || workout.exercises.length === 0) {
      this.renderRoutineSetupScreen(container, profile);
      return;
    }

    const currentEx = workout.exercises[this.activeController.currentExerciseIdx] || workout.exercises[0];
    const phase = this.activeController.phase;
    const currentRound = this.activeController.currentRound;
    const totalRounds = this.routineConfig.rounds;

    let phaseThemeClass = 'phase-prep';
    let phaseBadgeText = '🟡 PREPARACIÓN';
    let phaseInstruction = 'Prepárate para posicionarte e iniciar el ejercicio';

    if (phase === 'work') {
      phaseThemeClass = 'phase-work';
      phaseBadgeText = '🟢 TRABAJO ACTIVO';
      phaseInstruction = 'Ejecuta el movimiento con técnica perfecta y máxima intención';
    } else if (phase === 'rest') {
      phaseThemeClass = 'phase-rest';
      phaseBadgeText = '🔵 DESCANSO';
      phaseInstruction = 'Respira profundo, baja pulsaciones y recupérate para la próxima serie';
    }

    const elapsedWorkoutMins = Math.floor((workout.duration_seconds || 0) / 60);

    container.innerHTML = `
      <!-- PANTALLA GIGANTE DE ENTRENAMIENTO -->
      <div class="giant-workout-screen ${phaseThemeClass}">
        <!-- BARRA SUPERIOR DE ESTADO -->
        <div class="giant-top-bar">
          <div class="giant-session-meta">
            <span class="session-category-badge">${workout.category}</span>
            <span class="session-name-title">${workout.title}</span>
            <span class="session-elapsed-time">⏱️ Total: ${elapsedWorkoutMins}m</span>
          </div>

          <div class="giant-top-controls">
            <button type="button" id="btn-giant-pause" class="btn btn-secondary btn-sm">
              ${this.activeController.isPaused ? '▶️ Reanudar' : '⏸️ Pausar'}
            </button>
            <button type="button" id="btn-giant-finish-early" class="btn btn-secondary btn-sm" title="Finalizar y guardar lo completado hasta ahora">
              🏁 Guardar y Finalizar
            </button>
            <button type="button" id="btn-giant-cancel-workout" class="btn btn-outline-danger btn-sm" title="Cancelar y descartar esta rutina sin registrarla en actividades">
              🗑️ Descartar Rutina
            </button>
          </div>
        </div>

        <!-- INDICADOR GIGANTE DE FASE -->
        <div class="phase-hero-container">
          <div class="phase-status-pill">${phaseBadgeText}</div>
          <div class="phase-round-counter">VUELTA ${currentRound} DE ${totalRounds} · SERIE #${currentEx.sets.length + 1}</div>
          
          <h1 class="giant-exercise-name">${currentEx.exercise_name}</h1>
          <p class="phase-instruction-text">${phaseInstruction}</p>

          <!-- DÍGITOS GIGANTES DEL CRONÓMETRO -->
          <div class="giant-timer-display" id="giant-timer-digits">
            ${this.formatTimeDigits(this.activeController.phaseSeconds)}
          </div>
        </div>

        <!-- CONTENIDO ESPECÍFICO SEGÚN LA FASE -->
        <div class="phase-interactive-content">
          ${phase === 'work' ? `
            <!-- FORMULARIO RÁPIDO DE PESO Y REPS PARA LA SERIE -->
            <div class="work-inputs-card card glass-card">
              <div class="work-inputs-row">
                <div class="work-input-col">
                  <label for="active-input-weight">Peso Levantado (kg)</label>
                  <div class="stepper-input-box">
                    <button type="button" class="btn-step" id="btn-weight-minus">-2.5</button>
                    <input type="number" id="active-input-weight" class="input-field giant-input" value="${this.getLastWeight(currentEx)}" step="2.5">
                    <button type="button" class="btn-step" id="btn-weight-plus">+2.5</button>
                  </div>
                </div>

                <div class="work-input-col">
                  <label for="active-input-reps">Repeticiones Logradas</label>
                  <div class="stepper-input-box">
                    <button type="button" class="btn-step" id="btn-reps-minus">-1</button>
                    <input type="number" id="active-input-reps" class="input-field giant-input" value="${this.getLastReps(currentEx)}" step="1" min="1">
                    <button type="button" class="btn-step" id="btn-reps-plus">+1</button>
                  </div>
                </div>

                <div class="work-input-col">
                  <label for="active-input-rpe">RPE (Esfuerzo 1-10)</label>
                  <select id="active-input-rpe" class="select-field giant-select">
                    <option value="7">7 - Moderado (Quedaban 3 reps)</option>
                    <option value="8" selected>8 - Exigente (Quedaban 2 reps)</option>
                    <option value="9">9 - Muy Pesado (Quedaba 1 rep)</option>
                    <option value="10">10 - Máximo Esfuerzo (Fallo)</option>
                  </select>
                </div>
              </div>

              <!-- BOTÓN GIGANTE PARA COMPLETAR SERIE -->
              <div class="work-finish-btn-row">
                <button type="button" id="btn-complete-set" class="btn btn-success btn-glow btn-hero-lg full-width">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>COMPLETAR SERIE & INICIAR DESCANSO</span>
                </button>
              </div>
            </div>
          ` : phase === 'rest' ? `
            <!-- CONTROLES DE DESCANSO -->
            <div class="rest-actions-card card glass-card">
              <div class="rest-next-preview">
                <span class="preview-label">Siguiente en la rutina:</span>
                <span class="preview-name">${this.getNextExerciseName(workout)}</span>
              </div>
              <div class="rest-adjust-buttons">
                <button type="button" class="btn btn-secondary" id="btn-rest-minus15">-15 seg</button>
                <button type="button" class="btn btn-secondary" id="btn-rest-plus15">+15 seg</button>
                <button type="button" class="btn btn-primary btn-glow" id="btn-skip-rest">
                  ⏭️ Saltar Descanso & Largar Serie
                </button>
              </div>
            </div>
          ` : `
            <!-- PREPARACIÓN -->
            <div class="prep-actions-card">
              <button type="button" class="btn btn-primary btn-glow btn-lg" id="btn-skip-prep">
                ⚡ ¡Listo! Comenzar Serie Ya
              </button>
            </div>
          `}
        </div>
      </div>
    `;

    this.attachPhaseEvents(container, workout, profile);
  },

  attachPhaseEvents(container, workout, profile) {
    // 1. Pausar / Reanudar
    const pauseBtn = container.querySelector('#btn-giant-pause');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this.activeController.isPaused = !this.activeController.isPaused;
        pauseBtn.textContent = this.activeController.isPaused ? '▶️ Reanudar' : '⏸️ Pausar';
        Toast.info(this.activeController.isPaused ? 'Cronómetro en pausa' : 'Reanudando entrenamiento');
      });
    }

    // 2. Terminar sesión y guardar progreso realizado
    const finishEarlyBtn = container.querySelector('#btn-giant-finish-early');
    if (finishEarlyBtn) {
      finishEarlyBtn.addEventListener('click', () => {
        if (confirm('¿Deseas finalizar el entrenamiento ahora y guardar el resumen de lo completado?')) {
          this.recordActiveSet(container, workout, profile);
          this.completeWorkoutRoutine(container, workout, profile);
        }
      });
    }

    // 2b. Cancelar y descartar rutina completa (para pruebas o cancelaciones)
    const cancelWorkoutBtn = container.querySelector('#btn-giant-cancel-workout');
    if (cancelWorkoutBtn) {
      cancelWorkoutBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que deseas cancelar y descartar esta rutina?\n\nNo se guardará en tu historial ni en tus actividades.')) {
          if (this.activeController.phaseTimer) {
            clearInterval(this.activeController.phaseTimer);
            this.activeController.phaseTimer = null;
          }
          workoutService.discardActiveWorkout();
          this.activeController = {
            phase: 'idle',
            phaseTimer: null,
            phaseSeconds: 0,
            phaseTotalSeconds: 0,
            isPaused: false,
            currentExerciseIdx: 0,
            currentRound: 1,
            summaryData: null
          };
          Toast.info('Rutina descartada.');
          router.navigate('dashboard');
        }
      });
    }

    // 3. Botón Completar Serie (Fase Trabajo)
    const completeSetBtn = container.querySelector('#btn-complete-set');
    if (completeSetBtn) {
      completeSetBtn.addEventListener('click', () => {
        this.handlePhaseEnd(container, workout, profile);
      });
    }

    // 4. Steppers de peso y repeticiones
    const wInput = container.querySelector('#active-input-weight');
    const rInput = container.querySelector('#active-input-reps');

    container.querySelector('#btn-weight-minus')?.addEventListener('click', () => {
      if (wInput) wInput.value = Math.max(0, (parseFloat(wInput.value) || 0) - 2.5);
    });
    container.querySelector('#btn-weight-plus')?.addEventListener('click', () => {
      if (wInput) wInput.value = (parseFloat(wInput.value) || 0) + 2.5;
    });
    container.querySelector('#btn-reps-minus')?.addEventListener('click', () => {
      if (rInput) rInput.value = Math.max(1, (parseInt(rInput.value, 10) || 1) - 1);
    });
    container.querySelector('#btn-reps-plus')?.addEventListener('click', () => {
      if (rInput) rInput.value = (parseInt(rInput.value, 10) || 1) + 1;
    });

    // 5. Ajustes en fase descanso
    container.querySelector('#btn-rest-plus15')?.addEventListener('click', () => {
      this.activeController.phaseSeconds += 15;
      this.updateGiantDigits(container, this.activeController.phaseSeconds, true);
    });
    container.querySelector('#btn-rest-minus15')?.addEventListener('click', () => {
      this.activeController.phaseSeconds = Math.max(2, this.activeController.phaseSeconds - 15);
      this.updateGiantDigits(container, this.activeController.phaseSeconds, true);
    });
    container.querySelector('#btn-skip-rest')?.addEventListener('click', () => {
      this.handlePhaseEnd(container, workout, profile);
    });

    // 6. Saltar preparación
    container.querySelector('#btn-skip-prep')?.addEventListener('click', () => {
      this.handlePhaseEnd(container, workout, profile);
    });
  },

  updateGiantDigits(container, seconds, isCountdown = true) {
    const digitsElem = container.querySelector('#giant-timer-digits');
    if (digitsElem) {
      digitsElem.textContent = this.formatTimeDigits(seconds);
    }
  },

  formatTimeDigits(secs) {
    const s = Math.max(0, secs);
    const m = Math.floor(s / 60);
    const remSecs = s % 60;
    return `${m.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
  },

  getLastWeight(exercise) {
    if (exercise.sets && exercise.sets.length > 0) {
      return exercise.sets[exercise.sets.length - 1].weight_kg || 0;
    }
    if (exercise.target_weight !== undefined && exercise.target_weight !== null) {
      return exercise.target_weight;
    }
    if (exercise.targetWeight !== undefined && exercise.targetWeight !== null) {
      return exercise.targetWeight;
    }
    return 0;
  },

  getLastReps(exercise) {
    if (exercise.sets && exercise.sets.length > 0) {
      return exercise.sets[exercise.sets.length - 1].reps || 10;
    }
    if (exercise.target_reps !== undefined && exercise.target_reps !== null) {
      return exercise.target_reps;
    }
    if (exercise.targetReps !== undefined && exercise.targetReps !== null) {
      return exercise.targetReps;
    }
    return 10;
  },

  getNextExerciseName(workout) {
    if (this.activeController.currentExerciseIdx < workout.exercises.length - 1) {
      return workout.exercises[this.activeController.currentExerciseIdx + 1].exercise_name;
    }
    return `${workout.exercises[0].exercise_name} (Siguiente Vuelta)`;
  },

  // ============================================================================
  // PANTALLA 3: RESUMEN FINAL DEL ENTRENAMIENTO (RESULTADOS Y CONCLUSIÓN)
  // ============================================================================
  async completeWorkoutRoutine(container, workout, profile) {
    if (this.activeController.phaseTimer) {
      clearInterval(this.activeController.phaseTimer);
      this.activeController.phaseTimer = null;
    }

    Sound.playVictory();

    // Finalizar sesión en workoutService para calcular totales
    const completedWorkout = await workoutService.finishWorkout(profile);

    // Resetear controlador activo para la próxima sesión
    this.activeController = {
      phase: 'idle',
      phaseTimer: null,
      phaseSeconds: 0,
      phaseTotalSeconds: 0,
      isPaused: false,
      currentExerciseIdx: 0,
      currentRound: 1,
      summaryData: null
    };

    this.renderSummaryScreen(container, completedWorkout, profile);
  },

  renderSummaryScreen(container, workout, profile) {
    let totalSetsCount = 0;
    let highest1RM = 0;

    workout.exercises.forEach((ex) => {
      totalSetsCount += (ex.sets || []).length;
      if (ex.best_1rm > highest1RM) highest1RM = ex.best_1rm;
    });

    const durationMins = Math.max(1, Math.round((workout.duration_seconds || 60) / 60));

    container.innerHTML = `
      <div class="summary-hero-card card glass-card">
        <div class="summary-trophy-wrap">🏆</div>
        <span class="badge-tag">¡Entrenamiento Completado!</span>
        <h1 class="summary-title">Resumen de Rendimiento</h1>
        <p class="summary-subtitle">Gran trabajo, ${profile.full_name || 'Atleta'}. Cada serie registrada suma a tu sobrecarga progresiva.</p>

        <!-- GRID DE RESULTADOS DESTACADOS -->
        <div class="summary-stats-grid">
          <div class="summary-stat-box">
            <span class="sbox-label">TIEMPO TOTAL</span>
            <div class="sbox-value">${durationMins} <span class="sbox-unit">minutos</span></div>
            <span class="sbox-sub">Dedicatoria pura</span>
          </div>

          <div class="summary-stat-box">
            <span class="sbox-label">VOLUMEN TOTAL</span>
            <div class="sbox-value text-accent-cyan">${Math.round(workout.total_volume_kg).toLocaleString()} <span class="sbox-unit">kg</span></div>
            <span class="sbox-sub">Peso acumulado levantado</span>
          </div>

          <div class="summary-stat-box">
            <span class="sbox-label">CALORÍAS QUEMADAS</span>
            <div class="sbox-value text-accent-coral">${Math.round(workout.total_calories)} <span class="sbox-unit">kcal</span></div>
            <span class="sbox-sub">Cálculo biométrico MET</span>
          </div>

          <div class="summary-stat-box">
            <span class="sbox-label">SERIES COMPLETADAS</span>
            <div class="sbox-value">${totalSetsCount} <span class="sbox-unit">series</span></div>
            <span class="sbox-sub">${workout.exercises.length} ejercicios realizados</span>
          </div>
        </div>

        <!-- DESGLOSE POR EJERCICIO -->
        <div class="summary-exercise-breakdown">
          <h3 class="breakdown-title">Desglose de Ejercicios Realizados</h3>
          <div class="breakdown-cards-list">
            ${workout.exercises.map((ex) => `
              <div class="breakdown-item card glass-card">
                <div class="bitem-header">
                  <h4 class="bitem-name">${ex.exercise_name}</h4>
                  <span class="bitem-cat">${ex.category}</span>
                </div>
                <div class="bitem-stats-row">
                  <span><strong>Series:</strong> ${ex.sets.length}</span>
                  <span><strong>Volumen:</strong> ${Math.round(ex.total_volume_kg || 0)} kg</span>
                  ${ex.best_1rm > 0 ? `<span><strong>1RM Máx:</strong> ${ex.best_1rm} kg</span>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- ACCIONES FINALES -->
        <div class="summary-actions-row">
          <button type="button" id="btn-finish-go-dashboard" class="btn btn-primary btn-glow btn-lg full-width">
            <span>💾 Volver al Panel Principal (Sincronizado)</span>
          </button>
        </div>
      </div>
    `;

    container.querySelector('#btn-finish-go-dashboard').addEventListener('click', () => {
      router.navigate('dashboard');
    });
  }
};
