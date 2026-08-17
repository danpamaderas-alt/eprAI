import { Download } from 'lucide-react';

interface ExportButtonProps {
  onExportCSV: () => void;
  label?: string;
}

export function ExportButton({ onExportCSV, label = 'Exportar CSV' }: ExportButtonProps) {
  return (
    <button
      type="button"
      onClick={onExportCSV}
      className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 hover:border-blue-300 dark:hover:border-blue-700 transition-all active:scale-95"
    >
      <Download className="w-3 h-3" />
      {label}
    </button>
  );
}
