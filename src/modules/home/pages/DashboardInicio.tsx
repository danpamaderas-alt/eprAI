import { useEffect, useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { Breadcrumbs } from '../../../shared/components/ui/Breadcrumbs';
import { ErrorBoundary } from '../../../shared/components/ui/ErrorBoundary';
import { RaicesLogo } from '../../../shared/components/ui/RaicesLogo';
import {
  ShoppingCart,
  Package,
  Route,
  Sparkles,
  LayoutGrid,
  BarChart3,
  Truck,
  FileText,
  CircleDollarSign,
  Factory,
  Shirt,
  Boxes,
  Rainbow,
  Printer,
  Palette,
  PackageOpen,
  Frame,
  Scissors,
  type LucideIcon,
} from 'lucide-react';

interface QuickAccessItem {
  name: string;
  path: string;
  icon: LucideIcon;
  color: string;
}

interface QuickAccessGroup {
  label: string;
  items: QuickAccessItem[];
}

const QUICK_ACCESS: QuickAccessGroup[] = [
  {
    label: 'Operación',
    items: [
      { name: 'Punto de Venta', path: '/ventas', icon: ShoppingCart, color: 'from-emerald-500 to-emerald-600' },
      { name: 'Pedidos', path: '/pedidos', icon: Route, color: 'from-indigo-500 to-indigo-600' },
      { name: 'Remitos', path: '/remitos', icon: Truck, color: 'from-amber-500 to-amber-600' },
      { name: 'A Fabricar', path: '/produccion', icon: Scissors, color: 'from-rose-500 to-rose-600' },
    ],
  },
  {
    label: 'Impresión 3D',
    items: [
      { name: 'Repositorio 3D', path: '/impresiones-3d', icon: Boxes, color: 'from-indigo-500 to-indigo-600' },
      { name: 'Filamentos', path: '/filamentos', icon: Rainbow, color: 'from-orange-500 to-orange-600' },
      { name: 'Producción 3D', path: '/produccion-3d', icon: Factory, color: 'from-rose-500 to-rose-600' },
      { name: 'Calc. 3D', path: '/calculadora-3d', icon: Printer, color: 'from-indigo-500 to-indigo-600' },
    ],
  },
  {
    label: 'Textil y Sublimación',
    items: [
      { name: 'Repos. Subli', path: '/sublimacion', icon: Palette, color: 'from-fuchsia-500 to-fuchsia-600' },
      { name: 'Blanks', path: '/blanks', icon: PackageOpen, color: 'from-fuchsia-500 to-fuchsia-600' },
      { name: 'Calc. Subli', path: '/calculadora-sublimacion', icon: Shirt, color: 'from-fuchsia-500 to-fuchsia-600' },
      { name: 'Prod. Subli', path: '/produccion-sublimacion', icon: Factory, color: 'from-fuchsia-500 to-fuchsia-600' },
      { name: 'Mockups', path: '/mockups', icon: Frame, color: 'from-sky-500 to-sky-600' },
    ],
  },
  {
    label: 'Stock y Finanzas',
    items: [
      { name: 'Inventario', path: '/inventario', icon: Package, color: 'from-blue-500 to-blue-600' },
      { name: 'Tesorería', path: '/tesoreria', icon: CircleDollarSign, color: 'from-cyan-500 to-cyan-600' },
      { name: 'Finanzas', path: '/finanzas', icon: BarChart3, color: 'from-slate-500 to-slate-600' },
      { name: 'Cotizar', path: '/cotizador', icon: FileText, color: 'from-violet-500 to-violet-600' },
    ],
  },
];

const DashboardContent = memo(() => {
  const activeCompanyId = useTenantStore((state) => state.activeCompanyId);
  const user = useAuthStore((state) => state.user);

  const [prod3dActivos, setProd3dActivos] = useState(0);
  const [prodSubliActivos, setProdSubliActivos] = useState(0);
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Operador';
  const hour = new Date().getHours();
  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const greeting =
    hour < 12 ? 'Buenos dias' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const fetchProductionActivos = async (): Promise<{ d3: number; subli: number }> => {
          if (!activeCompanyId) return { d3: 0, subli: 0 };
          const [d3, subli] = await Promise.all([
            supabase
              .from('print_jobs_3d')
              .select('*', { count: 'exact', head: true })
              .eq('company_id', activeCompanyId)
              .in('status', ['en_cola', 'imprimiendo']),
            supabase
              .from('sublimation_jobs')
              .select('*', { count: 'exact', head: true })
              .eq('company_id', activeCompanyId)
              .in('status', ['en_cola', 'imprimiendo']),
          ]);
          return { d3: d3.count || 0, subli: subli.count || 0 };
        };

        const [produccion] = await Promise.all([
          fetchProductionActivos(),
        ]);

        setProd3dActivos(produccion.d3);
        setProdSubliActivos(produccion.subli);
      } catch (error) {
        console.error('[Dashboard] Error en sincronizacion:', error);
      } finally {
        setIsLoadingCounts(false);
      }
    };

    loadDashboardData();
  }, [activeCompanyId]);

  const prodCounts: Record<string, number | undefined> = {
    '/produccion-3d': prod3dActivos,
    '/produccion-sublimacion': prodSubliActivos,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <Breadcrumbs items={[{ label: 'Panel de Control' }]} />

      {/* Hero Section - Gradient Welcome */}
      <header className="relative rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10 p-10 lg:p-12">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-blue-300 uppercase tracking-widest">{greeting}, {userName}</span>
          </div>
          <div className="mb-3">
            <RaicesLogo
              size={52}
              href="/"
              textClassName="text-4xl lg:text-6xl font-black tracking-tighter text-white italic"
            />
          </div>
          <span className="block w-20 h-1 rounded-full bg-gradient-to-r from-blue-400 to-cyan-300 mb-4" aria-hidden="true" />
          <p className="text-slate-200 font-black text-sm uppercase tracking-widest max-w-md">
            Panel de Control Operativo
          </p>
          <p className="text-slate-400 text-xs font-bold mt-1 capitalize">
            {today} · Producción, ventas y diseños en un solo lugar
          </p>
        </div>
      </header>

      {/* Producción en curso */}
      <div className="flex items-center gap-2 mb-4">
        <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-rose-500 to-fuchsia-500" aria-hidden="true" />
        <h2 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-[0.25em]">
          Producción en curso
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link
          to="/produccion-3d"
          className="group relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-rose-500 to-rose-600 p-6 shadow-lg shadow-rose-500/30 transition-transform hover:scale-[1.01]"
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Factory className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">Impresión 3D</span>
          </div>
          <p className="text-3xl font-black text-white tabular-nums">{isLoadingCounts ? '—' : prod3dActivos}</p>
          <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest mt-1">Trabajos en curso</p>
        </Link>

        <Link
          to="/produccion-sublimacion"
          className="group relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-fuchsia-500 to-fuchsia-600 p-6 shadow-lg shadow-fuchsia-500/30 transition-transform hover:scale-[1.01]"
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Shirt className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">Sublimación</span>
          </div>
          <p className="text-3xl font-black text-white tabular-nums">{isLoadingCounts ? '—' : prodSubliActivos}</p>
          <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest mt-1">Trabajos en curso</p>
        </Link>

        <div className="relative overflow-hidden rounded-[2rem] bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 p-6 shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Producción total activa</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
            {isLoadingCounts ? '—' : prod3dActivos + prodSubliActivos}
          </p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            {prod3dActivos} 3D · {prodSubliActivos} Subli
          </p>
        </div>
      </div>

      {/* Accesos rápidos por rubro */}
      <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-[2.5rem] border border-slate-200 dark:border-slate-700/50 p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <LayoutGrid className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-[0.25em]">
            Accesos Rápidos
          </h2>
        </div>
        <div className="space-y-6">
          {QUICK_ACCESS.map((group) => (
            <div key={group.label}>
              <p className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                <span className="w-1 h-3 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden="true" />
                {group.label}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {group.items.map((m) => {
                  const count = prodCounts[m.path];
                  return (
                    <Link
                      key={m.path}
                      to={m.path}
                      className="group relative flex items-center gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/40 overflow-hidden hover:border-slate-300 dark:hover:border-slate-500 hover:-translate-y-0.5 hover:shadow-lg transition-all"
                    >
                      <span className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${m.color}`} aria-hidden="true" />
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${m.color} text-white flex items-center justify-center shadow-lg shrink-0 group-hover:scale-110 transition-transform`}>
                        <m.icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[12px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider leading-tight truncate">
                          {m.name}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          {group.label}
                        </span>
                      </div>
                      {count != null && (
                        <span
                          className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black tabular-nums ${
                            count > 0
                              ? 'bg-rose-500/15 text-rose-500 dark:text-rose-400'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

DashboardContent.displayName = 'DashboardContent';

export const DashboardInicio = memo(() => (
  <ErrorBoundary>
    <DashboardContent />
  </ErrorBoundary>
));

DashboardInicio.displayName = 'DashboardInicio';
