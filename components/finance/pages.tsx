"use client";

import { useEffect, useMemo, useState } from "react";
import { AppButton, AppCard, AppPanel, EmptyState, ForecastChart, MetricCard, SectionHeading } from "@/components/finance/ui";
import { useCurrentUserSalarySummary, useFinanceWorkspace } from "@/hooks/use-finance-workspace";
import type { CategoryType, SplitMode } from "@/lib/types";
import { formatCurrency, formatLongDate, formatMonthLabel, formatShortDate, titleCase } from "@/lib/utils";

function getTransactionTags(transactionId: string, maps: ReturnType<typeof useFinanceWorkspace>["transactionTagMaps"], tags: ReturnType<typeof useFinanceWorkspace>["transactionTags"]) {
  const tagIds = maps.filter((item) => item.transactionId === transactionId).map((item) => item.tagId);
  return tags.filter((tag) => tagIds.includes(tag.id));
}

export function DashboardPage() {
  const {
    actualTransactions,
    budgets,
    categories,
    currentMonth,
    forecast,
    insights,
    members,
    notifications,
    savingsGoals,
    wishlistItems,
  } = useFinanceWorkspace();
  const salarySummary = useCurrentUserSalarySummary();

  const monthTransactions = actualTransactions.filter((item) => item.date.startsWith(currentMonth));
  const incomeTotal = monthTransactions.reduce((sum, transaction) => {
    const category = categories.find((item) => item.id === transaction.categoryId);
    return category?.type === "income" ? sum + transaction.amount : sum;
  }, 0);
  const expenseTotal = monthTransactions.reduce((sum, transaction) => {
    const category = categories.find((item) => item.id === transaction.categoryId);
    return category?.type === "expense" ? sum + transaction.amount : sum;
  }, 0);
  const budgetTotal = budgets
    .filter((budget) => budget.month === currentMonth)
    .reduce((sum, budget) => sum + budget.amount, 0);
  const totalSavings = savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={`Income · ${formatMonthLabel(currentMonth)}`} value={formatCurrency(incomeTotal)} />
        <MetricCard label="Expenses" value={formatCurrency(expenseTotal)} />
        <MetricCard label="Budget Remaining" value={formatCurrency(budgetTotal - expenseTotal)} />
        <MetricCard label="Savings Pots" value={formatCurrency(totalSavings)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <AppCard>
          <SectionHeading
            title="Forecast"
            subtitle="A 30-day look ahead across known transactions and generated recurring activity."
          />
          <ForecastChart points={forecast.points} />
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <AppPanel>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Projected balance</p>
              <p className="mt-2 font-mono text-xl text-white">{formatCurrency(forecast.projectedBalance)}</p>
            </AppPanel>
            <AppPanel>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Safe to spend</p>
              <p className="mt-2 font-mono text-xl text-white">{formatCurrency(forecast.safeToSpend)}</p>
            </AppPanel>
            <AppPanel>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Runway</p>
              <p className="mt-2 font-mono text-xl text-white">
                {forecast.runwayDays === null ? "Stable" : `${forecast.runwayDays} days`}
              </p>
            </AppPanel>
          </div>
        </AppCard>

        <AppCard>
          <SectionHeading title="Alerts" subtitle="Live budget and cashflow nudges." />
          <div className="space-y-3">
            {notifications.map((item) => (
              <AppPanel key={item.id} className={item.severity === "critical" ? "border-red-400/30" : item.severity === "warning" ? "border-amber-400/30" : ""}>
                <p className="text-sm font-medium text-white">{item.title}</p>
                <p className="mt-1 text-sm text-slate-400">{item.message}</p>
              </AppPanel>
            ))}
          </div>
        </AppCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AppCard>
          <SectionHeading title="Wishlist Momentum" subtitle="Linked to savings so goals feel concrete." />
          <div className="space-y-3">
            {wishlistItems.slice(0, 3).map((item) => {
              const linkedGoal = savingsGoals.find((goal) => goal.id === item.linkedSavingsGoalId);
              const progress = linkedGoal ? Math.min(1, linkedGoal.currentAmount / item.price) : 0;
              const days = linkedGoal && linkedGoal.monthlyContribution > 0
                ? Math.ceil(Math.max(0, item.price - linkedGoal.currentAmount) / (linkedGoal.monthlyContribution / 30))
                : null;
              return (
                <AppPanel key={item.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-medium text-white">{item.name}</p>
                      <p className="text-sm text-slate-400">{formatCurrency(item.price)}</p>
                    </div>
                    <span className="app-pill px-3 py-1 text-xs">{titleCase(item.priority)}</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-cyan-400" style={{ width: `${progress * 100}%` }} />
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    {days === null ? "Link a savings pot to estimate when you can afford it." : `At the current savings rate: about ${days} days.`}
                  </p>
                </AppPanel>
              );
            })}
            {wishlistItems.length === 0 ? (
              <EmptyState title="No wishlist items yet" body="Add a purchase goal to keep the app motivating, not just bookkeeping." />
            ) : null}
          </div>
        </AppCard>

        <AppCard>
          <SectionHeading title="Insights" subtitle={`Household signals across ${members.length} members.`} />
          <div className="space-y-3">
            {insights.map((item) => (
              <AppPanel key={item.id}>
                <p className="text-base font-medium text-white">{item.title}</p>
                <p className="mt-2 text-sm text-slate-400">{item.body}</p>
              </AppPanel>
            ))}
            {salarySummary ? (
              <AppPanel className="border-blue-400/20">
                <p className="text-base font-medium text-white">Your current salary profile</p>
                <p className="mt-2 text-sm text-slate-400">
                  Estimated take-home: {formatCurrency(salarySummary.monthlyTakeHome)} per month.
                </p>
              </AppPanel>
            ) : null}
          </div>
        </AppCard>
      </div>
    </div>
  );
}

export function TransactionsPage() {
  const {
    categories,
    currentMonth,
    deleteRecurringTransaction,
    deleteTransaction,
    expenseCategories,
    incomeCategories,
    quickAdd,
    recurringTransactions,
    saveRecurringTransaction,
    saveTransaction,
    saveTransactionTag,
    transactionTagMaps,
    transactionTags,
    transactions,
  } = useFinanceWorkspace();
  const [quickAddInput, setQuickAddInput] = useState("");
  const [transactionForm, setTransactionForm] = useState({
    id: "",
    amount: "",
    categoryId: expenseCategories[0]?.id ?? incomeCategories[0]?.id ?? "",
    description: "",
    date: "",
    splitMode: "none" as SplitMode,
    splitParticipants: "2",
    splitAmount: "",
    tagIds: [] as string[],
  });
  const [recurringForm, setRecurringForm] = useState({
    name: "",
    amount: "",
    type: "expense" as CategoryType,
    categoryId: expenseCategories[0]?.id ?? "",
    frequency: "monthly" as const,
    interval: "1",
    startDate: "",
    endDate: "",
    mode: "auto_add" as const,
    note: "",
  });
  const [tagForm, setTagForm] = useState({ name: "", color: "#5b7cfa" });

  const tagLookup = useMemo(
    () =>
      new Map(
        transactions.map((transaction) => [
          transaction.id,
          getTransactionTags(transaction.id, transactionTagMaps, transactionTags),
        ]),
      ),
    [transactions, transactionTagMaps, transactionTags],
  );

  const categoryOptions =
    recurringForm.type === "income" ? incomeCategories : expenseCategories;
  const actualTransactions = transactions.filter((item) => !item.isPrediction);

  useEffect(() => {
    const fallbackCategoryId = expenseCategories[0]?.id ?? incomeCategories[0]?.id ?? "";
    if (!fallbackCategoryId) return;
    if (transactionForm.categoryId && categories.some((category) => category.id === transactionForm.categoryId)) return;
    queueMicrotask(() => {
      setTransactionForm((current) => ({ ...current, categoryId: fallbackCategoryId }));
    });
  }, [categories, expenseCategories, incomeCategories, transactionForm.categoryId]);

  useEffect(() => {
    const fallbackCategoryId = categoryOptions[0]?.id ?? "";
    if (!fallbackCategoryId) return;
    if (recurringForm.categoryId && categoryOptions.some((category) => category.id === recurringForm.categoryId)) return;
    queueMicrotask(() => {
      setRecurringForm((current) => ({ ...current, categoryId: fallbackCategoryId }));
    });
  }, [categoryOptions, recurringForm.categoryId]);

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AppCard>
          <SectionHeading title="Quick Add" subtitle='Try "+50 salary", "-12 uber", or "-8 coffee weekly".' />
          <div className="flex flex-col gap-3 md:flex-row">
            <input value={quickAddInput} onChange={(event) => setQuickAddInput(event.target.value)} placeholder="+12 coffee weekly" />
            <AppButton onClick={() => void quickAdd(quickAddInput).then(() => setQuickAddInput(""))}>Parse and save</AppButton>
          </div>
        </AppCard>

        <AppCard>
          <SectionHeading title="Create Tag" subtitle="Tags power filtering and analytics." />
          <div className="grid gap-3 md:grid-cols-[1fr_140px_auto]">
            <input value={tagForm.name} onChange={(event) => setTagForm((current) => ({ ...current, name: event.target.value }))} placeholder="date night" />
            <input value={tagForm.color} onChange={(event) => setTagForm((current) => ({ ...current, color: event.target.value }))} type="color" />
            <AppButton onClick={() => void saveTransactionTag(tagForm).then(() => setTagForm({ name: "", color: "#5b7cfa" }))}>Add tag</AppButton>
          </div>
        </AppCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <AppCard>
          <SectionHeading title="Transaction Editor" subtitle="Add, update, split, and tag ledger items." />
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={transactionForm.amount}
              onChange={(event) => setTransactionForm((current) => ({ ...current, amount: event.target.value }))}
              placeholder="Amount"
              type="number"
            />
            <input
              value={transactionForm.date}
              onChange={(event) => setTransactionForm((current) => ({ ...current, date: event.target.value }))}
              type="date"
            />
            <select
              value={transactionForm.categoryId}
              onChange={(event) => setTransactionForm((current) => ({ ...current, categoryId: event.target.value }))}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} · {category.type}
                </option>
              ))}
            </select>
            <select
              value={transactionForm.splitMode}
              onChange={(event) => setTransactionForm((current) => ({ ...current, splitMode: event.target.value as SplitMode }))}
            >
              <option value="none">No split</option>
              <option value="even">Split evenly</option>
              <option value="custom">Custom split</option>
            </select>
            <input
              value={transactionForm.description}
              onChange={(event) => setTransactionForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Description"
              className="md:col-span-2"
            />
            {transactionForm.splitMode !== "none" ? (
              <>
                <input
                  value={transactionForm.splitParticipants}
                  onChange={(event) => setTransactionForm((current) => ({ ...current, splitParticipants: event.target.value }))}
                  placeholder="Participants"
                  type="number"
                />
                <input
                  value={transactionForm.splitAmount}
                  onChange={(event) => setTransactionForm((current) => ({ ...current, splitAmount: event.target.value }))}
                  placeholder="Your share"
                  type="number"
                />
              </>
            ) : null}
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-slate-300">Tags</label>
              <div className="flex flex-wrap gap-2">
                {transactionTags.map((tag) => {
                  const selected = transactionForm.tagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      className={`rounded-full border px-3 py-1 text-xs ${selected ? "border-white/30 bg-white/10 text-white" : "border-slate-700 text-slate-400"}`}
                      onClick={() =>
                        setTransactionForm((current) => ({
                          ...current,
                          tagIds: selected
                            ? current.tagIds.filter((id) => id !== tag.id)
                            : [...current.tagIds, tag.id],
                        }))
                      }
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <AppButton
              onClick={() =>
                void saveTransaction({
                  id: transactionForm.id || undefined,
                  amount: Number(transactionForm.amount),
                  categoryId: transactionForm.categoryId,
                  description: transactionForm.description,
                  date: transactionForm.date || new Date().toISOString().slice(0, 10),
                  tagIds: transactionForm.tagIds,
                  splitMode: transactionForm.splitMode,
                  splitParticipants: Number(transactionForm.splitParticipants),
                  splitAmount: transactionForm.splitAmount ? Number(transactionForm.splitAmount) : null,
                }).then(() =>
                  setTransactionForm({
                    id: "",
                    amount: "",
                    categoryId: expenseCategories[0]?.id ?? incomeCategories[0]?.id ?? "",
                    description: "",
                    date: "",
                    splitMode: "none",
                    splitParticipants: "2",
                    splitAmount: "",
                    tagIds: [],
                  }),
                )
              }
            >
              {transactionForm.id ? "Update transaction" : "Save transaction"}
            </AppButton>
          </div>
        </AppCard>

        <AppCard>
          <SectionHeading title="Add Recurring Transaction" subtitle="Generalized bills, subscriptions, and predictable income." />
          <div className="grid gap-3 md:grid-cols-2">
            <input value={recurringForm.name} onChange={(event) => setRecurringForm((current) => ({ ...current, name: event.target.value }))} placeholder="Name" />
            <input value={recurringForm.amount} onChange={(event) => setRecurringForm((current) => ({ ...current, amount: event.target.value }))} placeholder="Amount" type="number" />
            <select value={recurringForm.type} onChange={(event) => setRecurringForm((current) => ({ ...current, type: event.target.value as CategoryType, categoryId: "" }))}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <select value={recurringForm.categoryId} onChange={(event) => setRecurringForm((current) => ({ ...current, categoryId: event.target.value }))}>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select value={recurringForm.frequency} onChange={(event) => setRecurringForm((current) => ({ ...current, frequency: event.target.value as typeof current.frequency }))}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Every X days</option>
            </select>
            <input value={recurringForm.interval} onChange={(event) => setRecurringForm((current) => ({ ...current, interval: event.target.value }))} placeholder="Interval" type="number" />
            <input value={recurringForm.startDate} onChange={(event) => setRecurringForm((current) => ({ ...current, startDate: event.target.value }))} type="date" />
            <input value={recurringForm.endDate} onChange={(event) => setRecurringForm((current) => ({ ...current, endDate: event.target.value }))} type="date" />
            <select value={recurringForm.mode} onChange={(event) => setRecurringForm((current) => ({ ...current, mode: event.target.value as typeof current.mode }))} className="md:col-span-2">
              <option value="auto_add">Auto-add to ledger</option>
              <option value="predict_only">Only predict</option>
            </select>
            <textarea value={recurringForm.note} onChange={(event) => setRecurringForm((current) => ({ ...current, note: event.target.value }))} placeholder="Optional note" className="md:col-span-2" />
          </div>
          <div className="mt-4">
            <AppButton
              onClick={() =>
                void saveRecurringTransaction({
                  name: recurringForm.name,
                  amount: Number(recurringForm.amount),
                  type: recurringForm.type,
                  categoryId: recurringForm.categoryId,
                  frequency: recurringForm.frequency,
                  interval: Number(recurringForm.interval),
                  startDate: recurringForm.startDate || new Date().toISOString().slice(0, 10),
                  endDate: recurringForm.endDate || null,
                  mode: recurringForm.mode,
                  note: recurringForm.note,
                }).then(() =>
                  setRecurringForm({
                    name: "",
                    amount: "",
                    type: "expense",
                    categoryId: expenseCategories[0]?.id ?? "",
                    frequency: "monthly",
                    interval: "1",
                    startDate: "",
                    endDate: "",
                    mode: "auto_add",
                    note: "",
                  }),
                )
              }
            >
              Save recurring transaction
            </AppButton>
          </div>
        </AppCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <AppCard>
          <SectionHeading title="Ledger and Calendar" subtitle={`Showing ${formatMonthLabel(currentMonth)} first.`} />
          <div className="space-y-3">
            {actualTransactions.slice(0, 16).map((transaction) => {
              const category = categories.find((item) => item.id === transaction.categoryId);
              const tags = tagLookup.get(transaction.id) ?? [];
              return (
                <AppPanel key={transaction.id}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-base font-medium text-white">{transaction.description}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {category?.name ?? "Unknown"} · {formatLongDate(transaction.date)}
                      </p>
                      {tags.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {tags.map((tag) => (
                            <span key={tag.id} className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-300">
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-mono text-lg ${category?.type === "income" ? "text-emerald-300" : "text-rose-300"}`}>
                        {category?.type === "income" ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
                      </span>
                      <AppButton
                        variant="ghost"
                        onClick={() =>
                          setTransactionForm({
                            id: transaction.id,
                            amount: String(transaction.amount),
                            categoryId: transaction.categoryId,
                            description: transaction.description,
                            date: transaction.date,
                            splitMode: transaction.splitMode ?? "none",
                            splitParticipants: String(transaction.splitParticipants ?? 2),
                            splitAmount: transaction.splitAmount ? String(transaction.splitAmount) : "",
                            tagIds: tags.map((tag) => tag.id),
                          })
                        }
                      >
                        Edit
                      </AppButton>
                      <AppButton variant="ghost" onClick={() => void deleteTransaction(transaction.id)}>
                        Delete
                      </AppButton>
                    </div>
                  </div>
                </AppPanel>
              );
            })}
            {actualTransactions.length === 0 ? <EmptyState title="No transactions yet" body="Use the quick add bar or the editor above to start populating the ledger." /> : null}
          </div>
        </AppCard>

        <AppCard>
          <SectionHeading title="Recurring Schedule" subtitle="Everything that will keep happening in the background." />
          <div className="space-y-3">
            {recurringTransactions.map((item) => (
              <AppPanel key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-medium text-white">{item.name}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {titleCase(item.frequency)} · every {item.interval} · next {item.nextRunDate ? formatShortDate(item.nextRunDate) : "soon"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono text-base ${item.type === "income" ? "text-emerald-300" : "text-rose-300"}`}>{formatCurrency(item.amount)}</p>
                    <button type="button" className="mt-2 text-xs text-slate-400 underline underline-offset-4" onClick={() => void deleteRecurringTransaction(item.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              </AppPanel>
            ))}
            {recurringTransactions.length === 0 ? <EmptyState title="No recurring items yet" body="Bills, subscriptions, and rent belong here so the forecast stays smart." /> : null}
          </div>
        </AppCard>
      </div>
    </div>
  );
}

export function BudgetsPage() {
  const { budgets, categories, currentMonth, saveBudget, deleteBudget, forecast } = useFinanceWorkspace();
  const [budgetForm, setBudgetForm] = useState({
    categoryId: categories.find((item) => item.type === "expense")?.id ?? "",
    amount: "",
  });

  const rows = budgets
    .filter((item) => item.month === currentMonth)
    .map((budget) => {
      const category = categories.find((item) => item.id === budget.categoryId);
      const risk = forecast.budgetRisks.find((item) => item.budgetId === budget.id);
      return { budget, category, risk };
    });

  useEffect(() => {
    const fallbackCategoryId = categories.find((item) => item.type === "expense")?.id ?? "";
    if (!fallbackCategoryId) return;
    if (budgetForm.categoryId && categories.some((category) => category.id === budgetForm.categoryId)) return;
    queueMicrotask(() => {
      setBudgetForm((current) => ({ ...current, categoryId: fallbackCategoryId }));
    });
  }, [budgetForm.categoryId, categories]);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <AppCard>
        <SectionHeading title="Monthly Budgets" subtitle={`Set spending guardrails for ${formatMonthLabel(currentMonth)}.`} />
        <div className="grid gap-3">
          <select value={budgetForm.categoryId} onChange={(event) => setBudgetForm((current) => ({ ...current, categoryId: event.target.value }))}>
            {categories.filter((item) => item.type === "expense").map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input value={budgetForm.amount} onChange={(event) => setBudgetForm((current) => ({ ...current, amount: event.target.value }))} placeholder="Amount" type="number" />
          <AppButton onClick={() => void saveBudget({ categoryId: budgetForm.categoryId, amount: Number(budgetForm.amount) }).then(() => setBudgetForm((current) => ({ ...current, amount: "" })))}>
            Save budget
          </AppButton>
        </div>
      </AppCard>

      <AppCard>
        <SectionHeading title="Budget Watch" subtitle="Includes projected risk from recurring expenses." />
        <div className="space-y-3">
          {rows.map(({ budget, category, risk }) => (
            <AppPanel key={budget.id}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-base font-medium text-white">{category?.name ?? "Category"}</p>
                  <p className="mt-1 text-sm text-slate-400">Budgeted {formatCurrency(budget.amount)}</p>
                  {risk ? <p className="mt-2 text-sm text-amber-300">Likely overspend: {formatCurrency(risk.overspendBy)}</p> : <p className="mt-2 text-sm text-emerald-300">On track so far.</p>}
                </div>
                <AppButton variant="ghost" onClick={() => void deleteBudget(budget.id)}>
                  Remove
                </AppButton>
              </div>
            </AppPanel>
          ))}
          {rows.length === 0 ? <EmptyState title="No budgets set yet" body="Add a category budget so the prediction engine can flag risk before it hurts." /> : null}
        </div>
      </AppCard>
    </div>
  );
}

export function SavingsPage() {
  const { adjustSavingsGoal, deleteSavingsGoal, savingsGoalEntries, savingsGoals, saveSavingsGoal } = useFinanceWorkspace();
  const [goalForm, setGoalForm] = useState({
    name: "",
    targetAmount: "",
    currentAmount: "",
    monthlyContribution: "",
    note: "",
  });
  const [adjustForm, setAdjustForm] = useState({
    savingsGoalId: savingsGoals[0]?.id ?? "",
    amount: "",
    direction: "add" as "add" | "remove",
    date: "",
    note: "",
  });

  useEffect(() => {
    const fallbackGoalId = savingsGoals[0]?.id ?? "";
    if (!fallbackGoalId) return;
    if (adjustForm.savingsGoalId && savingsGoals.some((goal) => goal.id === adjustForm.savingsGoalId)) return;
    queueMicrotask(() => {
      setAdjustForm((current) => ({ ...current, savingsGoalId: fallbackGoalId }));
    });
  }, [adjustForm.savingsGoalId, savingsGoals]);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <AppCard>
        <SectionHeading title="Savings Goals" subtitle="Track pots, targets, and monthly contributions." />
        <div className="grid gap-3">
          <input value={goalForm.name} onChange={(event) => setGoalForm((current) => ({ ...current, name: event.target.value }))} placeholder="Holiday fund" />
          <input value={goalForm.targetAmount} onChange={(event) => setGoalForm((current) => ({ ...current, targetAmount: event.target.value }))} placeholder="Target amount" type="number" />
          <input value={goalForm.currentAmount} onChange={(event) => setGoalForm((current) => ({ ...current, currentAmount: event.target.value }))} placeholder="Current amount" type="number" />
          <input value={goalForm.monthlyContribution} onChange={(event) => setGoalForm((current) => ({ ...current, monthlyContribution: event.target.value }))} placeholder="Monthly contribution" type="number" />
          <textarea value={goalForm.note} onChange={(event) => setGoalForm((current) => ({ ...current, note: event.target.value }))} placeholder="Note" />
          <AppButton onClick={() => void saveSavingsGoal({
            name: goalForm.name,
            targetAmount: goalForm.targetAmount ? Number(goalForm.targetAmount) : null,
            currentAmount: Number(goalForm.currentAmount || 0),
            monthlyContribution: Number(goalForm.monthlyContribution || 0),
            note: goalForm.note,
          }).then(() => setGoalForm({ name: "", targetAmount: "", currentAmount: "", monthlyContribution: "", note: "" }))}>
            Save savings goal
          </AppButton>
        </div>

        <SectionHeading title="Adjust a Pot" subtitle="Uses the protected database RPC and keeps an audit trail." />
        <div className="grid gap-3">
          <select value={adjustForm.savingsGoalId} onChange={(event) => setAdjustForm((current) => ({ ...current, savingsGoalId: event.target.value }))}>
            {savingsGoals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.name}
              </option>
            ))}
          </select>
          <select value={adjustForm.direction} onChange={(event) => setAdjustForm((current) => ({ ...current, direction: event.target.value as "add" | "remove" }))}>
            <option value="add">Add</option>
            <option value="remove">Remove</option>
          </select>
          <input value={adjustForm.amount} onChange={(event) => setAdjustForm((current) => ({ ...current, amount: event.target.value }))} placeholder="Amount" type="number" />
          <input value={adjustForm.date} onChange={(event) => setAdjustForm((current) => ({ ...current, date: event.target.value }))} type="date" />
          <textarea value={adjustForm.note} onChange={(event) => setAdjustForm((current) => ({ ...current, note: event.target.value }))} placeholder="Note" />
          <AppButton onClick={() => void adjustSavingsGoal({
            savingsGoalId: adjustForm.savingsGoalId,
            amount: Number(adjustForm.amount),
            direction: adjustForm.direction,
            date: adjustForm.date || new Date().toISOString().slice(0, 10),
            note: adjustForm.note,
          }).then(() => setAdjustForm((current) => ({ ...current, amount: "", note: "" })))}>
            Apply adjustment
          </AppButton>
        </div>
      </AppCard>

      <AppCard>
        <SectionHeading title="Pot Overview" subtitle="Balances, targets, and recent adjustment history." />
        <div className="space-y-3">
          {savingsGoals.map((goal) => {
            const progress = goal.targetAmount ? Math.min(1, goal.currentAmount / goal.targetAmount) : 0;
            return (
              <AppPanel key={goal.id}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-base font-medium text-white">{goal.name}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {formatCurrency(goal.currentAmount)} saved
                      {goal.targetAmount ? ` of ${formatCurrency(goal.targetAmount)}` : ""}
                    </p>
                    <div className="mt-3 h-2 rounded-full bg-slate-800">
                      <div className="h-full rounded-full bg-cyan-400" style={{ width: `${progress * 100}%` }} />
                    </div>
                  </div>
                  <AppButton variant="ghost" onClick={() => void deleteSavingsGoal(goal.id)}>
                    Remove
                  </AppButton>
                </div>
              </AppPanel>
            );
          })}
          {savingsGoals.length === 0 ? <EmptyState title="No savings pots yet" body="Create one to track future goals and link wishlist items." /> : null}
        </div>

        <SectionHeading title="Recent Adjustments" />
        <div className="space-y-3">
          {savingsGoalEntries.slice(0, 8).map((entry) => (
            <AppPanel key={entry.id}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{entry.note || "Adjustment"}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatLongDate(entry.entryDate)}</p>
                </div>
                <span className={`font-mono text-sm ${entry.amountDelta >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                  {entry.amountDelta >= 0 ? "+" : ""}
                  {formatCurrency(entry.amountDelta)}
                </span>
              </div>
            </AppPanel>
          ))}
        </div>
      </AppCard>
    </div>
  );
}

export function WishlistPage() {
  const { convertWishlistToSavingsGoal, deleteWishlistItem, saveWishlistItem, savingsGoals, wishlistItems } = useFinanceWorkspace();
  const [form, setForm] = useState({
    name: "",
    price: "",
    priority: "medium" as const,
    linkedSavingsGoalId: "",
    targetDate: "",
    note: "",
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <AppCard>
        <SectionHeading title="Add Wishlist Item" subtitle="Make saving feel more emotional and concrete." />
        <div className="grid gap-3">
          <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Noise-cancelling headphones" />
          <input value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} placeholder="Price" type="number" />
          <select value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as typeof current.priority }))}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <select value={form.linkedSavingsGoalId} onChange={(event) => setForm((current) => ({ ...current, linkedSavingsGoalId: event.target.value }))}>
            <option value="">No linked savings pot</option>
            {savingsGoals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.name}
              </option>
            ))}
          </select>
          <input value={form.targetDate} onChange={(event) => setForm((current) => ({ ...current, targetDate: event.target.value }))} type="date" />
          <textarea value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} placeholder="Why this matters" />
          <AppButton onClick={() => void saveWishlistItem({
            name: form.name,
            price: Number(form.price),
            priority: form.priority,
            linkedSavingsGoalId: form.linkedSavingsGoalId || null,
            targetDate: form.targetDate || null,
            note: form.note,
          }).then(() => setForm({ name: "", price: "", priority: "medium", linkedSavingsGoalId: "", targetDate: "", note: "" }))}>
            Save wishlist item
          </AppButton>
        </div>
      </AppCard>

      <div className="grid gap-4 md:grid-cols-2">
        {wishlistItems.map((item) => {
          const goal = savingsGoals.find((entry) => entry.id === item.linkedSavingsGoalId);
          const progress = goal ? Math.min(1, goal.currentAmount / item.price) : 0;
          const days = goal && goal.monthlyContribution > 0
            ? Math.ceil(Math.max(0, item.price - goal.currentAmount) / (goal.monthlyContribution / 30))
            : null;

          return (
            <AppCard key={item.id}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-medium text-white">{item.name}</p>
                  <p className="mt-1 text-sm text-slate-400">{formatCurrency(item.price)}</p>
                </div>
                <span className="app-pill px-3 py-1 text-xs">{titleCase(item.priority)}</span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-cyan-400" style={{ width: `${progress * 100}%` }} />
              </div>
              <p className="mt-3 text-sm text-slate-400">
                {days === null ? "Link a pot to estimate an affordability date." : `You can likely afford this in around ${days} days.`}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <AppButton onClick={() => void convertWishlistToSavingsGoal(item.id)}>Convert to savings goal</AppButton>
                <AppButton variant="ghost" onClick={() => void deleteWishlistItem(item.id)}>Remove</AppButton>
              </div>
            </AppCard>
          );
        })}
        {wishlistItems.length === 0 ? <EmptyState title="Wishlist is empty" body="Add an aspirational purchase and optionally tie it to a savings pot." /> : null}
      </div>
    </div>
  );
}

export function ForecastPage() {
  const { categories, forecast, recurringTransactions, transactions } = useFinanceWorkspace();
  const [whatIfReduction, setWhatIfReduction] = useState("0");
  const [pausedRecurringIds, setPausedRecurringIds] = useState<string[]>([]);

  const scenarioExpenseCut = Number(whatIfReduction || 0);
  const scenarioBalance = forecast.projectedBalance + scenarioExpenseCut;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <AppCard>
        <SectionHeading title="Cashflow Projection" subtitle="Known ledger items plus generated recurring events over the next 30 days." />
        <ForecastChart points={forecast.points} />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <AppPanel>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Current balance</p>
            <p className="mt-2 font-mono text-xl text-white">{formatCurrency(forecast.currentBalance)}</p>
          </AppPanel>
          <AppPanel>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Lowest point</p>
            <p className="mt-2 font-mono text-xl text-white">{formatCurrency(forecast.lowestBalance)}</p>
          </AppPanel>
          <AppPanel>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Projected end</p>
            <p className="mt-2 font-mono text-xl text-white">{formatCurrency(forecast.projectedBalance)}</p>
          </AppPanel>
        </div>

        <SectionHeading title="Forecast Events" subtitle="Paydays, bills, and future entries driving the curve." />
        <div className="space-y-3">
          {transactions.filter((item) => item.date >= new Date().toISOString().slice(0, 10)).slice(0, 10).map((transaction) => {
            const category = categories.find((item) => item.id === transaction.categoryId);
            return (
              <AppPanel key={transaction.id}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{transaction.description}</p>
                    <p className="mt-1 text-xs text-slate-400">{category?.name ?? "Category"} · {formatLongDate(transaction.date)}</p>
                  </div>
                  <span className={`font-mono text-sm ${category?.type === "income" ? "text-emerald-300" : "text-rose-300"}`}>
                    {category?.type === "income" ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </span>
                </div>
              </AppPanel>
            );
          })}
        </div>
      </AppCard>

      <AppCard>
        <SectionHeading title="What If Mode" subtitle="A lightweight scenario planner for quick questions." />
        <div className="grid gap-3">
          <label className="text-sm text-slate-300">
            Reduce next-month spending by
            <input value={whatIfReduction} onChange={(event) => setWhatIfReduction(event.target.value)} type="number" />
          </label>
          <AppPanel>
            <p className="text-sm text-slate-400">Scenario projected balance</p>
            <p className="mt-2 font-mono text-2xl text-white">{formatCurrency(scenarioBalance)}</p>
          </AppPanel>
        </div>

        <SectionHeading title="Pause a Recurring Cost" subtitle="A rough way to model cancelling something." />
        <div className="space-y-2">
          {recurringTransactions.filter((item) => item.type === "expense").map((item) => {
            const selected = pausedRecurringIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={`flex w-full items-center justify-between rounded-[20px] border px-4 py-3 text-left ${selected ? "border-blue-300/30 bg-blue-500/10" : "border-slate-800 bg-slate-950/30"}`}
                onClick={() =>
                  setPausedRecurringIds((current) =>
                    selected ? current.filter((id) => id !== item.id) : [...current, item.id],
                  )
                }
              >
                <span className="text-sm text-white">{item.name}</span>
                <span className="font-mono text-sm text-slate-300">{formatCurrency(item.amount)}</span>
              </button>
            );
          })}
        </div>
      </AppCard>
    </div>
  );
}

export function SettingsPage() {
  const { categories, deleteCategory, deleteSalaryProfile, handleSignOut, members, salaryProfiles, saveCategory, saveSalaryProfile, transactionHistory, workspace } = useFinanceWorkspace();
  const [categoryForm, setCategoryForm] = useState({ name: "", type: "expense" as CategoryType });
  const existingSalary = salaryProfiles[0];
  const [salaryForm, setSalaryForm] = useState({
    annualGrossSalary: existingSalary ? String(existingSalary.annualGrossSalary) : "",
    taxRegion: existingSalary?.taxRegion ?? "england_wales_ni",
    studentLoanPlan: existingSalary?.studentLoanPlan ?? "none",
    postgraduateLoan: existingSalary?.postgraduateLoan ?? false,
    taxCode: existingSalary?.taxCode ?? "1257L",
    firstPaymentDate: existingSalary?.firstPaymentDate ?? "",
    paymentFrequency: existingSalary?.paymentFrequency ?? "monthly",
  });

  useEffect(() => {
    if (!salaryProfiles[0]) return;
    const currentSalary = salaryProfiles[0];
    queueMicrotask(() => {
      setSalaryForm({
        annualGrossSalary: String(currentSalary.annualGrossSalary),
        taxRegion: currentSalary.taxRegion,
        studentLoanPlan: currentSalary.studentLoanPlan,
        postgraduateLoan: currentSalary.postgraduateLoan,
        taxCode: currentSalary.taxCode,
        firstPaymentDate: currentSalary.firstPaymentDate ?? "",
        paymentFrequency: currentSalary.paymentFrequency,
      });
    });
  }, [salaryProfiles]);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <AppCard>
        <SectionHeading title="Workspace Settings" subtitle={workspace?.name ?? "Finance Space"} />
        <div className="space-y-4">
          <AppPanel>
            <p className="text-sm text-slate-400">Members</p>
            <div className="mt-3 space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-3">
                  <span className="text-white">{member.displayName}</span>
                  <span className="text-sm text-slate-400">{member.email}</span>
                </div>
              ))}
            </div>
          </AppPanel>

          <AppPanel>
            <p className="text-sm text-slate-400">Categories</p>
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_140px_auto]">
              <input value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} placeholder="New category" />
              <select value={categoryForm.type} onChange={(event) => setCategoryForm((current) => ({ ...current, type: event.target.value as CategoryType }))}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              <AppButton onClick={() => void saveCategory(categoryForm).then(() => setCategoryForm({ name: "", type: "expense" }))}>Add</AppButton>
            </div>
            <div className="mt-4 space-y-2">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between gap-3 rounded-[18px] border border-slate-800 px-4 py-3">
                  <span className="text-white">{category.name} · {category.type}</span>
                  <button type="button" className="text-sm text-slate-400 underline underline-offset-4" onClick={() => void deleteCategory(category.id)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </AppPanel>

          <AppButton variant="ghost" onClick={() => void handleSignOut()}>
            Sign out
          </AppButton>
        </div>
      </AppCard>

      <div className="grid gap-6">
        <AppCard>
          <SectionHeading title="Salary Profile" subtitle="Feeds payroll estimates and recurring salary generation." />
          <div className="grid gap-3 md:grid-cols-2">
            <input value={salaryForm.annualGrossSalary} onChange={(event) => setSalaryForm((current) => ({ ...current, annualGrossSalary: event.target.value }))} placeholder="Annual salary" type="number" />
            <input value={salaryForm.taxCode} onChange={(event) => setSalaryForm((current) => ({ ...current, taxCode: event.target.value }))} placeholder="Tax code" />
            <select value={salaryForm.taxRegion} onChange={(event) => setSalaryForm((current) => ({ ...current, taxRegion: event.target.value as typeof current.taxRegion }))}>
              <option value="england_wales_ni">England / Wales / NI</option>
              <option value="scotland">Scotland</option>
            </select>
            <select value={salaryForm.studentLoanPlan} onChange={(event) => setSalaryForm((current) => ({ ...current, studentLoanPlan: event.target.value as typeof current.studentLoanPlan }))}>
              <option value="none">No student loan</option>
              <option value="plan1">Plan 1</option>
              <option value="plan2">Plan 2</option>
              <option value="plan4">Plan 4</option>
              <option value="plan5">Plan 5</option>
            </select>
            <input value={salaryForm.firstPaymentDate} onChange={(event) => setSalaryForm((current) => ({ ...current, firstPaymentDate: event.target.value }))} type="date" />
            <select value={salaryForm.paymentFrequency} onChange={(event) => setSalaryForm((current) => ({ ...current, paymentFrequency: event.target.value as typeof current.paymentFrequency }))}>
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
            </select>
            <label className="flex items-center gap-3 text-sm text-slate-300 md:col-span-2">
              <input checked={salaryForm.postgraduateLoan} onChange={(event) => setSalaryForm((current) => ({ ...current, postgraduateLoan: event.target.checked }))} type="checkbox" />
              Postgraduate loan enabled
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <AppButton onClick={() => void saveSalaryProfile({
              annualGrossSalary: Number(salaryForm.annualGrossSalary),
              taxRegion: salaryForm.taxRegion,
              studentLoanPlan: salaryForm.studentLoanPlan,
              postgraduateLoan: salaryForm.postgraduateLoan,
              taxCode: salaryForm.taxCode,
              firstPaymentDate: salaryForm.firstPaymentDate,
              paymentFrequency: salaryForm.paymentFrequency,
            })}>
              Save salary profile
            </AppButton>
            <AppButton variant="ghost" onClick={() => void deleteSalaryProfile()}>
              Remove salary profile
            </AppButton>
          </div>
        </AppCard>

        <AppCard>
          <SectionHeading title="Transaction History" subtitle="Light audit trail for edits and deletions." />
          <div className="space-y-3">
            {transactionHistory.slice(0, 10).map((entry) => (
              <AppPanel key={entry.id}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{titleCase(entry.action)} transaction</p>
                    <p className="mt-1 text-xs text-slate-400">{formatLongDate(entry.createdAt)}</p>
                  </div>
                  <span className="text-xs uppercase tracking-[0.16em] text-slate-500">{entry.action}</span>
                </div>
              </AppPanel>
            ))}
            {transactionHistory.length === 0 ? <EmptyState title="No audit trail yet" body="Edits and deletions will start showing here as you use the upgraded ledger." /> : null}
          </div>
        </AppCard>
      </div>
    </div>
  );
}
