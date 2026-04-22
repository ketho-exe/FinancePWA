import type { Category, FinanceInsight, SavingsGoal, Transaction } from "@/lib/types";
import { formatCurrency, getCurrentMonth } from "@/lib/utils";

function isWeekend(dateIso: string) {
  const day = new Date(`${dateIso}T00:00:00`).getDay();
  return day === 0 || day === 6;
}

export function buildFinanceInsights(params: {
  categories: Category[];
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
}) {
  const month = getCurrentMonth();
  const monthTransactions = params.transactions.filter((item) => item.date.startsWith(month));
  const expenseTransactions = monthTransactions.filter((item) => {
    const category = params.categories.find((categoryItem) => categoryItem.id === item.categoryId);
    return category?.type === "expense";
  });

  const weekendSpend = expenseTransactions
    .filter((item) => isWeekend(item.date))
    .reduce((sum, item) => sum + item.amount, 0);
  const weekdaySpend = expenseTransactions
    .filter((item) => !isWeekend(item.date))
    .reduce((sum, item) => sum + item.amount, 0);

  const categoryTotals = expenseTransactions.reduce<Record<string, number>>((result, transaction) => {
    result[transaction.categoryId] = (result[transaction.categoryId] ?? 0) + transaction.amount;
    return result;
  }, {});

  const topCategory = Object.entries(categoryTotals)
    .map(([categoryId, total]) => ({
      categoryId,
      total,
      categoryName: params.categories.find((item) => item.id === categoryId)?.name ?? "Category",
    }))
    .sort((left, right) => right.total - left.total)[0];

  const monthlySavings = params.savingsGoals.reduce(
    (sum, goal) => sum + goal.monthlyContribution,
    0,
  );

  const insights: FinanceInsight[] = [];

  if (weekendSpend > weekdaySpend && weekendSpend > 0) {
    const uplift = weekdaySpend > 0 ? ((weekendSpend - weekdaySpend) / weekdaySpend) * 100 : 100;
    insights.push({
      id: "weekend-spend",
      title: "Weekend spending spikes",
      body: `You spend about ${Math.round(uplift)}% more on weekends than weekdays this month.`,
    });
  }

  if (topCategory) {
    insights.push({
      id: "top-category",
      title: `${topCategory.categoryName} is leading your spend`,
      body: `${formatCurrency(topCategory.total)} has gone into ${topCategory.categoryName.toLowerCase()} this month.`,
    });
  }

  if (monthlySavings > 0) {
    insights.push({
      id: "savings-rate",
      title: "Savings rhythm is active",
      body: `Your linked savings pots are set to collect ${formatCurrency(monthlySavings)} each month.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "steady-month",
      title: "A calm month so far",
      body: "Keep logging expenses and recurring plans to unlock deeper insights.",
    });
  }

  return insights;
}
