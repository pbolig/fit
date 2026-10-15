// ==============================================================================
// FITPULSE - AUTHENTICATION SERVICE
// Soporta:
// 1. Ingreso con Cuenta de Google (OAuth)
// 2. Registro e ingreso con Email y Contraseña
// 3. Modo Invitado / Local (sin necesidad de cuenta para probar inmediatamente)
// ==============================================================================

import { SupabaseManager } from '../db/supabaseClient.js';
import { localDB } from '../db/indexedDB.js';
import { CONFIG } from '../config.js';

export const SUPERADMIN_EMAILS = [
  'pedro.bolig@gmail.com'
];

class AuthService {
  constructor() {
    this.currentUser = null;
    this.listeners = [];
  }

  async init() {
    // 1. Verificar si hay sesión activa en Supabase
    const client = await SupabaseManager.getClient();
    if (client) {
      try {
        const { data: { session } } = await client.auth.getSession();
        if (session?.user) {
          this.currentUser = this.formatUser(session.user);
          await this.saveLocalUser(this.currentUser);
        }

        // Suscribirse a cambios de estado de autenticación
        client.auth.onAuthStateChange(async (event, session) => {
          console.log('Evento de Autenticación Supabase:', event);
          if (session?.user) {
            this.currentUser = this.formatUser(session.user);
            await this.saveLocalUser(this.currentUser);
            this.notifyListeners(this.currentUser);
            window.dispatchEvent(new CustomEvent('fitpulse:auth-changed', { detail: { user: this.currentUser } }));
          } else if (event === 'SIGNED_OUT') {
            this.currentUser = null;
            await localDB.delete('settings', CONFIG.STORAGE_KEYS.CURRENT_USER);
            localStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_USER);
            this.notifyListeners(null);
            window.dispatchEvent(new CustomEvent('fitpulse:auth-changed', { detail: { user: null } }));
          }
        });
      } catch (err) {
        console.warn('Error al verificar sesión en Supabase:', err);
      }
    }

    // 2. Si no hay sesión activa en Supabase, verificar si hay un usuario guardado previamente
    if (!this.currentUser) {
      const localSaved = await localDB.getSetting(CONFIG.STORAGE_KEYS.CURRENT_USER);
      if (localSaved && !localSaved.isGuest) {
        this.currentUser = localSaved;
      } else {
        // No permitir acceso sin autenticarse
        this.currentUser = null;
      }
    }

    return this.currentUser;
  }

  formatUser(sbUser) {
    const email = sbUser.email || '';
    const isSuperAdmin = SUPERADMIN_EMAILS.includes(email.toLowerCase());
    return {
      id: sbUser.id,
      email,
      name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || email.split('@')[0] || 'Atleta',
      avatar: sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture || '',
      isSuperAdmin,
      role: isSuperAdmin ? 'superadmin' : (sbUser.role || 'athlete'),
      isGuest: false
    };
  }

  async saveLocalUser(user) {
    if (user) {
      localStorage.setItem(CONFIG.STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      await localDB.setSetting(CONFIG.STORAGE_KEYS.CURRENT_USER, user);
    } else {
      localStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_USER);
      await localDB.delete('settings', CONFIG.STORAGE_KEYS.CURRENT_USER);
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isAuthenticated() {
    return !!(this.currentUser && !this.currentUser.isGuest && this.currentUser.id);
  }

  isAuthenticatedWithSupabase() {
    return this.isAuthenticated();
  }

  isSuperAdmin() {
    if (!this.currentUser || !this.currentUser.email) return false;
    return SUPERADMIN_EMAILS.includes(this.currentUser.email.toLowerCase());
  }

  async getRole() {
    if (this.isSuperAdmin()) return 'superadmin';
    if (!this.currentUser?.id) return 'athlete';

    try {
      await localDB.init();
      const roleRecord = await localDB.get('user_roles', this.currentUser.id);
      if (roleRecord?.role) {
        this.currentUser.role = roleRecord.role;
        return roleRecord.role;
      }
    } catch (e) {}

    return this.currentUser.role || 'athlete';
  }

  async isTrainer() {
    if (this.isSuperAdmin()) return true;
    const role = await this.getRole();
    return role === 'trainer' || role === 'superadmin';
  }

  /**
   * Inicio de sesión con Google OAuth
   */
  async signInWithGoogle() {
    const client = await SupabaseManager.getClient();
    if (!client) {
      throw new Error('Supabase no está configurado. Ve a Configuración para ingresar tu URL y Anon Key.');
    }

    // Redirige al flujo de Google OAuth y regresa a la URL actual
    const currentUrl = window.location.origin + window.location.pathname;
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: currentUrl
      }
    });

    if (error) throw error;
    return data;
  }

  /**
   * Registro con Email y Contraseña
   */
  async signUpWithEmail(email, password, fullName) {
    const client = await SupabaseManager.getClient();
    if (!client) {
      throw new Error('Supabase no está configurado. Ve a Configuración para ingresar tu URL y Anon Key.');
    }

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (error) throw error;
    if (data?.user) {
      this.currentUser = this.formatUser(data.user);
      await this.saveLocalUser(this.currentUser);
      this.notifyListeners(this.currentUser);
    }
    return data;
  }

  /**
   * Ingreso con Email y Contraseña
   */
  async signInWithEmail(email, password) {
    const client = await SupabaseManager.getClient();
    if (!client) {
      throw new Error('Supabase no está configurado. Ve a Configuración para ingresar tu URL y Anon Key.');
    }

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    if (data?.user) {
      this.currentUser = this.formatUser(data.user);
      await this.saveLocalUser(this.currentUser);
      this.notifyListeners(this.currentUser);
    }
    return data;
  }

  /**
   * Cerrar sesión
   */
  async signOut() {
    const client = await SupabaseManager.getClient();
    if (client) {
      try {
        await client.auth.signOut();
      } catch (err) {
        console.warn('Error al desloguear de Supabase:', err);
      }
    }

    // Limpiar usuario activo
    this.currentUser = null;
    await this.saveLocalUser(null);
    this.notifyListeners(null);
    window.dispatchEvent(new CustomEvent('fitpulse:auth-changed', { detail: { user: null } }));
  }

  onAuthStateChanged(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  notifyListeners(user) {
    this.listeners.forEach((callback) => {
      try {
        callback(user);
      } catch (e) {
        console.error('Error en listener de auth:', e);
      }
    });
    window.dispatchEvent(new CustomEvent('fitpulse:auth-changed', { detail: { user } }));
  }
}

export const authService = new AuthService();
