/* Phase 17：实用小工具 - PDF 合并 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openApp, assertNoErrors } from './helpers.mjs';

async function openPdfMerge(page) {
  await page.evaluate(() => window.Stellarium.Router.navigate('tools'));
  await page.waitForSelector('.tool-card');
  await page.locator('.tool-card[data-tool="pdf-merge"]').click();
  await page.waitForSelector('#pdf-merge-input', { state: 'attached' });
}

async function makePdf(page, name, pages) {
  const bytes = await page.evaluate(async n => {
    const doc = await window.PDFLib.PDFDocument.create();
    for (let i = 0; i < n; i++) doc.addPage([200, 200]);
    return Array.from(await doc.save());
  }, pages);
  return { name, mimeType: 'application/pdf', buffer: Buffer.from(bytes) };
}

test('Phase17: 工具页新增 4 个 PDF 卡片且仅合并无即将上线标记', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await page.evaluate(() => window.Stellarium.Router.navigate('tools'));
    await page.waitForSelector('.tool-card');
    for (const id of ['pdf-merge', 'pdf-split', 'pdf-word', 'pdf-ppt']) {
      assert.equal(await page.locator('.tool-card[data-tool="' + id + '"]').count(), 1);
    }
    assert.equal(await page.locator('.tool-card[data-tool="pdf-merge"] .soon').count(), 0);
    assert.equal(await page.locator('.tool-card[data-tool="pdf-split"] .soon').count(), 0);
    assert.equal(await page.locator('.tool-card[data-tool="pdf-word"] .soon').count(), 1);
    assert.equal(await page.locator('.tool-card[data-tool="pdf-ppt"] .soon').count(), 1);
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase17: PDF 合并-上传两个文件并合并下载', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openPdfMerge(page);
    await page.locator('#pdf-merge-input').setInputFiles([
      await makePdf(page, '文档A.pdf', 2),
      await makePdf(page, '文档B.pdf', 3)
    ]);
    await page.waitForSelector('.pdf-row');
    assert.equal(await page.locator('.pdf-row').count(), 2);
    assert.ok((await page.locator('.pdf-row').nth(0).textContent()).includes('文档A.pdf'));
    assert.ok((await page.locator('.pdf-row').nth(1).textContent()).includes('文档B.pdf'));
    assert.equal(await page.locator('.pdf-badge.gold').count(), 2);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#pdf-merge-btn').click()
    ]);
    assert.ok(download.suggestedFilename().endsWith('-合并.pdf'));
    const buf = fs.readFileSync(await download.path());
    assert.equal(buf.slice(0, 5).toString('latin1'), '%PDF-');
    const pageCount = await page.evaluate(async b64 => {
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const doc = await window.PDFLib.PDFDocument.load(bytes);
      return doc.getPageCount();
    }, buf.toString('base64'));
    assert.equal(pageCount, 5);
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase17: PDF 合并-排序/删除与非法文件过滤', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openPdfMerge(page);
    await page.locator('#pdf-merge-input').setInputFiles([
      await makePdf(page, '文档A.pdf', 1),
      await makePdf(page, '文档B.pdf', 1)
    ]);
    await page.waitForSelector('.pdf-row');
    await page.locator('.pdf-row').nth(0).locator('button', { hasText: '↓' }).click();
    assert.equal(await page.locator('.pdf-row').nth(0).locator('.pdf-name').textContent(), '文档B.pdf');
    await page.locator('.pdf-row').nth(1).locator('button', { hasText: '删除' }).click();
    assert.equal(await page.locator('.pdf-row').count(), 1);
    await page.locator('#pdf-merge-input').setInputFiles({ name: '说明.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
    assert.equal(await page.locator('.pdf-row').count(), 1, '非 PDF 文件应被跳过');
    const bigPath = path.join(os.tmpdir(), 'stellarium-pdf-big-test.pdf');
    fs.writeFileSync(bigPath, Buffer.alloc(101 * 1048576));
    try {
      await page.locator('#pdf-merge-input').setInputFiles(bigPath);
      assert.equal(await page.locator('.pdf-row').count(), 1, '超过 100MB 的文件应被拒绝上传');
    } finally { fs.unlinkSync(bigPath); }
    assertNoErrors(errors);
  } finally { await browser.close(); }
});