import React, { useState, useEffect, useMemo, memo } from "react";
import { useCatalogStore } from "../../../store/useCatalogStore";
import { MatrixHoldingPro } from "../components/MatrixHoldingPro";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react"; // 👇 AGREGAMOS TRASH2
import Swal from "sweetalert2";
import { supabase } from "../../../lib/supabase";

export const InventoryDashboard = memo(() => {
  const {
    products,
    sizes,
    colors,
    inventory,
    fetchAllCatalogs,
    addProduct,
    addProductVariant,
    updateProductComplete,
    addSize,
    addColor,
  } = useCatalogStore();

  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const [matrixInitialData, setMatrixInitialData] = useState<any>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchAllCatalogs();
  }, [fetchAllCatalogs]);

  const toggleRow = (productId: string) => {
    setExpandedRows((prev) => ({ ...prev, [productId]: !prev[productId] }));
  };

  const groupedInventory = useMemo(() => {
    if (!inventory || !products) return [];
    const groups: Record<string, any> = {};

    inventory.forEach((variant: any) => {
      const prodId = variant.product_id;
      if (!prodId) return;

      if (!groups[prodId]) {
        const product = products.find((p) => p.id === prodId);
        groups[prodId] = {
          product: product || {
            id: prodId,
            name: "Desconocido",
            category: "S/C",
            sku: "S/N",
          },
          totalBase: 0,
          totalFinished: 0,
          variants: [],
        };
      }
      groups[prodId].totalBase += variant.base_quantity || 0;
      groups[prodId].totalFinished += variant.finished_quantity || 0;
      groups[prodId].variants.push(variant);
    });

    return Object.values(groups).sort((a, b) =>
      a.product.name.localeCompare(b.product.name),
    );
  }, [inventory, products]);

  // 👇 FUNCIÓN PARA BORRAR PRODUCTO COMPLETO 👇
  const handleDeleteProduct = async (
    productId: string,
    productName: string,
  ) => {
    const { isConfirmed } = await Swal.fire({
      title: "¿BORRAR TODO EL PRODUCTO?",
      text: `Se eliminará "${productName}" y TODAS sus variantes de stock. Esta acción no se puede deshacer.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "SÍ, ELIMINAR TODO",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#e11d48",
      customClass: { popup: "rounded-[2rem] dark:bg-slate-900" },
    });

    if (isConfirmed) {
      Swal.fire({
        title: "Eliminando...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      // Borramos el producto (la base de datos debería borrar las variantes en cascada)
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) {
        Swal.fire(
          "Error",
          "No se pudo eliminar el producto. Verificá si tiene pedidos asociados.",
          "error",
        );
      } else {
        Swal.fire({
          icon: "success",
          title: "Producto eliminado",
          timer: 1500,
          showConfirmButton: false,
        });
        fetchAllCatalogs();
      }
    }
  };

  // 👇 FUNCIÓN PARA BORRAR SOLO UNA VARIANTE 👇
  const handleDeleteVariant = async (
    e: React.MouseEvent,
    variantId: string,
    label: string,
  ) => {
    e.stopPropagation(); // Para que no se abra el modal de editar al tocar el tacho

    const { isConfirmed } = await Swal.fire({
      title: "¿Borrar talle/color?",
      text: `¿Eliminar la variante ${label}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Borrar",
      cancelButtonText: "No",
      confirmButtonColor: "#e11d48",
      customClass: { popup: "rounded-[2rem] dark:bg-slate-900" },
    });

    if (isConfirmed) {
      const { error } = await supabase
        .from("product_variants")
        .delete()
        .eq("id", variantId);
      if (error) {
        Swal.fire("Error", "No se pudo eliminar.", "error");
      } else {
        fetchAllCatalogs();
      }
    }
  };

  const handleEditVariantStock = async (
    variant: any,
    sizeName: string,
    colorName: string,
  ) => {
    const { value: formValues } = await Swal.fire({
      title: "📦 Ingresar o Editar Stock",
      html: `
        <div class="text-sm font-bold text-slate-500 mb-4 uppercase tracking-widest">${sizeName} | ${colorName}</div>
        <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl mb-6 border border-blue-100 dark:border-blue-800/50">
           <p class="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3">➕ Ingreso de Mercadería (Sumar)</p>
           <div class="flex gap-4">
              <div class="flex-1"><input id="add-base" type="number" placeholder="+ Liso" class="w-full p-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-center font-bold outline-none text-blue-600 dark:text-blue-400"></div>
              <div class="flex-1"><input id="add-term" type="number" placeholder="+ Terminado" class="w-full p-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-center font-bold outline-none text-emerald-600 dark:text-emerald-400"></div>
           </div>
        </div>
        <div class="flex gap-4 text-left border-t border-slate-100 dark:border-slate-800 pt-6">
          <div class="flex-1">
            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Total Liso Actual</label>
            <input id="swal-base" type="number" min="0" class="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-black text-xl text-center outline-none focus:border-blue-500" value="${variant.base_quantity || 0}">
          </div>
          <div class="flex-1">
            <label class="text-[10px] font-black text-emerald-500 uppercase tracking-widest block mb-2">Total Term. Actual</label>
            <input id="swal-term" type="number" min="0" class="w-full p-4 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 font-black text-xl text-center outline-none focus:border-emerald-500" value="${variant.finished_quantity || 0}">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "GUARDAR STOCK",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#2563eb",
      customClass: { popup: "rounded-[2rem] dark:bg-slate-950" },
      preConfirm: () => {
        const currentBase =
          parseInt(
            (document.getElementById("swal-base") as HTMLInputElement).value,
          ) || 0;
        const currentTerm =
          parseInt(
            (document.getElementById("swal-term") as HTMLInputElement).value,
          ) || 0;
        const addBase =
          parseInt(
            (document.getElementById("add-base") as HTMLInputElement).value,
          ) || 0;
        const addTerm =
          parseInt(
            (document.getElementById("add-term") as HTMLInputElement).value,
          ) || 0;
        return { base: currentBase + addBase, term: currentTerm + addTerm };
      },
    });

    if (formValues) {
      const { error } = await supabase
        .from("product_variants")
        .update({
          base_quantity: formValues.base,
          finished_quantity: formValues.term,
        })
        .eq("id", variant.id);
      if (!error) {
        Swal.fire({
          icon: "success",
          title: "¡Actualizado!",
          timer: 1000,
          showConfirmButton: false,
        });
        fetchAllCatalogs();
      }
    }
  };

  const handleSaveMatrix = async (productData: any, variants: any[]) => {
    try {
      Swal.fire({
        title: "Procesando Lote...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      let productId = productData.id;
      if (!productId) {
        const newProduct = await addProduct({
          name: productData.name,
          category: productData.category,
          sku: productData.sku,
          unit_measure: productData.unit_measure,
        });
        productId = newProduct.id;
      } else {
        await updateProductComplete(productId, {
          category: productData.category,
          sku: productData.sku,
          unit_measure: productData.unit_measure,
        });
      }
      for (const variant of variants) {
        await addProductVariant({
          product_id: productId,
          sku: variant.sku,
          size_id: variant.size_id,
          color_id: variant.color_id,
          cost_price: variant.cost,
          price: variant.price,
          weight: variant.weight,
          stock_quantity: variant.quantity,
        });
      }
      Swal.fire({
        icon: "success",
        title: "¡Lote Cargado!",
        timer: 2000,
        showConfirmButton: false,
      });
      setIsMatrixOpen(false);
      setMatrixInitialData(null);
      fetchAllCatalogs();
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "No se pudo sincronizar", "error");
    }
  };

  const openMatrix = (product?: any) => {
    if (product) {
      setMatrixInitialData({
        id: product.id,
        name: product.name,
        category:
          product.category && product.category !== "S/C"
            ? product.category
            : "",
        sku: product.sku && product.sku !== "S/N" ? product.sku : "",
        unit_measure: product.unit_measure || "UNIDADES",
      });
    } else {
      setMatrixInitialData(null);
    }
    setIsMatrixOpen(true);
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-center bg-slate-900 border border-slate-800 p-10 rounded-[3rem] shadow-2xl gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-blue-600/20">
            📦
          </div>
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">
              Stock <span className="text-blue-500">Dual</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-2">
              Panel de Carga Masiva y Control.
            </p>
          </div>
        </div>
        <button
          onClick={() => openMatrix()}
          className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
        >
          + NUEVO PRODUCTO (MATRIZ)
        </button>
      </header>

      {groupedInventory.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 p-10 text-center italic py-20 text-slate-400">
          No hay stock registrado.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="p-6 w-16"></th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Artículo / SKU
                  </th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                    Variantes
                  </th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                    Total Liso
                  </th>
                  <th className="p-6 text-[10px] font-black uppercase text-emerald-500 tracking-widest text-center">
                    Total Terminado
                  </th>
                  <th className="p-6 w-40"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {groupedInventory.map((group: any) => {
                  const isExpanded = expandedRows[group.product.id];
                  return (
                    <React.Fragment key={group.product.id}>
                      <tr
                        onClick={() => toggleRow(group.product.id)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group"
                      >
                        <td className="p-6 text-slate-400">
                          {isExpanded ? (
                            <ChevronDown size={20} />
                          ) : (
                            <ChevronRight size={20} />
                          )}
                        </td>
                        <td className="p-6">
                          <p className="text-sm font-black text-slate-900 dark:text-white uppercase">
                            {group.product.name}
                          </p>
                          <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded">
                            {group.product.sku || "S/N"}
                          </span>
                        </td>
                        <td className="p-6 text-center text-xs font-bold text-slate-500">
                          {group.variants.length} comb.
                        </td>
                        <td className="p-6 text-center font-black text-slate-700 dark:text-slate-300 tabular-nums text-xl">
                          {group.totalBase}
                        </td>
                        <td className="p-6 text-center font-black text-emerald-600 dark:text-emerald-400 tabular-nums text-xl">
                          {group.totalFinished}
                        </td>
                        <td className="p-6 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openMatrix(group.product);
                              }}
                              className="bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 p-2 rounded-xl transition-all border border-slate-200"
                            >
                              <Plus size={16} />
                            </button>
                            {/* 👇 BOTÓN PARA BORRAR PRODUCTO 👇 */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProduct(
                                  group.product.id,
                                  group.product.name,
                                );
                              }}
                              className="bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white p-2 rounded-xl transition-all border border-rose-100 group-hover:border-rose-500"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td
                            colSpan={6}
                            className="p-0 border-b-2 border-blue-500 bg-slate-50 dark:bg-slate-950/50"
                          >
                            <div className="p-6 px-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {group.variants.map((v: any) => {
                                const size = sizes.find(
                                  (s) => s.id === v.size_id,
                                );
                                const color = colors.find(
                                  (c) => c.id === v.color_id,
                                );
                                const label = `${size?.name || "-"} | ${color?.name || "-"}`;
                                return (
                                  <div
                                    key={v.id}
                                    onClick={() =>
                                      handleEditVariantStock(
                                        v,
                                        size?.name || "-",
                                        color?.name || "-",
                                      )
                                    }
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex justify-between items-center hover:border-blue-500 cursor-pointer group/card transition-all shadow-sm"
                                  >
                                    <div className="flex-1">
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {v.sku || "S/SKU"}
                                      </p>
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase group-hover/card:text-blue-500 transition-colors">
                                          {label}
                                        </p>
                                        {/* 👇 BOTÓN PARA BORRAR VARIANTE 👇 */}
                                        <button
                                          onClick={(e) =>
                                            handleDeleteVariant(e, v.id, label)
                                          }
                                          className="opacity-0 group-hover/card:opacity-100 p-1 text-rose-300 hover:text-rose-500 transition-all"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="text-right flex flex-col gap-1">
                                      <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">
                                        B: {v.base_quantity}
                                      </span>
                                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg">
                                        T: {v.finished_quantity}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isMatrixOpen && (
        <MatrixHoldingPro
          sizes={sizes}
          colors={colors}
          products={products}
          initialProduct={matrixInitialData}
          onClose={() => {
            setIsMatrixOpen(false);
            setMatrixInitialData(null);
          }}
          onSave={handleSaveMatrix}
          onAddSize={addSize}
          onAddColor={addColor}
        />
      )}
    </div>
  );
});

InventoryDashboard.displayName = "InventoryDashboard";
