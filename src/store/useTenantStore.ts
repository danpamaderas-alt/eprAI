import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TenantState {
  activeCompanyId: string;
  setActiveCompany: (id: string) => void;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      // Por defecto, iniciamos sesión en tu empresa "Raíces"
      activeCompanyId: '11111111-1111-1111-1111-111111111111', 
      setActiveCompany: (id) => set({ activeCompanyId: id }),
    }),
    { name: 'tenant-storage' } 
  )
);