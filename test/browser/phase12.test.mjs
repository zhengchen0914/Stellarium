/* Phase 12：实用小工具 - 单位换算 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp, assertNoErrors } from './helpers.mjs';

async function openConvert(page) {
  await page.evaluate(() => window.Stellarium.Router.navigate('tools'));
  await page.waitForSelector('.tool-card');
  await page.locator('.tool-card[data-tool="convert"]').click();
  await page.waitForSelector('#convert-result');
}

function result(page) {
  return page.evaluate(() => document.getElementById('convert-result').textContent);
}

async function setValue(page, id, value) {
  await page.locator('#' + id).fill(String(value));
}

test('Phase12: 单位换算卡片无即将上线标记并可打开', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await page.evaluate(() => window.Stellarium.Router.navigate('tools'));
    await page.waitForSelector('.tool-card');
    assert.equal(await page.locator('.tool-card[data-tool="convert"] .soon').count(), 0);
    await page.locator('.tool-card[data-tool="convert"]').click();
    await page.waitForSelector('#convert-result');
    assert.equal(await page.locator('#convert-cat').inputValue(), 'length');
    assert.equal(await page.locator('#convert-from').inputValue(), 'm');
    assert.equal(await page.locator('#convert-to').inputValue(), 'km');
    assert.equal(await page.locator('#convert-value').inputValue(), '1');
    assert.equal(await result(page), '0.001 千米');
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase12: 长度实时换算与交换单位', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openConvert(page);
    await setValue(page, 'convert-value', '1000');
    assert.equal(await result(page), '1 千米');
    await page.locator('#convert-swap').click();
    assert.equal(await page.locator('#convert-from').inputValue(), 'km');
    assert.equal(await page.locator('#convert-to').inputValue(), 'm');
    assert.equal(await result(page), '1000000 米');
    await setValue(page, 'convert-value', '5');
    assert.equal(await result(page), '5000 米');
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase12: 温度换算', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openConvert(page);
    await page.locator('#convert-cat').selectOption('temperature');
    assert.equal(await page.locator('#convert-from').inputValue(), 'c');
    assert.equal(await page.locator('#convert-to').inputValue(), 'f');
    await setValue(page, 'convert-value', '0');
    assert.equal(await result(page), '32 华氏度');
    await setValue(page, 'convert-value', '100');
    assert.equal(await result(page), '212 华氏度');
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase12: 质量与参考表', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openConvert(page);
    await page.locator('#convert-cat').selectOption('mass');
    await setValue(page, 'convert-value', '1');
    assert.equal(await result(page), '1000 克');
    const refRows = await page.locator('#convert-ref .convert-ref-row').count();
    assert.ok(refRows >= 5, '应有参考表');
    const refText = await page.locator('#convert-ref').textContent();
    assert.ok(refText.includes('1 千克'), '参考表应含基准单位');
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase12: 数据存储与返回', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openConvert(page);
    await page.locator('#convert-cat').selectOption('data');
    await page.locator('#convert-from').selectOption('mb');
    await page.locator('#convert-to').selectOption('kb');
    await setValue(page, 'convert-value', '1');
    assert.equal(await result(page), '1024 KB');
    await page.getByRole('button', { name: '← 返回工具列表' }).click();
    await page.waitForSelector('.tool-card');
    assert.equal(await page.locator('.tool-card').count(), 11);
    assertNoErrors(errors);
  } finally { await browser.close(); }
});