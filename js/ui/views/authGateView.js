// ==============================================================================
// FITPULSE - AUTHENTICATION GATE VIEW (BARRERA DE ACCESO)
// Bloquea el uso de la aplicación hasta que el usuario se registre o inicie sesión.
// ==============================================================================

import { authService } from '../../services/authService.js';
import { Toast } from '../toast.js';
import { router } from '../router.js';

export const AuthGateView = {
  render(container) {
    container.innerHTML = `
      <div class="auth-gate-screen">
        <div class="card glass-card auth-gate-card">
          <div class="auth-gate-brand">
            <div class="brand-icon-lg">⚡</div>
            <h1 class="brand-title-lg">FitPulse</h1>
            <p class="auth-gate-subtitle">Plataforma de Entrenamiento de Alto Rendimiento & Motor Biométrico</p>
          </div>

          <div class="auth-gate-banner">
            <div class="gate-icon">🔒</div>
            <div class="gate-text">
              <strong>Acceso Restringido para Atletas</strong>
              <span>Para gestionar tus sesiones, registrar biométricas y sincronizar tu progreso en la nube, debes iniciar sesión.</span>
            </div>
          </div>

          <!-- BOTÓN GOOGLE OAUTH -->
          <div class="gate-oauth-row">
            <button id="btn-gate-google" class="btn btn-google full-width btn-lg">
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>Continuar con Cuenta de Google</span>
            </button>
          </div>

          <div class="auth-divider"><span>o mediante Correo Electrónico</span></div>

          <!-- FORMULARIO DE EMAIL -->
          <div class="gate-email-box">
            <div class="auth-tab-buttons">
              <button type="button" class="tab-btn active" id="gate-tab-login">Iniciar Sesión</button>
              <button type="button" class="tab-btn" id="gate-tab-signup">Crear Cuenta</button>
            </div>

            <form id="gate-email-form" class="email-auth-form">
              <div class="form-group full-width" id="gate-signup-name-group" style="display: none;">
                <label for="gate-fullname">Nombre y Apellido</label>
                <input type="text" id="gate-fullname" class="input-field" placeholder="Tu nombre">
              </div>

              <div class="form-group full-width">
                <label for="gate-email">Correo Electrónico</label>
                <input type="email" id="gate-email" class="input-field" placeholder="ejemplo@correo.com" required>
              </div>

              <div class="form-group full-width">
                <label for="gate-password">Contraseña</label>
                <input type="password" id="gate-password" class="input-field" placeholder="Mínimo 6 caracteres" required>
              </div>

              <button type="submit" id="btn-gate-submit" class="btn btn-primary btn-glow btn-lg full-width">
                Iniciar Sesión
              </button>
            </form>
          </div>
        </div>
      </div>
    `;

    this.attachEvents(container);
  },

  attachEvents(container) {
    const googleBtn = container.querySelector('#btn-gate-google');
    if (googleBtn) {
      googleBtn.addEventListener('click', async () => {
        try {
          googleBtn.disabled = true;
          googleBtn.innerHTML = `<span class="spinner-small"></span> <span>Conectando con Google...</span>`;
          await authService.signInWithGoogle();
        } catch (err) {
          console.error('Google Auth Error:', err);
          Toast.error(err.message, 'Error de Ingreso con Google');
          googleBtn.disabled = false;
          googleBtn.innerHTML = `<span>Continuar con Cuenta de Google</span>`;
        }
      });
    }

    const tabLogin = container.querySelector('#gate-tab-login');
    const tabSignup = container.querySelector('#gate-tab-signup');
    const signupNameGroup = container.querySelector('#gate-signup-name-group');
    const submitBtn = container.querySelector('#btn-gate-submit');
    const form = container.querySelector('#gate-email-form');
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

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = container.querySelector('#gate-email').value.trim();
        const password = container.querySelector('#gate-password').value;
        const fullName = container.querySelector('#gate-fullname')?.value.trim() || 'Atleta';

        submitBtn.disabled = true;
        submitBtn.textContent = 'Verificando...';

        try {
          if (isSignupMode) {
            await authService.signUpWithEmail(email, password, fullName);
            Toast.success('Cuenta creada exitosamente. Iniciando...', '¡Bienvenido!');
          } else {
            await authService.signInWithEmail(email, password);
            Toast.success('Bienvenido a FitPulse.', '¡Sesión Iniciada!');
          }
          // Navegar al dashboard
          router.navigate('dashboard');
        } catch (err) {
          console.error('Error Auth:', err);
          Toast.error(err.message, 'Error de Acceso');
          submitBtn.disabled = false;
          submitBtn.textContent = isSignupMode ? 'Crear Cuenta en Supabase' : 'Iniciar Sesión';
        }
      });
    }
  }
};
