import { useState, useEffect, useMemo } from "react";
import { useCatalogStore } from "../../../store/useCatalogStore";
import { Search, Briefcase, Plus, FileText } from "lucide-react";
import Swal from "sweetalert2";

export const ServicesDashboard = () => {
  const { services, isLoading, fetchAllCatalogs, addService } =
    useCatalogStore();
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Cargamos el catálogo al montar el componente
  useEffect(() => {
    fetchAllCatalogs();
  }, [fetchAllCatalogs]);

  // 2. Filtro de búsqueda en tiempo real
  const filteredServices = useMemo(() => {
    if (!searchTerm) return services;
    const lowerSearch = searchTerm.toLowerCase();
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(lowerSearch) ||
        (s.description && s.description.toLowerCase().includes(lowerSearch)),
    );
  }, [services, searchTerm]);

  // 3. Modal para agregar un nuevo servicio
  const handleAddService = async () => {
    const { value: formValues } = await Swal.fire({
      title: "NUEVO SERVICIO B2B",
      html: `
        <div class="space-y-4 mt-4 text-left">
          <div>
            <label class="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Nombre del Servicio</label>
            <input id="s-name" class="swal2-input !w-full !m-0 !mt-1 !bg-slate-950 !border-slate-800 !text-white !rounded-xl" placeholder="Ej: Bordado Premium Corporativo">
          </div>
          <div>
            <label class="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Descripción / Detalles</label>
            <textarea id="s-desc" rows="3" class="swal2-textarea !w-full !m-0 !mt-1 !bg-slate-950 !border-slate-800 !text-white !rounded-xl text-sm p-4" placeholder="Especificaciones del servicio..."></textarea>
          </div>
          <div>
            <label class="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Precio Base ($)</label>
            <input id="s-price" type="number" class="swal2-input !w-full !m-0 !mt-1 !bg-slate-950 !border-slate-800 !text-emerald-400 !rounded-xl !text-center !font-black text-xl" placeholder="0">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "CREAR SERVICIO",
      cancelButtonText: "CANCELAR",
      customClass: {
        popup: "!bg-slate-900 !border-slate-800 !rounded-[2rem]",
        confirmButton:
          "w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl uppercase text-xs transition-colors",
        cancelButton:
          "w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-xl uppercase text-xs transition-colors mt-3",
      },
      buttonsStyling: false,
      preConfirm: () => {
        const name = (document.getElementById("s-name") as HTMLInputElement)
          .value;
        const description = (
          document.getElementById("s-desc") as HTMLTextAreaElement
        ).value;
        const price = Number(
          (document.getElementById("s-price") as HTMLInputElement).value,
        );

        if (!name || price <= 0) {
          Swal.showValidationMessage(
            "El nombre y el precio mayor a cero son obligatorios",
          );
          return false;
        }
        return { name, description, price };
      },
    });

    if (formValues) {
      try {
        await addService(formValues);
        Swal.fire({
          icon: "success",
          title: "¡Servicio creado!",
          toast: true,
          position: "bottom-end",
          showConfirmButton: false,
          timer: 3000,
          customClass: { popup: "!bg-slate-900 !text-white" },
        });
      } catch (error) {
        Swal.fire("Error", "No se pudo crear el servicio.", "error");
      }
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* CABECERA */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 p-8 rounded-[2rem] shadow-xl mb-8 gap-6">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <span className="bg-indigo-500 text-white p-2 rounded-xl text-xl">
              <Briefcase size={24} />
            </span>
            Servicios B2B
          </h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2 italic">
            Catálogo de servicios y valores agregados institucionales
          </p>
        </div>
        <button
          onClick={handleAddService}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2"
        >
          <Plus size={16} /> Nuevo Servicio
        </button>
      </header>

      {/* BUSCADOR */}
      <div className="mb-8 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar por nombre o descripción de servicio..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white shadow-sm"
        />
      </div>

      {/* LISTADO DE SERVICIOS */}
      {isLoading ? (
        <div className="p-12 text-center animate-pulse font-black text-slate-400 uppercase tracking-widest text-xs">
          Cargando Catálogo de Servicios...
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="p-12 text-center font-black text-slate-400 uppercase tracking-widest text-xs border border-dashed border-slate-300 dark:border-slate-800 rounded-[2rem]">
          No se encontraron servicios registrados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all group"
            >
              <div className="bg-slate-50 dark:bg-slate-800/50 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                <FileText size={20} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">
                {service.name}
              </h3>
              <p className="text-xs font-bold text-slate-500 mb-6 min-h-[40px] leading-relaxed">
                {service.description || "Sin descripción detallada."}
              </p>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  Precio Base
                </span>
                <span className="text-2xl font-black text-emerald-500 tracking-tighter">
                  ${(service.price || 0).toLocaleString("es-AR")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
