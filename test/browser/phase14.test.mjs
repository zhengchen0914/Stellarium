/* Phase 14：实用小工具 - 随机抽签 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp, assertNoErrors } from './helpers.mjs';

async function openLottery(page) {
  await page.evaluate(() => window.Stellarium.Router.navigate('tools'));
  await page.waitForSelector('.tool-card');
  await page.locator('.tool-card[data-tool="lottery"]').click();
  await page.waitForSelector('#lottery-result');
}

async function waitSettled(page) {
  await page.waitForFunction(() => {
    const box = document.querySelector('.lottery-result');
    return box && !box.classList.contains('rolling') && !document.querySelector('#lottery-draw').disabled;
  }, null, { timeout: 10000 });
}

test('Phase14: 随机抽签默认状态与卡片无即将上线标记', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await page.evaluate(() => window.Stellarium.Router.navigate('tools'));
    await page.waitForSelector('.tool-card');
    assert.equal(await page.locator('.tool-card[data-tool="lottery"] .soon').count(), 0);
    await page.locator('.tool-card[data-tool="lottery"]').click();
    await page.waitForSelector('#lottery-result');
    assert.equal(await page.locator('#lottery-count').inputValue(), '1');
    assert.equal(await page.locator('#lottery-repeat').isChecked(), false);
    assert.equal(await page.locator('.lottery-presets .btn').count(), 3);
    await page.locator('#lottery-options').fill('测试内容');
    await page.locator('#lottery-preset-custom').click();
    assert.equal(await page.locator('#lottery-options').inputValue(), '');
    assert.ok((await page.locator('#lottery-history-list').textContent()).includes('暂无抽签记录'));
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase14: 保存选项并抽签，结果来自选项', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openLottery(page);
    await page.locator('#lottery-options').fill('火锅\n烧烤\n面条');
    await page.locator('#lottery-save').click();
    await page.waitForSelector('.toast.success', { timeout: 5000 });
    await page.locator('#lottery-draw').click();
    await waitSettled(page);
    const result = await page.evaluate(() => document.querySelector('.lottery-result-main').textContent);
    assert.ok(['火锅', '烧烤', '面条'].includes(result), '结果应来自选项，实际为：' + result);
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase14: 多数量不重复抽取且互不相同', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openLottery(page);
    await page.locator('#lottery-options').fill('选项一\n选项二\n选项三\n选项四\n选项五');
    await page.locator('#lottery-save').click();
    await page.waitForSelector('.toast.success', { timeout: 5000 });
    await page.locator('#lottery-count').fill('3');
    await page.locator('#lottery-draw').click();
    await waitSettled(page);
    const items = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.lottery-result-item .lottery-result-txt')).map(x => x.textContent));
    assert.equal(items.length, 3);
    assert.equal(new Set(items).size, 3, '不重复抽取时结果应互不相同');
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase14: 未保存选项与数量超限时提示', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openLottery(page);
    await page.locator('#lottery-draw').click();
    await page.waitForSelector('.toast.error');
    assert.ok((await page.locator('.toast.error').last().textContent()).includes('请先填写并保存抽签选项'));
    await page.locator('#lottery-options').fill('甲\n乙');
    await page.locator('#lottery-save').click();
    await page.waitForSelector('.toast.success', { timeout: 5000 });
    await page.locator('#lottery-count').fill('3');
    await page.locator('#lottery-draw').click();
    await page.waitForSelector('.toast.error');
    assert.ok((await page.locator('.toast.error').last().textContent()).includes('数量不能超过选项数'));
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase14: 历史记录与清空', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openLottery(page);
    await page.locator('#lottery-options').fill('甲\n乙\n丙');
    await page.locator('#lottery-save').click();
    await page.waitForSelector('.toast.success', { timeout: 5000 });
    await page.locator('#lottery-draw').click();
    await waitSettled(page);
    await page.waitForFunction(() => document.querySelectorAll('.lottery-hist-row').length === 1, null, { timeout: 5000 });
    await page.locator('#lottery-hist-clear').click();
    await page.waitForFunction(() => document.querySelectorAll('.lottery-hist-row').length === 0, null, { timeout: 5000 });
    assert.ok((await page.locator('#lottery-history-list').textContent()).includes('暂无抽签记录'));
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase14: 选项持久化（刷新后仍在）', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openLottery(page);
    await page.locator('#lottery-options').fill('周一\n周二\n周三');
    await page.locator('#lottery-save').click();
    await page.waitForSelector('.toast.success', { timeout: 5000 });
    await page.reload();
    await page.waitForFunction(() => window.Stellarium && window.Stellarium.ready === true);
    await openLottery(page);
    assert.equal(await page.locator('#lottery-options').inputValue(), '周一\n周二\n周三');
    assert.equal(await page.locator('#lottery-count').inputValue(), '1');
    assertNoErrors(errors);
  } finally { await browser.close(); }
});