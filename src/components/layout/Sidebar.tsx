import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Menu, X, Home, ShoppingCart, Package, 
  Users, BarChart3, Settings, LogOut 
} from 'lucide-react';

export const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);

  // Estilos de Raíces: Azul industrial para lo activo, Slate para lo inactivo
  const activeClass = "bg-blue-600 text-white shadow-lg shadow-blue-600/20";
  const inactiveClass = "text-slate-400 hover:bg-slate-800 hover:text-slate-200";

  return (
    <>
      {/* 📱 BOTÓN GESTUAL: Solo se ve en móvil para abrir el menú */}
      <button 
        onClick={toggleSidebar}
        className="md:hidden fixed top-4 left-4 z-[110] p-3 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-700 active:scale-95 transition-all"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* 🌑 SOMBRA (Backdrop): Cubre el contenido cuando el menú está abierto en el celu */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] animate-in fade-in duration-300"
          onClick={toggleSidebar}
        />
      )}

      {/* 🚀 ESTRUCTURA DEL SIDEBAR */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-[105]
        h-full w-72 bg-slate-900 p-8 flex flex-col
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        border-r border-slate-800
      `}>
        
        {/* IDENTIDAD VISUAL */}
        <div className="mb-12 px-2">
          <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase">
            🌱 Raíces <span className="text-blue-500 text-[10px] block tracking-[0.4em] not-italic mt-1">HOLDING ERP</span>
          </h1>
        </div>

        {/* MENÚ DE NAVEGACIÓN */}
        <nav className="flex-1 space-y-2">
          <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4 ml-2">Módulos</p>
          
          <SidebarItem to="/" icon={<Home size={18} />} label="Dashboard" active={activeClass} inactive={inactiveClass} onClick={toggleSidebar} />
          <SidebarItem to="/pos" icon={<ShoppingCart size={18} />} label="Ventas (POS)" active={activeClass} inactive={inactiveClass} onClick={toggleSidebar} />
          <SidebarItem to="/inventario" icon={<Package size={18} />} label="Inventario" active={activeClass} inactive={inactiveClass} onClick={toggleSidebar} />
          <SidebarItem to="/crm" icon={<Users size={18} />} label="Clientes" active={activeClass} inactive={inactiveClass} onClick={toggleSidebar} />
          <SidebarItem to="/analiticas" icon={<BarChart3 size={18} />} label="Rendimiento" active={activeClass} inactive={inactiveClass} onClick={toggleSidebar} />
        </nav>

        {/* PIE DE PÁGINA */}
        <div className="pt-6 border-t border-slate-800 space-y-2">
          <SidebarItem to="/configuracion" icon={<Settings size={18} />} label="Ajustes" active={activeClass} inactive={inactiveClass} onClick={toggleSidebar} />
          <button className="w-full flex items-center gap-3 px-4 py-3 text-rose-500 font-black text-xs uppercase tracking-widest hover:bg-rose-500/10 rounded-2xl transition-all">
            <LogOut size={18} />
            Cerrar
          </button>
        </div>
      </aside>
    </>
  );
};

// Componente auxiliar para no repetir código
const SidebarItem = ({ to, icon, label, active, inactive, onClick }: any) => (
  <NavLink 
    to={to} 
    onClick={onClick}
    className={({ isActive }) => `
      flex items-center gap-3 px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all
      ${isActive ? active : inactive}
    `}
  >
    {icon}
    {label}
  </NavLink>
);