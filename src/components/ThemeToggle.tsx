import { useEffect, useState, useCallback, memo } from 'react';

type ThemeMode = 'light' | 'dark';

// 🚀 Llave personalizada para que no choque con otras webs
const STORAGE_KEY = 'raices_erp_theme'; 

const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light';

  const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
};

export const ThemeToggle = memo(() => {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  // 🚀 OPTIMIZACIÓN: Escuchar cambios del sistema operativo en tiempo real
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      // Solo cambiamos si el usuario no forzó un tema manualmente
      if (!localStorage.getItem(STORAGE_KEY)) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Aplicar las clases al HTML
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
      title={isDark ? 'Modo Claro' : 'Modo Oscuro'}
      className={`
        relative flex items-center justify-center
        w-10 h-10 rounded-xl
        transition-all duration-300
        focus:outline-none focus:ring-2 focus:ring-blue-500/50
        active:scale-95 shadow-sm
        ${isDark 
          ? 'bg-slate-800 border border-slate-700 hover:bg-slate-700 text-amber-400' 
          : 'bg-white border border-slate-200 hover:bg-slate-50 text-blue-600 shadow-slate-200/50'
        }
      `}
    >
      <span className={`absolute transition-all duration-500 ${isDark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}`}>
        {/* SOL */}
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </span>
      
      <span className={`absolute transition-all duration-500 ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`}>
        {/* LUNA */}
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      </span>
    </button>
  );
});

ThemeToggle.displayName = 'ThemeToggle';