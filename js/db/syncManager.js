// ==============================================================================
// FITPULSE - SILENT BACKGROUND SYNC MANAGER
// Funciona 100% offline-first. Al detectar conexión a la red, procesa silenciosamente
// la cola de cambios y sincroniza con Supabase sin interrumpir al usuario.
// ==============================================================================

import { localDB } from './indexedDB.js';
import { SupabaseManager } from './supabaseClient.js';
import { CONFIG, isValidUUID } from '../config.js';

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
    // 1. Aplicar en IndexedDB local
    if (action === 'DELETE') {
      if (data?.id) {
        await localDB.delete(localStore, data.id);
      }
    } else {
      await localDB.put(localStore, data);
    }

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
          if (item.action === 'DELETE') {
            // Si la tabla espera un UUID (workout_sessions, workout_exercises, body_metrics_log)
            // y el ID no es un UUID válido (ej. "workout_1792..."), nunca existió en Supabase.
            // Omitimos la petición remota para evitar error 400 de Postgres.
            if (item.table !== 'profiles' && item.data?.id && !isValidUUID(item.data.id)) {
              console.log(`[Sync] Omitiendo DELETE de id no-UUID ${item.data.id} en ${item.table} (solo existía en local)`);
              await localDB.removeSyncItem(item.id);
              continue;
            }
            const { error } = await client.from(item.table).delete().eq('id', item.data.id);
            if (error) throw error;
          } else if (item.action === 'UPSERT') {
            // Asegurar que user_id coincida con la sesión actual
            const payload = { ...item.data };
            if (!payload.user_id && item.table !== 'profiles') {
              payload.user_id = session.user.id;
            }
            if (item.table === 'profiles') {
              payload.id = session.user.id;
            }

            // Si es un registro con ID no-UUID incompatible con tablas UUID de Supabase, descartar de la cola
            if (item.table !== 'profiles' && payload.id && !isValidUUID(payload.id)) {
              console.warn(`[Sync] Descartando item con id no-UUID incompatible (${payload.id}) para tabla ${item.table}`);
              await localDB.removeSyncItem(item.id);
              continue;
            }

            const { error } = await client.from(item.table).upsert(payload);
            if (error) throw error;
          }

          // Eliminar de la cola si tuvo éxito
          await localDB.removeSyncItem(item.id);
        } catch (itemErr) {
          console.warn(`Error al sincronizar item ${item.id} en ${item.table}:`, itemErr.message);

          // Si es un error fatal de sintaxis de base de datos (ej. invalid input syntax for type uuid),
          // tabla que no existe aún en Supabase (404 / 42P01), o ha fallado repetidamente,
          // eliminarlo de la cola para que no bloquee la sincronización
          if (
            itemErr.message?.includes('invalid input syntax for type uuid') ||
            itemErr.message?.includes('invalid input syntax') ||
            itemErr.status === 404 ||
            itemErr.code === '42P01' ||
            itemErr.code === 'PGRST204' ||
            itemErr.message?.includes('does not exist') ||
            itemErr.message?.includes('relation') ||
            (item.attempts && item.attempts >= 3)
          ) {
            console.warn(`[Sync] Descartando item ${item.id} de la cola (${itemErr.message || 'tabla remota no disponible'}).`);
            await localDB.removeSyncItem(item.id);
          } else {
            await localDB.updateSyncItemAttempts(item.id, (item.attempts || 0) + 1);
          }

          // Si es un error de desconexión, pausar el ciclo
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
