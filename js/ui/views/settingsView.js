// ==============================================================================
// FITPULSE - SETTINGS & ADMIN MANAGEMENT VIEW
// Para usuarios regulares: Datos de perfil, preferencias de unidades y cerrar sesión.
// Exclusivo Superadmin (pedro.bolig@gmail.com): Conexión con Supabase, claves y tarea cron.
// ==============================================================================

import { SupabaseManager } from '../../db/supabaseClient.js';
import { syncManager, SyncStatus } from '../../db/syncManager.js';
import { localDB } from '../../db/indexedDB.js';
import { authService } from '../../services/authService.js';
import { Toast } from '../toast.js';

export const SettingsView = {
  async render(container) {
    const { url, anonKey } = await SupabaseManager.getConfig();
    const currentUser = authService.getCurrentUser();
    const isSuperAdmin = authService.isSuperAdmin();
    const pendingItems = await localDB.getPendingSyncItems();

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <span class="badge-tag">${isSuperAdmin ? 'Panel de Administración' : 'Ajustes del Atleta'}</span>
          <h1 class="view-title">Configuración & Cuenta</h1>
          <p class="view-subtitle">${isSuperAdmin ? 'Gestión de infraestructura en la nube, credenciales de Supabase y perfil.' : 'Gestiona tu sesión y preferencias de entrenamiento.'}</p>
        </div>
      </div>

      <div class="settings-grid">
        <!-- SECCIÓN 1: CUENTA DE USUARIO (Visible para todos) -->
        <div class="card glass-card settings-card">
          <div class="card-header">
            <div class="card-icon-box accent-cyan">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div>
              <h2 class="card-title">Cuenta de Atleta</h2>
              <p class="card-description">Sesión activa y seguridad</p>
            </div>
          </div>

          <div class="auth-status-banner">
            <div class="auth-user-info">
              <div class="auth-avatar">
                ${currentUser?.avatar ? `<img src="${currentUser.avatar}" alt="Avatar">` : '👤'}
              </div>
              <div class="auth-details">
                <span class="auth-name">${currentUser?.name || 'Atleta Registrado'}</span>
                <span class="auth-email">${currentUser?.email || 'Sin correo asociado'}</span>
                <span class="auth-mode-pill pill-online">
                  ${isSuperAdmin ? '👑 Superadministrador del Sistema' : '● Cuenta Sincronizada con Supabase'}
                </span>
              </div>
            </div>

            <button id="btn-sign-out" class="btn btn-outline-danger btn-sm">Cerrar Sesión</button>
          </div>

          <!-- ESTADO DE LA CONEXIÓN -->
          <div class="sync-monitor-box">
            <div class="sync-monitor-header">
              <div class="sync-status-indicator">
                <span class="status-dot ${navigator.onLine ? 'dot-green' : 'dot-gray'}"></span>
                <span class="status-text">${navigator.onLine ? 'Conectado a la base de datos' : 'Sin conexión a internet (Modo Offline)'}</span>
              </div>
              <button id="btn-manual-sync" class="btn btn-secondary btn-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                <span>Sincronizar Ahora</span>
              </button>
            </div>

            <div class="sync-metrics-row">
              <div class="sync-metric-item">
                <span class="smetric-label">Cambios pendientes:</span>
                <span class="smetric-val" id="sync-pending-count">${pendingItems.length} en cola</span>
              </div>
              <div class="sync-metric-item">
                <span class="smetric-label">Última sincronización:</span>
                <span class="smetric-val" id="sync-last-time">${syncManager.lastSyncTime ? syncManager.lastSyncTime.toLocaleTimeString() : 'Al iniciar'}</span>
              </div>
            </div>
          </div>
        </div>

        ${isSuperAdmin ? `
          <!-- SECCIÓN 2: EXCLUSIVO SUPERADMIN - PARÁMETROS SUPABASE -->
          <div class="card glass-card settings-card">
            <div class="card-header">
              <div class="card-icon-box accent-emerald">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
              </div>
              <div>
                <h2 class="card-title">Infraestructura Supabase</h2>
                <span class="badge-tag">Solo Superadmin</span>
              </div>
            </div>

            <form id="form-supabase-config" class="form-grid">
              <div class="form-group full-width">
                <label for="sb-url">Supabase Project URL</label>
                <input type="url" id="sb-url" class="input-field" value="${url || ''}" required>
              </div>

              <div class="form-group full-width">
                <label for="sb-key">Supabase Anon Public API Key</label>
                <input type="password" id="sb-key" class="input-field" value="${anonKey || ''}" required>
              </div>

              <div class="settings-actions-row full-width">
                <button type="button" id="btn-test-sb" class="btn btn-secondary">Probar Conexión</button>
                <button type="submit" id="btn-save-sb" class="btn btn-primary btn-glow">Guardar Credenciales</button>
              </div>
            </form>
          </div>
        ` : ''}
      </div>

      ${isSuperAdmin ? `
        <!-- GUÍA DE INFRAESTRUCTURA GITHUB Y CRON (SOLO SUPERADMIN) -->
        <div class="card glass-card info-card">
          <div class="card-header">
            <div class="card-icon-box accent-coral">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <div>
              <h2 class="card-title">Mantenimiento de Servidores & Cron Keep-Alive</h2>
              <span class="badge-tag">Panel Superadmin</span>
            </div>
          </div>

          <div class="instructions-steps">
            <div class="step-item">
              <span class="step-num">1</span>
              <div class="step-text">
                <strong>Tarea Cron Automática (.github/workflows/supabase-keepalive.yml):</strong>
                <p>Tu cron se ejecuta cada 3 días automáticamente mediante GitHub Actions para evitar que el plan free de Supabase se suspenda por inactividad.</p>
              </div>
            </div>
            <div class="step-item">
              <span class="step-num">2</span>
              <div class="step-text">
                <strong>Despliegue Automático (.github/workflows/deploy.yml):</strong>
                <p>Publicación automática en GitHub Pages con cada <code>git push</code>.</p>
              </div>
            </div>
          </div>
        </div>
      ` : ''}
    `;

    this.attachEvents(container, isSuperAdmin);
  },

  attachEvents(container, isSuperAdmin) {
    // 1. Cerrar Sesión
    const signOutBtn = container.querySelector('#btn-sign-out');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', async () => {
        if (confirm('¿Deseas cerrar tu sesión? Se requerirá iniciar sesión nuevamente para acceder a tus entrenamientos.')) {
          await authService.signOut();
          Toast.info('Sesión cerrada correctamente.');
          router.navigate('login');
        }
      });
    }

    // 2. Sincronización Manual Inmediata
    const manualSyncBtn = container.querySelector('#btn-manual-sync');
    if (manualSyncBtn) {
      manualSyncBtn.addEventListener('click', async () => {
        manualSyncBtn.disabled = true;
        manualSyncBtn.innerHTML = `<span>Sincronizando...</span>`;
        await syncManager.syncNow();
        manualSyncBtn.disabled = false;
        manualSyncBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
          <span>Sincronizar Ahora</span>
        `;
        this.render(container);
      });
    }

    // 3. Eventos exclusivos de Superadmin
    if (isSuperAdmin) {
      const sbForm = container.querySelector('#form-supabase-config');
      if (sbForm) {
        sbForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const url = container.querySelector('#sb-url').value.trim();
          const key = container.querySelector('#sb-key').value.trim();

          await SupabaseManager.saveConfig(url, key);
          Toast.success('Credenciales de Supabase actualizadas.', 'Superadmin');
          syncManager.syncNow();
          this.render(container);
        });
      }

      const testSbBtn = container.querySelector('#btn-test-sb');
      if (testSbBtn) {
        testSbBtn.addEventListener('click', async () => {
          const url = container.querySelector('#sb-url').value.trim();
          const key = container.querySelector('#sb-key').value.trim();

          testSbBtn.disabled = true;
          testSbBtn.textContent = 'Probando...';
          const res = await SupabaseManager.testConnection(url, key);
          if (res.success) {
            Toast.success('Conexión con Supabase verificada con éxito.');
          } else {
            Toast.error(res.message, 'Fallo de Conexión');
          }
          testSbBtn.disabled = false;
          testSbBtn.textContent = 'Probar Conexión';
        });
      }
    }
  }
};
