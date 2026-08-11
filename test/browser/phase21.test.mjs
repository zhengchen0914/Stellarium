/* Phase 21：实用小工具 - PPT 美化 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { openApp, assertNoErrors } from './helpers.mjs';

const require = createRequire(import.meta.url);
const JSZip = require('../../js/lib/jszip.min.js');

async function openPptBeautify(page) {
  await page.evaluate(() => window.Stellarium.Router.navigate('tools'));
  await page.waitForSelector('.tool-card');
  await page.locator('.tool-card[data-tool="ppt-beautify"]').click();
  await page.waitForSelector('#ppt-beautify-input', { state: 'attached' });
}

async function makeDeck(page) {
  const b64 = await page.evaluate(async () => {
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 });
    pptx.layout = 'WIDE';
    let s = pptx.addSlide();
    s.addText('季度工作总结', { x: 1, y: 2, w: 11, h: 1.2, fontSize: 36, bold: true });
    s.addText('2026 年第三季度', { x: 1, y: 3.4, w: 11, h: 0.8, fontSize: 18 });
    s = pptx.addSlide();
    s.addText('项目进展', { x: 0.6, y: 0.4, w: 8, h: 0.8, fontSize: 28, bold: true });
    s.addText('1. 完成 PDF 工具套件开发\n2. 全部功能已上线', { x: 0.6, y: 1.4, w: 8, h: 2.5, fontSize: 18 });
    const canvas = document.createElement('canvas');
    canvas.width = 320; canvas.height = 180;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#7aa2ff';
    ctx.fillRect(0, 0, 320, 180);
    s = pptx.addSlide();
    s.addText('数据图表', { x: 0.6, y: 0.4, w: 8, h: 0.8, fontSize: 28, bold: true });
    s.addImage({ data: canvas.toDataURL('image/png'), x: 1, y: 1.6, w: 6, h: 3.4 });
    return await pptx.write({ outputType: 'base64' });
  });
  return { name: '原稿.pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', buffer: Buffer.from(b64, 'base64') };
}

async function uploadDeck(page, file) {
  await page.locator('#ppt-beautify-input').setInputFiles(file);
  await page.waitForFunction(() => {
    const el = document.querySelector('#ppt-beautify-info');
    return el && el.style.display !== 'none' && document.querySelector('#ppt-beautify-parse').textContent.includes('解析完成');
  }, null, { timeout: 15000 });
}

test('Phase21: PPT 美化卡片上线且无即将上线标记', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await page.evaluate(() => window.Stellarium.Router.navigate('tools'));
    await page.waitForSelector('.tool-card');
    assert.equal(await page.locator('.tool-card').count(), 12);
    assert.equal(await page.locator('.tool-card[data-tool="ppt-beautify"] .soon').count(), 0);
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase21: 上传解析并生成美化 PPT', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openPptBeautify(page);
    await uploadDeck(page, await makeDeck(page));
    assert.ok((await page.locator('#ppt-beautify-info').textContent()).includes('共 3 页'));
    assert.ok((await page.locator('#ppt-beautify-parse').textContent()).includes('文字'));
    await page.locator('.ppt-tpl-btn', { hasText: '商务深蓝' }).click();
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 120000 }),
      page.locator('#ppt-beautify-btn').click()
    ]);
    assert.ok(download.suggestedFilename().endsWith('-美化.pptx'));
    const buf = fs.readFileSync(await download.path());
    assert.equal(buf.slice(0, 2).toString('latin1'), 'PK', '应为 pptx(zip) 文件');
    const zip = await JSZip.loadAsync(buf);
    const slide1 = await zip.file('ppt/slides/slide1.xml').async('string');
    assert.ok(slide1.includes('季度工作总结'), '美化稿封面应保留原标题文字');
    const slide3 = await zip.file('ppt/slides/slide3.xml').async('string');
    assert.ok(slide3.includes('数据图表'), '美化稿第 3 页应保留文字');
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase21: 删除文件与非法/超大文件拒绝', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openPptBeautify(page);
    await uploadDeck(page, await makeDeck(page));
    await page.locator('#ppt-beautify-clear').click();
    assert.equal(await page.locator('#ppt-beautify-info').isVisible(), false, '删除后文件信息应隐藏');
    assert.equal(await page.locator('#ppt-beautify-btn').isDisabled(), true, '生成按钮应禁用');
    await page.locator('#ppt-beautify-input').setInputFiles({ name: '说明.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
    await page.waitForTimeout(300);
    assert.equal(await page.locator('#ppt-beautify-info').isVisible(), false, '非 PPTX 文件不应被载入');
    const bigPath = path.join(os.tmpdir(), 'stellarium-ppt-big.pptx');
    fs.writeFileSync(bigPath, Buffer.alloc(101 * 1048576));
    try {
      await page.locator('#ppt-beautify-input').setInputFiles(bigPath);
      await page.waitForSelector('.toast');
      assert.ok((await page.locator('.toast').last().textContent()).includes('超过 100MB'));
    } finally { fs.unlinkSync(bigPath); }
    assertNoErrors(errors);
  } finally { await browser.close(); }
});