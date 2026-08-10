/* Phase 8：跨模块联动与全页面冒烟 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp, assertNoErrors } from './helpers.mjs';

test('Phase8: 首页 6 张摘要卡数值与各模块联动', async () => {
  const { browser, page, errors } = await openApp();
  try {
    const today = await page.evaluate(() => window.Stellarium.Utils.todayStr());
    const month = await page.evaluate((d) => window.Stellarium.Utils.monthKey(d), today);
    // 造数据：预算1000+支出200、待发布草稿2、进行中任务3、今天已训练、今天已饮食、体重72
    await page.evaluate(async ({ today, month }) => {
      const s = window.Stellarium.store;
      await s.add('budgets', { month, amount: 1000 });
      await s.add('bills', { date: today, type: '支出', amount: 200, category: 'cat-1' });
      await s.add('journalEntries', { date: today, mood: '😄', text: '记录' });
      await s.add('drafts', { title: 'd1', status: '待发布' });
      await s.add('drafts', { title: 'd2', status: '待发布' });
      await s.add('projects', { id: 'p1', name: 'P' });
      await s.add('projectTasks', { projectId: 'p1', title: 't1', status: '进行中' });
      await s.add('projectTasks', { projectId: 'p1', title: 't2', status: '进行中' });
      await s.add('projectTasks', { projectId: 'p1', title: 't3', status: '进行中' });
      await s.add('workouts', { date: today, exercise: '深蹲', sets: 3, reps: 10, weight: 50 });
      await s.add('meals', { date: today, meal: '早餐', content: '鸡蛋', calories: 300 });
      await s.add('bodyMetrics', { date: today, weight: 72, bodyFat: 16 });
    }, { today, month });
    await page.evaluate(() => window.Stellarium.Router.navigate('home'));
    await page.waitForSelector('.summary-grid');
    const cards = await page.locator('.sum-card').allTextContents();
    assert.equal(cards.length, 6);
    assert.ok(cards[0].includes('今日已写'), '手账卡应显示今日已写');
    assert.ok(cards[0].includes('¥800.00'), '手账卡应显示预算剩余 800');
    assert.ok(cards[1].includes('3 个进行中'), '开发卡应显示 3 个进行中');
    assert.ok(cards[2].includes('2 篇待发布'), '自媒体卡应显示 2 篇待发布');
    assert.ok(cards[3].includes('今日已训练'), '健身卡应显示今日已训练');
    assert.ok(cards[4].includes('今日已记录'), '饮食卡应显示今日已记录');
    assert.ok(cards[5].includes('72 kg'), '身体卡应显示最近体重 72');
    // 首页直接勾选任务后回今日计划同步
    await page.evaluate(async () => {
      await window.Stellarium.store.add('tasks', { title: '联动任务', date: window.Stellarium.Utils.todayStr(), done: false, period: '上午' });
    });
    await page.evaluate(() => window.Stellarium.Router.navigate('today'));
    await page.waitForSelector('.task');
    assert.equal(await page.locator('.task .t-title', { hasText: '联动任务' }).count(), 1);
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase8: 记账 + 写手账后首页预算摘要同步', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await page.evaluate(() => window.Stellarium.Router.navigate('journal'));
    // 设预算 500
    await page.locator('.tab', { hasText: '预算设置' }).click();
    await page.locator('input[type="number"]').fill('500');
    await page.getByRole('button', { name: '保存预算' }).click();
    // 记账 100
    await page.locator('.tab', { hasText: '今日手账' }).click();
    await page.getByRole('button', { name: '记一笔' }).click();
    await page.locator('.modal input[type="number"]').fill('100');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await page.waitForFunction(() => window.Stellarium.store.all('bills').length === 1);
    // 写手账
    await page.locator('textarea').first().fill('今天很棒');
    await page.waitForFunction(() => window.Stellarium.store.all('journalEntries').length === 1);
    // 回首页
    await page.evaluate(() => window.Stellarium.Router.navigate('home'));
    await page.waitForSelector('.summary-grid');
    const journalCard = await page.locator('.sum-card').first().textContent();
    assert.ok(journalCard.includes('今日已写'));
    assert.ok(journalCard.includes('¥400.00'), '预算剩余应为 500-100=400，实际：' + journalCard);
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase8: 全部 10 个页面遍历无报错', async () => {
  const { browser, page, errors } = await openApp();
  try {
    const routes = ['home', 'today', 'journal', 'media', 'dev', 'fitness', 'diet', 'tools', 'games', 'settings'];
    for (const r of routes) {
      await page.evaluate((name) => window.Stellarium.Router.navigate(name), r);
      await page.waitForTimeout(60);
      const title = await page.locator('#main-content .page-title').textContent();
      assert.ok(title && title.trim(), r + ' 应渲染标题');
    }
    assertNoErrors(errors);
  } finally { await browser.close(); }
});