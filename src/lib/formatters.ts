import { format, parseISO } from "date-fns";

/**
 * Format a number as GBP currency
 */
export function formatGBP(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
}

/**
 * Format a number as GBP without decimal places (for larger amounts)
 */
export function formatGBPRounded(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a date string for display
 */
export function formatDate(dateString: string, formatStr: string = "d MMM yyyy"): string {
  try {
    return format(parseISO(dateString), formatStr);
  } catch {
    return dateString;
  }
}

/**
 * Format a date as month/year
 */
export function formatMonthYear(dateString: string): string {
  return formatDate(dateString, "MMM yyyy");
}

/**
 * Format a number with thousands separator
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-GB").format(value);
}

/**
 * Format a percentage
 */
export function formatPercent(value: number, decimals: number = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Get month key from date (YYYY-MM-01 format)
 */
export function getMonthKey(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "yyyy-MM-01");
}
