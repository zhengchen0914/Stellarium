/* Phase 4：开发工作 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp, assertNoErrors } from './helpers.mjs';

async function gotoDev(page) { await page.evaluate(() => window.Stellarium.Router.navigate('dev')); }

test('Phase4: 项目增删改 + 项目内任务状态流转', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await gotoDev(page);
    // 新建项目
    await page.getByRole('button', { name: '＋ 新建项目' }).click();
    await page.locator('input[placeholder="项目名称（必填）"]').fill('星隅开发');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await page.waitForFunction(() => window.Stellarium.store.all('projects').length === 1);
    await page.waitForFunction(() => document.querySelectorAll('.sum-card').length === 1);
    assert.equal(await page.locator('.sum-card .s-title', { hasText: '星隅开发' }).count(), 1);
    // 进入详情
    await page.locator('.sum-card').click();
    await page.getByRole('button', { name: '＋ 新增任务' }).click();
    await page.locator('input[placeholder="任务标题（必填）"]').fill('写 PRD');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await page.waitForFunction(() => window.Stellarium.store.all('projectTasks').length === 1);
    await page.waitForFunction(() => document.querySelectorAll('.list-item').length === 1);
    assert.equal(await page.locator('.list-item .title', { hasText: '写 PRD' }).count(), 1);
    // 状态循环：未开始 → 进行中
    await page.locator('.list-item button').first().click();
    await page.waitForFunction(() => window.Stellarium.store.all('projectTasks')[0].status === '进行中');
    // 返回列表，项目进度 0/1
    await page.getByRole('button', { name: '← 返回' }).click();
    await page.waitForFunction(() => document.querySelectorAll('.sum-card').length === 1);
    assert.ok((await page.locator('.sum-card').textContent()).includes('0/1'));
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase4: 学习主题 + 进度调整即时保存', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await gotoDev(page);
    await page.locator('.tab', { hasText: '学习积累' }).click();
    await page.getByRole('button', { name: '＋ 新增主题' }).click();
    await page.locator('input[placeholder="技术主题（必填）"]').fill('React 源码');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await page.waitForFunction(() => window.Stellarium.store.all('learnings').length === 1);
    await page.waitForFunction(() => document.querySelectorAll('.card').length === 1);
    assert.equal(await page.locator('.card-title span', { hasText: 'React 源码' }).count(), 1);
    // 点击 + 两次 → 进度 20%
    await page.getByRole('button', { name: '+', exact: true }).click();
    await page.getByRole('button', { name: '+', exact: true }).click();
    await page.waitForFunction(() => window.Stellarium.store.all('learnings')[0].progress === 20);
    const progress = await page.evaluate(() => window.Stellarium.store.all('learnings')[0].progress);
    assert.equal(progress, 20);
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase4: 问题库新增与搜索过滤', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await gotoDev(page);
    await page.locator('.tab', { hasText: '问题库' }).click();
    await page.getByRole('button', { name: '＋ 新增问题' }).click();
    await page.locator('input[placeholder="问题标题（必填）"]').fill('IndexedDB 报错');
    await page.locator('textarea[placeholder="解决方案（可选）"]').fill('改用 Promise 封装');
    await page.locator('input[placeholder="标签，如：web（可选）"]').fill('db');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await page.getByRole('button', { name: '＋ 新增问题' }).click();
    await page.locator('input[placeholder="问题标题（必填）"]').fill('内存泄漏排查');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await page.waitForFunction(() => window.Stellarium.store.all('problems').length === 2);
    await page.waitForFunction(() => document.querySelectorAll('.list-item').length === 2);
    // 搜索
    await page.locator('input[placeholder="搜索问题、标签或方案…"]').fill('Promise');
    await page.waitForFunction(() => document.querySelectorAll('.list-item').length === 1);
    assert.equal(await page.locator('.list-item .title', { hasText: 'IndexedDB 报错' }).count(), 1);
    // 清空搜索恢复
    await page.locator('input[placeholder="搜索问题、标签或方案…"]').fill('');
    await page.waitForFunction(() => document.querySelectorAll('.list-item').length === 2);
    assertNoErrors(errors);
  } finally { await browser.close(); }
});