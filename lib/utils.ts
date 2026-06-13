import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateUniqueSlug(name: string): string {
  const base = slugify(name) || "room";
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

export const USER_COLORS = [
  "#6366f1", // indigo
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#ef4444", // red
  "#8b5cf6", // violet
  "#14b8a6", // teal
  "#f97316", // orange
  "#06b6d4", // cyan
];

export function pickUserColor(index: number): string {
  return USER_COLORS[index % USER_COLORS.length];
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}
