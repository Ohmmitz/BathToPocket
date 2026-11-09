import React from 'react';
import { 
  Check, 
  X, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  Tag, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  RotateCcw
} from 'lucide-react';
import { Transaction } from '../utils/finance.ts';
import { getCategoryInfo } from '../utils/categoryHelpers.tsx';

interface TransactionSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  transaction: Omit<Transaction, 'id' | 'createdAt'> | null;
  budgetWarningMessage?: string | null;
  isSubmitting?: boolean;
}

export const TransactionSummaryModal: React.FC<TransactionSummaryModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  transaction,
  budgetWarningMessage,
  isSubmitting = false,
}) => {
  if (!isOpen || !transaction) return null;

  const isExpense = transaction.type === 'expense';
  const catInfo = getCategoryInfo(transaction.category);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md glass-island rounded-3xl shadow-2xl border border-white/95 overflow-hidden transform transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="summary-modal-title"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${isExpense ? 'bg-rose-500/15 text-rose-600' : 'bg-emerald-500/15 text-emerald-700'} shadow-2xs`}>
              {isExpense ? <TrendingDown className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
            </div>
            <div>
              <h3 id="summary-modal-title" className="text-lg font-bold text-gray-900 leading-tight">
                สรุปข้อมูลก่อนบันทึก
              </h3>
              <p className="text-xs text-gray-500">
                โปรดตรวจสอบความถูกต้องของรายการ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-white/60 rounded-xl transition-colors"
            aria-label="ปิดหน้าต่างสรุป"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Details */}
        <div className="p-6 space-y-4">
          {/* Main Amount Card */}
          <div className={`p-4 rounded-xl text-center border ${
            isExpense ? 'bg-rose-50/50 border-rose-100' : 'bg-emerald-50/50 border-emerald-100'
          }`}>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">
              {isExpense ? 'จำนวนเงินที่จ่าย (รายจ่าย)' : 'จำนวนเงินที่ได้รับ (รายรับ)'}
            </span>
            <div className={`font-onest text-3xl font-extrabold tracking-tight ${
              isExpense ? 'text-rose-600' : 'text-emerald-700'
            }`}>
              {isExpense ? '-' : '+'}{Number(transaction.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white border border-gray-200 text-gray-800 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-current"></span>
              {transaction.title}
            </div>
          </div>

          {/* Details Grid */}
          <div className="bg-gray-50 rounded-xl p-3.5 space-y-2.5 text-sm border border-gray-100">
            <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
              <span className="text-gray-500 flex items-center gap-1.5 text-xs">
                <Tag className="w-3.5 h-3.5" />
                หมวดหมู่
              </span>
              <span className="font-medium text-gray-900 flex items-center gap-1.5">
                <span className={`p-1 rounded-md ${catInfo.bgLight} ${catInfo.textColor}`}>
                  {catInfo.icon}
                </span>
                {transaction.category}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
              <span className="text-gray-500 flex items-center gap-1.5 text-xs">
                <Calendar className="w-3.5 h-3.5" />
                วันที่
              </span>
              <span className="font-medium text-gray-900">
                {transaction.date}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
              <span className="text-gray-500 flex items-center gap-1.5 text-xs">
                <Clock className="w-3.5 h-3.5" />
                เวลา
              </span>
              <span className="font-medium text-gray-900">
                {transaction.time || '-'} น.
              </span>
            </div>

            {transaction.note && (
              <div className="flex items-start justify-between py-1">
                <span className="text-gray-500 flex items-center gap-1.5 text-xs pt-0.5">
                  <FileText className="w-3.5 h-3.5" />
                  หมายเหตุ
                </span>
                <span className="font-normal text-gray-700 text-right max-w-[65%] break-words">
                  {transaction.note}
                </span>
              </div>
            )}
          </div>

          {/* Budget Warning Alert (if any) */}
          {budgetWarningMessage && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">คำเตือนงบประมาณ</span>
                {budgetWarningMessage}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-6 pt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 font-medium text-sm transition-colors text-center"
          >
            แก้ไข / ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันการบันทึก'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface UndoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  latestTransaction: Transaction | null;
  isProcessing?: boolean;
}

export const UndoModal: React.FC<UndoModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  latestTransaction,
  isProcessing = false,
}) => {
  if (!isOpen || !latestTransaction) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md glass-island rounded-3xl shadow-2xl border border-white/95 overflow-hidden transform transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="undo-modal-title"
      >
        <div className="p-6 text-center">
          <div className="w-13 h-13 rounded-full bg-amber-500/15 text-amber-800 flex items-center justify-center mx-auto mb-4 border border-amber-300 shadow-2xs">
            <RotateCcw className="w-6 h-6" />
          </div>
          <h3 id="undo-modal-title" className="text-lg font-bold text-gray-900 mb-1">
            ย้อนรายการล่าสุด (Undo)
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            ต้องการยกเลิกและลบรายการล่าสุดนี้ใช่หรือไม่?
          </p>

          {/* Details Card */}
          <div className="bg-white/60 backdrop-blur-md p-4.5 rounded-2xl border border-white/90 text-left mb-6 shadow-2xs">
            <div className="flex justify-between items-start mb-1">
              <span className="font-semibold text-gray-900 text-base">
                {latestTransaction.title}
              </span>
              <span className={`font-onest font-bold text-base ${
                latestTransaction.type === 'expense' ? 'text-red-600' : 'text-emerald-600'
              }`}>
                {latestTransaction.type === 'expense' ? '-' : '+'}{latestTransaction.amount.toLocaleString('th-TH')}
              </span>
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-white border border-gray-200">
                {latestTransaction.category}
              </span>
              <span>•</span>
              <span>{latestTransaction.date} {latestTransaction.time}</span>
            </div>
            {latestTransaction.note && (
              <div className="text-xs text-gray-500 mt-2 italic bg-white p-2 rounded border border-gray-100">
                "{latestTransaction.note}"
              </div>
            )}
          </div>

          <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200/60 mb-5 text-left">
            💡 ข้อมูลจะถูกลบออกจากระบบ และส่งคำสั่งลบไปยัง Google Sheets อัตโนมัติ
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 font-medium text-sm transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={onConfirm}
              disabled={isProcessing}
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors shadow-sm shadow-red-600/20"
            >
              {isProcessing ? 'กำลังย้อน...' : 'ยืนยันลบรายการนี้'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
