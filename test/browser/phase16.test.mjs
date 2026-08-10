/* Phase 16：实用小工具 - 备忘便签 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp, assertNoErrors } from './helpers.mjs';

async function openNotes(page) {
  await page.evaluate(() => window.Stellarium.Router.navigate('tools'));
  await page.waitForSelector('.tool-card');
  await page.locator('.tool-card[data-tool="notes"]').click();
  await page.waitForSelector('#notes-list');
}

async function createNote(page, title, content, color) {
  await page.locator('#notes-new').click();
  await page.waitForSelector('#note-title');
  if (title) await page.locator('#note-title').fill(title);
  if (content) await page.locator('#note-content').fill(content);
  if (color) await page.locator('.note-color-dot.' + color).click();
  await page.locator('#note-save').click();
  await page.waitForSelector('#note-title', { state: 'detached', timeout: 5000 });
}

test('Phase16: 便签默认状态与卡片无即将上线标记', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await page.evaluate(() => window.Stellarium.Router.navigate('tools'));
    await page.waitForSelector('.tool-card');
    assert.equal(await page.locator('.tool-card[data-tool="notes"] .soon').count(), 0);
    await page.locator('.tool-card[data-tool="notes"]').click();
    await page.waitForSelector('#notes-list');
    assert.ok((await page.locator('#notes-list').textContent()).includes('还没有便签'));
    assert.equal(await page.locator('#notes-stats').textContent(), '');
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase16: 新建与编辑便签', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openNotes(page);
    await createNote(page, '工作待办', '写周报');
    assert.equal(await page.locator('.note-card').count(), 1);
    assert.ok((await page.locator('#notes-stats').textContent()).includes('共 1 条'));
    assert.ok((await page.locator('.note-card').first().textContent()).includes('工作待办'));
    await page.locator('.note-card').first().click();
    await page.waitForSelector('#note-title');
    assert.equal(await page.locator('#note-title').inputValue(), '工作待办');
    await page.locator('#note-content').fill('写周报并回复邮件');
    await page.locator('#note-save').click();
    await page.waitForSelector('#note-title', { state: 'detached', timeout: 5000 });
    assert.ok((await page.locator('.note-card').first().textContent()).includes('回复邮件'));
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase16: 便签颜色与置顶排序', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openNotes(page);
    await createNote(page, '第一条', '内容甲');
    await createNote(page, '第二条', '内容乙', 'pink');
    assert.equal(await page.locator('.note-card').count(), 2);
    assert.equal(await page.locator('.note-card.pink').count(), 1);
    assert.ok((await page.locator('.note-card.pink').first().textContent()).includes('第二条'), '粉色便签应为第二条');
    await page.locator('.note-card', { hasText: '第一条' }).locator('.note-act[data-action="pin"]').click();
    await page.waitForFunction(() => {
      const t = document.querySelector('.note-card .note-title');
      return t && t.textContent.includes('第一条');
    }, null, { timeout: 5000 });
    const firstTitle = await page.locator('.note-card').first().locator('.note-title').textContent();
    assert.ok(firstTitle.includes('第一条'), '置顶后应排在最前');
    assert.ok((await page.locator('#notes-stats').textContent()).includes('置顶 1 条'));
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase16: 搜索过滤', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openNotes(page);
    await createNote(page, '工作待办', '写周报');
    await createNote(page, '买菜清单', '鸡蛋、牛奶');
    await page.locator('#notes-search').fill('买菜');
    assert.equal(await page.locator('.note-card').count(), 1);
    assert.ok((await page.locator('.note-card').first().textContent()).includes('买菜清单'));
    await page.locator('#notes-search').fill('不存在的内容');
    assert.ok((await page.locator('#notes-list').textContent()).includes('没有匹配的便签'));
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase16: 删除便签与持久化', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await openNotes(page);
    await createNote(page, '待删除', '内容');
    await page.locator('.note-act[data-action="del"]').click();
    await page.waitForSelector('.modal .btn.danger');
    await page.locator('.modal .btn.danger').click();
    await page.waitForFunction(() => document.querySelectorAll('.note-card').length === 0, null, { timeout: 5000 });
    assert.ok((await page.locator('#notes-list').textContent()).includes('还没有便签'));
    await createNote(page, '持久化便签', '刷新后仍在');
    await page.reload();
    await page.waitForFunction(() => window.Stellarium && window.Stellarium.ready === true);
    await openNotes(page);
    assert.equal(await page.locator('.note-card').count(), 1);
    assert.ok((await page.locator('.note-card').first().textContent()).includes('持久化便签'));
    assertNoErrors(errors);
  } finally { await browser.close(); }
});