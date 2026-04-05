import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Swal from 'sweetalert2';

// OPTIMIZACIÓN: Extraído fuera del render cycle para evitar reasignación de memoria.
const NAV_ITEMS = [
  { path: '/inicio', label: 'Inicio', icon: '📊' },
  { path: '/tesoreria', label: 'Tesorería', icon: '🏦' },
  { path: '/inventario', label: 'Inventario', icon: '📦' },
  { path: '/ventas', label: 'Ventas', icon: '💰' },
  { path: '/pedidos', label: 'Hoja de Ruta', icon: '📋' },
  { path: '/clientes', label: 'Clientes CRM', icon: '🤝' },
  { path: '/revendedores', label: 'Revendedores', icon: '🚚' },
];

export const DashboardLayout = () => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  // CRÍTICO: Debes sustituir esto por tu gestor de estado real (ej. Context, Zustand)
  // const { user } = useAuth(); 
  const currentUser = { name: 'Usuario', role: 'Rol no definido' }; 

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

    if (!result.isConfirmed) return;

    setIsLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Control explícito de la redirección para prevenir inconsistencias de estado
      navigate('/login', { replace: true }); 
    } catch (error) {
      // ADVERTENCIA CORREGIDA: Registro estricto del fallo
      console.error('[Auth Error] Fallo al invalidar sesión:', error);
      Swal.fire('Error crítico', 'Fallo de comunicación con el proveedor de identidad.', 'error');
      setIsLoggingOut(false); // Solo revertimos estado si falla. Si tiene éxito, se desmonta.
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-30">
        <div className="p-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-xl" aria-hidden="true">⚙️</span>
            </div>
            <h1 className="text-xl font-black tracking-tighter">
              ERP <span className="text-blue-500">3.0</span>
            </h1>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
          {NAV_ITEMS.map(({ path, label, icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold transition-all duration-200
                ${isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 translate-x-1' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }
              `}
            >
              <span className="text-xl" aria-hidden="true">{icon}</span>
              <span className="text-sm tracking-wide">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-inner">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></div>
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-white truncate uppercase tracking-tight">{currentUser.name}</p>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-none">{currentUser.role}</p>
              </div>
            </div>

            <button 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full py-2.5 bg-slate-900 hover:bg-rose-600/90 text-slate-400 hover:text-white rounded-xl text-[11px] font-black transition-all duration-300 uppercase tracking-widest border border-slate-700 hover:border-rose-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? 'Desconectando...' : 'Cerrar Sesión'}
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative scroll-smooth bg-slate-50">
        <div className="p-8 max-w-[1600px] mx-auto min-h-full">
          <Outlet />
        </div>
      </main>

    </div>
  );
};