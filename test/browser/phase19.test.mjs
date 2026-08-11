/* Phase 19：实用小工具 - PDF → Word */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openApp, assertNoErrors } from './helpers.mjs';

async function openPdfWord(page) {
  await page.evaluate(() => window.Stellarium.Router.navigate('tools'));
  await page.waitForSelector('.tool-card');
  await page.locator('.tool-card[data-tool="pdf-word"]').click();
  await page.waitForSelector('#pdf-word-input', { state: 'attached' });
}

async function makePdf(page, name, pages) {
  const bytes = await page.evaluate(async n => {
    const doc = await window.PDFLib.PDFDocument.create();
    const font = await doc.embedFont(window.PDFLib.StandardFonts.Helvetica);
    for (let i = 0; i < n; i++) {
      const p = doc.addPage([595, 842]);
      p.drawText('Hello Stellarium Page ' + (i + 1), { x: 80, y: 700, size: 22, font });
      p.drawText('Sample text line for conversion.', { x: 80, y: 660, size: 12, font });
    }
    return Array.from(await doc.save());
  }, pages);
  return { name, mimeType: 'application/pdf', buffer: Buffer.from(bytes) };
}

test('Phase19: PDF→Word 卡片无即将上线标记', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await page.evaluate(() => window.Stellarium.Router.navigate('tools'));
    await page.waitForSelector('.tool-card');
    assert.equal(await page.locator('.tool-card[data-tool="pdf-word"] .soon').count(), 0);
    assert.equal(await page.locator('.tool-card[data-tool="pdf-ppt"] .soon').count(), 1);
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase19: PDF 转换为 Word 并下载', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openPdfWord(page);
    await page.locator('#pdf-word-input').setInputFiles(await makePdf(page, 'demo.pdf', 3));
    await page.waitForFunction(() => document.querySelector('#pdf-word-info') && document.querySelector('#pdf-word-info').style.display !== 'none');
    assert.ok((await page.locator('#pdf-word-info').textContent()).includes('共 3 页'));
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 90000 }),
      page.locator('#pdf-word-btn').click()
    ]);
    assert.ok(download.suggestedFilename().endsWith('-转Word.docx'));
    const buf = fs.readFileSync(await download.path());
    assert.equal(buf.slice(0, 2).toString('latin1'), 'PK', '应为 docx(zip) 文件');
    assert.ok(buf.length > 10000, '应包含图片与文本内容');
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase19: 删除已上传的 PDF', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openPdfWord(page);
    await page.locator('#pdf-word-input').setInputFiles(await makePdf(page, '待删除.pdf', 2));
    await page.waitForFunction(() => {
      const el = document.querySelector('#pdf-word-info');
      return el && el.style.display !== 'none';
    });
    await page.locator('#pdf-word-clear').click();
    assert.equal(await page.locator('#pdf-word-info').isVisible(), false, '删除后文件信息应隐藏');
    assert.equal(await page.locator('#pdf-word-btn').isDisabled(), true, '转换按钮应禁用');
    await page.locator('#pdf-word-input').setInputFiles(await makePdf(page, '新文件.pdf', 1));
    await page.waitForFunction(() => {
      const el = document.querySelector('#pdf-word-info');
      return el && el.style.display !== 'none';
    });
    assert.ok((await page.locator('#pdf-word-info').textContent()).includes('新文件.pdf'));
    assertNoErrors(errors);
  } finally { await browser.close(); }
});
test('Phase19: 不包含图片选项与超大文件拒绝', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openPdfWord(page);
    await page.locator('#pdf-word-input').setInputFiles(await makePdf(page, 'text.pdf', 2));
    await page.waitForFunction(() => document.querySelector('#pdf-word-info') && document.querySelector('#pdf-word-info').style.display !== 'none');
    await page.locator('#pdf-word-images').uncheck();
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 90000 }),
      page.locator('#pdf-word-btn').click()
    ]);
    const buf = fs.readFileSync(await download.path());
    assert.equal(buf.slice(0, 2).toString('latin1'), 'PK');
    assert.ok(buf.length < 50000, '纯文本模式文件应更小');
    const bigPath = path.join(os.tmpdir(), 'stellarium-pdf-word-big.pdf');
    fs.writeFileSync(bigPath, Buffer.alloc(101 * 1048576));
    try {
      await page.locator('#pdf-word-input').setInputFiles(bigPath);
      await page.waitForSelector('.toast');
      assert.ok((await page.locator('.toast').last().textContent()).includes('超过 100MB'));
      assert.ok((await page.locator('#pdf-word-info').textContent()).includes('text.pdf'));
    } finally { fs.unlinkSync(bigPath); }
    assertNoErrors(errors);
  } finally { await browser.close(); }
});