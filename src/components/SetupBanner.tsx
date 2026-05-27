export function SetupBanner() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
      <p className="font-semibold">Connect Supabase to go live</p>
      <p className="mt-1 text-amber-900/80 dark:text-amber-200/80">
        Copy <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/60">.env.example</code> to{" "}
        <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/60">.env.local</code>, run{" "}
        <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/60">supabase/schema.sql</code> in
        your project, then restart the dev server.
      </p>
    </div>
  );
}
