import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Shortens a UUID to a more readable format (first 8 characters)
 * Example: "123e4567-e89b-12d3-a456-426614174000" -> "123e4567"
 */
export function shortId(uuid: string): string {
  return uuid.slice(0, 8);
}
