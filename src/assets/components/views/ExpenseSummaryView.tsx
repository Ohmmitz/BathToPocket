import React, { useEffect, useRef, useState } from 'react';
import { 
  Wallet, 
  ShoppingBasket, 
  Target,
  Sparkles,
} from 'lucide-react';
import { 
  Transaction, 
  calculateFinancialSummary, 
  calculateCategorySpent, 
  getAccountingPeriodMonth,
  EXPENSE_CATEGORIES 
} from '../../utils/finance.ts';

const AnimatedNumber: React.FC<{
  value: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}> = ({ value, className = '', prefix = '', suffix = '', minimumFractionDigits = 0, maximumFractionDigits = 2 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const currentValueRef = useRef(0);

  useEffect(() => {
    const startValue = currentValueRef.current;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || startValue === value) {
      currentValueRef.current = value;
      setDisplayValue(value);
      return;
    }

    const duration = 720;
    let animationFrame = 0;
    let startTime: number | null = null;
    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextValue = startValue + (value - startValue) * easedProgress;
      currentValueRef.current = nextValue;
      setDisplayValue(nextValue);
      if (progress < 1) animationFrame = window.requestAnimationFrame(animate);
      else {
        currentValueRef.current = value;
        setDisplayValue(value);
      }
    };

    animationFrame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [value]);

  const formattedValue = new Intl.NumberFormat('th-TH', {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(displayValue);

  return (
    <span className={className} aria-label={`${prefix}${new Intl.NumberFormat('th-TH', { minimumFractionDigits, maximumFractionDigits }).format(value)}${suffix}`}>
      {prefix}{formattedValue}{suffix}
    </span>
  );
};

interface ExpenseSummaryViewProps {
  transactions: Transaction[];
  onNavigateToBudget: () => void;
  onNavigateToAdd: () => void;
}

export const ExpenseSummaryView: React.FC<ExpenseSummaryViewProps> = ({
  transactions,
  onNavigateToBudget,
  onNavigateToAdd,
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
  const { totalIncome, totalExpense, balance } = calculateFinancialSummary(currentMonthTransactions);

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
  const budgetRingCircumference = 2 * Math.PI * 76;
  const budgetRingSweep = 0.8;
  const budgetRingStartAngle = 126;
  const budgetRingProgressLength = budgetRingCircumference * budgetRingSweep * progressRatio / 100;

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
          <div className="relative w-64 h-64 max-w-full">
            <svg
              viewBox="0 0 200 200"
              className="w-full h-full"
              role="img"
              aria-label={showRemainingBudget ? `เหลือจากรายรับ ${remainingRatio}%` : `รายจ่ายคิดเป็น ${expenseRatio}% ของรายรับ`}
            >
              <circle
                cx="100"
                cy="100"
                r="76"
                fill="none"
                stroke="rgba(15, 23, 42, 0.08)"
                strokeWidth="24"
                strokeLinecap="round"
                strokeDasharray={`${budgetRingCircumference * budgetRingSweep} ${budgetRingCircumference * (1 - budgetRingSweep)}`}
                transform={`rotate(${budgetRingStartAngle} 100 100)`}
              />
              <circle
                cx="100"
                cy="100"
                r="76"
                fill="none"
                stroke={remainingAmount < 0 ? '#90242D' : '#31D80A'}
                strokeWidth="18"
                strokeLinecap="round"
                strokeDasharray={`${budgetRingProgressLength} ${budgetRingCircumference - budgetRingProgressLength}`}
                transform={`rotate(${budgetRingStartAngle} 100 100)`}
                className="progress-ring-glint transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
              <button
                type="button"
                onClick={() => setShowRemainingBudget((current) => !current)}
                className="flex flex-col items-center justify-center rounded-2xl p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                aria-label="สลับระหว่างงบที่ใช้ไปกับงบที่เหลือ"
                aria-pressed={showRemainingBudget}
              >
                <span className="text-xs font-semibold text-celtic-700 hover:text-emerald-800 underline underline-offset-2">
                  {showRemainingBudget ? 'เหลืองบอีก' : 'งบที่ใช้ไป'}
                </span>
                <AnimatedNumber
                  className="font-onest mt-1 text-4xl font-extrabold text-celtic-900"
                  value={showRemainingBudget ? Math.abs(remainingAmount) : displayedExpense}
                  prefix={showRemainingBudget && remainingAmount < 0 ? '−' : ''}
                />
                {showRemainingBudget && remainingAmount < 0 && (
                  <span className="text-[10px] text-rose-600 mt-0.5">
                    รายจ่ายเกินรายรับ <AnimatedNumber value={Math.abs(remainingAmount)} /> บาท
                  </span>
                )}
                <span className="text-sm font-bold text-celtic-800 mt-2">
                  คิดเป็น <AnimatedNumber value={displayedRatio} suffix="%" maximumFractionDigits={0} />
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>
      {/* Income and expense cards */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="glass-card p-2 rounded-3xl border border-white/80 shadow-xs">
          <div className="flex items-center justify-start mb-2">
            <span className="text-xs font-semibold text-celtic-700">รายรับเดือนนี้</span>
            <div className="w-8 h-8 text-celtic-900 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <AnimatedNumber className="font-onest text-xl sm:text-2xl font-bold text-celtic-900 tracking-tight" value={totalIncome} suffix="-." />
          <span className="text-[11px] text-celtic-900 font-medium block mt-1">
            <AnimatedNumber value={currentMonthTransactions.filter((t) => t.type === 'income').length} suffix=" รายการที่บันทึก" maximumFractionDigits={0} />
          </span>
        </div>
        <div className="glass-card p-2 rounded-3xl border border-white/80 shadow-xs">
          <div className="flex items-center justify-start mb-2">
            <span className="text-xs font-semibold text-celtic-700">รายจ่ายเดือนนี้</span>
            <div className="w-8 h-8 text-celtic-900 flex items-center justify-center">
              <ShoppingBasket className="w-4 h-4" />
            </div>
          </div>
          <AnimatedNumber className="font-onest text-xl sm:text-2xl font-bold text-celtic-800 tracking-tight" value={totalExpense} suffix="-." />
          <span className="text-[11px] text-celtic-900 block mt-1">
            <AnimatedNumber value={currentMonthTransactions.filter((t) => t.type === 'expense').length} suffix=" รายการที่บันทึก" maximumFractionDigits={0} />
          </span>
        </div>
      </div>
      {/* Floating Action Button helper on desktop */}
      <div className="p-5 glass-card rounded-3xl border border-emerald-400/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-apple-300 text-celtic-900 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h6 className="text-sm font-bold text-celtic-900">
              ต้องการบันทึกค่าใช้จ่ายวันนี้เพิ่มไหม?
            </h6>
            <p className="text-xs text-celtic-700">
              จดบันทึกทันทีหลังจ่ายเงินเพื่อควบคุมงบประมาณได้อย่างแม่นยำ
            </p>
          </div>
        </div>
        <button
          onClick={onNavigateToAdd}
          className="px-4 py-2 bg-apple-300 hover:bg-apple-400 text-celtic-900 text-xs font-semibold rounded-xl transition-colors shadow-xs"
        >
          + บันทึกรายการใหม่
        </button>
      </div>
    </div>
  );
};
