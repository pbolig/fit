// ==============================================================================
// FITPULSE - ACTIVE WORKOUT LOGGER VIEW
// Registrador interactivo en tiempo real con cronómetro en vivo, cálculo dinámico
// de 1RM, gasto calórico por ejercicio (Fuerza y Cardio con MET),
// cronómetro de descanso y persistencia instantánea.
// ==============================================================================

import { workoutService } from '../../services/workoutService.js';
import { Biometrics } from '../../services/biometrics.js';
import { EXERCISE_CATALOG, CATEGORIES } from '../../services/exerciseCatalog.js';
import { Toast } from '../toast.js';
import { router } from '../router.js';

export const WorkoutView = {
  restTimerInterval: null,
  restSecondsLeft: 0,

  async render(container) {
    let workout = workoutService.getActiveWorkout();
    const profile = await workoutService.getProfile();

    if (!workout) {
      // Si no hay entrenamiento activo, mostrar pantalla de inicio de sesión
      this.renderStartScreen(container, profile);
      return;
    }

    this.renderActiveWorkoutScreen(container, workout, profile);
  },

  renderStartScreen(container, profile) {
    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <span class="badge-tag">Entrenamiento Activo</span>
          <h1 class="view-title">Iniciar Nueva Sesión</h1>
          <p class="view-subtitle">Selecciona el tipo de entrenamiento para activar el cronómetro y el cálculo de métricas en tiempo real.</p>
        </div>
      </div>

      <div class="workout-start-card card glass-card">
        <div class="form-group full-width">
          <label for="workout-title-input">Nombre o Enfoque de la Sesión</label>
          <input type="text" id="workout-title-input" class="input-field input-lg" value="Fuerza & Hipertrofia del Día" placeholder="Ej. Torso Pesado, Piernas & Glúteos, Cardio HIIT">
        </div>

        <div class="category-presets-grid">
          <div class="category-preset-item active" data-cat="Fuerza">
            <div class="cat-icon">🏋️</div>
            <div class="cat-title">Fuerza & Musculación</div>
            <div class="cat-desc">Levantamiento de peso, series, repeticiones y cálculo de 1RM</div>
          </div>

          <div class="category-preset-item" data-cat="Cardio">
            <div class="cat-icon">🏃</div>
            <div class="cat-title">Cardiovascular</div>
            <div class="cat-desc">Running, ciclismo, salto a cuerda con cálculo de calorías por MET</div>
          </div>

          <div class="category-preset-item" data-cat="HIIT / Funcional">
            <div class="cat-icon">⚡</div>
            <div class="cat-title">HIIT & Funcional</div>
            <div class="cat-desc">Circuitos de alta intensidad, burpees, pliometría y kettlebells</div>
          </div>

          <div class="category-preset-item" data-cat="Movilidad">
            <div class="cat-icon">🧘</div>
            <div class="cat-title">Movilidad & Recuperación</div>
            <div class="cat-desc">Yoga, estiramientos activos y prevención articular</div>
          </div>
        </div>

        <div class="start-btn-row">
          <button id="btn-begin-workout" class="btn btn-primary btn-glow btn-lg full-width">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <span>Comenzar Entrenamiento Ahora</span>
          </button>
        </div>
      </div>
    `;

    // Conectar selección de categorías
    const catItems = container.querySelectorAll('.category-preset-item');
    let selectedCat = 'Fuerza';

    catItems.forEach((item) => {
      item.addEventListener('click', () => {
        catItems.forEach((i) => i.classList.remove('active'));
        item.classList.add('active');
        selectedCat = item.getAttribute('data-cat');
      });
    });

    container.querySelector('#btn-begin-workout').addEventListener('click', () => {
      const title = container.querySelector('#workout-title-input').value.trim() || 'Sesión de Entrenamiento';
      workoutService.startWorkout(title, selectedCat);
      this.render(container);
    });
  },

  renderActiveWorkoutScreen(container, workout, profile) {
    const elapsedFormatted = this.formatSeconds(workout.duration_seconds || 0);

    container.innerHTML = `
      <!-- WORKOUT HEADER & CONTROLS -->
      <div class="active-workout-header">
        <div class="workout-title-area">
          <span class="badge-tag pulse-tag">● EN VIVO</span>
          <input type="text" id="active-title-input" class="editable-title-input" value="${workout.title}">
          <div class="workout-meta-pills">
            <span class="meta-pill-tag">${workout.category}</span>
            <span class="meta-pill-tag">Atleta: ${profile.weight_kg} kg</span>
          </div>
        </div>

        <div class="workout-live-dashboard">
          <div class="live-timer-box">
            <div class="timer-lbl">TIEMPO TRANSCURRIDO</div>
            <div class="timer-digits" id="live-timer-display">${elapsedFormatted}</div>
          </div>

          <div class="live-metrics-chips">
            <div class="chip-metric">
              <span class="chip-val text-accent-cyan" id="live-total-vol">0</span>
              <span class="chip-lbl">kg Volumen</span>
            </div>
            <div class="chip-metric">
              <span class="chip-val text-accent-coral" id="live-total-cals">0</span>
              <span class="chip-lbl">kcal Quemadas</span>
            </div>
          </div>

          <div class="workout-main-actions">
            <button id="btn-finish-workout" class="btn btn-success btn-glow">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Finalizar Sesión</span>
            </button>
            <button id="btn-discard-workout" class="btn btn-outline-danger" title="Descartar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- CRONÓMETRO DE DESCANSO INTERACTIVO -->
      <div class="card glass-card rest-timer-card">
        <div class="rest-timer-header">
          <div class="rest-title-wrap">
            <span class="rest-icon">⏱️</span>
            <div>
              <span class="rest-title">Cronómetro de Descanso Entre Series</span>
              <span class="rest-desc">Optimiza la recuperación neuromuscular</span>
            </div>
          </div>
          <div class="rest-countdown" id="rest-countdown-display">00:00</div>
        </div>
        <div class="rest-preset-buttons">
          <button class="btn btn-secondary btn-sm btn-rest" data-secs="30">+30s</button>
          <button class="btn btn-secondary btn-sm btn-rest" data-secs="60">+60s</button>
          <button class="btn btn-secondary btn-sm btn-rest" data-secs="90">+90s</button>
          <button class="btn btn-secondary btn-sm btn-rest" data-secs="120">+2 min</button>
          <button class="btn btn-secondary btn-sm btn-rest" data-secs="180">+3 min (Fuerza)</button>
          <button class="btn btn-outline-danger btn-sm" id="btn-stop-rest">Detener</button>
        </div>
      </div>

      <!-- LISTA DE EJERCICIOS DE LA SESIÓN -->
      <div class="workout-exercises-container" id="workout-exercises-list">
        ${this.renderExercisesHtml(workout)}
      </div>

      <!-- BOTÓN PARA AGREGAR EJERCICIO -->
      <div class="add-exercise-bar">
        <button id="btn-open-catalog-modal" class="btn btn-primary btn-glow btn-lg">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>+ Añadir Ejercicio a la Sesión</span>
        </button>
      </div>

      <!-- MODAL SELECTOR DE EJERCICIOS -->
      <div class="modal-backdrop" id="exercise-modal" style="display: none;">
        <div class="modal-card glass-modal">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">Biblioteca de Ejercicios</h3>
              <p class="modal-subtitle">Selecciona el movimiento que vas a realizar</p>
            </div>
            <button class="modal-close-btn" id="btn-close-exercise-modal">&times;</button>
          </div>

          <div class="modal-search-row">
            <input type="text" id="exercise-search-input" class="input-field" placeholder="Buscar por nombre o músculo (ej. sentadilla, bíceps, press...)">
          </div>

          <div class="category-pills-scroll" id="catalog-category-filter">
            ${CATEGORIES.map((cat, i) => `
              <button class="filter-pill ${i === 0 ? 'active' : ''}" data-cat="${cat}">${cat}</button>
            `).join('')}
          </div>

          <div class="modal-exercise-list" id="modal-exercise-items">
            <!-- Renderizado dinámicamente -->
          </div>
        </div>
      </div>
    `;

    this.attachActiveWorkoutEvents(container, workout, profile);
    this.updateTotals(container, workout, profile);
  },

  renderExercisesHtml(workout) {
    if (!workout.exercises || workout.exercises.length === 0) {
      return `
        <div class="empty-exercise-notice card glass-card">
          <div class="empty-icon-wrap">📋</div>
          <h4>No has añadido ejercicios a esta sesión todavía</h4>
          <p>Presiona el botón "+ Añadir Ejercicio" para elegir de la biblioteca con valores científicos de MET y estimación de 1RM.</p>
        </div>
      `;
    }

    return workout.exercises.map((ex, exIdx) => `
      <div class="card glass-card exercise-block" data-ex-idx="${exIdx}">
        <div class="exercise-block-header">
          <div class="ex-title-wrap">
            <span class="ex-number-badge">${exIdx + 1}</span>
            <div>
              <h3 class="ex-name">${ex.exercise_name}</h3>
              <div class="ex-meta-line">
                <span class="ex-cat-badge">${ex.category}</span>
                <span class="ex-type-badge">${ex.type === 'strength' ? 'Fuerza (1RM)' : ex.type === 'cardio' ? 'Cardio (MET ' + ex.metValue + ')' : 'Tiempo'}</span>
              </div>
            </div>
          </div>
          <button class="btn-icon-danger btn-remove-exercise" data-ex-idx="${exIdx}" title="Eliminar ejercicio">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>

        ${ex.type === 'strength' ? this.renderStrengthSetsTable(ex, exIdx) : this.renderCardioSetsTable(ex, exIdx)}

        <div class="exercise-block-footer">
          <button class="btn btn-secondary btn-sm btn-add-set" data-ex-idx="${exIdx}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>+ Añadir Serie</span>
          </button>
        </div>
      </div>
    `).join('');
  },

  renderStrengthSetsTable(ex, exIdx) {
    return `
      <div class="table-responsive">
        <table class="sets-table">
          <thead>
            <tr>
              <th class="col-num">Serie</th>
              <th class="col-input">Peso (kg)</th>
              <th class="col-input">Reps</th>
              <th class="col-rpe">RPE</th>
              <th class="col-1rm">1RM Estimado</th>
              <th class="col-check">Hecho</th>
              <th class="col-del"></th>
            </tr>
          </thead>
          <tbody>
            ${ex.sets.map((set, setIdx) => {
              const oneRm = Biometrics.calculate1RM(set.weight_kg, set.reps);
              return `
                <tr class="set-row ${set.completed ? 'set-completed' : ''}" data-set-idx="${setIdx}">
                  <td class="col-num"><span class="set-number-pill">${set.set_number}</span></td>
                  <td class="col-input">
                    <input type="number" class="set-input set-weight" data-ex-idx="${exIdx}" data-set-idx="${setIdx}" value="${set.weight_kg || 0}" step="2.5" min="0">
                  </td>
                  <td class="col-input">
                    <input type="number" class="set-input set-reps" data-ex-idx="${exIdx}" data-set-idx="${setIdx}" value="${set.reps || 0}" step="1" min="1">
                  </td>
                  <td class="col-rpe">
                    <select class="set-select set-rpe" data-ex-idx="${exIdx}" data-set-idx="${setIdx}">
                      ${[6, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((rpe) => `
                        <option value="${rpe}" ${set.rpe == rpe ? 'selected' : ''}>${rpe}</option>
                      `).join('')}
                    </select>
                  </td>
                  <td class="col-1rm">
                    <span class="est-1rm-val" id="1rm-${exIdx}-${setIdx}">${oneRm} kg</span>
                  </td>
                  <td class="col-check">
                    <button class="btn-check-set ${set.completed ? 'checked' : ''}" data-ex-idx="${exIdx}" data-set-idx="${setIdx}">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>
                  </td>
                  <td class="col-del">
                    <button class="btn-del-set" data-ex-idx="${exIdx}" data-set-idx="${setIdx}">&times;</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  renderCardioSetsTable(ex, exIdx) {
    return `
      <div class="table-responsive">
        <table class="sets-table">
          <thead>
            <tr>
              <th class="col-num">Tramo</th>
              <th class="col-input">Tiempo (min)</th>
              <th class="col-input">Distancia (km)</th>
              <th class="col-check">Hecho</th>
              <th class="col-del"></th>
            </tr>
          </thead>
          <tbody>
            ${ex.sets.map((set, setIdx) => `
              <tr class="set-row ${set.completed ? 'set-completed' : ''}" data-set-idx="${setIdx}">
                <td class="col-num"><span class="set-number-pill">${set.set_number}</span></td>
                <td class="col-input">
                  <input type="number" class="set-input set-duration" data-ex-idx="${exIdx}" data-set-idx="${setIdx}" value="${set.duration_minutes || 10}" step="1" min="1">
                </td>
                <td class="col-input">
                  <input type="number" class="set-input set-distance" data-ex-idx="${exIdx}" data-set-idx="${setIdx}" value="${set.distance_km || 1}" step="0.1" min="0">
                </td>
                <td class="col-check">
                  <button class="btn-check-set ${set.completed ? 'checked' : ''}" data-ex-idx="${exIdx}" data-set-idx="${setIdx}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                </td>
                <td class="col-del">
                  <button class="btn-del-set" data-ex-idx="${exIdx}" data-set-idx="${setIdx}">&times;</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  attachActiveWorkoutEvents(container, workout, profile) {
    // 1. Cronómetro de sesión
    const timerDisplay = container.querySelector('#live-timer-display');
    const onTimerTick = (e) => {
      if (timerDisplay) {
        timerDisplay.textContent = this.formatSeconds(e.detail.seconds);
      }
    };
    window.addEventListener('fitpulse:workout-timer-tick', onTimerTick);

    // 2. Modificar título
    const titleInput = container.querySelector('#active-title-input');
    titleInput.addEventListener('change', () => {
      workout.title = titleInput.value.trim() || 'Entrenamiento';
      workoutService.saveActiveWorkoutToStorage();
    });

    // 3. Finalizar Sesión
    container.querySelector('#btn-finish-workout').addEventListener('click', async () => {
      if (workout.exercises.length === 0) {
        Toast.warning('Añade al menos un ejercicio antes de guardar la sesión.');
        return;
      }

      const finishBtn = container.querySelector('#btn-finish-workout');
      finishBtn.disabled = true;
      finishBtn.innerHTML = `<span>Calculando & Guardando...</span>`;

      try {
        const completed = await workoutService.finishWorkout(profile);
        Toast.success(
          `Sesión guardada con éxito. Volumen: ${completed.total_volume_kg} kg | Calorías: ${completed.total_calories} kcal`,
          '¡Gran Trabajo!'
        );
        router.navigate('dashboard');
      } catch (err) {
        console.error('Error al finalizar sesión:', err);
        Toast.error('No se pudo guardar la sesión: ' + err.message);
        finishBtn.disabled = false;
      }
    });

    // 4. Descartar Sesión
    container.querySelector('#btn-discard-workout').addEventListener('click', () => {
      if (confirm('¿Estás seguro de descartar este entrenamiento en curso? Se perderán los datos de la sesión actual.')) {
        workoutService.discardActiveWorkout();
        Toast.info('Entrenamiento descartado.');
        this.render(container);
      }
    });

    // 5. Cronómetro de descanso (Rest Timer)
    container.querySelectorAll('.btn-rest').forEach((btn) => {
      btn.addEventListener('click', () => {
        const secs = parseInt(btn.getAttribute('data-secs'), 10);
        this.startRestTimer(container, secs);
      });
    });

    container.querySelector('#btn-stop-rest').addEventListener('click', () => {
      this.stopRestTimer(container);
    });

    // 6. Manipulación de series y ejercicios
    container.addEventListener('input', (e) => {
      const target = e.target;
      if (target.classList.contains('set-weight') || target.classList.contains('set-reps')) {
        const exIdx = parseInt(target.getAttribute('data-ex-idx'), 10);
        const setIdx = parseInt(target.getAttribute('data-set-idx'), 10);
        const exercise = workout.exercises[exIdx];
        if (exercise && exercise.sets[setIdx]) {
          const row = target.closest('tr');
          const weight = parseFloat(row.querySelector('.set-weight').value) || 0;
          const reps = parseInt(row.querySelector('.set-reps').value, 10) || 0;

          exercise.sets[setIdx].weight_kg = weight;
          exercise.sets[setIdx].reps = reps;

          const oneRm = Biometrics.calculate1RM(weight, reps);
          exercise.sets[setIdx].estimated_1rm = oneRm;

          const oneRmSpan = row.querySelector('.est-1rm-val');
          if (oneRmSpan) oneRmSpan.textContent = `${oneRm} kg`;

          workoutService.saveActiveWorkoutToStorage();
          this.updateTotals(container, workout, profile);
        }
      } else if (target.classList.contains('set-duration') || target.classList.contains('set-distance')) {
        const exIdx = parseInt(target.getAttribute('data-ex-idx'), 10);
        const setIdx = parseInt(target.getAttribute('data-set-idx'), 10);
        const exercise = workout.exercises[exIdx];
        if (exercise && exercise.sets[setIdx]) {
          const row = target.closest('tr');
          exercise.sets[setIdx].duration_minutes = parseFloat(row.querySelector('.set-duration').value) || 0;
          exercise.sets[setIdx].distance_km = parseFloat(row.querySelector('.set-distance').value) || 0;
          workoutService.saveActiveWorkoutToStorage();
          this.updateTotals(container, workout, profile);
        }
      }
    });

    container.addEventListener('click', (e) => {
      const checkBtn = e.target.closest('.btn-check-set');
      if (checkBtn) {
        const exIdx = parseInt(checkBtn.getAttribute('data-ex-idx'), 10);
        const setIdx = parseInt(checkBtn.getAttribute('data-set-idx'), 10);
        const set = workout.exercises[exIdx]?.sets[setIdx];
        if (set) {
          set.completed = !set.completed;
          checkBtn.classList.toggle('checked', set.completed);
          checkBtn.closest('tr').classList.toggle('set-completed', set.completed);
          workoutService.saveActiveWorkoutToStorage();

          if (set.completed) {
            // Iniciar descanso sugerido de 90 segundos automáticamente
            this.startRestTimer(container, 90);
          }
        }
        return;
      }

      const delSetBtn = e.target.closest('.btn-del-set');
      if (delSetBtn) {
        const exIdx = parseInt(delSetBtn.getAttribute('data-ex-idx'), 10);
        const setIdx = parseInt(delSetBtn.getAttribute('data-set-idx'), 10);
        workoutService.removeSetFromExercise(exIdx, setIdx);
        container.querySelector('#workout-exercises-list').innerHTML = this.renderExercisesHtml(workout);
        this.updateTotals(container, workout, profile);
        return;
      }

      const addSetBtn = e.target.closest('.btn-add-set');
      if (addSetBtn) {
        const exIdx = parseInt(addSetBtn.getAttribute('data-ex-idx'), 10);
        workoutService.addSetToExercise(exIdx);
        container.querySelector('#workout-exercises-list').innerHTML = this.renderExercisesHtml(workout);
        this.updateTotals(container, workout, profile);
        return;
      }

      const removeExBtn = e.target.closest('.btn-remove-exercise');
      if (removeExBtn) {
        const exIdx = parseInt(removeExBtn.getAttribute('data-ex-idx'), 10);
        if (confirm('¿Eliminar este ejercicio de la sesión?')) {
          workoutService.removeExerciseFromWorkout(exIdx);
          container.querySelector('#workout-exercises-list').innerHTML = this.renderExercisesHtml(workout);
          this.updateTotals(container, workout, profile);
        }
        return;
      }
    });

    // 7. Modal Selector de Ejercicios
    const modal = container.querySelector('#exercise-modal');
    const openModalBtn = container.querySelector('#btn-open-catalog-modal');
    const closeModalBtn = container.querySelector('#btn-close-exercise-modal');
    const searchInput = container.querySelector('#exercise-search-input');
    const filterPills = container.querySelectorAll('.filter-pill');
    const modalItemsContainer = container.querySelector('#modal-exercise-items');

    let currentCatFilter = 'Todos';

    const renderCatalogInModal = () => {
      const query = (searchInput.value || '').toLowerCase().trim();
      const filtered = EXERCISE_CATALOG.filter((ex) => {
        const matchesCat = currentCatFilter === 'Todos' || ex.category === currentCatFilter;
        const matchesQuery = !query ||
          ex.name.toLowerCase().includes(query) ||
          ex.primaryMuscle.toLowerCase().includes(query) ||
          ex.category.toLowerCase().includes(query);
        return matchesCat && matchesQuery;
      });

      modalItemsContainer.innerHTML = filtered.map((ex) => `
        <div class="modal-exercise-row" data-ex-id="${ex.id}">
          <div class="row-info">
            <h4 class="row-name">${ex.name}</h4>
            <div class="row-tags">
              <span class="tag-cat">${ex.category}</span>
              <span class="tag-muscle">Músculo: ${ex.primaryMuscle}</span>
              <span class="tag-met">MET ${ex.metValue}</span>
            </div>
            <p class="row-tips">${ex.tips}</p>
          </div>
          <button class="btn btn-primary btn-sm btn-select-exercise" data-ex-id="${ex.id}">
            + Añadir
          </button>
        </div>
      `).join('');
    };

    openModalBtn.addEventListener('click', () => {
      modal.style.display = 'flex';
      renderCatalogInModal();
      searchInput.focus();
    });

    closeModalBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });

    searchInput.addEventListener('input', renderCatalogInModal);

    filterPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        filterPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        currentCatFilter = pill.getAttribute('data-cat');
        renderCatalogInModal();
      });
    });

    modalItemsContainer.addEventListener('click', (e) => {
      const selectBtn = e.target.closest('.btn-select-exercise');
      if (selectBtn) {
        const exId = selectBtn.getAttribute('data-ex-id');
        workoutService.addExerciseToActiveWorkout(exId);
        modal.style.display = 'none';
        container.querySelector('#workout-exercises-list').innerHTML = this.renderExercisesHtml(workout);
        this.updateTotals(container, workout, profile);
        Toast.success('Ejercicio añadido al entrenamiento.');
      }
    });
  },

  updateTotals(container, workout, profile) {
    let totalVol = 0;
    let totalCals = 0;
    const userWeight = profile?.weight_kg || 75;

    for (const ex of workout.exercises) {
      if (ex.type === 'strength') {
        for (const s of ex.sets) {
          totalVol += (parseFloat(s.weight_kg) || 0) * (parseInt(s.reps, 10) || 0);
        }
      } else if (ex.type === 'cardio') {
        for (const s of ex.sets) {
          const mins = parseFloat(s.duration_minutes) || 0;
          totalCals += Biometrics.calculateCardioCalories(ex.metValue || 8.0, userWeight, mins);
        }
      }
    }

    const durationMins = Math.max(1, Math.round((workout.duration_seconds || 60) / 60));
    totalCals += Biometrics.calculateStrengthCalories(userWeight, durationMins, workout.exercises.length * 3, true);

    const volElem = container.querySelector('#live-total-vol');
    const calsElem = container.querySelector('#live-total-cals');
    if (volElem) volElem.textContent = Math.round(totalVol).toLocaleString();
    if (calsElem) calsElem.textContent = Math.round(totalCals).toLocaleString();
  },

  startRestTimer(container, seconds) {
    this.stopRestTimer(container);
    this.restSecondsLeft = seconds;
    const display = container.querySelector('#rest-countdown-display');

    const updateDisplay = () => {
      const mins = Math.floor(this.restSecondsLeft / 60);
      const secs = this.restSecondsLeft % 60;
      if (display) {
        display.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        display.classList.add('countdown-active');
      }
    };

    updateDisplay();

    this.restTimerInterval = setInterval(() => {
      this.restSecondsLeft--;
      if (this.restSecondsLeft <= 0) {
        this.stopRestTimer(container);
        if (display) {
          display.textContent = '¡A ENTRENAR!';
          display.classList.remove('countdown-active');
        }
        // Feedback háptico y sonido si el navegador lo soporta
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        Toast.info('¡Descanso completado! Prepárate para la siguiente serie.', 'Tiempo Cumplido');
      } else {
        updateDisplay();
      }
    }, 1000);
  },

  stopRestTimer(container) {
    if (this.restTimerInterval) {
      clearInterval(this.restTimerInterval);
      this.restTimerInterval = null;
    }
    const display = container.querySelector('#rest-countdown-display');
    if (display) {
      display.textContent = '00:00';
      display.classList.remove('countdown-active');
    }
  },

  formatSeconds(totalSecs) {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
};
