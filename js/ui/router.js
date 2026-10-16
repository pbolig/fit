// ==============================================================================
// FITPULSE - CLIENT-SIDE ROUTER & VIEW MANAGER
// Permite navegación fluida sin recargas, sincronizada con el hash de la URL.
// ==============================================================================

import { DashboardView } from './views/dashboardView.js';
import { ProfileView } from './views/profileView.js';
import { WorkoutView } from './views/workoutView.js';
import { HistoryView } from './views/historyView.js';
import { CatalogView } from './views/catalogView.js';
import { SettingsView } from './views/settingsView.js';
import { AuthGateView } from './views/authGateView.js';
import { SuperAdminView } from './views/superAdminView.js';
import { TrainerHubView } from './views/trainerHubView.js';
import { LiveRoomAthleteView } from './views/liveRoomAthleteView.js';
import { authService } from '../services/authService.js';

class Router {
  constructor() {
    this._routes = null;
    this.currentView = null;
    this.container = null;
  }

  getRoutes() {
    if (!this._routes) {
      this._routes = {
        dashboard: DashboardView,
        profile: ProfileView,
        workout: WorkoutView,
        history: HistoryView,
        catalog: CatalogView,
        settings: SettingsView,
        admin: SuperAdminView,
        'trainer-hub': TrainerHubView,
        classes: LiveRoomAthleteView
      };
    }
    return this._routes;
  }

  init(containerElement) {
    this.container = containerElement;
    this.getRoutes();

    // Escuchar cambios de autenticación
    window.addEventListener('fitpulse:auth-changed', (e) => {
      const user = e.detail?.user;
      if (user) {
        this.navigate('dashboard', true);
      } else {
        this.navigate('login', false);
      }
    });

    window.addEventListener('hashchange', () => {
      let hash = window.location.hash.replace('#', '') || 'dashboard';
      if (hash.includes('access_token=') || hash.includes('error=')) {
        hash = 'dashboard';
      }
      this.navigate(hash, false);
    });

    // Cargar ruta inicial detectando si regresamos de OAuth
    let initialHash = window.location.hash.replace('#', '');
    if (initialHash.includes('access_token=') || initialHash.includes('error=')) {
      setTimeout(() => {
        window.history.replaceState(null, '', window.location.pathname + '#dashboard');
      }, 500);
      initialHash = 'dashboard';
    }

    this.navigate(initialHash || 'dashboard', false);
  }

  async navigate(routeName, updateHash = true) {
    // 1. Verificar autenticación obligatoria
    if (!authService.isAuthenticated()) {
      document.body.classList.add('auth-locked');
      if (this.container) {
        this.container.innerHTML = '';
        this.currentView = 'login';
        AuthGateView.render(this.container);
      }
      return;
    }

    document.body.classList.remove('auth-locked');

    const routes = this.getRoutes();
    this.routes = routes;
    const targetRoute = routes[routeName] ? routeName : 'dashboard';

    if (updateHash) {
      window.location.hash = targetRoute;
    }

    // Actualizar enlaces activos en la barra de navegación
    document.querySelectorAll('.nav-link, .bottom-nav-item').forEach((link) => {
      const href = link.getAttribute('href') || '';
      if (href === `#${targetRoute}`) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Renderizar vista con animación de entrada
    if (this.container) {
      this.container.classList.add('view-fade-out');
      
      // Breve pausa para la transición visual
      setTimeout(async () => {
        this.container.innerHTML = '';
        this.currentView = targetRoute;
        
        try {
          await routes[targetRoute].render(this.container);
        } catch (err) {
          console.error(`Error al renderizar vista "${targetRoute}":`, err);
          this.container.innerHTML = `
            <div class="card glass-card error-boundary-box">
              <h3>Error al cargar la sección</h3>
              <p>${err.message}</p>
              <button onclick="window.location.hash = 'dashboard'" class="btn btn-primary">Volver al Inicio</button>
            </div>
          `;
        }
        
        this.container.classList.remove('view-fade-out');
        this.container.classList.add('view-fade-in');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 120);
    }
  }
}

export const router = new Router();
