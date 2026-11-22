import React, { useRef, useState } from 'react';
import {
  Target,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import {
  CategoryBudget,
  BudgetItem,
  EXPENSE_CATEGORIES,
  ExpenseCategory,
  calculateBudgetTotal,
  getBudgetItemAmount,
  getWeekdaysInMonth,
} from '../../utils/finance.ts';
import { getCategoryInfo } from '../../utils/categoryHelpers.tsx';
import { SlidingPillToggle } from '../SlidingPillToggle.tsx';

interface BudgetPlanningViewProps {
  budgets: CategoryBudget[];
  onUpdateBudgets: (updatedBudgets: CategoryBudget[]) => Promise<void>;
  isSyncing: boolean;
}

type BudgetItemDraft = Omit<BudgetItem, 'id'>;
type PlanChoice = 'daily' | 'monthly' | 'six-month';

const iconImports = import.meta.glob('../../icon-optimized/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

const availableIcons = Object.entries(iconImports)
  .map(([path, src]) => {
    const file = path.split('/').pop() || '';
    return {
      file,
      src,
      label: file.replace(/^icon_/, '').replace(/\.png$/i, '').replace(/[_-]/g, ' '),
    };
  })
  .sort((a, b) => a.label.localeCompare(b.label));

function monthValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(value: string, style: 'long' | 'short' = 'long'): string {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('th-TH-u-ca-gregory', {
    month: style,
    year: 'numeric',
  });
}

function getSixMonths(startMonth: string): string[] {
  const [year, month] = startMonth.split('-').map(Number);
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(year, month - 1 + index, 1);
    return monthValue(date);
  });
}

function BudgetItemForm({
  item,
  months,
  selectedMonth,
  planStartMonth = selectedMonth,
  onSave,
  onCancel,
}: {
  item?: BudgetItem;
  months: string[];
  selectedMonth: string;
  planStartMonth?: string;
  onSave: (draft: BudgetItemDraft) => Promise<void>;
  onCancel: () => void;
}) {
  const initialPlanType = item?.planType === 'none'
    ? 'none'
    : item?.planType === 'daily'
      ? 'daily'
      : item?.planType === 'six-month' ? 'six-month' : 'monthly';
  const [name, setName] = useState(item?.name || '');
  const [icon, setIcon] = useState(item?.icon || '');
  const [hasBudget, setHasBudget] = useState(initialPlanType !== 'none');
  const [planChoice, setPlanChoice] = useState<PlanChoice>(
    initialPlanType === 'six-month' ? 'six-month' : initialPlanType === 'daily' ? 'daily' : 'monthly'
  );
  const [amount, setAmount] = useState(() => {
    if (!item) return '';
    if (item.planType === 'daily') return String(item.amount || 0);
    return String(getBudgetItemAmount(item, selectedMonth));
  });
  const selectedMonthWeekdays = getWeekdaysInMonth(selectedMonth);
  const dailyMonthlyEstimate = (Number(amount) || 0) * selectedMonthWeekdays;
  const [planAmounts, setPlanAmounts] = useState<Record<string, string>>(() => {
    if (!item) return {};
    return Object.fromEntries(months.map((month) => [
      month,
      item.planAmounts?.[month] !== undefined
        ? String(item.planAmounts[month])
        : String(item.planType === 'six-month' ? 0 : item.amount || 0),
    ]));
  });
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('กรุณาระบุชื่อรายการ');
      return;
    }

    if (!hasBudget) {
      setIsSaving(true);
      await onSave({
        name: name.trim(), icon: icon || undefined, amount: 0,
        planType: 'none', planMonth: selectedMonth, planAmounts: {},
      });
      setIsSaving(false);
      return;
    }

    if (planChoice === 'monthly') {
      const parsedAmount = Number(amount);
      if (amount.trim() === '' || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        setError('กรุณากรอกงบประมาณให้ถูกต้อง');
        return;
      }
      setIsSaving(true);
      await onSave({
        name: name.trim(), icon: icon || undefined, amount: parsedAmount,
        planType: 'monthly', planMonth: selectedMonth, planAmounts: {},
      });
      setIsSaving(false);
      return;
    }

    if (planChoice === 'daily') {
      const dailyAmount = Number(amount);
      if (amount.trim() === '' || !Number.isFinite(dailyAmount) || dailyAmount <= 0) {
        setError('กรุณากรอกงบต่อวันทำงานให้ถูกต้อง');
        return;
      }
      setIsSaving(true);
      await onSave({
        name: name.trim(), icon: icon || undefined, amount: dailyAmount,
        planType: 'daily', planMonth: selectedMonth, planAmounts: {},
      });
      setIsSaving(false);
      return;
    }

    const parsedAmounts = Object.fromEntries(months.map((month) => {
      const value = planAmounts[month] ?? '';
      return [month, value.trim() === '' ? 0 : Number(value)];
    }));
    if (Object.values(parsedAmounts).some((value) => !Number.isFinite(value) || value < 0)) {
      setError('กรุณาตรวจสอบยอดงบประมาณทั้ง 6 เดือน');
      return;
    }
    if (Object.values(parsedAmounts).every((value) => value === 0)) {
      setError('กรุณากำหนดยอดอย่างน้อย 1 เดือน หรือปิดการตั้งงบประมาณ');
      return;
    }
    setIsSaving(true);
    await onSave({
      name: name.trim(), icon: icon || undefined,
      amount: parsedAmounts[months[0]] || 0,
      planType: 'six-month', planMonth: planStartMonth, planAmounts: parsedAmounts,
    });
    setIsSaving(false);
  };

  return (
    <div className="p-4 bg-snow-drift-100/25 rounded-2xl border border-emerald-200 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs font-semibold text-gray-700">
          ชื่อรายการค่าใช้จ่าย
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="เช่น ค่าเดินทาง, ค่ากาแฟ"
            className="mt-2 w-full px-2 py-2 bg-white border border-gray-300 rounded-xl text-gray-900 font-medium focus:outline-none focus:ring-1 focus:ring-apple-400"
          />
        </label>
        <div>
          <span className="text-xs font-semibold text-gray-700">ไอคอนค่าใช้จ่าย (เลือกได้)</span>
          <div className="mt-1 flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-white/70 rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => setIcon('')}
              aria-pressed={!icon}
              className={`w-12 h-12 rounded-lg border flex items-center justify-center text-[10px] ${!icon ? 'border-celtic-700 bg-emerald-50' : 'border-gray-200'}`}
            >
              ไม่มี
            </button>
            {availableIcons.map((option) => (
              <button
                key={option.file}
                type="button"
                onClick={() => setIcon(option.file)}
                aria-label={`เลือกไอคอน ${option.label}`}
                aria-pressed={icon === option.file}
                title={option.label}
                className={`w-12 h-12 rounded-lg border p-1.5 flex items-center justify-center ${icon === option.file ? 'border-celtic-700 bg-emerald-50' : 'border-gray-200'}`}
              >
                <img src={option.src} alt="" loading="lazy" className="w-full h-full object-contain" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/80 border border-white">
        <span>
          <span className="block text-xs font-bold text-celtic-800">กำหนดตัวเลขงบที่จะแพลน</span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={hasBudget}
          onChange={(event) => setHasBudget(event.target.checked)}
          className="w-5 h-5 accent-emerald-700 shrink-0"
        />
      </label>

      {hasBudget && (
        <div className="space-y-2">
          <SlidingPillToggle
            value={planChoice}
            onChange={(nextChoice) => {
              const choice = nextChoice as PlanChoice;
              setPlanChoice(choice);
              if (choice === 'six-month') {
                setPlanAmounts((current) => Object.fromEntries(months.map((month) => [month, current[month] ?? amount])));
              }
            }}
            ariaLabel="ระยะเวลาการวางแผนงบ"
            className="w-full"
            options={[
              { value: 'daily', label: 'รายวัน' },
              { value: 'monthly', label: 'รายเดือน' },
              { value: 'six-month', label: 'ล่วงหน้า' },
            ]}
          />

          {planChoice === 'monthly' || planChoice === 'daily' ? (
            <label className="block text-xs font-semibold text-gray-700">
              {planChoice === 'daily' ? 'งบต่อวันทำงาน (จันทร์–ศุกร์)' : 'จำนวนงบต่อเดือน'}
              <div className="relative mt-1 w-full">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400"></span>
                <input
                  type="number" min="0" value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  className="font-onest w-full pl-4 pr-4 py-4 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              {planChoice === 'daily' && (
                <span className="mt-1 block text-[11px] font-normal text-celtic-700">
                  {selectedMonthWeekdays} วันทำงานในเดือนนี้ · รวม {dailyMonthlyEstimate.toLocaleString('th-TH')}
                </span>
              )}
            </label>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {months.map((month) => (
                <label key={month} className="text-[11px] font-semibold text-gray-600">
                  {monthLabel(month, 'short')}
                  <div className="relative mt-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400"></span>
                    <input
                      type="number" min="0" value={planAmounts[month] ?? ''}
                      onChange={(event) => setPlanAmounts((current) => ({ ...current, [month]: event.target.value }))}
                      placeholder="0"
                      className="font-onest w-full pl-6 pr-2 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs font-medium text-rose-700" role="alert">{error}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1">
          <X className="w-3.5 h-3.5" /> ยกเลิก
        </button>
        <button type="button" onClick={handleSave} disabled={isSaving} className="px-3.5 py-2 bg-apple-300 hover:bg-apple-400 disabled:opacity-60 text-celtic-900 rounded-xl text-xs font-bold flex items-center gap-1">
          <Check className="w-3.5 h-3.5" /> {isSaving ? 'กำลังบันทึก...' : item ? 'บันทึกการแก้ไข' : 'เพิ่มรายการ'}
        </button>
      </div>
    </div>
  );
}

export const BudgetPlanningView: React.FC<BudgetPlanningViewProps> = ({
  budgets,
  onUpdateBudgets,
  isSyncing,
}) => {
  const today = new Date();
  const currentMonth = monthValue(today);
  const monthOptions = Array.from({ length: 37 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - 12 + index, 1);
    const value = monthValue(date);
    return { value, label: monthLabel(value) };
  });
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [activeCategory, setActiveCategory] = useState<ExpenseCategory>(EXPENSE_CATEGORIES[0]);
  const [addingCategory, setAddingCategory] = useState<ExpenseCategory | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [revealedActionItemId, setRevealedActionItemId] = useState<string | null>(null);
  const [isAddActionRevealed, setIsAddActionRevealed] = useState(false);
  const swipeStartRef = useRef<{ itemId: string; x: number; y: number } | null>(null);
  const categorySwipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const sixMonths = getSixMonths(selectedMonth);

  const normalizedBudgets: CategoryBudget[] = EXPENSE_CATEGORIES.map((category) => {
    const existing = budgets.find((budget) =>
      budget.category === category || (category === 'หนี้สิน' && String(budget.category) === 'เงินออม')
    );
    const items = existing?.items || [];
    return {
      category,
      items,
      totalPlanned: items.length ? calculateBudgetTotal(items, selectedMonth) : Number(existing?.totalPlanned) || 0,
    };
  });
  const selectedBudget = normalizedBudgets.find((budget) => budget.category === activeCategory) || normalizedBudgets[0];
  const totalPlannedOverall = normalizedBudgets.reduce((sum, budget) => sum + budget.totalPlanned, 0);
  const budgetRingCircumference = 2 * Math.PI * 76;
  const budgetRingSweep = 0.8;
  const budgetRingStartAngle = 126;
  const selectedCategoryPlanRatio = totalPlannedOverall > 0
    ? Math.round((selectedBudget.totalPlanned / totalPlannedOverall) * 100)
    : 0;
  const selectedCategoryProgressLength = budgetRingCircumference * budgetRingSweep * selectedCategoryPlanRatio / 100;

  const handleStartAddItem = () => {
    setEditingItemId(null);
    setAddingCategory(activeCategory);
  };

  const handleSaveItem = async (category: ExpenseCategory, draft: BudgetItemDraft, existingItem?: BudgetItem) => {
    const savedItem: BudgetItem = {
      ...draft,
      id: existingItem?.id || `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    const updated = normalizedBudgets.map((budget) => {
      if (budget.category !== category) return budget;
      const nextItems = existingItem
        ? budget.items.map((item) => item.id === existingItem.id ? savedItem : item)
        : [...budget.items, savedItem];
      return { ...budget, items: nextItems, totalPlanned: calculateBudgetTotal(nextItems, selectedMonth) };
    });
    await onUpdateBudgets(updated);
    setAddingCategory(null);
    setEditingItemId(null);
  };

  const handleDeleteItem = async (category: ExpenseCategory, itemId: string) => {
    const updated = normalizedBudgets.map((budget) => {
      if (budget.category !== category) return budget;
      const nextItems = budget.items.filter((item) => item.id !== itemId);
      return { ...budget, items: nextItems, totalPlanned: calculateBudgetTotal(nextItems, selectedMonth) };
    });
    await onUpdateBudgets(updated);
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-2 pb-8">
      <div className="glass-card p-5.5 rounded-3xl border border-white/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-celtic-900">แพลนงบประมาณ</h1>
          </div>
        </div>
        <div className="flex items-center gap-4 self-stretch">
          <label htmlFor="budget-month-select" className="text-xs text-celtic-700 font-medium">เดือน</label>
          <select
            id="budget-month-select"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="px-3.5 py-2 text-xs bg-white/80 border border-white/90 rounded-xl text-gray-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            {monthOptions.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
          </select>
        </div>
      </div>

      <div className="p-3.5 bg-blue-500/10 border border-blue-400/30 rounded-2xl text-blue-900 text-xs flex items-center gap-2.5">
        <AlertCircle className="w-4 h-4 shrink-0 text-celtic-700" />
        <span>กำหนดงบรายวันตามวันทำงาน รายเดือน หรือล่วงหน้า 6 เดือนก็ได้ และสามารถบันทึกรายการโดยไม่ตั้งงบประมาณ</span>
      </div>

      <div className="filter-tag-scroll flex flex-nowrap gap-2 overflow-x-auto overscroll-x-contain whitespace-nowrap pb-1" role="group" aria-label="เลือกหมวดหมู่งบประมาณ">
        {EXPENSE_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => { setActiveCategory(category); setAddingCategory(null); setEditingItemId(null); setIsAddActionRevealed(false); }}
            aria-pressed={activeCategory === category}
            className={`shrink-0 px-3.5 py-2 rounded-full border text-xs font-semibold transition-colors ${
              activeCategory === category
                ? 'bg-apple-200 text-celtic-900'
                : 'bg-snow-drift-100 text-celtic-700'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <section className="glass-card rounded-3xl p-4 sm:p-5" aria-labelledby="budget-share-heading">
        <div className="flex justify-center">
          <div
            className="relative h-64 w-64 max-w-full"
            role="img"
            aria-label={`${activeCategory}: ${selectedCategoryPlanRatio}% ของงบรวมทั้งหมด ${totalPlannedOverall.toLocaleString('th-TH')} บาท`}
          >
            <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
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
                stroke="#31D80A"
                strokeWidth="18"
                strokeLinecap="round"
                strokeDasharray={`${selectedCategoryProgressLength} ${budgetRingCircumference - selectedCategoryProgressLength}`}
                transform={`rotate(${budgetRingStartAngle} 100 100)`}
                className="progress-ring-glint transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
              <span className="text-xs font-semibold text-celtic-700">งบแพลนทั้งหมด</span>
              <span className="font-onest mt-1 text-3xl font-medium text-celtic-900">
                {totalPlannedOverall.toLocaleString('th-TH')}
              </span>
              <span className="mt-2 text-sm font-bold text-celtic-800">
                {selectedCategoryPlanRatio}% ของงบรวม
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="glass-card rounded-3xl border border-white/80 shadow-xs overflow-hidden">
        <div className="relative overflow-hidden bg-white/40">
          <button
            type="button"
            onClick={() => { setIsAddActionRevealed(false); handleStartAddItem(); }}
            className={`absolute right-3 top-1/2 z-0 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl bg-apple-200 text-celtic-900 transition-opacity hover:bg-apple-300 ${isAddActionRevealed ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
            aria-label={`เพิ่มรายการในหมวด${activeCategory}`}
            aria-hidden={!isAddActionRevealed}
            tabIndex={isAddActionRevealed ? 0 : -1}
          >
            <Plus className="h-5 w-5" />
          </button>
          <div
            className={`relative z-10 flex flex-row items-center justify-between gap-3 bg-white/40 p-4.5 transition-transform duration-200 ease-out touch-pan-y ${isAddActionRevealed ? '-translate-x-14' : 'translate-x-0'}`}
            onTouchStart={(event) => {
              const touch = event.touches[0];
              categorySwipeStartRef.current = { x: touch.clientX, y: touch.clientY };
            }}
            onTouchEnd={(event) => {
              const start = categorySwipeStartRef.current;
              categorySwipeStartRef.current = null;
              if (!start) return;
              const touch = event.changedTouches[0];
              const deltaX = touch.clientX - start.x;
              const deltaY = touch.clientY - start.y;
              if (Math.abs(deltaX) > 44 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
                setIsAddActionRevealed(deltaX < 0);
              }
            }}
            onTouchCancel={() => { categorySwipeStartRef.current = null; }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className={`p-3 rounded-2xl ${getCategoryInfo(activeCategory).bgLight} ${getCategoryInfo(activeCategory).textColor}`}>
                {getCategoryInfo(activeCategory).icon}
              </div>
              <div className="min-w-0">
                <h6 className="text-base font-bold text-celtic-900">{activeCategory}</h6>
                <span className="text-xs text-celtic-700">{selectedBudget.items.length} รายการ · {monthLabel(selectedMonth)}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => setIsAddActionRevealed((revealed) => !revealed)}
                className="rounded-lg px-2 py-1 text-right text-celtic-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-300"
                aria-label={isAddActionRevealed ? 'ซ่อนปุ่มเพิ่มรายการ' : 'แสดงปุ่มเพิ่มรายการ'}
                aria-expanded={isAddActionRevealed}
                title="แตะยอดงบหมวดนี้เพื่อแสดงปุ่มเพิ่มรายการ"
              >
                <span className="block text-xs font-bold text-celtic-700">ยอดงบหมวดนี้</span>
                <span className="font-onest block text-xl font-medium text-celtic-900">{selectedBudget.totalPlanned.toLocaleString('th-TH')}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 border-t border-gray-100 space-y-3">
          {selectedBudget.items.length === 0 && !addingCategory ? (
            <div className="text-center py-8 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-xs text-gray-500 mb-3">ยังไม่มีรายการในหมวดนี้</p>
              <button type="button" onClick={handleStartAddItem} className="px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-100">
                <Plus className="w-3.5 h-3.5 inline mr-1" /> เพิ่มรายการแรก
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedBudget.items.map((item) => {
                const icon = availableIcons.find((option) => option.file === item.icon);
                const displayAmount = getBudgetItemAmount(item, selectedMonth);
                const isEditing = editingItemId === item.id;
                return (
                  <div key={item.id} className="relative rounded-2xl bg-gray-50/70 border border-gray-200/70 overflow-hidden">
                    {isEditing ? (
                      <BudgetItemForm
                        key={`edit-${item.id}-${selectedMonth}`}
                        item={item}
                        months={item.planType === 'six-month' && item.planMonth ? getSixMonths(item.planMonth) : sixMonths}
                        selectedMonth={selectedMonth}
                        planStartMonth={item.planType === 'six-month' ? item.planMonth || selectedMonth : selectedMonth}
                        onCancel={() => setEditingItemId(null)}
                        onSave={(draft) => handleSaveItem(activeCategory, draft, item)}
                      />
                    ) : (
                      (() => {
                        const actionsRevealed = revealedActionItemId === item.id;
                        const editButton = (
                          <button type="button" onClick={() => { setRevealedActionItemId(null); setEditingItemId(item.id); }} className="p-2 text-celtic-700 hover:text-celtic-900 hover:bg-apple-200 rounded-lg" aria-label={`แก้ไข ${item.name}`} title="แก้ไขรายการ">
                            <Edit3 className="w-4 h-4" />
                          </button>
                        );
                        const deleteButton = (
                          <button type="button" onClick={() => { setRevealedActionItemId(null); void handleDeleteItem(activeCategory, item.id); }} className="p-2 text-celtic-700 hover:text-snow-drift-100 hover:bg-stiletto-800 rounded-lg" aria-label={`ลบ ${item.name}`} title="ลบรายการ">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        );
                        return (
                          <>
                            <div
                              className={`relative z-10 flex items-center justify-between gap-3 p-3 bg-gray-50/70 transition-transform duration-200 ease-out touch-pan-y ${actionsRevealed ? '-translate-x-24' : 'translate-x-0'} sm:translate-x-0`}
                              onTouchStart={(event) => {
                                const touch = event.touches[0];
                                swipeStartRef.current = { itemId: item.id, x: touch.clientX, y: touch.clientY };
                              }}
                              onTouchEnd={(event) => {
                                const start = swipeStartRef.current;
                                swipeStartRef.current = null;
                                if (!start || start.itemId !== item.id) return;
                                const touch = event.changedTouches[0];
                                const deltaX = touch.clientX - start.x;
                                const deltaY = touch.clientY - start.y;
                                if (Math.abs(deltaX) > 44 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
                                  setRevealedActionItemId(deltaX < 0 ? item.id : null);
                                }
                              }}
                              onTouchCancel={() => { swipeStartRef.current = null; }}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                                  {icon ? <img src={icon.src} alt="" loading="lazy" className="w-full h-full p-1.5 object-contain" /> : <span className="text-emerald-700">{getCategoryInfo(activeCategory).icon}</span>}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                                  <p className="text-[11px] text-gray-500">
                                    {item.planType === 'none'
                                      ? 'ยังไม่กำหนดงบ'
                                      : item.planType === 'six-month'
                                        ? 'แผนล่วงหน้า 6 เดือน'
                                        : item.planType === 'daily'
                                          ? `แผนรายวัน | ${Number(item.amount).toLocaleString('th-TH')} บาทต่่อวันทำงาน`
                                          : 'แผนรายเดือน | ใช้ทุกเดือน'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                <button
                                  type="button"
                                  className="font-onest text-xs sm:text-sm font-bold text-gray-900 hover:text-apple-400 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-300"
                                  onClick={() => setRevealedActionItemId(actionsRevealed ? null : item.id)}
                                  aria-label={actionsRevealed ? `ซ่อนไอคอนแก้ไขและลบ ${item.name}` : `แสดงไอคอนแก้ไขและลบ ${item.name}`}
                                  aria-expanded={actionsRevealed}
                                  aria-controls={`budget-actions-${item.id}`}
                                  title={actionsRevealed ? 'ซ่อนการดำเนินการ' : 'แตะตัวเลขเพื่อแสดงการดำเนินการ'}
                                >
                                  {item.planType === 'none' ? 'ไม่ตั้งงบ' : displayAmount.toLocaleString('th-TH')}
                                </button>
                                <div className="hidden sm:flex items-center gap-1">
                                  {editButton}
                                  {deleteButton}
                                </div>
                              </div>
                            </div>
                            <div id={`budget-actions-${item.id}`} className={`absolute inset-y-0 right-0 flex items-center gap-1 px-2 sm:hidden ${actionsRevealed ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} aria-hidden={!actionsRevealed}>
                              {React.cloneElement(editButton, { tabIndex: actionsRevealed ? 0 : -1 })}
                              {React.cloneElement(deleteButton, { tabIndex: actionsRevealed ? 0 : -1 })}
                            </div>
                          </>
                        );
                      })()
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {addingCategory === activeCategory && (
            <BudgetItemForm
              key={`add-${activeCategory}-${selectedMonth}`}
              months={sixMonths}
              selectedMonth={selectedMonth}
              onCancel={() => setAddingCategory(null)}
              onSave={(draft) => handleSaveItem(activeCategory, draft)}
            />
          )}
        </div>
      </section>

      {isSyncing && <p className="text-center text-xs text-gray-500">กำลังซิงค์ข้อมูล...</p>}
    </div>
  );
};
