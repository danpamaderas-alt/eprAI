import React, { useMemo, useRef, useEffect } from 'react';
import { useCatalogStore, type Product } from '../../../store/useCatalogStore';
import Swal from 'sweetalert2';

interface VariationPayload {
  id: string;
  size: string;
  color: string;
  sizeId: string; 
  colorId: string; 
  quantityOrdered: number;
  quantityDelivered: number;
}

interface OrderMatrixModalProps {
  product?: Product; 
  currentVariations?: VariationPayload[]; 
  onSave: (variations: VariationPayload[]) => void;
  onClose: () => void;
  onRequestNewVariant: () => void;
}

export const OrderMatrixModal: React.FC<OrderMatrixModalProps> = ({ 
  product, 
  currentVariations = [], 
  onSave, 
  onClose,
  onRequestNewVariant
}) => {
  // 👇 ACÁ ESTÁ LA CLAVE: Ahora traemos la lupa de sizes y colors
  const { inventory, sizes, colors } = useCatalogStore();
  
  const valuesRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const initial: Record<string, number> = {};
    (currentVariations || []).forEach(cv => {
      if (cv.quantityOrdered > 0) initial[`${cv.size}-${cv.color}`] = cv.quantityOrdered;
    });
    valuesRef.current = initial;
  }, [currentVariations]);

  const productVariants = useMemo(() => {
    if (!product || !inventory) return [];
    return inventory.filter(v => v.product_id === product.id);
  }, [inventory, product]);

  const { uniqueSizes, uniqueColors } = useMemo(() => {
    const getSortWeight = (val: string) => {
      const cleanVal = String(val).toUpperCase().trim();
      const textSizes: Record<string, number> = { 'XXS': 1, 'XS': 2, 'S': 3, 'M': 4, 'L': 5, 'XL': 6, 'XXL': 7, '2XL': 7, '3XL': 8, '4XL': 9, '5XL': 10, 'UNICO': 99, 'U': 99 };
      if (textSizes[cleanVal]) return textSizes[cleanVal];
      const num = Number(cleanVal);
      if (!isNaN(num)) return num;
      return 1000;
    };

    // 👇 Usamos la lupa para traducir el ID de Supabase al nombre real del talle
    const sizeNames = productVariants.map(v => {
      const found = sizes?.find(s => s.id === v.size_id);
      return found ? found.name : null;
    });
    const sizesList = Array.from(new Set(sizeNames))
      .filter(Boolean)
      .sort((a: any, b: any) => getSortWeight(a) - getSortWeight(b));

    // 👇 Usamos la lupa para traducir el ID al nombre real del color
    const colorNames = productVariants.map(v => {
      const found = colors?.find(c => c.id === v.color_id);
      return found ? found.name : null;
    });
    const colorsList = Array.from(new Set(colorNames))
      .filter(Boolean)
      .sort((a: any, b: any) => String(a).localeCompare(String(b)));

    return { uniqueSizes: sizesList, uniqueColors: colorsList };
  }, [productVariants, sizes, colors]);

  const handleSave = async () => {
    const newVars: VariationPayload[] = [];
    let hasMissingStock = false;
    let missingDetails: string[] = [];

    uniqueColors.forEach(colorName => {
      uniqueSizes.forEach(sizeName => {
        const qty = valuesRef.current[`${sizeName}-${colorName}`] || 0;
        if (qty > 0) {
          const existing = (currentVariations || []).find(cv => cv.size === sizeName && cv.color === colorName);
          
          // Buscamos la variante original cruzando IDs
          const variant = productVariants.find(v => {
            const s = sizes?.find(x => x.id === v.size_id);
            const c = colors?.find(x => x.id === v.color_id);
            return s?.name === sizeName && c?.name === colorName;
          });
          
          const stockActual = variant ? (variant.stock_quantity || 0) : 0;
          if (qty > stockActual) {
            hasMissingStock = true;
            missingDetails.push(`- ${sizeName} ${colorName}: Faltan ${qty - stockActual} u.`);
          }

          newVars.push({
            id: existing ? existing.id : crypto.randomUUID(),
            size: sizeName as string,
            color: colorName as string,
            sizeId: variant ? variant.size_id : '', 
            colorId: variant ? variant.color_id : '',
            quantityOrdered: qty,
            quantityDelivered: existing ? existing.quantityDelivered : 0
          });
        }
      });
    });

    if (hasMissingStock) {
      const { isConfirmed } = await Swal.fire({
        title: '⚠️ Faltante de Stock',
        html: `
          <p class="text-sm text-slate-500 mb-4">Estás anotando más prendas de las que tenés disponibles. La diferencia se guardará como <b>"A Fabricar / Comprar"</b>.</p>
          <div class="bg-rose-50 p-4 rounded-xl text-rose-600 text-left text-xs font-bold font-mono overflow-y-auto max-h-32 border border-rose-100">
            ${missingDetails.join('<br/>')}
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        cancelButtonColor: '#ef4444',
        confirmButtonText: 'Sí, anotar igual 🚀',
        cancelButtonText: 'Cancelar'
      });

      if (!isConfirmed) return;
    }

    onSave(newVars);
  };

  const matrixTable = useMemo(() => (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr>
          <th className="p-4 border-b border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest min-w-[120px]">Color \ Talle</th>
          {uniqueSizes.map(s => (
            <th key={s as string} className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-white text-[11px] font-black text-center uppercase tracking-widest">
              {s as string}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {uniqueColors.map(colorName => (
          <tr key={colorName as string}>
            <td className="p-4 border-r border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-[11px] font-bold uppercase tracking-widest whitespace-nowrap">
              {colorName as string}
            </td>
            {uniqueSizes.map(sizeName => {
              const variant = productVariants.find(v => {
                const s = sizes?.find(x => x.id === v.size_id);
                const c = colors?.find(x => x.id === v.color_id);
                return s?.name === sizeName && c?.name === colorName;
              });
              
              const key = `${sizeName}-${colorName}`;
              
              if (!variant) {
                return <td key={key} className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 opacity-40 pointer-events-none" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.03) 5px, rgba(0,0,0,0.03) 10px)' }}></td>;
              }

              const stockActual = variant.stock_quantity || 0;
              const existing = (currentVariations || []).find(cv => cv.size === sizeName && cv.color === colorName);
              const delivered = existing ? existing.quantityDelivered : 0;
              const defaultValue = existing ? existing.quantityOrdered : '';
              const isOverStockInit = typeof defaultValue === 'number' && defaultValue > stockActual;

              return (
                <td key={key} className="p-2 border-b border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 text-center relative hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <span className={`absolute top-1 left-2 text-[9px] font-black ${stockActual > 0 ? 'text-emerald-500' : 'text-slate-400'} opacity-80`}>Disp: {stockActual}</span>
                  {delivered > 0 && <span className="absolute top-1 right-2 text-[9px] font-black text-blue-500 opacity-90" title="Entregado">Ent: {delivered}</span>}
                  
                  <input 
                    type="number" 
                    min={delivered}
                    defaultValue={defaultValue}
                    onChange={(e) => {
                      valuesRef.current[key] = parseInt(e.target.value, 10) || 0;
                    }}
                    onInput={(e) => {
                      e.currentTarget.classList.toggle('!text-rose-500', Number(e.currentTarget.value) > stockActual);
                      e.currentTarget.classList.toggle('text-slate-900', Number(e.currentTarget.value) <= stockActual);
                      e.currentTarget.classList.toggle('dark:text-white', Number(e.currentTarget.value) <= stockActual);
                    }}
                    className={`w-full mt-4 h-12 bg-transparent text-center font-black text-xl outline-none focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:ring-2 focus:ring-blue-500 rounded-xl transition-all ${isOverStockInit ? '!text-rose-500' : 'text-slate-900 dark:text-white'}`}
                    placeholder="-"
                  />
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  ), [uniqueSizes, uniqueColors, productVariants, currentVariations, sizes, colors]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700 max-h-[90vh]">
        
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">MATRIZ DE PRODUCCIÓN / VENTA</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{product?.name || 'Cargando producto...'}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-full shadow-sm transition-all">✕</button>
        </div>

        <div className="p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950 flex-1">
          <div className="flex justify-between items-end mb-4">
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-relaxed">
              Ingresá las cantidades.<br/>
              <span className="text-rose-500">Rojo = Venta sobre pedido (Genera faltante).</span>
            </p>
            <button onClick={onRequestNewVariant} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-lg shadow-indigo-500/30 flex items-center gap-1">
              ✨ + AGREGAR COLOR/TALLE
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            {matrixTable}
          </div>
        </div>

        <div className="px-8 py-5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 sticky bottom-0 z-10">
          <button onClick={onClose} className="px-6 py-3 rounded-xl text-xs font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors uppercase tracking-widest">Cancelar</button>
          <button onClick={handleSave} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/30 transition-all active:scale-95 uppercase tracking-widest">Guardar Matriz</button>
        </div>

      </div>
    </div>
  );
};