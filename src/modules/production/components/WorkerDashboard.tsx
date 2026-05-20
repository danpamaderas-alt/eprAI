import React, { useEffect, useMemo } from "react";
import { useWorkerStore, type Worker } from "../../quotes/store/useWorkerStore"; // <-- Chequeá que el path sea este
import Swal from "sweetalert2";

export const WorkerDashboard = () => {
  const {
    workers,
    tasks,
    isLoading,
    fetchWorkersData,
    addWorker,
    addTask,
    updateTaskStatus,
    deleteTask,
  } = useWorkerStore();

  useEffect(() => {
    fetchWorkersData();
  }, [fetchWorkersData]);

  // 🧠 CÁLCULO DE DEUDA A LIQUIDAR POR TALLERISTA
  const payroll = useMemo(() => {
    return workers.map((worker) => {
      const workerTasks = tasks.filter((t) => t.worker_id === worker.id);

      const toPay = workerTasks
        .filter((t) => t.status === "COMPLETADO")
        .reduce((sum, t) => sum + t.quantity * t.price_per_unit, 0);

      const inProgress = workerTasks
        .filter((t) => t.status === "PENDIENTE")
        .reduce((sum, t) => sum + t.quantity * t.price_per_unit, 0);

      return { ...worker, toPay, inProgress };
    });
  }, [workers, tasks]);

  const handleAddWorker = async () => {
    const { value: formValues } = await Swal.fire({
      title: "NUEVO TALLERISTA",
      html: `
        <div class="space-y-4 mt-2">
          <input id="w-name" class="swal2-input !w-full !m-0 !bg-slate-950 !border-slate-800 !text-white !rounded-xl" placeholder="Nombre completo">
          <select id="w-role" class="swal2-input !w-full !m-0 !bg-slate-950 !border-slate-800 !text-white !rounded-xl">
            <option value="COSTURA">Costura / Confección</option>
            <option value="CORTE">Corte de Tela</option>
            <option value="ESTAMPADO">Estampado / DTF</option>
            <option value="BORDADO">Bordado</option>
            <option value="OTROS">Otros</option>
          </select>
          <input id="w-phone" class="swal2-input !w-full !m-0 !bg-slate-950 !border-slate-800 !text-white !rounded-xl" placeholder="Teléfono / WhatsApp">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "AGREGAR",
      customClass: {
        popup: "!bg-slate-900 !border-slate-800 !rounded-[2rem]",
        confirmButton:
          "w-full bg-indigo-600 text-white font-black py-4 rounded-xl uppercase text-xs",
      },
    });

    if (formValues) {
      const name = (document.getElementById("w-name") as HTMLInputElement)
        .value;
      const role = (document.getElementById("w-role") as HTMLSelectElement)
        .value;
      const phone = (document.getElementById("w-phone") as HTMLInputElement)
        .value;

      if (name) {
        Swal.fire({
          title: "Guardando...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });
        // 👇 ACÁ ESTÁ LA MAGIA QUE AVISA SI FALLA 👇
        const success = await addWorker({ name, role, phone });
        if (success) {
          Swal.fire({
            icon: "success",
            title: "Tallerista agregado",
            timer: 1500,
            showConfirmButton: false,
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo guardar el tallerista en Supabase. Revisá la consola (F12).",
          });
        }
      }
    }
  };

  const handleAssignTask = async (workerId: string, workerName: string) => {
    const { value: formValues } = await Swal.fire({
      title: `ASIGNAR TRABAJO`,
      html: `
        <div class="text-left space-y-4 mt-2">
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-4">Para: <span class="text-indigo-400">${workerName}</span></p>
          <input id="t-desc" class="swal2-input !w-full !m-0 !bg-slate-950 !border-slate-800 !text-white !rounded-xl" placeholder="Ej: Cerrar Chombas Talle L">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-[10px] font-black text-slate-500 uppercase ml-1">Cantidad (Un.)</label>
              <input id="t-qty" type="number" class="swal2-input !w-full !m-0 !mt-1 !bg-slate-950 !border-slate-800 !text-white !rounded-xl !text-center !font-black text-xl" placeholder="0">
            </div>
            <div>
              <label class="text-[10px] font-black text-slate-500 uppercase ml-1">Precio x Unidad ($)</label>
              <input id="t-price" type="number" class="swal2-input !w-full !m-0 !mt-1 !bg-slate-950 !border-slate-800 !text-emerald-400 !rounded-xl !text-center !font-black text-xl" placeholder="0">
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "ASIGNAR TRABAJO",
      customClass: {
        popup: "!bg-slate-900 !border-slate-800 !rounded-[2rem]",
        confirmButton:
          "w-full bg-emerald-600 text-white font-black py-4 rounded-xl uppercase text-xs",
      },
    });

    if (formValues) {
      const description = (
        document.getElementById("t-desc") as HTMLInputElement
      ).value;
      const quantity = Number(
        (document.getElementById("t-qty") as HTMLInputElement).value,
      );
      const price_per_unit = Number(
        (document.getElementById("t-price") as HTMLInputElement).value,
      );

      if (description && quantity > 0) {
        Swal.fire({
          title: "Asignando...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });
        const success = await addTask({
          worker_id: workerId,
          description,
          quantity,
          price_per_unit,
          status: "PENDIENTE",
        });
        if (success)
          Swal.fire({
            icon: "success",
            title: "Trabajo asignado",
            timer: 1500,
            showConfirmButton: false,
          });
        else
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "Revisá la consola.",
          });
      }
    }
  };

  if (isLoading)
    return (
      <div className="p-8 text-slate-400 font-black animate-pulse uppercase">
        Cargando Taller...
      </div>
    );

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500 space-y-10">
      <header className="flex justify-between items-center bg-slate-900 border border-slate-800 p-8 rounded-[2rem] shadow-xl">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">
            ✂️ Taller y <span className="text-emerald-500">Destajo</span>
          </h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">
            Control de personal, asignación de corte/costura y liquidaciones.
          </p>
        </div>
        <button
          onClick={handleAddWorker}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
        >
          + Nuevo Tallerista
        </button>
      </header>

      {/* SECCIÓN 1: EL EQUIPO Y LA LIQUIDACIÓN */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {payroll.length === 0 && (
          <p className="text-slate-500 text-sm">
            No hay talleristas. Agregá el primero.
          </p>
        )}
        {payroll.map((worker) => (
          <div
            key={worker.id}
            className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-xl relative overflow-hidden group"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">
                  {worker.name}
                </h3>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                  {worker.role}
                </span>
              </div>
              <button
                onClick={() => handleAssignTask(worker.id, worker.name)}
                className="bg-slate-800 hover:bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black transition-colors"
                title="Asignar Tarea"
              >
                +
              </button>
            </div>

            <div className="flex gap-4 pt-4 border-t border-slate-800">
              <div className="flex-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  A Liquidar (Terminado)
                </p>
                <p
                  className={`text-2xl font-black tracking-tighter ${worker.toPay > 0 ? "text-emerald-400" : "text-slate-600"}`}
                >
                  ${worker.toPay.toLocaleString()}
                </p>
              </div>
              <div className="flex-1 border-l border-slate-800 pl-4">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  En Proceso
                </p>
                <p className="text-lg font-black text-amber-400/70 tracking-tighter">
                  ${worker.inProgress.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* SECCIÓN 2: TABLERO DE TAREAS ACTIVAS */}
      <section>
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">
          Trabajos en Curso y Pendientes de Pago
        </h2>
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-xl">
          {tasks.filter((t) => t.status !== "PAGADO").length === 0 ? (
            <p className="text-center text-slate-500 font-bold text-xs uppercase py-4">
              No hay trabajos activos en el taller.
            </p>
          ) : (
            <div className="space-y-3">
              {tasks
                .filter((t) => t.status !== "PAGADO")
                .map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-950 border border-slate-800/50 rounded-2xl gap-4 hover:border-indigo-500/30 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span
                          className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${task.status === "PENDIENTE" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}
                        >
                          {task.status}
                        </span>
                        <span className="text-xs font-black text-slate-300 uppercase">
                          {task.workers?.name}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-white">
                        {task.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                          {task.quantity} un. x ${task.price_per_unit}
                        </p>
                        <p className="text-xl font-black text-emerald-400 tracking-tighter">
                          $
                          {(
                            task.quantity * task.price_per_unit
                          ).toLocaleString()}
                        </p>
                      </div>

                      {/* BOTONERA DE ACCIONES */}
                      <div className="flex gap-2">
                        {task.status === "PENDIENTE" && (
                          <button
                            onClick={() =>
                              updateTaskStatus(task.id, "COMPLETADO")
                            }
                            title="Marcar como Terminado"
                            className="p-3 bg-slate-800 hover:bg-emerald-600 text-slate-400 hover:text-white rounded-xl transition-colors"
                          >
                            ✔️
                          </button>
                        )}
                        {task.status === "COMPLETADO" && (
                          <button
                            onClick={() => updateTaskStatus(task.id, "PAGADO")}
                            title="Marcar como Pagado"
                            className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg transition-colors"
                          >
                            Liquidar
                          </button>
                        )}
                        <button
                          onClick={() => deleteTask(task.id)}
                          title="Borrar Tarea"
                          className="p-3 bg-slate-800 hover:bg-rose-600 text-slate-500 hover:text-white rounded-xl transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
