/* Phase 18：实用小工具 - 拆分 / 提取页面 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openApp, assertNoErrors } from './helpers.mjs';

async function openPdfSplit(page) {
  await page.evaluate(() => window.Stellarium.Router.navigate('tools'));
  await page.waitForSelector('.tool-card');
  await page.locator('.tool-card[data-tool="pdf-split"]').click();
  await page.waitForSelector('#pdf-split-input', { state: 'attached' });
}

async function makePdf(page, name, pages) {
  const bytes = await page.evaluate(async n => {
    const doc = await window.PDFLib.PDFDocument.create();
    const font = await doc.embedFont(window.PDFLib.StandardFonts.Helvetica);
    for (let i = 0; i < n; i++) {
      const p = doc.addPage([200, 200]);
      p.drawText('P' + (i + 1), { x: 90, y: 100, size: 24, font });
    }
    return Array.from(await doc.save());
  }, pages);
  return { name, mimeType: 'application/pdf', buffer: Buffer.from(bytes) };
}

async function uploadPdf(page, file) {
  await page.locator('#pdf-split-input').setInputFiles(file);
  await page.waitForFunction(() => {
    const el = document.querySelector('#pdf-split-info');
    return el && el.style.display !== 'none' && el.textContent.includes('共 6 页');
  }, null, { timeout: 8000 });
}

async function readPageCount(page, buf) {
  return page.evaluate(async b64 => {
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const doc = await window.PDFLib.PDFDocument.load(bytes);
    return doc.getPageCount();
  }, buf.toString('base64'));
}

async function waitDownloads(page, expected, timeoutMs) {
  const downloads = [];
  page.on('download', d => downloads.push(d));
  const deadline = Date.now() + timeoutMs;
  while (downloads.length < expected && Date.now() < deadline) {
    await page.waitForTimeout(100);
  }
  return downloads;
}

test('Phase18: 拆分/提取卡片无即将上线标记', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await page.evaluate(() => window.Stellarium.Router.navigate('tools'));
    await page.waitForSelector('.tool-card');
    assert.equal(await page.locator('.tool-card[data-tool="pdf-split"] .soon').count(), 0);
    assert.equal(await page.locator('.tool-card[data-tool="pdf-word"] .soon').count(), 1);
    assert.equal(await page.locator('.tool-card[data-tool="pdf-ppt"] .soon').count(), 1);
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase18: 提取页面并下载', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openPdfSplit(page);
    await uploadPdf(page, await makePdf(page, '报告.pdf', 6));
    await page.locator('#pdf-extract-range').fill('2-3,5');
    await page.waitForFunction(() => document.querySelector('#pdf-extract-preview').textContent.includes('3 页'));
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#pdf-extract-btn').click()
    ]);
    assert.ok(download.suggestedFilename().endsWith('-提取.pdf'));
    const buf = fs.readFileSync(await download.path());
    assert.equal(await readPageCount(page, buf), 3);
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase18: 按份数拆分', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openPdfSplit(page);
    await uploadPdf(page, await makePdf(page, '长文档.pdf', 6));
    await page.locator('.tab', { hasText: '按份数拆分' }).click();
    await page.locator('#pdf-split-every').fill('2');
    await page.waitForFunction(() => document.querySelector('#pdf-split-preview').textContent.includes('3 个文件'));
    const downloads = await waitDownloads(page, 3, 5000);
    await page.locator('#pdf-split-btn').click();
    await page.waitForTimeout(2500);
    assert.equal(downloads.length, 3);
    for (let i = 0; i < 3; i++) {
      assert.ok(downloads[i].suggestedFilename().includes('第' + (i + 1) + '部分'));
      const buf = fs.readFileSync(await downloads[i].path());
      assert.equal(await readPageCount(page, buf), 2);
    }
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase18: 自定义拆分与超大文件拒绝', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openPdfSplit(page);
    await uploadPdf(page, await makePdf(page, '材料.pdf', 6));
    await page.locator('.tab', { hasText: '自定义拆分' }).click();
    await page.locator('#pdf-custom-range').fill('1-2,4-6');
    await page.waitForFunction(() => document.querySelector('#pdf-custom-preview').textContent.includes('2 个文件'));
    const downloads = await waitDownloads(page, 2, 5000);
    await page.locator('#pdf-custom-btn').click();
    await page.waitForTimeout(2000);
    assert.equal(downloads.length, 2);
    const pageCounts = [];
    for (const d of downloads) {
      pageCounts.push(await readPageCount(page, fs.readFileSync(await d.path())));
    }
    assert.deepEqual(pageCounts.sort(), [2, 3]);
    const bigPath = path.join(os.tmpdir(), 'stellarium-pdf-split-big.pdf');
    fs.writeFileSync(bigPath, Buffer.alloc(101 * 1048576));
    try {
      await page.locator('#pdf-split-input').setInputFiles(bigPath);
      await page.waitForSelector('.toast');
      assert.ok((await page.locator('.toast').last().textContent()).includes('超过 100MB'), '应提示超大文件被拒绝');
      assert.ok((await page.locator('#pdf-split-info').textContent()).includes('材料.pdf'), '文件信息不应变化');
    } finally { fs.unlinkSync(bigPath); }
    assertNoErrors(errors);
  } finally { await browser.close(); }
});