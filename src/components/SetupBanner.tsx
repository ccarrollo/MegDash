export function SetupBanner() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-semibold">Connect Supabase to go live</p>
      <p className="mt-1 text-amber-900/80">
        Copy <code className="rounded bg-amber-100 px-1">.env.example</code> to{" "}
        <code className="rounded bg-amber-100 px-1">.env.local</code>, run{" "}
        <code className="rounded bg-amber-100 px-1">supabase/schema.sql</code> in
        your project, then restart the dev server.
      </p>
    </div>
  );
}
