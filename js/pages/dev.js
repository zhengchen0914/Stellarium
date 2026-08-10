/* 星隅 开发工作：项目任务 / 学习积累 / 问题库 */
(function (global) {
  'use strict';
  const U = global.Stellarium.Utils;
  const UI = global.Stellarium.UI;
  const Calc = global.Stellarium.Calc;
  const store = () => global.Stellarium.store;

  const PROJECT_STATUS = ['进行中', '已完成', '搁置'];
  const TASK_STATUS = ['未开始', '进行中', '已完成', '搁置'];

  let state = { tab: 'projects', projectId: null, search: '' };
  let contentBox = null;

  function render(container) {
    container.innerHTML = '';
    container.appendChild(UI.el('div', { class: 'page-head' }, [
      UI.el('h1', { class: 'page-title' }, '开发工作'),
      UI.el('div', { class: 'page-sub' }, '项目 · 学习 · 问题库')
    ]));
    const tabBox = UI.el('div');
    container.appendChild(tabBox);
    UI.tabs(tabBox, [
      { id: 'projects', label: '项目任务' },
      { id: 'learning', label: '学习积累' },
      { id: 'problems', label: '问题库' }
    ], state.tab, switchTab);
    contentBox = UI.el('div');
    container.appendChild(contentBox);
    renderTab();
  }

  function switchTab(tab) {
    state.tab = tab;
    state.projectId = null;
    const bar = document.querySelector('#main-content .tabs');
    if (bar) bar.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    renderTab();
  }

  function renderTab() {
    if (!contentBox) return;
    contentBox.innerHTML = '';
    if (state.tab === 'projects') {
      if (state.projectId) renderProjectDetail();
      else renderProjects();
    } else if (state.tab === 'learning') renderLearning();
    else renderProblems();
  }

  /* ============ 项目任务 ============ */
  function renderProjects() {
    const box = contentBox;
    box.appendChild(UI.el('button', { class: 'btn primary', style: 'margin-bottom:14px', onclick: () => openProjectModal() }, '＋ 新建项目'));
    const projects = Calc.projectsWithTasks(store().all('projects'), store().all('projectTasks'));
    if (!projects.length) {
      box.appendChild(UI.emptyState('🗂', '还没有项目', '新建一个', () => openProjectModal()));
      return;
    }
    const grid = UI.el('div', { class: 'summary-grid' });
    projects.forEach(p => {
      const pct = p.tasks.length ? Math.round((p.done / p.tasks.length) * 100) : 0;
      const card = UI.el('div', { class: 'card sum-card', onclick: () => { state.projectId = p.id; renderTab(); } });
      card.appendChild(UI.el('div', { class: 's-title' }, '💻 ' + p.name));
      card.appendChild(UI.el('div', { style: 'margin-top:8px' }, UI.badge(p.status, UI.statusColor(p.status))));
      card.appendChild(UI.el('div', { class: 'muted', style: 'margin-top:8px' }, '任务 ' + p.done + '/' + p.tasks.length));
      card.appendChild(UI.el('div', { class: 'progress', style: 'margin-top:8px' }, UI.el('div', { class: 'fill', style: 'width:' + pct + '%' })));
      const ops = UI.el('div', { style: 'display:flex;gap:8px;margin-top:10px' });
      ops.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: e => { e.stopPropagation(); openProjectModal(p); } }, '编辑'));
      ops.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: e => { e.stopPropagation(); delProject(p); } }, '删除'));
      card.appendChild(ops);
      grid.appendChild(card);
    });
    box.appendChild(grid);
  }

  function openProjectModal(project) {
    const isEdit = !!project;
    const nameInput = UI.textInput(project ? project.name : '', { placeholder: '项目名称（必填）' });
    const statusInput = UI.selectInput(PROJECT_STATUS.map(s => [s, s]), project ? project.status : '进行中');
    const noteInput = UI.el('textarea', { placeholder: '说明（可选）' });
    noteInput.value = project ? (project.note || '') : '';
    const body = UI.el('div', {});
    const nameField = UI.field('项目名称', nameInput, { errText: '请填写项目名称' });
    body.appendChild(nameField);
    body.appendChild(UI.field('状态', statusInput));
    body.appendChild(UI.field('说明', noteInput));
    const actions = UI.el('div', { class: 'actions' });
    const m = UI.modal(isEdit ? '编辑项目' : '新建项目', body);
    actions.appendChild(UI.el('button', { class: 'btn ghost', onclick: () => m.close() }, '取消'));
    actions.appendChild(UI.el('button', { class: 'btn primary', onclick: save }, '保存'));
    body.appendChild(actions);

    async function save() {
      const name = nameInput.value.trim();
      if (!UI.validateField(nameInput, !!name)) return;
      const payload = { name, status: statusInput.value, note: noteInput.value.trim() };
      if (isEdit) await store().update('projects', project.id, payload);
      else await store().add('projects', Object.assign({ createdAt: new Date().toISOString() }, payload));
      m.close(); renderTab();
      UI.toast('项目已保存', 'success');
    }
  }

  async function delProject(p) {
    const ok = await UI.confirmDialog({ title: '删除项目', message: '删除项目「' + p.name + '」及其所有任务？' });
    if (!ok) return;
    await store().remove('projects', p.id);
    const tasks = store().all('projectTasks').filter(t => t.projectId === p.id);
    for (const t of tasks) await store().remove('projectTasks', t.id);
    renderTab();
    UI.toast('已删除', 'success');
  }

  function renderProjectDetail() {
    const box = contentBox;
    const project = store().get('projects', state.projectId);
    if (!project) { state.projectId = null; renderProjects(); return; }
    const head = UI.el('div', { style: 'display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap' });
    head.appendChild(UI.el('button', { class: 'btn sm', onclick: () => { state.projectId = null; renderTab(); } }, '← 返回'));
    head.appendChild(UI.el('b', { style: 'font-size:16px' }, project.name));
    head.appendChild(UI.badge(project.status, UI.statusColor(project.status)));
    if (project.note) head.appendChild(UI.el('span', { class: 'muted' }, project.note));
    head.appendChild(UI.el('button', { class: 'btn sm primary', style: 'margin-left:auto', onclick: () => openTaskModal() }, '＋ 新增任务'));
    box.appendChild(head);

    const tasks = store().all('projectTasks').filter(t => t.projectId === project.id);
    if (!tasks.length) {
      box.appendChild(UI.emptyState('🧩', '项目还没有任务', '新增一个', () => openTaskModal()));
      return;
    }
    tasks.forEach(t => {
      const row = UI.el('div', { class: 'list-item' });
      const body = UI.el('div', { class: 'grow' });
      body.appendChild(UI.el('div', { class: 'title' }, t.title));
      const subs = [];
      if (t.priority === 'high') subs.push('高优先级');
      if (t.note) subs.push(t.note);
      if (subs.length) body.appendChild(UI.el('div', { class: 'sub' }, subs));
      row.appendChild(body);
      row.appendChild(UI.el('button', {
        class: 'btn sm',
        onclick: () => cycleTaskStatus(t)
      }, UI.badge(t.status, UI.statusColor(t.status))));
      row.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: () => openTaskModal(t) }, '编辑'));
      row.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: () => delTask(t) }, '删除'));
      box.appendChild(row);
    });
  }

  async function cycleTaskStatus(t) {
    const idx = TASK_STATUS.indexOf(t.status);
    const next = TASK_STATUS[(idx + 1) % TASK_STATUS.length];
    await store().update('projectTasks', t.id, { status: next });
    renderTab();
  }

  function openTaskModal(task) {
    const isEdit = !!task;
    const titleInput = UI.textInput(task ? task.title : '', { placeholder: '任务标题（必填）' });
    const statusInput = UI.selectInput(TASK_STATUS.map(s => [s, s]), task ? task.status : '未开始');
    const priInput = UI.selectInput([['low', '普通'], ['high', '高']], task ? task.priority : 'low');
    const noteInput = UI.el('textarea', { placeholder: '备注（可选）' });
    noteInput.value = task ? (task.note || '') : '';
    const body = UI.el('div', {});
    const titleField = UI.field('任务标题', titleInput, { errText: '请填写任务标题' });
    body.appendChild(titleField);
    body.appendChild(UI.el('div', { class: 'row' }, [UI.field('状态', statusInput), UI.field('优先级', priInput)]));
    body.appendChild(UI.field('备注', noteInput));
    const actions = UI.el('div', { class: 'actions' });
    const m = UI.modal(isEdit ? '编辑任务' : '新增任务', body);
    actions.appendChild(UI.el('button', { class: 'btn ghost', onclick: () => m.close() }, '取消'));
    actions.appendChild(UI.el('button', { class: 'btn primary', onclick: save }, '保存'));
    body.appendChild(actions);

    async function save() {
      const title = titleInput.value.trim();
      if (!UI.validateField(titleInput, !!title)) return;
      const payload = { title, status: statusInput.value, priority: priInput.value, note: noteInput.value.trim() };
      if (isEdit) await store().update('projectTasks', task.id, payload);
      else await store().add('projectTasks', Object.assign({ projectId: state.projectId }, payload));
      m.close(); renderTab();
      UI.toast('任务已保存', 'success');
    }
  }

  async function delTask(t) {
    const ok = await UI.confirmDialog({ title: '删除任务', message: '删除任务「' + t.title + '」？' });
    if (!ok) return;
    await store().remove('projectTasks', t.id);
    renderTab();
  }

  /* ============ 学习积累 ============ */
  function renderLearning() {
    const box = contentBox;
    box.appendChild(UI.el('button', { class: 'btn primary', style: 'margin-bottom:14px', onclick: () => openLearningModal() }, '＋ 新增主题'));
    const learnings = store().all('learnings').slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    if (!learnings.length) {
      box.appendChild(UI.emptyState('📚', '还没有学习主题', '新增一个', () => openLearningModal()));
      return;
    }
    learnings.forEach(l => {
      const card = UI.el('div', { class: 'card' });
      const head = UI.el('div', { class: 'card-title' });
      head.appendChild(UI.el('span', {}, l.topic));
      const ops = UI.el('div', { style: 'display:flex;gap:8px' });
      ops.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: () => openLearningModal(l) }, '编辑'));
      ops.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: () => delLearning(l) }, '删除'));
      head.appendChild(ops);
      card.appendChild(head);
      if (l.note) card.appendChild(UI.el('div', { class: 'muted', style: 'margin-bottom:10px;white-space:pre-wrap' }, l.note));
      const barRow = UI.el('div', { style: 'display:flex;gap:10px;align-items:center' });
      barRow.appendChild(UI.el('div', { class: 'progress', style: 'flex:1' }, UI.el('div', { class: 'fill', style: 'width:' + U.clamp(l.progress || 0, 0, 100) + '%' })));
      barRow.appendChild(UI.el('b', {}, (l.progress || 0) + '%'));
      barRow.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: () => adjustProgress(l, -10) }, '−'));
      barRow.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: () => adjustProgress(l, 10) }, '+'));
      card.appendChild(barRow);
      box.appendChild(card);
    });
  }

  async function adjustProgress(l, delta) {
    const next = U.clamp((l.progress || 0) + delta, 0, 100);
    await store().update('learnings', l.id, { progress: next, updatedAt: new Date().toISOString() });
    renderTab();
  }

  function openLearningModal(learning) {
    const isEdit = !!learning;
    const topicInput = UI.textInput(learning ? learning.topic : '', { placeholder: '技术主题（必填）' });
    const noteInput = UI.el('textarea', { placeholder: '学习笔记（可选）' });
    noteInput.value = learning ? (learning.note || '') : '';
    const progressInput = UI.numInput(learning ? learning.progress : 0, { min: '0', max: '100', step: '5' });
    const body = UI.el('div', {});
    const topicField = UI.field('主题', topicInput, { errText: '请填写主题' });
    body.appendChild(topicField);
    body.appendChild(UI.field('进度（%）', progressInput));
    body.appendChild(UI.field('笔记', noteInput));
    const actions = UI.el('div', { class: 'actions' });
    const m = UI.modal(isEdit ? '编辑学习主题' : '新增学习主题', body);
    actions.appendChild(UI.el('button', { class: 'btn ghost', onclick: () => m.close() }, '取消'));
    actions.appendChild(UI.el('button', { class: 'btn primary', onclick: save }, '保存'));
    body.appendChild(actions);

    async function save() {
      const topic = topicInput.value.trim();
      if (!UI.validateField(topicInput, !!topic)) return;
      const progress = U.clamp(Number(progressInput.value) || 0, 0, 100);
      const payload = { topic, note: noteInput.value, progress, updatedAt: new Date().toISOString() };
      if (isEdit) await store().update('learnings', learning.id, payload);
      else await store().add('learnings', payload);
      m.close(); renderTab();
      UI.toast('学习记录已保存', 'success');
    }
  }

  async function delLearning(l) {
    const ok = await UI.confirmDialog({ title: '删除主题', message: '删除学习主题「' + l.topic + '」？' });
    if (!ok) return;
    await store().remove('learnings', l.id);
    renderTab();
  }

  /* ============ 问题库 ============ */
  function renderProblems() {
    const box = contentBox;
    const bar = UI.el('div', { style: 'display:flex;gap:10px;margin-bottom:14px' });
    const searchInput = UI.textInput(state.search, { placeholder: '搜索问题、标签或方案…', class: 'search' });
    bar.appendChild(searchInput);
    bar.appendChild(UI.el('button', { class: 'btn primary', style: 'margin-left:auto', onclick: () => openProblemModal() }, '＋ 新增问题'));
    box.appendChild(bar);

    const problems = Calc.searchProblems(store().all('problems'), state.search);
    if (!problems.length) {
      box.appendChild(UI.emptyState('🔍', '还没有问题记录', '新增一个', () => openProblemModal()));
      return;
    }
    problems.forEach(p => {
      const row = UI.el('div', { class: 'list-item' });
      const body = UI.el('div', { class: 'grow' });
      body.appendChild(UI.el('div', { class: 'title' }, p.title));
      const subs = [];
      if (p.tags) subs.push('#' + p.tags);
      subs.push(p.date);
      if (subs.length) body.appendChild(UI.el('div', { class: 'sub' }, subs));
      row.appendChild(body);
      row.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: () => viewProblem(p) }, '详情'));
      row.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: () => openProblemModal(p) }, '编辑'));
      row.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: () => delProblem(p) }, '删除'));
      box.appendChild(row);
    });
    searchInput.addEventListener('input', () => { state.search = searchInput.value; renderTab(); });
  }

  function viewProblem(p) {
    const body = UI.el('div', {});
    body.appendChild(UI.el('div', { class: 'muted' }, '问题描述'));
    body.appendChild(UI.el('p', { style: 'white-space:pre-wrap' }, p.description || '（无）'));
    body.appendChild(UI.el('div', { class: 'muted' }, '解决方案'));
    body.appendChild(UI.el('p', { style: 'white-space:pre-wrap' }, p.solution || '（无）'));
    UI.modal(p.title, body);
  }

  function openProblemModal(problem) {
    const isEdit = !!problem;
    const titleInput = UI.textInput(problem ? problem.title : '', { placeholder: '问题标题（必填）' });
    const descInput = UI.el('textarea', { placeholder: '问题描述（可选）' });
    descInput.value = problem ? (problem.description || '') : '';
    const solInput = UI.el('textarea', { placeholder: '解决方案（可选）' });
    solInput.value = problem ? (problem.solution || '') : '';
    const tagInput = UI.textInput(problem ? problem.tags : '', { placeholder: '标签，如：web（可选）' });
    const body = UI.el('div', {});
    const titleField = UI.field('标题', titleInput, { errText: '请填写问题标题' });
    body.appendChild(titleField);
    body.appendChild(UI.field('问题描述', descInput));
    body.appendChild(UI.field('解决方案', solInput));
    body.appendChild(UI.field('标签', tagInput));
    const actions = UI.el('div', { class: 'actions' });
    const m = UI.modal(isEdit ? '编辑问题' : '新增问题', body);
    actions.appendChild(UI.el('button', { class: 'btn ghost', onclick: () => m.close() }, '取消'));
    actions.appendChild(UI.el('button', { class: 'btn primary', onclick: save }, '保存'));
    body.appendChild(actions);

    async function save() {
      const title = titleInput.value.trim();
      if (!UI.validateField(titleInput, !!title)) return;
      const payload = { title, description: descInput.value.trim(), solution: solInput.value.trim(), tags: tagInput.value.trim() };
      if (isEdit) await store().update('problems', problem.id, payload);
      else await store().add('problems', Object.assign({ date: U.todayStr(), createdAt: new Date().toISOString() }, payload));
      m.close(); renderTab();
      UI.toast('问题已保存', 'success');
    }
  }

  async function delProblem(p) {
    const ok = await UI.confirmDialog({ title: '删除问题', message: '删除问题「' + p.title + '」？' });
    if (!ok) return;
    await store().remove('problems', p.id);
    renderTab();
  }

  global.Stellarium.Router.register('dev', render, '开发工作');
})(typeof window !== 'undefined' ? window : globalThis);