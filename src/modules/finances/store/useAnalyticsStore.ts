import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';
import Swal from 'sweetalert2';

// 🛡️ INTERFACES PARA TIPADO ESTRICTO
interface OrderItem {
  productName: string;
  unitPrice?: number;
  variations?: { quantityOrdered: number }[];
}

interface AnalyticsState {
  metrics: {
    revenue: number;
    laborCosts: number;
    supplyCosts: number;
    fixedCosts: number;
    netProfit: number;
    margin: number;
  };
  topProducts: { name: string; revenue: number; quantity: number }[];
  isLoading: boolean;
  fetchAnalytics: (month: number, year: number) => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  metrics: { revenue: 0, laborCosts: 0, supplyCosts: 0, fixedCosts: 0, netProfit: 0, margin: 0 },
  topProducts: [],
  isLoading: false,

  fetchAnalytics: async (month, year) => {
    const tenantId = useTenantStore.getState().activeCompanyId;
    
    if (!tenantId) {
      console.error("❌ [Analytics Store] No hay un ID de compañía activo.");
      return;
    }

    set({ isLoading: true });
    
    // Rango de fechas optimizado para el mes seleccionado
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59, 999).toISOString();

    try {
      // 🚀 EJECUCIÓN PARALELA: Máximo rendimiento de red
      const [ordersRes, expensesRes, tasksRes] = await Promise.all([
        supabase
          .from('orders')
          .select('total_amount, items')
          .eq('company_id', tenantId)
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .neq('status', 'CANCELLED'),
        supabase
          .from('expenses')
          .select('amount, category')
          .eq('company_id', tenantId)
          .gte('expense_date', startDate)
          .lte('expense_date', endDate),
        supabase
          .from('worker_tasks')
          .select('quantity, price_per_unit')
          .eq('company_id', tenantId)
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .in('status', ['COMPLETADO', 'PAGADO'])
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (expensesRes.error) throw expensesRes.error;
      if (tasksRes.error) throw tasksRes.error;

      // --- PROCESAMIENTO DE DATOS ---
      let revenue = 0;
      let laborCosts = 0;
      let supplyCosts = 0;
      let fixedCosts = 0;
      const productMap: Record<string, { revenue: number; quantity: number }> = {};

      // 1. Ingresos y Ranking
      ordersRes.data?.forEach(order => {
        revenue += Number.parseFloat(String(order.total_amount || 0));
        
        const items = order.items as unknown as OrderItem[];
        if (Array.isArray(items)) {
          items.forEach(item => {
            if (!item.productName) return;

            const qty = item.variations?.reduce((acc, v) => acc + (v.quantityOrdered || 0), 0) || 0;
            const lineTotal = qty * (item.unitPrice || 0); 
            
            if (!productMap[item.productName]) {
              productMap[item.productName] = { revenue: 0, quantity: 0 };
            }
            productMap[item.productName].revenue += lineTotal;
            productMap[item.productName].quantity += qty;
          });
        }
      });

      // 2. Gastos (Insumos vs Estructura)
      expensesRes.data?.forEach(exp => {
        const amt = Number.parseFloat(String(exp.amount || 0));
        if (exp.category === 'INSUMOS') {
          supplyCosts += amt;
        } else {
          fixedCosts += amt;
        }
      });

      // 3. Mano de Obra (Talleristas)
      tasksRes.data?.forEach(task => {
        const qty = Number.parseFloat(String(task.quantity || 0));
        const price = Number.parseFloat(String(task.price_per_unit || 0));
        laborCosts += (qty * price);
      });

      // 4. Consolidación de Métricas
      const totalCosts = laborCosts + supplyCosts + fixedCosts;
      const netProfit = revenue - totalCosts;
      const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

      const topProducts = Object.entries(productMap)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      set({
        metrics: { revenue, laborCosts, supplyCosts, fixedCosts, netProfit, margin },
        topProducts,
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error("❌ [Analytics Store] Fallo crítico:", errorMessage);
      Swal.fire('Error de Datos', 'No se pudieron calcular las métricas financieras.', 'error');
    } finally {
      set({ isLoading: false });
    }
  }
}));