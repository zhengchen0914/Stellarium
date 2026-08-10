/* 单位换算核心逻辑 */
import test from 'node:test';
import assert from 'node:assert/strict';
import Units from '../../js/core/units.js';

function near(a, b, eps) {
  assert.ok(Math.abs(a - b) <= (eps || 1e-9), a + ' 应接近 ' + b);
}

test('units: 类别完整且系数有效', () => {
  assert.equal(Units.CATEGORIES.length, 12);
  for (const c of Units.CATEGORIES) {
    assert.ok(c.units.length >= 3, c.id + ' 至少 3 个单位');
    if (!c.temp) {
      for (const u of c.units) {
        assert.ok(isFinite(u.factor) && u.factor > 0, c.id + '/' + u.id + ' 系数应有效');
      }
    }
  }
});

test('units: 长度换算', () => {
  assert.equal(Units.convert('length', 1, 'km', 'm'), 1000);
  near(Units.convert('length', 1, 'ft', 'cm'), 30.48);
  assert.equal(Units.convert('length', 1, 'mi', 'm'), 1609.344);
  near(Units.convert('length', 1, 'li', 'km'), 0.5);
  near(Units.convert('length', 100, 'cm', 'm'), 1);
  near(Units.convert('length', 1, 'inch', 'mm'), 25.4);
});

test('units: 温度换算', () => {
  assert.equal(Units.convert('temperature', 0, 'c', 'f'), 32);
  assert.equal(Units.convert('temperature', 100, 'c', 'f'), 212);
  near(Units.convert('temperature', 0, 'c', 'k'), 273.15);
  near(Units.convert('temperature', 32, 'f', 'c'), 0);
  near(Units.convert('temperature', 373.15, 'k', 'c'), 100);
  near(Units.convert('temperature', 0, 'k', 'f'), -459.67);
});

test('units: 质量/面积/数据/压力/能量', () => {
  assert.equal(Units.convert('mass', 1, 'kg', 'g'), 1000);
  assert.equal(Units.convert('mass', 1, 'jin', 'kg'), 0.5);
  near(Units.convert('mass', 1, 'lb', 'g'), 453.59237);
  assert.equal(Units.convert('area', 1, 'km2', 'm2'), 1e6);
  near(Units.convert('area', 1, 'mu', 'm2'), 2000 / 3);
  assert.equal(Units.convert('data', 1, 'gb', 'mb'), 1024);
  assert.equal(Units.convert('data', 1, 'kb', 'bit'), 1024 * 8);
  assert.equal(Units.convert('pressure', 1, 'atm', 'pa'), 101325);
  near(Units.convert('energy', 1, 'kwh', 'j'), 3.6e6);
});

test('units: 角度与格式', () => {
  near(Units.convert('angle', 180, 'deg', 'rad'), Math.PI);
  assert.equal(Units.convert('angle', 1, 'turn', 'deg'), 360);
  assert.equal(Units.format(1000), '1000');
  assert.equal(Units.format(0.30000000000000004), '0.3');
  assert.equal(Units.format(0), '0');
  assert.ok(Units.format(1e20).includes('e+'), '超大数用科学计数法');
});