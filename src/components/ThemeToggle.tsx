import { memo } from 'react';
import { Sun, Moon } from 'lucide-react';
// Ajusta la ruta de importación a tu entorno
import { useThemeStore } from '../store/useThemeStore';

export const ThemeToggle = memo(() => {
  // Se extrae la verdad absoluta del Store global. Cero estados locales.
  const { isDarkMode, toggleDarkMode } = useThemeStore();

  return (
    <button
      type="button"
      onClick={toggleDarkMode}
      aria-label={isDarkMode ? "Activar modo claro" : "Activar modo oscuro"}
      title={isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}
      className={`
        relative flex items-center justify-center
        w-10 h-10 rounded-xl
        transition-all duration-300
        focus:outline-none focus:ring-2 focus:ring-blue-500/50
        active:scale-95 shadow-sm overflow-hidden
        ${isDarkMode 
          ? 'bg-slate-800 border border-slate-700 hover:bg-slate-700 text-amber-400' 
          : 'bg-white border border-slate-200 hover:bg-slate-50 text-blue-600 shadow-slate-200/50'
        }
      `}
    >
      {/* Animación fluida de transición delegada a Lucide Icons */}
      <span 
        className={`absolute transition-all duration-500 ${
          isDarkMode ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
        }`}
        aria-hidden="true"
      >
        <Sun size={20} strokeWidth={2.5} />
      </span>
      
      <span 
        className={`absolute transition-all duration-500 ${
          isDarkMode ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
        }`}
        aria-hidden="true"
      >
        <Moon size={20} strokeWidth={2.5} />
      </span>
    </button>
  );
});

ThemeToggle.displayName = 'ThemeToggle';