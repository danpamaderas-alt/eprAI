import { useState } from 'react';
import { useCatalogStore } from '../../store/useCatalogStore';
import { useTreasuryStore } from '../inventory/treasury/store/useTreasuryStore';

export const AIAnalyticBrain = () => {
  const { inventory, customers, products } = useCatalogStore();
  const { transactions } = useTreasuryStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);

  const runRealDiagnosis = async () => {
    setIsAnalyzing(true);
    setInsight(null);

    // 1. Recolección de datos de Raíces
    const dataSnapshot = {
      ventasTotales: transactions?.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0) || 0,
      gastosTotales: transactions?.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0) || 0,
      deudaClientes: customers?.reduce((acc, c) => acc + (Number(c.balance) || 0), 0) || 0,
      prendasTerminadas: inventory?.reduce((acc, v) => acc + (v.finished_quantity || 0), 0) || 0,
    };

    const prompt = `Actúa como un Director Financiero experto en la industria textil de Argentina. 
    Analiza estos datos de mi empresa "Raíces":
    - Ventas: $${dataSnapshot.ventasTotales}
    - Gastos: $${dataSnapshot.gastosTotales}
    - Deuda de clientes por cobrar: $${dataSnapshot.deudaClientes}
    - Stock listo para vender: ${dataSnapshot.prendasTerminadas} unidades.
    
    Dame un diagnóstico corto (máximo 3 párrafos) sobre mi rentabilidad actual y 2 acciones urgentes que debo tomar. Habla en tono profesional pero cercano, mencionando que estamos en Berisso.`;

    try {
      const apiKey = "AIzaSyClerEHZ2dcfTw0mnwZXmmCJ46Z2DH1vrI";
      
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error?.message || "Error de conexión con Google.";
        setInsight(`❌ RECHAZO: ${errorMsg}`);
        return;
      }

      const aiResponse = data.candidates[0].content.parts[0].text;
      setInsight(aiResponse);
      
    } catch (error: any) {
      setInsight(`❌ ERROR CRÍTICO: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-slate-900 rounded-[2rem] border border-slate-800 p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl"></div>
      
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-black text-white italic tracking-tighter">🧠 CEREBRO ANALÍTICO</h2>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.3em]">IA PROFESIONAL ACTIVA</p>
          </div>
          <button 
            onClick={runRealDiagnosis}
            disabled={isAnalyzing}
            className={`px-8 py-3 rounded-2xl font-black text-xs uppercase transition-all transform active:scale-95 ${
              isAnalyzing ? 'bg-slate-800 text-slate-500' : 'bg-white text-slate-900 hover:bg-blue-500 hover:text-white shadow-xl shadow-blue-500/20'
            }`}
          >
            {isAnalyzing ? 'Procesando números...' : '⚡ Ejecutar Análisis Real'}
          </button>
        </div>

        {insight ? (
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 animate-in fade-in zoom-in duration-500">
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium italic">
              {insight}
            </p>
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-slate-600 text-xs font-bold uppercase tracking-widest italic opacity-50">
              Listo para auditar las finanzas de Raíces
            </p>
          </div>
        )}
      </div>
    </div>
  );
};