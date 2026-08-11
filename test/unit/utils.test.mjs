import test from 'node:test';
import assert from 'node:assert/strict';
import Utils from '../../js/core/utils.js';

test('utils: 日期工具', () => {
  assert.equal(Utils.addDays('2026-08-10', 1), '2026-08-11');
  assert.equal(Utils.addDays('2026-08-10', -1), '2026-08-09');
  assert.equal(Utils.monthKey('2026-08-10'), '2026-08');
  assert.equal(Utils.monthRange('2026-02').last, '2026-02-28');
  assert.equal(Utils.monthRange('2024-02').last, '2024-02-29');
  assert.equal(Utils.weekStart('2026-08-10'), '2026-08-10');
  assert.equal(Utils.weekStart('2026-08-16'), '2026-08-10');
  assert.equal(Utils.addMonths('2026-12', 1), '2027-01');
  assert.equal(Utils.formatDateCN('2026-08-10'), '2026年8月10日');
  assert.equal(Utils.formatDateCN('2026-08-10', 'YYYY/MM/DD'), '2026/08/10');
  assert.equal(Utils.weekdayCN('2026-08-10'), '星期一');
  assert.equal(Utils.monthDates('2026-02').length, 28);
  assert.equal(Utils.monthDates('2024-02').length, 29);
});

test('utils: 金额与转义', () => {
  assert.equal(Utils.money(12.5), '12.50');
  assert.equal(Utils.money(0), '0.00');
  assert.equal(Utils.parseAmount('abc12.345'), 12.345);
  assert.equal(Utils.parseAmount('¥100'), 100);
  assert.equal(Utils.parseAmount(''), 0);
  assert.equal(Utils.escapeHtml('<b>&"'), '&lt;b&gt;&amp;&quot;');
  assert.equal(Utils.clamp(15, 0, 10), 10);
});

test('utils: PPT 版式文字分配', () => {
  assert.deepEqual(Utils.pickCoverTexts(['季度总结', '2026 Q3', '内部资料']), { title: '季度总结', subtitle: '2026 Q3 · 内部资料' });
  assert.deepEqual(Utils.pickCoverTexts(['只有标题']), { title: '只有标题', subtitle: '' });
  assert.deepEqual(Utils.pickCoverTexts([]), { title: '', subtitle: '' });
  assert.deepEqual(Utils.pickContentParts(['项目进展', '第一条', '第二条']), { title: '项目进展', body: ['第一条', '第二条'] });
  assert.deepEqual(Utils.pickContentParts(['仅标题']), { title: '仅标题', body: [] });
  assert.deepEqual(Utils.pickContentParts(['  ', '内容']), { title: '内容', body: [] });
});
test('utils: pdf.js 文本行分组', () => {
  const items = [
    { str: 'B', transform: [1, 0, 0, 1, 100, 300] },
    { str: 'A', transform: [1, 0, 0, 1, 50, 300] },
    { str: 'C', transform: [1, 0, 0, 1, 80, 200] },
    { str: ' ', transform: [1, 0, 0, 1, 10, 100] },
    { str: '', transform: [1, 0, 0, 1, 20, 100] }
  ];
  assert.deepEqual(Utils.groupTextItems(items), ['AB', 'C']);
  assert.deepEqual(Utils.groupTextItems([]), []);
});
test('utils: 页码范围解析', () => {
  assert.deepEqual(Utils.parsePageRanges('1-3,5,8-10', 10), { ok: true, ranges: [[1, 3], [5, 5], [8, 10]] });
  assert.deepEqual(Utils.parsePageRanges('3-1', 5), { ok: true, ranges: [[1, 3]] });
  assert.deepEqual(Utils.parsePageRanges('1,1-2', 5).ranges, [[1, 1], [1, 2]]);
  assert.deepEqual(Utils.parsePageRanges('1；3-4，6', 6).ranges, [[1, 1], [3, 4], [6, 6]]);
  assert.equal(Utils.parsePageRanges('1-11', 10).ok, false);
  assert.equal(Utils.parsePageRanges('0', 10).ok, false);
  assert.equal(Utils.parsePageRanges('a', 10).ok, false);
  assert.equal(Utils.parsePageRanges('', 10).ok, false);
});
test('utils: uid 唯一', () => {
  assert.notEqual(Utils.uid(), Utils.uid());
});
test('utils: PDF 大小分级', () => {
  const MB = 1048576;
  assert.equal(Utils.pdfSizeLevel(1 * MB).level, 'gold');
  assert.equal(Utils.pdfSizeLevel(10 * MB).level, 'gold');
  assert.equal(Utils.pdfSizeLevel(10 * MB + 1).level, 'ok');
  assert.equal(Utils.pdfSizeLevel(25 * MB).level, 'ok');
  assert.equal(Utils.pdfSizeLevel(25 * MB + 1).level, 'caution');
  assert.equal(Utils.pdfSizeLevel(50 * MB).level, 'caution');
  assert.equal(Utils.pdfSizeLevel(50 * MB + 1).level, 'no');
  assert.equal(Utils.pdfSizeLevel(100 * MB).level, 'no');
  assert.equal(Utils.pdfSizeLevel(100 * MB + 1).level, 'block');
  assert.equal(Utils.pdfSizeLevel(200 * MB).level, 'block');
  assert.equal(Utils.pdfSizeLevel(100 * MB + 1).block, true);
  assert.equal(Utils.pdfSizeLevel(50 * MB).block, false);
  assert.equal(Utils.pdfSizeLevel(10 * MB).warn, false);
  assert.equal(Utils.pdfSizeLevel(50 * MB + 1).warn, true);
  assert.ok(Utils.pdfSizeLevel(0).label.includes('黄金'));
});
