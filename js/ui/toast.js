// ==============================================================================
// FITPULSE - TOAST NOTIFICATION SYSTEM
// Notificaciones flotantes elegantes con micro-animaciones.
// ==============================================================================

class ToastSystem {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  }

  show(opts, maybeType = 'info') {
    this.init();

    let title = '';
    let message = '';
    let type = 'info';
    let duration = 4000;
    let icon = null;

    if (typeof opts === 'string') {
      message = opts;
      type = maybeType || 'info';
    } else if (opts && typeof opts === 'object') {
      title = opts.title || '';
      message = opts.message || '';
      type = opts.type || 'info';
      duration = opts.duration !== undefined ? opts.duration : 4000;
      icon = opts.icon || null;
    }

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    } else if (type === 'warning') {
      iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    } else {
      iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }

    if (icon) iconSvg = icon;

    toast.innerHTML = `
      <div class="toast-icon">${iconSvg}</div>
      <div class="toast-body">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Cerrar">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    const dismiss = () => {
      toast.classList.add('toast-exit');
      setTimeout(() => {
        if (toast.parentElement) toast.parentElement.removeChild(toast);
      }, 300);
    };

    closeBtn.addEventListener('click', dismiss);

    this.container.appendChild(toast);

    if (duration > 0) {
      setTimeout(dismiss, duration);
    }

    return toast;
  }

  success(message, title = 'Operación Exitosa') {
    return this.show({ title, message, type: 'success' });
  }

  error(message, title = 'Error') {
    return this.show({ title, message, type: 'error' });
  }

  warning(message, title = 'Atención') {
    return this.show({ title, message, type: 'warning' });
  }

  info(message, title = 'Información') {
    return this.show({ title, message, type: 'info' });
  }
}

export const Toast = new ToastSystem();
