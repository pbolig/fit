// ==============================================================================
// FITPULSE - TRAINER HUB & LIVE CLASS CONSOLE VIEW
// Permite al Entrenador:
// 1. Programar salas de entrenamiento (fecha, hora, rutina)
// 2. Controlar la sala de espera y admitir alumnos (Presenciales y Remotos)
// 3. Largar la rutina en vivo con cronómetro sincronizado
// 4. Activar/Desactivar interactividad por videocámara en el card de cada alumno remoto
// 5. Finalizar clase apagando todos los dispositivos y recolectando reportes
// 6. Consultar reportes de asistencia por usuario y por clase
// ==============================================================================

import { authService } from '../../services/authService.js';
import { classRoomService } from '../../services/classRoomService.js';
import { Toast } from '../toast.js';
import { router } from '../router.js';

export const TrainerHubView = {
  activeTab: 'classes', // 'classes' | 'live' | 'reports'
  currentLiveClassId: null,
  liveTimerInterval: null,
  activeClass: null,
  attendees: [],
  reportsSubTab: 'users', // 'users' | 'classes'
  unsubscribeRoomEvent: null,

  async render(container) {
    const isTrainer = await authService.isTrainer();

    // 1. Control de acceso
    if (!isTrainer) {
      container.innerHTML = `
        <div class="view-header">
          <h1 class="view-title">Hub del Entrenador</h1>
        </div>
        <div class="card glass-card text-center" style="padding: 48px 24px; max-width: 600px; margin: 0 auto;">
          <div style="font-size: 56px; margin-bottom: 16px;">🏋️‍♂️</div>
          <h2 style="font-size: 22px; font-weight: 700; margin-bottom: 12px; color: var(--color-primary-light, #38bdf8);">
            Acceso para Entrenadores Autorizados
          </h2>
          <p style="color: var(--color-text-muted); line-height: 1.6; margin-bottom: 24px;">
            Esta sección permite armar entrenamientos en sala, programar rutinas, admitir alumnos presenciales o remotos, e interactuar por cámara en vivo.
            <br><br>
            Pídele al Superusuario de FitPulse que te asigne el rol de <strong>Entrenador</strong> desde su panel de control.
          </p>
          <button id="btn-trainer-to-dashboard" class="btn btn-primary" style="margin: 0 auto;">
            Volver al Inicio
          </button>
        </div>
      `;
      container.querySelector('#btn-trainer-to-dashboard')?.addEventListener('click', () => router.navigate('dashboard'));
      return;
    }

    container.innerHTML = `
      <div class="view-header" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            <span class="role-badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); font-size: 11px; padding: 4px 10px; border-radius: 999px; text-transform: uppercase; font-weight: 700;">⚡ Entrenador Pro</span>
            <span style="font-size: 13px; color: var(--color-text-muted);">${authService.getCurrentUser()?.name || 'Entrenador'}</span>
          </div>
          <h1 class="view-title" style="margin: 0;">Hub de Entrenamiento en Salas</h1>
          <p class="view-subtitle" style="margin-top: 4px;">Programa clases presenciales o remotas, admite a tus atletas y conduce rutinas en vivo.</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button id="btn-open-create-modal" class="btn btn-primary btn-sm btn-glow">
            <span>+ Programar Nueva Sala</span>
          </button>
          <a href="#classes" class="btn btn-secondary btn-sm" title="Ver como Alumno">
            <span>👁️ Vista de Atleta</span>
          </a>
        </div>
      </div>

      <!-- TABS NAVEGACIÓN ENTRENADOR -->
      <div class="catalog-filters-scroll" style="margin-bottom: 20px;">
        <div class="filter-pills" id="trainer-tabs">
          <button class="filter-pill ${this.activeTab === 'classes' ? 'active' : ''}" data-tab="classes">
            <span>🏛️ Mis Salas Programadas</span>
          </button>
          <button class="filter-pill ${this.activeTab === 'live' ? 'active' : ''}" data-tab="live">
            <span>🔴 Consola de Sala en Vivo</span>
          </button>
          <button class="filter-pill ${this.activeTab === 'reports' ? 'active' : ''}" data-tab="reports">
            <span>📊 Reportes de Asistencias</span>
          </button>
        </div>
      </div>

      <!-- CONTENEDOR DINÁMICO DE PESTAÑAS -->
      <div id="trainer-tab-content">
        <div class="loading-state card glass-card" style="padding: 40px; text-align: center;">
          <div class="sync-spinner" style="margin: 0 auto 16px;"></div>
          <p>Cargando información del entrenador...</p>
        </div>
      </div>

      <!-- MODAL CREAR NUEVA SALA -->
      <div class="modal-backdrop hidden" id="modal-create-class" style="display: none;">
        <div class="modal-card glass-card" style="max-width: 640px; width: 92%; margin: 24px auto; border-radius: 16px; border: 1px solid rgba(255,255,255,0.14); box-shadow: 0 25px 60px rgba(0,0,0,0.85); overflow: hidden;">
          <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding: 18px 26px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 24px;">🏛️</span>
              <div>
                <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #f8fafc;">Programar Nueva Sala de Entrenamiento</h3>
                <p style="margin: 2px 0 0; font-size: 12px; color: var(--color-text-muted);">Configura el horario, cupo y la rutina que largarás en vivo</p>
              </div>
            </div>
            <button class="btn-icon" id="btn-close-modal-create" style="background: rgba(255,255,255,0.06); border: none; color: var(--color-text-muted); cursor: pointer; font-size: 22px; width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center;">&times;</button>
          </div>

          <form id="form-create-class" style="display: flex; flex-direction: column; gap: 18px; padding: 22px 28px 26px;">
            <div>
              <label class="form-label" style="display: block; font-size: 13px; margin-bottom: 6px; font-weight: 600;">Título o Nombre de la Clase</label>
              <input type="text" id="class-title" class="form-control" placeholder="Ej: WOD Funcional & Hipertrofia Matutina" required />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div>
                <label class="form-label" style="display: block; font-size: 13px; margin-bottom: 6px; font-weight: 600;">Categoría</label>
                <select id="class-category" class="form-control">
                  <option value="Baile & Ritmos">Baile & Ritmos (Salsa, Bachata, Latinos, etc.)</option>
                  <option value="Fuerza">Fuerza & Potencia</option>
                  <option value="Funcional">Entrenamiento Funcional</option>
                  <option value="HIIT">HIIT & Quema Grasa</option>
                  <option value="Hipertrofia">Hipertrofia y Tono</option>
                  <option value="Movilidad">Movilidad & Core</option>
                </select>
              </div>

              <div>
                <label class="form-label" style="display: block; font-size: 13px; margin-bottom: 6px; font-weight: 600;">Duración (minutos)</label>
                <div style="position: relative;">
                  <input type="number" id="class-duration" class="form-control" value="60" min="15" max="180" required style="padding-right: 48px;" />
                  <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 12px; color: var(--color-text-muted); pointer-events: none;">min</span>
                </div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 16px;">
              <div>
                <label class="form-label" style="display: block; font-size: 13px; margin-bottom: 6px; font-weight: 600;">Día y Horario de Inicio</label>
                <input type="datetime-local" id="class-scheduled-at" class="form-control" required />
              </div>

              <div>
                <label class="form-label" style="display: block; font-size: 13px; margin-bottom: 6px; font-weight: 600;">Capacidad Máxima</label>
                <div style="position: relative;">
                  <input type="number" id="class-capacity" class="form-control" value="25" min="1" max="100" required style="padding-right: 56px;" />
                  <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 12px; color: var(--color-text-muted); pointer-events: none;">atletas</span>
                </div>
              </div>
            </div>

            <div>
              <label class="form-label" style="display: block; font-size: 13px; margin-bottom: 6px; font-weight: 600;">Plantilla de Rutina a Largar a la Sala</label>
              <select id="class-routine-template" class="form-control">
                <option value="dance_latin">Rutina 5: Baile & Ritmos Latinos (Salsa, Bachata, Merengue, Cardio Dance)</option>
                <option value="fullbody">Rutina 1: Full-Body Biomecánico (Sentadilla, Press, Peso Muerto, Plancha)</option>
                <option value="hiit">Rutina 2: Circuito HIIT Cardiovascular (Burpees, Saltos, Flexiones, Escaladores)</option>
                <option value="upper">Rutina 3: Tren Superior y Core (Press Militar, Dominadas, Fondos, Crunch)</option>
                <option value="legs">Rutina 4: Tren Inferior de Potencia (Sentadilla Búlgara, Zancadas, Gemelos)</option>
              </select>
            </div>

            <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.22); border-radius: 10px; padding: 14px 16px; font-size: 12px; color: var(--color-primary-light); line-height: 1.5;">
              ℹ️ Los atletas podrán unirse de manera <strong>Presencial 📍</strong> o <strong>Remota 🌐</strong>. Antes de dar inicio, deberás admitirlos previamente desde la sala de espera.
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;">
              <button type="button" class="btn btn-secondary" id="btn-cancel-create">Cancelar</button>
              <button type="submit" class="btn btn-primary btn-glow">Programar Sala</button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Configurar fecha por defecto en modal (hoy + 1 hora)
    const dt = new Date();
    dt.setHours(dt.getHours() + 1, 0, 0, 0);
    const localIso = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const dateInput = container.querySelector('#class-scheduled-at');
    if (dateInput) dateInput.value = localIso;

    this.bindEvents(container);
    this.setupRealtimeListeners(container);
    await this.loadData(container);
  },

  bindEvents(container) {
    // Cambio de pestañas
    container.querySelectorAll('#trainer-tabs .filter-pill').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        if (tab && tab !== this.activeTab) {
          this.activeTab = tab;
          container.querySelectorAll('#trainer-tabs .filter-pill').forEach((p) => p.classList.remove('active'));
          e.currentTarget.classList.add('active');
          this.renderTabContent(container);
        }
      });
    });

    // Modal Crear Sala
    const modal = container.querySelector('#modal-create-class');
    const openBtn = container.querySelector('#btn-open-create-modal');
    const closeBtn = container.querySelector('#btn-close-modal-create');
    const cancelBtn = container.querySelector('#btn-cancel-create');
    const form = container.querySelector('#form-create-class');

    const showCreateModal = () => {
      if (modal) {
        modal.style.display = 'flex';
        modal.classList.remove('hidden');
      }
    };

    const hideCreateModal = () => {
      if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
      }
    };

    openBtn?.addEventListener('click', showCreateModal);
    closeBtn?.addEventListener('click', hideCreateModal);
    cancelBtn?.addEventListener('click', hideCreateModal);
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) hideCreateModal();
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleCreateClass(container);
    });
  },

  setupRealtimeListeners(container) {
    if (this.unsubscribeRoomEvent) {
      this.unsubscribeRoomEvent();
    }

    this.unsubscribeRoomEvent = classRoomService.onRoomEvent((action, payload) => {
      console.log('[TrainerHubView] Evento en tiempo real:', action, payload);

      if (action === 'ATTENDEE_JOINED' || action === 'ATTENDEE_UPDATED') {
        Toast.show(`🔔 ${payload.user_name} ha ingresado a la sala de espera (${payload.mode === 'in_person' ? 'Presencial' : 'Remoto'})`, 'info');
        if (this.activeTab === 'live') {
          this.reloadAttendees(container);
        }
      } else if (action === 'ATTENDEE_ADMITTED' || action === 'ATTENDEE_REJECTED') {
        if (this.activeTab === 'live') {
          this.reloadAttendees(container);
        }
      }
    });
  },

  async loadData(container) {
    try {
      this.classes = await classRoomService.getAllClasses();

      // Si no hay sala activa seleccionada, tomar la primera en vivo, o en sala de espera, o la próxima
      if (!this.currentLiveClassId && this.classes.length > 0) {
        const activeOne = this.classes.find((c) => c.status === 'live' || c.status === 'waiting_room') || this.classes[0];
        this.currentLiveClassId = activeOne.id;
      }

      this.renderTabContent(container);
    } catch (err) {
      console.error('[TrainerHubView] Error al cargar salas:', err);
    }
  },

  renderTabContent(container) {
    const content = container.querySelector('#trainer-tab-content');
    if (!content) return;

    if (this.activeTab === 'classes') {
      this.renderClassesTab(content, container);
    } else if (this.activeTab === 'live') {
      this.renderLiveTab(content, container);
    } else if (this.activeTab === 'reports') {
      this.renderReportsTab(content, container);
    }
  },

  // ============================================================================
  // TAB 1: LISTADO DE SALAS PROGRAMADAS
  // ============================================================================
  renderClassesTab(content, container) {
    content.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <h2 style="font-size: 20px; font-weight: 700; margin: 0;">Salas y Entrenamientos Programados</h2>
          <p style="color: var(--color-text-muted); font-size: 13px; margin: 4px 0 0;">
            Abre una sala para recibir a tus atletas en la sala de espera y lanzar la rutina sincronizada.
          </p>
        </div>
        <button id="btn-quick-new-class" class="btn btn-primary btn-sm btn-glow">
          <span>+ Nueva Sala</span>
        </button>
      </div>

      <div class="classes-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 18px;">
        ${
          this.classes.length === 0
            ? `
              <div class="card glass-card text-center" style="grid-column: 1 / -1; padding: 48px 24px;">
                <div style="font-size: 48px; margin-bottom: 12px;">🏛️</div>
                <h3 style="margin-bottom: 8px;">No tienes salas programadas</h3>
                <p style="color: var(--color-text-muted); margin-bottom: 20px;">Crea tu primera sala de entrenamiento para comenzar a admitir atletas presenciales o remotos.</p>
                <button class="btn btn-primary btn-glow" id="btn-empty-create">Programar Primera Sala</button>
              </div>
            `
            : this.classes
                .map((cls) => {
                  const dateFormatted = new Date(cls.scheduled_at).toLocaleString('es-ES', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  const statusColors = {
                    live: 'background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.5);',
                    waiting_room: 'background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.5);',
                    scheduled: 'background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4);',
                    completed: 'background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4);'
                  };

                  const statusLabels = {
                    live: '🔴 EN VIVO',
                    waiting_room: '⏳ SALA DE ESPERA',
                    scheduled: '📅 PROGRAMADA',
                    completed: '✅ COMPLETADA'
                  };

                  const isLiveOrWaiting = cls.status === 'live' || cls.status === 'waiting_room';

                  return `
                    <div class="card glass-card class-card ${isLiveOrWaiting ? 'pulse-border' : ''}" style="display: flex; flex-direction: column; justify-content: space-between; border-radius: 12px; padding: 20px;">
                      <div>
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                          <span class="badge" style="${statusColors[cls.status] || ''}">${statusLabels[cls.status] || cls.status}</span>
                          <span style="font-size: 12px; color: var(--color-text-muted);">⏱️ ${cls.duration_minutes} min</span>
                        </div>

                        <h3 style="font-size: 17px; font-weight: 700; margin: 0 0 8px; color: var(--color-text-main);">${cls.title}</h3>
                        
                        <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--color-text-muted); margin-bottom: 14px;">
                          <span>📅 ${dateFormatted}</span>
                          <span>•</span>
                          <span>🏷️ ${cls.category}</span>
                        </div>

                        <div style="background: rgba(15, 23, 42, 0.5); padding: 10px 14px; border-radius: 8px; font-size: 12px; margin-bottom: 16px;">
                          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span style="color: var(--color-text-muted);">Rutina Asignada:</span>
                            <span style="font-weight: 600; color: var(--color-text-main);">${cls.routine_config?.name || 'Rutina Estándar'}</span>
                          </div>
                          <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--color-text-muted);">Modalidad:</span>
                            <span style="color: var(--color-primary-light);">📍 Presencial / 🌐 Remoto</span>
                          </div>
                        </div>
                      </div>

                      <div style="display: flex; gap: 10px; margin-top: auto;">
                        <button class="btn btn-primary btn-sm btn-open-console btn-glow" data-class-id="${cls.id}" style="flex: 1;">
                          <span>${cls.status === 'live' ? '🔴 Ingresar a la Clase' : 'Abrir Consola en Vivo'}</span>
                        </button>
                        <button class="btn btn-outline btn-sm btn-delete-room" data-class-id="${cls.id}" title="Eliminar sala" style="border-color: rgba(239, 68, 68, 0.3); color: #f87171;">
                          🗑️
                        </button>
                      </div>
                    </div>
                  `;
                })
                .join('')
        }
      </div>
    `;

    // Eventos
    const showModal = () => {
      const modal = container.querySelector('#modal-create-class');
      if (modal) {
        modal.style.display = 'flex';
        modal.classList.remove('hidden');
      }
    };

    content.querySelector('#btn-quick-new-class')?.addEventListener('click', showModal);
    content.querySelector('#btn-empty-create')?.addEventListener('click', showModal);

    content.querySelectorAll('.btn-open-console').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const classId = e.currentTarget.dataset.classId;
        this.currentLiveClassId = classId;
        this.activeTab = 'live';
        container.querySelectorAll('#trainer-tabs .filter-pill').forEach((p) => p.classList.remove('active'));
        container.querySelector('[data-tab="live"]')?.classList.add('active');
        this.renderTabContent(container);
      });
    });

    content.querySelectorAll('.btn-delete-room').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const classId = e.currentTarget.dataset.classId;
        if (confirm('¿Eliminar esta sala de entrenamiento?')) {
          await classRoomService.deleteClass(classId);
          Toast.show('Sala eliminada correctamente', 'success');
          await this.loadData(container);
        }
      });
    });
  },

  // ============================================================================
  // TAB 2: CONSOLA DE SALA EN VIVO & INTERACCIÓN POR CÁMARA
  // ============================================================================
  async renderLiveTab(content, container) {
    if (!this.currentLiveClassId) {
      content.innerHTML = `
        <div class="card glass-card text-center" style="padding: 48px 24px;">
          <div style="font-size: 48px; margin-bottom: 12px;">🏛️</div>
          <h3>Selecciona una sala para iniciar la consola en vivo</h3>
          <p style="color: var(--color-text-muted); margin-bottom: 20px;">Dirígete a la pestaña "Mis Salas" y haz clic en "Abrir Consola en Vivo".</p>
          <button class="btn btn-primary" id="btn-go-to-classes">Ver Mis Salas</button>
        </div>
      `;
      content.querySelector('#btn-go-to-classes')?.addEventListener('click', () => {
        this.activeTab = 'classes';
        container.querySelectorAll('#trainer-tabs .filter-pill').forEach((p) => p.classList.remove('active'));
        container.querySelector('[data-tab="classes"]')?.classList.add('active');
        this.renderTabContent(container);
      });
      return;
    }

    this.activeClass = await classRoomService.getClassById(this.currentLiveClassId);
    if (!this.activeClass) {
      content.innerHTML = `<div class="card glass-card"><p>Sala no encontrada.</p></div>`;
      return;
    }

    this.attendees = await classRoomService.getAttendeesByClass(this.currentLiveClassId);

    const pendingAttendees = this.attendees.filter((a) => a.status === 'pending');
    const admittedAttendees = this.attendees.filter((a) => a.status === 'admitted');

    const statusBadge = {
      live: '<span class="badge" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.5);">🔴 CLASE EN VIVO</span>',
      waiting_room: '<span class="badge" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.5);">⏳ SALA DE ESPERA ABIERTA</span>',
      scheduled: '<span class="badge" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4);">📅 SALA PROGRAMADA</span>',
      completed: '<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4);">✅ CLASE FINALIZADA</span>'
    }[this.activeClass.status] || '';

    content.innerHTML = `
      <!-- HEADER CONSOLA EN VIVO -->
      <div class="card glass-card" style="padding: 20px; margin-bottom: 20px; border-left: 4px solid var(--color-primary-light);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
              ${statusBadge}
              <span style="font-size: 13px; color: var(--color-text-muted);">Entrenador: <strong>${this.activeClass.trainer_name}</strong></span>
            </div>
            <h2 style="font-size: 22px; font-weight: 800; margin: 0 0 6px;">${this.activeClass.title}</h2>
            <div style="font-size: 13px; color: var(--color-text-muted); display: flex; gap: 12px; flex-wrap: wrap;">
              <span>🏷️ ${this.activeClass.category}</span>
              <span>•</span>
              <span>📋 Rutina: <strong>${this.activeClass.routine_config?.name || 'Estándar'}</strong></span>
              <span>•</span>
              <span>👥 ${admittedAttendees.length} Admitidos / ${this.activeClass.max_capacity} Capacidad</span>
            </div>
          </div>

          <!-- BOTONES DE ACCIÓN PRINCIPAL DE LA SALA -->
          <div style="display: flex; gap: 10px; flex-wrap: wrap;" id="console-action-buttons">
            ${
              this.activeClass.status === 'scheduled'
                ? `<button class="btn btn-secondary btn-glow" id="btn-open-waiting-room">
                     <span>📢 Abrir Sala de Espera</span>
                   </button>`
                : ''
            }
            ${
              this.activeClass.status === 'waiting_room' || this.activeClass.status === 'scheduled'
                ? `<button class="btn btn-primary btn-glow" id="btn-launch-routine">
                     <span>🚀 Largar Rutina a la Sala</span>
                   </button>`
                : ''
            }
            ${
              this.activeClass.status === 'live'
                ? `<button class="btn btn-outline" style="border-color: #ef4444; color: #f87171; background: rgba(239, 68, 68, 0.1);" id="btn-finish-class">
                     <span>🏁 Finalizar Clase & Apagar Todo</span>
                   </button>`
                : ''
            }
          </div>
        </div>

        <!-- RELOJ Y PROGRESO DE LA RUTINA EN VIVO -->
        ${
          this.activeClass.status === 'live'
            ? `
              <div style="margin-top: 18px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 14px;">
                  <div style="font-size: 32px; font-family: monospace; font-weight: 800; color: var(--color-primary-light);" id="live-class-timer">00:00</div>
                  <div>
                    <div style="font-size: 11px; text-transform: uppercase; color: var(--color-text-muted); font-weight: 700;">Tiempo Transcurrido</div>
                    <div style="font-size: 14px; font-weight: 600; color: #34d399;">● Transmitiendo rutina en tiempo real</div>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 10px;">
                  <button class="btn btn-secondary btn-sm" id="btn-next-exercise">
                    <span>Siguiente Ejercicio ⏩</span>
                  </button>
                </div>
              </div>
            `
            : ''
        }
      </div>

      <!-- SECCIÓN 1: SALA DE ESPERA (ADMISIÓN PREVIA OBLIGATORIA) -->
      <div class="card glass-card" style="padding: 20px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <h3 style="margin: 0; font-size: 17px; font-weight: 700;">⏳ Sala de Espera (${pendingAttendees.length} pendientes)</h3>
            <span class="badge" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24;">Admisión Previa Obligatoria</span>
          </div>
          ${
            pendingAttendees.length > 0
              ? `<button class="btn btn-primary btn-sm btn-glow" id="btn-admit-all">
                   <span>✅ Admitir a Todos (${pendingAttendees.length})</span>
                 </button>`
              : ''
          }
        </div>

        <p style="font-size: 13px; color: var(--color-text-muted); margin: 0 0 16px;">
          Los atletas registrados que deseen ingresar deben ser admitidos por ti antes de iniciar el entrenamiento, tanto si están <strong>presencialmente</strong> en la sala como si están <strong>remotos</strong>.
        </p>

        <div id="pending-attendees-list">
          ${
            pendingAttendees.length === 0
              ? `
                <div style="padding: 24px; text-align: center; background: rgba(15, 23, 42, 0.4); border-radius: 8px; color: var(--color-text-muted); font-size: 13px;">
                  No hay atletas en espera en este momento. Comparte la sala o aguarda el ingreso de los alumnos.
                </div>
              `
              : `
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px;">
                  ${pendingAttendees
                    .map((a) => {
                      const isRemote = a.mode === 'remote';
                      const modeBadge = isRemote
                        ? `<span class="badge" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8;">🌐 Remoto</span>`
                        : `<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399;">📍 Presencial</span>`;

                      return `
                        <div class="glass-card" style="background: rgba(15, 23, 42, 0.7); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid rgba(255,255,255,0.06);">
                          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                              <div class="user-avatar-circle" style="width: 38px; height: 38px; font-size: 16px;">
                                ${a.user_avatar ? `<img src="${a.user_avatar}" style="width:100%; height:100%; border-radius:50%;" />` : '🏋️'}
                              </div>
                              <div>
                                <div style="font-weight: 700; font-size: 14px; color: var(--color-text-main);">${a.user_name}</div>
                                <div style="font-size: 11px; color: var(--color-text-muted);">${a.user_email || 'Atleta'}</div>
                              </div>
                            </div>
                            ${modeBadge}
                          </div>

                          <div style="display: flex; gap: 8px; margin-top: 8px;">
                            <button class="btn btn-primary btn-sm btn-admit-user btn-glow" data-id="${a.id}" style="flex: 1;">
                              ✅ Admitir
                            </button>
                            <button class="btn btn-outline btn-sm btn-reject-user" data-id="${a.id}" style="border-color: rgba(239, 68, 68, 0.4); color: #f87171;">
                              ❌
                            </button>
                          </div>
                        </div>
                      `;
                    })
                    .join('')}
                </div>
              `
          }
        </div>
      </div>

      <!-- SECCIÓN 2: ALUMNOS ADMITIDOS EN LA CLASE (CARDS CON VIDEOCÁMARA REMOTA) -->
      <div class="card glass-card" style="padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
          <div>
            <h3 style="margin: 0; font-size: 17px; font-weight: 700;">🏋️‍♂️ Alumnos en la Clase (${admittedAttendees.length} admitidos)</h3>
            <p style="margin: 4px 0 0; font-size: 13px; color: var(--color-text-muted);">
              Supervisa alumnos presenciales y presiona <strong>"Activar Cámara"</strong> en alumnos remotos para corregir postura e interactuar en vivo.
            </p>
          </div>
        </div>

        <div id="admitted-attendees-grid">
          ${
            admittedAttendees.length === 0
              ? `
                <div style="padding: 32px; text-align: center; background: rgba(15, 23, 42, 0.4); border-radius: 8px; color: var(--color-text-muted); font-size: 14px;">
                  Todavía no has admitido a ningún alumno. Admite atletas desde la sala de espera de arriba.
                </div>
              `
              : `
                <div class="attendees-card-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;">
                  ${admittedAttendees
                    .map((a) => {
                      const isRemote = a.mode === 'remote';
                      const modeBadge = isRemote
                        ? `<span class="badge" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4);">🌐 Remoto</span>`
                        : `<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4);">📍 Presencial</span>`;

                      return `
                        <div class="card glass-card attendee-roster-card" id="attendee-card-${a.id}" style="background: rgba(15, 23, 42, 0.75); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between;">
                          <!-- CABECERA DEL ALUMNO -->
                          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                              <div class="user-avatar-circle" style="width: 42px; height: 42px; font-size: 18px;">
                                ${a.user_avatar ? `<img src="${a.user_avatar}" style="width:100%; height:100%; border-radius:50%;" />` : '🏋️'}
                              </div>
                              <div>
                                <div style="font-weight: 700; font-size: 15px; color: var(--color-text-main);">${a.user_name}</div>
                                <div style="font-size: 11px; color: var(--color-text-muted);">${a.user_email || 'Atleta Admitido'}</div>
                              </div>
                            </div>
                            ${modeBadge}
                          </div>

                          <!-- CUERPO DE INTERACCIÓN: PRESENCIAL VS REMOTO -->
                          <div style="margin-bottom: 14px;">
                            ${
                              isRemote
                                ? `
                                  <!-- CONTENEDOR DE CÁMARA REMOTA EN EL CARD -->
                                  <div class="remote-cam-wrapper" id="remote-cam-box-${a.id}" style="background: #090d16; border: 1px dashed rgba(56, 189, 248, 0.3); border-radius: 8px; min-height: 180px; display: flex; flex-direction: column; justify-content: center; align-items: center; position: relative; overflow: hidden; margin-bottom: 10px;">
                                    <video id="video-feed-${a.id}" class="remote-video-element" style="width: 100%; height: 180px; object-fit: cover; display: none; border-radius: 7px;"></video>
                                    
                                    <div class="cam-placeholder" id="placeholder-cam-${a.id}" style="text-align: center; padding: 16px;">
                                      <div style="font-size: 28px; margin-bottom: 6px;">📹</div>
                                      <div style="font-size: 12px; color: var(--color-text-muted); font-weight: 500;">Cámara Remota en Espera</div>
                                      <div style="font-size: 11px; color: var(--color-primary-light); margin-top: 4px;">Presiona abajo para interactuar</div>
                                    </div>

                                    <div class="live-stream-overlay" id="overlay-cam-${a.id}" style="display: none; position: absolute; top: 8px; left: 8px; background: rgba(0,0,0,0.65); backdrop-filter: blur(4px); padding: 3px 8px; border-radius: 4px; font-size: 10px; color: #34d399; font-weight: 700; z-index: 10;">
                                      🔴 EN VIVO • 1080p
                                    </div>
                                  </div>

                                  <div style="display: flex; gap: 8px;">
                                    <button class="btn btn-primary btn-sm btn-toggle-camera btn-glow" data-id="${a.id}" id="btn-toggle-cam-${a.id}" style="flex: 1; font-size: 12px;">
                                      <span>📹 Activar Cámara Remota</span>
                                    </button>
                                  </div>
                                `
                                : `
                                  <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 8px; padding: 12px; font-size: 13px; color: #34d399; display: flex; align-items: center; gap: 10px;">
                                    <span style="font-size: 20px;">📍</span>
                                    <div>
                                      <strong>Atleta Físicamente Presente</strong>
                                      <div style="font-size: 11px; color: var(--color-text-muted); margin-top: 2px;">En sala con el entrenador</div>
                                    </div>
                                  </div>
                                `
                            }
                          </div>

                          <!-- FOOTER DEL CARD CON NOTAS Y SEGUIMIENTO -->
                          <div style="font-size: 11px; color: var(--color-text-muted); display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 10px;">
                            <span>Admitido: ${new Date(a.admitted_at || a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span style="color: var(--color-text-main); font-weight: 600;">Estado: Activo</span>
                          </div>
                        </div>
                      `;
                    })
                    .join('')}
                </div>
              `
          }
        </div>
      </div>
    `;

    this.bindLiveEvents(content, container);
    this.startLiveTimerIfNeeded(content);
  },

  bindLiveEvents(content, container) {
    // Abrir sala de espera
    content.querySelector('#btn-open-waiting-room')?.addEventListener('click', async () => {
      await classRoomService.updateClassStatus(this.currentLiveClassId, 'waiting_room');
      Toast.show('Sala de espera abierta. Los atletas ya pueden ingresar.', 'info');
      await this.renderLiveTab(content, container);
    });

    // Largar rutina
    content.querySelector('#btn-launch-routine')?.addEventListener('click', async () => {
      await classRoomService.launchRoutine(this.currentLiveClassId);
      Toast.show('🚀 ¡Rutina largada a toda la sala!', 'success');
      await this.renderLiveTab(content, container);
    });

    // Finalizar clase y apagar todo
    content.querySelector('#btn-finish-class')?.addEventListener('click', async () => {
      if (confirm('¿Deseas finalizar la clase? Esto apagará inmediatamente todas las transmisiones de cámara y consolidará el reporte de asistencia.')) {
        await this.handleFinishClass(container);
      }
    });

    // Admitir individual
    content.querySelectorAll('.btn-admit-user').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const attendeeId = e.currentTarget.dataset.id;
        await classRoomService.admitAttendee(attendeeId);
        Toast.show('Atleta admitido en la clase', 'success');
        await this.renderLiveTab(content, container);
      });
    });

    // Rechazar individual
    content.querySelectorAll('.btn-reject-user').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const attendeeId = e.currentTarget.dataset.id;
        await classRoomService.rejectAttendee(attendeeId);
        Toast.show('Solicitud descartada', 'info');
        await this.renderLiveTab(content, container);
      });
    });

    // Admitir a todos
    content.querySelector('#btn-admit-all')?.addEventListener('click', async () => {
      const pending = this.attendees.filter((a) => a.status === 'pending');
      for (const a of pending) {
        await classRoomService.admitAttendee(a.id);
      }
      Toast.show(`¡Se han admitido ${pending.length} atletas a la clase!`, 'success');
      await this.renderLiveTab(content, container);
    });

    // Activar / Apagar Cámara Remota
    content.querySelectorAll('.btn-toggle-camera').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const attendeeId = e.currentTarget.dataset.id;
        await this.toggleRemoteCamera(attendeeId, content);
      });
    });
  },

  startLiveTimerIfNeeded(content) {
    if (this.liveTimerInterval) {
      clearInterval(this.liveTimerInterval);
      this.liveTimerInterval = null;
    }

    if (this.activeClass?.status === 'live') {
      const timerEl = content.querySelector('#live-class-timer');
      const startTime = new Date(this.activeClass.live_state?.startedAt || Date.now()).getTime();

      const updateClock = () => {
        if (!timerEl) return;
        const now = Date.now();
        const diffSeconds = Math.max(0, Math.floor((now - startTime) / 1000));
        const mins = Math.floor(diffSeconds / 60).toString().padStart(2, '0');
        const secs = (diffSeconds % 60).toString().padStart(2, '0');
        timerEl.textContent = `${mins}:${secs}`;
      };

      updateClock();
      this.liveTimerInterval = setInterval(updateClock, 1000);
    }
  },

  async toggleRemoteCamera(attendeeId, content) {
    const videoEl = content.querySelector(`#video-feed-${attendeeId}`);
    const placeholder = content.querySelector(`#placeholder-cam-${attendeeId}`);
    const overlay = content.querySelector(`#overlay-cam-${attendeeId}`);
    const btn = content.querySelector(`#btn-toggle-cam-${attendeeId}`);
    const camBox = content.querySelector(`#remote-cam-box-${attendeeId}`);

    if (!videoEl || !btn) return;

    const isCurrentlyActive = videoEl.style.display !== 'none';

    if (isCurrentlyActive) {
      // APAGAR CÁMARA
      classRoomService.stopCameraStream(attendeeId);
      videoEl.style.display = 'none';
      if (placeholder) placeholder.style.display = 'block';
      if (overlay) overlay.style.display = 'none';
      btn.innerHTML = `<span>📹 Activar Cámara Remota</span>`;
      btn.classList.remove('btn-danger');
      btn.classList.add('btn-primary');
      if (camBox) camBox.style.border = '1px dashed rgba(56, 189, 248, 0.3)';

      await classRoomService.toggleAttendeeCamera(attendeeId, false);
      Toast.show('Cámara remota detenida', 'info');
    } else {
      // ACTIVAR CÁMARA
      Toast.show('Conectando cámara del atleta...', 'info');
      const stream = await classRoomService.startCameraStream(videoEl, attendeeId);

      videoEl.style.display = 'block';
      if (placeholder) placeholder.style.display = 'none';
      if (overlay) overlay.style.display = 'block';
      btn.innerHTML = `<span>⏹️ Apagar Cámara</span>`;
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-danger');
      if (camBox) camBox.style.border = '1px solid #10b981';

      await classRoomService.toggleAttendeeCamera(attendeeId, true);
      Toast.show('Cámara remota conectada en vivo', 'success');
    }
  },

  async handleFinishClass(container) {
    if (this.liveTimerInterval) {
      clearInterval(this.liveTimerInterval);
      this.liveTimerInterval = null;
    }

    try {
      const finished = await classRoomService.finishClass(this.currentLiveClassId);
      Toast.show('🏁 ¡Clase finalizada con éxito! Todas las cámaras se han apagado.', 'success');

      // Ir a la pestaña de reportes para mostrar el resumen
      this.activeTab = 'reports';
      container.querySelectorAll('#trainer-tabs .filter-pill').forEach((p) => p.classList.remove('active'));
      container.querySelector('[data-tab="reports"]')?.classList.add('active');
      this.renderTabContent(container);
    } catch (err) {
      console.error('[TrainerHubView] Error al finalizar clase:', err);
      Toast.show(`Error: ${err.message}`, 'error');
    }
  },

  async reloadAttendees(container) {
    if (this.activeTab === 'live' && this.currentLiveClassId) {
      const content = container.querySelector('#trainer-tab-content');
      if (content) {
        await this.renderLiveTab(content, container);
      }
    }
  },

  // ============================================================================
  // TAB 3: REPORTES DE ASISTENCIAS (POR USUARIO Y POR CLASE)
  // ============================================================================
  async renderReportsTab(content, container) {
    const studentReport = await classRoomService.getStudentAttendanceReport();
    const classHistoryReport = await classRoomService.getClassHistoryReport();

    content.innerHTML = `
      <div class="card glass-card" style="padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h2 style="font-size: 20px; font-weight: 700; margin: 0;">Reportes y Métricas de Asistencia</h2>
            <p style="color: var(--color-text-muted); font-size: 13px; margin: 4px 0 0;">
              Seguimiento de clases tomadas por cada atleta y auditoría histórica de cada sala.
            </p>
          </div>

          <!-- SUBTABS REPORTES -->
          <div class="filter-pills" id="reports-subtabs">
            <button class="filter-pill ${this.reportsSubTab === 'users' ? 'active' : ''}" data-subtab="users">
              <span>👥 Por Usuario / Atleta</span>
            </button>
            <button class="filter-pill ${this.reportsSubTab === 'classes' ? 'active' : ''}" data-subtab="classes">
              <span>🏛️ Por Clase Dictada</span>
            </button>
          </div>
        </div>

        <div id="reports-table-container">
          ${
            this.reportsSubTab === 'users'
              ? this.renderStudentReportTable(studentReport)
              : this.renderClassHistoryTable(classHistoryReport)
          }
        </div>
      </div>
    `;

    content.querySelectorAll('#reports-subtabs .filter-pill').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const subtab = e.currentTarget.dataset.subtab;
        if (subtab && subtab !== this.reportsSubTab) {
          this.reportsSubTab = subtab;
          this.renderReportsTab(content, container);
        }
      });
    });
  },

  renderStudentReportTable(studentReport) {
    if (studentReport.length === 0) {
      return `
        <div style="padding: 40px; text-align: center; color: var(--color-text-muted);">
          <div style="font-size: 40px; margin-bottom: 12px;">📊</div>
          <h3>Aún no hay asistencias registradas</h3>
          <p>Cuando admitas atletas y finalices clases, verás el recuento detallado de clases tomadas por cada usuario.</p>
        </div>
      `;
    }

    return `
      <div class="table-responsive" style="overflow-x: auto;">
        <table class="admin-table" style="width: 100%; border-collapse: separate; border-spacing: 0 8px;">
          <thead>
            <tr style="color: var(--color-text-muted); font-size: 12px; text-transform: uppercase; text-align: left;">
              <th style="padding: 8px 14px;">Atleta / Usuario</th>
              <th style="padding: 8px 14px;">Total Clases Tomadas</th>
              <th style="padding: 8px 14px;">Presenciales</th>
              <th style="padding: 8px 14px;">Remotas</th>
              <th style="padding: 8px 14px;">Última Asistencia</th>
            </tr>
          </thead>
          <tbody>
            ${studentReport
              .map((s) => {
                const lastDate = new Date(s.lastClassDate).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                });

                return `
                  <tr style="background: rgba(15, 23, 42, 0.6); border-radius: 8px;">
                    <td style="padding: 12px 14px; border-top-left-radius: 8px; border-bottom-left-radius: 8px;">
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="user-avatar-circle" style="width: 36px; height: 36px; font-size: 16px;">
                          ${s.userAvatar ? `<img src="${s.userAvatar}" style="width:100%; height:100%; border-radius:50%;" />` : '🏋️'}
                        </div>
                        <div>
                          <div style="font-weight: 700; font-size: 14px; color: var(--color-text-main);">${s.userName}</div>
                          <div style="font-size: 11px; color: var(--color-text-muted);">${s.userEmail || 'Atleta'}</div>
                        </div>
                      </div>
                    </td>
                    <td style="padding: 12px 14px;">
                      <span class="badge" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; font-weight: 700; font-size: 13px;">
                        ${s.totalClasses} clases
                      </span>
                    </td>
                    <td style="padding: 12px 14px; font-size: 13px; color: #34d399;">
                      📍 ${s.inPersonCount}
                    </td>
                    <td style="padding: 12px 14px; font-size: 13px; color: #38bdf8;">
                      🌐 ${s.remoteCount}
                    </td>
                    <td style="padding: 12px 14px; font-size: 13px; color: var(--color-text-muted); border-top-right-radius: 8px; border-bottom-right-radius: 8px;">
                      ${lastDate}
                    </td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  renderClassHistoryTable(classHistoryReport) {
    if (classHistoryReport.length === 0) {
      return `<div style="padding: 40px; text-align: center; color: var(--color-text-muted);">No hay clases registradas.</div>`;
    }

    return `
      <div class="table-responsive" style="overflow-x: auto;">
        <table class="admin-table" style="width: 100%; border-collapse: separate; border-spacing: 0 8px;">
          <thead>
            <tr style="color: var(--color-text-muted); font-size: 12px; text-transform: uppercase; text-align: left;">
              <th style="padding: 8px 14px;">Fecha y Hora</th>
              <th style="padding: 8px 14px;">Clase / Título</th>
              <th style="padding: 8px 14px;">Total Admitidos</th>
              <th style="padding: 8px 14px;">Presenciales vs Remotos</th>
              <th style="padding: 8px 14px;">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${classHistoryReport
              .map((c) => {
                const dateFormatted = new Date(c.scheduledAt).toLocaleString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return `
                  <tr style="background: rgba(15, 23, 42, 0.6); border-radius: 8px;">
                    <td style="padding: 12px 14px; font-size: 13px; color: var(--color-text-muted); border-top-left-radius: 8px; border-bottom-left-radius: 8px;">
                      ${dateFormatted}
                    </td>
                    <td style="padding: 12px 14px;">
                      <div style="font-weight: 700; font-size: 14px; color: var(--color-text-main);">${c.title}</div>
                      <div style="font-size: 11px; color: var(--color-text-muted);">${c.category} • ${c.durationMinutes} min</div>
                    </td>
                    <td style="padding: 12px 14px;">
                      <span class="badge" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8;">
                        👥 ${c.totalAdmitted} alumnos
                      </span>
                    </td>
                    <td style="padding: 12px 14px; font-size: 12px;">
                      <span style="color: #34d399;">📍 ${c.inPersonCount}</span> / <span style="color: #38bdf8;">🌐 ${c.remoteCount}</span>
                    </td>
                    <td style="padding: 12px 14px; border-top-right-radius: 8px; border-bottom-right-radius: 8px;">
                      <span class="badge" style="font-size: 11px; ${c.status === 'completed' ? 'background: rgba(16, 185, 129, 0.2); color: #34d399;' : ''}">${c.status}</span>
                    </td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  // ============================================================================
  // CREACIÓN DE SALA
  // ============================================================================
  async handleCreateClass(container) {
    const title = container.querySelector('#class-title')?.value;
    const category = container.querySelector('#class-category')?.value;
    const duration = container.querySelector('#class-duration')?.value;
    const scheduledAt = container.querySelector('#class-scheduled-at')?.value;
    const capacity = container.querySelector('#class-capacity')?.value;
    const routineTemplate = container.querySelector('#class-routine-template')?.value;

    if (!title || !scheduledAt) {
      Toast.show('Completa el título y horario de la sala', 'warning');
      return;
    }

    const trainer = authService.getCurrentUser() || { id: 'trainer_local', name: 'Entrenador' };

    const routineTemplates = {
      fullbody: {
        name: 'Full-Body Biomecánico',
        exercises: [
          { name: 'Sentadillas Profundas', sets: 4, reps: 12, rest: 60 },
          { name: 'Press Banca con Mancuernas', sets: 4, reps: 10, rest: 60 },
          { name: 'Peso Muerto Rumano', sets: 3, reps: 12, rest: 75 },
          { name: 'Plancha Abdominal Activa', sets: 3, reps: '45s', rest: 45 }
        ]
      },
      hiit: {
        name: 'Circuito HIIT Cardiovascular',
        exercises: [
          { name: 'Burpees Dinámicos', sets: 4, reps: 15, rest: 30 },
          { name: 'Jumping Jacks & Rodillas Arriba', sets: 4, reps: '40s', rest: 20 },
          { name: 'Flexiones Explosivas', sets: 4, reps: 12, rest: 30 },
          { name: 'Mountain Climbers', sets: 4, reps: '45s', rest: 30 }
        ]
      },
      upper: {
        name: 'Tren Superior y Core',
        exercises: [
          { name: 'Press Militar de Hombros', sets: 4, reps: 10, rest: 60 },
          { name: 'Remo con Mancuernas', sets: 4, reps: 12, rest: 60 },
          { name: 'Fondos en Paralelas', sets: 3, reps: 12, rest: 60 },
          { name: 'Elevaciones Laterales', sets: 3, reps: 15, rest: 45 }
        ]
      },
      legs: {
        name: 'Tren Inferior de Potencia',
        exercises: [
          { name: 'Sentadilla Búlgara', sets: 4, reps: 10, rest: 60 },
          { name: 'Hip Thrust con Barra', sets: 4, reps: 12, rest: 75 },
          { name: 'Zancadas Dinámicas', sets: 3, reps: 14, rest: 60 },
          { name: 'Elevaciones de Talones', sets: 4, reps: 20, rest: 45 }
        ]
      },
      dance_latin: {
        name: 'Baile & Ritmos Latinos (Salsa, Bachata & Cardio Dance)',
        exercises: [
          { name: 'Calentamiento: Aislamiento Corporal & Cadencia', sets: 1, reps: '5 min', rest: 30 },
          { name: 'Salsa Cubana: Pasos Básicos & Figuras Casino', sets: 4, reps: '3 min', rest: 45 },
          { name: 'Bachata Sensual: Disociación de Cadera & Ondas', sets: 4, reps: '3 min', rest: 45 },
          { name: 'Merengue & Ritmos Latinos: Cardio de Alta Energía', sets: 3, reps: '4 min', rest: 45 },
          { name: 'Vuelta a la Calma & Estiramiento Muscular', sets: 1, reps: '5 min', rest: 0 }
        ]
      }
    };

    try {
      const newClass = await classRoomService.createClass({
        title,
        category,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes: duration,
        maxCapacity: capacity,
        routineConfig: routineTemplates[routineTemplate] || routineTemplates.fullbody,
        trainer
      });

      Toast.show(`¡Sala "${title}" programada con éxito!`, 'success');
      const modal = container.querySelector('#modal-create-class');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
      }

      this.currentLiveClassId = newClass.id;
      await this.loadData(container);
    } catch (err) {
      console.error('[TrainerHubView] Error al crear sala:', err);
      Toast.show(`Error: ${err.message}`, 'error');
    }
  }
};
