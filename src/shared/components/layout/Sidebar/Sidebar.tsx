import { memo, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

// Dependencias de entorno
import { supabase } from '../../../../lib/supabase';
import { useThemeStore } from '../../../../store/useThemeStore';
import { useTenantStore } from '../../../../store/useTenantStore';

// ==========================================
// CONFIGURACIÓN DE RUTAS
// ==========================================
interface NavRoute {
  readonly path: string;
  readonly label: string;
  readonly highlight?: 'indigo' | 'rose' | 'emerald';
}

const DESKTOP_ROUTES: readonly NavRoute[] = [
  { path: '/inicio', label: '📊 Inicio' },
  { path: '/ventas', label: '💰 Punto de Venta' },
  { path: '/pedidos', label: '📋 Pedidos' },
  { path: '/remitos', label: '📑 Remitos / Envíos' }, // <-- AQUÍ ESTÁ EL NUEVO MÓDULO
  { path: '/inventario', label: '📦 Inventario' },
  { path: '/proveedores', label: '🚚 Proveedores' },
  { path: '/tesoreria', label: '💵 Tesorería' },
  { path: '/finanzas', label: '📈 Centro Financiero' },
  { path: '/rentabilidad', label: '📊 Radar de Rentabilidad' },
  { path: '/cotizador', label: '📄 Presupuestos B2B', highlight: 'indigo' },
  { path: '/produccion', label: '🏭 A Fabricar', highlight: 'rose' },
  { path: '/talleristas', label: '✂️ Equipo y Taller', highlight: 'emerald' },
  { path: '/insumos', label: '🧵 Insumos y Taller', highlight: 'indigo' },
];

// ==========================================
// COMPONENTE AUXILIAR
// ==========================================
type SidebarItemProps = NavRoute;

const SidebarItem = memo(({ path, label, highlight }: SidebarItemProps) => {
  const getClasses = (isActive: boolean) => {
    const base = "flex items-center gap-3 px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all focus:outline-none focus:ring-2 focus:ring-blue-500";
    if (!isActive) return `${base} text-slate-400 hover:bg-slate-800 hover:text-slate-200`;

    switch (highlight) {
      case 'indigo': return `${base} bg-indigo-600 text-white shadow-lg`;
      case 'rose': return `${base} bg-rose-600 text-white shadow-lg shadow-rose-600/30`;
      case 'emerald': return `${base} bg-emerald-600 text-white shadow-lg shadow-emerald-600/20`;
      default: return `${base} bg-blue-600 text-white shadow-lg shadow-blue-600/20`;
    }
  };

  return (
    <NavLink to={path} className={({ isActive }) => getClasses(isActive)}>
      {label}
    </NavLink>
  );
});

SidebarItem.displayName = 'SidebarItem';

// ==========================================
// COMPONENTE PRINCIPAL: SIDEBAR
// ==========================================
export const Sidebar = memo(() => {
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const { activeCompanyId, setActiveCompany } = useTenantStore();
  const navigate = useNavigate();

  // 🚀 FIX: Manejo seguro de la promesa de cierre de sesión
  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  }, []);

  return (
    <aside aria-label="Navegación lateral de escritorio" className="hidden md:flex sticky top-0 left-0 h-screen w-72 bg-slate-900 flex-col border-r border-slate-800 flex-shrink-0 transition-colors duration-300">
      
      {/* HEADER E IDENTIDAD */}
      <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800 shrink-0">
        <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase">
          🌱 Raíces <span className="text-blue-500 text-[10px] block tracking-[0.4em] not-italic mt-1">HOLDING ERP</span>
        </h1>
        <button 
          onClick={toggleDarkMode} 
          aria-label={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
          className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {isDarkMode ? '🌙' : '☀️'}
        </button>
      </div>

      {/* SELECTOR DE ENTORNO */}
      <div className="p-4 border-b border-slate-800 bg-slate-800/50 shrink-0">
        <label htmlFor="tenant-select" className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
          Entorno de Trabajo
        </label>
        <select 
          id="tenant-select"
          value={activeCompanyId}
          onChange={(e) => {
            setActiveCompany(e.target.value);
            navigate('/');
          }}
          className="w-full p-2 bg-slate-950 border border-slate-700 text-white font-bold text-xs rounded-lg outline-none focus:border-blue-500 cursor-pointer transition-colors"
        >
          <option value="11111111-1111-1111-1111-111111111111">Raíces (Principal)</option>
          <option value="22222222-2222-2222-2222-222222222222">Rojo Showroom (Secundaria)</option>
        </select>
      </div>

      {/* RUTAS DE NAVEGACIÓN */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4 ml-2" aria-hidden="true">Módulos</p>
        
        {DESKTOP_ROUTES.map((route) => (
          <SidebarItem key={route.path} {...route} />
        ))}
        
        {/* Agrupación modular (CRM) */}
        <div className="pt-4 mt-4 border-t border-slate-800">
          <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4 ml-2" aria-hidden="true">CRM</p>
          <SidebarItem path="/clientes" label="🤝 Directorio" />
          <SidebarItem path="/cuentas-corrientes" label="💳 Cuentas Corrientes" />
        </div>
      </nav>

      {/* PIE Y USUARIO */}
      <div className="p-4 border-t border-slate-800 shrink-0">
        <div className="flex items-center gap-3 px-2 mb-4">
           <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-black text-xs shrink-0" aria-hidden="true">J</div>
           <div className="overflow-hidden">
             <p className="text-xs font-bold text-white truncate">Jorge (Local)</p>
             <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest truncate">Sin Candados 🔓</p>
           </div>
        </div>
        <button 
          onClick={handleSignOut} 
          className="w-full flex justify-center items-center gap-2 py-3 bg-slate-950 hover:bg-rose-900/50 text-slate-400 hover:text-rose-500 border border-slate-800 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500"
        >
          <LogOut size={14} aria-hidden="true" />
          Bloqueo Desactivado
        </button>
      </div>
      
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';