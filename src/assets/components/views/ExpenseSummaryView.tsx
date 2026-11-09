import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PiggyBank, 
  AlertTriangle, 
  CheckCircle, 
  ChevronRight,
  Target,
  Sparkles
} from 'lucide-react';
import { 
  Transaction, 
  CategoryBudget, 
  calculateFinancialSummary, 
  calculateCategorySpent, 
  getBudgetProgress, 
  EXPENSE_CATEGORIES 
} from '../../utils/finance.ts';
import { getCategoryInfo } from '../../utils/categoryHelpers.tsx';

interface ExpenseSummaryViewProps {
  transactions: Transaction[];
  budgets: CategoryBudget[];
  totalSavings: number;
  onNavigateToBudget: () => void;
  onNavigateToAdd: () => void;
}

export const ExpenseSummaryView: React.FC<ExpenseSummaryViewProps> = ({
  transactions,
  budgets,
  totalSavings,
  onNavigateToBudget,
  onNavigateToAdd,
}) => {
  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const transactionMonths = transactions
    .map((transaction) => transaction.date.slice(0, 7))
    .filter((month) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month));
  const firstMonth = transactionMonths.length
    ? transactionMonths.reduce((earliest, month) => month < earliest ? month : earliest)
    : currentMonthStr;
  const lastMonth = transactionMonths.reduce(
    (latest, month) => month > latest ? month : latest,
    currentMonthStr
  );
  const monthOptions: { value: string; label: string }[] = [];
  const monthCursor = new Date(Number(firstMonth.slice(0, 4)), Number(firstMonth.slice(5, 7)) - 1, 1);
  const lastMonthDate = new Date(Number(lastMonth.slice(0, 4)), Number(lastMonth.slice(5, 7)) - 1, 1);
  while (monthCursor <= lastMonthDate) {
    const value = `${monthCursor.getFullYear()}-${String(monthCursor.getMonth() + 1).padStart(2, '0')}`;
    monthOptions.push({
      value,
      label: monthCursor.toLocaleDateString('th-TH-u-ca-gregory', { month: 'long', year: 'numeric' }),
    });
    monthCursor.setMonth(monthCursor.getMonth() + 1);
  }
  monthOptions.reverse();
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  const currentMonthTransactions = transactions.filter(t => t.date.startsWith(selectedMonth));
  const { totalIncome, totalExpense, balance } = calculateFinancialSummary(currentMonthTransactions);

  // Total budget planned across all expense categories
  const totalBudgetPlanned = budgets.reduce((sum, b) => sum + (Number(b.totalPlanned) || 0), 0);
  const totalBudgetSpent = EXPENSE_CATEGORIES.reduce((sum, cat) => {
    return sum + calculateCategorySpent(cat, currentMonthTransactions, selectedMonth);
  }, 0);

  const overallBudgetProgress = getBudgetProgress(totalBudgetSpent, totalBudgetPlanned);

  // Group categories with details & status
  const categoryStats = EXPENSE_CATEGORIES.map((cat) => {
    const budgetObj = budgets.find((b) => b.category === cat);
    const planned = budgetObj ? budgetObj.totalPlanned : 0;
    const spent = calculateCategorySpent(cat, currentMonthTransactions, selectedMonth);
    const progress = getBudgetProgress(spent, planned);
    const itemsCount = budgetObj?.items?.length || 0;

    return {
      category: cat,
      planned,
      spent,
      progress,
      itemsCount,
      items: budgetObj?.items || [],
    };
  });

  // Categories exceeding or warning
  const alertCategories = categoryStats.filter(
    (c) => c.progress.isExceeded || c.progress.isWarning
  );

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Month Selector Bar & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 glass-card p-4.5 rounded-3xl border border-white/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            สรุปค่าใช้จ่ายและงบประมาณ
          </h1>
          <p className="text-xs text-gray-500">
            ภาพรวมรายรับ รายจ่าย และความคืบหน้าของงบประมาณในแต่ละหมวดหมู่
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label htmlFor="month-select" className="text-xs text-gray-500 font-medium">
            เลือกเดือน:
          </label>
          <select
            id="month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3.5 py-1.5 text-xs bg-white/70 border border-white/90 rounded-xl text-gray-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs backdrop-blur-md"
          >
            {monthOptions.map((month) => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Net Balance */}
        <div className="glass-card p-4.5 rounded-3xl border border-white/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700">คงเหลือสุทธิ</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              balance >= 0 ? 'bg-emerald-500/15 text-emerald-800' : 'bg-red-500/15 text-red-700'
            }`}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className={`font-onest text-xl sm:text-2xl font-bold tracking-tight ${
            balance >= 0 ? 'text-emerald-800' : 'text-red-700'
          }`}>
            {balance.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}-.
          </div>
          <span className="text-[11px] text-gray-600 block mt-1">
            {balance >= 0 ? 'สถานะการเงินเป็นบวก' : 'รายจ่ายเกินรายรับ!'}
          </span>
        </div>

        {/* Total Income */}
        <div className="glass-card p-4.5 rounded-3xl border border-white/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700">รายรับเดือนนี้</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-800 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="font-onest text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            +{totalIncome.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}-.
          </div>
          <span className="text-[11px] text-emerald-800 font-medium block mt-1">
            {currentMonthTransactions.filter(t => t.type === 'income').length} รายการที่บันทึก
          </span>
        </div>

        {/* Total Expense */}
        <div className="glass-card p-4.5 rounded-3xl border border-white/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700">รายจ่ายเดือนนี้</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-700 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="font-onest text-xl sm:text-2xl font-bold text-rose-700 tracking-tight">
            -{totalExpense.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}-.
          </div>
          <span className="text-[11px] text-gray-600 block mt-1">
            {currentMonthTransactions.filter(t => t.type === 'expense').length} รายการที่บันทึก
          </span>
        </div>

        {/* Total Savings */}
        <div className="glass-card p-4.5 rounded-3xl border border-white/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700">เงินออมสะสม</span>
            <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-800 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="font-onest text-xl sm:text-2xl font-bold text-teal-800 tracking-tight">
            {totalSavings.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}-.
          </div>
          <span className="text-[11px] text-teal-800 font-medium block mt-1">
            เป้าหมายเงินเก็บสะสม
          </span>
        </div>
      </div>

      {/* Total Budget Progress Bar */}
      <div className="glass-card p-5.5 rounded-3xl border border-white/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-800" />
            <h2 className="text-base font-bold text-gray-900">
              งบประมาณรวมทั้งเดือน
            </h2>
          </div>
          <div className="font-onest text-xs font-medium text-gray-700">
            ใช้ไป <span className="font-onest font-bold text-gray-900">{totalBudgetSpent.toLocaleString('th-TH')}-.</span> จากแผน{' '}
            <span className="font-onest font-bold text-gray-900">{totalBudgetPlanned.toLocaleString('th-TH')}-.</span>
          </div>
        </div>

        {/* Progress meter */}
        <div className="w-full bg-black/5 rounded-full h-3.5 overflow-hidden p-0.5 border border-white/60">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              overallBudgetProgress.isExceeded
                ? 'bg-rose-500 shadow-sm shadow-rose-500/40'
                : overallBudgetProgress.isWarning
                ? 'bg-amber-500 shadow-sm shadow-amber-500/40'
                : 'bg-emerald-500 shadow-sm shadow-emerald-500/40'
            }`}
            style={{ width: `${Math.min(overallBudgetProgress.percentage, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-2.5 text-xs">
          <span className={`font-semibold ${
            overallBudgetProgress.isExceeded ? 'text-rose-600' : overallBudgetProgress.isWarning ? 'text-amber-600' : 'text-emerald-700'
          }`}>
            ใช้ไปแล้ว <span className="font-onest">{overallBudgetProgress.percentage}%</span> ของงบทั้งหมด
          </span>
          <span className="font-onest text-gray-500 font-medium">
            {overallBudgetProgress.remaining >= 0
              ? `เหลืองบอีก ${overallBudgetProgress.remaining.toLocaleString('th-TH')}-.`
              : `เกินงบ ${Math.abs(overallBudgetProgress.remaining).toLocaleString('th-TH')}-.`}
          </span>
        </div>
      </div>

      {/* Critical Alert Banner for Categories exceeding or near limit */}
      {alertCategories.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>แจ้งเตือนงบประมาณ: มี {alertCategories.length} หมวดหมู่ที่ต้องระวัง</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            {alertCategories.map((c) => (
              <div 
                key={c.category}
                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                  c.progress.isExceeded 
                    ? 'bg-rose-50 border-rose-200 text-rose-900 font-medium' 
                    : 'bg-amber-100/70 border-amber-300 text-amber-900'
                }`}
              >
                <span className="font-semibold">{c.category}</span>
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                  c.progress.isExceeded ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                }`}>
                  {c.progress.isExceeded
                    ? `เกินงบ ${Math.abs(c.progress.remaining).toLocaleString('th-TH')}-.`
                    : `ใกล้เต็ม ${c.progress.percentage}% (เหลือ ${c.progress.remaining.toLocaleString('th-TH')}-. )`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Breakdown Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h2 className="text-base font-bold text-gray-900">
            ค่าใช้จ่ายแยกตามหมวดหมู่
          </h2>
          <p className="text-xs text-gray-500">
            เทียบยอดที่ใช้จริงกับยอดที่วางแผนไว้ในแต่ละหมวดหมู่
          </p>
        </div>
        <button
          onClick={onNavigateToBudget}
          className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 flex items-center gap-1 hover:underline"
        >
          แก้ไขแผนงบประมาณ <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Category Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categoryStats.map((item) => {
          const catInfo = getCategoryInfo(item.category);
          const { percentage, remaining, status, isWarning, isExceeded } = item.progress;

          return (
            <div
              key={item.category}
              className={`glass-card rounded-3xl p-5 border transition-all duration-200 shadow-xs relative ${
                isExceeded
                  ? 'border-rose-400/80 ring-2 ring-rose-400/20'
                  : isWarning
                  ? 'border-amber-400/80 ring-2 ring-amber-400/20'
                  : 'border-white/80 hover:border-emerald-300/50'
              }`}
            >
              {/* Category Header */}
              <div className="flex items-start justify-between mb-3.5">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${catInfo.bgLight} ${catInfo.textColor} border ${catInfo.borderColor} shadow-2xs`}>
                    {catInfo.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 leading-tight">
                      {item.category}
                    </h3>
                    <span className="text-[11px] text-gray-500">
                      {item.itemsCount > 0 ? `${item.itemsCount} รายการย่อยที่แพลน` : 'ยังไม่มีรายการย่อย'}
                    </span>
                  </div>
                </div>

                {/* Status Badges - Prominent and Clear */}
                <div>
                  {isExceeded ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-700 border border-rose-300 animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      เกินงบแล้ว!
                    </span>
                  ) : isWarning ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-800 border border-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      ใกล้เต็มงบ (<span className="font-onest">{percentage}%</span>)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-800 border border-emerald-300">
                      <CheckCircle className="w-3.5 h-3.5" />
                      ปกติ (<span className="font-onest">{percentage}%</span>)
                    </span>
                  )}
                </div>
              </div>

              {/* Amount Comparison */}
              <div className="grid grid-cols-3 gap-2 py-3 px-3 bg-white/60 backdrop-blur-md rounded-2xl mb-3.5 border border-white/80 text-center shadow-2xs">
                <div>
                  <span className="text-[10px] text-gray-500 block font-medium">ใช้ไปแล้ว</span>
                  <span className={`text-xs font-bold ${isExceeded ? 'text-rose-600' : 'text-gray-900'}`}>
                    <span className="font-onest">{item.spent.toLocaleString('th-TH')}-.</span>
                  </span>
                </div>
                <div className="border-x border-gray-200/60">
                  <span className="text-[10px] text-gray-500 block font-medium">งบที่ตั้งไว้</span>
                  <span className="text-xs font-bold text-gray-700">
                    <span className="font-onest">{item.planned.toLocaleString('th-TH')}-.</span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block font-medium">
                    {remaining >= 0 ? 'คงเหลือ' : 'เกินไป'}
                  </span>
                  <span className={`text-xs font-bold ${
                    remaining >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}>
                    <span className="font-onest">{Math.abs(remaining).toLocaleString('th-TH')}-.</span>
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full bg-black/5 rounded-full h-2.5 overflow-hidden border border-white/40">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isExceeded
                        ? 'bg-rose-500'
                        : isWarning
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-gray-500">
                  <span>ความคืบหน้างบ</span>
                  <span className="font-onest font-semibold text-gray-700">{percentage}%</span>
                </div>
              </div>

              {/* Sub-items preview pills if any */}
              {item.items.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-white/60 flex flex-wrap gap-1.5">
                  {item.items.slice(0, 3).map((sub) => (
                    <span
                      key={sub.id}
                      className="text-[11px] px-2.5 py-0.5 rounded-lg bg-white/70 border border-white/80 text-gray-700 font-normal backdrop-blur-xs"
                    >
                      {sub.name}: <span className="font-onest">{sub.amount.toLocaleString('th-TH')}-.</span>
                    </span>
                  ))}
                  {item.items.length > 3 && (
                    <span className="text-[10px] text-gray-500 self-center">
                      +{item.items.length - 3} รายการ
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Action Button helper on desktop */}
      <div className="p-5 glass-card rounded-3xl border border-emerald-400/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">
              ต้องการบันทึกค่าใช้จ่ายวันนี้เพิ่มไหม?
            </h4>
            <p className="text-xs text-gray-600">
              จดบันทึกทันทีหลังจ่ายเงินเพื่อควบคุมงบประมาณได้อย่างแม่นยำ
            </p>
          </div>
        </div>
        <button
          onClick={onNavigateToAdd}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
        >
          + บันทึกรายการใหม่
        </button>
      </div>
    </div>
  );
};
