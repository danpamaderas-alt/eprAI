import React, { useMemo, useRef, useEffect, useState } from "react";
import { useCatalogStore, type Product } from "../../../store/useCatalogStore";
import Swal from "sweetalert2";

export interface VariationPayload {
  id: string; // UI internal ID
  variantId: string | null; // Real DB Product_Variant ID
  size: string;
  color: string;
  sizeId: string;
  colorId: string;
  quantityOrdered: number;
  quantityDelivered: number;
}

interface OrderMatrixModalProps {
  product: Product;
  currentVariations: VariationPayload[];
  onSave: (variations: VariationPayload[]) => void;
  onClose: () => void;
  onRequestNewVariant: () => void;
}

export const OrderMatrixModal: React.FC<OrderMatrixModalProps> = ({
  product,
  currentVariations,
  onSave,
  onClose,
  onRequestNewVariant,
}) => {
  const {
    inventory,
    sizes: globalSizes,
    colors: globalColors,
  } = useCatalogStore();

  const [extraSizes, setExtraSizes] = useState<string[]>([]);
  const [extraColors, setExtraColors] = useState<string[]>([]);

  useEffect(() => {
    console.log(
      "🛠️ [MATRIZ] Abriendo producto:",
      product?.name,
      "ID:",
      product?.id,
    );
  }, [product, inventory]);

  const valuesRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const initial: Record<string, number> = {};
    currentVariations.forEach((cv) => {
      if (cv.quantityOrdered > 0)
        initial[`${cv.size}-${cv.color}`] = cv.quantityOrdered;
    });
    valuesRef.current = initial;
  }, [currentVariations]);

  const productVariants = useMemo(
    () => inventory.filter((v) => v.product_id === product.id),
    [inventory, product.id],
  );

  const { uniqueSizes, uniqueColors } = useMemo(() => {
    const getSortWeight = (val: string) => {
      const cleanVal = String(val).toUpperCase().trim();
      const textSizes: Record<string, number> = {
        XXS: 1, XS: 2, S: 3, M: 4, L: 5, XL: 6, XXL: 7,
        "2XL": 7, "3XL": 8, "4XL": 9, "5XL": 10, UNICO: 99, U: 99,
      };
      if (textSizes[cleanVal]) return textSizes[cleanVal];
      const num = Number(cleanVal);
      if (!isNaN(num)) return num;
      return 1000;
    };

    const sList = productVariants
      .map((v) => {
        if (v.sizes?.name) return v.sizes.name;
        const match = globalSizes.find((gs) => gs.id === v.size_id);
        return match ? match.name : null;
      })
      .filter(Boolean);

    const cList = productVariants
      .map((v) => {
        if (v.colors?.name) return v.colors.name;
        const match = globalColors.find((gc) => gc.id === v.color_id);
        return match ? match.name : null;
      })
      .filter(Boolean);

    currentVariations.forEach((cv) => {
      sList.push(cv.size);
      cList.push(cv.color);
    });
    extraSizes.forEach((s) => sList.push(s));
    extraColors.forEach((c) => cList.push(c));

    const sizes = Array.from(new Set(sList.filter(Boolean))).sort(
      (a: any, b: any) => getSortWeight(a) - getSortWeight(b),
    );
    const colors = Array.from(new Set(cList.filter(Boolean))).sort(
      (a: any, b: any) => String(a).localeCompare(String(b)),
    );

    return { uniqueSizes: sizes as string[], uniqueColors: colors as string[] };
  }, [
    productVariants,
    globalSizes,
    globalColors,
    currentVariations,
    extraSizes,
    extraColors,
  ]);

  const findVariant = (sizeName: string, colorName: string) => {
    return productVariants.find((v) => {
      const sName = v.sizes?.name || globalSizes.find((gs) => gs.id === v.size_id)?.name;
      const cName = v.colors?.name || globalColors.find((gc) => gc.id === v.color_id)?.name;
      return sName === sizeName && cName === colorName;
    });
  };

  const handleSave = () => {
    const newVars: VariationPayload[] = [];
    let hasGhostVariants = false;

    uniqueColors.forEach((color) => {
      uniqueSizes.forEach((size) => {
        const qty = valuesRef.current[`${size}-${color}`] || 0;
        if (qty > 0) {
          const existing = currentVariations.find(
            (cv) => cv.size === size && cv.color === color,
          );
          const variant = findVariant(size as string, color as string);

          if (!variant) {
            hasGhostVariants = true;
          }

          const finalSizeId = variant?.size_id || globalSizes.find((gs) => gs.name === size)?.id || "";
          const finalColorId = variant?.color_id || globalColors.find((gc) => gc.name === color)?.id || "";

          newVars.push({
            id: existing ? existing.id : crypto.randomUUID(),
            variantId: variant ? variant.id : null, // The critical fix for the database
            size: size as string,
            color: color as string,
            sizeId: finalSizeId,
            colorId: finalColorId,
            quantityOrdered: qty,
            quantityDelivered: existing ? existing.quantityDelivered : 0,
          });
        }
      });
    });

    if (hasGhostVariants) {
      Swal.fire({
        icon: 'warning',
        title: 'Variante No Registrada',
        text: 'Has seleccionado cantidades para un cruce de Talle/Color que no existe formalmente en el Inventario. Estas cantidades no podrán descontar stock real hasta que la variante sea creada en el Catálogo.',
        confirmButtonText: 'Entendido, Guardar Igual',
        showCancelButton: true,
        cancelButtonText: 'Revisar'
      }).then((result) => {
        if (result.isConfirmed) {
          onSave(newVars);
        }
      });
    } else {
      onSave(newVars);
    }
  };

  const handleAddVariantClick = async () => {
    const sizeOptions = globalSizes
      .map((s) => `<option value="${s.name}">${s.name}</option>`)
      .join("");
    const colorOptions = globalColors
      .map((c) => `<option value="${c.name}">${c.name}</option>`)
      .join("");

    const { value: formValues } = await Swal.fire({
      title: "Agregar a la Matriz",
      html: `
        <select id="swal-size" class="swal2-input !w-full !m-0 !mt-4 !rounded-xl dark:bg-slate-800 dark:text-white border-slate-200 dark:border-slate-700">
          <option value="" disabled selected>Seleccionar Talle</option>
          ${sizeOptions}
        </select>
        <select id="swal-color" class="swal2-input !w-full !m-0 !mt-4 !rounded-xl dark:bg-slate-800 dark:text-white border-slate-200 dark:border-slate-700">
          <option value="" disabled selected>Seleccionar Color</option>
          ${colorOptions}
        </select>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Agregar a Vista",
      cancelButtonText: "Cancelar",
      customClass: { popup: "dark:bg-slate-900 rounded-3xl" },
      preConfirm: () => {
        const size = (document.getElementById("swal-size") as HTMLSelectElement).value;
        const color = (document.getElementById("swal-color") as HTMLSelectElement).value;
        if (!size || !color) {
          Swal.showValidationMessage("Debes seleccionar un talle y un color");
          return null;
        }
        return { size, color };
      },
    });

    if (formValues) {
      setExtraSizes((prev) => prev.includes(formValues.size) ? prev : [...prev, formValues.size]);
      setExtraColors((prev) => prev.includes(formValues.color) ? prev : [...prev, formValues.color]);
    }
  };

  const matrixTable = useMemo(
    () => (
      <table className="w-full text-left border-collapse">
        <thead>
          <tr>
            <th className="p-4 border-b border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest min-w-[120px]">
              Color \ Talle
            </th>
            {uniqueSizes.map((s) => (
              <th
                key={s as string}
                className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-white text-[11px] font-black text-center uppercase tracking-widest"
              >
                {s as string}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {uniqueColors.map((color) => (
            <tr key={color as string}>
              <td className="p-4 border-r border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-[11px] font-bold uppercase tracking-widest whitespace-nowrap">
                {color as string}
              </td>
              {uniqueSizes.map((size) => {
                const variant = findVariant(size as string, color as string);
                const key = `${size}-${color}`;

                const stockActual = variant?.stock_quantity ?? 0;
                const existing = currentVariations.find(
                  (cv) => cv.size === size && cv.color === color,
                );
                const delivered = existing ? existing.quantityDelivered : 0;
                const defaultValue = existing ? existing.quantityOrdered : "";
                const isOverStockInit =
                  typeof defaultValue === "number" &&
                  defaultValue > stockActual;

                return (
                  <td
                    key={key}
                    className="p-2 border-b border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 text-center relative hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span
                      className={`absolute top-1 left-2 text-[9px] font-black ${stockActual > 0 ? "text-emerald-500" : "text-slate-400"} opacity-80`}
                    >
                      Disp: {stockActual}
                    </span>
                    {delivered > 0 && (
                      <span
                        className="absolute top-1 right-2 text-[9px] font-black text-blue-500 opacity-90"
                        title="Entregado"
                      >
                        Ent: {delivered}
                      </span>
                    )}

                    <input
                      type="number"
                      min={delivered}
                      defaultValue={defaultValue}
                      onChange={(e) => {
                        valuesRef.current[key] =
                          parseInt(e.target.value, 10) || 0;
                      }}
                      onInput={(e) => {
                        e.currentTarget.classList.toggle(
                          "!text-rose-500",
                          Number(e.currentTarget.value) > stockActual,
                        );
                        e.currentTarget.classList.toggle(
                          "text-slate-900",
                          Number(e.currentTarget.value) <= stockActual,
                        );
                        e.currentTarget.classList.toggle(
                          "dark:text-white",
                          Number(e.currentTarget.value) <= stockActual,
                        );
                      }}
                      className={`w-full mt-4 h-12 bg-transparent text-center font-black text-xl outline-none focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:ring-2 focus:ring-blue-500 rounded-xl transition-all ${!variant ? "!text-amber-500 border-amber-300" : isOverStockInit ? "!text-rose-500" : "text-slate-900 dark:text-white"}`}
                      placeholder="-"
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    ),
    [
      uniqueSizes,
      uniqueColors,
      productVariants,
      currentVariations,
      globalSizes,
      globalColors,
    ],
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700 max-h-[90vh]">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
              MATRIZ DE PRODUCCIÓN / VENTA
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              {product.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-rose-500 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-full shadow-sm transition-all"
          >
            ✕
          </button>
        </div>

        <div className="p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950 flex-1">
          <div className="flex justify-between items-end mb-4">
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-relaxed">
              Ingresá las cantidades.
              <br />
              <span className="text-rose-500">Rojo = Venta sobre pedido.</span> | <span className="text-amber-500">Naranja = Variante no registrada.</span>
            </p>
            <button
              onClick={handleAddVariantClick}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-lg shadow-indigo-500/30 flex items-center gap-1"
            >
              ✨ + AGREGAR COLOR/TALLE
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            {matrixTable}
          </div>
        </div>

        <div className="px-8 py-5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 sticky bottom-0 z-10">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl text-xs font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors uppercase tracking-widest"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/30 transition-all active:scale-95 uppercase tracking-widest"
          >
            Guardar Matriz
          </button>
        </div>
      </div>
    </div>
  );
};
