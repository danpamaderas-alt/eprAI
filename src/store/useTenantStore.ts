import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TenantState {
  activeCompanyId: string;
  setActiveCompany: (id: string) => void;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      activeCompanyId: '',
      setActiveCompany: (id) => set({ activeCompanyId: id }),
    }),
    { name: 'tenant-storage' } 
  )
);