import React, { useEffect, useRef, useState } from 'react';
import { 
  ChevronRight,
  X, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  Tag, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  RotateCcw,
  Wallet, 
  ShoppingBasket,
} from 'lucide-react';
import { Transaction } from '../utils/finance.ts';
import { getCategoryInfo } from '../utils/categoryHelpers.tsx';

interface SlideToConfirmProps {
  disabled: boolean;
  isSubmitting: boolean;
  onConfirm: () => void;
}

const SlideToConfirm: React.FC<SlideToConfirmProps> = ({ disabled, isSubmitting, onConfirm }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const draggingRef = useRef(false);
  const confirmingRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const updateProgress = (value: number) => {
    const next = Math.max(0, Math.min(1, value));
    progressRef.current = next;
    setProgress(next);
  };

  const confirm = () => {
    if (disabled || isSubmitting || confirmingRef.current) return;
    if (progressRef.current < 0.82) {
      updateProgress(0);
      return;
    }
    confirmingRef.current = true;
    updateProgress(1);
    onConfirm();
  };

  useEffect(() => {
    if (!isSubmitting) {
      confirmingRef.current = false;
      progressRef.current = 0;
      setProgress(0);
    }
  }, [isSubmitting]);

  const getMaxTravel = () => {
    const trackWidth = trackRef.current?.getBoundingClientRect().width || 0;
    return Math.max(0, trackWidth - 64);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || isSubmitting) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = true;
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggingRef.current) return;
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const travel = getMaxTravel();
    const thumbCenter = event.clientX - rect.left - 32;
    updateProgress(travel > 0 ? thumbCenter / travel : 0);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    confirm();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || isSubmitting) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      updateProgress(progressRef.current + (event.key === 'ArrowRight' ? 0.12 : -0.12));
      if (progressRef.current >= 1) confirm();
    } else if (event.key === 'Home') {
      event.preventDefault();
      updateProgress(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      updateProgress(1);
      confirm();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      confirm();
    }
  };

  const thumbTravel = getMaxTravel();
  const thumbOffset = thumbTravel * progress;

  return (
    <div
      ref={trackRef}
      className="relative h-16 w-full overflow-hidden rounded-full bg-snow-drift-200 p-4 select-none"
      aria-label="เลื่อนเพื่อยืนยันการบันทึก"
    >
      <div
        className="absolute inset-y-2 left-2 rounded-full bg-apple-200 transition-[width] duration-200 ease-out"
        style={{ width: `${56 + thumbOffset}px` }}
        aria-hidden="true"
      />
      <div className="slide-confirm-shimmer absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-transparent via-white/50 to-transparent" aria-hidden="true" />
      <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center pl-10 pr-4 text-sm font-medium text-celtic-800">
        {isSubmitting ? 'กำลังบันทึก...' : progress > 0.12 ? 'เลื่อนต่อเพื่อยืนยัน' : 'เลื่อนเพื่อยืนยันการบันทึก'}
      </span>
      <button
        type="button"
        role="slider"
        aria-label="เลื่อนเพื่อยืนยันการบันทึก"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-valuetext={isSubmitting ? 'กำลังบันทึก' : `${Math.round(progress * 100)} เปอร์เซ็นต์`}
        aria-disabled={disabled || isSubmitting}
        disabled={disabled || isSubmitting}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { draggingRef.current = false; setIsDragging(false); updateProgress(0); }}
        onKeyDown={handleKeyDown}
        className={`absolute left-2 top-2 z-20 flex h-12 w-18 touch-none items-center justify-center rounded-full bg-apple-400 text-celtic-900 transition-[transform,background-color] duration-200 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-apple-200 ${isDragging ? 'cursor-grabbing scale-105' : 'cursor-grab'} ${disabled || isSubmitting ? 'opacity-70' : 'hover:bg-apple-300'}`}
        style={{ transform: `translateX(${thumbOffset}px)` }}
      >
        {isSubmitting ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-celtic-900/25 border-t-celtic-900" /> : <ChevronRight className="h-6 w-6" />}
      </button>
    </div>
  );
};

interface TransactionSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  transaction: Omit<Transaction, 'id' | 'createdAt'> | null;
  itemIconUrl?: string;
  budgetWarningMessage?: string | null;
  isSubmitting?: boolean;
}

export const TransactionSummaryModal: React.FC<TransactionSummaryModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  transaction,
  itemIconUrl,
  budgetWarningMessage,
  isSubmitting = false,
}) => {
  if (!isOpen || !transaction) return null;

  const isExpense = transaction.type === 'expense';
  const catInfo = getCategoryInfo(transaction.category);

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-celtic-900/80 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md glass-island rounded-4xl overflow-hidden transform transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="summary-modal-title"
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-4 rounded-2xl ${isExpense ? 'bg-apple-300 text-celtic-900' : 'bg-apple-300 text-celtic-900'} `}>
              {isExpense ? <ShoppingBasket className="w-8 h-8" /> : <Wallet className="w-8 h-8" />}
            </div>
            <div>
              <h5 id="summary-modal-title" className="font-bold text-celtic-900">
                สรุปข้อมูลก่อนบันทึก
              </h5>
              <p className="text-xs text-celtic-700">
                โปรดตรวจสอบความถูกต้องของรายการ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-4 text-celtic-700 hover:text-celtic-900 hover:bg-snow-drift-200 rounded-2xl transition-colors"
            aria-label="ปิดหน้าต่างสรุป"
          >
            <X className="w-8 h-8" />
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
            <div className="mt-4 mb-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-white border border-gray-200 text-gray-800 shadow-2xs">
              {itemIconUrl ? (
                <img src={itemIconUrl} alt="" className="w-8 h-8 object-contain" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-current" />
              )}
              {transaction.title}
            </div>
            <div className={`font-onest text-5xl font-extrabold ${
              isExpense ? 'text-celtic-900' : 'text-celtic-900'
            }`}>
              {isExpense ? '' : ''}{Number(transaction.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Details Grid */}
          <div className="bg-transparent rounded-xl p-4 space-y-4 text-base">
            <div className="flex items-center justify-between py-1">
              <span className="text-gray-500 flex items-center gap-1.5 text-xs">
                <Tag className="w-3.5 h-3.5" />
                หมวดหมู่
              </span>
              <span className="font-medium text-celtic-900 flex items-center gap-1.5">
                <span className={`p-1 rounded-md ${catInfo.bgLight} ${catInfo.textColor}`}>
                  {catInfo.icon}
                </span>
                {transaction.category}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
              <span className="text-celtic-700 flex items-center gap-1.5 text-xs">
                <Calendar className="w-3.5 h-3.5" />
                วันที่
              </span>
              <span className="font-medium text-celtic-900">
                {transaction.date}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
              <span className="text-celtic-700 flex items-center gap-1.5 text-xs">
                <Clock className="w-3.5 h-3.5" />
                เวลา
              </span>
              <span className="font-medium text-celtic-900">
                {transaction.time || '-'} น.
              </span>
            </div>

            {transaction.note && (
              <div className="flex items-start justify-between py-1">
                <span className="text-celtic-700 flex items-center gap-1.5 text-xs">
                  <FileText className="w-3.5 h-3.5" />
                  หมายเหตุ
                </span>
                <span className="font-normal text-celtic-900 text-right max-w-[65%] break-words">
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
        {/* Edit and slide-to-confirm actions */}
        <div className="px-6 pb-6 pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <SlideToConfirm disabled={isSubmitting} isSubmitting={isSubmitting} onConfirm={onConfirm} />
          </div>
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
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-celtic-900/80 animate-in fade-in duration-200">
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
