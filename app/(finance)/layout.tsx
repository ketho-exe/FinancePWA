import type { ReactNode } from "react";
import { FinanceAppBoundary } from "@/components/finance/finance-gate";

export default function FinanceLayout({ children }: { children: ReactNode }) {
  return <FinanceAppBoundary>{children}</FinanceAppBoundary>;
}
