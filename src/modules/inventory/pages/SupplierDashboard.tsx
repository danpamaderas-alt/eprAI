import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Building2, Plus, Truck, Phone } from "lucide-react";
import Swal from "sweetalert2";
import { useSupplierStore } from "../store/useSupplierStore";

const ARS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export const SupplierDashboard = () => {
  const { suppliers, isLoading, fetchSuppliers, addSupplier } =
    useSupplierStore();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // 🚀 OPTIMIZACIÓN: Búsqueda rápida en memoria
  const filteredSuppliers = useMemo(() => {
    if (!searchTerm) return suppliers;
    const lower = searchTerm.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(lower) ||
        (s.contact && s.contact.toLowerCase().includes(lower)),
    );
  }, [suppliers, searchTerm]);

  // 🛡️ SEGURIDAD VANGUARDISTA: Modal de creación blindado contra XSS
  const handleAddSupplier = useCallback(async () => {
    const { value: formValues } = await Swal.fire({
      title: "ALTA DE PROVEEDOR",
      html: `
        <div class="text-left space-y-4 p-2">
          <div>
            <label class="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Razón Social / Nombre</label>
            <input id="sup-name" class="swal2-input !w-full !m-0 !mt-1 !bg-slate-50 dark:!bg-slate-900 !border-slate-200 dark:!border-slate-700 !text-slate-900 dark:!text-white !font-bold !rounded-xl" placeholder="Ej: Textil San Juan S.A.">
          </div>
          <div>
            <label class="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Contacto Principal</label>
            <input id="sup-contact" class="swal2-input !w-full !m-0 !mt-1 !bg-slate-50 dark:!bg-slate-900 !border-slate-200 dark:!border-slate-700 !text-slate-900 dark:!text-white !rounded-xl" placeholder="Ej: Carlos López">
          </div>
          <div>
            <label class="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Teléfono / WhatsApp</label>
            <input id="sup-phone" class="swal2-input !w-full !m-0 !mt-1 !bg-slate-50 dark:!bg-slate-900 !border-slate-200 dark:!border-slate-700 !text-slate-900 dark:!text-white !rounded-xl" placeholder="Ej: +54 9 11 1234-5678">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "REGISTRAR PROVEEDOR",
      confirmButtonColor: "#2563eb",
      customClass: {
        popup:
          "dark:!bg-slate-900 !rounded-[2.5rem] border border-slate-200 dark:border-slate-800",
        confirmButton:
          "rounded-xl font-black text-xs px-6 py-3 tracking-widest",
        cancelButton: "rounded-xl font-bold text-xs px-6 py-3 tracking-widest",
      },
      preConfirm: () => {
        // Lectura segura directamente desde el DOM (evita inyecciones de estado)
        const name = (
          document.getElementById("sup-name") as HTMLInputElement
        ).value.trim();
        const contact = (
          document.getElementById("sup-contact") as HTMLInputElement
        ).value.trim();
        const phone = (
          document.getElementById("sup-phone") as HTMLInputElement
        ).value.trim();

        if (!name) {
          Swal.showValidationMessage("La Razón Social es obligatoria");
          return false;
        }
        return { name: name.toUpperCase(), contact, phone };
      },
    });

    if (formValues) {
      try {
        await addSupplier(formValues);
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Proveedor Registrado",
          showConfirmButton: false,
          timer: 2000,
        });
      } catch (error) {
        Swal.fire("Error", "No se pudo registrar el proveedor.", "error");
      }
    }
  }, [addSupplier]);

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* CABECERA */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 p-8 rounded-[2rem] shadow-xl mb-8 gap-6">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <span className="bg-blue-600 text-white p-2 rounded-xl text-xl">
              <Truck size={24} />
            </span>
            Proveedores
          </h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2 italic">
            Directorio B2B y Cuentas por Pagar
          </p>
        </div>
        <button
          onClick={handleAddSupplier}
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
        >
          <Plus size={16} /> Nuevo Proveedor
        </button>
      </header>

      {/* BUSCADOR */}
      <div className="mb-8 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="BUSCAR PROVEEDOR POR NOMBRE O CONTACTO..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-black tracking-widest uppercase outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white shadow-sm"
        />
      </div>

      {/* LISTADO DE PROVEEDORES */}
      {isLoading ? (
        <div className="p-12 text-center animate-pulse font-black text-slate-400 uppercase tracking-widest text-xs">
          Cargando Directorio...
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="p-12 text-center font-black text-slate-400 uppercase tracking-widest text-xs border border-dashed border-slate-300 dark:border-slate-800 rounded-[2rem]">
          No hay proveedores registrados en el radar.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSuppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-lg hover:shadow-xl transition-all group relative overflow-hidden"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 w-12 h-12 rounded-xl flex items-center justify-center text-blue-500 shrink-0">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-tight">
                    {supplier.name}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 flex items-center gap-1">
                    <Phone size={10} /> {supplier.contact || "Sin Contacto"}{" "}
                    {supplier.phone ? `(${supplier.phone})` : ""}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  Saldo Deudor
                </span>
                <span
                  className={`text-xl font-black tracking-tighter ${supplier.balance > 0 ? "text-rose-500" : "text-emerald-500"}`}
                >
                  {ARS.format(supplier.balance)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
