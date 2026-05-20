import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';

export interface Worker {
  id: string;
  name: string;
  role: string;
  phone?: string;
}

export interface WorkerTask {
  id: string;
  worker_id: string;
  description: string;
  quantity: number;
  price_per_unit: number;
  status: 'PENDIENTE' | 'COMPLETADO' | 'PAGADO';
  created_at: string;
  workers?: Worker; 
}

interface WorkerStore {
  workers: Worker[];
  tasks: WorkerTask[];
  isLoading: boolean;
  fetchWorkersData: () => Promise<void>;
  addWorker: (worker: Partial<Worker>) => Promise<boolean>;
  addTask: (task: Partial<WorkerTask>) => Promise<boolean>;
  updateTaskStatus: (taskId: string, newStatus: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
}

export const useWorkerStore = create<WorkerStore>((set, get) => ({
  workers: [],
  tasks: [],
  isLoading: false,

  fetchWorkersData: async () => {
    set({ isLoading: true });
    const tenantId = useTenantStore.getState().activeCompanyId;
    
    const [workersData, tasksData] = await Promise.all([
      supabase.from('workers').select('*').eq('company_id', tenantId).order('name'),
      supabase.from('worker_tasks').select('*, workers(name, role)').eq('company_id', tenantId).order('created_at', { ascending: false })
    ]);

    set({ 
      workers: workersData.data || [], 
      tasks: tasksData.data || [], 
      isLoading: false 
    });
  },

  addWorker: async (worker) => {
    const tenantId = useTenantStore.getState().activeCompanyId;
    // 👇 AHORA ATRAPAMOS EL ERROR SI SUPABASE LO RECHAZA 👇
    const { error } = await supabase.from('workers').insert([{ ...worker, company_id: tenantId }]);
    
    if (error) {
      console.error("🚨 ERROR AL GUARDAR TALLERISTA:", error);
      return false; // Retorna falso si falló
    }
    
    await get().fetchWorkersData();
    return true; // Retorna verdadero si guardó
  },

  addTask: async (task) => {
    const tenantId = useTenantStore.getState().activeCompanyId;
    const { error } = await supabase.from('worker_tasks').insert([{ ...task, company_id: tenantId }]);
    
    if (error) {
      console.error("🚨 ERROR AL GUARDAR TAREA:", error);
      return false;
    }
    
    await get().fetchWorkersData();
    return true;
  },

  updateTaskStatus: async (taskId, newStatus) => {
    await supabase.from('worker_tasks').update({ status: newStatus }).eq('id', taskId);
    await get().fetchWorkersData();
  },

  deleteTask: async (taskId) => {
    await supabase.from('worker_tasks').delete().eq('id', taskId);
    await get().fetchWorkersData();
  }
}));