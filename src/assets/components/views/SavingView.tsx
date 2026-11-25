import React, { useEffect, useState } from 'react';
import { 
  PiggyBank, 
  Plus, 
  Target, 
  Check, 
  Trash2, 
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import { SavingGoal, Transaction } from '../../utils/finance.ts';
import { ParliamentChart } from '../ParliamentChart.tsx';
import { AnimatedNumber } from '../AnimatedNumber.tsx';

interface SavingsViewProps {
  savings: SavingGoal[];
  onAddSavingDeposit: (goalId: string, amount: number, date: string, note?: string) => Promise<void>;
  onCreateSavingGoal: (newGoal: Omit<SavingGoal, 'id' | 'history'>) => Promise<void>;
  onDeleteSavingGoal: (goalId: string) => Promise<void>;
  isSyncing: boolean;
}

type SavingsPage = 'overview' | 'goals' | 'create';

export const SavingsView: React.FC<SavingsViewProps> = ({
  savings,
  onAddSavingDeposit,
  onCreateSavingGoal,
  onDeleteSavingGoal,
  isSyncing,
}) => {
  // Deposit modal state
  const [selectedGoalId, setSelectedGoalId] = useState<string>(savings[0]?.id || '');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDate, setDepositDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [depositNote, setDepositNote] = useState('');
  const [isDepositSubmitting, setIsDepositSubmitting] = useState(false);
  const [depositSuccessMsg, setDepositSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!savings.some((goal) => goal.id === selectedGoalId)) {
      setSelectedGoalId(savings[0]?.id || '');
    }
  }, [savings, selectedGoalId]);

  // Create Goal form state
  const [activePage, setActivePage] = useState<SavingsPage>('overview');
  const [newTitle, setNewTitle] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newInitial, setNewInitial] = useState('');
  const [newMonthlyPlan, setNewMonthlyPlan] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [showTotalTarget, setShowTotalTarget] = useState(false);

  // Total accumulated savings
  const totalAccumulatedSavings = savings.reduce((sum, g) => sum + (Number(g.currentAmount) || 0), 0);
  const totalTargetSavings = savings.reduce((sum, g) => sum + (Number(g.targetAmount) || 0), 0);
  const overallPercentage = totalTargetSavings > 0 
    ? Math.min(100, Math.round((totalAccumulatedSavings / totalTargetSavings) * 100)) 
    : 0;

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(depositAmount);
    if (!selectedGoalId || isNaN(amount) || amount <= 0) return;

    try {
      setIsDepositSubmitting(true);
      await onAddSavingDeposit(selectedGoalId, amount, depositDate, depositNote.trim() || undefined);
      setDepositAmount('');
      setDepositNote('');
      setDepositSuccessMsg('บันทึกเงินออมและตัดยอดเข้าบัญชีเรียบร้อยแล้ว!');
      setTimeout(() => setDepositSuccessMsg(null), 3500);
    } finally {
      setIsDepositSubmitting(false);
    }
  };

  const handleCreateGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(newTarget);
    const initial = parseFloat(newInitial) || 0;
    const monthly = parseFloat(newMonthlyPlan) || 0;

    if (!newTitle.trim() || isNaN(target) || target <= 0) return;

    await onCreateSavingGoal({
      title: newTitle.trim(),
      targetAmount: target,
      currentAmount: initial,
      monthlyPlan: monthly,
      notes: newNotes.trim() || undefined,
    });

    setNewTitle('');
    setNewTarget('');
    setNewInitial('');
    setNewMonthlyPlan('');
    setNewNotes('');
    setActivePage('goals');
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-2 pb-8">
      {/* Savings header and page shortcuts */}
      <div className="glass-card flex items-center justify-between gap-3 rounded-3xl p-4 sm:p-5">
        <div className="flex min-w-0 items-center gap-2">
          {activePage !== 'overview' && (
            <button
              type="button"
              onClick={() => setActivePage('overview')}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-snow-drift-100 text-celtic-800 hover:bg-snow-drift-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-300"
              aria-label="กลับหน้าสรุปเงินออม"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <h1 className="min-w-0 text-lg font-medium leading-tight text-celtic-900 sm:text-xl">
            {activePage === 'overview' ? 'เงินออม' : activePage === 'goals' ? 'รายการเป้าหมายเงินออมทั้งหมด' : 'ตั้งเป้าหมายเงินออมใหม่'}
          </h1>
        </div>
        {activePage === 'overview' && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setActivePage('goals')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-snow-drift-100 text-celtic-900 transition-colors hover:bg-apple-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-300"
              aria-label="ไปหน้ารายการเป้าหมายเงินออมทั้งหมด"
              title="รายการเป้าหมายเงินออมทั้งหมด"
            >
              <Target className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setActivePage('create')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-apple-200 text-celtic-900 transition-colors hover:bg-apple-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-300"
              aria-label="ไปหน้าตั้งเป้าหมายเงินออมใหม่"
              title="ตั้งเป้าหมายเงินออมใหม่"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {activePage === 'overview' && <>
      {/* Savings Summary Banner */}
      <div className="rounded-3xl p-2 text-celtic-900 sm:p-6">
        <div className="flex flex-col items-center gap-3">
          <ParliamentChart
            className="max-w-96"
            percentage={overallPercentage}
            ariaLabel={`ออมได้ ${overallPercentage}% จากเป้าหมายรวม`}
          >
              <button
                type="button"
                onClick={() => setShowTotalTarget((current) => !current)}
                className="flex flex-col items-center rounded-2xl p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-300"
                aria-label="สลับระหว่างยอดออมสะสมรวมกับเป้าหมายรวม"
                aria-pressed={showTotalTarget}
              >
                <span className="text-base font-medium text-celtic-700 hover:text-apple-400">
                  {showTotalTarget ? 'เป้าหมายรวมทุกเป้าหมาย' : 'ยอดเงินออมสะสมรวม'}
                </span>
                <span className="font-onest mt-1 text-5xl font-bold text-celtic-900">
                  {(showTotalTarget ? totalTargetSavings : totalAccumulatedSavings).toLocaleString('th-TH')}
                </span>
                <span className="mt-4 text-sm font-normal text-celtic-800">
                  คิดเป็น <AnimatedNumber value={overallPercentage} suffix="%" maximumFractionDigits={0} />
                </span>
              </button>
          </ParliamentChart>
        </div>
      </div>

      {/* Quick Deposit Form */}
      <div className="glass-card p-6 rounded-3xl border border-white/80 shadow-xs">

        <form onSubmit={handleDepositSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Target Goal Selector */}
            <div>
              <label htmlFor="goal-select" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                เป้าหมายที่ต้องการออม *
              </label>
              <select
                id="goal-select"
                required
                value={selectedGoalId}
                onChange={(e) => setSelectedGoalId(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {savings.length === 0 && <option value="">(ยังไม่มีเป้าหมาย - โปรดสร้างเป้าหมายก่อน)</option>}
                {savings.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title} (สะสมแล้ว{g.currentAmount.toLocaleString('th-TH')} )
                  </option>
                ))}
              </select>
            </div>
            {/* Deposit Amount */}
            <div>
              <label htmlFor="deposit-amount" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                จำนวนเงินที่ต้องการออม (บาท) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm"></span>
                <input
                  id="deposit-amount"
                  type="number"
                  min="1"
                  required
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="เช่น 1000, 5000"
                  className="w-full pl-2 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Note & Submit */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
            <input
              type="text"
              value={depositNote}
              onChange={(e) => setDepositNote(e.target.value)}
              placeholder="บันทึกข้อความช่วยจำ (ถ้ามี เช่น เงินโบนัส, ประจำเดือน)"
              className="flex-1 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl font-normal text-gray-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none w-full"
            />
            <button
              type="submit"
              disabled={isDepositSubmitting || savings.length === 0}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Check className="w-4 h-4" />
              {isDepositSubmitting ? 'กำลังบันทึก...' : 'บันทึกยอดเงินออม'}
            </button>
          </div>

          {depositSuccessMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              {depositSuccessMsg}
            </div>
          )}
        </form>
      </div>
      </>}

      {/* New goal page */}
      {activePage === 'create' && (
        <section className="glass-card rounded-3xl p-5 sm:p-6" aria-labelledby="create-saving-goal-title">
          <form onSubmit={handleCreateGoalSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  ชื่อเป้าหมาย *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="เช่น ทริปเที่ยว, เงินดาวน์บ้าน, สำรองฉุกเฉิน"
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg text-gray-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  จำนวนเงินเป้าหมายรวม (บาท) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  placeholder="เช่น 50000"
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg text-gray-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none font-onest"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  ยอดเงินเริ่มต้นที่มีอยู่แล้ว (ถ้ามี)
                </label>
                <input
                  type="number"
                  min="0"
                  value={newInitial}
                  onChange={(e) => setNewInitial(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg text-gray-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none font-onest"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  แผนออมต่อเดือน (บาท)
                </label>
                <input
                  type="number"
                  min="0"
                  value={newMonthlyPlan}
                  onChange={(e) => setNewMonthlyPlan(e.target.value)}
                  placeholder="เช่น 3000"
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg text-gray-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none font-onest"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                หมายเหตุหรือรายละเอียดเพิ่มเติม
              </label>
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="เช่น บัญชีธนาคารกสิกร, ดอกเบี้ย 1.5%..."
                className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActivePage('overview')}
                className="rounded-full px-4 py-2.5 text-sm font-medium text-celtic-700 hover:bg-snow-drift-100 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="rounded-full bg-apple-300 px-5 py-2.5 text-sm font-medium text-celtic-900 transition-colors hover:bg-apple-400"
              >
                สร้างเป้าหมาย
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Goals page */}
      {activePage === 'goals' && <section className="space-y-4" aria-labelledby="all-saving-goals-title">
        <div>
          <h2 id="all-saving-goals-title" className="text-base font-medium text-celtic-900">
            รายการเป้าหมายเงินออมทั้งหมด ({savings.length})
          </h2>
          {savings.length > 1 && <p className="mt-1 text-xs text-celtic-700">เลื่อนแนวนอนเพื่อดูเป้าหมายอื่น</p>}
        </div>

        {savings.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-gray-200">
            <PiggyBank className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-700">ยังไม่มีเป้าหมายเงินออม</p>
            <p className="text-xs text-gray-400 mt-1">เริ่มต้นสร้างเป้าหมายแรกเพื่อสร้างวินัยทางการเงิน</p>
            <button
              type="button"
              onClick={() => setActivePage('create')}
              className="mt-4 rounded-full bg-apple-200 px-4 py-2.5 text-sm font-medium text-celtic-900 hover:bg-apple-300"
            >
              ตั้งเป้าหมายแรก
            </button>
          </div>
        ) : (
          <div
            className={savings.length > 1
              ? 'goal-carousel flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-3'
              : 'flex justify-center'}
            role={savings.length > 1 ? 'region' : undefined}
            aria-label={savings.length > 1 ? 'สไลด์เป้าหมายเงินออม' : undefined}
            aria-roledescription={savings.length > 1 ? 'carousel' : undefined}
          >
            {savings.map((goal, index) => {
              const progressPct = goal.targetAmount > 0
                ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
                : 0;
              const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

              return (
                <div
                  key={goal.id}
                  role={savings.length > 1 ? 'group' : undefined}
                  aria-roledescription={savings.length > 1 ? 'slide' : undefined}
                  aria-label={savings.length > 1 ? `${index + 1} מתוך ${savings.length}` : undefined}
                  className={`min-w-0 bg-snow-drift-100/70 p-5 rounded-2xl flex flex-col justify-between space-y-4 ${savings.length > 1 ? 'w-[88%] shrink-0 snap-center sm:w-[48%] lg:w-[38%]' : 'w-full max-w-lg'}`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-teal-50 text-teal-800">
                          <Target className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-gray-900">
                            {goal.title}
                          </h3>
                          {goal.notes && (
                            <span className="text-[11px] text-gray-400 block line-clamp-1">
                              {goal.notes}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onDeleteSavingGoal(goal.id)}
                        className="p-1.5 text-gray-300 hover:text-rose-600 rounded-lg transition-colors"
                        title="ลบเป้าหมายนี้"
                        aria-label={`ลบเป้าหมาย ${goal.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Numbers */}
                    <div className="flex items-baseline justify-between mt-3 mb-2">
                      <div>
                        <span className="text-[10px] text-gray-400 block font-medium">สะสมแล้ว</span>
                        <span className="text-lg font-extrabold text-emerald-800 font-onest">
                          {goal.currentAmount.toLocaleString('th-TH')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 block font-medium">เป้าหมาย</span>
                        <span className="text-sm font-bold text-gray-700 font-onest">
                          {goal.targetAmount.toLocaleString('th-TH')}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-500 mt-2">
                      <span className="font-onest">{progressPct}% สำเร็จแล้ว</span>
                      <span className="font-onest">ขาดอีก {remaining.toLocaleString('th-TH')}</span>
                    </div>

                    {goal.monthlyPlan > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-gray-100 text-[11px] text-gray-500 flex justify-between">
                        <span>แผนออมต่อเดือน:</span>
                        <span className="font-onest font-semibold text-gray-700">{goal.monthlyPlan.toLocaleString('th-TH')}</span>
                      </div>
                    )}
                  </div>

                  {/* History Preview */}
                  {goal.history && goal.history.length > 0 && (
                    <div className="pt-2 border-t border-gray-100 space-y-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                        ประวัติการฝากล่าสุด:
                      </span>
                      {goal.history.slice(0, 2).map((h) => (
                        <div key={h.id} className="text-[11px] text-gray-600 flex justify-between">
                          <span>{h.date} {h.note ? `(${h.note})` : ''}</span>
                          <span className="font-onest font-semibold text-emerald-700">+{h.amount.toLocaleString('th-TH')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>}
    </div>
  );
};
