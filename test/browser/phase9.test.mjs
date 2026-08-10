/* Phase 9：自定义壁纸（首页入口 + 压缩持久化 + 可读性蒙版） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp, assertNoErrors } from './helpers.mjs';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

test('Phase9: 首页可打开换壁纸弹窗且无报错', async () => {
  const { browser, page, errors } = await openApp();
  try {
    assert.equal(await page.locator('.wallpaper-btn').count(), 1, '首页应有换壁纸按钮');
    await page.locator('.wallpaper-btn').click();
    await page.waitForSelector('#wallpaper-file-input', { state: 'attached' });
    const text = await page.locator('#modal-root .modal').textContent();
    assert.ok(text.includes('更换壁纸'));
    assertNoErrors(errors);
  } finally {
    await browser.close();
  }
});

test('Phase9: 弹窗有关闭按钮可点击关闭', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await page.locator('.wallpaper-btn').click();
    await page.waitForSelector('#wallpaper-file-input', { state: 'attached' });
    const closeBtn = page.locator('#modal-root .modal-close');
    assert.equal(await closeBtn.count(), 1, '弹窗应有关闭按钮');
    await closeBtn.click();
    await page.waitForFunction(() => !document.querySelector('#modal-root .modal'));
    assertNoErrors(errors);
  } finally {
    await browser.close();
  }
});
test('Phase9: 选择图片后生成壁纸层与蒙版并持久化', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await page.locator('.wallpaper-btn').click();
    await page.setInputFiles('#wallpaper-file-input', { name: 'test.png', mimeType: 'image/png', buffer: PNG });
    await page.waitForFunction(() => {
      const wp = window.Stellarium.store.snapshot().settings.wallpaper;
      return wp && wp.dataUrl && wp.dataUrl.startsWith('data:image/jpeg');
    });
    const layerBg = await page.evaluate(() => document.getElementById('wallpaper-layer').style.backgroundImage);
    assert.ok(layerBg.includes('data:image/jpeg'), '背景层应使用压缩后的图片');
    const maskOk = await page.evaluate(() => {
      const m = document.getElementById('wallpaper-mask');
      return getComputedStyle(m).display !== 'none' && /rgba?\(/.test(m.style.background || '');
    });
    assert.equal(maskOk, true, '蒙版应可见');
    assert.equal(await page.locator('#modal-root .modal img').count(), 1, '弹窗内应有预览图');

    await page.reload();
    await page.waitForFunction(() => window.Stellarium && window.Stellarium.ready === true);
    const wp2 = await page.evaluate(() => window.Stellarium.store.snapshot().settings.wallpaper);
    assert.ok(wp2 && wp2.dataUrl.startsWith('data:image/jpeg'), '刷新后壁纸应保留');
    const layerDisplay = await page.evaluate(() => getComputedStyle(document.getElementById('wallpaper-layer')).display);
    assert.equal(layerDisplay, 'block', '刷新后壁纸层应可见');
    assertNoErrors(errors);
  } finally {
    await browser.close();
  }
});

test('Phase9: 蒙版滑杆可调并保存', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await page.locator('.wallpaper-btn').click();
    await page.setInputFiles('#wallpaper-file-input', { name: 't.png', mimeType: 'image/png', buffer: PNG });
    await page.waitForFunction(() => window.Stellarium.store.snapshot().settings.wallpaper);
    await page.evaluate(() => {
      const r = document.getElementById('wallpaper-mask-range');
      r.value = '80';
      r.dispatchEvent(new Event('input', { bubbles: true }));
      r.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForFunction(() => window.Stellarium.store.snapshot().settings.wallpaperMask === 80);
    const maskBg = await page.evaluate(() => document.getElementById('wallpaper-mask').style.background);
    assert.ok(maskBg.includes('rgba(5, 8, 20, 0.8'), '蒙版背景应随滑杆更新');
    assertNoErrors(errors);
  } finally {
    await browser.close();
  }
});

test('Phase9: 恢复默认背景', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await page.locator('.wallpaper-btn').click();
    await page.setInputFiles('#wallpaper-file-input', { name: 't.png', mimeType: 'image/png', buffer: PNG });
    await page.waitForFunction(() => window.Stellarium.store.snapshot().settings.wallpaper);
    await page.locator('#wallpaper-reset-btn').click();
    await page.waitForFunction(() => !window.Stellarium.store.snapshot().settings.wallpaper && getComputedStyle(document.getElementById('wallpaper-layer')).display === 'none');
    const layerDisplay = await page.evaluate(() => getComputedStyle(document.getElementById('wallpaper-layer')).display);
    assert.equal(layerDisplay, 'none', '恢复后壁纸层应隐藏');
    assertNoErrors(errors);
  } finally {
    await browser.close();
  }
});

test('Phase9: 非图片文件被拒绝', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await page.locator('.wallpaper-btn').click();
    await page.setInputFiles('#wallpaper-file-input', { name: 'a.txt', mimeType: 'text/plain', buffer: Buffer.from('hi') });
    await page.waitForTimeout(300);
    const wp = await page.evaluate(() => window.Stellarium.store.snapshot().settings.wallpaper);
    assert.equal(wp, null, '非图片文件不应被保存');
    assert.ok(await page.locator('.toast.error').count() >= 1, '应提示错误');
    assertNoErrors(errors);
  } finally {
    await browser.close();
  }
});