/* Phase 20：实用小工具 - PDF → PPT */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openApp, assertNoErrors } from './helpers.mjs';

async function openPdfPpt(page) {
  await page.evaluate(() => window.Stellarium.Router.navigate('tools'));
  await page.waitForSelector('.tool-card');
  await page.locator('.tool-card[data-tool="pdf-ppt"]').click();
  await page.waitForSelector('#pdf-ppt-input', { state: 'attached' });
}

async function makePdf(page, name, pages) {
  const bytes = await page.evaluate(async n => {
    const doc = await window.PDFLib.PDFDocument.create();
    const font = await doc.embedFont(window.PDFLib.StandardFonts.Helvetica);
    for (let i = 0; i < n; i++) {
      const p = doc.addPage([595, 842]);
      p.drawText('Stellarium Slide Page ' + (i + 1), { x: 80, y: 700, size: 22, font });
    }
    return Array.from(await doc.save());
  }, pages);
  return { name, mimeType: 'application/pdf', buffer: Buffer.from(bytes) };
}

async function uploadPdf(page, file) {
  await page.locator('#pdf-ppt-input').setInputFiles(file);
  await page.waitForFunction(() => {
    const el = document.querySelector('#pdf-ppt-info');
    return el && el.style.display !== 'none';
  }, null, { timeout: 8000 });
}

test('Phase20: PDF→PPT 卡片无即将上线标记', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await page.evaluate(() => window.Stellarium.Router.navigate('tools'));
    await page.waitForSelector('.tool-card');
    assert.equal(await page.locator('.tool-card[data-tool="pdf-ppt"] .soon').count(), 0);
    assert.equal(await page.locator('.tool-card .soon').count(), 0, '全部工具均已上线');
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase20: PDF 转换为 PPT 并下载', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openPdfPpt(page);
    await uploadPdf(page, await makePdf(page, 'deck.pdf', 3));
    assert.ok((await page.locator('#pdf-ppt-info').textContent()).includes('共 3 页'));
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 120000 }),
      page.locator('#pdf-ppt-btn').click()
    ]);
    assert.ok(download.suggestedFilename().endsWith('-转PPT.pptx'));
    const buf = fs.readFileSync(await download.path());
    assert.equal(buf.slice(0, 2).toString('latin1'), 'PK', '应为 pptx(zip) 文件');
    assert.ok(buf.length > 20000, '应包含页面图片');
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase20: 删除文件与超大文件拒绝', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openPdfPpt(page);
    await uploadPdf(page, await makePdf(page, '待删除.pdf', 2));
    await page.locator('#pdf-ppt-clear').click();
    assert.equal(await page.locator('#pdf-ppt-info').isVisible(), false, '删除后文件信息应隐藏');
    assert.equal(await page.locator('#pdf-ppt-btn').isDisabled(), true, '转换按钮应禁用');
    await uploadPdf(page, await makePdf(page, '新文件.pdf', 1));
    assert.ok((await page.locator('#pdf-ppt-info').textContent()).includes('新文件.pdf'));
    const bigPath = path.join(os.tmpdir(), 'stellarium-pdf-ppt-big.pdf');
    fs.writeFileSync(bigPath, Buffer.alloc(101 * 1048576));
    try {
      await page.locator('#pdf-ppt-input').setInputFiles(bigPath);
      await page.waitForSelector('.toast');
      assert.ok((await page.locator('.toast').last().textContent()).includes('超过 100MB'));
      assert.ok((await page.locator('#pdf-ppt-info').textContent()).includes('新文件.pdf'), '文件信息不应变化');
    } finally { fs.unlinkSync(bigPath); }
    assertNoErrors(errors);
  } finally { await browser.close(); }
});