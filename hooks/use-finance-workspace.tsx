"use client";

import {
  createContext,
  startTransition,
  useContext,
  useEffectEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { buildForecastSummary } from "@/lib/forecast";
import {
  defaultCategoryPalette,
  hasSupabase,
  loadWorkspaceBundle,
  starterCategories,
  subscribeToWorkspace,
  supabase,
  type WorkspaceBundle,
} from "@/lib/finance-data";
import { buildFinanceInsights } from "@/lib/insights";
import { calculateSalaryBreakdown } from "@/lib/payroll";
import { parseQuickAdd } from "@/lib/quick-add";
import type {
  Budget,
  Category,
  CategoryType,
  FinanceInsight,
  FinanceNotification,
  ForecastSummary,
  Profile,
  RecurringFrequency,
  RecurringMode,
  RecurringTransaction,
  SalaryFrequency,
  SalaryProfile,
  SavingsGoal,
  SavingsGoalEntry,
  SplitMode,
  StudentLoanPlan,
  TaxRegion,
  Transaction,
  TransactionHistoryEntry,
  TransactionTag,
  TransactionTagMap,
  WishlistItem,
  WishlistPriority,
} from "@/lib/types";
import { getCurrentMonth, getTodayIso } from "@/lib/utils";

type WorkspaceSummary = {
  id: string;
  name: string;
};

type AuthMode = "sign-in" | "sign-up";

type SaveTransactionInput = {
  id?: string;
  amount: number;
  categoryId: string;
  description: string;
  date: string;
  tagIds?: string[];
  splitMode?: SplitMode;
  splitParticipants?: number;
  splitAmount?: number | null;
};

type FinanceWorkspaceContextValue = {
  hasSupabase: boolean;
  session: Session | null;
  authLoading: boolean;
  dataLoading: boolean;
  authBusy: boolean;
  authMode: AuthMode;
  authMessage: string;
  dataError: string;
  toast: { kind: "success" | "error" | "info"; message: string } | null;
  workspace: WorkspaceSummary | null;
  members: Profile[];
  categories: Category[];
  transactions: Transaction[];
  actualTransactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  salaryProfiles: SalaryProfile[];
  savingsGoalEntries: SavingsGoalEntry[];
  recurringTransactions: RecurringTransaction[];
  wishlistItems: WishlistItem[];
  transactionTags: TransactionTag[];
  transactionTagMaps: TransactionTagMap[];
  transactionHistory: TransactionHistoryEntry[];
  forecast: ForecastSummary;
  insights: FinanceInsight[];
  notifications: FinanceNotification[];
  currentMonth: string;
  expenseCategories: Category[];
  incomeCategories: Category[];
  deletedTransactionPendingUndo: Transaction | null;
  authForm: { email: string; password: string; displayName: string };
  setAuthMode: (value: AuthMode) => void;
  setAuthForm: (value: { email: string; password: string; displayName: string }) => void;
  setToast: (value: { kind: "success" | "error" | "info"; message: string } | null) => void;
  refreshWorkspaceData: () => Promise<void>;
  handleAuthSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleMagicLink: () => Promise<void>;
  handleSignOut: () => Promise<void>;
  saveTransaction: (input: SaveTransactionInput) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  undoDeleteTransaction: () => void;
  saveCategory: (input: { name: string; type: CategoryType }) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  saveBudget: (input: { categoryId: string; amount: number; month?: string }) => Promise<void>;
  deleteBudget: (budgetId: string) => Promise<void>;
  saveSavingsGoal: (input: {
    id?: string;
    name: string;
    targetAmount: number | null;
    currentAmount: number;
    monthlyContribution: number;
    note: string;
  }) => Promise<void>;
  deleteSavingsGoal: (goalId: string) => Promise<void>;
  adjustSavingsGoal: (input: {
    savingsGoalId: string;
    amount: number;
    direction: "add" | "remove";
    date: string;
    note: string;
  }) => Promise<void>;
  saveSalaryProfile: (input: {
    annualGrossSalary: number;
    taxRegion: TaxRegion;
    studentLoanPlan: StudentLoanPlan;
    postgraduateLoan: boolean;
    taxCode: string;
    firstPaymentDate: string;
    paymentFrequency: SalaryFrequency;
  }) => Promise<void>;
  deleteSalaryProfile: () => Promise<void>;
  saveRecurringTransaction: (input: {
    id?: string;
    name: string;
    amount: number;
    type: CategoryType;
    categoryId: string;
    frequency: RecurringFrequency;
    interval: number;
    startDate: string;
    endDate: string | null;
    mode: RecurringMode;
    note: string;
  }) => Promise<void>;
  deleteRecurringTransaction: (id: string) => Promise<void>;
  saveWishlistItem: (input: {
    id?: string;
    name: string;
    price: number;
    priority: WishlistPriority;
    linkedSavingsGoalId: string | null;
    targetDate: string | null;
    note: string;
  }) => Promise<void>;
  deleteWishlistItem: (id: string) => Promise<void>;
  convertWishlistToSavingsGoal: (wishlistId: string) => Promise<void>;
  saveTransactionTag: (input: { name: string; color: string }) => Promise<void>;
  quickAdd: (input: string) => Promise<void>;
};

const FinanceWorkspaceContext = createContext<FinanceWorkspaceContextValue | null>(null);

export function FinanceWorkspaceProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(hasSupabase);
  const [dataLoading, setDataLoading] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [authMessage, setAuthMessage] = useState("");
  const [dataError, setDataError] = useState("");
  const [toast, setToast] = useState<{ kind: "success" | "error" | "info"; message: string } | null>(null);
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
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [transactionTags, setTransactionTags] = useState<TransactionTag[]>([]);
  const [transactionTagMaps, setTransactionTagMaps] = useState<TransactionTagMap[]>([]);
  const [transactionHistory, setTransactionHistory] = useState<TransactionHistoryEntry[]>([]);
  const [deletedTransactionPendingUndo, setDeletedTransactionPendingUndo] = useState<Transaction | null>(null);
  const deleteUndoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workspaceId = workspace?.id ?? null;

  const currentMonth = getCurrentMonth();
  const expenseCategories = categories.filter((item) => item.type === "expense");
  const incomeCategories = categories.filter((item) => item.type === "income");
  const actualTransactions = transactions.filter((item) => !item.isPrediction);

  async function applyBundle(bundle: WorkspaceBundle) {
    startTransition(() => {
      setWorkspace(bundle.workspace);
      setMembers(bundle.members);
      setCategories(bundle.categories);
      setTransactions(bundle.transactions);
      setBudgets(bundle.budgets);
      setSavingsGoals(bundle.savingsGoals);
      setSalaryProfiles(bundle.salaryProfiles);
      setSavingsGoalEntries(bundle.savingsGoalEntries);
      setRecurringTransactions(bundle.recurringTransactions);
      setWishlistItems(bundle.wishlistItems);
      setTransactionTags(bundle.transactionTags);
      setTransactionTagMaps(bundle.transactionTagMaps);
      setTransactionHistory(bundle.transactionHistory);
    });
  }

  async function refreshWorkspaceData() {
    if (!session?.user) return;
    const bundle = await loadWorkspaceBundle(session.user);
    await applyBundle(bundle);
  }

  async function logTransactionHistory(action: "created" | "updated" | "deleted", transaction: Transaction) {
    if (!workspace || !session?.user) return;
    await supabase.from("transaction_history").insert({
      transaction_id: transaction.id,
      workspace_id: workspace.id,
      action,
      snapshot: transaction,
      changed_by: session.user.id,
    });
  }

  async function replaceTransactionTags(transactionId: string, tagIds: string[]) {
    await supabase.from("transaction_tag_map").delete().eq("transaction_id", transactionId);
    if (tagIds.length === 0) return;
    await supabase.from("transaction_tag_map").insert(
      tagIds.map((tagId) => ({
        transaction_id: transactionId,
        tag_id: tagId,
      })),
    );
  }

  useEffect(() => {
    if (!hasSupabase) return;
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
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
        setRecurringTransactions([]);
        setWishlistItems([]);
        setTransactionTags([]);
        setTransactionTagMaps([]);
        setTransactionHistory([]);
      }
      setAuthLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!hasSupabase || !session?.user) return;
    let active = true;
    const currentUser = session.user;

    async function load() {
      setDataLoading(true);
      setDataError("");

      try {
        const bundle = await loadWorkspaceBundle(currentUser);
        if (!active) return;
        await applyBundle(bundle);
      } catch (error) {
        if (!active) return;
        setDataError(error instanceof Error ? error.message : "Unable to load workspace.");
      } finally {
        if (active) setDataLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [session]);

  const handleWorkspaceRealtime = useEffectEvent(() => {
    void refreshWorkspaceData();
  });

  useEffect(() => {
    if (!workspaceId) return;
    const unsubscribe = subscribeToWorkspace(workspaceId, handleWorkspaceRealtime);
    return unsubscribe;
  }, [workspaceId]);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(timeout);
  }, [toast]);

  const forecast = useMemo(
    () =>
      buildForecastSummary({
        categories,
        transactions,
        recurringTransactions,
        budgets,
        savingsGoals,
      }),
    [categories, transactions, recurringTransactions, budgets, savingsGoals],
  );

  const insights = useMemo(
    () => buildFinanceInsights({ categories, transactions: actualTransactions, savingsGoals }),
    [categories, actualTransactions, savingsGoals],
  );

  const notifications = useMemo(() => {
    const items: FinanceNotification[] = [];
    if (forecast.runwayDays !== null && forecast.runwayDays <= 30) {
      items.push({
        id: "runway",
        title: "Runway is tightening",
        message: `At the current pace you could dip below zero in about ${forecast.runwayDays} days.`,
        severity: "critical",
      });
    }
    for (const risk of forecast.budgetRisks.slice(0, 3)) {
      items.push({
        id: `budget-${risk.budgetId}`,
        title: `${risk.categoryName} looks risky`,
        message: `You are on track to exceed this budget by about ${risk.overspendBy.toFixed(0)}.`,
        severity: "warning",
      });
    }
    if (items.length === 0) {
      items.push({
        id: "steady",
        title: "No urgent alerts",
        message: "Your forecast is stable for now.",
        severity: "info",
      });
    }
    return items;
  }, [forecast]);

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
            data: { display_name: authForm.displayName },
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
          data: { display_name: authForm.displayName },
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

  async function saveTransaction(input: SaveTransactionInput) {
    if (!workspace || !session?.user) return;

    const payload = {
      workspace_id: workspace.id,
      category_id: input.categoryId,
      amount: input.amount,
      description: input.description.trim(),
      transaction_date: input.date,
      created_by: session.user.id,
      split_mode: input.splitMode ?? "none",
      split_participants: input.splitParticipants ?? 1,
      split_amount: input.splitAmount ?? null,
    };

    if (input.id) {
      const { error } = await supabase.from("transactions").update(payload).eq("id", input.id);
      if (error) {
        setToast({ kind: "error", message: error.message });
        return;
      }
      await replaceTransactionTags(input.id, input.tagIds ?? []);
      await refreshWorkspaceData();
      const updated = transactions.find((item) => item.id === input.id);
      if (updated) await logTransactionHistory("updated", { ...updated, ...input });
      setToast({ kind: "success", message: "Transaction updated" });
      return;
    }

    const { data, error } = await supabase
      .from("transactions")
      .insert(payload)
      .select("id, workspace_id, category_id, amount, description, transaction_date, created_by, recurring_transaction_id, generated_source, is_prediction, split_mode, split_participants, split_amount")
      .single();

    if (error) {
      setToast({ kind: "error", message: error.message });
      return;
    }

    if (input.tagIds?.length) {
      await replaceTransactionTags(data.id, input.tagIds);
    }

    await refreshWorkspaceData();
    await logTransactionHistory("created", {
      id: data.id,
      workspaceId: data.workspace_id,
      categoryId: data.category_id,
      amount: Number(data.amount),
      description: data.description,
      date: data.transaction_date,
      createdBy: data.created_by,
    });
    setToast({ kind: "success", message: "Transaction saved" });
  }

  async function deleteTransaction(transactionId: string) {
    const transaction = transactions.find((item) => item.id === transactionId);
    if (!transaction) return;

    setDeletedTransactionPendingUndo(transaction);
    setTransactions((current) => current.filter((item) => item.id !== transactionId));
    setToast({ kind: "info", message: "Transaction removed. Undo is available for a moment." });

    if (deleteUndoTimer.current) {
      clearTimeout(deleteUndoTimer.current);
    }

    deleteUndoTimer.current = setTimeout(async () => {
      const { error } = await supabase.from("transactions").delete().eq("id", transactionId);
      if (!error) {
        await logTransactionHistory("deleted", transaction);
        await refreshWorkspaceData();
      }
      setDeletedTransactionPendingUndo(null);
    }, 4000);
  }

  function undoDeleteTransaction() {
    if (!deletedTransactionPendingUndo) return;
    if (deleteUndoTimer.current) clearTimeout(deleteUndoTimer.current);
    setTransactions((current) => [deletedTransactionPendingUndo, ...current]);
    setDeletedTransactionPendingUndo(null);
    setToast({ kind: "success", message: "Transaction restored" });
  }

  async function saveCategory(input: { name: string; type: CategoryType }) {
    if (!workspace || !session?.user) return;
    const { error } = await supabase.from("categories").insert({
      workspace_id: workspace.id,
      name: input.name.trim(),
      type: input.type,
      color: defaultCategoryPalette[categories.length % defaultCategoryPalette.length] ?? starterCategories[0].color,
      created_by: session.user.id,
    });
    if (error) {
      setToast({ kind: "error", message: error.message });
      return;
    }
    await refreshWorkspaceData();
    setToast({ kind: "success", message: "Category added" });
  }

  async function deleteCategory(categoryId: string) {
    const { error } = await supabase.from("categories").delete().eq("id", categoryId);
    if (error) {
      setToast({
        kind: "error",
        message: "Category could not be removed. It may still be used by transactions or budgets.",
      });
      return;
    }
    await refreshWorkspaceData();
    setToast({ kind: "success", message: "Category removed" });
  }

  async function saveBudget(input: { categoryId: string; amount: number; month?: string }) {
    if (!workspace || !session?.user) return;
    const month = input.month ?? currentMonth;
    const existing = budgets.find((item) => item.categoryId === input.categoryId && item.month === month);

    if (existing) {
      const { error } = await supabase.from("budgets").update({ amount: input.amount }).eq("id", existing.id);
      if (error) {
        setToast({ kind: "error", message: error.message });
        return;
      }
    } else {
      const { error } = await supabase.from("budgets").insert({
        workspace_id: workspace.id,
        category_id: input.categoryId,
        month: `${month}-01`,
        amount: input.amount,
        created_by: session.user.id,
      });
      if (error) {
        setToast({ kind: "error", message: error.message });
        return;
      }
    }
    await refreshWorkspaceData();
    setToast({ kind: "success", message: "Budget saved" });
  }

  async function deleteBudget(budgetId: string) {
    const { error } = await supabase.from("budgets").delete().eq("id", budgetId);
    if (error) {
      setToast({ kind: "error", message: error.message });
      return;
    }
    await refreshWorkspaceData();
    setToast({ kind: "success", message: "Budget removed" });
  }

  async function saveSavingsGoal(input: {
    id?: string;
    name: string;
    targetAmount: number | null;
    currentAmount: number;
    monthlyContribution: number;
    note: string;
  }) {
    if (!workspace || !session?.user) return;
    const payload = {
      workspace_id: workspace.id,
      name: input.name.trim(),
      target_amount: input.targetAmount,
      current_amount: input.currentAmount,
      monthly_contribution: input.monthlyContribution,
      note: input.note.trim(),
      created_by: session.user.id,
    };
    const query = input.id
      ? supabase.from("savings_goals").update(payload).eq("id", input.id)
      : supabase.from("savings_goals").insert(payload);
    const { error } = await query;
    if (error) {
      setToast({ kind: "error", message: error.message });
      return;
    }
    await refreshWorkspaceData();
    setToast({ kind: "success", message: input.id ? "Savings goal updated" : "Savings goal added" });
  }

  async function deleteSavingsGoal(goalId: string) {
    const { error } = await supabase.from("savings_goals").delete().eq("id", goalId);
    if (error) {
      setToast({ kind: "error", message: error.message });
      return;
    }
    await refreshWorkspaceData();
    setToast({ kind: "success", message: "Savings goal removed" });
  }

  async function adjustSavingsGoal(input: {
    savingsGoalId: string;
    amount: number;
    direction: "add" | "remove";
    date: string;
    note: string;
  }) {
    const delta = input.direction === "add" ? input.amount : input.amount * -1;
    const { error } = await supabase.rpc("adjust_savings_goal", {
      target_goal_id: input.savingsGoalId,
      delta,
      adjustment_note: input.note.trim(),
      adjustment_date: input.date,
    });
    if (error) {
      setToast({ kind: "error", message: error.message });
      return;
    }
    await refreshWorkspaceData();
    setToast({
      kind: "success",
      message: input.direction === "add" ? "Money added to pot" : "Money removed from pot",
    });
  }

  async function saveSalaryProfile(input: {
    annualGrossSalary: number;
    taxRegion: TaxRegion;
    studentLoanPlan: StudentLoanPlan;
    postgraduateLoan: boolean;
    taxCode: string;
    firstPaymentDate: string;
    paymentFrequency: SalaryFrequency;
  }) {
    if (!workspace || !session?.user) return;
    const existing = salaryProfiles.find((item) => item.profileId === session.user.id);
    const payload = {
      workspace_id: workspace.id,
      profile_id: session.user.id,
      annual_gross_salary: input.annualGrossSalary,
      tax_region: input.taxRegion,
      student_loan_plan: input.studentLoanPlan,
      postgraduate_loan: input.postgraduateLoan,
      tax_code: input.taxCode.trim() || "1257L",
      first_payment_date: input.firstPaymentDate || null,
      payment_frequency: input.paymentFrequency,
    };
    const query = existing
      ? supabase.from("salary_profiles").update(payload).eq("id", existing.id)
      : supabase.from("salary_profiles").insert(payload);
    const { error } = await query;
    if (error) {
      setToast({ kind: "error", message: error.message });
      return;
    }
    await refreshWorkspaceData();
    setToast({ kind: "success", message: "Salary saved" });
  }

  async function deleteSalaryProfile() {
    const existing = salaryProfiles.find((item) => item.profileId === session?.user?.id);
    if (!existing) return;
    const { error } = await supabase.from("salary_profiles").delete().eq("id", existing.id);
    if (error) {
      setToast({ kind: "error", message: error.message });
      return;
    }
    await refreshWorkspaceData();
    setToast({ kind: "success", message: "Salary profile removed" });
  }

  async function saveRecurringTransaction(input: {
    id?: string;
    name: string;
    amount: number;
    type: CategoryType;
    categoryId: string;
    frequency: RecurringFrequency;
    interval: number;
    startDate: string;
    endDate: string | null;
    mode: RecurringMode;
    note: string;
  }) {
    if (!workspace || !session?.user) return;
    const payload = {
      workspace_id: workspace.id,
      name: input.name.trim(),
      amount: input.amount,
      type: input.type,
      category_id: input.categoryId,
      frequency: input.frequency,
      interval_value: input.interval,
      start_date: input.startDate,
      end_date: input.endDate,
      next_run_date: input.startDate,
      created_by: session.user.id,
      mode: input.mode,
      note: input.note.trim(),
    };
    const query = input.id
      ? supabase.from("recurring_transactions").update(payload).eq("id", input.id)
      : supabase.from("recurring_transactions").insert(payload);
    const { error } = await query;
    if (error) {
      setToast({ kind: "error", message: error.message });
      return;
    }
    await refreshWorkspaceData();
    setToast({ kind: "success", message: input.id ? "Recurring transaction updated" : "Recurring transaction saved" });
  }

  async function deleteRecurringTransaction(id: string) {
    const { error } = await supabase.from("recurring_transactions").delete().eq("id", id);
    if (error) {
      setToast({ kind: "error", message: error.message });
      return;
    }
    await refreshWorkspaceData();
    setToast({ kind: "success", message: "Recurring transaction removed" });
  }

  async function saveWishlistItem(input: {
    id?: string;
    name: string;
    price: number;
    priority: WishlistPriority;
    linkedSavingsGoalId: string | null;
    targetDate: string | null;
    note: string;
  }) {
    if (!workspace || !session?.user) return;
    const payload = {
      workspace_id: workspace.id,
      name: input.name.trim(),
      price: input.price,
      priority: input.priority,
      linked_savings_goal_id: input.linkedSavingsGoalId,
      target_date: input.targetDate,
      created_by: session.user.id,
      note: input.note.trim(),
    };
    const query = input.id
      ? supabase.from("wishlist_items").update(payload).eq("id", input.id)
      : supabase.from("wishlist_items").insert(payload);
    const { error } = await query;
    if (error) {
      setToast({ kind: "error", message: error.message });
      return;
    }
    await refreshWorkspaceData();
    setToast({ kind: "success", message: input.id ? "Wishlist item updated" : "Wishlist item saved" });
  }

  async function deleteWishlistItem(id: string) {
    const { error } = await supabase.from("wishlist_items").delete().eq("id", id);
    if (error) {
      setToast({ kind: "error", message: error.message });
      return;
    }
    await refreshWorkspaceData();
    setToast({ kind: "success", message: "Wishlist item removed" });
  }

  async function convertWishlistToSavingsGoal(wishlistId: string) {
    const wishlist = wishlistItems.find((item) => item.id === wishlistId);
    if (!wishlist) return;

    await saveSavingsGoal({
      name: wishlist.name,
      targetAmount: wishlist.price,
      currentAmount: 0,
      monthlyContribution: 0,
      note: wishlist.note,
    });
  }

  async function saveTransactionTag(input: { name: string; color: string }) {
    if (!workspace || !session?.user) return;
    const { error } = await supabase.from("transaction_tags").insert({
      workspace_id: workspace.id,
      name: input.name.trim(),
      color: input.color,
      created_by: session.user.id,
    });
    if (error) {
      setToast({ kind: "error", message: error.message });
      return;
    }
    await refreshWorkspaceData();
    setToast({ kind: "success", message: "Tag saved" });
  }

  async function quickAdd(input: string) {
    const parsed = parseQuickAdd(input, categories);
    if (!parsed) {
      setToast({ kind: "error", message: "Quick add uses formats like +50 salary or -8 coffee weekly." });
      return;
    }

    if (parsed.kind === "transaction") {
      const fallbackCategory =
        parsed.type === "income" ? incomeCategories[0]?.id : expenseCategories[0]?.id;
      if (!parsed.categoryId && !fallbackCategory) {
        setToast({ kind: "error", message: "Create a matching category first." });
        return;
      }
      await saveTransaction({
        amount: parsed.amount,
        categoryId: parsed.categoryId ?? fallbackCategory!,
        description: parsed.description,
        date: getTodayIso(),
      });
      return;
    }

    const fallbackCategory =
      parsed.type === "income" ? incomeCategories[0]?.id : expenseCategories[0]?.id;
    if (!parsed.categoryId && !fallbackCategory) {
      setToast({ kind: "error", message: "Create a matching category first." });
      return;
    }
    await saveRecurringTransaction({
      name: parsed.description,
      amount: parsed.amount,
      type: parsed.type,
      categoryId: parsed.categoryId ?? fallbackCategory!,
      frequency: parsed.frequency,
      interval: parsed.interval,
      startDate: getTodayIso(),
      endDate: null,
      mode: "auto_add",
      note: "Created from quick add",
    });
  }

  const value = {
    hasSupabase,
    session,
    authLoading,
    dataLoading,
    authBusy,
    authMode,
    authMessage,
    dataError,
    toast,
    workspace,
    members,
    categories,
    transactions,
    actualTransactions,
    budgets,
    savingsGoals,
    salaryProfiles,
    savingsGoalEntries,
    recurringTransactions,
    wishlistItems,
    transactionTags,
    transactionTagMaps,
    transactionHistory,
    forecast,
    insights,
    notifications,
    currentMonth,
    expenseCategories,
    incomeCategories,
    deletedTransactionPendingUndo,
    authForm,
    setAuthMode,
    setAuthForm,
    setToast,
    refreshWorkspaceData,
    handleAuthSubmit,
    handleMagicLink,
    handleSignOut,
    saveTransaction,
    deleteTransaction,
    undoDeleteTransaction,
    saveCategory,
    deleteCategory,
    saveBudget,
    deleteBudget,
    saveSavingsGoal,
    deleteSavingsGoal,
    adjustSavingsGoal,
    saveSalaryProfile,
    deleteSalaryProfile,
    saveRecurringTransaction,
    deleteRecurringTransaction,
    saveWishlistItem,
    deleteWishlistItem,
    convertWishlistToSavingsGoal,
    saveTransactionTag,
    quickAdd,
  } satisfies FinanceWorkspaceContextValue;

  return <FinanceWorkspaceContext.Provider value={value}>{children}</FinanceWorkspaceContext.Provider>;
}

export function useFinanceWorkspace() {
  const context = useContext(FinanceWorkspaceContext);
  if (!context) {
    throw new Error("useFinanceWorkspace must be used within FinanceWorkspaceProvider.");
  }
  return context;
}

export function useCurrentUserSalarySummary() {
  const { salaryProfiles, session } = useFinanceWorkspace();
  return useMemo(() => {
    const profile = salaryProfiles.find((item) => item.profileId === session?.user?.id);
    return profile ? calculateSalaryBreakdown(profile) : null;
  }, [salaryProfiles, session?.user?.id]);
}
