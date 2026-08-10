/* 星隅 备份导出 / 导入（纯逻辑，Node 可测） */
(function (global) {
  'use strict';

  const VERSION = 1;

  function exportData(allData) {
    return {
      app: 'stellarium',
      version: VERSION,
      exportedAt: new Date().toISOString(),
      data: JSON.parse(JSON.stringify(allData))
    };
  }

  function validateImport(obj) {
    if (!obj || typeof obj !== 'object') return { ok: false, error: '不是有效的备份文件' };
    if (obj.app !== 'stellarium') return { ok: false, error: '不是星隅的备份文件' };
    if (obj.version !== VERSION) return { ok: false, error: '备份版本不支持' };
    if (!obj.data || typeof obj.data !== 'object' || Array.isArray(obj.data)) return { ok: false, error: '备份内容结构不正确' };
    return { ok: true, error: '' };
  }

  function applyImport(existing, backupObj) {
    const data = backupObj.data || {};
    const out = JSON.parse(JSON.stringify(existing || {}));
    for (const key of Object.keys(data)) {
      if (key === 'settings') {
        out.settings = Object.assign({}, out.settings, data.settings || {});
      } else if (Array.isArray(data[key])) {
        out[key] = JSON.parse(JSON.stringify(data[key]));
      }
    }
    return out;
  }

  const Backup = { VERSION, exportData, validateImport, applyImport };

  if (typeof module !== 'undefined' && module.exports) module.exports = Backup;
  global.Stellarium = global.Stellarium || {};
  global.Stellarium.Backup = Backup;
})(typeof window !== 'undefined' ? window : globalThis);