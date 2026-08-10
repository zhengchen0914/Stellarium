/* 星隅 实用小工具：计算器（其余占位） */
(function (global) {
  'use strict';
  const UI = global.Stellarium.UI;
  const U = global.Stellarium.Utils;
  const store = () => global.Stellarium.store;

  function render(container) { pomo.ui = null;
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
        (t.id === 'calc' || t.id === 'rand' || t.id === 'convert' || t.id === 'pomodoro') ? null : UI.el('span', { class: 'soon' }, '即将上线'),
        UI.el('div', { class: 't-ico' }, t.icon),
        UI.el('div', { class: 't-name' }, t.name)
      ]));
    });
    container.appendChild(grid);
  }

  function openTool(container, tool) {
    if (tool.id === 'calc') { renderCalc(container); return; }
    if (tool.id === 'rand') { renderRand(container); return; }
    if (tool.id === 'convert') { renderConvert(container); return; }
    if (tool.id === 'pomodoro') { renderPomodoro(container); return; }
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

  /* ============ 随机数生成器 ============ */
  function renderRand(container) {
    container.innerHTML = '';
    container.appendChild(UI.el('div', { class: 'page-head' }, [
      UI.el('h1', { class: 'page-title' }, '随机数生成器'),
      UI.el('button', { class: 'btn sm ghost', onclick: () => render(container) }, '← 返回工具列表')
    ]));
    const card = UI.el('div', { class: 'card rand' });
    const minInput = UI.numInput(0, { id: 'rand-min' });
    const maxInput = UI.numInput(10, { id: 'rand-max' });
    const countInput = UI.numInput(1, { id: 'rand-count', min: '1', max: '100', step: '1' });
    const decInput = UI.numInput(0, { id: 'rand-decimals', min: '0', max: '10', step: '1' });

    const modeTip = UI.el('div', { class: 'muted', style: 'margin-top:10px', id: 'rand-mode-tip' });
    function updateModeTip() {
      const min = parseFloat(minInput.value);
      const max = parseFloat(maxInput.value);
      const decimal = Number(decInput.value) > 0;
      modeTip.textContent = decimal
        ? '小数位数 > 0：将生成小数，保留指定小数位数'
        : '小数位数 = 0：将生成整数（含边界）';
    }
    [minInput, maxInput, decInput].forEach(x => x.addEventListener('input', updateModeTip));
    updateModeTip();

    const row1 = UI.el('div', { class: 'row' }, [
      UI.field('最小值', minInput),
      UI.field('最大值', maxInput)
    ]);
    const row2 = UI.el('div', { class: 'row' }, [
      UI.field('生成数量', countInput),
      UI.field('小数位数（>0 时生成小数）', decInput)
    ]);
    const results = UI.el('div', { class: 'rand-results', id: 'rand-results' });
    const genBtn = UI.el('button', { class: 'btn primary', id: 'rand-generate', onclick: () => generate() }, '🎲 生成');

    function generate() {
      const min = parseFloat(minInput.value);
      const max = parseFloat(maxInput.value);
      const count = Number(countInput.value);
      if (!isFinite(min) || !isFinite(max)) { UI.toast('请填写有效的最小值和最大值', 'error'); return; }
      if (max < min) { UI.toast('最大值不能小于最小值', 'error'); return; }
      if (!Number.isInteger(count) || count < 1 || count > 100) { UI.toast('数量需为 1–100 的整数', 'error'); return; }
      const rawDec = Number(decInput.value);
      const n = Number.isInteger(rawDec) ? Math.min(Math.max(rawDec, 0), 10) : 0;
      const decimal = n > 0;
      const out = [];
      for (let i = 0; i < count; i++) {
        if (min === max) { out.push(String(min)); continue; }
        if (decimal) {
          const v = min + Math.random() * (max - min);
          out.push((Math.round(v * Math.pow(10, n)) / Math.pow(10, n)).toFixed(n));
        } else {
          out.push(String(Math.floor(Math.random() * (max - min + 1)) + min));
        }
      }
      results.innerHTML = '';
      out.forEach(v => results.appendChild(UI.el('span', { class: 'rand-result' }, v)));
    }

    card.appendChild(row1);
    card.appendChild(row2);
    card.appendChild(UI.el('div', {}, [genBtn, UI.el('span', { class: 'muted', style: 'margin-left:10px' }, '每次生成一组新的随机数')]));
    card.appendChild(modeTip);
    card.appendChild(results);
    container.appendChild(card);
  }
  /* ============ 单位换算 ============ */
  function renderConvert(container) {
    const U = global.Stellarium.Units;
    container.innerHTML = '';
    container.appendChild(UI.el('div', { class: 'page-head' }, [
      UI.el('h1', { class: 'page-title' }, '单位换算'),
      UI.el('button', { class: 'btn sm ghost', onclick: () => render(container) }, '← 返回工具列表')
    ]));
    const card = UI.el('div', { class: 'card convert' });

    const catSel = UI.selectInput(U.CATEGORIES.map(c => [c.id, c.name]), 'length', { id: 'convert-cat' });
    const fromSel = UI.el('select', { id: 'convert-from' });
    const toSel = UI.el('select', { id: 'convert-to' });
    const valInput = UI.numInput(1, { id: 'convert-value', step: 'any' });
    const result = UI.el('div', { class: 'convert-result', id: 'convert-result' }, '—');
    const refBox = UI.el('div', { id: 'convert-ref' });
    const swapBtn = UI.el('button', { class: 'btn', id: 'convert-swap', onclick: () => {
      const t = fromSel.value; fromSel.value = toSel.value; toSel.value = t; update();
    } }, '⇄ 交换单位');

    function fillUnitSelects() {
      const cat = U.getCategory(catSel.value);
      fromSel.innerHTML = '';
      toSel.innerHTML = '';
      cat.units.forEach(u => {
        fromSel.appendChild(UI.el('option', { value: u.id }, u.name));
        toSel.appendChild(UI.el('option', { value: u.id }, u.name));
      });
      const fromId = cat.temp ? 'c' : ((cat.units.find(u => u.factor === 1) || cat.units[0]).id);
      const toIdx = cat.units.findIndex(u => u.id !== fromId);
      fromSel.value = fromId;
      toSel.value = toIdx >= 0 ? cat.units[toIdx].id : fromId;
      update();
    }

    function update() {
      const cat = U.getCategory(catSel.value);
      const v = parseFloat(valInput.value);
      const r = U.convert(catSel.value, v, fromSel.value, toSel.value);
      if (r == null || !isFinite(r)) {
        result.textContent = '—';
      } else {
        const toUnit = cat.units.find(u => u.id === toSel.value);
        result.textContent = U.format(r) + ' ' + (toUnit ? toUnit.name : '');
      }
      renderRef();
    }

    function renderRef() {
      refBox.innerHTML = '';
      const cat = U.getCategory(catSel.value);
      refBox.appendChild(UI.el('div', { class: 'group-label' }, cat.temp ? '温度换算参考' : '单位参考（1 单位 = 基准值）'));
      const list = UI.el('div', { class: 'convert-ref-list' });
      if (cat.temp) {
        const rows = [
          ['0°C', '32°F = 273.15K'],
          ['100°C', '212°F = 373.15K'],
          ['-40°C', '-40°F = 233.15K']
        ];
        rows.forEach(([a, b]) => list.appendChild(UI.el('div', { class: 'convert-ref-row' }, [UI.el('span', {}, a), UI.el('span', {}, b)])));
      } else {
        cat.units.forEach(u => {
          list.appendChild(UI.el('div', { class: 'convert-ref-row' }, [UI.el('span', {}, '1 ' + u.name), UI.el('span', {}, U.format(u.factor) + ' ' + cat.base)]));
        });
      }
      refBox.appendChild(list);
    }

    catSel.addEventListener('change', fillUnitSelects);
    fromSel.addEventListener('change', update);
    toSel.addEventListener('change', update);
    valInput.addEventListener('input', update);

    const row1 = UI.el('div', { class: 'row' }, [
      UI.field('类别', catSel)
    ]);
    const row2 = UI.el('div', { class: 'row' }, [
      UI.field('从', fromSel),
      UI.field('到', toSel)
    ]);
    const row3 = UI.el('div', { class: 'row' }, [
      UI.field('数值', valInput),
      UI.field('结果', result)
    ]);
    card.appendChild(row1);
    card.appendChild(row2);
    card.appendChild(UI.el('div', { style: 'margin:4px 0 8px' }, swapBtn));
    card.appendChild(row3);
    card.appendChild(UI.el('div', { class: 'muted', style: 'margin-top:10px' }, '说明：月按 30 天、年按 365 天计；数据存储按 1024 进制。'));
    card.appendChild(refBox);
    container.appendChild(card);
    fillUnitSelects();
  }
  /* ============ 番茄钟 ============ */
  const pomo = {
    mode: 'focus',
    running: false,
    remaining: 0,
    total: 0,
    started: false,
    timerId: null,
    settings: null,
    ui: null
  };

  function pomoMin(mode, settings) {
    if (mode === 'short') return settings.shortMin;
    if (mode === 'long') return settings.longMin;
    return settings.focusMin;
  }

  function pomoFmt(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function pomoBeep() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      if (ctx.state === 'suspended') ctx.resume();
      [0, 0.25, 0.5].forEach(t => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = 880;
        g.gain.value = 0.12;
        o.connect(g); g.connect(ctx.destination);
        o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.15);
      });
    } catch (e) { /* 音频不可用则忽略 */ }
  }

  function pomoNotify(title) {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title);
      }
    } catch (e) { /* 忽略 */ }
  }

  function pomoFocusCountToday() {
    const today = U.todayStr();
    return store().all('pomodoros').filter(p => p.date === today && p.type === 'focus').length;
  }

  async function pomoAddSession(type) {
    await store().add('pomodoros', { date: U.todayStr(), type, minutes: pomoMin(pomo.mode, pomo.settings) });
  }

  async function pomoComplete() {
    const s = pomo.settings || {};
    pomo.started = false;
    if (s.sound !== false) pomoBeep();
    pomoNotify(pomo.mode === 'focus' ? '专注完成！' : '休息结束，开始新的专注吧');
    await pomoAddSession(pomo.mode);
    if (pomo.mode === 'focus') {
      const n = pomoFocusCountToday();
      if (s.longEvery && n % s.longEvery === 0) {
        UI.toast('已完成 ' + n + ' 个番茄，该长休息啦', 'info');
      } else {
        UI.toast('专注完成！休息一下吧', 'success');
      }
    } else {
      UI.toast((pomo.mode === 'short' ? '短休息' : '长休息') + '结束，开始新的专注吧', 'info');
    }
    pomoRenderUI();
  }

  function pomoStop() {
    pomo.running = false;
    if (pomo.timerId) { clearInterval(pomo.timerId); pomo.timerId = null; }
    pomoRenderUI();
  }

  function pomoStart() {
    if (pomo.remaining <= 0) pomo.total = pomo.remaining = Math.round(pomoMin(pomo.mode, pomo.settings) * 60);
    pomo.started = true;
    pomo.running = true;
    if (pomo.timerId) clearInterval(pomo.timerId);
    pomo.timerId = setInterval(pomoTick, 1000);
    pomoRenderUI();
  }

  function pomoTick() {
    if (pomo.remaining > 0) pomo.remaining -= 1;
    if (pomo.remaining <= 0) {
      pomo.remaining = 0;
      pomoStop();
      pomoComplete();
    }
    pomoRenderUI();
  }

  function pomoReset() {
    pomo.started = false;
    pomoStop();
    pomo.total = pomo.remaining = Math.round(pomoMin(pomo.mode, pomo.settings) * 60);
    pomoRenderUI();
  }

  function pomoSetMode(m) {
    pomo.started = false;
    pomoStop();
    pomo.mode = m;
    pomo.total = pomo.remaining = Math.round(pomoMin(m, pomo.settings) * 60);
    pomoRenderUI();
  }

  function pomoRenderUI() {
    const ui = pomo.ui;
    if (!ui || !ui.root || !ui.root.isConnected) return;
    ui.timeEl.textContent = pomoFmt(Math.max(0, pomo.remaining));
    const frac = pomo.total > 0 ? (pomo.total - pomo.remaining) / pomo.total : 0;
    ui.ringEl.style.strokeDashoffset = String(ui.circ * (1 - frac));
    ui.runBtn.textContent = pomo.running ? '暂停' : (pomo.started ? '继续' : '开始');
    ui.runBtn.className = 'btn ' + (pomo.running ? 'danger' : 'primary');
    ui.modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === pomo.mode));
    ui.countEl.textContent = '今日已完成 ' + pomoFocusCountToday() + ' 个番茄';
  }

  function svgEl(tag, attrs) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, v);
    return node;
  }

  function renderPomodoro(container) {
    const saved = store().snapshot().settings.pomodoro || {};
    pomo.settings = Object.assign({ focusMin: 25, shortMin: 5, longMin: 15, longEvery: 4, sound: true }, saved);
    if (pomo.total === 0) {
      pomo.total = pomo.remaining = Math.round(pomoMin(pomo.mode, pomo.settings) * 60);
    }
    container.innerHTML = '';
    container.appendChild(UI.el('div', { class: 'page-head' }, [
      UI.el('h1', { class: 'page-title' }, '番茄钟'),
      UI.el('button', { class: 'btn sm ghost', onclick: () => render(container) }, '← 返回工具列表')
    ]));
    const card = UI.el('div', { class: 'card pomo' });

    const modeBtns = ['focus', 'short', 'long'].map(m => UI.el('button', {
      class: 'pomo-mode-btn', dataset: { mode: m }, onclick: () => pomoSetMode(m)
    }, m === 'focus' ? '🍅 专注' : (m === 'short' ? '☕ 短休息' : '🌙 长休息')));
    const modes = UI.el('div', { class: 'pomo-modes' });
    modeBtns.forEach(b => modes.appendChild(b));

    const circ = 2 * Math.PI * 88;
    const ring = svgEl('svg', { class: 'pomo-ring', viewBox: '0 0 200 200' });
    ring.appendChild(svgEl('circle', { class: 'track', cx: '100', cy: '100', r: '88' }));
    const ringEl = svgEl('circle', { class: 'progress', cx: '100', cy: '100', r: '88' });
    ringEl.style.strokeDasharray = String(circ);
    ring.appendChild(ringEl);
    const timeEl = UI.el('div', { class: 'pomo-time', id: 'pomo-time' });
    const ringWrap = UI.el('div', { class: 'pomo-ring-wrap' });
    ringWrap.appendChild(ring);
    ringWrap.appendChild(timeEl);

    const runBtn = UI.el('button', { class: 'btn primary', id: 'pomo-run', onclick: () => (pomo.running ? pomoStop() : pomoStart()) }, '开始');
    const resetBtn = UI.el('button', { class: 'btn', id: 'pomo-reset', onclick: pomoReset }, '重置');
    const controls = UI.el('div', { class: 'pomo-controls' });
    controls.appendChild(runBtn);
    controls.appendChild(resetBtn);

    const countEl = UI.el('div', { class: 'pomo-count', id: 'pomo-count' });

    /* 设置区 */
    const focusInput = UI.numInput(pomo.settings.focusMin, { id: 'pomo-focus', min: '0.1', max: '180', step: '0.1' });
    const shortInput = UI.numInput(pomo.settings.shortMin, { id: 'pomo-short', min: '0.1', max: '60', step: '0.1' });
    const longInput = UI.numInput(pomo.settings.longMin, { id: 'pomo-long', min: '0.1', max: '120', step: '0.1' });
    const everyInput = UI.numInput(pomo.settings.longEvery, { id: 'pomo-every', min: '1', max: '12', step: '1' });
    const soundInput = UI.el('input', { type: 'checkbox', id: 'pomo-sound', checked: pomo.settings.sound ? 'checked' : null });
    const soundWrap = UI.el('div', { class: 'field' });
    soundWrap.appendChild(UI.el('label', {}, '完成提示音'));
    soundWrap.appendChild(soundInput);
    const saveBtn = UI.el('button', { class: 'btn primary sm', id: 'pomo-save', onclick: savePomoSettings }, '保存设置');

    function savePomoSettings() {
      const focusMin = U.clamp(parseFloat(focusInput.value) || 25, 0.1, 180);
      const shortMin = U.clamp(parseFloat(shortInput.value) || 5, 0.1, 60);
      const longMin = U.clamp(parseFloat(longInput.value) || 15, 0.1, 120);
      const longEvery = Math.round(U.clamp(parseInt(everyInput.value, 10) || 4, 1, 12));
      const sound = soundInput.checked;
      Object.assign(pomo.settings, { focusMin, shortMin, longMin, longEvery, sound });
      if (!pomo.running) pomo.total = pomo.remaining = Math.round(pomoMin(pomo.mode, pomo.settings) * 60);
      pomoRenderUI();
      store().setSettings({ pomodoro: pomo.settings }).then(() => UI.toast('番茄钟设置已保存', 'success'));
    }

    const settingsCard = UI.el('div', { class: 'pomo-settings' });
    settingsCard.appendChild(UI.el('div', { class: 'group-label' }, '时长设置（分钟）'));
    const row1 = UI.el('div', { class: 'row' }, [
      UI.field('专注', focusInput),
      UI.field('短休息', shortInput),
      UI.field('长休息', longInput)
    ]);
    const row2 = UI.el('div', { class: 'row' }, [
      UI.field('长休间隔（个番茄）', everyInput),
      soundWrap
    ]);
    settingsCard.appendChild(row1);
    settingsCard.appendChild(row2);
    settingsCard.appendChild(UI.el('div', {}, saveBtn));

    card.appendChild(modes);
    card.appendChild(ringWrap);
    card.appendChild(controls);
    card.appendChild(countEl);
    card.appendChild(settingsCard);
    container.appendChild(card);

    pomo.ui = { root: card, timeEl, ringEl, runBtn, modeBtns, countEl, circ };
    pomoRenderUI();
  }
  global.Stellarium.Router.register('tools', render, '实用小工具');
})(typeof window !== 'undefined' ? window : globalThis);