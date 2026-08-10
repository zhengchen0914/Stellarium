/* 星隅 实用小工具：计算器（其余占位） */
(function (global) {
  'use strict';
  const UI = global.Stellarium.UI;

  function render(container) {
    container.innerHTML = '';
    container.appendChild(UI.el('div', { class: 'page-head' }, [
      UI.el('h1', { class: 'page-title' }, '实用小工具'),
      UI.el('div', { class: 'page-sub' }, '常用小工具将陆续上线')
    ]));
    const grid = UI.el('div', { class: 'tool-grid' });
    (global.Stellarium.Seed.TOOLS).forEach(t => {
      grid.appendChild(UI.el('div', {
        class: 'card tool-card',
        dataset: { tool: t.id },
        onclick: () => openTool(container, t)
      }, [
        t.id === 'calc' ? null : UI.el('span', { class: 'soon' }, '即将上线'),
        UI.el('div', { class: 't-ico' }, t.icon),
        UI.el('div', { class: 't-name' }, t.name)
      ]));
    });
    container.appendChild(grid);
  }

  function openTool(container, tool) {
    if (tool.id === 'calc') { renderCalc(container); return; }
    UI.toast('该工具暂未开发，敬请期待', 'info');
  }

  /* ============ 计算器 ============ */
  function fmt(n) {
    if (!isFinite(n)) return '错误';
    const abs = Math.abs(n);
    if (abs >= 1e15 || (abs > 0 && abs < 1e-9)) return n.toExponential(8);
    const r = Math.round(n * 1e12) / 1e12;
    return String(r);
  }

  function compute(a, b, op) {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b === 0 ? '错误' : a / b;
      default: return b;
    }
  }

  function createCalc(displayEl) {
    let cur = '0';
    let acc = null;
    let op = null;
    let waiting = false;

    function update() { displayEl.textContent = cur; }

    function reset() { cur = '0'; acc = null; op = null; waiting = false; update(); }

    function digit(d) {
      if (cur === '错误') reset();
      if (waiting) { cur = d; waiting = false; }
      else if (cur === '0') cur = d;
      else if (cur.replace(/[-.]/g, '').length < 16) cur += d;
      update();
    }

    function dot() {
      if (cur === '错误') reset();
      if (waiting) { cur = '0.'; waiting = false; update(); return; }
      if (!cur.includes('.')) cur += '.';
      update();
    }

    function setOp(next) {
      if (cur === '错误') { reset(); return; }
      const val = parseFloat(cur);
      if (op != null && !waiting) {
        acc = compute(acc, val, op);
        if (acc === '错误') { cur = '错误'; op = null; acc = null; waiting = true; update(); return; }
      } else {
        acc = val;
      }
      op = next;
      waiting = true;
      cur = fmt(acc);
      update();
    }

    function equals() {
      if (cur === '错误' || op == null) return;
      const val = parseFloat(cur);
      const r = compute(acc, val, op);
      cur = r === '错误' ? '错误' : fmt(r);
      op = null; acc = null; waiting = true;
      update();
    }

    function back() {
      if (cur === '错误' || waiting) { reset(); return; }
      if (cur.length <= 1 || (cur.startsWith('-') && cur.length === 2)) cur = '0';
      else cur = cur.slice(0, -1);
      update();
    }

    function neg() {
      if (cur === '错误') return;
      if (waiting && acc != null) { acc = -acc; cur = fmt(acc); update(); return; }
      if (cur === '0') return;
      cur = cur.startsWith('-') ? cur.slice(1) : '-' + cur;
      update();
    }

    function percent() {
      if (cur === '错误') return;
      if (waiting && acc != null) { acc = acc / 100; cur = fmt(acc); update(); return; }
      cur = fmt(parseFloat(cur) / 100);
      update();
    }

    function press(key) {
      if (/^[0-9]$/.test(key)) return digit(key);
      if (key === '.') return dot();
      if (key === '+' || key === '-' || key === '*' || key === '/') return setOp(key);
      if (key === '=' || key === 'Enter') return equals();
      if (key === 'Backspace') return back();
      if (key === 'Delete' || key === 'Escape' || key === 'c' || key === 'C') return reset();
      if (key === '%') return percent();
      if (key === 'neg') return neg();
    }

    return { press, reset };
  }

  const BTNS = [
    { label: 'C', key: 'C', cls: 'danger' },
    { label: '⌫', key: 'Backspace', cls: '' },
    { label: '%', key: '%', cls: '' },
    { label: '÷', key: '/', cls: 'op' },
    { label: '7', key: '7', cls: '' }, { label: '8', key: '8', cls: '' }, { label: '9', key: '9', cls: '' }, { label: '×', key: '*', cls: 'op' },
    { label: '4', key: '4', cls: '' }, { label: '5', key: '5', cls: '' }, { label: '6', key: '6', cls: '' }, { label: '−', key: '-', cls: 'op' },
    { label: '1', key: '1', cls: '' }, { label: '2', key: '2', cls: '' }, { label: '3', key: '3', cls: '' }, { label: '+', key: '+', cls: 'op' },
    { label: '±', key: 'neg', cls: '' }, { label: '0', key: '0', cls: '' }, { label: '.', key: '.', cls: '' }, { label: '=', key: '=', cls: 'equals' }
  ];

  function renderCalc(container) {
    container.innerHTML = '';
    container.appendChild(UI.el('div', { class: 'page-head' }, [
      UI.el('h1', { class: 'page-title' }, '计算器'),
      UI.el('button', { class: 'btn sm ghost', onclick: () => render(container) }, '← 返回工具列表')
    ]));
    const card = UI.el('div', { class: 'card calc', tabindex: '-1' });
    const display = UI.el('div', { class: 'calc-display', id: 'calc-display' }, '0');
    const grid = UI.el('div', { class: 'calc-grid' });
    const calc = createCalc(display);
    BTNS.forEach(b => {
      grid.appendChild(UI.el('button', {
        class: 'calc-btn' + (b.cls ? ' ' + b.cls : ''),
        dataset: { key: b.key },
        onclick: () => { calc.press(b.key); card.focus(); }
      }, b.label));
    });
    card.appendChild(display);
    card.appendChild(grid);
    container.appendChild(card);
    card.addEventListener('keydown', e => {
      const k = e.key;
      const handled = /^[0-9]$/.test(k) || ['+', '-', '*', '/', '.', '%', '=', 'Enter', 'Backspace', 'Delete', 'Escape', 'c', 'C'].includes(k);
      if (!handled) return;
      e.preventDefault();
      calc.press(k);
    });
    card.focus();
  }

  global.Stellarium.Router.register('tools', render, '实用小工具');
})(typeof window !== 'undefined' ? window : globalThis);