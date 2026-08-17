import { type ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface DataTableProps {
  children: ReactNode;
  className?: string;
}

export function DataTable({ children, className }: DataTableProps) {
  return (
    <div className={cn('overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700', className)}>
      <table className="w-full text-left border-collapse">
        {children}
      </table>
    </div>
  );
}

interface DataTableHeaderProps {
  children: ReactNode;
  className?: string;
}

export function DataTableHeader({ children, className }: DataTableHeaderProps) {
  return (
    <thead className={cn('bg-slate-50 dark:bg-slate-800/50', className)}>
      {children}
    </thead>
  );
}

interface DataTableRowProps {
  children: ReactNode;
  className?: string;
}

export function DataTableRow({ children, className }: DataTableRowProps) {
  return (
    <tr className={cn('border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors', className)}>
      {children}
    </tr>
  );
}

interface DataTableCellProps {
  children: ReactNode;
  className?: string;
}

export function DataTableCell({ children, className }: DataTableCellProps) {
  return (
    <td className={cn('px-4 py-3 text-xs font-medium text-slate-600 dark:text-slate-300', className)}>
      {children}
    </td>
  );
}

interface DataTableHeadProps {
  children: ReactNode;
  className?: string;
}

export function DataTableHead({ children, className }: DataTableHeadProps) {
  return (
    <th className={cn('px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500', className)}>
      {children}
    </th>
  );
}
