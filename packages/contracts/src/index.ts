export const productCategories = [
  "BRASILEIRAO",
  "INTERNACIONAIS",
  "SELECOES",
  "RETRO",
  "INFANTIL",
  "FEMININA",
] as const;

export type ProductCategory = (typeof productCategories)[number];

export const orderStatuses = [
  "AWAITING_PAYMENT",
  "PAID",
  "SENT_TO_PARTNER",
  "TRACKING_RECEIVED",
  "SHIPPED",
  "DELIVERED",
  "CANCELED",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

export type PaymentStatus =
  | "PENDING"
  | "APPROVED"
  | "REFUSED"
  | "REFUNDED"
  | "CHARGEBACK";

export interface ProductVariantContract {
  id: string;
  size: string;
  stock: number;
}

export interface PublicProductContract {
  id: string;
  sku: string;
  slug: string;
  name: string;
  description: string;
  category: ProductCategory;
  price: number;
  compareAtPrice: number | null;
  imageUrl: string | null;
  badge: string | null;
  variants: ProductVariantContract[];
}

export interface CreateOrderInput {
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  shipping: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    postalCode: string;
  };
  items: Array<{
    productId: string;
    size: string;
    quantity: number;
    personalization?: string;
  }>;
}

export interface CreatedOrderContract {
  number: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  shippingAmount: number;
  discountAmount: number;
  total: number;
  createdAt: string;
}

export interface OrderTrackingContract {
  number: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: number;
  trackingCode: string | null;
  trackingCarrier: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    productName: string;
    size: string;
    quantity: number;
    personalization: string | null;
  }>;
  events: Array<{
    status: OrderStatus;
    note: string | null;
    createdAt: string;
  }>;
}
