/* 星隅 实用小工具（占位） */
(function (global) {
  'use strict';
  const UI = global.Stellarium.UI;

  function render(container) {
    container.appendChild(UI.el('div', { class: 'page-head' }, [
      UI.el('h1', { class: 'page-title' }, '实用小工具'),
      UI.el('div', { class: 'page-sub' }, '常用小工具将陆续上线')
    ]));
    const grid = UI.el('div', { class: 'tool-grid' });
    (global.Stellarium.Seed.TOOLS).forEach(t => {
      grid.appendChild(UI.el('div', {
        class: 'card tool-card',
        onclick: () => UI.toast('该工具暂未开发，敬请期待', 'info')
      }, [
        UI.el('span', { class: 'soon' }, '即将上线'),
        UI.el('div', { class: 't-ico' }, t.icon),
        UI.el('div', { class: 't-name' }, t.name)
      ]));
    });
    container.appendChild(grid);
  }

  global.Stellarium.Router.register('tools', render, '实用小工具');
})(typeof window !== 'undefined' ? window : globalThis);