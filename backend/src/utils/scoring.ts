import type { PriorityLevel } from "../types/domain";

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function priorityFromScore(score: number): PriorityLevel {
  if (score >= 0.7) return "High";
  if (score >= 0.4) return "Medium";
  return "Low";
}

export function priorityFromIndex(index: number): PriorityLevel {
  if (index >= 74) return "High";
  if (index >= 42) return "Medium";
  return "Low";
}

export function normalizeValues<T extends object, K extends keyof T>(
  items: T[],
  key: K,
) {
  const values = items.map((item) => Number(item[key] ?? 0));
  const min = Math.min(...values);
  const max = Math.max(...values);

  return items.map((item) => {
    const value = Number(item[key] ?? 0);
    if (max === min) return 0;
    return (value - min) / (max - min);
  });
}

export function round(value: number, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function extractLeaf(value: string) {
  const parts = value.split("|").filter(Boolean);
  return parts.at(-1) ?? value;
}

export function containsAny(value: string, words: string[]) {
  const lower = value.toLowerCase();
  return words.some((word) => lower.includes(word.toLowerCase()));
}
