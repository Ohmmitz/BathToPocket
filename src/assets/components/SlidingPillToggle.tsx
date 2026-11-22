import React, { useLayoutEffect, useRef, useState } from 'react';

interface SlidingPillOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SlidingPillToggleProps {
  value: string;
  options: SlidingPillOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
  pillClassName?: string;
  activeTextClassName?: string;
  inactiveTextClassName?: string;
}

export const SlidingPillToggle: React.FC<SlidingPillToggleProps> = ({
  value,
  options,
  onChange,
  ariaLabel,
  className = '',
  pillClassName = 'bg-apple-200',
  activeTextClassName = 'text-celtic-900',
  inactiveTextClassName = 'text-celtic-700',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false });
  const activeIndex = options.findIndex((option) => option.value === value);
  const optionsKey = options.map((option) => option.value).join('|');

  useLayoutEffect(() => {
    const updatePill = () => {
      const button = buttonRefs.current[activeIndex];
      const container = containerRef.current;
      if (!button || !container) return;
      const buttonRect = button.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      setPill({ left: buttonRect.left - containerRect.left, width: buttonRect.width, ready: true });
    };

    updatePill();
    const observer = new ResizeObserver(updatePill);
    if (containerRef.current) observer.observe(containerRef.current);
    buttonRefs.current.forEach((button) => button && observer.observe(button));
    window.addEventListener('resize', updatePill);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updatePill);
    };
  }, [activeIndex, optionsKey]);

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center rounded-full bg-snow-drift-100 p-1.5 ${className}`}
      role="group"
      aria-label={ariaLabel}
    >
      <span
        aria-hidden="true"
        className={`sliding-pill-indicator pointer-events-none absolute inset-y-1.5 rounded-full transition-[left,width,background-color] duration-400 ease-[cubic-bezier(0.65,0,0.35,1)] ${pillClassName}`}
        style={{ left: pill.left, width: pill.width, opacity: pill.ready ? 1 : 0 }}
      />
      {options.map((option, index) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            ref={(element) => { buttonRefs.current[index] = element; }}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
            className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${isActive ? activeTextClassName : inactiveTextClassName}`}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
