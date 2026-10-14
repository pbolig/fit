// ==============================================================================
// FITPULSE - SETTINGS, SUPABASE CONNECTION & SYNC MONITOR VIEW
// Permite autenticarse con Google / Email, configurar Supabase,
// monitorear la cola de sincronización silenciosa y administrar copias de seguridad.
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
    const isSupabaseAuth = authService.isAuthenticatedWithSupabase();
    const pendingItems = await localDB.getPendingSyncItems();

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <span class="badge-tag">Infraestructura & Nube</span>
          <h1 class="view-title">Configuración & Sincronización</h1>
          <p class="view-subtitle">Conecta con tu base de datos Supabase, autentícate con Google y gestiona la sincronización offline-first.</p>
        </div>
      </div>

      <div class="settings-grid">
        <!-- SECCIÓN 1: AUTENTICACIÓN -->
        <div class="card glass-card settings-card">
          <div class="card-header">
            <div class="card-icon-box accent-cyan">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div>
              <h2 class="card-title">Cuenta de Usuario</h2>
              <p class="card-description">Ingreso con Google o Email</p>
            </div>
          </div>

          <div class="auth-status-banner">
            <div class="auth-user-info">
              <div class="auth-avatar">
                ${currentUser?.avatar ? `<img src="${currentUser.avatar}" alt="Avatar">` : '👤'}
              </div>
              <div class="auth-details">
                <span class="auth-name">${currentUser?.name || 'Atleta Local'}</span>
                <span class="auth-email">${currentUser?.email || 'Sin correo asociado'}</span>
                <span class="auth-mode-pill ${isSupabaseAuth ? 'pill-online' : 'pill-offline'}">
                  ${isSupabaseAuth ? '● Cuenta Supabase Conectada' : '○ Modo Local / Invitado'}
                </span>
              </div>
            </div>

            ${isSupabaseAuth ? `
              <button id="btn-sign-out" class="btn btn-outline-danger btn-sm">Cerrar Sesión</button>
            ` : ''}
          </div>

          ${!isSupabaseAuth ? `
            <div class="auth-actions-tabs">
              <!-- Botón Google OAuth -->
              <button id="btn-google-login" class="btn btn-google full-width">
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>Continuar con Cuenta de Google</span>
              </button>

              <div class="auth-divider"><span>o mediante Email</span></div>

              <!-- Formulario de Email -->
              <form id="form-email-auth" class="email-auth-form">
                <div class="auth-tab-buttons">
                  <button type="button" class="tab-btn active" id="tab-login">Iniciar Sesión</button>
                  <button type="button" class="tab-btn" id="tab-signup">Crear Cuenta</button>
                </div>

                <div class="form-group full-width" id="signup-name-group" style="display: none;">
                  <label for="auth-fullname">Nombre Completo</label>
                  <input type="text" id="auth-fullname" class="input-field" placeholder="Tu nombre">
                </div>

                <div class="form-group full-width">
                  <label for="auth-email">Correo Electrónico</label>
                  <input type="email" id="auth-email" class="input-field" placeholder="ejemplo@correo.com" required>
                </div>

                <div class="form-group full-width">
                  <label for="auth-password">Contraseña</label>
                  <input type="password" id="auth-password" class="input-field" placeholder="Mínimo 6 caracteres" required>
                </div>

                <button type="submit" id="btn-submit-email-auth" class="btn btn-primary btn-glow full-width">
                  Iniciar Sesión
                </button>
              </form>
            </div>
          ` : ''}
        </div>

        <!-- SECCIÓN 2: PARÁMETROS DE SUPABASE -->
        <div class="card glass-card settings-card">
          <div class="card-header">
            <div class="card-icon-box accent-emerald">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
            </div>
            <div>
              <h2 class="card-title">Conexión con Supabase</h2>
              <p class="card-description">Base de datos PostgreSQL en la nube</p>
            </div>
          </div>

          <form id="form-supabase-config" class="form-grid">
            <div class="form-group full-width">
              <label for="sb-url">Supabase Project URL</label>
              <input type="url" id="sb-url" class="input-field" value="${url || ''}" placeholder="https://tu-proyecto.supabase.co" required>
              <span class="field-hint">Encuéntralo en tu panel de Supabase &rarr; Project Settings &rarr; API</span>
            </div>

            <div class="form-group full-width">
              <label for="sb-key">Supabase Anon Public API Key</label>
              <input type="password" id="sb-key" class="input-field" value="${anonKey || ''}" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..." required>
              <span class="field-hint">Clave pública segura para clientes web (anon key con RLS)</span>
            </div>

            <div class="settings-actions-row full-width">
              <button type="button" id="btn-test-sb" class="btn btn-secondary">
                <span>Probar Conexión</span>
              </button>
              <button type="submit" id="btn-save-sb" class="btn btn-primary btn-glow">
                <span>Guardar Credenciales</span>
              </button>
            </div>
          </form>

          <!-- SECCIÓN 3: MONITOR DE SINCRONIZACIÓN SILENCIOSA -->
          <div class="sync-monitor-box">
            <div class="sync-monitor-header">
              <div class="sync-status-indicator">
                <span class="status-dot ${navigator.onLine ? 'dot-online' : 'dot-offline'}"></span>
                <span class="status-text">${navigator.onLine ? 'Conexión a la red detectada' : 'Modo sin conexión (Offline)'}</span>
              </div>
              <button id="btn-manual-sync" class="btn btn-secondary btn-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                <span>Sincronizar Ahora</span>
              </button>
            </div>

            <div class="sync-metrics-row">
              <div class="sync-metric-item">
                <span class="smetric-label">Elementos en cola local:</span>
                <span class="smetric-val" id="sync-pending-count">${pendingItems.length} pendientes</span>
              </div>
              <div class="sync-metric-item">
                <span class="smetric-label">Última sincronización:</span>
                <span class="smetric-val" id="sync-last-time">${syncManager.lastSyncTime ? syncManager.lastSyncTime.toLocaleTimeString() : 'Al iniciar'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- INSTRUCCIONES GITHUB CRON Y AUTO-DEPLOY -->
      <div class="card glass-card info-card">
        <div class="card-header">
          <div class="card-icon-box accent-coral">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <div>
            <h2 class="card-title">GitHub Pages & Tarea Cron de Mantenimiento</h2>
            <p class="card-description">Tu proyecto ya incluye los dos flujos automáticos de GitHub Actions</p>
          </div>
        </div>

        <div class="instructions-steps">
          <div class="step-item">
            <span class="step-num">1</span>
            <div class="step-text">
              <strong>Despliegue Automático en GitHub Pages:</strong>
              <p>Cada vez que hagas <code>git push</code> a la rama <code>main</code>, la acción <code>.github/workflows/deploy.yml</code> compila y publica tu sitio en tus Active Pages automáticamente.</p>
            </div>
          </div>

          <div class="step-item">
            <span class="step-num">2</span>
            <div class="step-text">
              <strong>Tarea Cron para Evitar Suspensión de Supabase:</strong>
              <p>Supabase en su plan gratuito suspende los proyectos inactivos tras 7 días. El flujo <code>.github/workflows/supabase-keepalive.yml</code> se ejecuta automáticamente cada 3 días mediante cron para hacer un ping a tu base de datos y mantenerla despierta 24/7.</p>
              <div class="code-box-compact">
                <span>Configura en tu GitHub Repo &rarr; Settings &rarr; Secrets and variables &rarr; Actions:</span>
                <code>SUPABASE_URL = ${url || 'https://tu-proyecto.supabase.co'}</code>
                <code>SUPABASE_ANON_KEY = ${anonKey ? anonKey.substring(0, 15) + '...' : 'tu-anon-key'}</code>
              </div>
            </div>
          </div>

          <div class="step-item">
            <span class="step-num">3</span>
            <div class="step-text">
              <strong>Ingreso con Google (OAuth):</strong>
              <p>En tu panel de Supabase &rarr; <em>Authentication</em> &rarr; <em>Providers</em> &rarr; <em>Google</em>, activa el proveedor e introduce tu Client ID y Client Secret de Google Cloud Console. En la consola de Google, añade como URI de redirección autorizada: <code>https://&lt;tu-usuario&gt;.github.io/&lt;tu-repo&gt;/</code></p>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEvents(container);
  },

  attachEvents(container) {
    // 1. Google OAuth Login
    const googleBtn = container.querySelector('#btn-google-login');
    if (googleBtn) {
      googleBtn.addEventListener('click', async () => {
        try {
          googleBtn.disabled = true;
          await authService.signInWithGoogle();
        } catch (err) {
          console.error('Google login error:', err);
          Toast.error(err.message, 'Error de Ingreso con Google');
          googleBtn.disabled = false;
        }
      });
    }

    // 2. Email Login / Signup Toggle
    const tabLogin = container.querySelector('#tab-login');
    const tabSignup = container.querySelector('#tab-signup');
    const signupNameGroup = container.querySelector('#signup-name-group');
    const submitBtn = container.querySelector('#btn-submit-email-auth');
    const emailAuthForm = container.querySelector('#form-email-auth');
    let isSignupMode = false;

    if (tabLogin && tabSignup) {
      tabLogin.addEventListener('click', () => {
        isSignupMode = false;
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
        if (signupNameGroup) signupNameGroup.style.display = 'none';
        if (submitBtn) submitBtn.textContent = 'Iniciar Sesión';
      });

      tabSignup.addEventListener('click', () => {
        isSignupMode = true;
        tabSignup.classList.add('active');
        tabLogin.classList.remove('active');
        if (signupNameGroup) signupNameGroup.style.display = 'block';
        if (submitBtn) submitBtn.textContent = 'Crear Cuenta en Supabase';
      });
    }

    if (emailAuthForm) {
      emailAuthForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = container.querySelector('#auth-email').value.trim();
        const password = container.querySelector('#auth-password').value;
        const fullName = container.querySelector('#auth-fullname')?.value.trim() || 'Atleta';

        submitBtn.disabled = true;
        submitBtn.textContent = 'Procesando...';

        try {
          if (isSignupMode) {
            await authService.signUpWithEmail(email, password, fullName);
            Toast.success('Cuenta creada exitosamente. Revisa tu correo de confirmación si está activado.', '¡Bienvenido!');
          } else {
            await authService.signInWithEmail(email, password);
            Toast.success('Sesión iniciada correctamente con Supabase.', '¡Conectado!');
          }
          this.render(container);
        } catch (err) {
          console.error('Auth error:', err);
          Toast.error(err.message, 'Error de Autenticación');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = isSignupMode ? 'Crear Cuenta en Supabase' : 'Iniciar Sesión';
        }
      });
    }

    // 3. Sign Out
    const signOutBtn = container.querySelector('#btn-sign-out');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', async () => {
        await authService.signOut();
        Toast.info('Sesión cerrada. Has regresado al modo local.');
        this.render(container);
      });
    }

    // 4. Guardar Credenciales de Supabase
    const sbForm = container.querySelector('#form-supabase-config');
    if (sbForm) {
      sbForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = container.querySelector('#sb-url').value.trim();
        const key = container.querySelector('#sb-key').value.trim();

        await SupabaseManager.saveConfig(url, key);
        Toast.success('Credenciales de Supabase guardadas localmente.', 'Configurado');
        // Disparar sincronización silenciosa
        syncManager.syncNow();
        this.render(container);
      });
    }

    // 5. Probar Conexión Supabase
    const testSbBtn = container.querySelector('#btn-test-sb');
    if (testSbBtn) {
      testSbBtn.addEventListener('click', async () => {
        const url = container.querySelector('#sb-url').value.trim();
        const key = container.querySelector('#sb-key').value.trim();

        if (!url || !key) {
          Toast.warning('Ingresa la URL y la Anon Key de Supabase para probar.');
          return;
        }

        testSbBtn.disabled = true;
        testSbBtn.innerHTML = `<span>Verificando...</span>`;

        const res = await SupabaseManager.testConnection(url, key);
        if (res.success) {
          Toast.success('¡Conexión con Supabase verificada con éxito!', 'En Línea');
        } else {
          Toast.error('No se pudo conectar: ' + res.message, 'Error de Conexión');
        }

        testSbBtn.disabled = false;
        testSbBtn.innerHTML = `<span>Probar Conexión</span>`;
      });
    }

    // 6. Sincronización Manual Inmediata
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
  }
};
