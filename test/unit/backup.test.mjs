import test from 'node:test';
import assert from 'node:assert/strict';
import Backup from '../../js/core/backup.js';

test('backup: 导出-校验-导入 完整回路', () => {
  const data = { tasks: [{ id: 't1' }], settings: { appName: '星隅', theme: 'dark' }, bills: [] };
  const ex = Backup.exportData(data);
  assert.equal(ex.app, 'stellarium');
  assert.equal(ex.version, 1);
  assert.ok(ex.exportedAt);
  assert.equal(Backup.validateImport(ex).ok, true);
  assert.equal(Backup.validateImport(null).ok, false);
  assert.equal(Backup.validateImport({ app: 'x' }).ok, false);
  assert.equal(Backup.validateImport({ app: 'stellarium', version: 999, data: {} }).ok, false);
  assert.equal(Backup.validateImport({ app: 'stellarium', version: 1, data: [1] }).ok, false);
  const merged = Backup.applyImport({ tasks: [{ id: 'old' }], settings: { theme: 'light' } }, ex);
  assert.equal(merged.tasks[0].id, 't1');
  assert.equal(merged.settings.theme, 'dark');
  assert.equal(merged.settings.appName, '星隅');
});