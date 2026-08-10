/* 星隅 数据与设置 */
(function (global) {
  'use strict';
  const U = global.Stellarium.Utils;
  const UI = global.Stellarium.UI;
  const Backup = global.Stellarium.Backup;
  const Seed = global.Stellarium.Seed;
  const store = () => global.Stellarium.store;

  function render(container) {
    container.appendChild(UI.el('div', { class: 'page-head' }, [
      UI.el('h1', { class: 'page-title' }, '数据与设置'),
      UI.el('div', { class: 'page-sub' }, '备份、恢复与个性化设置')
    ]));

    renderDataCard(container);
    renderPrefCard(container);
    renderCatCard(container);
    renderAboutCard(container);
  }

  /* ============ 数据管理 ============ */
  function renderDataCard(container) {
    const card = UI.el('div', { class: 'card' });
    card.appendChild(UI.el('div', { class: 'card-title' }, '数据管理'));
    const row = UI.el('div', { style: 'display:flex;gap:10px;flex-wrap:wrap' });
    row.appendChild(UI.el('button', { class: 'btn primary', onclick: exportBackup }, '⬇ 导出备份'));
    row.appendChild(UI.el('button', { class: 'btn', onclick: () => document.getElementById('import-file').click() }, '⬆ 导入备份'));
    const fileInput = UI.el('input', { type: 'file', accept: '.json,application/json', id: 'import-file', style: 'display:none' });
    fileInput.addEventListener('change', e => importBackup(e.target.files[0]));
    row.appendChild(fileInput);
    row.appendChild(UI.el('button', { class: 'btn danger', onclick: () => document.getElementById('clear-input').focus() }, '清空所有数据'));
    card.appendChild(row);

    card.appendChild(UI.el('div', { class: 'muted', style: 'margin-top:10px' }, '提示：数据仅保存在本机浏览器，清除浏览器数据会删除数据，建议定期导出备份。'));
    card.appendChild(UI.el('div', { class: 'muted', style: 'margin-top:4px' }, '导入会覆盖当前全部数据，导入前会自动备份当前数据到本机。'));
    container.appendChild(card);
  }

  function exportBackup() {
    const backup = Backup.exportData(store().snapshot());
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stellarium-backup-' + U.todayStr() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    UI.toast('备份已导出', 'success');
  }

  async function importBackup(file) {
    if (!file) return;
    let obj;
    try {
      obj = JSON.parse(await file.text());
    } catch (e) {
      UI.toast('备份文件格式不正确', 'error');
      return;
    }
    const v = Backup.validateImport(obj);
    if (!v.ok) { UI.toast(v.error, 'error'); return; }
    const ok = await UI.confirmDialog({
      title: '导入备份',
      message: '导入将覆盖当前全部数据，确定继续？',
      confirmText: '导入', danger: false
    });
    if (!ok) { document.getElementById('import-file').value = ''; return; }
    /* 导入前自动备份当前数据到本机 */
    try {
      await global.Stellarium.storage.set('auto-backup', Backup.exportData(store().snapshot()));
    } catch (e) { console.error('自动备份失败', e); }
    await store().replaceAll(Backup.applyImport(store().snapshot(), obj));
    global.Stellarium.applyTheme();
    document.getElementById('import-file').value = '';
    UI.toast('导入成功', 'success');
    const c = document.getElementById('main-content');
    c.innerHTML = '';
    render(c);
  }

  /* ============ 偏好设置 ============ */
  function renderPrefCard(container) {
    const snap = store().snapshot();
    const settings = snap.settings;
    const card = UI.el('div', { class: 'card' });
    card.appendChild(UI.el('div', { class: 'card-title' }, '偏好设置'));

    const nameInput = UI.textInput(settings.appName || '星隅', { id: 'app-name-input' });
    const themeInput = UI.selectInput([['dark', '星空暗色（默认）'], ['light', '极简浅色']], settings.theme || 'dark');
    themeInput.addEventListener('change', async () => {
      await store().setSettings({ theme: themeInput.value });
      global.Stellarium.applyTheme();
      UI.toast('主题已切换', 'success');
    });
    const fmtInput = UI.selectInput([['YYYY-MM-DD', 'YYYY-MM-DD'], ['YYYY/MM/DD', 'YYYY/MM/DD']], settings.dateFormat || 'YYYY-MM-DD');
    fmtInput.addEventListener('change', async () => {
      await store().setSettings({ dateFormat: fmtInput.value });
      UI.toast('日期格式已保存', 'success');
    });

    card.appendChild(UI.el('div', { class: 'row' }, [
      UI.field('应用名称', nameInput),
      UI.field('主题', themeInput),
      UI.field('日期格式', fmtInput)
    ]));
    card.appendChild(UI.el('button', { class: 'btn primary', onclick: async () => {
      const name = nameInput.value.trim() || '星隅';
      await store().setSettings({ appName: name });
      global.Stellarium.refreshBrand();
      UI.toast('应用名称已保存', 'success');
    } }, '保存设置'));
    container.appendChild(card);
  }

  /* ============ 预算分类管理 ============ */
  function renderCatCard(container) {
    const card = UI.el('div', { class: 'card' });
    card.appendChild(UI.el('div', { class: 'card-title' }, '预算默认分类'));
    const box = UI.el('div', {});
    card.appendChild(box);
    container.appendChild(card);
    renderCategories(box);
  }

  function renderCategories(box) {
    box.innerHTML = '';
    const cats = store().all('categories').slice().sort((a, b) => a.sort - b.sort);
    cats.forEach(c => {
      const row = UI.el('div', { class: 'list-item' });
      row.appendChild(UI.el('span', { style: 'width:10px;height:10px;border-radius:50%;background:' + (c.color || '#94a3b8'), display: 'inline-block' }));
      row.appendChild(UI.el('div', { class: 'grow title' }, c.name));
      row.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: () => renameCat(c, () => renderCategories(box)) }, '重命名'));
      row.appendChild(UI.el('button', { class: 'btn sm ghost', onclick: async () => {
        const ok = await UI.confirmDialog({ title: '删除分类', message: '删除分类「' + c.name + '」？（历史账目保留原名）' });
        if (!ok) return;
        await store().remove('categories', c.id);
        renderCategories(box);
      } }, '删除'));
      box.appendChild(row);
    });
    const form = UI.el('div', { class: 'inline-form', style: 'margin-top:10px' });
    const input = UI.textInput('', { placeholder: '新分类名称', id: 'settings-new-cat' });
    form.appendChild(input);
    form.appendChild(UI.el('button', { class: 'btn sm primary', onclick: async () => {
      const name = input.value.trim();
      if (!name) return;
      await store().add('categories', { name, color: '#60a5fa', sort: store().all('categories').length });
      input.value = '';
      renderCategories(box);
    } }, '添加'));
    box.appendChild(form);
  }

  function renameCat(cat, refresh) {
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

  /* ============ 清空数据 ============ */
  function renderAboutCard(container) {
    const card = UI.el('div', { class: 'card' });
    card.appendChild(UI.el('div', { class: 'card-title' }, '清空与关于'));
    const clearRow = UI.el('div', { style: 'display:flex;gap:10px;align-items:center;flex-wrap:wrap' });
    const clearInput = UI.textInput('', { placeholder: '输入「清空」以确认', id: 'clear-input', style: 'width:200px' });
    const clearBtn = UI.el('button', { class: 'btn danger', id: 'clear-btn', onclick: () => clearAll(clearInput) }, '清空所有数据');
    clearRow.appendChild(clearInput);
    clearRow.appendChild(clearBtn);
    card.appendChild(clearRow);
    card.appendChild(UI.el('div', { style: 'margin-top:16px;border-top:1px solid var(--border);padding-top:12px' }, [
      UI.el('div', { class: 'muted' }, '星隅（Stellarium）v0.2 · 仅供个人本地使用'),
      UI.el('div', { class: 'muted', style: 'margin-top:4px' }, '全部数据保存在当前电脑浏览器中，无任何联网请求。')
    ]));
    container.appendChild(card);
  }

  async function clearAll(input) {
    if (input.value.trim() !== '清空') { UI.toast('请输入「清空」以确认', 'error'); return; }
    const ok = await UI.confirmDialog({ title: '清空所有数据', message: '确定清空全部数据？此操作不可恢复！', confirmText: '确认清空' });
    if (!ok) return;
    await store().replaceAll(Seed.seedData());
    global.Stellarium.applyTheme();
    global.Stellarium.Router.navigate('home');
    UI.toast('已清空所有数据', 'success');
  }

  global.Stellarium.Router.register('settings', render, '数据与设置');
})(typeof window !== 'undefined' ? window : globalThis);