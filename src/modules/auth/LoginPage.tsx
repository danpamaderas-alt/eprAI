import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useTenantStore } from '../../store/useTenantStore'; // 🔄 Importamos el gestor de empresas
import Swal from 'sweetalert2';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const setCompany = useTenantStore((state) => state.setActiveCompanyId); //

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const sanitizedEmail = email.trim(); //
    if (!sanitizedEmail || !password) return;

    setLoading(true);
    
    try {
      // 1. Autenticación básica
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password,
      });

      if (authError) throw authError;

      // 🚀 [NUEVO] RESOLUCIÓN DE TENANT: Buscamos a qué empresa pertenece este usuario
      // Asumimos que tienes una tabla 'profiles' con 'company_id'
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile?.company_id) {
        // Si no tiene empresa, cerramos sesión por seguridad
        await supabase.auth.signOut();
        throw new Error("Tu usuario no tiene una empresa asignada. Contacta a soporte.");
      }

      // 2. Sincronizamos el TenantStore antes de navegar
      setCompany(profile.company_id); //

      // 3. Redirección segura
      navigate('/inicio', { replace: true }); //
      
    } catch (error: unknown) {
      console.error('[Security] Fallo de acceso:', error); //
      
      Swal.fire({ 
        icon: 'error', 
        title: 'Acceso Denegado', 
        text: error instanceof Error ? error.message : 'Credenciales inválidas.', 
        background: '#0f172a', 
        color: '#fff',
        confirmButtonColor: '#2563eb'
      });
      
      setLoading(false);
    }
  }, [email, password, navigate, setCompany]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="max-w-md w-full bg-slate-800 p-10 rounded-[2.5rem] shadow-2xl border border-slate-700 animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-600/40 transform -rotate-6">
            <span className="text-4xl" aria-hidden="true">🌱</span>
          </div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">
            Raíces <span className="text-blue-500">ERP</span>
          </h2>
          <p className="text-slate-500 text-[10px] mt-3 font-black uppercase tracking-[0.4em]">Control de Gestión Industrial</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="emailInput" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
              Usuario Corporativo
            </label>
            <input 
              id="emailInput"
              name="email"
              type="email" 
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 text-white px-5 py-4 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-sm"
              placeholder="nombre@raices.com"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="passwordInput" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
              Clave de Acceso
            </label>
            <input 
              id="passwordInput"
              name="password"
              type="password" 
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 text-white px-5 py-4 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-sm"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            aria-busy={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-[0.25em] text-xs py-5 rounded-2xl transition-all shadow-2xl shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center mt-8 active:scale-95"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Validando...
              </span>
            ) : 'Iniciar Sesión'}
          </button>
        </form>
        
        <p className="text-center mt-8 text-[9px] font-bold text-slate-600 uppercase tracking-widest">
          Desarrollado para Raíces - Berisso 🇦🇷
        </p>
      </div>
    </div>
  );
};