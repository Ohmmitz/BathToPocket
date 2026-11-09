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
import {
  calculateFinancialSummary,
  getLatestTransaction,
} from './assets/utils/finance.ts';
import type { Transaction, CategoryBudget, SavingGoal } from './assets/utils/finance.ts';
import {
  INITIAL_TRANSACTIONS,
  INITIAL_BUDGETS,
  INITIAL_SAVINGS,
} from './assets/data/initialData.ts';
import {
  getStoredScriptUrl,
  getStoredLastSynced,
  sendToGoogleSheet,
  fetchFromGoogleSheet,
  setStoredLastSynced,
} from './assets/services/googleSheetService.ts';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const STORAGE_KEYS = {
  TRANSACTIONS: 'app_expense_tracker_transactions',
  BUDGETS: 'app_expense_tracker_budgets',
  SAVINGS: 'app_expense_tracker_savings',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('summary');

  // Transactions State
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_TRANSACTIONS;
  });

  // Budgets State
  const [budgets, setBudgets] = useState<CategoryBudget[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BUDGETS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_BUDGETS;
  });

  // Savings State
  const [savings, setSavings] = useState<SavingGoal[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SAVINGS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_SAVINGS;
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

  // Total balance and savings calculation
  const { balance } = useMemo(() => calculateFinancialSummary(transactions), [transactions]);
  const totalSavings = useMemo(() => {
    return savings.reduce((sum, g) => sum + (Number(g.currentAmount) || 0), 0);
  }, [savings]);

  const latestTransaction = useMemo(() => getLatestTransaction(transactions), [transactions]);
  const isGoogleSheetConfigured = Boolean(scriptUrl && scriptUrl.trim());

  // Helper to build payload with both budgets and flattened budgetItems
  const getFullPayload = useCallback(
    (txList = transactions, budgetList = budgets, savingList = savings) => {
      const budgetItems: Array<{ id: string; category: string; name: string; amount: number }> = [];
      for (const b of budgetList) {
        if (Array.isArray(b.items)) {
          for (const item of b.items) {
            budgetItems.push({
              id: item.id,
              category: b.category,
              name: item.name,
              amount: Number(item.amount) || 0,
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
      sendToGoogleSheet('syncAll', {
        transactions,
        budgets: updatedBudgets,
        savings,
      })
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

    // Also auto-record as expense transaction under category 'เงินออม'
    const targetGoal = savings.find((g) => g.id === goalId);
    const savingTx: Transaction = {
      id: `tx-save-${Date.now()}`,
      type: 'expense',
      category: 'เงินออม',
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
      sendToGoogleSheet('syncAll', {
        transactions: nextTransactions,
        budgets,
        savings: updatedSavings,
      })
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
      sendToGoogleSheet('syncAll', {
        transactions,
        budgets,
        savings: nextSavings,
      })
        .finally(() => setIsSyncing(false));
    }

    showToast(`สร้างเป้าหมาย "${createdGoal.title}" เรียบร้อยแล้ว`, 'success');
  };

  // Handler: Delete saving goal
  const handleDeleteSavingGoal = async (goalId: string) => {
    const nextSavings = savings.filter((g) => g.id !== goalId);
    setSavings(nextSavings);

    if (isGoogleSheetConfigured) {
      setIsSyncing(true);
      sendToGoogleSheet('syncAll', {
        transactions,
        budgets,
        savings: nextSavings,
      })
        .finally(() => setIsSyncing(false));
    }

    showToast('ลบเป้าหมายเงินออมเรียบร้อยแล้ว', 'info');
  };

  return (
    <div className="min-h-screen bg-[#F3F8F5] relative flex flex-col text-gray-900 selection:bg-emerald-500 selection:text-white">
      {/* Liquid Glass Ambient Backdrops */}
      <div className="liquid-glass-bg" aria-hidden="true">
        <div className="liquid-glass-blob-1" />
        <div className="liquid-glass-blob-2" />
        <div className="liquid-glass-blob-3" />
      </div>

      {/* Toast Notification with Glass Styling */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4.5 py-3 rounded-2xl glass-island text-gray-900 shadow-xl text-xs font-semibold animate-in slide-in-from-top-4 duration-200 border border-white/90">
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-amber-600 shrink-0" />}
          <span>{toast.message}</span>
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
        balance={balance}
      />

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-5 pb-28 md:pb-12">
        {activeTab === 'summary' && (
          <ExpenseSummaryView
            transactions={transactions}
            budgets={budgets}
            totalSavings={totalSavings}
            onNavigateToBudget={() => setActiveTab('budget')}
            onNavigateToAdd={() => setActiveTab('add')}
          />
        )}

        {activeTab === 'add' && (
          <AddTransactionView
            onAddTransaction={handleAddTransaction}
            budgets={budgets}
            currentTransactions={transactions}
            onOpenUndoModal={() => setIsUndoModalOpen(true)}
            hasTransactionsToUndo={Boolean(latestTransaction)}
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
            onDeleteSavingGoal={handleDeleteSavingGoal}
            isSyncing={isSyncing}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            transactions={transactions}
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
