import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';

export interface Supplier {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  category: string | null;
}

interface SupplierState {
  suppliers: Supplier[];
  isLoading: boolean;
  fetchSuppliers: () => Promise<void>;
  addSupplier: (data: Omit<Supplier, 'id'>) => Promise<void>;
}

export const useSupplierStore = create<SupplierState>((set, get) => ({
  suppliers: [],
  isLoading: false,

  fetchSuppliers: async () => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) return;

    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, contact_person, phone, category')
        .eq('company_id', companyId)
        .order('name');
      if (error) throw error;
      set({ suppliers: (data as Supplier[]) || [] });
    } catch (error) {
      console.error('Error cargando proveedores:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addSupplier: async (data) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) throw new Error('No hay company_id activo');
    const { error } = await supabase.from('suppliers').insert([{ ...data, company_id: companyId }]);
    if (error) throw error;
    await get().fetchSuppliers();
  },
}));
