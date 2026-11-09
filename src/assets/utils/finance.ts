export type TransactionType = 'income' | 'expense';

export const EXPENSE_CATEGORIES = [
  'อาหารและเครื่องดื่ม',
  'การเดินทาง',
  'บิลและค่าใช้จ่ายประจำ',
  'ความบันเทิงและพักผ่อน',
  'สุขภาพและยา',
  'ของใช้และช็อปปิ้ง',
  'เงินออม',
  'ค่าใช้จ่ายอื่นๆ',
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export const INCOME_CATEGORIES = [
  'เงินเดือน / ค่าจ้าง',
  'โบนัส',
  'ธุรกิจ / งานเสริม',
  'ลงทุน / ปันผล',
  'อื่นๆ',
] as const;

export type IncomeCategory = typeof INCOME_CATEGORIES[number];

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  title: string;
  amount: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  note?: string;
  createdAt: number;
}

export interface BudgetItem {
  id: string;
  name: string;
  amount: number;
}

export interface CategoryBudget {
  category: ExpenseCategory;
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
 * Calculate the total planned amount from an array of budget sub-items
 */
export function calculateBudgetTotal(items: BudgetItem[]): number {
  return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
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
      if (tx.category !== category) return false;
      if (monthPrefix && !tx.date.startsWith(monthPrefix)) return false;
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
