// ==============================================================================
// FITPULSE - MAIN APPLICATION BOOTSTRAPPER
// Inicializa IndexedDB, Autenticación, Sincronización en segundo plano,
// Service Worker y Router SPA.
// ==============================================================================

import { localDB } from './db/indexedDB.js';
import { syncManager, SyncStatus } from './db/syncManager.js';
import { authService } from './services/authService.js';
import { workoutService } from './services/workoutService.js';
import { exerciseCatalogService } from './services/exerciseCatalog.js';
import { router } from './ui/router.js';
import { Toast } from './ui/toast.js';

class App {
  async init() {
    console.log('🚀 Inicializando FitPulse Native Web Engine...');

    try {
      // 1. Inicializar base de datos local IndexedDB
      await localDB.init();

      // 2. Inicializar catálogo reactivo de ejercicios y ritmos
      await exerciseCatalogService.init();

      // 3. Inicializar servicio de autenticación
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
    const userRoleLabel = document.querySelector('.user-role-label');
    const navAdmin = document.getElementById('nav-admin');
    const navTrainer = document.getElementById('nav-trainer-hub');

    // Actualizar indicador de usuario y navegación según permisos
    const updateUserDisplay = async (user) => {
      if (userName) userName.textContent = user?.name || 'Atleta Local';
      if (userAvatar) {
        if (user?.avatar) {
          userAvatar.innerHTML = `<img src="${user.avatar}" alt="Avatar">`;
        } else {
          userAvatar.innerHTML = `<span>🏋️</span>`;
        }
      }

      const role = await authService.getRole();
      const isSuper = authService.isSuperAdmin();
      const isTrainer = await authService.isTrainer();

      if (userRoleLabel) {
        if (isSuper) {
          userRoleLabel.textContent = '👑 Superadmin';
          userRoleLabel.style.color = '#c084fc';
        } else if (isTrainer) {
          userRoleLabel.textContent = '⚡ Entrenador Pro';
          userRoleLabel.style.color = '#34d399';
        } else {
          userRoleLabel.textContent = '🏋️ Atleta FitPulse';
          userRoleLabel.style.color = 'var(--color-text-muted)';
        }
      }

      // Control visual sutil de pestañas según rol
      if (navAdmin) {
        navAdmin.style.display = isSuper ? 'flex' : 'none';
      }
      if (navTrainer) {
        navTrainer.style.display = (isTrainer || isSuper) ? 'flex' : 'none';
      }
    };

    updateUserDisplay(authService.getCurrentUser());
    authService.onAuthStateChanged((user) => updateUserDisplay(user));
    window.addEventListener('fitpulse:room-event', (e) => {
      if (e.detail?.action === 'USER_ROLE_CHANGED') {
        updateUserDisplay(authService.getCurrentUser());
      }
    });

    // Escuchar eventos de sincronización silenciosa
    window.addEventListener('fitpulse:sync-status', (e) => {
      const { status, message } = e.detail;
      if (!syncBadge) return;

      syncBadge.className = 'sync-status-badge';
      syncBadge.title = message || 'Estado de sincronización';

      if (status === SyncStatus.SYNCING) {
        syncBadge.classList.add('badge-syncing');
        syncBadge.innerHTML = `
          <span class="sync-spinner"></span>
          <span class="sync-text">Sincronizando...</span>
        `;
      } else if (status === SyncStatus.LOCAL) {
        syncBadge.classList.add('badge-local');
        syncBadge.innerHTML = `
          <span class="sync-dot dot-blue"></span>
          <span class="sync-text">${message || 'Modo Local (Invitado)'}</span>
        `;
      } else if (status === SyncStatus.OFFLINE) {
        syncBadge.classList.add('badge-offline');
        syncBadge.innerHTML = `
          <span class="sync-dot dot-gray"></span>
          <span class="sync-text">Sin conexión (Offline)</span>
        `;
      } else if (status === SyncStatus.ERROR) {
        syncBadge.classList.add('badge-error');
        syncBadge.innerHTML = `
          <span class="sync-dot dot-red"></span>
          <span class="sync-text">Error de sincronización</span>
        `;
      } else if (status === SyncStatus.SYNCED) {
        syncBadge.classList.add('badge-online');
        syncBadge.innerHTML = `
          <span class="sync-dot dot-green"></span>
          <span class="sync-text">Sincronizado con Supabase</span>
        `;
      }
    });

    // Clic en el badge de sincronización lleva a la sección de Configuración/Nube
    if (syncBadge) {
      syncBadge.style.cursor = 'pointer';
      syncBadge.addEventListener('click', () => router.navigate('settings'));
    }

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
