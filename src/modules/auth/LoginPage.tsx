import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Swal from 'sweetalert2';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  // 🚀 OPTIMIZACIÓN: Memorizamos la función de login para no recrearla en cada tipeo
  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Sanitización silenciosa de espacios accidentales
    const sanitizedEmail = email.trim();
    if (!sanitizedEmail || !password) return;

    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password,
      });

      // Se lanza el error intencionalmente para capturarlo en el catch
      if (error) throw error;

      // [SEGURIDAD] Redirección imperativa usando replace para evitar que 
      // el usuario retroceda a la pantalla de login
      navigate('/inicio', { replace: true });
      
    } catch (error: unknown) {
      console.error('[Security] Fallo de autenticación o de red:', error);
      
      Swal.fire({ 
        icon: 'error', 
        title: 'Acceso Denegado', 
        text: 'Credenciales inválidas o error de conexión.', 
        background: '#0f172a', 
        color: '#fff',
        confirmButtonColor: '#2563eb'
      });
      
      // Solo restauramos el estado de carga si hubo fallo
      setLoading(false);
    }
  }, [email, password, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="max-w-md w-full bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-700">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/30">
            <span className="text-3xl" aria-hidden="true">🔐</span>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Raíces <span className="text-blue-500">ERP</span></h2>
          <p className="text-slate-400 text-xs mt-2 font-bold uppercase tracking-widest">Acceso Corporativo</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="emailInput" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Correo Electrónico
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
              className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-3.5 rounded-xl outline-none focus:border-blue-500 transition-colors font-medium text-sm"
              placeholder="tu@correo.com"
            />
          </div>
          
          <div>
            <label htmlFor="passwordInput" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Contraseña
            </label>
            <input 
              id="passwordInput"
              name="password"
              type="password" 
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-3.5 rounded-xl outline-none focus:border-blue-500 transition-colors font-medium text-sm"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            aria-busy={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-[0.2em] text-sm py-4 rounded-xl transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center mt-6 active:scale-95"
          >
            {loading ? 'Verificando...' : 'Entrar al Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
};