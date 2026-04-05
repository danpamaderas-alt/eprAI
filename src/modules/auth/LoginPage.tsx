import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Swal from 'sweetalert2';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Dependencia requerida para sacar al usuario del login tras el éxito
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
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
      // el usuario retroceda a la pantalla de login usando el botón "Atrás" del navegador
      navigate('/inicio', { replace: true });
      
    } catch (error: any) {
      console.error('[Security] Fallo de autenticación o de red:', error);
      
      Swal.fire({ 
        icon: 'error', 
        title: 'Acceso Denegado', 
        text: 'Credenciales inválidas o error de conexión.', 
        background: '#0f172a', 
        color: '#fff',
        confirmButtonColor: '#2563eb'
      });
      
      // Solo restauramos el estado de carga si hubo fallo. Si hay éxito, 
      // el componente se desmonta por el navigate().
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/30">
            <span className="text-3xl" aria-hidden="true">🔐</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">ERP RAÍCES 3.0</h2>
          <p className="text-slate-400 text-sm mt-2">Ingresa tus credenciales corporativas</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="emailInput" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Correo Electrónico
            </label>
            <input 
              id="emailInput"
              type="email" 
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl outline-none focus:border-blue-500 transition-colors"
              placeholder="tu@correo.com"
            />
          </div>
          
          <div>
            <label htmlFor="passwordInput" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Contraseña
            </label>
            <input 
              id="passwordInput"
              type="password" 
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl outline-none focus:border-blue-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-4"
          >
            {loading ? 'Verificando firma...' : 'Entrar al Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
};