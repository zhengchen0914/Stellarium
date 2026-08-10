/* Phase 10：实用小工具 - 计算器 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp, assertNoErrors } from './helpers.mjs';

async function openCalc(page) {
  await page.evaluate(() => window.Stellarium.Router.navigate('tools'));
  await page.waitForSelector('.tool-card');
  await page.locator('.tool-card[data-tool="calc"]').click();
  await page.waitForSelector('#calc-display');
}

function display(page) {
  return page.evaluate(() => document.getElementById('calc-display').textContent);
}

async function clickKey(page, key) {
  await page.locator('.calc-btn[data-key="' + key + '"]').click();
}

test('Phase10: 打开计算器并返回工具列表', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openCalc(page);
    assert.equal(await display(page), '0');
    assert.equal(await page.locator('.calc-btn').count(), 20);
    await page.getByRole('button', { name: '← 返回工具列表' }).click();
    await page.waitForSelector('.tool-card');
    assert.equal(await page.locator('.tool-card').count(), 7);
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase10: 基础四则运算', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openCalc(page);
    await clickKey(page, '7'); await clickKey(page, '+'); await clickKey(page, '8'); await clickKey(page, '=');
    assert.equal(await display(page), '15');
    await clickKey(page, 'C');
    await clickKey(page, '9'); await clickKey(page, '*'); await clickKey(page, '9'); await clickKey(page, '=');
    assert.equal(await display(page), '81');
    await clickKey(page, 'C');
    await clickKey(page, '8'); await clickKey(page, '/'); await clickKey(page, '2'); await clickKey(page, '=');
    assert.equal(await display(page), '4');
    await clickKey(page, 'C');
    await clickKey(page, '1'); await clickKey(page, '0'); await clickKey(page, '-'); await clickKey(page, '3'); await clickKey(page, '-'); await clickKey(page, '2'); await clickKey(page, '=');
    assert.equal(await display(page), '5');
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase10: 除零显示错误并可清除', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openCalc(page);
    await clickKey(page, '5'); await clickKey(page, '/'); await clickKey(page, '0'); await clickKey(page, '=');
    assert.equal(await display(page), '错误');
    await clickKey(page, 'C');
    assert.equal(await display(page), '0');
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase10: 退格/正负号/百分号', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openCalc(page);
    await clickKey(page, '1'); await clickKey(page, '2'); await clickKey(page, '3');
    await clickKey(page, 'Backspace');
    assert.equal(await display(page), '12');
    await clickKey(page, 'neg');
    assert.equal(await display(page), '-12');
    await clickKey(page, 'neg');
    assert.equal(await display(page), '12');
    await clickKey(page, 'C');
    await clickKey(page, '5'); await clickKey(page, '0'); await clickKey(page, '%');
    assert.equal(await display(page), '0.5');
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase10: 键盘输入', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openCalc(page);
    await page.keyboard.type('12');
    await page.keyboard.press('+');
    await page.keyboard.type('3');
    await page.keyboard.press('Enter');
    assert.equal(await display(page), '15');
    assertNoErrors(errors);
  } finally { await browser.close(); }
});