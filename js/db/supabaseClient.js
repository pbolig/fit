// ==============================================================================
// FITPULSE - SUPABASE CLIENT INTEGRATION
// Maneja la conexión con Supabase (Auth + Base de datos PostgreSQL).
// Diseñado para tolerar modo offline y credenciales dinámicas configurables.
// ==============================================================================

import { CONFIG } from '../config.js';
import { localDB } from './indexedDB.js';

let supabaseInstance = null;

export const SupabaseManager = {
  /**
   * Obtiene la configuración actual de Supabase (desde IndexedDB/LocalStorage o Config)
   */
  async getConfig() {
    const savedUrl = (await localDB.getSetting(CONFIG.STORAGE_KEYS.SUPABASE_URL)) ||
      localStorage.getItem(CONFIG.STORAGE_KEYS.SUPABASE_URL) ||
      CONFIG.DEFAULT_SUPABASE.URL;

    const savedKey = (await localDB.getSetting(CONFIG.STORAGE_KEYS.SUPABASE_ANON_KEY)) ||
      localStorage.getItem(CONFIG.STORAGE_KEYS.SUPABASE_ANON_KEY) ||
      CONFIG.DEFAULT_SUPABASE.ANON_KEY;

    return {
      url: savedUrl ? savedUrl.trim() : '',
      anonKey: savedKey ? savedKey.trim() : ''
    };
  },

  /**
   * Guarda credenciales de Supabase
   */
  async saveConfig(url, anonKey) {
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();

    localStorage.setItem(CONFIG.STORAGE_KEYS.SUPABASE_URL, cleanUrl);
    localStorage.setItem(CONFIG.STORAGE_KEYS.SUPABASE_ANON_KEY, cleanKey);
    await localDB.setSetting(CONFIG.STORAGE_KEYS.SUPABASE_URL, cleanUrl);
    await localDB.setSetting(CONFIG.STORAGE_KEYS.SUPABASE_ANON_KEY, cleanKey);

    // Reiniciar cliente
    supabaseInstance = null;
    return this.getClient();
  },

  /**
   * Inicializa o devuelve la instancia del cliente Supabase
   */
  async getClient() {
    if (supabaseInstance) return supabaseInstance;

    const { url, anonKey } = await this.getConfig();
    if (!url || !anonKey) {
      return null;
    }

    try {
      // Usar Supabase cargado desde CDN en window.supabase o dynamically
      let createClientFn = window.supabase?.createClient;

      if (!createClientFn) {
        // Cargar script dinámicamente si aún no está presente
        await new Promise((resolve, reject) => {
          if (window.supabase) return resolve();
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
          script.crossOrigin = 'anonymous';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('No se pudo cargar el SDK de Supabase'));
          document.head.appendChild(script);
        });
        createClientFn = window.supabase?.createClient;
      }

      if (createClientFn) {
        supabaseInstance = createClientFn(url, anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        });
        return supabaseInstance;
      }
    } catch (err) {
      console.warn('Advertencia: Supabase no pudo inicializarse (modo offline activado):', err.message);
    }

    return null;
  },

  /**
   * Verifica la conectividad real con Supabase
   */
  async testConnection(url, anonKey) {
    try {
      const createClientFn = window.supabase?.createClient;
      if (!createClientFn) {
        throw new Error('El SDK de Supabase no está cargado');
      }
      const testClient = createClientFn(url, anonKey);
      // Intenta consultar la sesión o auth
      const { data, error } = await testClient.auth.getSession();
      if (error) throw error;
      return { success: true, message: 'Conexión con Supabase exitosa' };
    } catch (err) {
      return { success: false, message: err.message || 'Error de conexión' };
    }
  }
};
