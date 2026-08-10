/* 星隅 饮食计划：今日饮食 / 饮食记录 / 计划模板 */
(function (global) {
  'use strict';
  const U = global.Stellarium.Utils;
  const UI = global.Stellarium.UI;
  const Calc = global.Stellarium.Calc;
  const store = () => global.Stellarium.store;

  const MEALS = ['早餐', '午餐', '晚餐', '加餐'];
  const GOALS = ['增肌', '减脂', '均衡'];

  let state = { tab: 'today', date: U.todayStr(), month: U.monthKey(U.todayStr()) };
  let contentBox = null;

  function render(container) {
    container.innerHTML = '';
    container.appendChild(UI.el('div', { class: 'page-head' }, [
      UI.el('h1', { class: 'page-title' }, '饮食计划'),
      UI.el('div', { class: 'page-sub' }, '今日饮食 · 历史记录 · 计划模板')
    ]));
    const tabBox = UI.el('div');
    container.appendChild(tabBox);
    UI.tabs(tabBox, [
      { id: 'today', label: '今日饮食' },
      { id: 'history', label: '饮食记录' },
      { id: 'templates', label: '计划模板' }
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
    if (state.tab === 'today') renderToday();
    else if (state.tab === 'history') renderHistory();
    else renderTemplates();
  }

  /* ============ 今日饮食 ============ */
  function renderToday() {
    const box = contentBox;
    const dateRow = UI.el('div', { style: 'display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap' });
    dateRow.appendChild(UI.el('button', { class: 'btn sm', onclick: () => { state.date = U.addDays(state.date, -1); renderTab(); } }, '←'));
    dateRow.appendChild(UI.el('b', {}, U.formatDateCN(state.date)));
    dateRow.appendChild(UI.el('button', { class: 'btn sm', onclick: () => { state.date = U.addDays(state.date, 1); renderTab(); } }, '→'));
    dateRow.appendChild(UI.el('input', { type: 'date', value: state.date, style: 'width:150px', onchange: e => { state.date = e.target.value; renderTab(); } }));
    box.appendChild(dateRow);

    const { total } = Calc.mealTotals(store().all('meals'), state.date);
    const totalBar = UI.el('div', { class: 'card' });
    totalBar.appendChild(UI.el('div', { class: 'budget-bar' }, [
      UI.el('div', { class: 'nums' }, '今日总热量 '),
      UI.el('b', { style: 'font-size:20px;color:var(--accent)' }, total + ' kcal'),
      UI.el('span', { class: 'muted' }, total === 0 ? '（还没有记录）' : '')
    ]));
    box.appendChild(totalBar);

    const grid = UI.el('div', { class: 'meal-grid' });
    MEALS.forEach(meal => {
      const card = UI.el('div', { class: 'meal-card' });
      const meals = store().all('meals').filter(m => m.date === state.date && m.meal === meal);
      const head = UI.el('div', { class: 'm-head' });
      head.appendChild(UI.el('span', {}, meal));
      head.appendChild(UI.el('span', { class: 'muted' }, meals.reduce((s, m) => s + (Number(m.calories) || 0), 0) + ' kcal'));
      card.appendChild(head);
      const body = UI.el('div', { class: 'm-body' });
      if (meals.length) body.textContent = meals.map(m => m.content + (m.calories ? '（' + m.calories + ' kcal）' : '')).join('\n');
      else body.appendChild(UI.el('span', { class: 'muted' }, '（未记录）'));
      card.appendChild(body);
      const ops = UI.el('div', { style: 'display:flex;gap:8px;margin-top:10px' });
      ops.appendChild(UI.el('button', { class: 'btn sm primary', onclick: () => openMealModal(meal, null) }, meals.length ? '编辑' : '记录'));
      if (meals.length) ops.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: () => clearMeals(meal) }, '清除'));
      card.appendChild(ops);
      grid.appendChild(card);
    });
    box.appendChild(grid);
  }

  async function clearMeals(meal) {
    const ok = await UI.confirmDialog({ title: '清除记录', message: '清除 ' + meal + ' 的记录？' });
    if (!ok) return;
    const list = store().all('meals').filter(m => m.date === state.date && m.meal === meal);
    for (const m of list) await store().remove('meals', m.id);
    renderTab();
  }

  function openMealModal(meal, existing) {
    const meals = existing ? [existing] : store().all('meals').filter(m => m.date === state.date && m.meal === meal);
    const contentInput = UI.el('textarea', { placeholder: '吃了什么？（必填）' });
    contentInput.value = meals.length ? meals[0].content : '';
    const calInput = UI.numInput(meals.length ? meals[0].calories : '', { min: '0', step: '1', placeholder: '热量估算 kcal（可选）' });
    const dateInput = UI.dateInput(existing ? existing.date : state.date);
    const body = UI.el('div', {});
    const contentField = UI.field(meal + ' 内容', contentInput, { errText: '请填写内容' });
    body.appendChild(contentField);
    body.appendChild(UI.el('div', { class: 'row' }, [UI.field('热量（kcal）', calInput), UI.field('日期', dateInput)]));
    const actions = UI.el('div', { class: 'actions' });
    const m = UI.modal('记录 ' + meal, body);
    actions.appendChild(UI.el('button', { class: 'btn ghost', onclick: () => m.close() }, '取消'));
    actions.appendChild(UI.el('button', { class: 'btn primary', onclick: save }, '保存'));
    body.appendChild(actions);

    async function save() {
      const content = contentInput.value.trim();
      if (!UI.validateField(contentInput, !!content)) return;
      const payload = { date: dateInput.value, meal, content, calories: Number(calInput.value) || 0 };
      if (meals.length) await store().update('meals', meals[0].id, payload);
      else await store().add('meals', payload);
      m.close(); renderTab();
      UI.toast('饮食已保存', 'success');
    }
  }

  /* ============ 饮食记录 ============ */
  function renderHistory() {
    const box = contentBox;
    const bar = UI.el('div', { style: 'display:flex;gap:8px;align-items:center;margin-bottom:14px' });
    bar.appendChild(UI.el('button', { class: 'btn sm', onclick: () => { state.month = U.addMonths(state.month, -1); renderTab(); } }, '← 上月'));
    bar.appendChild(UI.el('b', {}, state.month.replace('-', ' 年 ') + ' 月'));
    bar.appendChild(UI.el('button', { class: 'btn sm', onclick: () => { state.month = U.addMonths(state.month, 1); renderTab(); } }, '下月 →'));
    box.appendChild(bar);

    const meals = store().all('meals').filter(m => U.monthKey(m.date) === state.month).sort((a, b) => b.date.localeCompare(a.date));
    if (!meals.length) {
      box.appendChild(UI.emptyState('🍽', '这个月还没有饮食记录'));
      return;
    }
    const groups = {};
    meals.forEach(m => { (groups[m.date] = groups[m.date] || []).push(m); });
    for (const date of Object.keys(groups).sort().reverse()) {
      const total = groups[date].reduce((s, m) => s + (Number(m.calories) || 0), 0);
      box.appendChild(UI.el('div', { class: 'group-label' }, [date, UI.el('span', {}, total + ' kcal')]));
      groups[date].forEach(m => {
        const row = UI.el('div', { class: 'list-item' });
        row.appendChild(UI.el('span', { class: 'badge blue' }, m.meal));
        const body = UI.el('div', { class: 'grow' });
        body.appendChild(UI.el('div', { class: 'title' }, m.content));
        row.appendChild(body);
        row.appendChild(UI.el('span', { class: 'muted' }, m.calories ? m.calories + ' kcal' : ''));
        row.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: async () => {
          const ok = await UI.confirmDialog({ title: '删除记录', message: '删除这条饮食记录？' });
          if (!ok) return;
          await store().remove('meals', m.id);
          renderTab();
        } }, '删除'));
        box.appendChild(row);
      });
    }
  }

  /* ============ 计划模板 ============ */
  function renderTemplates() {
    const box = contentBox;
    box.appendChild(UI.el('button', { class: 'btn primary', style: 'margin-bottom:14px', onclick: () => openTemplateModal() }, '＋ 新建模板'));
    const templates = store().all('dietTemplates');
    if (!templates.length) {
      box.appendChild(UI.emptyState('📋', '还没有饮食模板', '新建一个', () => openTemplateModal()));
      return;
    }
    const grid = UI.el('div', { class: 'summary-grid' });
    templates.forEach(t => {
      const card = UI.el('div', { class: 'card' });
      const head = UI.el('div', { class: 'card-title' });
      head.appendChild(UI.el('span', {}, t.name));
      head.appendChild(UI.badge(t.goal, UI.statusColor(t.goal)));
      card.appendChild(head);
      if (t.note) card.appendChild(UI.el('div', { class: 'muted', style: 'margin-bottom:8px' }, t.note));
      const meals = MEALS.filter(m => t[m]).map(m => m + '：' + t[m]);
      card.appendChild(UI.el('div', { class: 'sub', style: 'white-space:pre-wrap;color:var(--text-2);font-size:12px' }, meals.join('\n')));
      const ops = UI.el('div', { style: 'display:flex;gap:8px;margin-top:10px;flex-wrap:wrap' });
      ops.appendChild(UI.el('button', { class: 'btn sm primary', onclick: () => applyTemplateToToday(t) }, '套用到今天'));
      ops.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: () => openTemplateModal(t) }, '编辑'));
      ops.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: () => delTemplate(t) }, '删除'));
      card.appendChild(ops);
      grid.appendChild(card);
    });
    box.appendChild(grid);
  }

  async function applyTemplateToToday(t) {
    const today = U.todayStr();
    const existing = store().all('meals').filter(m => m.date === today);
    const ok = await UI.confirmDialog({
      title: '套用到今天',
      message: '将「' + t.name + '」应用到今天？' + (existing.length ? '（今天已有 ' + existing.length + ' 条记录，将被替换）' : ''),
      confirmText: '套用', danger: existing.length > 0
    });
    if (!ok) return;
    for (const m of existing) await store().remove('meals', m.id);
    const applied = Calc.applyTemplate(t, today);
    for (const m of applied) await store().add('meals', m);
    UI.toast('已套用模板', 'success');
  }

  function openTemplateModal(template) {
    const isEdit = !!template;
    const nameInput = UI.textInput(template ? template.name : '', { placeholder: '模板名称（必填）' });
    const goalInput = UI.selectInput(GOALS.map(g => [g, g]), template ? template.goal : '均衡');
    const noteInput = UI.textInput(template ? template.note : '', { placeholder: '说明（可选）' });
    const mealInputs = {};
    const body = UI.el('div', {});
    const nameField = UI.field('模板名称', nameInput, { errText: '请填写模板名称' });
    body.appendChild(nameField);
    body.appendChild(UI.el('div', { class: 'row' }, [UI.field('适用目标', goalInput), UI.field('说明', noteInput)]));
    MEALS.forEach(meal => {
      const contentInput = UI.el('textarea', { placeholder: meal + ' 内容（可选）', style: 'min-height:44px' });
      contentInput.value = template ? (template[meal] || '') : '';
      const calInput = UI.numInput(template ? (template[meal + 'Cal'] || '') : '', { min: '0', step: '1', placeholder: 'kcal' });
      mealInputs[meal] = { contentInput, calInput };
      body.appendChild(UI.el('div', { class: 'row' }, [
        UI.field(meal + ' 内容', contentInput),
        UI.field('热量', calInput)
      ]));
    });
    const actions = UI.el('div', { class: 'actions' });
    const m = UI.modal(isEdit ? '编辑模板' : '新建模板', body);
    actions.appendChild(UI.el('button', { class: 'btn ghost', onclick: () => m.close() }, '取消'));
    actions.appendChild(UI.el('button', { class: 'btn primary', onclick: save }, '保存'));
    body.appendChild(actions);

    async function save() {
      const name = nameInput.value.trim();
      if (!UI.validateField(nameInput, !!name)) return;
      const payload = { name, goal: goalInput.value, note: noteInput.value.trim() };
      MEALS.forEach(meal => {
        payload[meal] = mealInputs[meal].contentInput.value.trim();
        payload[meal + 'Cal'] = Number(mealInputs[meal].calInput.value) || 0;
      });
      if (isEdit) await store().update('dietTemplates', template.id, payload);
      else await store().add('dietTemplates', payload);
      m.close(); renderTab();
      UI.toast('模板已保存', 'success');
    }
  }

  async function delTemplate(t) {
    const ok = await UI.confirmDialog({ title: '删除模板', message: '删除模板「' + t.name + '」？' });
    if (!ok) return;
    await store().remove('dietTemplates', t.id);
    renderTab();
  }

  global.Stellarium.Router.register('diet', render, '饮食计划');
})(typeof window !== 'undefined' ? window : globalThis);