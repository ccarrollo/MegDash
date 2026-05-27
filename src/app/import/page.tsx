import { ImportProspectingForm } from "@/components/ImportProspectingForm";
import { SetupBanner } from "@/components/SetupBanner";
import { getSetupStatus } from "@/lib/data";

export default function ImportPage() {
  const setup = getSetupStatus();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Import</h1>
      <p className="text-sm text-slate-500">
        One-time data load from Meg AI Dash → Prospecting tab.
      </p>

      {!setup.supabase && <SetupBanner />}
      <ImportProspectingForm />
    </div>
  );
}
