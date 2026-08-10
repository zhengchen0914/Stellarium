/* 星隅 数据仓库：集合增删改查 + 变更事件 */
(function (global) {
  'use strict';
  const Utils = (typeof module !== 'undefined' && module.exports) ? require('./core/utils.js') : global.Stellarium.Utils;
  const COLLECTIONS = [
    'memos', 'tasks', 'journalEntries', 'bills', 'budgets', 'categories',
    'ideas', 'drafts', 'accounts', 'schedules',
    'projects', 'projectTasks', 'learnings', 'problems',
    'weeklyPlans', 'workouts', 'commonExercises', 'bodyMetrics',
    'meals', 'dietTemplates', 'pomodoros', 'lotteryHistory', 'diceHistory'
  ];

  function createStore(storage) {
    const data = {};
    const listeners = [];
    for (const c of COLLECTIONS) data[c] = [];
    data.settings = {};

    async function save(name) {
      await storage.set(name, data[name]);
    }

    async function load() {
      for (const c of COLLECTIONS) {
        const v = await storage.get(c);
        data[c] = Array.isArray(v) ? v : [];
      }
      const s = await storage.get('settings');
      data.settings = (s && typeof s === 'object') ? s : {};
    }

    function emit() { listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); }

    function all(name) { return data[name]; }
    function get(name, id) { return data[name].find(x => x && x.id === id) || null; }

    async function add(name, obj) {
      const item = Object.assign({ id: Utils.uid() }, obj);
      data[name].push(item);
      await save(name);
      emit();
      return item;
    }

    async function update(name, id, patch) {
      const item = data[name].find(x => x && x.id === id);
      if (!item) return null;
      Object.assign(item, patch);
      await save(name);
      emit();
      return item;
    }

    async function remove(name, id) {
      const i = data[name].findIndex(x => x && x.id === id);
      if (i < 0) return false;
      data[name].splice(i, 1);
      await save(name);
      emit();
      return true;
    }

    async function replaceAll(newData) {
      for (const c of COLLECTIONS) data[c] = Array.isArray(newData[c]) ? JSON.parse(JSON.stringify(newData[c])) : [];
      data.settings = (newData.settings && typeof newData.settings === 'object') ? JSON.parse(JSON.stringify(newData.settings)) : {};
      for (const c of COLLECTIONS) await save(c);
      await save('settings');
      emit();
    }

    async function setSettings(patch) {
      Object.assign(data.settings, patch);
      await save('settings');
      emit();
    }

    function subscribe(fn) {
      listeners.push(fn);
      return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); };
    }

    function snapshot() {
      const out = {};
      for (const c of COLLECTIONS) out[c] = JSON.parse(JSON.stringify(data[c]));
      out.settings = JSON.parse(JSON.stringify(data.settings));
      return out;
    }

    return { COLLECTIONS, load, all, get, add, update, remove, replaceAll, setSettings, subscribe, snapshot };
  }

  const Store = { createStore };

  if (typeof module !== 'undefined' && module.exports) module.exports = Store;
  global.Stellarium = global.Stellarium || {};
  global.Stellarium.Store = Store;
})(typeof window !== 'undefined' ? window : globalThis);