// ==============================================================================
// FITPULSE - BIOMETRIC & EXERCISE SCIENCE ENGINE
// Implementa fórmulas científicas validadas:
// - BMR: Mifflin-St Jeor & Katch-McArdle (con % de grasa corporal)
// - TDEE: Gasto Energético Total Diario según factor de actividad
// - IMC & Rango de Peso Saludable (OMS)
// - Frecuencia Cardíaca Máxima (Tanaka: 208 - 0.7*edad) y Zonas de Karvonen (HRR)
// - Estimación de 1RM: Epley & Brzycki
// - Calorías por Ejercicio (Cardio & Fuerza) usando el Compendio de Actividades Físicas (MET)
// - Generación de Feedback e Inteligencia de Rendimiento Deportivo
// ==============================================================================

export const Biometrics = {
  /**
   * Calcula la edad en años a partir de una fecha de nacimiento YYYY-MM-DD
   */
  calculateAge(birthDateStr) {
    if (!birthDateStr) return 28; // Valor medio por defecto
    const today = new Date();
    const birthDate = new Date(birthDateStr);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return Math.max(12, Math.min(100, age));
  },

  /**
   * Tasa Metabólica Basal (BMR) en kcal/día
   * Si se dispone de % de grasa corporal, utiliza la fórmula Katch-McArdle (más precisa).
   * Si no, utiliza la ecuación estándar Mifflin-St Jeor.
   */
  calculateBMR(weightKg, heightCm, age, sex = 'male', bodyFatPct = null) {
    const w = parseFloat(weightKg) || 75;
    const h = parseFloat(heightCm) || 175;
    const a = parseInt(age, 10) || 28;

    if (bodyFatPct && bodyFatPct > 3 && bodyFatPct < 60) {
      // Fórmula Katch-McArdle: BMR = 370 + (21.6 * Masa Magra en kg)
      const leanMassKg = w * (1 - bodyFatPct / 100);
      return Math.round(370 + 21.6 * leanMassKg);
    }

    // Ecuación Mifflin-St Jeor
    // Hombres: 10 * peso (kg) + 6.25 * altura (cm) - 5 * edad (años) + 5
    // Mujeres: 10 * peso (kg) + 6.25 * altura (cm) - 5 * edad (años) - 161
    const base = 10 * w + 6.25 * h - 5 * a;
    if (sex === 'female') {
      return Math.round(base - 161);
    }
    return Math.round(base + 5);
  },

  /**
   * Factores de actividad física para TDEE
   */
  ACTIVITY_FACTORS: {
    sedentary: { factor: 1.2, label: 'Sedentario (poco o nada de ejercicio)' },
    light: { factor: 1.375, label: 'Ligero (ejercicio 1-3 días/semana)' },
    moderate: { factor: 1.55, label: 'Moderado (ejercicio 3-5 días/semana)' },
    active: { factor: 1.725, label: 'Activo (ejercicio 6-7 días/semana)' },
    very_active: { factor: 1.9, label: 'Muy activo / Atleta (entrenamiento doble diario)' }
  },

  /**
   * Calcula el Gasto Energético Diario Total (TDEE)
   */
  calculateTDEE(bmr, activityLevel = 'moderate') {
    const factorObj = this.ACTIVITY_FACTORS[activityLevel] || this.ACTIVITY_FACTORS.moderate;
    return Math.round(bmr * factorObj.factor);
  },

  /**
   * Índice de Masa Corporal (IMC) y clasificación OMS
   */
  calculateBMI(weightKg, heightCm) {
    const w = parseFloat(weightKg) || 75;
    const hM = (parseFloat(heightCm) || 175) / 100;
    if (hM <= 0) return { bmi: 0, category: 'Desconocido', idealMin: 0, idealMax: 0 };
    
    const bmi = +(w / (hM * hM)).toFixed(1);
    let category = 'Normal';
    let color = 'var(--accent-emerald)';

    if (bmi < 18.5) {
      category = 'Bajo peso';
      color = 'var(--accent-amber)';
    } else if (bmi >= 18.5 && bmi < 25) {
      category = 'Normopeso';
      color = 'var(--accent-emerald)';
    } else if (bmi >= 25 && bmi < 30) {
      category = 'Sobrepeso';
      color = 'var(--accent-amber)';
    } else {
      category = 'Obesidad';
      color = 'var(--accent-crimson)';
    }

    const idealMin = +(18.5 * hM * hM).toFixed(1);
    const idealMax = +(24.9 * hM * hM).toFixed(1);

    return { bmi, category, color, idealMin, idealMax };
  },

  /**
   * Frecuencia Cardíaca Máxima (Fórmula Tanaka: 208 - 0.7 * edad)
   * Supera en precisión clínica al clásico 220 - edad.
   */
  calculateMaxHR(age) {
    const a = parseInt(age, 10) || 28;
    return Math.round(208 - 0.7 * a);
  },

  /**
   * Zonas de Frecuencia Cardíaca mediante el Método de Karvonen (Heart Rate Reserve)
   * Si no se especifica frecuencia en reposo, usa 65 lpm.
   */
  calculateHeartRateZones(maxHr, restingHr = 65) {
    const hrr = Math.max(30, maxHr - restingHr); // Reserva Cardíaca

    const calcZone = (pctLow, pctHigh) => ({
      min: Math.round(restingHr + hrr * pctLow),
      max: Math.round(restingHr + hrr * pctHigh)
    });

    return {
      zone1: {
        name: 'Zona 1 - Recuperación Activa',
        pct: '50% - 60%',
        ...calcZone(0.50, 0.60),
        color: '#4facfe',
        benefit: 'Regeneración, calentamiento y circulación'
      },
      zone2: {
        name: 'Zona 2 - Quema de Grasa / Base Aeróbica',
        pct: '60% - 70%',
        ...calcZone(0.60, 0.70),
        color: '#10b981',
        benefit: 'Máxima oxidación de grasas y biogénesis mitocondrial'
      },
      zone3: {
        name: 'Zona 3 - Capacidad Aeróbica (Tempo)',
        pct: '70% - 80%',
        ...calcZone(0.70, 0.80),
        color: '#f59e0b',
        benefit: 'Desarrollo de resistencia cardiovascular y eficiencia'
      },
      zone4: {
        name: 'Zona 4 - Umbral Anaeróbico / Lactato',
        pct: '80% - 90%',
        ...calcZone(0.80, 0.90),
        color: '#f97316',
        benefit: 'Incremento del VO2 máx y tolerancia al lactato'
      },
      zone5: {
        name: 'Zona 5 - Potencia Máxima / Anaeróbica',
        pct: '90% - 100%',
        ...calcZone(0.90, 1.0),
        color: '#ef4444',
        benefit: 'Esfuerzos explosivos cortos y velocidad neuromuscular'
      }
    };
  },

  /**
   * Estimación de 1RM (Una Repetición Máxima) para ejercicios de fuerza
   * Utiliza la fórmula de Epley para 1-12 repeticiones: Peso * (1 + Reps / 30)
   * y combina con la de Brzycki para mayor precisión.
   */
  calculate1RM(weightKg, reps) {
    const w = parseFloat(weightKg) || 0;
    const r = parseInt(reps, 10) || 0;
    if (w <= 0 || r <= 0) return 0;
    if (r === 1) return w;
    if (r > 30) return Math.round(w * 1.5); // Límite para repeticiones muy altas donde 1RM pierde validez

    // Epley
    const epley = w * (1 + r / 30);
    // Brzycki: w / (1.0278 - 0.0278 * r)
    const brzycki = r < 36 ? w / (1.0278 - 0.0278 * r) : epley;

    // Promedio ponderado
    const estimate = (epley + brzycki) / 2;
    return +estimate.toFixed(1);
  },

  /**
   * Cálculo de calorías quemadas en Cardio según MET (Metabolic Equivalent of Task)
   * Fórmula del Compendio de Actividades Físicas:
   * Calorías = MET * Peso(kg) * (Duración en minutos / 60)
   */
  calculateCardioCalories(met, weightKg, durationMinutes) {
    const m = parseFloat(met) || 6.0;
    const w = parseFloat(weightKg) || 75;
    const t = parseFloat(durationMinutes) || 0;
    if (t <= 0) return 0;
    return Math.round(m * w * (t / 60));
  },

  /**
   * Cálculo de calorías quemadas en Fuerza / Musculación
   * Se basa en MET (~4.0 moderado, ~6.0 intenso) ajustado por volumen de series efectivas
   */
  calculateStrengthCalories(weightKg, durationMinutes, setsCount = 10, isIntense = true) {
    const w = parseFloat(weightKg) || 75;
    const t = parseFloat(durationMinutes) || 45;
    // Base MET para entrenamiento de sobrecarga
    const baseMet = isIntense ? 5.5 : 3.8;
    const baseCalories = baseMet * w * (t / 60);
    // Corrección por densidad de series (más series = mayor gasto EPOC)
    const setBonus = Math.min(setsCount * 2.5, 120);
    return Math.round(baseCalories + setBonus);
  },

  /**
   * Genera recomendaciones de nutrición, macros y pautas de entrenamiento
   * personalizadas para el perfil del usuario.
   */
  generatePersonalizedFeedback(profile) {
    if (!profile) return null;

    const age = profile.birth_date ? this.calculateAge(profile.birth_date) : (profile.age || 28);
    const weight = parseFloat(profile.weight_kg) || 75;
    const height = parseFloat(profile.height_cm) || 175;
    const sex = profile.sex || 'male';
    const bodyFat = profile.body_fat_pct ? parseFloat(profile.body_fat_pct) : null;
    const activity = profile.activity_level || 'moderate';
    const goal = profile.goal || 'muscle_gain';

    const bmr = this.calculateBMR(weight, height, age, sex, bodyFat);
    const tdee = this.calculateTDEE(bmr, activity);
    const maxHr = this.calculateMaxHR(age);
    const hrZones = this.calculateHeartRateZones(maxHr, profile.resting_heart_rate || 65);
    const bmiData = this.calculateBMI(weight, height);

    // Objetivos calóricos según meta
    let targetCalories = tdee;
    let calorieStrategy = 'Mantenimiento y recomposición corporal';
    let proteinGramsPerKg = 1.8;

    if (goal === 'fat_loss') {
      targetCalories = Math.round(tdee - 450); // Déficit moderado sostenible
      calorieStrategy = 'Déficit calórico moderado (~450 kcal) para preservar masa muscular';
      proteinGramsPerKg = 2.2; // Alta proteína en definición
    } else if (goal === 'muscle_gain') {
      targetCalories = Math.round(tdee + 300); // Superávit limpio
      calorieStrategy = 'Superávit calórico controlado (+300 kcal) para hipertrofia magra';
      proteinGramsPerKg = 2.0;
    } else if (goal === 'strength') {
      targetCalories = Math.round(tdee + 150);
      calorieStrategy = 'Balance energético ligeramente positivo para soporte neuromuscular';
      proteinGramsPerKg = 1.9;
    } else if (goal === 'endurance') {
      targetCalories = Math.round(tdee + 100);
      calorieStrategy = 'Aporte enfocado en reabastecimiento de glucógeno y resistencia';
      proteinGramsPerKg = 1.6;
    }

    // Macronutrientes sugeridos
    const proteinGrams = Math.round(weight * proteinGramsPerKg);
    const proteinCalories = proteinGrams * 4;
    
    // Grasas saludables: ~0.9g por kg
    const fatGrams = Math.round(weight * 0.9);
    const fatCalories = fatGrams * 9;

    // Carbohidratos: el resto de las calorías
    const remainingCalories = Math.max(0, targetCalories - (proteinCalories + fatCalories));
    const carbGrams = Math.round(remainingCalories / 4);

    // Ingesta diaria de agua recomendada (35ml por kg de peso + 500ml por entrenamiento)
    const waterLiters = +((weight * 0.035) + 0.6).toFixed(1);

    return {
      age,
      bmr,
      tdee,
      targetCalories,
      calorieStrategy,
      macros: {
        protein: { grams: proteinGrams, calories: proteinCalories, pct: Math.round((proteinCalories / targetCalories) * 100) },
        fat: { grams: fatGrams, calories: fatCalories, pct: Math.round((fatCalories / targetCalories) * 100) },
        carbs: { grams: carbGrams, calories: remainingCalories, pct: Math.round((remainingCalories / targetCalories) * 100) }
      },
      waterLiters,
      bmi: bmiData,
      maxHr,
      hrZones
    };
  }
};
