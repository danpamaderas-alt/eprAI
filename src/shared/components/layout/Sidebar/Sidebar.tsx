import { memo, useCallback, useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LogOut,
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Truck,
  Package,
  Warehouse,
  Landmark,
  BarChart3,
  TrendingUp,
  FileText,
  Factory,
  Scissors,
  Ruler,
  Calculator,
  Printer,
  Boxes,
  Palette,
  Users,
  CreditCard,
  Moon,
  Sun,
  Plus,
  Sprout,
  Pencil,
  Settings,
  type LucideIcon,
} from 'lucide-react';

import { supabase } from '../../../../lib/supabase';
import { useThemeStore } from '../../../../store/useThemeStore';
import { useTenantStore } from '../../../../store/useTenantStore';
import { useAuthStore } from '../../../../store/useAuthStore';
import { CompanyFormModal } from '../../ui/CompanyFormModal';
import { NotificationBell } from '../../notifications/NotificationBell';

interface NavRoute {
  readonly path: string;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly highlight?: 'indigo' | 'rose' | 'emerald' | 'fuchsia';
}

const DESKTOP_ROUTES: readonly NavRoute[] = [
  { path: '/inicio', label: 'Inicio', icon: LayoutDashboard },
  { path: '/ventas', label: 'Punto de Venta', icon: ShoppingCart },
  { path: '/pedidos', label: 'Pedidos', icon: ClipboardList },
  { path: '/remitos', label: 'Remitos / Envíos', icon: Truck },
  { path: '/inventario', label: 'Inventario', icon: Package },
  { path: '/proveedores', label: 'Proveedores', icon: Warehouse },
  { path: '/tesoreria', label: 'Tesorería', icon: Landmark },
  { path: '/finanzas', label: 'Centro Financiero', icon: BarChart3 },
  { path: '/rentabilidad', label: 'Rentabilidad', icon: TrendingUp },
  { path: '/cotizador', label: 'Presupuestos B2B', icon: FileText, highlight: 'indigo' },
  { path: '/produccion', label: 'A Fabricar', icon: Factory, highlight: 'rose' },
  { path: '/talleristas', label: 'Equipo y Taller', icon: Scissors, highlight: 'emerald' },
  { path: '/insumos', label: 'Insumos y Taller', icon: Ruler, highlight: 'indigo' },
  { path: '/calculadora', label: 'Calculadora de Costos', icon: Calculator, highlight: 'indigo' },
  { path: '/calculadora-3d', label: 'Calc. Impresión 3D', icon: Printer, highlight: 'indigo' },
  { path: '/impresiones-3d', label: 'Repositorio 3D', icon: Boxes, highlight: 'indigo' },
  { path: '/sublimacion', label: 'Repos. Sublimación', icon: Palette, highlight: 'fuchsia' },
];

const CRM_ROUTES: readonly NavRoute[] = [
  { path: '/clientes', label: 'Directorio', icon: Users },
  { path: '/cuentas-corrientes', label: 'Cuentas Corrientes', icon: CreditCard },
];

type SidebarItemProps = NavRoute;

const SidebarItem = memo(({ path, label, icon: Icon, highlight }: SidebarItemProps) => {
  const getClasses = (isActive: boolean) => {
    const base = "flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-wider transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2";
    if (!isActive) return `${base} text-slate-400 hover:bg-slate-800 hover:text-slate-200`;

    switch (highlight) {
      case 'indigo': return `${base} bg-brand-600 text-white shadow-lg`;
      case 'rose': return `${base} bg-danger-600 text-white shadow-lg shadow-danger-600/30`;
      case 'emerald': return `${base} bg-success-600 text-white shadow-lg shadow-success-600/20`;
      case 'fuchsia': return `${base} bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/30`;
      default: return `${base} bg-brand-600 text-white shadow-lg shadow-brand-600/20`;
    }
  };

  return (
    <NavLink to={path} className={({ isActive }) => getClasses(isActive)}>
      <Icon className="w-4 h-4 shrink-0" />
      {label}
    </NavLink>
  );
});

SidebarItem.displayName = 'SidebarItem';

const SidebarUserFooter = memo(() => {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const fullName = user?.user_metadata?.full_name || user?.email || 'Operador';
  const initials = fullName
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <button
      type="button"
      onClick={() => navigate('/perfil')}
      className="flex items-center gap-3 px-2 mb-3 w-full text-left rounded-xl hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 cursor-pointer"
    >
      <div className="w-8 h-8 rounded-xl bg-success-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
        {initials}
      </div>
      <div className="overflow-hidden">
        <p className="text-xs font-bold text-white truncate">{fullName}</p>
        <p className="text-[9px] text-success-400 font-bold uppercase tracking-widest truncate">Administrador</p>
      </div>
    </button>
  );
});

SidebarUserFooter.displayName = 'SidebarUserFooter';

export const Sidebar = memo(() => {
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const { activeCompanyId, setActiveCompany } = useTenantStore();
  const navigate = useNavigate();

  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<{ id: string; name: string } | null>(null);

  const fetchCompanies = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .order("name");
      if (error) throw error;
      if (data && data.length > 0) {
        setCompanies(data);
        if (!activeCompanyId) {
          setActiveCompany(data[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching companies:", err);
    }
  }, [activeCompanyId, setActiveCompany]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleCompanySaved = useCallback((company: { id: string; name: string }) => {
    setCompanies((prev) => {
      const exists = prev.find((c) => c.id === company.id);
      if (exists) {
        return prev.map((c) => (c.id === company.id ? company : c));
      }
      return [...prev, company].sort((a, b) => a.name.localeCompare(b.name));
    });
    setActiveCompany(company.id);
    navigate('/');
  }, [setActiveCompany, navigate]);

  const handleEditCompany = useCallback(() => {
    const current = companies.find((c) => c.id === activeCompanyId);
    if (current) {
      setEditingCompany(current);
      setIsCompanyModalOpen(true);
    }
  }, [companies, activeCompanyId]);

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  }, []);

  return (
    <>
      <aside aria-label="Navegación lateral de escritorio" className="hidden md:flex sticky top-0 left-0 h-screen w-72 bg-slate-900 flex-col border-r border-slate-800 shrink-0 transition-colors duration-300">
        
        {/* HEADER */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-success-600 flex items-center justify-center shrink-0">
              <Sprout className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight uppercase leading-none">
                Raíces
              </h1>
              <span className="text-[9px] font-bold text-brand-400 uppercase tracking-[0.3em]">Holding ERP</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button 
              onClick={toggleDarkMode} 
              aria-label={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors text-slate-400 hover:text-white focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* TENANT SELECTOR */}
        <div className="p-4 border-b border-slate-800 bg-slate-800/50 shrink-0">
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="tenant-select" className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Entorno de Trabajo
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={handleEditCompany}
                className="flex items-center gap-1 text-[9px] font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                title="Editar empresa actual"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                onClick={() => { setEditingCompany(null); setIsCompanyModalOpen(true); }}
                className="flex items-center gap-1 text-[9px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                <Plus className="w-3 h-3" />
                Nueva
              </button>
            </div>
          </div>
          <select 
            id="tenant-select"
            value={activeCompanyId}
            onChange={(e) => {
              setActiveCompany(e.target.value);
              navigate('/');
            }}
            className="w-full p-2 bg-slate-950 border border-slate-700 text-white font-bold text-xs rounded-xl outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 cursor-pointer transition-colors"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5 custom-scrollbar">
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.3em] mb-3 ml-3" aria-hidden="true">Módulos</p>
          
          {DESKTOP_ROUTES.map((route) => (
            <SidebarItem key={route.path} {...route} />
          ))}
          
          <div className="pt-3 mt-3 border-t border-slate-800">
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.3em] mb-3 ml-3" aria-hidden="true">CRM</p>
            {CRM_ROUTES.map((route) => (
              <SidebarItem key={route.path} {...route} />
            ))}
          </div>

          <div className="pt-3 mt-3 border-t border-slate-800">
            <SidebarItem path="/settings" label="Configuración" icon={Settings} />
          </div>
        </nav>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-800 shrink-0">
          <SidebarUserFooter />
          <button 
            onClick={handleSignOut} 
            className="w-full flex justify-center items-center gap-2 py-2.5 bg-slate-950 hover:bg-rose-900/50 text-rose-200 hover:text-rose-400 border border-slate-800 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar Sesión
          </button>
        </div>
        
      </aside>

      <CompanyFormModal
        isOpen={isCompanyModalOpen}
        onClose={() => { setIsCompanyModalOpen(false); setEditingCompany(null); }}
        onSaved={handleCompanySaved}
        editCompany={editingCompany as any}
      />
    </>
  );
});

Sidebar.displayName = 'Sidebar';
