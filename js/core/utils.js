/* 星隅 核心工具（纯逻辑，Node 可测） */
(function (global) {
  'use strict';

  function pad2(n) { return String(n).padStart(2, '0'); }

  function toDate(v) {
    if (v instanceof Date) return v;
    const parts = String(v).split('-').map(Number);
    return new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
  }

  function dateStr(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }

  function todayStr() { return dateStr(new Date()); }

  function addDays(v, n) {
    const d = toDate(v);
    d.setDate(d.getDate() + n);
    return dateStr(d);
  }

  function formatDateCN(v, fmt) {
    const d = toDate(v);
    if (fmt === 'YYYY/MM/DD') return d.getFullYear() + '/' + pad2(d.getMonth() + 1) + '/' + pad2(d.getDate());
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  function weekdayCN(v) {
    const names = ['日', '一', '二', '三', '四', '五', '六'];
    return '星期' + names[toDate(v).getDay()];
  }

  function monthKey(v) {
    const d = toDate(v);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1);
  }

  function monthRange(key) {
    const parts = key.split('-').map(Number);
    const first = new Date(parts[0], parts[1] - 1, 1);
    const last = new Date(parts[0], parts[1], 0);
    return { first: dateStr(first), last: dateStr(last) };
  }

  function weekStart(v, monday = true) {
    const d = toDate(v);
    const day = d.getDay();
    d.setDate(d.getDate() - (monday ? (day === 0 ? 6 : day - 1) : day));
    return dateStr(d);
  }

  function addMonths(key, n) {
    const parts = key.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1 + n, 1);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1);
  }

  function uid() { return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10); }

  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

  /* PDF 文件大小分级（单位：字节），黄金 ≤10MB / 舒适 ≤25MB / 谨慎 ≤50MB / 不推荐 >50MB */
  /* 解析页码范围，如 "1-3,5,8-10"，返回规范化范围数组 [[start,end],...] */
  /* PPT 美化：封面页标题与副标题分配 */
  function pickCoverTexts(texts) {
    const t = (texts || []).map(s => String(s).trim()).filter(Boolean);
    if (!t.length) return { title: '', subtitle: '' };
    return { title: t[0], subtitle: t.slice(1).join(' · ') };
  }

  /* PPT 美化：内容页标题与正文分配（首段作标题，其余作正文） */
  function pickContentParts(texts) {
    const t = (texts || []).map(s => String(s).trim()).filter(Boolean);
    if (!t.length) return { title: '', body: [] };
    return { title: t[0], body: t.slice(1) };
  }
  /* 按 y 坐标将 pdf.js 文本项分组为行，返回每行文本（行内按 x 排序） */
  function groupTextItems(items) {
    const rows = [];
    for (const it of items || []) {
      if (!it.str || !it.str.trim()) continue;
      const y = Math.round((it.transform && it.transform[5]) || 0);
      let row = rows.find(r => Math.abs(r.y - y) <= 2);
      if (!row) { row = { y: y, items: [] }; rows.push(row); }
      row.items.push(it);
    }
    rows.sort((a, b) => b.y - a.y);
    return rows.map(r => {
      r.items.sort((a, b) => (a.transform[4] || 0) - (b.transform[4] || 0));
      return r.items.map(i => i.str).join('');
    });
  }

  function parsePageRanges(str, total) {
    const ranges = [];
    const parts = String(str).split(/[,，;；]/);
    for (const raw of parts) {
      const p = raw.trim();
      if (!p) continue;
      const m = p.match(/^(\d+)\s*-\s*(\d+)$/);
      if (m) {
        let a = parseInt(m[1], 10);
        let b = parseInt(m[2], 10);
        if (a > b) { const t = a; a = b; b = t; }
        if (a < 1 || b > total) return { ok: false, error: '页码超出范围（共 ' + total + ' 页）' };
        ranges.push([a, b]);
      } else if (/^\d+$/.test(p)) {
        const n = parseInt(p, 10);
        if (n < 1 || n > total) return { ok: false, error: '页码超出范围（共 ' + total + ' 页）' };
        ranges.push([n, n]);
      } else {
        return { ok: false, error: '无法识别的页码「' + p + '」（示例：1-3,5,8-10）' };
      }
    }
    if (!ranges.length) return { ok: false, error: '请至少输入一个页码或范围' };
    return { ok: true, ranges };
  }

  function pdfSizeLevel(size) {
    const mb = size / 1048576;
    if (mb <= 10) return { level: 'gold', label: '黄金区间', desc: '≤10MB，处理速度最佳', warn: false, block: false };
    if (mb <= 25) return { level: 'ok', label: '舒适区间', desc: '10MB~25MB，处理流畅', warn: false, block: false };
    if (mb <= 50) return { level: 'caution', label: '谨慎区间', desc: '25MB~50MB，处理偏慢', warn: true, block: false };
    if (mb <= 100) return { level: 'no', label: '不推荐区间', desc: '50MB~100MB，处理慢且占用大量内存', warn: true, block: false };
    return { level: 'block', label: '不允许上传', desc: '>100MB，浏览器无法可靠处理', warn: true, block: true };
  }

  function money(n) { const v = Number(n) || 0; return (Math.round(v * 100) / 100).toFixed(2); }

  function parseAmount(str) {
    const m = String(str == null ? '' : str).match(/\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : 0;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function monthDates(key) {
    const { first, last } = monthRange(key);
    const out = [];
    let cur = first;
    while (cur <= last) { out.push(cur); cur = addDays(cur, 1); }
    return out;
  }

  const Utils = {
    pad2, toDate, dateStr, todayStr, addDays, formatDateCN, weekdayCN, monthKey,
    monthRange, weekStart, addMonths, uid, clamp, parsePageRanges, groupTextItems, pickCoverTexts, pickContentParts, pdfSizeLevel, money, parseAmount, escapeHtml, monthDates
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Utils;
  global.Stellarium = global.Stellarium || {};
  global.Stellarium.Utils = Utils;
})(typeof window !== 'undefined' ? window : globalThis);