import React, { useState } from 'react';
import { 
  PlusCircle, 
  MinusCircle, 
  Calendar, 
  Clock, 
  FileText, 
  Check, 
  RotateCcw,
  Sparkles,
  Info,
  MoreHorizontal,
} from 'lucide-react';
import { 
  Transaction, 
  TransactionType, 
  EXPENSE_CATEGORIES, 
  INCOME_CATEGORIES, 
  CategoryBudget, 
  BudgetItem,
  calculateCategorySpent, 
  calculateBudgetTotal,
  getBudgetProgress 
} from '../../utils/finance.ts';
import { getCategoryInfo } from '../../utils/categoryHelpers.tsx';
import { SlidingPillToggle } from '../SlidingPillToggle.tsx';
import { TransactionSummaryModal } from '../ConfirmationModal.tsx';

interface AddTransactionViewProps {
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  budgets: CategoryBudget[];
  currentTransactions: Transaction[];
  onOpenUndoModal: () => void;
  hasTransactionsToUndo: boolean;
}

const CATEGORY_SUGGESTIONS: Record<string, string[]> = {
  'อาหารและเครื่องดื่ม': ['ข้าวเช้า', 'ข้าวเที่ยง', 'ข้าวเย็น', 'กาแฟ', 'ชานมไข่มุก', 'ขนม/ของว่าง', 'บุฟเฟต์'],
  'การเดินทาง': ['ค่าน้ำมัน', 'ค่า BTS', 'ค่า MRT', 'ค่าแท็กซี่ / Grab', 'ค่าทางด่วน', 'ค่าจอดรถ'],
  'บิลและค่าใช้จ่ายประจำ': ['ค่าห้อง / ค่าเช่า', 'ค่าน้ำ ค่าไฟ', 'ค่าเน็ตบ้าน', 'ค่าโทรศัพท์', 'Netflix / Spotify'],
  'ความบันเทิงและพักผ่อน': ['ดูหนัง', 'ซื้อเกม', 'สังสรรค์กับเพื่อน', 'คอนเสิร์ต / อีเวนต์'],
  'สุขภาพและยา': ['ซื้อยา', 'วิตามิน / อาหารเสริม', 'หาหมอ / คลินิก', 'ค่าทำฟัน'],
  'ของใช้และช็อปปิ้ง': ['ของใช้ในบ้าน', 'เสื้อผ้า', 'เครื่องสำอาง', 'ของช็อปออนไลน์'],
  'หนี้สิน': ['ชำระหนี้บัตรเครดิต', 'ผ่อนชำระหนี้', 'ดอกเบี้ยเงินกู้', 'ชำระหนี้อื่นๆ'],
  'ค่าใช้จ่ายอื่นๆ': ['ซ่อมของ', 'ทำบุญ', 'ของขวัญ', 'ค่าใช้จ่ายเบ็ดเตล็ด'],
  // Incomes
  'เงินเดือน / ค่าจ้าง': ['เงินเดือน', 'ค่าจ้างรายวัน', 'OT / ค่าล่วงเวลา'],
  'โบนัส': ['โบนัสประจำปี', 'โบนัสพิเศษ'],
  'ธุรกิจ / งานเสริม': ['กำไรขายของ', 'งานฟรีแลนซ์', 'รับจ้างทั่วไป'],
  'ลงทุน / ปันผล': ['เงินปันผลหุ้น', 'ดอกเบี้ยเงินฝาก', 'กำไรจากการลงทุน'],
  'อื่นๆ': ['เงินคืน / คืนภาษี', 'ผู้ใหญ่ให้มา', 'ลาภลอย'],
};

const budgetIconImports = import.meta.glob('../../icon-optimized/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;
const budgetIconUrls = Object.fromEntries(Object.entries(budgetIconImports).map(([path, url]) => [
  path.split('/').pop() || '',
  url,
])) as Record<string, string>;

export const AddTransactionView: React.FC<AddTransactionViewProps> = ({
  onAddTransaction,
  budgets,
  currentTransactions,
  onOpenUndoModal,
  hasTransactionsToUndo,
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [selectedBudgetItem, setSelectedBudgetItem] = useState<BudgetItem | null>(null);
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [note, setNote] = useState('');

  // Confirmation Modal state
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingTx, setPendingTx] = useState<Omit<Transaction, 'id' | 'createdAt'> | null>(null);
  const [budgetWarningMessage, setBudgetWarningMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Switch category list when type changes
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    setSelectedBudgetItem(null);
    setTitle('');
    if (newType === 'expense') {
      setCategory(EXPENSE_CATEGORIES[0]);
    } else {
      setCategory(INCOME_CATEGORIES[0]);
    }
  };

  const handleQuickAddAmount = (addValue: number) => {
    const current = parseFloat(amountStr) || 0;
    setAmountStr(String(current + addValue));
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
      icon: type === 'expense' ? selectedBudgetItem?.icon : undefined,
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
    setIsSummaryOpen(true);
  };

  // When user confirms inside the modal
  const handleConfirmSave = async () => {
    if (!pendingTx) return;

    try {
      setIsSubmitting(true);
      await onAddTransaction(pendingTx);
      setIsSummaryOpen(false);
      setPendingTx(null);
      // Reset form
      setTitle('');
      setAmountStr('');
      setNote('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCategories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const suggestions = CATEGORY_SUGGESTIONS[category] || [];
  const plannedItems = type === 'expense'
    ? budgets.find((budget) => budget.category === category)?.items || []
    : [];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-2 pb-8">
      {/* Page Title & Quick Undo button */}
      <div className="flex items-center justify-between glass-card p-5 rounded-3xl border border-white/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-celtic-900 tracking-tight">
            บันทึกค่าใช้จ่าย
          </h1>
        </div>
        {hasTransactionsToUndo && (
          <button
            type="button"
            onClick={onOpenUndoModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-snow-drift-100 text-celtic-900 hover:bg-amber-500/20 transition-all shadow-2xs backdrop-blur-md active:scale-95"
            title="ย้อนรายการล่าสุดที่เพิ่งบันทึก"
          >
            <RotateCcw className="w-3.5 h-3.5 text-celtic-900" />
            <span className="hidden sm:inline">ย้อนรายการล่าสุด</span>
            <span className="sm:hidden">ย้อน</span>
          </button>
        )}
      </div>
      {/* Main Input Form */}
      <form onSubmit={handleReviewAndSubmit} className="glass-card rounded-3xl p-2 border border-white/80 shadow-xs space-y-4">
        {/* Toggle Type: Expense / Income */}
        <SlidingPillToggle
          value={type}
          onChange={(nextType) => handleTypeChange(nextType as TransactionType)}
          ariaLabel="เลือกประเภทรายการ"
          pillClassName="bg-celtic-900"
          activeTextClassName="text-snow-drift-50"
          inactiveTextClassName="text-celtic-700 hover:text-celtic-900"
          options={[
            { value: 'expense', label: 'รายจ่าย', icon: <MinusCircle className="h-4 w-4" /> },
            { value: 'income', label: 'รายรับ', icon: <PlusCircle className="h-4 w-4" /> },
          ]}
        />

        {/* Category filter tags */}
        <div>
          <label className="block text-xs font-bold uppercase text-celtic-700 mb-4">
            หมวดหมู่{type === 'expense' ? 'ค่าใช้จ่าย' : 'รายรับ'}
          </label>
          <div className="filter-tag-scroll flex flex-nowrap gap-2 overflow-x-auto overscroll-x-contain whitespace-nowrap pb-1" role="group" aria-label={`เลือกหมวดหมู่${type === 'expense' ? 'ค่าใช้จ่าย' : 'รายรับ'}`}>
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
                        ? 'bg-apple-300 text-celtic-900'
                        : 'bg-apple-300 text-celtic-900'
                      : 'bg-snow-drift-100 text-celtic-900'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
        {/* Budget item icon grid */}
        {type === 'expense' && (
          <div>
            <label className="block text-xs font-bold uppercase text-celtic-700 mb-2">
              เลือกรายการค่าใช้จ่าย
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {plannedItems.map((item) => {
                const isSelected = selectedBudgetItem?.id === item.id;
                const iconUrl = item.icon ? budgetIconUrls[item.icon] : undefined;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedBudgetItem(item);
                      setTitle(item.name);
                    }}
                    aria-pressed={isSelected}
                    className={`min-h-32 rounded-4xl border p-2 flex flex-col items-center justify-center gap-1 text-center transition-all ${
                      isSelected
                        ? 'bg-snow-drift-100'
                        : 'bg-transparent'
                    }`}
                  >
                    <span className="w-24 h-24 flex items-center justify-center overflow-hidden">
                      {iconUrl ? (
                        <img src={iconUrl} alt="" className="w-full h-full p-1 object-contain" />
                      ) : (
                        <span className="text-xl" aria-hidden="true">{getCategoryInfo(category).emoji}</span>
                      )}
                    </span>
                    <span className={`text-xs font-semibold ${isSelected ? 'text-celtic-900' : 'text-gray-800'}`}>
                      {item.name}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setSelectedBudgetItem(null);
                  setTitle('');
                }}
                aria-pressed={selectedBudgetItem === null}
                className={`min-h-32 rounded-4xl border p-2 flex flex-col items-center justify-center gap-1 text-center transition-all ${
                  selectedBudgetItem === null
                    ? 'bg-snow-drift-100'
                    : 'bg-transparent'
                }`}
              >
                <span className="w-24 h-24 flex items-center justify-center overflow-hidden">
                  <MoreHorizontal className="w-10 h-10 text-celtic-900" />
                </span>
                <span className="text-xs font-semibold leading-snug text-celtic-900">รายการอื่น</span>
              </button>
            </div>
            {plannedItems.length === 0 && (
              <p className="text-[11px] text-gray-500 mt-2">หมวดนี้ยังไม่มีรายการในแพลงบ เลือก “รายการอื่น” แล้วกรอกชื่อรายการด้านล่างได้</p>
            )}
          </div>
        )}
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
          <div className="flex flex-wrap items-center gap-1 mt-4">
            <span className="text-xs text-celtic-700 font-medium mr-1">เพิ่มเร็ว</span>
            {[10,50,100].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleQuickAddAmount(val)}
                className="px-2 py-1 text-xs hover:bg-snow-drift-100 border border-white/80 text-gray-700 rounded-full transition-all "
              >
                +{val.toLocaleString()}
              </button>
            ))}
            {amountStr && (
              <button
                type="button"
                onClick={() => setAmountStr('')}
                className="px-2.5 py-1 text-xs text-gray-400 hover:text-rose-600 transition-colors ml-auto"
              >
                ล้างยอด
              </button>
            )}
          </div>
        </div>
        {/* Title Input & Quick Suggestions */}
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
            placeholder={`เช่น ${suggestions[0] || 'อาหารเช้า, ช็อปปิ้ง'}`}
            className="w-full px-4 py-3 bg-transparent border border-white/90 rounded-2xl text-sm font-medium text-celtic-900 focus:bg-snow-drift-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-2xs"
          />
          {/* Quick Suggestions for current category */}
          {type === 'income' && suggestions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <span className="text-xs text-celtic-800 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                แนะนำ:
              </span>
              {suggestions.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setTitle(sug)}
                  className="px-2.5 py-1 text-xs bg-snow-drift-100 text-celtic-900 rounded-full transition-colors"
                >
                  {sug}
                </button>
              ))}
            </div>
          )}
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
                className="w-fit pl-9 pr-3 py-2.5 bg-transparent rounded-2xl text-xs font-medium text-celtic-900"
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
                className="w-fit pl-9 pr-3 py-2.5 bg-transparent rounded-2xl text-xs font-medium text-celtic-900"
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
        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-3.5 px-6 rounded-full bg-apple-300 hover:bg-apple-400 active:scale-[0.99] text-celtic-900 font-bold text-base transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            ตรวจสอบและบันทึกข้อมูล
          </button>
          <p className="text-[11px] text-gray-400 text-center mt-2">
            * ระบบจะเปิดหน้าต่างสรุปข้อมูลให้ตรวจสอบความถูกต้องก่อนบันทึกลงระบบจริง
          </p>
        </div>
      </form>
      {/* Mandatory Summary Confirmation Modal */}
      <TransactionSummaryModal
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        onConfirm={handleConfirmSave}
        transaction={pendingTx}
        itemIconUrl={selectedBudgetItem?.icon ? budgetIconUrls[selectedBudgetItem.icon] : undefined}
        budgetWarningMessage={budgetWarningMessage}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};
