import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';

export interface Supplier {
  id: string;
  name: string;
  category: string;
  phone?: string;
}

export interface SupplierDebt {
  id: string;
  supplier_id: string;
  description: string;
  amount: number;
  paid_amount: number;
  due_date: string;
  status: 'PENDIENTE' | 'PAGADO';
  suppliers?: Supplier;
}

interface SupplierStore {
  suppliers: Supplier[];
  debts: SupplierDebt[];
  isLoading: boolean;
  fetchSupplierData: () => Promise<void>;
  addSupplier: (supplier: Partial<Supplier>) => Promise<void>;
  addDebt: (debt: Partial<SupplierDebt>) => Promise<void>;
  registerPartialPayment: (debtId: string, paymentAmount: number, description: string) => Promise<void>;
}

export const useSupplierStore = create<SupplierStore>((set, get) => ({
  suppliers: [],
  debts: [],
  isLoading: false,

  fetchSupplierData: async () => {
    set({ isLoading: true });
    const tenantId = useTenantStore.getState().activeCompanyId;
    const [supData, debtData] = await Promise.all([
      supabase.from('suppliers').select('*').eq('company_id', tenantId).order('name'),
      supabase.from('supplier_debts').select('*, suppliers(name)').eq('company_id', tenantId).order('due_date')
    ]);
    set({ suppliers: supData.data || [], debts: debtData.data || [], isLoading: false });
  },

  addSupplier: async (supplier) => {
    const tenantId = useTenantStore.getState().activeCompanyId;
    await supabase.from('suppliers').insert([{ ...supplier, company_id: tenantId }]);
    await get().fetchSupplierData();
  },

  addDebt: async (debt) => {
    const tenantId = useTenantStore.getState().activeCompanyId;
    await supabase.from('supplier_debts').insert([{ ...debt, company_id: tenantId, paid_amount: 0 }]);
    await get().fetchSupplierData();
  },

  registerPartialPayment: async (debtId, paymentAmount, description) => {
    const tenantId = useTenantStore.getState().activeCompanyId;
    
    // Buscar deuda actual
    const { data: debt } = await supabase.from('supplier_debts').select('amount, paid_amount').eq('id', debtId).single();
    if (!debt) return;

    const newPaidAmount = Number(debt.paid_amount || 0) + paymentAmount;
    const isFullyPaid = newPaidAmount >= Number(debt.amount);

    // Actualizar deuda
    await supabase.from('supplier_debts').update({ 
      paid_amount: newPaidAmount,
      status: isFullyPaid ? 'PAGADO' : 'PENDIENTE' 
    }).eq('id', debtId);

    // Registrar gasto en Tesorería
    await supabase.from('expenses').insert([{
      company_id: tenantId,
      amount: paymentAmount,
      description: `PAGO PROVEEDOR (PARCIAL): ${description}`,
      category: 'INSUMOS',
      expense_date: new Date().toISOString().split('T')[0]
    }]);

    await get().fetchSupplierData();
  }
}));