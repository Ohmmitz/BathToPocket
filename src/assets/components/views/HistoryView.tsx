import React, { useState, useMemo } from 'react';
import { 
  Search, 
  RotateCcw, 
  Calendar, 
  Trash2, 
  Filter, 
} from 'lucide-react';
import { 
  Transaction, 
  filterTransactionsByDate, 
  searchTransactions, 
  getLatestTransaction 
} from '../../utils/finance.ts';
import { getCategoryInfo } from '../../utils/categoryHelpers.tsx';

interface HistoryViewProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => Promise<void>;
  onOpenUndoModal: () => void;
  isSyncing: boolean;
}

type DatePreset = 'all' | 'today' | 'yesterday' | '7days' | 'custom';
type TypeFilter = 'all' | 'income' | 'expense';

export const HistoryView: React.FC<HistoryViewProps> = ({
  transactions,
  onDeleteTransaction,
  onOpenUndoModal,
  isSyncing,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

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

  // Group transactions by date (descending)
  const groupedByDate = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    const sorted = [...finalFiltered].sort((a, b) => {
      // Primary: date desc, Secondary: createdAt desc
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    for (const tx of sorted) {
      if (!groups[tx.date]) groups[tx.date] = [];
      groups[tx.date].push(tx);
    }
    return groups;
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
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Top Header & Undo Bar */}
      <div className="glass-card p-4 sm:p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-celtic-900 tracking-tight">
            ประวัติรายการบันทึก
          </h1>
          <p className="text-sm text-celtic-700 mt-1">
            ค้นหา กรองข้อมูลตามช่วงเวลา และย้อนรายการที่บันทึกผิดพลาด
          </p>
        </div>

        {/* Undo latest button (Prominent) */}
        {latestTransaction && (
          <button
            type="button"
            onClick={onOpenUndoModal}
            disabled={isSyncing}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-apple-300 hover:bg-apple-400 active:scale-95 text-celtic-900 font-medium text-sm transition-colors self-start sm:self-auto"
            title="ย้อนรายการล่าสุดที่เพิ่งบันทึก (Undo)"
          >
            <RotateCcw className="w-4 h-4" />
            <span>ย้อนรายการล่าสุด (Undo)</span>
          </button>
        )}
      </div>

      {/* Filter and Instant Search Box */}
      <div className="glass-card p-4 sm:p-5 rounded-3xl space-y-4">
        {/* Instant Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-apple-400" />
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

        {/* Date Preset Filter Chips */}
        <div className="filter-tag-scroll flex flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain whitespace-nowrap pb-1" role="group" aria-label="กรองตามช่วงเวลา">
          <span className="shrink-0 text-sm font-medium text-celtic-700 mr-1 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-apple-400" /> ช่วงเวลา
          </span>
          {[
            { id: 'all', label: 'ทั้งหมด' },
            { id: 'today', label: 'วันนี้' },
            { id: 'yesterday', label: 'เมื่อวาน' },
            { id: '7days', label: '7 วันที่แล้ว' },
            { id: 'custom', label: 'กำหนดเอง' },
          ].map((preset) => {
            const isSelected = datePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setDatePreset(preset.id as DatePreset)}
                className={`shrink-0 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-apple-300 text-celtic-900'
                    : 'bg-snow-drift-100 text-celtic-700 hover:bg-snow-drift-200'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Custom Date Pickers (if custom is selected) */}
        {datePreset === 'custom' && (
          <div className="p-4 bg-snow-drift-100 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-3 text-sm animate-in fade-in duration-150">
            <label htmlFor="history-start-date" className="font-medium text-celtic-700 shrink-0">ตั้งแต่วันที่</label>
            <input
              id="history-start-date"
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-full sm:w-auto px-3 py-2.5 bg-snow-drift-50 rounded-xl text-sm text-celtic-900 focus:outline-none focus:ring-2 focus:ring-apple-300"
            />
            <label htmlFor="history-end-date" className="font-medium text-celtic-700 shrink-0">ถึงวันที่</label>
            <input
              id="history-end-date"
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-full sm:w-auto px-3 py-2.5 bg-snow-drift-50 rounded-xl text-sm text-celtic-900 focus:outline-none focus:ring-2 focus:ring-apple-300"
            />
            {(customStart || customEnd) && (
              <button
                type="button"
                onClick={() => { setCustomStart(''); setCustomEnd(''); }}
                className="text-sm text-celtic-700 hover:text-celtic-900 sm:ml-auto"
              >
                รีเซ็ตช่วงวัน
              </button>
            )}
          </div>
        )}

        {/* Type Filter Buttons */}
        <div className="filter-tag-scroll flex flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain whitespace-nowrap border-t border-snow-drift-200 pt-4" role="group" aria-label="กรองตามประเภทรายการ">
          <span className="shrink-0 text-sm font-medium text-celtic-700 mr-1 flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-apple-400" /> ประเภท
          </span>
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`shrink-0 px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
              typeFilter === 'all'
                ? 'bg-apple-300 text-celtic-900 font-bold'
                : 'bg-snow-drift-100 text-celtic-700 hover:bg-snow-drift-200'
            }`}
          >
            ทั้งหมด ({dateFiltered.length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('expense')}
            className={`shrink-0 px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
              typeFilter === 'expense'
                ? 'bg-apple-300 text-celtic-900 font-bold'
                : 'bg-snow-drift-100 text-celtic-700 hover:bg-snow-drift-200'
            }`}
          >
            รายจ่าย ({dateFiltered.filter((t) => t.type === 'expense').length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('income')}
            className={`shrink-0 px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
              typeFilter === 'income'
                ? 'bg-apple-300 text-celtic-900 font-bold'
                : 'bg-snow-drift-100 text-celtic-700 hover:bg-snow-drift-200'
            }`}
          >
            รายรับ ({dateFiltered.filter((t) => t.type === 'income').length})
          </button>
        </div>
      </div>

      {/* Filter Results Summary Bar */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="สรุปรายการที่กรอง">
        <div className="min-w-0 rounded-2xl bg-snow-drift-100 p-3 sm:p-4">
          <span className="block text-xs sm:text-sm text-celtic-700">รายการ</span>
          <strong className="font-onest mt-1 block text-base sm:text-xl font-medium text-celtic-900">{finalFiltered.length}</strong>
        </div>
        <div className="min-w-0 rounded-2xl bg-snow-drift-100 p-3 sm:p-4">
          <span className="block text-xs sm:text-sm text-celtic-700">รายรับ</span>
          <strong className="font-onest mt-1 block truncate text-sm sm:text-xl font-medium text-celtic-900">+{filteredSummary.income.toLocaleString('th-TH')}-.</strong>
        </div>
        <div className="min-w-0 rounded-2xl bg-snow-drift-100 p-3 sm:p-4">
          <span className="block text-xs sm:text-sm text-celtic-700">รายจ่าย</span>
          <strong className="font-onest mt-1 block truncate text-sm sm:text-xl font-medium text-celtic-900">-{filteredSummary.expense.toLocaleString('th-TH')}-.</strong>
        </div>
      </div>

      {/* Grouped Transaction List */}
      <div className="space-y-6">
        {Object.keys(groupedByDate).length === 0 ? (
          <div className="p-8 sm:p-10 text-center bg-snow-drift-100 rounded-3xl">
            <Search className="w-10 h-10 text-apple-400 mx-auto mb-3" />
            <p className="text-base font-medium text-celtic-900">ไม่พบรายการที่ตรงกับเงื่อนไข</p>
            <p className="text-sm text-celtic-700 mt-1">
              ลองเปลี่ยนคำค้นหา หรือเปลี่ยนช่วงเวลาตัวกรอง
            </p>
          </div>
        ) : (
          Object.entries(groupedByDate).map(([dateStr, items]) => {
            const dayExpense = items
              .filter((i) => i.type === 'expense')
              .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
            const dayIncome = items
              .filter((i) => i.type === 'income')
              .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

            return (
              <div key={dateStr} className="space-y-2.5">
                {/* Date Header */}
                <div className="flex items-center justify-between gap-3 px-1 py-1">
                  <span className="text-sm font-medium text-celtic-800 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-apple-400" />
                    {formatDateHeader(dateStr)}
                  </span>
                  <div className="font-onest text-xs flex items-center gap-2">
                    {dayIncome > 0 && <span className="text-celtic-800">+{dayIncome.toLocaleString('th-TH')}-.</span>}
                    {dayExpense > 0 && <span className="text-celtic-800">-{dayExpense.toLocaleString('th-TH')}-.</span>}
                  </div>
                </div>

                {/* Items in this date */}
                <div className="glass-card rounded-3xl bg-snow-drift-50 divide-y divide-snow-drift-200 overflow-hidden">
                  {items.map((tx) => {
                    const isExpense = tx.type === 'expense';
                    const catInfo = getCategoryInfo(tx.category);
                    const isLatest = latestTransaction?.id === tx.id;

                    return (
                      <div
                        key={tx.id}
                        className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-snow-drift-100 transition-colors ${
                          isLatest ? 'bg-amber-500/10' : ''
                        }`}
                      >
                        {/* Left: Category Icon + Title + Note */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-3 rounded-2xl shrink-0 bg-apple-200 text-celtic-900">
                            {catInfo.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-medium text-celtic-900 truncate">
                                {tx.title}
                              </h4>
                              {isLatest && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-apple-200 text-celtic-900 shrink-0">
                                  ล่าสุด
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-celtic-700 mt-1">
                              <span className="font-medium text-celtic-700">{tx.category}</span>
                              {tx.time && (
                                <>
                                  <span>•</span>
                                  <span>{tx.time} น.</span>
                                </>
                              )}
                              {tx.note && (
                                <>
                                  <span>•</span>
                                  <span className="text-celtic-700 italic truncate max-w-[140px] sm:max-w-xs">
                                    "{tx.note}"
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Amount & Delete Action */}
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                          <div className="text-right">
                            <span className="font-onest text-sm sm:text-base font-medium text-celtic-900 block">
                              {isExpense ? '-' : '+'}{Number(tx.amount).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}-.
                            </span>
                            <span className="text-xs text-celtic-700">
                              {isExpense ? 'รายจ่าย' : 'รายรับ'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => onDeleteTransaction(tx.id)}
                            className="min-w-10 min-h-10 p-2 text-stiletto-800 hover:bg-snow-drift-100 rounded-xl transition-colors"
                            title="ลบรายการนี้"
                            aria-label={`ลบรายการ ${tx.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
