import type {
  SalaryFrequency,
  SalaryProfile,
  StudentLoanPlan,
  TaxRegion,
} from "@/lib/types";

const STANDARD_ALLOWANCE = 12_570;
const ADDITIONAL_RATE_THRESHOLD = 125_140;
const ALLOWANCE_TAPER_START = 100_000;

const ukBands = [
  { limit: 37_700, rate: 0.2 },
  { limit: ADDITIONAL_RATE_THRESHOLD - STANDARD_ALLOWANCE - 37_700, rate: 0.4 },
  { limit: Number.POSITIVE_INFINITY, rate: 0.45 },
];

const scotlandBands = [
  { limit: 3_967, rate: 0.19 },
  { limit: 16_956 - 3_967, rate: 0.2 },
  { limit: 31_092 - 16_956, rate: 0.21 },
  { limit: 62_430 - 31_092, rate: 0.42 },
  { limit: 125_140 - 62_430, rate: 0.45 },
  { limit: Number.POSITIVE_INFINITY, rate: 0.48 },
];

const studentLoanThresholds: Record<Exclude<StudentLoanPlan, "none">, number> = {
  plan1: 26_900,
  plan2: 29_385,
  plan4: 33_795,
  plan5: 25_000,
};

const STUDENT_LOAN_RATE = 0.09;
const POSTGRAD_THRESHOLD = 21_000;
const POSTGRAD_RATE = 0.06;

function getPersonalAllowance(annualGrossSalary: number, taxCode: string) {
  const digits = taxCode.match(/\d+/)?.[0];
  const codeAllowance = digits ? Number(digits) * 10 : STANDARD_ALLOWANCE;
  const tapered = annualGrossSalary > ALLOWANCE_TAPER_START
    ? Math.max(0, codeAllowance - (annualGrossSalary - ALLOWANCE_TAPER_START) / 2)
    : codeAllowance;

  return Math.max(0, Math.floor(tapered));
}

function calculateIncomeTax(annualGrossSalary: number, taxRegion: TaxRegion, taxCode: string) {
  const allowance = getPersonalAllowance(annualGrossSalary, taxCode);
  let taxable = Math.max(0, annualGrossSalary - allowance);
  const bands = taxRegion === "scotland" ? scotlandBands : ukBands;
  let tax = 0;

  for (const band of bands) {
    if (taxable <= 0) break;
    const taxedAtBand = Math.min(taxable, band.limit);
    tax += taxedAtBand * band.rate;
    taxable -= taxedAtBand;
  }

  return tax;
}

function calculateEmployeeNi(annualGrossSalary: number) {
  const mainBand = Math.max(0, Math.min(annualGrossSalary, 50_270) - 12_570);
  const upperBand = Math.max(0, annualGrossSalary - 50_270);
  return mainBand * 0.08 + upperBand * 0.02;
}

function calculateStudentLoan(annualGrossSalary: number, plan: StudentLoanPlan) {
  if (plan === "none") return 0;
  const threshold = studentLoanThresholds[plan];
  return Math.max(0, annualGrossSalary - threshold) * STUDENT_LOAN_RATE;
}

function calculatePostgraduateLoan(annualGrossSalary: number, enabled: boolean) {
  if (!enabled) return 0;
  return Math.max(0, annualGrossSalary - POSTGRAD_THRESHOLD) * POSTGRAD_RATE;
}

export function calculateSalaryBreakdown(profile: SalaryProfile) {
  const annualGross = profile.annualGrossSalary;
  const annualIncomeTax = calculateIncomeTax(annualGross, profile.taxRegion, profile.taxCode);
  const annualNationalInsurance = calculateEmployeeNi(annualGross);
  const annualStudentLoan = calculateStudentLoan(annualGross, profile.studentLoanPlan);
  const annualPostgraduateLoan = calculatePostgraduateLoan(annualGross, profile.postgraduateLoan);
  const annualTakeHome =
    annualGross -
    annualIncomeTax -
    annualNationalInsurance -
    annualStudentLoan -
    annualPostgraduateLoan;

  return {
    annualGross,
    monthlyGross: annualGross / 12,
    annualIncomeTax,
    monthlyIncomeTax: annualIncomeTax / 12,
    annualNationalInsurance,
    monthlyNationalInsurance: annualNationalInsurance / 12,
    annualStudentLoan,
    monthlyStudentLoan: annualStudentLoan / 12,
    annualPostgraduateLoan,
    monthlyPostgraduateLoan: annualPostgraduateLoan / 12,
    annualTakeHome,
    monthlyTakeHome: annualTakeHome / 12,
  };
}

export function getSalaryPeriodTakeHome(
  annualTakeHome: number,
  frequency: SalaryFrequency,
) {
  const periodsPerYear =
    frequency === "weekly" ? 52 : frequency === "biweekly" ? 26 : 12;

  return annualTakeHome / periodsPerYear;
}
