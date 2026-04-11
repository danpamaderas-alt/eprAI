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

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {!session ? (
          // Si no hay sesión, cualquier ruta te tira al Login
          <Route path="*" element={<LoginPage />} />
        ) : (
          // ✅ ACÁ ESTÁ EL ARREGLO: El Layout ahora proyecta las pantallas correctamente
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Navigate to="/inicio" replace />} />
            <Route path="/inicio" element={<HomeDashboard />} />
            <Route path="/tesoreria" element={<TreasuryDashboard />} />
            <Route path="/inventario" element={<InventoryDashboard />} />
            <Route path="/ventas" element={<SalesDashboard />} />
            <Route path="/pedidos" element={<OrdersDashboard />} />
            <Route path="/clientes" element={<CrmDashboard />} />
            <Route path="/cuentas-corrientes" element={<DebtDashboard />} />
            <Route path="/revendedores" element={<ResellersDashboard />} />
            
            {/* Por si entra a un link que no existe */}
            <Route path="*" element={<Navigate to="/inicio" replace />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
}