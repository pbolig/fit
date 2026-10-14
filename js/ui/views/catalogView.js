// ==============================================================================
// FITPULSE - EXERCISE CATALOG & MET ENCYCLOPEDIA VIEW
// Muestra los ejercicios organizados con valores MET, ejecución y grupos musculares.
// ==============================================================================

import { EXERCISE_CATALOG, CATEGORIES } from '../../services/exerciseCatalog.js';

export const CatalogView = {
  render(container) {
    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <span class="badge-tag">Biblioteca Científica</span>
          <h1 class="view-title">Enciclopedia de Ejercicios</h1>
          <p class="view-subtitle">Guía anatómica de movimientos con intensidades MET validadas para cálculo preciso de gasto calórico.</p>
        </div>
      </div>

      <!-- FILTROS Y BÚSQUEDA -->
      <div class="card glass-card catalog-controls-card">
        <div class="catalog-search-wrap">
          <div class="search-input-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="cat-search-field" class="input-field search-field" placeholder="Buscar ejercicio por nombre o músculo...">
          </div>
        </div>

        <div class="category-pills-scroll" id="catalog-pills">
          ${CATEGORIES.map((cat, i) => `
            <button class="filter-pill ${i === 0 ? 'active' : ''}" data-category="${cat}">${cat}</button>
          `).join('')}
        </div>
      </div>

      <!-- GRILLA DE EJERCICIOS -->
      <div class="catalog-grid" id="catalog-cards-container">
        <!-- Renderizado dinámicamente -->
      </div>
    `;

    this.attachEvents(container);
  },

  attachEvents(container) {
    const searchField = container.querySelector('#cat-search-field');
    const pills = container.querySelectorAll('.filter-pill');
    const cardsContainer = container.querySelector('#catalog-cards-container');

    let activeCat = 'Todos';

    const renderFilteredCards = () => {
      const query = (searchField.value || '').toLowerCase().trim();
      const filtered = EXERCISE_CATALOG.filter((ex) => {
        const matchesCategory = activeCat === 'Todos' || ex.category === activeCat;
        const matchesQuery = !query ||
          ex.name.toLowerCase().includes(query) ||
          ex.primaryMuscle.toLowerCase().includes(query) ||
          ex.category.toLowerCase().includes(query) ||
          (ex.secondaryMuscles && ex.secondaryMuscles.some((m) => m.toLowerCase().includes(query)));
        return matchesCategory && matchesQuery;
      });

      if (filtered.length === 0) {
        cardsContainer.innerHTML = `
          <div class="card glass-card empty-catalog-box full-width">
            <p>No se encontraron ejercicios que coincidan con "${query}".</p>
          </div>
        `;
        return;
      }

      cardsContainer.innerHTML = filtered.map((ex) => `
        <div class="card glass-card catalog-item-card">
          <div class="catalog-card-header">
            <span class="ex-cat-badge">${ex.category}</span>
            <span class="ex-met-badge">MET: ${ex.metValue}</span>
          </div>
          <h3 class="catalog-ex-title">${ex.name}</h3>
          
          <div class="catalog-anatomy-info">
            <div class="anatomy-row">
              <span class="anatomy-lbl">Músculo Principal:</span>
              <span class="anatomy-val text-accent-cyan">${ex.primaryMuscle}</span>
            </div>
            ${ex.secondaryMuscles && ex.secondaryMuscles.length > 0 ? `
              <div class="anatomy-row">
                <span class="anatomy-lbl">Músculos Secundarios:</span>
                <span class="anatomy-val">${ex.secondaryMuscles.join(', ')}</span>
              </div>
            ` : ''}
            <div class="anatomy-row">
              <span class="anatomy-lbl">Equipamiento:</span>
              <span class="anatomy-val">${ex.equipment}</span>
            </div>
          </div>

          <div class="catalog-tips-box">
            <div class="tips-header">💡 Clave Biomecánica:</div>
            <p class="tips-body">${ex.tips}</p>
          </div>
        </div>
      `).join('');
    };

    renderFilteredCards();

    searchField.addEventListener('input', renderFilteredCards);

    pills.forEach((pill) => {
      pill.addEventListener('click', () => {
        pills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        activeCat = pill.getAttribute('data-category');
        renderFilteredCards();
      });
    });
  }
};
