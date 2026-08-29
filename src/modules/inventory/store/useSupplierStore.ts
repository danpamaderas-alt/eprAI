import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';

export interface Supplier {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  category: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  created_at?: string | null;
}

export interface SupplierDebt {
  id: string;
  supplier_id: string | null;
  description: string;
  amount: number;
  paid_amount: number | null;
  due_date: string;
  status: string;
  created_at: string | null;
}

interface SupplierState {
  suppliers: Supplier[];
  debts: SupplierDebt[];
  isLoading: boolean;
  fetchSuppliers: () => Promise<void>;
  fetchDebts: (supplierId?: string) => Promise<void>;
  addSupplier: (data: Omit<Supplier, 'id'>) => Promise<void>;
  updateSupplier: (id: string, data: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  addDebt: (data: Omit<SupplierDebt, 'id' | 'created_at'>) => Promise<void>;
  updateDebt: (id: string, data: Partial<SupplierDebt>) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
}

export const useSupplierStore = create<SupplierState>((set, get) => ({
  suppliers: [],
  debts: [],
  isLoading: false,

  fetchSuppliers: async () => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) return;
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, contact_person, phone, category, email, address, notes, created_at')
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

  fetchDebts: async (supplierId) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) return;
    try {
      let query = supabase
        .from('supplier_debts')
        .select('id, supplier_id, description, amount, paid_amount, due_date, status, created_at')
        .eq('company_id', companyId)
        .order('due_date', { ascending: false });
      if (supplierId) query = query.eq('supplier_id', supplierId);
      const { data, error } = await query;
      if (error) throw error;
      set({ debts: (data as SupplierDebt[]) || [] });
    } catch (error) {
      console.error('Error cargando deudas:', error);
    }
  },

  addSupplier: async (data) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) throw new Error('No hay company_id activo');
    const { error } = await supabase.from('suppliers').insert([{ ...data, company_id: companyId }]);
    if (error) throw error;
    await get().fetchSuppliers();
  },

  updateSupplier: async (id, data) => {
    const { error } = await supabase.from('suppliers').update(data).eq('id', id);
    if (error) throw error;
    await get().fetchSuppliers();
  },

  deleteSupplier: async (id) => {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) throw error;
    await get().fetchSuppliers();
  },

  addDebt: async (data) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) throw new Error('No hay company_id activo');
    const { error } = await supabase.from('supplier_debts').insert([{ ...data, company_id: companyId }]);
    if (error) throw error;
    await get().fetchDebts();
  },

  updateDebt: async (id, data) => {
    const { error } = await supabase.from('supplier_debts').update(data).eq('id', id);
    if (error) throw error;
    await get().fetchDebts();
  },

  deleteDebt: async (id) => {
    const { error } = await supabase.from('supplier_debts').delete().eq('id', id);
    if (error) throw error;
    await get().fetchDebts();
  },
}));

useTenantStore.subscribe((state, prev) => {
  if (state.activeCompanyId !== prev.activeCompanyId) {
    useSupplierStore.setState({ suppliers: [], debts: [], isLoading: false });
  }
});
