/* 星隅 自媒体：灵感库 / 草稿大纲 / 发布日历 / 平台账号 */
(function (global) {
  'use strict';
  const U = global.Stellarium.Utils;
  const UI = global.Stellarium.UI;
  const Calc = global.Stellarium.Calc;
  const store = () => global.Stellarium.store;

  const PLATFORMS = ['公众号', '小红书', 'B站', '抖音', '微博', '知乎', '其他'];
  const IDEA_STATUS = ['待用', '已采用', '放弃'];
  const DRAFT_STATUS = ['构思', '写作中', '待发布', '已发布'];

  let state = { tab: 'ideas', filter: '全部', month: U.monthKey(U.todayStr()) };
  let contentBox = null;

  function render(container) {
    container.innerHTML = '';
    container.appendChild(UI.el('div', { class: 'page-head' }, [
      UI.el('h1', { class: 'page-title' }, '自媒体'),
      UI.el('div', { class: 'page-sub' }, '灵感 · 草稿 · 发布计划 · 平台账号')
    ]));
    const tabBox = UI.el('div');
    container.appendChild(tabBox);
    UI.tabs(tabBox, [
      { id: 'ideas', label: '灵感库' },
      { id: 'drafts', label: '草稿大纲' },
      { id: 'calendar', label: '发布日历' },
      { id: 'accounts', label: '平台账号' }
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
    if (state.tab === 'ideas') renderIdeas();
    else if (state.tab === 'drafts') renderDrafts();
    else if (state.tab === 'calendar') renderCalendar();
    else renderAccounts();
  }

  /* ============ 灵感库 ============ */
  function renderIdeas() {
    const box = contentBox;
    const filterRow = UI.el('div', { style: 'display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap' });
    ['全部'].concat(IDEA_STATUS).forEach(f => {
      filterRow.appendChild(UI.el('button', {
        class: 'btn sm' + (state.filter === f ? ' primary' : ''),
        onclick: () => { state.filter = f; renderTab(); }
      }, f));
    });
    filterRow.appendChild(UI.el('button', { class: 'btn sm primary', style: 'margin-left:auto', onclick: () => openIdeaModal() }, '＋ 新增灵感'));
    box.appendChild(filterRow);

    const ideas = store().all('ideas').filter(i => state.filter === '全部' || i.status === state.filter).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    if (!ideas.length) {
      box.appendChild(UI.emptyState('💡', '还没有灵感，随手记下你的点子吧', '新增灵感', () => openIdeaModal()));
      return;
    }
    ideas.forEach(i => {
      const card = UI.el('div', { class: 'list-item' });
      const body = UI.el('div', { class: 'grow' });
      body.appendChild(UI.el('div', { class: 'title' }, i.content));
      const subs = [];
      if (i.source) subs.push('来源：' + i.source);
      if (i.tags) subs.push('#' + i.tags);
      if (subs.length) body.appendChild(UI.el('div', { class: 'sub' }, subs));
      card.appendChild(body);
      card.appendChild(UI.badge(i.status, UI.statusColor(i.status)));
      card.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: () => openIdeaModal(i) }, '编辑'));
      card.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: () => delIdea(i) }, '删除'));
      box.appendChild(card);
    });
  }

  function openIdeaModal(idea) {
    const isEdit = !!idea;
    const contentInput = UI.el('textarea', { placeholder: '灵感内容（必填）' });
    contentInput.value = idea ? (idea.content || '') : '';
    const sourceInput = UI.textInput(idea ? idea.source : '', { placeholder: '来源平台/场景（可选）' });
    const tagInput = UI.textInput(idea ? idea.tags : '', { placeholder: '标签，如：职场（可选）' });
    const statusInput = UI.selectInput(IDEA_STATUS.map(s => [s, s]), idea ? idea.status : '待用');
    const body = UI.el('div', {});
    const contentField = UI.field('灵感内容', contentInput, { errText: '请填写灵感内容' });
    body.appendChild(contentField);
    body.appendChild(UI.el('div', { class: 'row' }, [UI.field('来源', sourceInput), UI.field('状态', statusInput)]));
    body.appendChild(UI.field('标签', tagInput));
    const actions = UI.el('div', { class: 'actions' });
    const m = UI.modal(isEdit ? '编辑灵感' : '新增灵感', body);
    actions.appendChild(UI.el('button', { class: 'btn ghost', onclick: () => m.close() }, '取消'));
    actions.appendChild(UI.el('button', { class: 'btn primary', onclick: save }, '保存'));
    body.appendChild(actions);

    async function save() {
      const content = contentInput.value.trim();
      if (!UI.validateField(contentInput, !!content)) return;
      const payload = { content, source: sourceInput.value.trim(), tags: tagInput.value.trim(), status: statusInput.value };
      if (isEdit) await store().update('ideas', idea.id, payload);
      else await store().add('ideas', Object.assign({ createdAt: new Date().toISOString() }, payload));
      m.close(); renderTab();
      UI.toast('灵感已保存', 'success');
    }
  }

  async function delIdea(idea) {
    const ok = await UI.confirmDialog({ title: '删除灵感', message: '删除这条灵感？' });
    if (!ok) return;
    await store().remove('ideas', idea.id);
    renderTab();
    UI.toast('已删除', 'success');
  }

  /* ============ 草稿大纲 ============ */
  function renderDrafts() {
    const box = contentBox;
    box.appendChild(UI.el('button', { class: 'btn primary', style: 'margin-bottom:14px', onclick: () => openDraftModal() }, '＋ 新建草稿'));
    const drafts = store().all('drafts').slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    if (!drafts.length) {
      box.appendChild(UI.emptyState('📝', '还没有草稿', '新建一篇', () => openDraftModal()));
      return;
    }
    drafts.forEach(d => {
      const row = UI.el('div', { class: 'list-item' });
      const body = UI.el('div', { class: 'grow' });
      body.appendChild(UI.el('div', { class: 'title' }, d.title));
      const subs = [];
      if (d.platform) subs.push('平台：' + d.platform);
      const linked = store().all('ideas').find(i => i.id === d.ideaId);
      if (linked) subs.push('关联灵感：' + linked.content.slice(0, 16));
      if (d.publishDate) subs.push('发布日期：' + d.publishDate);
      if (subs.length) body.appendChild(UI.el('div', { class: 'sub' }, subs));
      row.appendChild(body);
      row.appendChild(UI.badge(d.status, UI.statusColor(d.status)));
      row.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: () => openDraftModal(d) }, '编辑'));
      row.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: () => delDraft(d) }, '删除'));
      box.appendChild(row);
    });
  }

  function openDraftModal(draft) {
    const isEdit = !!draft;
    const titleInput = UI.textInput(draft ? draft.title : '', { placeholder: '标题（必填）' });
    const platformInput = UI.selectInput(PLATFORMS.map(p => [p, p]), draft ? (draft.platform || PLATFORMS[0]) : PLATFORMS[0]);
    const ideaOptions = [['', '不关联']].concat(store().all('ideas').map(i => [i.id, (i.status === '待用' ? '待用' : i.status) + ' · ' + i.content.slice(0, 12)]));
    const ideaInput = UI.selectInput(ideaOptions, draft ? (draft.ideaId || '') : '');
    const outlineInput = UI.el('textarea', { placeholder: '大纲要点（每行一个要点）' });
    outlineInput.value = draft ? (draft.outline || '') : '';
    const statusInput = UI.selectInput(DRAFT_STATUS.map(s => [s, s]), draft ? draft.status : '构思');
    const dateInput = UI.dateInput(draft && draft.publishDate ? draft.publishDate : U.todayStr());

    const body = UI.el('div', {});
    const titleField = UI.field('标题', titleInput, { errText: '请填写标题' });
    body.appendChild(titleField);
    body.appendChild(UI.el('div', { class: 'row' }, [UI.field('平台', platformInput), UI.field('关联灵感', ideaInput)]));
    body.appendChild(UI.field('大纲要点', outlineInput));
    body.appendChild(UI.el('div', { class: 'row' }, [UI.field('状态', statusInput), UI.field('发布日期（已发布时生效）', dateInput)]));
    const actions = UI.el('div', { class: 'actions' });
    const m = UI.modal(isEdit ? '编辑草稿' : '新建草稿', body);
    actions.appendChild(UI.el('button', { class: 'btn ghost', onclick: () => m.close() }, '取消'));
    actions.appendChild(UI.el('button', { class: 'btn primary', onclick: save }, '保存'));
    body.appendChild(actions);

    async function save() {
      const title = titleInput.value.trim();
      if (!UI.validateField(titleInput, !!title)) return;
      const payload = {
        title,
        platform: platformInput.value,
        ideaId: ideaInput.value,
        outline: outlineInput.value,
        status: statusInput.value,
        publishDate: statusInput.value === '已发布' ? dateInput.value : (draft ? draft.publishDate : '')
      };
      let saved;
      if (isEdit) saved = await store().update('drafts', draft.id, payload);
      else saved = await store().add('drafts', Object.assign({ updatedAt: new Date().toISOString() }, payload));
      await afterDraftSave(saved);
      m.close(); renderTab();
      UI.toast('草稿已保存', 'success');
    }
  }

  async function afterDraftSave(draft) {
    /* 关联灵感 → 已采用 */
    if (draft.ideaId) {
      const idea = store().get('ideas', draft.ideaId);
      if (idea && idea.status === '待用') await store().update('ideas', idea.id, { status: '已采用' });
    }
    /* 同步发布排期 */
    await syncScheduleForDraft(draft);
  }

  async function syncScheduleForDraft(draft) {
    const schedules = store().all('schedules');
    const existing = schedules.find(s => s.draftId === draft.id);
    if (draft.status === '已发布' && draft.publishDate) {
      if (existing) {
        if (existing.date !== draft.publishDate) await store().update('schedules', existing.id, { date: draft.publishDate });
      } else {
        await store().add('schedules', { date: draft.publishDate, draftId: draft.id });
      }
    } else if (existing) {
      await store().remove('schedules', existing.id);
    }
  }

  async function delDraft(draft) {
    const ok = await UI.confirmDialog({ title: '删除草稿', message: '删除草稿「' + draft.title + '」？' });
    if (!ok) return;
    await store().remove('drafts', draft.id);
    const scheds = store().all('schedules').filter(s => s.draftId === draft.id);
    for (const s of scheds) await store().remove('schedules', s.id);
    renderTab();
    UI.toast('已删除', 'success');
  }

  /* ============ 发布日历 ============ */
  function renderCalendar() {
    const box = contentBox;
    const monthRow = UI.el('div', { style: 'display:flex;gap:8px;align-items:center;margin-bottom:14px' });
    monthRow.appendChild(UI.el('button', { class: 'btn sm', onclick: () => { state.month = U.addMonths(state.month, -1); renderTab(); } }, '← 上月'));
    monthRow.appendChild(UI.el('b', {}, state.month.replace('-', ' 年 ') + ' 月'));
    monthRow.appendChild(UI.el('button', { class: 'btn sm', onclick: () => { state.month = U.addMonths(state.month, 1); renderTab(); } }, '下月 →'));
    monthRow.appendChild(UI.el('button', { class: 'btn sm primary', style: 'margin-left:auto', onclick: () => openScheduleModal() }, '安排发布'));
    box.appendChild(monthRow);

    const byDate = Calc.draftCalendar(store().all('drafts'), store().all('schedules'));
    const first = U.monthRange(state.month).first;
    const start = U.weekStart(first);
    const days = [];
    for (let i = 0; i < 42; i++) days.push(U.addDays(start, i));
    box.appendChild(UI.el('div', { class: 'calendar' }, ['一', '二', '三', '四', '五', '六', '日'].map(d => UI.el('div', { class: 'cal-head' }, d))));
    const grid = UI.el('div', { class: 'calendar' });
    days.forEach(d => {
      const inMonth = U.monthKey(d) === state.month;
      const tags = byDate[d] || [];
      const cell = UI.el('div', {
        class: 'cal-cell' + (inMonth ? '' : ' other') + (d === U.todayStr() ? ' today' : ''),
        onclick: () => { if (tags.length) openDaySchedules(d, tags); }
      });
      cell.appendChild(UI.el('div', { class: 'day' }, String(Number(d.slice(8)))));
      if (tags.length) {
        const tagBox = UI.el('div', { class: 'tags' });
        tags.slice(0, 3).forEach(t => tagBox.appendChild(UI.el('span', {}, (t.platform || '') + ' · ' + t.title)));
        cell.appendChild(tagBox);
      }
      grid.appendChild(cell);
    });
    box.appendChild(grid);
  }

  function openDaySchedules(date, tags) {
    const body = UI.el('div', {});
    body.appendChild(UI.el('div', { class: 'muted', style: 'margin-bottom:10px' }, date + ' 共 ' + tags.length + ' 条排期'));
    tags.forEach(t => {
      const row = UI.el('div', { class: 'list-item' });
      const info = UI.el('div', { class: 'grow' });
      info.appendChild(UI.el('div', { class: 'title' }, t.title));
      info.appendChild(UI.el('div', { class: 'sub' }, t.platform));
      row.appendChild(info);
      row.appendChild(UI.el('button', { class: 'btn sm danger', onclick: async () => {
        const ok = await UI.confirmDialog({ title: '取消排期', message: '取消 ' + date + ' 的「' + t.title + '」发布排期？', confirmText: '取消排期' });
        if (!ok) return;
        await store().remove('schedules', t.scheduleId);
        const draft = store().get('drafts', t.draftId);
        if (draft && draft.status === '已发布' && !store().all('schedules').some(s => s.draftId === draft.id)) {
          await store().update('drafts', draft.id, { status: '待发布' });
        }
        m.close(); renderTab();
        UI.toast('已取消排期', 'success');
      } }, '取消排期'));
      body.appendChild(row);
    });
    const m = UI.modal(date + ' 发布安排', body);
  }

  function openScheduleModal() {
    const dateInput = UI.dateInput(U.todayStr());
    const draftOptions = store().all('drafts').filter(d => d.status !== '已发布').map(d => [d.id, (d.platform || '') + ' · ' + d.title]);
    if (!draftOptions.length) { UI.toast('没有可安排的草稿', 'info'); return; }
    const draftInput = UI.selectInput(draftOptions, draftOptions[0][0]);
    const body = UI.el('div', {});
    body.appendChild(UI.field('发布日期', dateInput));
    body.appendChild(UI.field('选择草稿', draftInput));
    const actions = UI.el('div', { class: 'actions' });
    const m = UI.modal('安排发布', body);
    actions.appendChild(UI.el('button', { class: 'btn ghost', onclick: () => m.close() }, '取消'));
    actions.appendChild(UI.el('button', { class: 'btn primary', onclick: async () => {
      const draftId = draftInput.value;
      const date = dateInput.value;
      const draft = store().get('drafts', draftId);
      await store().add('schedules', { date, draftId });
      if (draft && draft.status !== '已发布') await store().update('drafts', draftId, { status: '已发布', publishDate: date });
      m.close(); renderTab();
      UI.toast('已安排发布', 'success');
    } }, '确定'));
    body.appendChild(actions);
  }

  /* ============ 平台账号 ============ */
  function renderAccounts() {
    const box = contentBox;
    box.appendChild(UI.el('button', { class: 'btn primary', style: 'margin-bottom:14px', onclick: () => openAccountModal() }, '＋ 新增账号'));
    const accounts = store().all('accounts').slice().sort((a, b) => a.platform.localeCompare(b.platform));
    if (!accounts.length) {
      box.appendChild(UI.emptyState('📣', '还没有平台账号', '新增一个', () => openAccountModal()));
      return;
    }
    const grid = UI.el('div', { class: 'summary-grid' });
    accounts.forEach(a => {
      const card = UI.el('div', { class: 'card sum-card' });
      card.appendChild(UI.el('div', { class: 's-title' }, '📢 ' + a.platform));
      card.appendChild(UI.el('div', { class: 's-value', style: 'font-size:15px' }, a.name));
      if (a.note) card.appendChild(UI.el('div', { class: 'muted', style: 'margin-top:4px' }, a.note));
      const ops = UI.el('div', { style: 'display:flex;gap:8px;margin-top:10px' });
      ops.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: () => openAccountModal(a) }, '编辑'));
      ops.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: () => delAccount(a) }, '删除'));
      card.appendChild(ops);
      grid.appendChild(card);
    });
    box.appendChild(grid);
  }

  function openAccountModal(account) {
    const isEdit = !!account;
    const platformInput = UI.selectInput(PLATFORMS.map(p => [p, p]), account ? account.platform : PLATFORMS[0]);
    const nameInput = UI.textInput(account ? account.name : '', { placeholder: '账号名称（必填）' });
    const noteInput = UI.textInput(account ? account.note : '', { placeholder: '备注（可选）' });
    const body = UI.el('div', {});
    const nameField = UI.field('账号名称', nameInput, { errText: '请填写账号名称' });
    body.appendChild(UI.field('平台', platformInput));
    body.appendChild(nameField);
    body.appendChild(UI.field('备注', noteInput));
    const actions = UI.el('div', { class: 'actions' });
    const m = UI.modal(isEdit ? '编辑账号' : '新增账号', body);
    actions.appendChild(UI.el('button', { class: 'btn ghost', onclick: () => m.close() }, '取消'));
    actions.appendChild(UI.el('button', { class: 'btn primary', onclick: save }, '保存'));
    body.appendChild(actions);

    async function save() {
      const name = nameInput.value.trim();
      if (!UI.validateField(nameInput, !!name)) return;
      const payload = { platform: platformInput.value, name, note: noteInput.value.trim() };
      if (isEdit) await store().update('accounts', account.id, payload);
      else await store().add('accounts', payload);
      m.close(); renderTab();
      UI.toast('账号已保存', 'success');
    }
  }

  async function delAccount(a) {
    const ok = await UI.confirmDialog({ title: '删除账号', message: '删除账号「' + a.name + '」？' });
    if (!ok) return;
    await store().remove('accounts', a.id);
    renderTab();
  }

  global.Stellarium.Router.register('media', render, '自媒体');
})(typeof window !== 'undefined' ? window : globalThis);