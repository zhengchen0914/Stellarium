/* Phase 6：饮食计划 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp, assertNoErrors } from './helpers.mjs';

async function gotoDiet(page) { await page.evaluate(() => window.Stellarium.Router.navigate('diet')); }

test('Phase6: 记录早餐并实时累计总热量', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await gotoDiet(page);
    await page.locator('.meal-card').first().getByRole('button', { name: '记录' }).click();
    await page.locator('textarea[placeholder="吃了什么？（必填）"]').fill('鸡蛋 + 牛奶');
    await page.locator('.modal input[placeholder="热量估算 kcal（可选）"]').fill('350');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await page.waitForFunction(() => window.Stellarium.store.all('meals').length === 1);
    await page.waitForFunction(() => document.querySelector('#main-content').textContent.includes('350 kcal'));
    assert.equal(await page.evaluate(() => window.Stellarium.store.all('meals')[0].meal), '早餐');
    // 编辑为 400
    await page.locator('.meal-card').first().getByRole('button', { name: '编辑' }).click();
    await page.locator('.modal input[placeholder="热量估算 kcal（可选）"]').fill('400');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await page.waitForFunction(() => Number(window.Stellarium.store.all('meals')[0].calories) === 400);
    await page.waitForFunction(() => document.querySelector('#main-content').textContent.includes('400 kcal'));
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase6: 模板新建与套用到今天', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await gotoDiet(page);
    await page.locator('.tab', { hasText: '计划模板' }).click();
    await page.getByRole('button', { name: '＋ 新建模板' }).click();
    await page.locator('input[placeholder="模板名称（必填）"]').fill('增肌日');
    await page.locator('.modal select').first().selectOption('增肌');
    await page.locator('textarea[placeholder="早餐 内容（可选）"]').fill('燕麦 + 蛋白粉');
    await page.locator('.modal input[placeholder="kcal"]').first().fill('400');
    await page.locator('textarea[placeholder="午餐 内容（可选）"]').fill('米饭 + 鸡胸');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await page.waitForFunction(() => window.Stellarium.store.all('dietTemplates').length === 1);
    await page.waitForFunction(() => document.querySelectorAll('.summary-grid .card').length === 1);
    // 套用到今天
    await page.getByRole('button', { name: '套用到今天' }).click();
    await page.waitForSelector('#modal-root .modal');
    await page.locator('#modal-root .modal').last().getByRole('button', { name: '套用', exact: true }).click();
    await page.waitForFunction(() => window.Stellarium.store.all('meals').length === 2);
    await page.locator('.tab', { hasText: '今日饮食' }).click();
    await page.waitForFunction(() => document.querySelector('#main-content').textContent.includes('400 kcal'));
    const text = await page.locator('#main-content').textContent();
    assert.ok(text.includes('燕麦'));
    assert.ok(text.includes('鸡胸'));
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase6: 饮食记录历史按日期分组', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await gotoDiet(page);
    await page.locator('.meal-card').nth(2).getByRole('button', { name: '记录' }).click();
    await page.locator('textarea[placeholder="吃了什么？（必填）"]').fill('沙拉 + 鱼');
    await page.locator('.modal input[placeholder="热量估算 kcal（可选）"]').fill('520');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await page.waitForFunction(() => window.Stellarium.store.all('meals').length === 1);
    await page.locator('.tab', { hasText: '饮食记录' }).click();
    await page.waitForFunction(() => document.querySelectorAll('.list-item').length === 1);
    const today = await page.evaluate(() => window.Stellarium.Utils.todayStr());
    assert.equal(await page.locator('.group-label', { hasText: today }).count(), 1);
    assert.ok((await page.locator('.list-item').first().textContent()).includes('沙拉'));
    assert.ok((await page.locator('.group-label', { hasText: today }).first().textContent()).includes('520 kcal'));
    assertNoErrors(errors);
  } finally { await browser.close(); }
});