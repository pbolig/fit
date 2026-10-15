// ==============================================================================
// FITPULSE - SUPERADMIN DASHBOARD VIEW
// Permite al Superusuario:
// 1. Ver estadísticas globales de la plataforma
// 2. Gestionar y alternar roles de usuarios (Atleta <-> Entrenador)
// 3. Auditar todas las salas de entrenamiento y asistencias globales
// ==============================================================================

import { authService } from '../../services/authService.js';
import { classRoomService } from '../../services/classRoomService.js';
import { Toast } from '../toast.js';
import { router } from '../router.js';

export const SuperAdminView = {
  activeTab: 'users', // 'users' | 'classes'
  searchQuery: '',

  async render(container) {
    // 1. Control de acceso estricto
    if (!authService.isSuperAdmin()) {
      container.innerHTML = `
        <div class="view-header">
          <h1 class="view-title">Acceso Restringido</h1>
        </div>
        <div class="card glass-card text-center" style="padding: 48px 24px; max-width: 600px; margin: 0 auto;">
          <div style="font-size: 56px; margin-bottom: 16px;">🛡️</div>
          <h2 style="font-size: 22px; font-weight: 700; margin-bottom: 12px; color: var(--color-danger, #ef4444);">
            Área de Superusuario
          </h2>
          <p style="color: var(--color-text-muted); line-height: 1.6; margin-bottom: 24px;">
            Este panel está reservado exclusivamente para la administración central de FitPulse.
            Inicia sesión con la cuenta de superusuario autorizada para gestionar roles y salas.
          </p>
          <button id="btn-return-home" class="btn btn-primary" style="margin: 0 auto;">
            Volver al Inicio
          </button>
        </div>
      `;
      container.querySelector('#btn-return-home')?.addEventListener('click', () => router.navigate('dashboard'));
      return;
    }

    container.innerHTML = `
      <div class="view-header" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            <span class="role-badge role-superadmin" style="font-size: 11px; padding: 4px 10px; border-radius: 999px; text-transform: uppercase; font-weight: 700;">👑 Superadmin</span>
            <span style="font-size: 13px; color: var(--color-text-muted);">${authService.getCurrentUser()?.email || ''}</span>
          </div>
          <h1 class="view-title" style="margin: 0;">Panel de Control Central</h1>
          <p class="view-subtitle" style="margin-top: 4px;">Asigna permisos de Entrenador y supervisa las salas de entrenamiento presenciales y remotas.</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button id="btn-create-test-user" class="btn btn-secondary btn-sm" title="Crear un atleta de prueba para verificar asignación">
            <span>+ Atleta de Prueba</span>
          </button>
          <a href="#trainer-hub" class="btn btn-primary btn-sm btn-glow">
            <span>Ir al Hub Entrenador ➔</span>
          </a>
        </div>
      </div>

      <!-- KPI METRICS SUMMARY -->
      <div class="kpi-grid" id="admin-kpis" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="card glass-card kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Atletas Registrados</span>
            <span class="kpi-icon">👥</span>
          </div>
          <div class="kpi-value" id="kpi-total-users">-</div>
          <div class="kpi-subtext">Usuarios en plataforma</div>
        </div>

        <div class="card glass-card kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Entrenadores Activos</span>
            <span class="kpi-icon">⚡</span>
          </div>
          <div class="kpi-value" id="kpi-total-trainers" style="color: var(--color-accent-teal, #10b981);">-</div>
          <div class="kpi-subtext">Habilitados para dictar salas</div>
        </div>

        <div class="card glass-card kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Salas Creadas</span>
            <span class="kpi-icon">🏛️</span>
          </div>
          <div class="kpi-value" id="kpi-total-classes">-</div>
          <div class="kpi-subtext">Presenciales y Remotas</div>
        </div>

        <div class="card glass-card kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Asistencias Auditadas</span>
            <span class="kpi-icon">📊</span>
          </div>
          <div class="kpi-value" id="kpi-total-attendances" style="color: var(--color-primary-light, #38bdf8);">-</div>
          <div class="kpi-subtext">Alumnos admitidos</div>
        </div>
      </div>

      <!-- TABS NAVEGACIÓN ADMIN -->
      <div class="catalog-filters-scroll" style="margin-bottom: 20px;">
        <div class="filter-pills" id="admin-tabs">
          <button class="filter-pill ${this.activeTab === 'users' ? 'active' : ''}" data-tab="users">
            <span>👥 Asignación de Entrenadores</span>
          </button>
          <button class="filter-pill ${this.activeTab === 'classes' ? 'active' : ''}" data-tab="classes">
            <span>🏛️ Auditoría Global de Salas</span>
          </button>
        </div>
      </div>

      <!-- CONTENEDOR DE LA PESTAÑA ACTIVA -->
      <div id="admin-tab-content">
        <div class="loading-state card glass-card" style="padding: 40px; text-align: center;">
          <div class="sync-spinner" style="margin: 0 auto 16px;"></div>
          <p>Cargando datos del panel central...</p>
        </div>
      </div>
    `;

    this.bindEvents(container);
    await this.loadData(container);
  },

  bindEvents(container) {
    // Cambio de pestañas
    container.querySelectorAll('#admin-tabs .filter-pill').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        if (tab && tab !== this.activeTab) {
          this.activeTab = tab;
          container.querySelectorAll('#admin-tabs .filter-pill').forEach((p) => p.classList.remove('active'));
          e.currentTarget.classList.add('active');
          this.renderTabContent(container);
        }
      });
    });

    // Botón crear atleta de prueba
    container.querySelector('#btn-create-test-user')?.addEventListener('click', async () => {
      await this.createTestUser(container);
    });
  },

  async loadData(container) {
    try {
      this.users = await classRoomService.getAllUsersWithRoles();
      this.classes = await classRoomService.getAllClasses();
      this.attendeesReport = await classRoomService.getStudentAttendanceReport();

      // Asegurar que el usuario activo figure en la lista si no está
      const current = authService.getCurrentUser();
      if (current && !this.users.some((u) => u.id === current.id)) {
        this.users.unshift({
          id: current.id,
          name: current.name,
          email: current.email,
          avatar: current.avatar,
          role: 'superadmin'
        });
      }

      // Actualizar KPIs
      const trainersCount = this.users.filter((u) => u.role === 'trainer' || u.role === 'superadmin').length;
      let totalAdmitted = 0;
      this.classes.forEach((c) => {
        if (c.summary_stats?.totalAttendees) totalAdmitted += c.summary_stats.totalAttendees;
      });

      const kpiUsers = container.querySelector('#kpi-total-users');
      const kpiTrainers = container.querySelector('#kpi-total-trainers');
      const kpiClasses = container.querySelector('#kpi-total-classes');
      const kpiAttendances = container.querySelector('#kpi-total-attendances');

      if (kpiUsers) kpiUsers.textContent = this.users.length;
      if (kpiTrainers) kpiTrainers.textContent = trainersCount;
      if (kpiClasses) kpiClasses.textContent = this.classes.length;
      if (kpiAttendances) kpiAttendances.textContent = totalAdmitted || this.attendeesReport.length;

      this.renderTabContent(container);
    } catch (err) {
      console.error('[SuperAdminView] Error al cargar datos:', err);
      const content = container.querySelector('#admin-tab-content');
      if (content) {
        content.innerHTML = `
          <div class="card glass-card error-boundary-box">
            <h3>Error al cargar panel de administración</h3>
            <p>${err.message}</p>
          </div>
        `;
      }
    }
  },

  renderTabContent(container) {
    const content = container.querySelector('#admin-tab-content');
    if (!content) return;

    if (this.activeTab === 'users') {
      this.renderUsersTab(content, container);
    } else {
      this.renderClassesTab(content, container);
    }
  },

  renderUsersTab(content, container) {
    const filteredUsers = this.getFilteredUsers();

    content.innerHTML = `
      <div class="card glass-card" style="padding: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 16px;">
          <div>
            <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #f8fafc;">Gestión de Roles y Permisos de Entrenador</h3>
            <p style="margin: 4px 0 0; font-size: 13px; color: var(--color-text-muted);">
              Cualquier usuario promovido a Entrenador podrá crear salas de entrenamiento, admitir alumnos, proyectar rutinas y monitorear cámaras.
            </p>
          </div>

          <!-- CAJA DE BÚSQUEDA ESTILIZADA -->
          <div class="admin-search-container" style="position: relative; width: 100%; max-width: 340px;">
            <svg style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input 
              type="text" 
              id="admin-search-users" 
              class="form-control admin-search-input" 
              placeholder="Buscar por nombre o correo..." 
              value="${this.searchQuery}"
              style="padding-left: 40px; padding-right: 36px; height: 42px; border-radius: 10px; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255, 255, 255, 0.16); font-size: 13px;"
            />
            <button id="btn-clear-admin-search" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 18px; line-height: 1; padding: 4px; display: ${this.searchQuery ? 'block' : 'none'};" title="Limpiar búsqueda">&times;</button>
          </div>
        </div>

        <div class="table-responsive" style="overflow-x: auto;">
          <table class="admin-table" style="width: 100%; border-collapse: separate; border-spacing: 0 8px;">
            <thead>
              <tr style="color: var(--color-text-muted); font-size: 12px; text-transform: uppercase; text-align: left;">
                <th style="padding: 10px 14px;">Usuario / Atleta</th>
                <th style="padding: 10px 14px;">Correo Electrónico</th>
                <th style="padding: 10px 14px;">Rol en Plataforma</th>
                <th style="padding: 10px 14px;">Estado</th>
                <th style="padding: 10px 14px; text-align: right;">Acción de Superusuario</th>
              </tr>
            </thead>
            <tbody id="admin-users-tbody">
              ${this.renderUserRows(filteredUsers)}
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.bindUsersTabEvents(content, container);
  },

  getFilteredUsers() {
    return this.users.filter((u) => {
      if (!this.searchQuery) return true;
      const q = this.searchQuery.toLowerCase();
      return (u.name && u.name.toLowerCase().includes(q)) || (u.email && u.email.toLowerCase().includes(q));
    });
  },

  renderUserRows(usersList) {
    if (usersList.length === 0) {
      return `<tr><td colspan="5" style="text-align: center; padding: 36px; color: var(--color-text-muted);">No se encontraron usuarios coincidentes</td></tr>`;
    }

    return usersList
      .map((u) => {
        const isSuper = u.role === 'superadmin';
        const isTrainer = u.role === 'trainer';
        const roleBadge = isSuper
          ? `<span class="badge" style="background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4);">👑 Superadmin</span>`
          : isTrainer
          ? `<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4);">⚡ Entrenador</span>`
          : `<span class="badge" style="background: rgba(148, 163, 184, 0.15); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.3);">🏋️ Atleta</span>`;

        return `
          <tr class="admin-user-row" style="background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(8px); border-radius: 8px;">
            <td style="padding: 12px 14px; border-top-left-radius: 8px; border-bottom-left-radius: 8px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div class="user-avatar-circle" style="width: 38px; height: 38px; font-size: 16px; background: rgba(56, 189, 248, 0.15);">
                  ${u.avatar ? `<img src="${u.avatar}" alt="" style="width: 100%; height: 100%; border-radius: 50%;">` : '🏋️'}
                </div>
                <div>
                  <div style="font-weight: 600; font-size: 14px; color: var(--color-text-main);">${u.name}</div>
                  <div style="font-size: 11px; color: var(--color-text-muted);">ID: ${u.id.substring(0, 8)}...</div>
                </div>
              </div>
            </td>
            <td style="padding: 12px 14px; font-size: 13px; color: var(--color-text-muted);">${u.email || 'Sin correo'}</td>
            <td style="padding: 12px 14px;">${roleBadge}</td>
            <td style="padding: 12px 14px; font-size: 13px;">
              ${
                isTrainer
                  ? `<span style="color: var(--color-accent-teal); font-weight: 600;">Habilitado para dictar</span>`
                  : `<span style="color: var(--color-text-muted);">Atleta regular</span>`
              }
            </td>
            <td style="padding: 12px 14px; text-align: right; border-top-right-radius: 8px; border-bottom-right-radius: 8px;">
              ${
                isSuper
                  ? `<span style="font-size: 12px; color: var(--color-text-muted); font-style: italic;">Superusuario Principal</span>`
                  : isTrainer
                  ? `<button class="btn btn-outline btn-sm btn-revoke-role" data-user-id="${u.id}" data-user-name="${u.name}" style="border-color: #ef4444; color: #f87171;">
                      <span>🔻 Revocar a Atleta</span>
                     </button>`
                  : `<button class="btn btn-primary btn-sm btn-assign-role btn-glow" data-user-id="${u.id}" data-user-name="${u.name}">
                      <span>⭐ Asignar Entrenador</span>
                     </button>`
              }
            </td>
          </tr>
        `;
      })
      .join('');
  },

  bindUsersTabEvents(content, container) {
    const searchInput = content.querySelector('#admin-search-users');
    const clearBtn = content.querySelector('#btn-clear-admin-search');
    const tbody = content.querySelector('#admin-users-tbody');

    const updateRows = () => {
      const filtered = this.getFilteredUsers();
      if (tbody) {
        tbody.innerHTML = this.renderUserRows(filtered);
        this.bindRoleActionButtons(content, container);
      }
      if (clearBtn) {
        clearBtn.style.display = this.searchQuery ? 'block' : 'none';
      }
    };

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        updateRows();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.searchQuery = '';
        if (searchInput) searchInput.value = '';
        updateRows();
        searchInput?.focus();
      });
    }

    this.bindRoleActionButtons(content, container);
  },

  bindRoleActionButtons(content, container) {
    content.querySelectorAll('.btn-assign-role').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const userId = e.currentTarget.dataset.userId;
        const userName = e.currentTarget.dataset.userName;
        await this.changeUserRole(userId, 'trainer', userName, container);
      });
    });

    content.querySelectorAll('.btn-revoke-role').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const userId = e.currentTarget.dataset.userId;
        const userName = e.currentTarget.dataset.userName;
        await this.changeUserRole(userId, 'athlete', userName, container);
      });
    });
  },

  renderClassesTab(content, container) {
    content.innerHTML = `
      <div class="card glass-card" style="padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h3 style="margin: 0; font-size: 18px; font-weight: 700;">Auditoría de Salas de Entrenamiento</h3>
            <p style="margin: 4px 0 0; font-size: 13px; color: var(--color-text-muted);">
              Historial y estado de todas las salas creadas por los entrenadores.
            </p>
          </div>
          <a href="#trainer-hub" class="btn btn-primary btn-sm">
            <span>+ Abrir Hub Entrenador</span>
          </a>
        </div>

        <div class="table-responsive" style="overflow-x: auto;">
          <table class="admin-table" style="width: 100%; border-collapse: separate; border-spacing: 0 8px;">
            <thead>
              <tr style="color: var(--color-text-muted); font-size: 12px; text-transform: uppercase; text-align: left;">
                <th style="padding: 8px 14px;">Sala / Clase</th>
                <th style="padding: 8px 14px;">Entrenador</th>
                <th style="padding: 8px 14px;">Fecha y Hora</th>
                <th style="padding: 8px 14px;">Modalidades</th>
                <th style="padding: 8px 14px;">Estado</th>
                <th style="padding: 8px 14px; text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${
                this.classes.length === 0
                  ? `<tr><td colspan="6" style="text-align: center; padding: 32px; color: var(--color-text-muted);">No hay salas programadas todavía. Crea una desde el Hub de Entrenador.</td></tr>`
                  : this.classes
                      .map((cls) => {
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

                        const dateFormatted = new Date(cls.scheduled_at).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        return `
                          <tr style="background: rgba(15, 23, 42, 0.6); border-radius: 8px;">
                            <td style="padding: 12px 14px; border-top-left-radius: 8px; border-bottom-left-radius: 8px;">
                              <div style="font-weight: 600; font-size: 14px; color: var(--color-text-main);">${cls.title}</div>
                              <div style="font-size: 11px; color: var(--color-text-muted);">${cls.category} • ${cls.duration_minutes} min</div>
                            </td>
                            <td style="padding: 12px 14px; font-size: 13px; font-weight: 500;">⚡ ${cls.trainer_name}</td>
                            <td style="padding: 12px 14px; font-size: 13px; color: var(--color-text-muted);">${dateFormatted}</td>
                            <td style="padding: 12px 14px; font-size: 12px;">
                              <span title="Presencial y Remoto">📍 Presencial / 🌐 Remoto</span>
                            </td>
                            <td style="padding: 12px 14px;">
                              <span class="badge" style="${statusColors[cls.status] || ''}">${statusLabels[cls.status] || cls.status}</span>
                            </td>
                            <td style="padding: 12px 14px; text-align: right; border-top-right-radius: 8px; border-bottom-right-radius: 8px;">
                              <button class="btn btn-outline btn-sm btn-delete-class" data-class-id="${cls.id}" title="Eliminar sala" style="padding: 4px 8px; border-color: rgba(239, 68, 68, 0.4); color: #f87171;">
                                🗑️
                              </button>
                            </td>
                          </tr>
                        `;
                      })
                      .join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    `;

    content.querySelectorAll('.btn-delete-class').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const classId = e.currentTarget.dataset.classId;
        if (confirm('¿Eliminar esta sala de entrenamiento y sus registros?')) {
          await classRoomService.deleteClass(classId);
          Toast.show('Sala eliminada correctamente', 'success');
          await this.loadData(container);
        }
      });
    });
  },

  async changeUserRole(userId, newRole, userName, container) {
    try {
      const user = this.users.find((u) => u.id === userId) || { name: userName };
      await classRoomService.setUserRole(userId, newRole, user);

      const msg =
        newRole === 'trainer'
          ? `¡${userName} ahora tiene rol de Entrenador! Podrá crear y dictar salas.`
          : `Permisos de entrenador revocados para ${userName}.`;

      Toast.show(msg, 'success');
      await this.loadData(container);
    } catch (err) {
      console.error('[SuperAdminView] Error al cambiar rol:', err);
      Toast.show(`Error: ${err.message}`, 'error');
    }
  },

  async createTestUser(container) {
    const testNames = ['Martín Coach', 'Valeria Fitness', 'Gonzalo Cross', 'Camila Trainer', 'Santiago Gym'];
    const randomName = testNames[Math.floor(Math.random() * testNames.length)] + ` #${Math.floor(Math.random() * 900 + 100)}`;
    const randomEmail = randomName.toLowerCase().replace(/[^a-z0-9]/g, '') + '@fitpulse.demo';

    try {
      const testUser = {
        name: randomName,
        email: randomEmail,
        avatar: ''
      };
      const testId = 'user_test_' + Date.now();
      await classRoomService.setUserRole(testId, 'athlete', testUser);
      Toast.show(`Atleta de prueba creado: ${randomName}`, 'info');
      await this.loadData(container);
    } catch (e) {
      Toast.show('Error al crear atleta de prueba', 'error');
    }
  }
};
