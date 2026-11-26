import React, { useState } from 'react';
import { 
  History,
  Search,
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
import { useCenterSnapFilter } from '../useCenterSnapFilter.ts';
import { MonthSelector, PageHeader } from '../PageHeader.tsx';

const transactionIconAssets = import.meta.glob('../../icon-optimized/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

const CATEGORY_SHARE_COLORS: Record<string, string> = {
  'ค่าอาหาร': '#D84B0A',
  'ค่าเดินทาง': '#0A97D8',
  'ค่าใช้จ่ายประจำ': '#B20AD8',
  'ค่าความบันเทิง': '#0A30D8',
  'ค่าสุขภาพ': '#0AD8B2',
  'ค่าของใช้ส่วนตัว': '#FFD400',
  'ค่าหนี้สิน': '#FF7A0C',
  'ค่าใช้จ่ายอื่นๆ': '#808080',
};

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

type SummaryChartMode = 'spent' | 'remaining' | 'categoryShares';

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
  const categoryFilterRef = useCenterSnapFilter(selectedCategory ?? 'all');
  const [chartMode, setChartMode] = useState<SummaryChartMode>('spent');
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
  const categoryShareRatio = totalExpense > 0
    ? Math.round((displayedExpense / totalExpense) * 100)
    : 0;
  const remainingRatio = totalIncome > 0
    ? Math.round((Math.max(0, remainingAmount) / totalIncome) * 100)
    : 0;
  const displayedRatio = chartMode === 'categoryShares'
    ? categoryShareRatio
    : chartMode === 'remaining' ? remainingRatio : expenseRatio;
  const chartAmount = chartMode === 'remaining' ? Math.abs(remainingAmount) : displayedExpense;
  const progressRatio = Math.min(100, Math.max(0, displayedRatio));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-2 pb-8">
      <PageHeader
        title="สรุปค่าใช้จ่าย"
        trailing={<MonthSelector id="month-select" value={selectedMonth} options={monthOptions} onChange={setSelectedMonth} />}
      />
      {/* Circular budget progress and category filters */}
      <section className="glass-card p-0" aria-labelledby="budget-progress-heading">
        <div className="parliament-chart-stage">
          <ParliamentChart
            percentage={chartMode === 'categoryShares' && selectedCategory === null
              ? (totalExpense > 0 ? 100 : 0)
              : progressRatio}
            segments={chartMode === 'categoryShares' && selectedCategory === null
              ? categoryStats.map(({ category, spent }) => ({
                value: spent,
                color: CATEGORY_SHARE_COLORS[category] || '#808080',
              }))
              : undefined}
            activeColor={selectedCategory
              ? CATEGORY_SHARE_COLORS[selectedCategory] || '#52F229'
              : chartMode === 'remaining' && remainingAmount < 0 ? '#90242D' : '#52F229'}
            ariaLabel={chartMode === 'categoryShares'
              ? `สัดส่วนรายจ่าย${selectedCategory ? `หมวด${selectedCategory}` : 'รวม'} ${categoryShareRatio}%`
              : chartMode === 'remaining' ? `เหลือจากรายรับ ${remainingRatio}%` : `รายจ่ายคิดเป็น ${expenseRatio}% ของรายรับ`}
          >
              <button
                type="button"
                onClick={() => {
                  setChartMode((current) => current === 'spent'
                    ? 'remaining'
                    : current === 'remaining' ? 'categoryShares' : 'spent');
                }}
                className="flex flex-col items-center justify-center rounded-2xl p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                aria-label={chartMode === 'spent'
                  ? 'แสดงยอดเงินคงเหลือ'
                  : chartMode === 'remaining'
                    ? 'แสดงสัดส่วนรายจ่าย'
                    : 'กลับไปยอดเงินที่ใช้ไป'}
              >
                <AnimatedNumber
                  className="mt-1 text-5xl font-bold text-celtic-900 tracking-tight sm:text-6xl"
                  value={chartMode === 'categoryShares' ? remainingRatio : chartAmount}
                  prefix={chartMode === 'remaining' && remainingAmount < 0 ? '−' : ''}
                  suffix={chartMode === 'categoryShares' ? '%' : ''}
                  maximumFractionDigits={0}
                />
                <span className="text-base font-medium text-celtic-700 hover:text-emerald-800">
                  {chartMode === 'categoryShares'
                    ? 'คิดเป็น'
                    : chartMode === 'remaining' ? 'คงเหลือ (บาท)' : 'ใช้เงินไป (บาท)'}
                </span>
                {chartMode === 'remaining' && remainingAmount < 0 && (
                  <span className="text-[10px] text-rose-600 mt-0.5">
                    รายจ่ายเกินรายรับ <AnimatedNumber value={Math.abs(remainingAmount)} maximumFractionDigits={0} /> บาท
                  </span>
                )}
              </button>
          </ParliamentChart>
        </div>
        <div ref={categoryFilterRef} className="filter-tag-scroll relative z-0 flex flex-nowrap gap-2 overflow-x-auto overscroll-x-contain whitespace-nowrap pb-1 pt-4 -mt-24" role="group" aria-label="กรองตามหมวดหมู่">
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            aria-pressed={selectedCategory === null}
            className={`shrink-0 px-4 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
              selectedCategory === null
                ? 'bg-apple-200 text-celtic-900'
                : 'bg-snow-drift-100 text-celtic-900 hover:bg-apple-200'
            }`}
          >
            ทั้งหมด
          </button>
          {categoryStats.map(({ category }) => (
            <button
              key={category}
              type="button"
              onClick={() => {
                setSelectedCategory(category);
                setChartMode('spent');
              }}
              aria-pressed={selectedCategory === category}
              className={`shrink-0 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                selectedCategory === category
                  ? 'bg-apple-200 text-celtic-900'
                  : 'bg-snow-drift-100 text-celtic-900 hover:bg-apple-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </section>
      {/* Recent expense history */}
      <section className="space-y-3" aria-label="ประวัติค่าใช้จ่าย">
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
        {expenseHistory.length > 0 && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={onNavigateToHistory}
              className="flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-snow-drift-100/40 px-4 text-xs font-semibold text-celtic-900 transition-colors hover:bg-apple-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-300"
              aria-label="ไปหน้าประวัติรายการบันทึก"
              title="ดูประวัติทั้งหมด"
            >
              <History className="h-4 w-4" />
              <span>ดูทั้งหมด</span>
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
