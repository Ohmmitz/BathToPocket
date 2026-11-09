import React, { useState } from 'react';
import { 
  PiggyBank, 
  Plus, 
  Target, 
  Calendar, 
  TrendingUp, 
  Check, 
  Trash2, 
  Clock, 
  ArrowUpRight,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { SavingGoal, Transaction } from '../../utils/finance.ts';

interface SavingsViewProps {
  savings: SavingGoal[];
  onAddSavingDeposit: (goalId: string, amount: number, date: string, note?: string) => Promise<void>;
  onCreateSavingGoal: (newGoal: Omit<SavingGoal, 'id' | 'history'>) => Promise<void>;
  onDeleteSavingGoal: (goalId: string) => Promise<void>;
  isSyncing: boolean;
}

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

  // Create Goal form state
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newInitial, setNewInitial] = useState('');
  const [newMonthlyPlan, setNewMonthlyPlan] = useState('');
  const [newNotes, setNewNotes] = useState('');

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

    setIsCreatingGoal(false);
    setNewTitle('');
    setNewTarget('');
    setNewInitial('');
    setNewMonthlyPlan('');
    setNewNotes('');
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Header Card */}
      <div className="glass-card p-5.5 rounded-3xl border border-white/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-2xl bg-teal-500/15 text-teal-800 border border-teal-300/40 shadow-2xs">
              <PiggyBank className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              เงินออม & เป้าหมายเงินเก็บ
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            บันทึกเงินออมประจำเดือน ติดตามเป้าหมาย และสร้างความมั่นคงทางการเงิน
          </p>
        </div>

        <button
          onClick={() => setIsCreatingGoal(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-700/20"
        >
          <Plus className="w-4 h-4" />
          สร้างเป้าหมายออมเงินใหม่
        </button>
      </div>

      {/* Savings Summary Banner */}
      <div className="bg-gradient-to-br from-emerald-800 to-teal-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden border border-white/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-xs uppercase font-medium tracking-wider text-emerald-200">
              ยอดเงินออมสะสมรวมทุกเป้าหมาย
            </span>
            <div className="font-onest text-3xl sm:text-4xl font-extrabold tracking-tight mt-1 text-white">
              {totalAccumulatedSavings.toLocaleString('th-TH')}-.
            </div>
            <span className="text-xs text-emerald-200/80 mt-1 block">
              จากเป้าหมายรวม <span className="font-onest">{totalTargetSavings.toLocaleString('th-TH')} -.</span>
            </span>
          </div>

          <div className="w-full md:w-64 space-y-2">
            <div className="flex justify-between text-xs font-medium text-emerald-100">
              <span>ความคืบหน้ารวม</span>
              <span className="font-onest font-bold">{overallPercentage}%</span>
            </div>
            <div className="w-full bg-emerald-950/60 rounded-full h-3 overflow-hidden p-0.5 border border-emerald-600/30">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500 shadow-sm shadow-emerald-400/50"
                style={{ width: `${overallPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Deposit Form */}
      <div className="glass-card p-6 rounded-3xl border border-white/80 shadow-xs">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-800 flex items-center justify-center shadow-2xs border border-emerald-300/40">
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <h2 className="text-base font-bold text-gray-900">
            บันทึกเงินออมประจำเดือนนี้
          </h2>
        </div>

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
                    {g.title} (สะสมแล้ว{g.currentAmount.toLocaleString('th-TH')} -.)
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
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">-.</span>
                <input
                  id="deposit-amount"
                  type="number"
                  min="1"
                  required
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="เช่น 1000, 5000"
                  className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-onest"
                />
              </div>
            </div>

            {/* Deposit Date */}
            <div>
              <label htmlFor="deposit-date" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                วันที่ฝากออม
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="deposit-date"
                  type="date"
                  value={depositDate}
                  onChange={(e) => setDepositDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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

      {/* Create New Goal Modal / Accordion */}
      {isCreatingGoal && (
        <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-200 shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-bold text-emerald-950">
                ตั้งเป้าหมายเงินออมใหม่
              </h3>
            </div>
            <button
              onClick={() => setIsCreatingGoal(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              ยกเลิก
            </button>
          </div>

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
                onClick={() => setIsCreatingGoal(false)}
                className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-xs"
              >
                สร้างเป้าหมาย
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Goals Cards List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-gray-900">
          รายการเป้าหมายเงินออมทั้งหมด ({savings.length})
        </h2>

        {savings.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-gray-200">
            <PiggyBank className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-700">ยังไม่มีเป้าหมายเงินออม</p>
            <p className="text-xs text-gray-400 mt-1">เริ่มต้นสร้างเป้าหมายแรกเพื่อสร้างวินัยทางการเงิน</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savings.map((goal) => {
              const progressPct = goal.targetAmount > 0
                ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
                : 0;
              const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

              return (
                <div
                  key={goal.id}
                  className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between space-y-4 hover:border-gray-200 transition-all"
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
                          {goal.currentAmount.toLocaleString('th-TH')}-.
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 block font-medium">เป้าหมาย</span>
                        <span className="text-sm font-bold text-gray-700 font-onest">
                          {goal.targetAmount.toLocaleString('th-TH')}-.
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
                      <span className="font-onest">ขาดอีก {remaining.toLocaleString('th-TH')}-.</span>
                    </div>

                    {goal.monthlyPlan > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-gray-100 text-[11px] text-gray-500 flex justify-between">
                        <span>แผนออมต่อเดือน:</span>
                        <span className="font-onest font-semibold text-gray-700">{goal.monthlyPlan.toLocaleString('th-TH')}-.</span>
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
                          <span className="font-onest font-semibold text-emerald-700">+{h.amount.toLocaleString('th-TH')}-.</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
