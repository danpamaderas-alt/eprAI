import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import Swal from "sweetalert2";
import { useCrmStore } from "../store/useCrmStore";
import { CUSTOMER_TYPES } from '../../../shared/utils/status';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClientFormModal = memo(
  ({ isOpen, onClose }: ClientFormModalProps) => {
    const { addCustomer } = useCrmStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
      name: "",
      type: "MINORISTA",
      phone: "",
      email: "",
      address: "",
      cuit: "",
      is_supplier: false,
    });
    const nameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (isOpen) {
        setFormData({
          name: "",
          type: "MINORISTA",
          phone: "",
          email: "",
          address: "",
          cuit: "",
          is_supplier: false,
        });
        requestAnimationFrame(() => nameInputRef.current?.focus());
      }
    }, [isOpen]);

    const handleSubmit = useCallback(
      async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setIsSubmitting(true);
        try {
          const success = await addCustomer({
            name: formData.name.trim().toUpperCase(),
            type: formData.type,
            phone: formData.phone || null,
            email: formData.email || null,
            address: formData.address || null,
            cuit: formData.cuit || null,
            balance: 0,
            is_supplier: formData.is_supplier,
          });

          if (success) {
            Swal.fire({
              icon: "success",
              title: "Registrado",
              timer: 1500,
              showConfirmButton: false,
              background: "#0f172a",
              color: "#fff",
            });
            onClose();
          }
        } catch (err) {
          Swal.fire({
            icon: "error",
            title: "Error al guardar",
            text: err instanceof Error ? err.message : "Ocurrió un error inesperado",
            background: "#0f172a",
            color: "#fff",
          });
        } finally {
          setIsSubmitting(false);
        }
      },
      [formData, addCustomer, onClose],
    );

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
          <div className="p-8">
            <h2 className="text-2xl font-black uppercase italic mb-6 dark:text-white">
              Nuevo Cliente
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="modal-name"
                  className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2"
                >
                  Nombre Completo
                </label>
                <input
                  id="modal-name"
                  ref={nameInputRef}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="EJ: JUAN PEREZ"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="modal-type"
                  className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2"
                >
                  Categoria
                </label>
                <select
                  id="modal-type"
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 dark:text-white focus-visible:ring-2 focus-visible:ring-brand-500"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                >
                  {CUSTOMER_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Telefono
                  </label>
                  <input
                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 dark:text-white focus-visible:ring-2 focus-visible:ring-brand-500"
                    placeholder="TELEFONO"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    CUIT/DNI
                  </label>
                  <input
                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 dark:text-white focus-visible:ring-2 focus-visible:ring-brand-500"
                    placeholder="CUIT / DNI"
                    value={formData.cuit}
                    onChange={(e) =>
                      setFormData({ ...formData, cuit: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 dark:text-white focus-visible:ring-2 focus-visible:ring-brand-500"
                  placeholder="EMAIL"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Direccion
                </label>
                <input
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 dark:text-white focus-visible:ring-2 focus-visible:ring-brand-500"
                  placeholder="DIRECCION"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>
              <label className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_supplier}
                  onChange={(e) =>
                    setFormData({ ...formData, is_supplier: e.target.checked })
                  }
                  className="w-5 h-5 rounded accent-blue-600"
                />
                <span className="text-sm font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                  Es proveedor
                </span>
              </label>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-600/20 active:scale-95 transition-colors transition-transform disabled:opacity-50"
              >
                {isSubmitting ? "Guardando..." : "Guardar Cliente"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full text-slate-400 font-bold uppercase text-[10px] tracking-widest"
              >
                Cancelar
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  },
);

ClientFormModal.displayName = "ClientFormModal";
