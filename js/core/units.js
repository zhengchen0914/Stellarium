/* 星隅 单位换算核心（纯逻辑，Node 可测） */
(function (global) {
  'use strict';

  const CATEGORIES = [
    {
      id: 'length', name: '长度', base: '米', units: [
        { id: 'm', name: '米', factor: 1 },
        { id: 'km', name: '千米', factor: 1000 },
        { id: 'cm', name: '厘米', factor: 0.01 },
        { id: 'mm', name: '毫米', factor: 0.001 },
        { id: 'inch', name: '英寸', factor: 0.0254 },
        { id: 'ft', name: '英尺', factor: 0.3048 },
        { id: 'yd', name: '码', factor: 0.9144 },
        { id: 'mi', name: '英里', factor: 1609.344 },
        { id: 'nmi', name: '海里', factor: 1852 },
        { id: 'li', name: '里', factor: 500 },
        { id: 'chi', name: '尺', factor: 1 / 3 },
        { id: 'cun', name: '寸', factor: 1 / 30 }
      ]
    },
    {
      id: 'area', name: '面积', base: '平方米', units: [
        { id: 'm2', name: '平方米', factor: 1 },
        { id: 'km2', name: '平方千米', factor: 1e6 },
        { id: 'ha', name: '公顷', factor: 10000 },
        { id: 'mu', name: '亩', factor: 2000 / 3 },
        { id: 'cm2', name: '平方厘米', factor: 1e-4 },
        { id: 'ft2', name: '平方英尺', factor: 0.09290304 },
        { id: 'in2', name: '平方英寸', factor: 0.00064516 },
        { id: 'yd2', name: '平方码', factor: 0.83612736 },
        { id: 'acre', name: '英亩', factor: 4046.8564224 },
        { id: 'mi2', name: '平方英里', factor: 2589988.110336 }
      ]
    },
    {
      id: 'volume', name: '体积/容积', base: '升', units: [
        { id: 'l', name: '升', factor: 1 },
        { id: 'ml', name: '毫升', factor: 0.001 },
        { id: 'cm3', name: '立方厘米', factor: 0.001 },
        { id: 'm3', name: '立方米', factor: 1000 },
        { id: 'galUS', name: '加仑（美）', factor: 3.785411784 },
        { id: 'galUK', name: '加仑（英）', factor: 4.54609 },
        { id: 'qtUS', name: '夸脱（美）', factor: 0.946352946 },
        { id: 'ptUS', name: '品脱（美）', factor: 0.473176473 },
        { id: 'flozUS', name: '液盎司（美）', factor: 0.0295735296 },
        { id: 'ft3', name: '立方英尺', factor: 28.316846592 },
        { id: 'in3', name: '立方英寸', factor: 0.016387064 }
      ]
    },
    {
      id: 'mass', name: '质量/重量', base: '千克', units: [
        { id: 'kg', name: '千克', factor: 1 },
        { id: 'g', name: '克', factor: 0.001 },
        { id: 'mg', name: '毫克', factor: 1e-6 },
        { id: 't', name: '吨', factor: 1000 },
        { id: 'jin', name: '斤', factor: 0.5 },
        { id: 'liang', name: '两', factor: 0.05 },
        { id: 'lb', name: '磅', factor: 0.45359237 },
        { id: 'oz', name: '盎司', factor: 0.0283495231 },
        { id: 'stone', name: '英石', factor: 6.35029318 },
        { id: 'carat', name: '克拉', factor: 0.0002 }
      ]
    },
    {
      id: 'temperature', name: '温度', temp: true, base: '摄氏度', units: [
        { id: 'c', name: '摄氏度' },
        { id: 'f', name: '华氏度' },
        { id: 'k', name: '开尔文' }
      ]
    },
    {
      id: 'time', name: '时间', base: '秒', units: [
        { id: 's', name: '秒', factor: 1 },
        { id: 'ms', name: '毫秒', factor: 0.001 },
        { id: 'min', name: '分钟', factor: 60 },
        { id: 'h', name: '小时', factor: 3600 },
        { id: 'day', name: '天', factor: 86400 },
        { id: 'week', name: '周', factor: 604800 },
        { id: 'month', name: '月（按 30 天）', factor: 2592000 },
        { id: 'year', name: '年（按 365 天）', factor: 31536000 }
      ]
    },
    {
      id: 'speed', name: '速度', base: '米/秒', units: [
        { id: 'ms', name: '米/秒', factor: 1 },
        { id: 'kmh', name: '千米/小时', factor: 1 / 3.6 },
        { id: 'mph', name: '英里/小时', factor: 0.44704 },
        { id: 'knot', name: '节', factor: 0.5144444444 },
        { id: 'fts', name: '英尺/秒', factor: 0.3048 }
      ]
    },
    {
      id: 'data', name: '数据存储', base: '字节', units: [
        { id: 'b', name: '字节', factor: 1 },
        { id: 'bit', name: '位', factor: 0.125 },
        { id: 'kb', name: 'KB', factor: 1024 },
        { id: 'mb', name: 'MB', factor: 1048576 },
        { id: 'gb', name: 'GB', factor: 1073741824 },
        { id: 'tb', name: 'TB', factor: 1099511627776 }
      ]
    },
    {
      id: 'pressure', name: '压力', base: '帕斯卡', units: [
        { id: 'pa', name: '帕斯卡', factor: 1 },
        { id: 'kpa', name: '千帕', factor: 1000 },
        { id: 'mpa', name: '兆帕', factor: 1e6 },
        { id: 'bar', name: '巴', factor: 100000 },
        { id: 'atm', name: '标准大气压', factor: 101325 },
        { id: 'mmhg', name: '毫米汞柱', factor: 133.322387415 },
        { id: 'psi', name: '磅力/平方英寸', factor: 6894.757293168 }
      ]
    },
    {
      id: 'power', name: '功率', base: '瓦', units: [
        { id: 'w', name: '瓦', factor: 1 },
        { id: 'kw', name: '千瓦', factor: 1000 },
        { id: 'mw', name: '兆瓦', factor: 1e6 },
        { id: 'hp', name: '马力', factor: 745.6998715823 }
      ]
    },
    {
      id: 'energy', name: '能量', base: '焦耳', units: [
        { id: 'j', name: '焦耳', factor: 1 },
        { id: 'kj', name: '千焦', factor: 1000 },
        { id: 'wh', name: '瓦时', factor: 3600 },
        { id: 'kwh', name: '千瓦时', factor: 3.6e6 },
        { id: 'cal', name: '卡路里', factor: 4.184 },
        { id: 'kcal', name: '千卡', factor: 4184 }
      ]
    },
    {
      id: 'angle', name: '角度', base: '度', units: [
        { id: 'deg', name: '度', factor: 1 },
        { id: 'rad', name: '弧度', factor: 180 / Math.PI },
        { id: 'turn', name: '圆周', factor: 360 }
      ]
    }
  ];

  function getCategory(id) {
    return CATEGORIES.find(c => c.id === id) || null;
  }

  function tempToC(value, unit) {
    if (unit === 'c') return value;
    if (unit === 'f') return (value - 32) * 5 / 9;
    return value - 273.15; /* k */
  }

  function cToTemp(c, unit) {
    if (unit === 'c') return c;
    if (unit === 'f') return c * 9 / 5 + 32;
    return c + 273.15; /* k */
  }

  function convert(catId, value, fromId, toId) {
    const cat = getCategory(catId);
    const v = Number(value);
    if (!cat || !isFinite(v)) return null;
    if (cat.temp) return cToTemp(tempToC(v, fromId), toId);
    const from = cat.units.find(u => u.id === fromId);
    const to = cat.units.find(u => u.id === toId);
    if (!from || !to) return null;
    return v * from.factor / to.factor;
  }

  function format(n) {
    if (n === 0) return '0';
    if (!isFinite(n)) return String(n);
    const abs = Math.abs(n);
    if (abs >= 1e15 || (abs > 0 && abs < 1e-9)) return n.toExponential(6);
    const r = Math.round(n * 1e6) / 1e6;
    let s = String(r);
    if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s === '-0' ? '0' : s;
  }

  const Units = { CATEGORIES, getCategory, convert, format };

  if (typeof module !== 'undefined' && module.exports) module.exports = Units;
  global.Stellarium = global.Stellarium || {};
  global.Stellarium.Units = Units;
})(typeof window !== 'undefined' ? window : globalThis);