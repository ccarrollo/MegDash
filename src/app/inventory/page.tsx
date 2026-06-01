import { InventoryClient } from "@/components/InventoryClient";
import { SetupBanner } from "@/components/SetupBanner";
import { fetchInventoryItems, getSetupStatus } from "@/lib/data";

export default async function InventoryPage() {
  const setup = getSetupStatus();
  const items = await fetchInventoryItems();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Inventory</h1>
        <p className="text-sm text-violet-700 dark:text-slate-400">
          Track current count for each bone stim ID.
        </p>
      </div>

      {!setup.supabase && <SetupBanner />}
      <InventoryClient items={items} />
    </div>
  );
}
