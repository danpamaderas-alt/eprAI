import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  Users,
  Package,
  ClipboardList,
  Truck,
  Landmark,
  BarChart3,
  Factory,
  LayoutDashboard,
  Warehouse,
  FileText,
  Plus,
  type LucideIcon,
} from 'lucide-react';

interface Command {
  readonly id: string;
  readonly label: string;
  readonly category: string;
  readonly icon: LucideIcon;
  readonly path?: string;
  readonly action?: () => void;
}

const COMMANDS: readonly Command[] = [
  { id: 'mod-pos', label: 'POS / Punto de Venta', category: 'Módulos', icon: ShoppingCart, path: '/ventas' },
  { id: 'mod-clientes', label: 'Clientes', category: 'Módulos', icon: Users, path: '/clientes' },
  { id: 'mod-productos', label: 'Productos / Inventario', category: 'Módulos', icon: Package, path: '/inventario' },
  { id: 'mod-pedidos', label: 'Pedidos', category: 'Módulos', icon: ClipboardList, path: '/pedidos' },
  { id: 'mod-remitos', label: 'Remitos / Envíos', category: 'Módulos', icon: Truck, path: '/remitos' },
  { id: 'mod-tesoreria', label: 'Tesorería', category: 'Módulos', icon: Landmark, path: '/tesoreria' },
  { id: 'mod-finanzas', label: 'Centro Financiero', category: 'Módulos', icon: BarChart3, path: '/finanzas' },
  { id: 'mod-produccion', label: 'Producción', category: 'Módulos', icon: Factory, path: '/produccion' },
  { id: 'mod-proveedores', label: 'Proveedores', category: 'Módulos', icon: Warehouse, path: '/proveedores' },
  { id: 'mod-cotizador', label: 'Presupuestos B2B', category: 'Módulos', icon: FileText, path: '/cotizador' },

  { id: 'act-venta', label: 'Nueva venta', category: 'Acciones', icon: Plus, path: '/ventas' },
  { id: 'act-cliente', label: 'Nuevo cliente', category: 'Acciones', icon: Plus, path: '/clientes' },
  { id: 'act-producto', label: 'Nuevo producto', category: 'Acciones', icon: Plus, path: '/inventario' },
  { id: 'act-pedido', label: 'Nuevo pedido', category: 'Acciones', icon: Plus, path: '/pedidos' },

  { id: 'nav-dashboard', label: 'Dashboard / Inicio', category: 'Navegación', icon: LayoutDashboard, path: '/inicio' },
  { id: 'nav-inventario', label: 'Inventario', category: 'Navegación', icon: Package, path: '/inventario' },
  { id: 'nav-resellers', label: 'Directorio Clientes', category: 'Navegación', icon: Users, path: '/clientes' },
];

export const CommandPalette = memo(({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return COMMANDS;
    const q = query.toLowerCase();
    return COMMANDS.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q),
    );
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, Command[]>();
    for (const cmd of filtered) {
      const arr = map.get(cmd.category) || [];
      arr.push(cmd);
      map.set(cmd.category, arr);
    }
    return map;
  }, [filtered]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const executeCommand = useCallback(
    (cmd: Command) => {
      onClose();
      if (cmd.path) {
        navigate(cmd.path);
      }
      cmd.action?.();
    },
    [navigate, onClose],
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        executeCommand(filtered[selectedIndex]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, filtered, selectedIndex, executeCommand]);

  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector('[data-selected="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen) return null;

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar módulos, acciones..."
            className="flex-1 bg-transparent text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 outline-none"
          />
          <kbd className="hidden sm:inline-flex px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[9px] font-bold text-slate-400 border border-slate-200 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Commands List */}
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <Search className="w-6 h-6 mb-2 opacity-40" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Sin resultados</p>
            </div>
          ) : (
            Array.from(grouped.entries()).map(([category, commands]) => (
              <div key={category} className="mb-2">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] px-3 py-2">
                  {category}
                </p>
                {commands.map((cmd) => {
                  flatIndex++;
                  const idx = flatIndex;
                  const isSelected = idx === selectedIndex;
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.id}
                      data-selected={isSelected}
                      onClick={() => executeCommand(cmd)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                        isSelected
                          ? 'bg-brand-600 text-white'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-bold flex-1 truncate">{cmd.label}</span>
                      {isSelected && (
                        <kbd className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-white/20">↵</kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-6 py-3 border-t border-slate-100 dark:border-slate-800">
          <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
            <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">↑↓</kbd>
            Navegar
          </span>
          <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">↵</kbd>
            Seleccionar
          </span>
          <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">ESC</kbd>
            Cerrar
          </span>
        </div>
      </div>
    </div>
  );
});

CommandPalette.displayName = 'CommandPalette';
