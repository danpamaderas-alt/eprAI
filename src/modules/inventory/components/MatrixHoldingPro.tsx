import { useState, useMemo, useEffect } from "react";
import {
  DollarSign,
  Tag,
  Box,
  Hash,
  Ruler,
  Unlock,
  Lock,
  Plus,
} from "lucide-react";
import Swal from "sweetalert2";

// 🛡️ BARRERA DE TIPOS ESTRICTOS
interface CatalogItem {
  id: string;
  name: string;
}

interface ProductData {
  id?: string;
  name: string;
  category: string;
  sku: string;
  unit_measure: string;
}

interface MatrixVariant {
  color_id: string;
  size_id: string;
  quantity: number;
  cost: number;
  price: number;
  weight: number;
  sku: string;
}

interface MatrixHoldingProProps {
  onClose: () => void;
  onSave: (productData: ProductData, variants: MatrixVariant[]) => void;
  sizes?: CatalogItem[]; // Ahora es opcional por si falla la DB
  colors?: CatalogItem[]; // Ahora es opcional por si falla la DB
  products?: Product[];
  initialProduct?: ProductData | null;
  onAddSize?: (name: string) => Promise<CatalogItem>;
  onAddColor?: (name: string) => Promise<CatalogItem>;
}

export const MatrixHoldingPro = ({
  onClose,
  onSave,
  sizes = [],
  colors = [],
  products = [],
  initialProduct,
  onAddSize,
  onAddColor,
}: MatrixHoldingProProps) => {
  // 🛡️ SALVAVIDAS ANTI-CRASH
  const safeSizes = sizes || [];
  const safeColors = colors || [];

  const [productName, setProductName] = useState(initialProduct?.name || "");
  const [category, setCategory] = useState(initialProduct?.category || "");
  const [baseSku, setBaseSku] = useState(initialProduct?.sku || "");
  const [unitMeasure, setUnitMeasure] = useState(
    initialProduct?.unit_measure || "UNIDADES",
  );

  const [existingProduct, setExistingProduct] = useState<Product | null>(
    initialProduct || null,
  );

  const [baseCost, setBaseCost] = useState<number>(0);
  const [basePrice, setBasePrice] = useState<number>(0);

  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [matrixData, setMatrixData] = useState<Record<string, number>>({});

  const [customProducts, setCustomProducts] = useState<string[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  const allProductsList = useMemo(() => {
    const existing = products.map((p) => p.name.toUpperCase().trim());
    return [...new Set([...existing, ...customProducts])]
      .filter(Boolean)
      .sort();
  }, [products, customProducts]);

  const allCategoriesList = useMemo(() => {
    const existing = products.map((p) => p.category?.toUpperCase().trim());
    const defaults = ["REMERAS", "PANTALONES", "ACCESORIOS", "CAJAS"];
    return [...new Set([...existing, ...defaults, ...customCategories])]
      .filter(Boolean)
      .sort();
  }, [products, customCategories]);

  const isNameLocked = !!initialProduct;
  const isCategoryLocked =
    !!initialProduct?.category && initialProduct.category.trim() !== "";
  const isSkuLocked = !!initialProduct?.sku && initialProduct.sku.trim() !== "";

  const handleProductChange = async (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const val = e.target.value;
    if (val === "ADD_NEW") {
      const { value: newName } = await Swal.fire({
        title: "Nuevo Artículo",
        input: "text",
        inputPlaceholder: "Ej: CAMPERA INFLABLE",
        showCancelButton: true,
        confirmButtonColor: "#2563eb",
        cancelButtonText: "Cancelar",
      });
      if (newName) {
        const upperName = newName.toUpperCase().trim();
        setCustomProducts((prev) => [...prev, upperName]);
        setProductName(upperName);
        checkProductExistence(upperName);
      } else {
        setProductName("");
      }
    } else {
      setProductName(val);
      checkProductExistence(val);
    }
  };

  const handleCategoryChange = async (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const val = e.target.value;
    if (val === "ADD_NEW") {
      const { value: newCat } = await Swal.fire({
        title: "Nueva Categoría",
        input: "text",
        inputPlaceholder: "Ej: ABRIGOS",
        showCancelButton: true,
        confirmButtonColor: "#2563eb",
        cancelButtonText: "Cancelar",
      });
      if (newCat) {
        const upperCat = newCat.toUpperCase().trim();
        setCustomCategories((prev) => [...prev, upperCat]);
        setCategory(upperCat);
      }
    } else {
      setCategory(val);
    }
  };

  const checkProductExistence = (nameToCheck: string) => {
    if (!nameToCheck || isNameLocked) return;
    const found = products.find(
      (p: Product) => p.name.trim().toLowerCase() === nameToCheck.toLowerCase(),
    );
    if (found) {
      setExistingProduct(found);
      setCategory(
        found.category && found.category !== "S/C" ? found.category : "",
      );
      setBaseSku(found.sku && found.sku !== "S/N" ? found.sku : "");
      setUnitMeasure(found.unit_measure || "UNIDADES");
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "info",
        title: "Artículo Existente",
        text: `Usaremos el SKU original: ${found.sku || "S/N"}.`,
        showConfirmButton: false,
        timer: 4000,
      });
    } else {
      setExistingProduct(null);
      setBaseSku("");
    }
  };

  useEffect(() => {
    if (!isSkuLocked && !baseSku && productName && category.length >= 3) {
      const catPart = category.substring(0, 3).toUpperCase();
      const namePart = productName
        .replace(/\s+/g, "")
        .substring(0, 4)
        .toUpperCase();
      const random = Math.floor(1000 + Math.random() * 9000);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBaseSku(`${catPart}-${namePart}-${random}`);
    }
  }, [category, productName, isSkuLocked, baseSku]);

  const margin = useMemo(() => {
    if (!baseCost || baseCost === 0) return basePrice > 0 ? "100.0" : "0.0";
    const profit = basePrice - baseCost;
    return ((profit / baseCost) * 100).toFixed(1);
  }, [baseCost, basePrice]);

  const handleQtyChange = (cId: string, sId: string, val: string) => {
    setMatrixData((prev) => ({
      ...prev,
      [`${cId}_${sId}`]: parseInt(val) || 0,
    }));
  };

  // 🚀 CREADOR AL VUELO DE TALLES BLINDADO
  const handleAddNewSize = async () => {
    if (!onAddSize) {
      return Swal.fire(
        "Error de Conexión",
        "Falta pasar la función onAddSize desde el Dashboard.",
        "error",
      );
    }
    const { value: newSize } = await Swal.fire({
      title: "Nuevo Talle / Medida",
      input: "text",
      inputPlaceholder: "Ej: XXL, 42, ÚNICO...",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonText: "Cancelar",
    });
    if (newSize) {
      try {
        const added = await onAddSize(newSize.toUpperCase().trim());
        if (added && added.id) {
          setSelectedSizes((prev) => [...prev, added.id]); // Lo auto-selecciona
        }
      } catch {
        Swal.fire("Error", "No se pudo guardar el talle.", "error");
      }
    }
  };

  // 🚀 CREADOR AL VUELO DE COLORES BLINDADO
  const handleAddNewColor = async () => {
    if (!onAddColor) {
      return Swal.fire(
        "Error de Conexión",
        "Falta pasar la función onAddColor desde el Dashboard.",
        "error",
      );
    }
    const { value: newColor } = await Swal.fire({
      title: "Nuevo Color",
      input: "text",
      inputPlaceholder: "Ej: ROJO, AZUL MARINO...",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonText: "Cancelar",
    });
    if (newColor) {
      try {
        const added = await onAddColor(newColor.toUpperCase().trim());
        if (added && added.id) {
          setSelectedColors((prev) => [...prev, added.id]); // Lo auto-selecciona
        }
      } catch {
        Swal.fire("Error", "No se pudo guardar el color.", "error");
      }
    }
  };

  const handleFinalSave = () => {
    if (!productName || !category || !baseSku)
      return Swal.fire(
        "Faltan Datos",
        "Completá Nombre, Categoría y SKU Base.",
        "warning",
      );
    if (selectedSizes.length === 0 || selectedColors.length === 0)
      return Swal.fire(
        "Matriz Vacía",
        "Seleccioná al menos un talle y color.",
        "warning",
      );

    const variants: MatrixVariant[] = [];
    for (const cId of selectedColors) {
      for (const sId of selectedSizes) {
        // 👇 Si el casillero está vacío, asumimos 0, pero LO GUARDAMOS IGUAL
        const qty = matrixData[`${cId}_${sId}`] || 0;

        if (qty >= 0) {
          // 🔓 CANDADO 1 ROTO: Ahora aceptamos mayor O IGUAL a cero
          const sizeName = safeSizes.find((s) => s.id === sId)?.name || "";
          const colorName = safeColors.find((c) => c.id === cId)?.name || "";
          const variantSku = `${baseSku}-${sizeName}-${colorName}`
            .toUpperCase()
            .replace(/\s+/g, "");
          variants.push({
            color_id: cId,
            size_id: sId,
            quantity: qty,
            cost: baseCost,
            price: basePrice,
            weight: 0,
            sku: variantSku,
          });
        }
      }
    }

    // 🔓 CANDADO 2 ROTO: Borramos el cartel que te retaba por tener cero stock

    onSave(
      {
        id: existingProduct?.id,
        name: productName.toUpperCase(),
        category: category.toUpperCase(),
        sku: baseSku.toUpperCase(),
        unit_measure: unitMeasure,
      },
      variants,
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-100 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl rounded-[3.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[95vh] overflow-hidden">
        <header className="p-8 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
              {initialProduct
                ? `Agregando a: ${initialProduct.name}`
                : "Matriz de Alta Masiva"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-all font-black"
          >
            ✕
          </button>
        </header>

        <div className="p-8 overflow-y-auto flex-1 space-y-10">
          {/* SECCIÓN 1: IDENTIFICACIÓN CON DESPLEGABLES */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                <Box size={12} /> Artículo / Producto
              </label>
              <div className="relative">
                <select
                  value={productName}
                  onChange={handleProductChange}
                  disabled={isNameLocked}
                  className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 font-black text-sm uppercase dark:text-white outline-none disabled:opacity-50 appearance-none cursor-pointer focus:border-blue-500 transition-all"
                >
                  <option value="" disabled>
                    SELECCIONAR...
                  </option>
                  {allProductsList.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  <option
                    value="ADD_NEW"
                    className="font-black text-blue-500 bg-blue-50 dark:bg-blue-900/30"
                  >
                    ✨ + CREAR NUEVO ARTÍCULO
                  </option>
                </select>
                {isNameLocked && (
                  <span className="absolute right-10 top-1/2 -translate-y-1/2 text-[9px] font-black bg-rose-500/10 text-rose-500 px-2 py-1 rounded-md flex items-center gap-1">
                    <Lock size={10} /> BLOQUEADO
                  </span>
                )}
                {!isNameLocked && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    ▼
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                <Tag size={12} /> Categoría
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={handleCategoryChange}
                  disabled={isCategoryLocked}
                  className={`w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border-2 font-black text-sm uppercase dark:text-white outline-none disabled:opacity-50 appearance-none cursor-pointer transition-all ${!isCategoryLocked && initialProduct ? "border-blue-500/50 focus:border-blue-500" : "border-slate-200 dark:border-slate-800 focus:border-blue-500"}`}
                >
                  <option value="" disabled>
                    SELECCIONAR...
                  </option>
                  {allCategoriesList.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option
                    value="ADD_NEW"
                    className="font-black text-blue-500 bg-blue-50 dark:bg-blue-900/30"
                  >
                    ✨ + CREAR NUEVA CATEGORÍA
                  </option>
                </select>
                {!isCategoryLocked && initialProduct && (
                  <span className="absolute right-10 top-1/2 -translate-y-1/2 text-[9px] font-black bg-blue-500/10 text-blue-500 px-2 py-1 rounded-md flex items-center gap-1">
                    <Unlock size={10} /> EDITABLE
                  </span>
                )}
                {!isCategoryLocked && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    ▼
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                <Ruler size={12} /> Tipo de Unidad
              </label>
              <div className="relative">
                <select
                  value={unitMeasure}
                  onChange={(e) => setUnitMeasure(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 font-black text-sm uppercase dark:text-white outline-none appearance-none cursor-pointer focus:border-blue-500 transition-all"
                >
                  <option value="UNIDADES">Unidades (U)</option>
                  <option value="KILOS">Kilos (Kg)</option>
                  <option value="METROS">Metros (Mts)</option>
                  <option value="LITROS">Litros (L)</option>
                  <option value="PARES">Pares (Pr)</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  ▼
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                <Hash size={12} /> SKU Base
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={baseSku}
                  onChange={(e) => setBaseSku(e.target.value.toUpperCase())}
                  disabled={isSkuLocked}
                  className={`w-full p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/10 border-2 font-black text-sm uppercase text-indigo-700 dark:text-indigo-400 outline-none disabled:opacity-50 ${!isSkuLocked && initialProduct ? "border-blue-500/50 focus:border-indigo-500" : "border-indigo-200 dark:border-indigo-800"}`}
                  placeholder="SKU"
                />
                {!isSkuLocked && initialProduct && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black bg-blue-500/10 text-blue-500 px-2 py-1 rounded-md flex items-center gap-1">
                    <Unlock size={10} /> EDITABLE
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: INTELIGENCIA FINANCIERA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 dark:bg-slate-950 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                <DollarSign size={12} /> Costo Compra (u)
              </label>
              <input
                type="number"
                value={baseCost || ""}
                onChange={(e) => setBaseCost(Number(e.target.value))}
                className="w-full p-4 rounded-2xl bg-white dark:bg-slate-900 border-none font-black text-xl dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                <DollarSign size={12} /> Valor Venta (u)
              </label>
              <input
                type="number"
                value={basePrice || ""}
                onChange={(e) => setBasePrice(Number(e.target.value))}
                className="w-full p-4 rounded-2xl bg-white dark:bg-slate-900 border-none font-black text-xl dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="0"
              />
            </div>
            <div className="flex flex-col justify-end">
              <div className="bg-slate-900 dark:bg-blue-600 p-4 rounded-2xl flex justify-between items-center h-full">
                <p className="text-[10px] font-black text-blue-400 dark:text-blue-100 uppercase">
                  Margen Ganancia
                </p>
                <p className="text-2xl font-black text-white tabular-nums">
                  {margin}%
                </p>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: SELECCIÓN DE VARIANTES (CON BOTÓN DE NUEVO VISIBLE SIEMPRE) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <p className="text-xs font-black uppercase text-slate-400 tracking-widest ml-2">
                1. Seleccionar Talles / Medidas
              </p>
              <div className="flex flex-wrap gap-2">
                {safeSizes.map((s: CatalogItem) => (
                  <button
                    key={s.id}
                    onClick={() =>
                      setSelectedSizes((prev) =>
                        prev.includes(s.id)
                          ? prev.filter((x) => x !== s.id)
                          : [...prev, s.id],
                      )
                    }
                    className={`px-5 py-3 rounded-2xl text-[11px] font-black transition-all border-2 ${selectedSizes.includes(s.id) ? "bg-blue-600 border-blue-600 text-white" : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400"}`}
                  >
                    {s.name}
                  </button>
                ))}
                {/* 🚀 BOTÓN CREAR TALLE SIEMPRE VISIBLE */}
                <button
                  onClick={handleAddNewSize}
                  className="px-5 py-3 rounded-2xl text-[11px] font-black transition-all border-2 border-dashed border-blue-400 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center gap-1 shadow-sm"
                >
                  <Plus size={12} /> NUEVO TALLE
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-black uppercase text-slate-400 tracking-widest ml-2">
                2. Seleccionar Colores / Opciones
              </p>
              <div className="flex flex-wrap gap-2">
                {safeColors.map((c: CatalogItem) => (
                  <button
                    key={c.id}
                    onClick={() =>
                      setSelectedColors((prev) =>
                        prev.includes(c.id)
                          ? prev.filter((x) => x !== c.id)
                          : [...prev, c.id],
                      )
                    }
                    className={`px-5 py-3 rounded-2xl text-[11px] font-black transition-all border-2 ${selectedColors.includes(c.id) ? "bg-blue-600 border-blue-600 text-white" : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400"}`}
                  >
                    {c.name}
                  </button>
                ))}
                {/* 🚀 BOTÓN CREAR COLOR SIEMPRE VISIBLE */}
                <button
                  onClick={handleAddNewColor}
                  className="px-5 py-3 rounded-2xl text-[11px] font-black transition-all border-2 border-dashed border-blue-400 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center gap-1 shadow-sm"
                >
                  <Plus size={12} /> NUEVO COLOR
                </button>
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: LA GRILLA DE CANTIDADES */}
          {selectedSizes.length > 0 && selectedColors.length > 0 && (
            <div className="overflow-x-auto rounded-[2.5rem] border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl animate-in zoom-in-95 duration-300">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-950">
                    <th className="p-6 text-[10px] font-black uppercase text-slate-400">
                      Variante
                    </th>
                    {selectedSizes.map((sId) => (
                      <th
                        key={sId}
                        className="p-6 text-center text-[10px] font-black text-slate-900 dark:text-white border-l dark:border-slate-800"
                      >
                        {safeSizes.find((x: CatalogItem) => x.id === sId)?.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedColors.map((cId) => (
                    <tr
                      key={cId}
                      className="border-t dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="p-6 text-xs font-black text-slate-700 dark:text-slate-300 uppercase">
                        {safeColors.find((x: CatalogItem) => x.id === cId)?.name}
                      </td>
                      {selectedSizes.map((sId) => (
                        <td
                          key={`${cId}_${sId}`}
                          className="p-3 border-l dark:border-slate-800"
                        >
                          <input
                            type="number"
                            placeholder="0"
                            min="0"
                            onChange={(e) =>
                              handleQtyChange(cId, sId, e.target.value)
                            }
                            className="w-full p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl text-center text-lg font-black text-blue-600 dark:text-blue-400 outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <footer className="p-8 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end items-center gap-6">
          <button
            onClick={handleFinalSave}
            className="px-12 py-5 bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-500 text-white rounded-4xl font-black text-sm uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all"
          >
            CONFIRMAR LOTE 🚀
          </button>
        </footer>
      </div>
    </div>
  );
};
