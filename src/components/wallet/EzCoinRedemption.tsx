import { useCallback } from "react";
import { Separator } from "@/components/ui/separator";
import { useWallet, REDEMPTION_TIERS } from "@/contexts/WalletContext";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/utils";
import type { RedemptionTier } from "@/contexts/WalletContext";
import edvanz2 from "../../assets/ednanz1.png";

import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Coins,
} from "lucide-react";

interface EzCoinRedemptionProps {
  orderAmount: number;
  disabled?: boolean;
  onCouponConflict: () => void;
}

/**
 * Reusable EZ Coins redemption component — fixed tier selection + quote preview.
 *
 * Used in both Cart and Checkout order summary sections.
 * Replaces the old arbitrary coin input + Apply button.
 *
 * Flow:
 *   1. Show wallet balance
 *   2. Show fixed redemption tier radio options
 *   3. On selection: clear coupon (mutual exclusivity), fetch preview quote
 *   4. Display estimated discount
 *   5. Parent reads wallet.appliedCoins for checkout payload
 */
export function EzCoinRedemption({
  orderAmount,
  disabled = false,
  onCouponConflict,
}: EzCoinRedemptionProps) {
  const { currency } = useCart();
  const {
    currentBalance,
    selectedTier,
    quote,
    appliedCoins,
    loading: walletLoading,
    quoteLoading,
    quoteError,
    selectTier,
    clearRedemption,
  } = useWallet();

  const handleSelectTier = useCallback(
    async (tier: RedemptionTier) => {
      // If same tier is already selected, deselect
      if (selectedTier?.coins === tier.coins) {
        clearRedemption();
        return;
      }

      // Mutual exclusivity: clear coupon before applying coins
      onCouponConflict();

      // Select tier and fetch quote preview
      await selectTier(tier, orderAmount);
    },
    [selectedTier, clearRedemption, onCouponConflict, selectTier, orderAmount],
  );

  const handleRemove = useCallback(() => {
    clearRedemption();
  }, [clearRedemption]);

  if (disabled) return null;

  return (
    <div className="space-y-3">
      {/* Wallet Balance Header */}
      <div className="flex items-center justify-between ">
        <div className="flex items-center  text-sm font-semibold ">
          <span>
          <img src={edvanz2} className="h-9 w-9" alt="" />
          </span>
          <span>
            {walletLoading ? "..." : `${currentBalance} EZ Coins`}
          </span>
        </div>
        {appliedCoins > 0 && quote?.valid && (
          <button
            onClick={handleRemove}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Remove
          </button>
        )}
      </div>

      {/* Fixed Redemption Tier Options */}
      {currentBalance > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Use EZ Coins
          </p>
          {REDEMPTION_TIERS.map((tier) => {
            const isDisabled = tier.coins > currentBalance;
            const isSelected = selectedTier?.coins === tier.coins;

            return (
              <label
                key={tier.coins}
                className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all text-sm ${
                  isDisabled
                    ? "opacity-50 cursor-not-allowed border-border/40 bg-muted/30"
                    : isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/60 hover:border-primary/40 hover:bg-muted/30"
                }`}
              >
                <input
                  type="radio"
                  name="ez-coin-tier"
                  checked={isSelected}
                  disabled={isDisabled || quoteLoading}
                  onChange={() => {
                    if (!isDisabled) handleSelectTier(tier);
                  }}
                  className="accent-primary h-4 w-4 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span className={`font-medium ${isDisabled ? "text-muted-foreground" : "text-foreground"}`}>
                    {tier.label}
                  </span>
                </div>
                <Coins className={`h-4 w-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
              </label>
            );
          })}
        </div>
      )}

      {/* No coins message */}
      {!walletLoading && currentBalance === 0 && (
        <p className="text-xs text-muted-foreground italic">
          No EZ Coins available. Earn coins by referring friends!
        </p>
      )}

      {/* Quote Loading State */}
      {quoteLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Calculating discount...</span>
        </div>
      )}

      {/* Backend Error / Invalid Quote */}
      {quoteError && !quoteLoading && (
        <div className="flex items-start gap-1.5 text-xs text-destructive bg-destructive/5 p-2.5 rounded-lg border border-destructive/20">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{quoteError}</span>
        </div>
      )}

      {/* Valid Quote Preview */}
      {quote && quote.valid && appliedCoins > 0 && !quoteLoading && (
        <div className="flex items-start gap-1.5 text-xs text-green-700 bg-green-50 p-2.5 rounded-lg border border-green-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-green-600" />
          <div>
            <p className="font-semibold">
              Estimated {quote.discountPercent}% Discount
            </p>
            <p className="text-muted-foreground">
              Saves {formatPrice(quote.discountAmount, currency)} using{" "}
              {quote.coinsRequired} EZ Coins
            </p>
          </div>
        </div>
      )}

      <Separator />
    </div>
  );
}
