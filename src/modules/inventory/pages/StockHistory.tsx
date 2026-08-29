import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import {
  Search,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  RefreshCw,
} from "lucide-react";
import { useTenantStore } from "../../../store/useTenantStore";

interface StockMovement {
  id: string;
  quantity: number;
  reason: string | null;
  created_at: string;
  products?: { name: string; sku: string; company_id?: string };
  sizes?: { name: string };
  colors?: { name: string };
}

export const StockHistory = () => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "IN" | "OUT">("ALL");

  // Paginación
  const [limit, setLimit] = useState(50);
  const [hasMore, setHasMore] = useState(true);

  // Store del Tenant
  const activeCompanyId = useTenantStore((state) => state.activeCompanyId);

  const fetchMovements = useCallback(
    async (isLoadMore = false) => {
      if (!activeCompanyId) return;
      if (!isLoadMore) setIsLoading(true);

      try {
        const query = supabase
          .from("stock_movements" as never)
          .select(
            `
          id,
          quantity,
          reason,
          created_at,
          products!inner (name, sku, company_id),
          sizes (name),
          colors (name)
        `,
          )
          .eq("products.company_id", activeCompanyId) // 🔐 Seguridad Multi-Tenant
          .order("created_at", { ascending: false })
          .limit(limit);

        const { data, error } = await query;
        if (error) throw error;

        const fetchedData = (data as unknown as StockMovement[]) || [];
        setMovements(fetchedData);

        // Si trajimos menos de los que pedimos, ya no hay más para cargar
        setHasMore(fetchedData.length === limit);
      } catch (error) {
        console.error("Error al cargar historial de stock:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [activeCompanyId, limit],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMovements();
  }, [fetchMovements]);

  // Filtrado en memoria (Búsqueda + Tipo)
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      // 1. Filtro por tipo de movimiento
      if (filterType === "IN" && m.quantity <= 0) return false;
      if (filterType === "OUT" && m.quantity > 0) return false;

      // 2. Filtro por texto
      if (!searchTerm) return true;
      const lowerSearch = searchTerm.toLowerCase();
      const prodName = m.products?.name?.toLowerCase() || "";
      const prodSku = m.products?.sku?.toLowerCase() || "";
      return prodName.includes(lowerSearch) || prodSku.includes(lowerSearch);
    });
  }, [movements, searchTerm, filterType]);

  const handleLoadMore = () => {
    setLimit((prev) => prev + 50);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 dark:bg-slate-800 p-8 rounded-4xl shadow-xl mb-8 gap-6 border border-slate-800 dark:border-slate-700">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <span className="bg-blue-600 text-white p-2 rounded-xl text-xl">
              <Clock size={24} />
            </span>
            Bitácora de <span className="text-blue-500">Stock</span>
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 italic">
            Historial de Ingresos y Egresos de Inventario
          </p>
        </div>
        <button
          onClick={() => fetchMovements(false)}
          className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest transition-colors border border-slate-700 flex items-center gap-2"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          Refrescar
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por artículo o SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-black tracking-widest uppercase focus:ring-2 focus:ring-blue-500 transition-colors text-slate-900 dark:text-white shadow-sm"
          />
        </div>

        <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          <button
            onClick={() => setFilterType("ALL")}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap ${filterType === "ALL" ? "bg-slate-900 text-white dark:bg-blue-600" : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterType("IN")}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-1 whitespace-nowrap ${filterType === "IN" ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
          >
            <ArrowDownRight size={14} /> Ingresos
          </button>
          <button
            onClick={() => setFilterType("OUT")}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-1 whitespace-nowrap ${filterType === "OUT" ? "bg-rose-500 text-white shadow-md shadow-rose-500/20" : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
          >
            <ArrowUpRight size={14} /> Egresos
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-4xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
              <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Fecha
              </th>
              <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Artículo
              </th>
              <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Variante
              </th>
              <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Motivo
              </th>
              <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                Cant.
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
            {isLoading ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-8 text-center text-xs font-bold text-slate-400"
                >
                  Cargando bitácora...
                </td>
              </tr>
            ) : filteredMovements.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-8 text-center text-xs font-bold text-slate-400"
                >
                  No hay movimientos registrados.
                </td>
              </tr>
            ) : (
              filteredMovements.map((mov) => {
                const isIncome = mov.quantity > 0;
                return (
                  <tr
                    key={mov.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group"
                  >
                    <td className="py-4 px-6 text-xs font-bold text-slate-500">
                      {new Date(mov.created_at).toLocaleString("es-AR")}
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-black text-xs text-slate-900 dark:text-white uppercase leading-tight">
                        {mov.products?.name || "DESCONOCIDO"}
                      </p>
                      <p className="text-[9px] font-black text-slate-400 tracking-widest mt-1">
                        SKU: {mov.products?.sku || "S/N"}
                      </p>
                    </td>
                    <td className="py-4 px-6 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">
                      {mov.sizes?.name} • {mov.colors?.name}
                    </td>
                    <td className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {mov.reason || "MOVIMIENTO MANUAL"}
                    </td>
                    <td
                      className={`py-4 px-6 text-right font-black tabular-nums text-sm flex justify-end items-center gap-2 ${isIncome ? "text-emerald-500" : "text-rose-500"}`}
                    >
                      {isIncome ? (
                        <ArrowDownRight size={16} />
                      ) : (
                        <ArrowUpRight size={16} />
                      )}
                      {isIncome ? "+" : "-"}
                      {Math.abs(mov.quantity)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Botón de Cargar Más */}
        {!isLoading && hasMore && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-900/50 text-center">
            <button
              onClick={handleLoadMore}
              className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
            >
              Cargar más movimientos ↓
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
