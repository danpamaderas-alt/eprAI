import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  isDarkMode: boolean;
  setMode: (mode: ThemeMode) => void;
  // Compatibilidad hacia atrás
  toggleDarkMode: () => void;
  setDarkMode: (isDark: boolean) => void;
}

const getSystemTheme = () => typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : true;

// VANGUARDIA: Mutador imperativo del DOM (Rompe el ciclo de React para evitar FOUC)
const updateDOM = (isDark: boolean) => {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      isDarkMode: getSystemTheme(),
      
      setMode: (mode) => {
        const isDark = mode === 'system' ? getSystemTheme() : mode === 'dark';
        updateDOM(isDark);
        set({ mode, isDarkMode: isDark });
      },
      
      toggleDarkMode: () => {
        const isDark = !get().isDarkMode;
        get().setMode(isDark ? 'dark' : 'light');
      },
      
      setDarkMode: (isDark) => {
        get().setMode(isDark ? 'dark' : 'light');
      },
    }),
    { 
      name: 'raices_erp_theme_v2', // Nueva key para evitar conflictos con versiones anteriores
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Error al hidratar el tema:', error);
        } else if (state) {
          const isDark = state.mode === 'system' ? getSystemTheme() : state.mode === 'dark';
          updateDOM(isDark);
          
          if (state.isDarkMode !== isDark) {
            useThemeStore.setState({ isDarkMode: isDark });
          }
        }
      }
    }
  )
);

// VANGUARDIA (UX): Escuchar cambios en el Sistema Operativo en tiempo real, 
// PERO respetando si el usuario eligió forzar un modo específico.
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    const { mode, setMode } = useThemeStore.getState();
    if (mode === 'system') {
      setMode('system'); // Re-evalúa y aplica el cambio de DOM
    }
  });
}