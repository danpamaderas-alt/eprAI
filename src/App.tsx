import { ServicesDashboard } from './modules/inventory/pages/ServicesDashboard';
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

// Layout y Auth
import { DashboardLayout } from './layouts/DashboardLayout';
import { LoginPage } from './modules/auth/LoginPage';

// Pantallas (Páginas)
import { HomeDashboard } from './modules/home/pages/HomeDashboard'; 
import { TreasuryDashboard } from './modules/inventory/pages/TreasuryDashboard';
import { InventoryDashboard } from './modules/inventory/pages/InventoryDashboard';
import { SalesDashboard } from './modules/inventory/pages/SalesDashboard';
import { OrdersDashboard } from './modules/orders/pages/OrdersDashboard';
import { CrmDashboard } from './modules/crm/pages/CrmDashboard';
import { DebtDashboard } from './modules/crm/pages/DebtDashboard';
import { ResellersDashboard } from './modules/resellers/pages/ResellersDashboard';

// ✅ ACÁ IMPORTAMOS EL CEREBRO CENTRAL
import { useCatalogStore } from './store/useCatalogStore';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  // ✅ EL HOOK TIENE QUE ESTAR ACÁ ADENTRO, en la raíz del componente
  const { fetchAllCatalogs } = useCatalogStore();

  useEffect(() => {
    // 1. Apenas arranca, descargamos los catálogos (Talles, Clientes, etc)
    fetchAllCatalogs();

    // 2. Controlamos la sesión (el patovica de seguridad)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [fetchAllCatalogs]); // Agregamos la dependencia por seguridad

  return (
    <BrowserRouter>
      <Routes>
        {!session ? (
          <Route path="*" element={<LoginPage />} />
        ) : (
          <Route element={<DashboardLayout />}>
            <Route path="servicios" element={<ServicesDashboard />} />
            <Route path="/" element={<Navigate to="/inicio" replace />} />
            <Route path="/inicio" element={<HomeDashboard />} />
            <Route path="/tesoreria" element={<TreasuryDashboard />} />
            <Route path="/inventario" element={<InventoryDashboard />} />
            <Route path="/ventas" element={<SalesDashboard />} />
            <Route path="/pedidos" element={<OrdersDashboard />} />
            <Route path="/clientes" element={<CrmDashboard />} />
            <Route path="/cuentas-corrientes" element={<DebtDashboard />} />
            <Route path="/revendedores" element={<ResellersDashboard />} />
            <Route path="*" element={<Navigate to="/inicio" replace />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
}