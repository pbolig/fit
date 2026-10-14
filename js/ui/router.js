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

class Router {
  constructor() {
    this.routes = {
      dashboard: DashboardView,
      profile: ProfileView,
      workout: WorkoutView,
      history: HistoryView,
      catalog: CatalogView,
      settings: SettingsView
    };
    this.currentView = null;
    this.container = null;
  }

  init(containerElement) {
    this.container = containerElement;

    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '') || 'dashboard';
      this.navigate(hash, false);
    });

    // Cargar ruta inicial
    const initialHash = window.location.hash.replace('#', '') || 'dashboard';
    this.navigate(initialHash, false);
  }

  async navigate(routeName, updateHash = true) {
    const targetRoute = this.routes[routeName] ? routeName : 'dashboard';

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
          await this.routes[targetRoute].render(this.container);
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
