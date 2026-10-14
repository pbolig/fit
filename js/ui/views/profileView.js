// ==============================================================================
// FITPULSE - ATHLETE PROFILE & BIOMETRIC REGISTRATION VIEW (FASE 1)
// Permite al usuario cargar todos sus datos biométricos y de estilo de vida,
// con cálculo científico en tiempo real de BMR, TDEE, Zonas Cardíacas e IMC.
// ==============================================================================

import { workoutService } from '../../services/workoutService.js';
import { Biometrics } from '../../services/biometrics.js';
import { Toast } from '../toast.js';

export const ProfileView = {
  async render(container) {
    const profile = await workoutService.getProfile();
    const feedback = Biometrics.generatePersonalizedFeedback(profile);

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <span class="badge-tag">Fase 1 · Motor Biométrico</span>
          <h1 class="view-title">Perfil del Atleta & Biometría</h1>
          <p class="view-subtitle">Registra tus parámetros físicos y objetivos para calibrar los algoritmos de gasto calórico, 1RM y recomendaciones personalizadas.</p>
        </div>
        <button id="btn-save-profile" class="btn btn-primary btn-glow">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          <span>Guardar y Sincronizar</span>
        </button>
      </div>

      <div class="profile-layout-grid">
        <!-- FORMULARIO DE ENTRADA BIOMÉTRICA -->
        <div class="card glass-card profile-form-card">
          <div class="card-header">
            <div class="card-icon-box">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div>
              <h2 class="card-title">Datos Personales & Físicos</h2>
              <p class="card-description">Parámetros antropométricos fundamentales</p>
            </div>
          </div>

          <form id="profile-form" class="form-grid">
            <!-- Nombre Completo -->
            <div class="form-group full-width">
              <label for="prof-name">Nombre y Apellido</label>
              <input type="text" id="prof-name" class="input-field" value="${profile.full_name || ''}" placeholder="Ej. Alex Mercer" required>
            </div>

            <!-- Sexo Biológico -->
            <div class="form-group">
              <label for="prof-sex">Sexo Biológico <span class="label-hint">(BMR hormonal)</span></label>
              <select id="prof-sex" class="select-field">
                <option value="male" ${profile.sex === 'male' ? 'selected' : ''}>Hombre</option>
                <option value="female" ${profile.sex === 'female' ? 'selected' : ''}>Mujer</option>
                <option value="other" ${profile.sex === 'other' ? 'selected' : ''}>Otro / No binario</option>
              </select>
            </div>

            <!-- Fecha de Nacimiento -->
            <div class="form-group">
              <label for="prof-birth">Fecha de Nacimiento</label>
              <input type="date" id="prof-birth" class="input-field" value="${profile.birth_date || '1998-05-15'}">
            </div>

            <!-- Altura (cm) -->
            <div class="form-group">
              <label for="prof-height">Altura <span class="unit-badge">cm</span></label>
              <input type="number" id="prof-height" class="input-field" min="100" max="250" step="0.5" value="${profile.height_cm || 178}" required>
            </div>

            <!-- Peso Actual (kg) -->
            <div class="form-group">
              <label for="prof-weight">Peso Actual <span class="unit-badge">kg</span></label>
              <input type="number" id="prof-weight" class="input-field" min="30" max="300" step="0.1" value="${profile.weight_kg || 78}" required>
            </div>

            <!-- Peso Objetivo (kg) -->
            <div class="form-group">
              <label for="prof-target-weight">Peso Objetivo <span class="unit-badge">kg</span></label>
              <input type="number" id="prof-target-weight" class="input-field" min="30" max="300" step="0.5" value="${profile.target_weight_kg || 80}">
            </div>

            <!-- Porcentaje de Grasa Corporal (%) -->
            <div class="form-group">
              <label for="prof-fat">Grasa Corporal <span class="unit-badge">% (opcional)</span></label>
              <input type="number" id="prof-fat" class="input-field" min="3" max="50" step="0.5" value="${profile.body_fat_pct || ''}" placeholder="Ej. 14.5">
            </div>

            <!-- Frecuencia Cardíaca en Reposo (lpm) -->
            <div class="form-group">
              <label for="prof-rhr">Frecuencia en Reposo <span class="unit-badge">lpm</span></label>
              <input type="number" id="prof-rhr" class="input-field" min="35" max="120" value="${profile.resting_heart_rate || 62}" placeholder="Ej. 60">
            </div>

            <!-- Días de Entrenamiento Semanal -->
            <div class="form-group">
              <label for="prof-days">Días de Entrenamiento</label>
              <select id="prof-days" class="select-field">
                <option value="2" ${profile.training_days_per_week === 2 ? 'selected' : ''}>2 días / semana</option>
                <option value="3" ${profile.training_days_per_week === 3 ? 'selected' : ''}>3 días / semana</option>
                <option value="4" ${profile.training_days_per_week === 4 ? 'selected' : ''}>4 días / semana</option>
                <option value="5" ${profile.training_days_per_week === 5 ? 'selected' : ''}>5 días / semana</option>
                <option value="6" ${profile.training_days_per_week === 6 ? 'selected' : ''}>6 días / semana</option>
                <option value="7" ${profile.training_days_per_week === 7 ? 'selected' : ''}>7 días (Doble sesión)</option>
              </select>
            </div>

            <!-- Nivel de Actividad Diaria -->
            <div class="form-group full-width">
              <label for="prof-activity">Nivel de Actividad Diaria General (TDEE Factor)</label>
              <select id="prof-activity" class="select-field">
                <option value="sedentary" ${profile.activity_level === 'sedentary' ? 'selected' : ''}>Sedentario (Trabajo de oficina, poco movimiento diario)</option>
                <option value="light" ${profile.activity_level === 'light' ? 'selected' : ''}>Ligero (Trabajo de pie o 1-3 días de actividad)</option>
                <option value="moderate" ${profile.activity_level === 'moderate' ? 'selected' : ''}>Moderado (Estilo activo + 3-5 días de ejercicio)</option>
                <option value="active" ${profile.activity_level === 'active' ? 'selected' : ''}>Activo (Trabajo físico o 6-7 días de entrenamiento)</option>
                <option value="very_active" ${profile.activity_level === 'very_active' ? 'selected' : ''}>Muy Activo / Atleta (Entrenamiento intenso diario o doble)</option>
              </select>
            </div>

            <!-- Objetivo Principal -->
            <div class="form-group full-width">
              <label for="prof-goal">Objetivo Principal de Rendimiento</label>
              <select id="prof-goal" class="select-field">
                <option value="muscle_gain" ${profile.goal === 'muscle_gain' ? 'selected' : ''}>Hipertrofia Muscular (Ganancia de Masa Magra)</option>
                <option value="strength" ${profile.goal === 'strength' ? 'selected' : ''}>Fuerza Máxima & Powerlifting (1RM y Potencia)</option>
                <option value="fat_loss" ${profile.goal === 'fat_loss' ? 'selected' : ''}>Definición & Pérdida de Grasa (Déficit Calórico)</option>
                <option value="endurance" ${profile.goal === 'endurance' ? 'selected' : ''}>Resistencia Cardiovascular & Running / Ciclismo</option>
                <option value="general_fitness" ${profile.goal === 'general_fitness' ? 'selected' : ''}>Salud General, Longevidad & Movilidad Funcional</option>
              </select>
            </div>

            <!-- Nivel de Experiencia -->
            <div class="form-group">
              <label for="prof-exp">Experiencia de Entrenamiento</label>
              <select id="prof-exp" class="select-field">
                <option value="beginner" ${profile.experience_level === 'beginner' ? 'selected' : ''}>Principiante (< 1 año)</option>
                <option value="intermediate" ${profile.experience_level === 'intermediate' ? 'selected' : ''}>Intermedio (1 a 3 años)</option>
                <option value="advanced" ${profile.experience_level === 'advanced' ? 'selected' : ''}>Avanzado (3 a 5 años)</option>
                <option value="elite" ${profile.experience_level === 'elite' ? 'selected' : ''}>Atleta de Élite / Competidor (+5 años)</option>
              </select>
            </div>

            <!-- Preferencia de Unidades -->
            <div class="form-group">
              <label for="prof-units">Sistema de Unidades</label>
              <select id="prof-units" class="select-field">
                <option value="metric" ${profile.preferred_units === 'metric' ? 'selected' : ''}>Métrico (kg, cm, km)</option>
                <option value="imperial" ${profile.preferred_units === 'imperial' ? 'selected' : ''}>Imperial (lbs, in, mi)</option>
              </select>
            </div>

            <!-- Lesiones o Limitaciones -->
            <div class="form-group full-width">
              <label for="prof-injuries">Historial de Lesiones o Limitaciones Articulares <span class="label-hint">(Preventivo)</span></label>
              <textarea id="prof-injuries" class="textarea-field" rows="2" placeholder="Ej. Molestia en hombro izquierdo con press tras nuca; cuidar sobrecarga en lumbares.">${profile.injuries_notes || ''}</textarea>
            </div>
          </form>
        </div>

        <!-- PANEL DE RETROALIMENTACIÓN CIENTÍFICA EN TIEMPO REAL -->
        <div class="profile-feedback-column">
          <!-- Tarjetas Métricas Clave -->
          <div class="card glass-card feedback-summary-card">
            <div class="card-header">
              <div class="card-icon-box accent-cyan">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </div>
              <div>
                <h3 class="card-title">Cálculo Metabólico en Vivo</h3>
                <p class="card-description">Mifflin-St Jeor & Tanaka HR</p>
              </div>
            </div>

            <div class="metrics-stat-grid">
              <div class="stat-box">
                <span class="stat-label">BMR (Metabolismo Basal)</span>
                <div class="stat-value"><span id="live-bmr">${feedback.bmr}</span> <span class="stat-unit">kcal/día</span></div>
                <span class="stat-sub">Gasto en reposo absoluto</span>
              </div>

              <div class="stat-box">
                <span class="stat-label">TDEE (Gasto Diario Total)</span>
                <div class="stat-value text-accent"><span id="live-tdee">${feedback.tdee}</span> <span class="stat-unit">kcal/día</span></div>
                <span class="stat-sub">Con factor de actividad</span>
              </div>

              <div class="stat-box">
                <span class="stat-label">IMC & Clasificación</span>
                <div class="stat-value" id="live-bmi">${feedback.bmi.bmi}</div>
                <span class="stat-sub badge-pill" id="live-bmi-category" style="background: ${feedback.bmi.color}22; color: ${feedback.bmi.color}">${feedback.bmi.category}</span>
              </div>

              <div class="stat-box">
                <span class="stat-label">FC Máxima Estimada</span>
                <div class="stat-value"><span id="live-max-hr">${feedback.maxHr}</span> <span class="stat-unit">lpm</span></div>
                <span class="stat-sub">Fórmula Tanaka (208 - 0.7*edad)</span>
              </div>
            </div>

            <!-- Estrategia Calórica y Macros -->
            <div class="feedback-section">
              <div class="section-title-row">
                <span class="section-tag">Meta Nutricional Sugerida</span>
                <span class="section-badge" id="live-target-calories">${feedback.targetCalories} kcal</span>
              </div>
              <p class="feedback-strategy-text" id="live-strategy">${feedback.calorieStrategy}</p>

              <!-- Barras de Macros -->
              <div class="macros-progress-container">
                <div class="macro-bar-row">
                  <div class="macro-info">
                    <span class="macro-dot dot-protein"></span>
                    <span class="macro-name">Proteína</span>
                    <span class="macro-grams" id="live-protein-g">${feedback.macros.protein.grams}g</span>
                  </div>
                  <span class="macro-pct" id="live-protein-pct">${feedback.macros.protein.pct}%</span>
                </div>
                <div class="macro-bar-track">
                  <div class="macro-bar-fill fill-protein" id="bar-protein" style="width: ${feedback.macros.protein.pct}%"></div>
                </div>

                <div class="macro-bar-row">
                  <div class="macro-info">
                    <span class="macro-dot dot-carbs"></span>
                    <span class="macro-name">Carbohidratos</span>
                    <span class="macro-grams" id="live-carbs-g">${feedback.macros.carbs.grams}g</span>
                  </div>
                  <span class="macro-pct" id="live-carbs-pct">${feedback.macros.carbs.pct}%</span>
                </div>
                <div class="macro-bar-track">
                  <div class="macro-bar-fill fill-carbs" id="bar-carbs" style="width: ${feedback.macros.carbs.pct}%"></div>
                </div>

                <div class="macro-bar-row">
                  <div class="macro-info">
                    <span class="macro-dot dot-fat"></span>
                    <span class="macro-name">Grasas Saludables</span>
                    <span class="macro-grams" id="live-fat-g">${feedback.macros.fat.grams}g</span>
                  </div>
                  <span class="macro-pct" id="live-fat-pct">${feedback.macros.fat.pct}%</span>
                </div>
                <div class="macro-bar-track">
                  <div class="macro-bar-fill fill-fat" id="bar-fat" style="width: ${feedback.macros.fat.pct}%"></div>
                </div>
              </div>

              <!-- Hidratación recomendada -->
              <div class="hydration-banner">
                <div class="water-icon">💧</div>
                <div class="water-text">
                  <strong>Hidratación base recomendada:</strong>
                  <span><span id="live-water">${feedback.waterLiters}</span> Litros de agua al día</span>
                </div>
              </div>
            </div>
          </div>

          <!-- ZONAS CARDÍACAS KARVONEN -->
          <div class="card glass-card heart-zones-card">
            <div class="card-header">
              <div class="card-icon-box accent-coral">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
              </div>
              <div>
                <h3 class="card-title">Zonas de Frecuencia Cardíaca</h3>
                <p class="card-description">Método Karvonen (Reserva Cardíaca)</p>
              </div>
            </div>

            <div class="zones-list" id="zones-list">
              ${Object.values(feedback.hrZones).map((zone) => `
                <div class="zone-item">
                  <div class="zone-bar-indicator" style="background: ${zone.color}"></div>
                  <div class="zone-content">
                    <div class="zone-title-row">
                      <span class="zone-name">${zone.name}</span>
                      <span class="zone-range" style="color: ${zone.color}">${zone.min} - ${zone.max} lpm</span>
                    </div>
                    <div class="zone-sub">${zone.benefit}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    // Conectar eventos dinámicos
    this.attachEvents(container, profile);
  },

  attachEvents(container, currentProfile) {
    const form = container.querySelector('#profile-form');
    const saveBtn = container.querySelector('#btn-save-profile');

    const updateLiveCalculations = () => {
      const birthDate = container.querySelector('#prof-birth').value;
      const age = Biometrics.calculateAge(birthDate);
      const weight = parseFloat(container.querySelector('#prof-weight').value) || 75;
      const height = parseFloat(container.querySelector('#prof-height').value) || 175;
      const sex = container.querySelector('#prof-sex').value;
      const bodyFat = parseFloat(container.querySelector('#prof-fat').value) || null;
      const activity = container.querySelector('#prof-activity').value;
      const goal = container.querySelector('#prof-goal').value;
      const restingHr = parseInt(container.querySelector('#prof-rhr').value, 10) || 62;

      const tempProfile = {
        birth_date: birthDate,
        age,
        weight_kg: weight,
        height_cm: height,
        sex,
        body_fat_pct: bodyFat,
        activity_level: activity,
        goal,
        resting_heart_rate: restingHr
      };

      const fb = Biometrics.generatePersonalizedFeedback(tempProfile);
      if (!fb) return;

      container.querySelector('#live-bmr').textContent = fb.bmr;
      container.querySelector('#live-tdee').textContent = fb.tdee;
      container.querySelector('#live-bmi').textContent = fb.bmi.bmi;
      const bmiBadge = container.querySelector('#live-bmi-category');
      bmiBadge.textContent = fb.bmi.category;
      bmiBadge.style.background = `${fb.bmi.color}22`;
      bmiBadge.style.color = fb.bmi.color;

      container.querySelector('#live-max-hr').textContent = fb.maxHr;
      container.querySelector('#live-target-calories').textContent = `${fb.targetCalories} kcal`;
      container.querySelector('#live-strategy').textContent = fb.calorieStrategy;

      container.querySelector('#live-protein-g').textContent = `${fb.macros.protein.grams}g`;
      container.querySelector('#live-protein-pct').textContent = `${fb.macros.protein.pct}%`;
      container.querySelector('#bar-protein').style.width = `${fb.macros.protein.pct}%`;

      container.querySelector('#live-carbs-g').textContent = `${fb.macros.carbs.grams}g`;
      container.querySelector('#live-carbs-pct').textContent = `${fb.macros.carbs.pct}%`;
      container.querySelector('#bar-carbs').style.width = `${fb.macros.carbs.pct}%`;

      container.querySelector('#live-fat-g').textContent = `${fb.macros.fat.grams}g`;
      container.querySelector('#live-fat-pct').textContent = `${fb.macros.fat.pct}%`;
      container.querySelector('#bar-fat').style.width = `${fb.macros.fat.pct}%`;

      container.querySelector('#live-water').textContent = fb.waterLiters;

      // Actualizar Zonas Cardíacas
      const zonesList = container.querySelector('#zones-list');
      if (zonesList) {
        zonesList.innerHTML = Object.values(fb.hrZones).map((zone) => `
          <div class="zone-item">
            <div class="zone-bar-indicator" style="background: ${zone.color}"></div>
            <div class="zone-content">
              <div class="zone-title-row">
                <span class="zone-name">${zone.name}</span>
                <span class="zone-range" style="color: ${zone.color}">${zone.min} - ${zone.max} lpm</span>
              </div>
              <div class="zone-sub">${zone.benefit}</div>
            </div>
          </div>
        `).join('');
      }
    };

    // Escuchar cambios en cualquier input para actualizar feedback en tiempo real
    form.addEventListener('input', updateLiveCalculations);
    form.addEventListener('change', updateLiveCalculations);

    // Guardar perfil
    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      saveBtn.innerHTML = `
        <span class="spinner-small"></span>
        <span>Guardando...</span>
      `;

      try {
        const formData = {
          full_name: container.querySelector('#prof-name').value.trim(),
          sex: container.querySelector('#prof-sex').value,
          birth_date: container.querySelector('#prof-birth').value,
          height_cm: parseFloat(container.querySelector('#prof-height').value),
          weight_kg: parseFloat(container.querySelector('#prof-weight').value),
          target_weight_kg: parseFloat(container.querySelector('#prof-target-weight').value) || null,
          body_fat_pct: parseFloat(container.querySelector('#prof-fat').value) || null,
          resting_heart_rate: parseInt(container.querySelector('#prof-rhr').value, 10) || null,
          training_days_per_week: parseInt(container.querySelector('#prof-days').value, 10),
          activity_level: container.querySelector('#prof-activity').value,
          goal: container.querySelector('#prof-goal').value,
          experience_level: container.querySelector('#prof-exp').value,
          preferred_units: container.querySelector('#prof-units').value,
          injuries_notes: container.querySelector('#prof-injuries').value.trim()
        };

        await workoutService.saveProfile(formData);

        Toast.success('Perfil biométrico actualizado y sincronizado silenciosamente.', '¡Guardado!');
      } catch (err) {
        console.error('Error al guardar perfil:', err);
        Toast.error('No se pudo guardar el perfil: ' + err.message);
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          <span>Guardar y Sincronizar</span>
        `;
      }
    });
  }
};
