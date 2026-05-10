import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Layout & UI (Inyección de componentes desacoplados)
import { useThemeStore } from "./store/useThemeStore";
import { Sidebar } from "./shared/components/layout/Sidebar/Sidebar";
import { MobileNav } from "./shared/components/navigation/MobileNav";

// Modules
import { CustomerCRM } from "./modules/customers/CustomerCRM";
import { POSDashboard } from "./modules/pos/POSDashboard";
import { ProfitabilityDashboard } from "./modules/inventory/pages/ProfitabilityDashboard";
import { WorkerDashboard } from "./modules/production/components/WorkerDashboard";
import { QuoteDashboard } from "./modules/quotes/pages/QuoteDashboard";
import { SupplierDashboard } from "./modules/inventory/pages/SupplierDashboard";
import { DashboardInicio } from "./modules/home/pages/DashboardInicio";
import { SalesDashboard } from "./modules/inventory/pages/SalesDashboard";
import { ServicesDashboard } from "./modules/inventory/pages/ServicesDashboard";
import { OrdersDashboard } from "./modules/orders/pages/OrdersDashboard";
import { InventoryDashboard } from "./modules/inventory/pages/InventoryDashboard";
import { TreasuryDashboard } from "./modules/inventory/pages/TreasuryDashboard";
import { FinancialDashboard } from "./modules/inventory/pages/FinancialDashboard";
import { ProductionDashboard } from "./modules/production/components/ProductionDashboard";
import { RawMaterialDashboard } from "./modules/inventory/components/RawMaterialDashboard";
import { CurrentAccounts } from "./modules/accounts/CurrentAccounts";

// ==========================================
// COMPONENTE: ESTRUCTURA PRINCIPAL (APP SHELL)
// ==========================================
const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { isDarkMode } = useThemeStore();

  return (
    <div className={`min-h-screen flex ${isDarkMode ? "dark bg-slate-950" : "bg-slate-50"}`}>
      
      {/* 🖥️ --- SIDEBAR DE ESCRITORIO (Totalmente encapsulado) --- */}
      <Sidebar />

      {/* 📄 --- ÁREA PRINCIPAL --- */}
      <main className="flex-1 h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300 p-4 md:p-8 pb-24 md:pb-8 relative">
        {children}
      </main>

      {/* 📱 --- NAVEGACIÓN MÓVIL (Totalmente encapsulada) --- */}
      <MobileNav />

    </div>
  );
};

// ==========================================
// ENRUTADOR PRINCIPAL
// ==========================================
export default function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/clientes" element={<CustomerCRM />} />
          <Route path="/cuentas-corrientes" element={<CurrentAccounts />} />
          <Route path="/rentabilidad" element={<ProfitabilityDashboard />} />
          <Route path="/" element={<Navigate to="/inicio" replace />} />
          <Route path="/cotizador" element={<QuoteDashboard />} />
          <Route path="/inicio" element={<DashboardInicio />} />
          <Route path="/tesoreria" element={<TreasuryDashboard />} />
          <Route path="/finanzas" element={<FinancialDashboard />} />
          <Route path="/inventario" element={<InventoryDashboard />} />
          <Route path="/ventas" element={<SalesDashboard />} />
          <Route path="/pedidos" element={<OrdersDashboard />} />
          <Route path="/talleristas" element={<WorkerDashboard />} />
          <Route path="/proveedores" element={<SupplierDashboard />} />
          <Route path="/produccion" element={<ProductionDashboard />} />
          <Route path="/servicios" element={<ServicesDashboard />} />
          <Route path="/pos" element={<POSDashboard />} />
          <Route path="/insumos" element={<RawMaterialDashboard />} />
          <Route
            path="*"
            element={
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <span className="text-6xl mb-4" aria-hidden="true">🚧</span>
                <h2 className="text-xl font-black uppercase tracking-widest">Directorio No Encontrado</h2>
                <p className="text-sm mt-2">La ruta especificada no existe en el sistema.</p>
              </div>
            }
          />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}