/* Phase 5：健身计划 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp, assertNoErrors } from './helpers.mjs';

async function gotoFitness(page) { await page.evaluate(() => window.Stellarium.Router.navigate('fitness')); }

test('Phase5: 周计划编辑与复制到下周', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await gotoFitness(page);
    // 编辑周一
    await page.locator('.week-cell').first().click();
    await page.locator('.modal textarea').fill('胸 + 三头\n平板卧推 4x10');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await page.waitForFunction(() => window.Stellarium.store.all('weeklyPlans').length === 1);
    await page.waitForFunction(() => document.querySelector('.week-cell .w-content').textContent.includes('胸'));
    // 复制到下周
    await page.getByRole('button', { name: '复制本周 → 下周' }).click();
    await page.locator('#modal-root .modal').last().getByRole('button', { name: '复制', exact: true }).click();
    await page.waitForFunction(() => window.Stellarium.store.all('weeklyPlans').length === 2);
    // 切到下周验证
    await page.getByRole('button', { name: '下周 →' }).click();
    await page.waitForFunction(() => document.querySelector('.week-cell .w-content').textContent.includes('胸'));
    const nextContent = await page.locator('.week-cell .w-content').first().textContent();
    assert.ok(nextContent.includes('胸'));
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase5: 训练记录（常用动作 + 自定义动作）', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await gotoFitness(page);
    await page.locator('.tab', { hasText: '训练记录' }).click();
    // 常用动作：深蹲
    await page.getByRole('button', { name: '＋ 新增记录' }).click();
    await page.locator('.modal input[placeholder="组数"]').fill('3');
    await page.locator('.modal input[placeholder="次数"]').fill('10');
    await page.locator('.modal input[placeholder="重量 kg"]').fill('50');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await page.waitForFunction(() => window.Stellarium.store.all('workouts').length === 1);
    await page.waitForFunction(() => document.querySelectorAll('.list-item').length === 1);
    assert.ok((await page.locator('.list-item').first().textContent()).includes('深蹲'));
    assert.ok((await page.locator('.list-item').first().textContent()).includes('3 组'));
    // 自定义动作
    await page.getByRole('button', { name: '＋ 新增记录' }).click();
    await page.locator('.modal select').first().selectOption('__custom__');
    await page.locator('.modal input[placeholder="动作名称"]').fill('农夫行走');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await page.waitForFunction(() => window.Stellarium.store.all('workouts').length === 2);
    await page.waitForFunction(() => window.Stellarium.store.all('commonExercises').some(e => e.name === '农夫行走'));
    assert.ok((await page.locator('.list-item').last().textContent()).includes('农夫行走'));
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase5: 身体数据录入与趋势图', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await gotoFitness(page);
    await page.locator('.tab', { hasText: '身体数据' }).click();
    await page.getByRole('button', { name: '＋ 新增记录' }).click();
    await page.locator('.modal input[placeholder="体重 kg"]').fill('70.5');
    await page.locator('.modal input[placeholder="体脂率 %"]').fill('15.2');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await page.waitForFunction(() => window.Stellarium.store.all('bodyMetrics').length === 1);
    // 第二条（前一天）
    await page.getByRole('button', { name: '＋ 新增记录' }).click();
    await page.locator('.modal input[type="date"]').fill(await page.evaluate(() => window.Stellarium.Utils.addDays(window.Stellarium.Utils.todayStr(), -1)));
    await page.locator('.modal input[placeholder="体重 kg"]').fill('71');
    await page.locator('.modal input[placeholder="体脂率 %"]').fill('14.8');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await page.waitForFunction(() => window.Stellarium.store.all('bodyMetrics').length === 2);
    await page.waitForFunction(() => document.querySelectorAll('.list-item').length === 2);
    await page.waitForFunction(() => document.querySelectorAll('.card svg polyline').length === 2, null, { timeout: 8000 });
    assert.equal(await page.locator('.card svg polyline').count(), 2, '应有体重与体脂两条折线');
    const listText = await page.locator('.list-item').first().textContent();
    assert.ok(listText.includes('体重 71 kg') || listText.includes('体重 70.5 kg'));
    assertNoErrors(errors);
  } finally { await browser.close(); }
});