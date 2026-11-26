import { useState, useEffect, useCallback, useMemo } from 'react';
import { Header, MobileNav } from './assets/components/Header.tsx';
import type { TabType } from './assets/components/Header.tsx';
import { ExpenseSummaryView } from './assets/components/views/ExpenseSummaryView.tsx';
import { AddTransactionView } from './assets/components/views/AddTransactionView.tsx';
import { BudgetPlanningView } from './assets/components/views/BudgetPlanningView.tsx';
import { SavingsView } from './assets/components/views/SavingView.tsx';
import { HistoryView } from './assets/components/views/HistoryView.tsx';
import { UndoModal } from './assets/components/ConfirmationModal.tsx';
import { GoogleSheetModal } from './assets/components/GoogleSheetModal.tsx';
import brandLogo from './assets/favicon.svg';
import {
  getLatestTransaction,
  getAccountingPeriodMonth,
  normalizeCategoryName,
} from './assets/utils/finance.ts';
import type { Transaction, CategoryBudget, SavingGoal } from './assets/utils/finance.ts';
import {
  getStoredScriptUrl,
  getStoredLastSynced,
  sendToGoogleSheet,
  fetchFromGoogleSheet,
  setStoredLastSynced,
  DEFAULT_SPREADSHEET_URL,
} from './assets/services/googleSheetService.ts';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const STORAGE_KEYS = {
  TRANSACTIONS: 'app_expense_tracker_transactions',
  BUDGETS: 'app_expense_tracker_budgets',
  SAVINGS: 'app_expense_tracker_savings',
};

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] || character);
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('summary');

  // Transactions State
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (saved) {
        const restored: Transaction[] = JSON.parse(saved);
        return restored.map((transaction) => ({
          ...transaction,
          category: normalizeCategoryName(transaction.category),
        }));
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Budgets State
  const [budgets, setBudgets] = useState<CategoryBudget[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BUDGETS);
      if (saved) {
        const restored: CategoryBudget[] = JSON.parse(saved);
        return restored.map((budget) => ({
          ...budget,
          category: normalizeCategoryName(String(budget.category)) as CategoryBudget['category'],
        }));
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Savings State
  const [savings, setSavings] = useState<SavingGoal[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SAVINGS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Google Sheets state
  const [scriptUrl, setScriptUrl] = useState(() => getStoredScriptUrl());
  const [lastSynced, setLastSynced] = useState<string | null>(() => getStoredLastSynced());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Undo modal state
  const [isUndoModalOpen, setIsUndoModalOpen] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3500);
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    } catch (e) {
      console.error(e);
    }
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
    } catch (e) {
      console.error(e);
    }
  }, [budgets]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SAVINGS, JSON.stringify(savings));
    } catch (e) {
      console.error(e);
    }
  }, [savings]);

  const latestTransaction = useMemo(() => getLatestTransaction(transactions), [transactions]);
  const isGoogleSheetConfigured = Boolean(scriptUrl && scriptUrl.trim());

  // Helper to build payload with both budgets and flattened budgetItems
  const getFullPayload = useCallback(
    (txList = transactions, budgetList = budgets, savingList = savings) => {
      const budgetItems: Array<{
        id: string;
        category: string;
        name: string;
        amount: number;
        icon?: string;
        planType?: string;
        planMonth?: string;
        planAmounts?: Record<string, number>;
        planDays?: number[];
      }> = [];
      for (const b of budgetList) {
        if (Array.isArray(b.items)) {
          for (const item of b.items) {
            budgetItems.push({
              id: item.id,
              category: b.category,
              name: item.name,
              amount: Number(item.amount) || 0,
              icon: item.icon,
              planType: item.planType,
              planMonth: item.planMonth,
              planAmounts: item.planAmounts,
              planDays: item.planDays,
            });
          }
        }
      }
      return {
        transactions: txList,
        budgets: budgetList,
        budgetItems,
        savings: savingList,
      };
    },
    [transactions, budgets, savings]
  );

  // Background sync all to Google Sheets
  const syncAllToGoogleSheet = useCallback(async () => {
    setIsSyncing(true);
    try {
      const payload = getFullPayload();
      const res = await sendToGoogleSheet('syncAll', payload);
      const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      setLastSynced(timeStr);
      setStoredLastSynced(timeStr);
      if (res.success) {
        showToast('ซิงค์ข้อมูลกับ Google Sheets สำเร็จเรียบร้อย', 'success');
      } else {
        showToast(res.message || 'บันทึกในเครื่องแล้ว', 'info');
      }
    } catch (err) {
      showToast('ซิงค์ไม่สำเร็จ แต่ข้อมูลถูกบันทึกไว้ในเครื่องแล้ว', 'info');
    } finally {
      setIsSyncing(false);
    }
  }, [getFullPayload, showToast]);

  // Pull data from Google Sheets
  const handleFetchFromSheet = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetchFromGoogleSheet();
      if (res.success && res.data) {
        if (res.data.transactions && res.data.transactions.length > 0) {
          setTransactions(res.data.transactions);
        }
        if (res.data.budgets && res.data.budgets.length > 0) {
          setBudgets(res.data.budgets);
        }
        if (res.data.savings && res.data.savings.length > 0) {
          setSavings(res.data.savings);
        }
        showToast('ดึงข้อมูลล่าสุดจาก Google Sheets สำเร็จ', 'success');
      } else {
        showToast(res.message || 'ไม่พบข้อมูลใหม่ใน Google Sheets', 'info');
      }
    } catch (err) {
      showToast('ไม่สามารถดึงข้อมูลจาก Google Sheets ได้', 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [showToast]);

  const handleExportMonthlyStatement = useCallback(() => {
    const accountingMonth = getAccountingPeriodMonth();
    const [year, month] = accountingMonth.split('-').map(Number);
    const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('th-TH-u-ca-gregory', {
      month: 'long',
      year: 'numeric',
    });
    const monthlyTransactions = transactions
      .filter((transaction) => getAccountingPeriodMonth(transaction.date) === accountingMonth)
      .sort((a, b) => b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || ''));
    const totalIncome = monthlyTransactions
      .filter((transaction) => transaction.type === 'income')
      .reduce((total, transaction) => total + (Number(transaction.amount) || 0), 0);
    const totalExpense = monthlyTransactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce((total, transaction) => total + (Number(transaction.amount) || 0), 0);
    const balance = totalIncome - totalExpense;
    const formatAmount = (amount: number) => amount.toLocaleString('th-TH', { maximumFractionDigits: 2 });
    const formatDate = (date: string) => {
      const [dateYear, dateMonth, dateDay] = date.split('-').map(Number);
      return new Date(dateYear, dateMonth - 1, dateDay).toLocaleDateString('th-TH-u-ca-gregory');
    };
    const rows = monthlyTransactions.map((transaction) => `
      <tr>
        <td>${escapeHtml(formatDate(transaction.date))}${transaction.time ? `<br><small>${escapeHtml(transaction.time)}</small>` : ''}</td>
        <td>${transaction.type === 'income' ? 'รายรับ' : 'รายจ่าย'}</td>
        <td>${escapeHtml(transaction.category)}</td>
        <td>${escapeHtml(transaction.title)}</td>
        <td class="amount ${transaction.type === 'income' ? 'income' : 'expense'}">${transaction.type === 'income' ? '+' : '−'}${escapeHtml(formatAmount(Number(transaction.amount) || 0))}</td>
        <td>${escapeHtml(transaction.note || '')}</td>
      </tr>
    `).join('');
    const reportWindow = window.open('', '_blank');

    if (!reportWindow) {
      showToast('เปิดหน้ารายงานไม่ได้ กรุณาอนุญาตป๊อปอัปแล้วลองอีกครั้ง', 'error');
      return;
    }

    reportWindow.opener = null;
    reportWindow.document.open();
    reportWindow.document.write(`<!doctype html>
      <html lang="th">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>BahtToPocket-Statement-${accountingMonth}</title>
          <style>
            @page { size: A4 landscape; margin: 16mm; }
            * { box-sizing: border-box; }
            body { margin: 0; color: #111; background: #fff; font-family: Arial, "Noto Sans Thai", sans-serif; font-size: 11px; line-height: 1.5; }
            .brand { display: flex; align-items: center; gap: 10px; padding-bottom: 12px; border-bottom: 1.5px solid #111; }
            .brand-mark { display: block; width: 38px; height: 38px; object-fit: contain; filter: grayscale(1); }
            .brand-name { margin: 0; font-size: 17px; font-weight: 700; letter-spacing: .02em; }
            .brand-caption { margin: 1px 0 0; color: #444; font-size: 9px; }
            .report-heading { display: flex; justify-content: space-between; align-items: end; gap: 20px; margin: 18px 0 16px; }
            h1 { margin: 0; font-size: 20px; line-height: 1.3; }
            .subtitle { margin: 4px 0 0; color: #333; font-size: 12px; }
            .report-meta { text-align: right; color: #444; font-size: 9px; white-space: nowrap; }
            .report-meta strong { display: block; color: #111; font-size: 10px; font-weight: 600; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
            .summary-card { min-height: 58px; padding: 9px 11px; border: 1px solid #777; }
            .summary-card span { display: block; margin-bottom: 3px; color: #444; font-size: 9px; }
            .summary-card strong { font-size: 15px; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; }
            thead { display: table-header-group; }
            tr { break-inside: avoid; }
            th, td { border-bottom: 1px solid #999; padding: 7px 6px; text-align: left; vertical-align: top; }
            th { border-top: 1px solid #111; border-bottom: 1.5px solid #111; font-weight: 700; }
            .amount { white-space: nowrap; text-align: right; font-variant-numeric: tabular-nums; }
            td small { color: #444; }
            .empty { padding: 24px; border: 1px solid #777; text-align: center; color: #333; }
            footer { margin-top: 16px; padding-top: 7px; border-top: 1px solid #777; color: #444; text-align: right; font-size: 9px; }
            @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
          <script>window.addEventListener('afterprint', () => window.close());</script>
        </head>
        <body>
          <div class="brand">
            <img class="brand-mark" src="${escapeHtml(brandLogo)}" alt="">
            <div>
              <p class="brand-name">BahtToPocket</p>
              <p class="brand-caption">เอกสารสรุปการเงินส่วนบุคคล</p>
            </div>
          </div>
          <header class="report-heading">
            <div>
              <h1>รายงานสรุปรายรับและรายจ่าย</h1>
              <p class="subtitle">ประจำเดือน ${escapeHtml(monthLabel)} · ${monthlyTransactions.length} รายการ</p>
            </div>
            <div class="report-meta"><span>วันที่จัดทำ</span><strong>${escapeHtml(new Date().toLocaleDateString('th-TH-u-ca-gregory'))}</strong></div>
          </header>
          <section class="summary">
            <div class="summary-card"><span>รายรับรวม</span><strong class="income">${escapeHtml(formatAmount(totalIncome))} บาท</strong></div>
            <div class="summary-card"><span>รายจ่ายรวม</span><strong class="expense">${escapeHtml(formatAmount(totalExpense))} บาท</strong></div>
            <div class="summary-card"><span>คงเหลือสุทธิ</span><strong>${escapeHtml(formatAmount(balance))} บาท</strong></div>
          </section>
          ${monthlyTransactions.length ? `<table><thead><tr><th>วันที่ / เวลา</th><th>ประเภท</th><th>หมวดหมู่</th><th>รายการ</th><th class="amount">จำนวนเงิน (บาท)</th><th>หมายเหตุ</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="empty">ไม่มีรายการในเดือนนี้</p>'}
          <footer>จัดทำเมื่อ ${escapeHtml(new Date().toLocaleString('th-TH-u-ca-gregory'))}</footer>
        </body>
      </html>`);
    reportWindow.document.close();
    reportWindow.focus();
    window.setTimeout(() => reportWindow.print(), 500);
    showToast('เปิดรายงานแล้ว เลือก “Save as PDF” เพื่อบันทึกลงเครื่อง', 'info');
  }, [transactions, showToast]);

  // Handler: Add new transaction
  const handleAddTransaction = async (txData: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx: Transaction = {
      ...txData,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
    };

    const nextTransactions = [newTx, ...transactions];
    setTransactions(nextTransactions);

    // Sync to Google Sheets if configured
    if (isGoogleSheetConfigured) {
      setIsSyncing(true);
      const payload = getFullPayload(nextTransactions, budgets, savings);
      sendToGoogleSheet('syncAll', payload)
        .then(() => {
          const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
          setLastSynced(timeStr);
          setStoredLastSynced(timeStr);
          showToast(`บันทึก "${newTx.title}" เรียบร้อยและส่งเข้า Google Sheet แล้ว`, 'success');
        })
        .catch(() => {
          showToast(`บันทึก "${newTx.title}" ลงเครื่องเรียบร้อย`, 'success');
        })
        .finally(() => setIsSyncing(false));
    } else {
      showToast(`บันทึก "${newTx.title}" สำเร็จ (โหมดออฟไลน์)`, 'success');
    }

    // Navigate to summary
    setActiveTab('summary');
  };

  // Handler: Undo latest transaction
  const handleConfirmUndoLatest = async () => {
    if (!latestTransaction) return;

    setIsUndoing(true);
    try {
      const targetId = latestTransaction.id;
      const filtered = transactions.filter((t) => t.id !== targetId);
      setTransactions(filtered);

      if (isGoogleSheetConfigured) {
        setIsSyncing(true);
        const payload = getFullPayload(filtered, budgets, savings);
        await sendToGoogleSheet('syncAll', payload);
        const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        setLastSynced(timeStr);
        setStoredLastSynced(timeStr);
      }

      showToast(`ย้อนรายการ "${latestTransaction.title}" เรียบร้อยแล้ว`, 'info');
      setIsUndoModalOpen(false);
    } catch (err) {
      showToast('ย้อนรายการในเครื่องสำเร็จ', 'info');
      setIsUndoModalOpen(false);
    } finally {
      setIsUndoing(false);
      setIsSyncing(false);
    }
  };

  // Handler: Delete specific transaction from history
  const handleDeleteTransaction = async (id: string) => {
    const target = transactions.find((t) => t.id === id);
    const filtered = transactions.filter((t) => t.id !== id);
    setTransactions(filtered);

    if (isGoogleSheetConfigured) {
      setIsSyncing(true);
      const payload = getFullPayload(filtered, budgets, savings);
      sendToGoogleSheet('syncAll', payload)
        .then(() => {
          const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
          setLastSynced(timeStr);
          setStoredLastSynced(timeStr);
        })
        .finally(() => setIsSyncing(false));
    }

    showToast(`ลบรายการ ${target ? `"${target.title}"` : ''} เรียบร้อยแล้ว`, 'info');
  };

  // Handler: Update category budgets
  const handleUpdateBudgets = async (updatedBudgets: CategoryBudget[]) => {
    setBudgets(updatedBudgets);

    if (isGoogleSheetConfigured) {
      setIsSyncing(true);
      sendToGoogleSheet('syncAll', getFullPayload(transactions, updatedBudgets, savings))
        .then(() => {
          const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
          setLastSynced(timeStr);
          setStoredLastSynced(timeStr);
          showToast('บันทึกแผนงบประมาณและส่งเข้า Google Sheets เรียบร้อย', 'success');
        })
        .finally(() => setIsSyncing(false));
    } else {
      showToast('บันทึกแผนงบประมาณเรียบร้อย', 'success');
    }
  };

  // Handler: Add savings deposit
  const handleAddSavingDeposit = async (
    goalId: string,
    amount: number,
    depositDate: string,
    note?: string
  ) => {
    const updatedSavings = savings.map((g) => {
      if (g.id === goalId) {
        const depositEntry = {
          id: `sh-${Date.now()}`,
          amount,
          date: depositDate,
          note,
          createdAt: Date.now(),
        };
        return {
          ...g,
          currentAmount: (Number(g.currentAmount) || 0) + amount,
          history: [depositEntry, ...(g.history || [])],
        };
      }
      return g;
    });

    setSavings(updatedSavings);

    // Also auto-record savings deposits under the renamed category
    const targetGoal = savings.find((g) => g.id === goalId);
    const savingTx: Transaction = {
      id: `tx-save-${Date.now()}`,
      type: 'expense',
      category: 'ค่าหนี้สิน',
      title: `ออมเงิน: ${targetGoal?.title || 'เงินเก็บ'}`,
      amount,
      date: depositDate,
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      note: note || 'ตัดยอดเข้าเป้าหมายเงินออม',
      createdAt: Date.now(),
    };

    const nextTransactions = [savingTx, ...transactions];
    setTransactions(nextTransactions);

    if (isGoogleSheetConfigured) {
      setIsSyncing(true);
      sendToGoogleSheet('syncAll', getFullPayload(nextTransactions, budgets, updatedSavings))
        .then(() => {
          const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
          setLastSynced(timeStr);
          setStoredLastSynced(timeStr);
          showToast('บันทึกเงินออมและซิงค์ลง Google Sheet เรียบร้อยแล้ว', 'success');
        })
        .finally(() => setIsSyncing(false));
    } else {
      showToast('บันทึกยอดเงินออมเรียบร้อยแล้ว', 'success');
    }
  };

  // Handler: Create new saving goal
  const handleCreateSavingGoal = async (newGoal: Omit<SavingGoal, 'id' | 'history'>) => {
    const createdGoal: SavingGoal = {
      ...newGoal,
      id: `goal-${Date.now()}`,
      history: newGoal.currentAmount > 0 ? [
        {
          id: `sh-${Date.now()}`,
          amount: newGoal.currentAmount,
          date: new Date().toISOString().split('T')[0],
          note: 'ยอดเงินเริ่มต้น',
          createdAt: Date.now(),
        }
      ] : [],
    };

    const nextSavings = [...savings, createdGoal];
    setSavings(nextSavings);

    if (isGoogleSheetConfigured) {
      setIsSyncing(true);
      sendToGoogleSheet('syncAll', getFullPayload(transactions, budgets, nextSavings))
        .finally(() => setIsSyncing(false));
    }

    showToast(`สร้างเป้าหมาย "${createdGoal.title}" เรียบร้อยแล้ว`, 'success');
  };

  const handleUpdateSavingGoal = async (
    goalId: string,
    updates: Pick<SavingGoal, 'title' | 'targetAmount' | 'monthlyPlan' | 'notes'>,
  ) => {
    const nextSavings = savings.map((goal) => goal.id === goalId ? { ...goal, ...updates } : goal);
    setSavings(nextSavings);

    if (isGoogleSheetConfigured) {
      setIsSyncing(true);
      sendToGoogleSheet('syncAll', getFullPayload(transactions, budgets, nextSavings))
        .finally(() => setIsSyncing(false));
    }

    showToast('แก้ไขเป้าหมายเงินออมเรียบร้อยแล้ว', 'success');
  };

  // Handler: Delete saving goal
  const handleDeleteSavingGoal = async (goalId: string) => {
    const nextSavings = savings.filter((g) => g.id !== goalId);
    setSavings(nextSavings);

    if (isGoogleSheetConfigured) {
      setIsSyncing(true);
      sendToGoogleSheet('syncAll', getFullPayload(transactions, budgets, nextSavings))
        .finally(() => setIsSyncing(false));
    }

    showToast('ลบเป้าหมายเงินออมเรียบร้อยแล้ว', 'info');
  };

  return (
    <div className="min-h-screen relative flex flex-col bg-snow-drift-50 text-celtic-900 selection:bg-apple-200 selection:text-celtic-900">
      {/* Toast notification */}
      {toast && (
        <div className="page-edge-toast fixed top-3 sm:top-5 sm:max-w-96 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl glass-island text-gray-900 text-sm animate-in slide-in-from-top-4 duration-200">
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-amber-600 shrink-0" />}
          <span className="min-w-0 flex-1 break-words">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="p-1 text-gray-400 hover:text-gray-700 ml-2 rounded-lg"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Header with Navigation Tabs */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        spreadsheetUrl={DEFAULT_SPREADSHEET_URL}
        onExportStatement={handleExportMonthlyStatement}
      />

      {/* Main Container */}
      <main className="relative z-10 min-w-0 flex-1 max-w-5xl w-full mx-auto page-gutter-x pt-5 pb-28 lg:pb-12">
        {activeTab === 'summary' && (
          <ExpenseSummaryView
            transactions={transactions}
            onNavigateToBudget={() => setActiveTab('budget')}
            onNavigateToAdd={() => setActiveTab('add')}
            onNavigateToHistory={() => {
              setActiveTab('history');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeTab === 'add' && (
          <AddTransactionView
            onAddTransaction={handleAddTransaction}
            budgets={budgets}
            currentTransactions={transactions}
          />
        )}

        {activeTab === 'budget' && (
          <BudgetPlanningView
            budgets={budgets}
            onUpdateBudgets={handleUpdateBudgets}
            isSyncing={isSyncing}
          />
        )}

        {activeTab === 'savings' && (
          <SavingsView
            savings={savings}
            onAddSavingDeposit={handleAddSavingDeposit}
            onCreateSavingGoal={handleCreateSavingGoal}
            onUpdateSavingGoal={handleUpdateSavingGoal}
            onDeleteSavingGoal={handleDeleteSavingGoal}
            isSyncing={isSyncing}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            transactions={transactions}
            budgets={budgets}
            onDeleteTransaction={handleDeleteTransaction}
            onOpenUndoModal={() => setIsUndoModalOpen(true)}
            isSyncing={isSyncing}
          />
        )}
      </main>

      {/* Mobile Navigation Bar */}
      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Undo Modal */}
      <UndoModal
        isOpen={isUndoModalOpen}
        onClose={() => setIsUndoModalOpen(false)}
        onConfirm={handleConfirmUndoLatest}
        latestTransaction={latestTransaction}
        isProcessing={isUndoing}
      />

      {/* Google Sheets Settings Modal */}
      <GoogleSheetModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setScriptUrl(getStoredScriptUrl());
          setIsSettingsOpen(false);
        }}
        onSyncAll={syncAllToGoogleSheet}
        onFetchFromSheet={handleFetchFromSheet}
        isSyncing={isSyncing}
      />
    </div>
  );
}
