import test from 'node:test';
import assert from 'node:assert/strict';
import Calc from '../../js/core/calc.js';

test('calc: budgetSummary 状态与汇总', () => {
  const bills = [
    { date: '2026-08-01', type: '支出', amount: 500 },
    { date: '2026-08-05', type: '支出', amount: 300 },
    { date: '2026-08-06', type: '收入', amount: 8000 }
  ];
  const s1 = Calc.budgetSummary(bills, 1000, '2026-08');
  assert.equal(s1.spent, 800); assert.equal(s1.income, 8000);
  assert.equal(s1.remaining, 200); assert.equal(s1.status, 'normal');
  const s2 = Calc.budgetSummary(bills, 900, '2026-08');
  assert.equal(s2.status, 'tight');
  const s3 = Calc.budgetSummary(bills, 700, '2026-08');
  assert.equal(s3.status, 'over'); assert.equal(s3.overAmount, 100);
  const s4 = Calc.budgetSummary(bills, 1000, '2026-09');
  assert.equal(s4.spent, 0); assert.equal(s4.income, 0);
});

test('calc: monthlyReport 月度报表', () => {
  const categories = [{ id: 'c1', name: '餐饮' }, { id: 'c2', name: '交通' }];
  const bills = [
    { date: '2026-08-01', type: '支出', amount: 100, category: 'c1' },
    { date: '2026-08-02', type: '支出', amount: 50, category: 'c1' },
    { date: '2026-08-03', type: '支出', amount: 30, category: 'c2' },
    { date: '2026-08-04', type: '收入', amount: 5000, category: '' }
  ];
  const r = Calc.monthlyReport(bills, categories, '2026-08');
  assert.equal(r.expense, 180); assert.equal(r.income, 5000); assert.equal(r.balance, 4820);
  assert.deepEqual(r.byCategory, [{ name: '餐饮', spent: 150 }, { name: '交通', spent: 30 }]);
  assert.equal(r.dailyExpenses.length, 3);
  const r2 = Calc.monthlyReport(bills, categories, '2026-07');
  assert.equal(r2.expense, 0); assert.equal(r2.byCategory.length, 0);
});

test('calc: deferTasks 顺延', () => {
  const tasks = [
    { id: 'a', date: '2026-08-10', title: 'x', done: false },
    { id: 'b', date: '2026-08-10', title: 'y', done: true },
    { id: 'c', date: '2026-08-09', title: 'z', done: false }
  ];
  const out = Calc.deferTasks(tasks, '2026-08-10', '2026-08-11');
  assert.equal(out.length, 1);
  assert.equal(out[0].date, '2026-08-11');
  assert.equal(out[0].deferredFrom, '2026-08-10');
  assert.equal(out[0].done, false);
  assert.notEqual(out[0].id, 'a');
});

test('calc: calendarMarks 月历打点', () => {
  const marks = Calc.calendarMarks(
    [{ date: '2026-08-01', text: 'hi' }],
    [{ date: '2026-08-01', amount: 1 }, { date: '2026-08-02', amount: 2 }],
    '2026-08'
  );
  assert.equal(marks['2026-08-01'].journal, true);
  assert.equal(marks['2026-08-01'].bill, true);
  assert.equal(marks['2026-08-02'].bill, true);
  assert.equal(marks['2026-08-02'].journal, false);
  assert.equal(marks['2026-08-03'], undefined);
});

test('calc: homeSummaries 首页摘要（含联动字段）', () => {
  const data = {
    tasks: [{ id: 't1', date: '2026-08-10', done: false }],
    journalEntries: [{ date: '2026-08-10' }],
    bills: [
      { date: '2026-08-01', type: '支出', amount: 300 },
      { date: '2026-08-10', type: '支出', amount: 50 },
      { date: '2026-08-10', type: '收入', amount: 100 }
    ],
    budgets: [{ month: '2026-08', amount: 1000 }],
    ideas: [{ id: 'i1', status: '待用' }, { id: 'i2', status: '已采用' }],
    drafts: [{ status: '待发布' }, { status: '写作中' }, { status: '已发布' }],
    projects: [{ id: 'p1' }],
    projectTasks: [{ status: '进行中' }, { status: '进行中' }, { status: '已完成' }],
    workouts: [{ date: '2026-08-10' }, { date: '2026-08-03' }],
    meals: [{ date: '2026-08-10', calories: 300 }, { date: '2026-08-10', calories: 500 }],
    bodyMetrics: [{ date: '2026-08-01', weight: 70 }]
  };
  const s = Calc.homeSummaries(data, '2026-08-10');
  assert.equal(s.hasJournal, true);
  assert.equal(s.journalLabel, '今日已写');
  assert.equal(s.billSpentToday, 50);
  assert.equal(s.billIncomeToday, 100);
  assert.equal(s.budget.remaining, 650);
  assert.equal(s.pendingDrafts, 1);
  assert.equal(s.mediaIdeas, 2);
  assert.equal(s.mediaDrafts, 3);
  assert.equal(s.activeTasks, 2);
  assert.equal(s.projectCount, 1);
  assert.equal(s.trainedToday, true);
  assert.equal(s.monthWorkouts, 2);
  assert.equal(s.dietLoggedToday, true);
  assert.equal(s.todayCalories, 800);
  assert.equal(s.lastWeight, 70);
  assert.equal(s.tasksToday.length, 1);
});

test('calc: homeSummaries 手账状态区分（记账也算已记录）', () => {
  const base = { bills: [], journalEntries: [], tasks: [], drafts: [], projectTasks: [], workouts: [], meals: [], bodyMetrics: [], ideas: [], projects: [], budgets: [] };
  assert.equal(Calc.homeSummaries(base, '2026-08-10').journalLabel, '今日未写');
  assert.equal(Calc.homeSummaries({ ...base, bills: [{ date: '2026-08-10', type: '支出', amount: 30 }] }, '2026-08-10').journalLabel, '今日已记账');
  assert.equal(Calc.homeSummaries({ ...base, journalEntries: [{ date: '2026-08-10' }] }, '2026-08-10').journalLabel, '今日已写');
});

test('calc: draftCalendar 发布日历', () => {
  const drafts = [{ id: 'd1', title: '标题A', platform: '公众号' }];
  const schedules = [
    { id: 's1', date: '2026-08-15', draftId: 'd1' },
    { id: 's2', date: '2026-08-15', draftId: 'nope' }
  ];
  const byDate = Calc.draftCalendar(drafts, schedules);
  assert.equal(byDate['2026-08-15'].length, 1);
  assert.equal(byDate['2026-08-15'][0].title, '标题A');
  assert.equal(byDate['2026-08-16'], undefined);
});

test('calc: 饮食 汇总与模板', () => {
  const { list, total } = Calc.mealTotals([
    { date: 'd', meal: '早餐', calories: 400 },
    { date: 'd', meal: '午餐', calories: 600 },
    { date: 'd2', meal: '早餐', calories: 100 }
  ], 'd');
  assert.equal(list.length, 2); assert.equal(total, 1000);
  const tpl = { 早餐: '鸡蛋牛奶', 午餐: '米饭鸡胸', 晚餐: '', 加餐: '坚果', 早餐Cal: 300, 午餐Cal: 600, 晚餐Cal: 0, 加餐Cal: 150 };
  const applied = Calc.applyTemplate(tpl, '2026-08-20');
  assert.equal(applied.length, 3);
  assert.equal(applied[0].meal, '早餐');
  assert.equal(applied[2].meal, '加餐');
  assert.equal(applied[2].calories, 150);
});

test('calc: 搜索/身体数据/任务分组/项目汇总', () => {
  const problems = [
    { title: 'CORS 报错', solution: '加头', tags: 'web' },
    { title: '内存泄漏', solution: '清理', tags: 'node' }
  ];
  assert.equal(Calc.searchProblems(problems, 'cors').length, 1);
  assert.equal(Calc.searchProblems(problems, '').length, 2);
  assert.equal(Calc.searchProblems(problems, '清理').length, 1);
  const series = Calc.bodySeries([
    { date: '2026-08-02', weight: 70.5, bodyFat: 15 },
    { date: '2026-08-01', weight: 71, bodyFat: 15.2 }
  ]);
  assert.equal(series[0].date, '2026-08-01');
  assert.equal(series[1].weight, 70.5);
  const g = Calc.groupTasksByPeriod([{ period: '晚上' }, { period: '未知' }, { done: true, period: '上午' }]);
  assert.equal(g.晚上.length, 1); assert.equal(g.全天.length, 1); assert.equal(g.上午.length, 1);
  assert.equal(Calc.weekPlanDays([{ weekStart: '2026-08-10', days: ['a', 'b'] }], '2026-08-10').length, 2);
  const ps = Calc.projectsWithTasks(
    [{ id: 'p1', name: 'A' }],
    [{ projectId: 'p1', status: '已完成' }, { projectId: 'p1', status: '进行中' }]
  );
  assert.equal(ps[0].tasks.length, 2); assert.equal(ps[0].done, 1);
});