import { NavLink } from 'react-router-dom';
import { Home, ShoppingCart, Package, Users, BarChart3 } from 'lucide-react';

export const MobileNav = () => {
  // Clase para el estado activo (cuando estás en esa pantalla)
  const activeClass = "text-blue-600 dark:text-blue-400 scale-110";
  const inactiveClass = "text-slate-400 hover:text-slate-600";

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800 px-6 py-3 flex justify-between items-center z-[100] shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
      
      <NavLink to="/" className={({ isActive }) => `flex flex-col items-center gap-1 transition-all ${isActive ? activeClass : inactiveClass}`}>
        <Home size={20} strokeWidth={isActive ? 3 : 2} />
        <span className="text-[9px] font-black uppercase tracking-tighter">Inicio</span>
      </NavLink>

      <NavLink to="/pos" className={({ isActive }) => `flex flex-col items-center gap-1 transition-all ${isActive ? activeClass : inactiveClass}`}>
        <ShoppingCart size={20} strokeWidth={isActive ? 3 : 2} />
        <span className="text-[9px] font-black uppercase tracking-tighter">Venta</span>
      </NavLink>

      <NavLink to="/inventario" className={({ isActive }) => `flex flex-col items-center gap-1 transition-all ${isActive ? activeClass : inactiveClass}`}>
        <Package size={20} strokeWidth={isActive ? 3 : 2} />
        <span className="text-[9px] font-black uppercase tracking-tighter">Stock</span>
      </NavLink>

      <NavLink to="/crm" className={({ isActive }) => `flex flex-col items-center gap-1 transition-all ${isActive ? activeClass : inactiveClass}`}>
        <Users size={20} strokeWidth={isActive ? 3 : 2} />
        <span className="text-[9px] font-black uppercase tracking-tighter">Clientes</span>
      </NavLink>

      <NavLink to="/analiticas" className={({ isActive }) => `flex flex-col items-center gap-1 transition-all ${isActive ? activeClass : inactiveClass}`}>
        <BarChart3 size={20} strokeWidth={isActive ? 3 : 2} />
        <span className="text-[9px] font-black uppercase tracking-tighter">Radar</span>
      </NavLink>

    </nav>
  );
};