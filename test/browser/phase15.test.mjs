/* Phase 15：实用小工具 - 掷骰子 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp, assertNoErrors } from './helpers.mjs';

async function openDice(page) {
  await page.evaluate(() => window.Stellarium.Router.navigate('tools'));
  await page.waitForSelector('.tool-card');
  await page.locator('.tool-card[data-tool="dice"]').click();
  await page.waitForSelector('#dice-roll');
}

async function waitSettled(page) {
  await page.waitForFunction(() => {
    const faces = document.querySelectorAll('.dice-face').length;
    return faces > 0 && !document.querySelector('#dice-roll').disabled;
  }, null, { timeout: 10000 });
}

test('Phase15: 掷骰子默认状态与卡片无即将上线标记', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await page.evaluate(() => window.Stellarium.Router.navigate('tools'));
    await page.waitForSelector('.tool-card');
    assert.equal(await page.locator('.tool-card[data-tool="dice"] .soon').count(), 0);
    await page.locator('.tool-card[data-tool="dice"]').click();
    await page.waitForSelector('#dice-roll');
    assert.equal(await page.locator('.dice-type-btn').count(), 7);
    assert.ok(await page.locator('.dice-type-btn[data-faces="6"]').evaluate(el => el.classList.contains('active')));
    assert.equal(await page.locator('#dice-count').inputValue(), '1');
    assert.ok((await page.locator('#dice-history-list').textContent()).includes('暂无投掷记录'));
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase15: 掷 d6 结果在 1–6 且显示点数', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openDice(page);
    await page.locator('#dice-roll').click();
    await waitSettled(page);
    assert.equal(await page.locator('.dice-face').count(), 1);
    assert.equal(await page.locator('.dice-face .dice-pips').count(), 1, 'd6 应以点数显示');
    const pips = await page.locator('.dice-face .dice-pips .pip').count();
    assert.ok(pips >= 1 && pips <= 6, '点数应在 1–6，实际 ' + pips);
    await page.waitForFunction(() => document.querySelectorAll('.dice-hist-row').length === 1, null, { timeout: 5000 });
    assert.ok((await page.locator('.dice-hist-row').first().textContent()).includes('d6×1'));
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase15: 多骰子投掷并显示汇总', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openDice(page);
    await page.locator('#dice-count').fill('3');
    await page.locator('#dice-roll').click();
    await waitSettled(page);
    assert.equal(await page.locator('.dice-face').count(), 3);
    const summary = await page.locator('#dice-summary').textContent();
    assert.ok(summary.includes('总和') && summary.includes('最大') && summary.includes('最小'));
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase15: 切换骰子类型与数量上限校验', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openDice(page);
    await page.locator('.dice-type-btn[data-faces="20"]').click();
    assert.ok(await page.locator('.dice-type-btn[data-faces="20"]').evaluate(el => el.classList.contains('active')));
    await page.locator('#dice-count').fill('99');
    await page.locator('.dice-type-btn[data-faces="6"]').click();
    assert.equal(await page.locator('#dice-count').inputValue(), '10');
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase15: 历史记录与清空', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openDice(page);
    await page.locator('#dice-roll').click();
    await waitSettled(page);
    await page.waitForFunction(() => document.querySelectorAll('.dice-hist-row').length === 1, null, { timeout: 5000 });
    await page.locator('#dice-hist-clear').click();
    await page.waitForFunction(() => document.querySelectorAll('.dice-hist-row').length === 0, null, { timeout: 5000 });
    assert.ok((await page.locator('#dice-history-list').textContent()).includes('暂无投掷记录'));
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase15: 骰子类型与数量持久化（刷新后仍在）', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openDice(page);
    await page.locator('.dice-type-btn[data-faces="20"]').click();
    await page.locator('#dice-count').fill('2');
    await page.locator('#dice-roll').click();
    await waitSettled(page);
    await page.reload();
    await page.waitForFunction(() => window.Stellarium && window.Stellarium.ready === true);
    await openDice(page);
    assert.ok(await page.locator('.dice-type-btn[data-faces="20"]').evaluate(el => el.classList.contains('active')));
    assert.equal(await page.locator('#dice-count').inputValue(), '2');
    assertNoErrors(errors);
  } finally { await browser.close(); }
});