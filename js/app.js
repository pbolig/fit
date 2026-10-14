// ==============================================================================
// FITPULSE - MAIN APPLICATION BOOTSTRAPPER
// Inicializa IndexedDB, Autenticación, Sincronización en segundo plano,
// Service Worker y Router SPA.
// ==============================================================================

import { localDB } from './db/indexedDB.js';
import { syncManager, SyncStatus } from './db/syncManager.js';
import { authService } from './services/authService.js';
import { workoutService } from './services/workoutService.js';
import { router } from './ui/router.js';
import { Toast } from './ui/toast.js';

class App {
  async init() {
    console.log('🚀 Inicializando FitPulse Native Web Engine...');

    try {
      // 1. Inicializar base de datos local IndexedDB
      await localDB.init();

      // 2. Inicializar servicio de autenticación
      await authService.init();

      // 3. Inicializar sincronizador silencioso en segundo plano
      await syncManager.init();

      // 4. Inicializar enrutador
      const viewContainer = document.getElementById('view-content');
      router.init(viewContainer);

      // 5. Configurar elementos globales de la interfaz
      this.setupGlobalHeader();
      this.setupServiceWorker();

      console.log('✅ FitPulse listo y operando en modo offline-first.');
    } catch (err) {
      console.error('Error crítico durante la inicialización:', err);
    }
  }

  setupGlobalHeader() {
    const syncBadge = document.getElementById('header-sync-status');
    const userAvatar = document.getElementById('header-user-avatar');
    const userName = document.getElementById('header-user-name');

    // Actualizar indicador de usuario
    const updateUserDisplay = (user) => {
      if (userName) userName.textContent = user?.name || 'Atleta Local';
      if (userAvatar) {
        if (user?.avatar) {
          userAvatar.innerHTML = `<img src="${user.avatar}" alt="Avatar">`;
        } else {
          userAvatar.innerHTML = `<span>🏋️</span>`;
        }
      }
    };

    updateUserDisplay(authService.getCurrentUser());
    authService.onAuthStateChanged((user) => updateUserDisplay(user));

    // Escuchar eventos de sincronización silenciosa
    window.addEventListener('fitpulse:sync-status', (e) => {
      const { status, message } = e.detail;
      if (!syncBadge) return;

      syncBadge.className = 'sync-status-badge';
      if (status === SyncStatus.SYNCING) {
        syncBadge.classList.add('badge-syncing');
        syncBadge.innerHTML = `
          <span class="sync-spinner"></span>
          <span class="sync-text">Sincronizando...</span>
        `;
      } else if (status === SyncStatus.OFFLINE) {
        syncBadge.classList.add('badge-offline');
        syncBadge.innerHTML = `
          <span class="sync-dot dot-gray"></span>
          <span class="sync-text">Modo Local (Offline)</span>
        `;
      } else if (status === SyncStatus.ERROR) {
        syncBadge.classList.add('badge-error');
        syncBadge.innerHTML = `
          <span class="sync-dot dot-red"></span>
          <span class="sync-text">Sin conexión a Supabase</span>
        `;
      } else {
        // En línea / Sincronizado
        syncBadge.classList.add('badge-online');
        syncBadge.innerHTML = `
          <span class="sync-dot dot-green"></span>
          <span class="sync-text">Sincronizado</span>
        `;
      }
    });

    // Clic en avatar lleva a Perfil Biométrico
    const userBtn = document.getElementById('header-user-btn');
    if (userBtn) {
      userBtn.addEventListener('click', () => router.navigate('profile'));
    }
  }

  setupServiceWorker() {
    if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('./sw.js')
          .then((reg) => console.log('Service Worker registrado:', reg.scope))
          .catch((err) => console.warn('Service Worker no se pudo registrar:', err));
      });
    }
  }
}

// Iniciar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
