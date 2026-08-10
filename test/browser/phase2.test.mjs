/* Phase 2：每日手账 + 月度预算 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp, assertNoErrors } from './helpers.mjs';

async function gotoJournal(page) { await page.evaluate(() => window.Stellarium.Router.navigate('journal')); }

async function setBudget(page, amount) {
  await page.locator('.tab', { hasText: '预算设置' }).click();
  await page.locator('input[type="number"]').fill(String(amount));
  await page.getByRole('button', { name: '保存预算' }).click();
}

async function addBill(page, amount, opts = {}) {
  await page.getByRole('button', { name: '记一笔' }).click();
  await page.locator('.modal input[type="number"]').fill(String(amount));
  if (opts.type) await page.locator('.modal select').first().selectOption(opts.type);
  await page.getByRole('button', { name: '保存', exact: true }).click();
}

test('Phase2: 手账正文自动保存', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await gotoJournal(page);
    await page.locator('textarea').first().fill('今天写了很多代码，心情不错。');
    await page.waitForFunction(() => {
      const es = window.Stellarium.store.all('journalEntries');
      return es.length && es[0].text === '今天写了很多代码，心情不错。';
    }, null, { timeout: 5000 });
    const tip = await page.locator('.card-title .muted', { hasText: '已保存' }).textContent();
    assert.ok(tip.includes('已保存'));
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase2: 设置预算并记账，预算条实时更新', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await gotoJournal(page);
    await setBudget(page, 1000);
    await page.locator('.tab', { hasText: '今日手账' }).click();
    await addBill(page, 50);
    await page.waitForFunction(() => {
      const s = window.Stellarium.store.all('bills');
      return s.length === 1 && Number(s[0].amount) === 50;
    });
    await page.waitForFunction(() => document.querySelector('.budget-bar').textContent.includes('¥50.00'));
    const barText = await page.locator('.budget-bar').textContent();
    assert.ok(barText.includes('¥1000.00'));
    assert.ok(barText.includes('¥50.00'));
    assert.ok(barText.includes('¥950.00'));
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase2: 超支变红并提示超支金额', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await gotoJournal(page);
    await setBudget(page, 100);
    await page.locator('.tab', { hasText: '今日手账' }).click();
    await addBill(page, 150);
    await page.waitForFunction(() => {
      const s = window.Stellarium.store.all('bills');
      return s.length === 1 && Number(s[0].amount) === 150;
    });
    await page.waitForFunction(() => document.querySelector('#main-content').textContent.includes('本月已超支 ¥50.00'));
    const fill = await page.locator('.budget-bar .fill').getAttribute('style');
    assert.ok(fill.includes('var(--danger)'), '进度条应为红色');
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase2: 分类管理联动记账下拉', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await gotoJournal(page);
    await page.locator('.tab', { hasText: '预算设置' }).click();
    await page.locator('#new-cat-input').fill('学习');
    await page.getByRole('button', { name: '添加' }).click();
    await page.waitForFunction(() => window.Stellarium.store.all('categories').some(c => c.name === '学习'));
    await page.locator('.tab', { hasText: '今日手账' }).click();
    await page.getByRole('button', { name: '记一笔' }).click();
    const catOptions = await page.locator('.modal select').nth(1).locator('option').allTextContents();
    assert.ok(catOptions.includes('学习'));
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase2: 月历打点（手账 + 账目）', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await gotoJournal(page);
    await page.locator('textarea').first().fill('今天有记录');
    await page.waitForFunction(() => window.Stellarium.store.all('journalEntries').length === 1);
    await addBill(page, 30);
    await page.waitForFunction(() => window.Stellarium.store.all('bills').length === 1);
    await page.locator('.tab', { hasText: '预算设置' }).click();
    const todayCell = page.locator('.cal-cell.today');
    assert.equal(await todayCell.locator('.dots i.j').count(), 1);
    assert.equal(await todayCell.locator('.dots i.b').count(), 1);
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase2: 月度报表展示汇总与图表', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await gotoJournal(page);
    await addBill(page, 100, { type: '支出' });
    await page.waitForFunction(() => window.Stellarium.store.all('bills').length === 1);
    await page.locator('.tab', { hasText: '月度报表' }).click();
    const text = await page.locator('#main-content').textContent();
    assert.ok(text.includes('总支出'));
    assert.ok(text.includes('¥100.00'));
    assert.ok((await page.locator('.chart-legend').count()) >= 1, '应有环形图图例');
    assert.ok((await page.locator('.bar-chart .bar').count()) >= 1, '应有柱状图');
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase2: 账本流水编辑与删除', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await gotoJournal(page);
    await addBill(page, 66);
    await page.waitForFunction(() => window.Stellarium.store.all('bills').length === 1);
    await page.locator('.tab', { hasText: '账本流水' }).click();
    await page.getByRole('button', { name: '编辑' }).click();
    await page.locator('.modal input[type="number"]').fill('88');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await page.waitForFunction(() => Number(window.Stellarium.store.all('bills')[0].amount) === 88);
    await page.locator('.list-item button', { hasText: '删除' }).first().click();
    await page.locator('#modal-root').getByRole('button', { name: '删除', exact: true }).click();
    await page.waitForFunction(() => window.Stellarium.store.all('bills').length === 0);
    assertNoErrors(errors);
  } finally { await browser.close(); }
});