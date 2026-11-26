export type TransactionType = 'income' | 'expense';

const LEGACY_CATEGORY_NAMES: Record<string, string> = {
  'อาหารและเครื่องดื่ม': 'ค่าอาหาร',
  'การเดินทาง': 'ค่าเดินทาง',
  'บิลและค่าใช้จ่ายประจำ': 'ค่าใช้จ่ายประจำ',
  'ความบันเทิงและพักผ่อน': 'ค่าความบันเทิง',
  'สุขภาพและยา': 'ค่าสุขภาพ',
  'ของใช้และช็อปปิ้ง': 'ค่าของใช้ส่วนตัว',
  'หนี้สิน': 'ค่าหนี้สิน',
  'เงินออม': 'ค่าหนี้สิน',
};

export function normalizeCategoryName(category: string): string {
  return LEGACY_CATEGORY_NAMES[category] || category;
}

export const EXPENSE_CATEGORIES = [
  'ค่าอาหาร',
  'ค่าเดินทาง',
  'ค่าใช้จ่ายประจำ',
  'ค่าความบันเทิง',
  'ค่าสุขภาพ',
  'ค่าของใช้ส่วนตัว',
  'ค่าหนี้สิน',
  'ค่าใช้จ่ายอื่นๆ',
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export const LEGACY_INCOME_CATEGORIES = [
  'เงินเดือน / ค่าจ้าง',
  'โบนัส',
  'ธุรกิจ / งานเสริม',
  'ลงทุน / ปันผล',
  'อื่นๆ',
] as const;

export const INCOME_CATEGORIES = ['รายได้'] as const;

export type IncomeCategory = typeof INCOME_CATEGORIES[number];
export type BudgetCategory = ExpenseCategory | IncomeCategory;

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  title: string;
  amount: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  note?: string;
  icon?: string;
  createdAt: number;
}

export interface BudgetItem {
  id: string;
  name: string;
  amount: number;
  icon?: string;
  planType?: 'daily' | 'monthly' | 'single' | 'six-month' | 'none';
  planMonth?: string;
  planAmounts?: Record<string, number>;
  planDays?: number[];
}

export const DEFAULT_INCOME_SOURCE_ITEMS: Array<{ category: IncomeCategory; item: BudgetItem }> = [
  {
    category: 'รายได้',
    item: { id: 'income-source-salary', name: 'เงินเดือน / ค่าจ้าง', amount: 0, icon: 'icon_income.png', planType: 'none' },
  },
  {
    category: 'รายได้',
    item: { id: 'income-source-bonus', name: 'โบนัส', amount: 0, icon: 'icon_give.png', planType: 'none' },
  },
  {
    category: 'รายได้',
    item: { id: 'income-source-business', name: 'ธุรกิจ / งานเสริม', amount: 0, icon: 'icon_Finance.png', planType: 'none' },
  },
  {
    category: 'รายได้',
    item: { id: 'income-source-investment', name: 'ลงทุน / ปันผล', amount: 0, icon: 'icon_save.png', planType: 'none' },
  },
];

export interface CategoryBudget {
  category: BudgetCategory;
  items: BudgetItem[];
  totalPlanned: number;
}

export interface SavingGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  monthlyPlan: number;
  notes?: string;
  history: Array<{
    id: string;
    amount: number;
    date: string;
    note?: string;
    createdAt: number;
  }>;
}

export type BudgetStatus = 'normal' | 'warning' | 'exceeded';

/**
 * Return the reporting month for the 28th-to-27th accounting cycle.
 * Transactions dated on the 28th or later belong to the following month's period.
 */
export function getAccountingPeriodMonth(value: string | Date = new Date()): string {
  const date = typeof value === 'string'
    ? new Date(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10)))
    : value;
  const year = date.getFullYear();
  const month = date.getMonth() + (date.getDate() >= 28 ? 1 : 0);
  const periodDate = new Date(year, month, 1);
  return `${periodDate.getFullYear()}-${String(periodDate.getMonth() + 1).padStart(2, '0')}`;
}

export function getWeekdaysInMonth(monthValue: string): number {
  return getSelectedDaysInMonth(monthValue, [1, 2, 3, 4, 5]);
}

export function getSelectedDaysInMonth(monthValue: string, selectedDays: number[]): number {
  const [year, month] = monthValue.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const selectedDaySet = new Set(selectedDays);
  let count = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    const weekday = new Date(year, month - 1, day).getDay();
    if (selectedDaySet.has(weekday)) count += 1;
  }
  return count;
}

/**
 * Calculate the total planned amount from an array of budget sub-items
 */
export function getBudgetItemAmount(item: BudgetItem, month?: string): number {
  if (item.planType === 'none') return 0;
  if (item.planType === 'daily' && month) {
    return (Number(item.amount) || 0) * getSelectedDaysInMonth(month, item.planDays ?? [1, 2, 3, 4, 5]);
  }
  if (item.planType === 'six-month' && month) {
    return Number(item.planAmounts?.[month]) || 0;
  }
  return Number(item.amount) || 0;
}

export function calculateBudgetTotal(items: BudgetItem[], month?: string): number {
  return items.reduce((sum, item) => sum + getBudgetItemAmount(item, month), 0);
}

/**
 * Calculate total spent for a specific category within a given date range or transactions list
 */
export function calculateCategorySpent(
  category: string,
  transactions: Transaction[],
  monthPrefix?: string // e.g. "2026-11"
): number {
  return transactions
    .filter((tx) => {
      if (tx.type !== 'expense') return false;
      const transactionCategory = normalizeCategoryName(tx.category);
      if (transactionCategory !== category) return false;
      if (monthPrefix && getAccountingPeriodMonth(tx.date) !== monthPrefix) return false;
      return true;
    })
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
}

/**
 * Determine budget status and percentage
 */
export function getBudgetProgress(spent: number, planned: number): {
  percentage: number;
  remaining: number;
  status: BudgetStatus;
  isWarning: boolean;
  isExceeded: boolean;
} {
  if (planned <= 0) {
    return {
      percentage: spent > 0 ? 100 : 0,
      remaining: 0 - spent,
      status: spent > 0 ? 'exceeded' : 'normal',
      isWarning: false,
      isExceeded: spent > 0,
    };
  }

  const percentage = Math.round((spent / planned) * 100);
  const remaining = planned - spent;

  let status: BudgetStatus = 'normal';
  if (percentage >= 100) {
    status = 'exceeded';
  } else if (percentage >= 80) {
    status = 'warning';
  }

  return {
    percentage,
    remaining,
    status,
    isWarning: status === 'warning',
    isExceeded: status === 'exceeded',
  };
}

/**
 * Calculate net totals for income, expense, balance, and savings
 */
export function calculateFinancialSummary(transactions: Transaction[]) {
  let totalIncome = 0;
  let totalExpense = 0;

  for (const tx of transactions) {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'income') {
      totalIncome += amt;
    } else {
      totalExpense += amt;
    }
  }

  const balance = totalIncome - totalExpense;

  return {
    totalIncome,
    totalExpense,
    balance,
  };
}

/**
 * Filter transactions by quick preset (today, yesterday, last 7 days, or custom date range)
 */
export function filterTransactionsByDate(
  transactions: Transaction[],
  preset: 'all' | 'today' | 'yesterday' | '7days' | 'custom',
  customStart?: string,
  customEnd?: string,
  referenceDateStr?: string // e.g. '2026-11-08'
): Transaction[] {
  const ref = referenceDateStr ? new Date(referenceDateStr) : new Date();
  const formatYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = formatYMD(ref);

  const yest = new Date(ref);
  yest.setDate(yest.getDate() - 1);
  const yesterdayStr = formatYMD(yest);

  const sevenDaysAgo = new Date(ref);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sevenDaysAgoStr = formatYMD(sevenDaysAgo);

  return transactions.filter((tx) => {
    if (preset === 'today') {
      return tx.date === todayStr;
    }
    if (preset === 'yesterday') {
      return tx.date === yesterdayStr;
    }
    if (preset === '7days') {
      return tx.date >= sevenDaysAgoStr && tx.date <= todayStr;
    }
    if (preset === 'custom') {
      if (customStart && tx.date < customStart) return false;
      if (customEnd && tx.date > customEnd) return false;
      return true;
    }
    return true;
  });
}

/**
 * Instant search across title, category, notes, and formatted amount
 */
export function searchTransactions(
  transactions: Transaction[],
  query: string
): Transaction[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return transactions;

  return transactions.filter((tx) => {
    const titleMatch = tx.title.toLowerCase().includes(trimmed);
    const categoryMatch = tx.category.toLowerCase().includes(trimmed);
    const noteMatch = tx.note ? tx.note.toLowerCase().includes(trimmed) : false;
    const amountMatch = String(tx.amount).includes(trimmed);
    const dateMatch = tx.date.includes(trimmed);
    return titleMatch || categoryMatch || noteMatch || amountMatch || dateMatch;
  });
}

/**
 * Find the most recent transaction to enable "ย้อนรายการล่าสุด"
 */
export function getLatestTransaction(transactions: Transaction[]): Transaction | null {
  if (!transactions.length) return null;
  return [...transactions].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
}
