import { OrderStatus } from '../../common/enums/order-status.enum';

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  address: string;
  province: string;
  postalCode: string;
}

export class Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  shippingAddress: ShippingAddress;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
