import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import brandLogo from '../favicon.svg';
import { 
  PieChart, 
  Plus, 
  Target, 
  PiggyBank, 
  FileSpreadsheet,
  FileDown,
} from 'lucide-react';

export type TabType = 'summary' | 'add' | 'budget' | 'savings' | 'history';

type NavItem = { id: TabType; label: string; icon: React.ReactNode };

function useScrollVisibility() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let previousScrollY = window.scrollY;
    let accumulatedDelta = 0;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY <= 24) {
        setIsVisible(true);
        accumulatedDelta = 0;
      } else {
        const delta = currentScrollY - previousScrollY;
        if (delta !== 0) {
          accumulatedDelta = Math.sign(delta) === Math.sign(accumulatedDelta)
            ? accumulatedDelta + delta
            : delta;
          if (accumulatedDelta > 8) setIsVisible(false);
          if (accumulatedDelta < -8) setIsVisible(true);
        }
      }
      previousScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return isVisible;
}

function useSlidingPill(activeTab: TabType, items: NavItem[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false });
  const activeIndex = items.findIndex((item) => item.id === activeTab);

  useLayoutEffect(() => {
    if (activeIndex < 0) {
      setPill((current) => ({ ...current, ready: false }));
      return;
    }
    const updatePill = () => {
      const button = buttonRefs.current[activeIndex];
      if (!button) return;
      setPill({ left: button.offsetLeft, width: button.offsetWidth, ready: true });
    };
    updatePill();
    const observer = new ResizeObserver(updatePill);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', updatePill);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updatePill);
    };
  }, [activeIndex]);

  return { containerRef, buttonRefs, pill };
}

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  spreadsheetUrl: string;
  onExportStatement: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  spreadsheetUrl,
  onExportStatement,
}) => {
  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'summary', label: 'สรุปงบ', icon: <PieChart className="w-4 h-4" /> },
    { id: 'budget', label: 'แพลนงบ', icon: <Target className="w-4 h-4" /> },
    { id: 'savings', label: 'เงินออม', icon: <PiggyBank className="w-4 h-4" /> },
  ];
  const { containerRef, buttonRefs, pill } = useSlidingPill(activeTab, navItems);

  return (
    <header className="sticky top-4 z-30 bg-transparent">
      <div className="mx-auto max-w-5xl page-gutter-x">
        <div className="grid h-16 grid-cols-[1fr_auto] items-center gap-3 sm:h-16 lg:h-16 lg:grid-cols-[auto_1fr_auto]">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full">
              <img src={brandLogo} alt="" className="w-full h-full object-cover" />
            </div>
            <span className="hidden font-onest text-lg font-black leading-tight tracking-tight text-celtic-900 lg:inline">
              BahtToPocket
            </span>
          </div>
          {/* Desktop Navigation Tabs - Liquid Glass Segmented Bar */}
          <nav 
            ref={containerRef}
            className="navbar-glass relative hidden w-fit items-center justify-center justify-self-center gap-1 rounded-full p-1 lg:flex"
            aria-label="เมนูหลัก"
          >
            <span
              aria-hidden="true"
              className="sliding-pill-indicator pointer-events-none absolute top-1 bottom-1 rounded-full bg-celtic-900 transition-[left,width] duration-400 ease-[cubic-bezier(0.65,0,0.35,1)]"
              style={{ left: pill.left, width: pill.width, opacity: pill.ready ? 1 : 0 }}
            />
            {navItems.map((item, index) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  ref={(element) => { buttonRefs.current[index] = element; }}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative z-10 flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors duration-200 ${
                    isActive
                      ? 'text-snow-drift-50'
                      : 'text-celtic-700 hover:text-celtic-900 hover:bg-snow-drift-50'
                  }`}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className={isActive ? 'text-snow-drift-50' : 'text-celtic-700'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="flex items-center justify-end gap-1.5 sm:gap-2">
            <a
              href={spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 w-12 bg-snow-drift-50 items-center justify-center rounded-full text-celtic-800 transition-colors hover:bg-snow-drift-100 hover:text-celtic-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-300"
              aria-label="เปิด Google Sheets"
              title="เปิด Google Sheets"
            >
              <FileSpreadsheet className="h-6 w-6" />
            </a>
            <button
              type="button"
              onClick={onExportStatement}
              className="flex h-12 w-12 bg-snow-drift-50 items-center justify-center rounded-full text-celtic-800 transition-colors hover:bg-snow-drift-200 hover:text-celtic-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-300"
              aria-label="ส่งออกรายงานรายรับรายจ่ายเป็น PDF"
              title="ส่งออกรายงาน PDF"
            >
              <FileDown className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('add')}
              className={`hidden h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-400 lg:flex ${activeTab === 'add' ? 'bg-celtic-900 text-snow-drift-50 hover:bg-celtic-800' : 'bg-apple-400 text-celtic-900 hover:bg-apple-300'}`}
              aria-label="บันทึกงบ"
              aria-current={activeTab === 'add' ? 'page' : undefined}
            >
              <Plus className="h-5 w-5" />
              <span>บันทึกงบ</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

/**
 * Mobile navigation with icon-only buttons.
 */
export const MobileNav: React.FC<{ activeTab: TabType; setActiveTab: (tab: TabType) => void }> = ({ activeTab, setActiveTab }) => {
  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'summary', label: 'สรุปค่าใช้จ่าย', icon: <PieChart className="w-6 h-6" /> },
    { id: 'budget', label: 'แพลนงบประมาณ', icon: <Target className="w-6 h-6" /> },
    { id: 'savings', label: 'เงินออม', icon: <PiggyBank className="w-6 h-6" /> },
  ];
  const { containerRef, buttonRefs, pill } = useSlidingPill(activeTab, navItems);
  const isVisible = useScrollVisibility();

  return (
    <div className={`mobile-nav-gutter fixed bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] z-40 transition-all duration-300 ease-in-out will-change-transform lg:hidden ${isVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'}`}>
      <div className="flex items-center gap-2">
        <nav aria-label="เมนูหลักสำหรับมือถือ" className="min-w-0 flex-1">
          <div className="navbar-glass rounded-full p-1.5">
            <div ref={containerRef} className="relative flex w-full items-center">
              <span
                aria-hidden="true"
                className="sliding-pill-indicator pointer-events-none absolute inset-y-0 rounded-full bg-celtic-900 transition-[left,width] duration-400 ease-[cubic-bezier(0.65,0,0.35,1)]"
                style={{ left: pill.left, width: pill.width, opacity: pill.ready ? 1 : 0 }}
              />
              {navItems.map((item, index) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    ref={(element) => { buttonRefs.current[index] = element; }}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`relative z-10 mx-0.5 flex h-11 min-w-0 flex-1 items-center justify-center rounded-full transition-colors duration-200 active:scale-95 ${
                      isActive
                        ? 'text-snow-drift-50'
                        : 'text-celtic-700 hover:bg-snow-drift-50 hover:text-celtic-900'
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
          </div>
        </nav>
        <button
          type="button"
          onClick={() => setActiveTab('add')}
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-400 ${activeTab === 'add' ? 'bg-celtic-900 text-snow-drift-50 hover:bg-celtic-800' : 'bg-apple-400 text-celtic-900 hover:bg-apple-300'}`}
          aria-label="บันทึกงบ"
          aria-current={activeTab === 'add' ? 'page' : undefined}
          title="บันทึกงบ"
        >
          <Plus className="h-7 w-7" />
        </button>
      </div>
    </div>
  );
};
