// ==============================================================================
// FITPULSE - LOCAL-FIRST INDEXEDDB ENGINE
// Proporciona persistencia 100% offline, ultrarrápida y fiable.
// ==============================================================================

const DB_NAME = 'FitPulse_DB';
const DB_VERSION = 1;

class LocalDatabase {
  constructor() {
    this.db = null;
    this._initPromise = null;
  }

  async init() {
    if (this.db) return this.db;
    if (this._initPromise) return this._initPromise;

    this._initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Perfil de atleta
        if (!db.objectStoreNames.contains('profiles')) {
          db.createObjectStore('profiles', { keyPath: 'id' });
        }

        // Sesiones de entrenamiento
        if (!db.objectStoreNames.contains('workouts')) {
          const workoutStore = db.createObjectStore('workouts', { keyPath: 'id' });
          workoutStore.createIndex('start_time', 'start_time', { unique: false });
          workoutStore.createIndex('status', 'status', { unique: false });
        }

        // Ejercicios y series de cada sesión
        if (!db.objectStoreNames.contains('workout_exercises')) {
          const exStore = db.createObjectStore('workout_exercises', { keyPath: 'id' });
          exStore.createIndex('workout_id', 'workout_id', { unique: false });
        }

        // Registro de métricas de peso e historial
        if (!db.objectStoreNames.contains('body_metrics')) {
          const metricStore = db.createObjectStore('body_metrics', { keyPath: 'id' });
          metricStore.createIndex('date', 'date', { unique: false });
        }

        // Cola de sincronización silenciosa (Outbox Sync Queue)
        if (!db.objectStoreNames.contains('sync_queue')) {
          const queueStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Configuración y credenciales locales
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB open error:', event.target.error);
        reject(event.target.error);
      };
    });

    return this._initPromise;
  }

  // Helper genérico para transacciones
  async getStore(storeName, mode = 'readonly') {
    const db = await this.init();
    const tx = db.transaction(storeName, mode);
    return { tx, store: tx.objectStore(storeName) };
  }

  async get(storeName, key) {
    const { store } = await this.getStore(storeName, 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async getAll(storeName) {
    const { store } = await this.getStore(storeName, 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async put(storeName, value) {
    const { tx, store } = await this.getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async delete(storeName, key) {
    const { tx, store } = await this.getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async clear(storeName) {
    const { tx, store } = await this.getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  // --- MÉTODOS ESPECIALIZADOS DE SINCRONIZACIÓN ---

  async enqueueSync(table, action, data) {
    const id = 'sync_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const queueItem = {
      id,
      table,
      action, // 'UPSERT', 'DELETE'
      data,
      timestamp: Date.now(),
      attempts: 0
    };
    await this.put('sync_queue', queueItem);
    return queueItem;
  }

  async getPendingSyncItems() {
    const items = await this.getAll('sync_queue');
    return items.sort((a, b) => a.timestamp - b.timestamp);
  }

  async removeSyncItem(id) {
    return this.delete('sync_queue', id);
  }

  async updateSyncItemAttempts(id, attempts) {
    const item = await this.get('sync_queue', id);
    if (item) {
      item.attempts = attempts;
      await this.put('sync_queue', item);
    }
  }

  // Settings helpers
  async getSetting(key, defaultValue = null) {
    const res = await this.get('settings', key);
    return res ? res.value : defaultValue;
  }

  async setSetting(key, value) {
    return this.put('settings', { key, value });
  }
}

export const localDB = new LocalDatabase();
