import React, { useState } from 'react';
import {
  ArrowLeft,
  Target,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  AlertCircle,
  Circle,
  CircleCheck,
} from 'lucide-react';
import {
  CategoryBudget,
  BudgetItem,
  BudgetCategory,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  LEGACY_INCOME_CATEGORIES,
  DEFAULT_INCOME_SOURCE_ITEMS,
  TransactionType,
  getAccountingPeriodMonth,
  calculateBudgetTotal,
  getBudgetItemAmount,
  getSelectedDaysInMonth,
} from '../../utils/finance.ts';
import { getCategoryInfo } from '../../utils/categoryHelpers.tsx';
import { SlidingPillToggle } from '../SlidingPillToggle.tsx';
import { ParliamentChart } from '../ParliamentChart.tsx';
import { AnimatedNumber } from '../AnimatedNumber.tsx';
import { useCenterSnapFilter } from '../useCenterSnapFilter.ts';
import { MonthSelector, PageHeader } from '../PageHeader.tsx';

interface BudgetPlanningViewProps {
  budgets: CategoryBudget[];
  onUpdateBudgets: (updatedBudgets: CategoryBudget[]) => Promise<void>;
  isSyncing: boolean;
}

type BudgetItemDraft = Omit<BudgetItem, 'id'>;
type PlanChoice = 'daily' | 'monthly' | 'six-month';
type BudgetChartMode = 'total' | 'fromTotal' | 'proportion';
const CATEGORY_PLAN_COLORS: Record<string, string> = {
  'ค่าอาหาร': '#D84B0A',
  'ค่าเดินทาง': '#0A97D8',
  'ค่าใช้จ่ายประจำ': '#B20AD8',
  'ค่าความบันเทิง': '#0A30D8',
  'ค่าสุขภาพ': '#0AD8B2',
  'ค่าของใช้ส่วนตัว': '#FFD400',
  'ค่าหนี้สิน': '#FF7A0C',
  'ค่าใช้จ่ายอื่นๆ': '#808080',
};
type BudgetItemFormPage =
  | { mode: 'add'; category: BudgetCategory }
  | { mode: 'edit'; category: BudgetCategory; item: BudgetItem };
const WEEKDAYS = [
  { value: 0, label: 'อา', name: 'วันอาทิตย์' },
  { value: 1, label: 'จ', name: 'วันจันทร์' },
  { value: 2, label: 'อ', name: 'วันอังคาร' },
  { value: 3, label: 'พ', name: 'วันพุธ' },
  { value: 4, label: 'พฤ', name: 'วันพฤหัสบดี' },
  { value: 5, label: 'ศ', name: 'วันศุกร์' },
  { value: 6, label: 'ส', name: 'วันเสาร์' },
];
const DEFAULT_PLAN_DAYS = [1, 2, 3, 4, 5];

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

function getPlanTypeLabel(planType?: BudgetItem['planType']): string {
  if (planType === 'daily') return 'รายวัน';
  if (planType === 'six-month') return 'กำหนดเอง';
  if (planType === 'none') return 'ไม่กำหนดงบ';
  return 'รายเดือน';
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
  const [planDays, setPlanDays] = useState<number[]>(item?.planDays ?? DEFAULT_PLAN_DAYS);
  const [amount, setAmount] = useState(() => {
    if (!item) return '';
    if (item.planType === 'daily') return String(item.amount || 0);
    return String(getBudgetItemAmount(item, selectedMonth));
  });
  const selectedMonthDayCount = getSelectedDaysInMonth(selectedMonth, planDays);
  const dailyMonthlyEstimate = (Number(amount) || 0) * selectedMonthDayCount;
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
        setError('กรุณากรอกงบต่อวันที่เลือกให้ถูกต้อง');
        return;
      }
      if (planDays.length === 0) {
        setError('กรุณาเลือกวันที่ต้องการคิดงบอย่างน้อย 1 วัน');
        return;
      }
      setIsSaving(true);
      await onSave({
        name: name.trim(), icon: icon || undefined, amount: dailyAmount,
        planType: 'daily', planMonth: selectedMonth, planAmounts: {}, planDays,
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
          ชื่อรายการ
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
              {planChoice === 'daily' ? 'งบต่อวันที่เลือก' : 'จำนวนงบต่อเดือน'}
              <div className="relative mt-1 w-full">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400"></span>
                <input
                  type="number" min="0" value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  className="w-full pl-4 pr-4 py-4 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              {planChoice === 'daily' && (
                <div className="mt-3 space-y-2">
                  <span className="block text-[11px] font-medium text-celtic-700">เลือกวันที่ต้องการคิดงบในแต่ละสัปดาห์</span>
                  <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="เลือกวันในสัปดาห์สำหรับแพลนรายวัน">
                    {WEEKDAYS.map((weekday) => {
                      const isSelected = planDays.includes(weekday.value);
                      return (
                        <button
                          key={weekday.value}
                          type="button"
                          onClick={() => setPlanDays((current) => (
                            isSelected
                              ? current.filter((day) => day !== weekday.value)
                              : [...current, weekday.value].sort((a, b) => a - b)
                          ))}
                          aria-label={weekday.name}
                          aria-pressed={isSelected}
                          className="flex min-w-0 flex-col items-center justify-center gap-[5px] rounded-[23px] bg-snow-drift-100 px-[7px] pb-[7px] pt-[14px] text-celtic-700 transition-colors hover:bg-apple-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-300"
                        >
                          <span className="text-[11px] leading-none">{weekday.label}</span>
                          {isSelected
                            ? <CircleCheck className="h-7 w-7 text-celtic-900" aria-hidden="true" />
                            : <Circle className="h-7 w-7 fill-snow-drift-200 text-snow-drift-200" aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                  <span className="block text-[11px] font-normal text-celtic-700">
                    {selectedMonthDayCount} วันที่เลือกในเดือนนี้ · รวม {dailyMonthlyEstimate.toLocaleString('th-TH')} บาท
                  </span>
                </div>
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
  const currentMonth = getAccountingPeriodMonth(today);
  const [accountingYear, accountingMonth] = currentMonth.split('-').map(Number);
  const monthOptions = Array.from({ length: 37 }, (_, index) => {
    const date = new Date(accountingYear, accountingMonth - 1 - 12 + index, 1);
    const value = monthValue(date);
    return { value, label: monthLabel(value) };
  });
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [planKind, setPlanKind] = useState<TransactionType>('expense');
  const [activeCategory, setActiveCategory] = useState<BudgetCategory | null>(null);
  const categoryFilterRef = useCenterSnapFilter(activeCategory ?? 'all');
  const [chartMode, setChartMode] = useState<BudgetChartMode>('fromTotal');
  const [formPage, setFormPage] = useState<BudgetItemFormPage | null>(null);
  const [selectedPlanItem, setSelectedPlanItem] = useState<BudgetItem | null>(null);
  const [selectedPlanItemCategory, setSelectedPlanItemCategory] = useState<BudgetCategory | null>(null);
  const sixMonths = getSixMonths(selectedMonth);

  const allPlanCategories: BudgetCategory[] = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
  const activeCategories: readonly BudgetCategory[] = planKind === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const normalizedBudgets: CategoryBudget[] = allPlanCategories.map((category) => {
    const existing = budgets.find((budget) =>
      budget.category === category || (category === 'ค่าหนี้สิน' && String(budget.category) === 'เงินออม')
    );
    const legacyIncomeBudgets = category === 'รายได้'
      ? budgets.filter((budget) => LEGACY_INCOME_CATEGORIES.includes(budget.category as typeof LEGACY_INCOME_CATEGORIES[number]))
      : [];
    const defaultIncomeItems = DEFAULT_INCOME_SOURCE_ITEMS
      .filter((source) => source.category === category)
      .map((source) => source.item);
    const legacyIncomeItems = legacyIncomeBudgets.flatMap((budget) => budget.items || []);
    const storedIncomeItems = [...legacyIncomeItems, ...(existing?.items || [])]
      .filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index);
    const hasCanonicalIncomeBudget = category === 'รายได้' && Boolean(existing);
    const items = category === 'รายได้'
      ? storedIncomeItems.length > 0
        ? storedIncomeItems
        : hasCanonicalIncomeBudget
          ? []
          : defaultIncomeItems
      : existing ? existing.items || [] : defaultIncomeItems;
    return {
      category,
      items,
      totalPlanned: items.length ? calculateBudgetTotal(items, selectedMonth) : Number(existing?.totalPlanned) || 0,
    };
  });
  const activeBudgets = normalizedBudgets.filter((budget) => activeCategories.includes(budget.category));
  const selectedBudget = activeBudgets.find((budget) => budget.category === activeCategory) || activeBudgets[0];
  const totalPlannedOverall = activeBudgets.reduce((sum, budget) => sum + budget.totalPlanned, 0);
  const selectedCategoryPlanRatio = totalPlannedOverall > 0
    ? (planKind === 'income' || activeCategory === null
      ? 100
      : Math.round((selectedBudget.totalPlanned / totalPlannedOverall) * 100))
    : 0;
  const chartAmount = chartMode === 'total'
    ? totalPlannedOverall
    : activeCategory === null ? totalPlannedOverall : selectedBudget.totalPlanned;
  const chartPercentage = chartMode === 'total' ? (totalPlannedOverall > 0 ? 100 : 0) : selectedCategoryPlanRatio;
  const categorySegments = activeBudgets.map((budget) => ({
    value: budget.totalPlanned,
    color: CATEGORY_PLAN_COLORS[budget.category] || '#808080',
  }));

  const handleStartAddItem = (category: BudgetCategory) => {
    setFormPage({ mode: 'add', category });
  };

  const renderBudgetItem = (category: BudgetCategory, item: BudgetItem) => {
    const icon = availableIcons.find((option) => option.file === item.icon);
    const displayAmount = getBudgetItemAmount(item, selectedMonth);
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          setSelectedPlanItem(item);
          setSelectedPlanItemCategory(category);
        }}
        aria-label={`ดูรายละเอียดแพลน ${item.name}`}
        className="flex min-h-56 min-w-0 flex-col items-center justify-center gap-3 rounded-2xl bg-snow-drift-100/50 p-3 transition-colors hover:bg-snow-drift-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-300"
      >
        <span className="flex h-16 w-full shrink-0 items-center justify-center">
          {icon
            ? <img src={icon.src} alt="" loading="lazy" className="h-16 w-16 object-contain" />
            : <span className="text-2xl" aria-hidden="true">{getCategoryInfo(category).emoji}</span>}
        </span>
        <span className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex min-w-0 flex-1 flex-col items-start gap-2 text-left">
            <span className="line-clamp-2 break-words text-base font-medium leading-tight text-celtic-900 sm:text-2xl">{item.name}</span>
            <span className="rounded-full bg-snow-drift-50 px-2.5 py-1 text-xs font-medium text-celtic-700">
              {getPlanTypeLabel(item.planType)}
            </span>
          </span>
          <span className="flex min-w-0 shrink-0 flex-col items-end self-end text-right sm:self-auto">
            <span className="max-w-full break-all font-onest text-2xl font-medium leading-tight text-celtic-900 sm:text-[32px]">
              {item.planType === 'none' ? '—' : displayAmount.toLocaleString('th-TH')}
            </span>
            {item.planType !== 'none' && <span className="text-xs text-celtic-700">บาท</span>}
          </span>
        </span>
      </button>
    );
  };

  const renderAddCard = (category: BudgetCategory) => (
    <button
      key={`add-${category}`}
      type="button"
      onClick={() => handleStartAddItem(category)}
      className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl bg-snow-drift-100/50 p-4 text-center text-celtic-900 transition-colors hover:bg-apple-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-300"
      aria-label={`เพิ่ม${planKind === 'expense' ? 'ค่าใช้จ่าย' : 'รายการรายรับ'}ในหมวด${category}`}
    >
      <Plus className="h-10 w-10" aria-hidden="true" />
      <span className="text-base font-medium">เพิ่ม{planKind === 'expense' ? 'ค่าใช้จ่าย' : 'รายรับ'} · {category}</span>
    </button>
  );

  const detailCategory = selectedPlanItemCategory || activeCategory || selectedBudget.category;

  const handleSaveItem = async (category: BudgetCategory, draft: BudgetItemDraft, existingItem?: BudgetItem) => {
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
    setFormPage(null);
    setSelectedPlanItem(null);
  };

  const handleDeleteItem = async (category: BudgetCategory, itemId: string) => {
    const updated = normalizedBudgets.map((budget) => {
      if (budget.category !== category) return budget;
      const nextItems = budget.items.filter((item) => item.id !== itemId);
      return { ...budget, items: nextItems, totalPlanned: calculateBudgetTotal(nextItems, selectedMonth) };
    });
    await onUpdateBudgets(updated);
  };

  if (formPage) {
    const isEditing = formPage.mode === 'edit';
    const itemKindLabel = planKind === 'expense' ? 'ค่าใช้จ่าย' : 'รายรับ';
    const formItem = formPage.mode === 'edit' ? formPage.item : undefined;
    const formMonths = formItem?.planType === 'six-month' && formItem.planMonth
      ? getSixMonths(formItem.planMonth)
      : sixMonths;

    return (
      <div className="mx-auto w-full max-w-3xl space-y-5 pb-8">
        <PageHeader
          title={isEditing ? `แก้ไขรายการ${itemKindLabel}` : `เพิ่มรายการ${itemKindLabel}`}
          leading={(
            <button
              type="button"
              onClick={() => setFormPage(null)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-snow-drift-100 text-celtic-800 transition-colors hover:bg-snow-drift-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-300"
              aria-label="กลับไปแพลนงบประมาณ"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          subtitle={(
            <>
              <span>{formPage.category} · {monthLabel(selectedMonth)}</span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span>ระบุชื่อ ไอคอน และรูปแบบงบประมาณของรายการ</span>
            </>
          )}
        />

        <section className="rounded-3xl bg-snow-drift-50 p-4 sm:p-6" aria-label={`${isEditing ? 'แก้ไข' : 'เพิ่ม'}รายการ${itemKindLabel}`}>
          <BudgetItemForm
            key={`${formPage.mode}-${formItem?.id || formPage.category}-${selectedMonth}`}
            item={formItem}
            months={formMonths}
            selectedMonth={selectedMonth}
            planStartMonth={formItem?.planType === 'six-month' ? formItem.planMonth || selectedMonth : selectedMonth}
            onCancel={() => setFormPage(null)}
            onSave={(draft) => handleSaveItem(formPage.category, draft, formItem)}
          />
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-2 pb-8">
      <PageHeader
        title="แพลนงบ"
        inlineTrailing
        trailing={(
          <SlidingPillToggle
            value={planKind}
            onChange={(nextKind) => {
              const kind = nextKind as TransactionType;
              setPlanKind(kind);
              setActiveCategory(kind === 'expense' ? null : INCOME_CATEGORIES[0]);
              setChartMode('fromTotal');
              setFormPage(null);
              setSelectedPlanItem(null);
              setSelectedPlanItemCategory(null);
            }}
            ariaLabel="เลือกประเภทงบประมาณ"
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
        secondary={<MonthSelector id="budget-month-select" value={selectedMonth} options={monthOptions} onChange={setSelectedMonth} />}
      />
      <section className="glass-card rounded-3xl p-0" aria-labelledby="budget-share-heading">
        <div className="parliament-chart-stage">
          <ParliamentChart
            percentage={planKind === 'income' ? 100 : chartPercentage}
            activeColor={planKind === 'expense' && activeCategory ? CATEGORY_PLAN_COLORS[activeCategory] || '#808080' : '#52F229'}
            segments={planKind === 'expense' && activeCategory === null ? categorySegments : undefined}
            ariaLabel={`${planKind === 'income' ? 'รายรับรวม' : activeCategory || 'รายจ่ายรวม'}: ${selectedCategoryPlanRatio}% ของ${planKind === 'expense' ? 'งบรายจ่าย' : 'รายรับ'}ทั้งหมด ${totalPlannedOverall.toLocaleString('th-TH')} บาท`}
          >
            {planKind === 'income' ? (
                <div className="pointer-events-none flex flex-col items-center justify-center rounded-2xl p-0">
                  <span className="text-5xl font-bold text-celtic-900 tracking-tight">
                    {totalPlannedOverall.toLocaleString('th-TH')}
                  </span>
                  <span className="text-base font-medium text-celtic-700">รายรับ (บาท)</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setChartMode((current) => current === 'fromTotal'
                    ? 'total'
                    : current === 'total' ? 'proportion' : 'fromTotal')}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-2xl p-0 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-300"
                  aria-label={chartMode === 'fromTotal'
                    ? 'แสดงยอดรวมจากทั้งหมด'
                    : chartMode === 'total' ? 'แสดงสัดส่วนงบประมาณ' : 'กลับไปแสดงยอดที่แพลนไว้'}
                >
                  <span className="text-5xl font-bold text-celtic-900 tracking-tight">
                    {chartMode === 'proportion'
                      ? <AnimatedNumber value={selectedCategoryPlanRatio} suffix="%" maximumFractionDigits={0} />
                      : chartAmount.toLocaleString('th-TH')}
                  </span>
                  <span className="text-base font-medium text-celtic-700 hover:text-apple-400">
                    {chartMode === 'fromTotal' ? 'แพลนไป (บาท)' : chartMode === 'total' ? 'จากทั้งหมด (บาท)' : 'เป็นสัดส่วน'}
                  </span>
                </button>
            )}
          </ParliamentChart>
        </div>
      </section>

      {planKind === 'expense' && (
        <div ref={categoryFilterRef} className="filter-tag-scroll relative z-0 flex flex-nowrap gap-2 overflow-x-auto overscroll-x-contain whitespace-nowrap pb-1 pt-4 -mt-24" role="group" aria-label="เลือกหมวดหมู่งบประมาณ">
          <button
            type="button"
            onClick={() => {
              setActiveCategory(null);
              setChartMode('fromTotal');
              setFormPage(null);
              setSelectedPlanItem(null);
              setSelectedPlanItemCategory(null);
            }}
            aria-pressed={activeCategory === null}
            className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors ${
              activeCategory === null
                ? 'bg-apple-200 text-celtic-900'
                : 'bg-snow-drift-100 text-celtic-700'
            }`}
          >
            ทั้งหมด
          </button>
          {activeCategories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => {
                setActiveCategory(category);
                setChartMode('fromTotal');
                setFormPage(null);
                setSelectedPlanItem(null);
                setSelectedPlanItemCategory(null);
              }}
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
      )}

      {planKind === 'income' ? (
        <div className="space-y-4" aria-label="รายการรายรับ">
          {activeBudgets.map((budget) => (
            <section key={budget.category} className="glass-card rounded-3xl p-4 sm:p-5" aria-label={`รายการรายรับหมวด${budget.category}`}>
              <h2 className="mb-3 text-lg font-medium text-celtic-900">{budget.category}</h2>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {budget.items.map((item) => renderBudgetItem(budget.category, item))}
                {renderAddCard(budget.category)}
              </div>
            </section>
          ))}
        </div>
      ) : (
        activeCategory === null ? (
          <div className="glass-card rounded-3xl p-4 sm:p-5" aria-label="รายการค่าใช้จ่ายทั้งหมด">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {activeBudgets.flatMap((budget) =>
                budget.items.map((item) => renderBudgetItem(budget.category, item))
              )}
            </div>
          </div>
        ) : (
          <section className="glass-card rounded-3xl p-4 sm:p-5" aria-label={`รายการค่าใช้จ่ายหมวด${activeCategory}`}>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {selectedBudget.items.map((item) => renderBudgetItem(activeCategory, item))}
              {renderAddCard(activeCategory)}
            </div>
          </section>
        )
      )}

      {selectedPlanItem && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-celtic-900/55 page-gutter-x py-4"
          onClick={() => setSelectedPlanItem(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="budget-item-detail-title"
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-snow-drift-50 p-5 text-celtic-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-celtic-700">รายละเอียดแพลน · {detailCategory}</p>
                <h2 id="budget-item-detail-title" className="mt-1 text-2xl font-medium">{selectedPlanItem.name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlanItem(null)}
                className="rounded-full p-2 text-celtic-700 hover:bg-snow-drift-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-300"
                aria-label="ปิดรายละเอียด"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 flex flex-col items-center gap-3 rounded-2xl bg-snow-drift-100/50 p-4 text-center">
              {availableIcons.find((option) => option.file === selectedPlanItem.icon)
                ? <img src={availableIcons.find((option) => option.file === selectedPlanItem.icon)?.src} alt="" className="h-16 w-16 object-contain" />
                : <span className="text-4xl" aria-hidden="true">{getCategoryInfo(detailCategory).emoji}</span>}
              <span className="rounded-full bg-snow-drift-50 px-3 py-1 text-xs text-celtic-700">{getPlanTypeLabel(selectedPlanItem.planType)}</span>
              <span className="font-onest text-3xl font-medium text-celtic-900">
                {selectedPlanItem.planType === 'none' ? '—' : getBudgetItemAmount(selectedPlanItem, selectedMonth).toLocaleString('th-TH')}
              </span>
              <span className="text-sm text-celtic-700">
                {selectedPlanItem.planType === 'none' ? 'ยังไม่ได้กำหนดยอด' : `บาทในเดือน ${monthLabel(selectedMonth, 'short')}`}
              </span>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              {selectedPlanItem.planType === 'daily' && (
                <>
                  <div className="flex justify-between gap-3"><span className="text-celtic-700">ยอดต่อวันที่เลือก</span><span className="font-onest">{Number(selectedPlanItem.amount).toLocaleString('th-TH')} บาท</span></div>
                  <div>
                    <p className="text-celtic-700">วันที่คิดงบ</p>
                    <p className="mt-1 font-medium">{WEEKDAYS.filter((day) => (selectedPlanItem.planDays ?? DEFAULT_PLAN_DAYS).includes(day.value)).map((day) => day.name.replace('วัน', '')).join(' · ')}</p>
                  </div>
                </>
              )}
              {selectedPlanItem.planType === 'monthly' && (
                <div className="flex justify-between gap-3"><span className="text-celtic-700">งบต่อเดือน</span><span className="font-onest">{Number(selectedPlanItem.amount).toLocaleString('th-TH')} บาท</span></div>
              )}
              {selectedPlanItem.planType === 'six-month' && (
                <div>
                  <p className="text-celtic-700">ยอดแพลนรายเดือน</p>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                    {Object.entries(selectedPlanItem.planAmounts || {}).map(([month, amount]) => (
                      <div key={month} className="flex justify-between gap-2">
                        <span>{monthLabel(month, 'short')}</span>
                        <span className="font-onest">{Number(amount).toLocaleString('th-TH')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedPlanItem.planType === 'none' && <p className="text-center text-celtic-700">รายการนี้ยังไม่มีงบประมาณที่กำหนดไว้</p>}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  const category = detailCategory;
                  const item = selectedPlanItem;
                  setSelectedPlanItem(null);
                  setFormPage({ mode: 'edit', category, item });
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-apple-300 px-4 py-3 text-sm font-medium text-celtic-900 hover:bg-apple-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-400"
              >
                <Edit3 className="h-4 w-4" /> แก้ไข
              </button>
              <button
                type="button"
                onClick={() => {
                  const itemId = selectedPlanItem.id;
                  setSelectedPlanItem(null);
                  void handleDeleteItem(detailCategory, itemId);
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-snow-drift-200 px-4 py-3 text-sm font-medium text-celtic-900 hover:bg-stiletto-800 hover:text-snow-drift-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stiletto-800"
              >
                <Trash2 className="h-4 w-4" /> ลบแพลน
              </button>
            </div>
          </section>
        </div>
      )}

      {isSyncing && <p className="text-center text-xs text-gray-500">กำลังซิงค์ข้อมูล...</p>}
    </div>
  );
};
