declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayCheckoutOptions {
  keyId: string;
  orderId: string;
  amount: number;
  currency?: string;
  courseName: string;
  customerName?: string;
  customerEmail?: string;
  onSuccess: (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  onFailure: (error: any) => void;
  onDismiss?: () => void;
}

export function openRazorpayCheckout(opts: RazorpayCheckoutOptions) {
  if (!window.Razorpay) {
    opts.onFailure({ description: "Razorpay SDK not loaded. Add <script src='https://checkout.razorpay.com/v1/checkout.js'></script> to index.html" });
    return;
  }
  const rzp = new window.Razorpay({
    key: opts.keyId,
    amount: opts.amount,
    currency: opts.currency || "INR",
    name: "EDVANZ LMS",
    description: opts.courseName,
    order_id: opts.orderId,
    prefill: { name: opts.customerName || "", email: opts.customerEmail || "" },
    theme: { color: "#2563eb" },
    handler: opts.onSuccess,
    modal: { ondismiss: opts.onDismiss },
  });
  rzp.on("payment.failed", (r: any) => opts.onFailure(r.error));
  rzp.open();
}
