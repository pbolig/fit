# FitPulse ⚡ - Plataforma de Entrenamiento & Motor Biométrico Offline-First

Aplicación web progresiva (PWA) construida con **JavaScript Nativo (Vanilla JS, HTML5 y CSS3)** sin dependencias de compilación externa, optimizada para ejecutarse a máxima velocidad, operar **100% offline-first** y desplegarse automáticamente en **GitHub Pages** al hacer `git push`.

---

## 🌟 Características Principales

### 1. Despliegue Automático en GitHub Pages
* **Flujo CI/CD (`.github/workflows/deploy.yml`)**: Cada vez que haces `git push` a la rama `main`, GitHub Actions construye y publica automáticamente tu aplicación en tus Active Pages sin intervención manual.

### 2. Tarea Cron Keep-Alive para Supabase
* **Flujo Programado (`.github/workflows/supabase-keepalive.yml`)**: Supabase pausa los proyectos de nivel gratuito tras 7 días de inactividad. Esta tarea cron se ejecuta automáticamente cada **3 días** a las 04:00 UTC haciendo un ping ligero al endpoint REST de Supabase, manteniendo tu base de datos activa y lista las 24 horas del día.

### 3. Autenticación Flexible
* **Ingreso con Cuenta de Google (OAuth)** mediante el servicio de Supabase Auth.
* **Registro e Ingreso clásico con Correo y Contraseña**.
* **Modo Invitado / Local**: Puedes usar y explorar la aplicación inmediatamente sin conexión ni necesidad de registrarte; tus datos quedan guardados en tu navegador y se sincronizan cuando vincules tu cuenta.

### 4. Arquitectura Offline-First con Sincronización Silenciosa
* **Persistencia Local con IndexedDB**: Todas las operaciones (guardar perfil, registrar pesajes, registrar entrenamientos, modificar series) se escriben instantáneamente en la base de datos local del navegador. La interfaz responde en 0 ms sin depender de la velocidad de tu internet.
* **Cola de Sincronización en Segundo Plano (Outbox Sync Queue)**: Al detectar conexión a internet (`window.addEventListener('online')` y latido periódico), el sistema procesa silenciosamente todos los cambios pendientes y los envía a Supabase sin bloquear al usuario ni interrumpir su sesión de entrenamiento.
* **Service Worker (`sw.js`)**: Cachea los archivos estáticos para que la aplicación funcione incluso si abres el navegador en un sótano o en modo avión.

---

## 🔬 Motor Biométrico & Ciencia del Deporte (Fase 1)

El sistema integra fórmulas científicas validadas para calcular información útil y precisa para cada ejercicio y deportista:

1. **Tasa Metabólica Basal (BMR)**:
   * **Mifflin-St Jeor**: Considerada la fórmula más precisa para la población general según la Academia de Nutrición y Dietética.
   * **Katch-McArdle**: Se activa automáticamente si el usuario ingresa su porcentaje de grasa corporal, calculando el gasto metabólico sobre su masa libre de grasa.
2. **Gasto Energético Total Diario (TDEE)**:
   * Ajuste según factor de actividad física (Sedentario `1.2` hasta Atleta de Élite `1.9`).
3. **Frecuencia Cardíaca Máxima & Zonas de Entrenamiento**:
   * **Fórmula de Tanaka**: `FC Máx = 208 - (0.7 × Edad)` (mayor precisión clínica que el clásico 220 - edad).
   * **Método de Karvonen (Heart Rate Reserve)**: Calcula las 5 zonas de entrenamiento cardiovascular (Z1 Recuperación, Z2 Quema de grasa, Z3 Tempo, Z4 Umbral de lactato, Z5 Potencia máxima) a partir de la frecuencia cardíaca en reposo del atleta.
4. **Estimación de 1RM (Fuerza Máxima)**:
   * Combina las ecuaciones de **Epley** y **Brzycki** para proyectar tu fuerza máxima a 1 repetición en cada ejercicio según el peso y las repeticiones ejecutadas.
5. **Gasto Calórico por Ejercicio**:
   * **Cardio**: Se basa en el **Compendio de Actividades Físicas de Ainsworth (MET)**:
     $$\text{Calorías} = \text{MET} \times \text{Peso (kg)} \times \frac{\text{Minutos}}{60}$$
   * **Fuerza**: Modelo híbrido que computa el volumen de sobrecarga, número de series efectivas y gasto térmico residual (EPOC).
6. **Recomendaciones Nutricionales**:
   * Pautas sugeridas de calorías según el objetivo (Superávit para hipertrofia, déficit moderado para definición, mantenimiento).
   * Distribución de macronutrientes (Proteínas en g/kg, grasas saludables y carbohidratos).
   * Ingesta hídrica diaria recomendada según el peso y la actividad.

---

## 📁 Estructura del Proyecto

```text
fit/
├── .github/
│   └── workflows/
│       ├── deploy.yml              # CI/CD Despliegue automático a GitHub Pages
│       └── supabase-keepalive.yml  # Tarea cron periódica para mantener activa la base de datos
├── css/
│   ├── variables.css               # Paleta obsidian, acentos neón y tokens
│   ├── base.css                    # Reset, tipografías y micro-animaciones
│   ├── components.css              # Cards glassmorphism, botones, badges, modales, toasts
│   ├── layout.css                  # App shell, sidebar de escritorio y navegación móvil
│   └── views.css                   # Vistas de Dashboard, Perfil Biométrico, Logger y Ajustes
├── js/
│   ├── config.js                   # Constantes de almacenamiento y parámetros
│   ├── db/
│   │   ├── indexedDB.js            # Motor local-first con cola de sincronización
│   │   ├── supabaseClient.js       # Integración con el cliente Supabase
│   │   └── syncManager.js          # Sincronizador silencioso en segundo plano
│   ├── services/
│   │   ├── authService.js          # Proveedor de Google OAuth, Email y Modo Invitado
│   │   ├── biometrics.js           # Fórmulas científicas (BMR, TDEE, Karvonen, 1RM, MET)
│   │   ├── exerciseCatalog.js      # Catálogo de 50+ ejercicios con músculos y valores MET
│   │   └── workoutService.js       # Lógica de sesiones, series activas y cronómetros
│   ├── ui/
│   │   ├── router.js               # Enrutador cliente SPA con navegación por hash
│   │   ├── toast.js                # Notificaciones elegantes
│   │   ├── charts.js               # Gráficos Canvas nativos ultra-ligeros (Retina display)
│   │   └── views/
│   │       ├── dashboardView.js    # Hub de racha semanal, métricas y devolución de IA
│   │       ├── profileView.js      # Fase 1: Perfil biométrico completo y cálculo en vivo
│   │       ├── workoutView.js      # Logger interactivo en vivo con cronómetro de descanso
│   │       ├── historyView.js      # Historial de sesiones, pesajes y récords personales (PR)
│   │       ├── catalogView.js      # Enciclopedia interactiva de ejercicios
│   │       └── settingsView.js     # Configuración de Supabase, monitor de sync y ayuda
│   └── app.js                      # Inicializador principal y registro de Service Worker
├── sql/
│   └── schema.sql                  # Esquema PostgreSQL completo para Supabase (Tablas, RLS y Triggers)
├── index.html                      # Punto de entrada HTML5 semántico y accesible
├── manifest.webmanifest            # Manifiesto PWA para instalación móvil y escritorio
├── sw.js                           # Service Worker para funcionamiento 100% offline
└── README.md                       # Documentación técnica
```

---

## 🚀 Guía de Configuración Paso a Paso

### Paso 1: Configurar la Base de Datos en Supabase
1. Ingresa a [supabase.com](https://supabase.com) y crea un nuevo proyecto gratuito.
2. Dirígete a la pestaña **SQL Editor** en el panel lateral de Supabase.
3. Abre el archivo [`sql/schema.sql`](./sql/schema.sql) de este repositorio, copia todo su contenido y pégalo en el editor SQL de Supabase.
4. Presiona **Run**. Esto creará:
   - Tabla `profiles` con todos los campos antropométricos y triggers automáticos.
   - Tabla `workout_sessions` para el historial de entrenamientos.
   - Tabla `workout_exercises` para cada ejercicio, series y 1RM.
   - Tabla `body_metrics_log` para la evolución de pesajes.
   - Políticas de seguridad por fila (**Row Level Security - RLS**) asegurando que cada atleta solo acceda a su propia información.
5. Ve a **Project Settings** &rarr; **API** y copia:
   - **Project URL** (ejemplo: `https://abcdefghijkl.supabase.co`)
   - **anon public key** (ejemplo: `eyJhbGciOiJIUzI1NiIsInR5cCI6...`)

---

### Paso 2: Configurar Google OAuth en Supabase (Opcional para ingreso con Google)
1. En tu panel de Supabase ve a **Authentication** &rarr; **Providers** &rarr; **Google**.
2. Activa el interruptor **Enable Google provider**.
3. En [Google Cloud Console](https://console.cloud.google.com/apis/credentials), crea un ID de cliente de OAuth 2.0 de tipo *Aplicación Web*.
4. Añade a los orígenes de JavaScript autorizados la URL de tu GitHub Pages (ej. `https://tu-usuario.github.io`).
5. Añade a los URI de redireccionamiento autorizados la URL provista por Supabase (ej. `https://tu-proyecto.supabase.co/auth/v1/callback`).
6. Copia el **Client ID** y **Client Secret** de Google en el formulario de Supabase y guarda los cambios.

---

### Paso 3: Configurar GitHub Pages y Secrets para la Tarea Cron
1. En tu repositorio de GitHub, ve a **Settings** &rarr; **Pages**.
2. En **Build and deployment** &rarr; **Source**, selecciona **GitHub Actions**.
3. Para que la tarea cron (`supabase-keepalive.yml`) pueda enviar el ping a Supabase, ve a **Settings** &rarr; **Secrets and variables** &rarr; **Actions** y añade dos secretos:
   - `SUPABASE_URL`: Tu Project URL de Supabase.
   - `SUPABASE_ANON_KEY`: Tu clave anónima pública de Supabase.

¡Listo! Cada vez que hagas `git push` a `main`, GitHub Pages desplegará automáticamente la última versión, y la tarea cron se ejecutará cada 3 días para mantener la base de datos siempre activa.

---

## 💻 Ejecución y Prueba Local

Puedes probar la aplicación en tu máquina con cualquier servidor local simple:

```bash
# Con Python 3:
python -m http.server 8080

# O con Node.js:
npx serve .
```

Abre tu navegador en `http://localhost:8080` y disfruta de la experiencia.
