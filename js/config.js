// FitPulse Configuration & Constants

export const CONFIG = {
  APP_NAME: 'FitPulse',
  VERSION: '1.0.0',
  STORAGE_KEYS: {
    SUPABASE_URL: 'fitpulse_supabase_url',
    SUPABASE_ANON_KEY: 'fitpulse_supabase_anon_key',
    CURRENT_USER: 'fitpulse_current_user',
    OFFLINE_MODE: 'fitpulse_offline_mode',
    THEME: 'fitpulse_theme',
    ACTIVE_WORKOUT: 'fitpulse_active_workout'
  },
  // Default demo / public placeholder (user can easily change it in the Settings panel)
  DEFAULT_SUPABASE: {
    URL: '',
    ANON_KEY: ''
  },
  SYNC: {
    HEARTBEAT_INTERVAL_MS: 30000,
    RETRY_DELAY_MS: 5000,
    MAX_ATTEMPTS: 5
  }
};
