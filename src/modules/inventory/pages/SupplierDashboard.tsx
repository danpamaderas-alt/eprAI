import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Building2, Plus, Truck, Phone } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import Swal from "sweetalert2";
import { useSupplierStore } from "../store/useSupplierStore";
import { ARS } from '../../../shared/utils/format';
import { Modal, FormField } from '../../../shared/components/ui/Modal';

const supplierSchema = z.object({
  name: z.string().min(1, "La Razon Social es obligatoria"),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
});

type SupplierForm = z.infer<typeof supplierSchema>;

export const SupplierDashboard = () => {
  const { suppliers, isLoading, fetchSuppliers, addSupplier } =
    useSupplierStore();
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SupplierForm>({
    resolver: zodResolver(supplierSchema),
  });

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
        (s.contact_person && s.contact_person.toLowerCase().includes(lower)),
    );
  }, [suppliers, searchTerm]);

  const onSubmit = useCallback(async (data: SupplierForm) => {
    try {
      await addSupplier({ name: data.name.toUpperCase(), contact_person: data.contact_person, phone: data.phone });
      setIsModalOpen(false);
      reset();
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Proveedor Registrado", showConfirmButton: false, timer: 2000 });
    } catch {
      Swal.fire("Error", "No se pudo registrar el proveedor.", "error");
    }
  }, [addSupplier, reset]);

  return (
    <>
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
          onClick={() => { reset(); setIsModalOpen(true); }}
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
                    <Phone size={10} /> {supplier.contact_person || "Sin Contacto"}{" "}
                    {supplier.phone ? `(${supplier.phone})` : ""}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  Proveedor Activo
                </span>
                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">
                  Registrado
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    <Modal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      title="ALTA DE PROVEEDOR"
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={isSubmitting ? "GUARDANDO..." : "REGISTRAR PROVEEDOR"}
      submitColor="bg-blue-600 hover:bg-blue-500"
    >
      <FormField label="Razon Social / Nombre">
        <input
          {...register("name")}
          className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          placeholder="Ej: Textil San Juan S.A."
        />
        {errors.name && <p className="text-rose-500 text-[10px] font-bold mt-1">{errors.name.message}</p>}
      </FormField>
      <FormField label="Contacto Principal">
        <input
          {...register("contact_person")}
          className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          placeholder="Ej: Carlos Lopez"
        />
      </FormField>
      <FormField label="Telefono / WhatsApp">
        <input
          {...register("phone")}
          className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          placeholder="Ej: +54 9 11 1234-5678"
        />
      </FormField>
    </Modal>
    </>
  );
};
