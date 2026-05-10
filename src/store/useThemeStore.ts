import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (isDark: boolean) => void;
}

// Mutador imperativo del DOM (Rompe el ciclo de React para evitar FOUC en interacciones)
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
    (set) => ({
      // Estado inicial dinámico basado en SO (Fallback si no hay persistencia)
      isDarkMode: typeof window !== 'undefined' 
        ? window.matchMedia('(prefers-color-scheme: dark)').matches 
        : true,
      
      toggleDarkMode: () => set((state) => {
        const newMode = !state.isDarkMode;
        updateDOM(newMode);
        return { isDarkMode: newMode };
      }),
      
      setDarkMode: (isDark) => set(() => {
        updateDOM(isDark);
        return { isDarkMode: isDark };
      }),
    }),
    { 
      name: 'raices_erp_theme', // Key enterprise, sin colisiones
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Error al hidratar el tema:', error);
        } else if (state) {
          // Se ejecuta al cargar de localStorage (sincroniza DOM en el arranque)
          updateDOM(state.isDarkMode);
        }
      }
    }
  )
);

// Sincronización pasiva: Escuchar cambios en el Sistema Operativo en tiempo real
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', (e) => {
    // Actualiza el store (y el DOM) si el OS cambia
    useThemeStore.getState().setDarkMode(e.matches);
  });
}