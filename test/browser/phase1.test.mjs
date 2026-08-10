/* Phase 1：今日计划 + 首页总览 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp, assertNoErrors } from './helpers.mjs';

async function addTask(page, title, opts = {}) {
  await page.getByText('＋ 新增任务').click();
  await page.locator('input[placeholder="任务标题（必填）"]').fill(title);
  if (opts.period) await page.locator('.modal select').first().selectOption(opts.period);
  if (opts.priority) await page.locator('.modal select').nth(1).selectOption(opts.priority);
  await page.getByRole('button', { name: '保存' }).click();
}

test('Phase1: 新增任务并显示在列表中', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await page.evaluate(() => window.Stellarium.Router.navigate('today'));
    await addTask(page, '写 Phase1 测试', { period: '下午' });
    await page.waitForSelector('.task');
    const title = await page.locator('.task .t-title', { hasText: '写 Phase1 测试' }).textContent();
    assert.equal(title, '写 Phase1 测试');
    const groupLabel = await page.locator('.group-label', { hasText: '下午' }).first().textContent();
    assert.ok(groupLabel.includes('1 项'));
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase1: 空标题校验拦截', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await page.evaluate(() => window.Stellarium.Router.navigate('today'));
    await page.getByText('＋ 新增任务').click();
    await page.getByRole('button', { name: '保存' }).click();
    await page.waitForSelector('.field.invalid');
    assert.equal(await page.locator('.field.invalid').count(), 1);
    const tasks = await page.evaluate(() => window.Stellarium.store.all('tasks'));
    assert.equal(tasks.length, 0);
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase1: 勾选完成移入已完成区', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await page.evaluate(() => window.Stellarium.Router.navigate('today'));
    await addTask(page, '要完成的任务');
    await page.locator('.task .check').click();
    await page.waitForSelector('.task.done');
    const done = await page.evaluate(() => window.Stellarium.store.all('tasks'));
    assert.equal(done[0].done, true);
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase1: 未完成任务顺延到明天', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await page.evaluate(() => window.Stellarium.Router.navigate('today'));
    await addTask(page, '明天再做的任务');
    await page.getByText('未完成任务顺延到明天').click();
    await page.getByRole('button', { name: '顺延', exact: true }).click();
    const tomorrow = await page.evaluate(() => window.Stellarium.Utils.addDays(window.Stellarium.Utils.todayStr(), 1));
    await page.locator('input[type="date"]').fill(tomorrow);
    await page.waitForSelector('.task');
    const deferred = await page.locator('.task', { hasText: '明天再做的任务' }).count();
    assert.equal(deferred, 1);
    assert.equal(await page.locator('.task', { hasText: '已顺延' }).count(), 1);
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase1: 首页快速备忘 + 今日任务展示与勾选同步', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await page.evaluate(async () => {
      await window.Stellarium.store.add('tasks', { title: '首页任务', date: window.Stellarium.Utils.todayStr(), done: false, period: '上午' });
    });
    // 回首页渲染
    await page.evaluate(() => window.Stellarium.Router.navigate('home'));
    await page.waitForSelector('.task .t-title');
    assert.equal(await page.locator('.task .t-title', { hasText: '首页任务' }).count(), 1);
    // 快速备忘
    await page.locator('#memo-input').fill('记得喝水');
    await page.getByText('记下').click();
    await page.waitForSelector('.list-item');
    assert.equal(await page.locator('.list-item .title', { hasText: '记得喝水' }).count(), 1);
    // 首页勾选任务 → 数据同步
    await page.locator('.task .check').first().click();
    await page.waitForTimeout(100);
    const done = await page.evaluate(() => window.Stellarium.store.all('tasks').find(t => t.title === '首页任务').done);
    assert.equal(done, true);
    // 摘要网格
    assert.equal(await page.locator('.summary-grid .sum-card').count(), 6);
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase1: 任务与备忘刷新后仍在', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await page.evaluate(() => window.Stellarium.Router.navigate('today'));
    await addTask(page, '持久化任务');
    await page.evaluate(() => window.Stellarium.Router.navigate('home'));
    await page.locator('#memo-input').fill('持久化备忘');
    await page.getByText('记下').click();
    await page.waitForSelector('.list-item');
    await page.reload();
    await page.waitForFunction(() => window.Stellarium && window.Stellarium.ready === true);
    await page.evaluate(() => window.Stellarium.Router.navigate('today'));
    await page.waitForSelector('.task');
    assert.equal(await page.locator('.task .t-title', { hasText: '持久化任务' }).count(), 1);
    await page.evaluate(() => window.Stellarium.Router.navigate('home'));
    await page.waitForSelector('.list-item');
    assert.equal(await page.locator('.list-item .title', { hasText: '持久化备忘' }).count(), 1);
    assertNoErrors(errors);
  } finally { await browser.close(); }
});