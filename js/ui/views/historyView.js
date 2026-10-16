// ==============================================================================
// FITPULSE - WORKOUT HISTORY, ANALYTICS & PERSONAL RECORDS VIEW
// Muestra el historial completo de entrenamientos (en solitario y en salas en vivo),
// gráficos de evolución, desglose de ejercicios/pasos con acordeón interactivo y métricas acumuladas.
// ==============================================================================

import { workoutService } from '../../services/workoutService.js';
import { Charts } from '../charts.js';
import { Toast } from '../toast.js';

export const HistoryView = {
  async render(container) {
    const workouts = await workoutService.getAllWorkouts();
    const bodyMetrics = await workoutService.getBodyMetricsHistory();
    const personalRecords = await workoutService.getPersonalRecords();

    // Métricas globales acumuladas para la barra de evolución
    const totalSessions = workouts.length;
    const totalMinutes = workouts.reduce((sum, w) => sum + Math.round((w.duration_seconds || 0) / 60), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);
    const totalCaloriesBurned = workouts.reduce((sum, w) => sum + Math.round(w.total_calories || 0), 0);
    const danceSessionsCount = workouts.filter((w) => w.category === 'Baile & Ritmos').length;
    const roomClassesCount = workouts.filter((w) => w.room_id || w.trainer_name || (w.title && w.title.includes('Sala:'))).length;
    const strengthSessionsCount = workouts.filter((w) => w.category === 'Fuerza').length;

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <span class="badge-tag">Evolución & Actividades</span>
          <h1 class="view-title">Historial de Rutinas & Evolución</h1>
          <p class="view-subtitle">Monitorea tus entrenamientos individuales y clases en vivo, volumen acumulado y progreso atlético.</p>
        </div>
        <button id="btn-open-metric-modal" class="btn btn-secondary btn-glow">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          <span>Registrar Pesaje</span>
        </button>
      </div>

      <!-- BARRA SUPERIOR DE KPIs HISTÓRICOS Y EVOLUCIÓN -->
      <div class="history-kpi-summary">
        <div class="history-kpi-card card glass-card">
          <div class="kpi-icon-wrap" style="color: #38bdf8;">📅</div>
          <div class="kpi-data">
            <span class="kpi-num">${totalSessions}</span>
            <span class="kpi-lbl">Sesiones Realizadas</span>
          </div>
        </div>

        <div class="history-kpi-card card glass-card">
          <div class="kpi-icon-wrap" style="color: #34d399;">⏱️</div>
          <div class="kpi-data">
            <span class="kpi-num">${totalHours} <span style="font-size: 0.85rem; font-weight: 600;">hrs</span></span>
            <span class="kpi-lbl">${totalMinutes} min entrenados</span>
          </div>
        </div>

        <div class="history-kpi-card card glass-card">
          <div class="kpi-icon-wrap" style="color: #f472b6;">🔥</div>
          <div class="kpi-data">
            <span class="kpi-num">${totalCaloriesBurned.toLocaleString()}</span>
            <span class="kpi-lbl">Calorías Totales MET</span>
          </div>
        </div>

        <div class="history-kpi-card card glass-card">
          <div class="kpi-icon-wrap" style="color: #fbbf24;">🏆</div>
          <div class="kpi-data">
            <span class="kpi-num" style="font-size: 1.05rem; line-height: 1.3;">
              ${danceSessionsCount > 0 ? `💃 ${danceSessionsCount} ` : ''}
              ${roomClassesCount > 0 ? `🧑‍🏫 ${roomClassesCount} ` : ''}
              ${strengthSessionsCount > 0 ? `🏋️ ${strengthSessionsCount}` : ''}
              ${totalSessions === 0 ? 'Sin registros' : ''}
            </span>
            <span class="kpi-lbl">Disciplinas Practicadas</span>
          </div>
        </div>
      </div>

      <!-- GRÁFICOS ANALÍTICOS NATIVOS -->
      <div class="analytics-charts-grid">
        <!-- Gráfico 1: Evolución de Peso Corporal -->
        <div class="card glass-card chart-card">
          <div class="chart-header">
            <div>
              <h3 class="chart-title">Evolución de Peso Corporal (kg)</h3>
              <p class="chart-subtitle">Historial de pesajes registrados</p>
            </div>
          </div>
          <div class="chart-canvas-wrapper">
            <canvas id="weight-history-canvas" height="200"></canvas>
          </div>
        </div>

        <!-- Gráfico 2: Evolución de Rendimiento y Actividad -->
        <div class="card glass-card chart-card">
          <div class="chart-header">
            <div>
              <h3 class="chart-title">Evolución de Actividad Reciente</h3>
              <p class="chart-subtitle">Calorías y sobrecarga por sesión realizada</p>
            </div>
          </div>
          <div class="chart-canvas-wrapper">
            <canvas id="volume-history-canvas" height="200"></canvas>
          </div>
        </div>
      </div>

      <!-- RÉCORDS PERSONALES (PRs DE FUERZA) -->
      <div class="pr-section">
        <div class="section-title-row">
          <h2 class="section-title">🏆 Récords Personales (1RM Estimado)</h2>
          <span class="badge-tag">Fórmula Epley / Brzycki</span>
        </div>

        ${personalRecords.length === 0 ? `
          <div class="card glass-card empty-pr-box">
            <p>Tus récords personales de 1RM aparecerán aquí conforme completes series pesadas en tus rutinas de fuerza.</p>
          </div>
        ` : `
          <div class="pr-grid">
            ${personalRecords.map((pr) => `
              <div class="card glass-card pr-card">
                <span class="pr-trophy">🥇</span>
                <div class="pr-info">
                  <div class="pr-name">${pr.exercise_name}</div>
                  <div class="pr-cat">${pr.category}</div>
                </div>
                <div class="pr-val-wrap">
                  <span class="pr-val">${pr.best_1rm}</span>
                  <span class="pr-unit">kg 1RM</span>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- LISTA DE SESIONES HISTÓRICAS (CON ACORDEÓN EXPANDIBLE DE EJERCICIOS Y PASOS) -->
      <div class="history-list-section">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <div>
            <h2 class="section-title" style="margin: 0;">Registro Detallado de Sesiones</h2>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0.25rem 0 0;">
              Haz clic en cualquier tarjeta para desplegar el desglose de ejercicios o pasos realizados.
            </p>
          </div>
          <span class="badge-tag">${workouts.length} registradas</span>
        </div>

        ${workouts.length === 0 ? `
          <div class="card glass-card empty-history-card">
            <p>No hay entrenamientos guardados todavía. Comienza en "Entrenar Ahora" o únete a una "Sala en Vivo".</p>
          </div>
        ` : `
          <div class="history-cards-stack" id="history-cards-container">
            ${workouts.map((w) => {
              const isDance = w.category === 'Baile & Ritmos';
              const isCardio = w.category === 'Cardio';
              const isHiit = w.category === 'HIIT / Funcional';
              const isRoom = !!(w.room_id || w.trainer_name || (w.title && w.title.includes('Sala:')));

              let icon = '🏋️';
              if (isDance) icon = '💃';
              else if (isCardio) icon = '🏃';
              else if (isHiit) icon = '⚡';
              else if (isRoom) icon = '🧑‍🏫';

              const durationMins = Math.round((w.duration_seconds || 0) / 60);

              return `
                <div class="card glass-card history-session-card" data-workout-id="${w.id}">
                  <div class="session-main-row">
                    <div class="session-icon" style="font-size: 1.8rem;">
                      ${icon}
                    </div>

                    <div class="session-info">
                      <h3 class="session-title" style="margin-bottom: 0.2rem;">${w.title}</h3>
                      <div class="session-date-line">
                        <span>${new Date(w.start_time).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        <span class="dot-separator">•</span>
                        <span class="session-cat-pill" style="font-weight: 700; ${isDance ? 'background: rgba(236,72,153,0.2); color:#f472b6;' : isRoom ? 'background: rgba(16,185,129,0.2); color:#34d399;' : ''}">
                          ${w.category || 'Fuerza'}
                        </span>
                        ${isRoom ? `
                          <span class="dot-separator">•</span>
                          <span style="color: var(--accent-cyan); font-size: 0.76rem; font-weight: 600;">
                            ${w.attendance_mode === 'remote' ? '🌐 Remoto' : '📍 En Sala'}
                          </span>
                        ` : ''}
                      </div>
                    </div>

                    <div class="session-metrics-pills">
                      <div class="sm-pill">
                        <span class="sm-val">${durationMins}</span>
                        <span class="sm-lbl">min</span>
                      </div>

                      <div class="sm-pill text-accent-coral">
                        <span class="sm-val">${Math.round(w.total_calories || 0)}</span>
                        <span class="sm-lbl">kcal</span>
                      </div>

                      ${w.total_volume_kg > 0 ? `
                        <div class="sm-pill text-accent-cyan">
                          <span class="sm-val">${Math.round(w.total_volume_kg).toLocaleString()}</span>
                          <span class="sm-lbl">kg vol</span>
                        </div>
                      ` : ''}

                      <button class="btn-toggle-expand" title="Ver desglose de ejercicios" type="button">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                      </button>

                      <button class="btn-icon-danger btn-delete-history" data-workout-id="${w.id}" title="Eliminar de historial" type="button">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>

                  <!-- DRAWER EXPANDIBLE CON EL DETALLE DE LA SESIÓN -->
                  <div class="history-detail-drawer" data-workout-id="${w.id}"></div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- MODAL PARA REGISTRAR PESAJE -->
      <div class="modal-backdrop" id="metric-modal" style="display: none;">
        <div class="modal-card glass-modal modal-sm">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">Registrar Pesaje Corporal</h3>
              <p class="modal-subtitle">Seguimiento de peso e índice de grasa</p>
            </div>
            <button class="modal-close-btn" id="btn-close-metric-modal">&times;</button>
          </div>

          <form id="form-log-metric" class="modal-form">
            <div class="form-group full-width">
              <label for="metric-date">Fecha</label>
              <input type="date" id="metric-date" class="input-field" value="${new Date().toISOString().split('T')[0]}" required>
            </div>

            <div class="form-group full-width">
              <label for="metric-weight">Peso Corporal <span class="unit-badge">kg</span></label>
              <input type="number" id="metric-weight" class="input-field" step="0.1" min="30" max="300" placeholder="Ej. 78.2" required>
            </div>

            <div class="form-group full-width">
              <label for="metric-fat">% Grasa Corporal <span class="unit-badge">(opcional)</span></label>
              <input type="number" id="metric-fat" class="input-field" step="0.1" min="3" max="50" placeholder="Ej. 14.5">
            </div>

            <div class="modal-actions-row">
              <button type="submit" class="btn btn-primary btn-glow full-width">Guardar Pesaje</button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.renderCharts(container, workouts, bodyMetrics);
    this.attachEvents(container);
  },

  renderCharts(container, workouts, bodyMetrics) {
    // 1. Gráfico de Peso
    const weightCanvas = container.querySelector('#weight-history-canvas');
    if (weightCanvas) {
      let weightPoints = [];
      if (bodyMetrics && bodyMetrics.length > 0) {
        weightPoints = bodyMetrics.slice(-10).map((m) => ({
          label: new Date(m.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
          value: parseFloat(m.weight_kg)
        }));
      } else {
        weightPoints = [
          { label: 'Sem 1', value: 80.5 },
          { label: 'Sem 2', value: 79.8 },
          { label: 'Sem 3', value: 79.1 },
          { label: 'Sem 4', value: 78.4 }
        ];
      }
      Charts.renderLineChart(weightCanvas, weightPoints, {
        lineColor: '#00f2fe',
        gradientTop: 'rgba(0, 242, 254, 0.35)',
        gradientBottom: 'rgba(0, 242, 254, 0.0)'
      });
    }

    // 2. Gráfico de Actividad & Sobrecarga / Calorías
    const volumeCanvas = container.querySelector('#volume-history-canvas');
    if (volumeCanvas) {
      let activityItems = [];
      if (workouts && workouts.length > 0) {
        activityItems = workouts.slice(0, 7).reverse().map((w) => {
          const isDance = w.category === 'Baile & Ritmos';
          const isRoom = !!(w.room_id || w.trainer_name || (w.title && w.title.includes('Sala:')));
          
          let val = Math.round(w.total_volume_kg || 0);
          let col = '#8b5cf6';
          let sec = '#ec4899';

          // Si es baile o cardio sin volumen de pesas, graficar las calorías MET
          if (val === 0 || isDance) {
            val = Math.round(w.total_calories || 250);
            col = isDance ? '#ec4899' : isRoom ? '#10b981' : '#38bdf8';
            sec = isDance ? '#f43f5e' : isRoom ? '#34d399' : '#00f2fe';
          }

          return {
            label: new Date(w.start_time).toLocaleDateString('es-ES', { weekday: 'short' }),
            value: val,
            color: col,
            colorSecondary: sec
          };
        });
      } else {
        activityItems = [
          { label: 'Lun', value: 380, color: '#ec4899', colorSecondary: '#f43f5e' },
          { label: 'Mie', value: 520, color: '#10b981', colorSecondary: '#34d399' },
          { label: 'Vie', value: 450, color: '#8b5cf6', colorSecondary: '#ec4899' },
          { label: 'Sab', value: 310, color: '#38bdf8', colorSecondary: '#00f2fe' }
        ];
      }
      Charts.renderBarChart(volumeCanvas, activityItems);
    }
  },

  attachEvents(container) {
    // 1. Acordeón interactivo: expandir y cargar detalle de ejercicios de cualquier sesión
    container.querySelectorAll('.history-session-card').forEach((card) => {
      card.addEventListener('click', async (e) => {
        // Evitar que el clic en el botón de eliminar dispare la apertura
        if (e.target.closest('.btn-delete-history')) return;

        const isExpanded = card.classList.toggle('is-expanded');
        const drawer = card.querySelector('.history-detail-drawer');
        if (!drawer) return;

        if (isExpanded && !drawer.dataset.loaded) {
          const workoutId = card.getAttribute('data-workout-id');
          drawer.innerHTML = `<div style="text-align: center; padding: 1.25rem; color: var(--text-muted);"><span class="pulse-dot"></span> Cargando desglose de ejercicios...</div>`;

          try {
            const fullWorkout = await workoutService.getWorkoutWithExercises(workoutId);
            const exercises = fullWorkout?.exercises || [];
            const isDance = fullWorkout?.category === 'Baile & Ritmos';
            const isRoom = !!(fullWorkout?.room_id || fullWorkout?.trainer_name || (fullWorkout?.title && fullWorkout?.title.includes('Sala:')));

            let html = `
              <div class="drawer-header-info">
                ${isRoom ? `
                  <span class="drawer-room-badge">
                    🧑‍🏫 Clase dirigida con ${fullWorkout.trainer_name || 'Entrenador'} · ${fullWorkout.attendance_mode === 'remote' ? '🌐 Modo Remoto' : '📍 Modo Presencial'}
                  </span>
                ` : isDance ? `
                  <span class="drawer-room-badge" style="background: rgba(236,72,153,0.15); color: #f472b6; border-color: rgba(236,72,153,0.3);">
                    💃 Práctica de Baile & Ritmos
                  </span>
                ` : `
                  <span class="drawer-room-badge" style="background: rgba(139,92,246,0.15); color: #c084fc; border-color: rgba(139,92,246,0.3);">
                    🏋️ Sesión de Musculación & Fuerza
                  </span>
                `}
                ${fullWorkout?.notes ? `<span class="drawer-notes">${fullWorkout.notes}</span>` : ''}
              </div>
            `;

            if (exercises.length === 0) {
              html += `<p style="font-size: 0.85rem; color: var(--text-muted); margin: 0.5rem 0;">Esta sesión no tiene un desglose individual de ejercicios almacenado.</p>`;
            } else {
              html += `
                <table class="drawer-exercise-table">
                  <thead>
                    <tr>
                      <th style="width: 32px;">#</th>
                      <th>${isDance ? 'Paso de Baile' : 'Ejercicio'}</th>
                      <th>${isDance ? 'Modalidad' : 'Series'}</th>
                      <th>${isDance ? 'Tiempo / Vuelta' : 'Reps × Peso'}</th>
                      <th>${isDance ? 'Gasto Calórico' : 'Máx 1RM'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${exercises.map((ex, i) => {
                      const setsCount = (ex.sets || []).length || 1;
                      const firstSet = (ex.sets && ex.sets[0]) ? ex.sets[0] : {};
                      const danceModeLabel = (firstSet.danceMode === 'pareja' || ex.danceMode === 'pareja') ? '👥 En Pareja' : '👤 Solo';
                      const best1RMText = ex.best_1rm > 0 ? `${ex.best_1rm} kg` : '-';
                      const calsText = ex.calories_burned > 0 ? `${ex.calories_burned} kcal` : '~';

                      return `
                        <tr>
                          <td>${i + 1}</td>
                          <td class="drawer-ex-name">${ex.exercise_name}</td>
                          <td>${isDance ? danceModeLabel : `${setsCount} series`}</td>
                          <td>
                            ${isDance
                              ? `${firstSet.duration_seconds || 45} segs`
                              : `${firstSet.reps || 10} reps ${firstSet.weight_kg > 0 ? `× ${firstSet.weight_kg}kg` : ''}`}
                          </td>
                          <td>${isDance ? calsText : best1RMText}</td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              `;
            }

            drawer.innerHTML = html;
            drawer.dataset.loaded = 'true';
          } catch (err) {
            console.warn('Error al cargar ejercicios del workout:', err);
            drawer.innerHTML = `<p style="font-size: 0.85rem; color: #ef4444; padding: 0.5rem;">No fue posible cargar el detalle de la sesión.</p>`;
          }
        }
      });
    });

    // 2. Modal de Pesaje
    const metricModal = container.querySelector('#metric-modal');
    const openMetricBtn = container.querySelector('#btn-open-metric-modal');
    const closeMetricBtn = container.querySelector('#btn-close-metric-modal');
    const metricForm = container.querySelector('#form-log-metric');

    if (openMetricBtn) {
      openMetricBtn.addEventListener('click', () => {
        metricModal.style.display = 'flex';
      });
    }

    if (closeMetricBtn) {
      closeMetricBtn.addEventListener('click', () => {
        metricModal.style.display = 'none';
      });
    }

    if (metricModal) {
      metricModal.addEventListener('click', (e) => {
        if (e.target === metricModal) metricModal.style.display = 'none';
      });
    }

    if (metricForm) {
      metricForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const date = container.querySelector('#metric-date').value;
        const weight = parseFloat(container.querySelector('#metric-weight').value);
        const fat = parseFloat(container.querySelector('#metric-fat').value) || null;

        await workoutService.logBodyMetric({
          date,
          weight_kg: weight,
          body_fat_pct: fat
        });

        // Actualizar también el perfil con el nuevo peso actual
        const currentProfile = await workoutService.getProfile();
        currentProfile.weight_kg = weight;
        if (fat) currentProfile.body_fat_pct = fat;
        await workoutService.saveProfile(currentProfile);

        Toast.success('Pesaje registrado y sincronizado en segundo plano.', '¡Guardado!');
        metricModal.style.display = 'none';
        this.render(container);
      });
    }

    // 3. Eliminar sesión
    container.querySelectorAll('.btn-delete-history').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        const workoutId = btn.getAttribute('data-workout-id');
        if (confirm('¿Deseas eliminar este registro de entrenamiento? Se borrará de tus actividades y estadísticas.')) {
          await workoutService.deleteWorkout(workoutId);
          Toast.info('Entrenamiento eliminado.');
          this.render(container);
        }
      });
    });
  }
};
