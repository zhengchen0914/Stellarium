/* Phase 6：饮食计划 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp, assertNoErrors } from './helpers.mjs';

async function gotoDiet(page) { await page.evaluate(() => window.Stellarium.Router.navigate('diet')); }

/* 针对 Playwright/Edge 快速连续 fill 偶发投递错位：填写后校验，失败则关闭弹窗重试。
   最终断言不变，仅增强输入投递的确定性。 */
async function fillTemplateForm(page) {
  const fields = [
    ['input[placeholder="模板名称（必填）"]', '增肌日'],
    ['textarea[placeholder="早餐 内容（可选）"]', '燕麦 + 蛋白粉'],
    ['.modal input[placeholder="kcal"] >> nth=0', '400'],
    ['textarea[placeholder="午餐 内容（可选）"]', '米饭 + 鸡胸']
  ];
  let attempts = 0;
  while (true) {
    attempts++;
    await page.getByRole('button', { name: '＋ 新建模板' }).click();
    await page.waitForSelector('.modal input[placeholder="模板名称（必填）"]');
    for (const [sel, text] of fields) {
      await page.locator(sel).fill(text);
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(80);
    const ok = await page.evaluate(() => {
      const m = document.querySelector('#modal-root .modal');
      if (!m) return false;
      const q = (ph, tag) => m.querySelector(tag + '[placeholder="' + ph + '"]');
      return q('模板名称（必填）', 'input').value === '增肌日'
        && q('早餐 内容（可选）', 'textarea').value === '燕麦 + 蛋白粉'
        && m.querySelector('input[placeholder="kcal"]').value === '400'
        && q('午餐 内容（可选）', 'textarea').value === '米饭 + 鸡胸';
    });
    if (ok) return;
    if (attempts >= 3) throw new Error('模板表单填写连续失败（输入投递异常）');
    await page.locator('#modal-root .overlay').click({ position: { x: 8, y: 8 } }).catch(() => {});
    await page.waitForSelector('#modal-root .modal', { state: 'detached' });
  }
}

test('Phase6: 记录早餐并实时累计总热量', async () => {
  const { browser, page, errors } = await openApp();
  const wf = (fn, label) => page.waitForFunction(fn, null, { timeout: 10000 }).catch(e => { console.log('STEP_TIMEOUT:', label); throw e; });
  try {
    await gotoDiet(page);
    await page.locator('.meal-card').first().getByRole('button', { name: '记录' }).click();
    await page.locator('textarea[placeholder="吃了什么？（必填）"]').fill('鸡蛋 + 牛奶');
    await page.locator('.modal input[placeholder="热量估算 kcal（可选）"]').fill('350');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await wf(() => window.Stellarium.store.all('meals').length === 1, 'meals==1');
    await wf(() => document.querySelector('#main-content').textContent.includes('350 kcal'), 'text-350kcal');
    assert.equal(await page.evaluate(() => window.Stellarium.store.all('meals')[0].meal), '早餐');
    // 编辑为 400
    await page.locator('.meal-card').first().getByRole('button', { name: '编辑' }).click();
    await page.locator('.modal input[placeholder="热量估算 kcal（可选）"]').fill('400');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await wf(() => Number(window.Stellarium.store.all('meals')[0].calories) === 400, 'calories==400');
    await wf(() => document.querySelector('#main-content').textContent.includes('400 kcal'), 'text-400kcal');
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase6: 模板新建与套用到今天', async () => {
  const { browser, page, errors } = await openApp();
  const wf = (fn, label) => page.waitForFunction(fn, null, { timeout: 10000 }).catch(e => { console.log('STEP_TIMEOUT:', label); throw e; });
  try {
    await gotoDiet(page);
    await page.locator('.tab', { hasText: '计划模板' }).click();
    await fillTemplateForm(page);
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await wf(() => window.Stellarium.store.all('dietTemplates').length === 1, 'dietTemplates==1');
    await wf(() => document.querySelectorAll('.summary-grid .card').length === 1, 'grid-card==1');
    // 套用到今天
    await page.getByRole('button', { name: '套用到今天' }).click();
    await page.waitForSelector('#modal-root .modal');
    await page.locator('#modal-root .modal').last().getByRole('button', { name: '套用', exact: true }).click();
    await wf(() => window.Stellarium.store.all('meals').length === 2, 'meals==2');
    await page.locator('.tab', { hasText: '今日饮食' }).click();
    await wf(() => document.querySelector('#main-content').textContent.includes('400 kcal'), 'text-400kcal');
    const text = await page.locator('#main-content').textContent();
    assert.ok(text.includes('燕麦'));
    assert.ok(text.includes('鸡胸'));
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase6: 饮食记录历史按日期分组', async () => {
  const { browser, page, errors } = await openApp();
  const wf = (fn, label) => page.waitForFunction(fn, null, { timeout: 10000 }).catch(e => { console.log('STEP_TIMEOUT:', label); throw e; });
  try {
    await gotoDiet(page);
    await page.locator('.meal-card').nth(2).getByRole('button', { name: '记录' }).click();
    await page.locator('textarea[placeholder="吃了什么？（必填）"]').fill('沙拉 + 鱼');
    await page.locator('.modal input[placeholder="热量估算 kcal（可选）"]').fill('520');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await wf(() => window.Stellarium.store.all('meals').length === 1, 'meals==1');
    await page.locator('.tab', { hasText: '饮食记录' }).click();
    await wf(() => document.querySelectorAll('.list-item').length === 1, 'history-list==1');
    const today = await page.evaluate(() => window.Stellarium.Utils.todayStr());
    assert.equal(await page.locator('.group-label', { hasText: today }).count(), 1);
    assert.ok((await page.locator('.list-item').first().textContent()).includes('沙拉'));
    assert.ok((await page.locator('.group-label', { hasText: today }).first().textContent()).includes('520 kcal'));
    assertNoErrors(errors);
  } finally { await browser.close(); }
});