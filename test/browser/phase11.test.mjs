/* Phase 11：实用小工具 - 随机数生成器 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp, assertNoErrors } from './helpers.mjs';

async function openRand(page) {
  await page.evaluate(() => window.Stellarium.Router.navigate('tools'));
  await page.waitForSelector('.tool-card');
  await page.locator('.tool-card[data-tool="rand"]').click();
  await page.waitForSelector('#rand-generate');
}

async function setField(page, id, value) {
  await page.locator('#' + id).fill(String(value));
}

function results(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('#rand-results .rand-result')).map(x => x.textContent));
}

test('Phase11: 随机数生成器卡片无即将上线标记', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await page.evaluate(() => window.Stellarium.Router.navigate('tools'));
    await page.waitForSelector('.tool-card');
    const soon = await page.locator('.tool-card[data-tool="rand"] .soon').count();
    assert.equal(soon, 0, '随机数生成器卡片不应有即将上线标记');
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase11: 打开随机数生成器，默认参数 0-10 数量 1 小数位数 0', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openRand(page);
    assert.equal(await page.locator('#rand-min').inputValue(), '0');
    assert.equal(await page.locator('#rand-max').inputValue(), '10');
    assert.equal(await page.locator('#rand-count').inputValue(), '1');
    assert.equal(await page.locator('#rand-decimals').inputValue(), '0');
    await page.locator('#rand-generate').click();
    const r = await results(page);
    assert.equal(r.length, 1);
    const v = Number(r[0]);
    assert.ok(Number.isInteger(v) && v >= 0 && v <= 10, '默认范围应为 0-10 整数，得到 ' + r[0]);
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase11: 指定范围与数量，结果为范围内整数', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openRand(page);
    await setField(page, 'rand-min', '5');
    await setField(page, 'rand-max', '8');
    await setField(page, 'rand-count', '20');
    await page.locator('#rand-generate').click();
    const r = await results(page);
    assert.equal(r.length, 20);
    for (const s of r) {
      const v = Number(s);
      assert.ok(Number.isInteger(v) && v >= 5 && v <= 8, '每个结果应为 5-8 整数，得到 ' + s);
    }
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase11: 0-1 范围默认生成整数，设置小数位数后生成小数', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openRand(page);
    await setField(page, 'rand-min', '0');
    await setField(page, 'rand-max', '1');
    await setField(page, 'rand-count', '10');
    await page.locator('#rand-generate').click();
    let r = await results(page);
    assert.equal(r.length, 10);
    for (const s of r) {
      const v = Number(s);
      assert.ok(Number.isInteger(v) && v >= 0 && v <= 1, '默认应为 0-1 整数，得到 ' + s);
    }
    await setField(page, 'rand-decimals', '2');
    await page.locator('#rand-generate').click();
    r = await results(page);
    for (const s of r) {
      assert.match(s, /^\d+\.\d{2}$/, '应保留 2 位小数，得到 ' + s);
      const v = Number(s);
      assert.ok(v >= 0 && v <= 1, '数值应在 0-1 之间，得到 ' + s);
    }
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase11: 小数位数大于 0 时任意范围生成小数', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openRand(page);
    await setField(page, 'rand-min', '0');
    await setField(page, 'rand-max', '10');
    await setField(page, 'rand-decimals', '2');
    await setField(page, 'rand-count', '5');
    await page.locator('#rand-generate').click();
    const r = await results(page);
    assert.equal(r.length, 5);
    for (const s of r) {
      assert.match(s, /^\d+\.\d{2}$/, '应保留 2 位小数，得到 ' + s);
      const v = Number(s);
      assert.ok(v >= 0 && v <= 10, '数值应在 0-10 之间，得到 ' + s);
    }
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase11: 边界值与非法输入', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openRand(page);
    await setField(page, 'rand-min', '7');
    await setField(page, 'rand-max', '7');
    await page.locator('#rand-generate').click();
    assert.deepEqual(await results(page), ['7']);

    await setField(page, 'rand-min', '9');
    await setField(page, 'rand-max', '3');
    await page.locator('#rand-generate').click();
    await page.waitForSelector('.toast.error');
    assert.ok((await page.locator('.toast').last().textContent()).includes('最大值'));

    await setField(page, 'rand-min', '0');
    await setField(page, 'rand-max', '10');
    await setField(page, 'rand-count', '0');
    await page.locator('#rand-generate').click();
    await page.waitForTimeout(100);
    assert.ok((await page.locator('.toast').last().textContent()).includes('数量'));
    assertNoErrors(errors);
  } finally { await browser.close(); }
});