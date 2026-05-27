import Link from "next/link";
import { ImportProspectingForm } from "@/components/ImportProspectingForm";
import { ImportSalesGoalsForm } from "@/components/ImportSalesGoalsForm";
import { SetupBanner } from "@/components/SetupBanner";
import { getSetupStatus } from "@/lib/data";

export default function ImportPage() {
  const setup = getSetupStatus();

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-xl font-bold">Import from Meg AI Dash</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">
          Export each tab as CSV from Google Sheets, upload here — same flow as
          Prospecting.
        </p>
        <p className="mt-2 text-sm">
          <Link href="/sales" className="text-brand-600 hover:underline">
            Sales tab →
          </Link>{" "}
          to view goals and commission after import.
        </p>
      </div>

      {!setup.supabase && <SetupBanner />}

      <ImportProspectingForm />
      <ImportSalesGoalsForm />
    </div>
  );
}
