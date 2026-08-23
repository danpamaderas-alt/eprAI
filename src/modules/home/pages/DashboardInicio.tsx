import { lazy, Suspense, useEffect, useState, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useCatalogStore } from '../../../store/useCatalogStore';
import { useCrmStore } from '../../crm/store/useCrmStore';
import { useTreasuryStore } from '../../inventory/treasury/store/useTreasuryStore';
import { useTenantStore } from '../../../store/useTenantStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { ARS } from '../../../shared/utils/format';
import { KpiCard } from '../../../shared/components/ui/KpiCard';
import { Breadcrumbs } from '../../../shared/components/ui/Breadcrumbs';
import { ErrorBoundary } from '../../../shared/components/ui/ErrorBoundary';
const SalesTrendChart = lazy(() =>
  import('../../../shared/components/charts/SalesTrendChart').then((m) => ({ default: m.SalesTrendChart })),
);
import { KpiSkeleton, Skeleton } from '../../../shared/components/ui/Skeleton';
import {
  ShoppingCart,
  Package,
  Users,
  Route,
  Clock,
  Sparkles,
  Zap,
  LayoutGrid,
  CreditCard,
  BarChart3,
  Truck,
  FileText,
  CircleDollarSign,
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'order' | 'sale' | 'movement' | 'customer';
  title: string;
  subtitle: string;
  amount?: number;
  time: string;
  icon: React.ReactNode;
  color: string;
}

const DashboardContent = memo(() => {
  const { inventory, fetchAllCatalogs } = useCatalogStore();
  const { balances, fetchBalances } = useCrmStore();
  const { transactions, fetchTransactions } = useTreasuryStore();
  const activeCompanyId = useTenantStore((state) => state.activeCompanyId);
  const user = useAuthStore((state) => state.user);

  const [pedidosPendientes, setPedidosPendientes] = useState(0);
  const [chartData, setChartData] = useState<{ day: string; sales: number }[]>([]);
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Operador';
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Buenos dias' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const fetchOrdersCount = async () => {
          if (!activeCompanyId) return 0;
          const { count } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', activeCompanyId)
            .in('status', ['PENDING', 'PENDIENTE']);
          return count || 0;
        };

        const fetchWeeklySales = async () => {
          if (!activeCompanyId) return [];
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          const { data: salesData } = await supabase
            .from('sales')
            .select('total_amount, created_at')
            .eq('company_id', activeCompanyId)
            .gte('created_at', sevenDaysAgo.toISOString())
            .order('created_at', { ascending: true });

          if (!salesData) return [];

          const dayNames = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
          const dailyTotals: Record<string, number> = {};
          const today = new Date();

          for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            dailyTotals[key] = 0;
          }

          salesData.forEach((s) => {
            const key = new Date(s.created_at ?? new Date().toISOString()).toISOString().split('T')[0];
            if (dailyTotals[key] !== undefined) {
              dailyTotals[key] += Number.parseFloat(String(s.total_amount || 0));
            }
          });

          return Object.entries(dailyTotals).map(([dateKey, total]) => {
            const d = new Date(dateKey);
            return { day: dayNames[d.getDay()], sales: total };
          });
        };

        const fetchRecentOrders = async (): Promise<ActivityItem[]> => {
          if (!activeCompanyId) return [];
          const { data } = await supabase
            .from('orders')
            .select('id, created_at, status, total_amount, customers(name)')
            .eq('company_id', activeCompanyId)
            .order('created_at', { ascending: false })
            .limit(5);

          return (data || []).map((o) => ({
            id: o.id,
            type: 'order' as const,
            title: `Pedido #${o.id.slice(0, 8)}`,
            subtitle: (o.customers as any)?.name || 'Cliente',
            amount: Number(o.total_amount) || undefined,
            time: new Date(o.created_at ?? new Date().toISOString()).toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit' }),
            icon: <ShoppingCart className="w-4 h-4" />,
            color: 'text-blue-500 bg-blue-500/10',
          }));
        };

        const fetchRecentSales = async (): Promise<ActivityItem[]> => {
          if (!activeCompanyId) return [];
          const { data } = await supabase
            .from('sales')
            .select('id, created_at, total_amount')
            .eq('company_id', activeCompanyId)
            .order('created_at', { ascending: false })
            .limit(5);

          return (data || []).map((s) => ({
            id: s.id,
            type: 'sale' as const,
            title: 'Venta registrada',
            subtitle: 'Punto de Venta',
            amount: Number(s.total_amount) || undefined,
            time: new Date(s.created_at ?? new Date().toISOString()).toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit' }),
            icon: <CreditCard className="w-4 h-4" />,
            color: 'text-emerald-500 bg-emerald-500/10',
          }));
        };

        const [ordersCount, weeklySales, , , , recentOrders, recentSales] = await Promise.all([
          fetchOrdersCount(),
          fetchWeeklySales(),
          fetchAllCatalogs(),
          fetchBalances(),
          fetchTransactions(),
          fetchRecentOrders(),
          fetchRecentSales(),
        ]);

        setPedidosPendientes(ordersCount);
        setChartData(weeklySales);

        const allActivity = [...(recentOrders || []), ...(recentSales || [])]
          .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
          .slice(0, 8);
        setRecentActivity(allActivity);
      } catch (error) {
        console.error('[Dashboard] Error en sincronizacion:', error);
      } finally {
        setIsLoadingCounts(false);
        setIsChartLoading(false);
      }
    };

    loadDashboardData();
  }, [fetchAllCatalogs, fetchBalances, fetchTransactions, activeCompanyId]);

  const totalStock = useMemo(
    () => inventory?.reduce((sum, item) => sum + (item.stock_quantity || 0), 0) || 0,
    [inventory],
  );

  const ingresosMes = useMemo(() => {
    if (!transactions) return 0;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return transactions
      .filter((tx) => {
        const txDate = new Date(tx.date);
        const isValidStatus = tx.status === 'COMPLETADO' || !tx.status;
        return isValidStatus && tx.type === 'INCOME' && txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
      })
      .reduce((sum, tx) => sum + (Number.parseFloat(tx.amount.toString()) || 0), 0);
  }, [transactions]);

  const ingresosMesAnterior = useMemo(() => {
    if (!transactions) return 0;
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return transactions
      .filter((tx) => {
        const txDate = new Date(tx.date);
        const isValidStatus = tx.status === 'COMPLETADO' || !tx.status;
        return isValidStatus && tx.type === 'INCOME' && txDate.getMonth() === prevMonth && txDate.getFullYear() === prevYear;
      })
      .reduce((sum, tx) => sum + (Number.parseFloat(tx.amount.toString()) || 0), 0);
  }, [transactions]);

  const ingresoTrend = ingresosMesAnterior > 0
    ? Math.round(((ingresosMes - ingresosMesAnterior) / ingresosMesAnterior) * 100)
    : 0;

  const modules = [
    { name: 'POS', path: '/ventas', icon: <ShoppingCart className="w-5 h-5" />, color: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/30' },
    { name: 'Inventario', path: '/inventario', icon: <Package className="w-5 h-5" />, color: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/30' },
    { name: 'Cotizar', path: '/cotizador', icon: <FileText className="w-5 h-5" />, color: 'from-violet-500 to-violet-600', shadow: 'shadow-violet-500/30' },
    { name: 'CRM', path: '/clientes', icon: <Users className="w-5 h-5" />, color: 'from-rose-500 to-rose-600', shadow: 'shadow-rose-500/30' },
    { name: 'Logistica', path: '/remitos', icon: <Truck className="w-5 h-5" />, color: 'from-amber-500 to-amber-600', shadow: 'shadow-amber-500/30' },
    { name: 'Tesoreria', path: '/tesoreria', icon: <CircleDollarSign className="w-5 h-5" />, color: 'from-cyan-500 to-cyan-600', shadow: 'shadow-cyan-500/30' },
    { name: 'Pedidos', path: '/pedidos', icon: <Route className="w-5 h-5" />, color: 'from-indigo-500 to-indigo-600', shadow: 'shadow-indigo-500/30' },
    { name: 'Reportes', path: '/finanzas', icon: <BarChart3 className="w-5 h-5" />, color: 'from-slate-500 to-slate-600', shadow: 'shadow-slate-500/30' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <Breadcrumbs items={[{ label: 'Panel de Control' }]} />

      {/* Hero Section - Gradient Welcome */}
      <header className="relative rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10 p-10 lg:p-12 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-blue-300 uppercase tracking-widest">{greeting}, {userName}</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-white mb-2 italic">
              Raices <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">ERP</span>
            </h1>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest max-w-md">
              Panel de Control Operativo — Vista completa de tu negocio
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-4">
            <div className="flex flex-col items-center bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl px-6 py-4">
              <span className="text-2xl font-black text-white">{totalStock}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Prendas</span>
            </div>
            <div className="flex flex-col items-center bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl px-6 py-4">
              <span className="text-2xl font-black text-emerald-400">{balances?.length || 0}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Clientes</span>
            </div>
            <div className="flex flex-col items-center bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl px-6 py-4">
              <span className="text-2xl font-black text-amber-400">{pedidosPendientes}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Pendientes</span>
            </div>
          </div>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {isLoadingCounts ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              label="Ingresos del Mes"
              value={ARS.format(ingresosMes)}
              trend={ingresoTrend}
              icon={<CircleDollarSign className="w-16 h-16" />}
              variant="emerald"
            />
            <KpiCard
              label="Stock Disponible"
              value={`${totalStock} Prendas`}
              icon={<Package className="w-16 h-16" />}
              variant="default"
            />
            <KpiCard
              label="Cartera de Clientes"
              value={`${balances?.length || 0} Activos`}
              icon={<Users className="w-16 h-16" />}
              variant="default"
            />
            <KpiCard
              label="Pedidos Pendientes"
              value={`${pedidosPendientes} en cola`}
              icon={<Route className="w-16 h-16" />}
              variant="dark"
            />
          </>
        )}
      </div>

      {/* Module Grid - Quick Access */}
      <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-[2.5rem] border border-slate-200 dark:border-slate-700/50 p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <LayoutGrid className="w-4 h-4 text-slate-400" />
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Modulos</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {modules.map((m) => (
            <Link
              key={m.path}
              to={m.path}
              className="flex flex-col items-center gap-3 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all group cursor-pointer"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${m.color} text-white flex items-center justify-center shadow-lg ${m.shadow} group-hover:scale-110 transition-transform`}>
                {m.icon}
              </div>
              <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider text-center">
                {m.name}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Chart + Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Suspense
            fallback={
              <div className="bg-white dark:bg-slate-800 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                <Skeleton className="h-4 w-40 mb-8" />
                <Skeleton className="h-64 w-full" />
              </div>
            }
          >
            <SalesTrendChart data={chartData} isLoading={isChartLoading} />
          </Suspense>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden">
          <div className="p-8 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-slate-400" />
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">
                Actividad Reciente
              </h2>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-2">
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Zap className="w-8 h-8 mb-3 opacity-40" />
                <p className="text-xs font-bold uppercase tracking-widest">Sin actividad reciente</p>
              </div>
            ) : (
              recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{item.title}</p>
                    <p className="text-[10px] text-slate-400 font-semibold truncate">{item.subtitle}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {item.amount !== undefined && (
                      <p className="text-xs font-black text-slate-700 dark:text-white">
                        {ARS.format(item.amount)}
                      </p>
                    )}
                    <p className="text-[9px] text-slate-400 font-bold">{item.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
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
