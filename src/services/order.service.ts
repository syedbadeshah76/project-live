import { apiClient } from "@/lib/api-client";

export interface OrderItem {
  id?: string;
  productId?: string;
  productType?: "COURSE" | "LIVE_COURSE";
  productName?: string;
  product_name?: string;
  courseId?: string;
  courseName?: string;
  course_name?: string;
  courseTitle?: string;
  course_title?: string;
  title?: string;
  name?: string;
  course?: string | { id?: string; title?: string; name?: string };
  product?: string | { id?: string; title?: string; name?: string };
  price?: number;
  discountedPrice?: number;
  originalPrice?: number;
  thumbnail?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  items?: OrderItem[];
  courses?: OrderItem[];
  orderItems?: OrderItem[];
  subtotal?: number;
  discountAmount?: number;
  taxPercentage?: number;
  taxAmount?: number;
  totalAmount?: number;
  amount?: number;
  couponCode?: string;
  currency?: string;
  paymentId?: string;
  paymentMethod?: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED" | "PAID" | "CANCELLED" | string;
  createdAt: string | null;
  purchaseDate?: string;
  courseTitle?: string;
  course_title?: string;
  courseName?: string;
  course_name?: string;
  title?: string;
  name?: string;
  productName?: string;
  product_name?: string;
  courseThumbnail?: string;
  thumbnail?: string;
  invoiceUrl?: string;
  isGift?: boolean;
  recipientName?: string;
  recipientEmail?: string;
  giftMessage?: string;
}

export const orderService = {
  checkout: (couponCode = "", coinsToRedeem: number | null = null) =>
    apiClient.post<Order>("/orders/checkout", { couponCode, coinsToRedeem }),
  freeEnroll: (courseId: string, productId?: string) =>
    apiClient.post<Order>("/orders/enroll", { courseId, ...(productId ? { productId } : {}) }),
  listOrders: () => apiClient.get<Order[]>("/orders"),
  getOrder: (orderId: string) => apiClient.get<Order>(`/orders/${orderId}`),
  getInvoice: (orderId: string) => apiClient.get<unknown>(`/orders/${orderId}/invoice`),
  downloadInvoiceUrl: (orderId: string) => `/api/orders/${orderId}/invoice`,
};
