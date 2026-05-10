import { Home, ShoppingCart, Package, Users, BarChart3 } from 'lucide-react';
import type { NavItem } from './mobileNav.types';

export const NAV_ITEMS: readonly NavItem[] = [
  { path: '/', label: 'Inicio', Icon: Home },
  { path: '/pos', label: 'Venta', Icon: ShoppingCart },
  { path: '/inventario', label: 'Stock', Icon: Package },
  { path: '/crm', label: 'Clientes', Icon: Users },
  { path: '/analiticas', label: 'Radar', Icon: BarChart3 },
] as const;