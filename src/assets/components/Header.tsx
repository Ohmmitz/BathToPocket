import React from 'react';
import brandLogo from '../favicon.svg';
import { 
  PieChart, 
  Plus, 
  Target, 
  PiggyBank, 
  History, 
} from 'lucide-react';

export type TabType = 'summary' | 'add' | 'budget' | 'savings' | 'history';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  balance: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  balance,
}) => {
  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'summary', label: 'สรุปงบ', icon: <PieChart className="w-4 h-4" /> },
    { id: 'add', label: 'บันทึกงบ', icon: <Plus className="w-4 h-4" /> },
    { id: 'budget', label: 'แพลนงบ', icon: <Target className="w-4 h-4" /> },
    { id: 'savings', label: 'เงินออม', icon: <PiggyBank className="w-4 h-4" /> },
    { id: 'history', label: 'ดูประวัติ', icon: <History className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-30 glass-surface border-b border-white/70 shadow-xs transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl overflow-hidden">
              <img src={brandLogo} alt="" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-onest font-bold text-gray-900 text-base tracking-tight leading-tight">
                  BahtToPocket
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Tabs - Liquid Glass Segmented Bar */}
          <nav 
            className="hidden md:flex items-center gap-1 bg-white backdrop-blur-md p-1.5 rounded-full" 
            aria-label="เมนูหลัก"
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-white/95 text-emerald-800 shadow-sm shadow-emerald-950/5 border border-emerald-500/20 font-bold scale-[1.02]'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/40'
                  }`}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className={isActive ? 'text-emerald-600' : 'text-gray-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Balance Preview */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Balance Preview */}
            <div className="flex flex-col items-end px-3.5 py-1">
              <span className="text-[10px] text-gray-500 font-medium">ยอดคงเหลือ</span>
              <span className={`font-onest text-sm font-extrabold ${balance >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {balance.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

/**
 * Mobile navigation with icon-only buttons.
 */
export const MobileNav: React.FC<{ activeTab: TabType; setActiveTab: (tab: TabType) => void }> = ({
  activeTab,
  setActiveTab,
}) => {
  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'summary', label: 'สรุปค่าใช้จ่าย', icon: <PieChart className="w-5 h-5" /> },
    { id: 'budget', label: 'แพลนงบประมาณ', icon: <Target className="w-5 h-5" /> },
    { id: 'add', label: 'บันทึกค่าใช้จ่าย', icon: <Plus className="w-5 h-5" /> },
    { id: 'savings', label: 'เงินออม', icon: <PiggyBank className="w-5 h-5" /> },
    { id: 'history', label: 'ประวัติค่าใช้จ่าย', icon: <History className="w-5 h-5" /> },
  ];

  return (
    <nav 
      aria-label="เมนูหลักสำหรับมือถือ" 
      className="md:hidden fixed bottom-8 left-1/2 -translate-x-1/2 z-40 w-[80%] max-w-[320px]"
    >
      {/* One evenly spaced row of icon-only navigation buttons */}
      <div className="glass-island rounded-full px-2 py-1.5 flex items-center justify-around">
        {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 ${
                  isActive
                    ? 'bg-black text-white shadow-md'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-white/40'
                }`}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                title={item.label}
              >
                {item.icon}
              </button>
            );
        })}
      </div>
    </nav>
  );
};
