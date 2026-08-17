import { useState, useCallback, useMemo, useEffect } from 'react';
import { Calculator, Trash2, Save, ChevronDown, ChevronUp, Clock } from 'lucide-react';

// =============================================
// TIPOS
// =============================================
interface CostVariable {
  label: string;
  key: string;
  icon: string;
  placeholder: string;
  unit?: string; // unidad libre: "kg", "horas", etc.
  isPercent?: boolean;
}

interface CategoryConfig {
  label: string;
  icon: string;
  variables: CostVariable[];
}

interface SavedCalculation {
  id: string;
  name: string;
  category: string;
  inputs: Record<string, number>;
  sellingPrice: number;
  netProfit: number;
  savedAt: string;
}

// =============================================
// VARIABLES POR CATEGORÍA
// =============================================
// Porcentajes compartidos que siempre aparecen al final
const SHARED_PCT_VARS: CostVariable[] = [
  { key: 'tax',      label: 'IVA / Impuestos',    icon: '🧾', placeholder: '21', isPercent: true },
  { key: 'margin',   label: 'Margen de Ganancia',  icon: '📈', placeholder: '30', isPercent: true },
  { key: 'discount', label: 'Descuento de Oferta', icon: '🏷️', placeholder: '0',  isPercent: true },
];

const CATEGORIES: Record<string, CategoryConfig> = {
  general: {
    label: 'General',
    icon: '🧮',
    variables: [
      { key: 'materials', label: 'Materiales / Insumos',  icon: '📦', placeholder: '0.00' },
      { key: 'labor',     label: 'Mano de Obra',           icon: '⚒️',  placeholder: '0.00' },
      { key: 'overhead',  label: 'Gastos Generales',       icon: '🏢', placeholder: '0.00' },
      { key: 'other',     label: 'Otros Costos',           icon: '➕', placeholder: '0.00' },
    ],
  },
  textil: {
    label: 'Ropa / Textil',
    icon: '👕',
    variables: [
      { key: 'fabric',      label: 'Tela / Género',          icon: '🧵', placeholder: '0.00', unit: 'por metro' },
      { key: 'accessories', label: 'Avíos (botones, zippers)',icon: '🔩', placeholder: '0.00' },
      { key: 'sewing',      label: 'Mano de Obra (costura)',  icon: '⚒️',  placeholder: '0.00' },
      { key: 'print',       label: 'Estampado / Bordado',     icon: '🖨️', placeholder: '0.00' },
      { key: 'packaging',   label: 'Packaging / Bolsa',       icon: '🛍️', placeholder: '0.00' },
      { key: 'other',       label: 'Otros Costos',            icon: '➕', placeholder: '0.00' },
    ],
  },
  insumos: {
    label: 'Insumos',
    icon: '📦',
    variables: [
      { key: 'rawmat',    label: 'Materia Prima',       icon: '🪨', placeholder: '0.00' },
      { key: 'packaging', label: 'Embalaje',            icon: '📦', placeholder: '0.00' },
      { key: 'transport', label: 'Transporte / Flete',  icon: '🚚', placeholder: '0.00' },
      { key: 'storage',   label: 'Almacenamiento',      icon: '🏭', placeholder: '0.00' },
      { key: 'other',     label: 'Otros Costos',        icon: '➕', placeholder: '0.00' },
    ],
  },
  servicio: {
    label: 'Servicio',
    icon: '🛠️',
    variables: [
      { key: 'hours',     label: 'Horas de Trabajo',      icon: '⏱️', placeholder: '0.00', unit: 'hs × tarifa' },
      { key: 'travel',    label: 'Desplazamiento',        icon: '🚗', placeholder: '0.00' },
      { key: 'tools',     label: 'Herramientas / Consumibles', icon: '🔧', placeholder: '0.00' },
      { key: 'sub',       label: 'Subcontratación',       icon: '🤝', placeholder: '0.00' },
      { key: 'overhead',  label: 'Gastos Generales',      icon: '🏢', placeholder: '0.00' },
      { key: 'other',     label: 'Otros Costos',          icon: '➕', placeholder: '0.00' },
    ],
  },
  impresion3d: {
    label: 'Impresión 3D',
    icon: '🖨️',
    variables: [
      { key: 'filament',   label: 'Filamento',             icon: '🧶', placeholder: '0.00', unit: 'por gramo' },
      { key: 'machinetime',label: 'Tiempo de Máquina',     icon: '⏱️', placeholder: '0.00', unit: 'hs × costo/h' },
      { key: 'electricity',label: 'Electricidad',          icon: '⚡', placeholder: '0.00' },
      { key: 'postprocess',label: 'Post-procesado / Lijado',icon: '🪚', placeholder: '0.00' },
      { key: 'design',     label: 'Diseño / Modelado 3D',  icon: '💻', placeholder: '0.00' },
      { key: 'support',    label: 'Material de Soporte',   icon: '🏗️', placeholder: '0.00' },
      { key: 'other',      label: 'Otros Costos',          icon: '➕', placeholder: '0.00' },
    ],
  },
  producto: {
    label: 'Producto Terminado',
    icon: '🏷️',
    variables: [
      { key: 'materials',  label: 'Materiales',            icon: '📦', placeholder: '0.00' },
      { key: 'labor',      label: 'Mano de Obra',          icon: '⚒️',  placeholder: '0.00' },
      { key: 'packaging',  label: 'Packaging',             icon: '🛍️', placeholder: '0.00' },
      { key: 'storage',    label: 'Almacenamiento',        icon: '🏭', placeholder: '0.00' },
      { key: 'logistics',  label: 'Logística / Envío',     icon: '🚚', placeholder: '0.00' },
      { key: 'other',      label: 'Otros Costos',          icon: '➕', placeholder: '0.00' },
    ],
  },
  gastronomia: {
    label: 'Gastronomía',
    icon: '🍽️',
    variables: [
      { key: 'ingredients',label: 'Ingredientes',          icon: '🥬', placeholder: '0.00' },
      { key: 'labor',      label: 'Mano de Obra',          icon: '👨‍🍳', placeholder: '0.00' },
      { key: 'gas',        label: 'Gas / Electricidad',    icon: '🔥', placeholder: '0.00' },
      { key: 'packaging',  label: 'Envase / Packaging',    icon: '📦', placeholder: '0.00' },
      { key: 'overhead',   label: 'Gastos del Local',      icon: '🏢', placeholder: '0.00' },
      { key: 'other',      label: 'Otros Costos',          icon: '➕', placeholder: '0.00' },
    ],
  },
};

const CATEGORY_KEYS = Object.keys(CATEGORIES);
const STORAGE_KEY = 'raices-cost-calculator-history';

const buildDefaultInputs = (catKey: string): Record<string, number> => {
  const vars = [...(CATEGORIES[catKey]?.variables ?? []), ...SHARED_PCT_VARS];
  const defaults: Record<string, number> = {};
  vars.forEach(v => {
    defaults[v.key] = v.key === 'tax' ? 21 : v.key === 'margin' ? 30 : 0;
  });
  return defaults;
};

// =============================================
// HELPERS
// =============================================
const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(n);

const pct = (n: number) => `${n.toFixed(1)}%`;

// =============================================
// COMPONENTE PRINCIPAL
// =============================================
export const CostCalculator = () => {
  const [categoryKey, setCategoryKey] = useState<string>('general');
  const [inputs, setInputs] = useState<Record<string, number>>(buildDefaultInputs('general'));
  const [calcName, setCalcName] = useState('');
  const [history, setHistory] = useState<SavedCalculation[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const currentCategory = CATEGORIES[categoryKey];
  const allVars = [...currentCategory.variables, ...SHARED_PCT_VARS];

  // Cargar historial desde localStorage al montar
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw) as SavedCalculation[]);
    } catch { /* ignorar */ }
  }, []);

  // Al cambiar categoría: reiniciar inputs con defaults de la nueva categoría
  const handleCategoryChange = useCallback((key: string) => {
    setCategoryKey(key);
    setInputs(buildDefaultInputs(key));
    setCalcName('');
  }, []);

  // -------------------------------------------------------
  // CÁLCULOS EN TIEMPO REAL
  // -------------------------------------------------------
  const results = useMemo(() => {
    const costKeys = currentCategory.variables.map(v => v.key);
    const baseCost   = costKeys.reduce((sum, k) => sum + (inputs[k] ?? 0), 0);
    const withTax    = baseCost * (1 + (inputs.tax ?? 0) / 100);
    const margin     = inputs.margin ?? 0;
    const withMargin = margin < 100 ? withTax / (1 - margin / 100) : withTax;
    const finalPrice = withMargin * (1 - (inputs.discount ?? 0) / 100);
    const netProfit  = finalPrice - baseCost;
    const realMargin = finalPrice > 0 ? ((finalPrice - baseCost) / finalPrice) * 100 : 0;
    return { baseCost, withTax, withMargin, finalPrice, netProfit, realMargin };
  }, [inputs, currentCategory]);

  // -------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------
  const handleInput = useCallback((key: string, raw: string) => {
    const val = parseFloat(raw.replace(',', '.'));
    setInputs(prev => ({ ...prev, [key]: isNaN(val) ? 0 : val }));
  }, []);

  const handleReset = useCallback(() => {
    setInputs(buildDefaultInputs(categoryKey));
    setCalcName('');
  }, [categoryKey]);

  const handleSave = useCallback(() => {
    const entry: SavedCalculation = {
      id: crypto.randomUUID(),
      name: calcName.trim() || `Cálculo ${new Date().toLocaleDateString('es-AR')}`,
      category: categoryKey,
      inputs: { ...inputs },
      sellingPrice: results.finalPrice,
      netProfit: results.netProfit,
      savedAt: new Date().toISOString(),
    };
    setHistory(prev => {
      const updated = [entry, ...prev].slice(0, 10);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    setCalcName('');
  }, [calcName, categoryKey, inputs, results]);

  const handleDeleteHistory = useCallback((id: string) => {
    setHistory(prev => {
      const updated = prev.filter(h => h.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleLoadHistory = useCallback((entry: SavedCalculation) => {
    setCategoryKey(entry.category);
    setInputs(entry.inputs);
    setCalcName(entry.name);
  }, []);

  // =============================================
  // RENDER
  // =============================================
  return (
    <div className="max-w-6xl mx-auto space-y-8">

      {/* HEADER */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
          <Calculator size={28} className="text-white" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight leading-none">
            Calculadora de Costos
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Elegí la categoría para cargar las variables correspondientes y obtener el precio de venta.
          </p>
        </div>
      </div>

      {/* SELECTOR DE CATEGORÍA — tarjetas horizontales */}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_KEYS.map(key => {
          const cat = CATEGORIES[key];
          const isActive = key === categoryKey;
          return (
            <button
              key={key}
              id={`cat-btn-${key}`}
              onClick={() => handleCategoryChange(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <span aria-hidden="true">{cat.icon}</span>
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* CUERPO PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── PANEL IZQUIERDO: VARIABLES ── */}
        <section aria-label="Variables de costo" className="lg:col-span-3 bg-slate-900 rounded-3xl border border-slate-800 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
              {currentCategory.icon} {currentCategory.label} — Variables de Costo
            </h2>
          </div>

          {/* Nombre del cálculo */}
          <div className="space-y-1">
            <label htmlFor="calc-name" className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Nombre del Cálculo
            </label>
            <input
              id="calc-name"
              type="text"
              value={calcName}
              onChange={e => setCalcName(e.target.value)}
              placeholder={`Ej: ${currentCategory.label} - producto #1`}
              className="w-full bg-slate-950 border border-slate-700 text-white text-sm font-bold rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600"
            />
          </div>

          <hr className="border-slate-800" />

          {/* Variables de costo de la categoría */}
          <div className="space-y-3">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Costos directos</p>
            {currentCategory.variables.map(v => (
              <div key={v.key} className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-base shrink-0" aria-hidden="true">
                  {v.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <label htmlFor={`var-${v.key}`} className="text-sm font-bold text-slate-300 block leading-tight">
                    {v.label}
                  </label>
                  {v.unit && (
                    <span className="text-[10px] text-slate-600 font-bold">{v.unit}</span>
                  )}
                </div>
                <div className="relative shrink-0">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm select-none">$</span>
                  <input
                    id={`var-${v.key}`}
                    type="number"
                    min={0}
                    step={0.01}
                    value={inputs[v.key] === 0 ? '' : inputs[v.key]}
                    onChange={e => handleInput(v.key, e.target.value)}
                    placeholder="0.00"
                    className="w-36 bg-slate-950 border border-slate-700 text-white text-sm font-black rounded-xl py-3 pr-4 pl-8 outline-none focus:border-indigo-500 transition-colors text-right"
                  />
                </div>
              </div>
            ))}
          </div>

          <hr className="border-slate-800" />

          {/* Porcentajes compartidos */}
          <div className="space-y-3">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Ajustes de precio</p>
            {SHARED_PCT_VARS.map(v => (
              <div key={v.key} className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-base shrink-0" aria-hidden="true">
                  {v.icon}
                </div>
                <label htmlFor={`var-${v.key}`} className="flex-1 text-sm font-bold text-slate-300">
                  {v.label}
                </label>
                <div className="relative shrink-0">
                  <input
                    id={`var-${v.key}`}
                    type="number"
                    min={0}
                    max={v.key === 'margin' ? 99 : 100}
                    step={1}
                    value={inputs[v.key] === 0 && v.key === 'discount' ? '' : inputs[v.key]}
                    onChange={e => handleInput(v.key, e.target.value)}
                    placeholder={v.placeholder}
                    className="w-36 bg-slate-950 border border-slate-700 text-white text-sm font-black rounded-xl py-3 pr-8 pl-4 outline-none focus:border-indigo-500 transition-colors text-right"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm select-none">%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-2">
            <button
              id="btn-save-calc"
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-colors"
            >
              <Save size={14} aria-hidden="true" />
              Guardar Cálculo
            </button>
            <button
              id="btn-reset-calc"
              onClick={handleReset}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-black text-xs uppercase tracking-widest rounded-xl transition-colors"
            >
              <Trash2 size={14} aria-hidden="true" />
              Limpiar
            </button>
          </div>
        </section>

        {/* ── PANEL DERECHO: RESULTADO ── */}
        <section aria-label="Resultado del cálculo" className="lg:col-span-2 flex flex-col gap-4">

          {/* Precio de venta */}
          <div className="bg-indigo-600 rounded-3xl p-6 text-center shadow-xl shadow-indigo-600/30 flex-1 flex flex-col items-center justify-center gap-2">
            <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.3em]">Precio de Venta Final</p>
            <p className="text-5xl font-black text-white leading-none" aria-live="polite">
              {fmt(results.finalPrice)}
            </p>
            <p className="text-indigo-200 text-xs font-bold mt-1">
              Margen real sobre venta: <span className="text-white font-black">{pct(results.realMargin)}</span>
            </p>
          </div>

          {/* Desglose */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 space-y-3">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Desglose</h2>

            {([
              { label: 'Costo neto total',                        value: fmt(results.baseCost),   color: 'text-slate-300' },
              { label: `Con impuestos (${inputs.tax ?? 0}%)`,     value: fmt(results.withTax),    color: 'text-amber-400' },
              { label: `Con margen (${inputs.margin ?? 0}%)`,     value: fmt(results.withMargin), color: 'text-emerald-400' },
              ...((inputs.discount ?? 0) > 0
                ? [{ label: `Descuento (${inputs.discount}%)`, value: `- ${fmt(results.withMargin - results.finalPrice)}`, color: 'text-rose-400' }]
                : []),
              { label: 'Ganancia neta estimada',                  value: fmt(results.netProfit),  color: 'text-indigo-400' },
            ] as { label: string; value: string; color: string }[]).map(row => (
              <div key={row.label} className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-bold">{row.label}</span>
                <span className={`text-sm font-black ${row.color}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* HISTORIAL */}
      {history.length > 0 && (
        <section className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
          <button
            id="btn-toggle-history"
            onClick={() => setShowHistory(v => !v)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Clock size={16} className="text-slate-400" aria-hidden="true" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Historial de cálculos ({history.length})
              </span>
            </div>
            {showHistory
              ? <ChevronUp size={16} className="text-slate-500" aria-hidden="true" />
              : <ChevronDown size={16} className="text-slate-500" aria-hidden="true" />
            }
          </button>

          {showHistory && (
            <div className="divide-y divide-slate-800">
              {history.map(entry => {
                const catLabel = CATEGORIES[entry.category]?.label ?? entry.category;
                const catIcon  = CATEGORIES[entry.category]?.icon ?? '🧮';
                return (
                  <div key={entry.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-800/30 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-white truncate">{entry.name}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                        {catIcon} {catLabel} · {new Date(entry.savedAt).toLocaleDateString('es-AR')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-indigo-400">{fmt(entry.sellingPrice)}</p>
                      <p className="text-[10px] text-emerald-400 font-bold">+ {fmt(entry.netProfit)} ganancia</p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => handleLoadHistory(entry)}
                        className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors"
                      >
                        Cargar
                      </button>
                      <button
                        onClick={() => handleDeleteHistory(entry.id)}
                        className="p-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 rounded-lg transition-colors"
                        aria-label="Eliminar cálculo"
                      >
                        <Trash2 size={12} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
