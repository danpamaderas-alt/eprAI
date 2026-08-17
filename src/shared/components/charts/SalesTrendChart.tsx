import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Skeleton } from '../ui/Skeleton';
import { ARS } from '../../utils/format';

interface SalesTrendChartProps {
  data?: { day: string; sales: number }[];
  isLoading?: boolean;
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function SalesTrendChart({ data, isLoading }: SalesTrendChartProps) {
  const chartData = useMemo(() => {
    if (data && data.length > 0) return data;
    return DAYS.map((day) => ({ day, sales: 0 }));
  }, [data]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm">
        <Skeleton className="h-4 w-40 mb-8" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm">
      <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-8">
        Tendencia Operativa
      </h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }}
            />
            <YAxis hide />
            <Tooltip
              formatter={(value: number) => [ARS.format(value), 'Ventas']}
              contentStyle={{
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                fontSize: '12px',
                fontWeight: 800,
              }}
            />
            <Bar
              dataKey="sales"
              radius={[12, 12, 0, 0]}
              fill="#2563eb"
              maxBarSize={48}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
