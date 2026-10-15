// ==============================================================================
// FITPULSE - EXERCISE & DANCE RHYTHMS CATALOG VIEW
// Muestra los ejercicios y ritmos de baile organizados con valores MET, ejecución,
// enlaces a videos de YouTube, y capacidades completas de edición (Agregar, Modificar, Quitar).
// ==============================================================================

import {
  EXERCISE_CATALOG,
  CATEGORIES,
  DANCE_SUBCATEGORIES,
  exerciseCatalogService,
  extractYouTubeId,
  getYouTubeEmbedUrl
} from '../../services/exerciseCatalog.js';
import { Toast } from '../toast.js';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const CatalogView = {
  render(container) {
    // Limpiar modales previos en document.body para evitar duplicados en navegación SPA
    document.querySelectorAll('#modal-exercise-form, #modal-video-player').forEach((el) => el.remove());

    container.innerHTML = `
      <div class="view-header" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
        <div class="view-title-group">
          <span class="badge-tag">Biblioteca & Academia de Ritmos</span>
          <h1 class="view-title">Enciclopedia de Ejercicios & Baile</h1>
          <p class="view-subtitle">Guía de movimientos musculares y ritmos (Salsa, Bachata, Latinos) con intensidades MET, tutoriales en video y tarjetas 100% personalizables.</p>
        </div>
        <div class="view-header-actions">
          <button id="btn-create-exercise" class="btn btn-primary btn-glow" style="display: flex; align-items: center; gap: 8px;">
            <span>➕ Nueva Actividad / Ritmo</span>
          </button>
        </div>
      </div>

      <!-- FILTROS Y BÚSQUEDA -->
      <div class="card glass-card catalog-controls-card">
        <div class="catalog-search-wrap">
          <div class="search-input-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="cat-search-field" class="input-field search-field" placeholder="Buscar por nombre, ritmo (salsa, bachata...), músculo o estilo...">
          </div>
        </div>

        <div class="category-pills-scroll" id="catalog-pills">
          ${CATEGORIES.map((cat, i) => `
            <button class="filter-pill ${i === 0 ? 'active' : ''}" data-category="${cat}">${cat}</button>
          `).join('')}
        </div>

        <!-- SUB-FILTRO POR ESTILOS DE BAILE & RITMOS -->
        <div class="subcat-pills-wrap" id="subcat-container" style="display: none;">
          <span class="subcat-label">Estilos de Ritmo:</span>
          ${DANCE_SUBCATEGORIES.map((sub, i) => `
            <button type="button" class="subcat-pill ${i === 0 ? 'active' : ''}" data-subcat="${sub}">${sub}</button>
          `).join('')}
        </div>
      </div>

      <!-- GRILLA DE EJERCICIOS Y RITMOS -->
      <div class="catalog-grid" id="catalog-cards-container">
        <!-- Renderizado dinámicamente -->
      </div>

      <!-- ===================================================================== -->
      <!-- MODAL 1: CREAR / MODIFICAR ACTIVIDAD O RITMO (TELEPORT A BODY)        -->
      <!-- ===================================================================== -->
      <div id="modal-exercise-form" class="modal-backdrop hidden" style="display: none;">
        <div class="modal-card" style="max-width: 680px; width: 94%; max-height: 90vh; overflow-y: auto; background: #0c1222; border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 18px; box-shadow: 0 30px 80px rgba(0, 0, 0, 0.95); margin: auto;">
          <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding: 18px 24px; background: rgba(15, 23, 42, 0.95); position: sticky; top: 0; z-index: 10;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 22px;">💃</span>
              <div>
                <h3 id="modal-form-title" style="margin: 0; font-size: 18px; font-weight: 700; color: #f8fafc;">Nueva Actividad / Ritmo</h3>
                <p style="margin: 2px 0 0; font-size: 12px; color: var(--color-text-muted);">Personaliza valores MET, estilo, enlaces a YouTube y tips biomecánicos</p>
              </div>
            </div>
            <button type="button" id="btn-close-exercise-form" class="btn-icon" style="background: rgba(255,255,255,0.08); border: none; color: #cbd5e1; cursor: pointer; font-size: 24px; width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center;">&times;</button>
          </div>

          <form id="form-exercise" style="display: flex; flex-direction: column; gap: 16px; padding: 22px 24px;">
            <input type="hidden" id="form-exercise-id" value="">

            <div>
              <label class="form-label" style="display: block; font-size: 13px; margin-bottom: 6px; font-weight: 600;">Nombre de la Actividad / Ritmo *</label>
              <input type="text" id="form-exercise-name" class="form-control" placeholder="Ej: Bachata Sensual Dominicana o Press Militar" required />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div>
                <label class="form-label" style="display: block; font-size: 13px; margin-bottom: 6px; font-weight: 600;">Categoría Principal *</label>
                <select id="form-exercise-category" class="form-control" required>
                  <option value="Baile & Ritmos">Baile & Ritmos</option>
                  <option value="Pecho">Pecho</option>
                  <option value="Espalda">Espalda</option>
                  <option value="Piernas">Piernas</option>
                  <option value="Hombros">Hombros</option>
                  <option value="Brazos">Brazos</option>
                  <option value="Core">Core</option>
                  <option value="Cardio">Cardio</option>
                  <option value="HIIT / Funcional">HIIT / Funcional</option>
                  <option value="Movilidad">Movilidad</option>
                </select>
              </div>

              <div>
                <label class="form-label" style="display: block; font-size: 13px; margin-bottom: 6px; font-weight: 600;">Subcategoría / Estilo</label>
                <input type="text" id="form-exercise-subcategory" list="subcat-suggestions" class="form-control" placeholder="Ej: Salsa, Bachata, Latinos..." />
                <datalist id="subcat-suggestions">
                  <option value="Salsa">
                  <option value="Bachata">
                  <option value="Ritmos Latinos">
                  <option value="Merengue">
                  <option value="Reggaetón / Urbano">
                  <option value="Zumba">
                  <option value="Cumbia">
                  <option value="Tango">
                  <option value="Hipertrofia">
                  <option value="Potencia">
                  <option value="Resistencia">
                </datalist>
              </div>
            </div>

            <!-- CAMPO YOUTUBE CON VISTA PREVIA EN VIVO -->
            <div>
              <label class="form-label" style="display: block; font-size: 13px; margin-bottom: 6px; font-weight: 600;">Enlace a Video de YouTube (Tutorial / Coreografía)</label>
              <div style="position: relative;">
                <input type="url" id="form-exercise-youtube" class="form-control" placeholder="https://www.youtube.com/watch?v=..." style="padding-left: 36px;" />
                <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 14px; pointer-events: none;">▶️</span>
              </div>
              <span style="font-size: 11px; color: var(--color-text-muted); margin-top: 4px; display: block;">Permite enlaces estándar de YouTube, cortos (youtu.be) o Shorts.</span>

              <!-- CONTENEDOR DE VISTA PREVIA DEL VIDEO EN VIVO -->
              <div id="form-youtube-preview-container" style="margin-top: 10px;">
                <!-- Renderizado dinámicamente -->
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div>
                <label class="form-label" style="display: block; font-size: 13px; margin-bottom: 6px; font-weight: 600;">Intensidad MET (1.0 - 15.0)</label>
                <input type="number" id="form-exercise-met" class="form-control" step="0.1" min="1.0" max="20.0" value="6.0" required />
              </div>

              <div>
                <label class="form-label" style="display: block; font-size: 13px; margin-bottom: 6px; font-weight: 600;">Equipamiento / Implementos</label>
                <input type="text" id="form-exercise-equipment" class="form-control" placeholder="Ej: Calzado Cómodo o Barra con Discos" value="Calzado Cómodo" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div>
                <label class="form-label" style="display: block; font-size: 13px; margin-bottom: 6px; font-weight: 600;">Músculo / Enfoque Principal</label>
                <input type="text" id="form-exercise-primary" class="form-control" placeholder="Ej: Core y Coordinación Dinámica" value="Core y Coordinación" />
              </div>

              <div>
                <label class="form-label" style="display: block; font-size: 13px; margin-bottom: 6px; font-weight: 600;">Secundarios (separados por coma)</label>
                <input type="text" id="form-exercise-secondary" class="form-control" placeholder="Ej: Glúteos, Gemelos, Cadera" />
              </div>
            </div>

            <div>
              <label class="form-label" style="display: block; font-size: 13px; margin-bottom: 6px; font-weight: 600;">Clave Biomecánica / Pasos / Coreografía</label>
              <textarea id="form-exercise-tips" class="form-control" rows="3" placeholder="Describe los pasos básicos, conteo de tiempos rítmicos o postura recomendada..."></textarea>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px;">
              <button type="button" id="btn-cancel-exercise-form" class="btn btn-secondary">Cancelar</button>
              <button type="submit" class="btn btn-primary btn-glow">Guardar Actividad</button>
            </div>
          </form>
        </div>
      </div>

      <!-- ===================================================================== -->
      <!-- MODAL 2: REPRODUCTOR DE VIDEO YOUTUBE EMBED                           -->
      <!-- ===================================================================== -->
      <div id="modal-video-player" class="modal-backdrop hidden" style="display: none;">
        <div class="youtube-modal-dialog" style="max-width: 820px; width: 94%; background: #090e1a; border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 18px; box-shadow: 0 30px 80px rgba(0, 0, 0, 0.95); margin: auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(15, 23, 42, 0.9);">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="color: #ef4444; font-size: 18px;">▶️</span>
              <h3 id="video-modal-title" style="margin: 0; font-size: 16px; font-weight: 700; color: #f8fafc;">Reproductor de Tutorial</h3>
            </div>
            <button type="button" id="btn-close-video-modal" class="btn-icon" style="background: rgba(255,255,255,0.08); border: none; color: #e2e8f0; cursor: pointer; font-size: 22px; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center;">&times;</button>
          </div>

          <div class="youtube-iframe-container">
            <iframe id="video-modal-iframe" src="" title="Video Tutorial FitPulse" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: rgba(15, 23, 42, 0.95); font-size: 12px;">
            <span style="color: var(--color-text-muted);">💡 Mira los pasos y técnica para replicarlos en tu sesión.</span>
            <a id="video-external-link" href="#" target="_blank" rel="noopener noreferrer" style="color: #38bdf8; text-decoration: none; font-weight: 600;">
              Abrir en YouTube ↗️
            </a>
          </div>
        </div>
      </div>
    `;

    this.attachEvents(container);
  },

  attachEvents(container) {
    const searchField = container.querySelector('#cat-search-field');
    const pills = container.querySelectorAll('.filter-pill');
    const cardsContainer = container.querySelector('#catalog-cards-container');
    const subcatContainer = container.querySelector('#subcat-container');
    const subcatPills = container.querySelectorAll('.subcat-pill');
    const openCreateBtn = container.querySelector('#btn-create-exercise');

    // Teletransportar los modales directamente a document.body para que queden centrados en la pantalla
    // y cubran tanto el sidebar como el área principal con el backdrop desenfocado
    const exerciseModal = container.querySelector('#modal-exercise-form');
    const videoModal = container.querySelector('#modal-video-player');

    if (exerciseModal) document.body.appendChild(exerciseModal);
    if (videoModal) document.body.appendChild(videoModal);

    const closeFormBtn = exerciseModal.querySelector('#btn-close-exercise-form');
    const cancelFormBtn = exerciseModal.querySelector('#btn-cancel-exercise-form');
    const form = exerciseModal.querySelector('#form-exercise');
    const previewContainer = exerciseModal.querySelector('#form-youtube-preview-container');
    const youtubeInput = exerciseModal.querySelector('#form-exercise-youtube');

    const closeVideoBtn = videoModal.querySelector('#btn-close-video-modal');
    const videoIframe = videoModal.querySelector('#video-modal-iframe');
    const videoTitle = videoModal.querySelector('#video-modal-title');
    const videoExternalLink = videoModal.querySelector('#video-external-link');

    let activeCat = 'Todos';
    let activeSubcat = 'Todos';

    // RENDERIZADOR DE LA VISTA PREVIA EN VIVO DE YOUTUBE EN EL FORMULARIO
    const updateFormVideoPreview = (url) => {
      if (!previewContainer) return;
      const trimmed = (url || '').trim();
      const videoId = extractYouTubeId(trimmed);

      if (videoId) {
        const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
        previewContainer.innerHTML = `
          <div style="background: #020617; border: 1px solid rgba(239, 68, 68, 0.45); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.6);">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; background: rgba(239, 68, 68, 0.15); border-bottom: 1px solid rgba(239, 68, 68, 0.25);">
              <span style="font-size: 12px; color: #fca5a5; font-weight: 700; display: flex; align-items: center; gap: 6px;">
                <span style="color: #ef4444;">▶️</span> Vista Previa del Tutorial en Video
              </span>
              <a href="${escapeHtml(trimmed)}" target="_blank" rel="noopener noreferrer" style="font-size: 11px; color: #38bdf8; text-decoration: none; font-weight: 600;">
                Abrir en YouTube ↗️
              </a>
            </div>
            <div style="position: relative; width: 100%; padding-bottom: 52%; height: 0; background: #000;">
              <iframe src="${embedUrl}" title="Vista Previa YouTube" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;"></iframe>
            </div>
          </div>
        `;
      } else if (trimmed.length > 0) {
        previewContainer.innerHTML = `
          <div style="padding: 10px 14px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; color: #fbbf24; font-size: 12px; display: flex; align-items: center; gap: 8px;">
            <span>⚠️</span>
            <span>El enlace ingresado no parece ser un video válido de YouTube. Ejemplo: <code>https://www.youtube.com/watch?v=...</code></span>
          </div>
        `;
      } else {
        previewContainer.innerHTML = `
          <div style="padding: 12px 14px; border: 1px dashed rgba(255, 255, 255, 0.12); border-radius: 8px; text-align: center; color: var(--color-text-muted); font-size: 12px; background: rgba(15, 23, 42, 0.45);">
            <span>📹 Pega un enlace de YouTube arriba para previsualizar el video aquí</span>
          </div>
        `;
      }
    };

    // Actualizar vista previa en tiempo real al escribir o pegar
    youtubeInput?.addEventListener('input', (e) => {
      updateFormVideoPreview(e.target.value);
    });

    // RENDERIZADOR DINÁMICO DE CARDS
    const renderFilteredCards = () => {
      const query = (searchField.value || '').toLowerCase().trim();

      // Mostrar u ocultar barra de subcategorías si estamos en Baile & Ritmos
      if (activeCat === 'Baile & Ritmos') {
        subcatContainer.style.display = 'flex';
      } else {
        subcatContainer.style.display = 'none';
        activeSubcat = 'Todos';
      }

      const filtered = EXERCISE_CATALOG.filter((ex) => {
        const matchesCategory = activeCat === 'Todos' || ex.category === activeCat;

        const matchesSubcategory =
          activeSubcat === 'Todos' ||
          (ex.subcategory && ex.subcategory.toLowerCase().includes(activeSubcat.toLowerCase()));

        const matchesQuery =
          !query ||
          ex.name.toLowerCase().includes(query) ||
          ex.primaryMuscle.toLowerCase().includes(query) ||
          ex.category.toLowerCase().includes(query) ||
          (ex.subcategory && ex.subcategory.toLowerCase().includes(query)) ||
          (ex.secondaryMuscles && ex.secondaryMuscles.some((m) => m.toLowerCase().includes(query))) ||
          (ex.tips && ex.tips.toLowerCase().includes(query));

        return matchesCategory && matchesSubcategory && matchesQuery;
      });

      if (filtered.length === 0) {
        cardsContainer.innerHTML = `
          <div class="card glass-card empty-catalog-box full-width" style="grid-column: 1 / -1; padding: 48px 24px; text-align: center;">
            <div style="font-size: 42px; margin-bottom: 12px;">🔍</div>
            <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 6px;">No se encontraron actividades</h3>
            <p style="color: var(--color-text-muted); font-size: 14px; margin-bottom: 18px;">
              No hay coincidencias para el filtro actual. Puedes crear una nueva tarjeta presionando el botón superior.
            </p>
            <button type="button" class="btn btn-primary btn-sm btn-quick-add" style="margin: 0 auto;">
              <span>+ Crear Esta Actividad / Ritmo</span>
            </button>
          </div>
        `;
        cardsContainer.querySelector('.btn-quick-add')?.addEventListener('click', () => {
          showExerciseModal();
          if (query) {
            exerciseModal.querySelector('#form-exercise-name').value = query.charAt(0).toUpperCase() + query.slice(1);
          }
        });
        return;
      }

      cardsContainer.innerHTML = filtered
        .map((ex) => {
          const hasVideo = Boolean(ex.youtube_url && extractYouTubeId(ex.youtube_url));
          const subcatBadge = ex.subcategory
            ? `<span class="ex-subcat-badge">🎶 ${escapeHtml(ex.subcategory)}</span>`
            : '';

          return `
            <div class="card glass-card catalog-item-card" data-exercise-id="${ex.id}">
              <div class="catalog-card-header">
                <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                  <span class="ex-cat-badge">${escapeHtml(ex.category)}</span>
                  ${subcatBadge}
                </div>
                <span class="ex-met-badge">MET: ${ex.metValue}</span>
              </div>

              <h3 class="catalog-ex-title">${escapeHtml(ex.name)}</h3>

              <div class="catalog-anatomy-info">
                <div class="anatomy-row">
                  <span class="anatomy-lbl">Enfoque / Músculo:</span>
                  <span class="anatomy-val text-accent-cyan">${escapeHtml(ex.primaryMuscle)}</span>
                </div>
                ${
                  ex.secondaryMuscles && ex.secondaryMuscles.length > 0
                    ? `
                  <div class="anatomy-row">
                    <span class="anatomy-lbl">Secundarios:</span>
                    <span class="anatomy-val">${escapeHtml(ex.secondaryMuscles.join(', '))}</span>
                  </div>
                `
                    : ''
                }
                <div class="anatomy-row">
                  <span class="anatomy-lbl">Equipamiento:</span>
                  <span class="anatomy-val">${escapeHtml(ex.equipment || 'Ninguno')}</span>
                </div>
              </div>

              ${
                hasVideo
                  ? `
                <div style="margin: 4px 0;">
                  <button type="button" class="btn-youtube-play btn-play-tutorial" data-video-url="${escapeHtml(ex.youtube_url)}" data-title="${escapeHtml(ex.name)}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                    <span>Ver Video / Tutorial</span>
                  </button>
                </div>
              `
                  : ''
              }

              <div class="catalog-tips-box">
                <div class="tips-header">💡 Clave Biomecánica / Coreografía:</div>
                <p class="tips-body">${escapeHtml(ex.tips || 'Mantener postura activa y respiración fluida.')}</p>
              </div>

              <!-- BOTONES EDITAR Y ELIMINAR -->
              <div class="catalog-card-actions">
                <button type="button" class="btn-card-action btn-edit-card" data-id="${ex.id}">
                  <span>✏️ Editar</span>
                </button>
                <button type="button" class="btn-card-action btn-delete btn-delete-card" data-id="${ex.id}">
                  <span>🗑️ Quitar</span>
                </button>
              </div>
            </div>
          `;
        })
        .join('');

      // Wire up card action buttons
      cardsContainer.querySelectorAll('.btn-play-tutorial').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const url = btn.dataset.videoUrl;
          const title = btn.dataset.title;
          openVideoPlayer(url, title);
        });
      });

      cardsContainer.querySelectorAll('.btn-edit-card').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          const ex = EXERCISE_CATALOG.find((x) => x.id === id);
          if (ex) {
            showExerciseModal(ex);
          }
        });
      });

      cardsContainer.querySelectorAll('.btn-delete-card').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          const ex = EXERCISE_CATALOG.find((x) => x.id === id);
          const name = ex ? ex.name : 'esta actividad';
          if (confirm(`¿Estás seguro de que deseas quitar "${name}" del catálogo?`)) {
            await exerciseCatalogService.deleteExercise(id);
            Toast.show(`"${name}" quitado del catálogo`, 'info');
            renderFilteredCards();
          }
        });
      });
    };

    // FUNCIONES DEL MODAL DE VIDEO
    const openVideoPlayer = (url, title) => {
      const embedUrl = getYouTubeEmbedUrl(url);
      if (!embedUrl) {
        Toast.show('URL de video no válida o no soportada', 'warning');
        return;
      }
      videoTitle.textContent = title || 'Tutorial FitPulse';
      videoIframe.src = embedUrl;
      videoExternalLink.href = url;
      videoModal.style.display = 'flex';
      videoModal.classList.remove('hidden');
    };

    const closeVideoPlayer = () => {
      videoIframe.src = '';
      videoModal.style.display = 'none';
      videoModal.classList.add('hidden');
    };

    closeVideoBtn?.addEventListener('click', closeVideoPlayer);
    videoModal?.addEventListener('click', (e) => {
      if (e.target === videoModal) closeVideoPlayer();
    });

    // FUNCIONES DEL MODAL DE FORMULARIO (AGREGAR / MODIFICAR)
    const showExerciseModal = (exercise = null) => {
      const titleEl = exerciseModal.querySelector('#modal-form-title');
      const idInput = exerciseModal.querySelector('#form-exercise-id');
      const nameInput = exerciseModal.querySelector('#form-exercise-name');
      const categorySelect = exerciseModal.querySelector('#form-exercise-category');
      const subcatInput = exerciseModal.querySelector('#form-exercise-subcategory');
      const youtubeInputEl = exerciseModal.querySelector('#form-exercise-youtube');
      const metInput = exerciseModal.querySelector('#form-exercise-met');
      const primaryInput = exerciseModal.querySelector('#form-exercise-primary');
      const secondaryInput = exerciseModal.querySelector('#form-exercise-secondary');
      const equipmentInput = exerciseModal.querySelector('#form-exercise-equipment');
      const tipsInput = exerciseModal.querySelector('#form-exercise-tips');

      if (exercise) {
        titleEl.textContent = `✏️ Modificar: ${exercise.name}`;
        idInput.value = exercise.id;
        nameInput.value = exercise.name || '';
        categorySelect.value = exercise.category || 'Baile & Ritmos';
        subcatInput.value = exercise.subcategory || '';
        youtubeInputEl.value = exercise.youtube_url || '';
        metInput.value = exercise.metValue || 6.0;
        primaryInput.value = exercise.primaryMuscle || '';
        secondaryInput.value = (exercise.secondaryMuscles || []).join(', ');
        equipmentInput.value = exercise.equipment || 'Ninguno';
        tipsInput.value = exercise.tips || '';
        updateFormVideoPreview(exercise.youtube_url || '');
      } else {
        titleEl.textContent = '✨ Nueva Actividad o Ritmo';
        idInput.value = '';
        nameInput.value = '';
        categorySelect.value = activeCat === 'Todos' ? 'Baile & Ritmos' : activeCat;
        subcatInput.value = activeSubcat !== 'Todos' ? activeSubcat : 'Salsa';
        youtubeInputEl.value = '';
        metInput.value = '6.0';
        primaryInput.value = 'Core, Piernas y Coordinación';
        secondaryInput.value = 'Glúteos, Gemelos';
        equipmentInput.value = 'Calzado Cómodo';
        tipsInput.value = '';
        updateFormVideoPreview('');
      }

      exerciseModal.style.display = 'flex';
      exerciseModal.classList.remove('hidden');
      nameInput.focus();
    };

    const hideExerciseModal = () => {
      exerciseModal.style.display = 'none';
      exerciseModal.classList.add('hidden');
      updateFormVideoPreview('');
      form.reset();
    };

    openCreateBtn?.addEventListener('click', () => showExerciseModal());
    closeFormBtn?.addEventListener('click', hideExerciseModal);
    cancelFormBtn?.addEventListener('click', hideExerciseModal);
    exerciseModal?.addEventListener('click', (e) => {
      if (e.target === exerciseModal) hideExerciseModal();
    });

    // SUBMIT DEL FORMULARIO DE ACTIVIDAD
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = exerciseModal.querySelector('#form-exercise-id').value.trim();
      const name = exerciseModal.querySelector('#form-exercise-name').value.trim();
      const category = exerciseModal.querySelector('#form-exercise-category').value;
      const subcategory = exerciseModal.querySelector('#form-exercise-subcategory').value.trim();
      const youtube_url = exerciseModal.querySelector('#form-exercise-youtube').value.trim();
      const metValue = parseFloat(exerciseModal.querySelector('#form-exercise-met').value) || 6.0;
      const primaryMuscle = exerciseModal.querySelector('#form-exercise-primary').value.trim();
      const secondaryRaw = exerciseModal.querySelector('#form-exercise-secondary').value.trim();
      const equipment = exerciseModal.querySelector('#form-exercise-equipment').value.trim() || 'Ninguno';
      const tips = exerciseModal.querySelector('#form-exercise-tips').value.trim();

      if (!name) {
        Toast.show('Por favor ingresa un nombre para la actividad', 'warning');
        return;
      }

      const secondaryMuscles = secondaryRaw
        ? secondaryRaw.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      const exerciseData = {
        name,
        category,
        subcategory: subcategory || undefined,
        type: category === 'Baile & Ritmos' || category === 'Cardio' || category === 'Movilidad' ? 'duration' : 'strength',
        primaryMuscle: primaryMuscle || 'General',
        secondaryMuscles,
        equipment,
        metValue,
        youtube_url: youtube_url || undefined,
        tips: tips || 'Mantener buena postura y ritmo respiratorio constante.'
      };

      if (id) {
        exerciseData.id = id;
      }

      try {
        await exerciseCatalogService.saveExercise(exerciseData);
        Toast.show(id ? `Actividad "${name}" actualizada` : `Actividad "${name}" agregada con éxito`, 'success');
        hideExerciseModal();
        renderFilteredCards();
      } catch (err) {
        console.error('Error al guardar actividad:', err);
        Toast.show('Error al guardar la actividad: ' + err.message, 'error');
      }
    });

    // BÚSQUEDA Y FILTRADO POR CATEGORÍA
    searchField.addEventListener('input', renderFilteredCards);

    pills.forEach((pill) => {
      pill.addEventListener('click', () => {
        pills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        activeCat = pill.getAttribute('data-category');
        renderFilteredCards();
      });
    });

    subcatPills.forEach((subPill) => {
      subPill.addEventListener('click', () => {
        subcatPills.forEach((s) => s.classList.remove('active'));
        subPill.classList.add('active');
        activeSubcat = subPill.getAttribute('data-subcat');
        renderFilteredCards();
      });
    });

    // Render inicial
    renderFilteredCards();
  }
};
