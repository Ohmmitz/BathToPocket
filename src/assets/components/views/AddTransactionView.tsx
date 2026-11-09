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
  Info
} from 'lucide-react';
import { 
  Transaction, 
  TransactionType, 
  EXPENSE_CATEGORIES, 
  INCOME_CATEGORIES, 
  CategoryBudget, 
  calculateCategorySpent, 
  getBudgetProgress 
} from '../../utils/finance.ts';
import { getCategoryInfo } from '../../utils/categoryHelpers.tsx';
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
  'เงินออม': ['โอนเข้าบัญชีเงินออม', 'ซื้อกองทุน', 'ออมทอง', 'เงินสำรองฉุกเฉิน'],
  'ค่าใช้จ่ายอื่นๆ': ['ซ่อมของ', 'ทำบุญ', 'ของขวัญ', 'ค่าใช้จ่ายเบ็ดเตล็ด'],
  // Incomes
  'เงินเดือน / ค่าจ้าง': ['เงินเดือน', 'ค่าจ้างรายวัน', 'OT / ค่าล่วงเวลา'],
  'โบนัส': ['โบนัสประจำปี', 'โบนัสพิเศษ'],
  'ธุรกิจ / งานเสริม': ['กำไรขายของ', 'งานฟรีแลนซ์', 'รับจ้างทั่วไป'],
  'ลงทุน / ปันผล': ['เงินปันผลหุ้น', 'ดอกเบี้ยเงินฝาก', 'กำไรจากการลงทุน'],
  'อื่นๆ': ['เงินคืน / คืนภาษี', 'ผู้ใหญ่ให้มา', 'ลาภลอย'],
};

export const AddTransactionView: React.FC<AddTransactionViewProps> = ({
  onAddTransaction,
  budgets,
  currentTransactions,
  onOpenUndoModal,
  hasTransactionsToUndo,
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
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
    };

    // Calculate budget impact if expense
    let warningMsg: string | null = null;
    if (type === 'expense') {
      const budgetObj = budgets.find((b) => b.category === category);
      const planned = budgetObj ? budgetObj.totalPlanned : 0;
      const monthPrefix = date.substring(0, 7);
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

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-8">
      {/* Page Title & Quick Undo button */}
      <div className="flex items-center justify-between glass-card p-5 rounded-3xl border border-white/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            บันทึกค่าใช้จ่าย / รายรับ
          </h1>
          <p className="text-xs text-gray-500">
            ระบบจะแสดงหน้าสรุปข้อมูลทุกครั้งก่อนกดยืนยันบันทึก
          </p>
        </div>
        {hasTransactionsToUndo && (
          <button
            type="button"
            onClick={onOpenUndoModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold bg-amber-500/15 text-amber-900 hover:bg-amber-500/20 border border-amber-300 transition-all shadow-2xs backdrop-blur-md active:scale-95"
            title="ย้อนรายการล่าสุดที่เพิ่งบันทึก"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
            <span className="hidden sm:inline">ย้อนรายการล่าสุด</span>
            <span className="sm:hidden">ย้อน</span>
          </button>
        )}
      </div>

      {/* Main Input Form */}
      <form onSubmit={handleReviewAndSubmit} className="glass-card rounded-3xl p-6 sm:p-7 border border-white/80 shadow-xs space-y-6">
        {/* Toggle Type: Expense / Income */}
        <div className="flex bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-white/80 shadow-2xs">
          <button
            type="button"
            onClick={() => handleTypeChange('expense')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
              type === 'expense'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MinusCircle className="w-4 h-4" />
            รายจ่าย
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('income')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
              type === 'income'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            รายรับ
          </button>
        </div>

        {/* Amount Input */}
        <div>
          <label htmlFor="tx-amount" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            จำนวนเงิน (บาท) *
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
              className="w-full pl-4 pr-4 py-4 bg-white/70 backdrop-blur-md border border-white/90 rounded-2xl text-3xl font-extrabold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-onest shadow-xs"
            />
          </div>

          {/* Quick Amount Chips */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            <span className="text-[11px] text-gray-500 font-medium mr-1">เพิ่มเร็ว:</span>
            {[50, 100, 500, 1000].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleQuickAddAmount(val)}
                className="px-3 py-1 text-xs font-semibold bg-white/70 hover:bg-white border border-white/80 text-gray-700 rounded-xl transition-all shadow-2xs backdrop-blur-xs active:scale-95"
              >
                +{val.toLocaleString()}
              </button>
            ))}
            {amountStr && (
              <button
                type="button"
                onClick={() => setAmountStr('')}
                className="px-2.5 py-1 text-xs font-medium text-gray-400 hover:text-rose-600 transition-colors ml-auto"
              >
                ล้างยอด
              </button>
            )}
          </div>
        </div>

        {/* Category Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            หมวดหมู่ {type === 'expense' ? 'ค่าใช้จ่าย' : 'รายรับ'} *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {activeCategories.map((cat) => {
              const isSelected = category === cat;
              const catInfo = getCategoryInfo(cat);

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-between transition-all duration-200 backdrop-blur-sm relative group ${
                    isSelected
                      ? 'bg-emerald-500/15 border-emerald-500/80 ring-2 ring-emerald-500/30 shadow-xs scale-[1.02]'
                      : 'bg-white/60 border-white/80 hover:bg-white/90'
                  }`}
                >
                  {/* Selected checkmark indicator */}
                  {isSelected && (
                    <span className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                  )}

                  {/* Span ที่อยู่ด้านนอกไอคอนมีขนาดกว้างเท่ากับ Button พร้อมไอคอนอิโมจิขนาดใหญ่ */}
                  <span className={`w-full py-3 px-2 rounded-xl flex items-center justify-center text-3xl sm:text-4xl mb-2 transition-all duration-200 ${
                    isSelected
                      ? 'bg-emerald-500/20 shadow-xs scale-105'
                      : `${catInfo.bgLight} shadow-2xs group-hover:scale-105`
                  }`}>
                    {catInfo.emoji}
                  </span>

                  <span className={`text-xs font-semibold leading-snug line-clamp-1 w-full text-center ${
                    isSelected ? 'text-emerald-950 font-bold' : 'text-gray-800'
                  }`}>
                    {cat}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title Input & Quick Suggestions */}
        <div>
          <label htmlFor="tx-title" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            ชื่อรายการ *
          </label>
          <input
            id="tx-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`เช่น ${suggestions[0] || 'อาหารเช้า, ช็อปปิ้ง'}`}
            className="w-full px-4 py-3 bg-white/70 backdrop-blur-md border border-white/90 rounded-2xl text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-2xs"
          />

          {/* Quick Suggestions for current category */}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <span className="text-[11px] text-gray-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                แนะนำ:
              </span>
              {suggestions.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setTitle(sug)}
                  className="px-2.5 py-1 text-xs bg-white/70 hover:bg-emerald-500/20 hover:text-emerald-900 text-gray-700 rounded-lg transition-colors border border-white/80 shadow-2xs"
                >
                  {sug}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date and Time Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label htmlFor="tx-date" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              วันที่
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="tx-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-white/70 backdrop-blur-md border border-white/90 rounded-2xl text-xs font-medium text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
            </div>
          </div>
          <div>
            <label htmlFor="tx-time" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              เวลา
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="tx-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-white/70 backdrop-blur-md border border-white/90 rounded-2xl text-xs font-medium text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Optional Note */}
        <div>
          <label htmlFor="tx-note" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            หมายเหตุเพิ่มเติม (ถ้ามี)
          </label>
          <div className="relative">
            <FileText className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <textarea
              id="tx-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="บันทึกรายละเอียดเพิ่มเติม เช่น ร้านค้า, ซื้อให้ใคร, เลขใบเสร็จ..."
              className="w-full pl-9 pr-3 py-2.5 bg-white/70 backdrop-blur-md border border-white/90 rounded-2xl text-xs font-medium text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
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
            className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
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
        budgetWarningMessage={budgetWarningMessage}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};
