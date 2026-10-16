// ==============================================================================
// FITPULSE - LIVE ROOM ATHLETE VIEW
// Permite a cualquier atleta / usuario:
// 1. Explorar y elegir una sala de entrenamiento
// 2. Unirse en modalidad Presencial (en sala) o Remota (cámara web)
// 3. Aguardar en la sala de espera hasta la admisión obligatoria del entrenador
// 4. Tomar la clase en vivo con cronómetro y rutina sincronizada
// 5. Transmitir cámara al entrenador en modo remoto
// 6. Apagado automático de cámara y recepción de reporte al finalizar la clase
// ==============================================================================

import { authService } from '../../services/authService.js';
import { classRoomService } from '../../services/classRoomService.js';
import { workoutService } from '../../services/workoutService.js';
import { Biometrics } from '../../services/biometrics.js';
import { syncManager } from '../../db/syncManager.js';
import { generateUUID } from '../../config.js';
import { Toast } from '../toast.js';
import { router } from '../router.js';

export const LiveRoomAthleteView = {
  activeClassId: null,
  currentAttendee: null,
  activeClass: null,
  selectedMode: 'in_person', // 'in_person' | 'remote'
  localStream: null,
  liveTimerInterval: null,
  unsubscribeRoomEvent: null,

  async render(container) {
    container.innerHTML = `
      <div class="view-header" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            <span class="role-badge" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); font-size: 11px; padding: 4px 10px; border-radius: 999px; text-transform: uppercase; font-weight: 700;">🏛️ Salas en Vivo</span>
          </div>
          <h1 class="view-title" style="margin: 0;">Entrenamientos en Sala</h1>
          <p class="view-subtitle" style="margin-top: 4px;">Asiste de forma presencial o conéctate en remoto para entrenar bajo la guía en vivo de tu entrenador.</p>
        </div>
        <div style="display: flex; gap: 10px;" id="athlete-header-actions">
          <a href="#dashboard" class="btn btn-secondary btn-sm">
            <span>Volver al Inicio</span>
          </a>
        </div>
      </div>

      <div id="athlete-room-content">
        <div class="loading-state card glass-card" style="padding: 40px; text-align: center;">
          <div class="sync-spinner" style="margin: 0 auto 16px;"></div>
          <p>Buscando salas de entrenamiento disponibles...</p>
        </div>
      </div>

      <!-- MODAL SELECCIONAR MODALIDAD (PRESENCIAL O REMOTO) -->
      <div class="modal-backdrop hidden" id="modal-join-mode" style="display: none;">
        <div class="modal-card glass-card" style="max-width: 540px; width: 92%; margin: 24px auto; border-radius: 16px; border: 1px solid rgba(255,255,255,0.14); box-shadow: 0 25px 60px rgba(0,0,0,0.85); overflow: hidden;">
          <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding: 18px 24px;">
            <div>
              <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #f8fafc;" id="join-modal-title">🚀 Unirse a la Clase</h3>
              <p style="margin: 2px 0 0; font-size: 12px; color: var(--color-text-muted);" id="join-modal-subtitle">Selecciona tu modalidad de asistencia</p>
            </div>
            <button class="btn-icon" id="btn-close-join-modal" style="background: rgba(255,255,255,0.06); border: none; color: var(--color-text-muted); cursor: pointer; font-size: 22px; width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center;">&times;</button>
          </div>

          <div style="padding: 22px 28px 26px;">
            <p style="font-size: 14px; color: var(--color-text-muted); margin-bottom: 16px;">
              Selecciona cómo participarás en esta sesión de entrenamiento:
            </p>

            <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 18px;">
              <label class="mode-select-option glass-card active" id="option-mode-in-person" style="display: flex; align-items: center; gap: 14px; padding: 16px; border-radius: 12px; cursor: pointer; border: 2px solid var(--color-accent-teal, #10b981); background: rgba(16, 185, 129, 0.08);">
                <input type="radio" name="attend-mode" value="in_person" checked style="accent-color: #10b981; width: 20px; height: 20px;" />
                <div>
                  <div style="font-weight: 700; font-size: 15px; color: var(--color-text-main);">📍 Asistencia Presencial</div>
                  <div style="font-size: 12px; color: var(--color-text-muted); margin-top: 2px;">Estaré físicamente en la sala o gimnasio junto al entrenador.</div>
                </div>
              </label>

              <label class="mode-select-option glass-card" id="option-mode-remote" style="display: flex; align-items: center; gap: 14px; padding: 16px; border-radius: 12px; cursor: pointer; border: 2px solid rgba(255,255,255,0.1); background: rgba(15, 23, 42, 0.6);">
                <input type="radio" name="attend-mode" value="remote" style="accent-color: #38bdf8; width: 20px; height: 20px;" />
                <div>
                  <div style="font-weight: 700; font-size: 15px; color: var(--color-text-main);">🌐 Asistencia Remota (Videocámara)</div>
                  <div style="font-size: 12px; color: var(--color-text-muted); margin-top: 2px;">Entrenaré a distancia. El entrenador activará mi cámara para monitorearme e interactuar.</div>
                </div>
              </label>
            </div>

            <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 10px; padding: 12px 14px; font-size: 12px; color: #fbbf24; margin-bottom: 20px;">
              ⚠️ <strong>Admisión previa obligatoria:</strong> Al ingresar quedarás en la sala de espera hasta que el entrenador te admita antes de comenzar la rutina.
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 12px;">
              <button type="button" class="btn btn-secondary" id="btn-cancel-join">Cancelar</button>
              <button type="button" class="btn btn-primary btn-glow" id="btn-confirm-join">Ingresar a Sala de Espera</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupRealtimeListeners(container);
    this.bindGlobalEvents(container);
    await this.loadActiveOrCatalog(container);
  },

  setupRealtimeListeners(container) {
    if (this.unsubscribeRoomEvent) {
      this.unsubscribeRoomEvent();
    }

    this.unsubscribeRoomEvent = classRoomService.onRoomEvent(async (action, payload) => {
      console.log('[LiveRoomAthleteView] Evento de sala:', action, payload);

      const currentUser = authService.getCurrentUser();
      if (!currentUser) return;

      if (action === 'ATTENDEE_ADMITTED') {
        if (payload.user_id === currentUser.id && payload.class_id === this.activeClassId) {
          Toast.show('🎉 ¡Tu entrenador te ha admitido a la clase!', 'success');
          this.currentAttendee = payload;
          await this.renderLiveAthleteConsole(container);
        }
      } else if (action === 'ATTENDEE_REJECTED') {
        if (payload.attendeeId === this.currentAttendee?.id) {
          Toast.show('Tu solicitud de ingreso fue cancelada por el entrenador', 'warning');
          this.activeClassId = null;
          this.currentAttendee = null;
          await this.renderRoomsCatalog(container);
        }
      } else if (action === 'ROUTINE_LAUNCHED') {
        if (payload.classId === this.activeClassId) {
          Toast.show('🚀 ¡El entrenador ha largado la rutina en vivo!', 'info');
          if (this.activeClass) {
            this.activeClass.status = 'live';
            this.activeClass.routine_config = payload.routine;
            this.activeClass.live_state = payload.liveState;
          }
          await this.renderLiveAthleteConsole(container);
        }
      } else if (action === 'ATTENDEE_CAMERA_TOGGLED') {
        if (payload.userId === currentUser.id && payload.classId === this.activeClassId) {
          if (payload.cameraActive) {
            Toast.show('📹 El entrenador ha conectado tu cámara remota', 'info');
            await this.startAthleteCamera(container);
          } else {
            Toast.show('⏹️ El entrenador ha apagado la cámara remota', 'info');
            this.stopAthleteCamera(container);
          }
        }
      } else if (action === 'CLASS_FINISHED') {
        if (payload.classId === this.activeClassId) {
          Toast.show('🏁 ¡La clase ha concluido! La cámara se ha apagado por completo.', 'success');
          this.stopAthleteCamera(container);
          await this.renderFinishedState(container, payload.summaryStats);
        }
      }
    });
  },

  bindGlobalEvents(container) {
    const modal = container.querySelector('#modal-join-mode');
    const closeBtn = container.querySelector('#btn-close-join-modal');
    const cancelBtn = container.querySelector('#btn-cancel-join');
    const confirmBtn = container.querySelector('#btn-confirm-join');

    const closeModal = () => {
      if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
      }
    };

    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Alternar selección de modalidad
    const optionInPerson = container.querySelector('#option-mode-in-person');
    const optionRemote = container.querySelector('#option-mode-remote');

    optionInPerson?.addEventListener('click', () => {
      this.selectedMode = 'in_person';
      optionInPerson.style.border = '2px solid #10b981';
      optionInPerson.style.background = 'rgba(16, 185, 129, 0.08)';
      if (optionRemote) {
        optionRemote.style.border = '2px solid rgba(255,255,255,0.1)';
        optionRemote.style.background = 'rgba(15, 23, 42, 0.6)';
      }
      const radio = optionInPerson.querySelector('input');
      if (radio) radio.checked = true;
    });

    optionRemote?.addEventListener('click', () => {
      this.selectedMode = 'remote';
      optionRemote.style.border = '2px solid #38bdf8';
      optionRemote.style.background = 'rgba(56, 189, 248, 0.08)';
      if (optionInPerson) {
        optionInPerson.style.border = '2px solid rgba(255,255,255,0.1)';
        optionInPerson.style.background = 'rgba(15, 23, 42, 0.6)';
      }
      const radio = optionRemote.querySelector('input');
      if (radio) radio.checked = true;
    });

    confirmBtn?.addEventListener('click', async () => {
      await this.handleJoinConfirmed(container);
    });
  },

  async loadActiveOrCatalog(container) {
    const user = authService.getCurrentUser();
    if (!user) {
      container.innerHTML = `
        <div class="card glass-card text-center" style="padding: 40px 20px; max-width: 500px; margin: 30px auto;">
          <h3>Identificación Requerida</h3>
          <p style="color: var(--color-text-muted); margin: 12px 0 20px;">Inicia sesión con tu cuenta de atleta para unirte a las salas.</p>
          <a href="#dashboard" class="btn btn-primary">Volver al Inicio</a>
        </div>
      `;
      return;
    }

    // Verificar si el usuario ya está en alguna sala activa
    try {
      const classes = await classRoomService.getAllClasses();
      const liveOrUpcoming = classes.filter((c) => c.status === 'live' || c.status === 'waiting_room');

      for (const cls of liveOrUpcoming) {
        const att = await classRoomService.getAttendeeByUser(cls.id, user.id);
        if (att && att.status !== 'completed' && att.status !== 'rejected') {
          this.activeClassId = cls.id;
          this.activeClass = cls;
          this.currentAttendee = att;

          if (att.status === 'pending') {
            await this.renderWaitingRoom(container);
          } else if (att.status === 'admitted') {
            await this.renderLiveAthleteConsole(container);
          }
          return;
        }
      }
    } catch (e) {
      console.warn('[LiveRoomAthleteView] Error al buscar sala activa previa:', e);
    }

    await this.renderRoomsCatalog(container);
  },

  // ============================================================================
  // PANTALLA 1: CATÁLOGO DE SALAS DISPONIBLES
  // ============================================================================
  async renderRoomsCatalog(container) {
    const content = container.querySelector('#athlete-room-content');
    if (!content) return;

    const classes = await classRoomService.getAllClasses();
    const available = classes.filter((c) => c.status !== 'completed' && c.status !== 'cancelled');
    const liveRooms = available.filter((c) => c.status === 'live' || c.status === 'waiting_room');
    const scheduledRooms = available.filter((c) => c.status === 'scheduled');

    const renderCard = (cls) => {
      const isLive = cls.status === 'live';
      const isWaiting = cls.status === 'waiting_room';

      const badgeColor = isLive
        ? 'background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.5);'
        : isWaiting
        ? 'background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.5);'
        : 'background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4);';

      const badgeText = isLive ? '🔴 EN VIVO AHORA' : isWaiting ? '⏳ SALA DE ESPERA ABIERTA' : '📅 PROGRAMADA';

      const dateFormatted = new Date(cls.scheduled_at).toLocaleString('es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
        <div class="card glass-card room-card ${isLive || isWaiting ? 'pulse-border' : ''}" style="display: flex; flex-direction: column; justify-content: space-between; border-radius: 12px; padding: 20px;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <span class="badge" style="${badgeColor}">${badgeText}</span>
              <span style="font-size: 12px; color: var(--color-text-muted);">⏱️ ${cls.duration_minutes} min</span>
            </div>

            <h3 style="font-size: 18px; font-weight: 700; margin: 0 0 6px; color: var(--color-text-main);">${cls.title}</h3>
            
            <div style="font-size: 13px; color: var(--color-primary-light); font-weight: 600; margin-bottom: 12px;">
              ⚡ Entrenador: ${cls.trainer_name}
            </div>

            <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--color-text-muted); margin-bottom: 14px;">
              <span>📅 ${dateFormatted}</span>
              <span>•</span>
              <span>🏷️ ${cls.category}</span>
            </div>

            <div style="background: rgba(15, 23, 42, 0.5); padding: 10px 14px; border-radius: 8px; font-size: 12px; margin-bottom: 16px;">
              <div style="margin-bottom: 4px;">
                <span style="color: var(--color-text-muted);">Rutina:</span>
                <strong style="color: var(--color-text-main);"> ${cls.routine_config?.name || 'Funcional'}</strong>
              </div>
              <div>
                <span style="color: var(--color-text-muted);">Modalidades:</span>
                <span style="color: #34d399;"> 📍 Presencial</span> y <span style="color: #38bdf8;">🌐 Remota</span>
              </div>
            </div>
          </div>

          <button class="btn btn-primary btn-join-room btn-glow" data-class-id="${cls.id}" style="width: 100%;">
            <span>🚀 Unirme a la Sala</span>
          </button>
        </div>
      `;
    };

    let contentHtml = '';

    if (available.length === 0) {
      // Caso 1: NO hay ninguna sala activa ni programada
      contentHtml = `
        <div class="card glass-card text-center" style="max-width: 620px; margin: 32px auto; padding: 48px 24px; border-radius: 16px;">
          <div style="font-size: 52px; margin-bottom: 16px;">🏛️</div>
          <h2 style="font-size: 20px; font-weight: 800; margin-bottom: 8px; color: var(--color-text-main);">No hay salas de entrenamiento en este momento</h2>
          <p style="color: var(--color-text-muted); font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
            Actualmente ningún entrenador ha programado o abierto una sala.
            Los entrenadores publican salas periódicamente para clases presenciales o remotas.
          </p>
          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 20px;">
            <button class="btn btn-primary btn-glow btn-refresh-rooms">
              <span>🔄 Actualizar Lista</span>
            </button>
            <a href="#dashboard" class="btn btn-secondary">
              <span>Volver al Inicio</span>
            </a>
          </div>
          <div style="padding: 12px 16px; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.22); border-radius: 10px; font-size: 12px; color: var(--color-primary-light); text-align: left; line-height: 1.5;">
            💡 <strong>Operación Local & Offline:</strong> Las salas programadas en este navegador o dispositivo están listas para usar. Para sincronización en la nube multi-dispositivo, ejecuta las tablas en tu consola Supabase.
          </div>
        </div>
      `;
    } else {
      contentHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 4px;">Salas de Entrenamiento Disponibles</h2>
            <p style="color: var(--color-text-muted); font-size: 13px; margin: 0;">
              Elige una clase para participar presencialmente o en remoto por videocámara.
            </p>
          </div>
          <button class="btn btn-secondary btn-sm btn-refresh-rooms">
            <span>🔄 Actualizar</span>
          </button>
        </div>
      `;

      // Si no hay salas en vivo pero sí programadas, avisar al atleta
      if (liveRooms.length === 0) {
        contentHtml += `
          <div class="card glass-card" style="padding: 16px 20px; margin-bottom: 24px; background: rgba(56, 189, 248, 0.08); border-left: 4px solid var(--color-primary-light, #38bdf8); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 26px;">ℹ️</span>
              <div>
                <strong style="color: #f8fafc; font-size: 14px;">No hay salas transmitiendo en vivo en este instante</strong>
                <div style="font-size: 12px; color: var(--color-text-muted); margin-top: 2px;">
                  A continuación puedes revisar las <strong>próximas salas programadas</strong> e ingresar a la hora fijada por el entrenador.
                </div>
              </div>
            </div>
            <button class="btn btn-secondary btn-sm btn-refresh-rooms">
              <span>🔄 Comprobar de nuevo</span>
            </button>
          </div>
        `;
      } else {
        // Mostrar sección de salas en vivo / sala de espera activa
        contentHtml += `
          <div style="margin-bottom: 28px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px;">
              <span class="pulse-dot"></span>
              <h3 style="margin: 0; font-size: 17px; font-weight: 700; color: #f87171;">🔴 Salas Activas en Vivo y en Espera (${liveRooms.length})</h3>
            </div>
            <div class="rooms-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 18px;">
              ${liveRooms.map(renderCard).join('')}
            </div>
          </div>
        `;
      }

      // Si hay salas programadas, mostrarlas
      if (scheduledRooms.length > 0) {
        contentHtml += `
          <div>
            <h3 style="margin: 0 0 14px; font-size: 17px; font-weight: 700; color: var(--color-text-main);">
              📅 Próximas Salas Programadas (${scheduledRooms.length})
            </h3>
            <div class="rooms-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 18px;">
              ${scheduledRooms.map(renderCard).join('')}
            </div>
          </div>
        `;
      }
    }

    content.innerHTML = contentHtml;

    // Vincular botones de refrescar
    content.querySelectorAll('.btn-refresh-rooms').forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span>🔄 Actualizando...</span>';
        await this.renderRoomsCatalog(container);
        Toast.show('Lista de salas actualizada', 'info');
      });
    });

    // Vincular botones para unirse
    content.querySelectorAll('.btn-join-room').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const classId = e.currentTarget.dataset.classId;
        const cls = available.find((c) => c.id === classId);
        this.activeClassId = classId;

        const modal = container.querySelector('#modal-join-mode');
        const modalTitle = container.querySelector('#join-modal-title');
        const modalSubtitle = container.querySelector('#join-modal-subtitle');
        if (cls && modalTitle) {
          modalTitle.textContent = `🚀 Unirse a: ${cls.title}`;
          modalSubtitle.textContent = `Entrenador: ${cls.trainer_name} • ${cls.category} (${cls.duration_minutes} min)`;
        }

        if (modal) {
          modal.style.display = 'flex';
          modal.classList.remove('hidden');
        }
      });
    });
  },

  async handleJoinConfirmed(container) {
    const user = authService.getCurrentUser();
    if (!user) {
      Toast.show('Debes iniciar sesión para unirte a una sala', 'warning');
      return;
    }
    if (!this.activeClassId) {
      Toast.show('Por favor selecciona una sala para unirte', 'warning');
      return;
    }

    try {
      const modal = container.querySelector('#modal-join-mode');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
      }
      Toast.show('Ingresando a la sala de espera...', 'info');

      this.currentAttendee = await classRoomService.joinClass(this.activeClassId, user, this.selectedMode);
      this.activeClass = await classRoomService.getClassById(this.activeClassId);

      await this.renderWaitingRoom(container);
    } catch (err) {
      console.error('[LiveRoomAthleteView] Error al unirse:', err);
      Toast.show(`Error al ingresar: ${err.message}`, 'error');
    }
  },

  // ============================================================================
  // PANTALLA 2: SALA DE ESPERA (ESPERANDO ADMISIÓN DEL ENTRENADOR)
  // ============================================================================
  async renderWaitingRoom(container) {
    const content = container.querySelector('#athlete-room-content');
    if (!content) return;

    const isRemote = this.currentAttendee?.mode === 'remote';

    content.innerHTML = `
      <div class="card glass-card text-center" style="max-width: 640px; margin: 0 auto; padding: 48px 24px; border-radius: 16px; border: 1px solid rgba(245, 158, 11, 0.3);">
        <div style="font-size: 56px; margin-bottom: 16px; animation: pulse 2s infinite;">⏳</div>
        
        <span class="badge" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); font-size: 13px; padding: 6px 14px; margin-bottom: 16px; display: inline-block;">
          SALA DE ESPERA
        </span>

        <h2 style="font-size: 24px; font-weight: 800; margin: 0 0 10px;">${this.activeClass?.title || 'Clase de Entrenamiento'}</h2>
        <p style="font-size: 15px; color: var(--color-primary-light); font-weight: 600; margin-bottom: 16px;">
          ⚡ Entrenador: ${this.activeClass?.trainer_name || 'Entrenador FitPulse'}
        </p>

        <div style="background: rgba(15, 23, 42, 0.6); padding: 16px; border-radius: 12px; margin-bottom: 24px; text-align: left; font-size: 14px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: var(--color-text-muted);">Tu modalidad seleccionada:</span>
            <strong style="color: ${isRemote ? '#38bdf8' : '#34d399'};">
              ${isRemote ? '🌐 Asistencia Remota (Videocámara)' : '📍 Asistencia Presencial (En sala)'}
            </strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--color-text-muted);">Estado de admisión:</span>
            <span style="color: #fbbf24; font-weight: 700;">⏳ Esperando aprobación del entrenador...</span>
          </div>
        </div>

        <p style="color: var(--color-text-muted); font-size: 13px; line-height: 1.6; margin-bottom: 24px;">
          El entrenador debe admitirte antes de que comience el entrenamiento.
          Esta pantalla se actualizará automáticamente apenas seas admitido.
        </p>

        <button class="btn btn-outline" id="btn-leave-waiting" style="border-color: rgba(239, 68, 68, 0.4); color: #f87171; margin: 0 auto;">
          Salir de la Sala de Espera
        </button>
      </div>
    `;

    content.querySelector('#btn-leave-waiting')?.addEventListener('click', () => {
      this.activeClassId = null;
      this.currentAttendee = null;
      this.renderRoomsCatalog(container);
    });
  },

  // ============================================================================
  // PANTALLA 3: CLASE EN VIVO (ADMITIDO) & VIDEOCÁMARA REMOTA
  // ============================================================================
  async renderLiveAthleteConsole(container) {
    const content = container.querySelector('#athlete-room-content');
    if (!content) return;

    this.activeClass = await classRoomService.getClassById(this.activeClassId);
    const isRemote = this.currentAttendee?.mode === 'remote';
    const routine = this.activeClass?.routine_config || {};

    content.innerHTML = `
      <!-- BANNER DE EN VIVO -->
      <div class="card glass-card" style="padding: 20px; margin-bottom: 20px; border-left: 4px solid #10b981;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
              <span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; font-weight: 700;">
                ✅ ADMITIDO POR EL ENTRENADOR
              </span>
              <span class="badge" style="background: ${isRemote ? 'rgba(56, 189, 248, 0.2)' : 'rgba(16, 185, 129, 0.2)'}; color: ${isRemote ? '#38bdf8' : '#34d399'};">
                ${isRemote ? '🌐 Modo Remoto' : '📍 Modo Presencial'}
              </span>
            </div>
            <h2 style="font-size: 22px; font-weight: 800; margin: 0 0 4px;">${this.activeClass?.title}</h2>
            <div style="font-size: 13px; color: var(--color-text-muted);">
              Entrenador a cargo: <strong>${this.activeClass?.trainer_name}</strong> • ${this.activeClass?.category}
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="text-align: right;">
              <div style="font-size: 11px; text-transform: uppercase; color: var(--color-text-muted); font-weight: 700;">Tiempo de Clase</div>
              <div style="font-size: 28px; font-family: monospace; font-weight: 800; color: #38bdf8;" id="athlete-class-clock">00:00</div>
            </div>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: ${isRemote ? '1fr 340px' : '1fr'}; gap: 20px; align-items: start;">
        <!-- COLUMNA PRINCIPAL: RUTINA Y EJERCICIOS LARGADOS -->
        <div class="card glass-card" style="padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div>
              <h3 style="margin: 0; font-size: 18px; font-weight: 700;">📋 Rutina de la Clase: ${routine.name || 'Entrenamiento del Día'}</h3>
              <p style="margin: 4px 0 0; font-size: 13px; color: var(--color-text-muted);">
                Sigue las series y descansos guiados en tiempo real por tu entrenador.
              </p>
            </div>
          </div>

          <div class="routine-exercises-list" style="display: flex; flex-direction: column; gap: 12px;">
            ${(routine.exercises || [
              { name: 'Sentadillas Profundas', sets: 4, reps: 12, rest: 60 },
              { name: 'Press Banca / Flexiones', sets: 4, reps: 10, rest: 60 },
              { name: 'Peso Muerto Rumano', sets: 3, reps: 12, rest: 75 },
              { name: 'Plancha Abdominal Activa', sets: 3, reps: '45s', rest: 45 }
            ])
              .map((ex, idx) => `
                <div class="exercise-item-row" style="background: rgba(15, 23, 42, 0.6); border-radius: 10px; padding: 14px 16px; border: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center;">
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 16px; font-weight: 800; color: var(--color-primary-light); width: 24px;">#${idx + 1}</span>
                    <div>
                      <div style="font-weight: 700; font-size: 15px; color: var(--color-text-main);">${ex.name}</div>
                      <div style="font-size: 12px; color: var(--color-text-muted);">
                        ${ex.sets} Series × ${ex.reps} repeticiones • Descanso: ${ex.rest}s
                      </div>
                    </div>
                  </div>
                  <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--color-text-muted); cursor: pointer;">
                    <input type="checkbox" style="width: 18px; height: 18px; accent-color: #10b981;" />
                    <span>Completado</span>
                  </label>
                </div>
              `)
              .join('')}
          </div>
        </div>

        <!-- COLUMNA LATERAL: SI ES REMOTO, SE MUESTRA EL FRAME DE LA CÁMARA WEB -->
        ${
          isRemote
            ? `
              <div class="card glass-card" style="padding: 18px;">
                <h3 style="margin: 0 0 10px; font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                  <span>📹 Tu Cámara Remota</span>
                </h3>
                <p style="font-size: 12px; color: var(--color-text-muted); margin: 0 0 12px;">
                  Tu entrenador puede activar tu cámara en cualquier momento para corregir tu técnica y postura.
                </p>

                <div class="remote-cam-wrapper" style="background: #090d16; border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 10px; min-height: 220px; display: flex; flex-direction: column; justify-content: center; align-items: center; position: relative; overflow: hidden; margin-bottom: 12px;">
                  <video id="athlete-local-video" style="width: 100%; height: 220px; object-fit: cover; display: none; border-radius: 9px;"></video>
                  
                  <div id="athlete-cam-placeholder" style="text-align: center; padding: 20px;">
                    <div style="font-size: 32px; margin-bottom: 8px;">🌐</div>
                    <div style="font-size: 13px; font-weight: 600; color: var(--color-text-main);">Cámara Lista para Conexión</div>
                    <div style="font-size: 11px; color: var(--color-text-muted); margin-top: 4px;">Se activará cuando el entrenador inicie la interacción</div>
                  </div>

                  <div id="athlete-live-indicator" style="display: none; position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); padding: 4px 10px; border-radius: 6px; font-size: 11px; color: #34d399; font-weight: 700; z-index: 10;">
                    🔴 TRANSMITIENDO AL ENTRENADOR
                  </div>
                </div>

                <div style="display: flex; gap: 8px;">
                  <button class="btn btn-secondary btn-sm" id="btn-athlete-preview-cam" style="flex: 1; font-size: 12px;">
                    <span>Probar / Previsualizar Cámara</span>
                  </button>
                </div>
              </div>
            `
            : ''
        }
      </div>
    `;

    this.startAthleteClock(container);

    // Botón de previsualizar cámara
    if (isRemote) {
      container.querySelector('#btn-athlete-preview-cam')?.addEventListener('click', async () => {
        await this.startAthleteCamera(container);
      });
    }
  },

  startAthleteClock(container) {
    if (this.liveTimerInterval) {
      clearInterval(this.liveTimerInterval);
      this.liveTimerInterval = null;
    }

    const clockEl = container.querySelector('#athlete-class-clock');
    const startTime = new Date(this.activeClass?.live_state?.startedAt || Date.now()).getTime();

    const updateClock = () => {
      if (!clockEl) return;
      const now = Date.now();
      const diffSeconds = Math.max(0, Math.floor((now - startTime) / 1000));
      const mins = Math.floor(diffSeconds / 60).toString().padStart(2, '0');
      const secs = (diffSeconds % 60).toString().padStart(2, '0');
      clockEl.textContent = `${mins}:${secs}`;
    };

    updateClock();
    this.liveTimerInterval = setInterval(updateClock, 1000);
  },

  async startAthleteCamera(container) {
    const videoEl = container.querySelector('#athlete-local-video');
    const placeholder = container.querySelector('#athlete-cam-placeholder');
    const indicator = container.querySelector('#athlete-live-indicator');

    if (!videoEl) return;

    try {
      this.localStream = await classRoomService.startCameraStream(videoEl, 'athlete_local');
      videoEl.style.display = 'block';
      if (placeholder) placeholder.style.display = 'none';
      if (indicator) indicator.style.display = 'block';
      Toast.show('Cámara activada correctamente', 'success');
    } catch (e) {
      console.warn('Error al activar cámara:', e);
    }
  },

  stopAthleteCamera(container) {
    classRoomService.stopCameraStream('athlete_local');
    const videoEl = container.querySelector('#athlete-local-video');
    const placeholder = container.querySelector('#athlete-cam-placeholder');
    const indicator = container.querySelector('#athlete-live-indicator');

    if (videoEl) videoEl.style.display = 'none';
    if (placeholder) placeholder.style.display = 'block';
    if (indicator) indicator.style.display = 'none';
  },

  async recordRoomWorkoutSession(summaryStats = {}) {
    if (!this.activeClass) return null;
    const user = authService.getCurrentUser();
    if (!user) return null;

    try {
      const profile = await workoutService.getProfile();
      const userWeight = profile?.weight_kg || 75;

      const workoutId = generateUUID();
      const category = this.activeClass.category || 'Clase Dirigida';
      const durationMinutes = summaryStats?.durationMinutes || this.activeClass.duration_minutes || 45;
      const durationSeconds = durationMinutes * 60;

      let metValue = 6.5;
      if (category === 'Baile & Ritmos') metValue = 6.8;
      else if (category === 'Cardio' || category === 'HIIT / Funcional') metValue = 8.0;
      else if (category === 'Fuerza') metValue = 6.0;

      const totalCalories = Math.round(Biometrics.calculateCardioCalories(metValue, userWeight, durationMinutes));

      const routineExercises = this.activeClass.routine_config?.exercises || [
        { name: 'Calentamiento & Activación Articular', sets: 1, reps: 10 },
        { name: 'Bloque Principal Guiado en Sala', sets: 3, reps: 12 },
        { name: 'Vuelta a la Calma & Estiramiento', sets: 1, reps: 10 }
      ];

      const exercises = routineExercises.map((e, idx) => ({
        id: generateUUID(),
        workout_id: workoutId,
        user_id: user.id,
        exercise_id: e.id || `room_ex_${idx}`,
        exercise_name: e.name || 'Ejercicio de Sala',
        category: category,
        order_index: idx,
        sets: [{
          set_number: 1,
          weight_kg: 0,
          reps: typeof e.reps === 'number' ? e.reps : 12,
          duration_seconds: Math.round(durationSeconds / Math.max(1, routineExercises.length)),
          completed: true
        }],
        best_1rm: 0,
        total_volume_kg: 0,
        calories_burned: Math.round(totalCalories / Math.max(1, routineExercises.length))
      }));

      const workoutPayload = {
        id: workoutId,
        user_id: user.id,
        title: `Sala: ${this.activeClass.title || 'Clase en Vivo'} (${this.activeClass.trainer_name || 'Entrenador'})`,
        category: category,
        start_time: this.activeClass.live_state?.startedAt || this.currentAttendee?.joined_at || new Date(Date.now() - durationSeconds * 1000).toISOString(),
        end_time: new Date().toISOString(),
        duration_seconds: durationSeconds,
        total_volume_kg: 0,
        total_calories: totalCalories,
        notes: `Clase con entrenador: ${this.activeClass.trainer_name || 'Entrenador'}. Modalidad: ${this.currentAttendee?.mode === 'remote' ? '🌐 Remoto (Videocámara)' : '📍 Presencial (En sala)'}.`,
        status: 'completed',
        room_id: this.activeClass.id,
        trainer_name: this.activeClass.trainer_name,
        attendance_mode: this.currentAttendee?.mode || 'in_person'
      };

      // Guardar la sesión y sus ejercicios tanto en IndexedDB local como en cola de Supabase
      await syncManager.saveAndQueue('workouts', 'workout_sessions', workoutPayload, 'UPSERT');
      for (const ex of exercises) {
        await syncManager.saveAndQueue('workout_exercises', 'workout_exercises', ex, 'UPSERT');
      }

      window.dispatchEvent(new CustomEvent('fitpulse:workout-completed', { detail: { workout: workoutPayload } }));
      return workoutPayload;
    } catch (e) {
      console.warn('[LiveRoomAthleteView] Error al registrar sesión de sala en historial:', e);
      return null;
    }
  },

  // ============================================================================
  // PANTALLA 4: CLASE FINALIZADA (REPORTE, HISTORIAL Y APAGADO TOTAL)
  // ============================================================================
  async renderFinishedState(container, summaryStats = {}) {
    if (this.liveTimerInterval) {
      clearInterval(this.liveTimerInterval);
      this.liveTimerInterval = null;
    }

    // Persistir automáticamente esta rutina realizada en la sala dentro del historial del usuario
    const recordedWorkout = await this.recordRoomWorkoutSession(summaryStats);

    const content = container.querySelector('#athlete-room-content');
    if (!content) return;

    const durationMins = Math.round((recordedWorkout?.duration_seconds || 2700) / 60);
    const calories = recordedWorkout?.total_calories || 280;

    content.innerHTML = `
      <div class="card glass-card text-center" style="max-width: 620px; margin: 0 auto; padding: 48px 24px; border-radius: 16px; border: 1px solid rgba(16, 185, 129, 0.4);">
        <div style="font-size: 64px; margin-bottom: 16px;">🏆</div>
        
        <span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; font-size: 13px; padding: 6px 14px; margin-bottom: 16px; display: inline-block;">
          SESIÓN REGISTRADA EN TU HISTORIAL
        </span>

        <h2 style="font-size: 26px; font-weight: 800; margin: 0 0 10px;">¡Gran Trabajo en la Clase!</h2>
        <p style="color: var(--color-text-muted); font-size: 14px; margin-bottom: 24px;">
          Esta rutina dirigida ha quedado guardada en tu <strong>Historial de Actividades</strong> para acompañar tu evolución. Todas las cámaras y conexiones han sido apagadas y liberadas con éxito.
        </p>

        <div style="background: rgba(15, 23, 42, 0.6); padding: 18px; border-radius: 12px; margin-bottom: 24px; text-align: left; font-size: 14px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: var(--color-text-muted);">Clase:</span>
            <strong style="color: var(--color-text-main);">${this.activeClass?.title || 'Entrenamiento'}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: var(--color-text-muted);">Entrenador a cargo:</span>
            <strong style="color: var(--color-primary-light);">${this.activeClass?.trainer_name || 'Entrenador'}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: var(--color-text-muted);">Tu Modalidad:</span>
            <span>${this.currentAttendee?.mode === 'remote' ? '🌐 Remoto (Videocámara)' : '📍 Presencial (En sala)'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: var(--color-text-muted);">Métricas Registradas:</span>
            <strong style="color: #38bdf8;">⏱️ ${durationMins} min · 🔥 ${calories} kcal</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--color-text-muted);">Estado:</span>
            <span style="color: #34d399; font-weight: 700;">✅ Asistencia e Historial Computados al 100%</span>
          </div>
        </div>

        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <a href="#history" class="btn btn-primary btn-glow" style="text-decoration: none;">
            📈 Ver en Mi Historial de Actividades
          </a>
          <button class="btn btn-secondary" id="btn-back-to-rooms">
            Ver Otras Salas
          </button>
          <a href="#dashboard" class="btn btn-secondary" style="text-decoration: none;">
            Ir al Inicio
          </a>
        </div>
      </div>
    `;

    content.querySelector('#btn-back-to-rooms')?.addEventListener('click', () => {
      this.activeClassId = null;
      this.currentAttendee = null;
      this.renderRoomsCatalog(container);
    });
  }
};
