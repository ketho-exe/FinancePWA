# Supabase Rebuild Checklist

1. Create a fresh Supabase project.
2. In the SQL editor, run [schema-complete.sql](/C:/Users/sklej/rep/FinancePWA/supabase/schema-complete.sql).
3. In Supabase Auth:
   Enable email/password sign-in.
   Enable magic link / OTP email sign-in if you want that flow in the app.
4. In your app environment, set:
   `NEXT_PUBLIC_SUPABASE_URL`
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Start the app and sign up with a new user.
6. On first login, the app will auto-create:
   a profile row
   a workspace
   starter categories

## Notes

- [finance-v2-schema.sql](/C:/Users/sklej/rep/FinancePWA/supabase/finance-v2-schema.sql) remains as the incremental patch if you are upgrading an existing database.
- [schema-complete.sql](/C:/Users/sklej/rep/FinancePWA/supabase/schema-complete.sql) is the single-file rebuild source of truth for a clean project.
