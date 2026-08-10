/* Phase 0：骨架、路由、侧边栏、本地持久化 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp, assertNoErrors } from './helpers.mjs';

test('Phase0: 10 个导航可切换且无报错', async () => {
  const { browser, page, errors } = await openApp();
  try {
    const items = await page.locator('.sidebar .nav-item').count();
    assert.equal(items, 10);
    const routes = ['home', 'today', 'journal', 'media', 'dev', 'fitness', 'diet', 'tools', 'games', 'settings'];
    for (const r of routes) {
      await page.evaluate((name) => window.Stellarium.Router.navigate(name), r);
      await page.waitForTimeout(50);
      const active = await page.locator('.sidebar .nav-item.active').getAttribute('data-route');
      assert.equal(active, r, '导航高亮应为 ' + r);
      const title = await page.locator('#main-content .page-title').textContent();
      assert.ok(title && title.trim().length > 0, r + ' 页面应有标题');
    }
    assertNoErrors(errors);
  } finally {
    await browser.close();
  }
});

test('Phase0: 数据写入刷新后仍在（IndexedDB 持久化）', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await page.evaluate(async () => {
      await window.Stellarium.store.add('memos', { content: '持久化测试备忘' });
    });
    await page.reload();
    await page.waitForFunction(() => window.Stellarium && window.Stellarium.ready === true);
    const memos = await page.evaluate(() => window.Stellarium.store.all('memos'));
    assert.ok(memos.some(m => m.content === '持久化测试备忘'), '刷新后备忘应存在');
    assertNoErrors(errors);
  } finally {
    await browser.close();
  }
});

test('Phase0: 首次启动自动写入种子数据', async () => {
  const { browser, page, errors } = await openApp();
  try {
    const cats = await page.evaluate(() => window.Stellarium.store.all('categories'));
    assert.equal(cats.length, 6);
    const settings = await page.evaluate(() => window.Stellarium.store.snapshot().settings);
    assert.equal(settings.appName, '星隅');
    assertNoErrors(errors);
  } finally {
    await browser.close();
  }
});