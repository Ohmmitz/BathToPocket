import React, { useState, useMemo } from 'react';
import { 
  Search, 
  RotateCcw, 
  Calendar, 
  Trash2, 
  Filter, 
  Tag, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpDown,
  Download,
  AlertCircle
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
    return { income, expense, balance: income - expense };
  }, [finalFiltered]);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Header & Undo Bar */}
      <div className="glass-card p-5.5 rounded-3xl border border-white/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            ประวัติรายการบันทึก
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            ค้นหา กรองข้อมูลตามช่วงเวลา และย้อนรายการที่บันทึกผิดพลาด
          </p>
        </div>

        {/* Undo latest button (Prominent) */}
        {latestTransaction && (
          <button
            type="button"
            onClick={onOpenUndoModal}
            disabled={isSyncing}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs shadow-md shadow-amber-500/25 transition-all self-start sm:self-auto"
            title="ย้อนรายการล่าสุดที่เพิ่งบันทึก (Undo)"
          >
            <RotateCcw className="w-4 h-4" />
            <span>ย้อนรายการล่าสุด (Undo)</span>
          </button>
        )}
      </div>

      {/* Filter and Instant Search Box */}
      <div className="glass-card p-5.5 rounded-3xl border border-white/80 shadow-xs space-y-4">
        {/* Instant Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาทันที... พิมพ์ชื่อรายการ, หมวดหมู่, บันทึก หรือจำนวนเงิน"
            className="w-full pl-10 pr-10 py-3 text-xs bg-white/70 backdrop-blur-md border border-white/90 rounded-2xl text-gray-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 hover:text-gray-700 p-1"
            >
              ล้าง
            </button>
          )}
        </div>

        {/* Date Preset Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-gray-500 mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> ช่วงเวลา:
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
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-2xs backdrop-blur-xs ${
                  isSelected
                    ? 'bg-emerald-700 text-white shadow-sm shadow-emerald-800/30 font-bold scale-[1.02]'
                    : 'bg-white/70 text-gray-700 hover:bg-white border border-white/80'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Custom Date Pickers (if custom is selected) */}
        {datePreset === 'custom' && (
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-col sm:flex-row items-center gap-2 text-xs animate-in fade-in duration-150">
            <span className="font-semibold text-gray-600 shrink-0">ตั้งแต่วันที่:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-800"
            />
            <span className="font-semibold text-gray-600 shrink-0">ถึงวันที่:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-800"
            />
            {(customStart || customEnd) && (
              <button
                type="button"
                onClick={() => { setCustomStart(''); setCustomEnd(''); }}
                className="text-xs text-rose-600 hover:underline sm:ml-auto"
              >
                รีเซ็ตช่วงวัน
              </button>
            )}
          </div>
        )}

        {/* Type Filter Buttons */}
        <div className="flex items-center gap-2 pt-1 border-t border-gray-100 text-xs">
          <span className="font-bold text-gray-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> ประเภท:
          </span>
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              typeFilter === 'all'
                ? 'bg-gray-900 text-white font-bold'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            ทั้งหมด ({dateFiltered.length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('expense')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              typeFilter === 'expense'
                ? 'bg-rose-600 text-white font-bold'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            รายจ่าย ({dateFiltered.filter((t) => t.type === 'expense').length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('income')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              typeFilter === 'income'
                ? 'bg-emerald-600 text-white font-bold'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            รายรับ ({dateFiltered.filter((t) => t.type === 'income').length})
          </button>
        </div>
      </div>

      {/* Filter Results Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-gray-500 font-medium">
        <span>
          พบทั้งหมด <strong className="text-gray-900">{finalFiltered.length}</strong> รายการ
        </span>
        <div className="flex items-center gap-3">
          <span>รายรับ: <strong className="font-onest text-emerald-800">+{filteredSummary.income.toLocaleString('th-TH')}-.</strong></span>
          <span>รายจ่าย: <strong className="font-onest text-rose-700">-{filteredSummary.expense.toLocaleString('th-TH')}-.</strong></span>
        </div>
      </div>

      {/* Grouped Transaction List */}
      <div className="space-y-5">
        {Object.keys(groupedByDate).length === 0 ? (
          <div className="p-10 text-center bg-white rounded-2xl border border-gray-100 shadow-xs">
            <Search className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-700">ไม่พบรายการที่ตรงกับเงื่อนไข</p>
            <p className="text-xs text-gray-400 mt-1">
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
              <div key={dateStr} className="space-y-2">
                {/* Date Header */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-800" />
                    {formatDateHeader(dateStr)}
                  </span>
                  <div className="font-onest text-[11px] font-semibold flex items-center gap-2">
                    {dayIncome > 0 && <span className="font-onest text-emerald-800">+{dayIncome.toLocaleString('th-TH')}-.</span>}
                    {dayExpense > 0 && <span className="font-onest text-rose-700">-{dayExpense.toLocaleString('th-TH')}-.</span>}
                  </div>
                </div>

                {/* Items in this date */}
                <div className="glass-card rounded-3xl border border-white/80 shadow-xs divide-y divide-white/60 overflow-hidden">
                  {items.map((tx) => {
                    const isExpense = tx.type === 'expense';
                    const catInfo = getCategoryInfo(tx.category);
                    const isLatest = latestTransaction?.id === tx.id;

                    return (
                      <div
                        key={tx.id}
                        className={`p-4 sm:p-4.5 flex items-center justify-between gap-3 hover:bg-white/50 transition-colors backdrop-blur-xs ${
                          isLatest ? 'bg-amber-500/10' : ''
                        }`}
                      >
                        {/* Left: Category Icon + Title + Note */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-3 rounded-2xl shrink-0 ${catInfo.bgLight} ${catInfo.textColor} border ${catInfo.borderColor} shadow-2xs`}>
                            {catInfo.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                                {tx.title}
                              </h4>
                              {isLatest && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 shrink-0">
                                  ล่าสุด
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-600 mt-0.5">
                              <span className="font-medium text-gray-700">{tx.category}</span>
                              {tx.time && (
                                <>
                                  <span>•</span>
                                  <span>{tx.time} น.</span>
                                </>
                              )}
                              {tx.note && (
                                <>
                                  <span>•</span>
                                  <span className="text-gray-700 italic truncate max-w-[140px] sm:max-w-xs">
                                    "{tx.note}"
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Amount & Delete Action */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span className={`font-onest text-sm sm:text-base font-bold block ${
                              isExpense ? 'text-rose-700' : 'text-emerald-800'
                            }`}>
                              {isExpense ? '-' : '+'}{Number(tx.amount).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}-.
                            </span>
                            <span className="text-[10px] text-gray-600 font-medium">
                              {isExpense ? 'รายจ่าย' : 'รายรับ'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => onDeleteTransaction(tx.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
