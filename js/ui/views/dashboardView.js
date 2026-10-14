// ==============================================================================
// FITPULSE - DASHBOARD HUB VIEW
// Panel principal con resumen biométrico, racha, devoluciones del sistema,
// acceso directo al entrenamiento activo e historial reciente.
// ==============================================================================

import { workoutService } from '../../services/workoutService.js';
import { Biometrics } from '../../services/biometrics.js';
import { authService } from '../../services/authService.js';
import { router } from '../router.js';

export const DashboardView = {
  async render(container) {
    const user = authService.getCurrentUser();
    const profile = await workoutService.getProfile();
    const feedback = Biometrics.generatePersonalizedFeedback(profile);
    const activeWorkout = workoutService.getActiveWorkout();
    const pastWorkouts = await workoutService.getAllWorkouts();

    // Racha y estadísticas de la semana
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Domingo
    startOfWeek.setHours(0, 0, 0, 0);

    const workoutsThisWeek = pastWorkouts.filter(
      (w) => new Date(w.start_time) >= startOfWeek
    );
    const completedDaysCount = workoutsThisWeek.length;
    const targetDays = profile.training_days_per_week || 4;
    const weeklyPct = Math.min(100, Math.round((completedDaysCount / targetDays) * 100));

    // Total de calorías y volumen de la semana
    const weeklyCalories = workoutsThisWeek.reduce((acc, w) => acc + (w.total_calories || 0), 0);
    const weeklyVolume = workoutsThisWeek.reduce((acc, w) => acc + (w.total_volume_kg || 0), 0);

    container.innerHTML = `
      <!-- HERO WELCOME BANNER -->
      <div class="dashboard-hero">
        <div class="hero-left">
          <div class="user-greeting-badge">
            <span class="pulse-dot"></span>
            <span>Atleta Activo · ${profile.goal === 'fat_loss' ? 'Definición' : profile.goal === 'muscle_gain' ? 'Hipertrofia' : 'Fuerza'}</span>
          </div>
          <h1 class="hero-greeting">¡Hola, ${profile.full_name || 'Atleta'}!</h1>
          <p class="hero-quote">La constancia supera a la intensidad. Sigue construyendo tu mejor versión hoy.</p>
        </div>

        <div class="hero-actions">
          ${activeWorkout ? `
            <button id="btn-resume-workout" class="btn btn-warning btn-glow btn-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span>Continuar Sesión Activa</span>
            </button>
          ` : `
            <button id="btn-start-quick-workout" class="btn btn-primary btn-glow btn-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
              <span>Iniciar Entrenamiento</span>
            </button>
          `}
        </div>
      </div>

      <!-- RESUMEN SEMANAL Y METABÓLICO -->
      <div class="dashboard-grid-top">
        <!-- Tarjeta de Racha Semanal -->
        <div class="card glass-card weekly-progress-card">
          <div class="card-header-compact">
            <span class="card-mini-title">Consistencia Semanal</span>
            <span class="badge-tag">${completedDaysCount} de ${targetDays} días</span>
          </div>
          <div class="weekly-ring-container">
            <div class="ring-stat">
              <div class="ring-number">${weeklyPct}%</div>
              <div class="ring-sub">Objetivo Semanal</div>
            </div>
            <div class="progress-bar-custom">
              <div class="progress-fill-custom" style="width: ${weeklyPct}%"></div>
            </div>
          </div>
          <div class="weekly-stats-footer">
            <div class="mini-stat">
              <span class="mini-stat-val">${weeklyCalories.toLocaleString()}</span>
              <span class="mini-stat-lbl">kcal quemadas</span>
            </div>
            <div class="mini-stat-divider"></div>
            <div class="mini-stat">
              <span class="mini-stat-val">${Math.round(weeklyVolume).toLocaleString()} kg</span>
              <span class="mini-stat-lbl">volumen total</span>
            </div>
          </div>
        </div>

        <!-- Tarjeta BMR & TDEE -->
        <div class="card glass-card metabolic-quick-card">
          <div class="card-header-compact">
            <span class="card-mini-title">Gasto Energético Calibrado</span>
            <span class="info-pill">Científico</span>
          </div>
          <div class="metabolic-stats-duo">
            <div class="meta-item">
              <span class="meta-lbl">TDEE Estimado</span>
              <span class="meta-val text-accent-cyan">${feedback.tdee}</span>
              <span class="meta-unit">kcal / día</span>
            </div>
            <div class="meta-item">
              <span class="meta-lbl">BMR Basal</span>
              <span class="meta-val">${feedback.bmr}</span>
              <span class="meta-unit">kcal en reposo</span>
            </div>
          </div>
          <div class="card-quick-footer">
            <span class="footer-hint">Basado en ${profile.weight_kg} kg · ${profile.height_cm} cm · ${feedback.age} años</span>
            <button class="link-btn" id="link-to-profile">Editar perfil &rarr;</button>
          </div>
        </div>

        <!-- Tarjeta Devolución de la IA / Coaching -->
        <div class="card glass-card coaching-card">
          <div class="card-header-compact">
            <span class="card-mini-title text-accent-gold">⚡ Devolución del Motor Deportivo</span>
            <span class="badge-pill bg-gold-subtle">Fase 1</span>
          </div>
          <p class="coaching-strategy-desc">${feedback.calorieStrategy}</p>
          <div class="coaching-macros-chips">
            <div class="macro-chip chip-protein">
              <span class="chip-label">Proteína</span>
              <span class="chip-val">${feedback.macros.protein.grams}g</span>
            </div>
            <div class="macro-chip chip-carbs">
              <span class="chip-label">Carbos</span>
              <span class="chip-val">${feedback.macros.carbs.grams}g</span>
            </div>
            <div class="macro-chip chip-fat">
              <span class="chip-label">Grasas</span>
              <span class="chip-val">${feedback.macros.fat.grams}g</span>
            </div>
            <div class="macro-chip chip-water">
              <span class="chip-label">Agua</span>
              <span class="chip-val">${feedback.waterLiters}L</span>
            </div>
          </div>
          ${profile.injuries_notes ? `
            <div class="injury-alert-box">
              <span class="alert-icon">⚠️</span>
              <span class="alert-text">Atención a: ${profile.injuries_notes}</span>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- HISTORIAL RECIENTE -->
      <div class="dashboard-section-header">
        <h2 class="section-title">Últimos Entrenamientos Registrados</h2>
        <button class="btn btn-secondary btn-sm" id="btn-view-all-history">Ver Historial Completo</button>
      </div>

      ${pastWorkouts.length === 0 ? `
        <div class="empty-state-box card glass-card">
          <div class="empty-icon-wrap">🏋️</div>
          <h3>Aún no has registrado sesiones de entrenamiento</h3>
          <p>Presiona el botón de abajo para iniciar tu primer entrenamiento y registrar ejercicios, peso levantado, series y tiempo.</p>
          <button id="btn-empty-start" class="btn btn-primary btn-glow">Iniciar Primer Entrenamiento</button>
        </div>
      ` : `
        <div class="recent-workouts-list">
          ${pastWorkouts.slice(0, 4).map((w) => `
            <div class="card glass-card workout-card-row">
              <div class="workout-icon-category">
                ${w.category === 'Cardio' ? '🏃' : w.category === 'HIIT / Funcional' ? '⚡' : '🏋️'}
              </div>
              <div class="workout-info-main">
                <h4 class="workout-name">${w.title || 'Entrenamiento'}</h4>
                <div class="workout-meta-line">
                  <span>${new Date(w.start_time).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  <span class="dot-separator">•</span>
                  <span>${w.category || 'Fuerza'}</span>
                </div>
              </div>
              <div class="workout-stats-duo">
                <div class="wstat">
                  <span class="wstat-num">${Math.round((w.duration_seconds || 0) / 60)}</span>
                  <span class="wstat-lbl">min</span>
                </div>
                <div class="wstat">
                  <span class="wstat-num text-accent-coral">${Math.round(w.total_calories || 0)}</span>
                  <span class="wstat-lbl">kcal</span>
                </div>
                ${w.total_volume_kg > 0 ? `
                  <div class="wstat">
                    <span class="wstat-num text-accent-cyan">${Math.round(w.total_volume_kg).toLocaleString()}</span>
                    <span class="wstat-lbl">kg vol</span>
                  </div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `}
    `;

    // Conectar eventos
    this.attachEvents(container);
  },

  attachEvents(container) {
    const startQuickBtn = container.querySelector('#btn-start-quick-workout');
    if (startQuickBtn) {
      startQuickBtn.addEventListener('click', () => {
        workoutService.startWorkout('Sesión de Fuerza y Rendimiento', 'Fuerza');
        router.navigate('workout');
      });
    }

    const resumeBtn = container.querySelector('#btn-resume-workout');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        router.navigate('workout');
      });
    }

    const emptyStartBtn = container.querySelector('#btn-empty-start');
    if (emptyStartBtn) {
      emptyStartBtn.addEventListener('click', () => {
        workoutService.startWorkout('Sesión Inicial FitPulse', 'Fuerza');
        router.navigate('workout');
      });
    }

    const linkProfile = container.querySelector('#link-to-profile');
    if (linkProfile) {
      linkProfile.addEventListener('click', () => router.navigate('profile'));
    }

    const viewAllHistory = container.querySelector('#btn-view-all-history');
    if (viewAllHistory) {
      viewAllHistory.addEventListener('click', () => router.navigate('history'));
    }
  }
};
