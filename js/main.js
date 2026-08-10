/* 星隅 启动入口 */
(function (global) {
  'use strict';
  const UI = global.Stellarium.UI;
  const Seed = global.Stellarium.Seed;
  const DB = global.Stellarium.DB;
  const Store = global.Stellarium.Store;

  const NAV = [
    { id: 'home', label: '首页总览', icon: '✦' },
    { id: 'today', label: '今日计划', icon: '☑' },
    { id: 'journal', label: '每日手账', icon: '📓' },
    { id: 'media', label: '自媒体', icon: '📢' },
    { id: 'dev', label: '开发工作', icon: '💻' },
    { id: 'fitness', label: '健身计划', icon: '🏋' },
    { id: 'diet', label: '饮食计划', icon: '🍱' },
    { id: 'tools', label: '实用小工具', icon: '🧰' },
    { id: 'games', label: '游戏娱乐', icon: '🎮' },
    { id: 'settings', label: '数据与设置', icon: '⚙' }
  ];

  let store = null;

  function refreshBrand() {
    const brand = document.querySelector('.sidebar .brand');
    const name = (store.snapshot().settings.appName) || '星隅';
    if (brand) brand.innerHTML = '';
    if (brand) brand.appendChild(UI.el('span', { class: 'star' }, '✦ '));
    if (brand) brand.appendChild(document.createTextNode(name));
  }

  function buildSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.innerHTML = '';
    sidebar.appendChild(UI.el('div', { class: 'brand' }, [UI.el('span', { class: 'star' }, '✦ '), '星隅']));
    NAV.forEach(n => {
      sidebar.appendChild(UI.el('button', {
        class: 'nav-item', dataset: { route: n.id },
        onclick: () => global.Stellarium.Router.navigate(n.id)
      }, [UI.el('span', { class: 'ico' }, n.icon), UI.el('span', { class: 'txt' }, n.label)]));
    });
    sidebar.appendChild(UI.el('div', { class: 'version' }, 'v0.1'));
  }

  function applyTheme() {
    const theme = (store.snapshot().settings.theme) || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  }

  async function init() {
    const storage = DB.createStorage();
    store = Store.createStore(storage);
    global.Stellarium.store = store;
    global.Stellarium.storage = storage;
    await store.load();
    const snap = store.snapshot();
    if (!snap.settings.appName) {
      await store.replaceAll(Seed.seedData());
    }
    applyTheme();
    buildSidebar();
    global.Stellarium.Router.start();
    global.Stellarium.ready = true;
  }

  global.Stellarium.applyTheme = applyTheme;
  global.Stellarium.refreshBrand = refreshBrand;
  global.Stellarium.init = init;
  global.Stellarium.ready = false;

  init().catch(e => {
    console.error('初始化失败', e);
    const c = document.getElementById('main-content');
    if (c) c.innerHTML = '<p style="padding:40px;color:var(--danger)">初始化失败：' + e.message + '</p>';
  });
})(typeof window !== 'undefined' ? window : globalThis);