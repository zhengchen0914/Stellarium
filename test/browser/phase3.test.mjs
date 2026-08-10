/* Phase 3：自媒体 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { openApp, assertNoErrors } from './helpers.mjs';

async function gotoMedia(page) { await page.evaluate(() => window.Stellarium.Router.navigate('media')); }

async function addIdea(page, content, status = '待用') {
  await page.getByRole('button', { name: '＋ 新增灵感' }).click();
  await page.locator('textarea[placeholder="灵感内容（必填）"]').fill(content);
  if (status !== '待用') await page.locator('.modal select').first().selectOption(status);
  await page.getByRole('button', { name: '保存', exact: true }).click();
}

test('Phase3: 灵感库 增删改与状态筛选', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await gotoMedia(page);
    await addIdea(page, '写一篇关于时间管理的文章');
    await addIdea(page, '拍一个做饭的 vlog', '放弃');
    await page.waitForFunction(() => window.Stellarium.store.all('ideas').length === 2);
    await page.waitForFunction(() => document.querySelectorAll('.list-item').length === 2);
    assert.equal(await page.locator('.list-item .title', { hasText: '时间管理' }).count(), 1);
    // 筛选：放弃
    await page.getByRole('button', { name: '放弃', exact: true }).click();
    assert.equal(await page.locator('.list-item').count(), 1);
    assert.equal(await page.locator('.list-item .title', { hasText: 'vlog' }).count(), 1);
    // 编辑
    await page.getByRole('button', { name: '编辑' }).click();
    await page.locator('.modal select').first().selectOption('已采用');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await page.waitForFunction(() => window.Stellarium.store.all('ideas').some(i => i.status === '已采用'));
    // 切回全部后删除一条
    await page.getByRole('button', { name: '全部', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('.list-item').length === 2);
    await page.locator('.list-item button', { hasText: '删除' }).first().click();
    await page.locator('#modal-root').getByRole('button', { name: '删除', exact: true }).click();
    await page.waitForFunction(() => window.Stellarium.store.all('ideas').length === 1);
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase3: 草稿关联灵感 → 灵感自动变为已采用', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await gotoMedia(page);
    await addIdea(page, '关于极简生活的选题');
    const ideaId = await page.evaluate(() => window.Stellarium.store.all('ideas')[0].id);
    await page.locator('.tab', { hasText: '草稿大纲' }).click();
    await page.getByRole('button', { name: '＋ 新建草稿' }).click();
    await page.locator('input[placeholder="标题（必填）"]').fill('极简生活第一弹');
    await page.locator('.modal select').nth(1).selectOption(ideaId);
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await page.waitForFunction((id) => window.Stellarium.store.get('ideas', id).status === '已采用', ideaId);
    const idea = await page.evaluate((id) => window.Stellarium.store.get('ideas', id), ideaId);
    assert.equal(idea.status, '已采用');
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase3: 草稿发布后出现在发布日历，可取消排期', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await gotoMedia(page);
    await page.locator('.tab', { hasText: '草稿大纲' }).click();
    await page.getByRole('button', { name: '＋ 新建草稿' }).click();
    await page.locator('input[placeholder="标题（必填）"]').fill('周末发布的文章');
    await page.locator('.modal select').nth(2).selectOption('已发布');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await page.waitForFunction(() => window.Stellarium.store.all('drafts').some(d => d.status === '已发布'));
    // 日历出现标签
    await page.locator('.tab', { hasText: '发布日历' }).click();
    const today = await page.evaluate(() => window.Stellarium.Utils.todayStr());
    await page.waitForFunction((d) => {
      const cell = [...document.querySelectorAll('.cal-cell')].find(c => c.textContent.includes(String(Number(d.slice(8)))));
      return cell && cell.querySelector('.tags');
    }, today);
    // 点击今天 → 取消排期
    await page.locator('.cal-cell.today').click();
    await page.locator('#modal-root').getByRole('button', { name: '取消排期' }).first().click();
    await page.locator('#modal-root .modal').last().getByRole('button', { name: '取消排期', exact: true }).click();
    await page.waitForFunction(() => window.Stellarium.store.all('schedules').length === 0 && window.Stellarium.store.all('drafts')[0].status === '待发布');
    const draft = await page.evaluate(() => window.Stellarium.store.all('drafts')[0]);
    assert.equal(draft.status, '待发布');
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase3: 安排发布生成排期', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await gotoMedia(page);
    await page.locator('.tab', { hasText: '草稿大纲' }).click();
    await page.getByRole('button', { name: '＋ 新建草稿' }).click();
    await page.locator('input[placeholder="标题（必填）"]').fill('待安排的稿子');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await page.locator('.tab', { hasText: '发布日历' }).click();
    await page.getByRole('button', { name: '安排发布' }).click();
    await page.getByRole('button', { name: '确定', exact: true }).click();
    await page.waitForFunction(() => window.Stellarium.store.all('schedules').length === 1 && window.Stellarium.store.all('drafts')[0].status === '已发布');
    const sched = await page.evaluate(() => window.Stellarium.store.all('schedules')[0]);
    const draft = await page.evaluate(() => window.Stellarium.store.all('drafts')[0]);
    assert.equal(sched.draftId, draft.id);
    assert.equal(draft.status, '已发布');
    assert.equal(await page.locator('.cal-cell.today .tags').count(), 1);
    assertNoErrors(errors);
  } finally { await browser.close(); }
});

test('Phase3: 平台账号增删改', async () => {
  const { browser, page, errors } = await openApp();
  try {
    await gotoMedia(page);
    await page.locator('.tab', { hasText: '平台账号' }).click();
    await page.getByRole('button', { name: '＋ 新增账号' }).click();
    await page.locator('input[placeholder="账号名称（必填）"]').fill('我的公众号');
    await page.locator('.modal select').first().selectOption('公众号');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await page.waitForFunction(() => window.Stellarium.store.all('accounts').length === 1);
    await page.waitForFunction(() => document.querySelectorAll('.sum-card').length === 1);
    assert.equal(await page.locator('.sum-card .s-value', { hasText: '我的公众号' }).count(), 1);
    await page.getByRole('button', { name: '编辑' }).click();
    await page.locator('input[placeholder="账号名称（必填）"]').fill('改名后的号');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await page.waitForFunction(() => window.Stellarium.store.all('accounts')[0].name === '改名后的号');
    await page.waitForFunction(() => [...document.querySelectorAll('.sum-card')].some(el => el.textContent.includes('改名后的号')));
    await page.locator('.sum-card button', { hasText: '删除' }).first().click();
    await page.locator('#modal-root').getByRole('button', { name: '删除', exact: true }).click();
    await page.waitForFunction(() => window.Stellarium.store.all('accounts').length === 0);
    assertNoErrors(errors);
  } finally { await browser.close(); }
});