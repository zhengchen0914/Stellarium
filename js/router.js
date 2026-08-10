/* 星隅 hash 路由 */
(function (global) {
  'use strict';
  const routes = {};

  function register(name, renderFn, title) {
    routes[name] = { render: renderFn, title: title || name };
  }

  function currentName() {
    const h = (location.hash || '#/home').replace(/^#\/?/, '');
    const name = h.split('?')[0] || 'home';
    return routes[name] ? name : 'home';
  }

  function navigate(name) { location.hash = '#/' + name; }

  function render() {
    const name = currentName();
    const route = routes[name];
    document.querySelectorAll('.sidebar .nav-item').forEach(n => n.classList.toggle('active', n.dataset.route === name));
    const appName = (global.Stellarium.store && global.Stellarium.store.snapshot().settings.appName) || '星隅';
    document.title = route.title + ' · ' + appName;
    const content = document.getElementById('main-content');
    content.innerHTML = '';
    route.render(content, { name });
  }

  function start() { window.addEventListener('hashchange', render); render(); }

  const Router = { register, navigate, render, start, currentName };
  global.Stellarium = global.Stellarium || {};
  global.Stellarium.Router = Router;
})(typeof window !== 'undefined' ? window : globalThis);