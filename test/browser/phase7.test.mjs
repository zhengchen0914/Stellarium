/* Phase 7：占位模块 + 数据与设置 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp, assertNoErrors } from './helpers.mjs';

test('Phase7: 工具全部上线且游戏占位卡片提示未开发', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await page.evaluate(() => window.Stellarium.Router.navigate('tools'));
    await page.waitForSelector('.tool-card');
    assert.equal(await page.locator('.tool-card').count(), 11);
    assert.equal(await page.locator('.tool-card .soon').count(), 3, '仅 3 个新增 PDF 卡片待上线');
    await page.evaluate(() => window.Stellarium.Router.navigate('games'));
    await page.waitForSelector('.tool-card');
    assert.equal(await page.locator('.tool-card').count(), 5);
    await page.locator('.tool-card').nth(3).click();
    await page.waitForSelector('.toast');
    assert.ok((await page.locator('.toast').last().textContent()).includes('暂未开发'));
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase7: 主题切换即时生效并持久化', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await page.evaluate(() => window.Stellarium.Router.navigate('settings'));
    await page.locator('select').first().selectOption('light');
    await page.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'light');
    const theme = await page.evaluate(() => window.Stellarium.store.snapshot().settings.theme);
    assert.equal(theme, 'light');
    await page.reload();
    await page.waitForFunction(() => window.Stellarium && window.Stellarium.ready === true);
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'light');
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase7: 应用名称保存', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await page.evaluate(() => window.Stellarium.Router.navigate('settings'));
    await page.locator('#app-name-input').fill('我的星隅');
    await page.getByRole('button', { name: '保存设置' }).click();
    await page.waitForFunction(() => window.Stellarium.store.snapshot().settings.appName === '我的星隅');
    await page.evaluate(() => window.Stellarium.Router.navigate('home'));
    assert.equal(await page.title(), '首页总览 · 我的星隅');
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase7: 导出下载 JSON 备份', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await page.evaluate(async () => {
      await window.Stellarium.store.add('tasks', { title: '备份我', date: window.Stellarium.Utils.todayStr(), done: false, period: '上午' });
    });
    await page.evaluate(() => window.Stellarium.Router.navigate('settings'));
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '⬇ 导出备份' }).click()
    ]);
    const filename = download.suggestedFilename();
    assert.ok(filename.startsWith('stellarium-backup-'));
    const path = await download.path();
    assert.ok(path, '下载文件应存在');
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase7: 导入备份恢复数据 + 错误格式提示', async () => {
  const { browser, page, errors } = await openApp();
  try {
    // 准备备份：含一条任务
    await page.evaluate(async () => {
      await window.Stellarium.store.add('tasks', { title: '导入恢复任务', date: window.Stellarium.Utils.todayStr(), done: false, period: '全天' });
    });
    const backup = await page.evaluate(() => window.Stellarium.Backup.exportData(window.Stellarium.store.snapshot()));
    // 清掉任务
    await page.evaluate(async () => {
      for (const t of window.Stellarium.store.all('tasks')) await window.Stellarium.store.remove('tasks', t.id);
    });
    assert.equal(await page.evaluate(() => window.Stellarium.store.all('tasks').length), 0);
    await page.evaluate(() => window.Stellarium.Router.navigate('settings'));
    // 导入合法备份
    await page.locator('#import-file').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
    await page.waitForSelector('#modal-root .modal');
    await page.locator('#modal-root .modal').last().getByRole('button', { name: '导入', exact: true }).click();
    await page.waitForFunction(() => window.Stellarium.store.all('tasks').some(t => t.title === '导入恢复任务'));
    assert.equal(await page.evaluate(() => window.Stellarium.store.all('tasks').length), 1);
    // 导入错误格式
    await page.locator('#import-file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('not json') });
    await page.waitForFunction(() => [...document.querySelectorAll('.toast')].some(t => t.textContent.includes('备份文件格式不正确')));
    assert.equal(await page.evaluate(() => window.Stellarium.store.all('tasks').length), 1, '错误导入不应破坏数据');
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase7: 清空数据需输入「清空」并回到首页', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await page.evaluate(async () => {
      await window.Stellarium.store.add('tasks', { title: '将被清空', date: window.Stellarium.Utils.todayStr(), done: false, period: '全天' });
    });
    await page.evaluate(() => window.Stellarium.Router.navigate('settings'));
    // 不输入直接点 → 提示
    await page.locator('#clear-input').fill('');
    await page.locator('#clear-btn').click();
    await page.waitForFunction(() => [...document.querySelectorAll('.toast')].some(t => t.textContent.includes('清空')));
    assert.equal(await page.evaluate(() => window.Stellarium.store.all('tasks').length), 1);
    // 输入后清空
    await page.locator('#clear-input').fill('清空');
    await page.locator('#clear-btn').click();
    await page.waitForSelector('#modal-root .modal');
    await page.locator('#modal-root .modal').last().getByRole('button', { name: '确认清空' }).click();
    await page.waitForFunction(() => window.Stellarium.store.all('tasks').length === 0);
    await page.waitForFunction(() => window.Stellarium.Router.currentName() === 'home');
    assert.equal(await page.evaluate(() => window.Stellarium.Router.currentName()), 'home');
    assert.equal(await page.evaluate(() => window.Stellarium.store.all('categories').length), 6, '清空后恢复默认分类');
    assertNoErrors(errors);
  } finally { await browser.close(); }
});