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
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'summary', label: 'สรุปงบ', icon: <PieChart className="w-4 h-4" /> },
    { id: 'add', label: 'บันทึกงบ', icon: <Plus className="w-4 h-4" /> },
    { id: 'budget', label: 'แพลนงบ', icon: <Target className="w-4 h-4" /> },
    { id: 'savings', label: 'เงินออม', icon: <PiggyBank className="w-4 h-4" /> },
    { id: 'history', label: 'ดูประวัติ', icon: <History className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-30 glass-surface transition-colors">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden">
              <img src={brandLogo} alt="" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-onest text-gray-900 text-lg font-black tracking-tight leading-tight">
                  BahtToPocket
                </span>
              </div>
            </div>
          </div>
          {/* Desktop Navigation Tabs - Liquid Glass Segmented Bar */}
          <nav 
            className="hidden md:flex items-center gap-1 bg-snow-drift-100 p-1 rounded-full" 
            aria-label="เมนูหลัก"
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors duration-200 ${
                    isActive
                      ? 'bg-apple-200 text-celtic-900'
                      : 'text-celtic-700 hover:text-celtic-900 hover:bg-snow-drift-50'
                  }`}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className={isActive ? 'text-celtic-900' : 'text-celtic-700'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
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
      className="md:hidden fixed bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-[360px]"
    >
      {/* One evenly spaced row of icon-only navigation buttons */}
      <div className="glass-island rounded-full px-1.5 py-1.5 flex items-center justify-around bg-snow-drift-100">
        {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative min-w-0 flex-1 h-11 mx-0.5 rounded-full flex items-center justify-center transition-colors duration-200 active:scale-95 ${
                  isActive
                    ? 'bg-apple-200 text-celtic-900'
                    : 'text-celtic-700 hover:text-celtic-900 hover:bg-snow-drift-50'
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
