// ==============================================================================
// FITPULSE - SILENT BACKGROUND SYNC MANAGER
// Funciona 100% offline-first. Al detectar conexión a la red, procesa silenciosamente
// la cola de cambios y sincroniza con Supabase sin interrumpir al usuario.
// ==============================================================================

import { localDB } from './indexedDB.js';
import { SupabaseManager } from './supabaseClient.js';
import { CONFIG } from '../config.js';

export const SyncStatus = {
  SYNCED: 'synced',
  SYNCING: 'syncing',
  LOCAL: 'local',
  OFFLINE: 'offline',
  ERROR: 'error'
};

class SyncManager {
  constructor() {
    this.status = navigator.onLine ? SyncStatus.LOCAL : SyncStatus.OFFLINE;
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.heartbeatTimer = null;
  }

  async init() {
    // Escuchar eventos del navegador
    window.addEventListener('online', () => this.handleNetworkChange(true));
    window.addEventListener('offline', () => this.handleNetworkChange(false));

    // Iniciar latido periódico de sincronización
    this.startHeartbeat();

    // Comprobación inicial de estado
    if (navigator.onLine) {
      setTimeout(() => this.syncNow(), 800);
    } else {
      this.status = SyncStatus.OFFLINE;
      this.notifyStatus(SyncStatus.OFFLINE, 'Sin conexión (Offline)');
    }
  }

  startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(async () => {
      if (navigator.onLine && !this.isSyncing) {
        const pending = await localDB.getPendingSyncItems();
        if (pending.length > 0) {
          this.syncNow();
        }
      }
    }, CONFIG.SYNC.HEARTBEAT_INTERVAL_MS);
  }

  async handleNetworkChange(isOnline) {
    if (isOnline) {
      console.log('🌐 Conexión detectada.');
      await this.syncNow();
    } else {
      console.log('📴 Conexión perdida. Operando en modo local 100% offline.');
      this.status = SyncStatus.OFFLINE;
      this.notifyStatus(SyncStatus.OFFLINE, 'Sin conexión (Offline)');
    }
  }

  /**
   * Guarda un cambio en la base de datos local y lo encola para sincronizar
   */
  async saveAndQueue(localStore, supabaseTable, data, action = 'UPSERT') {
    // 1. Guardar inmediatamente en IndexedDB local
    await localDB.put(localStore, data);

    // 2. Encolar mutación
    const queueItem = await localDB.enqueueSync(supabaseTable, action, data);

    // 3. Si hay conexión, sincronizar en segundo plano silenciosamente
    if (navigator.onLine && !this.isSyncing) {
      // No bloqueamos con await para mantener la UI hiper-reactiva
      this.syncNow().catch((err) => console.warn('Sync background err:', err));
    }

    return queueItem;
  }

  /**
   * Ejecuta la sincronización completa: sube la cola y opcionalmente descarga datos remotos
   */
  async syncNow() {
    if (this.isSyncing) return;
    if (!navigator.onLine) {
      this.status = SyncStatus.OFFLINE;
      this.notifyStatus(SyncStatus.OFFLINE, 'Modo sin conexión');
      return;
    }

    const client = await SupabaseManager.getClient();
    if (!client) {
      // Supabase aún no está configurado por el usuario, operamos 100% en local
      this.status = SyncStatus.LOCAL;
      this.notifyStatus(SyncStatus.LOCAL, 'Modo Local (Sin vincular)');
      return;
    }

    // Verificar si hay sesión activa
    let session = null;
    try {
      const { data } = await client.auth.getSession();
      session = data?.session;
    } catch (err) {
      console.warn('No se pudo verificar sesión Supabase:', err);
    }

    if (!session) {
      // Usuario navegando como invitado sin cuenta en Supabase todavía
      this.status = SyncStatus.LOCAL;
      this.notifyStatus(SyncStatus.LOCAL, 'Modo Local (Sin iniciar sesión)');
      return;
    }

    this.isSyncing = true;
    this.status = SyncStatus.SYNCING;
    this.notifyStatus(SyncStatus.SYNCING, 'Sincronizando con Supabase...');

    try {
      // --- PASO 1: Procesar cola de salida (Outbox) ---
      const pendingItems = await localDB.getPendingSyncItems();

      for (const item of pendingItems) {
        try {
          if (item.action === 'UPSERT') {
            // Asegurar que user_id coincida con la sesión actual
            const payload = { ...item.data };
            if (!payload.user_id && item.table !== 'profiles') {
              payload.user_id = session.user.id;
            }
            if (item.table === 'profiles') {
              payload.id = session.user.id;
            }

            const { error } = await client.from(item.table).upsert(payload);
            if (error) throw error;
          } else if (item.action === 'DELETE') {
            const { error } = await client.from(item.table).delete().eq('id', item.data.id);
            if (error) throw error;
          }

          // Eliminar de la cola si tuvo éxito
          await localDB.removeSyncItem(item.id);
        } catch (itemErr) {
          console.warn(`Error al sincronizar item ${item.id} en ${item.table}:`, itemErr.message);
          await localDB.updateSyncItemAttempts(item.id, (item.attempts || 0) + 1);
          // Si es un error de autenticación o red, abortar el resto para no saturar
          if (!navigator.onLine) break;
        }
      }

      // --- PASO 2: Descargar datos remotos hacia IndexedDB local ---
      await this.pullRemoteData(client, session.user.id);

      this.lastSyncTime = new Date();
      this.status = SyncStatus.SYNCED;
      this.notifyStatus(SyncStatus.SYNCED, 'Sincronizado con Supabase');
    } catch (err) {
      console.error('Error durante la sincronización:', err);
      this.status = SyncStatus.ERROR;
      this.notifyStatus(SyncStatus.ERROR, 'Error de sincronización');
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Descarga los datos más recientes del usuario de Supabase y actualiza IndexedDB
   */
  async pullRemoteData(client, userId) {
    try {
      // 1. Perfil
      const { data: profile } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        await localDB.put('profiles', profile);
      }

      // 2. Sesiones de entrenamiento
      const { data: workouts } = await client
        .from('workout_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: false });

      if (workouts && workouts.length > 0) {
        for (const w of workouts) {
          await localDB.put('workouts', w);
        }
      }

      // 3. Ejercicios de sesiones
      const { data: exercises } = await client
        .from('workout_exercises')
        .select('*')
        .eq('user_id', userId);

      if (exercises && exercises.length > 0) {
        for (const ex of exercises) {
          await localDB.put('workout_exercises', ex);
        }
      }

      // 4. Métricas de peso
      const { data: metrics } = await client
        .from('body_metrics_log')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (metrics && metrics.length > 0) {
        for (const m of metrics) {
          await localDB.put('body_metrics', m);
        }
      }
    } catch (err) {
      console.warn('Advertencia en pullRemoteData:', err.message);
    }
  }

  notifyStatus(status, message) {
    window.dispatchEvent(
      new CustomEvent('fitpulse:sync-status', {
        detail: {
          status,
          message,
          lastSyncTime: this.lastSyncTime
        }
      })
    );
  }
}

export const syncManager = new SyncManager();
