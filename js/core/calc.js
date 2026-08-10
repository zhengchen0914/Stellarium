/* 星隅 计算与汇总逻辑（纯逻辑，Node 可测） */
(function (global) {
  'use strict';
  const U = (typeof module !== 'undefined' && module.exports) ? require('./utils.js') : global.Stellarium.Utils;

  function budgetStatus(spent, budget) {
    if (!(budget > 0)) return 'normal';
    const ratio = spent / budget;
    if (ratio > 1) return 'over';
    if (ratio > 0.8) return 'tight';
    return 'normal';
  }

  function budgetSummary(bills, budgetAmount, month) {
    let spent = 0, income = 0;
    for (const b of bills || []) {
      if (month && U.monthKey(b.date) !== month) continue;
      const amt = Number(b.amount) || 0;
      if (b.type === '支出') spent += amt; else income += amt;
    }
    const budget = Number(budgetAmount) || 0;
    return {
      spent, income, budget, remaining: budget - spent,
      status: budgetStatus(spent, budget),
      overAmount: Math.max(0, spent - budget)
    };
  }

  function monthlyReport(bills, categories, month) {
    const catMap = {};
    for (const c of categories || []) catMap[c.id] = c.name;
    const byCategory = {};
    const daily = {};
    let income = 0, expense = 0;
    for (const b of bills || []) {
      if (U.monthKey(b.date) !== month) continue;
      const amt = Number(b.amount) || 0;
      if (b.type === '支出') {
        expense += amt;
        const name = catMap[b.category] || b.category || '其他';
        byCategory[name] = (byCategory[name] || 0) + amt;
        daily[b.date] = (daily[b.date] || 0) + amt;
      } else {
        income += amt;
      }
    }
    return {
      byCategory: Object.entries(byCategory).map(([name, spent]) => ({ name, spent })).sort((a, b) => b.spent - a.spent),
      dailyExpenses: Object.entries(daily).sort((a, b) => a[0].localeCompare(b[0])).map(([date, total]) => ({ date, total })),
      income, expense, balance: income - expense
    };
  }

  function deferTasks(tasks, fromDate, toDate) {
    const out = [];
    for (const t of tasks || []) {
      if (t.date !== fromDate || t.done) continue;
      out.push(Object.assign({}, t, { id: U.uid(), date: toDate, deferredFrom: fromDate, done: false }));
    }
    return out;
  }

  function calendarMarks(journals, bills, month) {
    const marks = {};
    for (const j of journals || []) {
      if (U.monthKey(j.date) !== month) continue;
      const m = marks[j.date] || (marks[j.date] = { journal: false, bill: false, count: 0 });
      m.journal = true;
    }
    for (const b of bills || []) {
      if (U.monthKey(b.date) !== month) continue;
      const m = marks[b.date] || (marks[b.date] = { journal: false, bill: false, count: 0 });
      m.bill = true; m.count += 1;
    }
    return marks;
  }

  function homeSummaries(data, date) {
    const dateKey = date || U.todayStr();
    const month = U.monthKey(dateKey);
    const tasksToday = (data.tasks || []).filter(t => t.date === dateKey);
    const journalDone = (data.journalEntries || []).some(j => j.date === dateKey);
    const budgetEntry = (data.budgets || []).find(b => b.month === month);
    const budget = budgetSummary(data.bills, budgetEntry ? budgetEntry.amount : 0, month);
    const pendingDrafts = (data.drafts || []).filter(d => d.status === '待发布').length;
    const activeTasks = (data.projectTasks || []).filter(t => t.status === '进行中').length;
    const trainedToday = (data.workouts || []).some(w => w.date === dateKey);
    const dietLoggedToday = (data.meals || []).some(m => m.date === dateKey);
    const metrics = (data.bodyMetrics || []).slice().sort((a, b) => a.date.localeCompare(b.date));
    const lastWeight = metrics.length ? Number(metrics[metrics.length - 1].weight) : null;
    return { dateKey, month, tasksToday, journalDone, budget, pendingDrafts, activeTasks, trainedToday, dietLoggedToday, lastWeight };
  }

  function draftCalendar(drafts, schedules) {
    const byDate = {};
    for (const s of schedules || []) {
      const d = (drafts || []).find(x => x.id === s.draftId);
      if (!d) continue;
      (byDate[s.date] = byDate[s.date] || []).push({ scheduleId: s.id, draftId: d.id, title: d.title, platform: d.platform });
    }
    return byDate;
  }

  function groupTasksByPeriod(tasks) {
    const order = ['上午', '下午', '晚上', '全天'];
    const groups = { 上午: [], 下午: [], 晚上: [], 全天: [] };
    for (const t of tasks || []) groups[order.includes(t.period) ? t.period : '全天'].push(t);
    return groups;
  }

  function mealTotals(meals, date) {
    const list = (meals || []).filter(m => m.date === date);
    const total = list.reduce((s, m) => s + (Number(m.calories) || 0), 0);
    return { list, total };
  }

  function applyTemplate(template, date) {
    const order = ['早餐', '午餐', '晚餐', '加餐'];
    const list = [];
    for (const key of order) {
      const content = (template[key] || '').trim();
      if (content) list.push({ date, meal: key, content, calories: Number(template[key + 'Cal']) || 0 });
    }
    return list;
  }

  function searchProblems(problems, keyword) {
    const kw = String(keyword || '').trim().toLowerCase();
    if (!kw) return problems || [];
    return (problems || []).filter(p => [p.title, p.description, p.solution, p.tags].join(' ').toLowerCase().includes(kw));
  }

  function bodySeries(metrics) {
    return (metrics || []).slice().sort((a, b) => a.date.localeCompare(b.date))
      .map(m => ({ date: m.date, weight: Number(m.weight) || null, bodyFat: Number(m.bodyFat) || null }));
  }

  function weekPlanDays(plans, weekStart) {
    const p = (plans || []).find(x => x.weekStart === weekStart);
    return p ? p.days : [];
  }

  function tasksByDate(tasks, date) { return (tasks || []).filter(t => t.date === date); }

  function projectsWithTasks(projects, projectTasks) {
    return (projects || []).map(p => ({
      ...p,
      tasks: (projectTasks || []).filter(t => t.projectId === p.id),
      done: (projectTasks || []).filter(t => t.projectId === p.id && t.status === '已完成').length
    }));
  }

  const Calc = {
    budgetStatus, budgetSummary, monthlyReport, deferTasks, calendarMarks, homeSummaries,
    draftCalendar, groupTasksByPeriod, mealTotals, applyTemplate, searchProblems,
    bodySeries, weekPlanDays, tasksByDate, projectsWithTasks
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Calc;
  global.Stellarium = global.Stellarium || {};
  global.Stellarium.Calc = Calc;
})(typeof window !== 'undefined' ? window : globalThis);