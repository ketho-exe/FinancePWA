import type {
  Budget,
  Category,
  Profile,
  SavingsGoal,
  Transaction,
  Workspace,
} from "@/lib/types";

export const profiles: Profile[] = [
  {
    id: "user_1",
    email: "you@example.com",
    displayName: "You",
  },
  {
    id: "user_2",
    email: "partner@example.com",
    displayName: "Alex",
  },
];

export const workspace: Workspace = {
  id: "workspace_home",
  name: "Home Finances",
  members: profiles,
};

export const categories: Category[] = [
  { id: "cat_groceries", workspaceId: workspace.id, name: "Groceries", type: "expense", color: "#6fcf97" },
  { id: "cat_rent", workspaceId: workspace.id, name: "Rent", type: "expense", color: "#5b7cfa" },
  { id: "cat_coffee", workspaceId: workspace.id, name: "Coffee", type: "expense", color: "#f2994a" },
  { id: "cat_transport", workspaceId: workspace.id, name: "Transport", type: "expense", color: "#56ccf2" },
  { id: "cat_salary", workspaceId: workspace.id, name: "Salary", type: "income", color: "#27ae60" },
  { id: "cat_freelance", workspaceId: workspace.id, name: "Freelance", type: "income", color: "#9b51e0" },
];

export const transactions: Transaction[] = [
  {
    id: "txn_1",
    workspaceId: workspace.id,
    categoryId: "cat_salary",
    amount: 2800,
    description: "Monthly salary",
    date: "2026-04-01",
    createdBy: "user_1",
  },
  {
    id: "txn_2",
    workspaceId: workspace.id,
    categoryId: "cat_rent",
    amount: 1050,
    description: "April rent",
    date: "2026-04-02",
    createdBy: "user_1",
  },
  {
    id: "txn_3",
    workspaceId: workspace.id,
    categoryId: "cat_groceries",
    amount: 84.5,
    description: "Weekly shop",
    date: "2026-04-05",
    createdBy: "user_2",
  },
  {
    id: "txn_4",
    workspaceId: workspace.id,
    categoryId: "cat_transport",
    amount: 22.4,
    description: "Train tickets",
    date: "2026-04-08",
    createdBy: "user_1",
  },
  {
    id: "txn_5",
    workspaceId: workspace.id,
    categoryId: "cat_coffee",
    amount: 9.8,
    description: "Coffee catch-up",
    date: "2026-04-10",
    createdBy: "user_2",
  },
  {
    id: "txn_6",
    workspaceId: workspace.id,
    categoryId: "cat_groceries",
    amount: 56.2,
    description: "Top-up groceries",
    date: "2026-04-14",
    createdBy: "user_1",
  },
  {
    id: "txn_7",
    workspaceId: workspace.id,
    categoryId: "cat_freelance",
    amount: 420,
    description: "Side project invoice",
    date: "2026-04-16",
    createdBy: "user_1",
  },
];

export const budgets: Budget[] = [
  { id: "budget_1", workspaceId: workspace.id, categoryId: "cat_groceries", month: "2026-04", amount: 320 },
  { id: "budget_2", workspaceId: workspace.id, categoryId: "cat_coffee", month: "2026-04", amount: 60 },
  { id: "budget_3", workspaceId: workspace.id, categoryId: "cat_transport", month: "2026-04", amount: 120 },
  { id: "budget_4", workspaceId: workspace.id, categoryId: "cat_rent", month: "2026-04", amount: 1050 },
];

export const savingsGoals: SavingsGoal[] = [
  {
    id: "goal_general",
    workspaceId: workspace.id,
    name: "General savings",
    targetAmount: null,
    currentAmount: 1840,
    monthlyContribution: 250,
    note: "Flexible buffer for anything unexpected or worth doing later.",
  },
  {
    id: "goal_holiday",
    workspaceId: workspace.id,
    name: "Summer trip",
    targetAmount: 2400,
    currentAmount: 1125,
    monthlyContribution: 180,
    note: "Flights, hotel, and spending money for a week away.",
  },
  {
    id: "goal_emergency",
    workspaceId: workspace.id,
    name: "Emergency fund",
    targetAmount: 5000,
    currentAmount: 3100,
    monthlyContribution: 220,
    note: "Longer-term safety net for the household.",
  },
];
