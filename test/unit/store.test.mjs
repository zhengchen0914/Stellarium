import test from 'node:test';
import assert from 'node:assert/strict';
import DB from '../../js/db.js';
import Store from '../../js/store.js';
import Seed from '../../js/seed.js';

test('store: 增删改查 + 事件 + settings', async () => {
  const storage = DB.createStorage('memory');
  const store = Store.createStore(storage);
  await store.load();
  let events = 0;
  store.subscribe(() => events++);
  const task = await store.add('tasks', { title: '写代码', done: false });
  assert.ok(task.id);
  assert.equal(store.all('tasks').length, 1);
  await store.update('tasks', task.id, { done: true });
  assert.equal(store.get('tasks', task.id).done, true);
  await store.remove('tasks', task.id);
  assert.equal(store.all('tasks').length, 0);
  assert.equal(events, 3);
  await store.setSettings({ theme: 'light' });
  assert.equal(store.snapshot().settings.theme, 'light');
});

test('store: replaceAll 导入/清空场景', async () => {
  const storage = DB.createStorage('memory');
  const store = Store.createStore(storage);
  await store.load();
  await store.replaceAll({ tasks: [{ id: 'x' }], settings: { appName: '测试' }, bills: [] });
  assert.equal(store.all('tasks').length, 1);
  assert.equal(store.snapshot().settings.appName, '测试');
  assert.equal(store.all('ideas').length, 0);
  await store.replaceAll({ settings: {} });
  assert.equal(store.all('tasks').length, 0);
});

test('seed: 默认数据', () => {
  const seed = Seed.seedData();
  assert.equal(seed.categories.length, 6);
  assert.equal(seed.categories[0].name, '餐饮');
  assert.equal(seed.tools.length, 11);
  assert.equal(seed.games.length, 5);
  assert.equal(seed.commonExercises.length, 7);
  assert.equal(seed.settings.theme, 'dark');
  assert.equal(seed.settings.appName, '星隅');
});