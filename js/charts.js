/* 星隅 轻量 SVG 图表（浏览器端） */
(function (global) {
  'use strict';
  const U = global.Stellarium.Utils;
  const NS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs) {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, v);
    return node;
  }

  function colors(n, offset) {
    const palette = ['#60a5fa', '#b18cff', '#4ade80', '#fbbf24', '#f87171', '#22d3ee', '#f472b6', '#94a3b8'];
    const out = [];
    for (let i = 0; i < n; i++) out.push(palette[(i + (offset || 0)) % palette.length]);
    return out;
  }

  /* 环形图 items: [{name, value}] */
  function donut(container, items) {
    container.innerHTML = '';
    const total = items.reduce((s, it) => s + (Number(it.value) || 0), 0);
    if (total <= 0) {
      const d = document.createElement('div');
      d.className = 'muted';
      d.textContent = '本月暂无支出';
      container.appendChild(d);
      return;
    }
    const size = 150, r = 56, cx = size / 2, cy = size / 2;
    const svg = svgEl('svg', { width: size, height: size, viewBox: '0 0 ' + size + ' ' + size });
    svg.appendChild(svgEl('circle', { cx, cy, r, fill: 'none', stroke: 'var(--bg-2)', 'stroke-width': 20 }));
    let angle = -90;
    const cols = colors(items.length);
    items.forEach((it, i) => {
      const frac = (Number(it.value) || 0) / total;
      const a1 = angle, a2 = angle + frac * 360;
      const large = (a2 - a1) > 180 ? 1 : 0;
      const p1 = polar(cx, cy, r, a1), p2 = polar(cx, cy, r, a2);
      const d = 'M ' + p1 + ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + p2;
      svg.appendChild(svgEl('path', { d, fill: 'none', stroke: cols[i], 'stroke-width': 20 }));
      angle = a2;
    });
    svg.appendChild(svgEl('text', { x: cx, y: cy + 5, 'text-anchor': 'middle', fill: 'var(--text)', 'font-size': 15, 'font-weight': 700 }), '¥' + U.money(total));
    container.appendChild(svg);
    const legend = svgEl('div', null);
    legend.setAttribute('class', 'chart-legend');
    items.forEach((it, i) => {
      const span = document.createElement('span');
      span.innerHTML = '<i style="background:' + cols[i] + '"></i>' + U.escapeHtml(it.name) + ' ¥' + U.money(it.value);
      legend.appendChild(span);
    });
    container.appendChild(legend);
  }

  function polar(cx, cy, r, deg) {
    const rad = (deg - 90) * Math.PI / 180;
    return (cx + r * Math.cos(rad)).toFixed(2) + ' ' + (cy + r * Math.sin(rad)).toFixed(2);
  }

  /* 柱状图 items: [{label, value}] */
  function bars(container, items) {
    container.innerHTML = '';
    if (!items.length) { container.appendChild(document.createTextNode('暂无数据')); return; }
    const max = Math.max.apply(null, items.map(it => Number(it.value) || 0));
    const chart = document.createElement('div');
    chart.setAttribute('class', 'bar-chart');
    items.slice(-14).forEach(it => {
      const col = document.createElement('div');
      col.setAttribute('class', 'bar-col');
      const h = max > 0 ? Math.round(((Number(it.value) || 0) / max) * 100) : 0;
      const bar = document.createElement('div');
      bar.setAttribute('class', 'bar');
      bar.style.height = Math.max(2, h) + '%';
      bar.title = it.label + ' ¥' + U.money(it.value);
      const label = document.createElement('div');
      label.setAttribute('class', 'bar-label');
      label.textContent = it.label.slice(5);
      col.appendChild(bar); col.appendChild(label);
      chart.appendChild(col);
    });
    container.appendChild(chart);
  }

  /* 折线图 series: [{label, value, value2?}] */
  function line(container, points, keys) {
    container.innerHTML = '';
    if (!points.length) { container.appendChild(document.createTextNode('暂无数据')); return; }
    keys = keys || ['value'];
    const W = 560, H = 180, pad = 28;
    const allVals = [];
    points.forEach(p => keys.forEach(k => { if (p[k] != null) allVals.push(Number(p[k])); }));
    const maxV = Math.max.apply(null, allVals) * 1.1 || 1;
    const minV = 0;
    const n = points.length;
    const x = i => n > 1 ? pad + (i / (n - 1)) * (W - pad * 2) : W / 2;
    const y = v => H - pad - ((Number(v) - minV) / (maxV - minV)) * (H - pad * 2);
    const svg = svgEl('svg', { width: '100%', height: H, viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none' });
    const cols = ['var(--accent)', 'var(--warn)'];
    keys.forEach((k, ki) => {
      const pts = points.map((p, i) => (p[k] == null ? null : x(i) + ',' + y(p[k]))).filter(Boolean);
      if (pts.length < 2) return;
      const poly = svgEl('polyline', { points: pts.join(' '), fill: 'none', stroke: cols[ki], 'stroke-width': 2 });
      svg.appendChild(poly);
      points.forEach((p, i) => {
        if (p[k] == null) return;
        const c = svgEl('circle', { cx: x(i), cy: y(p[k]), r: 3, fill: cols[ki] });
        svg.appendChild(c);
      });
    });
    container.appendChild(svg);
    const legend = document.createElement('div');
    legend.setAttribute('class', 'chart-legend');
    keys.forEach((k, ki) => {
      const span = document.createElement('span');
      span.innerHTML = '<i style="background:' + cols[ki] + '"></i>' + (k === 'value' ? points[points.length - 1].label + ' 最新: ' + (points[points.length - 1][k] ?? '—') : (k === 'value2' ? '体脂率' : k));
      legend.appendChild(span);
    });
    container.appendChild(legend);
  }

  const Charts = { donut, bars, line };

  global.Stellarium = global.Stellarium || {};
  global.Stellarium.Charts = Charts;
})(typeof window !== 'undefined' ? window : globalThis);