import { CustomerCRM } from './modules/customers/CustomerCRM';
import { POSDashboard } from './modules/pos/POSDashboard';
import { ProfitabilityDashboard } from './modules/inventory/pages/ProfitabilityDashboard'; 
import { WorkerDashboard } from './modules/production/components/WorkerDashboard';
import { QuoteDashboard } from './modules/quotes/pages/QuoteDashboard';
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { SupplierDashboard } from './modules/inventory/pages/SupplierDashboard';
import { supabase } from './lib/supabase'; 
import { useThemeStore } from './store/useThemeStore';
import { useTenantStore } from './store/useTenantStore';
import { DashboardInicio } from './modules/home/pages/DashboardInicio';
import { SalesDashboard } from './modules/inventory/pages/SalesDashboard';
import { ServicesDashboard } from './modules/inventory/pages/ServicesDashboard';
import { OrdersDashboard } from './modules/orders/pages/OrdersDashboard';
import { InventoryDashboard } from './modules/inventory/pages/InventoryDashboard';
import { CuentasCorrientes } from './modules/crm/pages/CuentasCorrientes';
import { TreasuryDashboard } from './modules/inventory/pages/TreasuryDashboard';
import { FinancialDashboard } from './modules/inventory/pages/FinancialDashboard';
import { ProductionDashboard } from './modules/production/components/ProductionDashboard';
import { RawMaterialDashboard } from './modules/inventory/components/RawMaterialDashboard';
import { CurrentAccounts } from './modules/accounts/CurrentAccounts';

// ==========================================
// COMPONENTE: ESTRUCTURA PRINCIPAL (LAYOUT)
// ==========================================
const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const { activeCompanyId, setActiveCompany } = useTenantStore();
  const location = useLocation();

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className={`min-h-screen flex ${isDarkMode ? 'dark bg-slate-950' : 'bg-slate-50'}`}>
      
      {/* --- BARRA LATERAL (SIDEBAR) --- */}
      <aside className="w-64 flex-shrink-0 bg-slate-900 text-slate-300 flex flex-col transition-colors duration-300">
        
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚙️</span>
            <h1 className="text-xl font-black text-white tracking-tighter">Raíces <span className="text-blue-500">ERP</span></h1>
          </div>
          <button onClick={toggleDarkMode} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors">
            {isDarkMode ? '🌙' : '☀️'}
          </button>
        </div>

        <div className="p-4 border-b border-slate-800 bg-slate-800/50">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Entorno de Trabajo</p>
          <select 
            value={activeCompanyId}
            onChange={(e) => {
              setActiveCompany(e.target.value);
              window.location.href = '/'; 
            }}
            className="w-full p-2 bg-slate-950 border border-slate-700 text-white font-bold text-xs rounded-lg outline-none focus:border-blue-500 cursor-pointer transition-colors"
          >
            <option value="11111111-1111-1111-1111-111111111111">Raíces (Principal)</option>
            <option value="22222222-2222-2222-2222-222222222222">Rojo Showroom (Secundaria)</option>
          </select>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          
          <Link to="/inicio" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${isActive('/inicio') ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}>
            📊 Inicio
          </Link>

          <Link to="/ventas" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${isActive('/ventas') ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}>
            💰 Punto de Venta
          </Link>
         
         <Link to="/pedidos" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${isActive('/pedidos') ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}>
            📋 Pedidos
          </Link>

          <Link to="/inventario" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${isActive('/inventario') ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}>
            📦 Inventario
          </Link>

          <Link to="/proveedores" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${isActive('/proveedores') ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}>
            🚚 Proveedores
          </Link>

          <Link to="/tesoreria" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${isActive('/tesoreria') ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}>
            💵 Tesorería
          </Link>

          <Link to="/finanzas" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${isActive('/finanzas') ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}>
            📈 Centro Financiero
          </Link>

          <Link to="/rentabilidad" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${isActive('/rentabilidad') ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}>
           📊 Radar de Rentabilidad
          </Link>
                    
          <Link to="/cotizador" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${isActive('/cotizador') ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}>
            📄 Presupuestos B2B
          </Link>

          <Link to="/produccion" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${isActive('/produccion') ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'hover:bg-slate-800 hover:text-white'}`}>
            🏭 A Fabricar
          </Link>

          <Link to="/talleristas" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${isActive('/talleristas') ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'hover:bg-slate-800 hover:text-white'}`}>
            ✂️ Equipo y Taller
          </Link>

          <Link to="/insumos" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${isActive('/insumos') ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}>
            🧵 Insumos y Taller
          </Link>

          <div className="pt-4 mt-4 border-t border-slate-800">
             <p className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">CRM y Contactos</p>
             
             <Link to="/clientes" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${isActive('/clientes') ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}>
               🤝 Clientes CRM
             </Link>

             <Link to="/cuentas-corrientes" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${isActive('/cuentas-corrientes') ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}>
               💳 Cuentas Corrientes
             </Link>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800">
             <p className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Configuración</p>
             <Link to="/servicios" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${isActive('/servicios') ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}>
               🛠️ Servicios Fijos
             </Link>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 mb-4">
             <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-black text-xs">J</div>
             <div>
               <p className="text-xs font-bold text-white">Jorge (Local)</p>
               <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">Sin Candados 🔓</p>
             </div>
          </div>
          {/* BOTÓN DESACTIVADO: Ya no hay sesión que cerrar */}
          <button 
            onClick={() => supabase.auth.signOut()} 
            className="w-full py-3 bg-slate-950 hover:bg-rose-900/50 text-slate-400 hover:text-rose-500 border border-slate-800 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors"
         
         >
            Bloqueo Desactivado
          </button>
        </div>
      </aside>

      {/* --- ÁREA PRINCIPAL --- */}
      <main className="flex-1 h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300 p-8 relative">
        {children}
      </main>

    </div>
  );
};

// ==========================================
// COMPONENTE PRINCIPAL: APP (RUTAS LIBERADAS)
// ==========================================
export default function App() {
  
  // 🚀 MODO LOCAL ACTIVO: Retornamos las rutas directamente sin validación
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
          <Route path="*" element={
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <span className="text-6xl mb-4">🚧</span>
              <h2 className="text-xl font-black uppercase tracking-widest">Directorio No Encontrado</h2>
              <p className="text-sm mt-2">La ruta especificada no existe en el sistema.</p>
            </div>
          } />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}