import { Outlet } from "react-router-dom";
import { useThemeStore } from "../store/useThemeStore";
import { Sidebar } from "../shared/components/layout/Sidebar/Sidebar";
import { MobileNav } from "../shared/components/navigation/MobileNav";
import { ThemeToggle } from "../components/ThemeToggle";
import { Search } from "lucide-react";

export const DashboardLayout = () => {
  const { isDarkMode } = useThemeStore();

  return (
    <div
      className={`min-h-screen flex ${isDarkMode ? "dark bg-slate-950" : "bg-slate-50"}`}
    >
      <Sidebar />

      <main className="flex-1 h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300 relative">
        <div className="absolute top-4 right-4 lg:top-8 lg:right-8 z-40 flex items-center gap-2">
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
            className="flex items-center gap-2 h-8 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ctrl+K</span>
          </button>
          <ThemeToggle />
        </div>

        <div className="p-4 pt-20 lg:p-8 lg:pt-8 pb-24 lg:pb-8 max-w-[1600px] mx-auto min-h-full">
          <Outlet />
        </div>
      </main>

      <MobileNav />
    </div>
  );
};
