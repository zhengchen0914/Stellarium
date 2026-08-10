/* 星隅 健身计划：周计划 / 训练记录 / 身体数据 */
(function (global) {
  'use strict';
  const U = global.Stellarium.Utils;
  const UI = global.Stellarium.UI;
  const Calc = global.Stellarium.Calc;
  const Charts = global.Stellarium.Charts;
  const store = () => global.Stellarium.store;

  let state = { tab: 'plans', weekStart: U.weekStart(U.todayStr()), month: U.monthKey(U.todayStr()) };
  let contentBox = null;

  function render(container) {
    container.innerHTML = '';
    container.appendChild(UI.el('div', { class: 'page-head' }, [
      UI.el('h1', { class: 'page-title' }, '健身计划'),
      UI.el('div', { class: 'page-sub' }, '周计划 · 训练记录 · 身体数据')
    ]));
    const tabBox = UI.el('div');
    container.appendChild(tabBox);
    UI.tabs(tabBox, [
      { id: 'plans', label: '周计划' },
      { id: 'workouts', label: '训练记录' },
      { id: 'body', label: '身体数据' }
    ], state.tab, switchTab);
    contentBox = UI.el('div');
    container.appendChild(contentBox);
    renderTab();
  }

  function switchTab(tab) {
    state.tab = tab;
    const bar = document.querySelector('#main-content .tabs');
    if (bar) bar.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    renderTab();
  }

  function renderTab() {
    if (!contentBox) return;
    contentBox.innerHTML = '';
    if (state.tab === 'plans') renderPlans();
    else if (state.tab === 'workouts') renderWorkouts();
    else renderBody();
  }

  /* ============ 周计划 ============ */
  const DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  function getPlan() {
    return store().all('weeklyPlans').find(p => p.weekStart === state.weekStart);
  }

  function renderPlans() {
    const box = contentBox;
    const weekEnd = U.addDays(state.weekStart, 6);
    const bar = UI.el('div', { style: 'display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap' });
    bar.appendChild(UI.el('button', { class: 'btn sm', onclick: () => { state.weekStart = U.addDays(state.weekStart, -7); renderTab(); } }, '← 上周'));
    bar.appendChild(UI.el('b', {}, state.weekStart.slice(5) + ' ~ ' + weekEnd.slice(5)));
    bar.appendChild(UI.el('button', { class: 'btn sm', onclick: () => { state.weekStart = U.addDays(state.weekStart, 7); renderTab(); } }, '下周 →'));
    bar.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: () => { state.weekStart = U.weekStart(U.todayStr()); renderTab(); } }, '本周'));
    bar.appendChild(UI.el('button', { class: 'btn sm primary', style: 'margin-left:auto', onclick: copyWeek }, '复制本周 → 下周'));
    box.appendChild(bar);

    const plan = getPlan();
    const days = plan ? plan.days : new Array(7).fill('');
    const grid = UI.el('div', { class: 'week-grid' });
    DAY_NAMES.forEach((name, i) => {
      const cell = UI.el('div', { class: 'week-cell', onclick: () => editDay(i) });
      const date = U.addDays(state.weekStart, i);
      cell.appendChild(UI.el('div', { class: 'w-day' }, name + ' ' + date.slice(5) + (date === U.todayStr() ? ' · 今天' : '')));
      cell.appendChild(UI.el('div', { class: 'w-content' }, days[i] || '（未安排）'));
      grid.appendChild(cell);
    });
    box.appendChild(grid);
  }

  function editDay(index) {
    const plan = getPlan();
    const days = plan ? plan.days.slice() : new Array(7).fill('');
    const input = UI.el('textarea', { placeholder: '训练内容，如：胸 + 三头（每行一项）' });
    input.value = days[index] || '';
    const body = UI.el('div', {});
    body.appendChild(UI.field(DAY_NAMES[index] + ' 训练内容', input));
    const actions = UI.el('div', { class: 'actions' });
    const m = UI.modal('编辑 ' + DAY_NAMES[index], body);
    actions.appendChild(UI.el('button', { class: 'btn ghost', onclick: () => m.close() }, '取消'));
    actions.appendChild(UI.el('button', { class: 'btn primary', onclick: save }, '保存'));
    body.appendChild(actions);

    async function save() {
      days[index] = input.value.trim();
      if (plan) await store().update('weeklyPlans', plan.id, { days });
      else await store().add('weeklyPlans', { weekStart: state.weekStart, days });
      m.close(); renderTab();
      UI.toast('已保存', 'success');
    }
  }

  async function copyWeek() {
    const plan = getPlan();
    if (!plan) { UI.toast('本周还没有内容可复制', 'info'); return; }
    const nextStart = U.addDays(state.weekStart, 7);
    const next = store().all('weeklyPlans').find(p => p.weekStart === nextStart);
    const hasNext = next && next.days.some(d => d);
    const ok = await UI.confirmDialog({
      title: '复制到下周',
      message: '将本周计划复制到 ' + nextStart.slice(5) + ' 那一周？' + (hasNext ? '（下周已有内容将被覆盖）' : ''),
      confirmText: '复制', danger: hasNext
    });
    if (!ok) return;
    if (next) await store().update('weeklyPlans', next.id, { days: plan.days.slice() });
    else await store().add('weeklyPlans', { weekStart: nextStart, days: plan.days.slice() });
    UI.toast('已复制到下周', 'success');
  }

  /* ============ 训练记录 ============ */
  function renderWorkouts() {
    const box = contentBox;
    const bar = UI.el('div', { style: 'display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap' });
    bar.appendChild(UI.el('button', { class: 'btn sm', onclick: () => { state.month = U.addMonths(state.month, -1); renderTab(); } }, '← 上月'));
    bar.appendChild(UI.el('b', {}, state.month.replace('-', ' 年 ') + ' 月'));
    bar.appendChild(UI.el('button', { class: 'btn sm', onclick: () => { state.month = U.addMonths(state.month, 1); renderTab(); } }, '下月 →'));
    bar.appendChild(UI.el('button', { class: 'btn sm primary', style: 'margin-left:auto', onclick: () => openWorkoutModal() }, '＋ 新增记录'));
    box.appendChild(bar);

    const workouts = store().all('workouts').filter(w => U.monthKey(w.date) === state.month).sort((a, b) => b.date.localeCompare(a.date));
    if (!workouts.length) {
      box.appendChild(UI.emptyState('🏋', '这个月还没有训练记录', '记一次训练', () => openWorkoutModal()));
      return;
    }
    const groups = {};
    workouts.forEach(w => { (groups[w.date] = groups[w.date] || []).push(w); });
    for (const date of Object.keys(groups).sort().reverse()) {
      box.appendChild(UI.el('div', { class: 'group-label' }, date + ' · ' + groups[date].length + ' 项'));
      groups[date].forEach(w => box.appendChild(workoutRow(w)));
    }
  }

  function workoutRow(w) {
    const row = UI.el('div', { class: 'list-item' });
    const body = UI.el('div', { class: 'grow' });
    body.appendChild(UI.el('div', { class: 'title' }, w.exercise));
    const subs = [];
    if (w.sets) subs.push(w.sets + ' 组');
    if (w.reps) subs.push(w.reps + ' 次');
    if (w.weight) subs.push(w.weight + ' kg');
    body.appendChild(UI.el('div', { class: 'sub' }, subs.join(' · ') || w.date));
    row.appendChild(body);
    row.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: () => openWorkoutModal(w) }, '编辑'));
    row.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: () => delWorkout(w) }, '删除'));
    return row;
  }

  function openWorkoutModal(workout) {
    const isEdit = !!workout;
    const exercises = store().all('commonExercises');
    const opts = exercises.map(e => [e.id, e.name]);
    opts.push(['__custom__', '自定义动作…']);
    const exInput = UI.selectInput(opts, workout ? (exercises.find(e => e.name === workout.exercise) ? exercises.find(e => e.name === workout.exercise).id : '__custom__') : (opts[0][0]));
    const customInput = UI.textInput(workout && !exercises.some(e => e.name === workout.exercise) ? workout.exercise : '', { placeholder: '动作名称', style: 'display:none' });
    exInput.addEventListener('change', () => { customInput.style.display = exInput.value === '__custom__' ? '' : 'none'; });
    const dateInput = UI.dateInput(workout ? workout.date : U.todayStr());
    const setsInput = UI.numInput(workout ? workout.sets : '', { min: '1', step: '1', placeholder: '组数' });
    const repsInput = UI.numInput(workout ? workout.reps : '', { min: '1', step: '1', placeholder: '次数' });
    const weightInput = UI.numInput(workout ? workout.weight : '', { min: '0', step: '0.5', placeholder: '重量 kg' });
    const body = UI.el('div', {});
    body.appendChild(UI.field('动作', exInput));
    body.appendChild(UI.field('自定义动作', customInput));
    body.appendChild(UI.field('日期', dateInput));
    body.appendChild(UI.el('div', { class: 'row' }, [UI.field('组数', setsInput), UI.field('次数', repsInput), UI.field('重量', weightInput)]));
    const actions = UI.el('div', { class: 'actions' });
    const m = UI.modal(isEdit ? '编辑训练记录' : '新增训练记录', body);
    actions.appendChild(UI.el('button', { class: 'btn ghost', onclick: () => m.close() }, '取消'));
    actions.appendChild(UI.el('button', { class: 'btn primary', onclick: save }, '保存'));
    body.appendChild(actions);

    async function save() {
      const exercise = exInput.value === '__custom__' ? customInput.value.trim() : (exercises.find(e => e.id === exInput.value) || {}).name;
      if (!exercise) { UI.toast('请填写动作名称', 'error'); return; }
      const payload = {
        exercise,
        date: dateInput.value,
        sets: Number(setsInput.value) || 0,
        reps: Number(repsInput.value) || 0,
        weight: Number(weightInput.value) || 0
      };
      if (exInput.value === '__custom__' && customInput.value.trim() && !exercises.some(e => e.name === exercise)) {
        await store().add('commonExercises', { name: exercise });
      }
      if (isEdit) await store().update('workouts', workout.id, payload);
      else await store().add('workouts', Object.assign({ createdAt: new Date().toISOString() }, payload));
      m.close(); renderTab();
      UI.toast('训练记录已保存', 'success');
    }
  }

  async function delWorkout(w) {
    const ok = await UI.confirmDialog({ title: '删除记录', message: '删除这条训练记录？' });
    if (!ok) return;
    await store().remove('workouts', w.id);
    renderTab();
  }

  /* ============ 身体数据 ============ */
  function renderBody() {
    const box = contentBox;
    box.appendChild(UI.el('button', { class: 'btn primary', style: 'margin-bottom:14px', onclick: () => openMetricModal() }, '＋ 新增记录'));
    const metrics = Calc.bodySeries(store().all('bodyMetrics'));
    const chartCard = UI.el('div', { class: 'card' });
    chartCard.appendChild(UI.el('div', { class: 'card-title' }, '体重 / 体脂趋势'));
    const chartBox = UI.el('div');
    chartCard.appendChild(chartBox);
    box.appendChild(chartCard);
    const listCard = UI.el('div', { class: 'card' });
    listCard.appendChild(UI.el('div', { class: 'card-title' }, '历史记录'));
    const listBox = UI.el('div');
    listCard.appendChild(listBox);
    box.appendChild(listCard);

    Charts.line(chartBox, metrics.map(m => ({ label: m.date, value: m.weight, value2: m.bodyFat })), ['value', 'value2']);
    if (!metrics.length) {
      listBox.appendChild(UI.emptyState('⚖', '还没有身体数据', '记录一次', () => openMetricModal()));
      return;
    }
    metrics.slice().reverse().forEach(m => {
      const row = UI.el('div', { class: 'list-item' });
      const body = UI.el('div', { class: 'grow' });
      body.appendChild(UI.el('div', { class: 'title' }, m.date));
      const subs = [];
      if (m.weight) subs.push('体重 ' + m.weight + ' kg');
      if (m.bodyFat) subs.push('体脂 ' + m.bodyFat + '%');
      body.appendChild(UI.el('div', { class: 'sub' }, subs.join(' · ')));
      row.appendChild(body);
      row.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: () => openMetricModal(m) }, '编辑'));
      row.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: () => delMetric(m) }, '删除'));
      listBox.appendChild(row);
    });
  }

  function openMetricModal(metric) {
    const isEdit = !!metric;
    const dateInput = UI.dateInput(metric ? metric.date : U.todayStr());
    const weightInput = UI.numInput(metric ? metric.weight : '', { min: '0', step: '0.1', placeholder: '体重 kg' });
    const fatInput = UI.numInput(metric ? metric.bodyFat : '', { min: '0', step: '0.1', placeholder: '体脂率 %' });
    const body = UI.el('div', {});
    body.appendChild(UI.field('日期', dateInput));
    body.appendChild(UI.el('div', { class: 'row' }, [UI.field('体重（kg）', weightInput), UI.field('体脂率（%）', fatInput)]));
    const actions = UI.el('div', { class: 'actions' });
    const m = UI.modal(isEdit ? '编辑身体数据' : '新增身体数据', body);
    actions.appendChild(UI.el('button', { class: 'btn ghost', onclick: () => m.close() }, '取消'));
    actions.appendChild(UI.el('button', { class: 'btn primary', onclick: save }, '保存'));
    body.appendChild(actions);

    async function save() {
      const payload = {
        date: dateInput.value,
        weight: Number(weightInput.value) || null,
        bodyFat: Number(fatInput.value) || null
      };
      if (!payload.weight && !payload.bodyFat) { UI.toast('请至少填写体重或体脂', 'error'); return; }
      if (isEdit) await store().update('bodyMetrics', metric.id, payload);
      else await store().add('bodyMetrics', payload);
      m.close(); renderTab();
      UI.toast('已保存', 'success');
    }
  }

  async function delMetric(m) {
    const ok = await UI.confirmDialog({ title: '删除记录', message: '删除 ' + m.date + ' 的身体数据？' });
    if (!ok) return;
    await store().remove('bodyMetrics', m.id);
    renderTab();
  }

  global.Stellarium.Router.register('fitness', render, '健身计划');
})(typeof window !== 'undefined' ? window : globalThis);