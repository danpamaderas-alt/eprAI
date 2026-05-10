import { Outlet } from 'react-router-dom';
import { useThemeStore } from '../store/useThemeStore';
import { Sidebar } from '../shared/components/layout/Sidebar/Sidebar';
import { MobileNav } from '../shared/components/navigation/MobileNav';
import { ThemeToggle } from '../components/ThemeToggle';

export const DashboardLayout = () => {
  const { isDarkMode } = useThemeStore();

  return (
    <div className={`min-h-screen flex ${isDarkMode ? 'dark bg-slate-950' : 'bg-slate-50'}`}>
      
      {/* 🖥️ SIDEBAR DE ESCRITORIO (Lógica de usuario y rutas delegada 100% a este módulo) */}
      <Sidebar />

      {/* 📄 ÁREA PRINCIPAL */}
      <main className="flex-1 h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300 relative">
        
        {/* Toggle flotante (Solo si el diseño lo exige estrictamente aquí) */}
        <div className="absolute top-4 right-4 lg:top-8 lg:right-8 z-40">
          <ThemeToggle />
        </div>

        {/* Contenedor de las vistas inyectadas por React Router */}
        <div className="p-4 pt-20 lg:p-8 lg:pt-8 pb-24 lg:pb-8 max-w-[1600px] mx-auto min-h-full">
          <Outlet />
        </div>
        
      </main>

      {/* 📱 NAVEGACIÓN MÓVIL (Lógica delegada 100% a este módulo) */}
      <MobileNav />

    </div>
  );
};