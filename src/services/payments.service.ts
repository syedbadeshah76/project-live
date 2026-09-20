// ============= Payments Service =============
import { apiClient } from '@/lib/api-client';
import type { ApiResponse, PaymentIntent, Order, PaginationParams, PaginationMeta } from '@/types/api.types';

const MOCK_MODE = true;

const mockOrders: Order[] = [
  {
    id: 'order-1',
    userId: '1',
    courseId: '1',
    course: {
      id: '1',
      title: 'Complete React Developer Course 2024',
      slug: 'complete-react-developer-course-2024',
      shortDescription: 'Master React from scratch',
      description: 'Master React from scratch with hooks, context, Redux.',
      thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=450&fit=crop',
    } as any,
    amount: 89.99,
    discount: 10,
    tax: 8,
    total: 87.99,
    status: 'completed',
    paymentId: 'pi_mock123',
    createdAt: '2024-01-15T10:30:00Z',
  },
];

export const paymentsService = {
  // Create payment intent for course purchase
  async createPaymentIntent(courseId: string, couponCode?: string): Promise<ApiResponse<PaymentIntent>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return {
        success: true,
        data: {
          id: `pi_${Date.now()}`,
          amount: 8999,
          currency: 'usd',
          status: 'pending',
          courseId,
          userId: '1',
          paymentMethod: 'card',
          createdAt: new Date().toISOString(),
        },
      };
    }

    return apiClient.post<ApiResponse<PaymentIntent>>('/payments/create-intent', { courseId, couponCode });
  },

  // Confirm payment
  async confirmPayment(paymentIntentId: string, paymentMethodId: string): Promise<ApiResponse<Order>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return {
        success: true,
        data: {
          ...mockOrders[0],
          id: `order-${Date.now()}`,
          paymentId: paymentIntentId,
          createdAt: new Date().toISOString(),
        },
      };
    }

    return apiClient.post<ApiResponse<Order>>('/payments/confirm', { paymentIntentId, paymentMethodId });
  },

  // Get order history
  async getOrders(pagination?: PaginationParams): Promise<ApiResponse<Order[]> & { meta: PaginationMeta }> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return {
        success: true,
        data: mockOrders,
        meta: {
          currentPage: 1,
          totalPages: 1,
          totalItems: mockOrders.length,
          itemsPerPage: 10,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }

    return apiClient.get<ApiResponse<Order[]> & { meta: PaginationMeta }>('/payments/orders', {
      params: pagination,
    });
  },

  // Get single order
  async getOrder(orderId: string): Promise<ApiResponse<Order>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const order = mockOrders.find((o) => o.id === orderId);
      if (!order) {
        throw { success: false, message: 'Order not found', statusCode: 404 };
      }
      return { success: true, data: order };
    }

    return apiClient.get<ApiResponse<Order>>(`/payments/orders/${orderId}`);
  },

  // Apply coupon code
  async applyCoupon(
    courseId: string,
    couponCode: string
  ): Promise<ApiResponse<{ discount: number; discountType: 'percentage' | 'fixed'; finalPrice: number }>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (couponCode.toUpperCase() === 'SAVE20') {
        return {
          success: true,
          data: { discount: 20, discountType: 'percentage', finalPrice: 71.99 },
        };
      }
      throw { success: false, message: 'Invalid coupon code', statusCode: 400 };
    }

    return apiClient.post<ApiResponse<{ discount: number; discountType: 'percentage' | 'fixed'; finalPrice: number }>>(
      '/payments/apply-coupon',
      { courseId, couponCode }
    );
  },

  // Request refund
  async requestRefund(orderId: string, reason: string): Promise<ApiResponse<{ status: string; message: string }>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return {
        success: true,
        data: { status: 'pending', message: 'Refund request submitted successfully' },
      };
    }

    return apiClient.post<ApiResponse<{ status: string; message: string }>>(`/payments/orders/${orderId}/refund`, {
      reason,
    });
  },

  // Get invoice
  async getInvoice(orderId: string): Promise<ApiResponse<{ invoiceUrl: string }>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return {
        success: true,
        data: { invoiceUrl: `/invoices/${orderId}.pdf` },
      };
    }

    return apiClient.get<ApiResponse<{ invoiceUrl: string }>>(`/payments/orders/${orderId}/invoice`);
  },

  // Admin: Get all transactions
  async getAllTransactions(
    pagination?: PaginationParams,
    filters?: { status?: string; startDate?: string; endDate?: string }
  ): Promise<ApiResponse<Order[]> & { meta: PaginationMeta }> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return {
        success: true,
        data: mockOrders,
        meta: {
          currentPage: 1,
          totalPages: 1,
          totalItems: mockOrders.length,
          itemsPerPage: 20,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }

    return apiClient.get<ApiResponse<Order[]> & { meta: PaginationMeta }>('/admin/payments/transactions', {
      params: { ...pagination, ...filters },
    });
  },

  // Admin: Process refund
  async processRefund(
    orderId: string,
    amount: number
  ): Promise<ApiResponse<{ status: string; refundedAmount: number }>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return {
        success: true,
        data: { status: 'refunded', refundedAmount: amount },
      };
    }

    return apiClient.post<ApiResponse<{ status: string; refundedAmount: number }>>(
      `/admin/payments/orders/${orderId}/process-refund`,
      { amount }
    );
  },
};
