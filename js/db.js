/* 星隅 存储抽象：IndexedDB（浏览器）/ localStorage 兜底 / memory（测试） */
(function (global) {
  'use strict';

  function memoryBackend() {
    const map = new Map();
    return {
      name: 'memory',
      async init() {},
      async get(key) { return map.has(key) ? JSON.parse(JSON.stringify(map.get(key))) : undefined; },
      async set(key, value) { map.set(key, JSON.parse(JSON.stringify(value))); },
      async remove(key) { map.delete(key); },
      async clear() { map.clear(); },
      async keys() { return Array.from(map.keys()); }
    };
  }

  function localStorageBackend() {
    const PREFIX = 'stellarium:';
    const ls = () => global.localStorage;
    return {
      name: 'localStorage',
      async init() {},
      async get(key) { const v = ls().getItem(PREFIX + key); return v == null ? undefined : JSON.parse(v); },
      async set(key, value) { ls().setItem(PREFIX + key, JSON.stringify(value)); },
      async remove(key) { ls().removeItem(PREFIX + key); },
      async clear() {
        const keys = [];
        for (let i = 0; i < ls().length; i++) {
          const k = ls().key(i);
          if (k && k.startsWith(PREFIX)) keys.push(k);
        }
        keys.forEach(k => ls().removeItem(k));
      },
      async keys() {
        const out = [];
        for (let i = 0; i < ls().length; i++) {
          const k = ls().key(i);
          if (k && k.startsWith(PREFIX)) out.push(k.slice(PREFIX.length));
        }
        return out;
      }
    };
  }

  function idbBackend(dbName) {
    let dbPromise = null;
    function open() {
      if (dbPromise) return dbPromise;
      dbPromise = new Promise((resolve, reject) => {
        const req = global.indexedDB.open(dbName || 'stellarium', 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      return dbPromise;
    }
    function withStore(mode, fn) {
      return open().then(db => new Promise((resolve, reject) => {
        const t = db.transaction('kv', mode);
        const store = t.objectStore('kv');
        let result;
        t.oncomplete = () => resolve(result);
        t.onerror = () => reject(t.error);
        fn(store, v => { result = v; });
      }));
    }
    return {
      name: 'indexeddb',
      async init() { await open(); },
      get(key) { return withStore('readonly', (s, done) => { const r = s.get(key); r.onsuccess = () => done(r.result); }); },
      set(key, value) { return withStore('readwrite', s => { s.put(JSON.parse(JSON.stringify(value)), key); }); },
      remove(key) { return withStore('readwrite', s => { s.delete(key); }); },
      clear() { return withStore('readwrite', s => { s.clear(); }); },
      keys() { return withStore('readonly', (s, done) => { const r = s.getAllKeys(); r.onsuccess = () => done(r.result); }); }
    };
  }

  function createStorage(kind) {
    if (kind === 'memory') return memoryBackend();
    if (kind === 'localStorage') return localStorageBackend();
    if (kind === 'indexeddb' || (kind !== 'localStorage' && typeof global.indexedDB !== 'undefined')) return idbBackend();
    return localStorageBackend();
  }

  const DB = { createStorage };

  if (typeof module !== 'undefined' && module.exports) module.exports = DB;
  global.Stellarium = global.Stellarium || {};
  global.Stellarium.DB = DB;
})(typeof window !== 'undefined' ? window : globalThis);