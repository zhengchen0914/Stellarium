/* 星隅 自定义壁纸：选择图片 + 可读性蒙版 */
(function (global) {
  'use strict';
  const UI = global.Stellarium.UI;
  const store = () => global.Stellarium.store;

  const MAX_EDGE = 1920;        // 压缩后最长边上限
  const JPEG_QUALITY = 0.85;
  const MASK_MIN = 30;
  const MASK_MAX = 85;
  const MASK_DEFAULT = 62;

  function layer() {
    let el = document.getElementById('wallpaper-layer');
    if (!el) {
      el = document.createElement('div');
      el.id = 'wallpaper-layer';
      document.body.appendChild(el);
      const mask = document.createElement('div');
      mask.id = 'wallpaper-mask';
      document.body.appendChild(mask);
    }
    return el;
  }

  function maskEl() { return document.getElementById('wallpaper-mask'); }

  function maskColor(alpha) {
    const a = Math.min(MASK_MAX / 100, Math.max(MASK_MIN / 100, alpha));
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    return theme === 'light'
      ? 'rgba(244, 246, 252, ' + a.toFixed(2) + ')'
      : 'rgba(5, 8, 20, ' + a.toFixed(2) + ')';
  }

  function apply() {
    if (!store()) return;
    const s = store().snapshot().settings;
    const wp = s.wallpaper || null;
    const alpha = s.wallpaperMask != null ? Number(s.wallpaperMask) / 100 : MASK_DEFAULT / 100;
    const el = layer();
    const mask = maskEl();
    if (wp && wp.dataUrl) {
      el.style.backgroundImage = 'url("' + wp.dataUrl + '")';
      el.style.display = 'block';
      mask.style.background = maskColor(alpha);
      mask.style.display = 'block';
      document.body.classList.add('has-wallpaper');
    } else {
      el.style.display = 'none';
      mask.style.display = 'none';
      document.body.classList.remove('has-wallpaper');
    }
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('图片解析失败，请换一张试试'));
      img.src = src;
    });
  }

  async function compress(file) {
    if (file.type && !/^image\//.test(file.type)) throw new Error('请选择图片文件');
    const url = URL.createObjectURL(file);
    let img;
    try {
      img = await loadImage(url);
    } finally {
      URL.revokeObjectURL(url);
    }
    const longEdge = Math.max(img.naturalWidth, img.naturalHeight);
    const scale = longEdge > 0 ? Math.min(1, MAX_EDGE / longEdge) : 1;
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  }

  function refreshPreview(box, dataUrl) {
    box.innerHTML = '';
    if (dataUrl) {
      box.appendChild(UI.el('img', { src: dataUrl, alt: '壁纸预览' }));
    } else {
      box.appendChild(UI.el('div', { class: 'wallpaper-preview-empty' }, '✦ 当前使用默认星空背景'));
    }
  }

  function openModal() {
    const s = store().snapshot().settings;
    const wp = s.wallpaper || null;
    const alpha = s.wallpaperMask != null ? Number(s.wallpaperMask) : MASK_DEFAULT;

    const body = UI.el('div', {});
    const previewBox = UI.el('div', { class: 'wallpaper-preview' });
    body.appendChild(UI.el('div', { class: 'muted', style: 'margin-bottom:6px' }, '当前背景'));
    body.appendChild(previewBox);

    const fileInput = UI.el('input', { type: 'file', accept: 'image/*', id: 'wallpaper-file-input', style: 'display:none' });
    body.appendChild(fileInput);
    body.appendChild(UI.el('div', { class: 'row', style: 'margin:12px 0 4px' }, [
      UI.el('button', { class: 'btn primary', onclick: () => fileInput.click() }, '🖼 选择图片'),
      UI.el('button', { class: 'btn ghost', id: 'wallpaper-reset-btn', disabled: wp ? null : 'disabled', onclick: async () => { await reset(); m.close(); } }, '恢复默认背景')
    ]));

    const rangeRow = UI.el('div', { style: 'margin-top:14px' });
    const range = UI.el('input', { type: 'range', min: String(MASK_MIN), max: String(MASK_MAX), step: '5', value: String(alpha), id: 'wallpaper-mask-range', style: 'width:100%' });
    const tip = UI.el('div', { class: 'muted', style: 'margin-top:4px' }, '蒙版深度 ' + alpha + '%（越深越易读，壁纸越暗）');
    range.addEventListener('input', () => {
      tip.textContent = '蒙版深度 ' + range.value + '%（越深越易读，壁纸越暗）';
      const m = maskEl();
      if (m) m.style.background = maskColor(Number(range.value) / 100);
    });
    range.addEventListener('change', async () => {
      await store().setSettings({ wallpaperMask: Number(range.value) });
    });
    rangeRow.appendChild(UI.el('label', { class: 'muted', style: 'display:block;margin-bottom:4px' }, '可读性蒙版'));
    rangeRow.appendChild(range);
    rangeRow.appendChild(tip);
    body.appendChild(rangeRow);

    const m = UI.modal('更换壁纸', body);
    m.node.appendChild(UI.el('button', { class: 'btn sm ghost modal-close', title: '关闭', onclick: () => m.close() }, '✕'));
    refreshPreview(previewBox, wp ? wp.dataUrl : null);

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      try {
        const dataUrl = await compress(file);
        await store().setSettings({ wallpaper: { dataUrl, name: file.name, updatedAt: new Date().toISOString() } });
        apply();
        refreshPreview(previewBox, dataUrl);
        const resetBtn = m.node.querySelector('#wallpaper-reset-btn');
        if (resetBtn) resetBtn.disabled = false;
        UI.toast('壁纸已更换', 'success');
      } catch (e) {
        UI.toast(e.message || '壁纸设置失败', 'error');
      }
      fileInput.value = '';
    });
    return m;
  }

  async function reset() {
    await store().setSettings({ wallpaper: null });
    apply();
    UI.toast('已恢复默认背景', 'success');
  }

  const Wallpaper = { apply, openModal, reset, compress };
  global.Stellarium = global.Stellarium || {};
  global.Stellarium.Wallpaper = Wallpaper;
})(typeof window !== 'undefined' ? window : globalThis);