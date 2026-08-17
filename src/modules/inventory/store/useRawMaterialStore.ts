// src/modules/inventory/store/useRawMaterialStore.ts
import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';

export interface RawMaterial {
  id: string;
  name: string;
  category: string;
  color?: string;
  composition?: string;
  unit_measure: string;
  stock_quantity: number;
  min_stock_alert: number;
}

interface RawMaterialStore {
  materials: RawMaterial[];
  isLoading: boolean;
  fetchMaterials: () => Promise<void>;
  addMaterial: (material: Partial<RawMaterial>) => Promise<void>;
  updateMaterial: (id: string, updates: Partial<RawMaterial>) => Promise<void>; // ✅ NUEVO
  deleteMaterial: (id: string) => Promise<void>; // ✅ NUEVO
  updateStock: (id: string, newQuantity: number) => Promise<void>;
}

export const useRawMaterialStore = create<RawMaterialStore>((set, get) => ({
  materials: [],
  isLoading: false,

  fetchMaterials: async () => {
    set({ isLoading: true });
    const tenantId = useTenantStore.getState().activeCompanyId;
    const { data, error } = await supabase
      .from('raw_materials')
      .select('id, name, category, color, composition, unit_measure, stock_quantity, min_stock_alert')
      .eq('company_id', tenantId)
      .order('created_at', { ascending: false });

    if (!error && data) set({ materials: data, isLoading: false });
    else set({ isLoading: false });
  },

  addMaterial: async (material) => {
    const tenantId = useTenantStore.getState().activeCompanyId;
    const { error } = await supabase
      .from('raw_materials')
      .insert([{ ...material, company_id: tenantId }]);
    if (!error) await get().fetchMaterials();
  },

  updateMaterial: async (id, updates) => {
    const { error } = await supabase
      .from('raw_materials')
      .update(updates)
      .eq('id', id);
    if (!error) await get().fetchMaterials();
  },

  deleteMaterial: async (id) => {
    const { error } = await supabase
      .from('raw_materials')
      .delete()
      .eq('id', id);
    if (!error) await get().fetchMaterials();
  },

  updateStock: async (id, newQuantity) => {
    const { error } = await supabase
      .from('raw_materials')
      .update({ stock_quantity: newQuantity })
      .eq('id', id);
    if (!error) await get().fetchMaterials();
  }
}));