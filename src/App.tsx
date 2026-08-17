import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { useAuthStore } from "./store/useAuthStore";
import { ProtectedRoute } from "./shared/components/layout/ProtectedRoute";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { ErrorBoundary } from "./shared/components/ui/ErrorBoundary";

const LoginPage = lazy(() => import("./modules/auth/LoginPage").then(m => ({ default: m.LoginPage })));
const CustomerCRM = lazy(() => import("./modules/customers/CustomerCRM").then(m => ({ default: m.CustomerCRM })));
const POSDashboard = lazy(() => import("./modules/pos/POSDashboard").then(m => ({ default: m.POSDashboard })));
const ProfitabilityDashboard = lazy(() => import("./modules/inventory/pages/ProfitabilityDashboard").then(m => ({ default: m.ProfitabilityDashboard })));
const WorkerDashboard = lazy(() => import("./modules/production/components/WorkerDashboard").then(m => ({ default: m.WorkerDashboard })));
const QuoteDashboard = lazy(() => import("./modules/quotes/pages/QuoteDashboard").then(m => ({ default: m.QuoteDashboard })));
const SupplierDashboard = lazy(() => import("./modules/inventory/pages/SupplierDashboard").then(m => ({ default: m.SupplierDashboard })));
const DashboardInicio = lazy(() => import("./modules/home/pages/DashboardInicio").then(m => ({ default: m.DashboardInicio })));
const SalesDashboard = lazy(() => import("./modules/inventory/pages/SalesDashboard").then(m => ({ default: m.SalesDashboard })));
const ServicesDashboard = lazy(() => import("./modules/inventory/pages/ServicesDashboard").then(m => ({ default: m.ServicesDashboard })));
const OrdersDashboard = lazy(() => import("./modules/orders/pages/OrdersDashboard").then(m => ({ default: m.OrdersDashboard })));
const InventoryDashboard = lazy(() => import("./modules/inventory/pages/InventoryDashboard").then(m => ({ default: m.InventoryDashboard })));
const TreasuryDashboard = lazy(() => import("./modules/inventory/pages/TreasuryDashboard").then(m => ({ default: m.TreasuryDashboard })));
const FinancialDashboard = lazy(() => import("./modules/inventory/pages/FinancialDashboard").then(m => ({ default: m.FinancialDashboard })));
const ProductionDashboard = lazy(() => import("./modules/production/components/ProductionDashboard").then(m => ({ default: m.ProductionDashboard })));
const RawMaterialDashboard = lazy(() => import("./modules/inventory/components/RawMaterialDashboard").then(m => ({ default: m.RawMaterialDashboard })));
const CurrentAccounts = lazy(() => import("./modules/accounts/CurrentAccounts").then(m => ({ default: m.CurrentAccounts })));
const RemitosDashboard = lazy(() => import("./modules/orders/pages/RemitosDashboard").then(m => ({ default: m.RemitosDashboard })));
const CostCalculator = lazy(() => import("./modules/finances/pages/CostCalculator").then(m => ({ default: m.CostCalculator })));
const Print3DCalculator = lazy(() => import("./modules/finances/pages/Print3DCalculator").then(m => ({ default: m.Print3DCalculator })));
const StockEntry = lazy(() => import("./modules/inventory/pages/StockEntry").then(m => ({ default: m.StockEntry })));
const StockWithdrawal = lazy(() => import("./modules/inventory/pages/StockWithdrawal").then(m => ({ default: m.StockWithdrawal })));
const StockHistory = lazy(() => import("./modules/inventory/pages/StockHistory").then(m => ({ default: m.StockHistory })));

const LoadingFallback = () => (
  <div className="h-full flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function App() {
  const initializeAuth = useAuthStore((state) => state.initialize);

  useEffect(() => {
    return initializeAuth();
  }, [initializeAuth]);

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <DashboardLayout />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          >
            <Route path="clientes" element={<CustomerCRM />} />
            <Route path="cuentas-corrientes" element={<CurrentAccounts />} />
            <Route path="remitos" element={<RemitosDashboard />} />
            <Route path="rentabilidad" element={<ProfitabilityDashboard />} />
            <Route path="cotizador" element={<QuoteDashboard />} />
            <Route path="inicio" element={<DashboardInicio />} />
            <Route path="tesoreria" element={<TreasuryDashboard />} />
            <Route path="finanzas" element={<FinancialDashboard />} />
            <Route path="inventario" element={<InventoryDashboard />} />
            <Route path="ventas" element={<SalesDashboard />} />
            <Route path="pedidos" element={<OrdersDashboard />} />
            <Route path="talleristas" element={<WorkerDashboard />} />
            <Route path="proveedores" element={<SupplierDashboard />} />
            <Route path="produccion" element={<ProductionDashboard />} />
            <Route path="servicios" element={<ServicesDashboard />} />
            <Route path="pos" element={<POSDashboard />} />
            <Route path="insumos" element={<RawMaterialDashboard />} />
            <Route path="ingreso-stock" element={<StockEntry />} />
            <Route path="egreso-stock" element={<StockWithdrawal />} />
            <Route path="historial-stock" element={<StockHistory />} />
            <Route path="calculadora" element={<CostCalculator />} />
            <Route path="calculadora-3d" element={<Print3DCalculator />} />
            <Route path="" element={<Navigate to="/inicio" replace />} />
            <Route
              path="*"
              element={
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <span className="text-6xl mb-4" aria-hidden="true">🚧</span>
                  <h2 className="text-xl font-black uppercase tracking-widest">
                    Directorio No Encontrado
                  </h2>
                  <p className="text-sm mt-2">
                    La ruta especificada no existe en el sistema.
                  </p>
                </div>
              }
            />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
