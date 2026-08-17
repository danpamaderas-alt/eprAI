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
  workers?: Worker; // Relación con la tabla workers
}

interface WorkerStore {
  workers: Worker[];
  tasks: WorkerTask[];
  isLoading: boolean;
  fetchWorkersData: () => Promise<void>;
  addWorker: (worker: Partial<Worker>) => Promise<void>;
  addTask: (task: Partial<WorkerTask>) => Promise<void>;
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
      supabase.from('workers').select('id, name, role, phone').eq('company_id', tenantId).order('name'),
      supabase.from('worker_tasks').select('id, worker_id, description, quantity, price_per_unit, status, workers(name, role)').eq('company_id', tenantId).order('created_at', { ascending: false })
    ]);

    set({ 
      workers: workersData.data || [], 
      tasks: tasksData.data || [], 
      isLoading: false 
    });
  },

  addWorker: async (worker) => {
    const tenantId = useTenantStore.getState().activeCompanyId;
    await supabase.from('workers').insert([{ ...worker, company_id: tenantId }]);
    await get().fetchWorkersData();
  },

  addTask: async (task) => {
    const tenantId = useTenantStore.getState().activeCompanyId;
    await supabase.from('worker_tasks').insert([{ ...task, company_id: tenantId }]);
    await get().fetchWorkersData();
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