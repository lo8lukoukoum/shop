export interface Product {
  id: string;
  barcode: string;
  name: string;
  price: number;
  stock: number;
}

export interface OrderItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  timestamp: number;
}
