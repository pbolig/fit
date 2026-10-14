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
    URL: 'https://zcgikmhztslegzacfpvl.supabase.co',
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjZ2lrbWh6dHNsZWd6YWNmcHZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NTA0NTEsImV4cCI6MjEwNzUyNjQ1MX0.gF3OXVto5O8GDKGTTV_LgcBhc8jKzkueglfv-0Ke4Y0'
  },
  SYNC: {
    HEARTBEAT_INTERVAL_MS: 30000,
    RETRY_DELAY_MS: 5000,
    MAX_ATTEMPTS: 5
  }
};
