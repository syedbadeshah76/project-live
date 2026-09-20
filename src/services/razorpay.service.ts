import { apiClient } from "@/lib/api-client";

export interface InitiatePaymentResponse01 {
  razorpayOrderId: string;
  amount: number;
  currency: string;
  razorpayKeyId: string;
}
/*
{
    "razorpayOrderId": "order_TGZrw3fLpx82by",
    "amount": 58.99,
    "currency": "INR",
    "razorpayKeyId": "rzp_test_TAUoLAzzfUmkjR"
}
*/

export interface PaymentRecord {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: "PENDING" | "CAPTURED" | "FAILED" | "REFUNDED";
  method: string | null;
  createdAt: string;
}

export interface VerifyPaymentPayload {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  orderId: string;
}

export const razorpayService = {
  initiate: (orderId: string) =>
    apiClient.post<InitiatePaymentResponse01>("/payments/initiate", { orderId }),

  verify: (payload: VerifyPaymentPayload) =>
    apiClient.post<PaymentRecord>("/payments/verify", payload),

  getByOrder: (orderId: string) =>
    apiClient.get<PaymentRecord>(`/payments/order/${orderId}`),

  refund: (orderId: string, reason: string) =>
    apiClient.post<PaymentRecord>(`/payments/order/${orderId}/refund`, { reason }),

  listRefunds: (orderId: string) =>
    apiClient.get<PaymentRecord[]>(`/payments/order/${orderId}/refunds`),
};
