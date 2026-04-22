import type { User } from "@supabase/supabase-js";
import type {
  Budget,
  Category,
  CategoryType,
  Profile,
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
import { calculateSalaryBreakdown, getSalaryPeriodTakeHome } from "@/lib/payroll";
import { supabaseBrowserClient } from "@/lib/supabase";
import { getRecurringDatesInMonth, getNextRecurringDate } from "@/lib/recurring";
import { getCurrentMonth, getTodayIso } from "@/lib/utils";

export const hasSupabase = Boolean(supabaseBrowserClient);
export const supabase = supabaseBrowserClient as NonNullable<typeof supabaseBrowserClient>;

export const defaultCategoryPalette = [
  "#6fcf97",
  "#5b7cfa",
  "#f2994a",
  "#56ccf2",
  "#ff7a90",
  "#c084fc",
  "#facc15",
  "#2dd4bf",
];

export const starterCategories: Array<{ name: string; type: CategoryType; color: string }> = [
  { name: "Groceries", type: "expense", color: "#6fcf97" },
  { name: "Rent", type: "expense", color: "#5b7cfa" },
  { name: "Transport", type: "expense", color: "#56ccf2" },
  { name: "Coffee", type: "expense", color: "#f2994a" },
  { name: "Salary", type: "income", color: "#27ae60" },
];

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
  recurring_transaction_id: string | null;
  generated_source: string | null;
  is_prediction: boolean | null;
  split_mode: SplitMode | null;
  split_participants: number | null;
  split_amount: number | null;
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

type DbRecurringTransactionRow = {
  id: string;
  workspace_id: string;
  name: string;
  amount: number;
  type: CategoryType;
  category_id: string;
  frequency: RecurringTransaction["frequency"];
  interval_value: number;
  start_date: string;
  end_date: string | null;
  next_run_date: string | null;
  created_by: string;
  mode: RecurringMode;
  note: string;
};

type DbWishlistItemRow = {
  id: string;
  workspace_id: string;
  name: string;
  price: number;
  priority: WishlistPriority;
  linked_savings_goal_id: string | null;
  target_date: string | null;
  created_by: string;
  note: string;
};

type DbTransactionTagRow = {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  created_by: string | null;
};

type DbTransactionTagMapRow = {
  transaction_id: string;
  tag_id: string;
};

type DbTransactionHistoryRow = {
  id: string;
  transaction_id: string;
  workspace_id: string;
  action: "created" | "updated" | "deleted";
  snapshot: Record<string, unknown>;
  changed_by: string;
  created_at: string;
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
    recurringTransactionId: row.recurring_transaction_id,
    generatedSource: row.generated_source,
    isPrediction: Boolean(row.is_prediction),
    splitMode: row.split_mode ?? "none",
    splitParticipants: row.split_participants ?? 1,
    splitAmount: row.split_amount,
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

function mapRecurringTransaction(row: DbRecurringTransactionRow): RecurringTransaction {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    amount: Number(row.amount),
    type: row.type,
    categoryId: row.category_id,
    frequency: row.frequency,
    interval: row.interval_value,
    startDate: row.start_date,
    endDate: row.end_date,
    nextRunDate: row.next_run_date,
    createdBy: row.created_by,
    mode: row.mode,
    note: row.note,
  };
}

function mapWishlistItem(row: DbWishlistItemRow): WishlistItem {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    price: Number(row.price),
    priority: row.priority,
    linkedSavingsGoalId: row.linked_savings_goal_id,
    targetDate: row.target_date,
    createdBy: row.created_by,
    note: row.note,
  };
}

function mapTransactionTag(row: DbTransactionTagRow): TransactionTag {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    color: row.color,
    createdBy: row.created_by,
  };
}

function mapTransactionTagMap(row: DbTransactionTagMapRow): TransactionTagMap {
  return {
    transactionId: row.transaction_id,
    tagId: row.tag_id,
  };
}

function mapTransactionHistory(row: DbTransactionHistoryRow): TransactionHistoryEntry {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    workspaceId: row.workspace_id,
    action: row.action,
    snapshot: row.snapshot,
    changedBy: row.changed_by,
    createdAt: row.created_at,
  };
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
  if (membershipRows && membershipRows.length > 0) return membershipRows[0].workspace_id;

  const workspaceId = crypto.randomUUID();
  const { error: workspaceError } = await supabase.from("workspaces").insert({
    id: workspaceId,
    name: "My Finance Space",
    created_by: userId,
  });
  if (workspaceError) throw workspaceError;

  const { error: memberError } = await supabase.from("workspace_members").insert({
    workspace_id: workspaceId,
    user_id: userId,
    role: "owner",
  });
  if (memberError) throw memberError;

  const { error: categoryError } = await supabase.from("categories").insert(
    starterCategories.map((category) => ({
      workspace_id: workspaceId,
      name: category.name,
      type: category.type,
      color: category.color,
      created_by: userId,
    })),
  );
  if (categoryError) throw categoryError;

  return workspaceId;
}

async function ensureSalaryTransactions(params: {
  workspaceId: string;
  categories: Category[];
  transactions: Transaction[];
  salaryProfiles: SalaryProfile[];
}) {
  const currentMonth = getCurrentMonth();
  const salaryCategory = params.categories.find(
    (category) => category.type === "income" && category.name.toLowerCase() === "salary",
  );
  if (!salaryCategory) return;

  for (const salaryProfile of params.salaryProfiles) {
    if (!salaryProfile.firstPaymentDate) continue;
    const dueDates = getRecurringDatesInMonth(
      {
        id: salaryProfile.id,
        workspaceId: params.workspaceId,
        name: "Salary",
        amount: 0,
        type: "income",
        categoryId: salaryCategory.id,
        frequency: salaryProfile.paymentFrequency,
        interval: 1,
        startDate: salaryProfile.firstPaymentDate,
        endDate: null,
        nextRunDate: null,
        createdBy: salaryProfile.profileId,
        mode: "auto_add",
        note: "",
      },
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
        generated_source: "salary_schedule",
        is_prediction: false,
      });
      if (error && error.code !== "42703") throw error;
    }
  }
}

async function ensureRecurringTransactions(params: {
  workspaceId: string;
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
}) {
  const currentMonth = getCurrentMonth();

  for (const recurring of params.recurringTransactions) {
    const dueDates = getRecurringDatesInMonth(recurring, currentMonth);

    for (const dueDate of dueDates) {
      const existing = params.transactions.find(
        (transaction) =>
          transaction.recurringTransactionId === recurring.id &&
          transaction.date === dueDate,
      );
      if (existing) continue;

      const { error } = await supabase.from("transactions").insert({
        workspace_id: params.workspaceId,
        category_id: recurring.categoryId,
        amount: recurring.amount,
        description: recurring.name,
        transaction_date: dueDate,
        created_by: recurring.createdBy,
        recurring_transaction_id: recurring.id,
        generated_source:
          recurring.mode === "predict_only" ? "recurring_prediction" : "recurring_auto",
        is_prediction: recurring.mode === "predict_only",
      });
      if (error) throw error;
    }

    const nextRunDate = getNextRecurringDate(recurring, getTodayIso());
    if (nextRunDate !== recurring.nextRunDate) {
      await supabase
        .from("recurring_transactions")
        .update({ next_run_date: nextRunDate })
        .eq("id", recurring.id);
    }
  }
}

export type WorkspaceBundle = {
  profile: Profile;
  workspace: DbWorkspaceRow;
  members: Profile[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  salaryProfiles: SalaryProfile[];
  savingsGoalEntries: SavingsGoalEntry[];
  recurringTransactions: RecurringTransaction[];
  wishlistItems: WishlistItem[];
  transactionTags: TransactionTag[];
  transactionTagMaps: TransactionTagMap[];
  transactionHistory: TransactionHistoryEntry[];
};

export async function loadWorkspaceBundle(user: User): Promise<WorkspaceBundle> {
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
    recurringResult,
    wishlistResult,
    tagResult,
    tagMapResult,
    historyResult,
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
      .select("id, workspace_id, category_id, amount, description, transaction_date, created_by, recurring_transaction_id, generated_source, is_prediction, split_mode, split_participants, split_amount")
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
    supabase
      .from("recurring_transactions")
      .select("id, workspace_id, name, amount, type, category_id, frequency, interval_value, start_date, end_date, next_run_date, created_by, mode, note")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true })
      .returns<DbRecurringTransactionRow[]>(),
    supabase
      .from("wishlist_items")
      .select("id, workspace_id, name, price, priority, linked_savings_goal_id, target_date, created_by, note")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true })
      .returns<DbWishlistItemRow[]>(),
    supabase
      .from("transaction_tags")
      .select("id, workspace_id, name, color, created_by")
      .eq("workspace_id", workspaceId)
      .order("name", { ascending: true })
      .returns<DbTransactionTagRow[]>(),
    supabase
      .from("transaction_tag_map")
      .select("transaction_id, tag_id")
      .returns<DbTransactionTagMapRow[]>(),
    supabase
      .from("transaction_history")
      .select("id, transaction_id, workspace_id, action, snapshot, changed_by, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(40)
      .returns<DbTransactionHistoryRow[]>(),
  ]);

  if (workspaceResult.error) throw workspaceResult.error;
  if (memberResult.error) throw memberResult.error;
  if (categoryResult.error) throw categoryResult.error;
  if (transactionResult.error) throw transactionResult.error;
  if (budgetResult.error) throw budgetResult.error;
  if (savingsResult.error) throw savingsResult.error;
  if (salaryResult.error && salaryResult.error.code !== "42P01") throw salaryResult.error;
  if (savingsEntryResult.error && savingsEntryResult.error.code !== "42P01") throw savingsEntryResult.error;
  if (recurringResult.error && recurringResult.error.code !== "42P01") throw recurringResult.error;
  if (wishlistResult.error && wishlistResult.error.code !== "42P01") throw wishlistResult.error;
  if (tagResult.error && tagResult.error.code !== "42P01") throw tagResult.error;
  if (tagMapResult.error && tagMapResult.error.code !== "42P01") throw tagMapResult.error;
  if (historyResult.error && historyResult.error.code !== "42P01") throw historyResult.error;

  const memberIds = (memberResult.data ?? []).map((row) => row.user_id);
  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, display_name")
    .in("id", memberIds)
    .returns<DbProfileRow[]>();
  if (profileError) throw profileError;

  const categories = (categoryResult.data ?? []).map(mapCategory);
  const transactions = (transactionResult.data ?? []).map(mapTransaction);
  const salaryProfiles = (salaryResult.data ?? []).map(mapSalaryProfile);
  const recurringTransactions = (recurringResult.data ?? []).map(mapRecurringTransaction);

  await ensureSalaryTransactions({
    workspaceId,
    categories,
    transactions,
    salaryProfiles,
  });
  await ensureRecurringTransactions({
    workspaceId,
    transactions,
    recurringTransactions,
  });

  const { data: refreshedTransactions, error: refreshedTransactionsError } = await supabase
    .from("transactions")
    .select("id, workspace_id, category_id, amount, description, transaction_date, created_by, recurring_transaction_id, generated_source, is_prediction, split_mode, split_participants, split_amount")
    .eq("workspace_id", workspaceId)
    .order("transaction_date", { ascending: false })
    .returns<DbTransactionRow[]>();
  if (refreshedTransactionsError) throw refreshedTransactionsError;

  return {
    profile,
    workspace: workspaceResult.data,
    members: (profileRows ?? []).map(mapProfile),
    categories,
    transactions: (refreshedTransactions ?? []).map(mapTransaction),
    budgets: (budgetResult.data ?? []).map(mapBudget),
    savingsGoals: (savingsResult.data ?? []).map(mapSavingsGoal),
    salaryProfiles,
    savingsGoalEntries: (savingsEntryResult.data ?? []).map(mapSavingsGoalEntry),
    recurringTransactions,
    wishlistItems: (wishlistResult.data ?? []).map(mapWishlistItem),
    transactionTags: (tagResult.data ?? []).map(mapTransactionTag),
    transactionTagMaps: (tagMapResult.data ?? []).map(mapTransactionTagMap),
    transactionHistory: (historyResult.data ?? []).map(mapTransactionHistory),
  };
}

export function subscribeToWorkspace(
  workspaceId: string,
  onChange: () => void,
) {
  const channel = supabase
    .channel(`workspace:${workspaceId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "transactions", filter: `workspace_id=eq.${workspaceId}` },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "budgets", filter: `workspace_id=eq.${workspaceId}` },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "savings_goals", filter: `workspace_id=eq.${workspaceId}` },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "wishlist_items", filter: `workspace_id=eq.${workspaceId}` },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "recurring_transactions", filter: `workspace_id=eq.${workspaceId}` },
      onChange,
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
