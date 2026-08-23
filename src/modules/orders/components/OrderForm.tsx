import { useState, useEffect, memo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { orderSchema, type OrderFormValues, type OrderItem } from "../schemas/orderSchema";
import { useCatalogStore } from "../../../store/useCatalogStore";
import { useCrmStore, type CustomerBalance } from "../../crm/store/useCrmStore";
import { useTenantStore } from "../../../store/useTenantStore";
import { supabase } from "../../../lib/supabase";
import Swal from "sweetalert2";
import type { Database } from "../../../shared/types/database.types";

import { OrderMatrixModal } from "./OrderMatrixModal";
import { OrderDesignLink, type OrderDesignMeta } from "./OrderDesignLink";

interface OrderFormProps {
  orderToEdit?: {
    id: string;
    due_date?: string;
    customer_name?: string;
    status?: string;
    business_unit?: string;
    items?: OrderItem[];
    total_amount?: number;
    advance_payment?: number;
    customer_id?: string;
    design_id?: string | null;
    design_product?: string | null;
    design_verdict?: 'ok' | 'warn' | 'bad' | null;
    design_client_approved?: boolean | null;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

const mapStatusToEnglish = (status?: string): 'PENDING' | 'PARTIAL' | 'DELIVERED' | 'CANCELLED' => {
  const s = status?.toUpperCase();
  if (s === 'PENDIENTE' || s === 'PENDING') return 'PENDING';
  if (s === 'PARCIAL' || s === 'PARTIAL') return 'PARTIAL';
  if (s === 'FINALIZADO' || s === 'ENTREGADO' || s === 'DELIVERED') return 'DELIVERED';
  if (s === 'CANCELADO' || s === 'CANCELLED') return 'CANCELLED';
  return 'PENDING';
};

export const OrderForm = memo(
  ({ orderToEdit, onClose, onSuccess }: OrderFormProps) => {
    const {
      products,
      fetchAllCatalogs,
    } = useCatalogStore();
    
    // Ahora balances tiene el tipo correcto CustomerBalance[] importado desde useCrmStore
    const { balances, fetchBalances } = useCrmStore();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState(
      orderToEdit?.customer_id || "CONSUMIDOR_FINAL",
    );
    const [activeMatrixIndex, setActiveMatrixIndex] = useState<number | null>(
      null,
    );
    const [designMeta, setDesignMeta] = useState<OrderDesignMeta>({
      designId: orderToEdit?.design_id || null,
      productName: orderToEdit?.design_product || null,
      verdict: orderToEdit?.design_verdict ?? null,
      clientApproved: orderToEdit?.design_client_approved || false,
    });

    const handleDesignMetaChange = (patch: Partial<OrderDesignMeta>) =>
      setDesignMeta((prev) => ({ ...prev, ...patch }));

    useEffect(() => {
      const sync = async () => {
        if (!products || products.length === 0) await fetchAllCatalogs();
        if (!balances || balances.length === 0) await fetchBalances();
      };
      sync();
    }, [products, balances, fetchAllCatalogs, fetchBalances]);

    const { register, control, handleSubmit, watch, setValue } =
      useForm<OrderFormValues>({
        resolver: zodResolver(orderSchema) as never,
        defaultValues: orderToEdit
          ? {
              dueDate: orderToEdit.due_date
                ? orderToEdit.due_date.substring(0, 10)
                : new Date().toISOString().split("T")[0],
              customerName: orderToEdit.customer_name || "Consumidor Final",
              status: mapStatusToEnglish(orderToEdit.status),
              businessUnit: (orderToEdit.business_unit || "ROJO_SHOWROOM") as "GENERAL" | "RAICES" | "RJ_CO" | "BITA_IT" | "ROJO_SHOWROOM" | "UNIFORMES",
              items: orderToEdit.items || [],
              totalAmount: Number(orderToEdit.total_amount || 0),
              advancePayment: Number(orderToEdit.advance_payment || 0),
            }
          : {
              dueDate: new Date().toISOString().split("T")[0],
              customerName: "Consumidor Final",
              status: "PENDING",
              businessUnit: "ROJO_SHOWROOM",
              items: [],
              totalAmount: 0,
              advancePayment: 0,
            },
      });

    const { fields, append, remove } = useFieldArray({
      control,
      name: "items",
    });
    const watchItems = watch("items") || [];

    useEffect(() => {
      if (selectedClientId && selectedClientId !== "CONSUMIDOR_FINAL") {
        const c = balances.find((x: CustomerBalance) => x.id === selectedClientId);
        if (c) setValue("customerName", c.name);
      } else {
        setValue("customerName", "Consumidor Final");
      }
    }, [selectedClientId, balances, setValue]);

    const onSubmit = async (data: OrderFormValues) => {
      if (isSubmitting) return;
      setIsSubmitting(true);

      try {
        const companyId = useTenantStore.getState().activeCompanyId;
        if (!companyId) throw new Error('Acción rechazada: Falta ID de compañía activa (Tenant).');

        if (designMeta.verdict === 'bad' && !designMeta.clientApproved) {
          setIsSubmitting(false);
          Swal.fire(
            'Diseño pixelado',
            "El diseño seleccionado no alcanza calidad para el producto elegido. Pedí aprobación al cliente y marcá la casilla, o cambiá el diseño/producto.",
            "warning",
          );
          return;
        }

        let totalOrdered = 0;
        let totalDelivered = 0;

        (data.items || []).forEach((item) => {
          (item.variations || []).forEach((v) => {
            totalOrdered += Number(v.quantityOrdered || 0);
            totalDelivered += Number(v.quantityDelivered || 0);
          });
        });

        let newStatus = data.status;
        if (
          newStatus !== "CANCELLED" &&
          newStatus !== "DELIVERED" &&
          totalOrdered > 0
        ) {
          if (totalDelivered >= totalOrdered) newStatus = "DELIVERED";
          else if (totalDelivered > 0) newStatus = "PARTIAL";
          else newStatus = "PENDING";
        }

        const orderPayload = {
          company_id: companyId,
          due_date: data.dueDate,
          customer_name: data.customerName,
          status: newStatus,
          business_unit: data.businessUnit,
          total_amount: Number(data.totalAmount || 0),
          advance_payment: Number(data.advancePayment || 0),
          items: data.items as never, // JSONB backup required by schema
          customer_id: selectedClientId === "CONSUMIDOR_FINAL" ? null : selectedClientId,
          design_id: designMeta.designId ?? null,
          design_product: designMeta.designId ? designMeta.productName : null,
          design_verdict: designMeta.designId ? designMeta.verdict : null,
          design_client_approved: designMeta.clientApproved,
          design_approved_at:
            designMeta.verdict === 'bad' && designMeta.clientApproved
              ? new Date().toISOString()
              : null,
        };

        const upsertPayload: Database['public']['Tables']['orders']['Insert'] = orderToEdit
          ? { id: orderToEdit.id, ...orderPayload }
          : orderPayload;

        // 1. Inserción o Actualización de la tabla 'orders'
        const { data: savedOrder, error: orderError } = await supabase
          .from("orders")
          .upsert(upsertPayload, {
            onConflict: "id",
          })
          .select('id')
          .single();

        if (orderError) throw orderError;
        if (!savedOrder) throw new Error("No se pudo recuperar el ID de la orden guardada.");

        // 2. Mapeo relacional atómico para la tabla 'order_items' (Schema Enforcement)
        const flatOrderItems = (data.items || []).flatMap((item) => 
          (item.variations || []).map((v) => ({
            order_id: savedOrder.id,
            variant_id: v.variantId || null,
            quantity: Number(v.quantityOrdered || 0),
            price: 0 // Nota: El form actual no trae precio por variation en Hoja de Ruta, seteamos 0 por compatibilidad
          }))
        ).filter(item => item.variant_id && item.quantity > 0);

        if (orderToEdit) {
          // Si editamos, borramos los items viejos para recrear la relación
          const { error: delError } = await supabase.from('order_items').delete().eq('order_id', savedOrder.id);
          if (delError) console.warn('[OrderForm] Falla limpiando order_items antiguos', delError);
        }

        if (flatOrderItems.length > 0) {
          const { error: itemsError } = await supabase.from('order_items').insert(flatOrderItems as never);
          if (itemsError) throw new Error(`Error vinculando items relacionales: ${itemsError.message}`);
        }

        Swal.fire({
          icon: "success",
          title: "Hoja de Ruta Guardada",
          toast: true,
          position: "top-end",
          timer: 2000,
          showConfirmButton: false,
        });
        onSuccess();
      } catch (e: unknown) {
        console.error('Falla en la orden:', e);
        Swal.fire("Error Crítico de Servidor", (e as Error).message, "error");
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleAddProductClick = async () => {
      const productOptions = (products || [])
        .map((p) => `<option value="${p.id}">${p.name}</option>`)
        .join("");
      const { value: selectedId } = await Swal.fire({
        title: "BUSCAR PRENDA",
        html: `<select id="sw-prod-id" class="swal2-input w-full! m-0! rounded-xl! dark:bg-slate-800 dark:text-white">
               <option value="" disabled selected>Elegir del catálogo...</option>
               ${productOptions}
             </select>`,
        showCancelButton: true,
        customClass: { popup: "dark:bg-slate-900 rounded-3xl" },
        preConfirm: () =>
          (document.getElementById("sw-prod-id") as HTMLSelectElement).value,
      });

      if (selectedId) {
        const p = products.find((x) => x.id === selectedId);
        if (p)
          append({
            id: crypto.randomUUID(),
            type: "PRODUCT",
            productName: p.name,
            variations: [],
          });
      }
    };

    return (
      <>
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 flex justify-end">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full overflow-y-auto animate-in slide-in-from-right duration-300 shadow-2xl flex flex-col">
            <header className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-20">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">
                {orderToEdit ? "✏️ EDITAR PEDIDO" : "🆕 NUEVA HOJA DE RUTA"}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-500 rounded-full transition-all font-black"
              >
                ✕
              </button>
            </header>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="p-8 space-y-6 flex-1"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                    Entrega Prometida
                  </label>
                  <input
                    type="date"
                    {...register("dueDate")}
                    className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                    Unidad
                  </label>
                  <select
                    {...register("businessUnit")}
                    className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold outline-none"
                  >
                    <option value="ROJO_SHOWROOM">ROJO SHOWROOM</option>
                    <option value="RAICES">RAÍCES</option>
                    <option value="UNIFORMES">UNIFORMES</option>
                    <option value="RJ_CO">RJ&CO.</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                  Cliente / Organización
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold outline-none"
                >
                  <option value="CONSUMIDOR_FINAL">👤 CONSUMIDOR FINAL</option>
                  {(balances || []).map((c: CustomerBalance) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <OrderDesignLink value={designMeta} onChange={handleDesignMetaChange} />

              <div className="grid grid-cols-2 gap-4 bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">
                    Total $
                  </label>
                  <input
                    type="number"
                    {...register("totalAmount")}
                    className="w-full p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 text-emerald-900 dark:text-white font-black text-xl outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">
                    Seña $
                  </label>
                  <input
                    type="number"
                    {...register("advancePayment")}
                    className="w-full p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 text-emerald-900 dark:text-white font-black text-xl outline-none"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Items del Pedido
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddProductClick}
                    className="px-4 py-2 bg-slate-900 dark:bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase"
                  >
                    + Prenda
                  </button>
                </div>

                <div className="space-y-4">
                  {fields.map((f, i) => (
                    <div
                      key={f.id}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl shadow-sm relative"
                    >
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        ✕
                      </button>
                      <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase truncate pr-8">
                        {watchItems[i]?.productName || "Cargando..."}
                      </h4>
                      <button
                        type="button"
                        onClick={() => setActiveMatrixIndex(i)}
                        className="w-full mt-4 py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-all uppercase tracking-widest"
                      >
                        {watchItems[i]?.variations?.length > 0
                          ? "📦 EDITAR CANTIDADES"
                          : "+ CONFIGURAR MATRIZ"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </form>

            <footer className="p-8 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky bottom-0 z-20">
              <button
                type="submit"
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting}
                className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
              >
                {isSubmitting ? "GUARDANDO..." : "CONFIRMAR HOJA DE RUTA"}
              </button>
            </footer>
          </div>
        </div>

        {activeMatrixIndex !== null && (() => {
          const foundProduct = products.find(
            (p) => p.name === watchItems[activeMatrixIndex]?.productName,
          );
          return foundProduct ? (
            <OrderMatrixModal
              product={foundProduct}
              currentVariations={(watchItems[activeMatrixIndex]?.variations as never) || []}
              onSave={(newVariations) => {
                setValue(`items.${activeMatrixIndex}.variations`, newVariations as never);
                setActiveMatrixIndex(null);
              }}
              onClose={() => setActiveMatrixIndex(null)}
              onRequestNewVariant={() => {}}
            />
          ) : null;
        })()}
      </>
    );
  },
);

OrderForm.displayName = "OrderForm";
