import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { useCatalogStore } from "../../../store/useCatalogStore";

export const StockWithdrawal = () => {
  const { products, sizes, colors, inventory, updateStock, fetchAllCatalogs } =
    useCatalogStore();

  const [productId, setProductId] = useState("");
  const [sizeId, setSizeId] = useState("");
  const [colorId, setColorId] = useState("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calcular el stock actual en base a la selección en tiempo real
  const selectedVariant = inventory.find(
    (v) =>
      v.product_id === productId &&
      v.size_id === sizeId &&
      v.color_id === colorId,
  );
  const currentStock =
    productId && sizeId && colorId
      ? selectedVariant?.stock_quantity || 0
      : null;

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
      Number(quantity) <= 0 ||
      !reason
    ) {
      Swal.fire({
        icon: "warning",
        title: "Campos incompletos",
        text: "Por favor, completa todos los campos (incluyendo el motivo) y asegúrate de que la cantidad sea mayor a 0.",
        confirmButtonColor: "#e11d48", // color rose-600
      });
      return;
    }

    // Validación en tiempo real: Evitar que retire más del stock actual
    if (currentStock !== null && Number(quantity) > currentStock) {
      Swal.fire({
        icon: "error",
        title: "Stock Insuficiente",
        text: `Solo tienes ${currentStock} unidad(es) en stock. No puedes retirar ${quantity}.`,
        confirmButtonColor: "#e11d48",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Ejecutamos la acción del store.
      // IMPORTANTE: Al ser un egreso, enviamos la cantidad en NEGATIVO para que reste del stock actual.
      await updateStock(productId, sizeId, colorId, -Number(quantity));

      // 2. Si fue exitoso, mostramos el Swal
      Swal.fire({
        icon: "success",
        title: "¡Egreso Registrado!",
        text: "El retiro de stock se procesó correctamente.",
        timer: 2000,
        showConfirmButton: false,
      });

      // 3. Limpiamos el formulario
      setProductId("");
      setSizeId("");
      setColorId("");
      setQuantity("");
      setReason("");
    } catch (error: any) {
      // Atrapamos la excepción (Ej: si la DB arroja error por constraint de stock negativo)
      Swal.fire({
        icon: "error",
        title: "Error al retirar stock",
        text:
          error.message ||
          "Ocurrió un problema o no hay stock suficiente para realizar el retiro.",
        confirmButtonColor: "#e11d48",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8">
        <header className="mb-8 border-l-4 border-rose-500 pl-4">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
            Egreso de <span className="text-rose-600">Stock</span>
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Registra el retiro de prendas por mermas, fallas o uso interno.
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
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none transition-all"
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
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none transition-all"
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
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none transition-all"
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
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                <span>Cantidad a Retirar</span>
                {productId && sizeId && colorId && (
                  <span
                    className={`px-2 py-0.5 rounded-md ${currentStock && currentStock > 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400"}`}
                  >
                    Stock actual: {currentStock !== null ? currentStock : 0}
                  </span>
                )}
              </label>
              <input
                type="number"
                min="1"
                max={currentStock !== null ? currentStock : undefined}
                value={quantity}
                onChange={(e) =>
                  setQuantity(
                    e.target.value !== "" ? Number(e.target.value) : "",
                  )
                }
                placeholder="Ej: 5"
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Motivo del Egreso
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none transition-all"
              >
                <option value="">Selecciona el motivo...</option>
                <option value="FALLA_FABRICA">Falla de Fábrica</option>
                <option value="MERMA_TALLER">
                  Merma en Taller / Estampado
                </option>
                <option value="USO_INTERNO">Uso Interno / Muestras</option>
                <option value="EXTRAVIO">Extravío / Pérdida</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-4 bg-rose-600 hover:bg-rose-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-rose-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Procesando..." : "Confirmar Retiro de Stock"}
          </button>
        </form>
      </div>
    </div>
  );
};
