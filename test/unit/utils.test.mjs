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

test('utils: uid 唯一', () => {
  assert.notEqual(Utils.uid(), Utils.uid());
});