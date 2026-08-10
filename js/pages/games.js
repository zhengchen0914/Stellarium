/* 星隅 游戏娱乐（占位） */
(function (global) {
  'use strict';
  const UI = global.Stellarium.UI;

  function render(container) {
    container.appendChild(UI.el('div', { class: 'page-head' }, [
      UI.el('h1', { class: 'page-title' }, '游戏娱乐'),
      UI.el('div', { class: 'page-sub' }, '摸鱼小游戏将陆续上线')
    ]));
    const grid = UI.el('div', { class: 'tool-grid' });
    (global.Stellarium.Seed.GAMES).forEach(g => {
      grid.appendChild(UI.el('div', {
        class: 'card tool-card',
        onclick: () => UI.toast('该功能暂未开发，敬请期待', 'info')
      }, [
        UI.el('span', { class: 'soon' }, '即将上线'),
        UI.el('div', { class: 't-ico' }, g.icon),
        UI.el('div', { class: 't-name' }, g.name)
      ]));
    });
    container.appendChild(grid);
  }

  global.Stellarium.Router.register('games', render, '游戏娱乐');
})(typeof window !== 'undefined' ? window : globalThis);