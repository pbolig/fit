-- ==============================================================================
-- FITPULSE - DATABASE SCHEMA FOR SUPABASE (POSTGRESQL)
-- Incluye: Tablas con RLS, Perfil Biométrico, Sesiones de Entrenamiento,
--          Ejercicios, Historial de Métricas y Triggers automáticos.
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TABLA: PROFILES (Perfil de Atleta y Métricas Biométricas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    
    -- Datos biométricos primarios
    sex TEXT CHECK (sex IN ('male', 'female', 'other')) DEFAULT 'male',
    birth_date DATE,
    age INTEGER,
    height_cm NUMERIC(5, 2) CHECK (height_cm > 50 AND height_cm < 260),
    weight_kg NUMERIC(5, 2) CHECK (weight_kg > 20 AND weight_kg < 350),
    target_weight_kg NUMERIC(5, 2),
    
    -- Métricas avanzadas opcionales
    body_fat_pct NUMERIC(4, 1) CHECK (body_fat_pct >= 3 AND body_fat_pct <= 60),
    resting_heart_rate INTEGER CHECK (resting_heart_rate >= 30 AND resting_heart_rate <= 150),
    
    -- Estilo de vida y objetivos
    activity_level TEXT CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')) DEFAULT 'moderate',
    goal TEXT CHECK (goal IN ('muscle_gain', 'strength', 'fat_loss', 'endurance', 'general_fitness', 'rehab')) DEFAULT 'muscle_gain',
    experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'elite')) DEFAULT 'intermediate',
    training_days_per_week INTEGER DEFAULT 4 CHECK (training_days_per_week BETWEEN 1 AND 7),
    preferred_units TEXT DEFAULT 'metric' CHECK (preferred_units IN ('metric', 'imperial')),
    injuries_notes TEXT,
    
    -- Métricas calculadas automáticas
    bmr NUMERIC(6, 1),
    tdee NUMERIC(6, 1),
    max_hr INTEGER,
    bmi NUMERIC(4, 1),
    
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- ==============================================================================
-- 3. TABLA: WORKOUT_SESSIONS (Sesiones de Entrenamiento)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.workout_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'Fuerza',
    start_time TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER DEFAULT 0,
    total_volume_kg NUMERIC(10, 2) DEFAULT 0,
    total_calories NUMERIC(7, 1) DEFAULT 0,
    average_rpe NUMERIC(3, 1),
    notes TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'discarded')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON public.workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_start_time ON public.workout_sessions(start_time DESC);

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own workout sessions"
    ON public.workout_sessions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 4. TABLA: WORKOUT_EXERCISES (Ejercicios y Series dentro de una Sesión)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.workout_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL,
    exercise_name TEXT NOT NULL,
    category TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    notes TEXT,
    sets JSONB NOT NULL DEFAULT '[]'::jsonb,
    best_1rm NUMERIC(7, 2) DEFAULT 0,
    total_volume_kg NUMERIC(10, 2) DEFAULT 0,
    calories_burned NUMERIC(6, 1) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON public.workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_user_id ON public.workout_exercises(user_id);

ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own workout exercises"
    ON public.workout_exercises FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 5. TABLA: BODY_METRICS_LOG (Registro de Evolución y Pesajes)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.body_metrics_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    weight_kg NUMERIC(5, 2) NOT NULL,
    body_fat_pct NUMERIC(4, 1),
    resting_heart_rate INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_body_metrics_user_date ON public.body_metrics_log(user_id, date DESC);

ALTER TABLE public.body_metrics_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own body metrics"
    ON public.body_metrics_log FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 6. TRIGGER PARA CREACIÓN AUTOMÁTICA DE PERFIL AL REGISTRARSE
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 7. TRIGGER PARA UPDATED_AT
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_workout_sessions_updated_at ON public.workout_sessions;
CREATE TRIGGER tr_workout_sessions_updated_at
    BEFORE UPDATE ON public.workout_sessions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_workout_exercises_updated_at ON public.workout_exercises;
CREATE TRIGGER tr_workout_exercises_updated_at
    BEFORE UPDATE ON public.workout_exercises
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
