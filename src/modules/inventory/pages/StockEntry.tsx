import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { useCatalogStore } from "../../../store/useCatalogStore";

export const StockEntry = () => {
  const { products, sizes, colors, updateStock, fetchAllCatalogs } =
    useCatalogStore();

  const [productId, setProductId] = useState("");
  const [sizeId, setSizeId] = useState("");
  const [colorId, setColorId] = useState("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Asegurarnos de que los catálogos estén cargados al montar el componente
  useEffect(() => {
    if (products.length === 0 || sizes.length === 0 || colors.length === 0) {
      fetchAllCatalogs();
    }
  }, [fetchAllCatalogs, products.length, sizes.length, colors.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !productId ||
      !sizeId ||
      !colorId ||
      !quantity ||
      Number(quantity) <= 0
    ) {
      Swal.fire({
        icon: "warning",
        title: "Campos incompletos",
        text: "Por favor, completa todos los campos y asegúrate de que la cantidad sea mayor a 0.",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Ejecutamos la acción del store (comunicación con Supabase RPC)
      await updateStock(productId, sizeId, colorId, Number(quantity));

      // 2. Si fue exitoso, mostramos el Swal
      Swal.fire({
        icon: "success",
        title: "¡Stock Actualizado!",
        text: "El ingreso de stock se registró correctamente.",
        timer: 2000,
        showConfirmButton: false,
      });

      // 3. Limpiamos el formulario para un nuevo ingreso
      setProductId("");
      setSizeId("");
      setColorId("");
      setQuantity("");
    } catch (error: any) {
      // Atrapamos la excepción del Store global
      Swal.fire({
        icon: "error",
        title: "Error al ingresar stock",
        text:
          error.message ||
          "Ocurrió un problema de conexión con la base de datos.",
        confirmButtonColor: "#3085d6",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8">
        <header className="mb-8">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
            Ingreso de <span className="text-blue-600">Stock Liso</span>
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Registra la entrada de nuevas prendas base al inventario general.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Producto Base
              </label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <option value="">Selecciona un producto...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku || "S/N"} - {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Talle
              </label>
              <select
                value={sizeId}
                onChange={(e) => setSizeId(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <option value="">Selecciona un talle...</option>
                {sizes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Color
              </label>
              <select
                value={colorId}
                onChange={(e) => setColorId(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <option value="">Selecciona un color...</option>
                {colors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Cantidad a Ingresar
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) =>
                  setQuantity(
                    e.target.value !== "" ? Number(e.target.value) : "",
                  )
                }
                placeholder="Ej: 50"
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Registrando..." : "Confirmar Ingreso de Stock"}
          </button>
        </form>
      </div>
    </div>
  );
};
