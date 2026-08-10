/* 星隅 首次启动默认数据 */
(function (global) {
  'use strict';

  const CATEGORIES = ['餐饮', '交通', '购物', '娱乐', '居住', '其他'];
  const CAT_COLORS = ['#f87171', '#fbbf24', '#4ade80', '#60a5fa', '#b18cff', '#94a3b8'];
  const EXERCISES = ['深蹲', '卧推', '硬拉', '俯卧撑', '引体向上', '跑步', '平板支撑'];
  const TOOLS = [
    { id: 'calc', name: '计算器', icon: '🧮' },
    { id: 'convert', name: '单位换算', icon: '📐' },
    { id: 'pomodoro', name: '番茄钟', icon: '🍅' },
    { id: 'lottery', name: '随机抽签', icon: '🎲' },
    { id: 'dice', name: '掷骰子', icon: '🎯' },
    { id: 'rand', name: '随机数生成器', icon: '🎰' },
    { id: 'notes', name: '备忘便签', icon: '📝' }
  ];
  const GAMES = [
    { id: '2048', name: '2048', icon: '🎮' },
    { id: 'minesweeper', name: '扫雷', icon: '💣' },
    { id: 'sudoku', name: '数独', icon: '🔢' },
    { id: 'snake', name: '贪吃蛇', icon: '🐍' },
    { id: 'tic-tac-toe', name: '井字棋', icon: '⭕' }
  ];

  function seedData() {
    return {
      settings: { appName: '星隅', theme: 'dark', dateFormat: 'YYYY-MM-DD', wallpaper: null, wallpaperMask: 62 },
      categories: CATEGORIES.map((name, i) => ({ id: 'cat-' + (i + 1), name, color: CAT_COLORS[i], sort: i })),
      commonExercises: EXERCISES.map((name, i) => ({ id: 'ex-' + (i + 1), name })),
      tools: TOOLS.map(x => Object.assign({}, x)),
      games: GAMES.map(x => Object.assign({}, x))
    };
  }

  const Seed = { seedData, CATEGORIES, EXERCISES, TOOLS, GAMES };

  if (typeof module !== 'undefined' && module.exports) module.exports = Seed;
  global.Stellarium = global.Stellarium || {};
  global.Stellarium.Seed = Seed;
})(typeof window !== 'undefined' ? window : globalThis);