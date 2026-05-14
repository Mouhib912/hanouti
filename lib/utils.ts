import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names using clsx and tailwind-merge.
 * This ensures Tailwind classes are properly merged without conflicts.
 *
 * Usage:
 * ```tsx
 * cn("px-4 py-2", isActive && "bg-primary", className)
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a numeric value as Tunisian Dinar.
 * Outputs "12,50 DT", "1 250,00 DT" — French-Tunisian decimal comma + space thousands.
 * DB stores decimal(10,2) so we force 2 fraction digits (millimes truncated).
 */
export function formatPrice(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!isFinite(n)) return "—";
  const formatted = new Intl.NumberFormat("fr-TN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return `${formatted} DT`;
}

/**
 * Format a Tunisian phone number for display: "55 123 456" or "+216 55 123 456".
 * Accepts raw 8-digit storage or with country prefix; returns the input unchanged
 * if it doesn't match expected shape.
 */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "—";
  const clean = raw.replace(/[\s\-\.]/g, "").replace(/^\+?216/, "");
  if (!/^\d{8}$/.test(clean)) return raw;
  return `${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5)}`;
}
