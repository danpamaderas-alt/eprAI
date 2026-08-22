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
  FileDown,
  Settings2,
  RotateCcw,
  Pencil,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { useToastStore } from "../../../store/useToastStore";

// ====================================================
// PRESETS DE IMPRESORAS
// ====================================================
interface PrinterPreset {
  id: string;
  name: string;
  power: number;        // W
  buildVolume: string;  // mm
  maxTemp: number;      // °C
  speed: string;        // mm/s
  layer: string;        // mm recomendado
  notes?: string;
}

const PRINTERS: PrinterPreset[] = [
  { id: "custom",  name: "Personalizada", power: 250, buildVolume: "—", maxTemp: 260, speed: "—", layer: "—", notes: "Ingresá la potencia manualmente" },
  { id: "ender3v1", name: "Creality Ender 3 v1", power: 250, buildVolume: "220×220×250", maxTemp: 260, speed: "50", layer: "0.2", notes: "Estándar de entrada" },
  { id: "ender3v2", name: "Creality Ender 3 V2", power: 250, buildVolume: "220×220×250", maxTemp: 260, speed: "50", layer: "0.2", notes: "Con pantalla y mejor base" },
  { id: "ender3s1", name: "Creality Ender 3 S1", power: 250, buildVolume: "220×220×270", maxTemp: 260, speed: "80", layer: "0.2", notes: "Extrusor directo" },
  { id: "ender3v3se", name: "Creality Ender 3 V3 SE", power: 350, buildVolume: "220×220×250", maxTemp: 260, speed: "180", layer: "0.2", notes: "Auto-levelling" },
  { id: "ender5plus", name: "Creality Ender 5 Plus", power: 500, buildVolume: "350×350×400", maxTemp: 260, speed: "80", layer: "0.2", notes: "Volumen grande" },
  { id: "ender5s1", name: "Creality Ender 5 S1", power: 500, buildVolume: "220×220×280", maxTemp: 260, speed: "80", layer: "0.2", notes: "Volumen medio-grande" },
  { id: "cr10", name: "Creality CR-10", power: 300, buildVolume: "300×300×400", maxTemp: 250, speed: "50", layer: "0.2", notes: "Clásico de gran volumen" },
  { id: "k1", name: "Creality K1", power: 480, buildVolume: "220×220×250", maxTemp: 300, speed: "600", layer: "0.2", notes: "CoreXY rápido" },
];

// ====================================================
// TIPOS
// ====================================================
type RoundingStrategy = "exact" | "990" | "999" | "900" | "hundred";

interface Inputs {
  printerModel: string;
  // Material
  pieceWeight: number;      // g
  rollPrice: number;        // $
  rollWeight: number;       // g (default 1000)
  wasteFactor: number;      // % (default 15)
  // Máquina
  printTime: number;        // horas por pieza
  machinePower: number;     // W (default 250)
  electricityCost: number;  // $/kWh
  amortizationPerHour: number; // $/h
  maintenancePerHour: number;  // $/h
  // Mano de obra
  prepTime: number;         // h por pieza
  postTime: number;         // h por pieza
  laborRate: number;        // $/h
  // Operativos
  fixedCostMonthly: number; // $
  fixedCostPercent: number; // % asignado al proyecto
  // Lote
  quantity: number;         // piezas del lote
  // Precio
  profitMargin: number;     // %
  iva: number;              // %
  designBonus: number;      // % plus por diseño propio
  ownDesign: boolean;
  rounding: RoundingStrategy;
}

interface SavedJob {
  id: string;
  name: string;
  inputs: Inputs;
  finalPriceTotal: number;
  finalPriceUnit: number;
  savedAt: string;
}

interface Breakdown {
  cm: number;          // Costo material por unidad
  chElec: number;      // Costo eléctrico $/h
  ch: number;          // Costo máquina por unidad
  cmo: number;         // Costo mano de obra por unidad
  cp: number;          // Costo producción por unidad
  cpTotal: number;     // Costo producción del lote
  fixedProrated: number;
  designPlus: number;
  basePriceTotal: number;
  priceWithMarginTotal: number;
  priceWithIvaTotal: number;
  roundedTotal: number;
  roundedUnit: number;
}

// ====================================================
// DEFAULTS
// ====================================================
const DEFAULT: Inputs = {
  printerModel: "ender3v1",
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
  quantity: 1,
  profitMargin: 30,
  iva: 21,
  designBonus: 20,
  ownDesign: false,
  rounding: "exact",
};

// Campos que se persisten como "predeterminados"
const DEFAULTABLE_KEYS = [
  "machinePower",
  "electricityCost",
  "amortizationPerHour",
  "maintenancePerHour",
  "laborRate",
  "fixedCostMonthly",
  "profitMargin",
  "iva",
  "wasteFactor",
] as const;

const HISTORY_KEY = "raices-print3d-history";
const DEFAULTS_KEY = "raices-print3d-defaults";

// ====================================================
// HELPERS
// ====================================================
const fmt = (n: number, decimals = 2) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);

const applyRounding = (v: number, strategy: RoundingStrategy): number => {
  if (v <= 0) return 0;
  switch (strategy) {
    case "exact":
      return Math.round(v * 100) / 100;
    case "990":
      return Math.max(0.99, Math.floor(v) + 0.99);
    case "999":
      return Math.max(0.999, Math.floor(v) + 0.999);
    case "900":
      return Math.max(0.9, Math.floor(v) + 0.9);
    case "hundred":
      return Math.ceil(v / 100) * 100;
    default:
      return Math.round(v * 100) / 100;
  }
};

const loadJSON = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const mergeDefaults = (base: Inputs): Inputs => {
  const stored = loadJSON<Partial<Inputs>>(DEFAULTS_KEY);
  if (!stored) return base;
  const merged = { ...base };
  for (const k of DEFAULTABLE_KEYS) {
    const v = stored[k];
    if (typeof v === "number" && isFinite(v)) (merged as Record<string, unknown>)[k] = v;
  }
  return merged;
};

const ROUNDING_LABELS: Record<RoundingStrategy, string> = {
  exact: "Exacto",
  "990": "Terminar en .990",
  "999": "Terminar en .999",
  "900": "Terminar en .900",
  hundred: "Redondear a centena",
};

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
// SUB-COMPONENTE: SELECT
// ====================================================
const FieldSelect = ({
  id,
  label,
  value,
  onChange,
  options,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}) => (
  <div className="space-y-1">
    <label htmlFor={id} className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
      {label}
      {hint && <span className="normal-case ml-1 text-slate-600">({hint})</span>}
    </label>
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-slate-950 border border-slate-700 text-white text-sm font-black rounded-xl py-3 pl-4 pr-10 outline-none focus:border-indigo-500 transition-colors appearance-none cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
);

// ====================================================
// COMPONENTE PRINCIPAL
// ====================================================
export const Print3DCalculator = () => {
  const toast = useToastStore((s) => s.toast);
  const [inputs, setInputs] = useState<Inputs>(() => mergeDefaults(DEFAULT));
  const [jobName, setJobName] = useState("");
  const [history, setHistory] = useState<SavedJob[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadJSON<SavedJob[]>(HISTORY_KEY);
    if (saved) setHistory(saved);
  }, []);

  const set = useCallback(
    <K extends keyof Inputs>(key: K, value: Inputs[K]) =>
      setInputs((prev) => ({ ...prev, [key]: value })),
    []
  );

  // -------------------------------------------------------
  // PRINTER PRESET
  // -------------------------------------------------------
  const printer = useMemo(
    () => PRINTERS.find((p) => p.id === inputs.printerModel) ?? PRINTERS[0],
    [inputs.printerModel]
  );

  const handlePrinterChange = useCallback(
    (id: string) => {
      const preset = PRINTERS.find((p) => p.id === id);
      setInputs((prev) => ({
        ...prev,
        printerModel: id,
        machinePower: preset ? preset.power : prev.machinePower,
      }));
    },
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
            profitMargin, iva, designBonus, ownDesign, quantity, rounding } = inputs;

    const qty = Math.max(1, quantity || 1);

    // Costo Material por unidad
    const pricePerGram = rollWeight > 0 ? rollPrice / rollWeight : 0;
    const cm = pieceWeight * pricePerGram * (1 + wasteFactor / 100);

    // Costo Máquina por unidad
    const chElec = (machinePower / 1000) * electricityCost; // $/h
    const ch = printTime * (chElec + amortizationPerHour + maintenancePerHour);

    // Costo Mano de Obra por unidad
    const cmo = (prepTime + postTime) * laborRate;

    // Costo de Producción por unidad y del lote
    const cp = cm + ch + cmo;
    const cpTotal = cp * qty;

    // Costos fijos (una vez por proyecto)
    const fixedProrated = fixedCostMonthly * (fixedCostPercent / 100);

    // Plus por diseño propio (una vez por proyecto)
    const designPlus = ownDesign ? cpTotal * (designBonus / 100) : 0;

    // Base total del lote
    const basePriceTotal = cpTotal + fixedProrated + designPlus;

    // Con margen
    const priceWithMarginTotal = profitMargin < 100
      ? basePriceTotal / (1 - profitMargin / 100)
      : basePriceTotal;

    // Con IVA
    const priceWithIvaTotal = priceWithMarginTotal * (1 + iva / 100);

    // Redondeo aplicado al total
    const roundedTotal = applyRounding(priceWithIvaTotal, rounding);
    const roundedUnit = qty > 0 ? roundedTotal / qty : 0;

    return {
      cm, chElec, ch, cmo, cp, cpTotal, fixedProrated, designPlus,
      basePriceTotal, priceWithMarginTotal, priceWithIvaTotal, roundedTotal, roundedUnit,
    };
  }, [inputs]);

  // -------------------------------------------------------
  // VALIDACIONES / ADVERTENCIAS
  // -------------------------------------------------------
  const warnings = useMemo<string[]>(() => {
    const list: string[] = [];
    const { profitMargin, rollWeight, pieceWeight, printTime, quantity, wasteFactor, rounding } = inputs;
    if (profitMargin >= 100) list.push("El margen de beneficio debe ser menor a 100%.");
    if (profitMargin > 80 && profitMargin < 100) list.push("El margen es muy alto (>80%). Verificá que sea intencional.");
    if (rollWeight <= 0) list.push("El peso del rollo debe ser mayor a 0 para calcular el material.");
    if (pieceWeight <= 0) list.push("Falta el peso de la pieza.");
    if (printTime <= 0) list.push("Falta el tiempo de impresión.");
    if (quantity < 1) list.push("La cantidad de piezas debe ser al menos 1.");
    if (wasteFactor >= 100) list.push("El factor de desperdicio debe ser menor a 100%.");
    if (inputs.ownDesign && inputs.designBonus <= 0) list.push("El plus por diseño propio debería ser mayor a 0.");
    if (rounding === "990" || rounding === "999" || rounding === "900") list.push("El redondeo psicológico baja levemente el precio final.");
    return list;
  }, [inputs]);

  const hasCriticalWarnings = warnings.some((w) => w.includes("100") && w.includes("margen"));

  // -------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------
  const handleReset = useCallback(() => {
    setInputs(DEFAULT);
    setJobName("");
    setEditingId(null);
  }, []);

  const handleSave = useCallback(() => {
    const qty = Math.max(1, inputs.quantity || 1);
    const entry: SavedJob = {
      id: editingId ?? crypto.randomUUID(),
      name: jobName.trim() || `Trabajo ${new Date().toLocaleDateString("es-AR")}`,
      inputs: { ...inputs, quantity: qty },
      finalPriceTotal: bd.roundedTotal,
      finalPriceUnit: bd.roundedUnit,
      savedAt: editingId
        ? history.find((j) => j.id === editingId)?.savedAt ?? new Date().toISOString()
        : new Date().toISOString(),
    };

    setHistory((prev) => {
      const existing = editingId ? prev.filter((j) => j.id !== editingId) : prev;
      const updated = [entry, ...existing].slice(0, 10);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });

    toast(editingId ? "Trabajo actualizado" : "Trabajo guardado en el historial", { type: "success" });
    setJobName("");
    setEditingId(null);
  }, [jobName, inputs, bd, editingId, history, toast]);

  const handleLoad = useCallback((job: SavedJob) => {
    setInputs((prev) => mergeDefaults({ ...DEFAULT, ...job.inputs, printerModel: job.inputs.printerModel || prev.printerModel }));
    setJobName(job.name);
    setEditingId(job.id);
    setShowHistory(false);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      setHistory((prev) => {
        const updated = prev.filter((j) => j.id !== id);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
        return updated;
      });
      if (editingId === id) setEditingId(null);
      toast("Trabajo eliminado", { type: "info" });
    },
    [editingId, toast]
  );

  const handleSaveDefaults = useCallback(() => {
    const toStore: Partial<Record<(typeof DEFAULTABLE_KEYS)[number], number>> = {};
    for (const k of DEFAULTABLE_KEYS) {
      const v = inputs[k];
      if (typeof v === "number" && isFinite(v)) toStore[k] = v;
    }
    localStorage.setItem(DEFAULTS_KEY, JSON.stringify(toStore));
    toast("Valores guardados como predeterminados", { type: "success" });
  }, [inputs, toast]);

  const handleRestoreDefaults = useCallback(() => {
    localStorage.removeItem(DEFAULTS_KEY);
    setInputs((prev) => ({ ...DEFAULT, printerModel: prev.printerModel }));
    toast("Predeterminados restaurados", { type: "info" });
  }, [toast]);

  // -------------------------------------------------------
  // EXPORTAR PDF
  // -------------------------------------------------------
  const handleExportPDF = useCallback(async () => {
    const [{ default: JsPDF }, { autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new JsPDF();
    const primary: [number, number, number] = [124, 58, 237];

    doc.setFillColor(...primary);
    doc.rect(0, 0, 210, 34, "F");
    doc.setFontSize(18);
    doc.setTextColor(255);
    doc.text("Presupuesto - Impresión 3D", 14, 14);
    doc.setFontSize(10);
    doc.text(`Emitido: ${new Date().toLocaleString("es-AR")}`, 14, 22);
    doc.text(`Trabajo: ${jobName.trim() || "(sin nombre)"}`, 14, 29);

    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text("Datos del trabajo", 14, 44);
    doc.setFontSize(9);
    doc.text(`Impresora: ${printer.name} (potencia ${printer.power}W)`, 14, 51);
    doc.text(`Cantidad de piezas: ${Math.max(1, inputs.quantity || 1)}`, 14, 57);
    doc.text(`Peso por pieza: ${inputs.pieceWeight} g · Desperdicio: ${inputs.wasteFactor}%`, 14, 63);

    autoTable(doc, {
      startY: 70,
      head: [["Concepto", "Valor"]],
      body: [
        ["Costo Material (por unidad)", fmt(bd.cm)],
        ["Costo Máquina (por unidad)", fmt(bd.ch)],
        ["Mano de Obra (por unidad)", fmt(bd.cmo)],
        ["Costo Producción (por unidad)", fmt(bd.cp)],
        ["Costo Producción del lote", fmt(bd.cpTotal)],
        ["Costos fijos prorrateados", fmt(bd.fixedProrated)],
        ...(inputs.ownDesign ? [["Plus diseño propio", fmt(bd.designPlus)]] : []),
        ["Base antes de margen", fmt(bd.basePriceTotal)],
        [`Precio con margen (${inputs.profitMargin}%)`, fmt(bd.priceWithMarginTotal)],
        [`Precio con IVA (${inputs.iva}%)`, fmt(bd.priceWithIvaTotal)],
        [`Redondeo: ${ROUNDING_LABELS[inputs.rounding]}`, fmt(bd.roundedTotal)],
      ],
      theme: "grid",
      headStyles: { fillColor: primary, textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 9 },
      columnStyles: { 1: { halign: "right" } },
    });

    const y = (doc as InstanceType<typeof JsPDF> & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 70;

    doc.setFillColor(230, 230, 255);
    doc.roundedRect(14, y + 10, 182, 16, 3, 3, "F");
    doc.setFontSize(12);
    doc.setTextColor(...primary);
    doc.text(`Precio total: ${fmt(bd.roundedTotal)}`, 20, y + 20);
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Precio por unidad: ${fmt(bd.roundedUnit)} (lote de ${Math.max(1, inputs.quantity || 1)} piezas)`, 20, y + 28);

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Validez del presupuesto: 15 días. Precios sujetos a modificacion sin previo aviso.", 14, 288);

    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    toast("PDF generado", { type: "success" });
  }, [bd, inputs, jobName, printer, toast]);

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
              Motor de costos con material, máquina, mano de obra, lote, redondeo y presets de impresora.
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

      {/* Indicador de edición */}
      {editingId && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
          <Pencil size={14} className="text-amber-400 shrink-0" aria-hidden />
          <p className="text-xs font-black text-amber-300">
            Editando: {jobName.trim() || "trabajo sin nombre"}
          </p>
          <button
            onClick={() => { setEditingId(null); setJobName(""); }}
            className="ml-auto text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-white transition-colors"
          >
            Cancelar edición
          </button>
        </div>
      )}

      {/* Advertencias */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 px-4 py-3 rounded-2xl border ${
                i === 0 && hasCriticalWarnings
                  ? "bg-rose-500/10 border-rose-500/30"
                  : "bg-amber-500/10 border-amber-500/30"
              }`}
            >
              <AlertTriangle size={14} className={`shrink-0 mt-0.5 ${i === 0 && hasCriticalWarnings ? "text-rose-400" : "text-amber-400"}`} aria-hidden />
              <p className={`text-xs font-bold ${i === 0 && hasCriticalWarnings ? "text-rose-300" : "text-amber-300"}`}>{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* GRID DE INPUTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

        {/* ── 1. IMPRESORA + MATERIAL ── */}
        <SectionCard
          icon={<span className="text-base" aria-hidden>🧶</span>}
          title="1. Impresora y Material"
          color="bg-violet-600/20 text-violet-400"
        >
          <FieldSelect
            id="printer-model"
            label="Modelo de impresora"
            value={inputs.printerModel}
            onChange={handlePrinterChange}
            options={PRINTERS.map((p) => ({ value: p.id, label: p.name }))}
          />
          {printer.id !== "custom" && (
            <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700 text-[10px] font-bold text-slate-400 space-y-1">
              <p className="flex justify-between"><span>Volumen:</span><span className="text-slate-200">{printer.buildVolume} mm</span></p>
              <p className="flex justify-between"><span>Temp. máx.:</span><span className="text-slate-200">{printer.maxTemp}°C</span></p>
              <p className="flex justify-between"><span>Velocidad:</span><span className="text-slate-200">{printer.speed} mm/s</span></p>
              <p className="flex justify-between"><span>Capa:</span><span className="text-slate-200">{printer.layer} mm</span></p>
            </div>
          )}

          <Field id="piece-weight"  label="Peso de la pieza"   value={inputs.pieceWeight}  onChange={(v) => set("pieceWeight", v)}  suffix="g" step={1} />
          <Field id="roll-price"    label="Precio del rollo"   value={inputs.rollPrice}    onChange={(v) => set("rollPrice", v)}    prefix="$" />
          <Field id="roll-weight"   label="Peso del rollo"     value={inputs.rollWeight}   onChange={(v) => set("rollWeight", v)}   suffix="g" step={1} hint="default 1000 g" />
          <Field id="waste-factor"  label="Factor de desperdicio" value={inputs.wasteFactor} onChange={(v) => set("wasteFactor", v)} suffix="%" step={1} hint="default 15%" />

          <div className="mt-1 p-3 bg-violet-600/10 rounded-xl border border-violet-600/20 flex justify-between items-center">
            <span className="text-[10px] font-black text-violet-400 uppercase tracking-wider">C. Material / pieza</span>
            <span className="text-sm font-black text-violet-300">{fmt(bd.cm)}</span>
          </div>
        </SectionCard>

        {/* ── 2. MÁQUINA ── */}
        <SectionCard
          icon={<Zap size={16} aria-hidden />}
          title="2. Máquina / Impresión"
          color="bg-amber-600/20 text-amber-400"
        >
          <Field id="print-time"    label="Tiempo por pieza"   value={inputs.printTime}   onChange={(v) => set("printTime", v)}   suffix="h" step={0.5} />
          <Field id="machine-power" label="Potencia"           value={inputs.machinePower} onChange={(v) => set("machinePower", v)} suffix="W" step={10} hint={printer.id !== "custom" ? `según ${printer.name}` : "manual"} />
          <Field id="elec-cost"     label="Costo eléctrico"    value={inputs.electricityCost} onChange={(v) => set("electricityCost", v)} prefix="$" suffix="/kWh" hint="por kWh" />
          <Field id="amortization"  label="Amortización"       value={inputs.amortizationPerHour} onChange={(v) => set("amortizationPerHour", v)} prefix="$" suffix="/h" />
          <Field id="maintenance"   label="Mantenimiento"      value={inputs.maintenancePerHour}  onChange={(v) => set("maintenancePerHour", v)} prefix="$" suffix="/h" />

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

        {/* ── 3. MANO DE OBRA ── */}
        <SectionCard
          icon={<Wrench size={16} aria-hidden />}
          title="3. Mano de Obra"
          color="bg-emerald-600/20 text-emerald-400"
        >
          <Field id="prep-time"   label="Prep. por pieza"     value={inputs.prepTime}   onChange={(v) => set("prepTime", v)}   suffix="h" step={0.25} hint="Slicer, setup" />
          <Field id="post-time"   label="Post-proc. por pieza" value={inputs.postTime}   onChange={(v) => set("postTime", v)}   suffix="h" step={0.25} hint="lijado, pintura" />
          <Field id="labor-rate"  label="Tarifa hora hombre"  value={inputs.laborRate}  onChange={(v) => set("laborRate", v)}  prefix="$" suffix="/h" />

          <div className="mt-1 p-3 bg-emerald-600/10 rounded-xl border border-emerald-600/20 flex justify-between items-center">
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">C. Mano de Obra / pieza</span>
            <span className="text-sm font-black text-emerald-300">{fmt(bd.cmo)}</span>
          </div>
        </SectionCard>

        {/* ── 4. OPERATIVOS + PRECIO ── */}
        <SectionCard
          icon={<DollarSign size={16} aria-hidden />}
          title="4. Operativos y Precio"
          color="bg-indigo-600/20 text-indigo-400"
        >
          <Field id="quantity"      label="Cantidad de piezas"   value={inputs.quantity}  onChange={(v) => set("quantity", Math.max(0, v))}  suffix="und" step={1} />
          <Field id="fixed-monthly" label="Costos fijos mensuales" value={inputs.fixedCostMonthly} onChange={(v) => set("fixedCostMonthly", v)} prefix="$" hint="total del mes" />
          <Field id="fixed-pct"     label="% asignado a este trabajo" value={inputs.fixedCostPercent} onChange={(v) => set("fixedCostPercent", v)} suffix="%" step={1} />
          <Field id="profit-margin" label="Margen de beneficio" value={inputs.profitMargin} onChange={(v) => set("profitMargin", v)} suffix="%" step={1} />
          <Field id="iva"           label="IVA / Impuesto"      value={inputs.iva}          onChange={(v) => set("iva", v)}          suffix="%" step={1} />

          {/* Redondeo */}
          <FieldSelect
            id="rounding"
            label="Estrategia de redondeo"
            value={inputs.rounding}
            onChange={(v) => set("rounding", v as RoundingStrategy)}
            options={(Object.keys(ROUNDING_LABELS) as RoundingStrategy[]).map((k) => ({ value: k, label: ROUNDING_LABELS[k] }))}
          />

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
                <span className="text-[9px] text-slate-500 font-bold">Aplica plus de valor sobre el lote</span>
              </div>
            </label>
            {inputs.ownDesign && (
              <Field id="design-bonus" label="Plus por diseño" value={inputs.designBonus} onChange={(v) => set("designBonus", v)} suffix="%" step={5} />
            )}
          </div>

          {/* Defaults */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSaveDefaults}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-xl transition-colors"
            >
              <Settings2 size={12} aria-hidden /> Guardar defaults
            </button>
            <button
              onClick={handleRestoreDefaults}
              title="Restaurar predeterminados de fábrica"
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl transition-colors"
            >
              <RotateCcw size={12} aria-hidden />
            </button>
          </div>
        </SectionCard>
      </div>

      {/* PANEL DE RESULTADOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* PRECIO FINAL */}
        <div className="lg:col-span-1 bg-violet-600 rounded-3xl p-8 text-center shadow-xl shadow-violet-600/30 flex flex-col items-center justify-center gap-3">
          <p className="text-[10px] font-black text-violet-200 uppercase tracking-[0.3em]">
            Total del lote ({Math.max(1, inputs.quantity || 1)} piezas)
          </p>
          <p className="text-5xl font-black text-white leading-none" aria-live="polite">
            {fmt(bd.roundedTotal, inputs.rounding === "999" ? 3 : 2)}
          </p>
          <p className="text-violet-200 text-xs font-bold">
            incluye IVA ({inputs.iva}%) · {ROUNDING_LABELS[inputs.rounding].toLowerCase()}
          </p>
          <div className="pt-2 border-t border-violet-500/40 w-full flex items-center justify-center gap-2">
            <Layers size={14} className="text-violet-200" aria-hidden />
            <p className="text-violet-200 text-xs font-bold">
              Por unidad: <span className="text-white font-black">{fmt(bd.roundedUnit, inputs.rounding === "999" ? 3 : 2)}</span>
            </p>
          </div>
          <p className="text-violet-300 text-xs font-bold">
            Sin IVA total: <span className="text-white font-black">{fmt(bd.priceWithMarginTotal)}</span>
          </p>
        </div>

        {/* DESGLOSE COMPLETO */}
        <div className="lg:col-span-2 bg-slate-900 rounded-3xl border border-slate-800 p-6">
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-5">Desglose del Cálculo</h2>

          <div className="space-y-0">
            {[
              { label: "Costo Material (Cm) / pieza",       value: bd.cm,            color: "text-violet-400",  formula: `${inputs.pieceWeight}g × $${(inputs.rollWeight > 0 ? inputs.rollPrice / inputs.rollWeight : 0).toFixed(3)}/g × ${(1 + inputs.wasteFactor / 100).toFixed(2)} (desp.)` },
              { label: "Costo Máquina (Ch) / pieza",        value: bd.ch,            color: "text-amber-400",   formula: `${inputs.printTime}h × ($${bd.chElec.toFixed(3)}/h elec. + $${inputs.amortizationPerHour}/h amort. + $${inputs.maintenancePerHour}/h mant.)` },
              { label: "Mano de Obra (Cmo) / pieza",        value: bd.cmo,           color: "text-emerald-400", formula: `(${inputs.prepTime}h prep + ${inputs.postTime}h post) × $${inputs.laborRate}/h` },
              { label: `Costo Producción del lote (×${Math.max(1, inputs.quantity || 1)})`, value: bd.cpTotal, color: "text-white", formula: `${fmt(bd.cp)} × ${Math.max(1, inputs.quantity || 1)} piezas` },
              { label: "Costos Fijos Prorrateados",         value: bd.fixedProrated, color: "text-blue-400",    formula: `$${inputs.fixedCostMonthly} × ${inputs.fixedCostPercent}%` },
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

            <div className="py-3 border-b border-slate-700">
              <div className="flex justify-between items-center">
                <p className="text-xs font-black text-white">Base total del lote</p>
                <span className="text-base font-black text-white">{fmt(bd.basePriceTotal)}</span>
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
                <p className="text-xs font-black text-indigo-300">Con margen de beneficio ({inputs.profitMargin}%)</p>
                <span className="text-sm font-black text-indigo-400">{fmt(bd.priceWithMarginTotal)}</span>
              </div>
            </div>

            <div className="py-3 border-b border-slate-800/60">
              <div className="flex justify-between items-center">
                <p className="text-xs font-black text-violet-300">Precio total con IVA ({inputs.iva}%)</p>
                <span className="text-sm font-black text-violet-300">{fmt(bd.priceWithIvaTotal)}</span>
              </div>
            </div>

            <div className="py-3">
              <div className="flex justify-between items-center">
                <p className="text-xs font-black text-emerald-400">{ROUNDING_LABELS[inputs.rounding]}</p>
                <span className="text-base font-black text-emerald-400">{fmt(bd.roundedTotal, inputs.rounding === "999" ? 3 : 2)}</span>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-4 border-t border-slate-800 mt-2 flex-wrap">
            <button
              id="btn-export-3d"
              onClick={handleExportPDF}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-colors min-w-40"
            >
              <FileDown size={14} aria-hidden />
              Exportar PDF
            </button>
            <button
              id="btn-save-3d"
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-colors min-w-40"
            >
              <Save size={14} aria-hidden />
              {editingId ? "Actualizar" : "Guardar"}
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
                      {new Date(job.savedAt).toLocaleDateString("es-AR")} · {job.inputs.quantity || 1}× {job.inputs.pieceWeight}g · {job.inputs.printTime}h impresión · {PRINTERS.find((p) => p.id === job.inputs.printerModel)?.name ?? "personalizada"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-violet-400">{fmt(job.finalPriceTotal, job.inputs.rounding === "999" ? 3 : 2)}</p>
                    <p className="text-[10px] text-slate-500 font-bold">total c/ IVA</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => handleLoad(job)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/40 text-violet-400 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors"
                    >
                      <Pencil size={10} aria-hidden /> Editar
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
