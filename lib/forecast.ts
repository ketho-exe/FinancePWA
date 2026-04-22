import type {
  Budget,
  Category,
  ForecastSummary,
  RecurringTransaction,
  SavingsGoal,
  Transaction,
} from "@/lib/types";
import { buildRecurringForecastEvents } from "@/lib/recurring";
import { addDays, clamp, diffInDays, getCurrentMonth, getTodayIso } from "@/lib/utils";

function getSignedAmount(transaction: Transaction, categories: Category[]) {
  const category = categories.find((item) => item.id === transaction.categoryId);
  if (!category) return 0;
  return category.type === "income" ? transaction.amount : transaction.amount * -1;
}

export function buildForecastSummary(params: {
  categories: Category[];
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  horizonDays?: number;
}) {
  const today = getTodayIso();
  const horizonDays = params.horizonDays ?? 30;
  const endDate = addDays(today, horizonDays);
  const currentBalance = params.transactions.reduce(
    (sum, transaction) => sum + getSignedAmount(transaction, params.categories),
    0,
  );

  const futureTransactions = params.transactions
    .filter((item) => item.date >= today)
    .map((item) => ({
      date: item.date,
      delta: getSignedAmount(item, params.categories),
      labels: [item.description],
      income: getSignedAmount(item, params.categories) > 0 ? item.amount : 0,
      expense: getSignedAmount(item, params.categories) < 0 ? item.amount : 0,
    }));

  const predictedRecurring = buildRecurringForecastEvents({
    recurringTransactions: params.recurringTransactions,
    categories: params.categories,
    transactions: params.transactions,
    fromDate: today,
    toDate: endDate,
  });

  const events = [...futureTransactions, ...predictedRecurring].sort((left, right) =>
    left.date.localeCompare(right.date),
  );

  let running = currentBalance;
  let lowestBalance = currentBalance;
  const grouped = new Map<string, { delta: number; income: number; expense: number; labels: string[] }>();

  for (const event of events) {
    const existing = grouped.get(event.date) ?? {
      delta: 0,
      income: 0,
      expense: 0,
      labels: [],
    };
    existing.delta += event.delta;
    existing.income += event.income;
    existing.expense += event.expense;
    existing.labels.push(...event.labels);
    grouped.set(event.date, existing);
  }

  const points = Array.from(grouped.entries()).map(([date, value]) => {
    running += value.delta;
    lowestBalance = Math.min(lowestBalance, running);
    return {
      date,
      balance: running,
      delta: value.delta,
      income: value.income,
      expense: value.expense,
      labels: value.labels,
    };
  });

  let runwayDays: number | null = null;
  const belowZeroPoint = points.find((point) => point.balance < 0);
  if (belowZeroPoint) {
    runwayDays = Math.max(0, diffInDays(today, belowZeroPoint.date));
  }

  const month = getCurrentMonth();
  const monthExpenses = params.transactions.filter((item) => item.date.startsWith(month));
  const expenseTotal = monthExpenses.reduce((sum, item) => {
    const category = params.categories.find((entry) => entry.id === item.categoryId);
    return category?.type === "expense" ? sum + item.amount : sum;
  }, 0);
  const monthlyBudget = params.budgets
    .filter((budget) => budget.month === month)
    .reduce((sum, budget) => sum + budget.amount, 0);
  const remainingBudget = monthlyBudget - expenseTotal;
  const daysLeft = Math.max(1, diffInDays(today, `${month}-31`));
  const safeToSpend = monthlyBudget > 0 ? clamp(remainingBudget / Math.max(1, daysLeft / 7), 0, remainingBudget) : 0;

  const budgetRisks = params.budgets
    .filter((budget) => budget.month === month)
    .map((budget) => {
      const category = params.categories.find((item) => item.id === budget.categoryId);
      const actual = params.transactions.reduce((sum, transaction) => {
        if (transaction.categoryId !== budget.categoryId || !transaction.date.startsWith(month)) return sum;
        return sum + transaction.amount;
      }, 0);
      const recurringExpense = params.recurringTransactions
        .filter((item) => item.categoryId === budget.categoryId && item.type === "expense")
        .reduce((sum, item) => sum + item.amount, 0);
      const projectedSpend = actual + recurringExpense;
      return {
        budgetId: budget.id,
        categoryId: budget.categoryId,
        categoryName: category?.name ?? "Category",
        projectedSpend,
        budgetAmount: budget.amount,
        overspendBy: Math.max(0, projectedSpend - budget.amount),
      };
    })
    .filter((risk) => risk.overspendBy > 0);

  return {
    points,
    currentBalance,
    projectedBalance: points.at(-1)?.balance ?? currentBalance,
    lowestBalance,
    safeToSpend,
    runwayDays,
    budgetRisks,
  } satisfies ForecastSummary;
}
