import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  readonly path: string;
  readonly label: string;
  readonly Icon: LucideIcon;
}