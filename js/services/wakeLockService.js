// ==============================================================================
// FITPULSE - SCREEN WAKE LOCK & DISPLAY POWER MANAGER
// Mantiene la pantalla encendida durante el entrenamiento activo sin apagarse,
// permitiendo al atleta ver el cronómetro sin tocar el teléfono.
// Libera el bloqueo al pausar, terminar o cambiar de app para ahorrar batería.
// ==============================================================================

class WakeLockService {
  constructor() {
    this.sentinel = null;
    this.isSupported = (typeof navigator !== 'undefined' && 'wakeLock' in navigator);
    this.isActive = false;
    this.isOledEcoMode = false;

    // Reactivar el bloqueo si el usuario vuelve a la pestaña activa
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState === 'visible' && this.isActive && !this.sentinel) {
          await this.request();
        }
      });
    }
  }

  /**
   * Solicita el bloqueo de pantalla para mantenerla activa
   */
  async request() {
    if (!this.isSupported) {
      console.log('FitPulse: Screen Wake Lock API no soportada en este navegador');
      return false;
    }

    try {
      this.isActive = true;
      this.sentinel = await navigator.wakeLock.request('screen');
      this.sentinel.addEventListener('release', () => {
        this.sentinel = null;
        window.dispatchEvent(new CustomEvent('fitpulse:wakelock-change', { detail: { active: false } }));
      });
      window.dispatchEvent(new CustomEvent('fitpulse:wakelock-change', { detail: { active: true } }));
      return true;
    } catch (err) {
      console.warn('FitPulse: no se pudo adquirir Wake Lock:', err);
      this.sentinel = null;
      return false;
    }
  }

  /**
   * Libera el bloqueo para permitir que el dispositivo ahorre batería
   */
  release() {
    this.isActive = false;
    if (this.sentinel) {
      this.sentinel.release().catch(() => {});
      this.sentinel = null;
      window.dispatchEvent(new CustomEvent('fitpulse:wakelock-change', { detail: { active: false } }));
    }
  }

  /**
   * Alterna entre modo normal y Modo Ahorro OLED (negro absoluto 0W por subpíxel)
   */
  toggleOledEcoMode() {
    this.isOledEcoMode = !this.isOledEcoMode;
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('oled-eco-active', this.isOledEcoMode);
    }
    window.dispatchEvent(new CustomEvent('fitpulse:oled-eco-change', { detail: { isEco: this.isOledEcoMode } }));
    return this.isOledEcoMode;
  }
}

export const wakeLockService = new WakeLockService();
