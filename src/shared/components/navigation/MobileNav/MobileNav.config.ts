import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  BarChart3,
  Truck
} from "lucide-react";

export const NAV_ITEMS = [
  {
    label: "Inicio",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Ventas",
    href: "/ventas",
    icon: ShoppingCart,
  },
  {
    label: "Stock",
    href: "/inventario",
    icon: Package,
  },
  {
    label: "Clientes",
    href: "/crm",
    icon: Users,
  },
  {
    label: "Logística",
    href: "/logistica",
    icon: Truck,
  },
  {
    label: "Radar",
    href: "/analitica",
    icon: BarChart3,
  },
];