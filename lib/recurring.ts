import type {
  Category,
  ForecastPoint,
  RecurringFrequency,
  RecurringTransaction,
  Transaction,
} from "@/lib/types";
import { addDays, getMonthBounds, getTodayIso } from "@/lib/utils";

function addMonths(dateIso: string, months: number) {
  const source = new Date(`${dateIso}T00:00:00`);
  const target = new Date(source.getFullYear(), source.getMonth() + months, source.getDate());
  return target.toISOString().slice(0, 10);
}

export function getRecurringStepDays(
  frequency: RecurringFrequency,
  interval: number,
) {
  if (frequency === "daily") return interval;
  if (frequency === "weekly") return interval * 7;
  if (frequency === "biweekly") return interval * 14;
  if (frequency === "custom") return interval;
  return null;
}

export function getRecurringDatesInRange(
  recurring: RecurringTransaction,
  fromDate: string,
  toDate: string,
) {
  const results: string[] = [];
  const endLimit = recurring.endDate && recurring.endDate < toDate ? recurring.endDate : toDate;
  if (recurring.startDate > endLimit) return results;

  if (recurring.frequency === "monthly") {
    let cursor = recurring.startDate;
    while (cursor <= endLimit) {
      if (cursor >= fromDate) {
        results.push(cursor);
      }
      cursor = addMonths(cursor, Math.max(1, recurring.interval));
    }
    return results;
  }

  const stepDays = getRecurringStepDays(recurring.frequency, Math.max(1, recurring.interval)) ?? 1;
  let cursor = recurring.startDate;
  while (cursor < fromDate) {
    cursor = addDays(cursor, stepDays);
  }
  while (cursor <= endLimit) {
    results.push(cursor);
    cursor = addDays(cursor, stepDays);
  }

  return results;
}

export function getNextRecurringDate(recurring: RecurringTransaction, afterDate = getTodayIso()) {
  const [nextDate] = getRecurringDatesInRange(recurring, afterDate, addDays(afterDate, 366));
  return nextDate ?? null;
}

export function getRecurringDatesInMonth(recurring: RecurringTransaction, month: string) {
  const { start, end } = getMonthBounds(month);
  return getRecurringDatesInRange(
    recurring,
    start.toISOString().slice(0, 10),
    end.toISOString().slice(0, 10),
  );
}

export function buildRecurringForecastEvents(params: {
  recurringTransactions: RecurringTransaction[];
  categories: Category[];
  transactions: Transaction[];
  fromDate: string;
  toDate: string;
}) {
  const items: ForecastPoint[] = [];
  const transactionKeys = new Set(
    params.transactions
      .filter((item) => item.recurringTransactionId)
      .map((item) => `${item.recurringTransactionId}:${item.date}`),
  );

  for (const recurring of params.recurringTransactions) {
    const category = params.categories.find((item) => item.id === recurring.categoryId);
    const label = category ? `${recurring.name} · ${category.name}` : recurring.name;
    const dates = getRecurringDatesInRange(recurring, params.fromDate, params.toDate);

    for (const date of dates) {
      if (transactionKeys.has(`${recurring.id}:${date}`)) continue;
      items.push({
        date,
        balance: 0,
        delta: recurring.type === "income" ? recurring.amount : recurring.amount * -1,
        income: recurring.type === "income" ? recurring.amount : 0,
        expense: recurring.type === "expense" ? recurring.amount : 0,
        labels: [label],
      });
    }
  }

  return items.sort((left, right) => left.date.localeCompare(right.date));
}
