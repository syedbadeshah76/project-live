import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import type {
  GiftCourseItem,
  GiftCheckoutState,
  GiftCreationResult,
} from "@/types/gift.types";

// ============= Storage Keys =============
const STORAGE_KEY = "edvanz_gift_checkout";

// ============= Default State =============
const defaultState: GiftCheckoutState = {
  selectedCourses: [],
  recipientName: "",
  recipientEmail: "",
  recipientPhone: "",
  giftMessage: "",
  confirmedEmail: "",
  confirmedPhone: "",
  confirmationCompleted: false,
  isGiftCheckout: false,
  giftCreationResults: [],
  giftOrderId: null,
};

export interface ProductIdValidationResult {
  isValid: boolean;
  productIds: string[];
  missingCourses: GiftCourseItem[];
}

/**
 * Validates that every selected course has a valid product_id or productId.
 * STRICT REQUIREMENT: No fallback to courseId allowed!
 */
export function validateGiftProductIds(courses: GiftCourseItem[]): ProductIdValidationResult {
  if (!courses || courses.length === 0) {
    return { isValid: false, productIds: [], missingCourses: [] };
  }

  const missingCourses: GiftCourseItem[] = [];
  const productIds: string[] = [];

  for (const c of courses) {
    const pid = (c.product_id || c.productId || "").trim();
    if (!pid) {
      missingCourses.push(c);
    } else {
      productIds.push(pid);
    }
  }

  return {
    isValid: missingCourses.length === 0 && productIds.length === courses.length,
    productIds,
    missingCourses,
  };
}

// ============= Context Interface =============
interface GiftCheckoutContextType extends GiftCheckoutState {
  /** Set the courses selected for gifting from the cart dialog. */
  setSelectedCourses: (courses: GiftCourseItem[]) => void;

  /** Store recipient details from Gift Page 1. */
  setRecipientDetails: (details: {
    recipientName: string;
    recipientEmail: string;
    recipientPhone: string;
    giftMessage: string;
  }) => void;

  /** Store confirmation details from Gift Page 2. */
  setConfirmation: (details: {
    confirmedEmail: string;
    confirmedPhone: string;
  }) => void;

  /** Activate gift checkout mode before navigating to Checkout. */
  activateGiftCheckout: () => void;

  /** Explicitly deactivate gift checkout mode (e.g. for normal checkout). */
  deactivateGiftCheckout: () => void;

  /** Store the order ID after order creation. */
  setGiftOrderId: (orderId: string) => void;

  /** Store gift creation results (for partial failure tracking). */
  setGiftCreationResults: (results: GiftCreationResult[]) => void;

  /** Completely reset the gift state after successful completion or abandonment. */
  resetGiftState: () => void;

  /** Derived convenience getters. */
  courseIds: string[];
  productIds: string[];
  validateProductIds: () => ProductIdValidationResult;
  hasFailedGifts: boolean;
  failedGifts: GiftCreationResult[];
  successfulGifts: GiftCreationResult[];
}

const GiftCheckoutContext = createContext<GiftCheckoutContextType | undefined>(
  undefined,
);

// ============= Persistence Helpers =============
// sessionStorage is used only as an optional recovery fallback after browser refresh.
// The React state is the primary source of truth.

function persistToStorage(state: GiftCheckoutState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Silently fail — sessionStorage is optional fallback only
  }
}

function loadFromStorage(): GiftCheckoutState | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as GiftCheckoutState;
    }
  } catch {
    // Corrupted data — return null
  }
  return null;
}

function clearStorage(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silently fail
  }
}

// ============= Provider =============
export const GiftCheckoutProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Initialize from sessionStorage recovery fallback, or use defaults
  const recoveredRef = useRef(false);
  const getInitialState = (): GiftCheckoutState => {
    if (!recoveredRef.current) {
      recoveredRef.current = true;
      const recovered = loadFromStorage();
      if (recovered && recovered.isGiftCheckout) {
        return recovered;
      }
    }
    return defaultState;
  };

  const [state, setState] = useState<GiftCheckoutState>(getInitialState);

  // Helper to update state and persist to sessionStorage
  const updateState = useCallback(
    (updater: (prev: GiftCheckoutState) => GiftCheckoutState) => {
      setState((prev) => {
        const next = updater(prev);
        persistToStorage(next);
        return next;
      });
    },
    [],
  );

  const setSelectedCourses = useCallback(
    (courses: GiftCourseItem[]) => {
      updateState((prev) => ({ ...prev, selectedCourses: courses }));
    },
    [updateState],
  );

  const setRecipientDetails = useCallback(
    (details: {
      recipientName: string;
      recipientEmail: string;
      recipientPhone: string;
      giftMessage: string;
    }) => {
      updateState((prev) => ({ ...prev, ...details }));
    },
    [updateState],
  );

  const setConfirmation = useCallback(
    (details: { confirmedEmail: string; confirmedPhone: string }) => {
      updateState((prev) => ({
        ...prev,
        ...details,
        confirmationCompleted: true,
      }));
    },
    [updateState],
  );

  const activateGiftCheckout = useCallback(() => {
    updateState((prev) => ({ ...prev, isGiftCheckout: true }));
  }, [updateState]);

  const deactivateGiftCheckout = useCallback(() => {
    updateState((prev) => ({ ...prev, isGiftCheckout: false }));
  }, [updateState]);

  const setGiftOrderId = useCallback(
    (orderId: string) => {
      updateState((prev) => ({ ...prev, giftOrderId: orderId }));
    },
    [updateState],
  );

  const setGiftCreationResults = useCallback(
    (results: GiftCreationResult[]) => {
      updateState((prev) => ({ ...prev, giftCreationResults: results }));
    },
    [updateState],
  );

  const resetGiftState = useCallback(() => {
    setState(defaultState);
    clearStorage();
  }, []);

  // Derived values
  const courseIds = state.selectedCourses.map((c) => c.courseId);
  const productIds = state.selectedCourses
    .map((c) => (c.product_id || c.productId || "").trim())
    .filter(Boolean);
  const validateProductIds = useCallback(
    () => validateGiftProductIds(state.selectedCourses),
    [state.selectedCourses],
  );
  const failedGifts = state.giftCreationResults.filter(
    (r) => r.status === "failed",
  );
  const successfulGifts = state.giftCreationResults.filter(
    (r) => r.status === "success",
  );
  const hasFailedGifts = failedGifts.length > 0;

  return (
    <GiftCheckoutContext.Provider
      value={{
        ...state,
        setSelectedCourses,
        setRecipientDetails,
        setConfirmation,
        activateGiftCheckout,
        deactivateGiftCheckout,
        setGiftOrderId,
        setGiftCreationResults,
        resetGiftState,
        courseIds,
        productIds,
        validateProductIds,
        hasFailedGifts,
        failedGifts,
        successfulGifts,
      }}
    >
      {children}
    </GiftCheckoutContext.Provider>
  );
};

// ============= Hook =============
export const useGiftCheckout = (): GiftCheckoutContextType => {
  const ctx = useContext(GiftCheckoutContext);
  if (!ctx) {
    throw new Error(
      "useGiftCheckout must be used within GiftCheckoutProvider",
    );
  }
  return ctx;
};
