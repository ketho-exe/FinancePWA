import type { Category, CategoryType, RecurringFrequency } from "@/lib/types";

export type QuickAddResult =
  | {
      kind: "transaction";
      amount: number;
      description: string;
      type: CategoryType;
      categoryId: string | null;
    }
  | {
      kind: "recurring";
      amount: number;
      description: string;
      type: CategoryType;
      categoryId: string | null;
      frequency: RecurringFrequency;
      interval: number;
    }
  | null;

function detectFrequency(text: string) {
  if (text.includes("biweekly")) return { frequency: "biweekly" as const, interval: 1 };
  if (text.includes("weekly")) return { frequency: "weekly" as const, interval: 1 };
  if (text.includes("monthly")) return { frequency: "monthly" as const, interval: 1 };
  const customMatch = text.match(/every\s+(\d+)\s+days?/);
  if (customMatch) {
    return { frequency: "custom" as const, interval: Number(customMatch[1]) };
  }
  return null;
}

function guessCategoryId(description: string, type: CategoryType, categories: Category[]) {
  const normalized = description.toLowerCase();
  const exact = categories.find((item) => item.type === type && normalized.includes(item.name.toLowerCase()));
  if (exact) return exact.id;

  const keywordMap: Record<string, string[]> = {
    groceries: ["tesco", "aldi", "lidl", "grocer"],
    transport: ["uber", "train", "bus", "fuel"],
    coffee: ["coffee", "costa", "starbucks"],
    salary: ["salary", "payday", "wage", "bonus"],
    rent: ["rent", "landlord"],
  };

  const matchedKeyword = Object.entries(keywordMap).find(([, values]) =>
    values.some((value) => normalized.includes(value)),
  )?.[0];
  if (!matchedKeyword) return null;

  return (
    categories.find(
      (item) => item.type === type && item.name.toLowerCase() === matchedKeyword,
    )?.id ?? null
  );
}

export function parseQuickAdd(input: string, categories: Category[]): QuickAddResult {
  const trimmed = input.trim();
  const match = trimmed.match(/^([+-])\s*(\d+(?:\.\d{1,2})?)\s+(.+)$/i);
  if (!match) return null;

  const [, sign, amountRaw, restRaw] = match;
  const type = sign === "+" ? "income" : "expense";
  const frequency = detectFrequency(restRaw.toLowerCase());
  const cleanedDescription = restRaw
    .replace(/\b(weekly|monthly|biweekly)\b/gi, "")
    .replace(/\bevery\s+\d+\s+days?\b/gi, "")
    .trim();
  const amount = Number(amountRaw);
  const categoryId = guessCategoryId(cleanedDescription, type, categories);

  if (frequency) {
    return {
      kind: "recurring",
      amount,
      description: cleanedDescription,
      type,
      categoryId,
      frequency: frequency.frequency,
      interval: frequency.interval,
    };
  }

  return {
    kind: "transaction",
    amount,
    description: cleanedDescription,
    type,
    categoryId,
  };
}
