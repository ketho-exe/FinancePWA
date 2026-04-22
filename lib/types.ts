export type CategoryType = "income" | "expense";

export type Profile = {
  id: string;
  email: string;
  displayName: string;
};

export type Workspace = {
  id: string;
  name: string;
  members: Profile[];
};

export type Category = {
  id: string;
  workspaceId: string;
  name: string;
  type: CategoryType;
  color: string;
};

export type Transaction = {
  id: string;
  workspaceId: string;
  categoryId: string;
  amount: number;
  description: string;
  date: string;
  createdBy: string;
  recurringTransactionId?: string | null;
  generatedSource?: string | null;
  isPrediction?: boolean;
  splitMode?: SplitMode;
  splitParticipants?: number;
  splitAmount?: number | null;
};

export type Budget = {
  id: string;
  workspaceId: string;
  categoryId: string;
  month: string;
  amount: number;
};

export type SavingsGoal = {
  id: string;
  workspaceId: string;
  name: string;
  targetAmount: number | null;
  currentAmount: number;
  monthlyContribution: number;
  note: string;
};

export type SavingsGoalEntry = {
  id: string;
  savingsGoalId: string;
  amountDelta: number;
  entryDate: string;
  note: string;
  createdBy: string;
};

export type TaxRegion = "england_wales_ni" | "scotland";

export type StudentLoanPlan = "none" | "plan1" | "plan2" | "plan4" | "plan5";

export type SalaryFrequency = "monthly" | "weekly" | "biweekly";

export type SalaryProfile = {
  id: string;
  workspaceId: string;
  profileId: string;
  annualGrossSalary: number;
  taxRegion: TaxRegion;
  studentLoanPlan: StudentLoanPlan;
  postgraduateLoan: boolean;
  taxCode: string;
  firstPaymentDate: string | null;
  paymentFrequency: SalaryFrequency;
};

export type RecurringFrequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "custom";

export type RecurringMode = "auto_add" | "predict_only";

export type SplitMode = "none" | "even" | "custom";

export type RecurringTransaction = {
  id: string;
  workspaceId: string;
  name: string;
  amount: number;
  type: CategoryType;
  categoryId: string;
  frequency: RecurringFrequency;
  interval: number;
  startDate: string;
  endDate: string | null;
  nextRunDate: string | null;
  createdBy: string;
  mode: RecurringMode;
  note: string;
};

export type WishlistPriority = "low" | "medium" | "high";

export type WishlistItem = {
  id: string;
  workspaceId: string;
  name: string;
  price: number;
  priority: WishlistPriority;
  linkedSavingsGoalId: string | null;
  targetDate: string | null;
  createdBy: string;
  note: string;
};

export type TransactionTag = {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  createdBy: string | null;
};

export type TransactionTagMap = {
  transactionId: string;
  tagId: string;
};

export type TransactionHistoryAction = "created" | "updated" | "deleted";

export type TransactionHistoryEntry = {
  id: string;
  transactionId: string;
  workspaceId: string;
  action: TransactionHistoryAction;
  snapshot: Record<string, unknown>;
  changedBy: string;
  createdAt: string;
};

export type FinanceNotificationSeverity = "info" | "warning" | "critical";

export type FinanceNotification = {
  id: string;
  title: string;
  message: string;
  severity: FinanceNotificationSeverity;
};

export type ForecastPoint = {
  date: string;
  balance: number;
  delta: number;
  income: number;
  expense: number;
  labels: string[];
};

export type BudgetRisk = {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  projectedSpend: number;
  budgetAmount: number;
  overspendBy: number;
};

export type ForecastSummary = {
  points: ForecastPoint[];
  currentBalance: number;
  projectedBalance: number;
  lowestBalance: number;
  safeToSpend: number;
  runwayDays: number | null;
  budgetRisks: BudgetRisk[];
};

export type FinanceInsight = {
  id: string;
  title: string;
  body: string;
};
