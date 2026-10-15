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

export function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(str) {
  return typeof str === 'string' && UUID_REGEX.test(str);
}
