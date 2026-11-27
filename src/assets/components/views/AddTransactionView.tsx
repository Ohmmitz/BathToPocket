import React, { useCallback, useEffect, useRef, useState } from 'react';
import { 
  PlusCircle, 
  MinusCircle, 
  Calendar, 
  Clock, 
  FileText, 
  Check, 
  Info,
  MoreHorizontal,
  ArrowLeft,
} from 'lucide-react';
import { 
  Transaction, 
  TransactionType, 
  EXPENSE_CATEGORIES, 
  INCOME_CATEGORIES, 
  LEGACY_INCOME_CATEGORIES,
  CategoryBudget, 
  BudgetItem,
  DEFAULT_INCOME_SOURCE_ITEMS,
  calculateCategorySpent, 
  calculateBudgetTotal,
  getBudgetProgress 
} from '../../utils/finance.ts';
import { getAccountingPeriodMonth } from '../../utils/finance.ts';
import { getCategoryInfo } from '../../utils/categoryHelpers.tsx';
import { SlidingPillToggle } from '../SlidingPillToggle.tsx';
import { ParliamentChart } from '../ParliamentChart.tsx';
import { TransactionSummaryModal } from '../ConfirmationModal.tsx';
import { useCenterSnapFilter } from '../useCenterSnapFilter.ts';
import { PageHeader } from '../PageHeader.tsx';

interface AddTransactionViewProps {
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  budgets: CategoryBudget[];
  currentTransactions: Transaction[];
}

const budgetIconImports = import.meta.glob('../../icon-optimized/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;
const budgetIconUrls = Object.fromEntries(Object.entries(budgetIconImports).map(([path, url]) => [
  path.split('/').pop() || '',
  url,
])) as Record<string, string>;
const EXPENSE_RAINBOW_COLORS: Record<string, string> = {
  'ค่าอาหาร': '#D84B0A',
  'ค่าเดินทาง': '#0A97D8',
  'ค่าใช้จ่ายประจำ': '#B20AD8',
  'ค่าความบันเทิง': '#0A30D8',
  'ค่าสุขภาพ': '#0AD8B2',
  'ค่าของใช้ส่วนตัว': '#FFD400',
  'ค่าหนี้สิน': '#FF7A0C',
  'ค่าใช้จ่ายอื่นๆ': '#EC4899',
};
const EXPENSE_RAINBOW_SEGMENTS = EXPENSE_CATEGORIES.map((expenseCategory) => ({
  value: 1,
  color: EXPENSE_RAINBOW_COLORS[expenseCategory] || '#808080',
}));

interface BudgetItemDragCandidate {
  item: BudgetItem;
  pointerId: number;
  startX: number;
  startY: number;
  isDragging: boolean;
}

interface BudgetItemDragPreview {
  item: BudgetItem;
  x: number;
  y: number;
}

export const AddTransactionView: React.FC<AddTransactionViewProps> = ({
  onAddTransaction,
  budgets,
  currentTransactions,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const categoryFilterRef = useCenterSnapFilter(category);
  const [selectedBudgetItem, setSelectedBudgetItem] = useState<BudgetItem | null>(null);
  const [isChartDropTarget, setIsChartDropTarget] = useState(false);
  const [isChartInteractionNear, setIsChartInteractionNear] = useState(false);
  const [dragPreview, setDragPreview] = useState<BudgetItemDragPreview | null>(null);
  const chartDropRef = useRef<HTMLDivElement>(null);
  const dragCandidateRef = useRef<BudgetItemDragCandidate | null>(null);
  const suppressDraggedClickRef = useRef(false);
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [note, setNote] = useState('');

  // Review state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingTx, setPendingTx] = useState<Omit<Transaction, 'id' | 'createdAt'> | null>(null);
  const [budgetWarningMessage, setBudgetWarningMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Switch category list when type changes
  const handleTypeChange = (newType: TransactionType) => {
    setCurrentStep(1);
    setIsChartDropTarget(false);
    setIsChartInteractionNear(false);
    setType(newType);
    setSelectedBudgetItem(null);
    setTitle('');
    if (newType === 'expense') {
      setCategory(EXPENSE_CATEGORIES[0]);
    } else {
      setCategory(INCOME_CATEGORIES[0]);
    }
  };

  const handleSelectBudgetItem = useCallback((item: BudgetItem | null) => {
    setSelectedBudgetItem(item);
    setTitle(item?.name || '');
    setValidationError(null);
    setIsChartDropTarget(false);
    setIsChartInteractionNear(false);
    setDragPreview(null);
    setCurrentStep(2);
  }, []);

  useEffect(() => {
    let suppressClickTimeout = 0;

    const handlePointerMove = (event: PointerEvent) => {
      const candidate = dragCandidateRef.current;
      if (!candidate || candidate.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - candidate.startX;
      const deltaY = event.clientY - candidate.startY;
      if (!candidate.isDragging && Math.hypot(deltaX, deltaY) > 8) {
        candidate.isDragging = true;
      }
      if (!candidate.isDragging) return;

      event.preventDefault();
      const chartRect = chartDropRef.current?.getBoundingClientRect();
      const overChart = Boolean(chartRect
        && event.clientX >= chartRect.left
        && event.clientX <= chartRect.right
        && event.clientY >= chartRect.top
        && event.clientY <= chartRect.bottom);
      const nearChart = Boolean(chartRect
        && event.clientX >= chartRect.left - 48
        && event.clientX <= chartRect.right + 48
        && event.clientY >= chartRect.top - 48
        && event.clientY <= chartRect.bottom + 48);
      setIsChartDropTarget(overChart);
      setIsChartInteractionNear(nearChart);
      setDragPreview({ item: candidate.item, x: event.clientX, y: event.clientY });
    };

    const finishPointer = (event: PointerEvent, cancelled = false) => {
      const candidate = dragCandidateRef.current;
      if (!candidate || candidate.pointerId !== event.pointerId) return;
      dragCandidateRef.current = null;

      const chartRect = chartDropRef.current?.getBoundingClientRect();
      const droppedOnChart = !cancelled && candidate.isDragging && Boolean(chartRect
        && event.clientX >= chartRect.left
        && event.clientX <= chartRect.right
        && event.clientY >= chartRect.top
        && event.clientY <= chartRect.bottom);

      setDragPreview(null);
      setIsChartDropTarget(false);
      setIsChartInteractionNear(false);
      if (candidate.isDragging) {
        suppressDraggedClickRef.current = true;
        window.clearTimeout(suppressClickTimeout);
        suppressClickTimeout = window.setTimeout(() => {
          suppressDraggedClickRef.current = false;
        }, 0);
      }
      if (droppedOnChart) handleSelectBudgetItem(candidate.item);
    };

    const handlePointerUp = (event: PointerEvent) => finishPointer(event);
    const handlePointerCancel = (event: PointerEvent) => finishPointer(event, true);

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      window.clearTimeout(suppressClickTimeout);
    };
  }, [handleSelectBudgetItem]);

  const handleBudgetItemPointerDown = (event: React.PointerEvent<HTMLSpanElement>, item: BudgetItem) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    // Keep receiving touch moves when the finger leaves the icon on iOS Safari.
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture may be unavailable for a cancelled browser gesture.
    }
    dragCandidateRef.current = {
      item,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      isDragging: false,
    };
  };

  // Form submission: Triggers the mandatory summary confirmation modal
  const handleReviewAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const amount = parseFloat(amountStr);
    if (!amount || amount <= 0) {
      setValidationError('กรุณาระบุจำนวนเงินที่มากกว่า 0');
      return;
    }

    if (!title.trim()) {
      setValidationError('กรุณาระบุชื่อรายการ');
      return;
    }

    const newTx: Omit<Transaction, 'id' | 'createdAt'> = {
      type,
      category,
      title: title.trim(),
      amount,
      date,
      time,
      note: note.trim() || undefined,
      icon: selectedBudgetItem?.icon,
    };

    // Calculate budget impact if expense
    let warningMsg: string | null = null;
    if (type === 'expense') {
      const budgetObj = budgets.find((b) => b.category === category);
      const monthPrefix = date.substring(0, 7);
      const planned = budgetObj
        ? budgetObj.items?.length ? calculateBudgetTotal(budgetObj.items, monthPrefix) : budgetObj.totalPlanned
        : 0;
      const currentSpent = calculateCategorySpent(category, currentTransactions, monthPrefix);
      const futureSpent = currentSpent + amount;
      const progress = getBudgetProgress(futureSpent, planned);

      if (progress.isExceeded) {
        warningMsg = `การบันทึกรายการนี้จะทำให้หมวดหมู่ "${category}" มียอดใช้จ่ายรวม -.${futureSpent.toLocaleString('th-TH')} ซึ่งเกินงบที่วางแผนไว้ (งบ: ${planned.toLocaleString('th-TH')}-.)`;
      } else if (progress.isWarning) {
        warningMsg = `หมวดหมู่ "${category}" จะใช้ไปแล้ว ${progress.percentage}% ของงบประมาณ (เหลืออีก ${progress.remaining.toLocaleString('th-TH')}-.)`;
      }
    }

    setBudgetWarningMessage(warningMsg);
    setPendingTx(newTx);
    setCurrentStep(3);
  };

  // When user confirms inside the modal
  const handleConfirmSave = async () => {
    if (!pendingTx) return;

    try {
      setIsSubmitting(true);
      await onAddTransaction(pendingTx);
      setPendingTx(null);
      // Reset form
      setCurrentStep(1);
      setSelectedBudgetItem(null);
      setTitle('');
      setAmountStr('');
      setNote('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCategories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const categoryBudget = budgets.find((budget) => budget.category === category);
  const incomeBudgets = budgets.filter((budget) =>
    budget.category === 'รายได้' || LEGACY_INCOME_CATEGORIES.includes(budget.category as typeof LEGACY_INCOME_CATEGORIES[number])
  );
  const incomeItems = incomeBudgets.flatMap((budget) => budget.items || [])
    .filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index);
  const hasCanonicalIncomeBudget = incomeBudgets.some((budget) => budget.category === 'รายได้');
  const defaultIncomeItems = DEFAULT_INCOME_SOURCE_ITEMS
    .filter((source) => source.category === 'รายได้')
    .map((source) => source.item);
  const plannedItems = type === 'income'
    ? incomeItems.length > 0
      ? incomeItems
      : hasCanonicalIncomeBudget
        ? []
        : defaultIncomeItems
    : categoryBudget?.items || [];
  const accountingMonth = getAccountingPeriodMonth();
  const periodTransactions = currentTransactions.filter((transaction) => getAccountingPeriodMonth(transaction.date) === accountingMonth);
  const totalPeriodIncome = periodTransactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((total, transaction) => total + (Number(transaction.amount) || 0), 0);
  const totalPeriodExpense = periodTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((total, transaction) => total + (Number(transaction.amount) || 0), 0);
  const remainingAmount = totalPeriodIncome - totalPeriodExpense;
  const remainingRatio = totalPeriodIncome > 0
    ? Math.max(0, Math.min(100, Math.round((remainingAmount / totalPeriodIncome) * 100)))
    : 0;
  const flowSteps = [
    { number: 1, label: 'เลือกรายการ' },
    { number: 2, label: 'ใส่จำนวนเงิน' },
    { number: 3, label: 'สรุปข้อมูล' },
  ] as const;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-2 pb-8">
      <PageHeader
        title="จดค่าใช้จ่าย"
        inlineTrailing
        trailing={(
          <SlidingPillToggle
            value={type}
            onChange={(nextType) => handleTypeChange(nextType as TransactionType)}
            ariaLabel="เลือกประเภทรายการ"
            compact
            className="w-36"
            pillClassName="bg-celtic-900"
            activeTextClassName="!text-snow-drift-50"
            inactiveTextClassName="text-celtic-700 hover:text-celtic-900"
            options={[
              { value: 'expense', label: 'รายจ่าย' },
              { value: 'income', label: 'รายรับ' },
            ]}
          />
        )}
      />
      {currentStep === 1 && <div
        ref={chartDropRef}
        className="parliament-chart-stage"
        role="group"
        aria-label="ลากไอคอนรายการมาวางเพื่อเลือก"
      >
        <ParliamentChart
          percentage={remainingAmount < 0 ? 100 : remainingRatio}
          activeColor={remainingAmount < 0 ? '#90242D' : '#52F229'}
          interactionActive={isChartInteractionNear}
          segments={isChartInteractionNear ? EXPENSE_RAINBOW_SEGMENTS : undefined}
          ariaLabel={`ยอดเงินคงเหลือ ${remainingAmount.toLocaleString('th-TH')} บาท`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 320 320"
            className={`pointer-events-none absolute inset-0 z-10 aspect-square w-full overflow-visible ${isChartDropTarget ? 'text-celtic-900' : 'text-celtic-700'}`}
          >
            <defs>
              <path id="transaction-chart-instruction-arc" d="M 17 185 A 145 145 0 1 1 303 185" />
            </defs>
            <text className="fill-current text-[11px] font-medium opacity-50 tracking-[0.04em]">
              <textPath href="#transaction-chart-instruction-arc" startOffset="50%" textAnchor="middle">
                {isChartDropTarget ? 'ปล่อยเพื่อเลือกรายการ' : 'ลากไอคอนไปวาง หรือแตะเพื่อเลือก'}
              </textPath>
            </text>
          </svg>
          <div className="pointer-events-none flex flex-col items-center justify-center text-center">
            <span className="text-5xl font-bold text-celtic-900 tracking-tight">
              {remainingAmount < 0 ? '−' : ''}{Math.abs(remainingAmount).toLocaleString('th-TH')}
            </span>
            <span className="text-base font-medium text-celtic-700">งบทั้งหมด (บาท)</span>
          </div>
        </ParliamentChart>
      </div>}
      {currentStep !== 1 && <section className="glass-card space-y-3 rounded-3xl p-4 sm:p-5" aria-label="ความคืบหน้าการบันทึก">
        <div className="h-2 overflow-hidden rounded-full bg-snow-drift-200" role="progressbar" aria-label={`ขั้นตอนที่ ${currentStep} จาก 3`} aria-valuemin={1} aria-valuemax={3} aria-valuenow={currentStep}>
          <div className="h-full rounded-full bg-apple-400 transition-[width] duration-500 ease-out" style={{ width: `${(currentStep / 3) * 100}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {flowSteps.map((step) => (
            <div key={step.number} className={`flex items-center gap-1.5 text-xs ${currentStep === step.number ? 'font-semibold text-celtic-900' : currentStep > step.number ? 'text-celtic-700' : 'text-celtic-700/60'}`} aria-current={currentStep === step.number ? 'step' : undefined}>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${currentStep >= step.number ? 'bg-apple-200 text-celtic-900' : 'bg-snow-drift-200 text-celtic-700'}`}>
                {currentStep > step.number ? <Check className="h-3.5 w-3.5" /> : step.number}
              </span>
              <span className="leading-tight">{step.label}</span>
            </div>
          ))}
        </div>
      </section>}
      {/* Main Input Form */}
      {currentStep !== 3 && <form onSubmit={handleReviewAndSubmit} className="relative z-10 glass-card rounded-3xl p-2 border border-white/80 shadow-xs space-y-4">
        {currentStep === 1 && <div className="space-y-4">
        {/* Expense category filter tags */}
        {type === 'expense' && <div>
          <div ref={categoryFilterRef} className="filter-tag-scroll relative z-0 flex flex-nowrap gap-2 overflow-x-auto overscroll-x-contain whitespace-nowrap pb-1" role="group" aria-label={`เลือกหมวดหมู่${type === 'expense' ? 'ค่าใช้จ่าย' : 'รายรับ'}`}>
            {activeCategories.map((cat) => {
              const isSelected = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setCategory(cat);
                    setSelectedBudgetItem(null);
                    setTitle('');
                  }}
                  aria-pressed={isSelected}
                  className={`shrink-0 px-3.5 py-2 rounded-full border text-xs font-semibold transition-all ${
                    isSelected
                      ? type === 'expense'
                        ? 'bg-apple-200 text-celtic-900'
                        : 'bg-apple-300 text-celtic-900'
                      : 'bg-snow-drift-100 text-celtic-900'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>}
        {/* Budget item icon grid */}
        <div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {plannedItems.map((item) => {
                const iconUrl = item.icon ? budgetIconUrls[item.icon] : undefined;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={(event) => {
                      if (suppressDraggedClickRef.current) {
                        event.preventDefault();
                        return;
                      }
                      handleSelectBudgetItem(item);
                    }}
                    aria-label={`เลือก${type === 'expense' ? 'ค่าใช้จ่าย' : 'รายรับ'} ${item.name}`}
                    className="min-h-32 rounded-4xl border p-2 flex flex-col items-center justify-center gap-1 text-center transition-all hover:bg-snow-drift-100/50"
                  >
                    <span
                      className="budget-item-drag-handle flex h-24 w-24 items-center justify-center overflow-hidden"
                      onPointerDown={(event) => handleBudgetItemPointerDown(event, item)}
                      onDragStart={(event) => event.preventDefault()}
                    >
                      {iconUrl ? (
                        <img src={iconUrl} alt="" draggable={false} className="h-full w-full select-none bg-transparent p-1 object-contain" />
                      ) : (
                        <span className="text-xl" aria-hidden="true">{getCategoryInfo(category).emoji}</span>
                      )}
                    </span>
                    <span className="text-xs font-semibold text-celtic-900">
                      {item.name}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => handleSelectBudgetItem(null)}
                aria-label={`เลือก${type === 'expense' ? 'ค่าใช้จ่าย' : 'รายรับ'}รายการอื่น`}
                className="min-h-32 rounded-4xl border p-2 flex flex-col items-center justify-center gap-1 text-center transition-all hover:bg-snow-drift-100/50"
              >
                <span className="w-24 h-24 flex items-center justify-center overflow-hidden">
                  <MoreHorizontal className="w-10 h-10 text-celtic-900" />
                </span>
                <span className="text-xs font-semibold leading-snug text-celtic-900">รายการอื่น</span>
              </button>
            </div>
          </div>
        </div>}
        {currentStep === 2 && <div className="space-y-4">
          <button type="button" onClick={() => { setValidationError(null); setCurrentStep(1); }} className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm font-medium text-celtic-700 hover:bg-snow-drift-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-300">
            <ArrowLeft className="h-4 w-4" /> ย้อนกลับ
          </button>
          <div className="flex items-center gap-3 rounded-2xl bg-snow-drift-100/70 p-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden">
              {selectedBudgetItem?.icon && budgetIconUrls[selectedBudgetItem.icon]
                ? <img src={budgetIconUrls[selectedBudgetItem.icon]} alt="" className="h-full w-full object-contain" />
                : <span className="text-2xl" aria-hidden="true">{getCategoryInfo(category).emoji}</span>}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-medium text-celtic-900">{selectedBudgetItem?.name || title || 'รายการอื่น'}</span>
              <span className="block text-xs text-celtic-700">{category}</span>
            </span>
          </div>
        {/* Amount Input */}
        <div>
          <label htmlFor="tx-amount" className="block text-xs font-bold uppercase text-celtic-700 mb-4">
            จำนวนเงิน (บาท)
          </label>
          <div className="relative">
            <input
              id="tx-amount"
              type="number"
              step="any"
              min="0"
              required
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0.00"
              className="w-full pl-4 pr-4 py-4 bg-transparent rounded-2xl text-4xl font-extrabold text-celtic-900 focus:bg-snow-drift-100 focus:outline-none transition-all font-onest"
            />
          </div>
        </div>
        {/* Title Input */}
        <div>
          <label htmlFor="tx-title" className="block text-xs font-bold uppercase text-celtic-700 mb-4">
            ชื่อรายการ
          </label>
          <input
            id="tx-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ระบุชื่อรายการ"
            className="w-full px-4 py-3 bg-transparent rounded-2xl text-sm font-medium text-celtic-900 focus:bg-snow-drift-100 focus:outline-none transition-all"
          />
        </div>
        {/* Date and Time Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="tx-date" className="block text-xs font-bold uppercase text-celtic-700 mb-4">
              วันที่
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-celtic-700" />
              <input
                id="tx-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full appearance-none pl-8 pr-1 py-2.5 bg-transparent border-0 rounded-xl text-xs font-medium text-celtic-900 shadow-none focus:outline-none focus:ring-0"
              />
            </div>
          </div>
          <div>
            <label htmlFor="tx-time" className="block text-xs font-bold uppercase text-celtic-700 mb-4">
              เวลา
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-celtic-700" />
              <input
                id="tx-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full appearance-none pl-8 pr-1 py-2.5 bg-transparent border-0 rounded-xl text-xs font-medium text-celtic-900 shadow-none focus:outline-none focus:ring-0"
              />
            </div>
          </div>
        </div>
        {/* Optional Note */}
        <div>
          <label htmlFor="tx-note" className="block text-xs font-bold uppercase text-celtic-700 mb-4">
            หมายเหตุเพิ่มเติม (ถ้ามี)
          </label>
          <div className="relative">
            <FileText className="w-4 h-4 absolute left-3 top-3 text-celtic-700" />
            <textarea
              id="tx-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="บันทึกรายละเอียดเพิ่มเติม เช่น ร้านค้า, ซื้อให้ใคร, เลขใบเสร็จ..."
              className="w-full pl-9 pr-3 py-2.5 bg-transparent border border-white/90 rounded-2xl text-xs font-medium text-celtic-900 focus:bg-snow-drift-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
          </div>
        </div>
        {/* Validation error notice */}
        {validationError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{validationError}</span>
          </div>
        )}
        {/* Review and Submit Button */}
          <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-full bg-apple-300 px-6 py-3.5 text-base font-bold text-celtic-900 transition-colors hover:bg-apple-400">
            <Check className="h-5 w-5" /> ตรวจสอบและบันทึกข้อมูล
          </button>
        </div>}
      </form>}
      {dragPreview && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[150] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
          style={{ left: dragPreview.x, top: dragPreview.y }}
        >
          <span className="flex h-24 w-24 items-center justify-center bg-transparent drop-shadow-[0_4px_12px_rgba(24,49,38,0.25)]">
            {dragPreview.item.icon && budgetIconUrls[dragPreview.item.icon]
              ? <img src={budgetIconUrls[dragPreview.item.icon]} alt="" draggable={false} className="h-full w-full select-none bg-transparent object-contain" />
              : <span className="text-5xl" aria-hidden="true">{getCategoryInfo(category).emoji}</span>}
          </span>
        </div>
      )}
      <TransactionSummaryModal
        isOpen={currentStep === 3 && Boolean(pendingTx)}
        onClose={() => setCurrentStep(2)}
        onConfirm={handleConfirmSave}
        transaction={pendingTx}
        itemIconUrl={selectedBudgetItem?.icon ? budgetIconUrls[selectedBudgetItem.icon] : undefined}
        budgetWarningMessage={budgetWarningMessage}
        isSubmitting={isSubmitting}
        isFullPage
      />
    </div>
  );
};
