/* 浏览器端测试公共设施（Playwright + 系统 Edge） */
import { createRequire } from 'node:module';
const NODE_MODULES = 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const require = createRequire(NODE_MODULES + '/root.js');
export const { chromium } = require('playwright');

export const APP_URL = 'file:///E:/AIAPP/Stellarium/index.html';

export async function clearStorage(page) {
  await page.evaluate(async () => {
    if (window.indexedDB) {
      await new Promise((resolve, reject) => {
        const req = indexedDB.deleteDatabase('stellarium');
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    }
    if (window.localStorage) window.localStorage.clear();
  });
}

export async function openApp(opts = {}) {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  if (opts.clearStorage !== false) {
    await page.goto(APP_URL).catch(() => {});
    await clearStorage(page);
  }
  await page.goto(APP_URL);
  await page.waitForFunction(() => window.Stellarium && window.Stellarium.ready === true, null, { timeout: 15000 });
  return { browser, page, errors };
}

export function assertNoErrors(errors) {
  const real = errors.filter(e => !/favicon/i.test(e));
  if (real.length) throw new Error('页面出现错误：' + real.join(' | '));
}