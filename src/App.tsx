import { useState, useEffect } from 'react';
import { OrdersDashboard } from './modules/orders/pages/OrdersDashboard';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js'; // Corregido: import type
import { supabase } from './lib/supabase';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LoginPage } from './modules/auth/LoginPage';
import { HomeDashboard } from './modules/home/pages/HomeDashboard'; 
import { TreasuryDashboard } from './modules/inventory/pages/TreasuryDashboard';
import { InventoryDashboard } from './modules/inventory/pages/InventoryDashboard';
import { SalesDashboard } from './modules/inventory/pages/SalesDashboard';
import { CrmDashboard } from './modules/crm/pages/CrmDashboard';
import { ResellersDashboard } from './modules/resellers/pages/ResellersDashboard';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(data.session);
      } catch (error) {
        console.error("Error verificando sesión:", error);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-sm animate-pulse">
            Iniciando Motor ERP...
          </p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {!session ? (
        <Routes>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/inicio" replace />} />
            <Route path="inicio" element={<HomeDashboard />} />
            <Route path="tesoreria" element={<TreasuryDashboard />} />
            <Route path="inventario" element={<InventoryDashboard />} />
            <Route path="ventas" element={<SalesDashboard />} />
            <Route path="clientes" element={<CrmDashboard />} />
            <Route path="/pedidos" element={<OrdersDashboard />} />
            <Route path="revendedores" element={<ResellersDashboard />} />
            <Route path="*" element={<Navigate to="/inicio" replace />} />
          </Route>
        </Routes>
      )}
    </BrowserRouter>
  );
}

export default App;