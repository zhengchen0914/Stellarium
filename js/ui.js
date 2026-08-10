/* 星隅 通用 UI 组件（浏览器端） */
(function (global) {
  'use strict';
  const U = global.Stellarium.Utils;

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null) continue;
        if (k === 'class') node.className = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'dataset') Object.assign(node.dataset, v);
        else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
        else node.setAttribute(k, v);
      }
    }
    appendChildren(node, children);
    return node;
  }

  function appendChildren(node, children) {
    for (const c of children.flat(Infinity)) {
      if (c == null || c === false) continue;
      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    }
  }

  function toast(msg, type) {
    const box = document.getElementById('toast-container');
    if (!box) return;
    const t = el('div', { class: 'toast ' + (type || 'info') }, msg);
    box.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  function openOverlay(contentNode) {
    const overlay = el('div', { class: 'overlay' });
    overlay.addEventListener('mousedown', e => { if (e.target === overlay) overlay.remove(); });
    overlay.appendChild(contentNode);
    document.getElementById('modal-root').appendChild(overlay);
    return overlay;
  }

  function confirmDialog(opts) {
    opts = opts || {};
    return new Promise(resolve => {
      const modal = el('div', { class: 'modal' });
      modal.appendChild(el('h3', {}, opts.title || '确认操作'));
      if (opts.message) modal.appendChild(el('p', { class: 'muted', style: 'margin-bottom:14px' }, opts.message));
      const actions = el('div', { class: 'actions' });
      const cancelBtn = el('button', { class: 'btn ghost' }, opts.cancelText || '取消');
      const okBtn = el('button', { class: 'btn ' + (opts.danger === false ? 'primary' : 'danger') }, opts.confirmText || '删除');
      actions.appendChild(cancelBtn); actions.appendChild(okBtn);
      modal.appendChild(actions);
      const overlay = openOverlay(modal);
      function done(v) { overlay.remove(); resolve(v); }
      overlay.addEventListener('mousedown', e => { if (e.target === overlay) done(false); });
      cancelBtn.addEventListener('click', () => done(false));
      okBtn.addEventListener('click', () => done(true));
    });
  }

  function modal(title, bodyNode, opts) {
    const modalEl = el('div', { class: 'modal' });
    modalEl.appendChild(el('h3', {}, title));
    modalEl.appendChild(bodyNode);
    const overlay = openOverlay(modalEl);
    const firstInput = modalEl.querySelector('input, select, textarea');
    if (firstInput) setTimeout(() => firstInput.focus(), 30);
    return {
      close() { overlay.remove(); },
      node: modalEl,
      esc() { overlay.remove(); }
    };
  }

  function field(labelText, inputEl, extra) {
    const wrap = el('div', { class: 'field' + (extra && extra.class ? ' ' + extra.class : '') });
    wrap.appendChild(el('label', {}, labelText));
    wrap.appendChild(inputEl);
    wrap.appendChild(el('div', { class: 'err' }, (extra && extra.errText) || ''));
    return wrap;
  }

  function textInput(value, attrs) {
    const input = el('input', Object.assign({ type: 'text', value: value || '' }, attrs || {}));
    return input;
  }

  function numInput(value, attrs) {
    const input = el('input', Object.assign({ type: 'number', step: '0.01', value: value == null ? '' : value }, attrs || {}));
    return input;
  }

  function dateInput(value) {
    return el('input', { type: 'date', value: value || U.todayStr() });
  }

  function selectInput(options, value, attrs) {
    const sel = el('select', attrs || {});
    for (const [val, label] of options) {
      sel.appendChild(el('option', { value: val }, label));
    }
    sel.value = value == null ? '' : String(value);
    return sel;
  }

  function validateField(inputEl, valid) {
    const wrap = inputEl.closest('.field');
    if (!valid) { if (wrap) wrap.classList.add('invalid'); return false; }
    if (wrap) wrap.classList.remove('invalid');
    return true;
  }

  function clearErrors(formEl) {
    formEl.querySelectorAll('.field.invalid').forEach(f => f.classList.remove('invalid'));
  }

  function emptyState(icon, text, actionLabel, onAction) {
    const node = el('div', { class: 'empty' });
    node.appendChild(el('div', { class: 'ico' }, icon));
    node.appendChild(el('div', {}, text));
    if (actionLabel && onAction) node.appendChild(el('button', { class: 'btn primary', onclick: onAction }, actionLabel));
    return node;
  }

  function tabs(container, items, active, onSwitch) {
    const bar = el('div', { class: 'tabs' });
    const buttons = [];
    for (const it of items) {
      const b = el('button', { class: 'tab' + (it.id === active ? ' active' : ''), dataset: { tab: it.id }, onclick: () => onSwitch(it.id) }, it.label);
      buttons.push(b);
      bar.appendChild(b);
    }
    container.appendChild(bar);
    return { buttons, setActive(id) { buttons.forEach(b => b.classList.toggle('active', b.dataset.tab === id)); } };
  }

  function badge(text, color) {
    return el('span', { class: 'badge ' + (color || 'gray') }, text);
  }

  function statusColor(status) {
    const map = {
      已完成: 'green', 已发布: 'green', 已采用: 'green', 已记录: 'green',
      进行中: 'blue', 写作中: 'blue', 待发布: 'yellow', 紧张: 'yellow', 未开始: 'gray',
      搁置: 'gray', 构思: 'gray', 待用: 'gray', 放弃: 'red', 超支: 'red', 未完成: 'red', 已顺延: 'gray'
    };
    return map[status] || 'gray';
  }

  const UI = { el, toast, confirmDialog, modal, field, textInput, numInput, dateInput, selectInput, validateField, clearErrors, emptyState, tabs, badge, statusColor };

  global.Stellarium = global.Stellarium || {};
  global.Stellarium.UI = UI;
})(typeof window !== 'undefined' ? window : globalThis);