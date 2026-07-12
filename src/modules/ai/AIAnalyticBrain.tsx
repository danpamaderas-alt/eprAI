import { useState } from "react";
import { Bot, Sparkles, AlertTriangle } from "lucide-react";
import { useCatalogStore } from "../../store/useCatalogStore";
import { useCrmStore } from "../crm/store/useCrmStore";
import { useTreasuryStore } from "../inventory/treasury/store/useTreasuryStore";

export const AIAnalyticBrain = () => {
  const [analysis, setAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { products, inventory } = useCatalogStore();
  const { balances } = useCrmStore();
  const { transactions } = useTreasuryStore();

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const cashBalance = transactions
        .filter((t) => t.status === "COMPLETED" || !t.status)
        .reduce(
          (acc, t) =>
            acc +
            (t.type === "INCOME"
              ? Number(t.amount || 0)
              : -Number(t.amount || 0)),
          0,
        );

      const totalDebt = balances.reduce(
        (acc, c) => acc + Number(c.balance || 0),
        0,
      );

      let stockValue = 0;
      inventory.forEach((v) => {
        const product = products.find((p) => p.id === v.product_id);
        if (product) {
          stockValue +=
            Number(v.finished_quantity || 0) * Number(product.price || 0);
        }
      });

      const prompt = `
        Actúa como el Director Financiero (CFO) experto de "Raíces", un Holding de indumentaria corporativa.
        Analiza la siguiente situación financiera de la empresa y da 3 consejos accionables, cortos y directos.
        
        Métricas actuales:
        - Caja Real (Fondos líquidos): $${cashBalance}
        - Cuentas por Cobrar (Deuda en la calle): $${totalDebt}
        - Valor Patrimonial del Stock Terminado: $${stockValue}
        
        Reglas de la respuesta:
        - Usa un tono profesional, motivador y vanguardista.
        - No saludes, ve directamente al grano.
        - Separa los 3 consejos con emojis o viñetas.
      `;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `Error del servicio de IA (código ${response.status}).`,
        );
      }

      const data = await response.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!aiText) {
        throw new Error(
          "La respuesta de la Inteligencia Artificial estaba vacía.",
        );
      }

      setAnalysis(aiText);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          setError(
            "La conexión a internet está inestable o la IA tardó demasiado en responder.",
          );
        } else {
          setError(err.message);
        }
      } else {
        setError("Error desconocido del motor neuronal.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group transition-all">
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-8xl group-hover:scale-110 group-hover:opacity-[0.05] transition-all duration-700 select-none pointer-events-none">
        <Bot size={180} />
      </div>

      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <span className="text-indigo-500 animate-pulse">
                <Sparkles size={24} />
              </span>
              Cerebro Financiero
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Motor IA: Google Gemini 1.5 Flash • Contexto Dinámico
            </p>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2"
          >
            {isAnalyzing ? "PROCESANDO VARIABLES..." : "SOLICITAR DIAGNÓSTICO"}
          </button>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-2xl flex items-start gap-4 mb-4">
            <AlertTriangle
              className="text-rose-500 shrink-0 mt-0.5"
              size={18}
            />
            <p className="text-xs font-bold text-rose-400 uppercase tracking-widest leading-relaxed">
              {error}
            </p>
          </div>
        )}

        {analysis && !error && (
          <div className="bg-slate-950/50 border border-slate-800 p-6 rounded-[2rem] animate-in slide-in-from-top-4 duration-500">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Bot size={14} /> Recomendaciones Estratégicas
            </p>
            <div className="text-sm font-bold text-slate-300 whitespace-pre-wrap leading-relaxed">
              {analysis}
            </div>
          </div>
        )}

        {!analysis && !error && !isAnalyzing && (
          <div className="border-2 border-dashed border-slate-800/50 rounded-[2rem] p-10 text-center">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] leading-relaxed">
              La red neuronal está a la espera.
              <br />
              Pulsa el botón para cruzar tesorería, ventas y catálogo de forma
              predictiva.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
