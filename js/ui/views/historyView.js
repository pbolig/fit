// ==============================================================================
// FITPULSE - WORKOUT HISTORY, ANALYTICS & PERSONAL RECORDS VIEW
// Muestra el historial completo, gráficos Canvas de volumen y peso, y mejores marcas (PR).
// ==============================================================================

import { workoutService } from '../../services/workoutService.js';
import { Charts } from '../charts.js';
import { Toast } from '../toast.js';

export const HistoryView = {
  async render(container) {
    const workouts = await workoutService.getAllWorkouts();
    const bodyMetrics = await workoutService.getBodyMetricsHistory();
    const personalRecords = await workoutService.getPersonalRecords();

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <span class="badge-tag">Progreso & Métricas</span>
          <h1 class="view-title">Historial & Récords Personales</h1>
          <p class="view-subtitle">Analiza tu sobrecarga progresiva, volumen acumulado y evolución física en el tiempo.</p>
        </div>
        <button id="btn-open-metric-modal" class="btn btn-secondary btn-glow">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          <span>Registrar Pesaje</span>
        </button>
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

        <!-- Gráfico 2: Volumen de Entrenamiento Reciente -->
        <div class="card glass-card chart-card">
          <div class="chart-header">
            <div>
              <h3 class="chart-title">Volumen por Sesión (kg)</h3>
              <p class="chart-subtitle">Sobrecarga progresiva (peso × repeticiones)</p>
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
            <p>Tus récords personales de 1RM aparecerán aquí automáticamente conforme completes series pesadas en tus entrenamientos.</p>
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

      <!-- LISTA DE SESIONES HISTÓRICAS -->
      <div class="history-list-section">
        <h2 class="section-title">Registro Detallado de Sesiones</h2>

        ${workouts.length === 0 ? `
          <div class="card glass-card empty-history-card">
            <p>No hay entrenamientos guardados todavía.</p>
          </div>
        ` : `
          <div class="history-cards-stack" id="history-cards-container">
            ${workouts.map((w) => `
              <div class="card glass-card history-session-card" data-workout-id="${w.id}">
                <div class="session-main-row">
                  <div class="session-icon">
                    ${w.category === 'Cardio' ? '🏃' : w.category === 'HIIT / Funcional' ? '⚡' : '🏋️'}
                  </div>
                  <div class="session-info">
                    <h3 class="session-title">${w.title}</h3>
                    <div class="session-date-line">
                      <span>${new Date(w.start_time).toLocaleString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
                      <span class="dot-separator">•</span>
                      <span class="session-cat-pill">${w.category || 'Fuerza'}</span>
                    </div>
                  </div>
                  <div class="session-metrics-pills">
                    <div class="sm-pill">
                      <span class="sm-val">${Math.round((w.duration_seconds || 0) / 60)}</span>
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
                  </div>
                  <button class="btn-icon-danger btn-delete-history" data-workout-id="${w.id}" title="Eliminar de historial">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
            `).join('')}
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
        // Datos de ejemplo visual si no hay historial aún
        weightPoints = [
          { label: 'Sem 1', value: 80.5 },
          { label: 'Sem 2', value: 79.8 },
          { label: 'Sem 3', value: 79.1 },
          { label: 'Sem 4', value: 78.4 }
        ];
      }
      Charts.renderLineChart(weightCanvas, weightPoints, {
        lineColor: '#00f2fe',
        gradientTop: 'rgba(0, 242, 254, 0.3)',
        gradientBottom: 'rgba(0, 242, 254, 0.0)'
      });
    }

    // 2. Gráfico de Volumen
    const volumeCanvas = container.querySelector('#volume-history-canvas');
    if (volumeCanvas) {
      let volumeItems = [];
      if (workouts && workouts.length > 0) {
        volumeItems = workouts.slice(0, 7).reverse().map((w) => ({
          label: new Date(w.start_time).toLocaleDateString('es-ES', { weekday: 'short' }),
          value: Math.round(w.total_volume_kg || 0),
          color: '#8b5cf6',
          colorSecondary: '#ec4899'
        }));
      } else {
        volumeItems = [
          { label: 'Lun', value: 4500, color: '#8b5cf6', colorSecondary: '#ec4899' },
          { label: 'Mie', value: 6200, color: '#8b5cf6', colorSecondary: '#ec4899' },
          { label: 'Vie', value: 5800, color: '#8b5cf6', colorSecondary: '#ec4899' },
          { label: 'Sab', value: 3100, color: '#8b5cf6', colorSecondary: '#ec4899' }
        ];
      }
      Charts.renderBarChart(volumeCanvas, volumeItems);
    }
  },

  attachEvents(container) {
    // Modal de Pesaje
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

    // Eliminar sesión
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
