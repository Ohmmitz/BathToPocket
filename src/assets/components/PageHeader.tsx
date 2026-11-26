import React, { type ReactNode } from 'react';

export interface MonthOption {
  value: string;
  label: string;
}

interface PageHeaderProps {
  title: string;
  leading?: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  secondary?: ReactNode;
  inlineTrailing?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, leading, subtitle, trailing, secondary, inlineTrailing = false }) => {
  const inlineWithSecondary = inlineTrailing && Boolean(secondary);
  const layoutClass = inlineTrailing
    ? `grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 ${inlineWithSecondary ? 'sm:grid-cols-[minmax(0,1fr)_auto_auto]' : 'sm:grid-cols-[minmax(0,1fr)_auto]'}`
    : 'flex flex-col justify-center gap-3 sm:flex-row sm:items-center sm:justify-between';

  return (
    <header className={`glass-card min-h-[72px] min-w-0 rounded-3xl p-4 sm:min-h-[80px] sm:p-5 ${layoutClass}`}>
      <div className="flex min-w-0 items-center gap-3">
        {leading}
        <div className="min-w-0">
          <h1 className={`${inlineTrailing ? 'text-lg sm:text-xl' : 'text-xl'} font-bold leading-tight tracking-tight text-celtic-900`}>{title}</h1>
          {subtitle && <div className="mt-1 text-sm leading-snug text-celtic-700">{subtitle}</div>}
        </div>
      </div>
      {trailing && (
        <div className={`flex min-w-0 items-center justify-end ${inlineTrailing ? `col-start-2 row-start-1 shrink-0 ${inlineWithSecondary ? 'sm:col-start-3' : ''}` : 'w-full sm:w-auto sm:shrink-0'}`}>
          {trailing}
        </div>
      )}
      {secondary && (
        <div className={`flex min-w-0 items-center ${inlineWithSecondary ? 'col-span-2 row-start-2 sm:col-span-1 sm:col-start-2 sm:row-start-1' : ''}`}>
          {secondary}
        </div>
      )}
    </header>
  );
};

interface MonthSelectorProps {
  id: string;
  value: string;
  options: MonthOption[];
  onChange: (value: string) => void;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({ id, value, options, onChange }) => (
  <div className="flex w-full min-w-0 items-center justify-between gap-3 sm:w-auto sm:justify-end">
    <label htmlFor={id} className="shrink-0 text-sm font-medium text-celtic-700">
      ของเดือน
    </label>
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-w-0 max-w-[70vw] rounded-xl border-0 bg-snow-drift-100 px-3 py-2 text-sm font-medium text-celtic-900 focus:outline-none focus:ring-2 focus:ring-apple-300 sm:max-w-none"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  </div>
);
