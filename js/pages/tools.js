/* 星隅 实用小工具：计算器（其余占位） */
(function (global) {
  'use strict';
  const UI = global.Stellarium.UI;
  const U = global.Stellarium.Utils;
  const store = () => global.Stellarium.store;

  function render(container) { pomo.ui = null; if (lottery.animId) { clearInterval(lottery.animId); lottery.animId = null; } lottery.ui = null; if (dice.animId) { clearInterval(dice.animId); dice.animId = null; } dice.ui = null;
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
        (t.id === 'calc' || t.id === 'rand' || t.id === 'convert' || t.id === 'pomodoro' || t.id === 'lottery' || t.id === 'dice' || t.id === 'notes' || t.id === 'pdf-merge' || t.id === 'pdf-split' || t.id === 'pdf-word' || t.id === 'pdf-ppt' || t.id === 'ppt-beautify') ? null : UI.el('span', { class: 'soon' }, '即将上线'),
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
    if (tool.id === 'lottery') { renderLottery(container); return; }
    if (tool.id === 'dice') { renderDice(container); return; }
    if (tool.id === 'notes') { renderNotes(container); return; }
    if (tool.id === 'pdf-merge') { renderPdfMerge(container); return; }
    if (tool.id === 'pdf-split') { renderPdfSplit(container); return; }
    if (tool.id === 'pdf-word') { renderPdfWord(container); return; }
    if (tool.id === 'pdf-ppt') { renderPdfPpt(container); return; }
    if (tool.id === 'ppt-beautify') { renderPptBeautify(container); return; }
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
  /* ============ 随机抽签 ============ */
  const lotteryPresets = {
    food: ['米饭套餐', '面条', '饺子', '火锅', '烧烤', '汉堡', '沙拉', '炒饭', '麻辣烫', '披萨'],
    weekend: ['公园', '电影院', '博物馆', '爬山', '逛街', '宅家', '露营', '图书馆', '游乐园']
  };

  const lottery = {
    options: [],
    count: 1,
    allowRepeat: false,
    history: [],
    ui: null,
    animId: null
  };

  function nowClockStr() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function lotteryPick(count, allowRepeat) {
    const pool = lottery.options.slice();
    const out = [];
    for (let i = 0; i < count && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      out.push(pool[idx]);
      if (!allowRepeat) pool.splice(idx, 1);
    }
    return out;
  }

  function renderLottery(container) {
    const saved = store().snapshot().settings.lottery || {};
    lottery.options = Array.isArray(saved.options) ? saved.options.slice() : [];
    lottery.count = U.clamp(parseInt(saved.count, 10) || 1, 1, 20);
    lottery.allowRepeat = !!saved.allowRepeat;
    lottery.history = store().all('lotteryHistory').slice().reverse();
    lottery.animId = null;

    container.innerHTML = '';
    container.appendChild(UI.el('div', { class: 'page-head' }, [
      UI.el('h1', { class: 'page-title' }, '随机抽签'),
      UI.el('button', { class: 'btn sm ghost', onclick: () => render(container) }, '← 返回工具列表')
    ]));

    /* 选项管理 */
    const optsCard = UI.el('div', { class: 'card lottery-options' });
    optsCard.appendChild(UI.el('div', { class: 'group-label' }, '抽签选项（每行一个）'));
    const optsArea = UI.el('textarea', { id: 'lottery-options', rows: '5', placeholder: '例如：火锅\n烧烤\n面条' });
    optsArea.value = lottery.options.join('\n');
    optsCard.appendChild(optsArea);

    const presetBar = UI.el('div', { class: 'lottery-presets' });
    presetBar.appendChild(UI.el('button', { class: 'btn sm', onclick: () => { optsArea.value = lotteryPresets.food.join('\n'); } }, '🍜 今天吃什么'));
    presetBar.appendChild(UI.el('button', { class: 'btn sm', onclick: () => { optsArea.value = lotteryPresets.weekend.join('\n'); } }, '🎒 周末去哪玩'));
    presetBar.appendChild(UI.el('button', { class: 'btn sm', id: 'lottery-preset-custom', onclick: () => { optsArea.value = ''; } }, '✏️ 自定义'));
    presetBar.appendChild(UI.el('span', { class: 'muted' }, '点击填入模板，可再修改'));
    optsCard.appendChild(presetBar);

    const optsBtns = UI.el('div', { class: 'row', style: 'margin-top:12px' }, [
      UI.el('button', { class: 'btn primary', id: 'lottery-save', onclick: () => saveOptions() }, '保存选项'),
      UI.el('button', { class: 'btn', id: 'lottery-clear', onclick: () => { optsArea.value = ''; lottery.options = []; saveSettings(); } }, '清空选项')
    ]);
    optsCard.appendChild(optsBtns);

    /* 抽签区 */
    const drawCard = UI.el('div', { class: 'card lottery-draw' });
    const countInput = UI.numInput(lottery.count, { id: 'lottery-count', min: '1', max: '20', step: '1' });
    const repeatWrap = UI.el('div', { class: 'field' });
    repeatWrap.appendChild(UI.el('label', {}, '允许重复'));
    const repeatInput = UI.el('input', { type: 'checkbox', id: 'lottery-repeat', checked: lottery.allowRepeat ? 'checked' : null });
    repeatWrap.appendChild(repeatInput);
    const drawRow = UI.el('div', { class: 'row' }, [
      UI.field('抽取数量', countInput),
      repeatWrap
    ]);
    drawCard.appendChild(drawRow);

    const resultBox = UI.el('div', { class: 'lottery-result', id: 'lottery-result' });
    resultBox.appendChild(UI.el('div', { class: 'lottery-result-placeholder' }, '点击下方按钮开始抽签'));
    const drawBtn = UI.el('button', { class: 'btn primary lg', id: 'lottery-draw', onclick: () => draw() }, '🎲 开始抽签');
    drawCard.appendChild(resultBox);
    drawCard.appendChild(UI.el('div', { style: 'text-align:center' }, drawBtn));

    /* 历史记录 */
    const histCard = UI.el('div', { class: 'card lottery-history' });
    const histList = UI.el('div', { id: 'lottery-history-list' });
    histCard.appendChild(UI.el('div', { class: 'lottery-hist-head' }, [
      UI.el('div', { class: 'group-label' }, '历史记录'),
      UI.el('button', { class: 'btn sm', id: 'lottery-hist-clear', onclick: () => clearHistory() }, '清空历史')
    ]));
    histCard.appendChild(histList);

    container.appendChild(optsCard);
    container.appendChild(drawCard);
    container.appendChild(histCard);

    lottery.ui = { optsArea, countInput, repeatInput, resultBox, drawBtn, histList };

    function saveSettings() {
      return store().setSettings({ lottery: { options: lottery.options, count: lottery.count, allowRepeat: lottery.allowRepeat } });
    }

    function saveOptions() {
      const list = optsArea.value.split('\n').map(s => s.trim()).filter(Boolean);
      if (!list.length) { UI.toast('请至少填写一个选项', 'error'); return; }
      lottery.options = list;
      saveSettings().then(() => UI.toast('抽签选项已保存', 'success'));
    }

    function renderHistory() {
      const ui = lottery.ui;
      if (!ui || !ui.histList.isConnected) return;
      ui.histList.innerHTML = '';
      if (!lottery.history.length) {
        ui.histList.appendChild(UI.el('div', { class: 'muted', style: 'padding:8px 0' }, '暂无抽签记录'));
        return;
      }
      lottery.history.slice(0, 20).forEach(h => {
        const chips = h.results.map(r => UI.el('span', { class: 'lottery-chip' }, r));
        ui.histList.appendChild(UI.el('div', { class: 'lottery-hist-row' }, [
          UI.el('div', { class: 'lottery-hist-time' }, h.time || ''),
          UI.el('div', { class: 'lottery-hist-results' }, chips)
        ]));
      });
    }

    function clearHistory() {
      const items = store().all('lotteryHistory').slice();
      if (!items.length) { UI.toast('暂无历史记录', 'info'); return; }
      Promise.all(items.map(it => store().remove('lotteryHistory', it.id))).then(() => {
        lottery.history = [];
        renderHistory();
        UI.toast('历史记录已清空', 'success');
      });
    }

    function showResults(results, rolling) {
      const ui = lottery.ui;
      if (!ui || !ui.resultBox.isConnected) return;
      ui.resultBox.innerHTML = '';
      ui.resultBox.classList.toggle('rolling', !!rolling);
      if (results.length === 1) {
        const big = UI.el('div', { class: 'lottery-result-main' }, results[0]);
        ui.resultBox.appendChild(big);
      } else {
        results.forEach((r, i) => {
          ui.resultBox.appendChild(UI.el('div', { class: 'lottery-result-item' }, [
            UI.el('span', { class: 'lottery-result-no' }, String(i + 1)),
            UI.el('span', { class: 'lottery-result-txt' }, r)
          ]));
        });
      }
    }

    function draw() {
      const count = Math.round(U.clamp(parseInt(countInput.value, 10) || 1, 1, 20));
      const allowRepeat = repeatInput.checked;
      if (!lottery.options.length) { UI.toast('请先填写并保存抽签选项', 'error'); return; }
      if (!allowRepeat && count > lottery.options.length) { UI.toast('不重复抽取时，数量不能超过选项数', 'error'); return; }
      lottery.count = count;
      lottery.allowRepeat = allowRepeat;
      saveSettings();
      const final = lotteryPick(count, allowRepeat);
      drawBtn.disabled = true;
      let tick = 0;
      lottery.animId = setInterval(() => {
        tick++;
        showResults(lotteryPick(1, false), true);
        if (tick >= 12) {
          clearInterval(lottery.animId);
          lottery.animId = null;
          showResults(final, false);
          drawBtn.disabled = false;
          const rec = { time: nowClockStr(), count, allowRepeat, results: final.slice() };
          store().add('lotteryHistory', rec).then(() => {
            lottery.history.unshift(rec);
            renderHistory();
          });
        }
      }, 130);
    }

    renderHistory();
  }
  /* ============ 掷骰子 ============ */
  const DICE_TYPES = [
    { id: 'd4', faces: 4 }, { id: 'd6', faces: 6 }, { id: 'd8', faces: 8 },
    { id: 'd10', faces: 10 }, { id: 'd12', faces: 12 }, { id: 'd20', faces: 20 }, { id: 'd100', faces: 100 }
  ];
  const DICE_PIPS = {
    1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8]
  };

  const dice = {
    type: 6,
    count: 1,
    history: [],
    ui: null,
    animId: null
  };

  function diceRoll(faces, n) {
    const out = [];
    for (let i = 0; i < n; i++) out.push(1 + Math.floor(Math.random() * faces));
    return out;
  }

  function renderDice(container) {
    const saved = store().snapshot().settings.dice || {};
    dice.type = parseInt(saved.type, 10) || 6;
    dice.count = U.clamp(parseInt(saved.count, 10) || 1, 1, 10);
    dice.history = store().all('diceHistory').slice().reverse();
    dice.animId = null;

    container.innerHTML = '';
    container.appendChild(UI.el('div', { class: 'page-head' }, [
      UI.el('h1', { class: 'page-title' }, '掷骰子'),
      UI.el('button', { class: 'btn sm ghost', onclick: () => render(container) }, '← 返回工具列表')
    ]));

    const card = UI.el('div', { class: 'card dice' });
    card.appendChild(UI.el('div', { class: 'group-label' }, '骰子类型'));
    const typeBar = UI.el('div', { class: 'dice-type-bar', id: 'dice-types' });
    const typeBtns = DICE_TYPES.map(t => UI.el('button', {
      class: 'btn sm dice-type-btn' + (t.faces === dice.type ? ' active' : ''),
      dataset: { faces: String(t.faces) },
      onclick: () => {
        dice.type = t.faces;
        saveSettings();
        typeBtns.forEach(b => b.classList.toggle('active', Number(b.dataset.faces) === dice.type));
      }
    }, t.id));
    typeBtns.forEach(b => typeBar.appendChild(b));
    card.appendChild(typeBar);

    const countInput = UI.numInput(dice.count, { id: 'dice-count', min: '1', max: '10', step: '1' });
    countInput.addEventListener('change', () => {
      dice.count = Math.round(U.clamp(parseInt(countInput.value, 10) || 1, 1, 10));
      countInput.value = String(dice.count);
      saveSettings();
    });
    card.appendChild(UI.el('div', { class: 'dice-count-row' }, [
      UI.field('投掷数量', countInput),
      UI.el('span', { class: 'muted', style: 'align-self:center' }, '1–10 个')
    ]));

    const tray = UI.el('div', { class: 'dice-tray', id: 'dice-results' });
    const summary = UI.el('div', { class: 'dice-summary', id: 'dice-summary' });
    const rollBtn = UI.el('button', { class: 'btn primary lg', id: 'dice-roll', onclick: () => roll() }, '🎲 掷骰子');
    card.appendChild(tray);
    card.appendChild(summary);
    card.appendChild(UI.el('div', { style: 'text-align:center' }, rollBtn));
    container.appendChild(card);

    const histCard = UI.el('div', { class: 'card dice-history' });
    const histList = UI.el('div', { id: 'dice-history-list' });
    histCard.appendChild(UI.el('div', { class: 'dice-hist-head' }, [
      UI.el('div', { class: 'group-label' }, '历史记录'),
      UI.el('button', { class: 'btn sm', id: 'dice-hist-clear', onclick: () => clearHistory() }, '清空历史')
    ]));
    histCard.appendChild(histList);
    container.appendChild(histCard);

    dice.ui = { tray, summary, rollBtn, countInput, histList };

    function saveSettings() {
      return store().setSettings({ dice: { type: dice.type, count: dice.count } });
    }

    function renderHistory() {
      const ui = dice.ui;
      if (!ui || !ui.histList.isConnected) return;
      ui.histList.innerHTML = '';
      if (!dice.history.length) {
        ui.histList.appendChild(UI.el('div', { class: 'muted', style: 'padding:8px 0' }, '暂无投掷记录'));
        return;
      }
      dice.history.slice(0, 20).forEach(h => {
        const chips = h.results.map(v => UI.el('span', { class: 'dice-chip' }, String(v)));
        ui.histList.appendChild(UI.el('div', { class: 'dice-hist-row' }, [
          UI.el('div', { class: 'dice-hist-time' }, h.time || ''),
          UI.el('div', { class: 'dice-hist-results' }, [
            UI.el('span', { class: 'muted' }, h.type + '×' + h.count + '  '),
            ...chips,
            h.count > 1 ? UI.el('span', { class: 'dice-hist-total' }, '合计 ' + h.total) : null
          ])
        ]));
      });
    }

    function clearHistory() {
      const items = store().all('diceHistory').slice();
      if (!items.length) { UI.toast('暂无历史记录', 'info'); return; }
      Promise.all(items.map(it => store().remove('diceHistory', it.id))).then(() => {
        dice.history = [];
        renderHistory();
        UI.toast('历史记录已清空', 'success');
      });
    }

    function dieFace(value, rolling) {
      const face = UI.el('div', { class: 'dice-face' + (rolling ? ' rolling' : '') });
      if (dice.type === 6 && value >= 1 && value <= 6) {
        const grid = UI.el('div', { class: 'dice-pips' });
        for (let i = 0; i < 9; i++) {
          const pip = (DICE_PIPS[value] || []).includes(i);
          grid.appendChild(pip ? UI.el('span', { class: 'pip' }) : UI.el('span', {}));
        }
        face.appendChild(grid);
      } else {
        face.appendChild(UI.el('span', { class: 'dice-num' }, String(value)));
      }
      return face;
    }

    function showResults(values, rolling) {
      const ui = dice.ui;
      if (!ui || !ui.tray.isConnected) return;
      ui.tray.innerHTML = '';
      values.forEach(v => ui.tray.appendChild(dieFace(v, rolling)));
      ui.summary.innerHTML = '';
      if (values.length > 1) {
        const total = values.reduce((a, b) => a + b, 0);
        ui.summary.appendChild(UI.el('span', {}, '总和 ' + total + ' · 最大 ' + Math.max(...values) + ' · 最小 ' + Math.min(...values)));
      }
    }

    function roll() {
      const count = Math.round(U.clamp(parseInt(countInput.value, 10) || 1, 1, 10));
      dice.count = count;
      countInput.value = String(count);
      saveSettings();
      const final = diceRoll(dice.type, count);
      rollBtn.disabled = true;
      let tick = 0;
      dice.animId = setInterval(() => {
        tick++;
        showResults(diceRoll(dice.type, count), true);
        if (tick >= 10) {
          clearInterval(dice.animId);
          dice.animId = null;
          showResults(final, false);
          rollBtn.disabled = false;
          const rec = {
            time: nowClockStr(), type: 'd' + dice.type, count,
            results: final.slice(), total: final.reduce((a, b) => a + b, 0)
          };
          store().add('diceHistory', rec).then(() => {
            dice.history.unshift(rec);
            renderHistory();
          });
        }
      }, 120);
    }

    renderHistory();
  }
  /* ============ 备忘便签 ============ */
  const NOTE_COLORS = ['yellow', 'blue', 'green', 'pink'];

  function renderNotes(container) {
    container.innerHTML = '';
    container.appendChild(UI.el('div', { class: 'page-head' }, [
      UI.el('h1', { class: 'page-title' }, '备忘便签'),
      UI.el('button', { class: 'btn sm ghost', onclick: () => render(container) }, '← 返回工具列表')
    ]));

    const card = UI.el('div', { class: 'card notes-panel' });
    const searchInput = UI.textInput('', { id: 'notes-search', placeholder: '搜索标题或内容…' });
    const newBtn = UI.el('button', { class: 'btn primary sm', id: 'notes-new', onclick: () => openNoteModal(null) }, '＋ 新建便签');
    const toolbar = UI.el('div', { class: 'notes-toolbar' }, [searchInput, newBtn]);
    const statsEl = UI.el('div', { class: 'notes-stats', id: 'notes-stats' });
    const list = UI.el('div', { class: 'notes-list', id: 'notes-list' });
    card.appendChild(toolbar);
    card.appendChild(statsEl);
    card.appendChild(list);
    container.appendChild(card);

    let filter = '';
    searchInput.addEventListener('input', () => { filter = searchInput.value.trim().toLowerCase(); renderList(); });

    function allNotes() {
      return store().all('notes').slice().sort((a, b) => {
        if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
    }

    function renderList() {
      const kw = filter;
      const items = allNotes().filter(n => {
        if (!kw) return true;
        return ((n.title || '') + ' ' + (n.content || '')).toLowerCase().includes(kw);
      });
      list.innerHTML = '';
      const total = store().all('notes').length;
      const pinned = store().all('notes').filter(n => n.pinned).length;
      statsEl.textContent = total ? '共 ' + total + ' 条 · 置顶 ' + pinned + ' 条' : '';
      if (!items.length) {
        list.appendChild(UI.emptyState('📝', total ? '没有匹配的便签' : '还没有便签，点击右上角新建', total ? null : '新建便签', total ? null : () => openNoteModal(null)));
        return;
      }
      items.forEach(n => list.appendChild(noteCard(n)));
    }

    function noteTimeStr(ts) {
      const d = new Date(ts);
      const p = n => String(n).padStart(2, '0');
      return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    }

    function noteCard(n) {
      const card = UI.el('div', {
        class: 'note-card ' + (n.color || 'yellow') + (n.pinned ? ' pinned' : ''),
        onclick: () => openNoteModal(n)
      });
      card.appendChild(UI.el('div', { class: 'note-head' }, [
        UI.el('span', { class: 'note-title' }, n.title || '无标题'),
        UI.el('span', { class: 'note-time' }, (n.updatedAt || n.createdAt) ? noteTimeStr(n.updatedAt || n.createdAt) : '')
      ]));
      card.appendChild(UI.el('div', { class: 'note-content' }, n.content || ''));
      card.appendChild(UI.el('div', { class: 'note-actions' }, [
        UI.el('button', { class: 'note-act', dataset: { action: 'pin' }, title: n.pinned ? '取消置顶' : '置顶', onclick: (e) => { e.stopPropagation(); togglePin(n); } }, n.pinned ? '📌' : '📍'),
        UI.el('button', { class: 'note-act', dataset: { action: 'edit' }, title: '编辑', onclick: (e) => { e.stopPropagation(); openNoteModal(n); } }, '✏️'),
        UI.el('button', { class: 'note-act', dataset: { action: 'del' }, title: '删除', onclick: (e) => { e.stopPropagation(); removeNote(n); } }, '🗑')
      ]));
      return card;
    }

    function togglePin(n) {
      store().update('notes', n.id, { pinned: !n.pinned }).then(() => renderList());
    }

    function removeNote(n) {
      UI.confirmDialog({ title: '删除便签', message: '确定删除「' + (n.title || '无标题') + '」吗？删除后无法恢复。' }).then(ok => {
        if (!ok) return;
        store().remove('notes', n.id).then(() => { renderList(); UI.toast('便签已删除', 'success'); });
      });
    }

    function openNoteModal(n) {
      const titleInput = UI.textInput(n ? n.title : '', { id: 'note-title', placeholder: '便签标题（可选）' });
      const contentInput = UI.el('textarea', { id: 'note-content', rows: '5', placeholder: '写下内容…' });
      contentInput.value = n ? (n.content || '') : '';
      let currentColor = n ? (n.color || 'yellow') : 'yellow';
      const colorBar = UI.el('div', { class: 'note-color-bar' });
      const colorBtns = NOTE_COLORS.map(c => UI.el('button', {
        class: 'note-color-dot ' + c + (currentColor === c ? ' active' : ''),
        dataset: { color: c },
        onclick: () => { currentColor = c; colorBtns.forEach(b => b.classList.toggle('active', b.dataset.color === c)); }
      }, ''));
      colorBtns.forEach(b => colorBar.appendChild(b));

      const body = UI.el('div', { class: 'note-form' });
      body.appendChild(UI.field('标题', titleInput));
      body.appendChild(UI.field('内容', contentInput));
      body.appendChild(UI.el('div', { class: 'note-color-row' }, [
        UI.el('label', {}, '颜色'),
        colorBar
      ]));
      const saveBtn = UI.el('button', { class: 'btn primary', id: 'note-save', onclick: () => save() }, '保存');
      const cancelBtn = UI.el('button', { class: 'btn', onclick: () => dlg.close() }, '取消');
      body.appendChild(UI.el('div', { class: 'row', style: 'margin-top:14px' }, [saveBtn, cancelBtn]));

      const dlg = UI.modal(n ? '编辑便签' : '新建便签', body);
      const now = Date.now();
      function save() {
        const title = titleInput.value.trim();
        const content = contentInput.value.trim();
        if (!title && !content) { UI.toast('标题和内容至少填写一项', 'error'); return; }
        if (n) {
          store().update('notes', n.id, { title, content, color: currentColor, updatedAt: now }).then(() => {
            dlg.close(); renderList(); UI.toast('便签已更新', 'success');
          });
        } else {
          store().add('notes', { title, content, color: currentColor, pinned: false, createdAt: now, updatedAt: now }).then(() => {
            dlg.close(); renderList(); UI.toast('便签已保存', 'success');
          });
        }
      }
    }

    renderList();
  }
  
/* ============ PDF 合并 ============ */
const PDF_MERGE = { files: [] };

function fmtSize(n) {
  if (n >= 1048576) return (n / 1048576).toFixed(2) + ' MB';
  if (n >= 1024) return (n / 1024).toFixed(1) + ' KB';
  return n + ' B';
}

function renderPdfMerge(container) {
  PDF_MERGE.files = [];
  container.innerHTML = '';
  container.appendChild(UI.el('div', { class: 'page-head' }, [
    UI.el('h1', { class: 'page-title' }, 'PDF 合并'),
    UI.el('button', { class: 'btn sm ghost', onclick: () => render(container) }, '← 返回工具列表')
  ]));

  const card = UI.el('div', { class: 'card pdf-panel' });
  const levelBar = UI.el('div', { class: 'pdf-level-bar' }, [
    UI.el('span', { class: 'pdf-level gold' }, '≤10MB 黄金区间'),
    UI.el('span', { class: 'pdf-level ok' }, '10~25MB 舒适'),
    UI.el('span', { class: 'pdf-level caution' }, '25~50MB 谨慎'),
    UI.el('span', { class: 'pdf-level no' }, '50~100MB 不推荐'),
    UI.el('span', { class: 'pdf-level block' }, '>100MB 拒绝上传')
  ]);
  const input = UI.el('input', { type: 'file', accept: '.pdf,application/pdf', multiple: true, id: 'pdf-merge-input', style: 'display:none' });
  input.addEventListener('change', () => { addFiles(input.files); input.value = ''; });
  const drop = UI.el('div', { class: 'pdf-drop', id: 'pdf-drop', onclick: () => input.click() }, [
    UI.el('div', { class: 'pdf-drop-ico' }, '📄'),
    UI.el('div', { class: 'pdf-drop-txt' }, '点击选择或拖拽多个 PDF 到此处'),
    UI.el('div', { class: 'muted sm' }, '支持多选，添加后可排序或删除')
  ]);
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', e => {
    e.preventDefault(); drop.classList.remove('over');
    addFiles(e.dataTransfer.files);
  });
  card.appendChild(levelBar);
  card.appendChild(input);
  card.appendChild(drop);
  card.appendChild(UI.el('div', { class: 'pdf-hint muted sm', style: 'margin-top:10px' }, '单个文件超过 100MB 将被拒绝上传；50MB 以上处理会偏慢，建议先拆分或压缩'));

  const list = UI.el('div', { class: 'pdf-list', id: 'pdf-merge-list' });
  card.appendChild(list);

  const mergeBtn = UI.el('button', { class: 'btn primary lg', id: 'pdf-merge-btn', disabled: true, onclick: () => mergePdfs() }, '📎 开始合并');
  card.appendChild(UI.el('div', { class: 'pdf-actions' }, mergeBtn));
  container.appendChild(card);

  renderList();

  function addFiles(fileList) {
    for (const f of fileList) {
      if (!/\\.pdf$/i.test(f.name) && f.type !== 'application/pdf') {
        UI.toast('「' + f.name + '」不是 PDF 文件，已跳过', 'warn');
        continue;
      }
      const lv = U.pdfSizeLevel(f.size);
      if (lv.block) {
        UI.toast('「' + f.name + '」超过 100MB，不允许上传', 'error');
        continue;
      }
      PDF_MERGE.files.push({ name: f.name, size: f.size, file: f });
    }
    renderList();
  }

  function renderList() {
    list.innerHTML = '';
    if (!PDF_MERGE.files.length) {
      list.appendChild(UI.emptyState('📑', '尚未添加 PDF 文件', null));
      mergeBtn.disabled = true;
      return;
    }
    mergeBtn.disabled = false;
    PDF_MERGE.files.forEach((item, i) => {
      const lv = U.pdfSizeLevel(item.size);
      const row = UI.el('div', { class: 'pdf-row' });
      row.appendChild(UI.el('span', { class: 'pdf-idx' }, String(i + 1)));
      row.appendChild(UI.el('span', { class: 'pdf-info' }, [
        UI.el('div', { class: 'pdf-name' }, item.name),
        UI.el('div', { class: 'pdf-meta' }, [
          fmtSize(item.size),
          UI.el('span', { class: 'pdf-badge ' + lv.level }, lv.label)
        ])
      ]));
      const ops = UI.el('div', { class: 'pdf-ops' });
      const upBtn = UI.el('button', { class: 'btn sm ghost', onclick: () => move(i, -1) }, '↑');
      if (i === 0) upBtn.disabled = true;
      ops.appendChild(upBtn);
      const downBtn = UI.el('button', { class: 'btn sm ghost', onclick: () => move(i, 1) }, '↓');
      if (i === PDF_MERGE.files.length - 1) downBtn.disabled = true;
      ops.appendChild(downBtn);
      ops.appendChild(UI.el('button', { class: 'btn sm danger', onclick: () => remove(i) }, '删除'));
      row.appendChild(ops);
      list.appendChild(row);
    });
  }

  function move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= PDF_MERGE.files.length) return;
    const tmp = PDF_MERGE.files[i]; PDF_MERGE.files[i] = PDF_MERGE.files[j]; PDF_MERGE.files[j] = tmp;
    renderList();
  }

  function remove(i) {
    PDF_MERGE.files.splice(i, 1);
    renderList();
  }

  async function mergePdfs() {
    if (!PDF_MERGE.files.length) return;
    const heavy = PDF_MERGE.files.filter(f => U.pdfSizeLevel(f.size).level === 'no');
    if (heavy.length && !(await UI.confirmDialog({
      title: '继续合并？',
      message: '包含 ' + heavy.length + ' 个超过 50MB 的文件，处理可能较慢或内存不足，是否仍要继续？',
      danger: false, confirmText: '继续', cancelText: '取消'
    }))) return;
    mergeBtn.disabled = true;
    mergeBtn.textContent = '⏳ 合并中…';
    try {
      if (!global.PDFLib) { UI.toast('PDF 处理库未加载，请刷新页面后重试', 'error'); return; }
      const out = await global.PDFLib.PDFDocument.create();
      for (const item of PDF_MERGE.files) {
        try {
          const bytes = await item.file.arrayBuffer();
          const src = await global.PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
          const pages = await out.copyPages(src, src.getPageIndices());
          pages.forEach(p => out.addPage(p));
        } catch (err) {
          UI.toast('「' + item.name + '」读取失败（可能已加密或损坏），已跳过', 'warn');
        }
      }
      if (!out.getPageCount()) { UI.toast('没有可合并的有效页面', 'warn'); return; }
      const data = await out.save();
      const base = (PDF_MERGE.files[0].name || 'merged').replace(/\\.pdf$/i, '');
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = base + '-合并.pdf';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      UI.toast('合并完成，共 ' + out.getPageCount() + ' 页', 'success');
    } catch (err) {
      UI.toast('合并失败：' + err.message, 'error');
    } finally {
      mergeBtn.disabled = false;
      mergeBtn.textContent = '📎 开始合并';
    }
  }
}
/* ============ 拆分 / 提取页面 ============ */
const PDF_SPLIT = { file: null, total: 0 };

function splitEvery(total, n) {
  const ranges = [];
  for (let s = 1; s <= total; s += n) ranges.push([s, Math.min(s + n - 1, total)]);
  return ranges;
}

function renderPdfSplit(container) {
  PDF_SPLIT.file = null;
  PDF_SPLIT.total = 0;
  container.innerHTML = '';
  container.appendChild(UI.el('div', { class: 'page-head' }, [
    UI.el('h1', { class: 'page-title' }, '拆分 / 提取页面'),
    UI.el('button', { class: 'btn sm ghost', onclick: () => render(container) }, '← 返回工具列表')
  ]));

  let pptx = null;
  const card = UI.el('div', { class: 'card pdf-panel' });
  card.appendChild(UI.el('div', { class: 'pdf-level-bar' }, [
    UI.el('span', { class: 'pdf-level gold' }, '≤10MB 黄金区间'),
    UI.el('span', { class: 'pdf-level ok' }, '10~25MB 舒适'),
    UI.el('span', { class: 'pdf-level caution' }, '25~50MB 谨慎'),
    UI.el('span', { class: 'pdf-level no' }, '50~100MB 不推荐'),
    UI.el('span', { class: 'pdf-level block' }, '>100MB 拒绝上传')
  ]));

  const input = UI.el('input', { type: 'file', accept: '.pdf,application/pdf', id: 'pdf-split-input', style: 'display:none' });
  input.addEventListener('change', () => { loadFile(input.files[0]); input.value = ''; });
  const drop = UI.el('div', { class: 'pdf-drop', id: 'pdf-split-drop', onclick: () => input.click() }, [
    UI.el('div', { class: 'pdf-drop-ico' }, '📄'),
    UI.el('div', { class: 'pdf-drop-txt' }, '点击选择或拖拽一个 PDF 到此处'),
    UI.el('div', { class: 'muted sm' }, '单个文件超过 100MB 将被拒绝')
  ]);
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', e => {
    e.preventDefault(); drop.classList.remove('over');
    if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
  });
  card.appendChild(input);
  card.appendChild(drop);

  const fileInfo = UI.el('div', { class: 'pdf-file-info', id: 'pdf-split-info', style: 'display:none' });
  card.appendChild(fileInfo);

  const tabs = UI.el('div', { class: 'tabs', id: 'pdf-split-tabs' });
  const tabDefs = [
    { id: 'extract', label: '提取页面' },
    { id: 'split', label: '按份数拆分' },
    { id: 'custom', label: '自定义拆分' }
  ];
  const tabBtns = tabDefs.map(t => UI.el('button', { class: 'tab', dataset: { mode: t.id }, onclick: () => setMode(t.id) }, t.label));
  tabBtns.forEach(b => tabs.appendChild(b));
  card.appendChild(tabs);

  const extractPanel = UI.el('div', { class: 'pdf-mode-panel', id: 'pdf-extract-panel' });
  const rangeInput = UI.textInput('', { id: 'pdf-extract-range', placeholder: '如 1-3,5,8-10' });
  rangeInput.addEventListener('input', updatePreview);
  const allBtn = UI.el('button', { class: 'btn sm', id: 'pdf-extract-all', onclick: () => { rangeInput.value = '1-' + PDF_SPLIT.total; updatePreview(); } }, '全部页');
  extractPanel.appendChild(UI.field('页码范围（提取后按输入顺序合并为一个新 PDF）', rangeInput));
  extractPanel.appendChild(UI.el('div', { class: 'pdf-mode-actions' }, [
    allBtn,
    UI.el('button', { class: 'btn primary', id: 'pdf-extract-btn', onclick: () => extractPages() }, '提取并下载')
  ]));
  extractPanel.appendChild(UI.el('div', { class: 'pdf-preview muted sm', id: 'pdf-extract-preview' }, ''));

  const splitPanel = UI.el('div', { class: 'pdf-mode-panel', id: 'pdf-split-panel', style: 'display:none' });
  const everyInput = UI.numInput(10, { id: 'pdf-split-every', min: '1', step: '1' });
  everyInput.addEventListener('input', updatePreview);
  splitPanel.appendChild(UI.field('每份页数', everyInput));
  splitPanel.appendChild(UI.el('div', { class: 'pdf-mode-actions' }, [
    UI.el('button', { class: 'btn primary', id: 'pdf-split-btn', onclick: () => splitEveryPages() }, '拆分并下载')
  ]));
  splitPanel.appendChild(UI.el('div', { class: 'pdf-preview muted sm', id: 'pdf-split-preview' }, ''));

  const customPanel = UI.el('div', { class: 'pdf-mode-panel', id: 'pdf-custom-panel', style: 'display:none' });
  const customInput = UI.textInput('', { id: 'pdf-custom-range', placeholder: '如 1-3,5,8-10（每个范围生成一个文件）' });
  customInput.addEventListener('input', updatePreview);
  customPanel.appendChild(UI.field('自定义拆分范围', customInput));
  customPanel.appendChild(UI.el('div', { class: 'pdf-mode-actions' }, [
    UI.el('button', { class: 'btn primary', id: 'pdf-custom-btn', onclick: () => customSplit() }, '拆分并下载')
  ]));
  customPanel.appendChild(UI.el('div', { class: 'pdf-preview muted sm', id: 'pdf-custom-preview' }, ''));

  card.appendChild(extractPanel);
  card.appendChild(splitPanel);
  card.appendChild(customPanel);
  container.appendChild(card);

  tabBtns[0].classList.add('active');
  updatePreview();

  function resetFile() {
    PDF_SPLIT.file = null;
    PDF_SPLIT.total = 0;
    fileInfo.style.display = 'none';
    fileInfo.innerHTML = '';
    rangeInput.value = '';
    customInput.value = '';
    updatePreview();
  }

  function setMode(mode) {
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    extractPanel.style.display = mode === 'extract' ? '' : 'none';
    splitPanel.style.display = mode === 'split' ? '' : 'none';
    customPanel.style.display = mode === 'custom' ? '' : 'none';
    updatePreview();
  }

  async function loadFile(f) {
    if (!f) return;
    if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') { UI.toast('「' + f.name + '」不是 PDF 文件', 'warn'); return; }
    const lv = U.pdfSizeLevel(f.size);
    if (lv.block) { UI.toast('「' + f.name + '」超过 100MB，不允许上传', 'error'); return; }
    drop.classList.add('over');
    try {
      if (!global.PDFLib) throw new Error('PDF 处理库未加载');
      const bytes = await f.arrayBuffer();
      const doc = await global.PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
      PDF_SPLIT.file = f;
      PDF_SPLIT.total = doc.getPageCount();
      fileInfo.style.display = '';
      fileInfo.innerHTML = '';
      fileInfo.appendChild(UI.el('span', { class: 'pdf-name' }, f.name));
      fileInfo.appendChild(UI.el('span', { class: 'pdf-meta' }, [
        fmtSize(f.size),
        UI.el('span', { class: 'pdf-badge ' + lv.level }, lv.label),
        UI.el('span', {}, '共 ' + PDF_SPLIT.total + ' 页')
      ]));
      fileInfo.appendChild(UI.el('button', { class: 'btn sm danger', id: 'pdf-split-clear', onclick: () => resetFile() }, '删除'));
      rangeInput.value = '';
      customInput.value = '';
      everyInput.value = '10';
      updatePreview();
      UI.toast('已载入，共 ' + PDF_SPLIT.total + ' 页', 'success');
    } catch (err) {
      resetFile();
      UI.toast('「' + f.name + '」读取失败（可能已加密或损坏）', 'error');
    } finally {
      drop.classList.remove('over');
    }
  }

  function updatePreview() {
    if (!PDF_SPLIT.file) { setPreview('extract', ''); setPreview('split', ''); setPreview('custom', ''); return; }
    const mode = (tabBtns.find(b => b.classList.contains('active')) || tabBtns[0]).dataset.mode;
    if (mode === 'extract') {
      const r = U.parsePageRanges(rangeInput.value, PDF_SPLIT.total);
      setPreview('extract', r.ok ? '将提取 ' + countPages(r.ranges) + ' 页' : (r.error || ''));
    } else if (mode === 'split') {
      const n = Math.max(1, Math.round(parseInt(everyInput.value, 10) || 1));
      const ranges = splitEvery(PDF_SPLIT.total, n);
      setPreview('split', '共 ' + PDF_SPLIT.total + ' 页，将生成 ' + ranges.length + ' 个文件');
    } else {
      const r = U.parsePageRanges(customInput.value, PDF_SPLIT.total);
      setPreview('custom', r.ok ? '将生成 ' + r.ranges.length + ' 个文件（共 ' + countPages(r.ranges) + ' 页）' : (r.error || '请输入范围，如 1-3,5'));
    }
  }

  function setPreview(kind, text) {
    const el = document.getElementById('pdf-' + kind + '-preview');
    if (el) el.textContent = text;
  }

  function countPages(ranges) {
    return ranges.reduce((s, r) => s + (r[1] - r[0] + 1), 0);
  }

  async function buildPdfFromRanges(ranges) {
    const bytes = await PDF_SPLIT.file.arrayBuffer();
    const src = await global.PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
    const out = await global.PDFLib.PDFDocument.create();
    for (const r of ranges) {
      const idx = [];
      for (let i = r[0]; i <= r[1]; i++) idx.push(i - 1);
      const pages = await out.copyPages(src, idx);
      pages.forEach(p => out.addPage(p));
    }
    return out.save();
  }

  async function extractPages() {
    if (!PDF_SPLIT.file) { UI.toast('请先上传 PDF 文件', 'warn'); return; }
    const r = U.parsePageRanges(rangeInput.value, PDF_SPLIT.total);
    if (!r.ok) { UI.toast(r.error, 'warn'); return; }
    const btn = document.getElementById('pdf-extract-btn');
    btn.disabled = true;
    btn.textContent = '⏳ 提取中…';
    try {
      const data = await buildPdfFromRanges(r.ranges);
      downloadPdf(data, (PDF_SPLIT.file.name.replace(/\.pdf$/i, '') || 'pdf') + '-提取.pdf');
      UI.toast('提取完成，共 ' + countPages(r.ranges) + ' 页', 'success');
    } catch (err) { UI.toast('提取失败：' + err.message, 'error'); }
    finally {
      btn.disabled = false;
      btn.textContent = '提取并下载';
    }
  }

  async function splitEveryPages() {
    if (!PDF_SPLIT.file) { UI.toast('请先上传 PDF 文件', 'warn'); return; }
    const n = Math.max(1, Math.round(parseInt(everyInput.value, 10) || 1));
    const ranges = splitEvery(PDF_SPLIT.total, n);
    await runSplit(ranges, 'split');
  }

  async function customSplit() {
    if (!PDF_SPLIT.file) { UI.toast('请先上传 PDF 文件', 'warn'); return; }
    const r = U.parsePageRanges(customInput.value, PDF_SPLIT.total);
    if (!r.ok) { UI.toast(r.error, 'warn'); return; }
    await runSplit(r.ranges, 'custom');
  }

  async function runSplit(ranges, kind) {
    const base = (PDF_SPLIT.file.name.replace(/\.pdf$/i, '') || 'pdf');
    const btn = document.getElementById(kind === 'split' ? 'pdf-split-btn' : 'pdf-custom-btn');
    btn.disabled = true;
    try {
      for (let i = 0; i < ranges.length; i++) {
        btn.textContent = '⏳ 正在生成 ' + (i + 1) + '/' + ranges.length + '…';
        const data = await buildPdfFromRanges([ranges[i]]);
        downloadPdf(data, base + '-第' + (i + 1) + '部分.pdf');
        await new Promise(res => setTimeout(res, 120));
      }
      UI.toast('拆分完成，共生成 ' + ranges.length + ' 个文件', 'success');
    } catch (err) { UI.toast('拆分失败：' + err.message, 'error'); }
    finally {
      btn.disabled = false;
      btn.textContent = '拆分并下载';
    }
  }

  function downloadPdf(bytes, name) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}
/* ============ PDF → Word ============ */
const PDF_WORD = { file: null, total: 0 };

function renderPdfWord(container) {
  PDF_WORD.file = null;
  PDF_WORD.total = 0;
  container.innerHTML = '';
  container.appendChild(UI.el('div', { class: 'page-head' }, [
    UI.el('h1', { class: 'page-title' }, 'PDF → Word'),
    UI.el('button', { class: 'btn sm ghost', onclick: () => render(container) }, '← 返回工具列表')
  ]));

  let pptx = null;
  const card = UI.el('div', { class: 'card pdf-panel' });
  card.appendChild(UI.el('div', { class: 'pdf-level-bar' }, [
    UI.el('span', { class: 'pdf-level gold' }, '≤10MB 黄金区间'),
    UI.el('span', { class: 'pdf-level ok' }, '10~25MB 舒适'),
    UI.el('span', { class: 'pdf-level caution' }, '25~50MB 谨慎'),
    UI.el('span', { class: 'pdf-level no' }, '50~100MB 不推荐'),
    UI.el('span', { class: 'pdf-level block' }, '>100MB 拒绝上传')
  ]));

  const input = UI.el('input', { type: 'file', accept: '.pdf,application/pdf', id: 'pdf-word-input', style: 'display:none' });
  input.addEventListener('change', () => { loadFile(input.files[0]); input.value = ''; });
  const drop = UI.el('div', { class: 'pdf-drop', id: 'pdf-word-drop', onclick: () => input.click() }, [
    UI.el('div', { class: 'pdf-drop-ico' }, '📄'),
    UI.el('div', { class: 'pdf-drop-txt' }, '点击选择或拖拽一个 PDF 到此处'),
    UI.el('div', { class: 'muted sm' }, '单个文件超过 100MB 将被拒绝')
  ]);
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', e => {
    e.preventDefault(); drop.classList.remove('over');
    if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
  });
  card.appendChild(input);
  card.appendChild(drop);

  const fileInfo = UI.el('div', { class: 'pdf-file-info', id: 'pdf-word-info', style: 'display:none' });
  card.appendChild(fileInfo);

  const opts = UI.el('div', { class: 'pdf-options' });
  const imgCheck = UI.el('input', { type: 'checkbox', id: 'pdf-word-images', checked: true });
  const qSel = UI.selectInput([
    ['1', '低（100%）'],
    ['1.5', '中（150%，推荐）'],
    ['2', '高（200%）']
  ], '1.5', { id: 'pdf-word-quality' });
  imgCheck.addEventListener('change', () => { qSel.disabled = !imgCheck.checked; });
  qSel.disabled = false;
  opts.appendChild(UI.el('label', { class: 'pdf-opt-line' }, [
    imgCheck,
    UI.el('span', {}, '包含页面图片（保留版面视觉）')
  ]));
  opts.appendChild(UI.el('div', { class: 'pdf-opt-line' }, [
    UI.el('span', { class: 'muted' }, '图片清晰度：'),
    qSel
  ]));
  opts.appendChild(UI.el('div', { class: 'pdf-tip muted sm' }, '说明：文字按页面顺序提取为可编辑段落，并附上页面快照。复杂表格/分栏/公式可能出现错位，属内容提取而非版式还原。'));
  card.appendChild(opts);

  const btn = UI.el('button', { class: 'btn primary lg', id: 'pdf-word-btn', disabled: true, onclick: () => convertToWord() }, '📝 转换为 Word');
  card.appendChild(UI.el('div', { class: 'pdf-actions' }, btn));
  const preview = UI.el('div', { class: 'pdf-preview muted sm', id: 'pdf-word-preview' }, '');
  card.appendChild(preview);
  container.appendChild(card);

  function resetFile() {
    PDF_WORD.file = null;
    PDF_WORD.total = 0;
    fileInfo.style.display = 'none';
    fileInfo.innerHTML = '';
    preview.textContent = '';
    btn.disabled = true;
  }

  async function loadFile(f) {
    if (!f) return;
    if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') { UI.toast('「' + f.name + '」不是 PDF 文件', 'warn'); return; }
    const lv = U.pdfSizeLevel(f.size);
    if (lv.block) { UI.toast('「' + f.name + '」超过 100MB，不允许上传', 'error'); return; }
    drop.classList.add('over');
    try {
      if (!global.PDFLib) throw new Error('PDF 处理库未加载');
      const bytes = await f.arrayBuffer();
      const doc = await global.PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
      PDF_WORD.file = f;
      PDF_WORD.total = doc.getPageCount();
      fileInfo.style.display = '';
      fileInfo.innerHTML = '';
      fileInfo.appendChild(UI.el('span', { class: 'pdf-name' }, f.name));
      fileInfo.appendChild(UI.el('span', { class: 'pdf-meta' }, [
        fmtSize(f.size),
        UI.el('span', { class: 'pdf-badge ' + lv.level }, lv.label),
        UI.el('span', {}, '共 ' + PDF_WORD.total + ' 页')
      ]));
      fileInfo.appendChild(UI.el('button', { class: 'btn sm danger', id: 'pdf-word-clear', onclick: () => resetFile() }, '删除'));
      preview.textContent = '将转换 ' + PDF_WORD.total + ' 页为 Word 文档';
      btn.disabled = false;
      UI.toast('已载入，共 ' + PDF_WORD.total + ' 页', 'success');
    } catch (err) {
      PDF_WORD.file = null;
      PDF_WORD.total = 0;
      resetFile();
      UI.toast('「' + f.name + '」读取失败（可能已加密或损坏）', 'error');
    } finally {
      drop.classList.remove('over');
    }
  }

  async function convertToWord() {
    if (!PDF_WORD.file) { UI.toast('请先上传 PDF 文件', 'warn'); return; }
    if (!global.pdfjsLib || !global.docx) { UI.toast('转换组件未加载，请刷新页面后重试', 'error'); return; }
    const { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel } = global.docx;
    const includeImages = imgCheck.checked;
    const scale = parseFloat(qSel.value) || 1.5;
    btn.disabled = true;
    try {
      global.pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/lib/pdf.worker.min.js';
      const bytes = await PDF_WORD.file.arrayBuffer();
      const pdf = await global.pdfjsLib.getDocument({ data: bytes }).promise;
      const children = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        btn.textContent = '⏳ 正在处理第 ' + i + '/' + pdf.numPages + ' 页…';
        const page = await pdf.getPage(i);
        children.push(new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun('第 ' + i + ' 页')]
        }));
        try {
          const content = await page.getTextContent();
          const lines = U.groupTextItems(content.items);
          if (lines.length) {
            children.push(new Paragraph({ children: [new TextRun('【文字内容】')], spacing: { after: 60 } }));
            lines.forEach(line => {
              children.push(new Paragraph({ children: [new TextRun(line || ' ')] }));
            });
          }
        } catch (e) { /* 文本提取失败则仅保留图片 */ }
        if (includeImages) {
          const viewport = page.getViewport({ scale: scale });
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.floor(viewport.width));
          canvas.height = Math.max(1, Math.floor(viewport.height));
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport: viewport }).promise;
          const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.85));
          const buf = await blob.arrayBuffer();
          children.push(new Paragraph({ children: [new ImageRun({
            type: 'jpg',
            data: buf,
            transformation: {
              width: Math.round(viewport.width * 9525),
              height: Math.round(viewport.height * 9525)
            }
          })] }));
        }
        children.push(new Paragraph({ children: [new TextRun('')] }));
      }
      const doc = new Document({ sections: [{ children: children }] });
      const blob = await Packer.toBlob(doc);
      const base = (PDF_WORD.file.name.replace(/\.pdf$/i, '') || 'pdf');
      downloadBlob(blob, base + '-转Word.docx');
      UI.toast('转换完成，共 ' + pdf.numPages + ' 页', 'success');
    } catch (err) {
      UI.toast('转换失败：' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '📝 转换为 Word';
    }
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}
/* ============ PDF → PPT ============ */
const PDF_PPT = { file: null, total: 0 };

function renderPdfPpt(container) {
  PDF_PPT.file = null;
  PDF_PPT.total = 0;
  container.innerHTML = '';
  container.appendChild(UI.el('div', { class: 'page-head' }, [
    UI.el('h1', { class: 'page-title' }, 'PDF → PPT'),
    UI.el('button', { class: 'btn sm ghost', onclick: () => render(container) }, '← 返回工具列表')
  ]));

  let pptx = null;
  const card = UI.el('div', { class: 'card pdf-panel' });
  card.appendChild(UI.el('div', { class: 'pdf-level-bar' }, [
    UI.el('span', { class: 'pdf-level gold' }, '≤10MB 黄金区间'),
    UI.el('span', { class: 'pdf-level ok' }, '10~25MB 舒适'),
    UI.el('span', { class: 'pdf-level caution' }, '25~50MB 谨慎'),
    UI.el('span', { class: 'pdf-level no' }, '50~100MB 不推荐'),
    UI.el('span', { class: 'pdf-level block' }, '>100MB 拒绝上传')
  ]));

  const input = UI.el('input', { type: 'file', accept: '.pdf,application/pdf', id: 'pdf-ppt-input', style: 'display:none' });
  input.addEventListener('change', () => { loadFile(input.files[0]); input.value = ''; });
  const drop = UI.el('div', { class: 'pdf-drop', id: 'pdf-ppt-drop', onclick: () => input.click() }, [
    UI.el('div', { class: 'pdf-drop-ico' }, '📄'),
    UI.el('div', { class: 'pdf-drop-txt' }, '点击选择或拖拽一个 PDF 到此处'),
    UI.el('div', { class: 'muted sm' }, '单个文件超过 100MB 将被拒绝')
  ]);
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', e => {
    e.preventDefault(); drop.classList.remove('over');
    if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
  });
  card.appendChild(input);
  card.appendChild(drop);

  const fileInfo = UI.el('div', { class: 'pdf-file-info', id: 'pdf-ppt-info', style: 'display:none' });
  card.appendChild(fileInfo);

  const opts = UI.el('div', { class: 'pdf-options' });
  const ratioSel = UI.selectInput([
    ['WIDE', '16:9 宽屏（推荐）'],
    ['STD', '4:3 标准']
  ], 'WIDE', { id: 'pdf-ppt-ratio' });
  const qSel = UI.selectInput([
    ['1', '低（100%）'],
    ['1.5', '中（150%，推荐）'],
    ['2', '高（200%）']
  ], '1.5', { id: 'pdf-ppt-quality' });
  const notesCheck = UI.el('input', { type: 'checkbox', id: 'pdf-ppt-notes', checked: true });
  opts.appendChild(UI.el('div', { class: 'pdf-opt-line' }, [
    UI.el('span', { class: 'muted' }, '幻灯片尺寸：'),
    ratioSel
  ]));
  opts.appendChild(UI.el('div', { class: 'pdf-opt-line' }, [
    UI.el('span', { class: 'muted' }, '页面清晰度：'),
    qSel
  ]));
  opts.appendChild(UI.el('label', { class: 'pdf-opt-line' }, [
    notesCheck,
    UI.el('span', {}, '把每页文字放入 PPT 备注（便于检索，不占版面）')
  ]));
  opts.appendChild(UI.el('div', { class: 'pdf-tip muted sm' }, '说明：每页 PDF 渲染为一张幻灯片图片（视觉保真）。文字以备注形式附在对应页，版面本身不可编辑。'));
  card.appendChild(opts);

  const btn = UI.el('button', { class: 'btn primary lg', id: 'pdf-ppt-btn', disabled: true, onclick: () => convertToPpt() }, '📊 转换为 PPT');
  card.appendChild(UI.el('div', { class: 'pdf-actions' }, btn));
  const preview = UI.el('div', { class: 'pdf-preview muted sm', id: 'pdf-ppt-preview' }, '');
  card.appendChild(preview);
  container.appendChild(card);

  function resetFile() {
    PDF_PPT.file = null;
    PDF_PPT.total = 0;
    fileInfo.style.display = 'none';
    fileInfo.innerHTML = '';
    preview.textContent = '';
    btn.disabled = true;
  }

  async function loadFile(f) {
    if (!f) return;
    if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') { UI.toast('「' + f.name + '」不是 PDF 文件', 'warn'); return; }
    const lv = U.pdfSizeLevel(f.size);
    if (lv.block) { UI.toast('「' + f.name + '」超过 100MB，不允许上传', 'error'); return; }
    drop.classList.add('over');
    try {
      if (!global.PDFLib) throw new Error('PDF 处理库未加载');
      const bytes = await f.arrayBuffer();
      const doc = await global.PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
      PDF_PPT.file = f;
      PDF_PPT.total = doc.getPageCount();
      fileInfo.style.display = '';
      fileInfo.innerHTML = '';
      fileInfo.appendChild(UI.el('span', { class: 'pdf-name' }, f.name));
      fileInfo.appendChild(UI.el('span', { class: 'pdf-meta' }, [
        fmtSize(f.size),
        UI.el('span', { class: 'pdf-badge ' + lv.level }, lv.label),
        UI.el('span', {}, '共 ' + PDF_PPT.total + ' 页')
      ]));
      fileInfo.appendChild(UI.el('button', { class: 'btn sm danger', id: 'pdf-ppt-clear', onclick: () => resetFile() }, '删除'));
      preview.textContent = '将转换 ' + PDF_PPT.total + ' 页为 PPT（每页一张幻灯片）';
      btn.disabled = false;
      UI.toast('已载入，共 ' + PDF_PPT.total + ' 页', 'success');
    } catch (err) {
      resetFile();
      UI.toast('「' + f.name + '」读取失败（可能已加密或损坏）', 'error');
    } finally {
      drop.classList.remove('over');
    }
  }

  async function convertToPpt() {
    if (!PDF_PPT.file) { UI.toast('请先上传 PDF 文件', 'warn'); return; }
    if (!global.pdfjsLib || !global.PptxGenJS) { UI.toast('转换组件未加载，请刷新页面后重试', 'error'); return; }
    const ratio = ratioSel.value;
    const scale = parseFloat(qSel.value) || 1.5;
    const withNotes = notesCheck.checked;
    btn.disabled = true;
    try {
      global.pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/lib/pdf.worker.min.js';
      const bytes = await PDF_PPT.file.arrayBuffer();
      const pdf = await global.pdfjsLib.getDocument({ data: bytes }).promise;
      const PptxGenJS = global.PptxGenJS;
      const pptx = new PptxGenJS();
      const slideW = ratio === 'STD' ? 10 : 13.33;
      const slideH = 7.5;
      pptx.defineLayout({ name: ratio, width: slideW, height: slideH });
      pptx.layout = ratio;
      const maxW = slideW - 0.8;
      const maxH = slideH - 1.0;
      for (let i = 1; i <= pdf.numPages; i++) {
        btn.textContent = '⏳ 正在渲染第 ' + i + '/' + pdf.numPages + ' 页…';
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const inchW = viewport.width / 96;
        const inchH = viewport.height / 96;
        const fit = Math.min(maxW / inchW, maxH / inchH);
        const w = inchW * fit;
        const h = inchH * fit;
        const slide = pptx.addSlide();
        slide.addImage({
          data: dataUrl,
          x: (slideW - w) / 2,
          y: (slideH - h) / 2,
          w: w,
          h: h
        });
        if (withNotes) {
          try {
            const content = await page.getTextContent();
            const lines = U.groupTextItems(content.items);
            slide.addNotes(lines.join('\n') || '（本页无可提取文字）');
          } catch (e) { slide.addNotes('（本页文字提取失败）'); }
        }
      }
      btn.textContent = '⏳ 正在打包 PPT…';
      const base = (PDF_PPT.file.name.replace(/\.pdf$/i, '') || 'pdf');
      await pptx.writeFile({ fileName: base + '-转PPT.pptx' });
      UI.toast('转换完成，共 ' + pdf.numPages + ' 页', 'success');
    } catch (err) {
      UI.toast('转换失败：' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '📊 转换为 PPT';
    }
  }
}
/* ============ PPT 美化 ============ */
const PPT_TEMPLATES = [
  { id: 'stellium', name: '星夜蓝紫', bg: '0D1B3E', accent: '7AA2FF', title: 'FFFFFF', text: 'E8ECFF', sub: '9FB0E0' },
  { id: 'business', name: '商务深蓝', bg: '10294B', accent: '4DA3FF', title: 'FFFFFF', text: 'F0F6FF', sub: '9CC2E8' },
  { id: 'warm', name: '简约暖灰', bg: 'F6F4F1', accent: 'D97706', title: '1F2937', text: '374151', sub: '6B7280' }
];
const PPT_BEAUTIFY = { file: null, parsed: null, tpl: 'stellium' };

function renderPptBeautify(container) {
  PPT_BEAUTIFY.file = null;
  PPT_BEAUTIFY.parsed = null;
  PPT_BEAUTIFY.tpl = 'stellium';
  container.innerHTML = '';
  container.appendChild(UI.el('div', { class: 'page-head' }, [
    UI.el('h1', { class: 'page-title' }, 'PPT 美化'),
    UI.el('button', { class: 'btn sm ghost', onclick: () => render(container) }, '← 返回工具列表')
  ]));

  let pptx = null;
  const card = UI.el('div', { class: 'card pdf-panel' });
  card.appendChild(UI.el('div', { class: 'pdf-level-bar' }, [
    UI.el('span', { class: 'pdf-level gold' }, '≤10MB 黄金区间'),
    UI.el('span', { class: 'pdf-level ok' }, '10~25MB 舒适'),
    UI.el('span', { class: 'pdf-level caution' }, '25~50MB 谨慎'),
    UI.el('span', { class: 'pdf-level no' }, '50~100MB 不推荐'),
    UI.el('span', { class: 'pdf-level block' }, '>100MB 拒绝上传')
  ]));

  const input = UI.el('input', { type: 'file', accept: '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation', id: 'ppt-beautify-input', style: 'display:none' });
  input.addEventListener('change', () => { loadFile(input.files[0]); input.value = ''; });
  const drop = UI.el('div', { class: 'pdf-drop', id: 'ppt-beautify-drop', onclick: () => input.click() }, [
    UI.el('div', { class: 'pdf-drop-ico' }, '🎨'),
    UI.el('div', { class: 'pdf-drop-txt' }, '点击选择或拖拽一个 PPTX 到此处'),
    UI.el('div', { class: 'muted sm' }, '单个文件超过 100MB 将被拒绝')
  ]);
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', e => {
    e.preventDefault(); drop.classList.remove('over');
    if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
  });
  card.appendChild(input);
  card.appendChild(drop);

  const fileInfo = UI.el('div', { class: 'pdf-file-info', id: 'ppt-beautify-info', style: 'display:none' });
  card.appendChild(fileInfo);
  const parseInfo = UI.el('div', { class: 'pdf-preview muted sm', id: 'ppt-beautify-parse' }, '');
  card.appendChild(parseInfo);

  const opts = UI.el('div', { class: 'pdf-options' });
  const tplBar = UI.el('div', { class: 'ppt-tpl-bar', id: 'ppt-beautify-tpls' });
  const tplBtns = PPT_TEMPLATES.map(t => UI.el('button', {
    class: 'btn sm ppt-tpl-btn' + (t.id === PPT_BEAUTIFY.tpl ? ' active' : ''),
    dataset: { tpl: t.id },
    onclick: () => {
      PPT_BEAUTIFY.tpl = t.id;
      tplBtns.forEach(b => b.classList.toggle('active', b.dataset.tpl === t.id));
    }
  }, t.name));
  tplBtns.forEach(b => tplBar.appendChild(b));
  opts.appendChild(UI.el('div', { class: 'pdf-opt-line' }, [
    UI.el('span', { class: 'muted' }, '美化模板：'),
    tplBar
  ]));
  opts.appendChild(UI.el('div', { class: 'pdf-tip muted sm' }, '说明：自动提取每页文字与图片，统一套用模板重新排版（封面/内容/图文/纯图四类版式）。原精细版式、动画与图表不会保留，适合文字/图文型 PPT。'));
  card.appendChild(opts);

  const btn = UI.el('button', { class: 'btn primary lg', id: 'ppt-beautify-btn', disabled: true, onclick: () => generateBeautified() }, '🎨 生成美化 PPT');
  card.appendChild(UI.el('div', { class: 'pdf-actions' }, btn));
  container.appendChild(card);

  function resetFile() {
    PPT_BEAUTIFY.file = null;
    PPT_BEAUTIFY.parsed = null;
    fileInfo.style.display = 'none';
    fileInfo.innerHTML = '';
    parseInfo.textContent = '';
    btn.disabled = true;
  }

  async function loadFile(f) {
    if (!f) return;
    if (!/\.pptx$/i.test(f.name)) { UI.toast('「' + f.name + '」不是 PPTX 文件', 'warn'); return; }
    const lv = U.pdfSizeLevel(f.size);
    if (lv.block) { UI.toast('「' + f.name + '」超过 100MB，不允许上传', 'error'); return; }
    drop.classList.add('over');
    try {
      if (!global.JSZip || !global.PptxGenJS) throw new Error('PPT 组件未加载');
      const parsed = await parsePptxFile(f);
      if (!parsed.slides.length) throw new Error('未找到任何幻灯片页');
      PPT_BEAUTIFY.file = f;
      PPT_BEAUTIFY.parsed = parsed;
      fileInfo.style.display = '';
      fileInfo.innerHTML = '';
      fileInfo.appendChild(UI.el('span', { class: 'pdf-name' }, f.name));
      fileInfo.appendChild(UI.el('span', { class: 'pdf-meta' }, [
        fmtSize(f.size),
        UI.el('span', { class: 'pdf-badge ' + lv.level }, lv.label),
        UI.el('span', {}, '共 ' + parsed.slides.length + ' 页')
      ]));
      fileInfo.appendChild(UI.el('button', { class: 'btn sm danger', id: 'ppt-beautify-clear', onclick: () => resetFile() }, '删除'));
      const textCount = parsed.slides.reduce((s, x) => s + x.texts.length, 0);
      const imgCount = parsed.slides.reduce((s, x) => s + x.images.length, 0);
      parseInfo.textContent = '解析完成：提取文字 ' + textCount + ' 段、图片 ' + imgCount + ' 张';
      btn.disabled = false;
      UI.toast('已载入并解析，共 ' + parsed.slides.length + ' 页', 'success');
    } catch (err) {
      resetFile();
      UI.toast('「' + f.name + '」解析失败（' + (err.message || '文件可能已损坏') + '）', 'error');
    } finally {
      drop.classList.remove('over');
    }
  }

  async function parsePptxFile(f) {
    const bytes = await f.arrayBuffer();
    const zip = await global.JSZip.loadAsync(bytes);
    const re = /^ppt\/slides\/slide(\d+)\.xml$/;
    const names = Object.keys(zip.files).filter(n => re.test(n) && !zip.files[n].dir)
      .sort((a, b) => parseInt(a.match(re)[1], 10) - parseInt(b.match(re)[1], 10));
    const slides = [];
    for (const name of names) {
      const xml = await zip.file(name).async('string');
      const doc = new DOMParser().parseFromString(xml, 'application/xml');
      const paras = doc.getElementsByTagName('a:p');
      const texts = [];
      for (const p of paras) {
        const parts = p.getElementsByTagName('a:t');
        let line = '';
        for (const t of parts) line += t.textContent;
        if (line.trim()) texts.push(line.trim());
      }
      const blips = doc.getElementsByTagName('a:blip');
      const rids = [];
      for (const b of blips) {
        const rid = b.getAttribute('r:embed') || b.getAttribute('r:link');
        if (rid) rids.push(rid);
      }
      const images = [];
      if (rids.length) {
        const m = name.match(/^ppt\/slides\/(slide\d+)\.xml$/);
        const relsName = 'ppt/slides/_rels/' + m[1] + '.xml.rels';
        const relsXml = zip.file(relsName) ? await zip.file(relsName).async('string') : '';
        const relMap = {};
        if (relsXml) {
          const rdoc = new DOMParser().parseFromString(relsXml, 'application/xml');
          const rels = rdoc.getElementsByTagName('Relationship');
          for (const r of rels) relMap[r.getAttribute('Id')] = r.getAttribute('Target');
        }
        for (const rid of rids) {
          const target = relMap[rid];
          if (!target) continue;
          const mediaPath = 'ppt/media/' + target.split('/').pop();
          const fz = zip.file(mediaPath);
          if (!fz) continue;
          const b64 = await fz.async('base64');
          const ext = (mediaPath.split('.').pop() || 'png').toLowerCase();
          const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'gif' ? 'image/gif' : 'image/png';
          images.push({ dataUrl: 'data:' + mime + ';base64,' + b64 });
        }
      }
      slides.push({ texts: texts, images: images });
    }
    return { slides: slides };
  }

  function addBg(tmpl) {
    const s = pptx.addSlide();
    s.background = { color: tmpl.bg };
    s.addShape('rect', { x: 0, y: 0, w: 0.14, h: 7.5, fill: { color: tmpl.accent } });
    return s;
  }

  function addFooter(s, pageNo, total, tmpl) {
    s.addText(String(pageNo) + ' / ' + String(total), { x: 11.6, y: 7.05, w: 1.4, h: 0.3, fontSize: 11, color: tmpl.sub, align: 'right', fontFace: 'Microsoft YaHei' });
  }

  function bodyTexts(body, tmpl) {
    return body.map(line => ({ text: line, options: { fontSize: 16, color: tmpl.text, breakLine: true, bullet: { code: '2022' } } }));
  }

  async function generateBeautified() {
    if (!PPT_BEAUTIFY.file || !PPT_BEAUTIFY.parsed) { UI.toast('请先上传并解析 PPTX 文件', 'warn'); return; }
    const tmpl = PPT_TEMPLATES.find(t => t.id === PPT_BEAUTIFY.tpl) || PPT_TEMPLATES[0];
    btn.disabled = true;
    pptx = new global.PptxGenJS();
    pptx.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 });
    pptx.layout = 'WIDE';
    try {
      const slides = PPT_BEAUTIFY.parsed.slides;
      const total = slides.length;
      for (let i = 0; i < total; i++) {
        btn.textContent = '⏳ 正在美化第 ' + (i + 1) + '/' + total + ' 页…';
        await renderSlide(slides[i], i, total, tmpl);
      }
      btn.textContent = '⏳ 正在打包…';
      const base = (PPT_BEAUTIFY.file.name.replace(/\.pptx$/i, '') || 'ppt');
      await pptx.writeFile({ fileName: base + '-美化.pptx' });
      UI.toast('美化完成，共 ' + total + ' 页', 'success');
    } catch (err) {
      UI.toast('美化失败：' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '🎨 生成美化 PPT';
    }
  }

  function renderSlide(slide, idx, total, tmpl) {
    const isCover = idx === 0;
    if (isCover) {
      const s = addBg(tmpl);
      const pick = U.pickCoverTexts(slide.texts);
      s.addText(pick.title || '未命名演示文稿', { x: 1.2, y: 2.2, w: 11, h: 1.8, fontSize: 40, bold: true, color: tmpl.title, fontFace: 'Microsoft YaHei' });
      s.addShape('rect', { x: 1.3, y: 4.0, w: 1.6, h: 0.08, fill: { color: tmpl.accent } });
      if (pick.subtitle) s.addText(pick.subtitle, { x: 1.2, y: 4.3, w: 11, h: 1.0, fontSize: 18, color: tmpl.sub, fontFace: 'Microsoft YaHei' });
      if (slide.images.length) s.addImage({ data: slide.images[0].dataUrl, x: 8.4, y: 1.8, w: 3.6, h: 3.9, sizing: { type: 'contain', w: 3.6, h: 3.9 } });
      addFooter(s, idx + 1, total, tmpl);
    } else if (slide.images.length && !slide.texts.length) {
      const s = addBg(tmpl);
      s.addImage({ data: slide.images[0].dataUrl, x: 0.7, y: 0.7, w: 11.9, h: 6.1, sizing: { type: 'contain', w: 11.9, h: 6.1 } });
      addFooter(s, idx + 1, total, tmpl);
    } else if (slide.images.length) {
      const s = addBg(tmpl);
      const pick = U.pickContentParts(slide.texts);
      s.addText(pick.title || '（无标题）', { x: 0.9, y: 0.55, w: 11.5, h: 0.9, fontSize: 28, bold: true, color: tmpl.accent, fontFace: 'Microsoft YaHei' });
      s.addShape('rect', { x: 0.95, y: 1.45, w: 1.3, h: 0.06, fill: { color: tmpl.accent } });
      s.addImage({ data: slide.images[0].dataUrl, x: 7.5, y: 1.9, w: 4.8, h: 4.4, sizing: { type: 'contain', w: 4.8, h: 4.4 } });
      if (pick.body.length) s.addText(bodyTexts(pick.body, tmpl), { x: 0.95, y: 1.95, w: 6.0, h: 4.3, fontFace: 'Microsoft YaHei', valign: 'top' });
      addFooter(s, idx + 1, total, tmpl);
    } else {
      const s = addBg(tmpl);
      const pick = U.pickContentParts(slide.texts);
      s.addText(pick.title || '（无标题）', { x: 0.9, y: 0.55, w: 11.5, h: 0.9, fontSize: 28, bold: true, color: tmpl.accent, fontFace: 'Microsoft YaHei' });
      s.addShape('rect', { x: 0.95, y: 1.45, w: 1.3, h: 0.06, fill: { color: tmpl.accent } });
      if (pick.body.length) s.addText(bodyTexts(pick.body, tmpl), { x: 0.95, y: 1.95, w: 11.4, h: 4.6, fontFace: 'Microsoft YaHei', valign: 'top' });
      addFooter(s, idx + 1, total, tmpl);
    }
  }
}
global.Stellarium.Router.register('tools', render, '实用小工具');
})(typeof window !== 'undefined' ? window : globalThis);