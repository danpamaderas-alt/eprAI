import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';

export interface QuoteItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface Quote {
  id: string;
  customer_name: string;
  customer_contact?: string;
  items: QuoteItem[];
  total_amount: number;
  status: string;
  valid_until?: string;
  created_at: string;
}

interface QuoteStore {
  quotes: Quote[];
  isLoading: boolean;
  fetchQuotes: () => Promise<void>;
  addQuote: (quote: Partial<Quote>) => Promise<boolean>;
  updateStatus: (id: string, newStatus: string) => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;
}

export const useQuoteStore = create<QuoteStore>((set, get) => ({
  quotes: [],
  isLoading: false,

  fetchQuotes: async () => {
    set({ isLoading: true });
    const tenantId = useTenantStore.getState().activeCompanyId;
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('company_id', tenantId)
      .order('created_at', { ascending: false });

    if (!error && data) set({ quotes: data, isLoading: false });
    else set({ isLoading: false });
  },

  addQuote: async (quote) => {
    const tenantId = useTenantStore.getState().activeCompanyId;
    const { error } = await supabase
      .from('quotes')
      .insert([{ ...quote, company_id: tenantId }]);
    
    if (!error) {
      await get().fetchQuotes();
      return true;
    }
    return false;
  },

  updateStatus: async (id, newStatus) => {
    const { error } = await supabase.from('quotes').update({ status: newStatus }).eq('id', id);
    if (!error) await get().fetchQuotes();
  },

  deleteQuote: async (id) => {
    const { error } = await supabase.from('quotes').delete().eq('id', id);
    if (!error) await get().fetchQuotes();
  }
}));