import React, { useState, useMemo, useRef } from 'react';
import { 
  Search, 
  RotateCcw, 
  Calendar, 
  Trash2, 
  Filter, 
} from 'lucide-react';
import { 
  Transaction, 
  CategoryBudget,
  filterTransactionsByDate, 
  searchTransactions, 
  getLatestTransaction 
} from '../../utils/finance.ts';
import { getCategoryInfo } from '../../utils/categoryHelpers.tsx';

interface HistoryViewProps {
  transactions: Transaction[];
  budgets: CategoryBudget[];
  onDeleteTransaction: (id: string) => Promise<void>;
  onOpenUndoModal: () => void;
  isSyncing: boolean;
}

type DatePreset = 'all' | 'today' | 'yesterday' | '7days' | 'custom';
type TypeFilter = 'all' | 'income' | 'expense';

const budgetIconAssets = import.meta.glob('../../icon-optimized/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

export const HistoryView: React.FC<HistoryViewProps> = ({
  transactions,
  budgets,
  onDeleteTransaction,
  onOpenUndoModal,
  isSyncing,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [revealedDeleteId, setRevealedDeleteId] = useState<string | null>(null);
  const swipeStartRef = useRef<{ id: string; x: number; y: number } | null>(null);

  const latestTransaction = useMemo(() => getLatestTransaction(transactions), [transactions]);

  // Apply date filter
  const dateFiltered = useMemo(() => {
    return filterTransactionsByDate(transactions, datePreset, customStart, customEnd);
  }, [transactions, datePreset, customStart, customEnd]);

  // Apply type filter
  const typeFiltered = useMemo(() => {
    if (typeFilter === 'all') return dateFiltered;
    return dateFiltered.filter((t) => t.type === typeFilter);
  }, [dateFiltered, typeFilter]);

  // Apply instant search filter
  const finalFiltered = useMemo(() => {
    return searchTransactions(typeFiltered, searchQuery);
  }, [typeFiltered, searchQuery]);

  // Show each transaction as its own item, newest first.
  const sortedTransactions = useMemo(() => {
    return [...finalFiltered].sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [finalFiltered]);

  // Format date header to friendly Thai text
  const formatDateHeader = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yesterday = yest.toISOString().split('T')[0];

    if (dateStr === today) return `วันนี้ (${dateStr})`;
    if (dateStr === yesterday) return `เมื่อวานนี้ (${dateStr})`;

    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0]) + 543;
      return `${parts[2]}/${parts[1]}/${year}`;
    }
    return dateStr;
  };

  // Calculate totals of current filtered results
  const filteredSummary = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of finalFiltered) {
      if (t.type === 'income') income += Number(t.amount) || 0;
      else expense += Number(t.amount) || 0;
    }
    return { income, expense };
  }, [finalFiltered]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-2 pb-8">
      {/* Top Header & Undo Bar */}
      <div className="glass-card p-4 sm:p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-celtic-900">
            ประวัติรายการบันทึก
          </h1>
        </div>
      </div>

      {/* Filter and Instant Search Box */}
      <div className="glass-card p-4 sm:p-5 rounded-3xl space-y-4">
        {/* Instant Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-celtic-700" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาทันที... พิมพ์ชื่อรายการ, หมวดหมู่, บันทึก หรือจำนวนเงิน"
            className="w-full pl-11 pr-11 py-3.5 text-sm bg-snow-drift-100 rounded-xl text-celtic-900 placeholder:text-celtic-700/70 focus:bg-snow-drift-50 focus:outline-none focus:ring-2 focus:ring-apple-300 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-celtic-700 hover:text-celtic-900 p-1"
            >
              ล้าง
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:gap-6">
          <div className="min-w-0">
            <label htmlFor="history-date-filter" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-celtic-700">
              <Calendar className="h-4 w-4 text-celtic-700" />
              ช่วงเวลา
            </label>
            <select
              id="history-date-filter"
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as DatePreset)}
              className="w-full py-4 text-sm text-celtic-900 focus:outline-none"
            >
              <option value="all">ทั้งหมด</option>
              <option value="today">วันนี้</option>
              <option value="yesterday">เมื่อวาน</option>
              <option value="7days">7 วันที่แล้ว</option>
              <option value="custom">กำหนดเอง</option>
            </select>
          </div>

          <div className="min-w-0">
            <label htmlFor="history-type-filter" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-celtic-700">
              <Filter className="h-4 w-4 text-celtic-700" />
              ประเภท
            </label>
            <select
              id="history-type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="w-full py-3 text-sm text-celtic-900 focus:outline-none"
            >
              <option value="all">ทั้งหมด ({dateFiltered.length})</option>
              <option value="expense">รายจ่าย ({dateFiltered.filter((t) => t.type === 'expense').length})</option>
              <option value="income">รายรับ ({dateFiltered.filter((t) => t.type === 'income').length})</option>
            </select>
          </div>

          {datePreset === 'custom' && (
            <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl bg-snow-drift-100/25 p-4 animate-in fade-in duration-150">
              <div className="min-w-0">
                <label htmlFor="history-start-date" className="mb-1.5 block text-sm font-medium text-celtic-700">ตั้งแต่วันที่</label>
                <input
                  id="history-start-date"
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full py-3 text-sm text-celtic-900 focus:outline-none"
                />
              </div>
              <div className="min-w-0">
                <label htmlFor="history-end-date" className="mb-1.5 block text-sm font-medium text-celtic-700">ถึงวันที่</label>
                <input
                  id="history-end-date"
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full py-3 text-sm text-celtic-900 focus:outline-none"
                />
              </div>
              {(customStart || customEnd) && (
                <button
                  type="button"
                  onClick={() => { setCustomStart(''); setCustomEnd(''); }}
                  className="justify-self-start text-sm text-celtic-700 hover:text-celtic-900 sm:col-span-2"
                >
                  รีเซ็ตช่วงวัน
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filter Results Summary Bar */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="สรุปรายการที่กรอง">
        <div className="min-w-0 rounded-2xl bg-snow-drift-100/25 p-3 sm:p-4">
          <span className="block text-xs sm:text-sm text-celtic-700">รายการ</span>
          <strong className="font-onest mt-1 block text-base sm:text-xl font-medium text-celtic-900">{finalFiltered.length}</strong>
        </div>
        <div className="min-w-0 rounded-2xl bg-snow-drift-100/25 p-3 sm:p-4">
          <span className="block text-xs sm:text-sm text-celtic-700">รายรับ</span>
          <strong className="font-onest mt-1 block truncate text-sm sm:text-xl font-medium text-celtic-900">+{filteredSummary.income.toLocaleString('th-TH')}</strong>
        </div>
        <div className="min-w-0 rounded-2xl bg-snow-drift-100/25 p-3 sm:p-4">
          <span className="block text-xs sm:text-sm text-celtic-700">รายจ่าย</span>
          <strong className="font-onest mt-1 block truncate text-sm sm:text-xl font-medium text-celtic-900">-{filteredSummary.expense.toLocaleString('th-TH')}</strong>
        </div>
      </div>

      {/* Standalone transaction items */}
      <div className="space-y-3">
        {sortedTransactions.length === 0 ? (
          <div className="p-8 sm:p-10 text-center bg-snow-drift-50 rounded-3xl">
            <Search className="w-8 h-8 text-celtic-700 mx-auto mb-4" />
            <p className="text-base font-medium text-celtic-900">ไม่พบรายการที่ตรงกับเงื่อนไข</p>
            <p className="text-sm text-celtic-700 mt-1">
              ลองเปลี่ยนคำค้นหา หรือเปลี่ยนช่วงเวลาตัวกรอง
            </p>
          </div>
        ) : (
          sortedTransactions.map((tx) => {
            const isExpense = tx.type === 'expense';
            const catInfo = getCategoryInfo(tx.category);
            const isLatest = latestTransaction?.id === tx.id;
            const actionsRevealed = revealedDeleteId === tx.id;
            const budgetItem = budgets
              .find((budget) => budget.category === tx.category)
              ?.items.find((item) => item.name === tx.title);
            const iconFile = tx.icon || budgetItem?.icon;
            const iconSrc = iconFile ? budgetIconAssets[`../../icon-optimized/${iconFile}`] : undefined;

            return (
              <div key={tx.id} className="relative overflow-hidden rounded-2xl bg-transparent">
                <button
                  type="button"
                  onClick={() => { void onDeleteTransaction(tx.id); setRevealedDeleteId(null); }}
                  className={`absolute right-2 top-1/2 z-0 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-stiletto-800 transition-opacity hover:bg-stiletto-800 hover:text-snow-drift-50 ${actionsRevealed ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                  aria-label={`ลบรายการ ${tx.title}`}
                  aria-hidden={!actionsRevealed}
                  tabIndex={actionsRevealed ? 0 : -1}
                  title="ลบรายการนี้"
                >
                  <Trash2 className="h-5 w-5" />
                </button>

                <div
                  className={`relative z-10 flex items-center justify-between gap-2 p-4 sm:p-4 bg-snow-drift-50 transition-transform duration-200 ease-out touch-pan-y ${actionsRevealed ? '-translate-x-14' : 'translate-x-0'} ${isLatest ? 'ring-1 ring-apple-300' : ''}`}
                  onTouchStart={(event) => {
                    const touch = event.touches[0];
                    swipeStartRef.current = { id: tx.id, x: touch.clientX, y: touch.clientY };
                  }}
                  onTouchEnd={(event) => {
                    const start = swipeStartRef.current;
                    swipeStartRef.current = null;
                    if (!start || start.id !== tx.id) return;
                    const touch = event.changedTouches[0];
                    const deltaX = touch.clientX - start.x;
                    const deltaY = touch.clientY - start.y;
                    if (Math.abs(deltaX) > 44 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
                      setRevealedDeleteId(deltaX < 0 ? tx.id : null);
                    }
                  }}
                  onTouchCancel={() => { swipeStartRef.current = null; }}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-snow-drift-50 text-celtic-900">
                      {iconSrc ? (
                        <img src={iconSrc} alt="" loading="lazy" className="h-full w-full p-1.5 object-contain" />
                      ) : catInfo.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <h6 className="truncate text-sm font-medium text-celtic-900">{tx.title}</h6>
                        {isLatest && <span className="shrink-0 rounded-full bg-apple-200 px-2 py-1 text-xs font-medium text-celtic-900">ล่าสุด</span>}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-celtic-700">
                        <span>{tx.category}</span>
                        <span>·</span>
                        <span>{formatDateHeader(tx.date)}</span>
                        {tx.time && <><span>·</span><span>{tx.time} น.</span></>}
                        {tx.note && <span className="truncate italic">· “{tx.note}”</span>}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setRevealedDeleteId(actionsRevealed ? null : tx.id);
                    }}
                    aria-label={actionsRevealed ? `ซ่อนไอคอนลบ ${tx.title}` : `แสดงไอคอนลบ ${tx.title}`}
                    aria-expanded={actionsRevealed}
                    className="shrink-0 rounded-lg px-1 py-2 text-right text-celtic-900 transition-colors"
                    title="แตะยอดเงินเพื่อแสดงปุ่มลบ"
                  >
                    <span className="font-onest block text-sm font-medium sm:text-base">
                      {isExpense ? '-' : '+'}{Number(tx.amount).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </span>
                    <span className="block text-xs text-celtic-700">{isExpense ? 'รายจ่าย' : 'รายรับ'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
