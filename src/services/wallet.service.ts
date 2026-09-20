// ============= Wallet & EZ Coins Service =============
// Backend-ready: integrates Spring Boot endpoints under /api/wallet

import { apiClient } from "@/lib/api-client";

export interface WalletBalance {
  walletId: string;
  currentBalance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
}

export interface WalletTransaction {
  id?: string;
  amount?: number;
  type?: string;
  description?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface WalletTransactionsResponse {
  content: WalletTransaction[];
  totalElements?: number;
  totalPages?: number;
  page?: number;
  size?: number;
}

export interface RedemptionQuoteRequest {
  coinsToRedeem: number;
  orderAmount: number;
}

export interface RedemptionQuote {
  valid: boolean;
  message?: string;
  coinsRequired: number;
  discountPercent: number;
  discountAmount: number;
}

export const walletService = {
  /**
   * GET /api/wallet
   * Returns current user's wallet balance details.
   */
  getWalletBalance: (): Promise<WalletBalance> =>
    apiClient.get<WalletBalance>("/wallet", {
      headers: { "X-Tenant-Id": undefined },
    }),

  /**
   * GET /api/wallet/transactions?page=0&size=20
   * Returns paginated list of wallet transactions.
   */
  getWalletTransactions: (
    page = 0,
    size = 20,
  ): Promise<WalletTransactionsResponse> =>
    apiClient.get<WalletTransactionsResponse>("/wallet/transactions", {
      params: { page, size },
      headers: { "X-Tenant-Id": undefined },
    }),

  /**
   * POST /api/wallet/redemption-quote
   * Generates a backend-validated redemption quote for applying coins.
   */
  getRedemptionQuote: (
    coinsToRedeem: number,
    orderAmount: number,
  ): Promise<RedemptionQuote> =>
    apiClient.post<RedemptionQuote>(
      "/wallet/redemption-quote",
      { coinsToRedeem, orderAmount },
      { headers: { "X-Tenant-Id": undefined } },
    ),
};
