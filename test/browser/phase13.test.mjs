/* Phase 13：实用小工具 - 番茄钟 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp, assertNoErrors } from './helpers.mjs';

async function openPomo(page) {
  await page.evaluate(() => window.Stellarium.Router.navigate('tools'));
  await page.waitForSelector('.tool-card');
  await page.locator('.tool-card[data-tool="pomodoro"]').click();
  await page.waitForSelector('#pomo-time');
}

function timeText(page) {
  return page.evaluate(() => document.getElementById('pomo-time').textContent);
}

test('Phase13: 番茄钟默认状态与模式切换', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openPomo(page);
    assert.equal(await timeText(page), '25:00');
    assert.equal(await page.locator('#pomo-run').textContent(), '开始');
    assert.equal(await page.locator('.pomo-mode-btn').count(), 3);
    assert.ok((await page.locator('#pomo-count').textContent()).includes('0 个番茄'));
    await page.locator('.pomo-mode-btn[data-mode="short"]').click();
    assert.equal(await timeText(page), '05:00');
    await page.locator('.pomo-mode-btn[data-mode="long"]').click();
    assert.equal(await timeText(page), '15:00');
    await page.locator('.pomo-mode-btn[data-mode="focus"]').click();
    assert.equal(await timeText(page), '25:00');
    assert.equal(await page.locator('#pomo-run').textContent(), '开始');
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase13: 开始/暂停计时', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openPomo(page);
    await page.locator('#pomo-run').click();
    assert.equal(await page.locator('#pomo-run').textContent(), '暂停');
    await page.waitForTimeout(2200);
    const t1 = await timeText(page);
    assert.notEqual(t1, '25:00', '计时应开始减少');
    await page.locator('#pomo-run').click();
    await page.waitForTimeout(1100);
    assert.equal(await page.locator('#pomo-run').textContent(), '继续');
    assert.equal(await timeText(page), t1, '暂停后时间应保持不变');
    await page.locator('#pomo-reset').click();
    assert.equal(await timeText(page), '25:00');
    assert.equal(await page.locator('#pomo-run').textContent(), '开始');
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase13: 设置保存并持久化', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openPomo(page);
    await page.locator('#pomo-focus').fill('30');
    await page.locator('#pomo-short').fill('7');
    await page.locator('#pomo-save').click();
    await page.waitForSelector('.toast.success', { timeout: 5000 });
    await page.waitForFunction(() => window.Stellarium.store.snapshot().settings.pomodoro
      && window.Stellarium.store.snapshot().settings.pomodoro.focusMin === 30);
    assert.equal(await timeText(page), '30:00');
    await page.reload();
    await page.waitForFunction(() => window.Stellarium && window.Stellarium.ready === true);
    await openPomo(page);
    assert.equal(await timeText(page), '30:00');
    assert.equal(await page.locator('#pomo-focus').inputValue(), '30');
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase13: 极短时长完成并计数', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openPomo(page);
    await page.locator('#pomo-focus').fill('0.1');
    await page.locator('#pomo-save').click();
    await page.waitForFunction(() => window.Stellarium.store.snapshot().settings.pomodoro
      && window.Stellarium.store.snapshot().settings.pomodoro.focusMin === 0.1);
    await page.locator('#pomo-run').click();
    await page.waitForFunction(() => window.Stellarium.store.all('pomodoros').some(p => p.type === 'focus'), null, { timeout: 15000 });
    const count = await page.evaluate(() => window.Stellarium.store.all('pomodoros').filter(p => p.date === window.Stellarium.Utils.todayStr() && p.type === 'focus').length);
    assert.ok(count >= 1, '应记录完成的番茄');
    assert.ok((await page.locator('#pomo-count').textContent()).includes(count + ' 个番茄'));
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase13: 卡片无即将上线标记并可返回', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await page.evaluate(() => window.Stellarium.Router.navigate('tools'));
    await page.waitForSelector('.tool-card');
    assert.equal(await page.locator('.tool-card[data-tool="pomodoro"] .soon').count(), 0);
    await page.locator('.tool-card[data-tool="pomodoro"]').click();
    await page.waitForSelector('#pomo-time');
    await page.getByRole('button', { name: '← 返回工具列表' }).click();
    await page.waitForSelector('.tool-card');
    assert.equal(await page.locator('.tool-card').count(), 11);
    assertNoErrors(errors);
  } finally { await browser.close(); }
});