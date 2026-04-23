"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function AppCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`app-card p-5 md:p-6 ${className}`.trim()}>{children}</section>;
}

export function AppPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`app-panel p-4 ${className}`.trim()}>{children}</section>;
}

export function AppButton({
  children,
  className = "",
  variant = "primary",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "ghost";
}) {
  return (
    <button
      type={type}
      className={`app-button ${variant === "primary" ? "app-button--primary" : "app-button--ghost"} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <AppCard className="gap-3">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="font-mono text-3xl font-semibold tracking-tight text-white">{value}</p>
      {hint ? <p className="text-sm text-slate-400">{hint}</p> : null}
    </AppCard>
  );
}

export function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-white">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <AppPanel className="border-dashed text-center">
      <p className="text-base font-medium text-white">{title}</p>
      <p className="mt-2 text-sm text-slate-400">{body}</p>
    </AppPanel>
  );
}

export function FinanceNav() {
  const pathname = usePathname();
  const links = [
    ["/dashboard", "Dashboard"],
    ["/transactions", "Transactions"],
    ["/budgets", "Budgets"],
    ["/savings", "Savings"],
    ["/wishlist", "Wishlist"],
    ["/forecast", "Forecast"],
    ["/settings", "Settings"],
  ] as const;

  return (
    <nav className="app-nav px-2 py-2">
      <div className="flex min-w-max items-center gap-2">
        {links.map(([href, label]) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                active
                  ? "border-blue-300/30 bg-blue-500/15 text-white"
                  : "border-transparent text-slate-400 hover:border-slate-700 hover:bg-white/5 hover:text-white"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function ForecastChart({
  points,
}: {
  points: Array<{ date: string; balance: number }>;
}) {
  if (points.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-[24px] border border-dashed border-slate-700/70 bg-slate-950/30 text-sm text-slate-500">
        Forecast points will appear once recurring items or future transactions exist.
      </div>
    );
  }

  const width = 640;
  const height = 220;
  const values = points.map((point) => point.balance);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const stepX = width / Math.max(1, points.length - 1);

  const path = points
    .map((point, index) => {
      const x = index * stepX;
      const y = height - ((point.balance - min) / range) * (height - 24) - 12;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="rounded-[24px] border border-slate-800 bg-slate-950/40 p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full overflow-visible">
        <defs>
          <linearGradient id="forecastFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(96, 165, 250, 0.35)" />
            <stop offset="100%" stopColor="rgba(96, 165, 250, 0)" />
          </linearGradient>
        </defs>
        <path d={`M 0 ${height} ${path} L ${width} ${height} Z`} fill="url(#forecastFill)" />
        <path d={path} fill="none" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}
