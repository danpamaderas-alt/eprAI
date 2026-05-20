import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useCrmStore } from "../crm/store/useCrmStore";
import Swal from "sweetalert2";
import { Search, CreditCard, X } from "lucide-react";
// 👇 AGREGAMOS SUPABASE PARA QUE GUARDE DE VERDAD 👇
import { supabase } from "../../lib/supabase";

const formatMoney = (amount: number) =>
  `$${Math.abs(amount).toLocaleString("es-AR")}`;

export const CurrentAccounts = memo(() => {
  const { balances, isLoading, fetchBalances } = useCrmStore();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formParams, setFormParams] = useState({
    movement_type: "PAGO" as "PAGO" | "CARGO",
    amount: "" as number | "",
    description: "",
  });

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchBalances();
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, fetchBalances]);

  const globalTotal = useMemo(
    () =>
      balances.reduce(
        (acc, curr) =>
          curr.balance && curr.balance > 0 ? acc + curr.balance : acc,
        0,
      ),
    [balances],
  );

  // 👇 LÓGICA DE GUARDADO REESCRITA PARA HABLAR CON SUPABASE 👇
  const handleSaveMovement = useCallback(async () => {
    if (
      !selectedCustomerId ||
      !formParams.amount ||
      !formParams.description.trim()
    ) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "warning",
        title: "Completá todos los datos",
        showConfirmButton: false,
        timer: 2000,
      });
      return;
    }

    Swal.fire({
      title: "Grabando...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      // 1. Buscamos al cliente actual para saber cuánto debe
      const customer = balances.find((b) => b.id === selectedCustomerId);
      const currentBalance = Number(customer?.balance || 0);
      const amount = Number(formParams.amount);

      // 2. Matemática: Si es CARGO (Deuda), sumamos. Si es PAGO, restamos.
      const newBalance =
        formParams.movement_type === "CARGO"
          ? currentBalance + amount
          : currentBalance - amount;

      // 3. Mandamos el nuevo saldo directo a Supabase
      const { error } = await supabase
        .from("customers")
        .update({ balance: newBalance })
        .eq("id", selectedCustomerId);

      if (error) throw error;

      Swal.fire({
        toast: true,
        icon: "success",
        title: "Operación Registrada",
        position: "top-end",
        showConfirmButton: false,
        timer: 1500,
      });
      setIsModalOpen(false);
      setFormParams({ movement_type: "PAGO", amount: "", description: "" });
      fetchBalances(); // Actualiza los números de fondo automáticamente
    } catch (error: any) {
      console.error("🚨 Error al guardar:", error);
      Swal.fire(
        "Error",
        "No se pudo registrar la operación: " + error.message,
        "error",
      );
    }
  }, [selectedCustomerId, formParams, balances, fetchBalances]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-end bg-white dark:bg-slate-800 p-6 rounded-3xl border dark:border-slate-700 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">
            Cuentas Corrientes
          </h1>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
            Radar de Cobranzas
          </p>
        </div>
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 p-4 rounded-2xl flex flex-col items-end">
          <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">
            Total en la calle
          </span>
          <span className="text-2xl font-black text-rose-700">
            {formatMoney(globalTotal)}
          </span>
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Buscar deudor..."
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-20 text-center animate-pulse font-black text-slate-400 uppercase tracking-widest italic">
            Sincronizando deudas...
          </div>
        ) : (
          balances.map((b) => {
            const isDebtor = (b.balance || 0) > 0;
            const badgeClass = isDebtor
              ? "bg-rose-100 text-rose-700"
              : "bg-emerald-100 text-emerald-700";
            const badgeText = isDebtor ? "Debe" : "A favor";
            const textClass = isDebtor ? "text-rose-600" : "text-emerald-600";

            return (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setSelectedCustomerId(b.id);
                  setIsModalOpen(true);
                }}
                className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-5 rounded-3xl hover:shadow-xl hover:border-blue-400 transition-all group text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-black text-slate-900 dark:text-white uppercase text-sm truncate w-2/3">
                    {b.name}
                  </h4>
                  <span
                    className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${badgeClass}`}
                  >
                    {badgeText}
                  </span>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Saldo Actual
                    </p>
                    <p className={`text-2xl font-black ${textClass}`}>
                      {formatMoney(b.balance || 0)}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <CreditCard className="w-4 h-4" />
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 border dark:border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black text-slate-900 dark:text-white uppercase italic text-xl">
                Registrar Pago
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-rose-500"
              >
                <X />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                {(["PAGO", "CARGO"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setFormParams((prev) => ({ ...prev, movement_type: t }))
                    }
                    className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${formParams.movement_type === t ? "bg-slate-900 dark:bg-slate-700 text-white shadow-md" : "text-slate-500"}`}
                  >
                    {t === "PAGO" ? "Recibí Dinero" : "Sumar Deuda"}
                  </button>
                ))}
              </div>
              <input
                type="number"
                placeholder="Monto $"
                className="w-full p-4 bg-slate-50 dark:bg-slate-950 border dark:border-slate-700 rounded-xl text-xl font-black outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                value={formParams.amount}
                onChange={(e) =>
                  setFormParams((prev) => ({
                    ...prev,
                    amount:
                      e.target.value === ""
                        ? ""
                        : Number.parseFloat(e.target.value),
                  }))
                }
              />
              <input
                type="text"
                placeholder="Concepto..."
                className="w-full p-4 bg-slate-50 dark:bg-slate-950 border dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                value={formParams.description}
                onChange={(e) =>
                  setFormParams((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
              <button
                type="button"
                onClick={handleSaveMovement}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all"
              >
                Confirmar Operación 💾
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

CurrentAccounts.displayName = "CurrentAccounts";
