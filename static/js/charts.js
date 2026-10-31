/**
 * Signal Detection Theory (SDT) Interactive SVG Charting Engine
 * Zero external dependencies. Pixel-perfect, responsive, and printable.
 */

window.SDTCharts = {
  /**
   * Render Chart 1: Psychophysical Function (d' vs Set Size)
   */
  renderDPrimeChart: function (containerId, blocks) {
    const container = document.getElementById(containerId);
    if (!container || !blocks || blocks.length === 0) return;

    const width = container.clientWidth || 500;
    const height = 300;
    const padLeft = 60;
    const padRight = 30;
    const padTop = 30;
    const padBottom = 50;

    const data = blocks.map(b => ({
      x: b.set_size,
      y: b.summary.d_prime
    }));

    const xValues = data.map(d => d.x);
    const yValues = data.map(d => d.y);

    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const maxY = Math.max(3.0, Math.ceil(Math.max(...yValues) * 1.25));
    const minY = 0.0;

    const scaleX = (x) => padLeft + ((x - minX) / (maxX - minX || 1)) * (width - padLeft - padRight);
    const scaleY = (y) => height - padBottom - ((y - minY) / (maxY - minY)) * (height - padTop - padBottom);

    let svg = `<svg viewBox="0 0 ${width} ${height}" class="sdt-svg-chart">`;

    // Gridlines and Y-axis labels
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const val = (maxY / yTicks) * i;
      const y = scaleY(val);
      svg += `
        <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="#e2e8f0" stroke-width="1" />
        <text x="${padLeft - 10}" y="${y + 4}" fill="#64748b" font-size="11" text-anchor="end">${val.toFixed(1)}</text>
      `;
    }

    // X-axis ticks
    data.forEach(d => {
      const x = scaleX(d.x);
      svg += `
        <line x1="${x}" y1="${height - padBottom}" x2="${x}" y2="${height - padBottom + 6}" stroke="#94a3b8" stroke-width="1.5" />
        <text x="${x}" y="${height - padBottom + 20}" fill="#475569" font-size="12" font-weight="600" text-anchor="middle">${d.x}</text>
      `;
    });

    // Axes
    svg += `
      <line x1="${padLeft}" y1="${height - padBottom}" x2="${width - padRight}" y2="${height - padBottom}" stroke="#64748b" stroke-width="2" />
      <line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${height - padBottom}" stroke="#64748b" stroke-width="2" />
      <text x="${(padLeft + width - padRight) / 2}" y="${height - 10}" fill="#334155" font-size="12" font-weight="700" text-anchor="middle">Set Size (Number of Words)</text>
      <text transform="rotate(-90)" x="${-(height / 2)}" y="20" fill="#334155" font-size="12" font-weight="700" text-anchor="middle">Sensitivity (d')</text>
    `;

    // Path for line
    let pathD = '';
    data.forEach((d, i) => {
      const px = scaleX(d.x);
      const py = scaleY(d.y);
      pathD += (i === 0 ? `M ${px} ${py}` : ` L ${px} ${py}`);
    });

    // Area fill below curve
    const areaD = `${pathD} L ${scaleX(data[data.length - 1].x)} ${scaleY(0)} L ${scaleX(data[0].x)} ${scaleY(0)} Z`;
    svg += `
      <defs>
        <linearGradient id="dprimeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#4f46e5" stop-opacity="0.25" />
          <stop offset="100%" stop-color="#4f46e5" stop-opacity="0.0" />
        </linearGradient>
      </defs>
      <path d="${areaD}" fill="url(#dprimeGrad)" />
      <path d="${pathD}" fill="none" stroke="#4f46e5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    `;

    // Data points and labels
    data.forEach(d => {
      const px = scaleX(d.x);
      const py = scaleY(d.y);
      svg += `
        <circle cx="${px}" cy="${py}" r="6" fill="#4f46e5" stroke="#ffffff" stroke-width="2.5" />
        <rect x="${px - 22}" y="${py - 26}" width="44" height="20" rx="4" fill="#1e293b" />
        <text x="${px}" y="${py - 13}" fill="#ffffff" font-size="11" font-weight="700" text-anchor="middle">${d.y.toFixed(2)}</text>
      `;
    });

    svg += '</svg>';
    container.innerHTML = svg;
  },

  /**
   * Render Chart 2: Bias vs Set Size (b and c)
   */
  renderBiasChart: function (containerId, blocks) {
    const container = document.getElementById(containerId);
    if (!container || !blocks || blocks.length === 0) return;

    const width = container.clientWidth || 500;
    const height = 300;
    const padLeft = 60;
    const padRight = 30;
    const padTop = 30;
    const padBottom = 50;

    const dataB = blocks.map(b => ({ x: b.set_size, y: b.summary.b }));
    const dataC = blocks.map(b => ({ x: b.set_size, y: b.summary.c }));

    const xValues = dataB.map(d => d.x);
    const allY = [...dataB.map(d => d.y), ...dataC.map(d => d.y)];

    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(-1.0, Math.floor(Math.min(...allY) * 1.2));
    const maxY = Math.max(2.0, Math.ceil(Math.max(...allY) * 1.2));

    const scaleX = (x) => padLeft + ((x - minX) / (maxX - minX || 1)) * (width - padLeft - padRight);
    const scaleY = (y) => height - padBottom - ((y - minY) / (maxY - minY)) * (height - padTop - padBottom);

    let svg = `<svg viewBox="0 0 ${width} ${height}" class="sdt-svg-chart">`;

    // Gridlines
    const yTicks = 6;
    for (let i = 0; i <= yTicks; i++) {
      const val = minY + ((maxY - minY) / yTicks) * i;
      const y = scaleY(val);
      const isZero = Math.abs(val) < 0.001;
      svg += `
        <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="${isZero ? '#94a3b8' : '#e2e8f0'}" stroke-width="${isZero ? '1.5' : '1'}" stroke-dasharray="${isZero ? '4,4' : 'none'}" />
        <text x="${padLeft - 10}" y="${y + 4}" fill="#64748b" font-size="11" text-anchor="end">${val.toFixed(1)}</text>
      `;
    }

    // X-axis ticks
    dataB.forEach(d => {
      const x = scaleX(d.x);
      svg += `
        <line x1="${x}" y1="${height - padBottom}" x2="${x}" y2="${height - padBottom + 6}" stroke="#94a3b8" stroke-width="1.5" />
        <text x="${x}" y="${height - padBottom + 20}" fill="#475569" font-size="12" font-weight="600" text-anchor="middle">${d.x}</text>
      `;
    });

    // Axes
    svg += `
      <line x1="${padLeft}" y1="${height - padBottom}" x2="${width - padRight}" y2="${height - padBottom}" stroke="#64748b" stroke-width="2" />
      <line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${height - padBottom}" stroke="#64748b" stroke-width="2" />
      <text x="${(padLeft + width - padRight) / 2}" y="${height - 10}" fill="#334155" font-size="12" font-weight="700" text-anchor="middle">Set Size (Number of Words)</text>
      <text transform="rotate(-90)" x="${-(height / 2)}" y="20" fill="#334155" font-size="12" font-weight="700" text-anchor="middle">Criterion / Bias Value</text>
    `;

    // Line for b (relative bias)
    let pathB = '';
    dataB.forEach((d, i) => {
      const px = scaleX(d.x);
      const py = scaleY(d.y);
      pathB += (i === 0 ? `M ${px} ${py}` : ` L ${px} ${py}`);
    });

    // Line for c (absolute criterion)
    let pathC = '';
    dataC.forEach((d, i) => {
      const px = scaleX(d.x);
      const py = scaleY(d.y);
      pathC += (i === 0 ? `M ${px} ${py}` : ` L ${px} ${py}`);
    });

    svg += `
      <path d="${pathB}" fill="none" stroke="#0ea5e9" stroke-width="2.5" />
      <path d="${pathC}" fill="none" stroke="#10b981" stroke-width="2.5" stroke-dasharray="3,3" />
    `;

    // Points for b
    dataB.forEach(d => {
      const px = scaleX(d.x);
      const py = scaleY(d.y);
      svg += `
        <circle cx="${px}" cy="${py}" r="5" fill="#0ea5e9" stroke="#ffffff" stroke-width="2" />
        <text x="${px}" y="${py - 10}" fill="#0284c7" font-size="10" font-weight="700" text-anchor="middle">${d.y.toFixed(2)}</text>
      `;
    });

    // Points for c
    dataC.forEach(d => {
      const px = scaleX(d.x);
      const py = scaleY(d.y);
      svg += `
        <circle cx="${px}" cy="${py}" r="5" fill="#10b981" stroke="#ffffff" stroke-width="2" />
        <text x="${px}" y="${py + 15}" fill="#059669" font-size="10" font-weight="700" text-anchor="middle">${d.y.toFixed(2)}</text>
      `;
    });

    // Legend
    svg += `
      <g transform="translate(${width - 230}, ${padTop - 10})">
        <rect width="210" height="30" rx="6" fill="#f8fafc" stroke="#cbd5e1" />
        <circle cx="15" cy="15" r="4" fill="#0ea5e9" />
        <text x="25" y="19" fill="#0f172a" font-size="10" font-weight="600">b = -0.5*(zH + zF)</text>
        <circle cx="125" cy="15" r="4" fill="#10b981" />
        <text x="135" y="19" fill="#0f172a" font-size="10" font-weight="600">c = -zF</text>
      </g>
    `;

    svg += '</svg>';
    container.innerHTML = svg;
  },

  /**
   * Render Chart 3: ROC Space (H vs F)
   */
  renderROCChart: function (containerId, blocks) {
    const container = document.getElementById(containerId);
    if (!container || !blocks || blocks.length === 0) return;

    const width = container.clientWidth || 550;
    const height = Math.min(width, 420);
    const padLeft = 60;
    const padRight = 140; // extra space for legend
    const padTop = 30;
    const padBottom = 55;

    const scaleX = (f) => padLeft + f * (width - padLeft - padRight);
    const scaleY = (h) => height - padBottom - h * (height - padTop - padBottom);

    let svg = `<svg viewBox="0 0 ${width} ${height}" class="sdt-svg-chart">`;

    // Gridlines from 0.0 to 1.0 (steps of 0.2)
    for (let i = 0; i <= 5; i++) {
      const val = i / 5.0;
      const x = scaleX(val);
      const y = scaleY(val);

      // Vertical gridline
      svg += `
        <line x1="${x}" y1="${padTop}" x2="${x}" y2="${height - padBottom}" stroke="#e2e8f0" stroke-width="1" />
        <text x="${x}" y="${height - padBottom + 18}" fill="#64748b" font-size="11" text-anchor="middle">${val.toFixed(1)}</text>
      `;

      // Horizontal gridline
      svg += `
        <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="#e2e8f0" stroke-width="1" />
        <text x="${padLeft - 10}" y="${y + 4}" fill="#64748b" font-size="11" text-anchor="end">${val.toFixed(1)}</text>
      `;
    }

    // Diagonal Chance Line (H = F)
    svg += `
      <line x1="${scaleX(0)}" y1="${scaleY(0)}" x2="${scaleX(1)}" y2="${scaleY(1)}" stroke="#94a3b8" stroke-width="1.8" stroke-dasharray="5,5" />
      <text x="${scaleX(0.55)}" y="${scaleY(0.48)}" fill="#94a3b8" font-size="10" font-style="italic" transform="rotate(-32, ${scaleX(0.55)}, ${scaleY(0.48)})">Chance Line (d' = 0)</text>
    `;

    // Colors palette for different set sizes
    const colors = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899'];

    // Plot Theoretical ROC curves and Empirical Points for each set size block
    blocks.forEach((block, bIdx) => {
      const color = colors[bIdx % colors.length];

      // Theoretical curve
      if (block.theoretical_roc && block.theoretical_roc.length > 0) {
        let theoPath = '';
        block.theoretical_roc.forEach((pt, i) => {
          const px = scaleX(pt.f);
          const py = scaleY(pt.h);
          theoPath += (i === 0 ? `M ${px} ${py}` : ` L ${px} ${py}`);
        });
        svg += `<path d="${theoPath}" fill="none" stroke="${color}" stroke-width="2" stroke-opacity="0.8" />`;
      }

      // Empirical ROC points from confidence criteria
      if (block.roc && block.roc.empirical_points && block.roc.empirical_points.length > 0) {
        // Line connecting empirical points
        let empPath = '';
        block.roc.empirical_points.forEach((pt, i) => {
          const px = scaleX(pt.f);
          const py = scaleY(pt.h);
          empPath += (i === 0 ? `M ${px} ${py}` : ` L ${px} ${py}`);
        });
        svg += `<path d="${empPath}" fill="none" stroke="${color}" stroke-width="1.2" stroke-dasharray="3,3" opacity="0.6" />`;

        // Draw points
        block.roc.empirical_points.forEach(pt => {
          const px = scaleX(pt.f);
          const py = scaleY(pt.h);
          svg += `
            <circle cx="${px}" cy="${py}" r="4.5" fill="${color}" stroke="#ffffff" stroke-width="1.5">
              <title>${pt.label || 'Point'}: F=${pt.f}, H=${pt.h}</title>
            </circle>
          `;
        });
      }
    });

    // Axes
    svg += `
      <line x1="${padLeft}" y1="${height - padBottom}" x2="${width - padRight}" y2="${height - padBottom}" stroke="#475569" stroke-width="2" />
      <line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${height - padBottom}" stroke="#475569" stroke-width="2" />
      <text x="${(padLeft + width - padRight) / 2}" y="${height - 15}" fill="#1e293b" font-size="12" font-weight="700" text-anchor="middle">False Alarm Rate (F)</text>
      <text transform="rotate(-90)" x="${-(height / 2)}" y="20" fill="#1e293b" font-size="12" font-weight="700" text-anchor="middle">Hit Rate (H)</text>
    `;

    // Legend on right side
    let legendSvg = `<g transform="translate(${width - padRight + 15}, ${padTop + 10})">`;
    legendSvg += `<text x="0" y="0" font-size="11" font-weight="700" fill="#1e293b">Set Size (d'):</text>`;

    blocks.forEach((block, bIdx) => {
      const color = colors[bIdx % colors.length];
      const yOffset = 18 + bIdx * 24;
      legendSvg += `
        <line x1="0" y1="${yOffset}" x2="16" y2="${yOffset}" stroke="${color}" stroke-width="2.5" />
        <circle cx="8" cy="${yOffset}" r="4" fill="${color}" stroke="#fff" stroke-width="1" />
        <text x="22" y="${yOffset + 4}" fill="#334155" font-size="11" font-weight="600">Size ${block.set_size} (d'=${block.summary.d_prime})</text>
      `;
    });
    legendSvg += '</g>';
    svg += legendSvg;

    svg += '</svg>';
    container.innerHTML = svg;
  }
};

