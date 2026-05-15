export interface Variation {
  readonly quantityOrdered: number;
}

export interface OrderItem {
  readonly variations?: Variation[];
}

export interface Order {
  readonly id: string;
  readonly customerName: string;
  readonly items?: OrderItem[];
}