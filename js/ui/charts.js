// ==============================================================================
// FITPULSE - HIGH-PERFORMANCE NATIVE CANVAS CHARTS
// Gráficos fluidos y ultra-ligeros con soporte retina / alta densidad de píxeles.
// ==============================================================================

export const Charts = {
  /**
   * Configura el canvas para pantallas de alta densidad (Retina)
   */
  setupCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || canvas.width || 300;
    const height = rect.height || canvas.height || 180;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, width, height };
  },

  /**
   * Gráfico de Línea con Relleno Gradiente (Ideal para peso corporal y 1RM)
   */
  renderLineChart(canvas, dataPoints, options = {}) {
    if (!canvas || !dataPoints || dataPoints.length === 0) return;
    const { ctx, width, height } = this.setupCanvas(canvas);

    const padding = { top: 25, right: 30, bottom: 35, left: 45 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const values = dataPoints.map((d) => d.value);
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);
    if (minVal === maxVal) {
      minVal -= 2;
      maxVal += 2;
    }
    const valRange = maxVal - minVal || 1;

    // Colores
    const lineColor = options.lineColor || '#00f2fe';
    const gradientTop = options.gradientTop || 'rgba(0, 242, 254, 0.35)';
    const gradientBottom = options.gradientBottom || 'rgba(0, 242, 254, 0.0)';

    // Dibujar líneas guía horizontales
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    ctx.font = '10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.textAlign = 'right';

    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const yVal = minVal + (valRange * (steps - i)) / steps;
      const yPos = padding.top + (chartH * i) / steps;
      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(width - padding.right, yPos);
      ctx.stroke();

      ctx.fillText(yVal.toFixed(1), padding.left - 8, yPos + 3);
    }

    // Coordenadas de los puntos
    const coords = dataPoints.map((pt, idx) => {
      const x = padding.left + (chartW * idx) / Math.max(1, dataPoints.length - 1);
      const y = padding.top + chartH - ((pt.value - minVal) / valRange) * chartH;
      return { x, y, label: pt.label, value: pt.value };
    });

    // Dibujar área con gradiente
    const grad = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    grad.addColorStop(0, gradientTop);
    grad.addColorStop(1, gradientBottom);

    ctx.beginPath();
    ctx.moveTo(coords[0].x, height - padding.bottom);
    coords.forEach((c) => ctx.lineTo(c.x, c.y));
    ctx.lineTo(coords[coords.length - 1].x, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Dibujar línea principal
    ctx.beginPath();
    ctx.moveTo(coords[0].x, coords[0].y);
    for (let i = 1; i < coords.length; i++) {
      ctx.lineTo(coords[i].x, coords[i].y);
    }
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Dibujar puntos y etiquetas del eje X
    ctx.textAlign = 'center';
    coords.forEach((c, idx) => {
      // Punto brillante
      ctx.beginPath();
      ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#0b0f17';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = lineColor;
      ctx.stroke();

      // Etiqueta X (saltar algunas si son muchas)
      if (dataPoints.length <= 7 || idx === 0 || idx === dataPoints.length - 1 || idx % 2 === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fillText(c.label, c.x, height - 10);
      }
    });
  },

  /**
   * Gráfico de Barras (Ideal para volumen por grupo muscular o sesiones)
   */
  renderBarChart(canvas, dataItems, options = {}) {
    if (!canvas || !dataItems || dataItems.length === 0) return;
    const { ctx, width, height } = this.setupCanvas(canvas);

    const padding = { top: 20, right: 20, bottom: 40, left: 45 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const values = dataItems.map((d) => d.value);
    const maxVal = Math.max(...values, 10);

    // Fondo y líneas guía
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.font = '10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 3; i++) {
      const yVal = Math.round((maxVal * (3 - i)) / 3);
      const yPos = padding.top + (chartH * i) / 3;
      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(width - padding.right, yPos);
      ctx.stroke();

      ctx.fillText(yVal.toString(), padding.left - 6, yPos + 3);
    }

    const barWidth = Math.min(36, (chartW / dataItems.length) * 0.65);
    const gap = chartW / dataItems.length;

    dataItems.forEach((item, idx) => {
      const barH = (item.value / maxVal) * chartH;
      const x = padding.left + idx * gap + (gap - barWidth) / 2;
      const y = padding.top + chartH - barH;

      // Gradiente de la barra
      const barGrad = ctx.createLinearGradient(0, y, 0, padding.top + chartH);
      barGrad.addColorStop(0, item.color || '#4facfe');
      barGrad.addColorStop(1, item.colorSecondary || '#00f2fe');

      ctx.fillStyle = barGrad;
      // Dibujar barra con esquinas redondeadas arriba
      ctx.beginPath();
      const r = 4;
      ctx.moveTo(x, padding.top + chartH);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.lineTo(x + barWidth - r, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + r);
      ctx.lineTo(x + barWidth, padding.top + chartH);
      ctx.closePath();
      ctx.fill();

      // Etiqueta del valor arriba
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.textAlign = 'center';
      ctx.font = '10px "Outfit", sans-serif';
      if (barH > 15) {
        ctx.fillText(item.value.toString(), x + barWidth / 2, y - 5);
      }

      // Etiqueta de categoría en el eje X
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '10px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(item.label, x + barWidth / 2, height - 12);
    });
  },

  /**
   * Gráfico de Dona para Distribución de Macronutrientes
   */
  renderDonutChart(canvas, slices) {
    if (!canvas || !slices) return;
    const { ctx, width, height } = this.setupCanvas(canvas);

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    const innerRadius = radius * 0.68;

    const total = slices.reduce((acc, s) => acc + s.value, 0) || 1;
    let startAngle = -Math.PI / 2;

    slices.forEach((slice) => {
      const sliceAngle = (slice.value / total) * Math.PI * 2;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();

      ctx.fillStyle = slice.color;
      ctx.fill();

      startAngle = endAngle;
    });

    // Círculo central limpio
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius - 2, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
  }
};
