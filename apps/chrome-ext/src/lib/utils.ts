import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combine class names intelligently.
 * - `clsx` resolves conditionals / arrays / objects.
 * - `twMerge` deduplicates conflicting Tailwind utilities (later wins).
 *
 * Used by every shadcn / basecn component for the `className` prop.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
