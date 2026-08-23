import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Zap,
  Wrench,
  DollarSign,
  Save,
  Trash2,
  RotateCcw,
  FileDown,
  AlertTriangle,
  Shirt,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useToastStore } from '../../../store/useToastStore';
import { hoursToTime, formatDate } from '../../../shared/utils/format';
import { useBlankStore } from '../../blanks/store/useBlankStore';
import {
  SectionCard,
  Field,
  FieldSelect,
  TimeField,
  fmt,
  applyRounding,
  loadJSON,
  mergeDefaults,
  ROUNDING_LABELS,
  type RoundingStrategy,
} from '../shared/calcShared';

// ====================================================
// TIPOS
// ====================================================
interface Inputs {
  // Producto base (blank)
  blankCost: number; // $ por pieza (del inventario)
  // Insumos de impresión
  supplyCost: number; // papel transfer + tinta por pieza ($)
  // Prensa (máquina)
  pressTime: number; // horas por pieza
  pressPower: number; // W
  electricityCost: number; // $/kWh
  pressAmortPerHour: number; // $/h
  // Mano de obra
  prepTime: number; // h por pieza
  postTime: number; // h por pieza
  laborRate: number; // $/h
  // Operativos
  fixedCostMonthly: number; // $
  fixedCostPercent: number; // %
  // Lote
  quantity: number;
  // Precio
  profitMargin: number; // %
  iva: number; // %
  designBonus: number; // % plus por diseño propio
  ownDesign: boolean;
  rounding: RoundingStrategy;
}

interface Breakdown {
  cBase: number;
  cSupply: number;
  chElec: number;
  ch: number;
  cmo: number;
  cp: number;
  cpTotal: number;
  fixedProrated: number;
  designPlus: number;
  basePriceTotal: number;
  priceWithMarginTotal: number;
  priceWithIvaTotal: number;
  roundedTotal: number;
  roundedUnit: number;
}

const DEFAULT: Inputs = {
  blankCost: 0,
  supplyCost: 0,
  pressTime: 0,
  pressPower: 1200,
  electricityCost: 160,
  pressAmortPerHour: 0,
  prepTime: 0,
  postTime: 0,
  laborRate: 0,
  fixedCostMonthly: 0,
  fixedCostPercent: 0,
  quantity: 1,
  profitMargin: 30,
  iva: 21,
  designBonus: 20,
  ownDesign: false,
  rounding: 'exact',
};

const DEFAULTABLE_KEYS = [
  'pressPower',
  'electricityCost',
  'pressAmortPerHour',
  'laborRate',
  'fixedCostMonthly',
  'profitMargin',
  'iva',
  'designBonus',
] as const;

const SKIP_ZERO_KEYS = [
  'electricityCost',
  'pressPower',
  'laborRate',
  'profitMargin',
  'iva',
  'fixedCostMonthly',
  'designBonus',
];

const HISTORY_KEY = 'raices-subli3d-history';
const DEFAULTS_KEY = 'raices-subli3d-defaults';
const LAST_BLANK_KEY = 'raices-subli3d-lastblank';

interface SavedJob {
  id: string;
  name: string;
  inputs: Inputs;
  finalPriceTotal: number;
  finalPriceUnit: number;
  savedAt: string;
}

// ====================================================
// COMPONENTE PRINCIPAL
// ====================================================
export const SublimationCalculator = () => {
  const toast = useToastStore((s) => s.toast);
  const [searchParams] = useSearchParams();

  const [inputs, setInputs] = useState<Inputs>(() => {
    const base = mergeDefaults(DEFAULT, DEFAULTS_KEY, DEFAULTABLE_KEYS, SKIP_ZERO_KEYS);
    const c = parseFloat(searchParams.get('blankCost') ?? '');
    return {
      ...base,
      blankCost: Number.isFinite(c) && c > 0 ? c : base.blankCost,
      supplyCost: base.supplyCost,
    };
  });
  const [jobName, setJobName] = useState(() => searchParams.get('name') ?? '');
  const [history, setHistory] = useState<SavedJob[]>(() => loadJSON<SavedJob[]>(HISTORY_KEY) ?? []);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedBlankId, setSelectedBlankId] = useState<string>('');

  const { blanks: stockBlanks, fetchBlanks } = useBlankStore();

  useEffect(() => {
    void fetchBlanks();
  }, [fetchBlanks]);

  const handleBlankPick = useCallback(
    (id: string) => {
      setSelectedBlankId(id);
      localStorage.setItem(LAST_BLANK_KEY, id);
      const b = useBlankStore.getState().blanks.find((x) => x.id === id);
      if (!b) return;
      setInputs((prev) => ({ ...prev, blankCost: b.cost_price || prev.blankCost }));
    },
    [],
  );

  // Auto-selección del blank: último usado (o el único del inventario)
  const autoBlankDone = useRef(false);
  useEffect(() => {
    const run = async () => {
      if (autoBlankDone.current || stockBlanks.length === 0) return;
      autoBlankDone.current = true;
      const savedId = localStorage.getItem(LAST_BLANK_KEY);
      const saved = savedId ? stockBlanks.find((x) => x.id === savedId) : undefined;
      const pick = saved ?? (stockBlanks.length === 1 ? stockBlanks[0] : undefined);
      if (pick) handleBlankPick(pick.id);
    };
    void run();
  }, [stockBlanks, handleBlankPick]);

  const set = useCallback(
    <K extends keyof Inputs>(key: K, value: Inputs[K]) =>
      setInputs((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const bd = useMemo<Breakdown>(() => {
    const {
      blankCost, supplyCost, pressTime, pressPower, electricityCost, pressAmortPerHour,
      prepTime, postTime, laborRate, fixedCostMonthly, fixedCostPercent,
      profitMargin, iva, designBonus, ownDesign, quantity, rounding,
    } = inputs;

    const qty = Math.max(1, quantity || 1);

    const cBase = blankCost;
    const cSupply = supplyCost;
    const chElec = (pressPower / 1000) * electricityCost * pressTime;
    const ch = chElec + pressAmortPerHour * pressTime;
    const cmo = (prepTime + postTime) * laborRate;

    const cp = cBase + cSupply + ch + cmo;
    const cpTotal = cp * qty;

    const fixedProrated = fixedCostMonthly * (fixedCostPercent / 100);
    const designPlus = ownDesign ? cpTotal * (designBonus / 100) : 0;

    const basePriceTotal = cpTotal + fixedProrated + designPlus;
    const priceWithMarginTotal =
      profitMargin < 100 ? basePriceTotal / (1 - profitMargin / 100) : basePriceTotal;
    const priceWithIvaTotal = priceWithMarginTotal * (1 + iva / 100);
    const roundedTotal = applyRounding(priceWithIvaTotal, rounding);
    const roundedUnit = qty > 0 ? roundedTotal / qty : 0;

    return {
      cBase, cSupply, chElec, ch, cmo, cp, cpTotal, fixedProrated, designPlus,
      basePriceTotal, priceWithMarginTotal, priceWithIvaTotal, roundedTotal, roundedUnit,
    };
  }, [inputs]);

  const warnings = useMemo<string[]>(() => {
    const list: string[] = [];
    const { profitMargin, blankCost, quantity, rounding } = inputs;
    if (profitMargin >= 100) list.push('El margen de beneficio debe ser menor a 100%.');
    if (profitMargin > 80 && profitMargin < 100) list.push('El margen es muy alto (>80%). Verificá que sea intencional.');
    if (blankCost <= 0) list.push('Falta el producto base: elegí un blank del inventario (o cargá su costo).');
    if (inputs.electricityCost <= 0) list.push('El costo eléctrico está en $0 — revisalo si el precio te da bajo.');
    if (quantity < 1) list.push('La cantidad de piezas debe ser al menos 1.');
    if (rounding === '990' || rounding === '999' || rounding === '900')
      list.push('El redondeo psicológico baja levemente el precio final.');
    return list;
  }, [inputs]);

  const hasCriticalWarnings = warnings.some((w) => w.includes('100') && w.includes('margen'));

  const handleReset = useCallback(() => {
    setInputs(mergeDefaults(DEFAULT, DEFAULTS_KEY, DEFAULTABLE_KEYS, SKIP_ZERO_KEYS));
    setSelectedBlankId('');
    setJobName('');
  }, []);

  const handleSaveDefaults = useCallback(() => {
    const toSave: Partial<Inputs> = {};
    for (const k of DEFAULTABLE_KEYS) {
      (toSave as Record<string, unknown>)[k] = inputs[k];
    }
    localStorage.setItem(DEFAULTS_KEY, JSON.stringify(toSave));
    toast('Valores guardados como predeterminados', { type: 'success' });
  }, [inputs, toast]);

  const handleSaveHistory = useCallback(() => {
    const job: SavedJob = {
      id: crypto.randomUUID(),
      name: jobName.trim() || `Presupuesto ${new Date().toLocaleDateString('es-AR')}`,
      inputs: { ...inputs },
      finalPriceTotal: bd.roundedTotal,
      finalPriceUnit: bd.roundedUnit,
      savedAt: new Date().toISOString(),
    };
    const next = [job, ...history].slice(0, 50);
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    toast('Presupuesto guardado en el historial', { type: 'success' });
  }, [bd.roundedTotal, bd.roundedUnit, history, inputs, jobName, toast]);

  const handleExportPDF = useCallback(() => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFontSize(16);
    doc.text('Presupuesto de Sublimación', 40, 50);
    doc.setFontSize(10);
    doc.text(`Trabajo: ${jobName.trim() || '(sin nombre)'}`, 40, 70);
    doc.text(`Fecha: ${new Date().toLocaleString('es-AR')}`, 40, 86);
    doc.text(`Producto base: ${fmt(inputs.blankCost)}`, 40, 120);
    doc.text(`Insumos (papel+tinta): ${fmt(inputs.supplyCost)}`, 40, 136);
    doc.text(`Tiempo de prensa: ${hoursToTime(inputs.pressTime)}`, 40, 152);
    doc.text(`Costo máquina: ${fmt(bd.ch)}`, 40, 168);
    doc.text(`Mano de obra: ${fmt(bd.cmo)}`, 40, 184);
    doc.text(`Costo producción/u: ${fmt(bd.cp)}`, 40, 210);
    doc.text(`Lote (${inputs.quantity}x): ${fmt(bd.cpTotal)}`, 40, 226);
    doc.text(`Precio final: ${fmt(bd.roundedTotal)}`, 40, 252);
    doc.save(`presupuesto-sublimacion-${Date.now()}.pdf`);
  }, [bd, inputs, jobName]);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-600/30 shrink-0">
              <Shirt size={24} className="text-white" aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">Calculadora de Sublimación</h1>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                Producto base + insumos + prensa + margen
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-widest">
              <RotateCcw size={12} /> Reset
            </button>
            <button onClick={handleSaveDefaults} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-widest">
              <Save size={12} /> Predeterminado
            </button>
          </div>
        </div>

        {warnings.length > 0 && (
          <div className={`p-4 rounded-2xl border ${hasCriticalWarnings ? 'bg-rose-900/30 border-rose-700' : 'bg-amber-900/20 border-amber-700'} space-y-1`}>
            {warnings.map((w) => (
              <p key={w} className={`text-[11px] font-bold flex items-center gap-2 ${hasCriticalWarnings ? 'text-rose-300' : 'text-amber-300'}`}>
                <AlertTriangle size={12} className="shrink-0" /> {w}
              </p>
            ))}
          </div>
        )}

        <SectionCard icon={<Shirt size={16} aria-hidden />} title="1. Producto base (Blank)" color="bg-orange-600/20 text-orange-400">
          <FieldSelect
            id="blank-select"
            label="Producto del inventario"
            value={selectedBlankId}
            onChange={handleBlankPick}
            options={[
              { value: '', label: '— Seleccionar blank —' },
              ...stockBlanks.map((b) => ({
                value: b.id,
                label: `${b.name}${b.type ? ` · ${b.type}` : ''}${b.size ? ` ${b.size}` : ''} · ${fmt(b.cost_price)}`,
              })),
            ]}
          />
          {(() => {
            const b = stockBlanks.find((x) => x.id === selectedBlankId);
            if (!b) return null;
            return (
              <div className="p-3 bg-orange-600/10 rounded-xl border border-orange-600/20 text-[10px] font-bold text-slate-400 space-y-1">
                <p className="flex justify-between"><span>Costo del producto:</span><span className="text-orange-300">{fmt(b.cost_price)}</span></p>
                <p className="flex justify-between"><span>Stock:</span><span className={b.stock_qty <= b.min_stock ? 'text-rose-400' : 'text-slate-200'}>{b.stock_qty} u</span></p>
              </div>
            );
          })()}
          <Field id="blank-cost" label="Costo del producto base" value={inputs.blankCost} onChange={(v) => set('blankCost', v)} prefix="$" />
          <Field id="supply-cost" label="Insumos (papel transfer + tinta)" value={inputs.supplyCost} onChange={(v) => set('supplyCost', v)} prefix="$" hint="por pieza" />
        </SectionCard>

        <SectionCard icon={<Zap size={16} aria-hidden />} title="2. Prensa / Impresión" color="bg-amber-600/20 text-amber-400">
          <TimeField id="press-time" label="Tiempo de prensa por pieza" value={inputs.pressTime} onChange={(v) => set('pressTime', v)} hint="HH:MM" />
          <Field id="press-power" label="Potencia de la prensa" value={inputs.pressPower} onChange={(v) => set('pressPower', v)} suffix="W" step={10} />
          <Field id="elec-cost" label="Costo eléctrico" value={inputs.electricityCost} onChange={(v) => set('electricityCost', v)} prefix="$" suffix="/kWh" />
          <Field id="press-amort" label="Amortización prensa" value={inputs.pressAmortPerHour} onChange={(v) => set('pressAmortPerHour', v)} prefix="$" suffix="/h" />
          <div className="mt-1 p-3 bg-amber-600/10 rounded-xl border border-amber-600/20 space-y-1">
            <div className="flex justify-between">
              <span className="text-[9px] font-bold text-amber-600 uppercase">Costo eléctrico/h</span>
              <span className="text-[10px] font-black text-amber-500">{fmt(bd.chElec)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">C. Máquina / pieza</span>
              <span className="text-sm font-black text-amber-300">{fmt(bd.ch)}</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={<Wrench size={16} aria-hidden />} title="3. Mano de Obra" color="bg-violet-600/20 text-violet-400">
          <TimeField id="prep-time" label="Preparación por pieza" value={inputs.prepTime} onChange={(v) => set('prepTime', v)} hint="HH:MM" />
          <TimeField id="post-time" label="Terminación por pieza" value={inputs.postTime} onChange={(v) => set('postTime', v)} hint="HH:MM" />
          <Field id="labor-rate" label="Valor hora de mano de obra" value={inputs.laborRate} onChange={(v) => set('laborRate', v)} prefix="$" suffix="/h" />
        </SectionCard>

        <SectionCard icon={<DollarSign size={16} aria-hidden />} title="4. Precio y Lote" color="bg-emerald-600/20 text-emerald-400">
          <div className="grid grid-cols-2 gap-4">
            <Field id="quantity" label="Cantidad de piezas" value={inputs.quantity} onChange={(v) => set('quantity', v)} step={1} />
            <Field id="profit-margin" label="Margen de beneficio" value={inputs.profitMargin} onChange={(v) => set('profitMargin', v)} suffix="%" step={1} />
          </div>
          <Field id="iva" label="IVA" value={inputs.iva} onChange={(v) => set('iva', v)} suffix="%" step={1} />
          <Field id="fixed-cost" label="Costos fijos mensuales" value={inputs.fixedCostMonthly} onChange={(v) => set('fixedCostMonthly', v)} prefix="$" />
          <Field id="fixed-percent" label="% costos fijos al proyecto" value={inputs.fixedCostPercent} onChange={(v) => set('fixedCostPercent', v)} suffix="%" step={1} />
          <label className="flex items-center gap-2 text-[11px] font-bold text-slate-300">
            <input type="checkbox" checked={inputs.ownDesign} onChange={(e) => set('ownDesign', e.target.checked)} />
            Diseño propio (plus {inputs.designBonus}%)
          </label>
          <Field id="design-bonus" label="Plus por diseño propio" value={inputs.designBonus} onChange={(v) => set('designBonus', v)} suffix="%" step={1} />
          <FieldSelect
            id="rounding"
            label="Redondeo"
            value={inputs.rounding}
            onChange={(v) => set('rounding', v as RoundingStrategy)}
            options={Object.entries(ROUNDING_LABELS).map(([k, l]) => ({ value: k, label: l }))}
          />
        </SectionCard>

        {/* RESULTADO */}
        <div className="bg-gradient-to-br from-orange-600/20 to-slate-900 rounded-3xl border border-orange-500/30 p-6 space-y-2">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Precio final del lote</p>
              <p className="text-4xl font-black text-white leading-none mt-1">{fmt(bd.roundedTotal)}</p>
              <p className="text-[11px] text-slate-400 font-bold mt-1">Unidad: {fmt(bd.roundedUnit)} · {inputs.quantity} piezas</p>
            </div>
            <div className="text-right text-[11px] text-slate-300 space-y-0.5">
              <p>Base: {fmt(bd.cBase)}</p>
              <p>Insumos: {fmt(bd.cSupply)}</p>
              <p>Máquina: {fmt(bd.ch)}</p>
              <p>Mano de obra: {fmt(bd.cmo)}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <input
            value={jobName}
            onChange={(e) => setJobName(e.target.value)}
            placeholder="Nombre del presupuesto"
            className="flex-1 min-w-[200px] bg-slate-950 border border-slate-700 text-white text-sm font-black rounded-xl py-3 px-4 outline-none focus:border-orange-500"
          />
          <button onClick={handleSaveHistory} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-black uppercase tracking-widest">
            <Save size={12} /> Guardar
          </button>
          <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest">
            <FileDown size={12} /> PDF
          </button>
        </div>

        <button onClick={() => setShowHistory((s) => !s)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest underline">
          {showHistory ? 'Ocultar' : 'Ver'} historial ({history.length})
        </button>
        {showHistory && (
          <div className="space-y-2">
            {history.length === 0 && <p className="text-[11px] text-slate-500">Sin presupuestos guardados.</p>}
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-200 truncate">{h.name}</p>
                  <p className="text-[10px] text-slate-400">{formatDate(h.savedAt)} · {h.inputs.quantity}× · {fmt(h.finalPriceUnit)} u</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => { setInputs(h.inputs); setJobName(h.name); }} className="px-3 py-1.5 rounded-lg bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 text-[10px] font-black">Cargar</button>
                  <button onClick={() => setHistory((prev) => { const n = prev.filter((x) => x.id !== h.id); localStorage.setItem(HISTORY_KEY, JSON.stringify(n)); return n; })} className="p-1.5 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 text-rose-400">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
