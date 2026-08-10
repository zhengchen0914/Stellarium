/* 星隅 首页总览 */
(function (global) {
  'use strict';
  const U = global.Stellarium.Utils;
  const UI = global.Stellarium.UI;
  const Calc = global.Stellarium.Calc;
  const store = () => global.Stellarium.store;

  function greeting() {
    const h = new Date().getHours();
    if (h < 6) return '夜深了';
    if (h < 9) return '早上好';
    if (h < 12) return '上午好';
    if (h < 14) return '中午好';
    if (h < 18) return '下午好';
    return '晚上好';
  }

  let unsub = null;

  function render(container) {
    if (unsub) { unsub(); unsub = null; }
    const snap = store().snapshot();
    const s = Calc.homeSummaries(snap, U.todayStr());
    container.innerHTML = '';

    container.appendChild(UI.el('div', { class: 'page-head' }, [
      UI.el('h1', { class: 'page-title' }, greeting() + '，星主'),
      UI.el('div', { class: 'page-sub' }, U.formatDateCN(U.todayStr()) + ' ' + U.weekdayCN(U.todayStr()))
    ]));

    /* 今日计划卡片 */
    const todayCard = UI.el('div', { class: 'card' });
    todayCard.appendChild(UI.el('div', { class: 'card-title' }, [
      '今日计划',
      UI.el('span', { class: 'link', onclick: () => global.Stellarium.Router.navigate('today') }, '查看全部 →')
    ]));
    const taskBox = UI.el('div');
    todayCard.appendChild(taskBox);
    container.appendChild(todayCard);
    renderTasks(taskBox, s.tasksToday);

    /* 快速备忘卡片 */
    const memoCard = UI.el('div', { class: 'card' });
    memoCard.appendChild(UI.el('div', { class: 'card-title' }, '快速备忘'));
    const memoBox = UI.el('div');
    memoCard.appendChild(memoBox);
    container.appendChild(memoCard);
    renderMemos(memoBox);

    /* 摘要网格 */
    container.appendChild(UI.el('div', { class: 'card-title', style: 'margin:20px 0 12px' }, '各模块摘要'));
    const grid = UI.el('div', { class: 'summary-grid' });
    const journalSub = s.billSpentToday > 0
      ? '今日支出 ¥' + U.money(s.billSpentToday) + ' · 预算剩余 ¥' + U.money(s.budget.remaining)
      : '预算剩余 ¥' + U.money(s.budget.remaining);
    const mediaSub = (s.mediaIdeas || s.mediaDrafts)
      ? '灵感 ' + s.mediaIdeas + ' 条 · 草稿 ' + s.mediaDrafts + ' 篇'
      : '内容创作';
    grid.appendChild(sumCard('📓', '每日手账', s.journalLabel, journalSub, 'journal'));
    grid.appendChild(sumCard('💻', '开发工作', s.activeTasks + ' 个进行中', '项目 ' + s.projectCount + ' 个', 'dev'));
    grid.appendChild(sumCard('📢', '自媒体', s.pendingDrafts + ' 篇待发布', mediaSub, 'media'));
    grid.appendChild(sumCard('🏋', '健身计划', s.trainedToday ? '今日已训练' : '今日未训练', '本月训练 ' + s.monthWorkouts + ' 次', 'fitness'));
    grid.appendChild(sumCard('🍱', '饮食计划', s.dietLoggedToday ? '今日已记录' : '今日未记录', s.todayCalories ? '今日 ' + s.todayCalories + ' kcal' : '饮食打卡', 'diet'));
    grid.appendChild(sumCard('⚖', '身体数据', s.lastWeight != null ? s.lastWeight + ' kg' : '暂无记录', '最近体重', 'fitness'));
    container.appendChild(grid);

    /* 订阅数据变更：停留在首页时也自动刷新摘要 */
    unsub = store().subscribe(() => {
      if (global.Stellarium.Router.currentName() === 'home') {
        const c = document.getElementById('main-content');
        if (c && c.querySelector('.summary-grid')) render(c);
      }
    });
  }

  function sumCard(icon, title, value, sub, route) {
    const card = UI.el('div', { class: 'card sum-card', onclick: () => global.Stellarium.Router.navigate(route) });
    card.appendChild(UI.el('div', { class: 's-title' }, icon + ' ' + title));
    card.appendChild(UI.el('div', { class: 's-value' }, value));
    card.appendChild(UI.el('div', { class: 'muted', style: 'margin-top:4px' }, sub));
    return card;
  }

  function renderTasks(box, tasks) {
    box.innerHTML = '';
    const todo = tasks.filter(t => !t.done);
    const done = tasks.filter(t => t.done);
    if (!tasks.length) {
      box.appendChild(UI.el('div', { class: 'muted', style: 'padding:6px 0' }, '今天还没有任务，去「今日计划」安排一下吧。'));
      return;
    }
    todo.slice(0, 5).forEach(t => box.appendChild(homeTaskRow(t)));
    if (done.length) box.appendChild(UI.el('div', { class: 'muted', style: 'padding:4px 0' }, '已完成 ' + done.length + ' 项'));
    if (todo.length > 5) box.appendChild(UI.el('div', { class: 'muted', style: 'padding:4px 0' }, '还有 ' + (todo.length - 5) + ' 项未展示'));
  }

  function homeTaskRow(t) {
    const row = UI.el('div', { class: 'task' + (t.done ? ' done' : ''), style: 'padding:8px 10px' });
    row.appendChild(UI.el('div', { class: 'check', onclick: () => toggleHomeTask(t) }, '✓'));
    row.appendChild(UI.el('span', { class: 'pri ' + (t.priority || 'low') }));
    const body = UI.el('div', { class: 'grow' });
    body.appendChild(UI.el('div', { class: 't-title' }, t.title));
    const subs = [];
    if (t.time) subs.push('🕐 ' + t.time);
    if (t.tags) subs.push('#' + t.tags);
    if (subs.length) body.appendChild(UI.el('div', { class: 'sub' }, subs));
    row.appendChild(body);
    return row;
  }

  async function toggleHomeTask(t) {
    await store().update('tasks', t.id, { done: !t.done });
  }

  function renderMemos(box) {
    box.innerHTML = '';
    const form = UI.el('div', { class: 'inline-form' });
    const input = UI.textInput('', { placeholder: '写点什么…', id: 'memo-input' });
    const addBtn = UI.el('button', { class: 'btn primary sm', onclick: () => addMemo(input, box) }, '记下');
    form.appendChild(input); form.appendChild(addBtn);
    box.appendChild(form);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') addMemo(input, box); });
    const memos = store().all('memos').slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 5);
    if (!memos.length) {
      box.appendChild(UI.el('div', { class: 'muted', style: 'padding:8px 0' }, '暂无备忘'));
      return;
    }
    memos.forEach(m => {
      const row = UI.el('div', { class: 'list-item', style: 'margin-top:8px' });
      const body = UI.el('div', { class: 'grow' });
      body.appendChild(UI.el('div', { class: 'title' }, m.content));
      body.appendChild(UI.el('div', { class: 'sub' }, (m.createdAt || '').slice(0, 10)));
      row.appendChild(body);
      row.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: () => delMemo(m) }, '删除'));
      box.appendChild(row);
    });
  }

  async function addMemo(input, box) {
    const content = input.value.trim();
    if (!content) return;
    await store().add('memos', { content, createdAt: new Date().toISOString() });
    UI.toast('备忘已保存', 'success');
  }

  async function delMemo(m) {
    const ok = await UI.confirmDialog({ title: '删除备忘', message: '删除这条备忘？' });
    if (!ok) return;
    await store().remove('memos', m.id);
  }

  global.Stellarium.Router.register('home', render, '首页总览');
})(typeof window !== 'undefined' ? window : globalThis);