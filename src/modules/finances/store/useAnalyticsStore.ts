import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';

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
    set({ isLoading: true });
    const tenantId = useTenantStore.getState().activeCompanyId;
    
    // Rango de fechas para el mes seleccionado
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

    // 1. Ingresos (Pedidos Completados o Parciales)
    const { data: orders } = await supabase
      .from('orders')
      .select('total_amount, items')
      .eq('company_id', tenantId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .neq('status', 'CANCELLED');

    // 2. Gastos Fijos e Insumos (Caja)
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, category')
      .eq('company_id', tenantId)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate);

    // 3. Costos de Talleristas (Mano de Obra pagada o completada)
    const { data: tasks } = await supabase
      .from('worker_tasks')
      .select('quantity, price_per_unit')
      .eq('company_id', tenantId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .in('status', ['COMPLETADO', 'PAGADO']);

    // --- CÁLCULOS ---
    let revenue = 0;
    let laborCosts = 0;
    let supplyCosts = 0;
    let fixedCosts = 0;
    const productMap: Record<string, { revenue: number; quantity: number }> = {};

    // Procesar Ingresos y Ranking de Productos
    orders?.forEach(order => {
      revenue += Number(order.total_amount || 0);
      
      // Analizar qué productos se vendieron (basado en tu estructura JSON de items)
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const qty = item.variations?.reduce((acc: number, v: any) => acc + (v.quantityOrdered || 0), 0) || 0;
          const lineTotal = qty * (item.unitPrice || 0); // Aproximación de ingreso por producto
          
          if (!productMap[item.productName]) productMap[item.productName] = { revenue: 0, quantity: 0 };
          productMap[item.productName].revenue += lineTotal;
          productMap[item.productName].quantity += qty;
        });
      }
    });

    // Procesar Gastos Fijos vs Insumos
    expenses?.forEach(exp => {
      if (exp.category === 'INSUMOS') supplyCosts += Number(exp.amount);
      else fixedCosts += Number(exp.amount);
    });

    // Procesar Mano de Obra
    tasks?.forEach(task => {
      laborCosts += (Number(task.quantity) * Number(task.price_per_unit));
    });

    const totalCosts = laborCosts + supplyCosts + fixedCosts;
    const netProfit = revenue - totalCosts;
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    // Ordenar productos estrella
    const topProducts = Object.entries(productMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5); // Top 5

    set({
      metrics: { revenue, laborCosts, supplyCosts, fixedCosts, netProfit, margin },
      topProducts,
      isLoading: false
    });
  }
}));