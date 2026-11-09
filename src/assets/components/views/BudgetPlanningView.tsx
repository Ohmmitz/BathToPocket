import React, { useState } from 'react';
import { 
  Target, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  FileSpreadsheet, 
  ChevronDown, 
  ChevronUp, 
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { 
  CategoryBudget, 
  BudgetItem, 
  EXPENSE_CATEGORIES, 
  ExpenseCategory, 
  calculateBudgetTotal 
} from '../../utils/finance.ts';
import { getCategoryInfo } from '../../utils/categoryHelpers.tsx';

interface BudgetPlanningViewProps {
  budgets: CategoryBudget[];
  onUpdateBudgets: (updatedBudgets: CategoryBudget[]) => Promise<void>;
  isSyncing: boolean;
}

export const BudgetPlanningView: React.FC<BudgetPlanningViewProps> = ({
  budgets,
  onUpdateBudgets,
  isSyncing,
}) => {
  // Ensure all EXPENSE_CATEGORIES exist in budgets
  const normalizedBudgets: CategoryBudget[] = EXPENSE_CATEGORIES.map((cat) => {
    const existing = budgets.find((b) => b.category === cat);
    if (existing) {
      return {
        ...existing,
        totalPlanned: calculateBudgetTotal(existing.items || []),
      };
    }
    return {
      category: cat,
      items: [],
      totalPlanned: 0,
    };
  });

  const [activeCategory, setActiveCategory] = useState<ExpenseCategory>(EXPENSE_CATEGORIES[0]);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Adding new item state
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [addingForCategory, setAddingForCategory] = useState<ExpenseCategory | null>(null);

  // Editing item state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');

  // Total overall planned budget
  const totalPlannedOverall = normalizedBudgets.reduce((sum, b) => sum + b.totalPlanned, 0);

  const toggleCategoryCollapse = (cat: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  const handleStartAddItem = (cat: ExpenseCategory) => {
    setAddingForCategory(cat);
    setNewItemName('');
    setNewItemAmount('');
    setEditingItemId(null);
  };

  const handleCancelAddItem = () => {
    setAddingForCategory(null);
    setNewItemName('');
    setNewItemAmount('');
  };

  const handleSaveNewItem = async (cat: ExpenseCategory) => {
    const amount = parseFloat(newItemAmount);
    if (!newItemName.trim() || isNaN(amount) || amount <= 0) {
      return;
    }

    const newItem: BudgetItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newItemName.trim(),
      amount: amount,
    };

    const updated = normalizedBudgets.map((b) => {
      if (b.category === cat) {
        const nextItems = [...(b.items || []), newItem];
        return {
          ...b,
          items: nextItems,
          totalPlanned: calculateBudgetTotal(nextItems),
        };
      }
      return b;
    });

    await onUpdateBudgets(updated);
    handleCancelAddItem();
  };

  const handleStartEdit = (item: BudgetItem) => {
    setEditingItemId(item.id);
    setEditName(item.name);
    setEditAmount(String(item.amount));
    setAddingForCategory(null);
  };

  const handleSaveEdit = async (cat: ExpenseCategory, itemId: string) => {
    const amount = parseFloat(editAmount);
    if (!editName.trim() || isNaN(amount) || amount <= 0) {
      return;
    }

    const updated = normalizedBudgets.map((b) => {
      if (b.category === cat) {
        const nextItems = (b.items || []).map((i) =>
          i.id === itemId ? { ...i, name: editName.trim(), amount } : i
        );
        return {
          ...b,
          items: nextItems,
          totalPlanned: calculateBudgetTotal(nextItems),
        };
      }
      return b;
    });

    await onUpdateBudgets(updated);
    setEditingItemId(null);
  };

  const handleDeleteItem = async (cat: ExpenseCategory, itemId: string) => {
    const updated = normalizedBudgets.map((b) => {
      if (b.category === cat) {
        const nextItems = (b.items || []).filter((i) => i.id !== itemId);
        return {
          ...b,
          items: nextItems,
          totalPlanned: calculateBudgetTotal(nextItems),
        };
      }
      return b;
    });

    await onUpdateBudgets(updated);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Title & Overall Budget Card */}
      <div className="glass-card p-5.5 rounded-3xl border border-white/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-800" />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              แพลนงบประมาณรายเดือน
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            แยกรายการค่าใช้จ่ายย่อยในแต่ละหมวดหมู่ ระบบจะคำนวณยอดรวมของหมวดหมู่อัตโนมัติ
          </p>
        </div>

        <div className="bg-emerald-500/10 backdrop-blur-md border border-emerald-400/30 rounded-2xl p-3.5 sm:px-5 flex items-center justify-between sm:justify-end gap-4 shadow-2xs">
          <div className="text-left sm:text-right">
            <span className="text-[11px] font-medium text-emerald-800 block">
              งบประมาณที่วางแผนรวมทั้งหมด
            </span>
            <span className="font-onest text-2xl font-black text-emerald-800 tracking-tight">
              {totalPlannedOverall.toLocaleString('th-TH')}-.
            </span>
          </div>
        </div>
      </div>

      {/* Instructions Pill */}
      <div className="p-3.5 bg-blue-500/10 backdrop-blur-md border border-blue-400/30 rounded-2xl text-blue-900 text-xs flex items-center gap-2.5 shadow-2xs">
        <AlertCircle className="w-4 h-4 shrink-0 text-blue-600" />
        <span>
          💡 คุณสามารถเพิ่ม ลบ หรือแก้ไขรายการย่อยในแต่ละหมวดหมู่ได้ ยอดรวมของหมวดหมู่จะอัปเดตให้อัตโนมัติ
        </span>
      </div>

      {/* Categories & Sub-items List */}
      <div className="space-y-4">
        {normalizedBudgets.map((categoryBudget) => {
          const cat = categoryBudget.category;
          const catInfo = getCategoryInfo(cat);
          const isCollapsed = collapsedCategories[cat] ?? false;
          const isAdding = addingForCategory === cat;
          const items = categoryBudget.items || [];
          const totalPlanned = categoryBudget.totalPlanned;

          return (
            <div
              key={cat}
              className="glass-card rounded-3xl border border-white/80 shadow-xs overflow-hidden transition-all duration-200"
            >
              {/* Category Header Row (Clickable Accordion) */}
              <div 
                className="p-4.5 sm:p-5 flex items-center justify-between cursor-pointer bg-white/40 hover:bg-white/70 transition-colors backdrop-blur-xs"
                onClick={() => toggleCategoryCollapse(cat)}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${catInfo.bgLight} ${catInfo.textColor} border ${catInfo.borderColor} shadow-2xs`}>
                    {catInfo.icon}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      {cat}
                    </h2>
                    <span className="text-xs text-gray-500 font-medium">
                      {items.length} รายการค่าใช้จ่ายที่วางแผน
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Category Total Badge */}
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">
                      ยอดรวมหมวดหมู่นี้
                    </span>
                    <span className="font-onest text-base sm:text-lg font-black text-emerald-800">
                      {totalPlanned.toLocaleString('th-TH')}-.
                    </span>
                  </div>
                  <button
                    type="button"
                    className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-white/60 transition-colors"
                    aria-label={isCollapsed ? `ขยายหมวดหมู่ ${cat}` : `ย่อหมวดหมู่ ${cat}`}
                  >
                    {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Sub-items Container */}
              {!isCollapsed && (
                <div className="p-4 sm:p-5 border-t border-gray-100 space-y-3">
                  {/* Sub-item List */}
                  {items.length === 0 && !isAdding ? (
                    <div className="text-center py-6 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                      <p className="text-xs text-gray-500 mb-2">
                        ยังไม่มีรายการย่อยในหมวดนี้
                      </p>
                      <button
                        type="button"
                        onClick={() => handleStartAddItem(cat)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        เพิ่มรายการย่อยรายการแรก
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {items.map((item) => {
                        const isEditing = editingItemId === item.id;

                        if (isEditing) {
                          return (
                            <div
                              key={item.id}
                              className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-300 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                            >
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="ชื่อรายการย่อย"
                                className="flex-1 px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                              />
                              <div className="relative w-full sm:w-36">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">-.</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={editAmount}
                                  onChange={(e) => setEditAmount(e.target.value)}
                                  placeholder="จำนวนเงิน"
                                  className="w-full pl-6 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold font-onest"
                                />
                              </div>
                              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(cat, item.id)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" /> บันทึก
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingItemId(null)}
                                  className="px-2.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={item.id}
                            className="p-3 rounded-xl bg-gray-50/70 hover:bg-gray-50 border border-gray-200/70 flex items-center justify-between transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span className="text-xs sm:text-sm font-semibold text-gray-900">
                                {item.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-xs sm:text-sm font-bold text-gray-900 font-onest">
                                {item.amount.toLocaleString('th-TH')}-.
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(item)}
                                  className="p-1.5 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                                  title="แก้ไขรายการย่อย"
                                  aria-label={`แก้ไข ${item.name}`}
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(cat, item.id)}
                                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="ลบรายการย่อย"
                                  aria-label={`ลบ ${item.name}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add New Sub-item Form */}
                  {isAdding ? (
                    <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-300 space-y-2.5 animate-in fade-in duration-150">
                      <span className="text-xs font-bold text-emerald-900 block">
                        + เพิ่มรายการย่อยใหม่ในหมวด "{cat}"
                      </span>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          required
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          placeholder="ชื่อรายการ เช่น ค่าน้ำมัน, ค่ากาแฟ, ค่าเน็ต"
                          className="flex-1 px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        />
                        <div className="relative w-full sm:w-40">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">-.</span>
                          <input
                            type="number"
                            min="0"
                            required
                            value={newItemAmount}
                            onChange={(e) => setNewItemAmount(e.target.value)}
                            placeholder="จำนวนเงิน"
                            className="w-full pl-6 pr-3 py-2 text-xs bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold font-onest"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSaveNewItem(cat)}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" /> เพิ่มรายการ
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelAddItem}
                            className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-medium transition-colors"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStartAddItem(cat)}
                      className="w-full py-2.5 rounded-xl border border-dashed border-gray-300 hover:border-emerald-500 hover:bg-emerald-50/40 text-gray-600 hover:text-emerald-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      เพิ่มรายการค่าใช้จ่ายย่อยในหมวดนี้
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
