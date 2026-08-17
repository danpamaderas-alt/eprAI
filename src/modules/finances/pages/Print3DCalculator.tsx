import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Printer,
  Zap,
  Wrench,
  DollarSign,
  Save,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
} from "lucide-react";

// ====================================================
// TIPOS
// ====================================================
interface Inputs {
  // Material
  pieceWeight: number;      // g
  rollPrice: number;        // $
  rollWeight: number;       // g (default 1000)
  wasteFactor: number;      // % (default 15)
  // Máquina
  printTime: number;        // horas
  machinePower: number;     // W (default 250)
  electricityCost: number;  // $/kWh
  amortizationPerHour: number; // $/h
  maintenancePerHour: number;  // $/h
  // Mano de obra
  prepTime: number;         // h
  postTime: number;         // h
  laborRate: number;        // $/h
  // Operativos
  fixedCostMonthly: number; // $
  fixedCostPercent: number; // % asignado al proyecto
  // Precio
  profitMargin: number;     // %
  iva: number;              // %
  designBonus: number;      // % plus por diseño propio
  ownDesign: boolean;
}

interface SavedJob {
  id: string;
  name: string;
  inputs: Inputs;
  finalPrice: number;
  savedAt: string;
}

interface Breakdown {
  cm: number;          // Costo material
  chElec: number;      // Costo eléctrico
  ch: number;          // Costo máquina total
  cmo: number;         // Costo mano de obra
  fixedProrated: number;
  cp: number;          // Costo producción
  designPlus: number;
  basePrice: number;
  priceWithMargin: number;
  priceWithIva: number;
}

// ====================================================
// DEFAULTS
// ====================================================
const DEFAULT: Inputs = {
  pieceWeight: 0,
  rollPrice: 0,
  rollWeight: 1000,
  wasteFactor: 15,
  printTime: 0,
  machinePower: 250,
  electricityCost: 0,
  amortizationPerHour: 0,
  maintenancePerHour: 0,
  prepTime: 0,
  postTime: 0,
  laborRate: 0,
  fixedCostMonthly: 0,
  fixedCostPercent: 0,
  profitMargin: 30,
  iva: 21,
  designBonus: 20,
  ownDesign: false,
};

const STORAGE_KEY = "raices-print3d-history";

// ====================================================
// HELPERS
// ====================================================
const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(n);

const pct = (n: number) => `${n.toFixed(1)}%`;

// ====================================================
// SUB-COMPONENTE: TARJETA DE SECCIÓN
// ====================================================
const SectionCard = ({
  icon,
  title,
  color,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  children: React.ReactNode;
}) => (
  <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 space-y-4">
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color} shrink-0`}>
        {icon}
      </div>
      <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{title}</h2>
    </div>
    {children}
  </div>
);

// ====================================================
// SUB-COMPONENTE: CAMPO NUMÉRICO
// ====================================================
const Field = ({
  id,
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 0.01,
  hint,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  hint?: string;
}) => (
  <div className="space-y-1">
    <label htmlFor={id} className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
      {label}
      {hint && <span className="normal-case ml-1 text-slate-600">({hint})</span>}
    </label>
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm select-none">
          {prefix}
        </span>
      )}
      <input
        id={id}
        type="number"
        min={0}
        step={step}
        value={value === 0 ? "" : value}
        onChange={(e) => {
          const v = parseFloat(e.target.value.replace(",", "."));
          onChange(isNaN(v) ? 0 : v);
        }}
        placeholder="0"
        className={`w-full bg-slate-950 border border-slate-700 text-white text-sm font-black rounded-xl py-3 outline-none focus:border-indigo-500 transition-colors text-right ${
          prefix ? "pl-8 pr-4" : suffix ? "pl-4 pr-8" : "px-4"
        }`}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm select-none">
          {suffix}
        </span>
      )}
    </div>
  </div>
);

// ====================================================
// COMPONENTE PRINCIPAL
// ====================================================
export const Print3DCalculator = () => {
  const [inputs, setInputs] = useState<Inputs>(DEFAULT);
  const [jobName, setJobName] = useState("");
  const [history, setHistory] = useState<SavedJob[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw) as SavedJob[]);
    } catch { /* ignorar */ }
  }, []);

  const set = useCallback(
    <K extends keyof Inputs>(key: K, value: Inputs[K]) =>
      setInputs((prev) => ({ ...prev, [key]: value })),
    []
  );

  // -------------------------------------------------------
  // MOTOR DE CÁLCULO
  // -------------------------------------------------------
  const bd = useMemo<Breakdown>(() => {
    const { pieceWeight, rollPrice, rollWeight, wasteFactor,
            printTime, machinePower, electricityCost, amortizationPerHour, maintenancePerHour,
            prepTime, postTime, laborRate,
            fixedCostMonthly, fixedCostPercent,
            profitMargin, iva, designBonus, ownDesign } = inputs;

    // Costo Material: Cm = (pieceWeight × pricePerGram) × (1 + waste%)
    const pricePerGram = rollWeight > 0 ? rollPrice / rollWeight : 0;
    const cm = pieceWeight * pricePerGram * (1 + wasteFactor / 100);

    // Costo Máquina: Ch = printTime × (elec/h + amort/h + maint/h)
    const chElec = (machinePower / 1000) * electricityCost; // $/h
    const ch = printTime * (chElec + amortizationPerHour + maintenancePerHour);

    // Costo Mano de Obra: Cmo = (prep + post) × tarifa
    const cmo = (prepTime + postTime) * laborRate;

    // Costos Fijos prorrateados
    const fixedProrated = fixedCostMonthly * (fixedCostPercent / 100);

    // Costo de Producción Total
    const cp = cm + ch + cmo;

    // Plus por diseño propio (sobre cp)
    const designPlus = ownDesign ? cp * (designBonus / 100) : 0;

    // Precio base (CP + fijos + diseño)
    const basePrice = cp + fixedProrated + designPlus;

    // Precio con margen
    const priceWithMargin = profitMargin < 100
      ? basePrice / (1 - profitMargin / 100)
      : basePrice;

    // Precio final con IVA
    const priceWithIva = priceWithMargin * (1 + iva / 100);

    return { cm, chElec, ch, cmo, fixedProrated, cp, designPlus, basePrice, priceWithMargin, priceWithIva };
  }, [inputs]);

  // -------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------
  const handleReset = useCallback(() => {
    setInputs(DEFAULT);
    setJobName("");
  }, []);

  const handleSave = useCallback(() => {
    const entry: SavedJob = {
      id: crypto.randomUUID(),
      name: jobName.trim() || `Trabajo ${new Date().toLocaleDateString("es-AR")}`,
      inputs: { ...inputs },
      finalPrice: bd.priceWithIva,
      savedAt: new Date().toISOString(),
    };
    setHistory((prev) => {
      const updated = [entry, ...prev].slice(0, 10);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    setJobName("");
  }, [jobName, inputs, bd]);

  const handleLoad = useCallback((job: SavedJob) => {
    setInputs(job.inputs);
    setJobName(job.name);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((j) => j.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // ====================================================
  // RENDER
  // ====================================================
  return (
    <div className="max-w-7xl mx-auto space-y-8">

      {/* HEADER */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/30 shrink-0">
            <Printer size={28} className="text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tight leading-none">
              Calculadora Impresión 3D
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Motor de costos con fórmulas de material, máquina, mano de obra y operativos.
            </p>
          </div>
        </div>

        {/* Nombre del trabajo */}
        <div className="flex-1 min-w-64 max-w-sm">
          <label htmlFor="job-name" className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
            Nombre del Trabajo
          </label>
          <input
            id="job-name"
            type="text"
            value={jobName}
            onChange={(e) => setJobName(e.target.value)}
            placeholder="Ej: Pieza articulada serie A"
            className="w-full bg-slate-900 border border-slate-700 text-white text-sm font-bold rounded-xl px-4 py-3 outline-none focus:border-violet-500 transition-colors placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* GRID DE INPUTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

        {/* ── 1. MATERIAL ── */}
        <SectionCard
          icon={<span className="text-base" aria-hidden>🧶</span>}
          title="1. Material"
          color="bg-violet-600/20 text-violet-400"
        >
          <Field id="piece-weight"  label="Peso de la pieza"   value={inputs.pieceWeight}  onChange={(v) => set("pieceWeight", v)}  suffix="g" step={1} />
          <Field id="roll-price"    label="Precio del rollo"   value={inputs.rollPrice}    onChange={(v) => set("rollPrice", v)}    prefix="$" />
          <Field id="roll-weight"   label="Peso del rollo"     value={inputs.rollWeight}   onChange={(v) => set("rollWeight", v)}   suffix="g" step={1} hint="default 1000 g" />
          <Field id="waste-factor"  label="Factor de desperdicio" value={inputs.wasteFactor} onChange={(v) => set("wasteFactor", v)} suffix="%" step={1} hint="default 15%" />

          {/* resultado parcial */}
          <div className="mt-1 p-3 bg-violet-600/10 rounded-xl border border-violet-600/20 flex justify-between items-center">
            <span className="text-[10px] font-black text-violet-400 uppercase tracking-wider">C. Material</span>
            <span className="text-sm font-black text-violet-300">{fmt(bd.cm)}</span>
          </div>
        </SectionCard>

        {/* ── 2. MÁQUINA ── */}
        <SectionCard
          icon={<Zap size={16} aria-hidden />}
          title="2. Máquina / Impresión"
          color="bg-amber-600/20 text-amber-400"
        >
          <Field id="print-time"    label="Tiempo de impresión" value={inputs.printTime}   onChange={(v) => set("printTime", v)}   suffix="h" step={0.5} />
          <Field id="machine-power" label="Potencia de la máquina" value={inputs.machinePower} onChange={(v) => set("machinePower", v)} suffix="W" step={10} hint="default 250 W" />
          <Field id="elec-cost"     label="Costo eléctrico"     value={inputs.electricityCost} onChange={(v) => set("electricityCost", v)} prefix="$" suffix="/kWh" hint="por kWh" />
          <Field id="amortization"  label="Amortización"        value={inputs.amortizationPerHour} onChange={(v) => set("amortizationPerHour", v)} prefix="$" suffix="/h" />
          <Field id="maintenance"   label="Mantenimiento"       value={inputs.maintenancePerHour}  onChange={(v) => set("maintenancePerHour", v)} prefix="$" suffix="/h" />

          <div className="mt-1 p-3 bg-amber-600/10 rounded-xl border border-amber-600/20 space-y-1">
            <div className="flex justify-between">
              <span className="text-[9px] font-bold text-amber-600 uppercase">Costo eléctrico/h</span>
              <span className="text-[10px] font-black text-amber-500">{fmt(bd.chElec)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">C. Máquina total</span>
              <span className="text-sm font-black text-amber-300">{fmt(bd.ch)}</span>
            </div>
          </div>
        </SectionCard>

        {/* ── 3. MANO DE OBRA ── */}
        <SectionCard
          icon={<Wrench size={16} aria-hidden />}
          title="3. Mano de Obra"
          color="bg-emerald-600/20 text-emerald-400"
        >
          <Field id="prep-time"   label="Tiempo de preparación"    value={inputs.prepTime}   onChange={(v) => set("prepTime", v)}   suffix="h" step={0.25} hint="Slicer, setup" />
          <Field id="post-time"   label="Tiempo de post-procesado" value={inputs.postTime}   onChange={(v) => set("postTime", v)}   suffix="h" step={0.25} hint="lijado, pintura" />
          <Field id="labor-rate"  label="Tarifa hora hombre"       value={inputs.laborRate}  onChange={(v) => set("laborRate", v)}  prefix="$" suffix="/h" />

          <div className="mt-1 p-3 bg-emerald-600/10 rounded-xl border border-emerald-600/20 flex justify-between items-center">
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">C. Mano de Obra</span>
            <span className="text-sm font-black text-emerald-300">{fmt(bd.cmo)}</span>
          </div>
        </SectionCard>

        {/* ── 4. OPERATIVOS + PRECIO ── */}
        <SectionCard
          icon={<DollarSign size={16} aria-hidden />}
          title="4. Operativos y Precio"
          color="bg-indigo-600/20 text-indigo-400"
        >
          <Field id="fixed-monthly" label="Costos fijos mensuales" value={inputs.fixedCostMonthly} onChange={(v) => set("fixedCostMonthly", v)} prefix="$" hint="total del mes" />
          <Field id="fixed-pct"     label="% asignado a este trabajo" value={inputs.fixedCostPercent} onChange={(v) => set("fixedCostPercent", v)} suffix="%" step={1} />
          <Field id="profit-margin" label="Margen de beneficio" value={inputs.profitMargin} onChange={(v) => set("profitMargin", v)} suffix="%" step={1} />
          <Field id="iva"           label="IVA / Impuesto"      value={inputs.iva}          onChange={(v) => set("iva", v)}          suffix="%" step={1} />

          {/* Toggle Diseño Propio */}
          <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700 space-y-2">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                id="own-design"
                type="checkbox"
                checked={inputs.ownDesign}
                onChange={(e) => set("ownDesign", e.target.checked)}
                className="w-4 h-4 rounded accent-violet-500 cursor-pointer"
              />
              <div>
                <span className="text-xs font-black text-white flex items-center gap-1">
                  <Sparkles size={12} className="text-violet-400" aria-hidden />
                  Diseño Propio
                </span>
                <span className="text-[9px] text-slate-500 font-bold">Aplica plus de valor sobre el costo</span>
              </div>
            </label>
            {inputs.ownDesign && (
              <Field id="design-bonus" label="Plus por diseño" value={inputs.designBonus} onChange={(v) => set("designBonus", v)} suffix="%" step={5} />
            )}
          </div>
        </SectionCard>
      </div>

      {/* PANEL DE RESULTADOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* PRECIO FINAL — número grande */}
        <div className="lg:col-span-1 bg-violet-600 rounded-3xl p-8 text-center shadow-xl shadow-violet-600/30 flex flex-col items-center justify-center gap-3">
          <p className="text-[10px] font-black text-violet-200 uppercase tracking-[0.3em]">Precio de Venta Final</p>
          <p className="text-5xl font-black text-white leading-none" aria-live="polite">
            {fmt(bd.priceWithIva)}
          </p>
          <p className="text-violet-200 text-xs font-bold">incluye IVA ({inputs.iva}%)</p>
          <p className="text-violet-300 text-xs font-bold">
            Sin IVA: <span className="text-white font-black">{fmt(bd.priceWithMargin)}</span>
          </p>
        </div>

        {/* DESGLOSE COMPLETO */}
        <div className="lg:col-span-2 bg-slate-900 rounded-3xl border border-slate-800 p-6">
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-5">Desglose del Cálculo</h2>

          <div className="space-y-0">
            {/* Fórmulas */}
            {[
              { label: "Costo de Material (Cm)",       value: bd.cm,            color: "text-violet-400",  formula: `${inputs.pieceWeight}g × $${(inputs.rollWeight > 0 ? inputs.rollPrice / inputs.rollWeight : 0).toFixed(3)}/g × ${(1 + inputs.wasteFactor / 100).toFixed(2)} (desp.)` },
              { label: "Costo Máquina (Ch)",            value: bd.ch,            color: "text-amber-400",   formula: `${inputs.printTime}h × ($${bd.chElec.toFixed(3)}/h elec. + $${inputs.amortizationPerHour}/h amort. + $${inputs.maintenancePerHour}/h mant.)` },
              { label: "Mano de Obra (Cmo)",            value: bd.cmo,           color: "text-emerald-400", formula: `(${inputs.prepTime}h prep + ${inputs.postTime}h post) × $${inputs.laborRate}/h` },
              { label: "Costos Fijos Prorrateados",     value: bd.fixedProrated, color: "text-blue-400",    formula: `$${inputs.fixedCostMonthly} × ${inputs.fixedCostPercent}%` },
            ].map((row) => (
              <div key={row.label} className="py-3 border-b border-slate-800/60">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="text-xs font-black text-slate-300">{row.label}</p>
                    <p className="text-[10px] text-slate-600 font-bold mt-0.5">{row.formula}</p>
                  </div>
                  <span className={`text-sm font-black shrink-0 ${row.color}`}>{fmt(row.value)}</span>
                </div>
              </div>
            ))}

            {/* CP */}
            <div className="py-3 border-b border-slate-700">
              <div className="flex justify-between items-center">
                <p className="text-xs font-black text-white">Costo de Producción (CP = Cm + Ch + Cmo)</p>
                <span className="text-base font-black text-white">{fmt(bd.cp)}</span>
              </div>
            </div>

            {inputs.ownDesign && (
              <div className="py-3 border-b border-slate-800/60">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Sparkles size={12} className="text-violet-400" aria-hidden />
                    <p className="text-xs font-black text-violet-300">Plus Diseño Propio ({inputs.designBonus}%)</p>
                  </div>
                  <span className="text-sm font-black text-violet-400">+ {fmt(bd.designPlus)}</span>
                </div>
              </div>
            )}

            <div className="py-3 border-b border-slate-800/60">
              <div className="flex justify-between items-center">
                <p className="text-xs font-black text-slate-400">Base antes de margen</p>
                <span className="text-sm font-black text-slate-300">{fmt(bd.basePrice)}</span>
              </div>
            </div>

            <div className="py-3 border-b border-slate-800/60">
              <div className="flex justify-between items-center">
                <p className="text-xs font-black text-indigo-300">Con margen de beneficio ({inputs.profitMargin}%)</p>
                <span className="text-sm font-black text-indigo-400">{fmt(bd.priceWithMargin)}</span>
              </div>
            </div>

            <div className="py-3">
              <div className="flex justify-between items-center">
                <p className="text-xs font-black text-violet-300">Precio final con IVA ({inputs.iva}%)</p>
                <span className="text-base font-black text-violet-300">{fmt(bd.priceWithIva)}</span>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-4 border-t border-slate-800 mt-2">
            <button
              id="btn-save-3d"
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-colors"
            >
              <Save size={14} aria-hidden />
              Guardar
            </button>
            <button
              id="btn-reset-3d"
              onClick={handleReset}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-black text-xs uppercase tracking-widest rounded-xl transition-colors"
            >
              <Trash2 size={14} aria-hidden />
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* HISTORIAL */}
      {history.length > 0 && (
        <section className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
          <button
            id="btn-toggle-history-3d"
            onClick={() => setShowHistory((v) => !v)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Clock size={16} className="text-slate-400" aria-hidden />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Historial de trabajos ({history.length})
              </span>
            </div>
            {showHistory
              ? <ChevronUp size={16} className="text-slate-500" aria-hidden />
              : <ChevronDown size={16} className="text-slate-500" aria-hidden />
            }
          </button>

          {showHistory && (
            <div className="divide-y divide-slate-800">
              {history.map((job) => (
                <div key={job.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-800/30 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white truncate flex items-center gap-2">
                      {job.inputs.ownDesign && <Sparkles size={11} className="text-violet-400 shrink-0" />}
                      {job.name}
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                      {new Date(job.savedAt).toLocaleDateString("es-AR")} · {job.inputs.pieceWeight}g · {job.inputs.printTime}h impresión
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-violet-400">{fmt(job.finalPrice)}</p>
                    <p className="text-[10px] text-slate-500 font-bold">precio c/ IVA</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => handleLoad(job)}
                      className="px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/40 text-violet-400 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors"
                    >
                      Cargar
                    </button>
                    <button
                      onClick={() => handleDelete(job.id)}
                      className="p-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 rounded-lg transition-colors"
                      aria-label="Eliminar trabajo"
                    >
                      <Trash2 size={12} aria-hidden />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
