import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  BarChart,
  Truck,
  Wrench,
  Boxes,
  Palette,
  } from "lucide-react";
import type { NavItem } from "./mobileNav.types";

export const NAV_ITEMS: readonly NavItem[] = [
  { label: "Inicio", href: "/inicio", icon: LayoutDashboard },
  { label: "Ventas", href: "/ventas", icon: ShoppingCart },
  { label: "Stock", href: "/inventario", icon: Package },
  { label: "Clientes", href: "/clientes", icon: Users },
  { label: "Impresión 3D", href: "/impresiones-3d", icon: Boxes },
  { label: "Sublimación", href: "/sublimacion", icon: Palette },
  { label: "Servicios", href: "/servicios", icon: Wrench },
  { label: "Remitos", href: "/remitos", icon: Truck },
  { label: "Finanzas", href: "/finanzas", icon: BarChart },
];
