import { useEffect, useState } from 'react';

export const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkSaved = localStorage.getItem('epr_theme') === 'dark';
    setIsDark (isDarkSaved);
    if (isDarkSaved) document.documentElement.classList.add('dark');
  }, []);

  const toggleTheme = () => {
    const nextTheme = !isDark;
    setIsDark(nextTheme);
    if (nextTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('epr_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('epr_theme', 'light');
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-500 shadow-xl
        focus:outline-none focus:ring-4 focus:ring-blue-500/30 active:scale-90
        ${isDark 
          ? 'bg-slate-800 shadow-blue-900/20 hover:shadow-blue-900/40 hover:bg-slate-700 border border-slate-700' 
          : 'bg-white shadow-slate-200 hover:shadow-slate-300 hover:bg-slate-50 border border-slate-100'
        }
      `}
      title="Alternar Modo Oscuro"
    >
      {/* Icono Sol (Desaparece y gira en modo oscuro) */}
      <svg 
        className={`absolute w-6 h-6 text-amber-500 transition-all duration-500 ${isDark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}`} 
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
      
      {/* Icono Luna (Aparece y gira en modo oscuro) */}
      <svg 
        className={`absolute w-5 h-5 text-blue-400 transition-all duration-500 ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`} 
        fill="currentColor" viewBox="0 0 20 20"
      >
        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
      </svg>
    </button>
  );
};