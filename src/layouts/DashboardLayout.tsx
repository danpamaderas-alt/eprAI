import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Swal from 'sweetalert2';

export const DashboardLayout = () => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Definición estricta de los items del menú
  const navItems = [
    { path: '/inicio', label: 'Inicio', icon: '📊' },
    { path: '/tesoreria', label: 'Tesorería', icon: '🏦' },
    { path: '/inventario', label: 'Inventario', icon: '📦' },
    { path: '/ventas', label: 'Ventas', icon: '💰' },
    { path: '/pedidos', label: 'Hoja de Ruta', icon: '📋' },
    { path: '/clientes', label: 'Clientes CRM', icon: '🤝' },
    { path: '/revendedores', label: 'Revendedores', icon: '🚚' },
  ];

  // Función de salida blindada con confirmación
  const handleLogout = async () => {
    const result = await Swal.fire({
      title: '¿Cerrar sesión?',
      text: "Tendrás que volver a ingresar tus credenciales.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Cancelar',
      background: '#ffffff',
    });

    if (result.isConfirmed) {
      setIsLoggingOut(true);
      try {
        await supabase.auth.signOut();
      } catch  { // Cambiado a _error para satisfacer al Linter
        Swal.fire('Error', 'No se pudo cerrar la sesión correctamente', 'error');
      } finally {
        setIsLoggingOut(false);
      }
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      
      {/* SIDEBAR: El Chasis Lateral */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-30">
        
        {/* LOGO SECCIÓN */}
        <div className="p-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-xl">⚙️</span>
            </div>
            <h1 className="text-xl font-black tracking-tighter">
              ERP <span className="text-blue-500">3.0</span>
            </h1>
          </div>
        </div>
        
        {/* NAVEGACIÓN PRINCIPAL */}
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold transition-all duration-200
                ${isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 translate-x-1' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }
              `}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm tracking-wide">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* SECCIÓN DE USUARIO: Pie de Sidebar */}
        <div className="p-4 mt-auto">
          <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-inner">
                  J
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></div>
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-white truncate uppercase tracking-tight">Jorge</p>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-none">Admin Root</p>
              </div>
            </div>

            <button 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full py-2.5 bg-slate-900 hover:bg-rose-600/90 text-slate-400 hover:text-white rounded-xl text-[11px] font-black transition-all duration-300 uppercase tracking-widest border border-slate-700 hover:border-rose-500 disabled:opacity-50"
            >
              {isLoggingOut ? 'Saliendo...' : 'Cerrar Sesión'}
            </button>
          </div>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL: Donde ocurre la magia */}
      <main className="flex-1 overflow-y-auto relative scroll-smooth bg-slate-50">
        <div className="p-8 max-w-[1600px] mx-auto min-h-full">
          <Outlet />
        </div>
      </main>

    </div>
  );
};