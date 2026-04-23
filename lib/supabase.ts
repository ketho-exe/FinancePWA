import { createClient } from "@supabase/supabase-js";

export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

export function hasSupabaseEnv() {
  return Boolean(supabaseConfig.url && supabaseConfig.anonKey);
}

export function createSupabaseBrowserClient() {
  if (!hasSupabaseEnv()) {
    throw new Error("Missing Supabase environment variables.");
  }

  let authLock = Promise.resolve();

  return createClient(supabaseConfig.url, supabaseConfig.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Avoid browser LockManager hangs that can stall session restore and all
      // subsequent authenticated queries on some browsers.
      lock: async (_name, _acquireTimeout, fn) => {
        const run = authLock.then(() => fn());
        authLock = run.then(
          () => undefined,
          () => undefined,
        );
        return run;
      },
    },
  });
}

export const supabaseBrowserClient = hasSupabaseEnv()
  ? createSupabaseBrowserClient()
  : null;
