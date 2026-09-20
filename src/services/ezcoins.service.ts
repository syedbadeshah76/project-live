// ============= EZ Coins Service =============
// Backend (Spring Boot): GET /me/ez-coins/balance,
// POST /me/ez-coins/redeem { amount, orderId }
import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api.types";

const MOCK_MODE = true;

export interface EzCoinsBalance {
  coins: number;
  /** Value of 1 coin in cart currency (e.g. 1 coin = $0.10) */
  conversionRate: number;
  /** Max discount % of subtotal coins can cover */
  maxDiscountPercent: number;
}

export const ezCoinsService = {
  async getBalance(): Promise<ApiResponse<EzCoinsBalance>> {
    if (MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 150));
      return {
        success: true,
        data: { coins: 120, conversionRate: 0.1, maxDiscountPercent: 20 },
      };
    }
    return apiClient.get<ApiResponse<EzCoinsBalance>>("/me/ez-coins/balance");
  },
  async redeem(amount: number, orderId?: string): Promise<ApiResponse<{ discount: number }>> {
    if (MOCK_MODE) {
      return { success: true, data: { discount: amount * 0.1 } };
    }
    return apiClient.post<ApiResponse<{ discount: number }>>("/me/ez-coins/redeem", { amount, orderId });
  },
};
