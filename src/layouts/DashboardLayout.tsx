import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Swal from 'sweetalert2';

// IMPORTAMOS NUESTRO INTERRUPTOR DE LUZ
import { ThemeToggle } from '../components/ThemeToggle'; 

const NAV_ITEMS = [
  { path: '/inicio', label: 'Inicio', icon: '📊' },
  { path: '/pos', label: 'Punto de Venta', icon: '💰' }, // ✅ Acá agregué Punto de Venta
  { path: '/tesoreria', label: 'Tesorería', icon: '🏦' },
  { path: '/inventario', label: 'Inventario', icon: '📦' },
  { path: '/pedidos', label: 'Hoja de Ruta', icon: '📋' },
  { path: '/clientes', label: 'Clientes CRM', icon: '🤝' },
  { path: '/cuentas-corrientes', label: 'Cuentas Cor.', icon: '💳' },
  { path: '/revendedores', label: 'Revendedores', icon: '🚚' },
  { path: '/rentabilidad', label: 'Radar de Rentabilidad', icon: '📈' }, // ✅ Y moví Rentabilidad a la lista principal
];

export const DashboardLayout = () => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || 'Usuario');
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: '¿Cerrar sesión?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;

    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      navigate('/login', { replace: true }); 
    } catch (error) {
      console.error('[Auth Error]:', error);
      Swal.fire('Error', 'No se pudo cerrar la sesión.', 'error');
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-900 transition-colors duration-300 overflow-hidden relative">
      
      {/* BOTÓN HAMBURGUESA (Solo visible en móviles) */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden absolute top-4 left-4 z-50 p-2 bg-slate-900 dark:bg-slate-800 text-white rounded-lg shadow-lg"
      >
        {isSidebarOpen ? '✕' : '☰'}
      </button>

      {/* ASIDE RESPONSIVE */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col shadow-2xl transition-transform duration-300 lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
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
              onClick={() => setIsSidebarOpen(false)} 
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
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-11 h-11 shrink-0 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-inner uppercase">
                {userEmail?.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate lowercase italic">{userEmail}</p>
                <p className="text-[10px] text-emerald-500 uppercase font-black tracking-widest leading-none mt-1">● Online</p>
              </div>
            </div>

            <button 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full py-2.5 bg-slate-900 hover:bg-rose-600/90 text-slate-400 hover:text-white rounded-xl text-[11px] font-black transition-all duration-300 uppercase tracking-widest border border-slate-700 disabled:opacity-50"
            >
              {isLoggingOut ? 'Saliendo...' : 'Cerrar Sesión'}
            </button>
          </div>
        </div>
      </aside>

      {/* OVERLAY PARA CERRAR MENÚ EN MÓVIL AL TOCAR AFUERA */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30"
        />
      )}

      {/* ÁREA PRINCIPAL CON SOPORTE PARA MODO OSCURO */}
      <main className="flex-1 overflow-y-auto relative scroll-smooth bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        
        {/* === ACÁ ESTÁ EL BOTÓN FLOTANTE MÁGICO === */}
        <div className="absolute top-4 right-4 lg:top-8 lg:right-8 z-40">
          <ThemeToggle />
        </div>

        <div className="p-4 pt-16 lg:p-8 max-w-[1600px] mx-auto min-h-full">
          <Outlet />
        </div>
      </main>

    </div>
  );
};