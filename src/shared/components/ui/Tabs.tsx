import { useState, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab?: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  const [internalActive, setInternalActive] = useState(tabs[0]?.id ?? '');
  const current = activeTab ?? internalActive;

  const handleChange = (id: string) => {
    setInternalActive(id);
    onChange(id);
  };

  return (
    <div className={cn('flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleChange(tab.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex-1 justify-center',
            current === tab.id
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300',
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              'px-1.5 py-0.5 rounded-full text-[9px] font-bold',
              current === tab.id ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500',
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
