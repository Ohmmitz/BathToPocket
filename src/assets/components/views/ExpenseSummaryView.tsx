import React, { useState } from 'react';
import { 
  History,
  Search,
  Sparkles,
} from 'lucide-react';
import { 
  Transaction, 
  calculateCategorySpent, 
  getAccountingPeriodMonth,
  EXPENSE_CATEGORIES 
} from '../../utils/finance.ts';
import { ParliamentChart } from '../ParliamentChart.tsx';
import { AnimatedNumber } from '../AnimatedNumber.tsx';
import { getCategoryInfo } from '../../utils/categoryHelpers.tsx';

const transactionIconAssets = import.meta.glob('../../icon-optimized/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

function formatHistoryDate(dateStr: string): string {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  if (dateStr === todayStr) return `วันนี้ (${dateStr})`;
  if (dateStr === yesterdayStr) return `เมื่อวานนี้ (${dateStr})`;
  const [year, month, day] = dateStr.split('-').map(Number);
  return `${day}/${month}/${year + 543}`;
}

interface ExpenseSummaryViewProps {
  transactions: Transaction[];
  onNavigateToBudget: () => void;
  onNavigateToAdd: () => void;
  onNavigateToHistory: () => void;
}

export const ExpenseSummaryView: React.FC<ExpenseSummaryViewProps> = ({
  transactions,
  onNavigateToBudget,
  onNavigateToAdd,
  onNavigateToHistory,
}) => {
  const today = new Date();
  const currentMonthStr = getAccountingPeriodMonth(today);
  const transactionMonths = transactions
    .map((transaction) => getAccountingPeriodMonth(transaction.date))
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showRemainingBudget, setShowRemainingBudget] = useState(false);
  const currentMonthTransactions = transactions.filter(t => getAccountingPeriodMonth(t.date) === selectedMonth);
  const totalIncome = currentMonthTransactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0);
  const totalExpense = currentMonthTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0);
  const expenseHistory = currentMonthTransactions
    .filter((transaction) => transaction.type === 'expense' && (!selectedCategory || transaction.category === selectedCategory))
    .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));

  // Category filters use actual expenses recorded in the selected accounting period.
  const categoryStats = EXPENSE_CATEGORIES.map((cat) => {
    const spent = calculateCategorySpent(cat, currentMonthTransactions, selectedMonth);
    return { category: cat, spent };
  });
  const selectedCategoryStats = selectedCategory
    ? categoryStats.find((item) => item.category === selectedCategory)
    : undefined;
  const displayedExpense = selectedCategoryStats?.spent ?? totalExpense;
  const remainingAmount = totalIncome - totalExpense;
  const expenseRatio = totalIncome > 0
    ? Math.round((displayedExpense / totalIncome) * 100)
    : displayedExpense > 0 ? 100 : 0;
  const remainingRatio = totalIncome > 0
    ? Math.round((Math.max(0, remainingAmount) / totalIncome) * 100)
    : 0;
  const displayedRatio = showRemainingBudget ? remainingRatio : expenseRatio;
  const progressRatio = Math.min(100, Math.max(0, displayedRatio));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-2 pb-8">
      {/* Month Selector Bar & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 py-3 sm:px-5">
        <div>
          <h1 className="text-xl font-bold text-celtic-900">
            สรุปค่าใช้จ่าย
          </h1>
        </div>
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <label htmlFor="month-select" className="text-base text-celtic-700 font-medium">
            ของเดือน
          </label>
          <select
            id="month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-0 py-0 text-xs rounded-xl text-celtic-700 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs backdrop-blur-md"
          >
            {monthOptions.map((month) => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>
        </div>
      </div>
      {/* Circular budget progress and category filters */}
      <section className="glass-card p-2" aria-labelledby="budget-progress-heading">
        <div className="filter-tag-scroll flex flex-nowrap gap-2 mb-0 overflow-x-auto overscroll-x-contain whitespace-nowrap pb-4" role="group" aria-label="กรองตามหมวดหมู่">
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            aria-pressed={selectedCategory === null}
            className={`shrink-0 px-4 py-1.6 rounded-full border text-xs font-semibold transition-colors ${
              selectedCategory === null
                ? 'bg-apple-300 text-celtic-900'
                : 'bg-snow-drift-100 text-celtic-900 hover:bg-apple-200'
            }`}
          >
            ทั้งหมด
          </button>
          {categoryStats.map(({ category }) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              aria-pressed={selectedCategory === category}
              className={`shrink-0 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                selectedCategory === category
                  ? 'bg-apple-300 text-celtic-900'
                  : 'bg-snow-drift-100 text-celtic-900 hover:bg-apple-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="flex justify-center py-1">
          <ParliamentChart
            className="max-w-96"
            percentage={progressRatio}
            activeColor={remainingAmount < 0 ? '#90242D' : '#52F229'}
            ariaLabel={showRemainingBudget ? `เหลือจากรายรับ ${remainingRatio}%` : `รายจ่ายคิดเป็น ${expenseRatio}% ของรายรับ`}
          >
              <button
                type="button"
                onClick={() => setShowRemainingBudget((current) => !current)}
                className="flex flex-col items-center justify-center rounded-2xl p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                aria-label="สลับระหว่างงบที่ใช้ไปกับงบที่เหลือ"
                aria-pressed={showRemainingBudget}
              >
                <span className="text-base font-medium text-celtic-700 hover:text-emerald-800">
                  {showRemainingBudget ? 'ยอดเงินคงเหลือ' : 'ยอดเงินที่ใช้ไป'}
                </span>
                <AnimatedNumber
                  className="mt-1 text-5xl font-bold text-celtic-900"
                  value={showRemainingBudget ? Math.abs(remainingAmount) : displayedExpense}
                  prefix={showRemainingBudget && remainingAmount < 0 ? '−' : ''}
                />
                {showRemainingBudget && remainingAmount < 0 && (
                  <span className="text-[10px] text-rose-600 mt-0.5">
                    รายจ่ายเกินรายรับ <AnimatedNumber value={Math.abs(remainingAmount)} /> บาท
                  </span>
                )}
                <span className="text-sm font-normal text-celtic-800 mt-4">
                  คิดเป็น <AnimatedNumber value={displayedRatio} suffix="%" maximumFractionDigits={0} />
                </span>
              </button>
          </ParliamentChart>
        </div>
      </section>
      {/* Recent expense history */}
      <section className="space-y-3" aria-labelledby="summary-history-heading">
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="min-w-0">
            <h2 id="summary-history-heading" className="text-base font-semibold text-celtic-900">
              {selectedCategory ? `ประวัติ${selectedCategory}` : 'ประวัติค่าใช้จ่าย'}
            </h2>
            <p className="mt-0.5 text-xs text-celtic-700">{expenseHistory.length} รายการในเดือนที่เลือก</p>
          </div>
          {expenseHistory.length > 0 && (
            <button
              type="button"
              onClick={onNavigateToHistory}
              className="flex min-h-10 shrink-0 z-10 items-center justify-center gap-1.5 rounded-full bg-apple-200 px-3 text-xs font-semibold text-celtic-900 transition-colors hover:bg-apple-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-300"
              aria-label="ไปหน้าประวัติรายการบันทึก"
              title="ดูประวัติทั้งหมด"
            >
              <History className="h-4 w-4" />
              <span>ดูทั้งหมด</span>
            </button>
          )}
        </div>

        {expenseHistory.length === 0 ? (
          <div className="rounded-2xl bg-transparent p-8 text-center">
            <Search className="mx-auto mb-2 h-6 w-6 text-celtic-700" />
            <p className="text-sm font-medium text-celtic-900">ยังไม่มีประวัติค่าใช้จ่ายในหมวดนี้</p>
          </div>
        ) : (
          <div className="space-y-2">
            {expenseHistory.slice(0, 3).map((transaction) => {
              const categoryInfo = getCategoryInfo(transaction.category);
              const iconUrl = transaction.icon
                ? transactionIconAssets[`../../icon-optimized/${transaction.icon}`]
                : undefined;
              const isLatest = expenseHistory[0]?.id === transaction.id;

              return (
                <article key={transaction.id} className="relative overflow-hidden rounded-2xl bg-transparent">
                  <div className="relative z-10 flex items-center justify-between gap-2 bg-snow-drift-50 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-snow-drift-50 text-celtic-900">
                        {iconUrl ? <img src={iconUrl} alt="" loading="lazy" className="h-full w-full p-1.5 object-contain" /> : categoryInfo.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <h6 className="truncate text-sm font-medium text-celtic-900">{transaction.title}</h6>
                          {isLatest && <span className="shrink-0 rounded-full bg-apple-200 px-2 py-1 text-xs font-medium text-celtic-900">ล่าสุด</span>}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-celtic-700">
                          <span>{transaction.category}</span>
                          <span>·</span>
                          <span>{formatHistoryDate(transaction.date)}</span>
                          {transaction.time && <><span>·</span><span>{transaction.time} น.</span></>}
                          {transaction.note && <span className="truncate italic">· “{transaction.note}”</span>}
                        </div>
                      </div>
                    </div>
                    <span className="font-onest shrink-0 rounded-lg px-1 py-2 text-right text-sm font-medium text-celtic-900 sm:text-base">
                      −{Number(transaction.amount).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
