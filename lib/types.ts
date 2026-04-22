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
