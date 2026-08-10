/* 星隅 今日计划 */
(function (global) {
  'use strict';
  const U = global.Stellarium.Utils;
  const UI = global.Stellarium.UI;
  const Calc = global.Stellarium.Calc;
  const store = () => global.Stellarium.store;

  let state = { date: U.todayStr(), showDone: true };
  let listBoxRef = null;

  function render(container) {
    container.innerHTML = '';
    container.appendChild(UI.el('div', { class: 'page-head' }, [
      UI.el('div', {}, [
        UI.el('h1', { class: 'page-title' }, '今日计划'),
        UI.el('div', { class: 'page-sub' }, U.formatDateCN(state.date) + ' ' + U.weekdayCN(state.date))
      ]),
      UI.el('div', { class: 'row', style: 'flex:none;width:auto' }, [
        UI.el('button', { class: 'btn', onclick: () => { state.date = U.addDays(state.date, -1); mount(); } }, '← 前一天'),
        UI.el('input', { type: 'date', value: state.date, onchange: e => { state.date = e.target.value || U.todayStr(); mount(); }, style: 'width:150px' }),
        UI.el('button', { class: 'btn', onclick: () => { state.date = U.todayStr(); mount(); } }, '今天'),
        UI.el('button', { class: 'btn', onclick: () => { state.date = U.addDays(state.date, 1); mount(); } }, '后一天 →')
      ])
    ]));

    const listBox = UI.el('div');
    container.appendChild(listBox);
    listBoxRef = listBox;
    renderTasks();

    const bottom = UI.el('div', { style: 'display:flex;gap:10px;margin-top:18px;flex-wrap:wrap' });
    bottom.appendChild(UI.el('button', { class: 'btn primary', onclick: openAddModal }, '＋ 新增任务'));
    bottom.appendChild(UI.el('button', { class: 'btn', onclick: deferAll }, '未完成任务顺延到明天'));
    container.appendChild(bottom);
  }

  function mount() { render(document.getElementById('main-content')); }

  function renderTasks() {
    if (!listBoxRef) return;
    listBoxRef.innerHTML = '';
    const all = Calc.tasksByDate(store().all('tasks'), state.date);
    const todo = all.filter(t => !t.done);
    const done = all.filter(t => t.done);
    if (!all.length) {
      listBoxRef.appendChild(UI.emptyState('📋', '这一天还没有任务', '新增一条', openAddModal));
      return;
    }
    const groups = Calc.groupTasksByPeriod(todo);
    for (const period of ['上午', '下午', '晚上', '全天']) {
      if (!groups[period].length) continue;
      listBoxRef.appendChild(UI.el('div', { class: 'group-label' }, [period, UI.el('span', {}, groups[period].length + ' 项')]));
      groups[period].forEach(t => listBoxRef.appendChild(taskRow(t)));
    }
    if (done.length) {
      const head = UI.el('div', { class: 'group-label', style: 'cursor:pointer', onclick: () => { state.showDone = !state.showDone; renderTasks(); } });
      head.appendChild(UI.el('span', {}, '已完成 (' + done.length + ')'));
      head.appendChild(UI.el('span', {}, state.showDone ? '收起 ▲' : '展开 ▼'));
      listBoxRef.appendChild(head);
      if (state.showDone) done.forEach(t => listBoxRef.appendChild(taskRow(t)));
    }
  }

  function taskRow(t) {
    const row = UI.el('div', { class: 'task' + (t.done ? ' done' : '') });
    row.appendChild(UI.el('div', { class: 'check', onclick: () => toggleTask(t) }, '✓'));
    row.appendChild(UI.el('span', { class: 'pri ' + (t.priority || 'low') }));
    const body = UI.el('div', { class: 'grow' });
    body.appendChild(UI.el('div', { class: 't-title' }, t.title));
    const subs = [];
    if (t.time) subs.push('🕐 ' + t.time);
    if (t.tags) subs.push('#' + t.tags);
    if (t.note) subs.push(t.note);
    if (t.deferredFrom) subs.push(UI.badge('已顺延', 'gray'));
    if (subs.length) body.appendChild(UI.el('div', { class: 'sub' }, subs));
    row.appendChild(body);
    const ops = UI.el('div', { class: 'ops' });
    ops.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: () => openEditModal(t) }, '编辑'));
    ops.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: () => deleteTask(t) }, '删除'));
    row.appendChild(ops);
    return row;
  }

  async function toggleTask(t) {
    await store().update('tasks', t.id, { done: !t.done });
    renderTasks();
  }

  async function deleteTask(t) {
    const ok = await UI.confirmDialog({ title: '删除任务', message: '确定删除「' + t.title + '」吗？' });
    if (!ok) return;
    await store().remove('tasks', t.id);
    renderTasks();
    UI.toast('已删除', 'success');
  }

  function taskForm(task) {
    const isEdit = !!task;
    const titleInput = UI.textInput(task ? task.title : '', { placeholder: '任务标题（必填）' });
    const periodInput = UI.selectInput([['上午', '上午'], ['下午', '下午'], ['晚上', '晚上'], ['全天', '全天']], task ? task.period : '上午');
    const priInput = UI.selectInput([['high', '高'], ['mid', '中'], ['low', '低']], task ? task.priority : 'mid');
    const timeInput = UI.textInput(task ? task.time : '', { placeholder: '如 09:00（可选）' });
    const tagInput = UI.textInput(task ? task.tags : '', { placeholder: '如：工作（可选）' });
    const noteInput = UI.el('textarea', { placeholder: '备注（可选）' });
    noteInput.value = task ? (task.note || '') : '';

    const body = UI.el('div', {});
    const titleField = UI.field('标题', titleInput, { errText: '请填写任务标题' });
    body.appendChild(titleField);
    body.appendChild(UI.el('div', { class: 'row' }, [
      UI.field('时间段', periodInput), UI.field('优先级', priInput)
    ]));
    body.appendChild(UI.el('div', { class: 'row' }, [
      UI.field('时间', timeInput), UI.field('标签', tagInput)
    ]));
    body.appendChild(UI.field('备注', noteInput));
    const actions = UI.el('div', { class: 'actions' });
    const m = UI.modal(isEdit ? '编辑任务' : '新增任务', body);
    actions.appendChild(UI.el('button', { class: 'btn ghost', onclick: () => m.close() }, '取消'));
    actions.appendChild(UI.el('button', { class: 'btn primary', onclick: save }, '保存'));
    body.appendChild(actions);

    async function save() {
      const title = titleInput.value.trim();
      if (!UI.validateField(titleInput, !!title)) return;
      const payload = {
        title,
        period: periodInput.value,
        priority: priInput.value,
        time: timeInput.value.trim(),
        tags: tagInput.value.trim(),
        note: noteInput.value.trim()
      };
      if (isEdit) await store().update('tasks', task.id, payload);
      else await store().add('tasks', Object.assign({ date: state.date, done: false }, payload));
      m.close();
      renderTasks();
      UI.toast('已保存', 'success');
    }
  }

  function openAddModal() { taskForm(null); }
  function openEditModal(t) { taskForm(t); }

  async function deferAll() {
    const todo = Calc.tasksByDate(store().all('tasks'), state.date).filter(t => !t.done);
    if (!todo.length) { UI.toast('没有需要顺延的任务', 'info'); return; }
    const ok = await UI.confirmDialog({
      title: '顺延任务', message: '将这一天 ' + todo.length + ' 条未完成任务复制到明天？', confirmText: '顺延', danger: false
    });
    if (!ok) return;
    const copies = Calc.deferTasks(store().all('tasks'), state.date, U.addDays(state.date, 1));
    for (const c of copies) await store().add('tasks', c);
    renderTasks();
    UI.toast('已顺延 ' + copies.length + ' 条任务到明天', 'success');
  }

  global.Stellarium.Router.register('today', render, '今日计划');
})(typeof window !== 'undefined' ? window : globalThis);