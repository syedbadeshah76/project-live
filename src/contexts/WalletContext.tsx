import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  walletService,
  type WalletBalance,
  type WalletTransaction,
  type RedemptionQuote,
} from "@/services/wallet.service";
import { useAuth } from "@/contexts/AuthContext";

// ============= Redemption Tiers =============
// Structured dynamically so it can later consume backend-configured tiers
// via GET /api/wallet/redemption-tiers without UI changes.
export interface RedemptionTier {
  coins: number;
  discountPercent: number;
  label: string;
}

export const REDEMPTION_TIERS: RedemptionTier[] = [
  { coins: 50, discountPercent: 5, label: "Redeem 50 Coins (5% discount)" },
  { coins: 100, discountPercent: 10, label: "Redeem 100 Coins (10% discount)" },
];

// ============= Context Type =============
interface WalletContextType {
  wallet: WalletBalance | null;
  currentBalance: number;
  transactions: WalletTransaction[];
  quote: RedemptionQuote | null;
  appliedCoins: number;
  selectedTier: RedemptionTier | null;
  loading: boolean;
  quoteLoading: boolean;
  error: string | null;
  quoteError: string | null;
  refreshWallet: () => Promise<void>;
  fetchQuote: (
    coinsToRedeem: number,
    orderAmount: number,
  ) => Promise<RedemptionQuote>;
  selectTier: (tier: RedemptionTier | null, orderAmount: number) => Promise<void>;
  clearRedemption: () => void;
  removeCoins: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [quote, setQuote] = useState<RedemptionQuote | null>(null);
  const [appliedCoins, setAppliedCoins] = useState<number>(0);
  const [selectedTier, setSelectedTier] = useState<RedemptionTier | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [quoteLoading, setQuoteLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const refreshWallet = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const balanceData = await walletService.getWalletBalance();
      setWallet(balanceData);

      try {
        const txData = await walletService.getWalletTransactions(0, 20);
        setTransactions(txData?.content || []);
      } catch {
        // Transactions endpoint failure should not break wallet balance
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load wallet balance");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshWallet();
  }, [refreshWallet]);

  const fetchQuote = useCallback(
    async (coinsToRedeem: number, orderAmount: number): Promise<RedemptionQuote> => {
      const res = await walletService.getRedemptionQuote(
        coinsToRedeem,
        orderAmount,
      );
      setQuote(res);
      return res;
    },
    [],
  );

  /**
   * Select a fixed redemption tier and immediately fetch a preview quote.
   * If tier is null, clears the selection.
   */
  const selectTier = useCallback(
    async (tier: RedemptionTier | null, orderAmount: number): Promise<void> => {
      if (!tier) {
        setSelectedTier(null);
        setQuote(null);
        setAppliedCoins(0);
        setQuoteError(null);
        return;
      }

      setSelectedTier(tier);
      setQuoteLoading(true);
      setQuoteError(null);

      try {
        const res = await walletService.getRedemptionQuote(tier.coins, orderAmount);
        setQuote(res);
        if (res.valid) {
          setAppliedCoins(tier.coins);
        } else {
          setAppliedCoins(0);
          setQuoteError(res.message || "Redemption not available for this tier");
        }
      } catch (err: any) {
        setQuote(null);
        setAppliedCoins(0);
        setQuoteError(err?.message || "Failed to get redemption quote");
      } finally {
        setQuoteLoading(false);
      }
    },
    [],
  );

  /**
   * Clear all redemption state — called on cart changes, coupon apply, etc.
   */
  const clearRedemption = useCallback(() => {
    setSelectedTier(null);
    setQuote(null);
    setAppliedCoins(0);
    setQuoteError(null);
    setQuoteLoading(false);
  }, []);

  /**
   * Alias for clearRedemption — backward compatibility for Checkout.tsx post-payment cleanup.
   */
  const removeCoins = useCallback(() => {
    clearRedemption();
  }, [clearRedemption]);

  const currentBalance = wallet?.currentBalance ?? 0;

  return (
    <WalletContext.Provider
      value={{
        wallet,
        currentBalance,
        transactions,
        quote,
        appliedCoins,
        selectedTier,
        loading,
        quoteLoading,
        error,
        quoteError,
        refreshWallet,
        fetchQuote,
        selectTier,
        clearRedemption,
        removeCoins,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return ctx;
};
