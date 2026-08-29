import { useEffect, useMemo, useState, useCallback } from 'react';
import { useWorkerStore } from '../../quotes/store/useWorkerStore';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal, FormField } from '../../../shared/components/ui/Modal';

const Swal = {
  fire: async (...args: [import('sweetalert2').SweetAlertOptions]) => {
    const m = (await import('sweetalert2')).default as unknown as { fire: (...a: [import('sweetalert2').SweetAlertOptions]) => Promise<unknown> };
    return m.fire(...args);
  },
};

const workerSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  role: z.enum(["COSTURA", "CORTE", "ESTAMPADO", "BORDADO", "OTROS"]),
  phone: z.string().optional(),
});
type WorkerForm = z.infer<typeof workerSchema>;

const taskSchema = z.object({
  description: z.string().min(1, "La descripcion es obligatoria"),
  quantity: z.number().min(1, "Minimo 1 unidad"),
  price_per_unit: z.number().min(0, "Precio invalido"),
});
type TaskForm = z.infer<typeof taskSchema>;

export const WorkerDashboard = () => {
  const { workers, tasks, isLoading, fetchWorkersData, addWorker, addTask, updateTaskStatus, deleteTask } = useWorkerStore();

  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [taskModal, setTaskModal] = useState<{ workerId: string; workerName: string } | null>(null);

  const workerForm = useForm<WorkerForm>({
    resolver: zodResolver(workerSchema),
    defaultValues: { role: "COSTURA" },
  });

  const taskForm = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: { quantity: 1, price_per_unit: 0 },
  });

  useEffect(() => { fetchWorkersData(); }, [fetchWorkersData]);

  const payroll = useMemo(() => {
    return workers.map(worker => {
      const workerTasks = tasks.filter(t => t.worker_id === worker.id);
      const toPay = workerTasks
        .filter(t => t.status === 'COMPLETADO')
        .reduce((sum, t) => sum + (t.quantity * t.price_per_unit), 0);
      const inProgress = workerTasks
        .filter(t => t.status === 'PENDIENTE')
        .reduce((sum, t) => sum + (t.quantity * t.price_per_unit), 0);
      return { ...worker, toPay, inProgress };
    });
  }, [workers, tasks]);

  const onSubmitWorker = useCallback(async (data: WorkerForm) => {
    await addWorker(data);
    setIsWorkerModalOpen(false);
    workerForm.reset();
  }, [addWorker, workerForm]);

  const onSubmitTask = useCallback(async (data: TaskForm) => {
    if (!taskModal) return;
    await addTask({ worker_id: taskModal.workerId, description: data.description, quantity: data.quantity, price_per_unit: data.price_per_unit, status: 'PENDIENTE' });
    setTaskModal(null);
    taskForm.reset();
  }, [addTask, taskModal, taskForm]);

  const openTaskModal = useCallback((workerId: string, workerName: string) => {
    taskForm.reset({ description: '', quantity: 1, price_per_unit: 0 });
    setTaskModal({ workerId, workerName });
  }, [taskForm]);

  if (isLoading) return <div className="p-8 text-slate-400 font-black animate-pulse uppercase">Cargando Taller...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500 space-y-10">

      <header className="flex justify-between items-center bg-slate-900 border border-slate-800 p-8 rounded-[2rem] shadow-xl">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">Taller y <span className="text-emerald-500">Destajo</span></h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">Control de personal, asignacion de corte/costura y liquidaciones.</p>
        </div>
        <button onClick={() => { workerForm.reset({ role: "COSTURA" }); setIsWorkerModalOpen(true); }} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-colors transition-transform">
          + Nuevo Tallerista
        </button>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {payroll.map(worker => (
          <div key={worker.id} className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-xl relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">{worker.name}</h3>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{worker.role}</span>
              </div>
              <button onClick={() => openTaskModal(worker.id, worker.name)} className="bg-slate-800 hover:bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black transition-colors" title="Asignar Tarea">+</button>
            </div>

            <div className="flex gap-4 pt-4 border-t border-slate-800">
              <div className="flex-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">A Liquidar (Terminado)</p>
                <p className={`text-2xl font-black tracking-tighter ${worker.toPay > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>${worker.toPay.toLocaleString()}</p>
              </div>
              <div className="flex-1 border-l border-slate-800 pl-4">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">En Proceso</p>
                <p className="text-lg font-black text-amber-400/70 tracking-tighter">${worker.inProgress.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Trabajos en Curso y Pendientes de Pago</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-xl">
          {tasks.filter(t => t.status !== 'PAGADO').length === 0 ? (
            <p className="text-center text-slate-500 font-bold text-xs uppercase py-4">No hay trabajos activos en el taller.</p>
          ) : (
            <div className="space-y-3">
              {tasks.filter(t => t.status !== 'PAGADO').map(task => (
                <div key={task.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-950 border border-slate-800/50 rounded-2xl gap-4 hover:border-indigo-500/30 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${task.status === 'PENDIENTE' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {task.status}
                      </span>
                      <span className="text-xs font-black text-slate-300 uppercase">{task.workers?.name}</span>
                    </div>
                    <p className="text-sm font-bold text-white">{task.description}</p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{task.quantity} un. x ${task.price_per_unit}</p>
                      <p className="text-xl font-black text-emerald-400 tracking-tighter">${(task.quantity * task.price_per_unit).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      {task.status === 'PENDIENTE' && (
                        <button onClick={() => updateTaskStatus(task.id, 'COMPLETADO')} title="Marcar como Terminado" className="p-3 bg-slate-800 hover:bg-emerald-600 text-emerald-100 hover:text-white rounded-xl transition-colors">✔</button>
                      )}
                      {task.status === 'COMPLETADO' && (
                        <button onClick={() => updateTaskStatus(task.id, 'PAGADO')} title="Marcar como Pagado" className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg transition-colors">Liquidar</button>
                      )}
                      <button onClick={() => { void Swal.fire({ title: '¿Borrar tarea?', text: 'La tarea se eliminará junto con su monto asociado.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Borrar', confirmButtonColor: '#e11d48' }).then((r) => { if ((r as { isConfirmed?: boolean }).isConfirmed) void deleteTask(task.id); }); }} title="Borrar Tarea" className="p-3 bg-slate-800 hover:bg-rose-600 text-rose-100 hover:text-white rounded-xl transition-colors">X</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Modal
        isOpen={isWorkerModalOpen}
        onClose={() => setIsWorkerModalOpen(false)}
        title="NUEVO TALLERISTA"
        onSubmit={workerForm.handleSubmit(onSubmitWorker)}
        submitLabel="AGREGAR"
        submitColor="bg-indigo-600 hover:bg-indigo-500"
      >
        <FormField label="Nombre completo">
          <input {...workerForm.register("name")} className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold focus:ring-2 focus:ring-indigo-500 dark:text-white" placeholder="Nombre completo" />
          {workerForm.formState.errors.name && <p className="text-rose-500 text-[10px] font-bold mt-1">{workerForm.formState.errors.name.message}</p>}
        </FormField>
        <FormField label="Especialidad">
          <select {...workerForm.register("role")} className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold focus:ring-2 focus:ring-indigo-500 dark:text-white">
            <option value="COSTURA">Costura / Confeccion</option>
            <option value="CORTE">Corte de Tela</option>
            <option value="ESTAMPADO">Estampado / DTF</option>
            <option value="BORDADO">Bordado</option>
            <option value="OTROS">Otros</option>
          </select>
        </FormField>
        <FormField label="Telefono / WhatsApp">
          <input {...workerForm.register("phone")} className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold focus:ring-2 focus:ring-indigo-500 dark:text-white" placeholder="Telefono" />
        </FormField>
      </Modal>

      <Modal
        isOpen={!!taskModal}
        onClose={() => setTaskModal(null)}
        title={`ASIGNAR TRABAJO`}
        onSubmit={taskForm.handleSubmit(onSubmitTask)}
        submitLabel="ASIGNAR TRABAJO"
        submitColor="bg-emerald-600 hover:bg-emerald-500"
      >
        {taskModal && (
          <>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-2">Para: <span className="text-indigo-400">{taskModal.workerName}</span></p>
            <FormField label="Descripcion del trabajo">
              <input {...taskForm.register("description")} className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold focus:ring-2 focus:ring-emerald-500 dark:text-white" placeholder="Ej: Cerrar Chombas Talle L" />
              {taskForm.formState.errors.description && <p className="text-rose-500 text-[10px] font-bold mt-1">{taskForm.formState.errors.description.message}</p>}
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Cantidad (Un.)">
                <input type="number" {...taskForm.register("quantity", { valueAsNumber: true })} className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-black text-xl text-center focus:ring-2 focus:ring-emerald-500 dark:text-white" />
                {taskForm.formState.errors.quantity && <p className="text-rose-500 text-[10px] font-bold mt-1">{taskForm.formState.errors.quantity.message}</p>}
              </FormField>
              <FormField label="Precio x Unidad ($)">
                <input type="number" step="0.01" {...taskForm.register("price_per_unit", { valueAsNumber: true })} className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-black text-xl text-center text-emerald-500 focus:ring-2 focus:ring-emerald-500 dark:text-white" />
                {taskForm.formState.errors.price_per_unit && <p className="text-rose-500 text-[10px] font-bold mt-1">{taskForm.formState.errors.price_per_unit.message}</p>}
              </FormField>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};
