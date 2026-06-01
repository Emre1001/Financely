/* ═══════════════════════════════════════
   CHARTS — dependency-free SVG builders.
   Each returns an SVG markup string (inject via innerHTML).
   Colors use CSS variables → react to theme automatically.
═══════════════════════════════════════ */
const Charts = {
  /* segments: [{value, color}] — donut ring with a background track */
  donut(segments, opts = {}) {
    const cx = 90, cy = 90, r = 70, sw = 24, circ = 2 * Math.PI * r;
    const total = opts.total || segments.reduce((s, x) => s + Math.max(0, x.value), 0) || 1;
    let rot = -90, segs = '';
    segments.forEach(s => {
      const frac = Math.max(0, s.value) / total;
      if (frac <= 0) return;
      const arc = Math.min(circ, frac * circ);
      segs += `<circle class="seg" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${sw}" stroke-linecap="butt" stroke-dasharray="${arc.toFixed(2)} ${(circ - arc).toFixed(2)}" transform="rotate(${rot.toFixed(2)} ${cx} ${cy})"/>`;
      rot += frac * 360;
    });
    return `<svg class="donut-svg" viewBox="0 0 180 180" role="img" aria-hidden="true">
      <circle class="donut-track" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke-width="${sw}"/>${segs}</svg>`;
  },

  /* data: [{label, value, color}] — simple vertical bars */
  bars(data, opts = {}) {
    const w = opts.width || 340, h = opts.height || 170;
    const pad = { l: 6, r: 6, t: 16, b: 24 };
    const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;
    const max = Math.max(...data.map(d => d.value), 1);
    const n = data.length || 1;
    const slot = plotW / n;
    const bw = Math.min(46, slot * 0.62);
    let out = '';
    data.forEach((d, i) => {
      const bh = max > 0 ? (d.value / max) * plotH : 0;
      const x = pad.l + slot * i + (slot - bw) / 2;
      const y = pad.t + (plotH - bh);
      out += `<rect class="bar-rect" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="4" fill="${d.color || '#7c7ef7'}"/>`;
      if (d.value > 0) out += `<text class="chart-val-label" x="${(x + bw / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle">${escapeHtml(opts.fmt ? opts.fmt(d.value) : Math.round(d.value))}</text>`;
      out += `<text class="chart-axis-label" x="${(x + bw / 2).toFixed(1)}" y="${h - 7}" text-anchor="middle">${escapeHtml(d.label)}</text>`;
    });
    return `<svg class="chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" role="img">${out}</svg>`;
  },

  /* labels: [..]; series: [{color, values:[..]}] — grouped bars */
  multiBars(labels, series, opts = {}) {
    const w = opts.width || 340, h = opts.height || 170;
    const pad = { l: 6, r: 6, t: 16, b: 24 };
    const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;
    const max = Math.max(...series.flatMap(s => s.values), 1);
    const n = labels.length || 1, k = series.length || 1;
    const slot = plotW / n;
    const bw = Math.min(16, (slot * 0.7) / k);
    let out = '';
    labels.forEach((lab, i) => {
      const groupW = bw * k + (k - 1) * 3;
      const gx = pad.l + slot * i + (slot - groupW) / 2;
      series.forEach((s, j) => {
        const v = s.values[i] || 0;
        const bh = (v / max) * plotH;
        const x = gx + j * (bw + 3);
        const y = pad.t + (plotH - bh);
        out += `<rect class="bar-rect" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="${s.color}"/>`;
      });
      out += `<text class="chart-axis-label" x="${(pad.l + slot * i + slot / 2).toFixed(1)}" y="${h - 7}" text-anchor="middle">${escapeHtml(lab)}</text>`;
    });
    return `<svg class="chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" role="img">${out}</svg>`;
  },

  /* points: [{label, value}] — line + area trend */
  line(points, opts = {}) {
    const w = opts.width || 340, h = opts.height || 160;
    const pad = { l: 6, r: 6, t: 16, b: 24 };
    const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;
    const max = Math.max(...points.map(p => p.value), 1);
    const n = points.length;
    const xAt = i => n <= 1 ? pad.l + plotW / 2 : pad.l + (plotW / (n - 1)) * i;
    const yAt = v => pad.t + plotH - (v / max) * plotH;
    let d = '', dots = '', labels = '';
    points.forEach((p, i) => {
      const x = xAt(i), y = yAt(p.value);
      d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
      dots += `<circle class="line-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3"/>`;
      labels += `<text class="chart-axis-label" x="${x.toFixed(1)}" y="${h - 7}" text-anchor="middle">${escapeHtml(p.label)}</text>`;
    });
    const gid = 'lg' + Math.random().toString(36).slice(2, 7);
    const area = d + `L ${xAt(n - 1).toFixed(1)} ${(pad.t + plotH).toFixed(1)} L ${xAt(0).toFixed(1)} ${(pad.t + plotH).toFixed(1)} Z`;
    return `<svg class="chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" role="img">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#7c7ef7" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#7c7ef7" stop-opacity="0"/>
      </linearGradient></defs>
      <path class="line-area" d="${area}" fill="url(#${gid})"/>
      <path class="line-path" d="${d.trim()}"/>${dots}${labels}</svg>`;
  },

  /* values: [..] — minimal inline trend line */
  sparkline(values, opts = {}) {
    const w = opts.width || 120, h = opts.height || 36, p = 3;
    const n = values.length;
    if (n < 2) return `<svg class="spark-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"></svg>`;
    const max = Math.max(...values), min = Math.min(...values, 0), range = (max - min) || 1;
    const xAt = i => p + ((w - 2 * p) / (n - 1)) * i;
    const yAt = v => p + (h - 2 * p) - ((v - min) / range) * (h - 2 * p);
    let d = '';
    values.forEach((v, i) => { d += (i === 0 ? 'M' : 'L') + xAt(i).toFixed(1) + ' ' + yAt(v).toFixed(1) + ' '; });
    return `<svg class="spark-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path d="${d.trim()}" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
};
