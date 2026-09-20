import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number, currency: string = "INR"): string {
  const code = (currency || "INR").toUpperCase();
  const symbol = code === "USD" ? "$" : code === "INR" ? "₹" : code;
  const locale = code === "USD" ? "en-US" : "en-IN";
  return `${symbol}${Number(amount || 0).toLocaleString(locale)}`;
}

