/* 星隅 每日手账：手账 / 流水 / 报表 / 预算设置 */
(function (global) {
  'use strict';
  const U = global.Stellarium.Utils;
  const UI = global.Stellarium.UI;
  const Calc = global.Stellarium.Calc;
  const Charts = global.Stellarium.Charts;
  const store = () => global.Stellarium.store;

  const MOODS = ['😄', '🙂', '😐', '😔', '😢'];
  const WEATHERS = ['晴', '多云', '阴', '雨', '雪', '其他'];

  let state = { date: U.todayStr(), month: U.monthKey(U.todayStr()), tab: 'journal' };
  let contentBox = null;
  let budgetBar = null;
  let savedTip = null;
  let saveTimer = null;

  function render(container) {
    container.innerHTML = '';
    container.appendChild(UI.el('div', { class: 'page-head' }, [
      UI.el('div', {}, [
        UI.el('h1', { class: 'page-title' }, '每日手账'),
        UI.el('div', { class: 'page-sub' }, '记录生活与账目 · ' + U.formatDateCN(state.date))
      ])
    ]));

    /* 顶部预算条 */
    budgetBar = UI.el('div', { class: 'card' });
    container.appendChild(budgetBar);
    renderBudgetBar();

    /* Tab 栏 */
    const tabBox = UI.el('div');
    container.appendChild(tabBox);
    UI.tabs(tabBox, [
      { id: 'journal', label: '今日手账' },
      { id: 'bills', label: '账本流水' },
      { id: 'report', label: '月度报表' },
      { id: 'budget', label: '预算设置' }
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
    if (state.tab === 'journal') renderJournalTab();
    else if (state.tab === 'bills') renderBillsTab();
    else if (state.tab === 'report') renderReportTab();
    else renderBudgetTab();
  }

  function renderBudgetBar() {
    if (!budgetBar) return;
    const snap = store().snapshot();
    const budgetEntry = snap.budgets.find(b => b.month === state.month);
    const s = Calc.budgetSummary(snap.bills, budgetEntry ? budgetEntry.amount : 0, state.month);
    const pct = s.budget > 0 ? Math.min(100, Math.round((s.spent / s.budget) * 100)) : 0;
    const color = s.status === 'over' ? 'var(--danger)' : s.status === 'tight' ? 'var(--warn)' : 'var(--accent)';
    const monthCN = state.month.split('-')[1] + '月';
    budgetBar.innerHTML = '';
    budgetBar.appendChild(UI.el('div', { class: 'budget-bar' }, [
      UI.el('div', { class: 'nums' }, monthCN + ' 预算 '),
      UI.el('b', { style: 'color:var(--text)' }, '¥' + U.money(s.budget)),
      UI.el('div', { class: 'track' }, UI.el('div', { class: 'fill', style: 'width:' + pct + '%;background:' + color })),
      UI.el('div', { class: 'nums' }, [
        '已用 ', UI.el('b', { style: 'color:' + (s.status === 'over' ? 'var(--danger)' : 'var(--text)') }, '¥' + U.money(s.spent)),
        ' · 剩余 ',
        UI.el('b', { style: 'color:' + (s.remaining < 0 ? 'var(--danger)' : 'var(--ok)') }, (s.remaining < 0 ? '-' : '') + '¥' + U.money(Math.abs(s.remaining)))
      ])
    ]));
    if (s.status === 'over') {
      budgetBar.appendChild(UI.el('div', { class: 'muted', style: 'color:var(--danger);margin-top:8px' }, '⚠ 本月已超支 ¥' + U.money(s.overAmount)));
    } else if (s.status === 'tight') {
      budgetBar.appendChild(UI.el('div', { class: 'muted', style: 'color:var(--warn);margin-top:8px' }, '预算已使用超过 80%，注意控制支出'));
    }
  }

  /* ============ 今日手账 ============ */
  function renderJournalTab() {
    const snap = store().snapshot();
    const entry = snap.journalEntries.find(j => j.date === state.date);
    const box = contentBox;

    const dateRow = UI.el('div', { style: 'display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap' });
    dateRow.appendChild(UI.el('button', { class: 'btn sm', onclick: () => { state.date = U.addDays(state.date, -1); renderTab(); renderBudgetBar(); } }, '←'));
    dateRow.appendChild(UI.el('b', {}, U.formatDateCN(state.date) + ' ' + U.weekdayCN(state.date)));
    dateRow.appendChild(UI.el('button', { class: 'btn sm', onclick: () => { state.date = U.addDays(state.date, 1); renderTab(); renderBudgetBar(); } }, '→'));
    dateRow.appendChild(UI.el('input', { type: 'date', value: state.date, style: 'width:150px', onchange: e => { state.date = e.target.value; renderTab(); renderBudgetBar(); } }));
    if (state.date !== U.todayStr()) dateRow.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: () => { state.date = U.todayStr(); renderTab(); renderBudgetBar(); } }, '回到今天'));
    box.appendChild(dateRow);

    const card = UI.el('div', { class: 'card' });
    const head = UI.el('div', { class: 'card-title' });
    head.appendChild(UI.el('span', {}, '心情与天气'));
    savedTip = UI.el('span', { class: 'muted' }, '');
    head.appendChild(savedTip);
    card.appendChild(head);

    /* 心情 */
    const moodRow = UI.el('div', { class: 'mood-row' });
    MOODS.forEach(m => {
      const moodEl = UI.el('div', { class: 'mood' + (entry && entry.mood === m ? ' active' : ''), onclick: async () => {
        await saveJournal({ mood: m });
        card.querySelectorAll('.mood').forEach(x => x.classList.toggle('active', x.textContent === m));
        showSaved();
      } }, m);
      moodRow.appendChild(moodEl);
    });
    card.appendChild(moodRow);

    const weatherInput = UI.selectInput(WEATHERS.map(w => [w, w]), entry ? entry.weather : '晴', { style: 'width:160px;margin-top:12px', onchange: async e => { await saveJournal({ weather: e.target.value }); showSaved(); } });
    card.appendChild(weatherInput);

    /* 正文 */
    const textarea = UI.el('textarea', { placeholder: '今天过得怎么样？写点什么吧…', style: 'min-height:140px;margin-top:12px' });
    textarea.value = entry ? (entry.text || '') : '';
    card.appendChild(textarea);
    textarea.addEventListener('input', () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(async () => {
        await saveJournal({ text: textarea.value });
        showSaved();
      }, 800);
    });
    contentBox.appendChild(card);

    /* 今日账目 */
    const billCard = UI.el('div', { class: 'card' });
    billCard.appendChild(UI.el('div', { class: 'card-title' }, [
      '今日账目',
      UI.el('button', { class: 'btn sm primary', onclick: () => openBillModal() }, '记一笔')
    ]));
    const billBox = UI.el('div');
    billCard.appendChild(billBox);
    contentBox.appendChild(billCard);
    renderDayBills(billBox);
  }

  async function saveJournal(patch) {
    const list = store().all('journalEntries');
    const existing = list.find(j => j.date === state.date);
    if (existing) await store().update('journalEntries', existing.id, Object.assign({}, patch, { updatedAt: new Date().toISOString() }));
    else await store().add('journalEntries', Object.assign({ date: state.date }, patch, { updatedAt: new Date().toISOString() }));
  }

  function showSaved() {
    if (savedTip) savedTip.textContent = '已保存 ' + new Date().toTimeString().slice(0, 5);
  }

  function renderDayBills(box) {
    box.innerHTML = '';
    const bills = store().all('bills').filter(b => b.date === state.date).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    if (!bills.length) {
      box.appendChild(UI.el('div', { class: 'muted', style: 'padding:6px 0' }, '今天还没有记账'));
      return;
    }
    bills.forEach(b => box.appendChild(billRow(b, () => renderDayBills(box))));
  }

  /* ============ 账本流水 ============ */
  function renderBillsTab() {
    if (contentBox) contentBox.innerHTML = '';
    const box = contentBox;
    const monthRow = UI.el('div', { style: 'display:flex;gap:8px;align-items:center;margin-bottom:14px' });
    monthRow.appendChild(UI.el('button', { class: 'btn sm', onclick: () => { state.month = U.addMonths(state.month, -1); renderTab(); renderBudgetBar(); } }, '← 上月'));
    monthRow.appendChild(UI.el('b', {}, state.month.replace('-', ' 年 ') + ' 月'));
    monthRow.appendChild(UI.el('button', { class: 'btn sm', onclick: () => { state.month = U.addMonths(state.month, 1); renderTab(); renderBudgetBar(); } }, '下月 →'));
    monthRow.appendChild(UI.el('button', { class: 'btn sm primary', style: 'margin-left:auto', onclick: () => openBillModal() }, '记一笔'));
    box.appendChild(monthRow);

    const bills = store().all('bills').filter(b => U.monthKey(b.date) === state.month).sort((a, b) => b.date.localeCompare(a.date));
    if (!bills.length) {
      box.appendChild(UI.emptyState('💸', '这个月还没有账目', '记一笔', () => openBillModal()));
      return;
    }
    const groups = {};
    bills.forEach(b => { (groups[b.date] = groups[b.date] || []).push(b); });
    for (const date of Object.keys(groups).sort().reverse()) {
      const dayTotal = groups[date].reduce((s, b) => s + (b.type === '支出' ? -Number(b.amount) : Number(b.amount)), 0);
      box.appendChild(UI.el('div', { class: 'group-label' }, [date + ' ' + U.weekdayCN(date), UI.el('span', { class: dayTotal >= 0 ? 'money-pos' : 'money-neg' }, (dayTotal >= 0 ? '+' : '-') + '¥' + U.money(Math.abs(dayTotal)))]));
      groups[date].forEach(b => box.appendChild(billRow(b, () => renderBillsTab())));
    }
  }

  function billRow(b, refresh) {
    const row = UI.el('div', { class: 'list-item' });
    const catName = (store().all('categories').find(c => c.id === b.category) || {}).name || b.category || '其他';
    row.appendChild(UI.el('div', { class: 'grow' }, [
      UI.el('div', { class: 'title' }, catName + (b.note ? ' · ' + b.note : '')),
      UI.el('div', { class: 'sub' }, b.date + ' · ' + (b.type === '支出' ? '支出' : '收入'))
    ]));
    row.appendChild(UI.el('b', { class: b.type === '支出' ? 'money-neg' : 'money-pos' }, (b.type === '支出' ? '-' : '+') + '¥' + U.money(b.amount)));
    row.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: () => openBillModal(b, refresh) }, '编辑'));
    row.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: async () => {
      const ok = await UI.confirmDialog({ title: '删除账目', message: '删除这笔 ¥' + U.money(b.amount) + ' 的账目？' });
      if (!ok) return;
      await store().remove('bills', b.id);
      refresh(); renderBudgetBar();
      UI.toast('已删除', 'success');
    } }, '删除'));
    return row;
  }

  function openBillModal(bill, refresh) {
    const isEdit = !!bill;
    const typeInput = UI.selectInput([['支出', '支出'], ['收入', '收入']], bill ? bill.type : '支出');
    const amountInput = UI.numInput(bill ? bill.amount : '', { min: '0.01', step: '0.01', placeholder: '金额（必填）' });
    const catOptions = store().all('categories').map(c => [c.id, c.name]);
    const catInput = UI.selectInput(catOptions, bill ? bill.category : (catOptions[0] ? catOptions[0][0] : ''), {});
    const noteInput = UI.textInput(bill ? bill.note : '', { placeholder: '备注（可选）' });
    const dateInput = UI.dateInput(bill ? bill.date : state.date);

    const body = UI.el('div', {});
    const amountField = UI.field('金额', amountInput, { errText: '请输入大于 0 的金额' });
    body.appendChild(amountField);
    body.appendChild(UI.el('div', { class: 'row' }, [UI.field('类型', typeInput), UI.field('分类', catInput)]));
    body.appendChild(UI.field('日期', dateInput));
    body.appendChild(UI.field('备注', noteInput));
    const actions = UI.el('div', { class: 'actions' });
    const m = UI.modal(isEdit ? '编辑账目' : '记一笔', body);
    actions.appendChild(UI.el('button', { class: 'btn ghost', onclick: () => m.close() }, '取消'));
    actions.appendChild(UI.el('button', { class: 'btn primary', onclick: save }, '保存'));
    body.appendChild(actions);

    async function save() {
      const amount = Number(amountInput.value);
      if (!UI.validateField(amountInput, amount > 0)) return;
      const payload = {
        type: typeInput.value,
        amount,
        category: catInput.value,
        note: noteInput.value.trim(),
        date: dateInput.value
      };
      if (isEdit) await store().update('bills', bill.id, payload);
      else await store().add('bills', Object.assign({ createdAt: new Date().toISOString() }, payload));
      m.close();
      if (refresh) refresh();
      renderBudgetBar();
      UI.toast('账目已保存', 'success');
    }
  }

  /* ============ 月度报表 ============ */
  function renderReportTab() {
    const box = contentBox;
    const monthRow = UI.el('div', { style: 'display:flex;gap:8px;align-items:center;margin-bottom:14px' });
    monthRow.appendChild(UI.el('button', { class: 'btn sm', onclick: () => { state.month = U.addMonths(state.month, -1); renderTab(); renderBudgetBar(); } }, '← 上月'));
    monthRow.appendChild(UI.el('b', {}, state.month.replace('-', ' 年 ') + ' 月'));
    monthRow.appendChild(UI.el('button', { class: 'btn sm', onclick: () => { state.month = U.addMonths(state.month, 1); renderTab(); renderBudgetBar(); } }, '下月 →'));
    box.appendChild(monthRow);

    const snap = store().snapshot();
    const report = Calc.monthlyReport(snap.bills, snap.categories, state.month);
    const sumCard = UI.el('div', { class: 'card' });
    sumCard.appendChild(UI.el('div', { class: 'row' }, [
      UI.el('div', {}, [UI.el('div', { class: 'muted' }, '总收入'), UI.el('div', { class: 'money-pos', style: 'font-size:18px' }, '+¥' + U.money(report.income))]),
      UI.el('div', {}, [UI.el('div', { class: 'muted' }, '总支出'), UI.el('div', { class: 'money-neg', style: 'font-size:18px' }, '-¥' + U.money(report.expense))]),
      UI.el('div', {}, [UI.el('div', { class: 'muted' }, '结余'), UI.el('div', { style: 'font-size:18px;font-weight:700' }, '¥' + U.money(report.balance))])
    ]));
    box.appendChild(sumCard);

    const donutCard = UI.el('div', { class: 'card' });
    donutCard.appendChild(UI.el('div', { class: 'card-title' }, '分类占比'));
    Charts.donut(donutCard, report.byCategory.map(c => ({ name: c.name, value: c.spent })));
    box.appendChild(donutCard);

    const barCard = UI.el('div', { class: 'card' });
    barCard.appendChild(UI.el('div', { class: 'card-title' }, '每日支出'));
    Charts.bars(barCard, report.dailyExpenses.map(d => ({ label: d.date, value: d.total })));
    box.appendChild(barCard);
  }

  /* ============ 预算设置 ============ */
  function renderBudgetTab() {
    const box = contentBox;
    const snap = store().snapshot();
    const budgetEntry = snap.budgets.find(b => b.month === state.month);
    const budgetInput = UI.numInput(budgetEntry ? budgetEntry.amount : '', { min: '0', step: '1', placeholder: '如 3000' });
    const monthInput = UI.el('input', { type: 'month', value: state.month, style: 'width:160px', onchange: e => { state.month = e.target.value; renderTab(); renderBudgetBar(); } });

    const budgetCard = UI.el('div', { class: 'card' });
    budgetCard.appendChild(UI.el('div', { class: 'card-title' }, '月度预算'));
    budgetCard.appendChild(UI.el('div', { class: 'row' }, [
      UI.field('月份', monthInput), UI.field('预算金额（¥）', budgetInput)
    ]));
    budgetCard.appendChild(UI.el('button', { class: 'btn primary', onclick: async () => {
      const amount = Number(budgetInput.value) || 0;
      const existing = store().all('budgets').find(b => b.month === state.month);
      if (existing) await store().update('budgets', existing.id, { amount });
      else await store().add('budgets', { month: state.month, amount });
      renderBudgetBar();
      UI.toast('预算已保存', 'success');
    } }, '保存预算'));
    box.appendChild(budgetCard);

    /* 分类管理 */
    const catCard = UI.el('div', { class: 'card' });
    catCard.appendChild(UI.el('div', { class: 'card-title' }, '分类管理'));
    const catBox = UI.el('div');
    catCard.appendChild(catBox);
    box.appendChild(catCard);
    renderCategories(catBox);

    /* 日历 */
    const calCard = UI.el('div', { class: 'card' });
    calCard.appendChild(UI.el('div', { class: 'card-title' }, state.month.replace('-', ' 年 ') + ' 月日历'));
    const calBox = UI.el('div');
    calCard.appendChild(calBox);
    box.appendChild(calCard);
    renderCalendar(calBox);
  }

  function renderCategories(box) {
    box.innerHTML = '';
    const cats = store().all('categories').slice().sort((a, b) => a.sort - b.sort);
    cats.forEach(c => {
      const row = UI.el('div', { class: 'list-item' });
      row.appendChild(UI.el('span', { style: 'width:10px;height:10px;border-radius:50%;background:' + (c.color || '#94a3b8'), display: 'inline-block' }));
      row.appendChild(UI.el('div', { class: 'grow title' }, c.name));
      row.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: () => editCategory(c, () => renderCategories(box)) }, '重命名'));
      row.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: async () => {
        const ok = await UI.confirmDialog({ title: '删除分类', message: '删除分类「' + c.name + '」？（历史账目保留原名）' });
        if (!ok) return;
        await store().remove('categories', c.id);
        renderCategories(box);
      } }, '删除'));
      box.appendChild(row);
    });
    const form = UI.el('div', { class: 'inline-form', style: 'margin-top:10px' });
    const input = UI.textInput('', { placeholder: '新分类名称', id: 'new-cat-input' });
    form.appendChild(input);
    form.appendChild(UI.el('button', { class: 'btn sm primary', onclick: async () => {
      const name = input.value.trim();
      if (!name) return;
      const cats = store().all('categories');
      await store().add('categories', { name, color: '#60a5fa', sort: cats.length });
      input.value = '';
      renderCategories(box);
    } }, '添加'));
    box.appendChild(form);
  }

  function editCategory(cat, refresh) {
    const input = UI.textInput(cat.name);
    const body = UI.el('div', {});
    body.appendChild(UI.field('分类名称', input, { errText: '请填写名称' }));
    const actions = UI.el('div', { class: 'actions' });
    const m = UI.modal('重命名分类', body);
    actions.appendChild(UI.el('button', { class: 'btn ghost', onclick: () => m.close() }, '取消'));
    actions.appendChild(UI.el('button', { class: 'btn primary', onclick: async () => {
      const name = input.value.trim();
      if (!UI.validateField(input, !!name)) return;
      await store().update('categories', cat.id, { name });
      m.close(); refresh();
    } }, '保存'));
    body.appendChild(actions);
  }

  function renderCalendar(box) {
    box.innerHTML = '';
    const snap = store().snapshot();
    const marks = Calc.calendarMarks(snap.journalEntries, snap.bills, state.month);
    const first = U.monthRange(state.month).first;
    const start = U.weekStart(first);
    const days = [];
    for (let i = 0; i < 42; i++) days.push(U.addDays(start, i));
    box.appendChild(UI.el('div', { class: 'calendar' }, ['一', '二', '三', '四', '五', '六', '日'].map(d => UI.el('div', { class: 'cal-head' }, d))));
    const grid = UI.el('div', { class: 'calendar' });
    days.forEach(d => {
      const inMonth = U.monthKey(d) === state.month;
      const m = marks[d];
      const cell = UI.el('div', {
        class: 'cal-cell' + (inMonth ? '' : ' other') + (d === U.todayStr() ? ' today' : '') + (d === state.date ? ' selected' : ''),
        onclick: () => { state.date = d; state.tab = 'journal'; switchTab('journal'); }
      });
      cell.appendChild(UI.el('div', { class: 'day' }, String(Number(d.slice(8)))));
      if (m && (m.journal || m.bill)) {
        const dots = UI.el('div', { class: 'dots' });
        if (m.journal) dots.appendChild(UI.el('i', { class: 'j' }));
        if (m.bill) dots.appendChild(UI.el('i', { class: 'b' }));
        cell.appendChild(dots);
      }
      grid.appendChild(cell);
    });
    box.appendChild(grid);
    box.appendChild(UI.el('div', { class: 'chart-legend', style: 'margin-top:8px' }, [
      UI.el('span', {}, [UI.el('i', { style: 'background:var(--accent)' }), '手账']),
      UI.el('span', {}, [UI.el('i', { style: 'background:var(--warn)' }), '账目'])
    ]));
  }

  global.Stellarium.Router.register('journal', render, '每日手账');
})(typeof window !== 'undefined' ? window : globalThis);