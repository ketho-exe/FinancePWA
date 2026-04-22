"use client";

import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type {
  Budget,
  Category,
  CategoryType,
  Profile,
  SalaryFrequency,
  SalaryProfile,
  SavingsGoal,
  SavingsGoalEntry,
  StudentLoanPlan,
  TaxRegion,
  Transaction,
} from "@/lib/types";
import {
  calculateSalaryBreakdown,
  getSalaryPeriodTakeHome,
} from "@/lib/payroll";
import { supabaseBrowserClient } from "@/lib/supabase";
import { formatCurrency, formatMonthLabel, formatShortDate } from "@/lib/utils";

const hasSupabase = Boolean(supabaseBrowserClient);
const supabase = supabaseBrowserClient as NonNullable<typeof supabaseBrowserClient>;

const today = new Date().toISOString().slice(0, 10);
const currentMonth = today.slice(0, 7);
const currentMonthDate = `${currentMonth}-01`;

const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "transactions", label: "Transactions" },
  { id: "add", label: "Add" },
  { id: "budgets", label: "Budgets" },
  { id: "settings", label: "Settings" },
] as const;

const defaultCategoryPalette = [
  "#6fcf97",
  "#5b7cfa",
  "#f2994a",
  "#56ccf2",
  "#ff7a90",
  "#c084fc",
  "#facc15",
  "#2dd4bf",
];

const starterCategories: Array<{ name: string; type: CategoryType; color: string }> = [
  { name: "Groceries", type: "expense", color: "#6fcf97" },
  { name: "Rent", type: "expense", color: "#5b7cfa" },
  { name: "Transport", type: "expense", color: "#56ccf2" },
  { name: "Coffee", type: "expense", color: "#f2994a" },
  { name: "Salary", type: "income", color: "#27ae60" },
];

type TabId = (typeof tabs)[number]["id"];

type WorkspaceSummary = {
  id: string;
  name: string;
};

type TransactionForm = {
  amount: string;
  categoryId: string;
  date: string;
  description: string;
  type: CategoryType;
};

type CategoryForm = {
  name: string;
  type: CategoryType;
};

type BudgetForm = {
  categoryId: string;
  amount: string;
};

type SavingsForm = {
  name: string;
  targetAmount: string;
  currentAmount: string;
  monthlyContribution: string;
  note: string;
};

type SavingsAdjustmentForm = {
  savingsGoalId: string;
  amount: string;
  direction: "add" | "remove";
  date: string;
  note: string;
};

type SalaryForm = {
  annualGrossSalary: string;
  taxRegion: TaxRegion;
  studentLoanPlan: StudentLoanPlan;
  postgraduateLoan: boolean;
  taxCode: string;
  firstPaymentDate: string;
  paymentFrequency: SalaryFrequency;
};

type AuthMode = "sign-in" | "sign-up";

type DbProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
};

type DbWorkspaceRow = {
  id: string;
  name: string;
};

type DbWorkspaceMemberRow = {
  user_id: string;
  role: string;
};

type DbCategoryRow = {
  id: string;
  workspace_id: string;
  name: string;
  type: CategoryType;
  color: string;
};

type DbTransactionRow = {
  id: string;
  workspace_id: string;
  category_id: string;
  amount: number;
  description: string;
  transaction_date: string;
  created_by: string;
  salary_profile_id?: string | null;
  generated_source?: string | null;
};

type DbBudgetRow = {
  id: string;
  workspace_id: string;
  category_id: string;
  month: string;
  amount: number;
};

type DbSavingsGoalRow = {
  id: string;
  workspace_id: string;
  name: string;
  target_amount: number | null;
  current_amount: number;
  monthly_contribution: number;
  note: string;
};

type DbSavingsGoalEntryRow = {
  id: string;
  savings_goal_id: string;
  amount_delta: number;
  entry_date: string;
  note: string;
  created_by: string;
};

type DbSalaryProfileRow = {
  id: string;
  workspace_id: string;
  profile_id: string;
  annual_gross_salary: number;
  tax_region: TaxRegion;
  student_loan_plan: StudentLoanPlan;
  postgraduate_loan: boolean;
  tax_code: string;
  first_payment_date: string | null;
  payment_frequency: SalaryFrequency;
};

function mapProfile(row: DbProfileRow): Profile {
  return {
    id: row.id,
    email: row.email ?? "",
    displayName: row.display_name ?? "Member",
  };
}

function mapCategory(row: DbCategoryRow): Category {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    type: row.type,
    color: row.color,
  };
}

function mapTransaction(row: DbTransactionRow): Transaction {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    categoryId: row.category_id,
    amount: Number(row.amount),
    description: row.description,
    date: row.transaction_date,
    createdBy: row.created_by,
  };
}

function mapBudget(row: DbBudgetRow): Budget {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    categoryId: row.category_id,
    month: row.month.slice(0, 7),
    amount: Number(row.amount),
  };
}

function mapSavingsGoal(row: DbSavingsGoalRow): SavingsGoal {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    targetAmount: row.target_amount === null ? null : Number(row.target_amount),
    currentAmount: Number(row.current_amount),
    monthlyContribution: Number(row.monthly_contribution),
    note: row.note,
  };
}

function mapSavingsGoalEntry(row: DbSavingsGoalEntryRow): SavingsGoalEntry {
  return {
    id: row.id,
    savingsGoalId: row.savings_goal_id,
    amountDelta: Number(row.amount_delta),
    entryDate: row.entry_date,
    note: row.note,
    createdBy: row.created_by,
  };
}

function mapSalaryProfile(row: DbSalaryProfileRow): SalaryProfile {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    profileId: row.profile_id,
    annualGrossSalary: Number(row.annual_gross_salary),
    taxRegion: row.tax_region,
    studentLoanPlan: row.student_loan_plan,
    postgraduateLoan: row.postgraduate_loan,
    taxCode: row.tax_code,
    firstPaymentDate: row.first_payment_date,
    paymentFrequency: row.payment_frequency,
  };
}

function getMonthBounds(month: string) {
  const start = new Date(`${month}-01T00:00:00`);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  return { start, end };
}

function getRecurringDatesInMonth(
  firstPaymentDate: string,
  frequency: SalaryFrequency,
  month: string,
) {
  const { start, end } = getMonthBounds(month);
  const anchor = new Date(`${firstPaymentDate}T00:00:00`);
  const dates: string[] = [];

  if (frequency === "monthly") {
    const day = anchor.getDate();
    const runDate = new Date(start.getFullYear(), start.getMonth(), Math.min(day, end.getDate()));
    if (runDate >= anchor) dates.push(runDate.toISOString().slice(0, 10));
    return dates;
  }

  const stepDays = frequency === "weekly" ? 7 : 14;
  const cursor = new Date(anchor);
  while (cursor < start) {
    cursor.setDate(cursor.getDate() + stepDays);
  }
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + stepDays);
  }

  return dates;
}

async function ensureSalaryTransactions(params: {
  workspaceId: string;
  userId: string;
  categories: Category[];
  transactions: Transaction[];
  salaryProfiles: SalaryProfile[];
}) {
  const salaryCategory = params.categories.find(
    (category) => category.type === "income" && category.name.toLowerCase() === "salary",
  );

  if (!salaryCategory) return;

  for (const salaryProfile of params.salaryProfiles) {
    if (!salaryProfile.firstPaymentDate) continue;

    const dueDates = getRecurringDatesInMonth(
      salaryProfile.firstPaymentDate,
      salaryProfile.paymentFrequency,
      currentMonth,
    );

    const breakdown = calculateSalaryBreakdown(salaryProfile);
    const periodTakeHome = getSalaryPeriodTakeHome(
      breakdown.annualTakeHome,
      salaryProfile.paymentFrequency,
    );

    for (const dueDate of dueDates) {
      const existing = params.transactions.find(
        (transaction) =>
          transaction.createdBy === salaryProfile.profileId &&
          transaction.categoryId === salaryCategory.id &&
          transaction.date === dueDate &&
          transaction.description === "Salary",
      );

      if (existing) continue;

      const { error } = await supabase.from("transactions").insert({
        workspace_id: params.workspaceId,
        category_id: salaryCategory.id,
        amount: Number(periodTakeHome.toFixed(2)),
        description: "Salary",
        transaction_date: dueDate,
        created_by: salaryProfile.profileId,
        salary_profile_id: salaryProfile.id,
        generated_source: "salary_schedule",
      });

      if (error && error.code !== "42703") {
        throw error;
      }
    }
  }
}

async function ensureProfile(user: User) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, display_name")
      .eq("id", user.id)
      .maybeSingle<DbProfileRow>();

    if (error) throw error;
    if (data) return mapProfile(data);

    const displayName =
      typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name.trim()
        ? user.user_metadata.display_name.trim()
        : user.email?.split("@")[0] ?? "Member";

    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      email: user.email ?? null,
      display_name: displayName,
    });

    if (insertError && insertError.code !== "23505") {
      throw insertError;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 400 * (attempt + 1));
    });
  }

  throw new Error("Profile not found yet. If you just signed up, try refreshing in a few seconds.");
}

async function ensureWorkspace(userId: string) {
  const { data: membershipRows, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId)
    .returns<Array<{ workspace_id: string; role: string }>>();

  if (membershipError) throw membershipError;

  if (membershipRows && membershipRows.length > 0) {
    return membershipRows[0].workspace_id;
  }

  const workspaceId = crypto.randomUUID();

  const { error: workspaceError } = await supabase
    .from("workspaces")
    .insert({
      id: workspaceId,
      name: "My Finance Space",
      created_by: userId,
    });

  if (workspaceError) throw workspaceError;

  const { error: memberInsertError } = await supabase.from("workspace_members").insert({
    workspace_id: workspaceId,
    user_id: userId,
    role: "owner",
  });

  if (memberInsertError) throw memberInsertError;

  const { error: categoriesError } = await supabase.from("categories").insert(
    starterCategories.map((category) => ({
      workspace_id: workspaceId,
      name: category.name,
      type: category.type,
      color: category.color,
      created_by: userId,
    })),
  );

  if (categoriesError) throw categoriesError;

  return workspaceId;
}

async function loadWorkspaceBundle(user: User) {
  const profile = await ensureProfile(user);
  const workspaceId = await ensureWorkspace(user.id);

  const [
    workspaceResult,
    memberResult,
    categoryResult,
    transactionResult,
    budgetResult,
    savingsResult,
    salaryResult,
    savingsEntryResult,
  ] = await Promise.all([
    supabase.from("workspaces").select("id, name").eq("id", workspaceId).single<DbWorkspaceRow>(),
    supabase
      .from("workspace_members")
      .select("user_id, role")
      .eq("workspace_id", workspaceId)
      .returns<DbWorkspaceMemberRow[]>(),
    supabase
      .from("categories")
      .select("id, workspace_id, name, type, color")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true })
      .returns<DbCategoryRow[]>(),
    supabase
      .from("transactions")
      .select("id, workspace_id, category_id, amount, description, transaction_date, created_by")
      .eq("workspace_id", workspaceId)
      .order("transaction_date", { ascending: false })
      .returns<DbTransactionRow[]>(),
    supabase
      .from("budgets")
      .select("id, workspace_id, category_id, month, amount")
      .eq("workspace_id", workspaceId)
      .returns<DbBudgetRow[]>(),
    supabase
      .from("savings_goals")
      .select("id, workspace_id, name, target_amount, current_amount, monthly_contribution, note")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true })
      .returns<DbSavingsGoalRow[]>(),
    supabase
      .from("salary_profiles")
      .select("id, workspace_id, profile_id, annual_gross_salary, tax_region, student_loan_plan, postgraduate_loan, tax_code, first_payment_date, payment_frequency")
      .eq("workspace_id", workspaceId)
      .returns<DbSalaryProfileRow[]>(),
    supabase
      .from("savings_goal_entries")
      .select("id, savings_goal_id, amount_delta, entry_date, note, created_by")
      .order("entry_date", { ascending: false })
      .returns<DbSavingsGoalEntryRow[]>(),
  ]);

  if (workspaceResult.error) throw workspaceResult.error;
  if (memberResult.error) throw memberResult.error;
  if (categoryResult.error) throw categoryResult.error;
  if (transactionResult.error) throw transactionResult.error;
  if (budgetResult.error) throw budgetResult.error;
  if (savingsResult.error) throw savingsResult.error;
  if (salaryResult.error && salaryResult.error.code !== "42P01") throw salaryResult.error;
  if (savingsEntryResult.error && savingsEntryResult.error.code !== "42P01") throw savingsEntryResult.error;

  const memberIds = (memberResult.data ?? []).map((row) => row.user_id);
  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, display_name")
    .in("id", memberIds)
    .returns<DbProfileRow[]>();

  if (profileError) throw profileError;

  const mappedCategories = (categoryResult.data ?? []).map(mapCategory);
  const mappedTransactions = (transactionResult.data ?? []).map(mapTransaction);
  const mappedSalaryProfiles = (salaryResult.data ?? []).map(mapSalaryProfile);

  await ensureSalaryTransactions({
    workspaceId,
    userId: user.id,
    categories: mappedCategories,
    transactions: mappedTransactions,
    salaryProfiles: mappedSalaryProfiles,
  });

  const { data: refreshedTransactions, error: refreshedTransactionsError } = await supabase
    .from("transactions")
    .select("id, workspace_id, category_id, amount, description, transaction_date, created_by, salary_profile_id, generated_source")
    .eq("workspace_id", workspaceId)
    .order("transaction_date", { ascending: false })
    .returns<DbTransactionRow[]>();

  if (refreshedTransactionsError) throw refreshedTransactionsError;

  return {
    profile,
    workspace: workspaceResult.data,
    members: (profileRows ?? []).map(mapProfile),
    categories: mappedCategories,
    transactions: (refreshedTransactions ?? []).map(mapTransaction),
    budgets: (budgetResult.data ?? []).map(mapBudget),
    savingsGoals: (savingsResult.data ?? []).map(mapSavingsGoal),
    salaryProfiles: mappedSalaryProfiles,
    savingsGoalEntries: (savingsEntryResult.data ?? []).map(mapSavingsGoalEntry),
  };
}

export function FinanceApp() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(hasSupabase);
  const [dataLoading, setDataLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [authMessage, setAuthMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [dataError, setDataError] = useState("");

  const [authForm, setAuthForm] = useState({
    email: "",
    password: "",
    displayName: "",
  });

  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [salaryProfiles, setSalaryProfiles] = useState<SalaryProfile[]>([]);
  const [savingsGoalEntries, setSavingsGoalEntries] = useState<SavingsGoalEntry[]>([]);
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const [transactionForm, setTransactionForm] = useState<TransactionForm>({
    amount: "",
    categoryId: "",
    date: today,
    description: "",
    type: "expense",
  });
  const [categoryForm, setCategoryForm] = useState<CategoryForm>({
    name: "",
    type: "expense",
  });
  const [budgetForm, setBudgetForm] = useState<BudgetForm>({
    categoryId: "",
    amount: "",
  });
  const [savingsForm, setSavingsForm] = useState<SavingsForm>({
    name: "",
    targetAmount: "",
    currentAmount: "",
    monthlyContribution: "",
    note: "",
  });
  const [savingsAdjustmentForm, setSavingsAdjustmentForm] = useState<SavingsAdjustmentForm>({
    savingsGoalId: "",
    amount: "",
    direction: "add",
    date: today,
    note: "",
  });
  const [salaryForm, setSalaryForm] = useState<SalaryForm>({
    annualGrossSalary: "",
    taxRegion: "england_wales_ni",
    studentLoanPlan: "none",
    postgraduateLoan: false,
    taxCode: "1257L",
    firstPaymentDate: "",
    paymentFrequency: "monthly",
  });

  const expenseCategories = categories.filter((category) => category.type === "expense");
  const incomeCategories = categories.filter((category) => category.type === "income");

  useEffect(() => {
    if (!hasSupabase) return;

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (!data.session) {
        setWorkspace(null);
        setMembers([]);
        setCategories([]);
        setTransactions([]);
        setBudgets([]);
        setSavingsGoals([]);
        setSalaryProfiles([]);
        setSavingsGoalEntries([]);
      }
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (!nextSession) {
        setWorkspace(null);
        setMembers([]);
        setCategories([]);
        setTransactions([]);
        setBudgets([]);
        setSavingsGoals([]);
        setSalaryProfiles([]);
        setSavingsGoalEntries([]);
      }
      setAuthLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!hasSupabase) return;
    if (!session?.user) return;

    let active = true;
    const user = session.user;
    const userId = user.id;

    async function load() {
      setDataLoading(true);
      setDataError("");

      try {
        const bundle = await loadWorkspaceBundle(user);
        if (!active) return;

        setWorkspace(bundle.workspace);
        setMembers(bundle.members);
        setCategories(bundle.categories);
        setTransactions(bundle.transactions);
        setBudgets(bundle.budgets);
        setSavingsGoals(bundle.savingsGoals);
        setSalaryProfiles(bundle.salaryProfiles);
        setSavingsGoalEntries(bundle.savingsGoalEntries);
        const ownSalary = bundle.salaryProfiles.find((item) => item.profileId === userId);
        if (ownSalary) {
          setSalaryForm({
            annualGrossSalary: String(ownSalary.annualGrossSalary),
            taxRegion: ownSalary.taxRegion,
            studentLoanPlan: ownSalary.studentLoanPlan,
            postgraduateLoan: ownSalary.postgraduateLoan,
            taxCode: ownSalary.taxCode,
            firstPaymentDate: ownSalary.firstPaymentDate ?? "",
            paymentFrequency: ownSalary.paymentFrequency,
          });
        }
      } catch (error) {
        if (!active) return;
        setDataError(
          error instanceof Error
            ? error.message
            : typeof error === "object" && error !== null && "message" in error
              ? String(error.message)
              : JSON.stringify(error),
        );
      } finally {
        if (active) setDataLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [session]);

  const monthTransactions = transactions.filter((transaction) =>
    transaction.date.startsWith(currentMonth),
  );

  const expenseTotal = monthTransactions.reduce((sum, transaction) => {
    const category = categories.find((item) => item.id === transaction.categoryId);
    return category?.type === "expense" ? sum + transaction.amount : sum;
  }, 0);

  const incomeTotal = monthTransactions.reduce((sum, transaction) => {
    const category = categories.find((item) => item.id === transaction.categoryId);
    return category?.type === "income" ? sum + transaction.amount : sum;
  }, 0);

  const budgetTotal = budgets
    .filter((budget) => budget.month === currentMonth)
    .reduce((sum, budget) => sum + budget.amount, 0);
  const remainingBudget = budgetTotal - expenseTotal;
  const totalSavings = savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const totalMonthlySavings = savingsGoals.reduce(
    (sum, goal) => sum + goal.monthlyContribution,
    0,
  );
  const salaryRows = salaryProfiles.map((salaryProfile) => {
    const member = members.find((memberItem) => memberItem.id === salaryProfile.profileId);
    return {
      salaryProfile,
      memberName: member?.displayName ?? "Member",
      breakdown: calculateSalaryBreakdown(salaryProfile),
    };
  });
  const currentUserSalary = salaryProfiles.find((item) => item.profileId === session?.user?.id) ?? null;
  const selectedSavingsGoalId = savingsGoals.some(
    (goal) => goal.id === savingsAdjustmentForm.savingsGoalId,
  )
    ? savingsAdjustmentForm.savingsGoalId
    : savingsGoals[0]?.id ?? "";

  const budgetRows = budgets
    .filter((budget) => budget.month === currentMonth)
    .map((budget) => {
      const category = categories.find((item) => item.id === budget.categoryId);
      const spent = monthTransactions.reduce((sum, transaction) => {
        if (transaction.categoryId !== budget.categoryId) return sum;
        return sum + transaction.amount;
      }, 0);

      return {
        ...budget,
        categoryName: category?.name ?? "Unknown",
        color: category?.color ?? "#d9d9d9",
        spent,
        remaining: budget.amount - spent,
        progress: budget.amount > 0 ? Math.min(spent / budget.amount, 1) : 0,
      };
    });

  const categoryRows = expenseCategories.map((category) => {
    const spent = monthTransactions.reduce((sum, transaction) => {
      if (transaction.categoryId !== category.id) return sum;
      return sum + transaction.amount;
    }, 0);

    return {
      ...category,
      spent,
    };
  });

  const recentTransactions = monthTransactions
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const filteredCategoryOptions =
    transactionForm.type === "expense" ? expenseCategories : incomeCategories;
  const selectedTransactionCategoryId = filteredCategoryOptions.some(
    (category) => category.id === transactionForm.categoryId,
  )
    ? transactionForm.categoryId
    : filteredCategoryOptions[0]?.id ?? "";
  const selectedBudgetCategoryId = expenseCategories.some(
    (category) => category.id === budgetForm.categoryId,
  )
    ? budgetForm.categoryId
    : expenseCategories[0]?.id ?? "";

  async function refreshWorkspaceData() {
    if (!session?.user) return;

    const bundle = await loadWorkspaceBundle(session.user);
    setWorkspace(bundle.workspace);
    setMembers(bundle.members);
    setCategories(bundle.categories);
    setTransactions(bundle.transactions);
    setBudgets(bundle.budgets);
    setSavingsGoals(bundle.savingsGoals);
    setSalaryProfiles(bundle.salaryProfiles);
    setSavingsGoalEntries(bundle.savingsGoalEntries);
    const ownSalary = bundle.salaryProfiles.find((item) => item.profileId === session.user.id);
    if (ownSalary) {
      setSalaryForm({
        annualGrossSalary: String(ownSalary.annualGrossSalary),
        taxRegion: ownSalary.taxRegion,
        studentLoanPlan: ownSalary.studentLoanPlan,
        postgraduateLoan: ownSalary.postgraduateLoan,
        taxCode: ownSalary.taxCode,
        firstPaymentDate: ownSalary.firstPaymentDate ?? "",
        paymentFrequency: ownSalary.paymentFrequency,
      });
    }
  }

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timeout);
  }, [toast]);

  async function handleAuthSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthMessage("");

    try {
      if (authMode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({
          email: authForm.email,
          password: authForm.password,
        });

        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: authForm.email,
          password: authForm.password,
          options: {
            data: {
              display_name: authForm.displayName,
            },
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) throw error;
        setAuthMessage("Check your email if Supabase asks you to confirm your account.");
      }
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleMagicLink() {
    setAuthBusy(true);
    setAuthMessage("");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: authForm.email,
        options: {
          emailRedirectTo: window.location.origin,
          shouldCreateUser: true,
          data: {
            display_name: authForm.displayName,
          },
        },
      });

      if (error) throw error;
      setAuthMessage("Magic link sent. Open your email to continue.");
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Unable to send magic link.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  async function addTransaction() {
    if (!session?.user || !workspace) return;

    const amount = Number(transactionForm.amount);
    if (!selectedTransactionCategoryId || !transactionForm.description.trim() || Number.isNaN(amount)) {
      return;
    }

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        workspace_id: workspace.id,
        category_id: selectedTransactionCategoryId,
        amount,
        description: transactionForm.description.trim(),
        transaction_date: transactionForm.date,
        created_by: session.user.id,
      })
      .select("id, workspace_id, category_id, amount, description, transaction_date, created_by")
      .single<DbTransactionRow>();

    if (error) {
      setDataError(error.message);
      setToast({ kind: "error", message: error.message });
      return;
    }

    if (data) {
      setTransactions((current) => [mapTransaction(data), ...current]);
    } else {
      await refreshWorkspaceData();
    }
    setTransactionForm((current) => ({
      ...current,
      amount: "",
      description: "",
    }));
    setToast({ kind: "success", message: "Transaction saved" });
    setActiveTab("transactions");
  }

  async function addCategory() {
    if (!session?.user || !workspace) return;

    const name = categoryForm.name.trim();
    if (!name) return;

    const { error } = await supabase.from("categories").insert({
      workspace_id: workspace.id,
      name,
      type: categoryForm.type,
      color: defaultCategoryPalette[categories.length % defaultCategoryPalette.length] ?? "#6fcf97",
      created_by: session.user.id,
    });

    if (error) {
      setDataError(error.message);
      setToast({ kind: "error", message: error.message });
      return;
    }

    await refreshWorkspaceData();
    setCategoryForm((current) => ({ ...current, name: "" }));
    setToast({ kind: "success", message: "Category added" });
  }

  async function deleteCategory(categoryId: string) {
    const { error } = await supabase.from("categories").delete().eq("id", categoryId);

    if (error) {
      setDataError(error.message);
      setToast({
        kind: "error",
        message: "Category could not be removed. It may still be used by transactions or budgets.",
      });
      return;
    }

    await refreshWorkspaceData();
    setToast({ kind: "success", message: "Category removed" });
  }

  async function addBudget() {
    if (!session?.user || !workspace) return;

    const amount = Number(budgetForm.amount);
    if (!selectedBudgetCategoryId || Number.isNaN(amount)) return;

    const existingBudget = budgets.find(
      (budget) => budget.categoryId === selectedBudgetCategoryId && budget.month === currentMonth,
    );

    if (existingBudget) {
      const { error } = await supabase
        .from("budgets")
        .update({ amount })
        .eq("id", existingBudget.id);

      if (error) {
        setDataError(error.message);
        setToast({ kind: "error", message: error.message });
        return;
      }
    } else {
      const { error } = await supabase.from("budgets").insert({
        workspace_id: workspace.id,
        category_id: selectedBudgetCategoryId,
        month: currentMonthDate,
        amount,
        created_by: session.user.id,
      });

      if (error) {
        setDataError(error.message);
        setToast({ kind: "error", message: error.message });
        return;
      }
    }

    await refreshWorkspaceData();
    setBudgetForm((current) => ({ ...current, amount: "" }));
    setToast({ kind: "success", message: "Budget saved" });
    setActiveTab("budgets");
  }

  async function deleteBudget(budgetId: string) {
    const { error } = await supabase.from("budgets").delete().eq("id", budgetId);

    if (error) {
      setDataError(error.message);
      setToast({ kind: "error", message: error.message });
      return;
    }

    await refreshWorkspaceData();
    setToast({ kind: "success", message: "Budget removed" });
  }

  async function addSavingsGoal() {
    if (!session?.user || !workspace) return;

    const currentAmount = Number(savingsForm.currentAmount);
    const monthlyContribution = Number(savingsForm.monthlyContribution);
    const targetAmount =
      savingsForm.targetAmount.trim() === "" ? null : Number(savingsForm.targetAmount);

    if (!savingsForm.name.trim() || Number.isNaN(currentAmount) || Number.isNaN(monthlyContribution)) {
      return;
    }

    if (targetAmount !== null && Number.isNaN(targetAmount)) {
      return;
    }

    const { error } = await supabase.from("savings_goals").insert({
      workspace_id: workspace.id,
      name: savingsForm.name.trim(),
      target_amount: targetAmount,
      current_amount: currentAmount,
      monthly_contribution: monthlyContribution,
      note: savingsForm.note.trim(),
      created_by: session.user.id,
    });

    if (error) {
      setDataError(error.message);
      setToast({ kind: "error", message: error.message });
      return;
    }

    await refreshWorkspaceData();
    setSavingsForm({
      name: "",
      targetAmount: "",
      currentAmount: "",
      monthlyContribution: "",
      note: "",
    });
    setToast({ kind: "success", message: "Savings goal added" });
  }

  async function deleteSavingsGoal(goalId: string) {
    const { error } = await supabase.from("savings_goals").delete().eq("id", goalId);

    if (error) {
      setDataError(error.message);
      setToast({ kind: "error", message: error.message });
      return;
    }

    await refreshWorkspaceData();
    setToast({ kind: "success", message: "Savings goal removed" });
  }

  async function saveSalaryProfile() {
    if (!session?.user || !workspace) return;

    const annualGrossSalary = Number(salaryForm.annualGrossSalary);
    if (Number.isNaN(annualGrossSalary)) return;

    const existing = salaryProfiles.find((item) => item.profileId === session.user.id);

    if (existing) {
      const { error } = await supabase
        .from("salary_profiles")
        .update({
          annual_gross_salary: annualGrossSalary,
          tax_region: salaryForm.taxRegion,
          student_loan_plan: salaryForm.studentLoanPlan,
          postgraduate_loan: salaryForm.postgraduateLoan,
          tax_code: salaryForm.taxCode.trim() || "1257L",
          first_payment_date: salaryForm.firstPaymentDate || null,
          payment_frequency: salaryForm.paymentFrequency,
        })
        .eq("id", existing.id);

      if (error) {
        setDataError(error.message);
        setToast({ kind: "error", message: error.message });
        return;
      }
    } else {
      const { error } = await supabase.from("salary_profiles").insert({
        workspace_id: workspace.id,
        profile_id: session.user.id,
        annual_gross_salary: annualGrossSalary,
        tax_region: salaryForm.taxRegion,
        student_loan_plan: salaryForm.studentLoanPlan,
        postgraduate_loan: salaryForm.postgraduateLoan,
        tax_code: salaryForm.taxCode.trim() || "1257L",
        first_payment_date: salaryForm.firstPaymentDate || null,
        payment_frequency: salaryForm.paymentFrequency,
      });

      if (error) {
        setDataError(error.message);
        setToast({ kind: "error", message: error.message });
        return;
      }
    }

    await refreshWorkspaceData();
    setToast({ kind: "success", message: "Salary saved" });
  }

  async function deleteSalaryProfile() {
    const existing = salaryProfiles.find((item) => item.profileId === session?.user?.id);
    if (!existing) return;

    const { error } = await supabase.from("salary_profiles").delete().eq("id", existing.id);

    if (error) {
      setDataError(error.message);
      setToast({ kind: "error", message: error.message });
      return;
    }

    await refreshWorkspaceData();
    setSalaryForm({
      annualGrossSalary: "",
      taxRegion: "england_wales_ni",
      studentLoanPlan: "none",
      postgraduateLoan: false,
      taxCode: "1257L",
      firstPaymentDate: "",
      paymentFrequency: "monthly",
    });
    setToast({ kind: "success", message: "Salary profile removed" });
  }

  async function adjustSavingsGoal() {
    if (!selectedSavingsGoalId) return;

    const amount = Number(savingsAdjustmentForm.amount);
    if (Number.isNaN(amount) || amount <= 0) return;

    const delta =
      savingsAdjustmentForm.direction === "add" ? amount : amount * -1;

    const { error } = await supabase.rpc("adjust_savings_goal", {
      target_goal_id: selectedSavingsGoalId,
      delta,
      adjustment_note: savingsAdjustmentForm.note.trim(),
      adjustment_date: savingsAdjustmentForm.date,
    });

    if (error) {
      setDataError(error.message);
      setToast({ kind: "error", message: error.message });
      return;
    }

    await refreshWorkspaceData();
    setSavingsAdjustmentForm((current) => ({
      ...current,
      amount: "",
      note: "",
    }));
    setToast({
      kind: "success",
      message: savingsAdjustmentForm.direction === "add" ? "Money added to pot" : "Money removed from pot",
    });
  }

  if (authLoading) {
    return <LoadingScreen label="Checking your session..." />;
  }

  if (!hasSupabase) {
    return <ConfigScreen />;
  }

  if (!session) {
    return (
      <AuthScreen
        authBusy={authBusy}
        authForm={authForm}
        authMessage={authMessage}
        authMode={authMode}
        onChange={setAuthForm}
        onMagicLink={handleMagicLink}
        onModeChange={setAuthMode}
        onSubmit={handleAuthSubmit}
      />
    );
  }

  if (dataLoading && !workspace) {
    return <LoadingScreen label="Loading your finance space..." />;
  }

  return (
    <main className="app-page-shell">
      <div className="mx-auto min-h-screen w-full max-w-[var(--layout-max-width-wide)] px-4 pb-8 pt-4 sm:px-6 lg:px-8 lg:pb-12 lg:pt-6">
        {toast ? <ToastBanner kind={toast.kind} message={toast.message} /> : null}
        <section className="app-hero animate-[panel-in_var(--duration-slow)_var(--easing-decelerate)] p-4 sm:p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] app-section-eyebrow">
                <span className="app-pill px-3 py-2">
                  Shared finance workspace
                </span>
                <span className="app-pill px-3 py-2">
                  {members.length || 1} member{members.length === 1 ? "" : "s"}
                </span>
                <span className="app-pill px-3 py-2">
                  {formatMonthLabel(currentMonth)}
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl lg:text-5xl">
                  {workspace?.name ?? "Finance Space"}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                  A calm shared finance hub for budgets, salary planning, savings pots, and the day-to-day money moves that shape the month.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Income" value={formatCurrency(incomeTotal)} tone="income" />
                <MetricCard label="Spent" value={formatCurrency(expenseTotal)} tone="expense" />
                <MetricCard
                  label="Budget Left"
                  value={formatCurrency(remainingBudget)}
                  tone={remainingBudget >= 0 ? "neutral" : "expense"}
                />
                <MetricCard label="Saved" value={formatCurrency(totalSavings)} tone="neutral" />
              </div>
            </div>

            <div className="grid gap-4 lg:w-[360px] lg:flex-none">
              <div className="app-panel p-5">
                <p className="app-section-eyebrow text-xs font-semibold uppercase tracking-[0.24em] opacity-70">
                  Workspace members
                </p>
                <div className="mt-3 space-y-3">
                  {members.length > 0 ? (
                    members.map((member) => (
                      <div
                        key={member.id}
                        className="app-row flex items-center justify-between rounded-[20px] px-4 py-3"
                      >
                        <div>
                          <div className="text-sm font-semibold text-foreground">{member.displayName}</div>
                          <div className="text-sm text-[var(--color-text-tertiary)]">{member.email}</div>
                        </div>
                        <span className="app-pill app-pill--accent px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]">
                          Member
                        </span>
                      </div>
                    ))
                  ) : (
                    <EmptyPanel
                      title="Shared view"
                      description="Members will appear here once the workspace data loads."
                    />
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="app-button app-button--ghost rounded-full px-4 py-2.5 text-sm"
                >
                  Sign out
                </button>
                {dataLoading ? (
                  <span className="app-pill px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em]">
                    Syncing
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {dataError ? (
          <div className="app-feedback app-feedback--error mt-5">
            {dataError}
          </div>
        ) : null}

        <section className="app-nav mt-5 p-2">
          <div className="flex min-w-max items-center gap-2">
            <div className="hidden pr-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)] lg:block">
              Navigation
            </div>
            <TabButtons activeTab={activeTab} onSelect={setActiveTab} />
          </div>
        </section>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr] xl:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-4 animate-[panel-in_220ms_ease-out]">
            {activeTab === "dashboard" && (
              <>
                <Card>
                  <SectionHeader
                    eyebrow="Overview"
                    title="Your monthly summary"
                    description="A quick glance at what came in, what went out, and how budgets are holding up."
                  />
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <SummaryRow label="Income this month" value={formatCurrency(incomeTotal)} accent="text-emerald-300" />
                    <SummaryRow label="Expenses this month" value={formatCurrency(expenseTotal)} accent="text-rose-300" />
                    <SummaryRow label="Budgeted this month" value={formatCurrency(budgetTotal)} accent="text-sky-300" />
                  </div>
                </Card>

                <Card>
                  <SectionHeader
                    eyebrow="Budgets"
                    title="Closest to the edge"
                    description="The categories where spending is getting close to budget."
                  />
                  <div className="mt-4 grid gap-4 xl:grid-cols-2">
                    {budgetRows
                      .sort((a, b) => b.progress - a.progress)
                      .slice(0, 4)
                      .map((budget) => (
                        <BudgetRow
                          key={budget.id}
                          id={budget.id}
                          name={budget.categoryName}
                          spent={budget.spent}
                          limit={budget.amount}
                          remaining={budget.remaining}
                          color={budget.color}
                        />
                      ))}
                  </div>
                </Card>

                <Card>
                  <SectionHeader
                    eyebrow="Salary"
                    title="Estimated take-home pay"
                    description="Based on current 2026/27 UK payroll rates, including income tax, employee National Insurance, and optional student or postgraduate loan deductions."
                  />
                  <div className="mt-4 grid gap-4 xl:grid-cols-2">
                    {salaryRows.length > 0 ? (
                      salaryRows.map((row) => (
                        <SalaryRow
                          key={row.salaryProfile.id}
                          name={row.memberName}
                          breakdown={row.breakdown}
                          taxRegion={row.salaryProfile.taxRegion}
                          studentLoanPlan={row.salaryProfile.studentLoanPlan}
                          postgraduateLoan={row.salaryProfile.postgraduateLoan}
                        />
                      ))
                    ) : (
                      <div className="rounded-[24px] border border-white/8 bg-white/6 px-4 py-4 text-sm text-slate-300">
                        Add your annual salary in Settings to see monthly gross, tax, NI, and estimated take-home pay.
                      </div>
                    )}
                  </div>
                </Card>

                <Card>
                  <SectionHeader
                    eyebrow="Savings"
                    title="Goals and general savings"
                    description="Track a named goal when you have one, or keep money in a flexible savings pot when you do not."
                  />
                  <div className="mt-4 grid gap-4 xl:grid-cols-2">
                    {savingsGoals.map((goal) => (
                      <SavingsGoalRow key={goal.id} goal={goal} />
                    ))}
                  </div>
                </Card>
              </>
            )}

            {activeTab === "transactions" && (
              <Card>
                <SectionHeader
                  eyebrow="Transactions"
                  title={`All ${formatMonthLabel(currentMonth)} entries`}
                  description="This is the shared activity feed for income and expenses."
                />
                <div className="mt-4 space-y-3">
                  {recentTransactions.map((transaction) => {
                    const category = categories.find((item) => item.id === transaction.categoryId);
                    const person = members.find((item) => item.id === transaction.createdBy);
                    const sign = category?.type === "income" ? "+" : "-";

                    return (
                      <TransactionRow
                        key={transaction.id}
                        title={transaction.description}
                        category={category?.name ?? "Unknown"}
                        subtitle={`${formatShortDate(transaction.date)} by ${person?.displayName ?? "Unknown"}`}
                        amount={`${sign}${formatCurrency(transaction.amount)}`}
                        color={category?.color ?? "#d9d9d9"}
                      />
                    );
                  })}
                </div>
              </Card>
            )}

            {activeTab === "add" && (
              <Card>
                <SectionHeader
                  eyebrow="Quick entry"
                  title="Add a transaction"
                  description="This now saves into Supabase and will show up everywhere this workspace is shared."
                />
                <form
                  className="mt-4 space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void addTransaction();
                  }}
                >
                  <Field label="Type">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setTransactionForm((current) => ({
                            ...current,
                            type: "expense",
                            categoryId: expenseCategories[0]?.id ?? "",
                          }))
                        }
                        className={`rounded-[22px] px-4 py-3 text-sm font-semibold ${
                          transactionForm.type === "expense"
                            ? "bg-white text-slate-950"
                            : "border border-white/10 bg-white/6 text-slate-300"
                        }`}
                      >
                        Expense
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setTransactionForm((current) => ({
                            ...current,
                            type: "income",
                            categoryId: incomeCategories[0]?.id ?? "",
                          }))
                        }
                        className={`rounded-[22px] px-4 py-3 text-sm font-semibold ${
                          transactionForm.type === "income"
                            ? "bg-white text-slate-950"
                            : "border border-white/10 bg-white/6 text-slate-300"
                        }`}
                      >
                        Income
                      </button>
                    </div>
                  </Field>

                  <Field label="Amount">
                    <input
                      value={transactionForm.amount}
                      onChange={(event) =>
                        setTransactionForm((current) => ({
                          ...current,
                          amount: event.target.value,
                        }))
                      }
                      placeholder="24.50"
                      className="w-full rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-base text-white outline-none"
                    />
                  </Field>

                  <Field label="Category">
                    <select
                      value={selectedTransactionCategoryId}
                      onChange={(event) =>
                        setTransactionForm((current) => ({
                          ...current,
                          categoryId: event.target.value,
                        }))
                      }
                      className="w-full rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-base text-white outline-none"
                    >
                      {filteredCategoryOptions.map((category) => (
                        <option key={category.id} value={category.id} className="bg-slate-950">
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Date">
                    <input
                      type="date"
                      value={transactionForm.date}
                      onChange={(event) =>
                        setTransactionForm((current) => ({
                          ...current,
                          date: event.target.value,
                        }))
                      }
                      className="w-full rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-base text-white outline-none"
                    />
                  </Field>

                  <Field label="Note">
                    <textarea
                      value={transactionForm.description}
                      onChange={(event) =>
                        setTransactionForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      placeholder="Lunch and groceries"
                      className="min-h-24 w-full rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-base text-white outline-none"
                    />
                  </Field>

                  <button
                    type="submit"
                    className="w-full rounded-[22px] bg-emerald-400 px-4 py-3.5 text-base font-semibold text-slate-950 shadow-lg shadow-emerald-500/20"
                  >
                    Save transaction
                  </button>
                </form>
              </Card>
            )}

            {activeTab === "budgets" && (
              <>
                <Card>
                  <SectionHeader
                    eyebrow="Budgets"
                    title="Monthly category limits"
                    description="Budget tracking for the shared workspace, focused on the categories that matter most."
                  />
                  <div className="mt-4 grid gap-4 xl:grid-cols-2">
                    {budgetRows.map((budget) => (
                      <BudgetRow
                        key={budget.id}
                        id={budget.id}
                        name={budget.categoryName}
                        spent={budget.spent}
                        limit={budget.amount}
                        remaining={budget.remaining}
                        color={budget.color}
                        onDelete={deleteBudget}
                      />
                    ))}
                  </div>
                </Card>

                <Card>
                  <SectionHeader
                    eyebrow="Categories"
                    title="Expense breakdown"
                    description="A simple list of categories and how much each has used this month."
                  />
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {categoryRows.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center justify-between rounded-[24px] border border-white/8 bg-white/6 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                          <span className="text-sm font-medium text-slate-100">{category.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-white">
                          {formatCurrency(category.spent)}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}

            {activeTab === "settings" && (
              <>
                <Card>
                  <SectionHeader
                    eyebrow="Workspace"
                    title="Shared household settings"
                    description="The forms below now save to Supabase, so both members will see the same data."
                  />
                  <div className="mt-4 space-y-3">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-[24px] border border-white/8 bg-white/6 px-4 py-3"
                      >
                        <div>
                          <div className="text-sm font-semibold text-white">{member.displayName}</div>
                          <div className="text-sm text-slate-400">{member.email}</div>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-950">
                          Member
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card>
                  <SectionHeader
                    eyebrow="Categories"
                    title="Add a category"
                    description="Create expense or income categories directly in the app."
                  />
                  <form
                    className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto]"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void addCategory();
                    }}
                  >
                    <input
                      value={categoryForm.name}
                      onChange={(event) =>
                        setCategoryForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="New category"
                      className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-white outline-none"
                    />
                    <select
                      value={categoryForm.type}
                      onChange={(event) =>
                        setCategoryForm((current) => ({
                          ...current,
                          type: event.target.value as CategoryType,
                        }))
                      }
                      className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-white outline-none"
                    >
                      <option value="expense" className="bg-slate-950">
                        Expense
                      </option>
                      <option value="income" className="bg-slate-950">
                        Income
                      </option>
                    </select>
                    <button
                      type="submit"
                      className="rounded-[22px] bg-white px-4 py-3 font-semibold text-slate-950"
                    >
                      Add
                    </button>
                  </form>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => void deleteCategory(category.id)}
                        className="rounded-full border border-white/8 px-3 py-2 text-sm text-slate-200 transition hover:border-rose-300/30 hover:text-rose-200"
                        style={{ backgroundColor: `${category.color}20` }}
                      >
                        {category.name} ×
                      </button>
                    ))}
                  </div>
                </Card>

                <Card>
                  <SectionHeader
                    eyebrow="Budgets"
                    title="Set a monthly budget"
                    description="Pick an expense category and set or update its budget for this month."
                  />
                  <form
                    className="mt-4 grid gap-3 sm:grid-cols-[1fr_160px_auto]"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void addBudget();
                    }}
                  >
                    <select
                      value={selectedBudgetCategoryId}
                      onChange={(event) =>
                        setBudgetForm((current) => ({
                          ...current,
                          categoryId: event.target.value,
                        }))
                      }
                      className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-white outline-none"
                    >
                      {expenseCategories.map((category) => (
                        <option key={category.id} value={category.id} className="bg-slate-950">
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <input
                      value={budgetForm.amount}
                      onChange={(event) =>
                        setBudgetForm((current) => ({
                          ...current,
                          amount: event.target.value,
                        }))
                      }
                      placeholder="320"
                      className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-white outline-none"
                    />
                    <button
                      type="submit"
                      className="rounded-[22px] bg-white px-4 py-3 font-semibold text-slate-950"
                    >
                      Save
                    </button>
                  </form>
                </Card>

                <Card>
                  <SectionHeader
                    eyebrow="Savings"
                    title="Add a savings goal or pot"
                    description="Leave the target blank for general savings, or set one for a named goal."
                  />
                  <form
                    className="mt-4 grid gap-3 md:grid-cols-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void addSavingsGoal();
                    }}
                  >
                    <input
                      value={savingsForm.name}
                      onChange={(event) =>
                        setSavingsForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="General savings"
                      className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-white outline-none"
                    />
                    <input
                      value={savingsForm.targetAmount}
                      onChange={(event) =>
                        setSavingsForm((current) => ({
                          ...current,
                          targetAmount: event.target.value,
                        }))
                      }
                      placeholder="Target amount (optional)"
                      className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-white outline-none"
                    />
                    <input
                      value={savingsForm.currentAmount}
                      onChange={(event) =>
                        setSavingsForm((current) => ({
                          ...current,
                          currentAmount: event.target.value,
                        }))
                      }
                      placeholder="Current amount"
                      className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-white outline-none"
                    />
                    <input
                      value={savingsForm.monthlyContribution}
                      onChange={(event) =>
                        setSavingsForm((current) => ({
                          ...current,
                          monthlyContribution: event.target.value,
                        }))
                      }
                      placeholder="Monthly contribution"
                      className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-white outline-none"
                    />
                    <textarea
                      value={savingsForm.note}
                      onChange={(event) =>
                        setSavingsForm((current) => ({
                          ...current,
                          note: event.target.value,
                        }))
                      }
                      placeholder="Short note"
                      className="min-h-24 rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-white outline-none md:col-span-2"
                    />
                    <button
                      type="submit"
                      className="rounded-[22px] bg-white px-4 py-3 font-semibold text-slate-950 md:w-fit"
                    >
                      Add savings goal
                    </button>
                  </form>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {savingsGoals.map((goal) => (
                      <button
                        key={goal.id}
                        type="button"
                        onClick={() => void deleteSavingsGoal(goal.id)}
                        className="rounded-[22px] border border-white/8 bg-white/6 px-4 py-3 text-left text-sm text-slate-200 transition hover:border-rose-300/30 hover:text-rose-200"
                      >
                        Remove {goal.name}
                      </button>
                    ))}
                  </div>
                </Card>

                <Card>
                  <SectionHeader
                    eyebrow="Savings pots"
                    title="Add or remove money"
                    description="Choose a pot and record money going in or out. The balance updates immediately and the change is logged."
                  />
                  <form
                    className="mt-4 grid gap-3 md:grid-cols-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void adjustSavingsGoal();
                    }}
                  >
                    <select
                      value={selectedSavingsGoalId}
                      onChange={(event) =>
                        setSavingsAdjustmentForm((current) => ({
                          ...current,
                          savingsGoalId: event.target.value,
                        }))
                      }
                      className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-white outline-none"
                    >
                      {savingsGoals.map((goal) => (
                        <option key={goal.id} value={goal.id} className="bg-slate-950">
                          {goal.name}
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSavingsAdjustmentForm((current) => ({
                            ...current,
                            direction: "add",
                          }))
                        }
                        className={`rounded-[22px] px-4 py-3 text-sm font-semibold ${
                          savingsAdjustmentForm.direction === "add"
                            ? "bg-white text-slate-950"
                            : "border border-white/10 bg-white/6 text-slate-300"
                        }`}
                      >
                        Add money
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSavingsAdjustmentForm((current) => ({
                            ...current,
                            direction: "remove",
                          }))
                        }
                        className={`rounded-[22px] px-4 py-3 text-sm font-semibold ${
                          savingsAdjustmentForm.direction === "remove"
                            ? "bg-white text-slate-950"
                            : "border border-white/10 bg-white/6 text-slate-300"
                        }`}
                      >
                        Remove money
                      </button>
                    </div>
                    <input
                      value={savingsAdjustmentForm.amount}
                      onChange={(event) =>
                        setSavingsAdjustmentForm((current) => ({
                          ...current,
                          amount: event.target.value,
                        }))
                      }
                      placeholder="Amount"
                      className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-white outline-none"
                    />
                    <input
                      type="date"
                      value={savingsAdjustmentForm.date}
                      onChange={(event) =>
                        setSavingsAdjustmentForm((current) => ({
                          ...current,
                          date: event.target.value,
                        }))
                      }
                      className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-white outline-none"
                    />
                    <textarea
                      value={savingsAdjustmentForm.note}
                      onChange={(event) =>
                        setSavingsAdjustmentForm((current) => ({
                          ...current,
                          note: event.target.value,
                        }))
                      }
                      placeholder="Why did this change?"
                      className="min-h-24 rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-white outline-none md:col-span-2"
                    />
                    <button
                      type="submit"
                      className="rounded-[22px] bg-white px-4 py-3 font-semibold text-slate-950 md:w-fit"
                    >
                      Save pot change
                    </button>
                  </form>
                </Card>

                <Card>
                  <SectionHeader
                    eyebrow="Salary"
                    title="Annual salary estimate"
                    description="Save your gross yearly salary and the app will estimate monthly take-home using current UK payroll rates."
                  />
                  <form
                    className="mt-4 grid gap-3 md:grid-cols-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void saveSalaryProfile();
                    }}
                  >
                    <input
                      value={salaryForm.annualGrossSalary}
                      onChange={(event) =>
                        setSalaryForm((current) => ({
                          ...current,
                          annualGrossSalary: event.target.value,
                        }))
                      }
                      placeholder="Annual salary"
                      className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-white outline-none"
                    />
                    <input
                      value={salaryForm.taxCode}
                      onChange={(event) =>
                        setSalaryForm((current) => ({
                          ...current,
                          taxCode: event.target.value,
                        }))
                      }
                      placeholder="Tax code"
                      className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-white outline-none"
                    />
                    <select
                      value={salaryForm.taxRegion}
                      onChange={(event) =>
                        setSalaryForm((current) => ({
                          ...current,
                          taxRegion: event.target.value as TaxRegion,
                        }))
                      }
                      className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-white outline-none"
                    >
                      <option value="england_wales_ni" className="bg-slate-950">
                        England, Wales or NI
                      </option>
                      <option value="scotland" className="bg-slate-950">
                        Scotland
                      </option>
                    </select>
                    <select
                      value={salaryForm.studentLoanPlan}
                      onChange={(event) =>
                        setSalaryForm((current) => ({
                          ...current,
                          studentLoanPlan: event.target.value as StudentLoanPlan,
                        }))
                      }
                      className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-white outline-none"
                    >
                      <option value="none" className="bg-slate-950">No student loan</option>
                      <option value="plan1" className="bg-slate-950">Student loan plan 1</option>
                      <option value="plan2" className="bg-slate-950">Student loan plan 2</option>
                      <option value="plan4" className="bg-slate-950">Student loan plan 4</option>
                      <option value="plan5" className="bg-slate-950">Student loan plan 5</option>
                    </select>
                    <input
                      type="date"
                      value={salaryForm.firstPaymentDate}
                      onChange={(event) =>
                        setSalaryForm((current) => ({
                          ...current,
                          firstPaymentDate: event.target.value,
                        }))
                      }
                      className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-white outline-none"
                    />
                    <select
                      value={salaryForm.paymentFrequency}
                      onChange={(event) =>
                        setSalaryForm((current) => ({
                          ...current,
                          paymentFrequency: event.target.value as SalaryFrequency,
                        }))
                      }
                      className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-white outline-none"
                    >
                      <option value="monthly" className="bg-slate-950">Paid monthly</option>
                      <option value="biweekly" className="bg-slate-950">Paid every 2 weeks</option>
                      <option value="weekly" className="bg-slate-950">Paid weekly</option>
                    </select>
                    <label className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-200 md:col-span-2">
                      <input
                        checked={salaryForm.postgraduateLoan}
                        onChange={(event) =>
                          setSalaryForm((current) => ({
                            ...current,
                            postgraduateLoan: event.target.checked,
                          }))
                        }
                        type="checkbox"
                      />
                      Include postgraduate loan deductions
                    </label>
                    <button
                      type="submit"
                      className="rounded-[22px] bg-white px-4 py-3 font-semibold text-slate-950 md:w-fit"
                    >
                      {currentUserSalary ? "Update salary" : "Save salary"}
                    </button>
                    {currentUserSalary ? (
                      <button
                        type="button"
                        onClick={() => void deleteSalaryProfile()}
                        className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 font-semibold text-slate-100 md:w-fit"
                      >
                        Remove salary
                      </button>
                    ) : null}
                  </form>
                </Card>
              </>
            )}
          </section>

          <aside className="space-y-4">
            {(activeTab === "dashboard" || activeTab === "transactions") && (
              <Card>
                <SectionHeader
                  eyebrow="Recent activity"
                  title="Latest transactions"
                  description="Quick entries from the shared workspace."
                />
                <div className="mt-4 space-y-3">
                  {recentTransactions.slice(0, 6).map((transaction) => {
                    const category = categories.find((item) => item.id === transaction.categoryId);
                    const person = members.find((item) => item.id === transaction.createdBy);
                    const sign = category?.type === "income" ? "+" : "-";

                    return (
                      <TransactionRow
                        key={transaction.id}
                        title={transaction.description}
                        category={category?.name ?? "Unknown"}
                        subtitle={`${formatShortDate(transaction.date)} by ${person?.displayName ?? "Unknown"}`}
                        amount={`${sign}${formatCurrency(transaction.amount)}`}
                        color={category?.color ?? "#d9d9d9"}
                      />
                    );
                  })}
                </div>
              </Card>
            )}

            {(activeTab === "dashboard" || activeTab === "budgets") && (
              <Card>
                <SectionHeader
                  eyebrow="Categories"
                  title="What you spend on"
                  description="A fast read on expense categories for the current month."
                />
                <div className="mt-4 space-y-3">
                  {categoryRows.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between rounded-[24px] border border-white/8 bg-white/6 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                        <span className="text-sm font-medium text-slate-100">{category.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-white">{formatCurrency(category.spent)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {(activeTab === "dashboard" || activeTab === "settings") && (
              <Card>
                <SectionHeader
                  eyebrow="Savings snapshot"
                  title="Money set aside"
                  description="A combined view of both open-ended savings and target-based goals."
                />
                <div className="mt-4 grid gap-3">
                  <SummaryRow label="Total saved" value={formatCurrency(totalSavings)} accent="text-cyan-300" />
                  <SummaryRow label="Monthly contribution" value={formatCurrency(totalMonthlySavings)} accent="text-emerald-300" />
                  <SummaryRow label="Active pots" value={`${savingsGoals.length}`} accent="text-violet-300" />
                </div>
              </Card>
            )}

            {(activeTab === "dashboard" || activeTab === "settings") && savingsGoalEntries.length > 0 ? (
              <Card>
                <SectionHeader
                  eyebrow="Pot history"
                  title="Recent savings changes"
                  description="A running log of money added to or removed from your savings pots."
                />
                <div className="mt-4 space-y-3">
                  {savingsGoalEntries.slice(0, 5).map((entry) => {
                    const goal = savingsGoals.find((item) => item.id === entry.savingsGoalId);
                    const member = members.find((item) => item.id === entry.createdBy);
                    const isPositive = entry.amountDelta >= 0;

                    return (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between rounded-[24px] border border-white/8 bg-white/6 px-4 py-3"
                      >
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {goal?.name ?? "Savings pot"}
                          </div>
                          <div className="text-xs text-slate-400">
                            {formatShortDate(entry.entryDate)} by {member?.displayName ?? "Member"}
                            {entry.note ? ` · ${entry.note}` : ""}
                          </div>
                        </div>
                        <div className={`text-sm font-semibold ${isPositive ? "text-emerald-300" : "text-rose-300"}`}>
                          {isPositive ? "+" : "-"}
                          {formatCurrency(Math.abs(entry.amountDelta))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ) : null}

            {(activeTab === "dashboard" || activeTab === "settings") && currentUserSalary ? (
              <Card>
                <SectionHeader
                  eyebrow="Salary snapshot"
                  title="Your monthly salary estimate"
                  description="This uses your saved annual salary and current UK 2026/27 payroll rules."
                />
                <div className="mt-4 grid gap-3">
                  <SummaryRow
                    label="Monthly gross"
                    value={formatCurrency(calculateSalaryBreakdown(currentUserSalary).monthlyGross)}
                    accent="text-cyan-300"
                  />
                  <SummaryRow
                    label="Monthly take-home"
                    value={formatCurrency(calculateSalaryBreakdown(currentUserSalary).monthlyTakeHome)}
                    accent="text-emerald-300"
                  />
                  <SummaryRow
                    label="Monthly tax + NI"
                    value={formatCurrency(
                      calculateSalaryBreakdown(currentUserSalary).monthlyIncomeTax +
                        calculateSalaryBreakdown(currentUserSalary).monthlyNationalInsurance,
                    )}
                    accent="text-rose-300"
                  />
                </div>
              </Card>
            ) : null}

            {activeTab === "add" && (
              <Card>
                <SectionHeader
                  eyebrow="Live data"
                  title="Supabase is connected"
                  description="Transactions, categories, budgets, and savings added here now persist to your project instead of disappearing on refresh."
                />
              </Card>
            )}
          </aside>
        </div>

      </div>
    </main>
  );
}

function AuthScreen({
  authBusy,
  authForm,
  authMessage,
  authMode,
  onChange,
  onMagicLink,
  onModeChange,
  onSubmit,
}: {
  authBusy: boolean;
  authForm: {
    email: string;
    password: string;
    displayName: string;
  };
  authMessage: string;
  authMode: AuthMode;
  onChange: React.Dispatch<
    React.SetStateAction<{
      email: string;
      password: string;
      displayName: string;
    }>
  >;
  onMagicLink: () => void;
  onModeChange: (mode: AuthMode) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <main className="app-auth-shell px-4 py-8 sm:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="app-hero p-6 sm:p-8">
          <p className="app-section-eyebrow text-xs font-semibold uppercase tracking-[0.28em]">
            Shared Finance Tracker
          </p>
          <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-[-0.05em] text-foreground sm:text-5xl">
            Shared personal finance, without the clutter.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[var(--color-text-secondary)]">
            Sign in to a clean finance space for budgets, categories, transactions, and savings goals.
            The first time you join, the app will create your workspace automatically.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <MetricCard label="Track" value="Spending" tone="neutral" />
            <MetricCard label="Manage" value="Budgets" tone="expense" />
            <MetricCard label="Grow" value="Savings" tone="income" />
          </div>
        </div>

        <div className="app-card p-6 sm:p-8">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onModeChange("sign-in")}
              className={`app-button rounded-full px-4 py-2 text-sm ${
                authMode === "sign-in" ? "app-button--primary" : "app-button--ghost"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => onModeChange("sign-up")}
              className={`app-button rounded-full px-4 py-2 text-sm ${
                authMode === "sign-up" ? "app-button--primary" : "app-button--ghost"
              }`}
            >
              Sign up
            </button>
          </div>

          <form className="mt-6 space-y-3" onSubmit={onSubmit}>
            {authMode === "sign-up" ? (
              <Field label="Display name">
                <input
                  value={authForm.displayName}
                  onChange={(event) =>
                    onChange((current) => ({ ...current, displayName: event.target.value }))
                  }
                  className="app-input"
                  placeholder="Your name"
                />
              </Field>
            ) : null}

            <Field label="Email">
              <input
                value={authForm.email}
                onChange={(event) =>
                  onChange((current) => ({ ...current, email: event.target.value }))
                }
                className="app-input"
                placeholder="you@example.com"
                type="email"
              />
            </Field>

            <Field label="Password">
              <input
                value={authForm.password}
                onChange={(event) =>
                  onChange((current) => ({ ...current, password: event.target.value }))
                }
                className="app-input"
                placeholder="Your password"
                type="password"
              />
            </Field>

            <button
              type="submit"
              disabled={authBusy}
              className="app-button app-button--primary w-full"
            >
              {authBusy ? "Working..." : authMode === "sign-in" ? "Sign in" : "Create account"}
            </button>

            <button
              type="button"
              disabled={authBusy || !authForm.email}
              onClick={onMagicLink}
              className="app-button app-button--ghost w-full"
            >
              Send magic link
            </button>
          </form>

          {authMessage ? (
            <div className="app-feedback app-feedback--info mt-4">
              {authMessage}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <main className="app-auth-shell flex items-center justify-center px-4">
      <div className="app-panel px-6 py-5 text-sm text-[var(--color-text-secondary)] shadow-[0_30px_120px_rgba(2,6,23,0.45)] backdrop-blur-xl">
        {label}
      </div>
    </main>
  );
}

function ConfigScreen() {
  return (
    <main className="app-auth-shell flex items-center justify-center px-4">
      <div className="app-card w-full max-w-2xl p-6 sm:p-8">
        <p className="app-section-eyebrow text-xs font-semibold uppercase tracking-[0.28em]">
          Configuration required
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
          Add your Supabase public keys to run the finance tracker.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
          The UI now builds cleanly without crashing, but sign-in and shared finance data need
          `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` before the app can connect.
        </p>
        <div className="app-feedback app-feedback--info mt-6">
          Set those environment variables in your local app config, then reload the page.
        </div>
      </div>
    </main>
  );
}

function ToastBanner({
  kind,
  message,
}: {
  kind: "success" | "error";
  message: string;
}) {
  return (
    <div
      className={`app-toast app-feedback ${
        kind === "success" ? "app-feedback--success" : "app-feedback--error"
      }`}
    >
      {message}
    </div>
  );
}

function EmptyPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="app-empty px-4 py-4">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="app-section-description mt-1 text-sm leading-6">{description}</div>
    </div>
  );
}

function TabButtons({
  activeTab,
  onSelect,
  compact = false,
}: {
  activeTab: TabId;
  onSelect: (tab: TabId) => void;
  compact?: boolean;
}) {
  return (
    <>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelect(tab.id)}
          className={`app-tab ${
            compact ? "app-tab--compact px-3 py-2 text-xs font-semibold" : "px-4 py-2.5 text-sm"
          } ${
            activeTab === tab.id
              ? "app-tab--active"
              : tab.id === "add"
                ? "app-tab--add"
                : ""
          }`}
        >
          {tab.label}
        </button>
      ))}
    </>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="app-card p-5 sm:p-6">
      {children}
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="app-section-eyebrow text-xs font-semibold uppercase tracking-[0.28em]">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-foreground">{title}</h2>
      <p className="app-section-description mt-2 max-w-2xl text-sm leading-6">{description}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "income" | "expense" | "neutral";
}) {
  const toneClass =
    tone === "income"
      ? "app-metric-card--income"
      : tone === "expense"
        ? "app-metric-card--expense"
        : "app-metric-card--neutral";

  return (
    <div className={`app-metric-card px-4 py-4 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">{label}</p>
      <p className="mt-2 text-lg font-semibold tracking-[-0.03em]">{value}</p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="app-row flex items-center justify-between px-4 py-3">
      <span className="text-sm text-[var(--color-text-tertiary)]">{label}</span>
      <span className={`text-sm font-semibold ${accent}`}>{value}</span>
    </div>
  );
}

function TransactionRow({
  title,
  category,
  subtitle,
  amount,
  color,
}: {
  title: string;
  category: string;
  subtitle: string;
  amount: string;
  color: string;
}) {
  const isIncome = amount.startsWith("+");

  return (
    <div className="app-row flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="h-11 w-11 rounded-[20px]" style={{ backgroundColor: `${color}25` }} />
        <div>
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <div className="text-xs text-slate-400">
            {category} · {subtitle}
          </div>
        </div>
      </div>
      <span className={`text-sm font-semibold ${isIncome ? "app-amount-income" : "app-amount-neutral"}`}>
        {amount}
      </span>
    </div>
  );
}

function BudgetRow({
  id,
  name,
  spent,
  limit,
  remaining,
  color,
  onDelete,
}: {
  id: string;
  name: string;
  spent: number;
  limit: number;
  remaining: number;
  color: string;
  onDelete?: (id: string) => Promise<void>;
}) {
  const progress = limit > 0 ? Math.min(spent / limit, 1) : 0;
  const remainingLabel =
    remaining >= 0 ? `${formatCurrency(remaining)} left` : `${formatCurrency(Math.abs(remaining))} over`;

  return (
    <div className="app-row rounded-[28px] px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
          <div className="text-sm font-semibold text-foreground">{name}</div>
        </div>
        <div className="text-sm font-semibold text-foreground">{formatCurrency(limit)}</div>
      </div>
      <div className="app-progress mt-3 h-2.5">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(progress * 100, 6)}%`, backgroundColor: color }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-[var(--color-text-tertiary)]">{formatCurrency(spent)} spent</span>
        <span className={remaining >= 0 ? "text-[var(--color-text-secondary)]" : "app-amount-expense"}>{remainingLabel}</span>
      </div>
      {onDelete ? (
        <button
          type="button"
          onClick={() => void onDelete(id)}
          className="app-button app-button--danger mt-4 rounded-[18px] px-3 py-2 text-xs"
        >
          Remove budget
        </button>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="app-field-label mb-2 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function SavingsGoalRow({
  goal,
  onDelete,
}: {
  goal: SavingsGoal;
  onDelete?: (goalId: string) => Promise<void>;
}) {
  const progress =
    goal.targetAmount && goal.targetAmount > 0
      ? Math.min(goal.currentAmount / goal.targetAmount, 1)
      : null;

  return (
    <div className="app-row rounded-[28px] px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">{goal.name}</div>
          <p className="mt-1 text-sm leading-6 text-[var(--color-text-tertiary)]">{goal.note}</p>
        </div>
        <span className="app-pill px-3 py-1 text-xs font-semibold">
          {goal.targetAmount ? "Goal" : "Open-ended"}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Current</div>
          <div className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-foreground">
            {formatCurrency(goal.currentAmount)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Monthly</div>
          <div className="app-amount-income mt-1 text-sm font-semibold">
            +{formatCurrency(goal.monthlyContribution)}
          </div>
        </div>
      </div>

      {goal.targetAmount ? (
        <>
          <div className="app-progress mt-4 h-2.5">
            <div
              className="h-full rounded-full bg-[var(--data-viz-budget)]"
              style={{ width: `${Math.max((progress ?? 0) * 100, 8)}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-tertiary)]">{formatCurrency(goal.targetAmount)} target</span>
            <span className="text-[var(--color-accent-200)]">{Math.round((progress ?? 0) * 100)}%</span>
          </div>
        </>
      ) : (
        <div className="app-panel mt-4 px-4 py-3 text-sm text-[var(--color-text-secondary)]">
          No fixed target. Use this as a flexible savings pot and track what goes in over time.
        </div>
      )}
      {onDelete ? (
        <button
          type="button"
          onClick={() => void onDelete(goal.id)}
          className="app-button app-button--danger mt-4 rounded-[18px] px-3 py-2 text-xs"
        >
          Remove pot
        </button>
      ) : null}
    </div>
  );
}

function SalaryRow({
  name,
  breakdown,
  taxRegion,
  studentLoanPlan,
  postgraduateLoan,
}: {
  name: string;
  breakdown: ReturnType<typeof calculateSalaryBreakdown>;
  taxRegion: TaxRegion;
  studentLoanPlan: StudentLoanPlan;
  postgraduateLoan: boolean;
}) {
  return (
    <div className="app-row rounded-[28px] px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">{name}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            {taxRegion === "scotland" ? "Scottish tax" : "England/Wales/NI tax"}
          </div>
        </div>
        <span className="app-pill px-3 py-1 text-xs font-semibold">
          {studentLoanPlan === "none" ? "No student loan" : studentLoanPlan.toUpperCase()}
          {postgraduateLoan ? " + PGL" : ""}
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        <SummaryRow label="Annual gross" value={formatCurrency(breakdown.annualGross)} accent="text-cyan-300" />
        <SummaryRow label="Monthly gross" value={formatCurrency(breakdown.monthlyGross)} accent="text-cyan-300" />
        <SummaryRow label="Monthly income tax" value={formatCurrency(breakdown.monthlyIncomeTax)} accent="text-rose-300" />
        <SummaryRow label="Monthly National Insurance" value={formatCurrency(breakdown.monthlyNationalInsurance)} accent="text-rose-300" />
        {studentLoanPlan !== "none" ? (
          <SummaryRow label="Monthly student loan" value={formatCurrency(breakdown.monthlyStudentLoan)} accent="text-violet-300" />
        ) : null}
        {postgraduateLoan ? (
          <SummaryRow label="Monthly postgraduate loan" value={formatCurrency(breakdown.monthlyPostgraduateLoan)} accent="text-violet-300" />
        ) : null}
        <SummaryRow label="Estimated monthly take-home" value={formatCurrency(breakdown.monthlyTakeHome)} accent="text-emerald-300" />
      </div>
    </div>
  );
}
