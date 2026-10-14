// ==============================================================================
// FITPULSE - EXERCISE CATALOG & MET VALUES
// Catálogo completo con valores de MET (Compendio de Actividades Físicas de Ainsworth),
// músculos principales, equipamiento y recomendaciones de ejecución.
// ==============================================================================

export const EXERCISE_CATALOG = [
  // --- PECHO ---
  {
    id: 'bench_press_barbell',
    name: 'Press de Banca Plano con Barra',
    category: 'Pecho',
    type: 'strength',
    primaryMuscle: 'Pectoral Mayor',
    secondaryMuscles: ['Tríceps', 'Deltoides Anterior'],
    equipment: 'Barra y Banco',
    metValue: 6.0,
    tips: 'Retrae las escápulas, apoya los pies firmemente y controla el descenso hasta rozar el esternón.'
  },
  {
    id: 'incline_dumbbell_press',
    name: 'Press Inclinado con Mancuernas',
    category: 'Pecho',
    type: 'strength',
    primaryMuscle: 'Pectoral Superior (Clavicular)',
    secondaryMuscles: ['Deltoides Anterior', 'Tríceps'],
    equipment: 'Mancuernas y Banco Inclinado (30°-45°)',
    metValue: 5.5,
    tips: 'Excelente para enfatizar la porción superior del pecho con mayor rango de recorrido que la barra.'
  },
  {
    id: 'pushups',
    name: 'Flexiones de Brazos (Push-Ups)',
    category: 'Pecho',
    type: 'strength',
    primaryMuscle: 'Pectoral Mayor',
    secondaryMuscles: ['Tríceps', 'Core', 'Serrato Anterior'],
    equipment: 'Peso Corporal',
    metValue: 4.8,
    tips: 'Mantén el cuerpo en línea recta sin que caiga la cadera. Codos a 45 grados del torso.'
  },
  {
    id: 'cable_crossover',
    name: 'Cruces en Polea para Pecho',
    category: 'Pecho',
    type: 'strength',
    primaryMuscle: 'Pectoral Mayor (Aislamiento)',
    secondaryMuscles: ['Deltoides Anterior'],
    equipment: 'Torre de Poleas',
    metValue: 4.2,
    tips: 'Concéntrate en la contracción máxima en el punto medio apretando el pecho 1 segundo.'
  },
  {
    id: 'chest_dips',
    name: 'Fondos en Paralelas (Pecho)',
    category: 'Pecho',
    type: 'strength',
    primaryMuscle: 'Pectoral Inferior',
    secondaryMuscles: ['Tríceps', 'Deltoides Anterior'],
    equipment: 'Barras Paralelas',
    metValue: 6.5,
    tips: 'Inclina el torso ligeramente hacia adelante para transferir el estímulo de los tríceps al pecho.'
  },

  // --- ESPALDA ---
  {
    id: 'pullups',
    name: 'Dominadas Pronas (Pull-ups)',
    category: 'Espalda',
    type: 'strength',
    primaryMuscle: 'Dorsal Ancho',
    secondaryMuscles: ['Bíceps', 'Braquial', 'Redondo Mayor', 'Trapecio Medio'],
    equipment: 'Barra de Dominadas',
    metValue: 7.0,
    tips: 'Inicia el movimiento deprimiendo las escápulas. Lleva el pecho a la barra, no solo la barbilla.'
  },
  {
    id: 'deadlift_barbell',
    name: 'Peso Muerto Convencional con Barra',
    category: 'Espalda',
    type: 'strength',
    primaryMuscle: 'Cadena Posterior (Erectores Espinales, Glúteos)',
    secondaryMuscles: ['Isquiosurales', 'Dorsales', 'Trapecios', 'Antebrazos'],
    equipment: 'Barra Olímpica y Discos',
    metValue: 8.0,
    tips: 'Mantén la barra pegada a las espinillas. Empuja el piso con las piernas en lugar de tirar con la espalda baja.'
  },
  {
    id: 'barbell_row',
    name: 'Remo con Barra Inclinado (Bent-over Row)',
    category: 'Espalda',
    type: 'strength',
    primaryMuscle: 'Dorsal Ancho y Trapecios',
    secondaryMuscles: ['Romboides', 'Bíceps', 'Erectores Espinales'],
    equipment: 'Barra',
    metValue: 6.0,
    tips: 'Espalda neutra a 45 grados. Tira de la barra hacia la parte baja del abdomen o cadera.'
  },
  {
    id: 'lat_pulldown',
    name: 'Jalón al Pecho en Polea',
    category: 'Espalda',
    type: 'strength',
    primaryMuscle: 'Dorsal Ancho',
    secondaryMuscles: ['Bíceps', 'Redondo Mayor'],
    equipment: 'Máquina de Polea Alta',
    metValue: 4.8,
    tips: 'Evita balancear el torso excesivamente hacia atrás. Conduce los codos hacia abajo y atrás.'
  },
  {
    id: 'single_arm_dumbbell_row',
    name: 'Remo con Mancuerna a una Mano',
    category: 'Espalda',
    type: 'strength',
    primaryMuscle: 'Dorsal Ancho',
    secondaryMuscles: ['Romboides', 'Bíceps'],
    equipment: 'Mancuerna y Banco',
    metValue: 5.0,
    tips: 'Siente el estiramiento completo en la parte baja sin rotar el torso bruscamente.'
  },

  // --- PIERNAS ---
  {
    id: 'barbell_back_squat',
    name: 'Sentadilla Trasera con Barra (Squat)',
    category: 'Piernas',
    type: 'strength',
    primaryMuscle: 'Cuádriceps y Glúteos',
    secondaryMuscles: ['Isquiosurales', 'Aductores', 'Core'],
    equipment: 'Rack y Barra Olímpica',
    metValue: 7.5,
    tips: 'Pies al ancho de hombros, rompe el paralelo con las caderas controlando las rodillas hacia afuera.'
  },
  {
    id: 'romanian_deadlift',
    name: 'Peso Muerto Rumano (RDL)',
    category: 'Piernas',
    type: 'strength',
    primaryMuscle: 'Isquiosurales y Glúteos',
    secondaryMuscles: ['Erectores de Columna', 'Core'],
    equipment: 'Barra o Mancuernas',
    metValue: 6.2,
    tips: 'Bisagra de cadera pura: empuja los glúteos hacia la pared trasera sintiendo el estiramiento en isquios.'
  },
  {
    id: 'leg_press',
    name: 'Prensa de Piernas Inclinada 45°',
    category: 'Piernas',
    type: 'strength',
    primaryMuscle: 'Cuádriceps',
    secondaryMuscles: ['Glúteos'],
    equipment: 'Máquina de Prensa',
    metValue: 5.5,
    tips: 'No bloquees las rodillas al final del recorrido y no permitas que la pelvis se despegue del respaldo.'
  },
  {
    id: 'walking_lunges',
    name: 'Zancadas Caminando con Mancuernas',
    category: 'Piernas',
    type: 'strength',
    primaryMuscle: 'Glúteos y Cuádriceps',
    secondaryMuscles: ['Isquiosurales', 'Gemelos', 'Equilibrio'],
    equipment: 'Mancuernas',
    metValue: 6.5,
    tips: 'Pasos amplios y controlados. La rodilla delantera debe estar alineada sobre el tobillo.'
  },
  {
    id: 'leg_curl_seated',
    name: 'Curl Femoral Acostado o Sentado',
    category: 'Piernas',
    type: 'strength',
    primaryMuscle: 'Isquiosurales',
    secondaryMuscles: ['Gemelos'],
    equipment: 'Máquina de Femoral',
    metValue: 4.2,
    tips: 'Controla la fase excéntrica (bajada) en 2 a 3 segundos.'
  },
  {
    id: 'standing_calf_raise',
    name: 'Elevación de Gemelos de Pie',
    category: 'Piernas',
    type: 'strength',
    primaryMuscle: 'Gastrocnemio (Gemelos)',
    secondaryMuscles: ['Sóleo'],
    equipment: 'Máquina o Mancuernas',
    metValue: 4.0,
    tips: 'Pausa de 1 segundo en el estiramiento profundo y 1 segundo en la contracción máxima arriba.'
  },

  // --- HOMBROS ---
  {
    id: 'overhead_barbell_press',
    name: 'Press Militar de Pie con Barra (OHP)',
    category: 'Hombros',
    type: 'strength',
    primaryMuscle: 'Deltoides Anterior y Medio',
    secondaryMuscles: ['Tríceps', 'Trapecio Superior', 'Core'],
    equipment: 'Barra Olímpica',
    metValue: 6.0,
    tips: 'Aprieta glúteos y abdomen para mantener la columna estable. Termina con los brazos alineados a las orejas.'
  },
  {
    id: 'lateral_dumbbell_raises',
    name: 'Elevaciones Laterales con Mancuernas',
    category: 'Hombros',
    type: 'strength',
    primaryMuscle: 'Deltoides Lateral (Medio)',
    secondaryMuscles: ['Trapecio Superior'],
    equipment: 'Mancuernas',
    metValue: 4.2,
    tips: 'Lidera con los codos en el plano escapular (30° adelante). No uses impulso de cadera.'
  },
  {
    id: 'face_pull_cables',
    name: 'Face Pull con Cuerda en Polea',
    category: 'Hombros',
    type: 'strength',
    primaryMuscle: 'Deltoides Posterior y Manguito Rotador',
    secondaryMuscles: ['Romboides', 'Trapecio Medio e Inferior'],
    equipment: 'Polea con Cuerda',
    metValue: 4.0,
    tips: 'Excelente para salud del hombro y postura. Tira de la cuerda hacia los ojos con rotación externa.'
  },
  {
    id: 'arnold_press',
    name: 'Press Arnold con Mancuernas',
    category: 'Hombros',
    type: 'strength',
    primaryMuscle: 'Deltoides (Anterior y Medio)',
    secondaryMuscles: ['Tríceps'],
    equipment: 'Mancuernas y Banco',
    metValue: 5.2,
    tips: 'Inicia con las palmas mirando hacia ti y rota suavemente mientras presionas hacia arriba.'
  },

  // --- BRAZOS ---
  {
    id: 'barbell_biceps_curl',
    name: 'Curl de Bíceps con Barra EZ o Recta',
    category: 'Brazos',
    type: 'strength',
    primaryMuscle: 'Bíceps Braquial',
    secondaryMuscles: ['Braquial Anterior', 'Antebrazos'],
    equipment: 'Barra EZ / Recta',
    metValue: 4.5,
    tips: 'Mantén los codos fijos al costado del cuerpo sin balancear la espalda.'
  },
  {
    id: 'incline_dumbbell_curl',
    name: 'Curl Inclinado en Banco con Mancuernas',
    category: 'Brazos',
    type: 'strength',
    primaryMuscle: 'Cabeza Larga del Bíceps',
    secondaryMuscles: ['Braquial'],
    equipment: 'Mancuernas y Banco Inclinado',
    metValue: 4.0,
    tips: 'Proporciona el máximo estiramiento en la cabeza larga del bíceps para mayor pico.'
  },
  {
    id: 'skullcrushers',
    name: 'Press Francés en Banco (Skullcrusher)',
    category: 'Brazos',
    type: 'strength',
    primaryMuscle: 'Tríceps (Cabeza Larga)',
    secondaryMuscles: ['Antebrazos'],
    equipment: 'Barra EZ y Banco',
    metValue: 4.5,
    tips: 'Baja la barra hacia la coronilla o detrás de la cabeza para proteger los codos.'
  },
  {
    id: 'triceps_rope_pushdown',
    name: 'Extensión de Tríceps en Polea con Cuerda',
    category: 'Brazos',
    type: 'strength',
    primaryMuscle: 'Tríceps (Cabeza Lateral)',
    secondaryMuscles: ['Cabeza Medial'],
    equipment: 'Polea y Cuerda',
    metValue: 4.0,
    tips: 'Separa la cuerda en la parte inferior para máxima contracción de los tríceps.'
  },

  // --- CORE & ABDOMEN ---
  {
    id: 'plank_isometric',
    name: 'Plancha Abdominal Isométrica (Plank)',
    category: 'Core',
    type: 'duration',
    primaryMuscle: 'Transverso Abdominal y Recto Abdominal',
    secondaryMuscles: ['Glúteos', 'Hombros', 'Serrato'],
    equipment: 'Esterilla',
    metValue: 4.0,
    tips: 'Contrae glúteos fuertemente y no permitas que la pelvis caiga. Respira de manera controlada.'
  },
  {
    id: 'hanging_leg_raises',
    name: 'Elevación de Piernas Colgado en Barra',
    category: 'Core',
    type: 'strength',
    primaryMuscle: 'Recto Abdominal Inferior',
    secondaryMuscles: ['Flexores de Cadera', 'Antebrazos'],
    equipment: 'Barra de Dominadas',
    metValue: 5.5,
    tips: 'Evita el balanceo. Eleva la pelvis hacia el pecho, no solo las piernas.'
  },
  {
    id: 'ab_wheel_rollout',
    name: 'Rueda Abdominal (Ab Wheel Rollout)',
    category: 'Core',
    type: 'strength',
    primaryMuscle: 'Pared Abdominal Completa',
    secondaryMuscles: ['Dorsales', 'Hombros'],
    equipment: 'Rueda Abdominal',
    metValue: 6.0,
    tips: 'Mantén una ligera curvatura dorsal protegida. Rueda hasta donde tu core pueda controlar el regreso.'
  },

  // --- CARDIO & RESISTENCIA ---
  {
    id: 'running_treadmill_outdoor',
    name: 'Carrera Continua (Running ~10 km/h)',
    category: 'Cardio',
    type: 'cardio',
    primaryMuscle: 'Sistema Cardiovascular / Piernas',
    secondaryMuscles: ['Pantorrillas', 'Glúteos', 'Isquios'],
    equipment: 'Cinta o Exterior',
    metValue: 9.8,
    tips: 'Mantén una cadencia cercana a 170-180 pasos por minuto y postura erguida relajada.'
  },
  {
    id: 'cycling_stationary_road',
    name: 'Ciclismo / Bicicleta Estática (Moderado-Vigoroso)',
    category: 'Cardio',
    type: 'cardio',
    primaryMuscle: 'Cuádriceps y Sistema Aeróbico',
    secondaryMuscles: ['Glúteos', 'Isquiosurales'],
    equipment: 'Bicicleta',
    metValue: 8.0,
    tips: 'Ajusta la altura del sillín para que la pierna quede con una ligera flexión de 15° al final de la pedalada.'
  },
  {
    id: 'rowing_machine_erg',
    name: 'Remo Ergómetro (Concept2)',
    category: 'Cardio',
    type: 'cardio',
    primaryMuscle: 'Espalda, Piernas y Sistema Cardiovascular',
    secondaryMuscles: ['Bíceps', 'Glúteos', 'Core'],
    equipment: 'Máquina de Remo',
    metValue: 8.5,
    tips: 'Secuencia: Piernas -> Torso -> Brazos en la fase de empuje; Brazos -> Torso -> Piernas en la recuperación.'
  },
  {
    id: 'jump_rope_cardio',
    name: 'Salto a la Cuerda (Jump Rope)',
    category: 'Cardio',
    type: 'cardio',
    primaryMuscle: 'Gemelos, Agilidad y Sistema Cardiovascular',
    secondaryMuscles: ['Hombros', 'Antebrazos', 'Core'],
    equipment: 'Cuerda de Salto',
    metValue: 11.0,
    tips: 'Salta sobre las puntas de los pies apenas a unos centímetros del suelo. Gira la cuerda desde las muñecas.'
  },
  {
    id: 'incline_treadmill_walking',
    name: 'Caminata Inclinada (12% Inclinación / 5 km/h)',
    category: 'Cardio',
    type: 'cardio',
    primaryMuscle: 'Glúteos, Gemelos y Quema de Grasa',
    secondaryMuscles: ['Isquiosurales'],
    equipment: 'Cinta con Inclinación',
    metValue: 6.0,
    tips: 'No te apoyes en los pasamanos para no falsear el gasto calórico ni la postura.'
  },

  // --- HIIT & FUNCIONAL ---
  {
    id: 'burpees_hiit',
    name: 'Burpees con Salto',
    category: 'HIIT / Funcional',
    type: 'cardio',
    primaryMuscle: 'Cuerpo Completo y Alta Potencia',
    secondaryMuscles: ['Pectorales', 'Cuádriceps', 'Core'],
    equipment: 'Peso Corporal',
    metValue: 10.5,
    tips: 'Aterriza suavemente para proteger las articulaciones y mantén un ritmo respiratorio constante.'
  },
  {
    id: 'kettlebell_swings',
    name: 'Kettlebell Swings Rusos',
    category: 'HIIT / Funcional',
    type: 'strength',
    primaryMuscle: 'Glúteos y Cadena Posterior',
    secondaryMuscles: ['Isquiosurales', 'Hombros', 'Core'],
    equipment: 'Pesa Rusa (Kettlebell)',
    metValue: 9.0,
    tips: 'El movimiento proviene de la extensión explosiva de cadera, no de elevar la pesa con los hombros.'
  },
  {
    id: 'box_jumps',
    name: 'Saltos al Cajón Pliométricos',
    category: 'HIIT / Funcional',
    type: 'strength',
    primaryMuscle: 'Cuádriceps y Glúteos (Potencia)',
    secondaryMuscles: ['Gemelos', 'Core'],
    equipment: 'Cajón Pliométrico',
    metValue: 8.0,
    tips: 'Aterriza en sentadilla suave amortiguando el impacto. Baja dando un paso hacia atrás en lugar de saltar.'
  },

  // --- MOVILIDAD & RECUPERACIÓN ---
  {
    id: 'vinyasa_yoga',
    name: 'Yoga Dinámico / Vinyasa Flow',
    category: 'Movilidad',
    type: 'duration',
    primaryMuscle: 'Movilidad Articular y Flexibilidad Global',
    secondaryMuscles: ['Core', 'Equilibrio'],
    equipment: 'Esterilla',
    metValue: 3.5,
    tips: 'Sincroniza cada movimiento con la respiración profunda nasal.'
  },
  {
    id: 'foam_rolling_mobility',
    name: 'Liberación Miofascial con Foam Roller',
    category: 'Movilidad',
    type: 'duration',
    primaryMuscle: 'Tejido Miofascial y Recuperación',
    secondaryMuscles: ['Circulación Sanguínea'],
    equipment: 'Rodillo de Espuma',
    metValue: 2.5,
    tips: 'Rueda lentamente y sostén la presión en los puntos gatillo tensos durante 20 a 30 segundos.'
  }
];

export const CATEGORIES = [
  'Todos',
  'Pecho',
  'Espalda',
  'Piernas',
  'Hombros',
  'Brazos',
  'Core',
  'Cardio',
  'HIIT / Funcional',
  'Movilidad'
];
