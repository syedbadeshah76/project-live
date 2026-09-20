import { apiClient } from "@/lib/api-client";

export interface BackendCartItem {
  productId: string;
  productType: "COURSE" | "LIVE_COURSE";
  productName: string;
  price: number;
  originalPrice: number;
  addedAt: string | null;
  courseId?: string;
  courseName?: string;
}

export interface BackendCart {
  id: string;
  items: BackendCartItem[];
  subtotal: number;
  taxPercentage: number;
  taxAmount: number;
  totalAmount: number;
  itemCount: number;
  currency?: string;
}

export const cartService = {
  getCart: () => apiClient.get<BackendCart>("/cart"),
  addToCart: (productId: string) => apiClient.post<BackendCart>("/cart/items", { productId }),
  removeItem: (productId: string) => apiClient.delete<void>(`/cart/items/${productId}`),
  clearCart: () => apiClient.delete<void>("/cart"),
};
