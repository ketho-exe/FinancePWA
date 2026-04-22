"use client";

import type { ReactNode } from "react";
import { FinanceWorkspaceProvider, useFinanceWorkspace } from "@/hooks/use-finance-workspace";
import { FinanceNav } from "@/components/finance/ui";

export function FinanceAppBoundary({ children }: { children: ReactNode }) {
  return (
    <FinanceWorkspaceProvider>
      <FinanceAppContent>{children}</FinanceAppContent>
    </FinanceWorkspaceProvider>
  );
}

function FinanceAppContent({ children }: { children: ReactNode }) {
  const {
    authBusy,
    authForm,
    authLoading,
    authMessage,
    authMode,
    dataLoading,
    dataError,
    handleAuthSubmit,
    handleMagicLink,
    hasSupabase,
    session,
    setAuthForm,
    setAuthMode,
    toast,
    undoDeleteTransaction,
    deletedTransactionPendingUndo,
    workspace,
  } = useFinanceWorkspace();

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
    <div className="app-page-shell">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col gap-6 px-4 py-5 md:px-6 lg:px-8">
        <header className="app-hero overflow-hidden px-5 py-6 md:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="app-pill app-pill--accent inline-flex px-3 py-1 text-xs font-medium uppercase tracking-[0.2em]">
                Smart Household Finance OS
              </p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-5xl">
                Shared budgeting, recurring planning, wishlist goals, and live forecasts in one workspace.
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-300 md:text-base">
                Predict bills, watch savings progress, and coordinate spending across the household without losing the calm finance-first feel of the original app.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="app-panel min-w-[180px] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Workspace</p>
                <p className="mt-2 text-lg font-medium text-white">{workspace?.name ?? "Finance Space"}</p>
              </div>
              <div className="app-panel min-w-[180px] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Status</p>
                <p className="mt-2 text-lg font-medium text-emerald-300">Live and synced</p>
              </div>
            </div>
          </div>
        </header>

        <FinanceNav />

        {dataError ? (
          <div className="app-feedback app-feedback--error">
            {dataError}
          </div>
        ) : null}

        {toast ? (
          <div className={`app-feedback ${toast.kind === "error" ? "app-feedback--error" : toast.kind === "success" ? "app-feedback--success" : "app-feedback--info"} flex items-center justify-between gap-3`}>
            <span>{toast.message}</span>
            {deletedTransactionPendingUndo ? (
              <button type="button" className="underline underline-offset-4" onClick={undoDeleteTransaction}>
                Undo
              </button>
            ) : null}
          </div>
        ) : null}

        <main className="pb-8">{children}</main>
      </div>
    </div>
  );
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="app-page-shell flex min-h-screen items-center justify-center px-6">
      <div className="app-card max-w-md px-8 py-10 text-center">
        <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-blue-400/20" />
        <p className="mt-5 text-lg font-medium text-white">{label}</p>
      </div>
    </div>
  );
}

function ConfigScreen() {
  return (
    <div className="app-page-shell flex min-h-screen items-center justify-center px-6">
      <div className="app-card max-w-2xl px-8 py-10">
        <p className="app-pill app-pill--accent inline-flex px-3 py-1 text-xs uppercase tracking-[0.2em]">
          Configuration Needed
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Add your Supabase environment variables to unlock the live finance workspace.
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then reload the app.
        </p>
      </div>
    </div>
  );
}

function AuthScreen(props: {
  authBusy: boolean;
  authForm: { email: string; password: string; displayName: string };
  authMessage: string;
  authMode: "sign-in" | "sign-up";
  onChange: (value: { email: string; password: string; displayName: string }) => void;
  onMagicLink: () => Promise<void>;
  onModeChange: (value: "sign-in" | "sign-up") => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  const { authBusy, authForm, authMessage, authMode, onChange, onMagicLink, onModeChange, onSubmit } = props;

  return (
    <div className="app-page-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="app-hero px-8 py-10">
          <p className="app-pill app-pill--accent inline-flex px-3 py-1 text-xs uppercase tracking-[0.2em]">
            Shared Finance PWA v2
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white">
            Plan income, bills, savings goals, and forecasts together.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-300">
            This upgraded workspace brings recurring transactions, wishlist motivation, cashflow forecasting, and live household collaboration into one route-based app.
          </p>
        </div>

        <form className="app-card px-6 py-7" onSubmit={onSubmit}>
          <div className="flex gap-2 rounded-full border border-slate-800 bg-slate-950/50 p-1">
            {(["sign-in", "sign-up"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`flex-1 rounded-full px-4 py-2 text-sm ${authMode === mode ? "bg-blue-500/15 text-white" : "text-slate-400"}`}
                onClick={() => onModeChange(mode)}
              >
                {mode === "sign-in" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-4">
            {authMode === "sign-up" ? (
              <label className="block text-sm text-slate-300">
                Display name
                <input
                  value={authForm.displayName}
                  onChange={(event) => onChange({ ...authForm, displayName: event.target.value })}
                  placeholder="Alex"
                />
              </label>
            ) : null}
            <label className="block text-sm text-slate-300">
              Email
              <input
                value={authForm.email}
                onChange={(event) => onChange({ ...authForm, email: event.target.value })}
                placeholder="you@example.com"
                type="email"
              />
            </label>
            <label className="block text-sm text-slate-300">
              Password
              <input
                value={authForm.password}
                onChange={(event) => onChange({ ...authForm, password: event.target.value })}
                placeholder="Secure password"
                type="password"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            <button type="submit" disabled={authBusy} className="app-button app-button--primary w-full">
              {authBusy ? "Working..." : authMode === "sign-in" ? "Sign in" : "Create account"}
            </button>
            <button type="button" disabled={authBusy} className="app-button app-button--ghost w-full" onClick={() => void onMagicLink()}>
              Send magic link
            </button>
          </div>

          {authMessage ? <p className="mt-4 text-sm text-slate-400">{authMessage}</p> : null}
        </form>
      </div>
    </div>
  );
}
