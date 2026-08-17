import { useState, useEffect, useCallback, memo } from "react";
import { useCrmStore } from "../crm/store/useCrmStore";
import Swal from "sweetalert2";
import { X, Search } from "lucide-react";
import { ARS } from '../../shared/utils/format';
import { Spinner } from '../../shared/components/ui/Spinner';

export const CurrentAccounts = memo(() => {
  const { balances, isLoading, fetchBalances, addMovement } = useCrmStore();

  // Estado de UI
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado local del formulario (String para evitar NaN en inputs)
  const [formParams, setFormParams] = useState({
    movement_type: "PAGO" as "PAGO" | "CARGO",
    amount: "",
    description: "",
  });

  useEffect(() => {
    const timer = setTimeout(() => fetchBalances(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm, fetchBalances]);

  // Reset y apertura segura del modal
  const handleOpenModal = (customer: { id: string; name: string }) => {
    setSelectedCustomer(customer);
    setFormParams({ movement_type: "PAGO", amount: "", description: "" });
    setIsModalOpen(true);
  };

  const handleSaveMovement = useCallback(async () => {
    const amountVal = Number.parseFloat(formParams.amount);

    // Validación de integridad
    if (
      !selectedCustomer ||
      Number.isNaN(amountVal) ||
      amountVal <= 0 ||
      !formParams.description.trim()
    ) {
      Swal.fire({
        icon: "warning",
        title: "Datos inválidos",
        text: "Verifica el monto y el concepto.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Unificado con la estructura usada en SalesDashboard
      const success = await addMovement({
        customer_id: selectedCustomer.id,
        amount: amountVal,
        movement_type: formParams.movement_type,
        description: formParams.description.trim(),
        date: new Date().toISOString(),
      });

      if (success) {
        Swal.fire({
          toast: true,
          icon: "success",
          title: "Movimiento Registrado",
          position: "top-end",
          showConfirmButton: false,
          timer: 1500,
        });
        setIsModalOpen(false);
      } else {
        throw new Error("Rechazo de servidor");
      }
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo registrar la operación.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedCustomer, formParams, addMovement]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col lg:flex-row justify-between lg:items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
            Cuentas Corrientes
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
            Radar de Cobranzas
          </p>
        </div>
        <div className="relative max-w-sm w-full mt-4 lg:mt-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-sm font-bold shadow-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-20 text-center text-slate-400 italic">
            Sincronizando...
          </div>
        ) : balances.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-400">
            No se encontraron clientes.
          </div>
        ) : (
          balances.map((b) => {
            const balance = b.balance || 0;
            return (
              <button
                key={b.id}
                onClick={() => handleOpenModal({ id: b.id, name: b.name })}
                className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all text-left shadow-sm group"
              >
                <div className="flex justify-between mb-4">
                  <h4 className="font-black text-slate-800 dark:text-white truncate w-2/3">
                    {b.name}
                  </h4>
                  <span
                    className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest ${balance > 0 ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400" : balance < 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}
                  >
                    {balance > 0
                      ? "Deudor"
                      : balance < 0
                        ? "A favor"
                        : "Al día"}
                  </span>
                </div>
                <p
                  className={`text-3xl font-black tracking-tighter ${balance > 0 ? "text-rose-600" : balance < 0 ? "text-emerald-600" : "text-slate-900 dark:text-white"}`}
                >
                  {ARS.format(balance)}
                </p>
              </button>
            );
          })
        )}
      </div>

      {isModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="font-black text-xl italic dark:text-white">
                  Registrar Movimiento
                </h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                  {selectedCustomer.name}
                </p>
              </div>
              {!isSubmitting && (
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                {(["PAGO", "CARGO"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() =>
                      setFormParams((p) => ({ ...p, movement_type: t }))
                    }
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${formParams.movement_type === t ? (t === "PAGO" ? "bg-emerald-500 text-white shadow-md" : "bg-rose-500 text-white shadow-md") : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                  >
                    {t === "PAGO" ? "Recibí Dinero (+)" : "Sumar Deuda (-)"}
                  </button>
                ))}
              </div>

              <input
                type="number"
                step="0.01"
                placeholder="Monto $"
                value={formParams.amount}
                onChange={(e) =>
                  setFormParams((p) => ({ ...p, amount: e.target.value }))
                }
                className="w-full p-4 bg-slate-50 dark:bg-slate-950 dark:text-white rounded-2xl font-black text-xl outline-none focus:ring-2 focus:ring-blue-500 border border-slate-100 dark:border-slate-800"
              />
              <input
                type="text"
                placeholder="Concepto..."
                value={formParams.description}
                onChange={(e) =>
                  setFormParams((p) => ({ ...p, description: e.target.value }))
                }
                className="w-full p-4 bg-slate-50 dark:bg-slate-950 dark:text-white rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 border border-slate-100 dark:border-slate-800"
              />

              <button
                disabled={isSubmitting}
                onClick={handleSaveMovement}
                className={`w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${isSubmitting ? "opacity-50" : "hover:bg-blue-700 active:scale-95"}`}
              >
                {isSubmitting ? (
                  <Spinner size="sm" className="text-white mx-auto" />
                ) : (
                  "Confirmar Operación 💾"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

CurrentAccounts.displayName = "CurrentAccounts";
