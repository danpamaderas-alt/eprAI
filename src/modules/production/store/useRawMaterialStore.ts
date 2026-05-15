import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';
import Swal from 'sweetalert2';

export const useRawMaterialStore = create((set, get) => ({
  materials: [],
  isLoading: false,

  fetchMaterials: async () => {
    set({ isLoading: true });
    const tenantId = useTenantStore.getState().activeCompanyId;
    const { data, error } = await supabase
      .from('raw_materials')
      .select('*')
      .eq('company_id', tenantId)
      .order('created_at', { ascending: false });
    
    if (error) Swal.fire('Error', error.message, 'error');
    set({ materials: data || [], isLoading: false });
  },

  addMaterial: async (material) => {
    const tenantId = useTenantStore.getState().activeCompanyId;
    const { error } = await supabase.from('raw_materials').insert([{ ...material, company_id: tenantId }]);
    if (error) {
      Swal.fire('Error al guardar', error.message, 'error');
      return false;
    }
    await get().fetchMaterials();
    return true;
  }
}));