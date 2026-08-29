import { Outlet, useLocation } from "react-router-dom";
import { useThemeStore } from "../store/useThemeStore";
import { Sidebar } from "../shared/components/layout/Sidebar/Sidebar";
import { MobileNav } from "../shared/components/navigation/MobileNav";
import { useDocumentTitle } from "../shared/hooks/useDocumentTitle";

const ROUTE_TITLES: Record<string, string> = {
  '/inicio': 'Inicio',
  '/pos': 'Punto de Venta',
  '/pedidos': 'Pedidos',
  '/remitos': 'Remitos',
  '/clientes': 'Clientes',
  '/cuentas-corrientes': 'Cuentas Corrientes',
  '/cotizador': 'Cotizador',
  '/rentabilidad': 'Rentabilidad',
  '/tesoreria': 'Tesorería',
  '/finanzas': 'Finanzas',
  '/inventario': 'Inventario',
  '/ventas': 'Ventas',
  '/talleristas': 'Talleristas',
  '/proveedores': 'Proveedores',
  '/produccion': 'Producción',
  '/servicios': 'Servicios',
  '/insumos': 'Insumos',
  '/ingreso-stock': 'Ingreso de Stock',
  '/egreso-stock': 'Egreso de Stock',
  '/historial-stock': 'Historial de Stock',
  '/calculadora': 'Calculadora de Costos',
  '/calculadora-3d': 'Calculadora Impresión 3D',
  '/calculadora-sublimacion': 'Calculadora Sublimación',
  '/produccion-3d': 'Producción 3D',
  '/produccion-sublimacion': 'Producción Sublimación',
  '/impresiones-3d': 'Repositorio Impresión 3D',
  '/sublimacion': 'Sublimación',
  '/settings': 'Configuración',
  '/perfil': 'Mi Perfil',
};

function useRouteTitle() {
  const location = useLocation();
  useDocumentTitle(ROUTE_TITLES[location.pathname] ?? '');
}

export const DashboardLayout = () => {
  const { isDarkMode } = useThemeStore();
  useRouteTitle();

  return (
    <div
      className={`min-h-screen flex ${isDarkMode ? "dark bg-slate-950" : "bg-slate-50"}`}
    >
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-brand-600 focus:text-white focus:text-xs focus:font-bold focus:uppercase focus:tracking-widest"
      >
        Saltar al contenido
      </a>
      <Sidebar />

      <main
        id="contenido-principal"
        tabIndex={-1}
        className="flex-1 h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300 relative"
      >
        <div className="p-4 pt-20 lg:p-8 lg:pt-8 pb-24 lg:pb-8 max-w-[1600px] mx-auto min-h-full">
          <Outlet />
        </div>
      </main>

      <MobileNav />
    </div>
  );
};
